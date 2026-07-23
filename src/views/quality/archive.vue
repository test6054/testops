<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AccreditationCockpitVO, AccreditationCycleVO } from '@/apis/quality/accreditation'
import type {
  ArchiveDestructionFlowRecordVO,
  ArchiveQueryRequest,
  ArchiveSaveRequest,
  ArchiveSignalSummaryVO,
  ArchiveVO,
  ExpertPackageExportRequest,
} from '@/apis/quality/archive'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type {
  ArchiveDigitalStatusCode} from '@/types/enums/archive-digital-status-enum';
import type { AuditTimelineEvent, SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { accreditationApi } from '@/apis/quality/accreditation'
import { archiveApi } from '@/apis/quality/archive'
import {
  ALL_ARCHIVE_BUSINESS_TYPE_CODES,
  ArchiveBusinessTypeCode,
  ArchiveBusinessTypeDescription,
  ConfirmationStatusCode,
  ExpertPackageTypeCode,
  ExpertPackageTypeDescription,
} from '@/apis/quality/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import {
  AchievementResultSelector,
  AuditRectificationSelector,
  CourseGoalSelector,
  CourseSelector,
  GraduationRequirementSelector,
  ReportSelector,
  TeacherSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
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
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import UiTimeline from '@/components/ui-guide/ui/UiTimeline.vue'
import UiTimelineItem from '@/components/ui-guide/ui/UiTimelineItem.vue'
import AuditTimelineDrawer from '@/components/workbench/AuditTimelineDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  canExportExpertPackage,
  expertPackageExportBlockers,
} from '@/composables/useAccreditationWorkbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { useUserStore } from '@/stores/modules/user'
import { ArchiveDestructionDecisionCode } from '@/types/enums/archive-destruction-decision-enum'
import {
  ALL_ARCHIVE_DIGITAL_STATUS_CODES,
  ArchiveDigitalStatusDescription,
} from '@/types/enums/archive-digital-status-enum'
import {
  QualityArchiveDestructionLedgerExportDecisionCode,
  QualityArchiveDestructionLedgerExportDecisionDescription,
} from '@/types/enums/quality-archive-destruction-ledger-export-decision-enum'
import {
  QUALITY_ARCHIVE_DESTRUCTION_STATUS_TONE,
  QualityArchiveDestructionStatusCode,
  QualityArchiveDestructionStatusDescription,
} from '@/types/enums/quality-archive-destruction-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function archiveBusinessTypeLabel(value: ArchiveBusinessTypeCode): string {
  return strictEnumLabel(ArchiveBusinessTypeDescription, value, '归档业务类型')
}

function archiveBusinessTypeColor(value: ArchiveBusinessTypeCode): BadgeTone {
  if (value === ArchiveBusinessTypeCode.EXPERT_PACKAGE) return 'yellow'
  if (value === ArchiveBusinessTypeCode.REPORT) return 'blue'
  if (value === ArchiveBusinessTypeCode.GRADUATION_REQUIREMENT) return 'purple'
  return 'blue'
}

function destructionStatusLabel(value: QualityArchiveDestructionStatusCode): string {
  return strictEnumLabel(QualityArchiveDestructionStatusDescription, value, '销毁状态')
}

function destructionStatusTone(value: QualityArchiveDestructionStatusCode): BadgeTone {
  return strictEnumTone(QUALITY_ARCHIVE_DESTRUCTION_STATUS_TONE, value, '销毁状态')
}

function canDownloadArchive(record: ArchiveVO): boolean {
  return (
    Boolean(record.fileId)
    && record.destructionStatus !== QualityArchiveDestructionStatusCode.EXECUTING
    && record.destructionStatus !== QualityArchiveDestructionStatusCode.EXECUTED
    && record.destructionStatus !== QualityArchiveDestructionStatusCode.SUPERVISED
  )
}

const list = ref<ArchiveVO[]>([])
const total = ref(0)
const loading = ref(false)
const qualityStore = useQualityStore()
const userStore = useUserStore()
const router = useRouter()
const currentUserId = computed(() => userStore.userInfo.userId)

interface ArchiveFilterModel {
  businessType?: ArchiveBusinessTypeCode
  archiveCategory: string
  keyword: string
}

const query = reactive<ArchiveQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  businessType: undefined,
  excludeBusinessType: undefined,
  archiveCategory: '',
  archiveOfficeConfirmed: undefined,
  keyword: '',
})

type ArchiveListTab = 'expert' | 'annual'
const archiveListTab = ref<ArchiveListTab>('expert')
const archiveListTabItems = [
  { key: 'expert', label: '专家材料包' },
  { key: 'annual', label: '年度归档记录' },
]

function applyArchiveListTab(tab: ArchiveListTab): void {
  archiveListTab.value = tab
  query.pageNum = 1
  filterModel.value.businessType = undefined
  if (tab === 'expert') {
    query.businessType = ArchiveBusinessTypeCode.EXPERT_PACKAGE
    query.excludeBusinessType = undefined
  } else {
    query.businessType = undefined
    query.excludeBusinessType = ArchiveBusinessTypeCode.EXPERT_PACKAGE
  }
}

function handleArchiveListTabChange(key: string | number): void {
  if (key === 'expert') {
    applyArchiveListTab('expert')
    void loadList()
    return
  }
  if (key === 'annual') {
    applyArchiveListTab('annual')
    void loadList()
  }
}

const businessTypeOptions = ALL_ARCHIVE_BUSINESS_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveBusinessTypeDescription, value, '归档业务类型'),
}))

const filterModel = ref<ArchiveFilterModel>({
  businessType: undefined,
  archiveCategory: '',
  keyword: '',
})

const annualBusinessTypeOptions = businessTypeOptions.filter(
  (item) => item.value !== ArchiveBusinessTypeCode.EXPERT_PACKAGE,
)

const filterFields = computed((): FilterField[] => {
  const fields: FilterField[] = [
    {
      key: 'archiveCategory',
      type: 'input',
      label: '归档分类',
      placeholder: '归档分类',
      allowClear: true,
      width: 130,
      triggerSearchOnChange: false,
    },
    {
      key: 'keyword',
      type: 'input',
      label: '关键字',
      placeholder: '关键字',
      allowClear: true,
      width: 180,
      triggerSearchOnChange: false,
    },
  ]
  if (archiveListTab.value === 'annual') {
    fields.unshift({
      key: 'businessType',
      type: 'select',
      label: '业务类型',
      placeholder: '业务类型',
      allowClear: true,
      width: 180,
      options: annualBusinessTypeOptions,
    })
  }
  return fields
})

const exportVisible = ref(false)
const exportSubmitting = ref(false)
const exportForm = reactive<ExpertPackageExportRequest>({
  packageType: ExpertPackageTypeCode.REQUIREMENT,
  targetId: '',
  archiveCode: '',
  retentionYears: 20,
  archiveCategory: '',
  notes: '',
  recipientUserIds: [],
})
const exportTrainingPlanId = ref('')
const exportCockpit = ref<AccreditationCockpitVO | undefined>()
const exportActiveCycle = ref<AccreditationCycleVO | undefined>()
const exportEvidenceCount = ref(0)
const exportReadinessLoading = ref(false)

const exportProgramBlockers = computed(() => {
  if (exportForm.packageType !== ExpertPackageTypeCode.PROGRAM_ACCREDITATION) {
    return []
  }
  return expertPackageExportBlockers(
    exportActiveCycle.value,
    exportCockpit.value,
    exportEvidenceCount.value,
  )
})

const canSubmitProgramExport = computed(() => {
  if (exportForm.packageType !== ExpertPackageTypeCode.PROGRAM_ACCREDITATION) {
    return true
  }
  return canExportExpertPackage(
    exportActiveCycle.value,
    exportCockpit.value,
    exportEvidenceCount.value,
  )
})

async function loadProgramExportReadiness(trainingPlanId: string) {
  if (!trainingPlanId.trim()) {
    exportCockpit.value = undefined
    exportActiveCycle.value = undefined
    exportEvidenceCount.value = 0
    return
  }
  exportReadinessLoading.value = true
  try {
    const cockpit = await accreditationApi.cockpit({ trainingPlanId: trainingPlanId.trim() })
    exportCockpit.value = cockpit
    exportActiveCycle.value = cockpit.activeCycle
    exportEvidenceCount.value = cockpit.activeEvidenceCount ?? 0
  } catch (error) {
    exportCockpit.value = undefined
    exportActiveCycle.value = undefined
    exportEvidenceCount.value = 0
    showUserError(error, '认证导出就绪状态加载失败')
  } finally {
    exportReadinessLoading.value = false
  }
}

const digitalStatusOptions = ALL_ARCHIVE_DIGITAL_STATUS_CODES.map((value) => ({
  value,
  label: ArchiveDigitalStatusDescription[value],
}))

const detailVisible = ref(false)
const detailRecord = ref<ArchiveVO | null>(null)
const detailLoading = ref(false)

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSubmitting = ref(false)
const editor = reactive<ArchiveSaveRequest>({
  archiveCode: '',
  businessType: ArchiveBusinessTypeCode.TRAINING_PLAN,
  businessId: '',
  fileId: '',
  archiveCategory: '',
  retentionPolicyCode: '',
  retentionYears: undefined,
  digitalStatus: '' as ArchiveDigitalStatusCode | '',
  notes: '',
})
const editorTrainingPlanId = ref('')
const editorQualityCourseId = ref('')
const archiveFileName = ref<string>()

function buildArchiveListQuery(): ArchiveQueryRequest {
  return {
    ...query,
    businessType: query.businessType || undefined,
    excludeBusinessType: query.excludeBusinessType || undefined,
    archiveCategory: query.archiveCategory?.trim() || undefined,
    keyword: query.keyword?.trim() || undefined,
  }
}

const signalSummary = ref<ArchiveSignalSummaryVO | null>(null)

async function loadList() {
  loading.value = true
  try {
    const listQuery = buildArchiveListQuery()
    const page = await archiveApi.page(listQuery)
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    try {
      signalSummary.value = await archiveApi.signalSummary(listQuery)
    } catch (error) {
      signalSummary.value = null
      showUserError(error, '归档状态统计加载失败')
    }
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
    }
  } catch (error) {
    signalSummary.value = null
    showUserError(error, '质量归档材料加载失败')
  } finally {
    loading.value = false
  }
}

const DESTRUCTION_POLL_INTERVAL_MS = 5000
let destructionPollingTimer: ReturnType<typeof setInterval> | undefined

function stopDestructionPolling(): void {
  if (destructionPollingTimer) {
    clearInterval(destructionPollingTimer)
    destructionPollingTimer = undefined
  }
}

watch(
  () =>
    list.value.some(
      (record) => record.destructionStatus === QualityArchiveDestructionStatusCode.EXECUTING,
    ),
  (hasExecutingArchive) => {
    stopDestructionPolling()
    if (hasExecutingArchive) {
      destructionPollingTimer = setInterval(() => {
        if (!loading.value) void loadList()
      }, DESTRUCTION_POLL_INTERVAL_MS)
    }
  },
)

onBeforeUnmount(stopDestructionPolling)

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
  await loadList()
}

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: false })

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function syncFilterToQuery() {
  if (archiveListTab.value === 'expert') {
    query.businessType = ArchiveBusinessTypeCode.EXPERT_PACKAGE
    query.excludeBusinessType = undefined
    filterModel.value.businessType = undefined
  } else {
    query.excludeBusinessType = ArchiveBusinessTypeCode.EXPERT_PACKAGE
    query.businessType = filterModel.value.businessType || undefined
  }
  query.archiveCategory = filterModel.value.archiveCategory
  query.keyword = filterModel.value.keyword
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleResetSearch() {
  query.pageNum = 1
  query.archiveOfficeConfirmed = undefined
  syncFilterToQuery()
  loadList()
}

function openExport() {
  Object.assign(exportForm, {
    packageType: ExpertPackageTypeCode.REQUIREMENT,
    targetId: '',
    archiveCode: '',
    retentionYears: 20,
    archiveCategory: '',
    notes: '',
    recipientUserIds: [],
  })
  exportTrainingPlanId.value = qualityStore.currentTrainingPlanId || ''
  exportCockpit.value = undefined
  exportActiveCycle.value = undefined
  exportEvidenceCount.value = 0
  exportVisible.value = true
}

async function submitExport() {
  if (!exportForm.targetId.trim()) {
    void message.error('请选择材料包对应的毕业要求或培养方案')
    return
  }
  if (exportForm.packageType === ExpertPackageTypeCode.PROGRAM_ACCREDITATION) {
    await loadProgramExportReadiness(exportForm.targetId.trim())
    if (!canSubmitProgramExport.value) {
      void message.error(
        exportProgramBlockers.value.join('；') || '专业认证专家材料包导出条件未满足',
      )
      return
    }
  }
  exportSubmitting.value = true
  try {
    const archiveId = await archiveApi.exportExpertPackage({
      ...exportForm,
      targetId: exportForm.targetId.trim(),
      archiveCode: exportForm.archiveCode?.trim() || undefined,
      archiveCategory: exportForm.archiveCategory?.trim() || undefined,
      notes: exportForm.notes?.trim() || undefined,
      recipientUserIds: exportForm.recipientUserIds?.length
        ? exportForm.recipientUserIds
        : undefined,
    })
    void message.success('专家材料包导出成功')
    exportVisible.value = false
    await loadList()
    if (archiveId) {
      await openDetail({ id: archiveId })
    }
  } finally {
    exportSubmitting.value = false
  }
}

async function downloadArchiveFile(record: ArchiveVO) {
  if (!record.fileId) {
    showFormValidationMessage('归档记录缺少文件')
    return
  }
  await handleDownloadFile({
    fileId: record.fileId,
    fileName: record.fileName,
  })
}

async function openDetail(record: Pick<ArchiveVO, 'id'>) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await archiveApi.detail(record.id)
  } finally {
    detailLoading.value = false
  }
}

const qualityArchiveMoreActionItems = [
  { key: 'refresh', label: '刷新' },
  { key: 'destruction', label: '销毁清册' },
]

function onQualityArchiveMoreAction(key: string) {
  if (key === 'refresh') {
    void loadList()
    return
  }
  if (key === 'destruction') {
    void router.push({ name: 'QualityArchiveDestructionLedger' })
  }
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    archiveCode: '',
    businessType: ArchiveBusinessTypeCode.TRAINING_PLAN,
    businessId: '',
    fileId: '',
    archiveCategory: '',
    retentionPolicyCode: '',
    retentionYears: undefined,
    digitalStatus: '' as ArchiveDigitalStatusCode | '',
    notes: '',
  })
  editorTrainingPlanId.value = qualityStore.currentTrainingPlanId || ''
  editorQualityCourseId.value = qualityStore.currentQualityCourseId || ''
  archiveFileName.value = undefined
  editorVisible.value = true
}

async function openEdit(record: ArchiveVO) {
  editorMode.value = 'edit'
  detailLoading.value = true
  try {
    const detail = await archiveApi.detail(record.id)
    Object.assign(editor, {
      id: detail.id,
      archiveCode: detail.archiveCode,
      businessType: detail.businessType,
      businessId: detail.businessId,
      fileId: detail.fileId,
      archiveCategory: detail.archiveCategory || '',
      retentionPolicyCode: detail.retentionPolicyCode || '',
      retentionYears: detail.retentionYears,
      digitalStatus: detail.digitalStatus || '',
      notes: detail.notes || '',
    })
    editorTrainingPlanId.value = qualityStore.currentTrainingPlanId || ''
    editorQualityCourseId.value = qualityStore.currentQualityCourseId || ''
    archiveFileName.value = detail.fileName || undefined
    editorVisible.value = true
  } finally {
    detailLoading.value = false
  }
}

async function submitEditor() {
  if (!editor.archiveCode.trim()) {
    void message.error('请填写归档编码')
    return
  }
  if (!editor.businessType || !editor.businessId?.trim() || !editor.fileId?.trim()) {
    void message.error('请选择归档业务对象并上传归档文件')
    return
  }
  editorSubmitting.value = true
  try {
    const request: ArchiveSaveRequest = {
      ...editor,
      archiveCode: editor.archiveCode.trim(),
      businessId: editor.businessId.trim(),
      fileId: editor.fileId.trim(),
      archiveCategory: editor.archiveCategory?.trim() || undefined,
      retentionPolicyCode: editor.retentionPolicyCode?.trim() || undefined,
      digitalStatus: editor.digitalStatus || undefined,
      notes: editor.notes?.trim() || undefined,
    }
    if (editorMode.value === 'create') {
      await archiveApi.create(request)
      void message.success('已新建归档记录')
    } else {
      await archiveApi.update(request)
      void message.success('已更新归档记录')
    }
    editorVisible.value = false
    await loadList()
  } finally {
    editorSubmitting.value = false
  }
}

function buildArchiveActions(record: ArchiveVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [{ key: 'detail', label: '详情' }]
  if (canDownloadArchive(record)) {
    actions.push({ key: 'download', label: '下载' })
  }
  const destructionStatus = record.destructionStatus
  if (destructionStatus === QualityArchiveDestructionStatusCode.NONE) {
    actions.push({ key: 'edit', label: '编辑' })
    if (record.archiveOfficeConfirmed) {
      actions.push({ key: 'confirmed', label: '已确认', disabled: true })
      if (record.retentionExpired) {
        actions.push({ key: 'destruction-request', label: '申请销毁', tone: 'danger' })
      }
    } else {
      actions.push({ key: 'confirm', label: '确认归档' })
      actions.push({ key: 'delete', label: '删除登记', tone: 'danger' })
    }
  } else if (destructionStatus === QualityArchiveDestructionStatusCode.REQUESTED) {
    if (record.destructionRequestUserId !== currentUserId.value) {
      actions.push({ key: 'destruction-approve', label: '批准销毁' })
      actions.push({ key: 'destruction-reject', label: '驳回销毁', tone: 'danger' })
    }
  } else if (destructionStatus === QualityArchiveDestructionStatusCode.APPROVED) {
    actions.push({ key: 'destruction-execute', label: '执行销毁', tone: 'danger' })
  } else if (destructionStatus === QualityArchiveDestructionStatusCode.EXECUTED) {
    if (!record.fileId && record.destructionExecuteUserId !== currentUserId.value) {
      actions.push({ key: 'destruction-supervise', label: '监销确认' })
    }
  } else if (destructionStatus === QualityArchiveDestructionStatusCode.FAILED) {
    actions.push({ key: 'destruction-retry', label: '重试销毁', tone: 'danger' })
  }
  if (record.destructionHistoryPresent) {
    actions.push({ key: 'destruction-flow', label: '销毁审计' })
  }
  actions.push({ key: 'audit', label: '操作日志' })
  return actions
}

function handleArchiveAction(key: string, record: ArchiveVO): void {
  switch (key) {
    case 'detail':
      void openDetail(record)
      break
    case 'download':
      void downloadArchiveFile(record)
      break
    case 'edit':
      void openEdit(record)
      break
    case 'confirm':
      handleConfirmArchiveOffice(record)
      break
    case 'delete':
      handleDelete(record)
      break
    case 'destruction-request':
      openDestructionRequest(record)
      break
    case 'destruction-approve':
      openDestructionApproval(record, ArchiveDestructionDecisionCode.APPROVED)
      break
    case 'destruction-reject':
      openDestructionApproval(record, ArchiveDestructionDecisionCode.REJECTED)
      break
    case 'destruction-execute':
      handleDestructionExecute(record)
      break
    case 'destruction-retry':
      handleDestructionRetry(record)
      break
    case 'destruction-supervise':
      openDestructionSupervise(record)
      break
    case 'destruction-flow':
      void openDestructionFlow(record)
      break
    case 'audit':
      void openAuditDrawer(record)
      break
  }
}

function handleConfirmArchiveOffice(record: ArchiveVO) {
  if (record.archiveOfficeConfirmed) {
    void message.info('该档案已经确认')
    return
  }
  void confirmAsync({
    title: `确认归档 ${record.archiveCode}？`,
    content: '确认后该记录可作为正式专家材料包证据，后续不得通过普通删除撤销。',
    type: 'warning',
    onOk: async () => {
      await archiveApi.confirmArchiveOffice(record.id)
      void message.success('档案机构确认完成')
      await loadList()
    },
  })
}

function handleDelete(record: ArchiveVO) {
  if (record.archiveOfficeConfirmed) {
    showFormValidationMessage('已确认档案必须经过销毁审批流程，不能直接删除')
    return
  }
  void confirmAsync({
    title: `删除未确认登记 ${record.archiveCode}？`,
    content: '仅删除尚未确认的归档台账记录，已上传文件不会被删除。',
    type: 'error',
    onOk: async () => {
      await archiveApi.delete(record.id)
      void message.success('已删除')
      await loadList()
    },
  })
}

const destructionTarget = ref<ArchiveVO | null>(null)
const destructionReason = ref('')
const destructionLedgerDecision = ref<
  QualityArchiveDestructionLedgerExportDecisionCode | undefined
>(undefined)
const destructionLedgerSkipReason = ref('')
const destructionRemark = ref('')
const destructionDecision = ref<ArchiveDestructionDecisionCode>(
  ArchiveDestructionDecisionCode.APPROVED,
)
const destructionRequestOpen = ref(false)
const destructionApprovalOpen = ref(false)
const destructionSuperviseOpen = ref(false)
const destructionSubmitting = ref(false)
const destructionFlowOpen = ref(false)
const destructionFlowLoading = ref(false)
const destructionFlowRecords = ref<ArchiveDestructionFlowRecordVO[]>([])

const ledgerDecisionOptions = [
  {
    value: QualityArchiveDestructionLedgerExportDecisionCode.EXPORT_FIRST,
    label:
      QualityArchiveDestructionLedgerExportDecisionDescription[
        QualityArchiveDestructionLedgerExportDecisionCode.EXPORT_FIRST
      ],
  },
  {
    value: QualityArchiveDestructionLedgerExportDecisionCode.SKIP_CONFIRMED,
    label:
      QualityArchiveDestructionLedgerExportDecisionDescription[
        QualityArchiveDestructionLedgerExportDecisionCode.SKIP_CONFIRMED
      ],
  },
]

function openDestructionRequest(record: ArchiveVO) {
  destructionTarget.value = record
  destructionReason.value = ''
  destructionLedgerDecision.value = undefined
  destructionLedgerSkipReason.value = ''
  destructionRequestOpen.value = true
}

async function submitDestructionRequest() {
  if (!destructionTarget.value) return
  if (!destructionReason.value.trim()) {
    showFormValidationMessage('请填写销毁原因')
    return
  }
  if (!destructionLedgerDecision.value) {
    showFormValidationMessage('销毁前必须选择是否先导出清册')
    return
  }
  if (
    destructionLedgerDecision.value
    === QualityArchiveDestructionLedgerExportDecisionCode.SKIP_CONFIRMED
    && !destructionLedgerSkipReason.value.trim()
  ) {
    showFormValidationMessage('确认跳过清册导出时必须填写原因')
    return
  }
  const confirmed = await confirmAsync({
    title: '确认发起销毁申请',
    content:
      destructionLedgerDecision.value
      === QualityArchiveDestructionLedgerExportDecisionCode.EXPORT_FIRST
        ? '将先生成并归档本份材料的销毁清册，再提交销毁申请。确认后不可撤销该申请单据。'
        : '你已确认跳过电子清册导出。确认后将直接提交销毁申请。',
    okText: '确认并提交',
  })
  if (!confirmed) return
  destructionSubmitting.value = true
  try {
    await archiveApi.requestDestruction({
      archiveId: destructionTarget.value.id,
      reason: destructionReason.value.trim(),
      ledgerExportDecision: destructionLedgerDecision.value,
      ledgerSkipReason:
        destructionLedgerDecision.value
        === QualityArchiveDestructionLedgerExportDecisionCode.SKIP_CONFIRMED
          ? destructionLedgerSkipReason.value.trim()
          : undefined,
    })
    void message.success(
      destructionLedgerDecision.value
      === QualityArchiveDestructionLedgerExportDecisionCode.EXPORT_FIRST
        ? '清册已导出并提交销毁申请'
        : '销毁申请已提交',
    )
    destructionRequestOpen.value = false
    await loadList()
  } catch (error) {
    showUserError(error, '销毁申请提交失败')
  } finally {
    destructionSubmitting.value = false
  }
}

function openDestructionApproval(record: ArchiveVO, decision: ArchiveDestructionDecisionCode) {
  destructionTarget.value = record
  destructionDecision.value = decision
  destructionRemark.value = ''
  destructionApprovalOpen.value = true
}

async function submitDestructionApproval() {
  if (!destructionTarget.value) return
  if (
    destructionDecision.value === ArchiveDestructionDecisionCode.REJECTED
    && !destructionRemark.value.trim()
  ) {
    showFormValidationMessage('驳回销毁申请必须填写审批意见')
    return
  }
  destructionSubmitting.value = true
  try {
    await archiveApi.approveDestruction({
      archiveId: destructionTarget.value.id,
      decision: destructionDecision.value,
      remark: destructionRemark.value.trim() || undefined,
    })
    void message.success('销毁审批已提交')
    destructionApprovalOpen.value = false
    await loadList()
  } catch (error) {
    showUserError(error, '销毁审批提交失败')
  } finally {
    destructionSubmitting.value = false
  }
}

function handleDestructionExecute(record: ArchiveVO) {
  void confirmAsync({
    title: `确认执行销毁 ${record.archiveCode}？`,
    content: '执行后将异步物理删除归档文件，操作不可撤销。',
    type: 'error',
    okText: '执行销毁',
    onOk: async () => {
      await archiveApi.executeDestruction(record.id)
      void message.success('销毁执行已发起')
      await loadList()
    },
  })
}

function handleDestructionRetry(record: ArchiveVO) {
  void confirmAsync({
    title: `重新执行销毁 ${record.archiveCode}？`,
    content: '确认故障已经排除后重新执行物理删除，系统将重新开始失败计数。',
    type: 'error',
    okText: '重试销毁',
    onOk: async () => {
      await archiveApi.retryDestruction(record.id)
      void message.success('销毁重试已发起')
      await loadList()
    },
  })
}

function openDestructionSupervise(record: ArchiveVO) {
  destructionTarget.value = record
  destructionRemark.value = ''
  destructionSuperviseOpen.value = true
}

async function submitDestructionSupervise() {
  if (!destructionTarget.value) return
  destructionSubmitting.value = true
  try {
    await archiveApi.superviseDestruction({
      archiveId: destructionTarget.value.id,
      remark: destructionRemark.value.trim() || undefined,
    })
    void message.success('监销确认完成')
    destructionSuperviseOpen.value = false
    await loadList()
  } catch (error) {
    showUserError(error, '监销确认失败')
  } finally {
    destructionSubmitting.value = false
  }
}

async function openDestructionFlow(record: ArchiveVO) {
  destructionTarget.value = record
  destructionFlowOpen.value = true
  destructionFlowLoading.value = true
  destructionFlowRecords.value = []
  try {
    destructionFlowRecords.value = await archiveApi.listDestructionFlowRecords(record.id)
  } catch (error) {
    showUserError(error, '销毁流程记录加载失败')
  } finally {
    destructionFlowLoading.value = false
  }
}

function clearEditorBusinessObject() {
  editor.businessId = ''
}

function syncEditorTrainingPlan(value: string | null) {
  editorTrainingPlanId.value = value || ''
  if (editor.businessType === ArchiveBusinessTypeCode.TRAINING_PLAN) editor.businessId = value || ''
}

function syncEditorCourse(value: string | null) {
  editorQualityCourseId.value = value || ''
}

/* ========== 信号指标 ========== */

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const confirmed = summary.confirmedCount ?? 0
  const pending = summary.pendingCount ?? 0
  const expertCount = summary.expertPackageCount ?? 0
  return [
    { key: 'total', label: '归档总数', value: summary.totalCount ?? 0, tone: 'blue' },
    {
      key: 'confirmed',
      label: '已确认',
      value: confirmed,
      tone: confirmed > 0 ? 'green' : 'gray',
      clickable: confirmed > 0,
      active: query.archiveOfficeConfirmed === true,
    },
    {
      key: 'pending',
      label: '待确认',
      value: pending,
      tone: pending > 0 ? 'orange' : 'gray',
      clickable: pending > 0,
      active: query.archiveOfficeConfirmed === false,
    },
    {
      key: 'expert',
      label: '专家材料包',
      value: expertCount,
      tone: expertCount > 0 ? 'yellow' : 'gray',
      clickable: expertCount > 0,
      active: archiveListTab.value === 'expert',
    },
    {
      key: 'report',
      label: '报告归档',
      value: summary.reportCount ?? 0,
      tone: (summary.reportCount ?? 0) > 0 ? 'blue' : 'gray',
    },
  ]
})

function handleSignalMetricClick(key: string): void {
  query.pageNum = 1
  switch (key) {
    case 'confirmed':
      query.archiveOfficeConfirmed = true
      void loadList()
      return
    case 'pending':
      query.archiveOfficeConfirmed = false
      void loadList()
      return
    case 'expert':
      applyArchiveListTab('expert')
      void loadList()
  }
}

const columns: ColumnsType = [
  { title: '归档编码', dataIndex: 'archiveCode', key: 'archiveCode', fixed: 'left' },
  { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 160 },
  { title: '业务对象', dataIndex: 'businessLabel', key: 'businessRef', width: 220 },
  { title: '归档文件', key: 'fileRef', width: 220 },
  { title: '分类', dataIndex: 'archiveCategory', key: 'archiveCategory' },
  { title: '保管年限', dataIndex: 'retentionYears', key: 'retentionYears', width: 100 },
  {
    title: '档案室确认',
    dataIndex: 'archiveOfficeConfirmed',
    key: 'archiveOfficeConfirmed',
    width: 110,
  },
  { title: '销毁状态', dataIndex: 'destructionStatus', key: 'destructionStatus', width: 120 },
  { title: '归档时间', dataIndex: 'archivedTime', key: 'archivedTime', width: 170 },
  { title: '操作', key: 'actions', width: 320 },
]

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

async function openAuditDrawer(record: ArchiveVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'ARCHIVE',
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

watch(
  () => exportForm.packageType,
  () => {
    exportForm.targetId = ''
    exportCockpit.value = undefined
    exportActiveCycle.value = undefined
    exportEvidenceCount.value = 0
  },
)

watch(
  () => ({ packageType: exportForm.packageType, targetId: exportForm.targetId }),
  async (exportState) => {
    if (
      exportState.packageType !== ExpertPackageTypeCode.PROGRAM_ACCREDITATION
      || !exportState.targetId.trim()
    ) {
      exportCockpit.value = undefined
      exportActiveCycle.value = undefined
      exportEvidenceCount.value = 0
      return
    }
    await loadProgramExportReadiness(exportState.targetId.trim())
  },
)

watch(
  () => editor.businessType,
  () => {
    clearEditorBusinessObject()
  },
)

onMounted(async () => {
  applyArchiveListTab('expert')
  await loadList()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="质量评价 - 材料归档">
        <template #actions>
          <UiButton variant="primary" size="sm" @click="openCreate"> 补登台帐 </UiButton>
          <UiButton variant="outline" size="sm" @click="openExport"> 导出专家材料包 </UiButton>
          <UiDropdownAction
            trigger-style="button"
            button-text="更多"
            :items="qualityArchiveMoreActionItems"
            @select="onQualityArchiveMoreAction"
          />
        </template>
      </QualityPageContextBar>
    </template>

    <QualityPlanGateStrip v-if="planGateMode" :mode="planGateMode" class="archive-page__empty" />

    <template v-else>
      <UiSectionTabs
        :model-value="archiveListTab"
        :items="archiveListTabItems"
        compact
        divided
        class="archive-page__tabs"
        @change="handleArchiveListTabChange"
      />

      <SignalBand
        :metrics="signals"
        variant="panel"
        compact
        class="archive__signals"
        @metric-click="handleSignalMetricClick"
      />

      <UiCard class="detail-table-card archive__table-card">
        <template #title>归档列表</template>

        <UiFilterBar
          variant="plain"
          v-model="filterModel"
          :fields="filterFields"
          show-labels
          search-text="查询"
          @search="handleSearch"
          @reset="handleResetSearch"
        />

        <UiDataTable
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          :columns="columns"
          :data-source="list"
          :loading="loading"
          row-key="id"
          size="middle"
          :total="total"
          flat
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'businessType'">
              <UiTag :tone="archiveBusinessTypeColor(record.businessType)" size="sm">
                {{ archiveBusinessTypeLabel(record.businessType) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'archiveCategory'">
              {{ record.archiveCategory || '未设置分类' }}
            </template>
            <template v-else-if="column.key === 'businessRef'">
              {{ record.businessLabel }}
            </template>
            <template v-else-if="column.key === 'fileRef'">
              <UiTextAction v-if="canDownloadArchive(record)" @click="downloadArchiveFile(record)">
                {{ record.fileName }}
              </UiTextAction>
              <span
                v-else-if="
                  record.destructionStatus === QualityArchiveDestructionStatusCode.EXECUTING
                "
              >物理销毁中</span>
              <span
                v-else-if="
                  record.destructionStatus === QualityArchiveDestructionStatusCode.EXECUTED
                    || record.destructionStatus === QualityArchiveDestructionStatusCode.SUPERVISED
                "
              >已物理销毁</span>
              <span v-else>文件不可用</span>
            </template>
            <template v-else-if="column.key === 'retentionYears'">
              {{
                typeof record.retentionYears === 'number'
                  ? `${record.retentionYears} 年`
                  : '未设置保管年限'
              }}
            </template>
            <template v-else-if="column.key === 'archiveOfficeConfirmed'">
              <UiTag :tone="record.archiveOfficeConfirmed ? 'green' : 'gray'" size="sm">
                {{ record.archiveOfficeConfirmed ? '已确认' : '未确认' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'destructionStatus'">
              <UiTag :tone="destructionStatusTone(record.destructionStatus)" size="sm">
                {{ destructionStatusLabel(record.destructionStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'archivedTime'">
              {{ record.archivedTime || '尚未归档确认' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildArchiveActions(record)"
                split
                @action="(key) => handleArchiveAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>

    <UiDrawer
      v-model:open="exportVisible"
      title="导出专家材料包"
      :width="560"
      :confirm-loading="exportSubmitting"
      :hide-footer="false"
      ok-text="触发导出"
      @ok="submitExport"
    >
      <UiForm layout="vertical" :model="exportForm">
        <UiFormItem label="材料包类型" required>
          <UiRadioGroup v-model="exportForm.packageType" size="sm" block>
            <UiRadio
              v-for="(label, value) in ExpertPackageTypeDescription"
              :key="value"
              :value="value"
            >
              {{ label }}
            </UiRadio>
          </UiRadioGroup>
        </UiFormItem>
        <UiFormItem
          :label="
            exportForm.packageType === ExpertPackageTypeCode.REQUIREMENT ? '毕业要求' : '培养方案'
          "
          required
        >
          <TrainingPlanSelector
            v-if="exportForm.packageType === ExpertPackageTypeCode.REQUIREMENT"
            v-model:value="exportTrainingPlanId"
            :program-id="qualityStore.currentProgramId || null"
            class="archive__stacked-control archive__stacked-control--first"
            placeholder="请选择毕业要求所属培养方案"
          />
          <GraduationRequirementSelector
            v-if="exportForm.packageType === ExpertPackageTypeCode.REQUIREMENT"
            v-model:value="exportForm.targetId"
            :training-plan-id="exportTrainingPlanId || qualityStore.currentTrainingPlanId || null"
            class="archive__stacked-control"
            placeholder="请选择毕业要求"
          />
          <TrainingPlanSelector
            v-else
            v-model:value="exportForm.targetId"
            :program-id="qualityStore.currentProgramId || null"
            placeholder="请选择培养方案"
          />
        </UiFormItem>
        <div
          v-if="
            exportForm.packageType === ExpertPackageTypeCode.PROGRAM_ACCREDITATION
              && exportForm.targetId
          "
          class="archive-page__export-readiness"
        >
          <p class="archive-page__export-readiness-text">
            {{
              exportReadinessLoading
                ? '正在校验专业认证导出就绪条件…'
                : canSubmitProgramExport
                  ? '已满足专业认证专家材料包导出条件'
                  : '尚未满足专业认证专家材料包导出条件'
            }}
          </p>
          <ul
            v-if="!exportReadinessLoading && exportProgramBlockers.length"
            class="archive-page__export-blockers"
          >
            <li v-for="item in exportProgramBlockers" :key="item">{{ item }}</li>
          </ul>
        </div>
        <UiFormItem label="归档编码">
          <UiInput
            size="sm"
            v-model="exportForm.archiveCode"
            placeholder="可选；为空时系统自动生成归档编码"
          />
        </UiFormItem>
        <UiFormItem label="保管年限">
          <UiInputNumber size="sm" v-model="exportForm.retentionYears" :min="1" :max="50" />
        </UiFormItem>
        <UiFormItem label="归档分类">
          <UiInput
            size="sm"
            v-model="exportForm.archiveCategory"
            placeholder="可填写专家包、评审材料等分类"
          />
        </UiFormItem>
        <UiFormItem label="通知接收人">
          <TeacherSelector
            v-model:value="exportForm.recipientUserIds"
            mode="multiple"
            placeholder="请选择通知接收人"
          />
        </UiFormItem>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="exportForm.notes" :rows="2" placeholder="可选" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建归档记录' : '编辑归档记录'"
      :width="720"
      :confirm-loading="editorSubmitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <UiForm layout="vertical" :model="editor">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="归档编码" required>
              <UiInput
                size="sm"
                v-model="editor.archiveCode"
                placeholder="例：EP-REQ-1-2026"
                :disabled="editorMode === 'edit'"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="业务类型" required>
              <UiSelect
                size="sm"
                v-model="editor.businessType"
                :options="businessTypeOptions"
                :disabled="editorMode === 'edit'"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="关联业务对象" required>
              <TrainingPlanSelector
                v-if="editor.businessType === ArchiveBusinessTypeCode.TRAINING_PLAN"
                :value="editor.businessId || null"
                :program-id="qualityStore.currentProgramId || null"
                placeholder="请选择培养方案"
                :disabled="editorMode === 'edit'"
                @change="syncEditorTrainingPlan"
              />
              <GraduationRequirementSelector
                v-else-if="editor.businessType === ArchiveBusinessTypeCode.GRADUATION_REQUIREMENT"
                v-model:value="editor.businessId"
                :training-plan-id="
                  editorTrainingPlanId || qualityStore.currentTrainingPlanId || null
                "
                placeholder="请选择毕业要求"
                :disabled="editorMode === 'edit'"
              />
              <CourseSelector
                v-else-if="editor.businessType === 'COURSE_GOAL'"
                :value="editorQualityCourseId || null"
                :training-plan-id="
                  editorTrainingPlanId || qualityStore.currentTrainingPlanId || null
                "
                :program-id="qualityStore.currentProgramId || null"
                placeholder="请先选择课程目标所属课程"
                :disabled="editorMode === 'edit'"
                @change="syncEditorCourse"
              />
              <CourseGoalSelector
                v-if="editor.businessType === 'COURSE_GOAL'"
                v-model:value="editor.businessId"
                :quality-course-id="
                  editorQualityCourseId || qualityStore.currentQualityCourseId || null
                "
                class="archive__stacked-control"
                placeholder="请选择课程目标"
                :disabled="editorMode === 'edit'"
              />
              <AchievementResultSelector
                v-else-if="editor.businessType === 'ACHIEVEMENT_RESULT'"
                v-model:value="editor.businessId"
                :training-plan-id="
                  editorTrainingPlanId || qualityStore.currentTrainingPlanId || null
                "
                :quality-course-id="
                  editorQualityCourseId || qualityStore.currentQualityCourseId || null
                "
                placeholder="请选择达成度结果"
                :disabled="editorMode === 'edit'"
              />
              <ReportSelector
                v-else-if="editor.businessType === ArchiveBusinessTypeCode.REPORT"
                v-model:value="editor.businessId"
                :program-id="qualityStore.currentProgramId || null"
                :training-plan-id="
                  editorTrainingPlanId || qualityStore.currentTrainingPlanId || null
                "
                :quality-course-id="
                  editorQualityCourseId || qualityStore.currentQualityCourseId || null
                "
                placeholder="请选择报告"
                :disabled="editorMode === 'edit'"
              />
              <AuditRectificationSelector
                v-else-if="editor.businessType === 'AUDIT_RECTIFICATION'"
                v-model:value="editor.businessId"
                placeholder="请选择审核评估整改任务"
                :disabled="editorMode === 'edit'"
              />
              <span v-else class="archive-page__form-hint">该类型需要从对应业务页面发起归档</span>
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="归档文件" required>
              <UiPlatformFileField
                v-model:file-node-id="editor.fileId"
                v-model:file-name="archiveFileName"
                :scene-key="FileUploadSceneKey.QUALITY_ARCHIVE_FILE"
                :disabled="editorMode === 'edit'"
                button-text="上传归档文件"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="归档分类">
              <UiInput size="sm" v-model="editor.archiveCategory" placeholder="例：专家材料包" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="保管期编码">
              <UiInput size="sm" v-model="editor.retentionPolicyCode" placeholder="可选" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="保管年限">
              <UiInputNumber
                size="sm"
                v-model="editor.retentionYears"
                :min="1"
                :max="50"
                class="archive__number-full"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="电子化保管状态">
          <UiSelect
            size="sm"
            v-model="editor.digitalStatus"
            allow-clear
            placeholder="选择电子化状态"
            :options="digitalStatusOptions"
          />
        </UiFormItem>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="editor.notes" :rows="2" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer v-model:open="detailVisible" title="归档详情" :width="560" :hide-footer="true">
      <UiEmpty v-if="!detailRecord && !detailLoading" description="暂无归档台账记录" size="sm" />
      <UiDescriptions v-if="detailRecord" :column="1" size="small" bordered>
        <UiDescriptionsItem label="归档编码">
          {{ detailRecord.archiveCode }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="业务类型">
          <UiTag :tone="archiveBusinessTypeColor(detailRecord.businessType)" size="sm">
            {{ archiveBusinessTypeLabel(detailRecord.businessType) }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="关联业务对象">
          {{ detailRecord.businessLabel }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="归档文件">
          <UiTextAction v-if="detailRecord.fileId" @click="downloadArchiveFile(detailRecord)">
            {{ detailRecord.fileName }}
          </UiTextAction>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="分类">
          {{ detailRecord.archiveCategory || '未设置分类' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="保管年限">
          {{
            typeof detailRecord.retentionYears === 'number'
              ? `${detailRecord.retentionYears} 年`
              : '未设置保管年限'
          }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="保管期编码">
          {{ detailRecord.retentionPolicyCode || '未设置保管期编码' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="档案室确认">
          <UiTag :tone="detailRecord.archiveOfficeConfirmed ? 'green' : 'gray'" size="sm">
            {{ detailRecord.archiveOfficeConfirmed ? '已确认' : '未确认' }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="销毁状态">
          <UiTag :tone="destructionStatusTone(detailRecord.destructionStatus)" size="sm">
            {{ destructionStatusLabel(detailRecord.destructionStatus) }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="保管到期">
          {{ detailRecord.retentionDueTime || '未配置保管年限' }}
          <span v-if="detailRecord.retentionExpired">（已到期）</span>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="归档时间">
          {{ detailRecord.archivedTime || '尚未归档确认' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="备注">
          {{ detailRecord.notes || '未填写备注' }}
        </UiDescriptionsItem>
      </UiDescriptions>
    </UiDrawer>

    <UiDrawer
      v-model:open="destructionRequestOpen"
      title="申请销毁"
      :width="520"
      :confirm-loading="destructionSubmitting"
      :hide-footer="false"
      ok-text="确认后提交申请"
      @ok="submitDestructionRequest"
    >
      <UiForm layout="vertical">
        <UiFormItem label="销毁原因" required>
          <UiTextarea
            size="sm"
            v-model="destructionReason"
            :rows="3"
            placeholder="说明保管期满或鉴定依据"
          />
        </UiFormItem>
        <UiFormItem label="销毁前清册处理" required>
          <UiRadioGroup
            v-model="destructionLedgerDecision"
            size="sm"
            block
            :options="ledgerDecisionOptions"
          />
          <div class="archive-page__form-hint">
            必须先选择是否导出清册并确认后，才能提交销毁申请。
          </div>
        </UiFormItem>
        <UiFormItem
          v-if="
            destructionLedgerDecision
              === QualityArchiveDestructionLedgerExportDecisionCode.SKIP_CONFIRMED
          "
          label="跳过清册导出原因"
          required
        >
          <UiTextarea
            size="sm"
            v-model="destructionLedgerSkipReason"
            :rows="2"
            placeholder="说明为何确认跳过电子清册导出"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      v-model:open="destructionApprovalOpen"
      :title="
        destructionDecision === ArchiveDestructionDecisionCode.APPROVED ? '批准销毁' : '驳回销毁'
      "
      :width="480"
      :confirm-loading="destructionSubmitting"
      :hide-footer="false"
      ok-text="提交审批"
      @ok="submitDestructionApproval"
    >
      <UiForm layout="vertical">
        <UiFormItem
          label="审批意见"
          :required="destructionDecision === ArchiveDestructionDecisionCode.REJECTED"
        >
          <UiTextarea
            size="sm"
            v-model="destructionRemark"
            :rows="3"
            :placeholder="
              destructionDecision === ArchiveDestructionDecisionCode.REJECTED
                ? '请填写驳回依据'
                : '可选'
            "
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      v-model:open="destructionSuperviseOpen"
      title="监销确认"
      :width="480"
      :confirm-loading="destructionSubmitting"
      :hide-footer="false"
      ok-text="确认监销"
      @ok="submitDestructionSupervise"
    >
      <UiForm layout="vertical">
        <UiFormItem label="监销备注">
          <UiTextarea size="sm" v-model="destructionRemark" :rows="3" placeholder="可选" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      v-model:open="destructionFlowOpen"
      title="销毁执行审计"
      :width="560"
      :hide-footer="true"
    >
      <UiEmpty
        size="sm"
        v-if="!destructionFlowLoading && destructionFlowRecords.length === 0"
        description="尚未发起销毁流程"
      />
      <UiTimeline v-else>
        <UiTimelineItem v-for="item in destructionFlowRecords" :key="item.id">
          <div class="archive-page__flow-item">
            <div class="archive-page__flow-title">{{ item.eventTypeLabel }}</div>
            <div class="archive-page__flow-meta">{{ item.eventTime }}</div>
            <div v-if="item.destructionStatus" class="archive-page__flow-meta">
              <UiTag :tone="destructionStatusTone(item.destructionStatus)" size="sm">
                {{ destructionStatusLabel(item.destructionStatus) }}
              </UiTag>
            </div>
            <div v-if="item.remark" class="archive-page__flow-meta">{{ item.remark }}</div>
            <div v-if="item.detail" class="archive-page__flow-meta">{{ item.detail }}</div>
          </div>
        </UiTimelineItem>
      </UiTimeline>
    </UiDrawer>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="归档操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.archive {
  &__signals {
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-3, 12px);
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: var(--dp-font-size-lg);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 180px;

    &--xs {
      width: 130px;
    }
  }

  &__alert {
    margin-bottom: 16px;
  }

  &__number-full {
    width: 100%;
  }

  &__stacked-control {
    margin-top: 8px;

    &--first {
      margin-top: 0;
    }
  }

  &__file-name {
    margin-top: 8px;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
    line-height: 20px;
  }

  &__export-readiness {
    margin-bottom: 16px;
  }

  &__export-readiness-text {
    margin: 0;
    font-size: var(--dp-font-size-md);
    line-height: 22px;
    color: var(--dp-text-secondary);
  }

  &__export-blockers {
    margin: 8px 0 0;
    padding-left: 18px;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
    line-height: 20px;
  }

  &__form-hint {
    font-size: var(--dp-font-size-sm);
    line-height: 20px;
    color: var(--dp-text-muted);
  }

  &__flow-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__flow-title {
    font-size: var(--dp-font-size-md);
    line-height: 22px;
    color: var(--dp-text-primary);
  }

  &__flow-meta {
    font-size: var(--dp-font-size-sm);
    line-height: 20px;
    color: var(--dp-text-secondary);
  }
}
</style>
