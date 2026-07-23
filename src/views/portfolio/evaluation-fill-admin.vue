<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioEvaluationModeCode,
  PortfolioEvaluationSceneCode,
} from '@/apis/portfolio/enums'
import type {
  PortfolioEvaluationEntrySummaryItemVO,
  PortfolioEvaluationEntrySummaryVO,
  PortfolioEvaluationEntryVO,
  PortfolioEvaluationIndicatorOptionVO,
  PortfolioEvaluationSubjectTeacherOptionVO,
  PortfolioEvaluationTaskVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES,
  PORTFOLIO_EVALUATION_ENTRY_WRITABLE_STATUSES,
  PORTFOLIO_EVALUATION_EXTERNAL_EXPERT_ENTRY_WRITABLE_STATUSES,
  PortfolioEvaluationModeDescription,
  PortfolioEvaluationSceneDescription,
  PortfolioEvaluationTaskStatusEnum,
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
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { useQueryTable } from '@/composables/useQueryTable'
import {
  PortfolioMultiSourceEvaluatorTypeEnum,
  PortfolioMultiSourceEvaluatorTypeOptions,
} from '@/types/enums/portfolio-multi-source-evaluator-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { loadAllPages } from '@/utils/load-all-pages'
import { buildEmptyPageResult } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
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
  loadError: entryLoadError,
  loadPage: loadEntryPage,
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
  evaluatorSourceType: PortfolioMultiSourceEvaluatorTypeEnum
}>({
  subjectTeacherUserId: '',
  indicatorCode: '',
  score: undefined,
  commentText: '',
  evaluatorSourceType: PortfolioMultiSourceEvaluatorTypeEnum.PEER,
})

/** 被评教师：生命周期参评/写禁预检 */
const fillSubjectTeacherId = computed(() => {
  const raw = fillForm.subjectTeacherUserId
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : undefined
})
const { lifecycleState, archiveWriteForbidden, archiveWriteBlockMessage, reloadLifecycleState }
  = usePortfolioArchiveWriteGuard({ teacherId: fillSubjectTeacherId })
/** 更正复核允许 hold 教师改结论；进行中评价仍 hard 拦参评 hold（PF-P0-264/265）。 */
const evaluationParticipationForbidden = computed(() => {
  const task = tasks.value.find((item) => item.id === selectedTaskId.value)
  if (task?.taskStatus === PortfolioEvaluationTaskStatusEnum.CORRECTION_REVIEW) {
    return false
  }
  return Boolean(
    lifecycleState.value?.evaluationHeld || lifecycleState.value?.archiveWriteForbidden,
  )
})
const evaluationParticipationBlockMessage = computed(() => {
  if (!evaluationParticipationForbidden.value) {
    return ''
  }
  if (archiveWriteForbidden.value) {
    return archiveWriteBlockMessage.value
  }
  const status
    = lifecycleState.value?.lifecycleStatusLabel || lifecycleState.value?.lifecycleStatus || '非在职'
  return `教师生命周期为「${status}」，禁止作为被评对象写入评价。`
})
const correctionHeldSubjectHint = computed(() => {
  const task = tasks.value.find((item) => item.id === selectedTaskId.value)
  if (task?.taskStatus !== PortfolioEvaluationTaskStatusEnum.CORRECTION_REVIEW) {
    return ''
  }
  if (!lifecycleState.value?.evaluationHeld) {
    return ''
  }
  const status
    = lifecycleState.value.lifecycleStatusLabel || lifecycleState.value.lifecycleStatus || '参评hold'
  return `当前为归档更正复核：被评教师生命周期「${status}」仍可按开放复核工单改结论（不套用进行中参评 hold）。`
})
function assertEvaluationParticipable(actionLabel?: string): boolean {
  if (evaluationParticipationForbidden.value) {
    const suffix = actionLabel ? `（${actionLabel}）` : ''
    showFormValidationMessage(evaluationParticipationBlockMessage.value + suffix)
    return false
  }
  return true
}

const selectedTask = computed(() => tasks.value.find((item) => item.id === selectedTaskId.value))
/** 归档更正复核：跳过原评价时间窗与参评 hold 前端误拦（对齐 BE requireEntryOperationTask / PF-P0-264）。 */
const isCorrectionReviewTask = computed(
  () => selectedTask.value?.taskStatus === PortfolioEvaluationTaskStatusEnum.CORRECTION_REVIEW,
)
/** 进行中评价：下拉排除参评 hold；更正复核：全量展示并标注 lifecycle。 */
const participableSubjectTeacherOptions = computed(() => {
  if (isCorrectionReviewTask.value) {
    return subjectTeacherOptions.value
  }
  return subjectTeacherOptions.value.filter((teacher) => !teacher.evaluationHeld)
})
function subjectTeacherOptionLabel(teacher: PortfolioEvaluationSubjectTeacherOptionVO): string {
  const base = formatPortfolioTeacherDisplay(teacher.fullName, teacher.teacherNumber)
  const layers = teacher.ownerIdentityLayers ?? []
  const layerText = layers
    .map((layer) => layer.identityTypeLabel || layer.displayName || layer.identityType)
    .filter(Boolean)
    .join('/')
  if (teacher.evaluationHeld) {
    const status = teacher.lifecycleStatusLabel || teacher.lifecycleStatus || '参评hold'
    return layerText ? `${base}（${layerText} · ${status}）` : `${base}（${status}）`
  }
  return layerText ? `${base}（${layerText}）` : base
}
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
      : `当前任务状态不可填报（${task.taskStatus}），仅「已发布」「专家评审中」或「更正复核」可填分`
  }
  // 更正复核不校验原评价时间窗（BE 同口径）
  if (isCorrectionReviewTask.value) {
    return ''
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
    { key: 'avg', label: '加权综合分', value: summary.value.averageScore, unit: '分' },
    { key: 'mode', label: '评价模式', value: evaluationModeLabel(summary.value.evaluationMode) },
    {
      key: 'scene',
      label: '业务场景',
      value: evaluationSceneLabel(summary.value.sceneCode),
    },
  ]
})

const entryColumns: ColumnsType<PortfolioEvaluationEntryVO> = [
  { title: '被评教师', dataIndex: 'subjectTeacherUserId', key: 'subjectTeacherUserId', width: 100 },
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '得分', dataIndex: 'score', key: 'score', width: 72 },
  {
    title: '来源',
    dataIndex: 'evaluatorSourceTypeLabel',
    key: 'evaluatorSourceTypeLabel',
    width: 110,
  },
  { title: '评语', dataIndex: 'commentText', key: 'commentText' },
  { title: '评价人', dataIndex: 'evaluatorUserId', key: 'evaluatorUserId', width: 100 },
]

const summaryColumns = computed<ColumnsType<PortfolioEvaluationEntrySummaryItemVO>>(() => {
  const metricColumns: ColumnsType<PortfolioEvaluationEntrySummaryItemVO> = [
    { title: '条目数', dataIndex: 'entryCount', key: 'entryCount', width: 80 },
    { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 88 },
    { title: '加权分', dataIndex: 'weightedScore', key: 'weightedScore', width: 88 },
    { title: '学生样本', dataIndex: 'studentSampleSize', key: 'studentSampleSize', width: 88 },
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

function evaluationSceneLabel(scene?: PortfolioEvaluationSceneCode): string {
  if (!scene) {
    return '—'
  }
  return strictEnumLabel(PortfolioEvaluationSceneDescription, scene, '评价任务场景')
}

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
  if (!option) {
    throw new Error(`被评教师 ${teacherUserId} 不在当前任务可选列表中`)
  }
  return formatPortfolioTeacherDisplay(option.fullName, option.teacherNumber)
}

const selectableTasks = computed(() => {
  if (activeTab.value === 'fill') {
    return tasks.value.filter((item) => entryWritableStatuses.value.includes(item.taskStatus))
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

/** 冻结任务、教师、指标与评分后执行生命周期预检和评价写入。 */
async function saveEntry(): Promise<void> {
  if (saving.value) {
    return
  }
  if (!selectedTaskId.value) {
    showFormValidationMessage('请选择可填报任务')
    return
  }
  if (!canSaveEntry.value) {
    showFormValidationMessage(fillWindowBlockedReason.value || '当前不可填报')
    return
  }
  const subjectTeacherUserId = fillForm.subjectTeacherUserId.trim()
  const score = fillForm.score
  if (!subjectTeacherUserId || score === undefined) {
    showFormValidationMessage('请填写被评教师与得分')
    return
  }
  if (!fillForm.evaluatorSourceType) {
    showFormValidationMessage('请选择评价来源类型')
    return
  }
  const byIndicator = isByIndicator.value
  const indicatorCode = fillForm.indicatorCode.trim()
  if (byIndicator && !indicatorCode) {
    showFormValidationMessage('以指标为主模式须选择指标')
    return
  }
  const context = {
    evaluationTaskId: selectedTaskId.value,
    subjectTeacherUserId,
    indicatorCode: byIndicator ? indicatorCode : undefined,
    score,
    commentText: fillForm.commentText.trim() || undefined,
    evaluatorSourceType: fillForm.evaluatorSourceType,
  }
  saving.value = true
  try {
    await reloadLifecycleState()
    const currentIndicatorCode = isByIndicator.value ? fillForm.indicatorCode.trim() : undefined
    if (
      selectedTaskId.value !== context.evaluationTaskId
      || fillForm.subjectTeacherUserId.trim() !== context.subjectTeacherUserId
      || currentIndicatorCode !== context.indicatorCode
    ) {
      showFormValidationMessage('填报目标已变化，请重新确认后保存')
      return
    }
    if (!assertEvaluationParticipable('评价填报')) {
      return
    }
    await portfolioEvaluationEntryApi.save(context)
    void message.success('评价已保存')
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
    showFormValidationMessage('请选择可填报任务')
    return
  }
  exporting.value = true
  try {
    const result = await portfolioEvaluationEntryApi.exportSummary({ id: selectedTaskId.value })
    await downloadPortfolioExcelExport(result)
    void message.success('汇总已导出')
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

    <UiAlertStrip
      v-if="evaluationParticipationForbidden"
      tone="warning"
      title="被评教师不可参评"
      :description="evaluationParticipationBlockMessage"
    />
    <UiAlertStrip
      v-else-if="correctionHeldSubjectHint"
      tone="info"
      title="更正复核说明"
      :description="correctionHeldSubjectHint"
    />

    <UiCard>
      <div class="toolbar">
        <UiSelect
          v-model="selectedTaskId"
          placeholder="选择已发布任务"
          style="width: 280px"
          size="sm"
          :disabled="saving"
          :loading="loading"
          :options="
            selectableTasks.map((task) => ({
              value: task.id,
              label: `${task.taskName}（${evaluationModeLabel(task.evaluationMode)}）`,
            }))
          "
        />
        <UiButton size="sm" :disabled="saving" @click="loadTasks"> 刷新任务 </UiButton>
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
      <UiSectionTabs v-model="activeTab" :items="fillTabItems" compact divided />
      <template v-if="activeTab === 'fill'">
        <div class="form-grid">
          <UiSelect
            v-model="fillForm.subjectTeacherUserId"
            placeholder="被评教师"
            style="width: 220px"
            allow-search
            option-filter-prop="label"
            size="sm"
            :disabled="saving"
            :options="
              participableSubjectTeacherOptions.map((teacher) => ({
                value: teacher.teacherUserId,
                label: subjectTeacherOptionLabel(teacher),
              }))
            "
          />
          <UiSelect
            v-if="isByIndicator"
            v-model="fillForm.indicatorCode"
            placeholder="评价指标"
            style="width: 200px"
            allow-search
            option-filter-prop="label"
            size="sm"
            :disabled="saving"
            :options="
              indicatorOptions.map((indicator) => ({
                value: indicator.indicatorCode,
                label: indicator.indicatorName,
              }))
            "
          />
          <UiInputNumber
            size="sm"
            v-model="fillForm.score"
            placeholder="得分"
            style="width: 100px"
            :disabled="saving"
          />
          <UiSelect
            v-model="fillForm.evaluatorSourceType"
            placeholder="评价来源"
            style="width: 160px"
            size="sm"
            :disabled="saving"
            :options="PortfolioMultiSourceEvaluatorTypeOptions"
          />
          <UiInput
            size="sm"
            v-model="fillForm.commentText"
            placeholder="评语"
            style="flex: 1"
            :disabled="saving"
          />
          <UiButton
            size="sm"
            variant="primary"
            :loading="saving"
            :disabled="!canSaveEntry || saving || evaluationParticipationForbidden"
            @click="saveEntry"
          >
            保存评价
          </UiButton>
        </div>
        <UiEmpty
          size="sm"
          v-if="!entryLoadError && !entryTableLoading && entries.length === 0"
          description="当前筛选无填答记录"
        />
        <UiDataTable
          v-model:current="entryPageNum"
          v-model:page-size="entryPageSize"
          pagination-mode="server"
          :columns="entryColumns"
          :data-source="entries"
          :loading="entryTableLoading"
          :load-error="entryLoadError"
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
          <span>场景 {{ evaluationSceneLabel(summary.sceneCode) }}</span>
          <UiButton size="sm" variant="primary" :loading="exporting" @click="exportSummaryCsv">
            导出表格文件
          </UiButton>
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
  font-size: var(--dp-font-size-md);
}
.fill-window-hint {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-md);
}
</style>
