<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AuditIssueQueryRequest,
  AuditIssueSaveRequest,
  AuditIssueVO,
} from '@/apis/quality/audit-issue'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { WorkbenchSignalRefreshHandler } from '@/composables/quality/improvement'
import type { QualityScopeRequestToken } from '@/composables/useScopeRequestGuard'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import {
  AUDIT_ISSUE_SEVERITY_OPTIONS,
  AUDIT_ISSUE_SEVERITY_TONE,
  AUDIT_ISSUE_SOURCE_OPTIONS,
  auditIssueApi,
  AuditIssueSeverityCode,
  AuditIssueSeverityDescription,
  AuditIssueSourceCode,
  AuditIssueSourceDescription,
} from '@/apis/quality/audit-issue'
import { auditRectificationApi } from '@/apis/quality/audit-rectification'
import {
  AUDIT_ISSUE_STATUS_COLOR,
  AuditIssueStatusCode,
  AuditIssueStatusDescription,
} from '@/apis/quality/types'
import ImprovementWorkbenchPanel from '@/components/quality/improvement/ImprovementWorkbenchPanel.vue'
import QualityFormDraftStatusStrip from '@/components/quality/QualityFormDraftStatusStrip.vue'
import {
  AchievementResultSelector,
  CourseGoalSelector,
  CourseSelector,
  ProgramSelector,
  RequirementIndicatorSelector,
  TeacherSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { refreshWorkbenchSignalsAfterMutation, selectedId } from '@/composables/quality/improvement'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildQualityLongFormDraftKey,
  clearQualityLongFormDraft,
} from '@/composables/useQualityLongFormDraftPersist'
import { useQualityLongFormDraftSession } from '@/composables/useQualityLongFormDraftSession'
import {
  assertQualityScopeFresh,
  beginQualityScopeRequest,
  isQualityScopeStaleError,
} from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useQualityStore } from '@/stores/modules/quality'
import { useUserStore } from '@/stores/modules/user'
import { showUserError, toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

defineOptions({ name: 'AuditIssueTab' })

const props = defineProps<{
  onLoadError?: (error: Error | null) => void
  onWorkbenchRefresh?: WorkbenchSignalRefreshHandler
}>()

const qualityStore = useQualityStore()

const issueColumns: ColumnsType = [
  { title: '编码', dataIndex: 'issueCode', key: 'issueCode', width: 140, fixed: 'left' },
  { title: '标题', key: 'issueTitle' },
  { title: '来源', dataIndex: 'issueSource', key: 'issueSource', width: 120 },
  { title: '严重度', dataIndex: 'severity', key: 'severity', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '年度', dataIndex: 'auditYear', key: 'auditYear', width: 80 },
  { title: '操作', key: 'actions', width: 260 },
]

const issueStatusOptions: AuditIssueStatusCode[] = [
  AuditIssueStatusCode.OPEN,
  AuditIssueStatusCode.IN_RECTIFICATION,
  AuditIssueStatusCode.RECTIFIED,
  AuditIssueStatusCode.VERIFIED,
  AuditIssueStatusCode.CLOSED,
]

function issueStatusLabel(value: AuditIssueStatusCode): string {
  return strictEnumLabel(AuditIssueStatusDescription, value, '审核问题状态')
}

function issueStatusColor(value: AuditIssueStatusCode): BadgeTone {
  return strictEnumTone(AUDIT_ISSUE_STATUS_COLOR, value, '审核问题状态')
}

function issueSourceLabel(value: AuditIssueSourceCode): string {
  return strictEnumLabel(AuditIssueSourceDescription, value, '审核问题来源')
}

function severityLabel(value: AuditIssueSeverityCode): string {
  return strictEnumLabel(AuditIssueSeverityDescription, value, '审核问题严重度')
}

function severityColor(value: AuditIssueSeverityCode): BadgeTone {
  return strictEnumTone(AUDIT_ISSUE_SEVERITY_TONE, value, '审核问题严重度')
}

const issueList = ref<AuditIssueVO[]>([])
const issueTotal = ref(0)
const issueLoading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const issueQuery = reactive<AuditIssueQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  trainingPlanId: undefined,
  qualityCourseId: undefined,
  issueSource: undefined,
  severity: undefined,
  status: undefined,
  auditYear: undefined,
  keyword: '',
})

interface IssueFilterForm {
  issueSource?: AuditIssueSourceCode
  severity?: AuditIssueSeverityCode
  status?: AuditIssueStatusCode
  auditYear: string
  keyword: string
}

const issueFilterForm = reactive<IssueFilterForm>({
  auditYear: '',
  keyword: '',
})

const issueFilterFields: FilterField[] = [
  {
    key: 'severity',
    type: 'select',
    label: '严重度',
    placeholder: '严重度',
    allowClear: true,
    width: 120,
    options: AUDIT_ISSUE_SEVERITY_OPTIONS,
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: issueStatusOptions.map((status) => ({
      value: status,
      label: issueStatusLabel(status),
    })),
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '编码 / 标题',
    width: 180,
    triggerSearchOnChange: false,
  },
]

function syncIssueFilterToQuery() {
  issueQuery.issueSource = issueFilterForm.issueSource
  issueQuery.severity = issueFilterForm.severity
  issueQuery.status = issueFilterForm.status
  issueQuery.auditYear = issueFilterForm.auditYear || undefined
  issueQuery.keyword = issueFilterForm.keyword
}

function handleIssueFilterSearch() {
  issueQuery.pageNum = 1
  syncIssueFilterToQuery()
  loadList()
}

const issueTransitMap: Record<AuditIssueStatusCode, AuditIssueStatusCode[]> = {
  [AuditIssueStatusCode.OPEN]: [AuditIssueStatusCode.IN_RECTIFICATION],
  [AuditIssueStatusCode.IN_RECTIFICATION]: [AuditIssueStatusCode.RECTIFIED],
  [AuditIssueStatusCode.RECTIFIED]: [AuditIssueStatusCode.VERIFIED],
  [AuditIssueStatusCode.VERIFIED]: [AuditIssueStatusCode.CLOSED],
  [AuditIssueStatusCode.CLOSED]: [],
}

const issueEditorVisible = ref(false)
const issueEditorMode = ref<'create' | 'edit'>('create')
const issueEditor = reactive<AuditIssueSaveRequest>({
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  requirementIndicatorId: '',
  courseGoalId: '',
  achievementResultId: '',
  issueCode: '',
  issueTitle: '',
  issueDescription: '',
  issueSource: AuditIssueSourceCode.SELF_AUDIT,
  severity: AuditIssueSeverityCode.MINOR,
  auditRound: '',
  auditYear: '',
  raisedUserId: '',
  raisedTime: '',
})
const issueEditorSubmitting = ref(false)
const issueDraftSaving = ref(false)
const issueCreateSessionKey = ref('')
let issueDraftHydrating = false
const userStore = useUserStore()
const issueRectificationCount = ref<Map<string, number>>(new Map())

interface AuditIssueDraftSnapshot {
  id?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  requirementIndicatorId?: string
  courseGoalId?: string
  achievementResultId?: string
  issueCode: string
  issueTitle: string
  issueDescription?: string
  issueSource: AuditIssueSourceCode
  severity: AuditIssueSeverityCode
  auditRound?: string
  auditYear?: string
  raisedUserId?: string
  raisedTime?: string
}

function snapshotIssueEditor(): AuditIssueDraftSnapshot {
  return {
    id: issueEditor.id,
    programId: issueEditor.programId || undefined,
    trainingPlanId: issueEditor.trainingPlanId || undefined,
    qualityCourseId: issueEditor.qualityCourseId || undefined,
    requirementIndicatorId: issueEditor.requirementIndicatorId || undefined,
    courseGoalId: issueEditor.courseGoalId || undefined,
    achievementResultId: issueEditor.achievementResultId || undefined,
    issueCode: issueEditor.issueCode || '',
    issueTitle: issueEditor.issueTitle || '',
    issueDescription: issueEditor.issueDescription || '',
    issueSource: issueEditor.issueSource,
    severity: issueEditor.severity,
    auditRound: issueEditor.auditRound || undefined,
    auditYear: issueEditor.auditYear || undefined,
    raisedUserId: issueEditor.raisedUserId || undefined,
    raisedTime: issueEditor.raisedTime || undefined,
  }
}

function applyIssueEditorDraft(snapshot: AuditIssueDraftSnapshot): void {
  issueDraftHydrating = true
  try {
    Object.assign(issueEditor, {
      id: snapshot.id,
      programId: snapshot.programId || '',
      trainingPlanId: snapshot.trainingPlanId || '',
      qualityCourseId: snapshot.qualityCourseId || '',
      requirementIndicatorId: snapshot.requirementIndicatorId || '',
      courseGoalId: snapshot.courseGoalId || '',
      achievementResultId: snapshot.achievementResultId || '',
      issueCode: snapshot.issueCode || '',
      issueTitle: snapshot.issueTitle || '',
      issueDescription: snapshot.issueDescription || '',
      issueSource: snapshot.issueSource,
      severity: snapshot.severity,
      auditRound: snapshot.auditRound || '',
      auditYear: snapshot.auditYear || '',
      raisedUserId: snapshot.raisedUserId || '',
      raisedTime: snapshot.raisedTime || '',
    })
    if (snapshot.id) {
      issueCreateSessionKey.value = ''
    }
  } finally {
    issueDraftHydrating = false
  }
}

function canServerAutosaveIssue(snapshot: AuditIssueDraftSnapshot): boolean {
  return Boolean(
    snapshot.issueCode?.trim()
    && snapshot.issueTitle?.trim()
    && snapshot.issueSource
    && snapshot.severity,
  )
}

function buildIssueSaveRequest(snapshot: AuditIssueDraftSnapshot): AuditIssueSaveRequest {
  return {
    id: snapshot.id,
    programId: snapshot.programId || undefined,
    trainingPlanId: snapshot.trainingPlanId || undefined,
    qualityCourseId: snapshot.qualityCourseId || undefined,
    requirementIndicatorId: snapshot.requirementIndicatorId || undefined,
    courseGoalId: snapshot.courseGoalId || undefined,
    achievementResultId: snapshot.achievementResultId || undefined,
    issueCode: snapshot.issueCode.trim(),
    issueTitle: snapshot.issueTitle.trim(),
    issueDescription: snapshot.issueDescription || undefined,
    issueSource: snapshot.issueSource,
    severity: snapshot.severity,
    auditRound: snapshot.auditRound || undefined,
    auditYear: snapshot.auditYear || undefined,
    raisedUserId: snapshot.raisedUserId || undefined,
    raisedTime: snapshot.raisedTime || undefined,
  }
}

const issueDraft = useQualityLongFormDraftSession<AuditIssueDraftSnapshot>({
  kind: 'audit-issue',
  kindLabel: '审核评估问题',
  getTenantId: () => String(userStore.userInfo.tenantId || ''),
  getEntityKey: () => {
    if (issueEditor.id) return 'issue:' + issueEditor.id
    if (issueCreateSessionKey.value) return issueCreateSessionKey.value
    return null
  },
  getSnapshot: snapshotIssueEditor,
  isEditable: () => {
    if (!issueEditorVisible.value) return false
    if (issueEditorMode.value === 'create') return true
    if (!issueEditor.id) return false
    const current = issueList.value.find((item) => item.id === issueEditor.id)
    if (current) return canEditAuditIssue(current.status)
    return true
  },
  canServerAutosave: canServerAutosaveIssue,
  serverAutosave: async (snapshot) => {
    const request = buildIssueSaveRequest(snapshot)
    if (snapshot.id) {
      await auditIssueApi.update(request)
      return
    }
    const tenantId = String(userStore.userInfo.tenantId || '')
    const oldKey = issueCreateSessionKey.value
      ? buildQualityLongFormDraftKey(tenantId, 'audit-issue', issueCreateSessionKey.value)
      : null
    const createdId = await auditIssueApi.create(request)
    issueDraftHydrating = true
    try {
      issueEditor.id = String(createdId)
      issueCreateSessionKey.value = ''
    } finally {
      issueDraftHydrating = false
    }
    if (oldKey) {
      await clearQualityLongFormDraft(oldKey)
    }
  },
})

const issueDraftStatus = issueDraft.status
const issueDraftStatusVisible = issueDraft.statusVisible
const issueDraftLocalSavedAt = issueDraft.localSavedAt
const issueDraftServerSavedAt = issueDraft.serverSavedAt
const issueDraftErrorMessage = issueDraft.errorMessage

async function startIssueDraftSession(): Promise<void> {
  const baseline = snapshotIssueEditor()
  const result = await issueDraft.beginSession(baseline)
  if (result.restored && result.draft?.payloadJson) {
    applyIssueEditorDraft(JSON.parse(result.draft.payloadJson) as AuditIssueDraftSnapshot)
  }
}

async function handleIssueDraftSaveNow(): Promise<void> {
  issueDraftSaving.value = true
  try {
    const ok = await issueDraft.saveNow()
    if (ok) {
      void message.success('审核问题草稿已保存到服务端')
      await loadList({ refreshSignals: true, settleAfterMutation: true })
    } else if (issueDraft.status.value === 'local_saved') {
      void message.warning(
        issueDraft.errorMessage.value || '仅本机暂存，请补齐编码/标题/来源/严重程度后同步服务端',
      )
    }
  } finally {
    issueDraftSaving.value = false
  }
}

async function handleIssueEditorOpenChange(open: boolean): Promise<void> {
  if (open) {
    issueEditorVisible.value = true
    return
  }
  if (issueDraft.needsLeaveConfirm()) {
    const ok = await confirmAsync({
      title: '关闭审核问题编辑？',
      content: '未确认同步到服务端的内容已暂存在本机，下次打开可断点续填。关闭不会丢弃本机草稿。',
      type: 'warning',
      okText: '关闭并保留草稿',
      cancelText: '继续编辑',
    })
    if (!ok) return
    await issueDraft.endSession({ discardLocal: false })
  } else {
    await issueDraft.endSession()
  }
  issueEditorVisible.value = false
}

watch(
  () => [
    issueEditor.id,
    issueEditor.programId,
    issueEditor.trainingPlanId,
    issueEditor.qualityCourseId,
    issueEditor.requirementIndicatorId,
    issueEditor.courseGoalId,
    issueEditor.achievementResultId,
    issueEditor.issueCode,
    issueEditor.issueTitle,
    issueEditor.issueDescription,
    issueEditor.issueSource,
    issueEditor.severity,
    issueEditor.auditRound,
    issueEditor.auditYear,
    issueEditor.raisedUserId,
    issueEditor.raisedTime,
  ],
  () => {
    if (issueDraftHydrating || !issueEditorVisible.value) return
    issueDraft.notifyChanged()
  },
)

function hasLinkedRectification(issueId: string): boolean {
  return (issueRectificationCount.value.get(issueId) ?? 0) > 0
}

async function refreshIssueRectificationCounts(scope: QualityScopeRequestToken) {
  const issueIds = issueList.value.map((issue) => issue.id)
  if (issueIds.length === 0) {
    issueRectificationCount.value = new Map()
    return
  }
  const response = await auditRectificationApi.countByIssueIds(issueIds)
  assertQualityScopeFresh(scope)
  const countMap = new Map<string, number>()
  for (const item of response.items) {
    countMap.set(item.auditIssueId, item.rectificationCount)
  }
  assertQualityScopeFresh(scope)
  issueRectificationCount.value = countMap
}

async function loadList(options?: {
  refreshSignals?: boolean
  settleAfterMutation?: boolean
}): Promise<'applied' | 'failed' | 'stale'> {
  const scope = beginQualityScopeRequest()
  issueLoading.value = true
  beginLoad()
  try {
    const page = await auditIssueApi.page({
      ...issueQuery,
      programId: issueQuery.programId || qualityStore.currentProgramId || undefined,
      trainingPlanId: issueQuery.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
      keyword: issueQuery.keyword?.trim() || undefined,
    })
    assertQualityScopeFresh(scope)
    issueList.value = page.list
    issueQuery.pageNum = page.pageNum
    issueQuery.pageSize = page.pageSize
    issueTotal.value = page.total
    if (issueList.value.length === 0 && issueTotal.value > 0 && issueQuery.pageNum > 1) {
      issueQuery.pageNum -= 1
      return await loadList(options)
    }
    await refreshIssueRectificationCounts(scope)
    if (options?.refreshSignals) {
      const signalOutcome = await refreshWorkbenchSignalsAfterMutation(
        scope,
        props.onWorkbenchRefresh,
        props.onLoadError,
        '工作台指标加载失败',
      )
      if (signalOutcome !== 'applied') {
        okLoad()
        return signalOutcome
      }
    }
    okLoad()
    return 'applied'
  } catch (error) {
    if (isQualityScopeStaleError(error) || scope.isStale()) {
      return 'stale'
    }
    failLoad()
    const err = toUserError(error, '审核评估问题加载失败')
    props.onLoadError?.(err)
    showUserError(error, '审核评估问题加载失败')
    if (options?.settleAfterMutation) {
      return 'failed'
    }
    throw err
  } finally {
    issueLoading.value = false
  }
}

function handleIssuePageChange(page: { current: number, pageSize: number }) {
  issueQuery.pageNum = page.current
  issueQuery.pageSize = page.pageSize
  loadList()
}

function resetIssueQuery() {
  issueQuery.pageNum = 1
  issueQuery.programId = undefined
  issueQuery.trainingPlanId = undefined
  issueQuery.qualityCourseId = undefined
  syncIssueFilterToQuery()
  loadList()
}

async function openIssueCreate() {
  issueEditorMode.value = 'create'
  issueCreateSessionKey.value = 'create-active:' + (userStore.userInfo.userId || 'anon')
  issueDraftHydrating = true
  try {
    Object.assign(issueEditor, {
      id: undefined,
      programId: qualityStore.currentProgramId || '',
      trainingPlanId: qualityStore.currentTrainingPlanId || '',
      qualityCourseId: '',
      requirementIndicatorId: '',
      courseGoalId: '',
      achievementResultId: '',
      issueCode: '',
      issueTitle: '',
      issueDescription: '',
      issueSource: AuditIssueSourceCode.SELF_AUDIT,
      severity: AuditIssueSeverityCode.MINOR,
      auditRound: '',
      auditYear: new Date().getFullYear().toString(),
      raisedUserId: '',
      raisedTime: '',
    })
  } finally {
    issueDraftHydrating = false
  }
  issueEditorVisible.value = true
  await startIssueDraftSession()
}

async function openIssueEdit(record: AuditIssueVO) {
  if (!canEditAuditIssue(record.status)) {
    void message.error('当前状态不允许编辑审核问题')
    return
  }
  issueEditorMode.value = 'edit'
  issueCreateSessionKey.value = ''
  issueDraftHydrating = true
  try {
    Object.assign(issueEditor, {
      id: record.id,
      programId: record.programId || '',
      trainingPlanId: record.trainingPlanId || '',
      qualityCourseId: record.qualityCourseId || '',
      requirementIndicatorId: record.requirementIndicatorId || '',
      courseGoalId: record.courseGoalId || '',
      achievementResultId: record.achievementResultId || '',
      issueCode: record.issueCode,
      issueTitle: record.issueTitle,
      issueDescription: record.issueDescription || '',
      issueSource: record.issueSource,
      severity: record.severity,
      auditRound: record.auditRound || '',
      auditYear: record.auditYear || '',
      raisedUserId: record.raisedUserId || '',
      raisedTime: record.raisedTime || '',
    })
  } finally {
    issueDraftHydrating = false
  }
  issueEditorVisible.value = true
  await startIssueDraftSession()
}

async function submitIssueEditor() {
  if (issueEditorMode.value === 'edit' && issueEditor.id) {
    const current = issueList.value.find((item) => item.id === issueEditor.id)
    if (current && !canEditAuditIssue(current.status)) {
      void message.error('当前状态不允许编辑审核问题')
      return
    }
  }
  if (
    !issueEditor.issueCode.trim()
    || !issueEditor.issueTitle.trim()
    || !issueEditor.issueSource
    || !issueEditor.severity
  ) {
    void message.error('请填写编码、标题、来源、严重程度')
    return
  }
  await issueDraft.pauseForSubmit()
  issueEditorSubmitting.value = true
  try {
    const request: AuditIssueSaveRequest = {
      ...issueEditor,
      programId: issueEditor.programId || undefined,
      trainingPlanId: issueEditor.trainingPlanId || undefined,
      qualityCourseId: issueEditor.qualityCourseId || undefined,
      requirementIndicatorId: issueEditor.requirementIndicatorId || undefined,
      courseGoalId: issueEditor.courseGoalId || undefined,
      achievementResultId: issueEditor.achievementResultId || undefined,
      issueCode: issueEditor.issueCode.trim(),
      issueTitle: issueEditor.issueTitle.trim(),
      issueDescription: issueEditor.issueDescription || undefined,
      auditRound: issueEditor.auditRound || undefined,
      auditYear: issueEditor.auditYear || undefined,
      raisedUserId: issueEditor.raisedUserId || undefined,
      raisedTime: issueEditor.raisedTime || undefined,
    }
    if (issueEditorMode.value === 'create' && !issueEditor.id) {
      const createdId = await auditIssueApi.create(request)
      issueEditor.id = String(createdId)
      void message.success('已登记')
    } else {
      await auditIssueApi.update({ ...request, id: issueEditor.id || request.id })
      void message.success('已保存')
    }
    await issueDraft.markCleanAfterServerSuccess()
    await issueDraft.endSession()
    issueEditorVisible.value = false
    await loadList({ refreshSignals: true, settleAfterMutation: true })
  } finally {
    issueEditorSubmitting.value = false
  }
}

async function handleIssueDelete(record: AuditIssueVO) {
  void confirmAsync({
    title: `删除问题 ${record.issueCode}？`,
    type: 'error',
    onOk: async () => {
      await auditIssueApi.delete(record.id)
      void message.success('已删除')
      await loadList({ refreshSignals: true, settleAfterMutation: true })
    },
  })
}

function canEditAuditIssue(status: AuditIssueStatusCode): boolean {
  return status === AuditIssueStatusCode.OPEN || status === AuditIssueStatusCode.IN_RECTIFICATION
}

function nextAuditIssueStatuses(status: AuditIssueStatusCode): AuditIssueStatusCode[] {
  return strictEnumValue(issueTransitMap, status, '审核问题状态')
}

async function changeIssueStatus(record: AuditIssueVO, target: AuditIssueStatusCode) {
  await auditIssueApi.transitStatus({ id: record.id, targetStatus: target })
  void message.success(`已切换到「${issueStatusLabel(target)}」`)
  await loadList({ refreshSignals: true, settleAfterMutation: true })
}

function buildAuditIssueActions(record: AuditIssueVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [
    {
      key: 'edit',
      label: '编辑',
      disabled: !canEditAuditIssue(record.status),
    },
  ]
  // 行内仅 1 个 primary：首个可迁状态
  let primaryAssigned = false
  for (const status of nextAuditIssueStatuses(record.status)) {
    actions.push({
      key: status,
      label: issueStatusLabel(status),
      tone: primaryAssigned ? undefined : 'primary',
    })
    primaryAssigned = true
  }
  if (record.status === AuditIssueStatusCode.OPEN && !hasLinkedRectification(record.id)) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleAuditIssueAction(key: string, record: AuditIssueVO): void {
  switch (key) {
    case 'edit':
      openIssueEdit(record)
      return
    case 'delete':
      void handleIssueDelete(record)
      return
    case AuditIssueStatusCode.OPEN:
    case AuditIssueStatusCode.IN_RECTIFICATION:
    case AuditIssueStatusCode.RECTIFIED:
    case AuditIssueStatusCode.VERIFIED:
    case AuditIssueStatusCode.CLOSED:
      void changeIssueStatus(record, key)
  }
}

function handleIssueProgramChange(value: string | null | undefined) {
  issueEditor.programId = selectedId(value)
  issueEditor.qualityCourseId = ''
  issueEditor.requirementIndicatorId = ''
}

function handleIssueTrainingPlanChange(value: string | null | undefined) {
  issueEditor.trainingPlanId = selectedId(value)
}

function handleIssueCourseChange(value: string | null | undefined) {
  issueEditor.qualityCourseId = selectedId(value)
}

function handleIssueRequirementIndicatorChange(value: string | null | undefined) {
  issueEditor.requirementIndicatorId = selectedId(value)
}

function handleIssueCourseGoalChange(value: string | null | undefined) {
  issueEditor.courseGoalId = selectedId(value)
}

function handleIssueAchievementResultChange(value: string | null | undefined) {
  issueEditor.achievementResultId = selectedId(value)
}

function handleIssueRaisedByChange(value: string | string[] | null | undefined) {
  issueEditor.raisedUserId = Array.isArray(value) ? '' : selectedId(value)
}

defineExpose({
  loadList,
})
</script>

<template>
  <ImprovementWorkbenchPanel title="审核评估问题清单">
    <template #extra>
      <UiButton variant="primary" size="sm" @click="openIssueCreate">登记问题</UiButton>
    </template>

    <UiFilterBar
      variant="plain"
      v-model="issueFilterForm"
      :fields="issueFilterFields"
      show-labels
      search-text="查询"
      @search="handleIssueFilterSearch"
      @reset="resetIssueQuery"
    />

    <UiDataTable
      v-model:current="issueQuery.pageNum"
      v-model:page-size="issueQuery.pageSize"
      :columns="issueColumns"
      :data-source="issueList"
      :loading="issueLoading"
      :load-error="loadError"
      row-key="id"
      size="middle"
      :total="issueTotal"
      flat
      @page-change="handleIssuePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'issueTitle'">
          <div>{{ record.issueTitle }}</div>
          <div v-if="record.issueDescription" class="iwb-tab__sub-desc">
            {{ record.issueDescription.substring(0, 80)
            }}{{ record.issueDescription.length > 80 ? '…' : '' }}
          </div>
        </template>
        <template v-else-if="column.key === 'issueSource'">
          {{ issueSourceLabel(record.issueSource) }}
        </template>
        <template v-else-if="column.key === 'severity'">
          <UiTag :tone="severityColor(record.severity)" size="sm">
            {{ severityLabel(record.severity) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'status'">
          <UiTag :tone="issueStatusColor(record.status)" size="sm">
            {{ issueStatusLabel(record.status) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="buildAuditIssueActions(record)"
            split
            @action="(key) => handleAuditIssueAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>
  </ImprovementWorkbenchPanel>

  <UiDialog
    :open="issueEditorVisible"
    :title="issueEditorMode === 'create' ? '登记审核评估问题' : '编辑审核评估问题'"
    :confirm-loading="issueEditorSubmitting"
    width="820px"
    @update:open="handleIssueEditorOpenChange"
    @ok="submitIssueEditor"
  >
    <QualityFormDraftStatusStrip
      :status="issueDraftStatus"
      :visible="issueDraftStatusVisible"
      :local-saved-at="issueDraftLocalSavedAt"
      :server-saved-at="issueDraftServerSavedAt"
      :error-message="issueDraftErrorMessage"
      :saving="issueDraftSaving"
      @save-now="handleIssueDraftSaveNow"
    />
    <UiForm layout="vertical" :model="issueEditor">
      <UiRow :gutter="12">
        <UiCol :span="6">
          <UiFormItem label="编码" required>
            <UiInput size="sm" v-model="issueEditor.issueCode" />
          </UiFormItem>
        </UiCol>
        <UiCol :span="6">
          <UiFormItem label="问题来源" required>
            <UiSelect
              size="sm"
              v-model="issueEditor.issueSource"
              :options="AUDIT_ISSUE_SOURCE_OPTIONS"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="6">
          <UiFormItem label="严重程度" required>
            <UiSelect
              size="sm"
              v-model="issueEditor.severity"
              :options="AUDIT_ISSUE_SEVERITY_OPTIONS"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="6">
          <UiFormItem label="审核年度">
            <UiInput size="sm" v-model="issueEditor.auditYear" />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiFormItem label="标题" required>
        <UiInput size="sm" v-model="issueEditor.issueTitle" />
      </UiFormItem>
      <UiFormItem label="详细描述（支持断点续填）">
        <p class="iwb-tab__draft-hint">
          长文填写支持本机暂存与服务端自动保存草稿；刷新或误关后可续填。
        </p>
        <UiTextarea
          size="sm"
          v-model="issueEditor.issueDescription"
          :rows="6"
          placeholder="描述问题现象、证据与影响范围。输入后约 2.5 秒自动保存草稿。"
        />
      </UiFormItem>
      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiFormItem label="审核轮次">
            <UiInput size="sm" v-model="issueEditor.auditRound" />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="提出人">
            <TeacherSelector
              :value="issueEditor.raisedUserId || null"
              placeholder="选择提出人（可选）"
              @change="handleIssueRaisedByChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="提出时间">
            <UiInput size="sm" v-model="issueEditor.raisedTime" placeholder="yyyy-MM-dd HH:mm:ss" />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiDivider orientation="left">关联业务对象（可选）</UiDivider>
      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiFormItem label="所属专业">
            <ProgramSelector
              :value="issueEditor.programId || null"
              @change="handleIssueProgramChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="培养方案">
            <TrainingPlanSelector
              :value="issueEditor.trainingPlanId || null"
              :program-id="issueEditor.programId || null"
              @change="handleIssueTrainingPlanChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="质量评价课程">
            <CourseSelector
              :value="issueEditor.qualityCourseId || null"
              :program-id="issueEditor.programId || null"
              :training-plan-id="issueEditor.trainingPlanId || null"
              @change="handleIssueCourseChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiFormItem label="观测点">
            <RequirementIndicatorSelector
              :value="issueEditor.requirementIndicatorId || null"
              :training-plan-id="issueEditor.trainingPlanId || null"
              @change="handleIssueRequirementIndicatorChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="课程目标">
            <CourseGoalSelector
              :value="issueEditor.courseGoalId || null"
              :quality-course-id="issueEditor.qualityCourseId || null"
              @change="handleIssueCourseGoalChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="达成度结果">
            <AchievementResultSelector
              :value="issueEditor.achievementResultId || null"
              :program-id="issueEditor.programId || null"
              :training-plan-id="issueEditor.trainingPlanId || null"
              :quality-course-id="issueEditor.qualityCourseId || null"
              @change="handleIssueAchievementResultChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
    </UiForm>
  </UiDialog>
</template>

<style scoped lang="scss">
.iwb-tab {
  &__sub-desc {
    margin-top: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__draft-hint {
    margin: 0 0 var(--dp-space-component-tight);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
    line-height: 1.5;
  }
}
</style>
