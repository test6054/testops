<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 成绩明细管理
 *
 * 后端契约：
 * - /api/quality/score-records: page-by-batch / batch-summary / page-valid-by-item / detail / create / batch-create / update / delete
 * - /api/quality/score-batches: page（按 qualityCourseId 拉批次列表）
 */
import type { AssessmentItemVO } from '@/apis/quality/assessment-item'
import { assessmentItemApi } from '@/apis/quality/assessment-item'
import type { RubricItemVO } from '@/apis/quality/rubric-item'
import { rubricItemApi } from '@/apis/quality/rubric-item'
import type { ScoreBatchVO } from '@/apis/quality/score-batch'
import { scoreBatchApi } from '@/apis/quality/score-batch'
import type {
  ScoreRecordBatchSummaryVO,
  ScoreRecordRubricScoreRequest,
  ScoreRecordSaveRequest,
  ScoreRecordUpdateRequest,
  ScoreRecordVO,
} from '@/apis/quality/score-record'
import { scoreRecordApi } from '@/apis/quality/score-record'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { UserDto } from '@/types/api-types.d'
import type { SignalMetric } from '@/types/workbench'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ExportBusinessType } from '@/apis/edu/export'
import {
  SCORE_BATCH_STATUS_COLOR,
  ScoreBatchStatusCode,
  ScoreBatchStatusDescription,
} from '@/apis/quality/types'
import QualityIngestPageShell from '@/components/quality/QualityIngestPageShell.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import { ClassSelector, CourseSelector, StudentSelector } from '@/components/quality/selectors'
import {
  loadBoundedPlanAggregate,
  loadSelectorFirstPage,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePolling } from '@/composables/usePolling'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityTableExport } from '@/composables/useQualityTableExport'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useQualityStore } from '@/stores/modules/quality'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { formatScore } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const batchColumns: ColumnsType = [
  { title: '编码', dataIndex: 'batchCode', key: 'batchCode', width: 120 },
  { title: '名称', dataIndex: 'batchName', key: 'batchName' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
]

const recordColumns: ColumnsType = [
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120, fixed: 'left' },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '考核环节', key: 'assessmentItemRef' },
  { title: '得分 / 满分', key: 'score', width: 140 },
  { title: '状态', key: 'recordStatus', width: 140 },
  { title: '操作', key: 'actions', width: 180 },
]

const validByItemColumns: ColumnsType = [
  { title: '成绩批次', key: 'batchRef', width: 180 },
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '得分 / 满分', key: 'score', width: 140 },
]

function batchStatusLabel(value: ScoreBatchStatusCode): string {
  return strictEnumLabel(ScoreBatchStatusDescription, value, '成绩批次状态')
}

function batchStatusColor(value: ScoreBatchStatusCode): BadgeTone {
  return strictEnumTone(SCORE_BATCH_STATUS_COLOR, value, '成绩批次状态')
}

function scoreRecordInvalidReason(record: ScoreRecordVO): string {
  return getUserProcessFailureMessage(
    record.invalidReason,
    '该成绩明细未通过校验，请检查学生、考核环节和分值',
  )
}

const qualityStore = useQualityStore()

/* ========== 成绩批次选择 ========== */

const batches = ref<ScoreBatchVO[]>([])
const batchesLoading = ref(false)
const batchPageNum = ref(1)
const batchPageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const batchTotal = ref(0)
const selectedBatch = ref<ScoreBatchVO | null>(null)
const { exporting: scoreRecordExporting, exportExcel: exportScoreRecordExcel } =
  useQualityTableExport()

const isBatchRecordEditable = computed(() => {
  if (!selectedBatch.value) return false
  const status = selectedBatch.value.status
  return (
    status !== ScoreBatchStatusCode.CONFIRMED &&
    status !== ScoreBatchStatusCode.PARSING &&
    status !== ScoreBatchStatusCode.CANCELLED
  )
})

async function refreshSelectedBatch() {
  if (!selectedBatch.value) return
  const updated = await scoreBatchApi.detail(selectedBatch.value.id)
  selectedBatch.value = updated
  const index = batches.value.findIndex((item) => item.id === updated.id)
  if (index >= 0) batches.value[index] = updated
}

function selectBatch(batch: ScoreBatchVO) {
  selectedBatch.value = batch
}

async function loadBatches() {
  if (!qualityStore.currentQualityCourseId) {
    batches.value = []
    batchTotal.value = 0
    batchStatusPolling.syncPolling()
    return
  }
  const scope = beginQualityScopeRequest()
  batchesLoading.value = true
  try {
    const page = await scoreBatchApi.page({
      pageNum: batchPageNum.value,
      pageSize: batchPageSize.value,
      qualityCourseId: qualityStore.currentQualityCourseId,
    })
    if (scope.isStale()) {
      return
    }
    batches.value = page.list
    batchTotal.value = page.total
    batchPageNum.value = page.pageNum ?? batchPageNum.value
    batchPageSize.value = page.pageSize ?? batchPageSize.value
    if (selectedBatch.value) {
      const updated = page.list.find((item) => item.id === selectedBatch.value!.id)
      if (updated) {
        selectedBatch.value = updated
      }
    }
    if (batches.value.length === 0 && batchTotal.value > 0 && batchPageNum.value > 1) {
      batchPageNum.value -= 1
      await loadBatches()
      return
    }
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    showUserError(error, '成绩批次列表加载失败，请稍后重试')
  } finally {
    if (!scope.isStale()) {
      batchesLoading.value = false
    }
  }
  batchStatusPolling.syncPolling()
}

function handleBatchPageChange(page: { current: number; pageSize: number }): void {
  batchPageNum.value = page.current
  batchPageSize.value = page.pageSize
  void loadBatches()
}

const batchStatusPolling = usePolling(() => refreshBatchesQuietly(), {
  getOptions: () => ({
    intervalMs: 3000,
    when:
      batches.value.some((batch) => batch.status === ScoreBatchStatusCode.PARSING) ||
      selectedBatch.value?.status === ScoreBatchStatusCode.PARSING,
  }),
  pauseWhenDocumentHidden: true,
})

async function refreshBatchesQuietly(): Promise<void> {
  if (!qualityStore.currentQualityCourseId || batchesLoading.value) {
    return
  }
  const scope = beginQualityScopeRequest()
  try {
    const page = await scoreBatchApi.page({
      pageNum: batchPageNum.value,
      pageSize: batchPageSize.value,
      qualityCourseId: qualityStore.currentQualityCourseId,
    })
    if (scope.isStale()) {
      return
    }
    batches.value = page.list
    batchTotal.value = page.total
    batchPageNum.value = page.pageNum ?? batchPageNum.value
    batchPageSize.value = page.pageSize ?? batchPageSize.value
    if (selectedBatch.value) {
      const updated = page.list.find((item) => item.id === selectedBatch.value!.id)
      if (updated) {
        selectedBatch.value = updated
        if (updated.status !== ScoreBatchStatusCode.PARSING) {
          await loadRecords()
        }
      }
    }
    batchStatusPolling.syncPolling()
  } catch {
    // 轮询刷新失败时不打断当前页面操作
  }
}

/* ========== 明细列表 ========== */

const records = ref<ScoreRecordVO[]>([])
const recordsLoading = ref(false)
const recordPageNum = ref(1)
const recordPageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const recordTotal = ref(0)
const recordSummary = ref<ScoreRecordBatchSummaryVO | null>(null)
const validFilter = ref<boolean | undefined>(undefined)
const assessmentItems = ref<AssessmentItemVO[]>([])

interface ScoreRecordFilterModel {
  [key: string]: unknown
  validFlag?: 'true' | 'false'
}

const filterForm = reactive<ScoreRecordFilterModel>({
  validFlag: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'validFlag',
    type: 'select',
    placeholder: '有效性筛选',
    allowClear: true,
    width: 140,
    options: [
      { value: 'true', label: '仅有效' },
      { value: 'false', label: '仅无效' },
    ],
  },
]

function resolveValidFlagFilter(): boolean | undefined {
  if (filterForm.validFlag === 'true') return true
  if (filterForm.validFlag === 'false') return false
  return undefined
}

function syncFilterToView() {
  validFilter.value = resolveValidFlagFilter()
}

function handleSearch() {
  syncFilterToView()
  recordPageNum.value = 1
  void loadRecords()
}

function handleReset() {
  filterForm.validFlag = undefined
  syncFilterToView()
  recordPageNum.value = 1
  void loadRecords()
}

function handleExportScoreRecords(): void {
  if (!selectedBatch.value) {
    message.warning('请先选择成绩批次')
    return
  }
  syncFilterToView()
  void exportScoreRecordExcel({
    businessType: ExportBusinessType.QUALITY_SCORE_RECORD_EXPORT,
    bizName: `成绩明细-${selectedBatch.value.batchName}`,
    queryParams: {
      batchId: selectedBatch.value.id,
      validFlag: resolveValidFlagFilter(),
    },
  })
}

async function loadRecords() {
  if (!selectedBatch.value) {
    records.value = []
    recordTotal.value = 0
    recordSummary.value = null
    return
  }
  recordsLoading.value = true
  try {
    const [page, summary] = await Promise.all([
      scoreRecordApi.pageByBatch({
        batchId: selectedBatch.value.id,
        validFlag: validFilter.value,
        pageNum: recordPageNum.value,
        pageSize: recordPageSize.value,
      }),
      scoreRecordApi.getBatchSummary(selectedBatch.value.id),
    ])
    records.value = page.list
    recordTotal.value = page.total
    recordPageNum.value = page.pageNum ?? recordPageNum.value
    recordPageSize.value = page.pageSize ?? recordPageSize.value
    recordSummary.value = summary
  } finally {
    recordsLoading.value = false
  }
}

function handleRecordPageChange(page: { current: number; pageSize: number }): void {
  recordPageNum.value = page.current
  recordPageSize.value = page.pageSize
  void loadRecords()
}

async function loadAssessmentItems() {
  if (!qualityStore.currentQualityCourseId) {
    assessmentItems.value = []
    return
  }
  assessmentItems.value = await loadSelectorFirstPage((pageNum, pageSize) =>
    assessmentItemApi.page({
      pageNum,
      pageSize,
      qualityCourseId: qualityStore.currentQualityCourseId!,
    }),
  )
}

/* ========== 信号指标带（SignalBand） ========== */

const signals = computed<SignalMetric[]>(() => {
  const summary = recordSummary.value
  const total = summary ? Number(summary.totalCount) : 0
  const valid = summary ? Number(summary.validCount) : 0
  const invalid = summary ? Number(summary.invalidCount) : 0
  const errored = summary ? Number(summary.erroredCount) : 0
  const ratio = summary?.avgScoreRatioPercent != null ? Math.round(summary.avgScoreRatioPercent) : 0
  return [
    { key: 'total', label: '当前明细', value: total, tone: 'blue', trendPolarity: 'neutral' },
    { key: 'valid', label: '有效', value: valid, tone: 'green', trendPolarity: 'positive' },
    {
      key: 'invalid',
      label: '无效',
      value: invalid,
      tone: invalid > 0 ? 'orange' : 'gray',
      trendPolarity: 'negative',
    },
    {
      key: 'errored',
      label: '异常',
      value: errored,
      tone: errored > 0 ? 'red' : 'gray',
      trendPolarity: 'negative',
    },
    {
      key: 'ratio',
      label: '平均得分率',
      value: `${ratio}%`,
      tone: 'blue',
      trendPolarity: 'positive',
    },
    {
      key: 'batches',
      label: '批次总数',
      value: batchTotal.value,
      tone: 'gray',
      trendPolarity: 'neutral',
    },
  ]
})

/* ========== 明细编辑 ========== */

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSubmitting = ref(false)
const editorRubrics = ref<RubricItemVO[]>([])
const editorRubricsLoading = ref(false)
const editorRubricScores = ref<ScoreRecordRubricScoreRequest[]>([])

const editor = ref<ScoreRecordUpdateRequest>({
  id: '',
  batchId: '',
  assessmentItemId: '',
  qualityCourseId: '',
  studentUserId: '',
  studentNumber: '',
  studentName: '',
  classId: '',
  score: 0,
  fullScore: 100,
  validFlag: true,
  invalidReason: '',
  errorCodes: '',
})

const editorRubricTotal = computed(() =>
  editorRubricScores.value.reduce((sum, item) => {
    if (!Number.isFinite(item.score)) return sum
    return sum + item.score
  }, 0),
)

async function loadEditorRubrics(assessmentItemId: string, record?: ScoreRecordVO): Promise<void> {
  if (!assessmentItemId) {
    editorRubrics.value = []
    editorRubricScores.value = []
    return
  }
  editorRubricsLoading.value = true
  try {
    const rubrics = await loadBoundedPlanAggregate(
      (pageNum, pageSize) => rubricItemApi.page({ pageNum, pageSize, assessmentItemId }),
      '评分标准明细',
    )
    const existingScores = new Map<string, number>()
    for (const item of record?.rubricScores ?? []) {
      if (!Number.isFinite(item.score)) continue
      existingScores.set(item.rubricItemId, item.score)
    }
    editorRubrics.value = rubrics
    editorRubricScores.value = rubrics.map((rubric) => ({
      rubricItemId: rubric.id,
      score: existingScores.get(rubric.id) ?? 0,
    }))
  } finally {
    editorRubricsLoading.value = false
  }
}

async function handleEditorAssessmentChange(value: SelectValue): Promise<void> {
  if (typeof value !== 'string') {
    showUserError(null, '考核环节选择无效，请重新选择')
    return
  }
  const selected = assessmentItems.value.find((item) => item.id === value)
  if (!selected) {
    showUserError(null, '所选考核环节不存在，请重新选择')
    return
  }
  editor.value.fullScore = selected.fullScore
  await loadEditorRubrics(value)
}

function handleEditorClassChange(value: string | null): void {
  editor.value.classId = value ?? ''
  editor.value.studentUserId = ''
  editor.value.studentNumber = ''
  editor.value.studentName = ''
}

function handleEditorStudentChange(value: string | null, option?: UserDto): void {
  editor.value.studentUserId = value ?? ''
  if (!option) {
    editor.value.studentNumber = ''
    editor.value.studentName = ''
    return
  }
  editor.value.studentNumber = option.studentNumber
  editor.value.studentName = option.nickName
}

async function openCreate() {
  if (!selectedBatch.value) return
  if (!isBatchRecordEditable.value) {
    message.error('批次已确认，不允许新增成绩明细')
    return
  }
  editorMode.value = 'create'
  editor.value = {
    id: '',
    batchId: selectedBatch.value.id,
    assessmentItemId: '',
    qualityCourseId: qualityStore.currentQualityCourseId,
    studentUserId: '',
    studentNumber: '',
    studentName: '',
    classId: '',
    score: 0,
    fullScore: 100,
    validFlag: true,
    invalidReason: '',
    errorCodes: '',
  }
  editorRubrics.value = []
  editorRubricScores.value = []
  if (selectedBatch.value.assessmentItemId) {
    editor.value.assessmentItemId = selectedBatch.value.assessmentItemId
    const selected = assessmentItems.value.find(
      (item) => item.id === selectedBatch.value?.assessmentItemId,
    )
    if (selected) {
      editor.value.fullScore = selected.fullScore
    }
    await loadEditorRubrics(selectedBatch.value.assessmentItemId)
  }
  editorVisible.value = true
}

async function openEdit(record: ScoreRecordVO) {
  if (!isBatchRecordEditable.value) {
    message.error('批次已确认，不允许修改成绩明细')
    return
  }
  editorMode.value = 'edit'
  editor.value = {
    id: record.id,
    batchId: record.batchId,
    assessmentItemId: record.assessmentItemId,
    qualityCourseId: record.qualityCourseId,
    studentUserId: record.studentUserId,
    studentNumber: record.studentNumber,
    studentName: record.studentName,
    classId: record.classId,
    score: record.score,
    fullScore: record.fullScore,
    validFlag: record.validFlag,
    invalidReason: record.invalidReason,
    rubricScores: record.rubricScores.map((rubricScore) => ({
      rubricItemId: rubricScore.rubricItemId,
      score: rubricScore.score,
    })),
    errorCodes: record.errorCodes,
  }
  await loadEditorRubrics(record.assessmentItemId, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!isBatchRecordEditable.value) {
    message.error('批次已确认，不允许修改成绩明细')
    return
  }
  const v = editor.value
  if (!v.assessmentItemId || v.score == null || v.fullScore == null) {
    message.error('请填写考核环节、得分、满分')
    return
  }
  editorSubmitting.value = true
  try {
    if (editorMode.value === 'create') {
      const request: ScoreRecordSaveRequest = {
        batchId: v.batchId,
        assessmentItemId: v.assessmentItemId,
        qualityCourseId: v.qualityCourseId,
        studentUserId: v.studentUserId,
        studentNumber: v.studentNumber,
        studentName: v.studentName,
        classId: v.classId,
        score: v.score,
        fullScore: v.fullScore,
        validFlag: v.validFlag,
        invalidReason: v.invalidReason,
        rubricScores: editorRubricScores.value,
        errorCodes: '',
      }
      await scoreRecordApi.create(request)
    } else {
      if (!v.id) {
        message.error('成绩明细 ID 缺失，无法更新')
        return
      }
      const request: ScoreRecordUpdateRequest = {
        id: v.id,
        batchId: v.batchId,
        assessmentItemId: v.assessmentItemId,
        qualityCourseId: v.qualityCourseId,
        studentUserId: v.studentUserId,
        studentNumber: v.studentNumber,
        studentName: v.studentName,
        classId: v.classId,
        score: v.score,
        fullScore: v.fullScore,
        validFlag: v.validFlag,
        invalidReason: v.invalidReason,
        rubricScores: editorRubricScores.value,
        errorCodes: '',
      }
      await scoreRecordApi.update(request)
    }
    message.success('已保存')
    editorVisible.value = false
    await loadRecords()
    await refreshSelectedBatch()
  } finally {
    editorSubmitting.value = false
  }
}

function buildScoreRecordActions(_record: ScoreRecordVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleScoreRecordAction(key: string, record: ScoreRecordVO): void {
  switch (key) {
    case 'edit':
      openEdit(record)
      break
    case 'delete':
      void handleDelete(record)
      break
  }
}

async function handleDelete(record: ScoreRecordVO) {
  if (!isBatchRecordEditable.value) {
    message.error('批次已确认，不允许删除成绩明细')
    return
  }
  void confirmAsync({
    title: `删除该明细？`,
    content: `学号 ${record.studentNumber} 姓名 ${record.studentName}`,
    type: 'error',
    onOk: async () => {
      await scoreRecordApi.delete(record.id)
      message.success('已删除')
      await loadRecords()
      await refreshSelectedBatch()
    },
  })
}

/* ========== 按考核环节查已确认的有效明细 ========== */

const validByItemVisible = ref(false)
const validByItemLoading = ref(false)
const validByItemId = ref<string>('')
const validByItemRecords = ref<ScoreRecordVO[]>([])
const validByItemPageNum = ref(1)
const validByItemPageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const validByItemTotal = ref(0)

function openValidByItem() {
  if (!qualityStore.currentQualityCourseId) return
  validByItemId.value = ''
  validByItemRecords.value = []
  validByItemPageNum.value = 1
  validByItemTotal.value = 0
  validByItemVisible.value = true
}

async function loadValidByItemPage() {
  if (!validByItemId.value) {
    message.warning('请选择考核环节')
    return
  }
  validByItemLoading.value = true
  try {
    const page = await scoreRecordApi.pageValidByItem({
      assessmentItemId: validByItemId.value,
      qualityCourseId: qualityStore.currentQualityCourseId,
      pageNum: validByItemPageNum.value,
      pageSize: validByItemPageSize.value,
    })
    validByItemRecords.value = page.list
    validByItemTotal.value = page.total
    validByItemPageNum.value = page.pageNum ?? validByItemPageNum.value
    validByItemPageSize.value = page.pageSize ?? validByItemPageSize.value
  } catch (error) {
    validByItemRecords.value = []
    validByItemTotal.value = 0
    showUserError(error, '有效成绩明细加载失败，请稍后重试')
  } finally {
    validByItemLoading.value = false
  }
}

async function queryValidByItem() {
  validByItemPageNum.value = 1
  await loadValidByItemPage()
}

function handleValidByItemPageChange(page: { current: number; pageSize: number }): void {
  validByItemPageNum.value = page.current
  validByItemPageSize.value = page.pageSize
  void loadValidByItemPage()
}

/* ========== 上下文联动 ========== */

watch(
  () => qualityStore.currentQualityCourseId,
  async () => {
    selectedBatch.value = null
    records.value = []
    recordSummary.value = null
    batchPageNum.value = 1
    recordPageNum.value = 1
    await Promise.all([loadBatches(), loadAssessmentItems()])
  },
)

watch(
  () => qualityStore.currentTrainingPlanId,
  () => {
    selectedBatch.value = null
    batches.value = []
    batchTotal.value = 0
    records.value = []
    recordSummary.value = null
    assessmentItems.value = []
  },
)

watch(selectedBatch, () => {
  recordPageNum.value = 1
  void loadRecords()
  batchStatusPolling.syncPolling()
})

async function handleScopeReload(): Promise<void> {
  selectedBatch.value = null
  batchPageNum.value = 1
  recordPageNum.value = 1
  if (!qualityStore.currentTrainingPlanId) {
    batches.value = []
    batchTotal.value = 0
    records.value = []
    recordSummary.value = null
    assessmentItems.value = []
    return
  }
  if (qualityStore.currentQualityCourseId) {
    await Promise.all([loadBatches(), loadAssessmentItems()])
  } else {
    batches.value = []
    batchTotal.value = 0
    records.value = []
    recordSummary.value = null
    assessmentItems.value = []
  }
}

useQualityScopedLoader(handleScopeReload, { watchScope: true, immediate: false })

onMounted(async () => {
  await handleScopeReload()
})

function handleCourseChange(courseId: string | null) {
  qualityStore.setQualityCourse(courseId || '')
}
</script>

<template>
  <QualityIngestPageShell embedded>
    <template #context>
      <QualityPageContextBar>
        <template #status>
          <span class="score-record__context-label">质量评价课程</span>
          <CourseSelector
            :value="qualityStore.currentQualityCourseId || null"
            :training-plan-id="qualityStore.currentTrainingPlanId || null"
            :width="320"
            @change="handleCourseChange"
          />
        </template>
      </QualityPageContextBar>
    </template>

    <UiEmpty
      v-if="!qualityStore.currentTrainingPlanId"
      description="请选择培养方案"
      class="score-record__empty"
    />

    <UiEmpty
      v-else-if="!qualityStore.currentQualityCourseId"
      description="请选择课程"
      class="score-record__empty"
    />

    <template v-else>
      <SignalBand :metrics="signals" compact class="score-record__signals" />

      <div class="score-record__layout">
        <UiCard class="detail-table-card score-record__batch-card">
          <template #title>
            成绩批次
            <span class="score-record__panel-meta">{{ batchTotal }} 批</span>
          </template>

          <UiDataTable
            pagination-mode="server"
            class="score-record__batches-table"
            :columns="batchColumns"
            :data-source="batches"
            :loading="batchesLoading"
            row-key="id"
            size="middle"
            v-model:current="batchPageNum"
            v-model:page-size="batchPageSize"
            :total="batchTotal"
            flat
            @page-change="handleBatchPageChange"
            :row-class-name="(r: ScoreBatchVO) => (selectedBatch?.id === r.id ? 'is-selected' : '')"
            :custom-row="
              (record: ScoreBatchVO) => ({
                onClick: () => selectBatch(record),
              })
            "
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <UiTag :tone="batchStatusColor(record.status)">
                  {{ batchStatusLabel(record.status) }}
                </UiTag>
              </template>
            </template>
          </UiDataTable>
        </UiCard>

        <UiCard class="detail-table-card score-record__detail-card">
          <template v-if="selectedBatch" #title>
            「{{ selectedBatch.batchName }}」明细
            <span class="score-record__detail-meta">
              <UiTag :tone="batchStatusColor(selectedBatch.status)">
                {{ batchStatusLabel(selectedBatch.status) }}
              </UiTag>
              · {{ selectedBatch.batchCode }}
            </span>
          </template>
          <template v-else #title>成绩明细</template>
          <template v-if="selectedBatch" #extra>
            <a-space>
              <UiButton
                variant="outline"
                size="sm"
                :loading="scoreRecordExporting"
                @click="handleExportScoreRecords"
              >
                <template #icon><DownloadOutlined /></template>
                导出 Excel
              </UiButton>
              <UiTextAction @click="openValidByItem">按考核环节查有效</UiTextAction>
              <router-link
                v-if="isBatchRecordEditable"
                :to="{ name: 'QualityScoreBatch' }"
                class="score-record__import-link"
              >
                <UiButton variant="outline" size="sm">批量导入（Excel）</UiButton>
              </router-link>
              <UiButton
                v-if="isBatchRecordEditable"
                variant="primary"
                size="sm"
                @click="openCreate"
              >
                新增明细
              </UiButton>
            </a-space>
          </template>

          <UiEmpty v-if="!selectedBatch" description="请选择" class="score-record__empty" />
          <template v-else>
            <UiFilterBar
              variant="plain"
              v-model="filterModel"
              :fields="filterFields"
              @search="handleSearch"
              @reset="handleReset"
            />

            <UiDataTable
              pagination-mode="server"
              class="score-record__records-table"
              :columns="recordColumns"
              :data-source="records"
              :loading="recordsLoading"
              row-key="id"
              size="middle"
              v-model:current="recordPageNum"
              v-model:page-size="recordPageSize"
              :total="recordTotal"
              flat
              @page-change="handleRecordPageChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'studentNumber'">
                  {{ record.studentNumber }}
                </template>
                <template v-else-if="column.key === 'studentName'">
                  {{ record.studentName }}
                </template>
                <template v-else-if="column.key === 'assessmentItemRef'">
                  <span class="score-record__item-code">
                    {{ record.assessmentItemCode }}
                  </span>
                  {{ record.assessmentItemName }}
                </template>
                <template v-else-if="column.key === 'score'">
                  {{ formatScore(record.score, 'score') }} /
                  {{ formatScore(record.fullScore, 'fullScore') }}
                </template>
                <template v-else-if="column.key === 'recordStatus'">
                  <a-space size="small">
                    <UiTag :tone="record.validFlag ? 'green' : 'red'">
                      {{ record.validFlag ? '有效' : '无效' }}
                    </UiTag>
                    <a-tooltip v-if="record.errorCodes" :title="scoreRecordInvalidReason(record)">
                      <UiTag tone="orange"> 异常 </UiTag>
                    </a-tooltip>
                  </a-space>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiTableActions
                    v-if="isBatchRecordEditable"
                    :items="buildScoreRecordActions(record)"
                    split
                    @action="(key) => handleScoreRecordAction(key, record)"
                  />
                  <span v-else class="score-record__locked-hint">已锁定</span>
                </template>
              </template>
            </UiDataTable>
          </template>
        </UiCard>
      </div>
    </template>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新增成绩明细' : '编辑成绩明细'"
      :width="720"
      :confirm-loading="editorSubmitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-form-item label="考核环节" required>
          <a-select
            v-model:value="editor.assessmentItemId"
            placeholder="选择考核环节"
            @change="handleEditorAssessmentChange"
          >
            <a-select-option v-for="a in assessmentItems" :key="a.id" :value="a.id">
              <span class="score-record__item-code">{{ a.itemCode }}</span>
              {{ a.itemName }}（满分 {{ a.fullScore }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="所属班级">
              <ClassSelector
                :value="editor.classId || null"
                placeholder="选择班级"
                @change="handleEditorClassChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学生" required>
              <StudentSelector
                :value="editor.studentUserId || null"
                :class-id="editor.classId || null"
                placeholder="选择学生"
                @change="handleEditorStudentChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学生信息">
              <div class="score-record__student-info">
                <span>{{ editor.studentName }}</span>
                <span v-if="editor.studentNumber" class="score-record__student-number">
                  {{ editor.studentNumber }}
                </span>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="得分" required>
              <a-input-number v-model:value="editor.score" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="满分" required>
              <a-input-number v-model:value="editor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="评分项拆分">
          <a-spin :spinning="editorRubricsLoading">
            <div v-if="editorRubrics.length" class="score-record__rubrics">
              <div class="score-record__rubrics-head">
                <span>评分项</span>
                <strong>合计 {{ formatScore(editorRubricTotal, 'score') }}</strong>
              </div>
              <div
                v-for="(rubric, index) in editorRubrics"
                :key="rubric.id"
                class="score-record__rubric-row"
              >
                <div class="score-record__rubric-main">
                  <span v-if="rubric.rubricCode" class="score-record__item-code">
                    {{ rubric.rubricCode }}
                  </span>
                  <span class="score-record__rubric-name">{{ rubric.rubricName }}</span>
                  <span class="score-record__rubric-full">满分 {{ rubric.fullScore }}</span>
                </div>
                <a-input-number
                  v-model:value="editorRubricScores[index].score"
                  :min="0"
                  :max="rubric.fullScore"
                  :precision="2"
                  class="score-record__rubric-score"
                />
              </div>
            </div>
            <UiEmpty description="暂无数据" class="score-record__rubric-empty" />
          </a-spin>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="是否有效">
              <a-switch v-model:checked="editor.validFlag" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="无效原因">
              <a-input v-model:value="editor.invalidReason" :disabled="editor.validFlag" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </UiDrawer>

    <UiDrawer
      v-model:open="validByItemVisible"
      title="按考核环节查有效明细"
      :width="780"
      :hide-footer="true"
    >
      <div class="score-record__valid-search">
        <span class="score-record__context-label">考核环节</span>
        <a-select
          v-model:value="validByItemId"
          placeholder="选择考核环节"
          class="score-record__valid-select-wide"
          show-search
          option-filter-prop="label"
        >
          <a-select-option
            v-for="a in assessmentItems"
            :key="a.id"
            :value="a.id"
            :label="`${a.itemCode} ${a.itemName}`"
          >
            <span class="score-record__item-code">{{ a.itemCode }}</span>
            {{ a.itemName }}
          </a-select-option>
        </a-select>
        <UiButton
          variant="primary"
          size="sm"
          :loading="validByItemLoading"
          @click="queryValidByItem"
        >
          查询
        </UiButton>
      </div>
      <UiDataTable
        pagination-mode="server"
        :columns="validByItemColumns"
        :data-source="validByItemRecords"
        :loading="validByItemLoading"
        row-key="id"
        size="small"
        v-model:current="validByItemPageNum"
        v-model:page-size="validByItemPageSize"
        :total="validByItemTotal"
        flat
        @page-change="handleValidByItemPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'batchRef'">
            <span class="score-record__item-code">{{ record.batchCode }}</span>
            {{ record.batchName }}
          </template>
          <template v-else-if="column.key === 'score'">
            {{ formatScore(record.score, 'score') }} /
            {{ formatScore(record.fullScore, 'fullScore') }}
          </template>
        </template>
      </UiDataTable>
    </UiDrawer>
  </QualityIngestPageShell>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;
.score-record {
  &__context-label {
    color: var(--dp-text-secondary);
    font-size: 13px;
    font-weight: 500;
  }

  &__empty {
    margin-top: 32px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(360px, 38%) 1fr;
    gap: 16px;
    align-items: stretch;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 16px;
    min-height: 320px;
  }

  &__panel-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-meta {
    color: var(--dp-text-muted);
    font-size: 12px;
  }

  &__batches-table {
    :deep(.ant-table-row) {
      cursor: pointer;
    }

    :deep(.is-selected) td {
      background-color: var(--ant-color-primary-bg) !important;
    }
  }

  &__detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__detail-meta {
    margin-top: 4px;
    color: var(--dp-text-muted);
    font-size: 12px;
  }

  &__detail-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__valid-select {
    width: 140px;
  }

  &__valid-select-wide {
    flex: 1;
    min-width: 320px;
  }

  &__valid-search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__item-code {
    color: var(--dp-text-muted);
    font-size: 12px;
    margin-right: 4px;
  }

  &__student-info {
    min-height: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--dp-text-primary);
  }

  &__student-number {
    color: var(--dp-text-muted);
    font-size: 12px;
  }

  &__rubrics {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    background: var(--dp-surface-elevated);
  }

  &__rubrics-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--dp-text-secondary);
    font-size: 13px;
  }

  &__rubric-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 140px;
    align-items: center;
    gap: 12px;
    min-height: 42px;
    padding: 8px 10px;
    border: 1px solid var(--dp-border);
    border-radius: 6px;
    background: var(--dp-surface);
  }

  &__rubric-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__rubric-name {
    color: var(--dp-text-primary);
    font-weight: 500;
  }

  &__rubric-full {
    color: var(--dp-text-muted);
    font-size: 12px;
  }

  &__rubric-score {
    width: 100%;
  }

  &__rubric-empty {
    margin: 0;
    padding: 12px 0;
  }

  &__import-link {
    text-decoration: none;
    color: inherit;
  }
}

@media (max-width: #{bp.$shell-tablet-max - 1px}) {
  .score-record__layout {
    grid-template-columns: 1fr;
  }
}
</style>
