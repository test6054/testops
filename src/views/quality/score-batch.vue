<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 成绩 Excel 异步导入
 *
 * 后端契约（ScoreBatchController + platform excel-import）：
 * 1. 选择质量评价课程 + 考核环节 + 学年/学期 → 填批次编码/名称 → UiPlatformFileField stage Excel
 *    → submitPlatformExcelImport(QUALITY_SCORE_BATCH) 一键注册并 enqueue-parse
 * 2. 状态机：PENDING → PARSING → PREVIEW_READY / FAILED
 * 3. PREVIEW_READY 后 POST /preview 拿摘要，错误行走 score-records/page-by-batch
 * 4. POST /validate → VALIDATED，POST /confirm → CONFIRMED
 * 5. PENDING / FAILED 可 POST /update-status { id, status: 'CANCELLED' } 取消
 */
import type { AssessmentItemVO } from '@/apis/quality/assessment-item'
import type { QualityCourseVO } from '@/apis/quality/quality-course'
import type {
  QualityStatusCountsResponse,
  ScoreBatchQueryRequest,
  ScoreBatchSaveRequest,
  ScoreBatchUpdateRequest,
  ScoreBatchVO,
} from '@/apis/quality/score-batch'
import type { ScoreRecordVO } from '@/apis/quality/score-record'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
} from '@/types/workbench'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ExportBusinessType } from '@/apis/edu/export'
import { downloadFile } from '@/apis/edu/file-management'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import { downloadExcelImportTemplate } from '@/apis/platform/excel-import'
import { ExcelImportSceneKey, FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { assessmentItemApi } from '@/apis/quality/assessment-item'
import { qualityCourseApi } from '@/apis/quality/quality-course'
import { scoreBatchApi } from '@/apis/quality/score-batch'
import { scoreRecordApi } from '@/apis/quality/score-record'
import {
  ALL_DATA_SOURCE_MODE_CODES,
  ALL_SCORE_BATCH_STATUS_CODES,
  ConfirmationStatusCode,
  DataSourceModeCode,
  DataSourceModeDescription,
  SCORE_BATCH_STATUS_COLOR,
  ScoreBatchFailurePhaseDescription,
  ScoreBatchStatusCode,
  ScoreBatchStatusDescription,
} from '@/apis/quality/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityIngestPageShell from '@/components/quality/QualityIngestPageShell.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import {
  loadSelectorFirstPage,
  QUALITY_SELECTOR_PAGE_SIZE,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import AuditTimelineDrawer from '@/components/workbench/AuditTimelineDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import { submitPlatformExcelImport } from '@/composables/platform/usePlatformExcelImport'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePolling } from '@/composables/usePolling'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityTableExport } from '@/composables/useQualityTableExport'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useQualityStore } from '@/stores/modules/quality'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import {
  getUserProcessFailureMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const qualityStore = useQualityStore()

const batches = ref<ScoreBatchVO[]>([])
const total = ref(0)
const batchStatusCounts = ref<QualityStatusCountsResponse | null>(null)
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const { exporting: scoreBatchExporting, exportExcel: exportScoreBatchExcel }
  = useQualityTableExport()
const uploading = ref(false)
const uploadFileNodeId = ref<string>()
const uploadFileName = ref<string>()
const templateLoading = ref(false)

const previewVisible = ref(false)
const previewLoading = ref(false)
const previewDiagnostics = ref<ScoreRecordVO[]>([])
const previewDiagnosticTotal = ref(0)
const previewPageNum = ref(1)
const previewPageSize = ref(20)
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

const query = reactive<ScoreBatchQueryRequest & Record<string, unknown>>({
  pageNum: 1,
  pageSize: 10,
  qualityCourseId: '',
  assessmentItemId: '',
  status: undefined,
  sourceMode: undefined,
  keyword: '',
})

const SOURCE_MODE_OPTIONS = ALL_DATA_SOURCE_MODE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(DataSourceModeDescription, value, '数据来源模式'),
}))

const uploadForm = reactive<ScoreBatchSaveRequest & { fileName?: string }>({
  qualityCourseId: '',
  assessmentItemId: '',
  batchCode: '',
  batchName: '',
  sourceMode: DataSourceModeCode.EXCEL_IMPORT,
  schoolYear: qualityStore.currentSchoolYear,
  semester: qualityStore.currentSemester || undefined,
  fileName: '',
})

const statusOptions = ALL_SCORE_BATCH_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ScoreBatchStatusDescription, value, '成绩批次状态'),
}))

const filterModel = computed<Record<string, unknown>>({
  get: () => query,
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

function handleExportScoreBatch(): void {
  if (!qualityStore.currentTrainingPlanId) {
    showFormValidationMessage('请先选择培养方案')
    return
  }
  void exportScoreBatchExcel({
    businessType: ExportBusinessType.QUALITY_SCORE_BATCH_EXPORT,
    bizName: '成绩批次',
    queryParams: {
      trainingPlanId: qualityStore.currentTrainingPlanId,
      qualityCourseId: query.qualityCourseId || undefined,
      assessmentItemId: query.assessmentItemId || undefined,
      status: query.status || undefined,
      sourceMode: query.sourceMode || undefined,
      keyword: query.keyword || undefined,
    },
  })
}

async function handleDownloadScoreTemplate(): Promise<void> {
  templateLoading.value = true
  try {
    const template = await downloadExcelImportTemplate({
      sceneKey: ExcelImportSceneKey.QUALITY_SCORE_BATCH,
    })
    const blobResponse = await downloadFile({ nodeId: String(template.fileNodeId) })
    const blob = blobResponse.data
    if (!blob) {
      void message.error('模板文件暂不可下载，请确认文件已生成后再次下载')
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = template.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    showUserError(error, '成绩导入模板下载失败')
  } finally {
    templateLoading.value = false
  }
}

function statusLabel(value: ScoreBatchStatusCode): string {
  return strictEnumLabel(ScoreBatchStatusDescription, value, '成绩批次状态')
}

function failurePhaseLabel(value: ScoreBatchVO['failurePhase']): string {
  if (!value) {
    return ''
  }
  return strictEnumLabel(ScoreBatchFailurePhaseDescription, value, '成绩批次失败阶段')
}

function statusColor(value: ScoreBatchStatusCode): BadgeTone {
  return strictEnumTone(SCORE_BATCH_STATUS_COLOR, value, '成绩批次状态')
}

function sourceModeLabel(value: DataSourceModeCode): string {
  return strictEnumLabel(DataSourceModeDescription, value, '数据来源模式')
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
  if (
    record.status === ScoreBatchStatusCode.PENDING
    || record.status === ScoreBatchStatusCode.PARSING
    || record.status === ScoreBatchStatusCode.CANCELLED
  ) {
    return '未生成'
  }
  if (record.status === ScoreBatchStatusCode.FAILED && !hasGeneratedRowStatistics(record)) {
    return '解析失败，未生成行统计'
  }
  if (!hasGeneratedRowStatistics(record)) {
    return `当前成绩批次已进入 ${statusLabel(record.status)}，但后端未返回行统计`
  }
  return `${record.successRows} / ${record.errorRows} / ${record.totalRows}`
}

// ─── 批次状态桶与配置状态信号 ───────────────────────────────────
function buildBatchListQuery(): ScoreBatchQueryRequest {
  return {
    ...query,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    qualityCourseId: query.qualityCourseId || undefined,
    assessmentItemId: query.assessmentItemId || undefined,
    status: query.status || undefined,
    sourceMode: query.sourceMode || undefined,
    keyword: query.keyword?.trim() || undefined,
  }
}

function buildScoreBatchStatusBuckets(
  counts: QualityStatusCountsResponse | null,
): Record<ScoreBatchStatusCode, number> {
  const buckets: Record<ScoreBatchStatusCode, number> = {
    [ScoreBatchStatusCode.PENDING]: 0,
    [ScoreBatchStatusCode.PARSING]: 0,
    [ScoreBatchStatusCode.PREVIEW_READY]: 0,
    [ScoreBatchStatusCode.VALIDATED]: 0,
    [ScoreBatchStatusCode.CONFIRMED]: 0,
    [ScoreBatchStatusCode.FAILED]: 0,
    [ScoreBatchStatusCode.CANCELLED]: 0,
  }
  if (!counts) {
    return buckets
  }
  for (const row of counts.statusCounts) {
    buckets[row.status] = row.recordCount
  }
  return buckets
}

const statusBuckets = computed(() => buildScoreBatchStatusBuckets(batchStatusCounts.value))
const distributionExpanded = ref(false)
const countsLastSuccessAt = ref<string | null>(null)

function markCountsSuccessAt(): void {
  countsLastSuccessAt.value = new Date().toISOString().replace('T', ' ').slice(0, 19)
}

const configStatusStrip = computed(() => {
  if (!batchStatusCounts.value) {
    return null
  }
  const b = statusBuckets.value
  const totalCount = batchStatusCounts.value.totalCount ?? 0
  if (b.FAILED > 0) {
    return {
      tone: 'error' as const,
      tag: '失败待处置',
      description: `有 ${b.FAILED} 个批次失败，请先查看待关注批次与失败阶段`,
    }
  }
  if (b.PARSING > 0) {
    return {
      tone: 'warning' as const,
      tag: '解析中',
      description: `有 ${b.PARSING} 个批次正在解析，完成后可预览校验`,
    }
  }
  if (b.PREVIEW_READY > 0) {
    return {
      tone: 'warning' as const,
      tag: '下一动作',
      description: `有 ${b.PREVIEW_READY} 个批次预览就绪，请校验后确认`,
    }
  }
  if (b.VALIDATED > 0) {
    return {
      tone: 'info' as const,
      tag: '下一动作',
      description: `有 ${b.VALIDATED} 个批次已校验，请确认写入成绩`,
    }
  }
  if (totalCount === 0) {
    return {
      tone: 'info' as const,
      tag: '未配置',
      description: '当前范围尚无成绩批次，请先上传 Excel 并完成解析',
    }
  }
  return {
    tone: 'success' as const,
    tag: '配置就绪',
    description: '当前范围无待处置失败或预览队列；可继续导入或核对已确认批次',
  }
})

const signals = computed<SignalMetric[]>(() => {
  const b = statusBuckets.value
  const pool: SignalMetric[] = [
    {
      key: 'failed',
      label: '失败',
      value: b.FAILED,
      tone: b.FAILED > 0 ? 'red' : 'gray',
      clickable: b.FAILED > 0,
      emphasis: 'secondary',
      actionLabel: b.FAILED > 0 ? '处理失败' : undefined,
      helper: b.FAILED > 0 ? '导入/解析失败批次' : undefined,
    },
    {
      key: 'previewReady',
      label: '预览就绪',
      value: b.PREVIEW_READY,
      tone: b.PREVIEW_READY > 0 ? 'orange' : 'gray',
      clickable: b.PREVIEW_READY > 0,
      emphasis: 'secondary',
      actionLabel: b.PREVIEW_READY > 0 ? '去预览' : undefined,
    },
    {
      key: 'parsing',
      label: '解析中',
      value: b.PARSING,
      tone: b.PARSING > 0 ? 'orange' : 'gray',
      clickable: b.PARSING > 0,
      emphasis: 'secondary',
    },
    {
      key: 'validated',
      label: '已校验',
      value: b.VALIDATED,
      tone: b.VALIDATED > 0 ? 'blue' : 'gray',
      clickable: b.VALIDATED > 0,
      emphasis: 'secondary',
    },
  ]
  const primaryBase
    = b.FAILED > 0
      ? pool[0]
      : b.PREVIEW_READY > 0
        ? pool[1]
        : b.PARSING > 0
          ? pool[2]
          : pool[3]
  return [{ ...primaryBase, emphasis: 'primary' }, ...pool.filter((item) => item.key !== primaryBase.key)]
})

const distributionSignals = computed<SignalMetric[]>(() => {
  const b = statusBuckets.value
  const totalCount = batchStatusCounts.value?.totalCount ?? 0
  return [
    { key: 'total', label: '批次总数', value: totalCount, tone: 'blue' },
    { key: 'confirmed', label: '已确认', value: b.CONFIRMED, tone: 'green' },
    { key: 'cancelled', label: '已取消', value: b.CANCELLED, tone: 'gray' },
  ]
})

function handleSignalMetricClick(key: string): void {
  const statusMap: Record<string, ScoreBatchStatusCode> = {
    failed: ScoreBatchStatusCode.FAILED,
    previewReady: ScoreBatchStatusCode.PREVIEW_READY,
    validated: ScoreBatchStatusCode.VALIDATED,
    parsing: ScoreBatchStatusCode.PARSING,
  }
  const status = statusMap[key]
  if (!status) {
    return
  }
  query.status = status
  query.pageNum = 1
  void loadBatches()
}

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

async function loadCourses(keyword?: string) {
  if (!qualityStore.currentTrainingPlanId) {
    courseOptions.value = []
    return
  }
  try {
    const page = await qualityCourseApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      enabled: true,
      keyword: keyword?.trim() || undefined,
    })
    courseOptions.value = page.list
  } catch (error) {
    courseOptions.value = []
    showUserError(error, '质量课程选项加载失败')
  }
}

async function loadUploadAssessmentItems(qualityCourseId: string | undefined) {
  if (!qualityCourseId) {
    uploadAssessmentItems.value = []
    return
  }
  uploadAssessmentLoading.value = true
  try {
    uploadAssessmentItems.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      assessmentItemApi.page({ pageNum, pageSize, qualityCourseId }),
    )
  } catch (error) {
    uploadAssessmentItems.value = []
    showUserError(error, '上传区考核环节加载失败')
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
    queryAssessmentItems.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      assessmentItemApi.page({ pageNum, pageSize, qualityCourseId }),
    )
  } catch (error) {
    queryAssessmentItems.value = []
    showUserError(error, '查询区考核环节加载失败')
  } finally {
    queryAssessmentLoading.value = false
  }
}

async function loadBatches() {
  if (!qualityStore.currentTrainingPlanId) {
    batches.value = []
    total.value = 0
    batchStatusCounts.value = null
    batchPolling.syncPolling()
    return
  }
  const scope = beginQualityScopeRequest()
  loading.value = true
  beginLoad()
  try {
    const listQuery = buildBatchListQuery()
    const page = await scoreBatchApi.page(listQuery)
    if (scope.isStale()) {
      return
    }
    batches.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    if (batches.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadBatches()
      return
    }
    try {
      const counts = await scoreBatchApi.statusCounts(listQuery)
      if (!scope.isStale()) {
        batchStatusCounts.value = counts
        markCountsSuccessAt()
      }
    } catch (error) {
      if (!scope.isStale()) {
        showUserError(error, '成绩批次状态统计加载失败')
      }
    }
    markListSyncOk()
    okLoad()
    batchPolling.syncPolling()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    batches.value = []
    total.value = 0
    failLoad()
    showUserError(error, '成绩批次加载失败')
  } finally {
    if (!scope.isStale()) {
      loading.value = false
    }
  }
}

const LIST_POLL_INTERVALS_MS = [3000, 6000, 12000, 30000] as const
const LIST_POLL_MAX_FAILURES = 5
const listSyncAt = ref<string | null>(null)
const listSyncFailed = ref(false)
const listPollFailCount = ref(0)
const listPollStopped = ref(false)

function markListSyncOk(): void {
  listSyncFailed.value = false
  listPollFailCount.value = 0
  listPollStopped.value = false
  listSyncAt.value = new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function markListSyncFailed(): void {
  listSyncFailed.value = true
  listPollFailCount.value += 1
  if (listPollFailCount.value >= LIST_POLL_MAX_FAILURES) {
    listPollStopped.value = true
  }
}

function currentListPollIntervalMs(): number {
  const idx = Math.min(listPollFailCount.value, LIST_POLL_INTERVALS_MS.length - 1)
  return LIST_POLL_INTERVALS_MS[idx]
}

const batchPolling = usePolling(() => loadBatchesQuietly(), {
  getOptions: () => ({
    intervalMs: currentListPollIntervalMs(),
    when:
      !listPollStopped.value
      && batches.value.some(
        (batch) =>
          batch.status === ScoreBatchStatusCode.PENDING
          || batch.status === ScoreBatchStatusCode.PARSING,
      ),
  }),
  pauseWhenDocumentHidden: true,
})

async function loadBatchesQuietly(): Promise<void> {
  if (!qualityStore.currentTrainingPlanId || loading.value) {
    return
  }
  const scope = beginQualityScopeRequest()
  try {
    const listQuery = buildBatchListQuery()
    const quiet = { showErrorMessage: false as const }
    const page = await scoreBatchApi.page(listQuery, quiet)
    if (scope.isStale()) {
      return
    }
    batches.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    try {
      const counts = await scoreBatchApi.statusCounts(listQuery, quiet)
      if (!scope.isStale()) {
        batchStatusCounts.value = counts
        markCountsSuccessAt()
      }
    } catch {
      // 轮询：统计失败不覆盖列表
    }
    markListSyncOk()
    batchPolling.syncPolling()
  } catch {
    if (scope.isStale()) {
      return
    }
    markListSyncFailed()
    batchPolling.syncPolling()
  }
}

const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!qualityStore.currentTrainingPlanId) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
})

async function handleScopeChange(): Promise<void> {
  await loadCourses()
  await loadBatches()
}

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: false })

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadBatches()
}

const batchListColumns: ColumnsType = [
  { title: '编码', dataIndex: 'batchCode', key: 'batchCode', width: 140, fixed: 'left' },
  { title: '名称', dataIndex: 'batchName', key: 'batchName' },
  { title: '课程', key: 'course', width: 220 },
  { title: '考核环节', key: 'assessmentItem', width: 200 },
  { title: '学年', dataIndex: 'schoolYear', key: 'schoolYear', width: 110 },
  { title: '学期', dataIndex: 'semester', key: 'semester', width: 70 },
  { title: '接入模式', dataIndex: 'sourceMode', key: 'sourceMode', width: 160 },
  { title: '行数（成功/错误/总）', key: 'rowsBreakdown', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '失败阶段', key: 'failurePhase', width: 140 },
  { title: '最近更新', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '主行动', key: 'actions', width: 360 },
]

const diagnosticsColumns: ColumnsType = [
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber' },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName' },
  { title: '班级', dataIndex: 'className', key: 'className' },
  { title: '得分', dataIndex: 'score', key: 'score' },
  { title: '是否通过', key: 'valid', width: 90 },
  { title: '处理说明', key: 'errorInfo' },
]

function splitCsvText(value?: string): string[] {
  if (!value?.trim()) return []
  return value
    .split(/[,；]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function previewErrorMessages(record: ScoreRecordVO): string[] {
  return splitCsvText(record.invalidReason)
}

function previewErrorCodes(record: ScoreRecordVO): string[] {
  return splitCsvText(record.errorCodes)
}

async function loadPreviewDiagnostics(batchId: string) {
  try {
    const page = await scoreRecordApi.pageByBatch({
      batchId,
      validFlag: false,
      pageNum: previewPageNum.value,
      pageSize: previewPageSize.value,
    })
    previewDiagnostics.value = page.list
    previewDiagnosticTotal.value = page.total
  } catch (error) {
    previewDiagnostics.value = []
    previewDiagnosticTotal.value = 0
    showUserError(error, '成绩批次预览诊断加载失败')
  }
}

function handlePreviewPageChange(pageEvent: { current: number, pageSize: number }) {
  previewPageNum.value = pageEvent.current
  previewPageSize.value = pageEvent.pageSize
  if (!previewBatch.value) return
  previewLoading.value = true
  void loadPreviewDiagnostics(previewBatch.value.id)
    .catch((error: unknown) => showUserError(error, '错误行加载失败'))
    .finally(() => {
      previewLoading.value = false
    })
}

function resetQuery() {
  query.pageNum = 1
  query.qualityCourseId = ''
  query.assessmentItemId = ''
  query.status = undefined
  query.sourceMode = undefined
  query.keyword = ''
  loadBatches()
}

async function submitScoreImport() {
  if (uploading.value) {
    return
  }
  if (!uploadForm.qualityCourseId) {
    showFormValidationMessage('请先选择质量评价课程')
    return
  }
  if (!uploadForm.assessmentItemId) {
    showFormValidationMessage('请选择或填写考核环节')
    return
  }
  if (!uploadForm.batchCode.trim() || !uploadForm.batchName.trim()) {
    showFormValidationMessage('请填写批次编码与名称')
    return
  }
  if (!uploadFileNodeId.value) {
    showFormValidationMessage('请先选择表格文件')
    return
  }
  uploading.value = true
  try {
    await submitPlatformExcelImport({
      sceneKey: ExcelImportSceneKey.QUALITY_SCORE_BATCH,
      fileNodeId: uploadFileNodeId.value,
      pollAsync: false,
      context: {
        qualityCourseId: uploadForm.qualityCourseId,
        assessmentItemId: uploadForm.assessmentItemId,
        batchCode: uploadForm.batchCode.trim(),
        batchName: uploadForm.batchName.trim(),
        sourceMode: uploadForm.sourceMode,
        schoolYear: uploadForm.schoolYear || undefined,
        semester: uploadForm.semester || undefined,
      },
    })
    void message.success('已提交导入任务，解析完成后可预览并确认')
    uploadFileNodeId.value = undefined
    uploadFileName.value = undefined
    await loadBatches()
  } catch (err) {
    showUserError(err, '成绩批次导入提交失败')
  } finally {
    uploading.value = false
  }
}

async function openPreview(record: ScoreBatchVO) {
  if (!canPreview(record.status)) {
    void message.warning('当前批次尚未生成可预览结果')
    return
  }
  previewBatch.value = record
  previewVisible.value = true
  previewLoading.value = true
  previewPageNum.value = 1
  try {
    const preview = await scoreBatchApi.preview(record.id)
    if (preview.status !== ScoreBatchStatusCode.FAILED && !hasGeneratedRowStatistics(preview)) {
      void message.error('成绩预览结果异常，请重新导入后再试')
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
    await loadPreviewDiagnostics(record.id)
  } catch (error: unknown) {
    showUserError(error, '成绩预览加载失败')
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
      void message.success('批次已校验')
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
      void message.success('批次已确认')
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
        status: ScoreBatchStatusCode.CANCELLED,
      })
      void message.success('批次已取消')
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
      void message.success('已重新触发解析')
      await loadBatches()
    },
  })
}

/* ========== 编辑 / 删除批次 ========== */

const editorVisible = ref(false)
const editorSubmitting = ref(false)
const editor = reactive<ScoreBatchUpdateRequest>({
  id: '',
  qualityCourseId: '',
  assessmentItemId: '',
  batchCode: '',
  batchName: '',
  sourceMode: DataSourceModeCode.EXCEL_IMPORT,
  sourceFileId: undefined,
  externalPullTaskId: undefined,
  schoolYear: '',
  semester: undefined,
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
  editor.semester = record.semester
  editorAssessmentItems.value = await loadSelectorFirstPage((pageNum, pageSize) =>
    assessmentItemApi.page({ pageNum, pageSize, qualityCourseId: record.qualityCourseId }),
  )
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.batchCode.trim() || !editor.batchName.trim()) {
    void message.error('请填写批次编码与名称')
    return
  }
  if (!editor.qualityCourseId || !editor.assessmentItemId) {
    void message.error('课程与考核环节不能为空')
    return
  }
  if (!editor.id) {
    void message.error('批次编号不能为空')
    return
  }
  editorSubmitting.value = true
  try {
    await scoreBatchApi.update({
      id: editor.id,
      qualityCourseId: editor.qualityCourseId,
      assessmentItemId: editor.assessmentItemId,
      batchCode: editor.batchCode.trim(),
      batchName: editor.batchName.trim(),
      sourceMode: editor.sourceMode,
      sourceFileId: editor.sourceFileId,
      externalPullTaskId: editor.externalPullTaskId,
      schoolYear: editor.schoolYear?.trim() || undefined,
      semester: editor.semester || undefined,
    })
    void message.success('批次已更新')
    editorVisible.value = false
    await loadBatches()
  } finally {
    editorSubmitting.value = false
  }
}

function canEdit(status: ScoreBatchStatusCode) {
  return (
    status === ScoreBatchStatusCode.PENDING
    || status === ScoreBatchStatusCode.FAILED
    || status === ScoreBatchStatusCode.CANCELLED
  )
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
      bizId: record.id,
    })
    auditEvents.value = page.list.map((log) => {
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
    .filter(
      (b) => b.status === ScoreBatchStatusCode.FAILED || b.status === ScoreBatchStatusCode.PARSING,
    )
    .slice(0, 5)
    .map((b) => {
      const phase = failurePhaseLabel(b.failurePhase)
      const failedDesc = [
        phase ? `失败阶段：${phase}` : '',
        b.errorSummary?.trim() || '',
        scoreBatchRowStatisticsText(b),
      ]
        .filter(Boolean)
        .join('；')
      return {
        id: b.id,
        title: `${b.batchCode} - ${b.batchName}`,
        statusLabel: statusLabel(b.status),
        statusTone: b.status === ScoreBatchStatusCode.FAILED ? 'red' : 'blue',
        description: b.status === ScoreBatchStatusCode.FAILED ? failedDesc : '解析中…',
        time: b.updateTime || b.createTime || undefined,
        actions: canPreview(b.status) ? [{ key: 'preview', label: '预览' }] : [],
      }
    })
})

function handleBatchResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = batches.value.find((b) => b.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'preview') openPreview(record)
}

function canDelete(status: ScoreBatchStatusCode) {
  return (
    status === ScoreBatchStatusCode.PENDING
    || status === ScoreBatchStatusCode.FAILED
    || status === ScoreBatchStatusCode.CANCELLED
  )
}

async function handleDelete(record: ScoreBatchVO) {
  void confirmAsync({
    title: `删除批次 ${record.batchCode}？`,
    content: '删除后批次及关联成绩明细会被清除，该操作不可恢复，请谨慎操作。',
    type: 'error',
    onOk: async () => {
      await scoreBatchApi.delete(record.id)
      void message.success('已删除')
      await loadBatches()
    },
  })
}

function canValidate(record: ScoreBatchVO) {
  return (
    record.status === ScoreBatchStatusCode.PREVIEW_READY
    && (record.errorRows ?? 0) === 0
    && (record.successRows ?? 0) > 0
  )
}
function canConfirm(status: ScoreBatchStatusCode) {
  return status === ScoreBatchStatusCode.VALIDATED
}
function canPreview(status: ScoreBatchStatusCode) {
  return (
    status === ScoreBatchStatusCode.PREVIEW_READY
    || status === ScoreBatchStatusCode.VALIDATED
    || status === ScoreBatchStatusCode.FAILED
  )
}
function canCancel(status: ScoreBatchStatusCode) {
  return status === ScoreBatchStatusCode.PENDING || status === ScoreBatchStatusCode.FAILED
}
function canReParse(status: ScoreBatchStatusCode) {
  return status === ScoreBatchStatusCode.PENDING || status === ScoreBatchStatusCode.FAILED
}

/** 成绩批次行主行动：确认/重解析 primary 置顶；预览校验进次要。 */
function buildScoreBatchActions(record: ScoreBatchVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (canConfirm(record.status)) {
    actions.push({ key: 'confirm', label: '确认', tone: 'primary' })
  }
  if (canReParse(record.status)) {
    actions.push(
      canConfirm(record.status)
        ? { key: 'reparse', label: '重新解析' }
        : { key: 'reparse', label: '重新解析', tone: 'primary' },
    )
  }
  if (canPreview(record.status)) {
    actions.push({
      key: 'preview',
      label: '预览',
      tone: actions.some((item) => item.tone === 'primary') ? undefined : 'primary',
    })
  }
  if (canValidate(record)) {
    actions.push({ key: 'validate', label: '校验' })
  }
  if (canEdit(record.status)) {
    actions.push({ key: 'edit', label: '编辑' })
  }
  if (canCancel(record.status)) {
    actions.push({ key: 'cancel', label: '取消', tone: 'danger' })
  }
  if (canDelete(record.status)) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  actions.push({ key: 'audit', label: '审计' })
  return actions
}

function handleScoreBatchAction(key: string, record: ScoreBatchVO): void {
  switch (key) {
    case 'preview':
      openPreview(record)
      break
    case 'validate':
      void handleValidate(record)
      break
    case 'confirm':
      void handleConfirm(record)
      break
    case 'reparse':
      void handleReParse(record)
      break
    case 'edit':
      openEdit(record)
      break
    case 'cancel':
      void handleCancel(record)
      break
    case 'delete':
      void handleDelete(record)
      break
    case 'audit':
      void openAuditDrawer(record)
      break
  }
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

/** 任务工作台副标题：导入批次规模。 */
const scoreBatchWorkbenchSubtitle = computed(() => `${total.value} 个导入批次`)
</script>

<template>
  <QualityIngestPageShell embedded>
    <template #context>
      <QualityPageContextBar show-title title="成绩 Excel 导入" :subtitle="scoreBatchWorkbenchSubtitle">
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
      </QualityPageContextBar>
    </template>

    <QualityPlanGateStrip v-if="planGateMode" :mode="planGateMode" class="score-batch__empty" />

    <template v-else>
      <UiAlertStrip
        v-if="configStatusStrip"
        :tone="configStatusStrip.tone"
        dense
        inline
        :show-icon="false"
        class="score-batch__config-status"
      >
        <template #default>
          <span class="score-batch__gate-row">
            <UiTag
              :tone="
                configStatusStrip.tone === 'error'
                  ? 'red'
                  : configStatusStrip.tone === 'warning'
                    ? 'orange'
                    : configStatusStrip.tone === 'success'
                      ? 'green'
                      : 'blue'
              "
              size="sm"
            >
              {{ configStatusStrip.tag }}
            </UiTag>
            <span>{{ configStatusStrip.description }}</span>
          </span>
        </template>
      </UiAlertStrip>
      <SignalBand
        :metrics="signals"
        layout="spotlight"
        variant="panel"
        compact
        class="score-batch__signals"
        @metric-click="handleSignalMetricClick"
      />
      <p v-if="countsLastSuccessAt" class="score-batch__sync-hint">
        指标最近同步：{{ countsLastSuccessAt }}
      </p>
      <div v-if="distributionSignals.length" class="score-batch__charts-fold">
        <UiButton
          variant="ghost"
          size="sm"
          class="score-batch__charts-toggle"
          @click="distributionExpanded = !distributionExpanded"
        >
          {{ distributionExpanded ? '收起状态统计' : '展开状态统计' }}
        </UiButton>
        <SignalBand
          v-if="distributionExpanded"
          :metrics="distributionSignals"
          variant="panel"
          compact
          class="score-batch__signals-secondary"
        />
      </div>

      <TaskResultPanel
        v-if="batchResultItems.length > 0"
        title="待关注批次"
        :items="batchResultItems"
        class="score-batch__result-panel"
        @action="handleBatchResultAction"
      />

      <UiEmpty
        v-if="listSyncFailed"
        size="sm"
        :title="listPollStopped ? '列表同步已暂停' : '列表同步失败'"
        :description="
          listPollStopped
            ? `连续失败 ${listPollFailCount} 次已停止轮询；最近成功 ${listSyncAt || '尚无'}`
            : `最近成功 ${listSyncAt || '尚无'}；已退避重试中`
        "
        class="score-batch__list-sync"
      />

      <div class="score-batch__upload">
        <header class="score-batch__upload-header">
          <div class="score-batch__upload-heading">
            <h3 class="score-batch__upload-title">表格文件成绩导入</h3>
            <UiButton
              variant="outline"
              size="sm"
              :loading="templateLoading"
              @click="handleDownloadScoreTemplate"
            >
              <template #icon><DownloadOutlined /></template>
              下载导入模板
            </UiButton>
          </div>
          <p class="score-batch__upload-hint">
            表头需包含：学号 / 姓名 / 班级 / 最终成绩。上传后进入成绩批次校验，由
            <strong>预览、校验、确认</strong> 完成闭环。
          </p>
        </header>
        <UiForm layout="inline" :model="uploadForm" class="score-batch__upload-form">
          <UiFormItem label="课程" required>
            <UiSelect
              size="sm"
              v-model="uploadForm.qualityCourseId"
              placeholder="选择质量评价课程"
              class="score-batch__filter score-batch__filter--lg"
              :options="courseSelectOptions"
            />
          </UiFormItem>
          <UiFormItem label="考核环节" required>
            <UiSelect
              size="sm"
              v-model="uploadForm.assessmentItemId"
              placeholder="选择考核环节"
              class="score-batch__filter score-batch__filter--lg"
              :options="uploadAssessmentItemOptions"
              :loading="uploadAssessmentLoading"
              :disabled="!uploadForm.qualityCourseId"
              allow-clear
            />
          </UiFormItem>
          <UiFormItem label="批次编码" required>
            <UiInput
              size="sm"
              v-model="uploadForm.batchCode"
              placeholder="输入批次编码"
              class="score-batch__filter"
            />
          </UiFormItem>
          <UiFormItem label="批次名称" required>
            <UiInput
              size="sm"
              v-model="uploadForm.batchName"
              placeholder="输入批次名称"
              class="score-batch__filter score-batch__filter--lg"
            />
          </UiFormItem>
          <UiFormItem label="接入模式">
            <UiInput
              size="sm"
              :value="sourceModeLabel(DataSourceModeCode.EXCEL_IMPORT)"
              disabled
              class="score-batch__filter score-batch__filter--lg"
            />
          </UiFormItem>
          <UiFormItem label="学年">
            <UiInput
              size="sm"
              v-model="uploadForm.schoolYear"
              placeholder="例：2024-2025"
              class="score-batch__filter"
            />
          </UiFormItem>
          <UiFormItem label="学期">
            <UiSelect
              size="sm"
              v-model="uploadForm.semester"
              :options="SemesterOptions"
              placeholder="学期"
              allow-clear
              class="score-batch__filter score-batch__filter--xxs"
            />
          </UiFormItem>
          <UiFormItem label="导入文件">
            <UiPlatformFileField
              v-model:file-node-id="uploadFileNodeId"
              v-model:file-name="uploadFileName"
              :scene-key="FileUploadSceneKey.QUALITY_SCORE_IMPORT"
              accept=".xlsx,.xls"
              button-text="选择表格文件"
            />
          </UiFormItem>
          <UiFormItem>
            <UiButton size="sm" variant="primary" :loading="uploading" @click="submitScoreImport">
              提交导入
            </UiButton>
          </UiFormItem>
        </UiForm>
      </div>

      <UiCard class="detail-table-card score-batch__table-card">
        <template #title>成绩批次</template>
        <template #extra>
          <UiButton
            variant="outline"
            size="sm"
            :loading="scoreBatchExporting"
            @click="handleExportScoreBatch"
          >
            <template #icon><DownloadOutlined /></template>
            导出表格文件
          </UiButton>
        </template>

        <UiFilterBar
          variant="plain"
          v-model="filterModel"
          :fields="filterFields"
          show-labels
          @search="handleSearch"
          @reset="handleReset"
        />

        <UiDataTable
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          class="score-batch__table"
          :columns="batchListColumns"
          :data-source="batches"
          :loading="loading"
          :load-error="loadError"
          empty-title="暂无成绩导入批次"
          empty-description="请在上方上传 Excel 完成解析接入"
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
                  || column.key === 'updateTime'
              "
            >
              <template v-if="column.key === 'schoolYear'">
                {{ record.schoolYear }}
              </template>
              <template v-else-if="column.key === 'semester'">
                {{ formatSemester(record.semester) }}
              </template>
              <template v-else>
                {{ record.updateTime || record.createTime || '-' }}
              </template>
            </template>
            <template v-else-if="column.key === 'failurePhase'">
              <template v-if="record.status === ScoreBatchStatusCode.FAILED">
                <div>{{ failurePhaseLabel(record.failurePhase) || '-' }}</div>
                <div v-if="record.errorSummary" class="score-batch__sub-text">
                  {{ record.errorSummary }}
                </div>
              </template>
              <span v-else class="score-batch__sub-text">-</span>
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
              <UiTableActions
                :max-visible="2"
                :items="buildScoreBatchActions(record)"
                split
                @action="(key) => handleScoreBatchAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>

    <UiDrawer v-model:open="previewVisible" title="批次明细预览" :width="960" :hide-footer="true">
      <UiDescriptions
        v-if="previewBatch"
        :column="3"
        size="small"
        bordered
        class="score-batch__preview-descriptions"
      >
        <UiDescriptionsItem label="导入批次">
          {{ previewBatch.batchCode }} · {{ previewBatch.batchName }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="状态">
          <UiTag :tone="statusColor(previewBatch.status)">
            {{ statusLabel(previewBatch.status) }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="行数（成功/错误/总）">
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
        </UiDescriptionsItem>
      </UiDescriptions>
      <p
        v-if="previewSummary.errorSummary"
        class="score-batch__error-msg score-batch__preview-error"
      >
        {{ previewSummary.errorSummary }}
      </p>
      <UiDataTable
        pagination-mode="server"
        v-model:current="previewPageNum"
        v-model:page-size="previewPageSize"
        :columns="diagnosticsColumns"
        :data-source="previewDiagnostics"
        :loading="previewLoading"
        row-key="id"
        size="small"
        :total="previewDiagnosticTotal"
        :scroll="{ y: 420 }"
        @page-change="handlePreviewPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'score'">
            {{ record.score === null || record.score === undefined ? '未解析得分' : record.score }}
          </template>
          <template v-else-if="column.key === 'valid'">
            <UiTag :tone="record.validFlag ? 'green' : 'red'">
              {{ record.validFlag ? '通过' : '失败' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'errorInfo'">
            <div
              class="dp-space dp-space--vertical dp-space--block dp-space--tight"
              style="width: 100%"
            >
              <div
                v-for="(errorMessage, idx) in previewErrorMessages(record)"
                :key="`${record.id}-message-${idx}`"
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
                v-if="
                  previewErrorMessages(record).length === 0 && previewErrorCodes(record).length > 0
                "
                class="score-batch__error-msg"
              >
                该行成绩无法确认，请检查学号、班级、成绩格式和考核环节配置
              </div>
              <span v-if="record.validFlag" class="score-batch__sub-text"> 无错误 </span>
            </div>
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
      <UiForm layout="vertical" :model="editor">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="批次编码" required>
              <UiInput size="sm" v-model="editor.batchCode" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="批次名称" required>
              <UiInput size="sm" v-model="editor.batchName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="考核环节" required>
              <UiSelect
                size="sm"
                v-model="editor.assessmentItemId"
                :options="editorAssessmentItemOptions"
                placeholder="考核环节"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="接入模式">
              <UiInput size="sm" :value="sourceModeLabel(editor.sourceMode)" disabled />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="学年">
              <UiInput size="sm" v-model="editor.schoolYear" placeholder="例：2024-2025" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="学期">
              <UiSelect
                size="sm"
                v-model="editor.semester"
                :options="SemesterOptions"
                placeholder="学期"
                allow-clear
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>
    </UiDrawer>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="成绩批次操作审计"
      show-diff
    />
  </QualityIngestPageShell>
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
    margin-top: var(--dp-space-component);
  }

  &__config-status {
    margin-bottom: var(--dp-space-component);
  }

  &__gate-row {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__signals {
    margin-bottom: var(--dp-space-component-xs);
  }

  &__signals-secondary {
    margin-top: var(--dp-space-component-tight);
  }

  &__sync-hint {
    margin: 0 0 var(--dp-space-component-tight);
    color: var(--dp-text-secondary, #666);
    font-size: var(--dp-font-size-sm, 12px);
  }

  &__charts-fold {
    margin-bottom: var(--dp-space-component-tight);
  }

  &__charts-toggle {
    padding-inline: 0;
  }

  &__result-panel {
    margin-bottom: var(--dp-space-component);
  }

  &__upload {
    margin-bottom: var(--dp-space-component);
    padding: var(--dp-space-component);
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
  }

  &__upload-header {
    margin-bottom: var(--dp-space-component-tight);
  }

  &__upload-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component-tight);
  }

  &__upload-title {
    margin: 0;
    font-size: var(--dp-font-size-lg);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__upload-hint {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
    line-height: 1.6;

    code {
      padding: 1px var(--dp-space-component-tight);
      margin: 0 2px;
      font-size: var(--dp-font-size-xs);
      background: var(--dp-gray-100);
      border-radius: var(--dp-radius-xs);
    }
  }

  &__upload-form {
    row-gap: var(--dp-space-component);
  }

  &__table {
    background: var(--dp-surface);
    border-radius: var(--dp-radius-panel);
  }

  &__sub-text {
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__num-success {
    color: var(--dp-success);
  }

  &__num-error {
    color: var(--dp-error);
  }

  &__error-msg {
    color: var(--dp-error);
  }

  &__preview-descriptions {
    margin-bottom: var(--dp-space-component);
  }

  &__preview-error {
    margin-bottom: var(--dp-space-component);
  }

  &__editor-alert {
    margin-bottom: var(--dp-space-component);
  }
}
</style>
