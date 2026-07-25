<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AuditEvidenceItemRequest } from '@/apis/quality/audit-evidence'
import type { AuditIssueVO } from '@/apis/quality/audit-issue'
import type {
  AuditRectificationQueryRequest,
  AuditRectificationSaveRequest,
  AuditRectificationVO,
} from '@/apis/quality/audit-rectification'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type {
  QualitySelectorChangeValue,
  WorkbenchSignalRefreshHandler,
} from '@/composables/quality/improvement'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import QualityFormDraftStatusStrip from '@/components/quality/QualityFormDraftStatusStrip.vue'
import { auditIssueApi } from '@/apis/quality/audit-issue'
import { auditRectificationApi } from '@/apis/quality/audit-rectification'
import {
  AUDIT_RECTIFICATION_STATUS_COLOR,
  AuditRectificationStatusCode,
  AuditRectificationStatusDescription,
} from '@/apis/quality/types'
import ImprovementWorkbenchPanel from '@/components/quality/improvement/ImprovementWorkbenchPanel.vue'
import {
  ArchiveSelector,
  AuditIssueSelector,
  ReportSelector,
  TeacherSelector,
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
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import {
  assertQualityScopeFresh,
  beginQualityScopeRequest,
  isQualityScopeStaleError,
} from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useUserStore } from '@/stores/modules/user'
import {
  ALL_AUDIT_EVIDENCE_TYPE_CODES,
  AuditEvidenceTypeCode,
  AuditEvidenceTypeDescription,
} from '@/types/enums/audit-evidence-type-enum'
import { AuditRectificationVerifyDecisionCode } from '@/types/enums/audit-rectification-verify-decision-enum'
import { showFormValidationMessage, showUserError, toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AuditRectificationTab' })

const props = defineProps<{
  onLoadError?: (error: Error | null) => void
  onWorkbenchRefresh?: WorkbenchSignalRefreshHandler
}>()

const rectColumns: ColumnsType = [
  {
    title: '编码',
    dataIndex: 'rectificationCode',
    key: 'rectificationCode',
    width: 140,
    fixed: 'left',
  },
  { title: '标题', key: 'rectTitle' },
  { title: '责任人', key: 'ownerRef', width: 140 },
  { title: '截止', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 340 },
]

function rectificationStatusLabel(value: AuditRectificationStatusCode): string {
  return strictEnumLabel(AuditRectificationStatusDescription, value, '整改任务状态')
}

function rectificationStatusColor(value: AuditRectificationStatusCode) {
  return strictEnumTone(AUDIT_RECTIFICATION_STATUS_COLOR, value, '整改任务状态')
}

const rectList = ref<AuditRectificationVO[]>([])
const rectTotal = ref(0)
const rectLoading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const rectIssuesCache = ref<Map<string, AuditIssueVO>>(new Map())
const rectQuery = reactive<AuditRectificationQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  auditIssueId: undefined,
  ownerUserId: undefined,
  status: undefined,
  keyword: '',
})
const rectStatusOptions: AuditRectificationStatusCode[] = [
  AuditRectificationStatusCode.PLANNED,
  AuditRectificationStatusCode.IN_PROGRESS,
  AuditRectificationStatusCode.SUBMITTED,
  AuditRectificationStatusCode.VERIFIED,
  AuditRectificationStatusCode.RETURNED,
  AuditRectificationStatusCode.CLOSED,
]

interface RectFilterForm {
  [key: string]: unknown
  status?: AuditRectificationStatusCode
  auditIssueId?: string
  keyword: string
}

const rectFilterForm = reactive<RectFilterForm>({
  auditIssueId: undefined,
  keyword: '',
})

const rectFilterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: rectStatusOptions.map((status) => ({
      value: status,
      label: rectificationStatusLabel(status),
    })),
  },
  {
    key: 'auditIssueId',
    type: 'custom',
    label: '关联问题',
    width: 220,
    minWidth: 200,
    maxWidth: 280,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '编码/标题',
    width: 160,
    triggerSearchOnChange: false,
  },
]

function syncRectFilterToQuery() {
  rectQuery.status = rectFilterForm.status
  rectQuery.auditIssueId = rectFilterForm.auditIssueId
  rectQuery.keyword = rectFilterForm.keyword
}

function handleRectFilterSearch() {
  rectQuery.pageNum = 1
  syncRectFilterToQuery()
  loadList()
}

const rectEditorVisible = ref(false)
const rectEditorMode = ref<'create' | 'edit'>('create')
const rectEditor = reactive<AuditRectificationSaveRequest>({
  auditIssueId: '',
  rectificationCode: '',
  rectificationTitle: '',
  rectificationAction: '',
  ownerUserId: '',
  ownerRole: '',
  dueDate: '',
})
const rectEditorSubmitting = ref(false)
const rectDraftSaving = ref(false)
const rectCreateSessionKey = ref('')
let rectDraftHydrating = false
const userStore = useUserStore()
const rectEvidenceEditorVisible = ref(false)

interface AuditRectificationDraftSnapshot {
  id?: string
  auditIssueId: string
  rectificationCode: string
  rectificationTitle: string
  rectificationAction: string
  ownerUserId: string
  ownerRole?: string
  dueDate: string
}

function snapshotRectEditor(): AuditRectificationDraftSnapshot {
  return {
    id: rectEditor.id,
    auditIssueId: rectEditor.auditIssueId || '',
    rectificationCode: rectEditor.rectificationCode || '',
    rectificationTitle: rectEditor.rectificationTitle || '',
    rectificationAction: rectEditor.rectificationAction || '',
    ownerUserId: rectEditor.ownerUserId || '',
    ownerRole: rectEditor.ownerRole || undefined,
    dueDate: rectEditor.dueDate || '',
  }
}

function applyRectEditorDraft(snapshot: AuditRectificationDraftSnapshot): void {
  rectDraftHydrating = true
  try {
    Object.assign(rectEditor, {
      id: snapshot.id,
      auditIssueId: snapshot.auditIssueId || '',
      rectificationCode: snapshot.rectificationCode || '',
      rectificationTitle: snapshot.rectificationTitle || '',
      rectificationAction: snapshot.rectificationAction || '',
      ownerUserId: snapshot.ownerUserId || '',
      ownerRole: snapshot.ownerRole || '',
      dueDate: snapshot.dueDate || '',
    })
    if (snapshot.id) {
      rectCreateSessionKey.value = ''
    }
  } finally {
    rectDraftHydrating = false
  }
}

function canServerAutosaveRect(snapshot: AuditRectificationDraftSnapshot): boolean {
  return Boolean(
    snapshot.auditIssueId
    && snapshot.rectificationCode?.trim()
    && snapshot.rectificationTitle?.trim()
    && snapshot.rectificationAction?.trim()
    && snapshot.ownerUserId
    && snapshot.dueDate,
  )
}

function buildRectSaveRequest(snapshot: AuditRectificationDraftSnapshot): AuditRectificationSaveRequest {
  return {
    id: snapshot.id,
    auditIssueId: snapshot.auditIssueId,
    rectificationCode: snapshot.rectificationCode.trim(),
    rectificationTitle: snapshot.rectificationTitle.trim(),
    rectificationAction: snapshot.rectificationAction.trim(),
    ownerUserId: snapshot.ownerUserId,
    ownerRole: snapshot.ownerRole || undefined,
    dueDate: snapshot.dueDate,
  }
}

const rectDraft = useQualityLongFormDraftSession<AuditRectificationDraftSnapshot>({
  kind: 'audit-rectification',
  kindLabel: '审核整改措施',
  getTenantId: () => String(userStore.userInfo.tenantId || ''),
  getEntityKey: () => {
    if (rectEditor.id) return 'rect:' + rectEditor.id
    if (rectCreateSessionKey.value) return rectCreateSessionKey.value
    return null
  },
  getSnapshot: snapshotRectEditor,
  isEditable: () => {
    if (!rectEditorVisible.value) return false
    if (rectEditorMode.value === 'create') return true
    if (!rectEditor.id) return false
    const current = rectList.value.find((item) => item.id === rectEditor.id)
    if (current) return canEditAuditRectification(current.status)
    return true
  },
  canServerAutosave: canServerAutosaveRect,
  serverAutosave: async (snapshot) => {
    const request = buildRectSaveRequest(snapshot)
    if (snapshot.id) {
      await auditRectificationApi.update(request)
      return
    }
    const tenantId = String(userStore.userInfo.tenantId || '')
    const oldKey = rectCreateSessionKey.value
      ? buildQualityLongFormDraftKey(tenantId, 'audit-rectification', rectCreateSessionKey.value)
      : null
    const createdId = await auditRectificationApi.create(request)
    rectDraftHydrating = true
    try {
      rectEditor.id = String(createdId)
      rectCreateSessionKey.value = ''
    } finally {
      rectDraftHydrating = false
    }
    if (oldKey) {
      await clearQualityLongFormDraft(oldKey)
    }
  },
})

const rectDraftStatus = rectDraft.status
const rectDraftStatusVisible = rectDraft.statusVisible
const rectDraftLocalSavedAt = rectDraft.localSavedAt
const rectDraftServerSavedAt = rectDraft.serverSavedAt
const rectDraftErrorMessage = rectDraft.errorMessage

async function startRectDraftSession(): Promise<void> {
  const baseline = snapshotRectEditor()
  const result = await rectDraft.beginSession(baseline)
  if (result.restored && result.draft?.payloadJson) {
    applyRectEditorDraft(JSON.parse(result.draft.payloadJson) as AuditRectificationDraftSnapshot)
  }
}

async function handleRectDraftSaveNow(): Promise<void> {
  rectDraftSaving.value = true
  try {
    const ok = await rectDraft.saveNow()
    if (ok) {
      void message.success('整改措施草稿已保存到服务端')
      await loadList({ refreshSignals: true, settleAfterMutation: true })
    } else if (rectDraft.status.value === 'local_saved') {
      void message.warning(
        rectDraft.errorMessage.value
        || '仅本机暂存，请补齐关联问题/编码/标题/措施/责任人/截止日期后同步服务端',
      )
    }
  } finally {
    rectDraftSaving.value = false
  }
}

async function handleRectEditorOpenChange(open: boolean): Promise<void> {
  if (open) {
    rectEditorVisible.value = true
    return
  }
  if (rectDraft.needsLeaveConfirm()) {
    const ok = await confirmAsync({
      title: '关闭整改任务编辑？',
      content: '未确认同步到服务端的内容已暂存在本机，下次打开可断点续填。关闭不会丢弃本机草稿。',
      type: 'warning',
      okText: '关闭并保留草稿',
      cancelText: '继续编辑',
    })
    if (!ok) return
    await rectDraft.endSession({ discardLocal: false })
  } else {
    await rectDraft.endSession()
  }
  rectEditorVisible.value = false
}

watch(
  () => [
    rectEditor.id,
    rectEditor.auditIssueId,
    rectEditor.rectificationCode,
    rectEditor.rectificationTitle,
    rectEditor.rectificationAction,
    rectEditor.ownerUserId,
    rectEditor.ownerRole,
    rectEditor.dueDate,
  ],
  () => {
    if (rectDraftHydrating || !rectEditorVisible.value) return
    rectDraft.notifyChanged()
  },
)
const rectEvidenceEditorSubmitting = ref(false)
const rectEvidenceEditorRecord = ref<AuditRectificationVO | null>(null)
const rectEvidenceEditor = reactive<{
  progressRemark: string
  evidenceItems: AuditEvidenceItemRequest[]
}>({
  progressRemark: '',
  evidenceItems: [],
})

const auditEvidenceTypeOptions = ALL_AUDIT_EVIDENCE_TYPE_CODES.map((value) => ({
  value,
  label: AuditEvidenceTypeDescription[value],
}))

async function loadList(options?: {
  refreshSignals?: boolean
  settleAfterMutation?: boolean
}): Promise<'applied' | 'failed' | 'stale'> {
  const scope = beginQualityScopeRequest()
  rectLoading.value = true
  beginLoad()
  try {
    const page = await auditRectificationApi.page({
      ...rectQuery,
      keyword: rectQuery.keyword?.trim() || undefined,
    })
    assertQualityScopeFresh(scope)
    rectList.value = page.list
    rectQuery.pageNum = page.pageNum
    rectQuery.pageSize = page.pageSize
    rectTotal.value = page.total
    if (rectList.value.length === 0 && rectTotal.value > 0 && rectQuery.pageNum > 1) {
      rectQuery.pageNum -= 1
      return await loadList(options)
    }
    const issueIds = Array.from(new Set(rectList.value.map((r) => r.auditIssueId).filter(Boolean)))
    for (const id of issueIds) {
      if (rectIssuesCache.value.has(id)) continue
      const issue = await auditIssueApi.detail(id)
      assertQualityScopeFresh(scope)
      rectIssuesCache.value.set(id, issue)
    }
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
    const err = toUserError(error, '整改任务加载失败')
    props.onLoadError?.(err)
    showUserError(error, '整改任务加载失败')
    if (options?.settleAfterMutation) {
      return 'failed'
    }
    throw err
  } finally {
    rectLoading.value = false
  }
}

function rectIssueCode(value: string | null | undefined): string {
  if (value == null || value === '') return '-'
  const issue = rectIssuesCache.value.get(value)
  return issue?.issueCode?.trim() || '—'
}

function handleRectPageChange(page: { current: number, pageSize: number }) {
  rectQuery.pageNum = page.current
  rectQuery.pageSize = page.pageSize
  loadList()
}

function resetRectQuery() {
  rectQuery.pageNum = 1
  rectQuery.ownerUserId = undefined
  syncRectFilterToQuery()
  loadList()
}

async function openRectCreate() {
  rectEditorMode.value = 'create'
  rectCreateSessionKey.value = 'create-active:' + (userStore.userInfo.userId || 'anon')
  rectDraftHydrating = true
  try {
    Object.assign(rectEditor, {
      id: undefined,
      auditIssueId: '',
      rectificationCode: '',
      rectificationTitle: '',
      rectificationAction: '',
      ownerUserId: '',
      ownerRole: '',
      dueDate: '',
    })
  } finally {
    rectDraftHydrating = false
  }
  rectEditorVisible.value = true
  await startRectDraftSession()
}

async function openRectEdit(record: AuditRectificationVO) {
  if (!canEditAuditRectification(record.status)) {
    void message.error('当前状态不允许编辑整改任务')
    return
  }
  rectEditorMode.value = 'edit'
  rectCreateSessionKey.value = ''
  rectDraftHydrating = true
  try {
    Object.assign(rectEditor, {
      id: record.id,
      auditIssueId: record.auditIssueId,
      rectificationCode: record.rectificationCode,
      rectificationTitle: record.rectificationTitle,
      rectificationAction: record.rectificationAction,
      ownerUserId: record.ownerUserId,
      ownerRole: record.ownerRole || '',
      dueDate: record.dueDate,
    })
  } finally {
    rectDraftHydrating = false
  }
  rectEditorVisible.value = true
  await startRectDraftSession()
}

async function submitRectEditor() {
  if (rectEditorMode.value === 'edit' && rectEditor.id) {
    const current = rectList.value.find((item) => item.id === rectEditor.id)
    if (current && !canEditAuditRectification(current.status)) {
      void message.error('当前状态不允许编辑整改任务')
      return
    }
  }
  if (
    !rectEditor.auditIssueId
    || !rectEditor.rectificationCode.trim()
    || !rectEditor.rectificationTitle.trim()
    || !rectEditor.rectificationAction.trim()
    || !rectEditor.ownerUserId
    || !rectEditor.dueDate
  ) {
    void message.error('请填写关联问题、编码、标题、整改措施、责任人、截止日期')
    return
  }
  rectEditorSubmitting.value = true
  try {
    const request: AuditRectificationSaveRequest = {
      ...rectEditor,
      rectificationCode: rectEditor.rectificationCode.trim(),
      rectificationTitle: rectEditor.rectificationTitle.trim(),
      ownerRole: rectEditor.ownerRole || undefined,
    }
    if (rectEditorMode.value === 'create' && !rectEditor.id) {
      const createdId = await auditRectificationApi.create(request)
      rectEditor.id = String(createdId)
      void message.success('已创建')
    } else {
      await auditRectificationApi.update({ ...request, id: rectEditor.id || request.id })
      void message.success('已保存')
    }
    await rectDraft.markCleanAfterServerSuccess()
    await rectDraft.endSession()
    rectEditorVisible.value = false
    await loadList({ refreshSignals: true, settleAfterMutation: true })
  } finally {
    rectEditorSubmitting.value = false
  }
}

async function handleRectDelete(record: AuditRectificationVO) {
  void confirmAsync({
    title: `删除整改任务 ${record.rectificationCode}？`,
    type: 'error',
    onOk: async () => {
      await auditRectificationApi.delete(record.id)
      void message.success('已删除')
      await loadList({ refreshSignals: true, settleAfterMutation: true })
    },
  })
}

function canEditAuditRectification(status: AuditRectificationStatusCode): boolean {
  return (
    status === AuditRectificationStatusCode.PLANNED
    || status === AuditRectificationStatusCode.IN_PROGRESS
    || status === AuditRectificationStatusCode.RETURNED
  )
}

function addRectEvidenceItem() {
  rectEvidenceEditor.evidenceItems.push({
    evidenceType: AuditEvidenceTypeCode.REVIEW_RECORD,
    evidenceTitle: '',
    evidenceCode: '',
    archiveId: '',
    fileNodeId: '',
    reportId: '',
    remark: '',
  })
}

function removeRectEvidenceItem(index: number) {
  rectEvidenceEditor.evidenceItems.splice(index, 1)
}

async function submitRectEvidenceEditor() {
  const record = rectEvidenceEditorRecord.value
  if (!record) return
  if (!rectEvidenceEditor.progressRemark.trim()) {
    void message.error('请填写提交说明')
    return
  }
  if (!rectEvidenceEditor.evidenceItems.length) {
    void message.error('请至少新增一条整改证据')
    return
  }
  for (const [index, item] of rectEvidenceEditor.evidenceItems.entries()) {
    if (!item.evidenceTitle?.trim()) {
      void message.error(`第 ${index + 1} 条证据缺少标题`)
      return
    }
  }
  rectEvidenceEditorSubmitting.value = true
  try {
    await auditRectificationApi.updateProgress({
      id: record.id,
      targetStatus: AuditRectificationStatusCode.SUBMITTED,
      progressRemark: rectEvidenceEditor.progressRemark.trim(),
      evidenceItems: rectEvidenceEditor.evidenceItems.map((item) => ({
        evidenceType: item.evidenceType || undefined,
        evidenceTitle: item.evidenceTitle?.trim(),
        evidenceCode: item.evidenceCode?.trim() || undefined,
        archiveId: item.archiveId || undefined,
        fileNodeId: item.fileNodeId || undefined,
        reportId: item.reportId || undefined,
        remark: item.remark?.trim() || undefined,
      })),
    })
    void message.success('已提交复核')
    rectEvidenceEditorVisible.value = false
    rectEvidenceEditorRecord.value = null
    await loadList({ refreshSignals: true, settleAfterMutation: true })
  } finally {
    rectEvidenceEditorSubmitting.value = false
  }
}

async function advanceRectProgress(
  record: AuditRectificationVO,
  target: AuditRectificationStatusCode.IN_PROGRESS | AuditRectificationStatusCode.SUBMITTED,
) {
  if (target === AuditRectificationStatusCode.SUBMITTED) {
    rectEvidenceEditorRecord.value = record
    rectEvidenceEditor.progressRemark = ''
    rectEvidenceEditor.evidenceItems.splice(0, rectEvidenceEditor.evidenceItems.length, {
      evidenceType: AuditEvidenceTypeCode.REVIEW_RECORD,
      evidenceTitle: '',
      evidenceCode: '',
      archiveId: '',
      fileNodeId: '',
      reportId: '',
      remark: '',
    })
    rectEvidenceEditorVisible.value = true
    return
  }
  const remark = await promptInputAsync({
    title: '开始实施',
    placeholder: '请填写进展说明',
    required: false,
  })
  if (remark === null) return
  await auditRectificationApi.updateProgress({
    id: record.id,
    targetStatus: target,
    progressRemark: remark ?? undefined,
  })
  void message.success('已更新')
  await loadList({ refreshSignals: true, settleAfterMutation: true })
}

async function verifyRect(
  record: AuditRectificationVO,
  decision: AuditRectificationVerifyDecisionCode,
) {
  const remark = await promptInputAsync({
    title: decision === AuditRectificationVerifyDecisionCode.APPROVED ? '复核通过' : '复核退回',
    placeholder: '请填写复核说明',
    required: decision === AuditRectificationVerifyDecisionCode.REJECTED,
    emptyErrorMessage: '退回必须填写原因',
    okType: decision === AuditRectificationVerifyDecisionCode.REJECTED ? 'danger' : 'primary',
  })
  if (decision === AuditRectificationVerifyDecisionCode.REJECTED && !remark) return
  await auditRectificationApi.verify({
    id: record.id,
    decision,
    remark: remark ?? undefined,
  })
  void message.success('已复核')
  await loadList({ refreshSignals: true, settleAfterMutation: true })
}

async function closeRect(record: AuditRectificationVO) {
  void confirmAsync({
    title: `闭环整改任务 ${record.rectificationCode}？`,
    content: '闭环后该任务不可再修改',
    type: 'warning',
    onOk: async () => {
      await auditRectificationApi.close(record.id)
      void message.success('已闭环')
      await loadList({ refreshSignals: true, settleAfterMutation: true })
    },
  })
}

function buildAuditRectificationActions(record: AuditRectificationVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [
    {
      key: 'edit',
      label: '编辑',
      disabled: !canEditAuditRectification(record.status),
    },
  ]
  if (record.status === AuditRectificationStatusCode.PLANNED) {
    actions.push({ key: 'start', label: '开始', tone: 'primary' })
  }
  if (record.status === AuditRectificationStatusCode.IN_PROGRESS) {
    actions.push({ key: 'submit-review', label: '提交复核', tone: 'primary' })
  }
  if (record.status === AuditRectificationStatusCode.RETURNED) {
    actions.push({ key: 'restart', label: '重新整改', tone: 'primary' })
  }
  if (record.status === AuditRectificationStatusCode.SUBMITTED) {
    actions.push({ key: 'approve', label: '通过', tone: 'primary' })
    actions.push({ key: 'reject', label: '退回', tone: 'danger' })
  }
  if (record.status === AuditRectificationStatusCode.VERIFIED) {
    actions.push({ key: 'close', label: '闭环', tone: 'primary' })
  }
  if (record.status === AuditRectificationStatusCode.PLANNED) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleAuditRectificationAction(key: string, record: AuditRectificationVO): void {
  switch (key) {
    case 'edit':
      openRectEdit(record)
      break
    case 'start':
      void advanceRectProgress(record, AuditRectificationStatusCode.IN_PROGRESS)
      break
    case 'submit-review':
      void advanceRectProgress(record, AuditRectificationStatusCode.SUBMITTED)
      break
    case 'restart':
      void advanceRectProgress(record, AuditRectificationStatusCode.IN_PROGRESS)
      break
    case 'approve':
      void verifyRect(record, AuditRectificationVerifyDecisionCode.APPROVED)
      break
    case 'reject':
      void verifyRect(record, AuditRectificationVerifyDecisionCode.REJECTED)
      break
    case 'close':
      void closeRect(record)
      break
    case 'delete':
      void handleRectDelete(record)
      break
  }
}

function handleRectQueryAuditIssueChange(value: string | null | undefined) {
  rectFilterForm.auditIssueId = value ?? undefined
}

function handleRectEditorAuditIssueChange(value: string | null | undefined) {
  rectEditor.auditIssueId = selectedId(value)
}

function handleRectEditorOwnerChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    showFormValidationMessage('整改责任人只能单选，请重新选择')
    return
  }
  rectEditor.ownerUserId = value ?? ''
}

function createRectEvidenceArchiveChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleRectEvidenceArchiveChange(index, value)
}

function createRectEvidenceReportChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleRectEvidenceReportChange(index, value)
}

function handleRectEvidenceArchiveChange(index: number, value: QualitySelectorChangeValue) {
  rectEvidenceEditor.evidenceItems[index].archiveId = Array.isArray(value) ? '' : selectedId(value)
}

function handleRectEvidenceReportChange(index: number, value: QualitySelectorChangeValue) {
  rectEvidenceEditor.evidenceItems[index].reportId = Array.isArray(value) ? '' : selectedId(value)
}

defineExpose({
  loadList,
})
</script>

<template>
  <ImprovementWorkbenchPanel title="整改任务台账">
    <template #extra>
      <UiButton variant="primary" size="sm" @click="openRectCreate">新建整改任务</UiButton>
    </template>

    <UiFilterBar
      variant="plain"
      v-model="rectFilterForm"
      :fields="rectFilterFields"
      show-labels
      search-text="查询"
      @search="handleRectFilterSearch"
      @reset="resetRectQuery"
    >
      <template #field-auditIssueId>
        <AuditIssueSelector
          :value="rectFilterForm.auditIssueId || null"
          placeholder="关联问题"
          :width="220"
          @change="handleRectQueryAuditIssueChange"
        />
      </template>
    </UiFilterBar>

    <UiDataTable
      v-model:current="rectQuery.pageNum"
      v-model:page-size="rectQuery.pageSize"
      :columns="rectColumns"
      :data-source="rectList"
      :loading="rectLoading"
      :load-error="loadError"
      row-key="id"
      size="middle"
      :total="rectTotal"
      flat
      @page-change="handleRectPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'rectTitle'">
          <div>{{ record.rectificationTitle }}</div>
          <div v-if="record.auditIssueId" class="iwb-tab__sub-desc">
            关联问题：{{ rectIssueCode(record.auditIssueId) }}
          </div>
        </template>
        <template v-else-if="column.key === 'ownerRef'">
          {{ record.ownerUserName }}
        </template>
        <template v-else-if="column.key === 'status'">
          <UiTag :tone="rectificationStatusColor(record.status)" size="sm">
            {{ rectificationStatusLabel(record.status) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="buildAuditRectificationActions(record)"
            split
            @action="(key) => handleAuditRectificationAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>
  </ImprovementWorkbenchPanel>

  <UiDialog
    :open="rectEditorVisible"
    :title="rectEditorMode === 'create' ? '新建整改任务' : '编辑整改任务'"
    :confirm-loading="rectEditorSubmitting"
    width="760px"
    @update:open="handleRectEditorOpenChange"
    @ok="submitRectEditor"
  >
    <QualityFormDraftStatusStrip
      :status="rectDraftStatus"
      :visible="rectDraftStatusVisible"
      :local-saved-at="rectDraftLocalSavedAt"
      :server-saved-at="rectDraftServerSavedAt"
      :error-message="rectDraftErrorMessage"
      :saving="rectDraftSaving"
      @save-now="handleRectDraftSaveNow"
    />
    <UiForm layout="vertical" :model="rectEditor">
      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiFormItem label="编码" required>
            <UiInput size="sm" v-model="rectEditor.rectificationCode" />
          </UiFormItem>
        </UiCol>
        <UiCol :span="16">
          <UiFormItem label="关联问题" required>
            <AuditIssueSelector
              :value="rectEditor.auditIssueId || null"
              placeholder="选择审核评估问题"
              @change="handleRectEditorAuditIssueChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiFormItem label="标题" required>
        <UiInput size="sm" v-model="rectEditor.rectificationTitle" />
      </UiFormItem>
      <UiFormItem label="整改措施（支持断点续填）" required>
        <p class="iwb-tab__draft-hint">
          长文填写支持本机暂存与服务端自动保存草稿；刷新或误关后可续填。
        </p>
        <UiTextarea
          size="sm"
          v-model="rectEditor.rectificationAction"
          :rows="6"
          placeholder="写清整改动作、责任边界、完成标准与证据计划。输入后约 2.5 秒自动保存草稿。"
        />
      </UiFormItem>
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="责任人" required>
            <TeacherSelector
              :value="rectEditor.ownerUserId || null"
              @change="handleRectEditorOwnerChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="6">
          <UiFormItem label="角色">
            <UiInput size="sm" v-model="rectEditor.ownerRole" placeholder="如 专业负责人" />
          </UiFormItem>
        </UiCol>
        <UiCol :span="6">
          <UiFormItem label="截止日期" required>
            <UiInput size="sm" v-model="rectEditor.dueDate" placeholder="yyyy-MM-dd" />
          </UiFormItem>
        </UiCol>
      </UiRow>
    </UiForm>
  </UiDialog>

  <UiDialog
    v-model:open="rectEvidenceEditorVisible"
    title="提交整改复核"
    :confirm-loading="rectEvidenceEditorSubmitting"
    width="960px"
    @ok="submitRectEvidenceEditor"
  >
    <UiForm layout="vertical" :model="rectEvidenceEditor">
      <UiFormItem label="提交说明" required>
        <UiTextarea size="sm" v-model="rectEvidenceEditor.progressRemark" :rows="3" />
      </UiFormItem>
      <UiDivider orientation="left">整改证据明细</UiDivider>
      <div class="iwb-tab__detail-toolbar">
        <UiButton size="sm" variant="primary" @click="addRectEvidenceItem">新增证据</UiButton>
      </div>
      <div
        v-for="(item, index) in rectEvidenceEditor.evidenceItems"
        :key="index"
        class="iwb-tab__detail-row"
      >
        <div class="iwb-tab__detail-row-head">
          <span class="iwb-tab__detail-row-title">证据 {{ index + 1 }}</span>
          <UiButton size="sm" status="danger" variant="ghost" @click="removeRectEvidenceItem(index)">
            删除
          </UiButton>
        </div>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="类型">
              <UiSelect size="sm" v-model="item.evidenceType" :options="auditEvidenceTypeOptions" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="10">
            <UiFormItem label="标题" required>
              <UiInput size="sm" v-model="item.evidenceTitle" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="编号">
              <UiInput size="sm" v-model="item.evidenceCode" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="关联归档">
              <ArchiveSelector
                :value="item.archiveId || null"
                @change="createRectEvidenceArchiveChangeHandler(index)"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="关联报告">
              <ReportSelector
                :value="item.reportId || null"
                @change="createRectEvidenceReportChangeHandler(index)"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="文件节点 ID">
              <UiInput size="sm" v-model="item.fileNodeId" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="item.remark" :rows="2" />
        </UiFormItem>
      </div>
    </UiForm>
  </UiDialog>
</template>

<style scoped lang="scss">
.iwb-tab {
  &__draft-hint {
    margin: 0 0 var(--dp-space-component-tight);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
    line-height: 1.5;
  }

  &__sub-desc {
    margin-top: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__detail-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--dp-space-component);
  }

  &__detail-row {
    padding: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
    background: var(--dp-surface-subtle);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
  }

  &__detail-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
  }

  &__detail-row-title {
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }
}
</style>
