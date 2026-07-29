<script setup lang="ts">
import type { PortfolioAnalysisAnnualReportVO } from '@/apis/portfolio/analysis'
import type { PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import {
  PortfolioAnnualReportTaskStatusCode,
  PortfolioAnnualReportTaskStatusDescription,
} from '@/types/enums/portfolio-annual-report-task-status-enum'
import { showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import {
  formatPortfolioTeacherDisplay,
  portfolioTeacherSelectOptionsFromSummaries,
} from '@/utils/portfolio-teacher-display'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_INTERVAL_MS = 30000
const POLL_FAIL_PAUSE_THRESHOLD = 5

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
/** 院系路由或非租户管理员：院系年度报告口径（PRD §7.7.7 / §7.12） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系年度报告' : '年度报告'))
const pageSubtitle = computed(() =>
  isDepartmentScoped.value
    ? '生成与查询本院系教师年度报告任务'
    : '生成与查询教师年度报告任务',
)

const loading = ref(false)
const historyLoading = ref(false)
const historyLoadFailed = ref(false)
const historyStale = ref(false)
const historyLastSuccessAt = ref('')
const teachers = ref<PortfolioTeacherSummaryVO[]>([])
const teacherSearchToken = ref(0)
const latestTask = ref<PortfolioAnalysisAnnualReportVO | null>(null)
const reportHistory = ref<PortfolioAnalysisAnnualReportVO[]>([])
const historyTotal = ref(0)
const pollTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const pollConsecutiveFailures = ref(0)
const pollSyncFailed = ref(false)
const pollPaused = ref(false)
const pollLastSuccessAt = ref('')
const pollBackoffMs = ref(POLL_INTERVAL_MS)
/** 历史列表请求隔离，防止教师/年度快速切换时旧响应串写 */
const historyRequestToken = ref(0)
/** 轮询请求隔离，切换任务后丢弃旧轮询结果 */
const pollRequestToken = ref(0)
const historyQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const form = reactive({
  teacherId: '',
  reportYear: String(new Date().getFullYear()),
})

const teacherOptions = computed(() => portfolioTeacherSelectOptionsFromSummaries(teachers.value))
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null

/** 管理端为选中教师生成年报：写禁以目标教师生命周期为准 */
const selectedTeacherId = computed(() => form.teacherId || undefined)
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
} = usePortfolioArchiveWriteGuard({ teacherId: selectedTeacherId })

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

function markSuccessNow(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function stopPolling() {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value)
    pollTimer.value = null
  }
}

function resetPollState() {
  stopPolling()
  pollConsecutiveFailures.value = 0
  pollSyncFailed.value = false
  pollPaused.value = false
  pollBackoffMs.value = POLL_INTERVAL_MS
}

function scheduleNextPoll() {
  stopPolling()
  if (latestTask.value?.taskStatus !== PortfolioAnnualReportTaskStatusCode.RUNNING) {
    return
  }
  if (pollPaused.value) {
    return
  }
  pollTimer.value = setTimeout(() => {
    void refreshLatestTask()
  }, pollBackoffMs.value)
}

function startPollingIfRunning() {
  resetPollState()
  scheduleNextPoll()
}

async function refreshLatestTask() {
  const taskId = latestTask.value?.id
  if (!taskId) {
    return
  }
  const currentToken = ++pollRequestToken.value
  try {
    const row = await portfolioAnalysisApi.getAnnualReport({ id: taskId })
    if (currentToken !== pollRequestToken.value || latestTask.value?.id !== taskId) {
      return
    }
    pollConsecutiveFailures.value = 0
    pollBackoffMs.value = POLL_INTERVAL_MS
    pollSyncFailed.value = false
    pollPaused.value = false
    pollLastSuccessAt.value = markSuccessNow()
    latestTask.value = row
    if (row.taskStatus !== PortfolioAnnualReportTaskStatusCode.RUNNING) {
      stopPolling()
      await loadReportHistory({ errorMessage: '任务已结束，历史列表刷新失败' })
      return
    }
    scheduleNextPoll()
  } catch (error) {
    if (currentToken !== pollRequestToken.value || latestTask.value?.id !== taskId) {
      return
    }
    pollConsecutiveFailures.value += 1
    pollSyncFailed.value = true
    pollBackoffMs.value = Math.min(
      POLL_MAX_INTERVAL_MS,
      POLL_INTERVAL_MS * 2 ** Math.min(pollConsecutiveFailures.value - 1, 4),
    )
    if (pollConsecutiveFailures.value >= POLL_FAIL_PAUSE_THRESHOLD) {
      pollPaused.value = true
      stopPolling()
      showUserError(
        error,
        '年度报告状态同步连续失败，已暂停轮询；任务可能仍在运行，可点「刷新状态」继续同步',
      )
      return
    }
    scheduleNextPoll()
  }
}

/** 手动恢复状态同步：不清空当前 RUNNING 任务，也不把网络失败改写成业务失败。 */
function resumePollSync() {
  if (!latestTask.value?.id) {
    return
  }
  pollPaused.value = false
  pollConsecutiveFailures.value = 0
  pollBackoffMs.value = POLL_INTERVAL_MS
  void refreshLatestTask()
}

async function loadReportHistory(options?: { errorMessage?: string }): Promise<boolean> {
  const currentToken = ++historyRequestToken.value
  const requestTeacherId = form.teacherId || undefined
  const requestReportYear = reportYearFilter.value
  const requestPageNum = historyQuery.pageNum
  const requestPageSize = historyQuery.pageSize
  historyLoading.value = true
  historyLoadFailed.value = false
  try {
    const page = await portfolioAnalysisApi.pageAnnualReports({
      pageNum: requestPageNum,
      pageSize: requestPageSize,
      teacherId: requestTeacherId,
      reportYear: requestReportYear,
    })
    if (
      currentToken !== historyRequestToken.value
      || (form.teacherId || undefined) !== requestTeacherId
      || reportYearFilter.value !== requestReportYear
      || historyQuery.pageNum !== requestPageNum
      || historyQuery.pageSize !== requestPageSize
    ) {
      return false
    }
    reportHistory.value = page.list ?? []
    historyTotal.value = page.total ?? 0
    historyStale.value = false
    historyLastSuccessAt.value = markSuccessNow()
    return true
  } catch (error) {
    if (currentToken !== historyRequestToken.value) {
      return false
    }
    historyLoadFailed.value = true
    if (reportHistory.value.length > 0) {
      historyStale.value = true
    }
    showUserError(error, options?.errorMessage ?? '加载报告历史失败')
    return false
  } finally {
    if (currentToken === historyRequestToken.value) {
      historyLoading.value = false
    }
  }
}

function onHistoryTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  historyQuery.pageNum = pageNum
  historyQuery.pageSize = pageSize
  void loadReportHistory()
}

const historyColumns = [
  // 身份层列在 bodyCell 渲染

  { title: '教师', key: 'teacher', width: 180 },
  { title: '身份层', key: 'ownerIdentityLayers', width: 200 },
  { title: '报告年度', dataIndex: 'reportYear', key: 'reportYear', width: 100 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '失败摘要', dataIndex: 'errorSummary', key: 'errorSummary', ellipsis: true },
  { title: '主行动', key: 'actions', width: 120 },
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

function formatTaskTeacher(task: PortfolioAnalysisAnnualReportVO): string {
  if (!task.teacherId?.trim()) {
    return '—'
  }
  return formatPortfolioTeacherDisplay(task.teacherName, task.teacherNumber)
}

function keepSelectedTeacher(rows: PortfolioTeacherSummaryVO[]): PortfolioTeacherSummaryVO[] {
  const selectedId = form.teacherId
  if (!selectedId) {
    return rows
  }
  if (rows.some((item) => item.userId === selectedId)) {
    return rows
  }
  const selected = teachers.value.find((item) => item.userId === selectedId)
  return selected ? [selected, ...rows] : rows
}

function mergeTeacherOptions(rows: PortfolioTeacherSummaryVO[]) {
  const optionMap = new Map(teachers.value.map((item) => [item.userId, item]))
  for (const row of rows) {
    optionMap.set(row.userId, row)
  }
  teachers.value = Array.from(optionMap.values())
}

async function loadTeachers(keyword?: string) {
  const currentToken = ++teacherSearchToken.value
  const requestKeyword = keyword?.trim() || ''
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: requestKeyword || undefined,
    })
    if (currentToken !== teacherSearchToken.value) {
      return
    }
    if (requestKeyword) {
      teachers.value = keepSelectedTeacher(page.list ?? [])
    } else {
      mergeTeacherOptions(page.list ?? [])
    }
  } catch (error) {
    if (currentToken !== teacherSearchToken.value) {
      return
    }
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
  if (!assertArchiveWritable('提交年度报告生成')) {
    return
  }
  if (loading.value) {
    return
  }
  const requestTeacherId = form.teacherId
  const requestReportYear = reportYearFilter.value
  loading.value = true
  pollRequestToken.value += 1
  resetPollState()
  try {
    const row = await portfolioAnalysisApi.generateAnnualReport({
      teacherId: requestTeacherId,
      reportYear: requestReportYear,
    })
    if (form.teacherId !== requestTeacherId || reportYearFilter.value !== requestReportYear) {
      await loadReportHistory({ errorMessage: '年度报告已提交，历史列表刷新失败' })
      return
    }
    latestTask.value = row
    historyQuery.pageNum = 1
    startPollingIfRunning()
  } catch (error) {
    if (form.teacherId === requestTeacherId && reportYearFilter.value === requestReportYear) {
      showUserError(error, '年度报告生成失败')
    }
    return
  } finally {
    loading.value = false
  }
  await loadReportHistory({ errorMessage: '年度报告已提交，历史列表刷新失败' })
}

onMounted(() => {
  void loadTeachers().then(() => loadReportHistory())
})

onUnmounted(() => {
  resetPollState()
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
    // Scope 变化：作废在途读/轮询，清空旧任务与历史，再按新筛选加载
    historyRequestToken.value += 1
    pollRequestToken.value += 1
    resetPollState()
    latestTask.value = null
    reportHistory.value = []
    historyTotal.value = 0
    historyLoading.value = false
    historyLoadFailed.value = false
    historyStale.value = false
    historyQuery.pageNum = 1
    void loadReportHistory()
  },
)

const AnnualReportSignalMetrics = computed<SignalMetric[]>(() => {
  return applySpotlightEmphasis([
    {
      key: 'history',
      label: '报告任务',
      value: historyTotal.value,
      clickable: true,
    },
    {
      key: 'teachers',
      label: '可选教师',
      value: teachers.value.length,
      helper: '当前已加载',
    },
  ], { primaryKey: 'history', actionLabel: '刷新' })
})

function onAnnualReportSignalClick(_key: string) {
  void loadReportHistory()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="pageTitle"
        :subtitle="pageSubtitle"
      />
    </template>
    <template v-if="AnnualReportSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="AnnualReportSignalMetrics"
        @metric-click="onAnnualReportSignalClick"
      />
    </template>
    <UiCard title="生成任务">
      <div class="annual-report__form">
        <UiSelect
          size="sm"
          v-model="form.teacherId"
          placeholder="选择教师"
          :options="teacherOptions"
          class="annual-report__field"
          allow-search
          :filter-option="false"
          option-label-prop="label"
          @focus="() => loadTeachers()"
          @search="handleTeacherSearch"
        />
        <UiInput
          size="sm"
          v-model="form.reportYear"
          placeholder="报告年度"
          class="annual-report__field annual-report__field--year"
          :maxlength="4"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="loading"
          :disabled="archiveWriteForbidden"
          @click="generateReport"
        >
          提交生成
        </UiButton>
      </div>
      <p v-if="archiveWriteForbidden" class="annual-report__block">
        {{ archiveWriteBlockMessage }}
      </p>
    </UiCard>
    <UiCard v-if="latestTask" title="最近任务" class="annual-report__result">
      <UiAlertStrip
        v-if="pollSyncFailed"
        tone="warning"
        class="annual-report__stale"
        :description="pollPaused
          ? `状态同步已暂停${pollLastSuccessAt ? `（上次成功 ${pollLastSuccessAt}）` : ''}；任务可能仍在运行，请点「刷新状态」继续同步。`
          : `状态同步失败，正在退避重试${pollLastSuccessAt ? `（上次成功 ${pollLastSuccessAt}）` : ''}。`"
      />
      <div v-if="pollSyncFailed" class="annual-report__sync-actions">
        <UiButton size="sm" variant="outline" @click="resumePollSync">刷新状态</UiButton>
      </div>
      <dl class="annual-report__meta">
        <div>
          <dt>教师</dt>
          <dd>
            {{ formatTaskTeacher(latestTask) }}
            <div
              v-if="latestTask.lifecycleStatus || latestTask.ownerIdentityLayers?.length"
              class="annual-report__identity"
            >
              <UiTag
                v-if="latestTask.lifecycleStatus"
                size="sm"
                :tone="
                  portfolioLifecycleTagTone(latestTask.lifecycleStatus)
                "
              >
                {{ portfolioLifecycleStatusDisplay(latestTask.lifecycleStatus) }}
              </UiTag>
              <UiTag v-if="latestTask.evaluationHeld" size="sm" tone="orange">参评 hold</UiTag>
              <PortfolioOwnerIdentityLayersCell
                v-if="latestTask.ownerIdentityLayers?.length"
                :layers="latestTask.ownerIdentityLayers"
                :note="latestTask.ownerMultiIdentityNote"
                :row-key="latestTask.id"
                show-note
              />
            </div>
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
        <div
          v-if="
            latestTask.aiTaskId
              || latestTask.taskStatus === PortfolioAnnualReportTaskStatusCode.SUCCESS
          "
        >
          <dt>报告结果</dt>
          <dd>
            <UiButton
              v-if="latestTask.taskStatus === PortfolioAnnualReportTaskStatusCode.SUCCESS"
              size="sm"
              class="annual-report__view-btn"
              @click="openReportDetail(latestTask)"
            >
              查看报告
            </UiButton>
            <span v-else>生成中或尚未完成</span>
          </dd>
        </div>
        <div v-if="latestTask.errorSummary">
          <dt>失败摘要</dt>
          <dd>{{ latestTask.errorSummary }}</dd>
        </div>
      </dl>
    </UiCard>
    <UiCard title="历史任务" class="annual-report__result">
      <UiAlertStrip
        v-if="historyLoadFailed && historyStale"
        tone="warning"
        class="annual-report__stale"
        title="历史列表同步失败"
      />
      <UiDataTable
        row-key="id"
        :columns="historyColumns"
        :data-source="reportHistory"
        :loading="historyLoading"
        :load-error="historyLoadFailed && reportHistory.length === 0"
        :pagination="historyPagination"
        @change="onHistoryTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ownerIdentityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="record.id"
            />
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag :tone="taskStatusTone(record.taskStatus)">
              {{ taskStatusLabel(record.taskStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'teacher'">
            <span>{{ formatTaskTeacher(record) }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :max-visible="2"
              :items="[
                {
                  key: 'view',
                  label: '查看报告',
                  disabled:
                    record.taskStatus !== PortfolioAnnualReportTaskStatusCode.SUCCESS
                    || !record.aiTaskId,
                },
              ]"
              split
              @action="() => openReportDetail(record)"
            />
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
  gap: var(--dp-space-component-tight);
  align-items: center;
}

.annual-report__field {
  width: 240px;
}

.annual-report__field--year {
  width: 120px;
}

.annual-report__result {
  margin-top: var(--dp-space-block);
}

.annual-report__stale {
  margin-bottom: var(--dp-space-component);
}

.annual-report__sync-actions {
  margin-bottom: var(--dp-space-component);
}

.annual-report__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-component);
  margin: 0;
}

.annual-report__meta dt {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.annual-report__meta dd {
  margin: var(--dp-space-component-xs) 0 0;
}

.annual-report__view-btn {
  margin-left: var(--dp-space-component-tight);
}

.annual-report__block {
  margin: var(--dp-space-component-tight) 0 0;
  color: var(--dp-danger, #cf1322);
  font-size: var(--dp-font-size-sm);
}

.annual-report__identity {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component-xs);
}
</style>
