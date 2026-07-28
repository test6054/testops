<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AccreditationCycleVO } from '@/apis/quality/accreditation'
import type {
  QualityStatusCountsResponse,
  ReportEditorForm,
  ReportQueryRequest,
  ReportSaveRequest,
  ReportVO,
} from '@/apis/quality/report'
/**
 * 质量评价 - 报告生成与确认台
 *
 * 后端契约（ReportController + ReportExportController）：
 * 1. AI 任务（COURSE_REPORT_GENERATE / PROGRAM_REPORT_GENERATE）生成草稿
 * 2. 状态机 DRAFT -> SUBMITTED -> CONFIRMED / RETURNED -> ARCHIVED（transitStatus 仅接受 id + targetStatus）
 * 3. SUBMITTED / CONFIRMED / ARCHIVED 状态可触发 Word / PDF / Excel 异步三格式导出
 * 4. 导出以 exportTaskId 锚定 IDLE -> PENDING -> PROCESSING -> COMPLETED / FAILED，前端轮询 5s/次。
 */
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
  WorkbenchStageStatus,
} from '@/types/workbench'
import { LoadingOutlined } from '@ant-design/icons-vue'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import { accreditationApi } from '@/apis/quality/accreditation'
import { reportApi } from '@/apis/quality/report'
import {
  ALL_REPORT_STATUS_CODES,
  ALL_REPORT_TYPE_CODES,
  REPORT_EXPORT_STATUS_COLOR,
  REPORT_STATUS_COLOR,
  ReportExportStatusCode,
  ReportExportStatusDescription,
  ReportStatusCode,
  ReportStatusDescription,
  ReportTypeCode,
  ReportTypeDescription,
} from '@/apis/quality/types'
import QualityFormDraftStatusStrip from '@/components/quality/QualityFormDraftStatusStrip.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import {
  AchievementResultSelector,
  CourseSelector,
  ProgramSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import { loadSelectorFirstPage } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
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
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildQualityLongFormDraftKey,
  clearQualityLongFormDraft,
} from '@/composables/useQualityLongFormDraftPersist'
import { useQualityLongFormDraftSession } from '@/composables/useQualityLongFormDraftSession'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useQualityStore } from '@/stores/modules/quality'
import { useUserStore } from '@/stores/modules/user'
import { ConfirmationStatusCode } from '@/types/enums/confirmation-status-enum'
import { ALL_SEMESTER_CODES, formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import {
  getUserErrorMessage,
  getUserProcessFailureMessage,
  showUserError,
} from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

function reportTypeLabel(value: ReportTypeCode): string {
  return strictEnumLabel(ReportTypeDescription, value, '报告类型')
}

function reportStatusLabel(value: ReportStatusCode): string {
  return strictEnumLabel(ReportStatusDescription, value, '报告状态')
}

function reportStatusColor(value: ReportStatusCode): BadgeTone {
  return strictEnumTone(REPORT_STATUS_COLOR, value, '报告状态')
}

function exportStatusLabel(value: ReportExportStatusCode): string {
  return strictEnumLabel(ReportExportStatusDescription, value, '报告导出状态')
}

function exportStatusColor(value: ReportExportStatusCode): BadgeTone {
  return strictEnumTone(REPORT_EXPORT_STATUS_COLOR, value, '报告导出状态')
}

function reportExportFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(
    errorMessage,
    '报告文件生成未完成；如多次失败，请联系管理员核对报告模板和附件材料。',
  )
}

const qualityStore = useQualityStore()

const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!qualityStore.currentTrainingPlanId) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
})

const list = ref<ReportVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<ReportQueryRequest & Record<string, unknown>>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  accreditationCycleId: '',
  reportType: undefined,
  qualityCourseId: '',
  schoolYear: '',
  semester: undefined,
  status: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ReportEditorForm>({
  reportType: ReportTypeCode.COURSE_ACHIEVEMENT,
  programId: '',
  trainingPlanId: '',
  accreditationCycleId: '',
  qualityCourseId: '',
  achievementResultId: '',
  title: '',
  schoolYear: '',
  semester: undefined,
  bodyContent: '',
})
const submitting = ref(false)
const draftSaving = ref(false)
const reportCycles = ref<AccreditationCycleVO[]>([])
const cycleLoading = ref(false)
const editorCycleOptions = ref<Array<{ value: string, label: string }>>([])
/** 新建报告本地草稿会话键（尚无服务端 id 时） */
const editorCreateSessionKey = ref('')
let reportDraftHydrating = false
const userStore = useUserStore()

interface ReportEditorDraftSnapshot {
  id?: string
  reportType: ReportTypeCode
  programId: string
  trainingPlanId?: string
  accreditationCycleId?: string
  qualityCourseId?: string
  achievementResultId?: string
  title: string
  schoolYear: string
  semester?: ReportEditorForm['semester']
  bodyContent?: string
}

function snapshotReportEditor(): ReportEditorDraftSnapshot {
  return {
    id: editor.id,
    reportType: editor.reportType,
    programId: editor.programId,
    trainingPlanId: editor.trainingPlanId || undefined,
    accreditationCycleId: editor.accreditationCycleId || undefined,
    qualityCourseId: editor.qualityCourseId || undefined,
    achievementResultId: editor.achievementResultId || undefined,
    title: editor.title,
    schoolYear: editor.schoolYear,
    semester: editor.semester,
    bodyContent: editor.bodyContent || '',
  }
}

function applyReportEditorDraft(snapshot: ReportEditorDraftSnapshot): void {
  reportDraftHydrating = true
  try {
    Object.assign(editor, {
      id: snapshot.id,
      reportType: snapshot.reportType,
      programId: snapshot.programId || '',
      trainingPlanId: snapshot.trainingPlanId || '',
      accreditationCycleId: snapshot.accreditationCycleId || '',
      qualityCourseId: snapshot.qualityCourseId || '',
      achievementResultId: snapshot.achievementResultId || '',
      title: snapshot.title || '',
      schoolYear: snapshot.schoolYear || '',
      semester: snapshot.semester,
      bodyContent: snapshot.bodyContent || '',
    })
    if (snapshot.id) {
      editorMode.value = 'edit'
      editorCreateSessionKey.value = ''
    }
  } finally {
    reportDraftHydrating = false
  }
}

function buildReportSaveRequestFromSnapshot(snapshot: ReportEditorDraftSnapshot): ReportSaveRequest {
  const semester = snapshot.semester
  const selectedSemester = ALL_SEMESTER_CODES.find((code) => code === semester)
  if (!selectedSemester) {
    throw new Error('请填写学年与学期')
  }
  return {
    id: snapshot.id,
    reportType: snapshot.reportType,
    programId: snapshot.programId,
    trainingPlanId: snapshot.trainingPlanId || undefined,
    accreditationCycleId: snapshot.accreditationCycleId || undefined,
    qualityCourseId: snapshot.qualityCourseId || undefined,
    achievementResultId: snapshot.achievementResultId || undefined,
    title: snapshot.title.trim(),
    schoolYear: snapshot.schoolYear,
    semester: selectedSemester,
    bodyContent: snapshot.bodyContent,
  }
}

function canServerAutosaveReport(snapshot: ReportEditorDraftSnapshot): boolean {
  if (!snapshot.title?.trim() || !snapshot.programId || !snapshot.schoolYear || !snapshot.semester) {
    return false
  }
  if (snapshot.reportType === ReportTypeCode.COURSE_ACHIEVEMENT && !snapshot.qualityCourseId) {
    return false
  }
  if (snapshot.reportType === ReportTypeCode.PROGRAM_QUALITY) {
    if (!snapshot.trainingPlanId || !snapshot.accreditationCycleId || snapshot.qualityCourseId) {
      return false
    }
  }
  return true
}

const reportDraft = useQualityLongFormDraftSession<ReportEditorDraftSnapshot>({
  kind: 'report',
  kindLabel: '达成度分析报告',
  getTenantId: () => String(userStore.userInfo.tenantId || ''),
  getEntityKey: () => {
    if (editor.id) return 'report:' + editor.id
    if (editorCreateSessionKey.value) return editorCreateSessionKey.value
    return null
  },
  getSnapshot: snapshotReportEditor,
  isEditable: () => {
    if (!editorVisible.value) return false
    if (editorMode.value === 'create') return true
    if (!editor.id) return false
    const current = list.value.find((item) => item.id === editor.id)
    if (current) return canEditReport(current.status)
    return true
  },
  canServerAutosave: canServerAutosaveReport,
  serverAutosave: async (snapshot) => {
    const request = buildReportSaveRequestFromSnapshot(snapshot)
    if (snapshot.id) {
      await reportApi.update(request)
      return
    }
    const tenantId = String(userStore.userInfo.tenantId || '')
    const oldKey = editorCreateSessionKey.value
      ? buildQualityLongFormDraftKey(tenantId, 'report', editorCreateSessionKey.value)
      : null
    const createdId = await reportApi.create(request)
    reportDraftHydrating = true
    try {
      editor.id = String(createdId)
      editorMode.value = 'edit'
      editorCreateSessionKey.value = ''
    } finally {
      reportDraftHydrating = false
    }
    if (oldKey) {
      await clearQualityLongFormDraft(oldKey)
    }
  },
})

const reportDraftStatus = reportDraft.status
const reportDraftStatusVisible = reportDraft.statusVisible
const reportDraftLocalSavedAt = reportDraft.localSavedAt
const reportDraftServerSavedAt = reportDraft.serverSavedAt
const reportDraftErrorMessage = reportDraft.errorMessage

async function startReportDraftSession(): Promise<void> {
  const baseline = snapshotReportEditor()
  const result = await reportDraft.beginSession(baseline)
  if (result.restored && result.draft?.payloadJson) {
    applyReportEditorDraft(JSON.parse(result.draft.payloadJson) as ReportEditorDraftSnapshot)
  }
}

async function handleReportDraftSaveNow(): Promise<void> {
  draftSaving.value = true
  try {
    const ok = await reportDraft.saveNow()
    if (ok) {
      void message.success('草稿已保存到服务端')
      await loadList()
    } else if (reportDraft.status.value === 'local_saved') {
      void message.warning(reportDraft.errorMessage.value || '仅本机暂存，请补齐必填项后再同步服务端')
    }
  } finally {
    draftSaving.value = false
  }
}

async function handleEditorOpenChange(open: boolean): Promise<void> {
  if (open) {
    editorVisible.value = true
    return
  }
  if (reportDraft.needsLeaveConfirm()) {
    const ok = await confirmAsync({
      title: '关闭报告编辑？',
      content:
        '未确认同步到服务端的内容已暂存在本机，下次打开同一报告可断点续填。关闭不会丢弃本机草稿。',
      type: 'warning',
      okText: '关闭并保留草稿',
      cancelText: '继续编辑',
    })
    if (!ok) return
    await reportDraft.endSession({ discardLocal: false })
  } else {
    await reportDraft.endSession()
  }
  editorVisible.value = false
}

watch(
  () => [
    editor.id,
    editor.reportType,
    editor.programId,
    editor.trainingPlanId,
    editor.accreditationCycleId,
    editor.qualityCourseId,
    editor.achievementResultId,
    editor.title,
    editor.schoolYear,
    editor.semester,
    editor.bodyContent,
  ],
  () => {
    if (reportDraftHydrating || !editorVisible.value) return
    reportDraft.notifyChanged()
  },
)

function handleEditorProgramChange(value: string | null): void {
  editor.programId = value ?? ''
  editor.trainingPlanId = ''
  editor.accreditationCycleId = ''
  editorCycleOptions.value = []
  editor.qualityCourseId = ''
  editor.achievementResultId = ''
}

function handleEditorTrainingPlanChange(value: string | null): void {
  editor.trainingPlanId = value ?? ''
  editor.accreditationCycleId = ''
  editor.qualityCourseId = ''
  editor.achievementResultId = ''
  if (editor.reportType === ReportTypeCode.PROGRAM_QUALITY) {
    void loadEditorApplicationCycle(editor.trainingPlanId || '')
  }
}

function handleEditorQualityCourseChange(value: string | null): void {
  editor.qualityCourseId = value ?? ''
  editor.achievementResultId = ''
}

function handleQueryQualityCourseChange(value: string | null): void {
  query.qualityCourseId = value ?? ''
}

function handleQueryCycleChange(value: string | null): void {
  if (query.reportType === ReportTypeCode.COURSE_ACHIEVEMENT && value) {
    void message.error('认证周期筛选仅适用于专业质量分析报告')
    query.accreditationCycleId = ''
    return
  }
  query.accreditationCycleId = value ?? ''
}

async function loadReportCycles(): Promise<void> {
  const trainingPlanId = qualityStore.currentTrainingPlanId || ''
  if (!trainingPlanId) {
    reportCycles.value = []
    query.accreditationCycleId = ''
    return
  }
  cycleLoading.value = true
  try {
    reportCycles.value = await loadSelectorFirstPage((pageNum, pageSize) => accreditationApi.cyclePage({
      trainingPlanId,
      pageNum,
      pageSize,
    }))
    if (!reportCycles.value.some(cycle => cycle.id === query.accreditationCycleId)) {
      query.accreditationCycleId = ''
    }
  } catch (error) {
    reportCycles.value = []
    query.accreditationCycleId = ''
    showUserError(error, '认证周期列表加载失败')
  } finally {
    cycleLoading.value = false
  }
}

/** 专业质量分析报告只能显式绑定培养方案当前在办申请周期。 */
async function loadEditorApplicationCycle(trainingPlanId: string): Promise<void> {
  editorCycleOptions.value = []
  editor.accreditationCycleId = ''
  if (!trainingPlanId.trim()) return
  cycleLoading.value = true
  try {
    const cockpit = await accreditationApi.cockpit({ trainingPlanId: trainingPlanId.trim() })
    const applicationCycle = cockpit.applicationCycle
    if (!applicationCycle) {
      void message.error('当前培养方案没有在办认证申请周期，不能创建专业质量分析报告')
      return
    }
    editorCycleOptions.value = [{
      value: applicationCycle.id,
      label: `在办申请 · ${applicationCycle.cycleName}`,
    }]
    editor.accreditationCycleId = applicationCycle.id
  } catch (error) {
    showUserError(error, '在办认证申请周期加载失败')
  } finally {
    cycleLoading.value = false
  }
}

function handleEditorReportTypeChange(): void {
  if (editor.reportType === ReportTypeCode.PROGRAM_QUALITY) {
    editor.qualityCourseId = ''
    editor.achievementResultId = ''
    void loadEditorApplicationCycle(editor.trainingPlanId || '')
    return
  }
  editor.accreditationCycleId = ''
  editorCycleOptions.value = []
}

function handleEditorAchievementResultChange(value: string | null): void {
  editor.achievementResultId = value ?? ''
}

const detailVisible = ref(false)
const detailRecord = ref<ReportVO | null>(null)
const detailLoading = ref(false)

const reportTypeOptions: Array<{ value: ReportTypeCode, label: string }>
  = ALL_REPORT_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ReportTypeDescription, value, '报告类型'),
  }))
const statusOptions: Array<{ value: ReportStatusCode, label: string }>
  = ALL_REPORT_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ReportStatusDescription, value, '报告状态'),
  }))
const cycleOptions = computed(() => reportCycles.value.map(cycle => ({
  value: cycle.id,
  label: cycle.cycleName,
})))

const filterModel = computed<Record<string, unknown>>({
  get: () => query,
  set: (value) => {
    Object.assign(query, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'reportType',
    type: 'select',
    label: '类型',
    placeholder: '类型',
    allowClear: true,
    width: 140,
    options: reportTypeOptions,
  },
  {
    key: 'accreditationCycleId',
    type: 'custom',
    label: '认证周期',
    width: 180,
  },
  {
    key: 'qualityCourseId',
    type: 'custom',
    label: '关联课程',
    width: 160,
  },
  {
    key: 'schoolYear',
    type: 'input',
    label: '学年',
    placeholder: '学年',
    width: 120,
  },
  {
    key: 'semester',
    type: 'input',
    label: '学期',
    placeholder: '学期',
    width: 100,
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: statusOptions,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '关键字',
    width: 160,
  },
]

watch(
  () => query.reportType,
  (reportType) => {
    if (reportType === ReportTypeCode.COURSE_ACHIEVEMENT) {
      query.accreditationCycleId = ''
    }
  },
)

function handleSearch() {
  loadList()
}

function handleReset() {
  resetQuery()
}

const transitMap: Record<ReportStatusCode, ReportStatusCode[]> = {
  [ReportStatusCode.DRAFT]: [ReportStatusCode.SUBMITTED],
  [ReportStatusCode.SUBMITTED]: [ReportStatusCode.CONFIRMED, ReportStatusCode.RETURNED],
  [ReportStatusCode.CONFIRMED]: [ReportStatusCode.ARCHIVED, ReportStatusCode.RETURNED],
  [ReportStatusCode.RETURNED]: [ReportStatusCode.DRAFT, ReportStatusCode.SUBMITTED],
  [ReportStatusCode.ARCHIVED]: [],
}

function buildReportListQuery(): ReportQueryRequest {
  return {
    ...query,
    trainingPlanId: qualityStore.currentTrainingPlanId || undefined,
    accreditationCycleId: query.accreditationCycleId || undefined,
    qualityCourseId: query.qualityCourseId || undefined,
    schoolYear: query.schoolYear || undefined,
    semester: query.semester || undefined,
    reportType: query.reportType || undefined,
    status: query.status || undefined,
    keyword: query.keyword?.trim() || undefined,
  }
}

const reportStatusCounts = ref<QualityStatusCountsResponse | null>(null)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()

async function loadList() {
  const scope = beginQualityScopeRequest()
  loading.value = true
  beginLoad()
  try {
    const listQuery = buildReportListQuery()
    const page = await reportApi.page(listQuery)
    if (scope.isStale()) {
      return
    }
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
      return
    }
    try {
      reportStatusCounts.value = await reportApi.statusCounts(listQuery)
      if (scope.isStale()) {
        return
      }
    } catch (error) {
      if (scope.isStale()) {
        return
      }
      reportStatusCounts.value = null
      showUserError(error, '质量报告状态统计加载失败')
    }
    exportPollFailCountById.value = new Map()
    exportPollSyncFailed.value = false
    exportPollStopped.value = false
    exportPollLastError.value = null
    markExportPollOk()
    okLoad()
    resumeExportPollingForList()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    list.value = []
    total.value = 0
    reportStatusCounts.value = null
    failLoad()
    showUserError(error, '质量报告加载失败')
  } finally {
    if (!scope.isStale()) {
      loading.value = false
    }
  }
}

async function handleScopeChange(): Promise<void> {
  await loadReportCycles()
  await loadList()
}

useQualityScopedLoader(handleScopeChange, {
  watchScope: true,
  immediate: false,
  reloadOnActivated: false,
})

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'title', key: 'title', fixed: 'left' },
  { title: '类型', dataIndex: 'reportType', key: 'reportType', width: 120 },
  { title: '认证周期', key: 'accreditationCycle', width: 180 },
  { title: '关联课程', key: 'qualityCourseRef', width: 120 },
  { title: '达成结果', key: 'achievementResultRef', width: 140 },
  { title: '学年 / 学期', key: 'period', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '附件 / 导出', key: 'exports', width: 260 },
  { title: '操作', key: 'actions', width: 380 },
]

function resetQuery() {
  query.pageNum = 1
  Object.assign(query, {
    reportType: undefined,
    accreditationCycleId: '',
    qualityCourseId: '',
    schoolYear: '',
    semester: undefined,
    status: undefined,
    keyword: '',
  })
  loadList()
}

async function openCreate() {
  editorMode.value = 'create'
  editorCreateSessionKey.value = 'create-active:' + (userStore.userInfo.userId || 'anon')
  reportDraftHydrating = true
  editorCycleOptions.value = []
  try {
    Object.assign(editor, {
      id: undefined,
      reportType: ReportTypeCode.COURSE_ACHIEVEMENT,
      programId: qualityStore.currentProgramId || '',
      trainingPlanId: qualityStore.currentTrainingPlanId || '',
      accreditationCycleId: '',
      qualityCourseId: '',
      achievementResultId: '',
      title: '',
      schoolYear: qualityStore.currentSchoolYear || '',
      semester: qualityStore.currentSemester,
      bodyContent: '',
    })
  } finally {
    reportDraftHydrating = false
  }
  editorVisible.value = true
  await startReportDraftSession()
}

async function openEdit(record: ReportVO) {
  if (!canEditReport(record.status)) {
    void message.error('当前状态不允许编辑报告')
    return
  }
  editorMode.value = 'edit'
  editorCreateSessionKey.value = ''
  detailLoading.value = true
  try {
    const detail = await reportApi.detail(record.id)
    reportDraftHydrating = true
    try {
      Object.assign(editor, {
        id: detail.id,
        reportType: detail.reportType,
        programId: detail.programId || '',
        trainingPlanId: detail.trainingPlanId || '',
        accreditationCycleId: detail.accreditationCycleId || '',
        qualityCourseId: detail.qualityCourseId || '',
        achievementResultId: detail.achievementResultId || '',
        title: detail.title,
        schoolYear: detail.schoolYear || '',
        semester: detail.semester,
        bodyContent: detail.bodyContent || '',
      })
      editorCycleOptions.value = detail.accreditationCycleId
        ? [{
            value: detail.accreditationCycleId,
            label: detail.accreditationCycleName || detail.accreditationCycleId,
          }]
        : []
    } finally {
      reportDraftHydrating = false
    }
    editorVisible.value = true
    await startReportDraftSession()
  } finally {
    detailLoading.value = false
  }
}

async function submitEditor() {
  if (editorMode.value === 'edit' && editor.id) {
    const current = list.value.find((item) => item.id === editor.id)
    if (current && !canEditReport(current.status)) {
      void message.error('当前状态不允许编辑报告')
      return
    }
  }
  if (!editor.title.trim()) {
    void message.error('请填写报告标题')
    return
  }
  if (!editor.programId) {
    void message.error('请选择报告所属专业')
    return
  }
  if (editor.reportType === ReportTypeCode.COURSE_ACHIEVEMENT && !editor.qualityCourseId) {
    void message.error('课程目标达成情况评价报告必须关联质量评价课程')
    return
  }
  if (editor.reportType === ReportTypeCode.PROGRAM_QUALITY) {
    if (!editor.trainingPlanId) {
      void message.error('专业质量分析报告必须关联培养方案')
      return
    }
    if (editor.qualityCourseId) {
      void message.error('专业质量分析报告不能关联单门质量评价课程')
      return
    }
    if (!editor.accreditationCycleId) {
      void message.error('专业质量分析报告必须绑定当前在办认证申请周期')
      return
    }
  }
  const semester = editor.semester
  const selectedSemester = ALL_SEMESTER_CODES.find((code) => code === semester)
  if (!editor.schoolYear || !selectedSemester) {
    void message.error('请填写学年与学期')
    return
  }
  await reportDraft.pauseForSubmit()
  submitting.value = true
  try {
    const request: ReportSaveRequest = {
      id: editor.id,
      reportType: editor.reportType,
      programId: editor.programId,
      trainingPlanId: editor.trainingPlanId || undefined,
      accreditationCycleId: editor.accreditationCycleId || undefined,
      qualityCourseId: editor.qualityCourseId || undefined,
      achievementResultId: editor.achievementResultId || undefined,
      title: editor.title.trim(),
      schoolYear: editor.schoolYear,
      semester: selectedSemester,
      bodyContent: editor.bodyContent,
    }
    if (editorMode.value === 'create' && !editor.id) {
      const createdId = await reportApi.create(request)
      editor.id = String(createdId)
      void message.success('已创建报告草稿')
    } else {
      await reportApi.update({ ...request, id: editor.id || request.id })
      void message.success('已保存修改')
    }
    await reportDraft.markCleanAfterServerSuccess()
    await reportDraft.endSession()
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

function nextStatuses(status: ReportStatusCode) {
  return strictEnumValue(transitMap, status, '报告状态')
}

function canEditReport(status: ReportStatusCode): boolean {
  return status === ReportStatusCode.DRAFT || status === ReportStatusCode.RETURNED
}

function hasReportBody(record: ReportVO): boolean {
  return Boolean(record.bodyContent?.trim())
}

function targetRequiresReportBody(status: ReportStatusCode): boolean {
  return status === ReportStatusCode.SUBMITTED
    || status === ReportStatusCode.CONFIRMED
    || status === ReportStatusCode.ARCHIVED
}

/**
 * 后端 ReportStatusTransitRequest 仅接受 id + targetStatus，不接受备注。
 * 如需记录驳回原因，请使用外层 ImprovementTask / AuditTrail 能力。
 */
async function handleTransit(record: ReportVO, to: ReportStatusCode) {
  if (targetRequiresReportBody(to) && !hasReportBody(record)) {
    void message.error('报告正文为空，不能进入正式状态')
    return
  }
  if (to === ReportStatusCode.RETURNED) {
    const ok = await confirmAsync({
      title: `${reportStatusLabel(record.status)} → ${reportStatusLabel(to)}`,
      content: '驳回后报告会重新进入修订状态，驳回原因请在外层改进任务中记录。',
      type: 'error',
    })
    if (!ok) return
  }
  await reportApi.transitStatus({ id: record.id, targetStatus: to })
  void message.success('流转成功')
  await loadList()
}

/** 正在轮询导出状态的报告 ID 集合，用于禁用重复点击与表格展示加载动画。 */
const pollingExportIds = ref<Set<string>>(new Set())
/** 轮询代次：组件卸载时递增以中止在途 pollExportStatus 循环。 */
let exportPollGeneration = 0
const exportPollTokens = new Map<string, number>()
const EXPORT_POLL_MAX_FAILURES = 5
const exportPollFailCountById = ref<Map<string, number>>(new Map())
const exportPollSyncFailed = ref(false)
const exportPollStopped = ref(false)
const exportPollLastOkAt = ref<string | null>(null)
const exportPollLastError = ref<string | null>(null)

const EXPORT_POLL_INTERVAL_MS = 5000
/** 最大轮询时长 30 分钟：超出后停止轮询但不影响后端实际执行，用户可手工刷新列表。 */
const EXPORT_POLL_MAX_ATTEMPTS = 360

function markExportPollOk(): void {
  exportPollSyncFailed.value = false
  exportPollStopped.value = false
  exportPollLastError.value = null
  exportPollLastOkAt.value = new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function markExportPollFailed(id: string, messageText: string): number {
  exportPollSyncFailed.value = true
  exportPollLastError.value = messageText
  const next = (exportPollFailCountById.value.get(id) || 0) + 1
  const map = new Map(exportPollFailCountById.value)
  map.set(id, next)
  exportPollFailCountById.value = map
  if (next >= EXPORT_POLL_MAX_FAILURES) {
    exportPollStopped.value = true
  }
  return next
}

function clearExportPollFailure(id: string): void {
  if (!exportPollFailCountById.value.has(id)) {
    return
  }
  const map = new Map(exportPollFailCountById.value)
  map.delete(id)
  exportPollFailCountById.value = map
  if (map.size === 0) {
    exportPollSyncFailed.value = false
    exportPollStopped.value = false
    exportPollLastError.value = null
  }
}

/**
 * 轮询指定异步导出任务：任务到达终态、被退回取消或被后续任务替换时结束，
 * 仅同一 exportTaskId 的 PENDING / PROCESSING 持续轮询，最长 30 分钟。
 */
async function pollExportStatus(id: string, expectedTaskId: string) {
  const token = ++exportPollGeneration
  exportPollTokens.set(id, token)
  pollingExportIds.value.add(id)
  try {
    for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt++) {
      if (exportPollTokens.get(id) !== token) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, EXPORT_POLL_INTERVAL_MS))
      if (exportPollTokens.get(id) !== token) {
        return
      }
      let detail: ReportVO
      try {
        detail = await reportApi.detail(id)
      } catch (error) {
        const failCount = markExportPollFailed(
          id,
          getUserErrorMessage(error, '导出状态同步失败'),
        )
        if (failCount >= EXPORT_POLL_MAX_FAILURES) {
          return
        }
        continue
      }
      clearExportPollFailure(id)
      markExportPollOk()
      const idx = list.value.findIndex((item) => item.id === id)
      if (idx >= 0) list.value[idx] = detail
      const title = reportTitle(detail)
      const exportStatus = detail.exportStatus
      if (detail.exportTaskId !== expectedTaskId) {
        const reason = exportStatus === ReportExportStatusCode.IDLE
          ? '报告已退回或修订，本次导出已取消'
          : '报告已启动新的导出任务，本次轮询已结束'
        void message.info(`${title}：${reason}`)
        if (detail.exportTaskId && isExportInFlight(exportStatus)) {
          void pollExportStatus(id, detail.exportTaskId)
        }
        return
      }
      if (exportStatus === ReportExportStatusCode.COMPLETED) {
        void message.success(`${title} 三格式导出完成`)
        return
      }
      if (exportStatus === ReportExportStatusCode.FAILED) {
        void confirmAsync({
          title: `${title} 导出失败`,
          content: reportExportFailureMessage(detail.exportErrorMessage),
          type: 'error',
          width: 640,
          hideCancel: true,
          okText: '知道了',
        })
        return
      }
    }
    exportPollSyncFailed.value = true
    exportPollStopped.value = true
    exportPollLastError.value = `报告导出已超过 ${(EXPORT_POLL_INTERVAL_MS * EXPORT_POLL_MAX_ATTEMPTS) / 60_000} 分钟未完成，已停止轮询`
  } finally {
    if (exportPollTokens.get(id) === token) {
      exportPollTokens.delete(id)
      pollingExportIds.value.delete(id)
    }
  }
}

function reportTitle(record: ReportVO): string {
  return record.title?.trim() || reportTypeLabel(record.reportType)
}

async function handleExport(record: ReportVO) {
  if (!hasReportBody(record)) {
    void message.error('报告正文为空，不能生成正式导出文件')
    return
  }
  const currentExport = record.exportStatus
  if (
    currentExport === ReportExportStatusCode.PENDING
    || currentExport === ReportExportStatusCode.PROCESSING
  ) {
    void message.info(
      `${reportTitle(record)}当前处于「${exportStatusLabel(currentExport)}」，请等待完成`,
    )
    if (!record.exportTaskId) {
      void message.error('导出任务缺少任务标识，请刷新页面后重试')
      return
    }
    if (!pollingExportIds.value.has(record.id)) {
      void pollExportStatus(record.id, record.exportTaskId)
    }
    return
  }
  void confirmAsync({
    title: `导出 ${record.title}？`,
    content: '系统会生成 Word / PDF / Excel 三种报告文件，完成后可在附件列查看。',
    type: 'info',
    onOk: async () => {
      const exportTaskId = await reportApi.export(record.id)
      if (!exportTaskId?.trim()) {
        throw new Error('导出接口未返回任务标识')
      }
      void message.success('已触发异步导出，后台生成中')
      // 立即把本行标为 PENDING，UI 先展示「待导出」徽标，避免等 5s 才感知
      const idx = list.value.findIndex((item) => item.id === record.id)
      if (idx >= 0) {
        list.value[idx] = {
          ...list.value[idx],
          exportStatus: ReportExportStatusCode.PENDING,
          exportTaskId,
          exportErrorMessage: undefined,
        }
      }
      void pollExportStatus(record.id, exportTaskId)
    },
  })
}

function isExportInFlight(status: ReportExportStatusCode | undefined) {
  return status === ReportExportStatusCode.PENDING || status === ReportExportStatusCode.PROCESSING
}

function resumeExportPollingForList() {
  for (const record of list.value) {
    if (isExportInFlight(record.exportStatus) && !pollingExportIds.value.has(record.id)) {
      if (!record.exportTaskId) {
        exportPollSyncFailed.value = true
        exportPollStopped.value = true
        exportPollLastError.value = `${reportTitle(record)}缺少导出任务标识，无法同步进度`
        continue
      }
      void pollExportStatus(record.id, record.exportTaskId)
    }
  }
}

async function downloadReportExportFile(record: ReportVO, kind: 'word' | 'pdf' | 'excel') {
  if (record.exportStatus !== ReportExportStatusCode.COMPLETED) {
    void message.warning('当前报告没有与正文一致的有效导出文件')
    return
  }
  const fileId
    = kind === 'word' ? record.wordFileId : kind === 'pdf' ? record.pdfFileId : record.excelFileId
  if (!fileId) {
    void message.warning('该格式文件尚未生成')
    return
  }
  const suffix = kind === 'word' ? 'docx' : kind === 'pdf' ? 'pdf' : 'xlsx'
  await handleDownloadFile({
    fileId,
    fileName: `${reportTitle(record)}.${suffix}`,
  })
}

async function handleDelete(record: ReportVO) {
  if (record.status !== ReportStatusCode.DRAFT) {
    void message.warning('只能删除草稿状态的报告')
    return
  }
  void confirmAsync({
    title: `删除报告 ${record.title}？`,
    type: 'error',
    onOk: async () => {
      await reportApi.delete(record.id)
      void message.success('已删除')
      await loadList()
    },
  })
}

async function openDetail(record: ReportVO) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await reportApi.detail(record.id)
  } finally {
    detailLoading.value = false
  }
}

/* ========== 阶段轨与信号指标 ========== */

function buildReportStatusBuckets(
  counts: QualityStatusCountsResponse | null,
): Record<ReportStatusCode, number> {
  const buckets: Record<ReportStatusCode, number> = {
    [ReportStatusCode.DRAFT]: 0,
    [ReportStatusCode.SUBMITTED]: 0,
    [ReportStatusCode.CONFIRMED]: 0,
    [ReportStatusCode.RETURNED]: 0,
    [ReportStatusCode.ARCHIVED]: 0,
  }
  if (!counts) {
    return buckets
  }
  for (const row of counts.statusCounts) {
    buckets[row.status] = row.recordCount
  }
  return buckets
}

function buildReportExportBuckets(
  counts: QualityStatusCountsResponse | null,
): Record<ReportExportStatusCode, number> {
  const buckets: Record<ReportExportStatusCode, number> = {
    [ReportExportStatusCode.IDLE]: 0,
    [ReportExportStatusCode.PENDING]: 0,
    [ReportExportStatusCode.PROCESSING]: 0,
    [ReportExportStatusCode.COMPLETED]: 0,
    [ReportExportStatusCode.FAILED]: 0,
  }
  if (!counts?.exportStatusCounts) {
    return buckets
  }
  for (const row of counts.exportStatusCounts) {
    buckets[row.status] = row.recordCount
  }
  return buckets
}

const statusBuckets = computed(() => buildReportStatusBuckets(reportStatusCounts.value))
const exportBuckets = computed(() => buildReportExportBuckets(reportStatusCounts.value))

const stages = computed<WorkbenchStage[]>(() => {
  const b = statusBuckets.value
  const order: Array<{ key: ReportStatusCode, title: string }> = [
    { key: ReportStatusCode.DRAFT, title: '草稿' },
    { key: ReportStatusCode.SUBMITTED, title: '待确认' },
    { key: ReportStatusCode.CONFIRMED, title: '已确认' },
    { key: ReportStatusCode.ARCHIVED, title: '已归档' },
  ]
  return order.map((stage) => {
    const count = b[stage.key]
    let status: WorkbenchStageStatus = 'pending'
    if (stage.key === ReportStatusCode.ARCHIVED && count > 0) status = 'completed'
    else if (count > 0) status = 'active'
    return {
      key: stage.key,
      title: stage.title,
      status,
      statusText: `${count} 条`,
    }
  })
})

const signals = computed<SignalMetric[]>(() => {
  const counts = reportStatusCounts.value
  if (!counts) {
    return []
  }
  const b = statusBuckets.value
  const e = exportBuckets.value
  const exporting = e[ReportExportStatusCode.PENDING] + e[ReportExportStatusCode.PROCESSING]
  const exportFailed = e[ReportExportStatusCode.FAILED]
  const exportComplete = e[ReportExportStatusCode.COMPLETED]
  const draftCount = b[ReportStatusCode.DRAFT]
  const submittedCount = b[ReportStatusCode.SUBMITTED]
  const returnedCount = b[ReportStatusCode.RETURNED]
  return [
    { key: 'total', label: '报告总数', value: counts.totalCount ?? 0, tone: 'blue' },
    {
      key: 'draft',
      label: '草稿',
      value: draftCount,
      tone: draftCount > 0 ? 'orange' : 'gray',
      clickable: draftCount > 0,
      active: query.status === ReportStatusCode.DRAFT,
    },
    {
      key: 'submitted',
      label: '待确认',
      value: submittedCount,
      tone: submittedCount > 0 ? 'blue' : 'gray',
      clickable: submittedCount > 0,
      active: query.status === ReportStatusCode.SUBMITTED,
    },
    {
      key: 'returned',
      label: '已驳回',
      value: returnedCount,
      tone: returnedCount > 0 ? 'red' : 'gray',
      clickable: returnedCount > 0,
      active: query.status === ReportStatusCode.RETURNED,
    },
    {
      key: 'export-running',
      label: '导出中',
      value: exporting,
      tone: exporting > 0 ? 'orange' : 'gray',
    },
    {
      key: 'export-completed',
      label: '导出完成',
      value: exportComplete,
      tone: exportComplete > 0 ? 'green' : 'gray',
    },
    {
      key: 'export-failed',
      label: '导出未完成',
      value: exportFailed,
      tone: exportFailed > 0 ? 'red' : 'gray',
    },
  ]
})

function handleSignalMetricClick(key: string): void {
  const statusMap: Record<string, ReportStatusCode> = {
    draft: ReportStatusCode.DRAFT,
    submitted: ReportStatusCode.SUBMITTED,
    returned: ReportStatusCode.RETURNED,
  }
  const status = statusMap[key]
  if (!status) {
    return
  }
  query.status = status
  query.pageNum = 1
  loadList()
}

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

async function openAuditDrawer(record: ReportVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'REPORT',
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

const reportResultItems = computed<TaskResultItem[]>(() => {
  return list.value
    .filter(
      (r) =>
        r.status === ReportStatusCode.RETURNED || r.exportStatus === ReportExportStatusCode.FAILED,
    )
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: reportTitle(r),
      statusLabel: r.status === ReportStatusCode.RETURNED ? '已驳回' : '导出未完成',
      statusTone: 'red',
      description:
        r.status === ReportStatusCode.RETURNED
          ? '审核驳回，需修订后重新提交'
          : reportExportFailureMessage(r.exportErrorMessage),
      actions: [{ key: 'detail', label: '详情' }],
    }))
})

function handleReportResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = list.value.find((r) => r.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') openDetail(record)
}

function buildReportActions(record: ReportVO): UiTableRowActionItem[] {
  const unboundProgramReport = record.reportType === ReportTypeCode.PROGRAM_QUALITY
    && !record.accreditationCycleId
  const actions: UiTableRowActionItem[] = [
    { key: 'detail', label: '详情' },
    {
      key: 'edit',
      label: '编辑',
      disabled: unboundProgramReport || !canEditReport(record.status),
    },
  ]
  if (!unboundProgramReport) {
    for (const to of nextStatuses(record.status)) {
      actions.push({
        key: to,
        label: `→ ${reportStatusLabel(to)}`,
        tone: to === ReportStatusCode.RETURNED ? 'danger' : 'primary',
        disabled: targetRequiresReportBody(to) && !hasReportBody(record),
      })
    }
  }
  if (
    !unboundProgramReport
    && (record.status === ReportStatusCode.SUBMITTED
      || record.status === ReportStatusCode.CONFIRMED
      || record.status === ReportStatusCode.ARCHIVED)
  ) {
    actions.push({
      key: 'export',
      label: '导出三格式',
      disabled: !hasReportBody(record)
        || isExportInFlight(record.exportStatus)
        || pollingExportIds.value.has(record.id),
    })
  }
  if (record.status === ReportStatusCode.DRAFT && !unboundProgramReport) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  actions.push({ key: 'audit', label: '审计' })
  return actions
}

function handleReportAction(key: string, record: ReportVO): void {
  switch (key) {
    case 'detail':
      void openDetail(record)
      return
    case 'edit':
      void openEdit(record)
      return
    case 'export':
      void handleExport(record)
      return
    case 'delete':
      void handleDelete(record)
      return
    case 'audit':
      void openAuditDrawer(record)
      return
    case ReportStatusCode.DRAFT:
    case ReportStatusCode.SUBMITTED:
    case ReportStatusCode.RETURNED:
    case ReportStatusCode.CONFIRMED:
    case ReportStatusCode.ARCHIVED:
      void handleTransit(record, key)
  }
}

onMounted(handleScopeChange)

onActivated(() => {
  if (qualityStore.currentTrainingPlanId) {
    void handleScopeChange()
  }
})

onBeforeUnmount(() => {
  exportPollGeneration += 1
  exportPollTokens.clear()
  pollingExportIds.value.clear()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="质量评价报告">
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="handleScopeChange">
            刷新
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <QualityPlanGateStrip v-if="planGateMode" :mode="planGateMode" class="report__empty" />

    <template v-else>
      <StageRail :stages="stages" compact class="report__stages" />
      <SignalBand
        :metrics="signals"
        variant="panel"
        compact
        class="report__signals"
        @metric-click="handleSignalMetricClick"
      />

      <TaskResultPanel
        v-if="reportResultItems.length > 0"
        title="待关注报告"
        :items="reportResultItems"
        class="report__result-panel"
        @action="handleReportResultAction"
      />

      <UiEmpty
        v-if="exportPollSyncFailed"
        size="sm"
        :title="exportPollStopped ? '导出状态同步已暂停' : '导出状态同步失败'"
        :description="
          exportPollStopped
            ? `${exportPollLastError || '轮询已停止'}；最近成功 ${exportPollLastOkAt || '尚无'}`
            : `${exportPollLastError || '导出状态拉取失败'}；最近成功 ${exportPollLastOkAt || '尚无'}，已继续退避轮询`
        "
        class="report__export-sync"
      />

      <UiCard class="detail-table-card report__table-card">
        <template #title>报告列表</template>
        <template #extra>
          <UiButton size="sm" variant="primary" @click="openCreate">新建报告</UiButton>
        </template>

        <UiFilterBar
          variant="plain"
          v-model="filterModel"
          :fields="filterFields"
          show-labels
          @search="handleSearch"
          @reset="handleReset"
        >
          <template #field-qualityCourseId>
            <CourseSelector
              :value="query.qualityCourseId || null"
              :training-plan-id="qualityStore.currentTrainingPlanId || null"
              placeholder="关联课程"
              :width="160"
              @change="handleQueryQualityCourseChange"
            />
          </template>
          <template #field-accreditationCycleId>
            <UiSelect
              :model-value="query.accreditationCycleId || undefined"
              :options="cycleOptions"
              :loading="cycleLoading"
              :disabled="query.reportType === ReportTypeCode.COURSE_ACHIEVEMENT"
              allow-clear
              placeholder="认证周期"
              @update:model-value="value => handleQueryCycleChange(typeof value === 'string' ? value : null)"
            />
          </template>
        </UiFilterBar>

        <UiDataTable
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          :columns="columns"
          :data-source="list"
          :loading="loading"
          :load-error="loadError"
          empty-title="暂无质量报告"
          empty-description="可新建报告或等待 AI 生成草稿后在此确认导出"
          row-key="id"
          size="middle"
          :total="total"
          flat
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'reportType'">
              {{ reportTypeLabel(record.reportType) }}
            </template>
            <template v-else-if="column.key === 'qualityCourseRef'">
              <span v-if="record.qualityCourseId">
                {{ record.qualityCourseCode }} {{ record.qualityCourseName }}
              </span>
            </template>
            <template v-else-if="column.key === 'accreditationCycle'">
              <span v-if="record.accreditationCycleId">{{ record.accreditationCycleName }}</span>
            </template>
            <template v-else-if="column.key === 'achievementResultRef'">
              {{ record.achievementResultLabel }}
            </template>
            <template v-else-if="column.key === 'period'">
              {{ record.schoolYear
              }}<span v-if="record.semester"> / {{ formatSemester(record.semester) }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="reportStatusColor(record.status)" size="sm">
                {{ reportStatusLabel(record.status) }}
              </UiTag>
              <UiTag v-if="!hasReportBody(record)" tone="red" size="sm">
                正文缺失
              </UiTag>
            </template>
            <template v-else-if="column.key === 'exports'">
              <div class="dp-space dp-space--wrap dp-space--tight">
                <UiTextAction
                  v-if="record.exportStatus === ReportExportStatusCode.COMPLETED && record.wordFileId"
                  @click="downloadReportExportFile(record, 'word')"
                >
                  Word
                </UiTextAction>
                <UiTextAction
                  v-if="record.exportStatus === ReportExportStatusCode.COMPLETED && record.pdfFileId"
                  @click="downloadReportExportFile(record, 'pdf')"
                >
                  PDF
                </UiTextAction>
                <UiTextAction
                  v-if="record.exportStatus === ReportExportStatusCode.COMPLETED && record.excelFileId"
                  @click="downloadReportExportFile(record, 'excel')"
                >
                  Excel
                </UiTextAction>
                <UiTag
                  v-if="
                    record.exportStatus && record.exportStatus !== ReportExportStatusCode.COMPLETED
                  "
                  :tone="exportStatusColor(record.exportStatus)"
                  size="sm"
                >
                  <LoadingOutlined v-if="isExportInFlight(record.exportStatus)" />
                  {{ exportStatusLabel(record.exportStatus) }}
                </UiTag>
                <span
                  v-if="record.exportStartedTime || record.exportFinishedTime"
                  class="report__export-time"
                >
                  {{
                    record.exportFinishedTime
                      ? `完成 ${record.exportFinishedTime}`
                      : `开始 ${record.exportStartedTime}`
                  }}
                </span>
                <span
                  v-if="record.exportStatus === ReportExportStatusCode.FAILED"
                  class="report__export-error"
                >
                  {{ reportExportFailureMessage(record.exportErrorMessage) }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildReportActions(record)"
                split
                @action="(key) => handleReportAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiDrawer
        :open="editorVisible"
        :title="editorMode === 'create' ? '新建质量评价报告' : '编辑质量评价报告'"
        :width="800"
        :confirm-loading="submitting"
        :hide-footer="false"
        ok-text="保存"
        @update:open="handleEditorOpenChange"
        @ok="submitEditor"
      >
        <QualityFormDraftStatusStrip
          :status="reportDraftStatus"
          :visible="reportDraftStatusVisible"
          :local-saved-at="reportDraftLocalSavedAt"
          :server-saved-at="reportDraftServerSavedAt"
          :error-message="reportDraftErrorMessage"
          :saving="draftSaving"
          @save-now="handleReportDraftSaveNow"
        />
        <UiForm layout="vertical" :model="editor">
          <UiRow :gutter="12">
            <UiCol :span="16">
              <UiFormItem label="标题" required>
                <UiInput
                  size="sm"
                  v-model="editor.title"
                  placeholder="例：2024-2025 学年春季学期《程序设计基础》课程评价报告"
                />
              </UiFormItem>
            </UiCol>
            <UiCol :span="8">
              <UiFormItem label="类型" required>
                <UiSelect
                  size="sm"
                  v-model="editor.reportType"
                  :options="reportTypeOptions"
                  :disabled="editorMode === 'edit'"
                  @change="handleEditorReportTypeChange"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiRow v-if="editor.reportType === ReportTypeCode.PROGRAM_QUALITY" :gutter="12">
            <UiCol :span="24">
              <UiFormItem label="认证申请周期" required>
                <UiSelect
                  v-model="editor.accreditationCycleId"
                  :options="editorCycleOptions"
                  :loading="cycleLoading"
                  disabled
                  placeholder="请选择存在在办申请的培养方案"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiRow :gutter="12">
            <UiCol :span="8">
              <UiFormItem label="专业" required>
                <ProgramSelector
                  :value="editor.programId || null"
                  placeholder="选择专业"
                  :disabled="editorMode === 'edit' || Boolean(qualityStore.currentTrainingPlanId)"
                  @change="handleEditorProgramChange"
                />
              </UiFormItem>
            </UiCol>
            <UiCol :span="8">
              <UiFormItem label="培养方案">
                <TrainingPlanSelector
                  :value="editor.trainingPlanId || null"
                  :program-id="editor.programId || null"
                  placeholder="选择培养方案（可选）"
                  :disabled="editorMode === 'edit' || Boolean(qualityStore.currentTrainingPlanId)"
                  @change="handleEditorTrainingPlanChange"
                />
              </UiFormItem>
            </UiCol>
            <UiCol :span="8">
              <UiFormItem label="质量评价课程">
                <CourseSelector
                  :value="editor.qualityCourseId || null"
                  :training-plan-id="editor.trainingPlanId || null"
                  placeholder="选择质量评价课程（可选）"
                  :disabled="editorMode === 'edit'"
                  @change="handleEditorQualityCourseChange"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiRow :gutter="12">
            <UiCol :span="24">
              <UiFormItem label="达成度结果">
                <AchievementResultSelector
                  :value="editor.achievementResultId || null"
                  :program-id="editor.programId || null"
                  :training-plan-id="editor.trainingPlanId || null"
                  :quality-course-id="editor.qualityCourseId || null"
                  :school-year="editor.schoolYear || null"
                  :semester="editor.semester || null"
                  placeholder="可选，用于关联已有达成度结果"
                  :disabled="editorMode === 'edit'"
                  @change="handleEditorAchievementResultChange"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiRow :gutter="12">
            <UiCol :span="6">
              <UiFormItem label="学年" required>
                <UiInput size="sm" v-model="editor.schoolYear" :disabled="editorMode === 'edit'" />
              </UiFormItem>
            </UiCol>
            <UiCol :span="6">
              <UiFormItem label="学期" required>
                <UiSelect
                  size="sm"
                  v-model="editor.semester"
                  :options="SemesterOptions"
                  :disabled="editorMode === 'edit'"
                  placeholder="选择学期"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiFormItem label="报告正文（达成度分析）">
            <p class="report__body-hint">
              长文填写支持本机暂存与服务端自动保存草稿；刷新或误关后可断点续填。
            </p>
            <UiTextarea
              size="sm"
              v-model="editor.bodyContent"
              :rows="12"
              placeholder="填写达成度分析报告正文；AI 任务生成后会自动回填。输入后约 2.5 秒自动保存草稿。"
              class="report__body-editor"
            />
          </UiFormItem>
        </UiForm>
      </UiDrawer>

      <UiDrawer v-model:open="detailVisible" title="报告详情" :width="760" :hide-footer="true">
        <UiEmpty v-if="!detailRecord && !detailLoading" description="未加载到报告详情" size="sm" />
        <UiDescriptions v-if="detailRecord" :column="2" size="small" bordered>
          <UiDescriptionsItem label="类型">
            {{ reportTypeLabel(detailRecord.reportType) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="状态">
            <UiTag :tone="reportStatusColor(detailRecord.status)" size="sm">
              {{ reportStatusLabel(detailRecord.status) }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="达成度结果">
            {{ detailRecord.achievementResultLabel }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="所属专业">
            {{ detailRecord.programName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="培养方案">
            <span v-if="detailRecord.trainingPlanId">
              {{ detailRecord.trainingPlanCode }} {{ detailRecord.trainingPlanName }}
            </span>
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="detailRecord.accreditationCycleId" label="认证周期">
            {{ detailRecord.accreditationCycleName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="关联课程">
            <span v-if="detailRecord.qualityCourseId">
              {{ detailRecord.qualityCourseCode }} {{ detailRecord.qualityCourseName }}
            </span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="学年 / 学期">
            {{ detailRecord.schoolYear
            }}<span v-if="detailRecord.semester">
              / {{ formatSemester(detailRecord.semester) }}</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="Word 文件">
            <UiTextAction
              v-if="detailRecord.exportStatus === ReportExportStatusCode.COMPLETED && detailRecord.wordFileId"
              @click="downloadReportExportFile(detailRecord, 'word')"
            >
              下载 Word
            </UiTextAction>
            <span v-else>未生成 Word 文件</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="PDF 文件">
            <UiTextAction
              v-if="detailRecord.exportStatus === ReportExportStatusCode.COMPLETED && detailRecord.pdfFileId"
              @click="downloadReportExportFile(detailRecord, 'pdf')"
            >
              下载 PDF
            </UiTextAction>
            <span v-else>未生成 PDF 文件</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="Excel 文件">
            <UiTextAction
              v-if="detailRecord.exportStatus === ReportExportStatusCode.COMPLETED && detailRecord.excelFileId"
              @click="downloadReportExportFile(detailRecord, 'excel')"
            >
              下载 Excel
            </UiTextAction>
            <span v-else>未生成 Excel 文件</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="导出状态">
            <UiTag :tone="exportStatusColor(detailRecord.exportStatus)" size="sm">
              {{ exportStatusLabel(detailRecord.exportStatus) }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="detailRecord.exportStartedTime" label="导出开始">
            {{ detailRecord.exportStartedTime }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="detailRecord.exportFinishedTime" label="导出结束">
            {{ detailRecord.exportFinishedTime }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="detailRecord.exportErrorMessage" label="导出处理说明" :span="2">
            <span class="report__export-error">
              {{ reportExportFailureMessage(detailRecord.exportErrorMessage) }}
            </span>
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="detailRecord.confirmedTime" label="确认时间">
            {{ detailRecord.confirmedTime }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="detailRecord.archivedTime" label="归档时间">
            {{ detailRecord.archivedTime }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="标题" :span="2">
            {{ detailRecord.title }}
          </UiDescriptionsItem>
        </UiDescriptions>
        <h4 class="report__section-title">正文预览</h4>
        <div v-if="detailRecord?.bodyContent" class="report__body-preview">
          {{ detailRecord.bodyContent }}
        </div>
        <UiEmpty v-else description="正文缺失，仅保留审计，不能提交、确认、归档或导出" size="sm" />
      </UiDrawer>
    </template>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="报告操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.report {
  &__stages {
    margin-bottom: var(--dp-space-block);
  }

  &__signals {
    margin-bottom: var(--dp-space-component);
  }

  &__result-panel {
    margin-bottom: var(--dp-space-block);
  }

  &__export-sync {
    margin-bottom: var(--dp-space-component);
  }

  &__export-time {
    display: block;
    margin-top: var(--dp-space-component-xs);
    color: var(--dp-text-secondary, #666);
    font-size: var(--dp-font-size-sm, 12px);
  }

  &__export-error {
    display: block;
    margin-top: var(--dp-space-component-xs);
    color: var(--dp-danger, #cf1322);
    font-size: var(--dp-font-size-sm, 12px);
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: var(--dp-type-panel-title-size);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__filter {
    width: 160px;

    &--xs {
      width: 110px;
    }

    &--xxs {
      width: 80px;
    }
  }

  &__section-title {
    margin: var(--dp-space-block) 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__export-error {
    color: var(--dp-error);
  }

  &__body-preview {
    margin: 0;
    padding: var(--dp-space-component);
    white-space: pre-wrap;
    word-break: break-word;
    font-size: var(--dp-font-size-sm);
    line-height: 1.7;
    background: var(--dp-gray-50);
    border: 1px solid var(--dp-border);
    border-radius: 6px;
    max-height: 520px;
    overflow: auto;
  }

  &__error-pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--dp-error);
  }

  &__body-hint {
    margin: 0 0 var(--dp-space-component-tight);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
    line-height: 1.5;
  }

  &__body-editor {
    :deep(textarea) {
      font-family: var(--dp-font-family);
      font-size: var(--dp-font-size-sm);
      line-height: 1.7;
    }
  }
}
</style>
