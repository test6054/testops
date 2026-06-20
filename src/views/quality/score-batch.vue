<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
/**
 * 质量评价 - 成绩 Excel 异步导入
 *
 * 后端契约（ScoreBatchController）：
 * 1. 选择 质量评价课程 + 考核环节 + 学年 / 学期 -> 填批次编码 / 名称 -> 上传 Excel
 *    上传后调用 edu-storage 得到 sourceFileId，再调用 /api/quality/score-batches/create 注册批次
 * 2. POST /enqueue-parse 触发异步解析，状态机：PENDING -> PARSING -> PREVIEW_READY / FAILED
 * 3. PREVIEW_READY 后 POST /preview 拿到 ScoreImportPreviewVO（含 diagnostics），人工核对
 * 4. POST /validate 进入 VALIDATED，POST /confirm 进入 CONFIRMED，进入达成度计算可用来源
 * 5. PENDING / FAILED 可 POST /update-status body { id, status: 'CANCELLED' } 取消
 */
import type {
  AssessmentItemVO,
  DataSourceMode,
  QualityCourseVO,
  ScoreBatchQueryRequest,
  ScoreBatchSaveRequest,
  ScoreBatchStatus,
  ScoreBatchVO,
  ScoreImportRowDiagnostic,
} from '@/apis/quality'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
} from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import {
  assessmentItemApi,
  DATA_SOURCE_MODE_LABEL,
  qualityCourseApi,
  SCORE_BATCH_STATUS_COLOR,
  SCORE_BATCH_STATUS_LABEL,
  scoreBatchApi,
} from '@/apis/quality'
import QualityScopeHeader from '@/components/quality/QualityScopeHeader.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import {
  AuditTimelineDrawer,
  ContextBar,
  SignalBand,
  StageRail,
  StageWorkbenchShell,
  TaskResultPanel,
} from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const qualityStore = useQualityStore()
const listLoadError = ref<Error | null>(null)

const batches = ref<ScoreBatchVO[]>([])
const total = ref(0)
const loading = ref(false)
const uploading = ref(false)

const previewVisible = ref(false)
const previewLoading = ref(false)
const diagnostics = ref<ScoreImportRowDiagnostic[]>([])
const previewBatch = ref<ScoreBatchVO | null>(null)
interface ScoreImportPreviewSummary {
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
}

const previewSummary = reactive<ScoreImportPreviewSummary>({
  totalRows: undefined,
  successRows: undefined,
  errorRows: undefined,
  errorSummary: undefined,
})

const courseOptions = ref<QualityCourseVO[]>([])
/** 上传表单下拉选择器用的考核环节列表（随 uploadForm.qualityCourseId 切换） */
const uploadAssessmentItems = ref<AssessmentItemVO[]>([])
const uploadAssessmentLoading = ref(false)
/** 查询表单下拉选择器用的考核环节列表（随 query.qualityCourseId 切换） */
const queryAssessmentItems = ref<AssessmentItemVO[]>([])
const queryAssessmentLoading = ref(false)

const query = reactive<ScoreBatchQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  qualityCourseId: '',
  assessmentItemId: '',
  status: undefined,
  sourceMode: undefined,
  keyword: '',
})

const DATA_SOURCE_MODES: DataSourceMode[] = [
  'EXCEL_IMPORT',
  'EXTERNAL_AI_CONNECTOR',
  'READ_ONLY_DATABASE_PULL',
  'MANUAL_CONFIRMATION',
]

const SOURCE_MODE_OPTIONS = DATA_SOURCE_MODES.map((value) => ({
  value,
  label: strictEnumLabel(DATA_SOURCE_MODE_LABEL, value, '数据来源模式'),
}))

const uploadForm = reactive<ScoreBatchSaveRequest & { fileName?: string }>({
  qualityCourseId: '',
  assessmentItemId: '',
  batchCode: '',
  batchName: '',
  sourceMode: 'EXCEL_IMPORT',
  schoolYear: qualityStore.currentSchoolYear,
  semester: qualityStore.currentSemester,
  fileName: '',
})

const SCORE_BATCH_STATUSES: ScoreBatchStatus[] = [
  'PENDING',
  'PARSING',
  'PREVIEW_READY',
  'VALIDATED',
  'CONFIRMED',
  'FAILED',
  'CANCELLED',
]

const statusOptions = SCORE_BATCH_STATUSES.map((value) => ({
  value,
  label: strictEnumLabel(SCORE_BATCH_STATUS_LABEL, value, '成绩批次状态'),
}))

const filterModel = computed<Record<string, unknown>>({
  get: () => query as Record<string, unknown>,
  set: (value) => {
    Object.assign(query, value)
  },
})

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'qualityCourseId',
    type: 'select',
    label: '课程',
    placeholder: '按课程筛选',
    allowClear: true,
    width: 220,
    options: courseSelectOptions.value,
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 160,
    options: statusOptions,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '编码 / 名称',
    width: 180,
  },
])

function handleSearch() {
  loadBatches()
}

function handleReset() {
  resetQuery()
}

function statusLabel(value: ScoreBatchStatus): string {
  return strictEnumLabel(SCORE_BATCH_STATUS_LABEL, value, '成绩批次状态')
}

function statusColor(value: ScoreBatchStatus): BadgeTone {
  return strictEnumTone(SCORE_BATCH_STATUS_COLOR, value, '成绩批次状态')
}

function sourceModeLabel(value: DataSourceMode): string {
  return strictEnumLabel(DATA_SOURCE_MODE_LABEL, value, '数据来源模式')
}

function hasGeneratedRowStatistics(
  record: Pick<ScoreBatchVO, 'totalRows' | 'successRows' | 'errorRows'> | ScoreImportPreviewSummary,
): boolean {
  return (
    record.totalRows !== undefined
    && record.successRows !== undefined
    && record.errorRows !== undefined
  )
}

function scoreBatchRowStatisticsText(record: ScoreBatchVO): string {
  if (record.status === 'PENDING' || record.status === 'PARSING' || record.status === 'CANCELLED') {
    return '未生成'
  }
  if (record.status === 'FAILED' && !hasGeneratedRowStatistics(record)) {
    return '解析失败，未生成行统计'
  }
  if (!hasGeneratedRowStatistics(record)) {
    return `当前成绩批次已进入 ${statusLabel(record.status)}，但后端未返回行统计`
  }
  return `${record.successRows} / ${record.errorRows} / ${record.totalRows}`
}

// ─── 阶段状态分布（用于 StageRail） ─────────────────────────────
const statusBuckets = computed(() => {
  const buckets: Record<ScoreBatchStatus, number> = {
    PENDING: 0,
    PARSING: 0,
    PREVIEW_READY: 0,
    VALIDATED: 0,
    CONFIRMED: 0,
    FAILED: 0,
    CANCELLED: 0,
  }
  for (const b of batches.value) {
    buckets[b.status] += 1
  }
  return buckets
})

const stages = computed<WorkbenchStage[]>(() => {
  const b = statusBuckets.value
  const stageOrder: Array<{ key: ScoreBatchStatus, title: string }> = [
    { key: 'PENDING', title: '待处理' },
    { key: 'PARSING', title: '解析中' },
    { key: 'PREVIEW_READY', title: '预览就绪' },
    { key: 'VALIDATED', title: '已校验' },
    { key: 'CONFIRMED', title: '已确认' },
  ]
  return stageOrder.map((stage) => {
    const count = b[stage.key]
    let status: WorkbenchStage['status'] = 'pending'
    if (stage.key === 'CONFIRMED' && count > 0) status = 'completed'
    else if (count > 0) status = 'active'
    return {
      key: stage.key,
      title: stage.title,
      status,
      statusText: `${count} 个批次`,
    }
  })
})

const signals = computed<SignalMetric[]>(() => {
  const b = statusBuckets.value
  return [
    { key: 'total', label: '本页批次', value: batches.value.length, tone: 'blue' },
    { key: 'confirmed', label: '已确认', value: b.CONFIRMED, tone: 'green' },
    { key: 'validated', label: '已校验', value: b.VALIDATED, tone: 'blue' },
    { key: 'previewReady', label: '预览就绪', value: b.PREVIEW_READY, tone: 'orange' },
    { key: 'failed', label: '失败', value: b.FAILED, tone: 'red' },
    { key: 'cancelled', label: '已取消', value: b.CANCELLED, tone: 'gray' },
  ]
})


const courseSelectOptions = computed(() =>
  courseOptions.value.map((item) => ({
    value: item.id,
    label: `${item.courseCode} · ${item.courseName}`,
  })),
)

const uploadAssessmentItemOptions = computed(() =>
  uploadAssessmentItems.value.map((item) => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

const queryAssessmentItemOptions = computed(() =>
  queryAssessmentItems.value.map((item) => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

async function loadCourses() {
  if (!qualityStore.currentTrainingPlanId) {
    courseOptions.value = []
    return
  }
  courseOptions.value = await readAllPages(
    (pageNum) => qualityCourseApi.page({
      pageNum,
      pageSize: 100,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      enabled: true,
    }),
    '质量评价课程加载失败，请稍后重试',
  )
}

async function loadUploadAssessmentItems(qualityCourseId: string | undefined) {
  if (!qualityCourseId) {
    uploadAssessmentItems.value = []
    return
  }
  uploadAssessmentLoading.value = true
  try {
    uploadAssessmentItems.value = await assessmentItemApi.listByCourse(qualityCourseId)
  } finally {
    uploadAssessmentLoading.value = false
  }
}

async function loadQueryAssessmentItems(qualityCourseId: string | undefined) {
  if (!qualityCourseId) {
    queryAssessmentItems.value = []
    return
  }
  queryAssessmentLoading.value = true
  try {
    queryAssessmentItems.value = await assessmentItemApi.listByCourse(qualityCourseId)
  } finally {
    queryAssessmentLoading.value = false
  }
}

async function loadBatches() {
  if (!qualityStore.currentTrainingPlanId) {
    batches.value = []
    total.value = 0
    return
  }
  loading.value = true
  listLoadError.value = null
  try {
    const page = await scoreBatchApi.page({
      ...query,
      qualityCourseId: query.qualityCourseId || undefined,
      assessmentItemId: query.assessmentItemId || undefined,
      status: query.status || undefined,
      sourceMode: query.sourceMode || undefined,
      keyword: query.keyword?.trim() || undefined,
    })
    batches.value = readPageList(page, '成绩批次加载失败，请稍后重试')
    total.value = readPageTotal(page, '成绩批次加载失败，请稍后重试')
  } catch (error) {
    listLoadError.value = toUserError(error, '成绩批次加载失败')
    showUserError(error, '成绩批次加载失败')
  } finally {
    loading.value = false
  }
}

async function handleScopeChange(): Promise<void> {
  listLoadError.value = null
  await loadCourses()
  await loadBatches()
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadBatches()
}

const batchListColumns: ColumnsType = [
  { title: '编码', dataIndex: 'batchCode', key: 'batchCode', width: 140 },
  { title: '名称', dataIndex: 'batchName', key: 'batchName' },
  { title: '课程', key: 'course', width: 220 },
  { title: '考核环节', key: 'assessmentItem', width: 200 },
  { title: '学年', dataIndex: 'schoolYear', key: 'schoolYear', width: 110 },
  { title: '学期', dataIndex: 'semester', key: 'semester', width: 70 },
  { title: '接入模式', dataIndex: 'sourceMode', key: 'sourceMode', width: 160 },
  { title: '行数（成功/错误/总）', key: 'rowsBreakdown', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '提交时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 360, fixed: 'right' },
]

const diagnosticsColumns: ColumnsType = [
  { title: 'Excel 行号', dataIndex: 'rowIndex', key: 'rowIndex', width: 80 },
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber' },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName' },
  { title: '班级', dataIndex: 'className', key: 'className' },
  { title: '得分', dataIndex: 'score', key: 'score' },
  { title: '是否通过', dataIndex: 'valid', key: 'valid', width: 90 },
  { title: '处理说明', key: 'errorInfo' },
]

function resetQuery() {
  query.pageNum = 1
  query.qualityCourseId = ''
  query.assessmentItemId = ''
  query.status = undefined
  query.sourceMode = undefined
  query.keyword = ''
  loadBatches()
}

async function handleUpload(options: UploadRequestOption) {
  if (!uploadForm.qualityCourseId) {
    message.warning('请先选择质量评价课程')
    options.onError?.(new Error('课程未选择'))
    return
  }
  if (!uploadForm.assessmentItemId) {
    message.warning('请选择或填写考核环节')
    options.onError?.(new Error('考核环节未填写'))
    return
  }
  if (!uploadForm.batchCode.trim() || !uploadForm.batchName.trim()) {
    message.warning('请填写批次编码与名称')
    options.onError?.(new Error('批次编码 / 名称未填写'))
    return
  }
  uploading.value = true
  try {
    const { file } = options
    if (!(file instanceof File)) {
      message.error('无效的成绩批次上传文件')
      options.onError?.(new Error('无效的成绩批次上传文件'))
      return
    }
    // 步骤 1：上传 Excel 到 edu-storage 拿 sourceFileId
    const uploaded = await uploadFile(file, { businessType: 'QUALITY_SCORE_IMPORT' })
    const sourceFileId = String(uploaded.id)
    // 步骤 2：注册成绩批次
    const batchId = await scoreBatchApi.create({
      qualityCourseId: uploadForm.qualityCourseId,
      assessmentItemId: uploadForm.assessmentItemId,
      batchCode: uploadForm.batchCode.trim(),
      batchName: uploadForm.batchName.trim(),
      sourceMode: uploadForm.sourceMode,
      sourceFileId,
      schoolYear: uploadForm.schoolYear || undefined,
      semester: uploadForm.semester || undefined,
    })
    // 步骤 3：触发解析
    await scoreBatchApi.enqueueParse(batchId)
    message.success('已提交导入任务，解析完成后可预览并确认')
    // ant-design-vue customRequest 的 onSuccess 第二参为 XMLHttpRequest，可选；本地文件 IO 流程不传 xhr。
    options.onSuccess?.({})
    await loadBatches()
  } catch (err) {
    options.onError?.(err instanceof Error ? err : new Error(String(err)))
  } finally {
    uploading.value = false
  }
}

async function openPreview(record: ScoreBatchVO) {
  if (!canPreview(record.status)) {
    message.warning('当前批次尚未生成可预览结果')
    return
  }
  previewBatch.value = record
  previewVisible.value = true
  previewLoading.value = true
  try {
    const preview = await scoreBatchApi.preview(record.id)
    for (const diagnostic of preview.diagnostics) {
      if (
        diagnostic.valid === false
        && diagnostic.errorMessages.length === 0
        && diagnostic.errorCodes.length === 0
      ) {
        message.error('成绩预览结果异常，请重新导入后再试')
        return
      }
    }
    diagnostics.value = preview.diagnostics
    if (preview.status !== 'FAILED' && !hasGeneratedRowStatistics(preview)) {
      message.error('成绩预览结果异常，请重新导入后再试')
      return
    }
    previewSummary.totalRows = preview.totalRows
    previewSummary.successRows = preview.successRows
    previewSummary.errorRows = preview.errorRows
    previewSummary.errorSummary = preview.errorSummary
      ? getUserProcessFailureMessage(
          preview.errorSummary,
          '成绩批次解析未完成，请检查导入文件后重新提交',
        )
      : undefined
  } finally {
    previewLoading.value = false
  }
}

async function handleValidate(record: ScoreBatchVO) {
  void confirmAsync({
    title: '校验该批次？',
    content: '当前批次校验通过后将进入“已校验”状态，是否继续？',
    type: 'info',
    onOk: async () => {
      await scoreBatchApi.validate(record.id)
      message.success('批次已校验')
      await loadBatches()
    },
  })
}

async function handleConfirm(record: ScoreBatchVO) {
  void confirmAsync({
    title: '确认该批次？',
    content: '当前批次确认后将参与达成度计算，是否继续？',
    type: 'info',
    onOk: async () => {
      await scoreBatchApi.confirm(record.id)
      message.success('批次已确认')
      await loadBatches()
    },
  })
}

async function handleCancel(record: ScoreBatchVO) {
  void confirmAsync({
    title: '取消该批次？',
    content: '当前批次取消后不再参与达成度计算',
    type: 'error',
    onOk: async () => {
      await scoreBatchApi.updateStatus({
        id: record.id,
        status: 'CANCELLED',
      })
      message.success('批次已取消')
      await loadBatches()
    },
  })
}

async function handleReParse(record: ScoreBatchVO) {
  void confirmAsync({
    title: '重新解析该批次？',
    content: `仅待解析 / 解析失败状态可触发；当前状态：${statusLabel(record.status)}`,
    type: 'warning',
    onOk: async () => {
      await scoreBatchApi.enqueueParse(record.id)
      message.success('已重新触发解析')
      await loadBatches()
    },
  })
}

/* ========== 编辑 / 删除批次 ========== */

const editorVisible = ref(false)
const editorSubmitting = ref(false)
const editor = reactive<ScoreBatchSaveRequest>({
  id: undefined,
  qualityCourseId: '',
  assessmentItemId: '',
  batchCode: '',
  batchName: '',
  sourceMode: 'EXCEL_IMPORT',
  sourceFileId: undefined,
  externalPullTaskId: undefined,
  schoolYear: '',
  semester: '',
})
const editorAssessmentItems = ref<AssessmentItemVO[]>([])

const editorAssessmentItemOptions = computed(() =>
  editorAssessmentItems.value.map((item) => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

async function openEdit(record: ScoreBatchVO) {
  editor.id = record.id
  editor.qualityCourseId = record.qualityCourseId
  editor.assessmentItemId = record.assessmentItemId
  editor.batchCode = record.batchCode
  editor.batchName = record.batchName
  editor.sourceMode = record.sourceMode
  editor.sourceFileId = record.sourceFileId
  editor.externalPullTaskId = record.externalPullTaskId
  editor.schoolYear = record.schoolYear || ''
  editor.semester = record.semester || ''
  editorAssessmentItems.value = await assessmentItemApi.listByCourse(record.qualityCourseId)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.batchCode.trim() || !editor.batchName.trim()) {
    message.error('请填写批次编码与名称')
    return
  }
  if (!editor.qualityCourseId || !editor.assessmentItemId) {
    message.error('课程与考核环节不能为空')
    return
  }
  editorSubmitting.value = true
  try {
    await scoreBatchApi.update({
      ...editor,
      batchCode: editor.batchCode.trim(),
      batchName: editor.batchName.trim(),
      schoolYear: editor.schoolYear?.trim() || undefined,
      semester: editor.semester?.trim() || undefined,
    })
    message.success('批次已更新')
    editorVisible.value = false
    await loadBatches()
  } finally {
    editorSubmitting.value = false
  }
}

function canEdit(status: ScoreBatchStatus) {
  return status === 'PENDING' || status === 'FAILED' || status === 'CANCELLED'
}

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

async function openAuditDrawer(record: ScoreBatchVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'SCORE_BATCH',
      category: 'QUALITY',
      description: record.id,
    })
    auditEvents.value = readPageList(page, '成绩批次审计记录加载失败，请稍后重试').map((log) => {
      return {
        id: log.id,
        operatorName: log.userDto.nickName,
        operationType: log.type,
        operationLabel: log.detail,
        time: log.createTime,
        targetType: log.module,
        targetId: log.bizId || undefined,
        reason: log.changeDetails || log.errorStack || undefined,
      }
    })
  } finally {
    auditLoading.value = false
  }
}

const batchResultItems = computed<TaskResultItem[]>(() => {
  return batches.value
    .filter((b) => b.status === 'FAILED' || b.status === 'PARSING')
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      title: `${b.batchCode} - ${b.batchName}`,
      statusLabel: statusLabel(b.status),
      statusTone: b.status === 'FAILED' ? 'red' : 'blue',
      description: b.status === 'FAILED' ? scoreBatchRowStatisticsText(b) : `解析中…`,
      time: b.createTime || undefined,
      actions: canPreview(b.status) ? [{ key: 'preview', label: '预览' }] : [],
    }))
})

function handleBatchResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = batches.value.find((b) => b.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'preview') openPreview(record)
}

function canDelete(status: ScoreBatchStatus) {
  return status === 'PENDING' || status === 'FAILED' || status === 'CANCELLED'
}

async function handleDelete(record: ScoreBatchVO) {
  void confirmAsync({
    title: `删除批次 ${record.batchCode}？`,
    content: '删除后批次及关联成绩明细会被清除，该操作不可恢复，请谨慎操作。',
    type: 'error',
    onOk: async () => {
      await scoreBatchApi.delete(record.id)
      message.success('已删除')
      await loadBatches()
    },
  })
}

function canValidate(status: ScoreBatchStatus) {
  return status === 'PREVIEW_READY'
}
function canConfirm(status: ScoreBatchStatus) {
  return status === 'VALIDATED'
}
function canPreview(status: ScoreBatchStatus) {
  return status === 'PREVIEW_READY' || status === 'VALIDATED' || status === 'FAILED'
}
function canCancel(status: ScoreBatchStatus) {
  return status === 'PENDING' || status === 'FAILED'
}
function canReParse(status: ScoreBatchStatus) {
  return status === 'PENDING' || status === 'FAILED'
}

watch(
  () => qualityStore.currentTrainingPlanId,
  async () => {
    await loadCourses()
    // 切换培养方案后课程 / 考核环节列表均失效，应重置选中项
    uploadForm.qualityCourseId = ''
    uploadForm.assessmentItemId = ''
    uploadAssessmentItems.value = []
    query.qualityCourseId = ''
    query.assessmentItemId = ''
    queryAssessmentItems.value = []
  },
)

watch(
  () => uploadForm.qualityCourseId,
  async (courseId) => {
    uploadForm.assessmentItemId = ''
    await loadUploadAssessmentItems(courseId || undefined)
  },
)

watch(
  () => query.qualityCourseId,
  async (courseId) => {
    query.assessmentItemId = ''
    await loadQueryAssessmentItems(courseId || undefined)
  },
)

onMounted(async () => {
  if (qualityStore.currentTrainingPlanId) {
    await loadCourses()
    await loadBatches()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <QualityScopeHeader @change="handleScopeChange" />
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!qualityStore.currentTrainingPlanId"
            :loading="loading"
            @click="handleScopeChange"
          >
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!qualityStore.currentTrainingPlanId"
      description="请选择培养方案"
      class="score-batch__empty"
    />

    <template v-else>
      <StageRail :stages="stages" compact class="score-batch__stages" />
      <SignalBand :metrics="signals" compact class="score-batch__signals" />

      <TaskResultPanel
        v-if="batchResultItems.length > 0"
        title="待关注批次"
        :items="batchResultItems"
        class="score-batch__result-panel"
        @action="handleBatchResultAction"
      />

      <div class="score-batch__upload">
        <header class="score-batch__upload-header">
          <h3 class="score-batch__upload-title">Excel 成绩导入</h3>
          <p class="score-batch__upload-hint">
            表头需包含：学号 / 姓名 / 班级 / 最终成绩。上传后进入成绩批次校验，由
            <strong>预览、校验、确认</strong> 完成闭环。
          </p>
        </header>
        <a-form layout="inline" :model="uploadForm" class="score-batch__upload-form">
          <a-form-item label="课程" required>
            <a-select
              v-model:value="uploadForm.qualityCourseId"
              placeholder="选择质量评价课程"
              class="score-batch__filter score-batch__filter--lg"
              :options="courseSelectOptions"
            />
          </a-form-item>
          <a-form-item label="考核环节" required>
            <a-select
              v-model:value="uploadForm.assessmentItemId"
              placeholder="选择考核环节"
              class="score-batch__filter score-batch__filter--lg"
              :options="uploadAssessmentItemOptions"
              :loading="uploadAssessmentLoading"
              :disabled="!uploadForm.qualityCourseId"
              allow-clear
            />
          </a-form-item>
          <a-form-item label="批次编码" required>
            <a-input
              v-model:value="uploadForm.batchCode"
              placeholder="输入批次编码"
              class="score-batch__filter"
            />
          </a-form-item>
          <a-form-item label="批次名称" required>
            <a-input
              v-model:value="uploadForm.batchName"
              placeholder="输入批次名称"
              class="score-batch__filter score-batch__filter--lg"
            />
          </a-form-item>
          <a-form-item label="接入模式">
            <a-select
              v-model:value="uploadForm.sourceMode"
              class="score-batch__filter score-batch__filter--lg"
              :options="SOURCE_MODE_OPTIONS"
            />
          </a-form-item>
          <a-form-item label="学年">
            <a-input
              v-model:value="uploadForm.schoolYear"
              placeholder="例：2024-2025"
              class="score-batch__filter"
            />
          </a-form-item>
          <a-form-item label="学期">
            <a-select
              v-model:value="uploadForm.semester"
              class="score-batch__filter score-batch__filter--xxs"
            >
              <a-select-option value="1"> 1 </a-select-option>
              <a-select-option value="2"> 2 </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-upload
              name="file"
              accept=".xlsx,.xls"
              :show-upload-list="false"
              :custom-request="handleUpload"
              :disabled="uploading"
            >
              <UiButton variant="primary" :loading="uploading"> 上传 Excel </UiButton>
            </a-upload>
          </a-form-item>
        </a-form>
      </div>

      <UiCard class="detail-table-card score-batch__table-card">
        <template #title>成绩批次</template>

        <UiFilterBar
          v-model="filterModel"
          :fields="filterFields"
          show-labels
          @search="handleSearch"
          @reset="handleReset"
        />

        <UiDataTable
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          class="score-batch__table student-detail-table__data-table"
          :columns="batchListColumns"
          :data-source="batches"
          :loading="loading"
          row-key="id"
          size="middle"
          :total="total"
          flat
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'course'">
              <div>{{ record.qualityCourseName }}</div>
              <div class="score-batch__sub-text">
                {{ record.qualityCourseCode }}
              </div>
            </template>
            <template v-else-if="column.key === 'assessmentItem'">
              <div>{{ record.assessmentItemName }}</div>
              <div class="score-batch__sub-text">
                {{ record.assessmentItemCode }}
              </div>
            </template>
            <template
              v-else-if="
                column.key === 'schoolYear'
                  || column.key === 'semester'
                  || column.key === 'createTime'
              "
            >
              <template v-if="column.key === 'schoolYear'">
                {{ record.schoolYear }}
              </template>
              <template v-else-if="column.key === 'semester'">
                {{ record.semester }}
              </template>
              <template v-else>
                {{ record.createTime }}
              </template>
            </template>
            <template v-else-if="column.key === 'sourceMode'">
              {{ sourceModeLabel(record.sourceMode) }}
            </template>
            <template v-else-if="column.key === 'rowsBreakdown'">
              <template v-if="hasGeneratedRowStatistics(record)">
                <span class="score-batch__num-success">{{ record.successRows }}</span>
                /
                <span class="score-batch__num-error">{{ record.errorRows }}</span>
                /
                <span>{{ record.totalRows }}</span>
              </template>
              <span v-else class="score-batch__sub-text">
                {{ scoreBatchRowStatisticsText(record) }}
              </span>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="statusColor(record.status)">
                {{ statusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <UiTextAction v-if="canPreview(record.status)" @click="openPreview(record)">预览</UiTextAction>
                <UiTextAction v-if="canValidate(record.status)" @click="handleValidate(record)">校验</UiTextAction>
                <UiTextAction v-if="canConfirm(record.status)" tone="primary" @click="handleConfirm(record)">
                  确认
                </UiTextAction>
                <UiTextAction v-if="canReParse(record.status)" tone="primary" @click="handleReParse(record)">
                  重新解析
                </UiTextAction>
                <UiTextAction v-if="canEdit(record.status)" @click="openEdit(record)">编辑</UiTextAction>
                <UiTextAction v-if="canCancel(record.status)" tone="danger" @click="handleCancel(record)">
                  取消
                </UiTextAction>
                <UiTextAction v-if="canDelete(record.status)" tone="danger" @click="handleDelete(record)">
                  删除
                </UiTextAction>
                <UiTextAction @click="openAuditDrawer(record)">审计</UiTextAction>
              </div>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>

    <UiDrawer v-model:open="previewVisible" title="批次明细预览" :width="960" :hide-footer="true">
      <a-descriptions
        v-if="previewBatch"
        :column="3"
        size="small"
        bordered
        class="score-batch__preview-descriptions"
      >
        <a-descriptions-item label="导入批次">
          {{ previewBatch.batchCode }} · {{ previewBatch.batchName }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <UiTag :tone="statusColor(previewBatch.status)">
            {{ statusLabel(previewBatch.status) }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="行数（成功/错误/总）">
          <template v-if="hasGeneratedRowStatistics(previewSummary)">
            <span class="score-batch__num-success">{{ previewSummary.successRows }}</span>
            /
            <span :class="previewSummary.errorRows ? 'score-batch__num-error' : ''">
              {{ previewSummary.errorRows }}
            </span>
            /
            <span>{{ previewSummary.totalRows }}</span>
          </template>
          <span v-else class="score-batch__sub-text">解析失败，未生成行统计</span>
        </a-descriptions-item>
      </a-descriptions>
      <a-alert
        v-if="previewSummary.errorSummary"
        type="error"
        show-icon
        :message="previewSummary.errorSummary"
        class="score-batch__preview-alert"
      />
      <UiDataTable
        pagination-mode="none"
        class="student-detail-table__data-table"
        :columns="diagnosticsColumns"
        :data-source="diagnostics"
        :loading="previewLoading"
        row-key="rowIndex"
        size="small"
        :show-pagination="false"
        flat
        :total="diagnostics.length"
        :scroll="{ y: 420 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'score'">
            {{
              record.score === null || record.score === undefined || record.score === ''
                ? '未解析得分'
                : record.score
            }}
          </template>
          <template v-else-if="column.key === 'valid'">
            <UiTag :tone="record.valid ? 'green' : 'red'">
              {{ record.valid ? '通过' : '失败' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'errorInfo'">
            <a-space direction="vertical" size="small" style="width: 100%">
              <div
                v-for="(errorMessage, idx) in record.errorMessages"
                :key="`${record.rowIndex}-message-${idx}`"
                class="score-batch__error-msg"
              >
                {{
                  getUserProcessFailureMessage(
                    errorMessage,
                    '该行成绩无法确认，请检查学号、班级、成绩格式和考核环节配置',
                  )
                }}
              </div>
              <div
                v-if="record.errorMessages.length === 0 && record.errorCodes.length > 0"
                class="score-batch__error-msg"
              >
                该行成绩无法确认，请检查学号、班级、成绩格式和考核环节配置
              </div>
              <span v-if="record.valid" class="score-batch__sub-text"> 无错误 </span>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </UiDrawer>

    <UiDrawer
      v-model:open="editorVisible"
      :title="`编辑批次 ${editor.batchCode}`"
      :width="720"
      :confirm-loading="editorSubmitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="批次编码" required>
              <a-input v-model:value="editor.batchCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="批次名称" required>
              <a-input v-model:value="editor.batchName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="考核环节" required>
              <a-select
                v-model:value="editor.assessmentItemId"
                :options="editorAssessmentItemOptions"
                placeholder="考核环节"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="接入模式">
              <a-select v-model:value="editor.sourceMode" :options="SOURCE_MODE_OPTIONS" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="学年">
              <a-input v-model:value="editor.schoolYear" placeholder="例：2024-2025" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学期">
              <a-select v-model:value="editor.semester">
                <a-select-option value="1"> 1 </a-select-option>
                <a-select-option value="2"> 2 </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </UiDrawer>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="成绩批次操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.score-batch {
  &__filter {
    width: 160px;

    &--lg {
      width: 220px;
    }

    &--xxs {
      width: 80px;
    }
  }

  &__empty {
    margin-top: 32px;
  }

  &__stages {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__result-panel {
    margin-bottom: 20px;
  }

  &__upload {
    margin-bottom: 20px;
    padding: 20px;
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__upload-header {
    margin-bottom: 16px;
  }

  &__upload-title {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__upload-hint {
    margin: 0;
    font-size: 13px;
    color: var(--dp-text-secondary, #64748b);
    line-height: 1.6;

    code {
      padding: 1px 6px;
      margin: 0 2px;
      font-size: 12px;
      background: var(--dp-gray-100, #f1f5f9);
      border-radius: 4px;
    }
  }

  &__upload-form {
    row-gap: 12px;
  }

  &__table {
    background: var(--dp-surface, #fff);
    border-radius: 8px;
  }

  &__sub-text {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__num-success {
    color: var(--ant-color-success, #16a34a);
  }

  &__num-error {
    color: var(--ant-color-error, #dc2626);
  }

  &__error-msg {
    color: var(--ant-color-error, #dc2626);
  }

  &__preview-descriptions {
    margin-bottom: 12px;
  }

  &__preview-alert,
  &__editor-alert {
    margin-bottom: 12px;
  }
}
</style>
