<script setup lang="ts">
import type { PortfolioAnalysisAnnualReportVO } from '@/apis/portfolio/analysis'
import type { PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  PortfolioAnnualReportTaskStatusCode,
  PortfolioAnnualReportTaskStatusDescription,
} from '@/types/enums/portfolio-annual-report-task-status-enum'
import { showUserError } from '@/utils/error-handler'
import { portfolioTeacherSelectOptionsFromSummaries } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'

const POLL_INTERVAL_MS = 3000

const router = useRouter()
const loading = ref(false)
const historyLoading = ref(false)
const teachers = ref<PortfolioTeacherSummaryVO[]>([])
const latestTask = ref<PortfolioAnalysisAnnualReportVO | null>(null)
const reportHistory = ref<PortfolioAnalysisAnnualReportVO[]>([])
const historyTotal = ref(0)
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)
const historyQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const form = reactive({
  teacherId: '',
  reportYear: String(new Date().getFullYear()),
})

const teacherOptions = computed(() => portfolioTeacherSelectOptionsFromSummaries(teachers.value))
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null

const historyPagination = computed(() => ({
  current: historyQuery.pageNum,
  pageSize: historyQuery.pageSize,
  total: historyTotal.value,
  showSizeChanger: true,
}))

const reportYearFilter = computed(() => {
  const value = form.reportYear.trim()
  return /^\d{4}$/.test(value) ? value : undefined
})

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function startPollingIfRunning() {
  stopPolling()
  if (latestTask.value?.taskStatus !== PortfolioAnnualReportTaskStatusCode.RUNNING) {
    return
  }
  pollTimer.value = setInterval(() => {
    void refreshLatestTask()
  }, POLL_INTERVAL_MS)
}

async function refreshLatestTask() {
  if (!latestTask.value?.id) {
    return
  }
  try {
    const row = await portfolioAnalysisApi.getAnnualReport({ id: latestTask.value.id })
    latestTask.value = row
    if (row.taskStatus !== PortfolioAnnualReportTaskStatusCode.RUNNING) {
      stopPolling()
      await loadReportHistory()
    }
  } catch {
    // 轮询失败不打断用户操作
  }
}

async function loadReportHistory() {
  historyLoading.value = true
  try {
    const page = await portfolioAnalysisApi.pageAnnualReports({
      pageNum: historyQuery.pageNum,
      pageSize: historyQuery.pageSize,
      teacherId: form.teacherId || undefined,
      reportYear: reportYearFilter.value,
    })
    reportHistory.value = page.list ?? []
    historyTotal.value = page.total ?? 0
  } catch (error) {
    showUserError(error, '加载报告历史失败')
  } finally {
    historyLoading.value = false
  }
}

function onHistoryTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  historyQuery.pageNum = pageNum
  historyQuery.pageSize = pageSize
  void loadReportHistory()
}

const historyColumns = [
  { title: '任务编号', dataIndex: 'id', key: 'id', width: 120 },
  { title: '教师', key: 'teacher', width: 180 },
  { title: '报告年度', dataIndex: 'reportYear', key: 'reportYear', width: 100 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '失败摘要', dataIndex: 'errorSummary', key: 'errorSummary', ellipsis: true },
  { title: '操作', key: 'actions', width: 120 },
]

function taskStatusTone(status: string): 'blue' | 'green' | 'red' | 'gray' {
  if (status === PortfolioAnnualReportTaskStatusCode.RUNNING) {
    return 'blue'
  }
  if (status === PortfolioAnnualReportTaskStatusCode.SUCCESS) {
    return 'green'
  }
  if (status === PortfolioAnnualReportTaskStatusCode.FAILED) {
    return 'red'
  }
  return 'gray'
}

function taskStatusLabel(status: string): string {
  return strictEnumLabel(
    PortfolioAnnualReportTaskStatusDescription,
    status as PortfolioAnnualReportTaskStatusCode,
    '年度报告任务状态',
  )
}

function mergeTeacherOptions(rows: PortfolioTeacherSummaryVO[]) {
  const optionMap = new Map(teachers.value.map((item) => [item.userId, item]))
  for (const row of rows) {
    optionMap.set(row.userId, row)
  }
  teachers.value = Array.from(optionMap.values())
}

async function loadTeachers(keyword?: string) {
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: keyword || undefined,
    })
    mergeTeacherOptions(page.list)
  } catch (error) {
    showUserError(error, '加载教师名册失败')
  }
}

function handleTeacherSearch(value: string) {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value.trim())
  }, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

function openReportDetail(row: PortfolioAnalysisAnnualReportVO) {
  if (!row.aiTaskId) {
    showUserError(null, '当前任务尚未生成智能报告结果')
    return
  }
  void router.push({
    path: '/portfolio/admin/teacher-report',
    query: { taskId: row.aiTaskId },
  })
}

function normalizeReportYear(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4)
}

async function generateReport() {
  if (!form.teacherId) {
    showUserError(null, '请选择教师')
    return
  }
  if (!reportYearFilter.value) {
    showUserError(null, '报告年度必须为 4 位自然年')
    return
  }
  const reportYear = Number(reportYearFilter.value)
  if (reportYear < 2000 || reportYear > new Date().getFullYear()) {
    showUserError(null, '报告年度须在 2000 年至当前自然年之间')
    return
  }
  loading.value = true
  try {
    latestTask.value = await portfolioAnalysisApi.generateAnnualReport({
      teacherId: form.teacherId,
      reportYear: reportYearFilter.value,
    })
    historyQuery.pageNum = 1
    await loadReportHistory()
    startPollingIfRunning()
  } catch (error) {
    showUserError(error, '年度报告生成失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadTeachers().then(() => loadReportHistory())
})

onUnmounted(() => {
  stopPolling()
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
    teacherSearchTimer = null
  }
})

watch(
  () => [form.teacherId, form.reportYear],
  () => {
    const normalizedYear = normalizeReportYear(form.reportYear)
    if (normalizedYear !== form.reportYear) {
      form.reportYear = normalizedYear
      return
    }
    historyQuery.pageNum = 1
    void loadReportHistory()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="年度报告"
        subtitle="异步生成教师年度发展分析报告"
      />
    </template>
    <UiCard title="生成任务">
      <div class="annual-report__form">
        <a-select
          v-model:value="form.teacherId"
          placeholder="选择教师"
          :options="teacherOptions"
          class="annual-report__field"
          show-search
          :filter-option="false"
          option-label-prop="label"
          @focus="() => loadTeachers()"
          @search="handleTeacherSearch"
        />
        <a-input
          v-model:value="form.reportYear"
          placeholder="报告年度"
          class="annual-report__field annual-report__field--year"
          :maxlength="4"
        />
        <UiButton variant="primary" :loading="loading" @click="generateReport"> 提交生成 </UiButton>
      </div>
    </UiCard>
    <UiCard v-if="latestTask" title="最近任务" class="annual-report__result">
      <dl class="annual-report__meta">
        <div>
          <dt>任务编号</dt>
          <dd>{{ latestTask.id }}</dd>
        </div>
        <div>
          <dt>教师</dt>
          <dd>
            {{ latestTask.teacherName || `教师编号 ${latestTask.teacherId}` }}
            <template v-if="latestTask.teacherNumber">
              （{{ latestTask.teacherNumber }}）
            </template>
          </dd>
        </div>
        <div>
          <dt>报告年度</dt>
          <dd>{{ latestTask.reportYear }}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>
            <UiTag :tone="taskStatusTone(latestTask.taskStatus)">
              {{ taskStatusLabel(latestTask.taskStatus) }}
            </UiTag>
          </dd>
        </div>
        <div v-if="latestTask.aiTaskId">
          <dt>智能任务编号</dt>
          <dd>
            {{ latestTask.aiTaskId }}
            <UiButton
              v-if="latestTask.taskStatus === PortfolioAnnualReportTaskStatusCode.SUCCESS"
              size="sm"
              class="annual-report__view-btn"
              @click="openReportDetail(latestTask)"
            >
              查看报告
            </UiButton>
          </dd>
        </div>
        <div v-if="latestTask.errorSummary">
          <dt>失败摘要</dt>
          <dd>{{ latestTask.errorSummary }}</dd>
        </div>
      </dl>
    </UiCard>
    <UiCard title="历史任务" class="annual-report__result">
      <UiDataTable
        row-key="id"
        :columns="historyColumns"
        :data-source="reportHistory"
        :loading="historyLoading"
        :pagination="historyPagination"
        @change="onHistoryTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'taskStatus'">
            <UiTag :tone="taskStatusTone(record.taskStatus)">
              {{ taskStatusLabel(record.taskStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'teacher'">
            <span>
              {{ record.teacherName || `教师编号 ${record.teacherId}` }}
              <template v-if="record.teacherNumber">（{{ record.teacherNumber }}）</template>
            </span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              size="sm"
              :disabled="
                record.taskStatus !== PortfolioAnnualReportTaskStatusCode.SUCCESS
                  || !record.aiTaskId
              "
              @click="openReportDetail(record)"
            >
              查看报告
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.annual-report__form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.annual-report__field {
  width: 240px;
}

.annual-report__field--year {
  width: 120px;
}

.annual-report__result {
  margin-top: 16px;
}

.annual-report__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.annual-report__meta dt {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary, #666);
}

.annual-report__meta dd {
  margin: 4px 0 0;
}

.annual-report__view-btn {
  margin-left: 8px;
}
</style>
