<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 持续改进与审核闭环工作台（4-in-1）
 *
 * 合并原 4 个独立路由：
 *   - 持续改进任务  improvement-task
 *   - 审核评估问题  audit-issue
 *   - 整改任务台账  audit-rectification
 *   - 督导复查记录  audit-supervision
 *
 * 设计文档 §7.10：将四个 CRUD 表整合为「来源 → 任务 → 复评」闭环看板。
 *
 * 后端契约（保持不变，按租户隔离）：
 *   - /api/quality/improvement-tasks               改进任务 CRUD + 状态流转 + 闭环
 *   - /api/quality/audit-evaluation/issues         审核评估问题 CRUD + 状态流转
 *   - /api/quality/audit-evaluation/rectifications 整改任务 CRUD + 推进 + 复核 + 闭环
 *   - /api/quality/audit-evaluation/supervisions   督导复查 CRUD
 *
 * 关键约束：
 *   - 所有外键 ID 字段必须通过 selector 选择，禁止文本框输入
 *   - 改进任务严格状态机：OPEN→IN_PROGRESS→SUBMITTED→(CLOSED|RETURNED)；RETURNED→IN_PROGRESS
 *   - 整改任务严格状态机：PLANNED→IN_PROGRESS→SUBMITTED→(VERIFIED|RETURNED)；VERIFIED→CLOSED；RETURNED→IN_PROGRESS
 */
import type {
  AuditIssueQueryPayload,
  AuditIssueSavePayload,
  AuditIssueStatus,
  AuditIssueVO,
  AuditRectificationQueryPayload,
  AuditRectificationSavePayload,
  AuditRectificationStatus,
  AuditRectificationVO,
  AuditSupervisionQueryPayload,
  AuditSupervisionSavePayload,
  AuditSupervisionType,
  AuditSupervisionVO,
  ImprovementTaskQueryPayload,
  ImprovementTaskSavePayload,
  ImprovementTaskStatus,
  ImprovementTaskVO,
} from '@/apis/quality'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  aiTaskApi,
  AUDIT_ISSUE_STATUS_COLOR,
  AUDIT_ISSUE_STATUS_LABEL,
  AUDIT_RECTIFICATION_STATUS_COLOR,
  AUDIT_RECTIFICATION_STATUS_LABEL,
  AUDIT_SUPERVISION_TYPE_LABEL,
  auditIssueApi,
  auditRectificationApi,
  auditSupervisionApi,
  IMPROVEMENT_TASK_STATUS_COLOR,
  IMPROVEMENT_TASK_STATUS_LABEL,
  improvementTaskApi,
  isAuditIssueStatus,
  isAuditRectificationStatus,
  isAuditSupervisionType,
  isImprovementTaskStatus,
} from '@/apis/quality'
import {
  AchievementResultSelector,
  ArchiveSelector,
  AuditIssueSelector,
  AuditRectificationSelector,
  CourseGoalSelector,
  CourseSelector,
  ProgramSelector,
  ReportSelector,
  RequirementIndicatorSelector,
  TeacherSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useAiTaskStore } from '@/stores/modules/aiTask'
import { useQualityStore } from '@/stores/modules/quality'
import { promptModal } from './_helpers'

const improvementColumns: ColumnsType = [
  { title: '编号', dataIndex: 'taskCode', key: 'taskCode', width: 160 },
  { title: '标题', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '课程 ID', dataIndex: 'qualityCourseId', key: 'qualityCourseId', width: 120 },
  { title: '负责人', dataIndex: 'ownerUserId', key: 'ownerUserId', width: 120 },
  { title: '角色', dataIndex: 'ownerRole', key: 'ownerRole', width: 100 },
  { title: '截止', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 380, fixed: 'right' },
]

const issueColumns: ColumnsType = [
  { title: '编码', dataIndex: 'issueCode', key: 'issueCode', width: 140 },
  { title: '标题', key: 'issueTitle' },
  { title: '来源', dataIndex: 'issueSource', key: 'issueSource', width: 120 },
  { title: '严重度', dataIndex: 'severity', key: 'severity', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '年度', dataIndex: 'auditYear', key: 'auditYear', width: 80 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

const rectColumns: ColumnsType = [
  { title: '编码', dataIndex: 'rectificationCode', key: 'rectificationCode', width: 140 },
  { title: '标题', key: 'rectTitle' },
  { title: '责任人', dataIndex: 'ownerUserId', key: 'ownerUserId', width: 140 },
  { title: '截止', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 340, fixed: 'right' },
]

const supColumns: ColumnsType = [
  { title: '编码', dataIndex: 'supervisionCode', key: 'supervisionCode', width: 140 },
  { title: '标题', key: 'supTitle' },
  { title: '类型', dataIndex: 'supervisionType', key: 'supervisionType', width: 110 },
  { title: '范围', dataIndex: 'supervisionScope', key: 'supervisionScope', width: 100 },
  { title: '督导时间', dataIndex: 'supervisedAt', key: 'supervisedAt', width: 160 },
  { title: '结论', dataIndex: 'conclusion', key: 'conclusion', width: 110 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const qualityStore = useQualityStore()
const aiTaskStore = useAiTaskStore()

const activeTab = ref<'improvement' | 'issue' | 'rectification' | 'supervision'>('improvement')

function improvementStatusLabel(value: unknown): string {
  if (isImprovementTaskStatus(value)) return IMPROVEMENT_TASK_STATUS_LABEL[value]
  if (value === null || value === undefined || value === '') return '-'
  throw new Error('改进任务状态不符合前后端契约')
}

function improvementStatusColor(value: unknown): string {
  if (isImprovementTaskStatus(value)) return IMPROVEMENT_TASK_STATUS_COLOR[value]
  if (value === null || value === undefined || value === '') return 'default'
  throw new Error('改进任务状态不符合前后端契约')
}

function issueStatusLabel(value: unknown): string {
  if (isAuditIssueStatus(value)) return AUDIT_ISSUE_STATUS_LABEL[value]
  if (value === null || value === undefined || value === '') return '-'
  throw new Error('审核评估问题状态不符合前后端契约')
}

function issueStatusColor(value: unknown): string {
  if (isAuditIssueStatus(value)) return AUDIT_ISSUE_STATUS_COLOR[value]
  if (value === null || value === undefined || value === '') return 'default'
  throw new Error('审核评估问题状态不符合前后端契约')
}

function rectificationStatusLabel(value: unknown): string {
  if (isAuditRectificationStatus(value)) return AUDIT_RECTIFICATION_STATUS_LABEL[value]
  if (value === null || value === undefined || value === '') return '-'
  throw new Error('审核整改状态不符合前后端契约')
}

function rectificationStatusColor(value: unknown): string {
  if (isAuditRectificationStatus(value)) return AUDIT_RECTIFICATION_STATUS_COLOR[value]
  if (value === null || value === undefined || value === '') return 'default'
  throw new Error('审核整改状态不符合前后端契约')
}

function supervisionTypeLabel(value: unknown): string {
  if (isAuditSupervisionType(value)) return AUDIT_SUPERVISION_TYPE_LABEL[value]
  if (value === null || value === undefined || value === '') return '-'
  throw new Error('督导类型不符合前后端契约')
}

function selectedId(value: string | null | undefined): string {
  return value ?? ''
}

function handleImprovementOwnerChange(value: string | null | undefined) {
  improvementEditor.ownerUserId = selectedId(value)
}

function handleImprovementProgramChange(value: string | null | undefined) {
  improvementEditor.programId = selectedId(value)
  improvementEditor.qualityCourseId = ''
  improvementEditor.achievementResultId = ''
}

function handleImprovementCourseChange(value: string | null | undefined) {
  improvementEditor.qualityCourseId = selectedId(value)
}

function handleImprovementAchievementResultChange(value: string | null | undefined) {
  improvementEditor.achievementResultId = selectedId(value)
}

function handleImprovementReportChange(value: string | null | undefined) {
  improvementEditor.reportId = selectedId(value)
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

function handleRectQueryAuditIssueChange(value: string | null | undefined) {
  rectQuery.auditIssueId = value ?? undefined
  loadRectList()
}

function handleRectEditorAuditIssueChange(value: string | null | undefined) {
  rectEditor.auditIssueId = selectedId(value)
}

function handleRectEditorOwnerChange(value: string | null | undefined) {
  rectEditor.ownerUserId = selectedId(value)
}

function handleSupSupervisorChange(value: string | null | undefined) {
  supEditor.supervisorUserId = selectedId(value)
}

function handleSupArchiveChange(value: string | null | undefined) {
  supEditor.archiveId = selectedId(value)
}

function handleSupAuditIssueChange(value: string | null | undefined) {
  supEditor.auditIssueId = selectedId(value)
}

function handleSupRectificationChange(value: string | null | undefined) {
  supEditor.rectificationId = selectedId(value)
}

function handleSupProgramChange(value: string | null | undefined) {
  supEditor.programId = selectedId(value)
  supEditor.qualityCourseId = ''
}

function handleSupTrainingPlanChange(value: string | null | undefined) {
  supEditor.trainingPlanId = selectedId(value)
}

function handleSupCourseChange(value: string | null | undefined) {
  supEditor.qualityCourseId = selectedId(value)
}

/* ========== Tab 1: 改进任务 ========== */

const improvementList = ref<ImprovementTaskVO[]>([])
const improvementTotal = ref(0)
const improvementLoading = ref(false)
const improvementQuery = reactive<ImprovementTaskQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  qualityCourseId: '',
  ownerUserId: '',
  status: undefined,
  keyword: '',
})

const improvementStatusOptions: Array<{ value: ImprovementTaskStatus, label: string }> = [
  { value: 'OPEN', label: IMPROVEMENT_TASK_STATUS_LABEL.OPEN },
  { value: 'IN_PROGRESS', label: IMPROVEMENT_TASK_STATUS_LABEL.IN_PROGRESS },
  { value: 'SUBMITTED', label: IMPROVEMENT_TASK_STATUS_LABEL.SUBMITTED },
  { value: 'REVIEWED', label: IMPROVEMENT_TASK_STATUS_LABEL.REVIEWED },
  { value: 'CLOSED', label: IMPROVEMENT_TASK_STATUS_LABEL.CLOSED },
  { value: 'RETURNED', label: IMPROVEMENT_TASK_STATUS_LABEL.RETURNED },
]

const improvementEditorVisible = ref(false)
const improvementEditorMode = ref<'create' | 'edit'>('create')
const improvementEditor = reactive<ImprovementTaskSavePayload>({
  taskCode: '',
  taskTitle: '',
  problemSummary: '',
  proposedAction: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
  ownerUserId: '',
  ownerRole: '',
  dueDate: '',
})
const improvementEditorSubmitting = ref(false)
const improvementDetailVisible = ref(false)
const improvementDetailRecord = ref<ImprovementTaskVO | null>(null)
const improvementDetailLoading = ref(false)

const improvementTransitMap: Record<ImprovementTaskStatus, ImprovementTaskStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED'],
  SUBMITTED: ['CLOSED', 'RETURNED'],
  REVIEWED: [],
  RETURNED: ['IN_PROGRESS'],
  CLOSED: [],
}

async function loadImprovementList() {
  if (!qualityStore.currentTrainingPlanId) {
    improvementList.value = []
    improvementTotal.value = 0
    return
  }
  improvementLoading.value = true
  try {
    const page = await improvementTaskApi.page({
      ...improvementQuery,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      qualityCourseId: improvementQuery.qualityCourseId || undefined,
      ownerUserId: improvementQuery.ownerUserId || undefined,
      status: improvementQuery.status || undefined,
      keyword: improvementQuery.keyword?.trim() || undefined,
    })
    improvementList.value = page.list
    improvementTotal.value = page.total
  } finally {
    improvementLoading.value = false
  }
}

function handleImprovementPageChange(payload: { current: number, pageSize: number }) {
  improvementQuery.pageNum = payload.current
  improvementQuery.pageSize = payload.pageSize
  loadImprovementList()
}

function resetImprovementQuery() {
  improvementQuery.pageNum = 1
  improvementQuery.qualityCourseId = ''
  improvementQuery.ownerUserId = ''
  improvementQuery.status = undefined
  improvementQuery.keyword = ''
  loadImprovementList()
}

function openImprovementCreate() {
  improvementEditorMode.value = 'create'
  Object.assign(improvementEditor, {
    id: undefined,
    taskCode: '',
    taskTitle: '',
    problemSummary: '',
    proposedAction: '',
    programId: qualityStore.currentProgramId || '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    achievementResultId: '',
    reportId: '',
    ownerUserId: '',
    ownerRole: '',
    dueDate: '',
  })
  improvementEditorVisible.value = true
}

function openImprovementEdit(record: ImprovementTaskVO) {
  improvementEditorMode.value = 'edit'
  Object.assign(improvementEditor, {
    id: record.id,
    taskCode: record.taskCode,
    taskTitle: record.taskTitle,
    problemSummary: record.problemSummary || '',
    proposedAction: record.proposedAction || '',
    programId: record.programId || '',
    trainingPlanId: record.trainingPlanId || '',
    qualityCourseId: record.qualityCourseId || '',
    achievementResultId: record.achievementResultId || '',
    reportId: record.reportId || '',
    ownerUserId: record.ownerUserId || '',
    ownerRole: record.ownerRole || '',
    dueDate: record.dueDate || '',
  })
  improvementEditorVisible.value = true
}

async function submitImprovementEditor() {
  if (!improvementEditor.taskCode.trim() || !improvementEditor.taskTitle.trim()) {
    message.error('请填写任务编码与标题')
    return
  }
  improvementEditorSubmitting.value = true
  try {
    const payload: ImprovementTaskSavePayload = {
      ...improvementEditor,
      trainingPlanId:
        improvementEditor.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
      taskCode: improvementEditor.taskCode.trim(),
      taskTitle: improvementEditor.taskTitle.trim(),
      qualityCourseId: improvementEditor.qualityCourseId || undefined,
      achievementResultId: improvementEditor.achievementResultId || undefined,
      reportId: improvementEditor.reportId || undefined,
      ownerUserId: improvementEditor.ownerUserId || undefined,
      ownerRole: improvementEditor.ownerRole || undefined,
      dueDate: improvementEditor.dueDate || undefined,
    }
    if (improvementEditorMode.value === 'create') {
      await improvementTaskApi.create(payload)
      message.success('改进任务已创建')
    } else {
      await improvementTaskApi.update(payload)
      message.success('已保存修改')
    }
    improvementEditorVisible.value = false
    await loadImprovementList()
  } finally {
    improvementEditorSubmitting.value = false
  }
}

function nextImprovementStatuses(status: ImprovementTaskStatus) {
  return improvementTransitMap[status] || []
}

async function handleImprovementTransit(record: ImprovementTaskVO, to: ImprovementTaskStatus) {
  if (record.status === 'SUBMITTED' && (to === 'CLOSED' || to === 'RETURNED')) {
    const reviewRemark = await promptModal({
      title: to === 'CLOSED' ? '复评通过并闭环' : '复评退回任务',
      placeholder: to === 'RETURNED' ? '退回原因（必填）' : '复评意见（可选）',
      required: to === 'RETURNED',
      okType: to === 'RETURNED' ? 'danger' : 'primary',
      emptyErrorMessage: '请填写退回原因',
    })
    if (reviewRemark === null) return
    if (to === 'RETURNED' && !reviewRemark) return
    await improvementTaskApi.close({
      id: record.id,
      reviewDecision: to === 'CLOSED' ? 'APPROVED' : 'REJECTED',
      reviewRemark: reviewRemark || undefined,
    })
    message.success(to === 'CLOSED' ? '已闭环' : '已退回')
    await loadImprovementList()
    return
  }
  const remark = await promptModal({
    title: `${IMPROVEMENT_TASK_STATUS_LABEL[record.status]} → ${IMPROVEMENT_TASK_STATUS_LABEL[to]}`,
    placeholder: to === 'SUBMITTED' ? '整改进度说明（建议必填）' : '进度备注（可选）',
    required: false,
    okType: 'primary',
  })
  if (remark === null) return
  let rectificationEvidence: string | undefined
  if (to === 'SUBMITTED') {
    const evidenceText = await promptModal({
      title: '填写整改证据（JSON，可选）',
      placeholder: '例如：{"docs":["file_id_1"], "actions":["调整考核权重"]}',
      required: false,
      okType: 'primary',
    })
    if (evidenceText === null) return
    rectificationEvidence = evidenceText || undefined
  }
  await improvementTaskApi.transitStatus({
    id: record.id,
    targetStatus: to,
    progressRemark: remark || undefined,
    rectificationEvidence,
  })
  message.success('流转成功')
  await loadImprovementList()
}

async function handleImprovementAiSuggestion(record: ImprovementTaskVO) {
  void confirmAsync({
    title: '为该改进任务生成 AI 建议草稿？',
    content: '将提交 IMPROVEMENT_SUGGESTION_GENERATE AI 任务，完成后可在 AI 任务中心查看结果',
    type: 'info',
    onOk: async () => {
      const res = await aiTaskApi.submit({
        taskType: 'IMPROVEMENT_SUGGESTION_GENERATE',
        businessType: 'improvement-task',
        businessId: record.id,
        trainingPlanId: record.trainingPlanId,
        programId: record.programId,
        qualityCourseId: record.qualityCourseId,
        achievementResultId: record.achievementResultId,
      })
      message.success(`已提交 AI 任务 ${res.taskId}`)
      // 启动轮询：后续 AI 任务中心 / 详情抽屉能同步看到状态跳转。
      if (res.taskId) aiTaskStore.startPolling(res.taskId)
    },
  })
}

async function handleImprovementDelete(record: ImprovementTaskVO) {
  void confirmAsync({
    title: `删除改进任务 ${record.taskCode}？`,
    type: 'error',
    content: '该操作不可恢复',
    onOk: async () => {
      await improvementTaskApi.delete(record.id)
      message.success('已删除')
      await loadImprovementList()
    },
  })
}

async function openImprovementDetail(record: ImprovementTaskVO) {
  improvementDetailVisible.value = true
  improvementDetailLoading.value = true
  try {
    improvementDetailRecord.value = await improvementTaskApi.detail(record.id)
  } finally {
    improvementDetailLoading.value = false
  }
}

/* ========== Tab 2: 审核评估问题 ========== */

const issueList = ref<AuditIssueVO[]>([])
const issueTotal = ref(0)
const issueLoading = ref(false)
const issueQuery = reactive<AuditIssueQueryPayload>({
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

const issueSourceOptions = [
  { value: 'SELF_AUDIT', label: '自评自查' },
  { value: 'EXPERT_AUDIT', label: '专家审核' },
  { value: 'ACCREDITATION_AUDIT', label: '认证审核' },
  { value: 'EXTERNAL_INSPECTION', label: '外部检查' },
]
const severityOptions = [
  { value: 'MINOR', label: '轻微' },
  { value: 'MAJOR', label: '严重' },
  { value: 'CRITICAL', label: '重大' },
]
const issueStatusOptions: AuditIssueStatus[] = [
  'OPEN',
  'IN_RECTIFICATION',
  'RECTIFIED',
  'VERIFIED',
  'CLOSED',
]

const issueEditorVisible = ref(false)
const issueEditorMode = ref<'create' | 'edit'>('create')
const issueEditor = reactive<AuditIssueSavePayload>({
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  requirementIndicatorId: '',
  courseGoalId: '',
  achievementResultId: '',
  issueCode: '',
  issueTitle: '',
  issueDescription: '',
  issueSource: 'SELF_AUDIT',
  severity: 'MINOR',
  auditRound: '',
  auditYear: '',
  raisedBy: '',
  raisedAt: '',
})
const issueEditorSubmitting = ref(false)

async function loadIssueList() {
  issueLoading.value = true
  try {
    const page = await auditIssueApi.page({
      ...issueQuery,
      programId: issueQuery.programId || qualityStore.currentProgramId || undefined,
      trainingPlanId: issueQuery.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
      keyword: issueQuery.keyword?.trim() || undefined,
    })
    issueList.value = page.list
    issueTotal.value = page.total
  } finally {
    issueLoading.value = false
  }
}

function handleIssuePageChange(payload: { current: number, pageSize: number }) {
  issueQuery.pageNum = payload.current
  issueQuery.pageSize = payload.pageSize
  loadIssueList()
}

function resetIssueQuery() {
  issueQuery.pageNum = 1
  issueQuery.programId = undefined
  issueQuery.trainingPlanId = undefined
  issueQuery.qualityCourseId = undefined
  issueQuery.issueSource = undefined
  issueQuery.severity = undefined
  issueQuery.status = undefined
  issueQuery.auditYear = undefined
  issueQuery.keyword = ''
  loadIssueList()
}

function openIssueCreate() {
  issueEditorMode.value = 'create'
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
    issueSource: 'SELF_AUDIT',
    severity: 'MINOR',
    auditRound: '',
    auditYear: new Date().getFullYear().toString(),
    raisedBy: '',
    raisedAt: '',
  })
  issueEditorVisible.value = true
}

function openIssueEdit(record: AuditIssueVO) {
  issueEditorMode.value = 'edit'
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
    raisedBy: record.raisedBy || '',
    raisedAt: record.raisedAt || '',
  })
  issueEditorVisible.value = true
}

async function submitIssueEditor() {
  if (
    !issueEditor.issueCode.trim()
    || !issueEditor.issueTitle.trim()
    || !issueEditor.issueSource
    || !issueEditor.severity
  ) {
    message.error('请填写编码、标题、来源、严重程度')
    return
  }
  issueEditorSubmitting.value = true
  try {
    const payload: AuditIssueSavePayload = {
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
      raisedBy: issueEditor.raisedBy || undefined,
      raisedAt: issueEditor.raisedAt || undefined,
    }
    if (issueEditorMode.value === 'create') {
      await auditIssueApi.create(payload)
      message.success('已登记')
    } else {
      await auditIssueApi.update(payload)
      message.success('已保存')
    }
    issueEditorVisible.value = false
    await loadIssueList()
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
      message.success('已删除')
      await loadIssueList()
    },
  })
}

async function changeIssueStatus(record: AuditIssueVO, target: AuditIssueStatus) {
  await auditIssueApi.transitStatus(record.id, target)
  message.success(`已切换到「${issueStatusLabel(target)}」`)
  await loadIssueList()
}

function handleIssueStatusMenuClick(record: AuditIssueVO, event: { key: unknown }) {
  if (!isAuditIssueStatus(event.key)) {
    throw new Error('审核评估问题状态不符合前后端契约')
  }
  changeIssueStatus(record, event.key)
}

/* ========== Tab 3: 整改任务台账 ========== */

const rectList = ref<AuditRectificationVO[]>([])
const rectTotal = ref(0)
const rectLoading = ref(false)
const rectIssuesCache = ref<Map<string, AuditIssueVO>>(new Map())
const rectQuery = reactive<AuditRectificationQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  auditIssueId: undefined,
  ownerUserId: undefined,
  status: undefined,
  keyword: '',
})
const rectStatusOptions: AuditRectificationStatus[] = [
  'PLANNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'VERIFIED',
  'RETURNED',
  'CLOSED',
]

const rectEditorVisible = ref(false)
const rectEditorMode = ref<'create' | 'edit'>('create')
const rectEditor = reactive<AuditRectificationSavePayload>({
  auditIssueId: '',
  rectificationCode: '',
  rectificationTitle: '',
  rectificationAction: '',
  ownerUserId: '',
  ownerRole: '',
  dueDate: '',
})
const rectEditorSubmitting = ref(false)

async function loadRectList() {
  rectLoading.value = true
  try {
    const page = await auditRectificationApi.page({
      ...rectQuery,
      keyword: rectQuery.keyword?.trim() || undefined,
    })
    rectList.value = page.list || []
    rectTotal.value = page.total
    const issueIds = Array.from(new Set(rectList.value.map((r) => r.auditIssueId).filter(Boolean)))
    for (const id of issueIds) {
      if (rectIssuesCache.value.has(id)) continue
      try {
        const issue = await auditIssueApi.detail(id)
        rectIssuesCache.value.set(id, issue)
      } catch {
        // 单条问题获取失败不影响列表展示
      }
    }
  } finally {
    rectLoading.value = false
  }
}

function handleRectPageChange(payload: { current: number, pageSize: number }) {
  rectQuery.pageNum = payload.current
  rectQuery.pageSize = payload.pageSize
  loadRectList()
}

function resetRectQuery() {
  rectQuery.pageNum = 1
  rectQuery.auditIssueId = undefined
  rectQuery.ownerUserId = undefined
  rectQuery.status = undefined
  rectQuery.keyword = ''
  loadRectList()
}

function openRectCreate() {
  rectEditorMode.value = 'create'
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
  rectEditorVisible.value = true
}

function openRectEdit(record: AuditRectificationVO) {
  rectEditorMode.value = 'edit'
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
  rectEditorVisible.value = true
}

async function submitRectEditor() {
  if (
    !rectEditor.auditIssueId
    || !rectEditor.rectificationCode.trim()
    || !rectEditor.rectificationTitle.trim()
    || !rectEditor.ownerUserId
    || !rectEditor.dueDate
  ) {
    message.error('请填写关联问题、编码、标题、责任人、截止日期')
    return
  }
  rectEditorSubmitting.value = true
  try {
    const payload: AuditRectificationSavePayload = {
      ...rectEditor,
      rectificationCode: rectEditor.rectificationCode.trim(),
      rectificationTitle: rectEditor.rectificationTitle.trim(),
      ownerRole: rectEditor.ownerRole || undefined,
    }
    if (rectEditorMode.value === 'create') {
      await auditRectificationApi.create(payload)
      message.success('已创建')
    } else {
      await auditRectificationApi.update(payload)
      message.success('已保存')
    }
    rectEditorVisible.value = false
    await loadRectList()
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
      message.success('已删除')
      await loadRectList()
    },
  })
}

async function advanceRectProgress(
  record: AuditRectificationVO,
  target: 'IN_PROGRESS' | 'SUBMITTED',
) {
  const remark = await promptModal({
    title: target === 'IN_PROGRESS' ? '开始实施' : '提交复核',
    placeholder: '请填写进展说明',
    required: target === 'SUBMITTED',
    emptyErrorMessage: '请填写提交说明',
  })
  if (target === 'SUBMITTED' && !remark) return
  await auditRectificationApi.updateProgress(record.id, target, remark ?? undefined)
  message.success('已更新')
  await loadRectList()
}

async function verifyRect(record: AuditRectificationVO, decision: 'APPROVED' | 'REJECTED') {
  const remark = await promptModal({
    title: decision === 'APPROVED' ? '复核通过' : '复核退回',
    placeholder: '请填写复核说明',
    required: decision === 'REJECTED',
    emptyErrorMessage: '退回必须填写原因',
    okType: decision === 'REJECTED' ? 'danger' : 'primary',
  })
  if (decision === 'REJECTED' && !remark) return
  await auditRectificationApi.verify(record.id, decision, remark ?? undefined)
  message.success('已复核')
  await loadRectList()
}

async function closeRect(record: AuditRectificationVO) {
  void confirmAsync({
    title: `闭环整改任务 ${record.rectificationCode}？`,
    content: '闭环后该任务不可再修改',
    type: 'warning',
    onOk: async () => {
      await auditRectificationApi.close(record.id)
      message.success('已闭环')
      await loadRectList()
    },
  })
}

/* ========== Tab 4: 督导复查 ========== */

const supList = ref<AuditSupervisionVO[]>([])
const supTotal = ref(0)
const supLoading = ref(false)
const supQuery = reactive<AuditSupervisionQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  supervisionType: undefined,
  conclusion: undefined,
  keyword: '',
})

const supervisionTypeOptions: Array<{ value: AuditSupervisionType, label: string }> = [
  { value: 'DAILY', label: AUDIT_SUPERVISION_TYPE_LABEL.DAILY },
  { value: 'SPECIAL', label: AUDIT_SUPERVISION_TYPE_LABEL.SPECIAL },
  { value: 'PRE_AUDIT', label: AUDIT_SUPERVISION_TYPE_LABEL.PRE_AUDIT },
  { value: 'SITE_VISIT', label: AUDIT_SUPERVISION_TYPE_LABEL.SITE_VISIT },
]
const supScopeOptions = [
  { value: 'COURSE', label: '课程' },
  { value: 'PROGRAM', label: '专业' },
  { value: 'TRAINING_PLAN', label: '培养方案' },
  { value: 'COMPREHENSIVE', label: '综合' },
]
const supConclusionOptions = [
  { value: 'PASS', label: '通过', color: 'green' },
  { value: 'NEEDS_IMPROVEMENT', label: '需改进', color: 'orange' },
  { value: 'FAIL', label: '不通过', color: 'red' },
]

const supEditorVisible = ref(false)
const supEditorMode = ref<'create' | 'edit'>('create')
const supEditor = reactive<AuditSupervisionSavePayload>({
  auditIssueId: '',
  rectificationId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  supervisionCode: '',
  supervisionTitle: '',
  supervisionType: 'DAILY',
  supervisionScope: 'COURSE',
  supervisorUserId: '',
  supervisedAt: '',
  summary: '',
  findings: '',
  conclusion: '',
  archiveId: '',
  evidenceAnchors: '',
})
const supEditorSubmitting = ref(false)

async function loadSupList() {
  supLoading.value = true
  try {
    const page = await auditSupervisionApi.page({
      ...supQuery,
      programId: supQuery.programId || qualityStore.currentProgramId || undefined,
      keyword: supQuery.keyword?.trim() || undefined,
    })
    supList.value = page.list || []
    supTotal.value = page.total
  } finally {
    supLoading.value = false
  }
}

function handleSupPageChange(payload: { current: number, pageSize: number }) {
  supQuery.pageNum = payload.current
  supQuery.pageSize = payload.pageSize
  loadSupList()
}

function resetSupQuery() {
  supQuery.pageNum = 1
  supQuery.programId = undefined
  supQuery.supervisionType = undefined
  supQuery.conclusion = undefined
  supQuery.keyword = ''
  loadSupList()
}

function openSupCreate() {
  supEditorMode.value = 'create'
  Object.assign(supEditor, {
    id: undefined,
    auditIssueId: '',
    rectificationId: '',
    programId: qualityStore.currentProgramId || '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    supervisionCode: '',
    supervisionTitle: '',
    supervisionType: 'DAILY',
    supervisionScope: 'COURSE',
    supervisorUserId: '',
    supervisedAt: '',
    summary: '',
    findings: '',
    conclusion: '',
    archiveId: '',
    evidenceAnchors: '',
  })
  supEditorVisible.value = true
}

function openSupEdit(record: AuditSupervisionVO) {
  supEditorMode.value = 'edit'
  Object.assign(supEditor, {
    id: record.id,
    auditIssueId: record.auditIssueId || '',
    rectificationId: record.rectificationId || '',
    programId: record.programId || '',
    trainingPlanId: record.trainingPlanId || '',
    qualityCourseId: record.qualityCourseId || '',
    supervisionCode: record.supervisionCode,
    supervisionTitle: record.supervisionTitle,
    supervisionType: record.supervisionType,
    supervisionScope: record.supervisionScope || 'COURSE',
    supervisorUserId: record.supervisorUserId || '',
    supervisedAt: record.supervisedAt || '',
    summary: record.summary || '',
    findings: record.findings || '',
    conclusion: record.conclusion || '',
    archiveId: record.archiveId || '',
    evidenceAnchors: record.evidenceAnchors || '',
  })
  supEditorVisible.value = true
}

async function submitSupEditor() {
  if (
    !supEditor.supervisionCode.trim()
    || !supEditor.supervisionTitle.trim()
    || !supEditor.supervisionType
  ) {
    message.error('请填写编码、标题、督导类型')
    return
  }
  supEditorSubmitting.value = true
  try {
    const payload: AuditSupervisionSavePayload = {
      ...supEditor,
      supervisionCode: supEditor.supervisionCode.trim(),
      supervisionTitle: supEditor.supervisionTitle.trim(),
      auditIssueId: supEditor.auditIssueId || undefined,
      rectificationId: supEditor.rectificationId || undefined,
      programId: supEditor.programId || undefined,
      trainingPlanId: supEditor.trainingPlanId || undefined,
      qualityCourseId: supEditor.qualityCourseId || undefined,
      supervisorUserId: supEditor.supervisorUserId || undefined,
      supervisedAt: supEditor.supervisedAt || undefined,
      summary: supEditor.summary || undefined,
      findings: supEditor.findings || undefined,
      conclusion: supEditor.conclusion || undefined,
      archiveId: supEditor.archiveId || undefined,
      evidenceAnchors: supEditor.evidenceAnchors || undefined,
    }
    if (supEditorMode.value === 'create') {
      await auditSupervisionApi.create(payload)
      message.success('已创建')
    } else {
      await auditSupervisionApi.update(payload)
      message.success('已保存')
    }
    supEditorVisible.value = false
    await loadSupList()
  } finally {
    supEditorSubmitting.value = false
  }
}

async function handleSupDelete(record: AuditSupervisionVO) {
  void confirmAsync({
    title: `删除督导记录 ${record.supervisionCode}？`,
    type: 'error',
    onOk: async () => {
      await auditSupervisionApi.delete(record.id)
      message.success('已删除')
      await loadSupList()
    },
  })
}

/* ========== 共享 SignalBand：跨 4 个模块的健康度 ========== */

function parseDueDate(dateStr?: string): number | null {
  if (!dateStr) return null
  const t = Date.parse(dateStr)
  return Number.isNaN(t) ? null : t
}

const signals = computed<SignalMetric[]>(() => {
  const improvementBuckets: Record<ImprovementTaskStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    SUBMITTED: 0,
    REVIEWED: 0,
    RETURNED: 0,
    CLOSED: 0,
  }
  for (const t of improvementList.value) {
    if (isImprovementTaskStatus(t.status)) improvementBuckets[t.status] += 1
  }
  const now = Date.now()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  let overdue = 0
  let dueSoon = 0
  for (const t of improvementList.value) {
    if (t.status === 'CLOSED') continue
    const due = parseDueDate(t.dueDate)
    if (due == null) continue
    if (due < now) overdue += 1
    else if (due - now <= oneWeek) dueSoon += 1
  }
  for (const r of rectList.value) {
    if (r.status === 'CLOSED') continue
    const due = parseDueDate(r.dueDate)
    if (due == null) continue
    if (due < now) overdue += 1
    else if (due - now <= oneWeek) dueSoon += 1
  }

  const openIssueCount = issueList.value.filter(
    (i) => i.status === 'OPEN' || i.status === 'IN_RECTIFICATION',
  ).length
  const activeRectCount = rectList.value.filter((r) => r.status !== 'CLOSED').length
  const needsImprovementSup = supList.value.filter(
    (s) => s.conclusion === 'NEEDS_IMPROVEMENT' || s.conclusion === 'FAIL',
  ).length

  return [
    { key: 'improvement-total', label: '改进任务', value: improvementTotal.value, tone: 'blue' },
    {
      key: 'improvement-in-progress',
      label: '整改中',
      value: improvementBuckets.IN_PROGRESS,
      tone: improvementBuckets.IN_PROGRESS > 0 ? 'orange' : 'gray',
    },
    {
      key: 'improvement-submitted',
      label: '待复评',
      value: improvementBuckets.SUBMITTED,
      tone: improvementBuckets.SUBMITTED > 0 ? 'blue' : 'gray',
    },
    { key: 'overdue', label: '逾期', value: overdue, tone: overdue > 0 ? 'red' : 'gray' },
    { key: 'due-soon', label: '7 天到期', value: dueSoon, tone: dueSoon > 0 ? 'orange' : 'gray' },
    {
      key: 'issue-open',
      label: '待整改问题',
      value: openIssueCount,
      tone: openIssueCount > 0 ? 'red' : 'gray',
    },
    {
      key: 'rect-active',
      label: '在办整改',
      value: activeRectCount,
      tone: activeRectCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'sup-warn',
      label: '督导警示',
      value: needsImprovementSup,
      tone: needsImprovementSup > 0 ? 'red' : 'gray',
    },
  ]
})

/* ========== 监听 + 初始化 ========== */

watch(
  () => qualityStore.currentTrainingPlanId,
  () => {
    loadImprovementList()
  },
)

watch(
  () => qualityStore.currentProgramId,
  () => {
    if (activeTab.value === 'issue') loadIssueList()
    if (activeTab.value === 'supervision') loadSupList()
  },
)

watch(activeTab, async (tab) => {
  if (tab === 'improvement') await loadImprovementList()
  else if (tab === 'issue') await loadIssueList()
  else if (tab === 'rectification') await loadRectList()
  else if (tab === 'supervision') await loadSupList()
})

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  await Promise.all([loadImprovementList(), loadIssueList(), loadRectList(), loadSupList()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="iwb__context">
        <div class="iwb__context-info">
          <h2 class="iwb__title">持续改进与审核闭环</h2>
        </div>
        <div class="iwb__context-actions">
          <span class="iwb__context-meta">
            培养方案：
            <span v-if="qualityStore.currentPlan" class="iwb__context-strong">
              {{ qualityStore.currentPlan.planCode }} ·
              {{ qualityStore.currentPlan.planName }}
            </span>
            <span v-else class="iwb__context-muted">未选择</span>
          </span>
        </div>
      </div>
    </template>

    <SignalBand :metrics="signals" compact class="iwb__signals" />

    <a-tabs v-model:active-key="activeTab" class="iwb__tabs">
      <!-- Tab 1: 改进任务 -->
      <a-tab-pane key="improvement" tab="改进任务">
        <UiEmpty
          v-if="!qualityStore.currentTrainingPlanId"
          description="尚未选择培养方案，请在工作台顶部选择后再回来"
          class="iwb__empty"
        />
        <section v-else class="iwb__panel">
          <header class="iwb__panel-header">
            <h3 class="iwb__panel-title">改进任务台账</h3>
            <div class="iwb__panel-actions">
              <a-input
                v-model:value="improvementQuery.qualityCourseId"
                placeholder="课程 ID"
                class="iwb__filter iwb__filter--xs"
              />
              <a-input
                v-model:value="improvementQuery.ownerUserId"
                placeholder="负责人 user_id"
                class="iwb__filter iwb__filter--xs"
              />
              <a-select
                v-model:value="improvementQuery.status"
                placeholder="状态"
                class="iwb__filter"
                allow-clear
                :options="improvementStatusOptions"
              />
              <a-input
                v-model:value="improvementQuery.keyword"
                placeholder="关键字"
                class="iwb__filter"
                @press-enter="loadImprovementList"
              />
              <UiButton variant="ghost" size="sm" @click="resetImprovementQuery"> 重置 </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                :loading="improvementLoading"
                @click="loadImprovementList"
              >
                查询
              </UiButton>
              <UiButton
                variant="primary"
                size="sm"
                :disabled="!qualityStore.currentTrainingPlanId"
                @click="openImprovementCreate"
              >
                新建改进任务
              </UiButton>
            </div>
          </header>
          <UiDataTable
            v-model:current="improvementQuery.pageNum"
            v-model:page-size="improvementQuery.pageSize"
            :columns="improvementColumns"
            :data-source="improvementList"
            :loading="improvementLoading"
            row-key="id"
            size="middle"
            :total="improvementTotal"
            flat
            @page-change="handleImprovementPageChange"
          >
            <template #bodyCell="{ column, record, text }">
              <template
                v-if="
                  column.key === 'qualityCourseId'
                    || column.key === 'ownerUserId'
                    || column.key === 'ownerRole'
                    || column.key === 'dueDate'
                "
              >
                {{ text || '-' }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="improvementStatusColor(text)">
                  {{ improvementStatusLabel(text) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space wrap>
                  <UiButton variant="ghost" size="sm" @click="openImprovementDetail(record)">
                    详情
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    :disabled="record.status === 'CLOSED'"
                    @click="openImprovementEdit(record)"
                  >
                    编辑
                  </UiButton>
                  <UiButton
                    v-for="to in nextImprovementStatuses(record.status)"
                    :key="to"
                    :variant="to === 'RETURNED' ? 'ghost' : 'outline'"
                    :status="to === 'RETURNED' ? 'danger' : 'normal'"
                    size="sm"
                    @click="handleImprovementTransit(record, to)"
                  >
                    → {{ improvementStatusLabel(to) }}
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    @click="handleImprovementAiSuggestion(record)"
                  >
                    AI 建议
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click="handleImprovementDelete(record)"
                  >
                    删除
                  </UiButton>
                </a-space>
              </template>
            </template>
          </UiDataTable>
        </section>
      </a-tab-pane>

      <!-- Tab 2: 审核评估问题 -->
      <a-tab-pane key="issue" tab="审核评估问题">
        <section class="iwb__panel">
          <header class="iwb__panel-header">
            <h3 class="iwb__panel-title">审核评估问题清单</h3>
            <div class="iwb__panel-actions">
              <a-select
                v-model:value="issueQuery.issueSource"
                placeholder="来源"
                allow-clear
                class="iwb__filter"
                :options="issueSourceOptions"
              />
              <a-select
                v-model:value="issueQuery.severity"
                placeholder="严重度"
                allow-clear
                class="iwb__filter"
                :options="severityOptions"
              />
              <a-select
                v-model:value="issueQuery.status"
                placeholder="状态"
                allow-clear
                class="iwb__filter"
              >
                <a-select-option v-for="s in issueStatusOptions" :key="s" :value="s">
                  {{ issueStatusLabel(s) }}
                </a-select-option>
              </a-select>
              <a-input
                v-model:value="issueQuery.auditYear"
                placeholder="年度"
                class="iwb__filter iwb__filter--xs"
              />
              <a-input
                v-model:value="issueQuery.keyword"
                placeholder="编码/标题"
                class="iwb__filter"
                @press-enter="loadIssueList"
              />
              <UiButton variant="ghost" size="sm" @click="resetIssueQuery"> 重置 </UiButton>
              <UiButton variant="outline" size="sm" :loading="issueLoading" @click="loadIssueList">
                查询
              </UiButton>
              <UiButton variant="primary" size="sm" @click="openIssueCreate"> 登记问题 </UiButton>
            </div>
          </header>
          <UiDataTable
            v-model:current="issueQuery.pageNum"
            v-model:page-size="issueQuery.pageSize"
            :columns="issueColumns"
            :data-source="issueList"
            :loading="issueLoading"
            row-key="id"
            size="middle"
            :total="issueTotal"
            flat
            @page-change="handleIssuePageChange"
          >
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.key === 'issueTitle'">
                <div>{{ record.issueTitle }}</div>
                <div v-if="record.issueDescription" class="iwb__sub-desc">
                  {{ record.issueDescription.substring(0, 80)
                  }}{{ record.issueDescription.length > 80 ? '…' : '' }}
                </div>
              </template>
              <template v-else-if="column.key === 'issueSource'">
                {{ issueSourceOptions.find((o) => o.value === text)?.label || text }}
              </template>
              <template v-else-if="column.key === 'severity'">
                <a-tag
                  :color="text === 'CRITICAL' ? 'red' : text === 'MAJOR' ? 'orange' : 'default'"
                >
                  {{ severityOptions.find((o) => o.value === text)?.label || text }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="issueStatusColor(text)">
                  {{ issueStatusLabel(text) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space wrap>
                  <UiButton variant="ghost" size="sm" @click="openIssueEdit(record)">
                    编辑
                  </UiButton>
                  <a-dropdown>
                    <UiButton variant="outline" size="sm"> 状态 </UiButton>
                    <template #overlay>
                      <a-menu @click="handleIssueStatusMenuClick(record, $event)">
                        <a-menu-item v-for="s in issueStatusOptions" :key="s">
                          {{ issueStatusLabel(s) }}
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <UiButton
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click="handleIssueDelete(record)"
                  >
                    删除
                  </UiButton>
                </a-space>
              </template>
            </template>
          </UiDataTable>
        </section>
      </a-tab-pane>

      <!-- Tab 3: 整改任务台账 -->
      <a-tab-pane key="rectification" tab="整改任务台账">
        <section class="iwb__panel">
          <header class="iwb__panel-header">
            <h3 class="iwb__panel-title">整改任务台账</h3>
            <div class="iwb__panel-actions">
              <a-select
                v-model:value="rectQuery.status"
                placeholder="状态"
                allow-clear
                class="iwb__filter"
              >
                <a-select-option v-for="s in rectStatusOptions" :key="s" :value="s">
                  {{ rectificationStatusLabel(s) }}
                </a-select-option>
              </a-select>
              <AuditIssueSelector
                :value="rectQuery.auditIssueId || null"
                placeholder="关联问题"
                :width="220"
                @change="handleRectQueryAuditIssueChange"
              />
              <a-input
                v-model:value="rectQuery.keyword"
                placeholder="编码/标题"
                class="iwb__filter"
                @press-enter="loadRectList"
              />
              <UiButton variant="ghost" size="sm" @click="resetRectQuery"> 重置 </UiButton>
              <UiButton variant="outline" size="sm" :loading="rectLoading" @click="loadRectList">
                查询
              </UiButton>
              <UiButton variant="primary" size="sm" @click="openRectCreate">
                新建整改任务
              </UiButton>
            </div>
          </header>
          <UiDataTable
            v-model:current="rectQuery.pageNum"
            v-model:page-size="rectQuery.pageSize"
            :columns="rectColumns"
            :data-source="rectList"
            :loading="rectLoading"
            row-key="id"
            size="middle"
            :total="rectTotal"
            flat
            @page-change="handleRectPageChange"
          >
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.key === 'rectTitle'">
                <div>{{ record.rectificationTitle }}</div>
                <div v-if="record.auditIssueId" class="iwb__sub-desc">
                  关联问题：{{
                    rectIssuesCache.get(record.auditIssueId)?.issueCode || record.auditIssueId
                  }}
                </div>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="rectificationStatusColor(text)">
                  {{ rectificationStatusLabel(text) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space wrap>
                  <UiButton variant="ghost" size="sm" @click="openRectEdit(record)">
                    编辑
                  </UiButton>
                  <UiButton
                    v-if="record.status === 'PLANNED'"
                    variant="outline"
                    size="sm"
                    @click="advanceRectProgress(record, 'IN_PROGRESS')"
                  >
                    开始
                  </UiButton>
                  <UiButton
                    v-if="record.status === 'IN_PROGRESS'"
                    variant="outline"
                    size="sm"
                    @click="advanceRectProgress(record, 'SUBMITTED')"
                  >
                    提交复核
                  </UiButton>
                  <UiButton
                    v-if="record.status === 'RETURNED'"
                    variant="outline"
                    size="sm"
                    @click="advanceRectProgress(record, 'IN_PROGRESS')"
                  >
                    重新整改
                  </UiButton>
                  <UiButton
                    v-if="record.status === 'SUBMITTED'"
                    variant="outline"
                    size="sm"
                    @click="verifyRect(record, 'APPROVED')"
                  >
                    通过
                  </UiButton>
                  <UiButton
                    v-if="record.status === 'SUBMITTED'"
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click="verifyRect(record, 'REJECTED')"
                  >
                    退回
                  </UiButton>
                  <UiButton
                    v-if="record.status === 'VERIFIED'"
                    variant="primary"
                    size="sm"
                    @click="closeRect(record)"
                  >
                    闭环
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click="handleRectDelete(record)"
                  >
                    删除
                  </UiButton>
                </a-space>
              </template>
            </template>
          </UiDataTable>
        </section>
      </a-tab-pane>

      <!-- Tab 4: 督导复查 -->
      <a-tab-pane key="supervision" tab="督导复查">
        <section class="iwb__panel">
          <header class="iwb__panel-header">
            <h3 class="iwb__panel-title">督导复查 / 现场检查</h3>
            <div class="iwb__panel-actions">
              <a-select
                v-model:value="supQuery.supervisionType"
                placeholder="类型"
                allow-clear
                class="iwb__filter"
                :options="supervisionTypeOptions"
              />
              <a-select
                v-model:value="supQuery.conclusion"
                placeholder="结论"
                allow-clear
                class="iwb__filter"
              >
                <a-select-option v-for="c in supConclusionOptions" :key="c.value" :value="c.value">
                  {{ c.label }}
                </a-select-option>
              </a-select>
              <a-input
                v-model:value="supQuery.keyword"
                placeholder="编码/标题"
                class="iwb__filter"
                @press-enter="loadSupList"
              />
              <UiButton variant="ghost" size="sm" @click="resetSupQuery"> 重置 </UiButton>
              <UiButton variant="outline" size="sm" :loading="supLoading" @click="loadSupList">
                查询
              </UiButton>
              <UiButton variant="primary" size="sm" @click="openSupCreate"> 新建督导记录 </UiButton>
            </div>
          </header>
          <UiDataTable
            v-model:current="supQuery.pageNum"
            v-model:page-size="supQuery.pageSize"
            :columns="supColumns"
            :data-source="supList"
            :loading="supLoading"
            row-key="id"
            size="middle"
            :total="supTotal"
            flat
            @page-change="handleSupPageChange"
          >
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.key === 'supTitle'">
                <div>{{ record.supervisionTitle }}</div>
                <div v-if="record.summary" class="iwb__sub-desc">
                  {{ record.summary.substring(0, 80) }}{{ record.summary.length > 80 ? '…' : '' }}
                </div>
              </template>
              <template v-else-if="column.key === 'supervisionType'">
                <a-tag>{{ supervisionTypeLabel(text) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'supervisionScope'">
                {{ supScopeOptions.find((o) => o.value === text)?.label || text || '-' }}
              </template>
              <template v-else-if="column.key === 'conclusion'">
                <a-tag
                  v-if="text"
                  :color="supConclusionOptions.find((o) => o.value === text)?.color || 'default'"
                >
                  {{ supConclusionOptions.find((o) => o.value === text)?.label || text }}
                </a-tag>
                <span v-else class="iwb__muted">-</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <UiButton variant="ghost" size="sm" @click="openSupEdit(record)"> 编辑 </UiButton>
                  <UiButton
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click="handleSupDelete(record)"
                  >
                    删除
                  </UiButton>
                </a-space>
              </template>
            </template>
          </UiDataTable>
        </section>
      </a-tab-pane>
    </a-tabs>

    <!-- 改进任务 编辑器 Drawer -->
    <UiDrawer
      v-model:open="improvementEditorVisible"
      :title="improvementEditorMode === 'create' ? '新建改进任务' : '编辑改进任务'"
      :width="760"
      :confirm-loading="improvementEditorSubmitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitImprovementEditor"
    >
      <a-form layout="vertical" :model="improvementEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="任务编码" required>
              <a-input v-model:value="improvementEditor.taskCode" placeholder="如 IMP-2024-001" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="任务标题" required>
              <a-input v-model:value="improvementEditor.taskTitle" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="负责人">
              <TeacherSelector
                :value="improvementEditor.ownerUserId || null"
                @change="handleImprovementOwnerChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="责任角色">
              <a-input
                v-model:value="improvementEditor.ownerRole"
                placeholder="如 课程负责人 / 系主任"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="关联专业">
              <ProgramSelector
                :value="improvementEditor.programId || null"
                @change="handleImprovementProgramChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="关联课程">
              <CourseSelector
                :value="improvementEditor.qualityCourseId || null"
                :program-id="improvementEditor.programId || null"
                :training-plan-id="improvementEditor.trainingPlanId || null"
                @change="handleImprovementCourseChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="关联达成度结果">
              <AchievementResultSelector
                :value="improvementEditor.achievementResultId || null"
                :program-id="improvementEditor.programId || null"
                :training-plan-id="improvementEditor.trainingPlanId || null"
                :quality-course-id="improvementEditor.qualityCourseId || null"
                @change="handleImprovementAchievementResultChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="关联报告">
              <ReportSelector
                :value="improvementEditor.reportId || null"
                :program-id="improvementEditor.programId || null"
                :training-plan-id="improvementEditor.trainingPlanId || null"
                @change="handleImprovementReportChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="截止日期">
              <a-input v-model:value="improvementEditor.dueDate" placeholder="yyyy-MM-dd" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="问题概述">
          <a-textarea
            v-model:value="improvementEditor.problemSummary"
            :rows="3"
            placeholder="为什么达成度低于阈值 / 暴露了什么问题"
          />
        </a-form-item>
        <a-form-item label="改进措施">
          <a-textarea
            v-model:value="improvementEditor.proposedAction"
            :rows="3"
            placeholder="具体改进动作"
          />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <!-- 改进任务 详情 Drawer -->
    <UiDrawer
      v-model:open="improvementDetailVisible"
      title="改进任务详情"
      :width="640"
      :hide-footer="true"
    >
      <UiEmpty
        v-if="!improvementDetailRecord && !improvementDetailLoading"
        description="详情数据未加载"
        size="sm"
      />
      <a-descriptions v-if="improvementDetailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="编号">
          {{ improvementDetailRecord.taskCode }}
        </a-descriptions-item>
        <a-descriptions-item label="标题">
          {{ improvementDetailRecord.taskTitle }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="improvementStatusColor(improvementDetailRecord.status)">
            {{ improvementStatusLabel(improvementDetailRecord.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="负责人">
          {{ improvementDetailRecord.ownerUserId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="角色">
          {{ improvementDetailRecord.ownerRole || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="截止">
          {{ improvementDetailRecord.dueDate || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="问题概述">
          {{ improvementDetailRecord.problemSummary || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="改进措施">
          {{ improvementDetailRecord.proposedAction || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="进度备注">
          {{ improvementDetailRecord.progressRemark || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="整改证据">
          <pre v-if="improvementDetailRecord.rectificationEvidence" class="iwb__evidence-pre">{{
            improvementDetailRecord.rectificationEvidence
          }}</pre>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item label="复评结论">
          {{ improvementDetailRecord.reviewDecision || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="复评意见">
          {{ improvementDetailRecord.reviewRemark || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="闭环时间">
          {{ improvementDetailRecord.closedAt || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </UiDrawer>

    <!-- 审核问题 编辑器 Modal -->
    <a-modal
      v-model:open="issueEditorVisible"
      :title="issueEditorMode === 'create' ? '登记审核评估问题' : '编辑审核评估问题'"
      :confirm-loading="issueEditorSubmitting"
      width="820px"
      @ok="submitIssueEditor"
    >
      <a-form layout="vertical" :model="issueEditor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="issueEditor.issueCode" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="问题来源" required>
              <a-select v-model:value="issueEditor.issueSource" :options="issueSourceOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="严重程度" required>
              <a-select v-model:value="issueEditor.severity" :options="severityOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="审核年度">
              <a-input v-model:value="issueEditor.auditYear" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="标题" required>
          <a-input v-model:value="issueEditor.issueTitle" />
        </a-form-item>
        <a-form-item label="详细描述">
          <a-textarea v-model:value="issueEditor.issueDescription" :rows="4" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="审核轮次">
              <a-input v-model:value="issueEditor.auditRound" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="提出人 user_id">
              <a-input v-model:value="issueEditor.raisedBy" placeholder="提出人 user_id（可选）" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="提出时间">
              <a-input v-model:value="issueEditor.raisedAt" placeholder="yyyy-MM-dd HH:mm:ss" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">关联业务对象（可选）</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="所属专业">
              <ProgramSelector
                :value="issueEditor.programId || null"
                @change="handleIssueProgramChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="培养方案">
              <TrainingPlanSelector
                :value="issueEditor.trainingPlanId || null"
                :program-id="issueEditor.programId || null"
                @change="handleIssueTrainingPlanChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="质量评价课程">
              <CourseSelector
                :value="issueEditor.qualityCourseId || null"
                :program-id="issueEditor.programId || null"
                :training-plan-id="issueEditor.trainingPlanId || null"
                @change="handleIssueCourseChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="观测点">
              <RequirementIndicatorSelector
                :value="issueEditor.requirementIndicatorId || null"
                :training-plan-id="issueEditor.trainingPlanId || null"
                @change="handleIssueRequirementIndicatorChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="课程目标">
              <CourseGoalSelector
                :value="issueEditor.courseGoalId || null"
                :quality-course-id="issueEditor.qualityCourseId || null"
                @change="handleIssueCourseGoalChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="达成度结果">
              <AchievementResultSelector
                :value="issueEditor.achievementResultId || null"
                :program-id="issueEditor.programId || null"
                :training-plan-id="issueEditor.trainingPlanId || null"
                :quality-course-id="issueEditor.qualityCourseId || null"
                @change="handleIssueAchievementResultChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 整改任务 编辑器 Modal -->
    <a-modal
      v-model:open="rectEditorVisible"
      :title="rectEditorMode === 'create' ? '新建整改任务' : '编辑整改任务'"
      :confirm-loading="rectEditorSubmitting"
      width="760px"
      @ok="submitRectEditor"
    >
      <a-form layout="vertical" :model="rectEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="rectEditor.rectificationCode" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="关联问题" required>
              <AuditIssueSelector
                :value="rectEditor.auditIssueId || null"
                placeholder="选择审核评估问题"
                @change="handleRectEditorAuditIssueChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="标题" required>
          <a-input v-model:value="rectEditor.rectificationTitle" />
        </a-form-item>
        <a-form-item label="整改措施" required>
          <a-textarea v-model:value="rectEditor.rectificationAction" :rows="4" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="责任人" required>
              <TeacherSelector
                :value="rectEditor.ownerUserId || null"
                @change="handleRectEditorOwnerChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="角色">
              <a-input v-model:value="rectEditor.ownerRole" placeholder="如 专业负责人" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="截止日期" required>
              <a-input v-model:value="rectEditor.dueDate" placeholder="yyyy-MM-dd" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 督导复查 编辑器 Modal -->
    <a-modal
      v-model:open="supEditorVisible"
      :title="supEditorMode === 'create' ? '新建督导记录' : '编辑督导记录'"
      :confirm-loading="supEditorSubmitting"
      width="840px"
      @ok="submitSupEditor"
    >
      <a-form layout="vertical" :model="supEditor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="supEditor.supervisionCode" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="督导类型" required>
              <a-select
                v-model:value="supEditor.supervisionType"
                :options="supervisionTypeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="范围">
              <a-select v-model:value="supEditor.supervisionScope" :options="supScopeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="督导时间">
              <a-input v-model:value="supEditor.supervisedAt" placeholder="yyyy-MM-dd HH:mm:ss" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="标题" required>
          <a-input v-model:value="supEditor.supervisionTitle" />
        </a-form-item>
        <a-form-item label="督导人">
          <TeacherSelector
            :value="supEditor.supervisorUserId || null"
            @change="handleSupSupervisorChange"
          />
        </a-form-item>
        <a-form-item label="督导摘要">
          <a-textarea v-model:value="supEditor.summary" :rows="3" />
        </a-form-item>
        <a-form-item label="发现的问题">
          <a-textarea v-model:value="supEditor.findings" :rows="4" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="结论">
              <a-select v-model:value="supEditor.conclusion" allow-clear>
                <a-select-option v-for="c in supConclusionOptions" :key="c.value" :value="c.value">
                  {{ c.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="关联归档">
              <ArchiveSelector
                :value="supEditor.archiveId || null"
                @change="handleSupArchiveChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">关联业务对象（可选）</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="关联问题">
              <AuditIssueSelector
                :value="supEditor.auditIssueId || null"
                @change="handleSupAuditIssueChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="关联整改任务">
              <AuditRectificationSelector
                :value="supEditor.rectificationId || null"
                :audit-issue-id="supEditor.auditIssueId || null"
                @change="handleSupRectificationChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="所属专业">
              <ProgramSelector
                :value="supEditor.programId || null"
                @change="handleSupProgramChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="培养方案">
              <TrainingPlanSelector
                :value="supEditor.trainingPlanId || null"
                :program-id="supEditor.programId || null"
                @change="handleSupTrainingPlanChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="质量评价课程">
              <CourseSelector
                :value="supEditor.qualityCourseId || null"
                :program-id="supEditor.programId || null"
                :training-plan-id="supEditor.trainingPlanId || null"
                @change="handleSupCourseChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="证据锚点">
          <a-textarea
            v-model:value="supEditor.evidenceAnchors"
            :rows="3"
            placeholder="JSON 数组，引用证据文件 / 业务对象等"
            class="iwb__monospace"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.iwb {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-meta {
    font-size: 13px;
    color: var(--dp-text-muted, #64748b);
  }

  &__context-strong {
    color: var(--dp-text-primary, #0f172a);
    font-weight: 500;
  }

  &__context-muted {
    color: var(--dp-text-muted, #94a3b8);
    font-style: italic;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__tabs {
    :deep(.ant-tabs-nav) {
      margin-bottom: 12px;
    }
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
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
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 160px;

    &--xs {
      width: 130px;
    }
  }

  &__empty {
    margin-top: 32px;
  }

  &__sub-desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__muted {
    color: var(--dp-text-muted, #94a3b8);
  }

  &__evidence-pre {
    margin: 0;
    padding: 8px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    background: var(--dp-gray-50, #f8fafc);
    border-radius: 4px;
    max-height: 240px;
    overflow: auto;
  }

  &__monospace {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}
</style>
