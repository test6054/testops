<script setup lang="ts">
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { QualityAuditEvidenceItem } from '@/apis/quality/audit-evidence'
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
  AuditIssueQueryRequest,
  AuditIssueSaveRequest,
  AuditIssueSeverity,
  AuditIssueSource,
  AuditIssueVO,
} from '@/apis/quality/audit-issue'
import type {
  AuditRectificationQueryRequest,
  AuditRectificationSaveRequest,
  AuditRectificationVO,
} from '@/apis/quality/audit-rectification'
import type {
  AuditSupervisionConclusion,
  AuditSupervisionFindingItem,
  AuditSupervisionQueryRequest,
  AuditSupervisionSaveRequest,
  AuditSupervisionScope,
  AuditSupervisionVO,
} from '@/apis/quality/audit-supervision'
import type {
  ImprovementTaskQueryRequest,
  ImprovementTaskSaveRequest,
  ImprovementTaskVO,
} from '@/apis/quality/improvement-task'
import type {
  AuditIssueStatus,
  AuditRectificationStatus,
  AuditSupervisionType,
  ImprovementTaskStatus,
} from '@/apis/quality/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { aiTaskTriggerApi } from '@/apis/quality/ai-task-trigger'
import { auditIssueApi } from '@/apis/quality/audit-issue'
import { auditRectificationApi } from '@/apis/quality/audit-rectification'
import { auditSupervisionApi } from '@/apis/quality/audit-supervision'
import { improvementTaskApi } from '@/apis/quality/improvement-task'
import {
  AUDIT_ISSUE_STATUS_COLOR,
  AUDIT_ISSUE_STATUS_LABEL,
  AUDIT_RECTIFICATION_STATUS_COLOR,
  AUDIT_RECTIFICATION_STATUS_LABEL,
  AUDIT_SUPERVISION_TYPE_LABEL,
  IMPROVEMENT_TASK_STATUS_COLOR,
  IMPROVEMENT_TASK_STATUS_LABEL,
} from '@/apis/quality/types'
import ImprovementWorkbenchPanel from '@/components/quality/improvement/ImprovementWorkbenchPanel.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
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
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopeReload } from '@/composables/useQualityPageScope'
import { useAiTaskStore } from '@/stores/modules/aiTask'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError, toUserError } from '@/utils/error-handler'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'
import { promptModal } from './_helpers'

const improvementColumns: ColumnsType = [
  { title: '编号', dataIndex: 'taskCode', key: 'taskCode', width: 160 },
  { title: '标题', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '关联课程', key: 'qualityCourseRef', width: 120 },
  { title: '负责人', key: 'ownerRef', width: 120 },
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
  { title: '责任人', key: 'ownerRef', width: 140 },
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
const workbenchLoadError = ref<Error | null>(null)
const aiTaskStore = useAiTaskStore()

const activeTab = ref<'improvement' | 'issue' | 'rectification' | 'supervision'>('improvement')

function improvementStatusLabel(value: ImprovementTaskStatus): string {
  return strictEnumLabel(IMPROVEMENT_TASK_STATUS_LABEL, value, '持续改进任务状态')
}

function improvementStatusColor(value: ImprovementTaskStatus): BadgeTone {
  return strictEnumTone(IMPROVEMENT_TASK_STATUS_COLOR, value, '持续改进任务状态')
}

function issueStatusLabel(value: AuditIssueStatus): string {
  return strictEnumLabel(AUDIT_ISSUE_STATUS_LABEL, value, '审核问题状态')
}

function issueStatusColor(value: AuditIssueStatus): BadgeTone {
  return strictEnumTone(AUDIT_ISSUE_STATUS_COLOR, value, '审核问题状态')
}

function rectificationStatusLabel(value: AuditRectificationStatus): string {
  return strictEnumLabel(AUDIT_RECTIFICATION_STATUS_LABEL, value, '整改任务状态')
}

function rectificationStatusColor(value: AuditRectificationStatus): BadgeTone {
  return strictEnumTone(AUDIT_RECTIFICATION_STATUS_COLOR, value, '整改任务状态')
}

function supervisionTypeLabel(value: AuditSupervisionType): string {
  return strictEnumLabel(AUDIT_SUPERVISION_TYPE_LABEL, value, '督导类型')
}

function issueSourceLabel(value: AuditIssueSource): string {
  return strictEnumLabel(issueSourceLabelMap, value, '审核问题来源')
}

function severityLabel(value: AuditIssueSeverity): string {
  return strictEnumLabel(severityLabelMap, value, '审核问题严重度')
}

function severityColor(value: AuditIssueSeverity): BadgeTone {
  return strictEnumTone(severityColorMap, value, '审核问题严重度')
}

function supervisionScopeLabel(value: AuditSupervisionScope): string {
  return strictEnumLabel(supScopeLabelMap, value, '督导范围')
}

function supervisionConclusionLabel(value: AuditSupervisionConclusion): string {
  return strictEnumLabel(supConclusionLabelMap, value, '督导结论')
}

function supervisionConclusionColor(value: AuditSupervisionConclusion): BadgeTone {
  return strictEnumTone(supConclusionColorMap, value, '督导结论')
}

function selectedId(value: string | null | undefined): string {
  return value ?? ''
}

function normalizeTextareaLineItems(value: string | null | undefined): string[] {
  if (typeof value !== 'string') return []
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function handleImprovementOwnerChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    showUserError(null, '负责人只能单选，请重新选择')
    return
  }
  improvementEditor.ownerUserId = value ?? ''
}

function handleImprovementProgramChange(value: string | null | undefined) {
  improvementEditor.programId = selectedId(value)
  improvementEditor.qualityCourseId = ''
  improvementEditor.achievementResultId = ''
}

function handleImprovementCourseChange(value: string | null | undefined) {
  improvementEditor.qualityCourseId = selectedId(value)
}

function handleImprovementQueryCourseChange(value: string | null | undefined) {
  improvementFilterForm.qualityCourseId = selectedId(value)
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

function handleIssueRaisedByChange(value: string | string[] | null | undefined) {
  issueEditor.raisedBy = Array.isArray(value) ? '' : selectedId(value)
}

function handleRectQueryAuditIssueChange(value: string | null | undefined) {
  rectFilterForm.auditIssueId = value ?? undefined
}

function handleRectEditorAuditIssueChange(value: string | null | undefined) {
  rectEditor.auditIssueId = selectedId(value)
}

function handleRectEditorOwnerChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    showUserError(null, '整改责任人只能单选，请重新选择')
    return
  }
  rectEditor.ownerUserId = value ?? ''
}

function handleSupSupervisorChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    showUserError(null, '督导人只能单选，请重新选择')
    return
  }
  supEditor.supervisorUserId = value ?? ''
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

type QualitySelectorChangeValue = string | null

function createRectEvidenceArchiveChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleRectEvidenceArchiveChange(index, value)
}

function createRectEvidenceReportChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleRectEvidenceReportChange(index, value)
}

function createSupEvidenceArchiveChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleSupEvidenceArchiveChange(index, value)
}

function createSupEvidenceReportChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleSupEvidenceReportChange(index, value)
}

function handleRectEvidenceArchiveChange(index: number, value: QualitySelectorChangeValue) {
  rectEvidenceEditor.evidenceItems[index].archiveId = selectedId(value)
}

function handleRectEvidenceReportChange(index: number, value: QualitySelectorChangeValue) {
  rectEvidenceEditor.evidenceItems[index].reportId = selectedId(value)
}

function handleSupEvidenceArchiveChange(index: number, value: QualitySelectorChangeValue) {
  supEditor.evidenceItems[index].archiveId = selectedId(value)
}

function handleSupEvidenceReportChange(index: number, value: QualitySelectorChangeValue) {
  supEditor.evidenceItems[index].reportId = selectedId(value)
}

/* ========== Tab 1: 改进任务 ========== */

const improvementList = ref<ImprovementTaskVO[]>([])
const improvementTotal = ref(0)
const improvementLoading = ref(false)
const improvementQuery = reactive<ImprovementTaskQueryRequest>({
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
  { value: 'CLOSED', label: IMPROVEMENT_TASK_STATUS_LABEL.CLOSED },
  { value: 'RETURNED', label: IMPROVEMENT_TASK_STATUS_LABEL.RETURNED },
]

const improvementFilterForm = reactive({
  qualityCourseId: '',
  ownerUserId: '',
  status: undefined as ImprovementTaskStatus | undefined,
  keyword: '',
})

const improvementFilterFields: FilterField[] = [
  {
    key: 'qualityCourseId',
    type: 'custom',
    label: '关联课程',
    width: 160,
    minWidth: 160,
    maxWidth: 220,
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: improvementStatusOptions,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '编号 / 标题',
    width: 180,
    triggerSearchOnChange: false,
  },
]

function syncImprovementFilterToQuery() {
  improvementQuery.qualityCourseId = improvementFilterForm.qualityCourseId
  improvementQuery.ownerUserId = improvementFilterForm.ownerUserId
  improvementQuery.status = improvementFilterForm.status
  improvementQuery.keyword = improvementFilterForm.keyword
}

function handleImprovementFilterSearch() {
  improvementQuery.pageNum = 1
  syncImprovementFilterToQuery()
  loadImprovementList()
}

const improvementEditorVisible = ref(false)
const improvementEditorMode = ref<'create' | 'edit'>('create')
const improvementEditor = reactive<ImprovementTaskSaveRequest>({
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
  workbenchLoadError.value = null
  try {
    const page = await improvementTaskApi.page({
      ...improvementQuery,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      qualityCourseId: improvementQuery.qualityCourseId || undefined,
      ownerUserId: improvementQuery.ownerUserId || undefined,
      status: improvementQuery.status || undefined,
      keyword: improvementQuery.keyword?.trim() || undefined,
    })
    improvementList.value = readPageList(page, '持续改进任务加载失败，请稍后重试')
    improvementQuery.pageNum = page.pageNum
    improvementQuery.pageSize = page.pageSize
    improvementTotal.value = readPageTotal(page, '持续改进任务加载失败，请稍后重试')
    if (improvementList.value.length === 0 && improvementTotal.value > 0 && improvementQuery.pageNum > 1) {
      improvementQuery.pageNum -= 1
      await loadImprovementList()
    }
  } catch (error) {
    workbenchLoadError.value = toUserError(error, '持续改进任务加载失败')
    showUserError(error, '持续改进任务加载失败')
  } finally {
    improvementLoading.value = false
  }
}

function handleImprovementPageChange(page: { current: number, pageSize: number }) {
  improvementQuery.pageNum = page.current
  improvementQuery.pageSize = page.pageSize
  loadImprovementList()
}

function resetImprovementQuery() {
  improvementQuery.pageNum = 1
  syncImprovementFilterToQuery()
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
  if (!canEditImprovementTask(record.status)) {
    message.error('当前状态不允许编辑改进任务')
    return
  }
  improvementEditorMode.value = 'edit'
  Object.assign(improvementEditor, {
    id: record.id,
    taskCode: record.taskCode,
    taskTitle: record.taskTitle,
    problemSummary: record.problemSummary,
    proposedAction: record.proposedAction,
    programId: record.programId,
    trainingPlanId: record.trainingPlanId || '',
    qualityCourseId: record.qualityCourseId || '',
    achievementResultId: record.achievementResultId || '',
    reportId: record.reportId || '',
    ownerUserId: record.ownerUserId,
    ownerRole: record.ownerRole || '',
    dueDate: record.dueDate,
  })
  improvementEditorVisible.value = true
}

async function submitImprovementEditor() {
  if (improvementEditorMode.value === 'edit' && improvementEditor.id) {
    const current = improvementList.value.find((item) => item.id === improvementEditor.id)
    if (current && !canEditImprovementTask(current.status)) {
      message.error('当前状态不允许编辑改进任务')
      return
    }
  }
  if (
    !improvementEditor.taskTitle.trim()
    || !improvementEditor.problemSummary.trim()
    || !improvementEditor.proposedAction.trim()
    || !improvementEditor.programId
    || !improvementEditor.ownerUserId
    || !improvementEditor.dueDate
  ) {
    message.error('请填写标题、问题概述、改进措施、专业、负责人和截止日期')
    return
  }
  improvementEditorSubmitting.value = true
  try {
    const request: ImprovementTaskSaveRequest = {
      id: improvementEditor.id,
      programId: improvementEditor.programId,
      trainingPlanId:
        improvementEditor.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
      taskCode: improvementEditor.taskCode?.trim() || undefined,
      taskTitle: improvementEditor.taskTitle.trim(),
      problemSummary: improvementEditor.problemSummary.trim(),
      proposedAction: improvementEditor.proposedAction.trim(),
      qualityCourseId: improvementEditor.qualityCourseId || undefined,
      achievementResultId: improvementEditor.achievementResultId || undefined,
      reportId: improvementEditor.reportId || undefined,
      ownerUserId: improvementEditor.ownerUserId,
      ownerRole: improvementEditor.ownerRole || undefined,
      dueDate: improvementEditor.dueDate,
    }
    if (improvementEditorMode.value === 'create') {
      await improvementTaskApi.create(request)
      message.success('改进任务已创建')
    } else {
      await improvementTaskApi.update(request)
      message.success('已保存修改')
    }
    improvementEditorVisible.value = false
    await loadImprovementList()
  } finally {
    improvementEditorSubmitting.value = false
  }
}

function nextImprovementStatuses(status: ImprovementTaskStatus) {
  return strictEnumValue(improvementTransitMap, status, '持续改进任务状态')
}

function canEditImprovementTask(status: ImprovementTaskStatus): boolean {
  return status === 'OPEN' || status === 'RETURNED'
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
    title: `${improvementStatusLabel(record.status)} → ${improvementStatusLabel(to)}`,
    placeholder: to === 'SUBMITTED' ? '整改进度说明（提交时必填）' : '进度备注（可选）',
    required: false,
    okType: 'primary',
  })
  if (remark === null) return
  let rectificationEvidenceItems: string[] | undefined
  if (to === 'SUBMITTED') {
    const evidenceText = await promptModal({
      title: '填写整改证据说明',
      placeholder: '每行填写一条证据，例如：已上传课程考核分析表',
      required: true,
      emptyErrorMessage: '提交复评必须填写整改证据',
      okType: 'primary',
    })
    if (evidenceText === null) return
    if (!evidenceText) return
    rectificationEvidenceItems = normalizeTextareaLineItems(evidenceText)
  }
  await improvementTaskApi.transitStatus({
    id: record.id,
    targetStatus: to,
    progressRemark: remark || undefined,
    rectificationEvidenceItems,
  })
  message.success('流转成功')
  await loadImprovementList()
}

async function handleImprovementAiSuggestion(record: ImprovementTaskVO) {
  if (!record.achievementResultId) {
    message.error('生成 AI 改进草稿需要先关联达成度计算结果')
    return
  }
  const achievementResultId = record.achievementResultId
  void confirmAsync({
    title: '为该改进任务生成 AI 改进草稿？',
    content: '将提交改进草稿生成任务，完成后可在 AI 任务中心查看结果',
    type: 'info',
    onOk: async () => {
      const res = await aiTaskTriggerApi.submit({
        taskType: 'IMPROVEMENT_SUGGESTION_GENERATE',
        businessType: 'ACHIEVEMENT_RESULT',
        businessId: achievementResultId,
        trainingPlanId: record.trainingPlanId,
        programId: record.programId,
        qualityCourseId: record.qualityCourseId,
        achievementResultId,
      })
      message.success('已提交 AI 改进草稿任务')
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

const issueSourceOptions = [
  { value: 'SELF_AUDIT', label: '自评自查' },
  { value: 'EXPERT_AUDIT', label: '专家审核' },
  { value: 'ACCREDITATION_AUDIT', label: '认证审核' },
  { value: 'EXTERNAL_INSPECTION', label: '外部检查' },
]
const issueSourceLabelMap: Record<AuditIssueSource, string> = {
  SELF_AUDIT: '自评自查',
  EXPERT_AUDIT: '专家审核',
  ACCREDITATION_AUDIT: '认证审核',
  EXTERNAL_INSPECTION: '外部检查',
}
const severityOptions = [
  { value: 'MINOR', label: '轻微' },
  { value: 'MAJOR', label: '严重' },
  { value: 'CRITICAL', label: '重大' },
]
const severityLabelMap: Record<AuditIssueSeverity, string> = {
  MINOR: '轻微',
  MAJOR: '严重',
  CRITICAL: '重大',
}
const severityColorMap: Record<AuditIssueSeverity, BadgeTone> = {
  MINOR: 'gray',
  MAJOR: 'orange',
  CRITICAL: 'red',
}
const issueStatusOptions: AuditIssueStatus[] = [
  'OPEN',
  'IN_RECTIFICATION',
  'RECTIFIED',
  'VERIFIED',
  'CLOSED',
]

const issueFilterForm = reactive({
  issueSource: undefined as AuditIssueSource | undefined,
  severity: undefined as AuditIssueSeverity | undefined,
  status: undefined as AuditIssueStatus | undefined,
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
    options: severityOptions,
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
  loadIssueList()
}

const issueTransitMap: Record<AuditIssueStatus, AuditIssueStatus[]> = {
  OPEN: ['IN_RECTIFICATION'],
  IN_RECTIFICATION: ['RECTIFIED'],
  RECTIFIED: ['VERIFIED'],
  VERIFIED: ['CLOSED'],
  CLOSED: [],
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
  issueSource: 'SELF_AUDIT',
  severity: 'MINOR',
  auditRound: '',
  auditYear: '',
  raisedBy: '',
  raisedAt: '',
})
const issueEditorSubmitting = ref(false)
const issueRectificationCount = ref<Map<string, number>>(new Map())

function hasLinkedRectification(issueId: string): boolean {
  return (issueRectificationCount.value.get(issueId) ?? 0) > 0
}

async function refreshIssueRectificationCounts() {
  const scopedIssues = await readAllPages(
    pageNum => auditIssueApi.page({
      pageNum,
      pageSize: 100,
      programId: issueQuery.programId || qualityStore.currentProgramId || undefined,
      trainingPlanId: issueQuery.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
    }),
    '审核评估问题加载失败，请稍后重试',
  )
  const scopedIssueIds = new Set(scopedIssues.map(issue => issue.id))
  const rects = await readAllPages(
    pageNum => auditRectificationApi.page({
      pageNum,
      pageSize: 100,
    }),
    '整改任务加载失败，请稍后重试',
  )
  const countMap = new Map<string, number>()
  for (const rect of rects) {
    if (!rect.auditIssueId || !scopedIssueIds.has(rect.auditIssueId)) continue
    countMap.set(rect.auditIssueId, (countMap.get(rect.auditIssueId) ?? 0) + 1)
  }
  issueRectificationCount.value = countMap
}

async function loadIssueList() {
  issueLoading.value = true
  try {
    const page = await auditIssueApi.page({
      ...issueQuery,
      programId: issueQuery.programId || qualityStore.currentProgramId || undefined,
      trainingPlanId: issueQuery.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
      keyword: issueQuery.keyword?.trim() || undefined,
    })
    issueList.value = readPageList(page, '审核评估问题加载失败，请稍后重试')
    issueQuery.pageNum = page.pageNum
    issueQuery.pageSize = page.pageSize
    issueTotal.value = readPageTotal(page, '审核评估问题加载失败，请稍后重试')
    if (issueList.value.length === 0 && issueTotal.value > 0 && issueQuery.pageNum > 1) {
      issueQuery.pageNum -= 1
      await loadIssueList()
      return
    }
    await refreshIssueRectificationCounts()
  } finally {
    issueLoading.value = false
  }
}

function handleIssuePageChange(page: { current: number, pageSize: number }) {
  issueQuery.pageNum = page.current
  issueQuery.pageSize = page.pageSize
  loadIssueList()
}

function resetIssueQuery() {
  issueQuery.pageNum = 1
  issueQuery.programId = undefined
  issueQuery.trainingPlanId = undefined
  issueQuery.qualityCourseId = undefined
  syncIssueFilterToQuery()
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
  if (!canEditAuditIssue(record.status)) {
    message.error('当前状态不允许编辑审核问题')
    return
  }
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
  if (issueEditorMode.value === 'edit' && issueEditor.id) {
    const current = issueList.value.find((item) => item.id === issueEditor.id)
    if (current && !canEditAuditIssue(current.status)) {
      message.error('当前状态不允许编辑审核问题')
      return
    }
  }
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
      raisedBy: issueEditor.raisedBy || undefined,
      raisedAt: issueEditor.raisedAt || undefined,
    }
    if (issueEditorMode.value === 'create') {
      await auditIssueApi.create(request)
      message.success('已登记')
    } else {
      await auditIssueApi.update(request)
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

function canEditAuditIssue(status: AuditIssueStatus): boolean {
  return status === 'OPEN' || status === 'IN_RECTIFICATION'
}

function nextAuditIssueStatuses(status: AuditIssueStatus): AuditIssueStatus[] {
  return strictEnumValue(issueTransitMap, status, '审核问题状态')
}

async function changeIssueStatus(record: AuditIssueVO, target: AuditIssueStatus) {
  await auditIssueApi.transitStatus(record.id, target)
  message.success(`已切换到「${issueStatusLabel(target)}」`)
  await loadIssueList()
}

function handleIssueStatusMenuClick(record: AuditIssueVO, event: MenuInfo) {
  if (typeof event.key !== 'string') {
    showUserError(null, '状态切换无效，请重新操作')
    return
  }
  if (!nextAuditIssueStatuses(record.status).includes(event.key as AuditIssueStatus)) {
    showUserError(null, `当前状态无法切换到「${issueStatusLabel(event.key as AuditIssueStatus)}」`)
    return
  }
  changeIssueStatus(record, event.key as AuditIssueStatus)
}

/* ========== Tab 3: 整改任务台账 ========== */

const rectList = ref<AuditRectificationVO[]>([])
const rectTotal = ref(0)
const rectLoading = ref(false)
const rectIssuesCache = ref<Map<string, AuditIssueVO>>(new Map())
const rectQuery = reactive<AuditRectificationQueryRequest>({
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

const rectFilterForm = reactive({
  status: undefined as AuditRectificationStatus | undefined,
  auditIssueId: undefined as string | undefined,
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
  loadRectList()
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
const rectEvidenceEditorVisible = ref(false)
const rectEvidenceEditorSubmitting = ref(false)
const rectEvidenceEditorRecord = ref<AuditRectificationVO | null>(null)
const rectEvidenceEditor = reactive<{
  progressRemark: string
  evidenceItems: QualityAuditEvidenceItem[]
}>({
  progressRemark: '',
  evidenceItems: [],
})

const auditEvidenceTypeOptions = [
  { value: 'COURSE_ARCHIVE', label: '课程归档' },
  { value: 'ASSESSMENT_REPORT', label: '评价报告' },
  { value: 'REVIEW_RECORD', label: '复核记录' },
  { value: 'SUPPORTING_FILE', label: '支撑材料' },
  { value: 'OTHER', label: '其他' },
]

async function loadRectList() {
  rectLoading.value = true
  try {
    const page = await auditRectificationApi.page({
      ...rectQuery,
      keyword: rectQuery.keyword?.trim() || undefined,
    })
    rectList.value = readPageList(page, '整改任务加载失败，请稍后重试')
    rectQuery.pageNum = page.pageNum
    rectQuery.pageSize = page.pageSize
    rectTotal.value = readPageTotal(page, '整改任务加载失败，请稍后重试')
    if (rectList.value.length === 0 && rectTotal.value > 0 && rectQuery.pageNum > 1) {
      rectQuery.pageNum -= 1
      await loadRectList()
      return
    }
    const issueIds = Array.from(new Set(rectList.value.map((r) => r.auditIssueId).filter(Boolean)))
    for (const id of issueIds) {
      if (rectIssuesCache.value.has(id)) continue
      const issue = await auditIssueApi.detail(id)
      rectIssuesCache.value.set(id, issue)
    }
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
  loadRectList()
}

function resetRectQuery() {
  rectQuery.pageNum = 1
  rectQuery.ownerUserId = undefined
  syncRectFilterToQuery()
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
  if (!canEditAuditRectification(record.status)) {
    message.error('当前状态不允许编辑整改任务')
    return
  }
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
  if (rectEditorMode.value === 'edit' && rectEditor.id) {
    const current = rectList.value.find((item) => item.id === rectEditor.id)
    if (current && !canEditAuditRectification(current.status)) {
      message.error('当前状态不允许编辑整改任务')
      return
    }
  }
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
    const request: AuditRectificationSaveRequest = {
      ...rectEditor,
      rectificationCode: rectEditor.rectificationCode.trim(),
      rectificationTitle: rectEditor.rectificationTitle.trim(),
      ownerRole: rectEditor.ownerRole || undefined,
    }
    if (rectEditorMode.value === 'create') {
      await auditRectificationApi.create(request)
      message.success('已创建')
    } else {
      await auditRectificationApi.update(request)
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

function canEditAuditRectification(status: AuditRectificationStatus): boolean {
  return status === 'PLANNED' || status === 'IN_PROGRESS' || status === 'RETURNED'
}

function addRectEvidenceItem() {
  rectEvidenceEditor.evidenceItems.push({
    evidenceType: 'REVIEW_RECORD',
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
    message.error('请填写提交说明')
    return
  }
  if (!rectEvidenceEditor.evidenceItems.length) {
    message.error('请至少新增一条整改证据')
    return
  }
  for (const [index, item] of rectEvidenceEditor.evidenceItems.entries()) {
    if (!item.evidenceTitle?.trim()) {
      message.error(`第 ${index + 1} 条证据缺少标题`)
      return
    }
  }
  rectEvidenceEditorSubmitting.value = true
  try {
    await auditRectificationApi.updateProgress({
      id: record.id,
      targetStatus: 'SUBMITTED',
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
    message.success('已提交复核')
    rectEvidenceEditorVisible.value = false
    rectEvidenceEditorRecord.value = null
    await loadRectList()
  } finally {
    rectEvidenceEditorSubmitting.value = false
  }
}

async function advanceRectProgress(
  record: AuditRectificationVO,
  target: 'IN_PROGRESS' | 'SUBMITTED',
) {
  if (target === 'SUBMITTED') {
    rectEvidenceEditorRecord.value = record
    rectEvidenceEditor.progressRemark = ''
    rectEvidenceEditor.evidenceItems.splice(0, rectEvidenceEditor.evidenceItems.length, {
      evidenceType: 'REVIEW_RECORD',
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
  const remark = await promptModal({
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
  await auditRectificationApi.verify({
    id: record.id,
    decision,
    remark: remark ?? undefined,
  })
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
const supQuery = reactive<AuditSupervisionQueryRequest>({
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
const supScopeLabelMap: Record<AuditSupervisionScope, string> = {
  COURSE: '课程',
  PROGRAM: '专业',
  TRAINING_PLAN: '培养方案',
  COMPREHENSIVE: '综合',
}
const supConclusionOptions: Array<{
  value: AuditSupervisionConclusion
  label: string
  color: string
}> = [
  { value: 'PASS', label: '通过', color: 'green' },
  { value: 'NEEDS_IMPROVEMENT', label: '需改进', color: 'orange' },
  { value: 'FAIL', label: '不通过', color: 'red' },
]

const supFilterForm = reactive({
  supervisionType: undefined as AuditSupervisionType | undefined,
  conclusion: undefined as AuditSupervisionConclusion | undefined,
  keyword: '',
})

const supFilterFields: FilterField[] = [
  {
    key: 'supervisionType',
    type: 'select',
    label: '类型',
    placeholder: '类型',
    allowClear: true,
    width: 120,
    options: supervisionTypeOptions,
  },
  {
    key: 'conclusion',
    type: 'select',
    label: '结论',
    placeholder: '结论',
    allowClear: true,
    width: 120,
    options: supConclusionOptions.map((item) => ({ value: item.value, label: item.label })),
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

function syncSupFilterToQuery() {
  supQuery.supervisionType = supFilterForm.supervisionType
  supQuery.conclusion = supFilterForm.conclusion
  supQuery.keyword = supFilterForm.keyword
}

function handleSupFilterSearch() {
  supQuery.pageNum = 1
  syncSupFilterToQuery()
  loadSupList()
}
const supConclusionLabelMap: Record<AuditSupervisionConclusion, string> = {
  PASS: '通过',
  NEEDS_IMPROVEMENT: '需改进',
  FAIL: '不通过',
}
const supConclusionColorMap: Record<AuditSupervisionConclusion, BadgeTone> = {
  PASS: 'green',
  NEEDS_IMPROVEMENT: 'orange',
  FAIL: 'red',
}
const supFindingTypeOptions = [
  { value: 'PROCESS', label: '过程执行' },
  { value: 'MATERIAL', label: '材料支撑' },
  { value: 'OUTCOME', label: '结果达成' },
  { value: 'GOVERNANCE', label: '治理闭环' },
  { value: 'OTHER', label: '其他' },
]
const supFindingSeverityOptions = [
  { value: 'MINOR', label: '轻微' },
  { value: 'MAJOR', label: '严重' },
  { value: 'CRITICAL', label: '重大' },
]

const supEditorVisible = ref(false)
const supEditorMode = ref<'create' | 'edit'>('create')
type AuditSupervisionEditorState = AuditSupervisionSaveRequest & {
  findingItems: AuditSupervisionFindingItem[]
  evidenceItems: QualityAuditEvidenceItem[]
}

const supEditor = reactive<AuditSupervisionEditorState>({
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
  findingItems: [],
  conclusion: undefined,
  archiveId: '',
  evidenceItems: [],
})
const supEditorSubmitting = ref(false)

function addSupervisionFindingItem() {
  supEditor.findingItems.push({
    findingType: 'PROCESS',
    findingTitle: '',
    findingDescription: '',
    severity: 'MINOR',
    responsibleUnit: '',
    improvementSuggestion: '',
  })
}

function removeSupervisionFindingItem(index: number) {
  supEditor.findingItems.splice(index, 1)
}

function addSupervisionEvidenceItem() {
  supEditor.evidenceItems.push({
    evidenceType: 'REVIEW_RECORD',
    evidenceTitle: '',
    evidenceCode: '',
    archiveId: '',
    fileNodeId: '',
    reportId: '',
    remark: '',
  })
}

function removeSupervisionEvidenceItem(index: number) {
  supEditor.evidenceItems.splice(index, 1)
}

async function loadSupList() {
  supLoading.value = true
  try {
    const page = await auditSupervisionApi.page({
      ...supQuery,
      programId: supQuery.programId || qualityStore.currentProgramId || undefined,
      keyword: supQuery.keyword?.trim() || undefined,
    })
    supList.value = readPageList(page, '督导复查记录加载失败，请稍后重试')
    supQuery.pageNum = page.pageNum
    supQuery.pageSize = page.pageSize
    supTotal.value = readPageTotal(page, '督导复查记录加载失败，请稍后重试')
    if (supList.value.length === 0 && supTotal.value > 0 && supQuery.pageNum > 1) {
      supQuery.pageNum -= 1
      await loadSupList()
    }
  } finally {
    supLoading.value = false
  }
}

function handleSupPageChange(page: { current: number, pageSize: number }) {
  supQuery.pageNum = page.current
  supQuery.pageSize = page.pageSize
  loadSupList()
}

function resetSupQuery() {
  supQuery.pageNum = 1
  supQuery.programId = undefined
  syncSupFilterToQuery()
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
    findingItems: [],
    conclusion: '',
    archiveId: '',
    evidenceItems: [],
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
    supervisionScope: record.supervisionScope || '',
    supervisorUserId: record.supervisorUserId || '',
    supervisedAt: record.supervisedAt || '',
    summary: record.summary || '',
    findingItems: record.findingItems?.map((item) => ({ ...item })) || [],
    conclusion: record.conclusion || '',
    archiveId: record.archiveId || '',
    evidenceItems: record.evidenceItems?.map((item) => ({ ...item })) || [],
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
  for (const [index, item] of supEditor.findingItems.entries()) {
    if (!item.findingTitle?.trim()) {
      message.error(`第 ${index + 1} 条发现缺少标题`)
      return
    }
  }
  for (const [index, item] of supEditor.evidenceItems.entries()) {
    if (!item.evidenceTitle?.trim()) {
      message.error(`第 ${index + 1} 条证据缺少标题`)
      return
    }
  }
  supEditorSubmitting.value = true
  try {
    const request: AuditSupervisionSaveRequest = {
      id: supEditor.id,
      supervisionCode: supEditor.supervisionCode.trim(),
      supervisionTitle: supEditor.supervisionTitle.trim(),
      supervisionType: supEditor.supervisionType,
      auditIssueId: supEditor.auditIssueId || undefined,
      rectificationId: supEditor.rectificationId || undefined,
      programId: supEditor.programId || undefined,
      trainingPlanId: supEditor.trainingPlanId || undefined,
      qualityCourseId: supEditor.qualityCourseId || undefined,
      supervisionScope: supEditor.supervisionScope || undefined,
      supervisorUserId: supEditor.supervisorUserId || undefined,
      supervisedAt: supEditor.supervisedAt || undefined,
      summary: supEditor.summary || undefined,
      findingItems: supEditor.findingItems.map((item) => ({
        findingType: item.findingType || undefined,
        findingTitle: item.findingTitle?.trim(),
        findingDescription: item.findingDescription?.trim() || undefined,
        severity: item.severity || undefined,
        responsibleUnit: item.responsibleUnit?.trim() || undefined,
        improvementSuggestion: item.improvementSuggestion?.trim() || undefined,
      })),
      conclusion: supEditor.conclusion || undefined,
      archiveId: supEditor.archiveId || undefined,
      evidenceItems: supEditor.evidenceItems.map((item) => ({
        evidenceType: item.evidenceType || undefined,
        evidenceTitle: item.evidenceTitle?.trim(),
        evidenceCode: item.evidenceCode?.trim() || undefined,
        archiveId: item.archiveId || undefined,
        fileNodeId: item.fileNodeId || undefined,
        reportId: item.reportId || undefined,
        remark: item.remark?.trim() || undefined,
      })),
    }
    if (supEditorMode.value === 'create') {
      await auditSupervisionApi.create(request)
      message.success('已创建')
    } else {
      await auditSupervisionApi.update(request)
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
    improvementBuckets[t.status] += 1
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

watch(activeTab, async (tab) => {
  if (tab === 'improvement') await loadImprovementList()
  else if (tab === 'issue') await loadIssueList()
  else if (tab === 'rectification') await loadRectList()
  else if (tab === 'supervision') await loadSupList()
})

async function handleScopeChange(): Promise<void> {
  workbenchLoadError.value = null
  await Promise.all([loadImprovementList(), loadIssueList(), loadRectList(), loadSupList()])
}

useQualityScopeReload(handleScopeChange)

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setTrainingPlan(qualityStore.trainingPlanOptions[0].id)
    }
  }
  await handleScopeChange()
})

onActivated(async () => {
  await handleScopeChange()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar />
    </template>

    <SignalBand :metrics="signals" compact class="iwb__signals" />

    <a-tabs v-model:active-key="activeTab" class="iwb__tabs">
      <!-- Tab 1: 改进任务 -->
      <a-tab-pane key="improvement" tab="改进任务">
        <ImprovementWorkbenchPanel
          title="改进任务台账"
          :empty="!qualityStore.currentTrainingPlanId"
        >
          <template #extra>
            <UiButton
              variant="primary"
              size="sm"
              :disabled="!qualityStore.currentTrainingPlanId"
              @click="openImprovementCreate"
            >
              新建改进任务
            </UiButton>
          </template>

          <UiFilterBar
            v-model="improvementFilterForm"
            :fields="improvementFilterFields"
            show-labels
            search-text="查询"
            @search="handleImprovementFilterSearch"
            @reset="resetImprovementQuery"
          >
            <template #field-qualityCourseId>
              <CourseSelector
                :value="improvementFilterForm.qualityCourseId || null"
                :training-plan-id="qualityStore.currentTrainingPlanId || null"
                placeholder="关联课程"
                :width="160"
                @change="handleImprovementQueryCourseChange"
              />
            </template>
          </UiFilterBar>

          <UiDataTable
            class="student-detail-table__data-table"
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
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'qualityCourseRef'">
                <template v-if="record.qualityCourseId">
                  {{ record.qualityCourseCode }} {{ record.qualityCourseName }}
                </template>
              </template>
              <template v-else-if="column.key === 'ownerRole'">
                {{ record.ownerRole || '未指定角色' }}
              </template>
              <template v-else-if="column.key === 'ownerRef'">
                {{ record.ownerUserName }}
              </template>
              <template v-else-if="column.key === 'dueDate'">
                {{ record.dueDate }}
              </template>
              <template v-else-if="column.key === 'status'">
                <UiTag :tone="improvementStatusColor(record.status)" size="sm">
                  {{ improvementStatusLabel(record.status) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction @click="openImprovementDetail(record)">详情</UiTextAction>
                  <UiTextAction
                    :disabled="!canEditImprovementTask(record.status)"
                    @click="openImprovementEdit(record)"
                  >
                    编辑
                  </UiTextAction>
                  <UiTextAction
                    v-for="to in nextImprovementStatuses(record.status)"
                    :key="to"
                    :tone="to === 'RETURNED' ? 'danger' : 'primary'"
                    @click="handleImprovementTransit(record, to)"
                  >
                    → {{ improvementStatusLabel(to) }}
                  </UiTextAction>
                  <UiTextAction
                    :disabled="!record.achievementResultId"
                    @click="handleImprovementAiSuggestion(record)"
                  >
                    AI 改进
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.status === 'OPEN'"
                    tone="danger"
                    @click="handleImprovementDelete(record)"
                  >
                    删除
                  </UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </ImprovementWorkbenchPanel>
      </a-tab-pane>

      <!-- Tab 2: 审核评估问题 -->
      <a-tab-pane key="issue" tab="审核评估问题">
        <ImprovementWorkbenchPanel title="审核评估问题清单">
          <template #extra>
            <UiButton variant="primary" size="sm" @click="openIssueCreate">登记问题</UiButton>
          </template>

          <UiFilterBar
            v-model="issueFilterForm"
            :fields="issueFilterFields"
            show-labels
            search-text="查询"
            @search="handleIssueFilterSearch"
            @reset="resetIssueQuery"
          />

          <UiDataTable
            class="student-detail-table__data-table"
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
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'issueTitle'">
                <div>{{ record.issueTitle }}</div>
                <div v-if="record.issueDescription" class="iwb__sub-desc">
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
                <div class="operations-cell" @click.stop>
                  <UiTextAction
                    :disabled="!canEditAuditIssue(record.status)"
                    @click="openIssueEdit(record)"
                  >
                    编辑
                  </UiTextAction>
                  <a-dropdown v-if="nextAuditIssueStatuses(record.status).length">
                    <UiTextAction tone="primary" @click.prevent>状态</UiTextAction>
                    <template #overlay>
                      <a-menu @click="handleIssueStatusMenuClick(record, $event)">
                        <a-menu-item v-for="s in nextAuditIssueStatuses(record.status)" :key="s">
                          {{ issueStatusLabel(s) }}
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <UiTextAction
                    v-if="record.status === 'OPEN' && !hasLinkedRectification(record.id)"
                    tone="danger"
                    @click="handleIssueDelete(record)"
                  >
                    删除
                  </UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </ImprovementWorkbenchPanel>
      </a-tab-pane>

      <!-- Tab 3: 整改任务台账 -->
      <a-tab-pane key="rectification" tab="整改任务台账">
        <ImprovementWorkbenchPanel title="整改任务台账">
          <template #extra>
            <UiButton variant="primary" size="sm" @click="openRectCreate">新建整改任务</UiButton>
          </template>

          <UiFilterBar
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
            class="student-detail-table__data-table"
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
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'rectTitle'">
                <div>{{ record.rectificationTitle }}</div>
                <div v-if="record.auditIssueId" class="iwb__sub-desc">
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
                <div class="operations-cell" @click.stop>
                  <UiTextAction
                    :disabled="!canEditAuditRectification(record.status)"
                    @click="openRectEdit(record)"
                  >
                    编辑
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.status === 'PLANNED'"
                    tone="primary"
                    @click="advanceRectProgress(record, 'IN_PROGRESS')"
                  >
                    开始
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.status === 'IN_PROGRESS'"
                    tone="primary"
                    @click="advanceRectProgress(record, 'SUBMITTED')"
                  >
                    提交复核
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.status === 'RETURNED'"
                    tone="primary"
                    @click="advanceRectProgress(record, 'IN_PROGRESS')"
                  >
                    重新整改
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.status === 'SUBMITTED'"
                    tone="primary"
                    @click="verifyRect(record, 'APPROVED')"
                  >
                    通过
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.status === 'SUBMITTED'"
                    tone="danger"
                    @click="verifyRect(record, 'REJECTED')"
                  >
                    退回
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.status === 'VERIFIED'"
                    tone="primary"
                    @click="closeRect(record)"
                  >
                    闭环
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.status === 'PLANNED'"
                    tone="danger"
                    @click="handleRectDelete(record)"
                  >
                    删除
                  </UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </ImprovementWorkbenchPanel>
      </a-tab-pane>

      <!-- Tab 4: 督导复查 -->
      <a-tab-pane key="supervision" tab="督导复查">
        <ImprovementWorkbenchPanel title="督导复查 / 现场检查">
          <template #extra>
            <UiButton variant="primary" size="sm" @click="openSupCreate">新建督导记录</UiButton>
          </template>

          <UiFilterBar
            v-model="supFilterForm"
            :fields="supFilterFields"
            show-labels
            search-text="查询"
            @search="handleSupFilterSearch"
            @reset="resetSupQuery"
          />

          <UiDataTable
            class="student-detail-table__data-table"
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
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'supTitle'">
                <div>{{ record.supervisionTitle }}</div>
                <div v-if="record.summary" class="iwb__sub-desc">
                  {{ record.summary.substring(0, 80) }}{{ record.summary.length > 80 ? '…' : '' }}
                </div>
              </template>
              <template v-else-if="column.key === 'supervisionType'">
                <UiTag tone="gray" size="sm">{{ supervisionTypeLabel(record.supervisionType) }}</UiTag>
              </template>
              <template v-else-if="column.key === 'supervisionScope'">
                {{ supervisionScopeLabel(record.supervisionScope) }}
              </template>
              <template v-else-if="column.key === 'conclusion'">
                <UiTag
                  v-if="record.conclusion"
                  :tone="supervisionConclusionColor(record.conclusion)"
                  size="sm"
                >
                  {{ supervisionConclusionLabel(record.conclusion) }}
                </UiTag>
                <span v-else class="iwb__muted">未形成结论</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction @click="openSupEdit(record)">编辑</UiTextAction>
                  <UiTextAction tone="danger" @click="handleSupDelete(record)">删除</UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </ImprovementWorkbenchPanel>
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
              <a-input
                v-model:value="improvementEditor.taskCode"
                placeholder="如 IMP-2024-001"
                :disabled="improvementEditorMode === 'edit'"
              />
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
        description="暂无数据"
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
          <UiTag :tone="improvementStatusColor(improvementDetailRecord.status)" size="sm">
            {{ improvementStatusLabel(improvementDetailRecord.status) }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="负责人">
          {{ improvementDetailRecord.ownerUserName }}
        </a-descriptions-item>
        <a-descriptions-item label="角色">
          {{ improvementDetailRecord.ownerRole || '未指定角色' }}
        </a-descriptions-item>
        <a-descriptions-item label="截止">
          {{ improvementDetailRecord.dueDate }}
        </a-descriptions-item>
        <a-descriptions-item label="问题概述">
          {{ improvementDetailRecord.problemSummary }}
        </a-descriptions-item>
        <a-descriptions-item label="改进措施">
          {{ improvementDetailRecord.proposedAction }}
        </a-descriptions-item>
        <a-descriptions-item label="进度备注">
          {{ improvementDetailRecord.progressRemark || '未填写进度备注' }}
        </a-descriptions-item>
        <a-descriptions-item label="整改证据">
          <ul
            v-if="improvementDetailRecord.rectificationEvidenceItems?.length"
            class="iwb__evidence-list"
          >
            <li
              v-for="(item, index) in improvementDetailRecord.rectificationEvidenceItems"
              :key="`${improvementDetailRecord.id}-evidence-${index}`"
              class="iwb__evidence-item"
            >
              {{ item }}
            </li>
          </ul>
          <span v-else>尚未上传整改证据</span>
        </a-descriptions-item>
        <a-descriptions-item label="复评结论">
          {{ improvementDetailRecord.reviewDecision || '尚未复评' }}
        </a-descriptions-item>
        <a-descriptions-item label="复评意见">
          {{ improvementDetailRecord.reviewRemark || '尚未复评' }}
        </a-descriptions-item>
        <a-descriptions-item label="闭环时间">
          {{ improvementDetailRecord.closedAt || '未闭环' }}
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
            <a-form-item label="提出人">
              <TeacherSelector
                :value="issueEditor.raisedBy || null"
                placeholder="选择提出人（可选）"
                @change="handleIssueRaisedByChange"
              />
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

    <!-- 整改提交复核 Modal -->
    <a-modal
      v-model:open="rectEvidenceEditorVisible"
      title="提交整改复核"
      :confirm-loading="rectEvidenceEditorSubmitting"
      width="960px"
      @ok="submitRectEvidenceEditor"
    >
      <a-form layout="vertical" :model="rectEvidenceEditor">
        <a-form-item label="提交说明" required>
          <a-textarea v-model:value="rectEvidenceEditor.progressRemark" :rows="3" />
        </a-form-item>
        <a-divider orientation="left">整改证据明细</a-divider>
        <div class="iwb__detail-toolbar">
          <a-button type="primary" @click="addRectEvidenceItem">新增证据</a-button>
        </div>
        <div
          v-for="(item, index) in rectEvidenceEditor.evidenceItems"
          :key="index"
          class="iwb__detail-row"
        >
          <div class="iwb__detail-row-head">
            <span class="iwb__detail-row-title">证据 {{ index + 1 }}</span>
            <a-button danger size="small" @click="removeRectEvidenceItem(index)">删除</a-button>
          </div>
          <a-row :gutter="12">
            <a-col :span="6">
              <a-form-item label="类型">
                <a-select v-model:value="item.evidenceType" :options="auditEvidenceTypeOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="10">
              <a-form-item label="标题" required>
                <a-input v-model:value="item.evidenceTitle" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="编号">
                <a-input v-model:value="item.evidenceCode" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="12">
            <a-col :span="8">
              <a-form-item label="关联归档">
                <ArchiveSelector
                  :value="item.archiveId || null"
                  @change="createRectEvidenceArchiveChangeHandler(index)"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="关联报告">
                <ReportSelector
                  :value="item.reportId || null"
                  @change="createRectEvidenceReportChangeHandler(index)"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="文件节点 ID">
                <a-input v-model:value="item.fileNodeId" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="备注">
            <a-textarea v-model:value="item.remark" :rows="2" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>

    <!-- 督导复查 编辑器 Modal -->
    <a-modal
      v-model:open="supEditorVisible"
      :title="supEditorMode === 'create' ? '新建督导记录' : '编辑督导记录'"
      :confirm-loading="supEditorSubmitting"
      width="1040px"
      @ok="submitSupEditor"
    >
      <a-form layout="vertical" :model="supEditor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="supEditor.supervisionCode" :disabled="supEditorMode === 'edit'" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="督导类型" required>
              <a-select
                v-model:value="supEditor.supervisionType"
                :options="supervisionTypeOptions"
                :disabled="supEditorMode === 'edit'"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="范围">
              <a-select
                v-model:value="supEditor.supervisionScope"
                :options="supScopeOptions"
                :disabled="supEditorMode === 'edit'"
              />
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
        <a-divider orientation="left">发现明细</a-divider>
        <div class="iwb__detail-toolbar">
          <a-button type="primary" @click="addSupervisionFindingItem">新增发现</a-button>
        </div>
        <div v-for="(item, index) in supEditor.findingItems" :key="index" class="iwb__detail-row">
          <div class="iwb__detail-row-head">
            <span class="iwb__detail-row-title">发现 {{ index + 1 }}</span>
            <a-button danger size="small" @click="removeSupervisionFindingItem(index)">
              删除
            </a-button>
          </div>
          <a-row :gutter="12">
            <a-col :span="6">
              <a-form-item label="类型">
                <a-select v-model:value="item.findingType" :options="supFindingTypeOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="10">
              <a-form-item label="标题" required>
                <a-input v-model:value="item.findingTitle" />
              </a-form-item>
            </a-col>
            <a-col :span="4">
              <a-form-item label="严重程度">
                <a-select v-model:value="item.severity" :options="supFindingSeverityOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="4">
              <a-form-item label="责任单位">
                <a-input v-model:value="item.responsibleUnit" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="问题描述">
                <a-textarea v-model:value="item.findingDescription" :rows="2" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="改进措施">
                <a-textarea v-model:value="item.improvementSuggestion" :rows="2" />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
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
                :disabled="supEditorMode === 'edit'"
                @change="handleSupAuditIssueChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="关联整改任务">
              <AuditRectificationSelector
                :value="supEditor.rectificationId || null"
                :audit-issue-id="supEditor.auditIssueId || null"
                :disabled="supEditorMode === 'edit'"
                @change="handleSupRectificationChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="所属专业">
              <ProgramSelector
                :value="supEditor.programId || null"
                :disabled="supEditorMode === 'edit'"
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
                :disabled="supEditorMode === 'edit'"
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
                :disabled="supEditorMode === 'edit'"
                @change="handleSupCourseChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">证据明细</a-divider>
        <div class="iwb__detail-toolbar">
          <a-button type="primary" @click="addSupervisionEvidenceItem">新增证据</a-button>
        </div>
        <div v-for="(item, index) in supEditor.evidenceItems" :key="index" class="iwb__detail-row">
          <div class="iwb__detail-row-head">
            <span class="iwb__detail-row-title">证据 {{ index + 1 }}</span>
            <a-button danger size="small" @click="removeSupervisionEvidenceItem(index)">
              删除
            </a-button>
          </div>
          <a-row :gutter="12">
            <a-col :span="6">
              <a-form-item label="类型">
                <a-select v-model:value="item.evidenceType" :options="auditEvidenceTypeOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="10">
              <a-form-item label="标题" required>
                <a-input v-model:value="item.evidenceTitle" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="编号">
                <a-input v-model:value="item.evidenceCode" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="12">
            <a-col :span="8">
              <a-form-item label="关联归档">
                <ArchiveSelector
                  :value="item.archiveId || null"
                  @change="createSupEvidenceArchiveChangeHandler(index)"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="关联报告">
                <ReportSelector
                  :value="item.reportId || null"
                  @change="createSupEvidenceReportChangeHandler(index)"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="文件节点 ID">
                <a-input v-model:value="item.fileNodeId" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="备注">
            <a-textarea v-model:value="item.remark" :rows="2" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.iwb {
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

  &__detail-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  &__detail-row {
    padding: 12px;
    margin-bottom: 12px;
    background: var(--dp-surface-subtle, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__detail-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__detail-row-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__muted {
    color: var(--dp-text-muted, #94a3b8);
  }

  &__evidence-list {
    margin: 0;
    padding-left: 18px;
    color: var(--dp-text-secondary, #475569);
  }

  &__evidence-item {
    line-height: 1.7;
    word-break: break-word;
  }
}
</style>
