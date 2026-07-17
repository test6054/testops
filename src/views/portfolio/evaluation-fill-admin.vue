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
import { useRoute } from 'vue-router'
import {
  PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES,
  PORTFOLIO_EVALUATION_ENTRY_WRITABLE_STATUSES,
  PORTFOLIO_EVALUATION_EXTERNAL_EXPERT_ENTRY_WRITABLE_STATUSES,
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
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { loadAllPages } from '@/utils/load-all-pages'
import { buildEmptyPageResult } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const route = useRoute()
const isExternalExpertFill = computed(() => route.name === 'PortfolioExpertEvaluationFill')
const activeTab = ref('fill')
const fillTabItems = computed(() => {
  const items: Array<{ key: string, label: string }> = [{ key: 'fill', label: '在线填报' }]
  if (!isExternalExpertFill.value) {
    items.push({ key: 'summary', label: '汇总分析' })
  }
  return items
})
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
/** 任务列表 / 填报上下文 / 汇总 独立请求 token，防任务切换串写 */
const tasksRequestToken = ref(0)
const fillContextRequestToken = ref(0)
const summaryRequestToken = ref(0)
const tasks = ref<PortfolioEvaluationTaskVO[]>([])
const selectedTaskId = ref(
  typeof route.query.evaluationTaskId === 'string' ? route.query.evaluationTaskId : '',
)
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
const entryWritableStatuses = computed(() =>
  isExternalExpertFill.value
    ? PORTFOLIO_EVALUATION_EXTERNAL_EXPERT_ENTRY_WRITABLE_STATUSES
    : PORTFOLIO_EVALUATION_ENTRY_WRITABLE_STATUSES,
)

const fillWindowBlockedReason = computed(() => {
  const task = selectedTask.value
  if (!task) {
    return ''
  }
  if (!entryWritableStatuses.value.includes(task.taskStatus)) {
    return isExternalExpertFill.value
      ? `当前任务状态不可填报（${task.taskStatus}），外部专家仅「专家评审中」可填分`
      : `当前任务状态不可填报（${task.taskStatus}），仅「已发布」或「专家评审中」可填分`
  }
  if (!task.startTime || !task.endTime) {
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
    return tasks.value.filter((item) =>
      entryWritableStatuses.value.includes(item.taskStatus),
    )
  }
  return tasks.value.filter((item) =>
    PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES.includes(item.taskStatus),
  )
})

async function loadTasks() {
  const currentToken = ++tasksRequestToken.value
  loading.value = true
  try {
    const rows = await loadAllPages(
      ({ pageNum, pageSize }) =>
        portfolioEvaluationTaskApi.page({
          pageNum,
          pageSize,
        }),
      QUALITY_SELECTOR_PAGE_SIZE,
    )
    if (currentToken !== tasksRequestToken.value) {
      return
    }
    tasks.value = rows
    const pool = selectableTasks.value
    if (selectedTaskId.value && !pool.some((item) => item.id === selectedTaskId.value)) {
      selectedTaskId.value = ''
    }
  } catch (error) {
    if (currentToken !== tasksRequestToken.value) {
      return
    }
    tasks.value = []
    showUserError(error, '加载评价任务失败')
  } finally {
    if (currentToken === tasksRequestToken.value) {
      loading.value = false
    }
  }
}

async function loadFillContext() {
  const taskId = selectedTaskId.value
  const currentToken = ++fillContextRequestToken.value
  if (!taskId) {
    subjectTeacherOptions.value = []
    indicatorOptions.value = []
    fillForm.subjectTeacherUserId = ''
    fillForm.indicatorCode = ''
    return
  }
  try {
    const context = await portfolioEvaluationTaskApi.fillContext({ id: taskId })
    if (currentToken !== fillContextRequestToken.value || selectedTaskId.value !== taskId) {
      return
    }
    subjectTeacherOptions.value = context.subjectTeacherOptions
    indicatorOptions.value = context.indicatorOptions
    fillForm.subjectTeacherUserId = ''
    fillForm.indicatorCode = ''
  } catch (error) {
    if (currentToken !== fillContextRequestToken.value || selectedTaskId.value !== taskId) {
      return
    }
    subjectTeacherOptions.value = []
    indicatorOptions.value = []
    showUserError(error, '加载填报上下文失败')
  }
}

async function loadEntries() {
  if (!selectedTaskId.value) return
  entryFilters.value = { evaluationTaskId: selectedTaskId.value }
  await searchEntries()
}

async function loadSummary() {
  if (isExternalExpertFill.value) {
    summary.value = null
    return
  }
  const taskId = selectedTaskId.value
  const currentToken = ++summaryRequestToken.value
  if (!taskId) {
    summary.value = null
    return
  }
  loading.value = true
  try {
    const row = await portfolioEvaluationEntryApi.summary({ id: taskId })
    if (currentToken !== summaryRequestToken.value || selectedTaskId.value !== taskId) {
      return
    }
    summary.value = row
  } catch (error) {
    if (currentToken !== summaryRequestToken.value || selectedTaskId.value !== taskId) {
      return
    }
    summary.value = null
    showUserError(error, '加载评价汇总失败')
  } finally {
    if (currentToken === summaryRequestToken.value) {
      loading.value = false
    }
  }
}

async function saveEntry() {
  if (saving.value) {
    return
  }
  if (!selectedTaskId.value) {
    showFormValidationMessage('请选择已发布任务')
    return
  }
  if (!canSaveEntry.value) {
    showFormValidationMessage(fillWindowBlockedReason.value || '当前不可填报')
    return
  }
  if (!fillForm.subjectTeacherUserId.trim() || fillForm.score === undefined) {
    showFormValidationMessage('请填写被评教师与得分')
    return
  }
  if (isByIndicator.value && !fillForm.indicatorCode.trim()) {
    showFormValidationMessage('以指标为主模式须选择指标')
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
    showUserError(error, '保存评价填报失败')
  } finally {
    saving.value = false
  }
}

async function exportSummaryCsv() {
  if (exporting.value || saving.value) {
    return
  }
  if (!selectedTaskId.value) {
    showFormValidationMessage('请选择已发布任务')
    return
  }
  exporting.value = true
  try {
    const result = await portfolioEvaluationEntryApi.exportSummary({ id: selectedTaskId.value })
    await downloadPortfolioExcelExport(result)
    message.success('汇总已导出')
  } catch (error) {
    showUserError(error, '导出评价汇总失败')
  } finally {
    exporting.value = false
  }
}

watch(selectedTaskId, async () => {
  // 切换任务：作废在途上下文/汇总请求并清空旧数据，避免旧任务条目写到新任务
  fillContextRequestToken.value += 1
  summaryRequestToken.value += 1
  subjectTeacherOptions.value = []
  indicatorOptions.value = []
  fillForm.subjectTeacherUserId = ''
  fillForm.indicatorCode = ''
  fillForm.score = undefined
  fillForm.commentText = ''
  summary.value = null
  await loadFillContext()
  await loadSummary()
  if (activeTab.value === 'fill') {
    void loadEntries()
  }
})

watch(activeTab, (tab) => {
  const pool = selectableTasks.value
  if (selectedTaskId.value && !pool.some((item) => item.id === selectedTaskId.value)) {
    selectedTaskId.value = ''
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
        <UiSelect
          v-model="selectedTaskId"
          placeholder="选择已发布任务"
          style="width: 280px"
          size="sm"
          :loading="loading"
          :options="selectableTasks.map((task) => ({
            value: task.id,
            label: `${task.taskName}（${evaluationModeLabel(task.evaluationMode)}）`,
          }))"
        />
        <UiButton size="sm" @click="loadTasks"> 刷新任务 </UiButton>
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
      <UiSectionTabs
        v-model="activeTab"
        :items="fillTabItems"
        compact
        divided
      />
      <template v-if="activeTab === 'fill'">
        <div class="form-grid">
          <UiSelect
            v-model="fillForm.subjectTeacherUserId"
            placeholder="被评教师"
            style="width: 220px"
            allow-search
            option-filter-prop="label"
            
            size="sm"
            :options="subjectTeacherOptions.map((teacher) => ({ value: teacher.teacherUserId, label: teacher.fullName }))"
          />
          <UiSelect
            v-if="isByIndicator"
            v-model="fillForm.indicatorCode"
            placeholder="评价指标"
            style="width: 200px"
            allow-search
            option-filter-prop="label"
            
            size="sm"
            :options="indicatorOptions.map((indicator) => ({ value: indicator.indicatorCode, label: indicator.indicatorName }))"
          />
          <UiInputNumber
            size="sm"
            v-model="fillForm.score"
            placeholder="得分"
            style="width: 100px"
          />
          <UiInput
            size="sm" v-model="fillForm.commentText" placeholder="评语" style="flex: 1"
          />
          <UiButton
            size="sm"
            variant="primary"
            :loading="saving"
            :disabled="!canSaveEntry"
            @click="saveEntry"
          >
            保存评价
          </UiButton>
        </div>
        <UiEmpty
          size="sm"
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
      </template>
      <template v-else-if="!isExternalExpertFill && activeTab === 'summary'">
        <div v-if="summary" class="summary-meta">
          <span>条目 {{ summary.entryCount }}</span>
          <span>平均分 {{ summary.averageScore }}</span>
          <span>模式 {{ evaluationModeLabel(summary.evaluationMode) }}</span>
          <UiButton size="sm" :loading="exporting" @click="exportSummaryCsv"> 导出表格文件 </UiButton>
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
      </template>
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
  gap: var(--dp-space-3, 12px);
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}
.fill-window-hint {
  color: var(--dp-text-muted);
  font-size: 14px;
}
</style>
