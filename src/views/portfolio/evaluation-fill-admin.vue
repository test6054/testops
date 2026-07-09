<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationModeCode } from '@/apis/portfolio/enums'
import type {
  PortfolioEvaluationEntrySummaryItemVO,
  PortfolioEvaluationEntrySummaryVO,
  PortfolioEvaluationEntryVO,
  PortfolioEvaluationIndicatorOptionVO,
  PortfolioEvaluationSubjectTeacherOptionVO,
  PortfolioEvaluationTaskVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES,
  PortfolioEvaluationModeDescription,
} from '@/apis/portfolio/enums'
import {
  portfolioEvaluationEntryApi,
  portfolioEvaluationTaskApi,
} from '@/apis/portfolio/teacher-platform'
import { QUALITY_SELECTOR_PAGE_SIZE } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import { showUserError } from '@/utils/error-handler'
import { buildEmptyPageResult } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const activeTab = ref('fill')
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const tasks = ref<PortfolioEvaluationTaskVO[]>([])
const selectedTaskId = ref('')
const summary = ref<PortfolioEvaluationEntrySummaryVO | null>(null)
const subjectTeacherOptions = ref<PortfolioEvaluationSubjectTeacherOptionVO[]>([])
const indicatorOptions = ref<PortfolioEvaluationIndicatorOptionVO[]>([])

const {
  loading: entryTableLoading,
  rows: entries,
  pageNum: entryPageNum,
  pageSize: entryPageSize,
  pageTotal: entryPageTotal,
  filters: entryFilters,
  handlePageChange: handleEntryPageChange,
  search: searchEntries,
} = useQueryTable<PortfolioEvaluationEntryVO, { evaluationTaskId: string }>(
  (params) => {
    const { evaluationTaskId, ...pageParams } = params
    if (!evaluationTaskId) {
      return Promise.resolve(
        buildEmptyPageResult<PortfolioEvaluationEntryVO>(pageParams.pageNum, pageParams.pageSize),
      )
    }
    return portfolioEvaluationEntryApi.page({ evaluationTaskId, ...pageParams })
  },
  { immediate: false, errorMessage: '加载填答记录失败' },
)

const fillForm = reactive<{
  subjectTeacherUserId: string
  indicatorCode: string
  score?: number
  commentText: string
}>({
  subjectTeacherUserId: '',
  indicatorCode: '',
  score: undefined,
  commentText: '',
})

const selectedTask = computed(() => tasks.value.find((item) => item.id === selectedTaskId.value))
const isByIndicator = computed(() => selectedTask.value?.evaluationMode === 'BY_INDICATOR')
const fillWindowBlockedReason = computed(() => {
  const task = selectedTask.value
  if (!task?.startTime || !task?.endTime) {
    return '评价任务未配置完整时间窗，暂不可填报'
  }
  const now = Date.now()
  const start = Date.parse(task.startTime)
  const end = Date.parse(task.endTime)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return '评价任务时间窗格式无效，暂不可填报'
  }
  if (now < start) {
    return `评价尚未开始（${task.startTime} 起）`
  }
  if (now > end) {
    return `评价已结束（截止 ${task.endTime}）`
  }
  return ''
})
const canSaveEntry = computed(() => !fillWindowBlockedReason.value)

const taskSummaryItems = computed<UiStatPanelItem[]>(() => {
  if (!summary.value) {
    return []
  }
  return [
    {
      key: 'entries',
      label: '填报条目',
      value: String(summary.value.entryCount),
      tone: 'blue',
    },
    { key: 'avg', label: '平均分', value: summary.value.averageScore, unit: '分' },
    { key: 'mode', label: '评价模式', value: evaluationModeLabel(summary.value.evaluationMode) },
  ]
})

const entryColumns: ColumnsType<PortfolioEvaluationEntryVO> = [
  { title: '被评教师', dataIndex: 'subjectTeacherUserId', key: 'subjectTeacherUserId', width: 100 },
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '得分', dataIndex: 'score', key: 'score', width: 72 },
  { title: '评语', dataIndex: 'commentText', key: 'commentText' },
  { title: '评价人', dataIndex: 'evaluatorUserId', key: 'evaluatorUserId', width: 100 },
]

const summaryColumns = computed<ColumnsType<PortfolioEvaluationEntrySummaryItemVO>>(() => {
  const metricColumns: ColumnsType<PortfolioEvaluationEntrySummaryItemVO> = [
    { title: '条目数', dataIndex: 'entryCount', key: 'entryCount', width: 80 },
    { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 88 },
  ]
  if (summary.value?.evaluationMode === 'BY_INDICATOR') {
    return [
      { title: '指标编码', dataIndex: 'indicatorCode', key: 'indicatorCode' },
      ...metricColumns,
    ]
  }
  return [
    {
      title: '被评教师',
      dataIndex: 'subjectTeacherUserId',
      key: 'subjectTeacherUserId',
      width: 100,
    },
    ...metricColumns,
  ]
})

function evaluationModeLabel(mode: PortfolioEvaluationModeCode): string {
  return strictEnumLabel(PortfolioEvaluationModeDescription, mode, '多元评价模式')
}

function summaryRowKey(record: unknown): string {
  const row = record as PortfolioEvaluationEntrySummaryItemVO
  if (row.indicatorCode) {
    return row.indicatorCode
  }
  if (row.subjectTeacherUserId) {
    return row.subjectTeacherUserId
  }
  return `${row.entryCount}-${row.averageScore}`
}

function subjectTeacherLabel(teacherUserId: string): string {
  const option = subjectTeacherOptions.value.find((item) => item.teacherUserId === teacherUserId)
  return option ? `${option.fullName} (${teacherUserId})` : teacherUserId
}

const selectableTasks = computed(() => {
  if (activeTab.value === 'fill') {
    return tasks.value.filter((item) => item.taskStatus === 'PUBLISHED')
  }
  return tasks.value.filter((item) =>
    PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES.includes(item.taskStatus),
  )
})

async function loadTasks() {
  loading.value = true
  try {
    const page = await portfolioEvaluationTaskApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
    })
    tasks.value = page.list
    const pool = selectableTasks.value
    if (!selectedTaskId.value && pool.length) {
      selectedTaskId.value = pool[0].id
    } else if (selectedTaskId.value && !pool.some((item) => item.id === selectedTaskId.value)) {
      selectedTaskId.value = pool[0]?.id ?? ''
    }
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadFillContext() {
  if (!selectedTaskId.value) {
    subjectTeacherOptions.value = []
    indicatorOptions.value = []
    fillForm.subjectTeacherUserId = ''
    fillForm.indicatorCode = ''
    return
  }
  try {
    const context = await portfolioEvaluationTaskApi.fillContext({ id: selectedTaskId.value })
    subjectTeacherOptions.value = context.subjectTeacherOptions
    indicatorOptions.value = context.indicatorOptions
    fillForm.subjectTeacherUserId = ''
    fillForm.indicatorCode = ''
  } catch (error) {
    showUserError(error)
  }
}

async function loadEntries() {
  if (!selectedTaskId.value) return
  entryFilters.value = { evaluationTaskId: selectedTaskId.value }
  await searchEntries()
}

async function loadSummary() {
  if (!selectedTaskId.value) {
    summary.value = null
    return
  }
  loading.value = true
  try {
    summary.value = await portfolioEvaluationEntryApi.summary({ id: selectedTaskId.value })
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function saveEntry() {
  if (!selectedTaskId.value) {
    message.warning('请选择已发布任务')
    return
  }
  if (!canSaveEntry.value) {
    message.warning(fillWindowBlockedReason.value || '当前不可填报')
    return
  }
  if (!fillForm.subjectTeacherUserId.trim() || fillForm.score === undefined) {
    message.warning('请填写被评教师与得分')
    return
  }
  if (isByIndicator.value && !fillForm.indicatorCode.trim()) {
    message.warning('以指标为主模式须选择指标')
    return
  }
  saving.value = true
  try {
    await portfolioEvaluationEntryApi.save({
      evaluationTaskId: selectedTaskId.value,
      subjectTeacherUserId: fillForm.subjectTeacherUserId.trim(),
      indicatorCode: isByIndicator.value ? fillForm.indicatorCode.trim() : undefined,
      score: fillForm.score,
      commentText: fillForm.commentText.trim() || undefined,
    })
    message.success('评价已保存')
    fillForm.score = undefined
    fillForm.commentText = ''
    await Promise.all([loadEntries(), loadSummary()])
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function exportSummaryCsv() {
  if (!selectedTaskId.value) {
    message.warning('请选择已发布任务')
    return
  }
  exporting.value = true
  try {
    const result = await portfolioEvaluationEntryApi.exportSummary({ id: selectedTaskId.value })
    await downloadPortfolioExcelExport(result)
    message.success('汇总已导出')
  } catch (error) {
    showUserError(error)
  } finally {
    exporting.value = false
  }
}

watch(selectedTaskId, async () => {
  await loadFillContext()
  await loadSummary()
  if (activeTab.value === 'fill') {
    void loadEntries()
  }
})

watch(activeTab, (tab) => {
  const pool = selectableTasks.value
  if (selectedTaskId.value && !pool.some((item) => item.id === selectedTaskId.value)) {
    selectedTaskId.value = pool[0]?.id ?? ''
  }
  if (tab === 'summary') {
    void loadSummary()
  } else {
    void loadEntries()
  }
})

onMounted(async () => {
  await loadTasks()
  if (selectedTaskId.value) {
    await loadFillContext()
    await loadSummary()
    await loadEntries()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="多元评价填报" />
    </template>
    <UiCard>
      <div class="toolbar">
        <a-select
          v-model:value="selectedTaskId"
          placeholder="选择已发布任务"
          style="width: 280px"
          :loading="loading"
        >
          <a-select-option v-for="task in selectableTasks" :key="task.id" :value="task.id">
            {{ task.taskName }}（{{ evaluationModeLabel(task.evaluationMode) }}）
          </a-select-option>
        </a-select>
        <UiButton @click="loadTasks"> 刷新任务 </UiButton>
        <span v-if="fillWindowBlockedReason" class="fill-window-hint">{{
          fillWindowBlockedReason
        }}</span>
      </div>
      <UiStatPanel
        v-if="summary && selectedTaskId"
        :items="taskSummaryItems"
        :columns="3"
        variant="grid"
        compact
        style="margin-bottom: 16px"
      />
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="fill" tab="在线填报">
          <div class="form-grid">
            <a-select
              v-model:value="fillForm.subjectTeacherUserId"
              placeholder="被评教师"
              style="width: 220px"
              show-search
              option-filter-prop="label"
            >
              <a-select-option
                v-for="teacher in subjectTeacherOptions"
                :key="teacher.teacherUserId"
                :value="teacher.teacherUserId"
                :label="teacher.fullName"
              >
                {{ teacher.fullName }}
              </a-select-option>
            </a-select>
            <a-select
              v-if="isByIndicator"
              v-model:value="fillForm.indicatorCode"
              placeholder="评价指标"
              style="width: 200px"
              show-search
              option-filter-prop="label"
            >
              <a-select-option
                v-for="indicator in indicatorOptions"
                :key="indicator.indicatorCode"
                :value="indicator.indicatorCode"
                :label="indicator.indicatorName"
              >
                {{ indicator.indicatorName }}
              </a-select-option>
            </a-select>
            <a-input-number
              v-model:value="fillForm.score"
              placeholder="得分"
              style="width: 100px"
            />
            <a-input v-model:value="fillForm.commentText" placeholder="评语" style="flex: 1" />
            <UiButton
              variant="primary"
              :loading="saving"
              :disabled="!canSaveEntry"
              @click="saveEntry"
            >
              保存评价
            </UiButton>
          </div>
          <UiEmpty
            v-if="!entryTableLoading && entries.length === 0"
            description="当前筛选无填答记录"
          />
          <UiDataTable
            v-model:current="entryPageNum"
            v-model:page-size="entryPageSize"
            pagination-mode="server"
            :columns="entryColumns"
            :data-source="entries"
            :loading="entryTableLoading"
            :total="entryPageTotal"
            row-key="id"
            style="margin-top: 16px"
            @page-change="handleEntryPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'subjectTeacherUserId'">
                {{ subjectTeacherLabel(record.subjectTeacherUserId) }}
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="summary" tab="汇总分析">
          <div v-if="summary" class="summary-meta">
            <span>条目 {{ summary.entryCount }}</span>
            <span>平均分 {{ summary.averageScore }}</span>
            <span>模式 {{ evaluationModeLabel(summary.evaluationMode) }}</span>
            <UiButton :loading="exporting" @click="exportSummaryCsv"> 导出 Excel </UiButton>
          </div>
          <UiDataTable
            pagination-mode="none"
            :columns="summaryColumns"
            :data-source="summary?.rows ?? []"
            :loading="loading"
            :row-key="summaryRowKey"
            :show-pagination="false"
            :sticky-header="false"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'subjectTeacherUserId'">
                {{ subjectTeacherLabel(record.subjectTeacherUserId ?? '') }}
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar,
.form-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}
.summary-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}
.fill-window-hint {
  color: var(--dp-text-muted);
  font-size: 14px;
}
</style>
