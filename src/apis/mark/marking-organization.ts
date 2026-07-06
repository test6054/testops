import type { QualityDecisionCode } from './exam-scan'
import type { PaperInstanceDisplayVO } from './exam-score'
import type { QuestionTypeCode } from './question-type'
import type { MarkAiReferenceExperienceAuditVO } from '@/apis/mark/grading-experience-assist'
import type { PageResult, QueryDto } from '@/types'
import type { AllocationUnitCode } from '@/types/enums/allocation-unit-enum'
import type { AnonymityModeCode } from '@/types/enums/anonymity-mode-enum'
import type { AnonymousTokenPolicyCode } from '@/types/enums/anonymous-token-policy-enum'
import type { EffectiveStatusCode } from '@/types/enums/effective-status-enum'
import type { MarkingAllocationModeCode } from '@/types/enums/marking-allocation-mode-enum'
import type { MarkingReassignModeCode } from '@/types/enums/marking-reassign-mode-enum'
import type { MarkingSessionPhaseCode } from '@/types/enums/marking-session-phase-enum'
import http from '@/config/axios'
import { ALL_ALLOCATION_UNIT_CODES, AllocationUnitDescription } from '@/types/enums/allocation-unit-enum'
import {
  ALL_ANONYMOUS_TOKEN_POLICY_CODES,
  AnonymousTokenPolicyDescription
} from '@/types/enums/anonymous-token-policy-enum'
import { FormalSessionStatusCode, FormalSessionStatusDescription } from '@/types/enums/formal-session-status-enum'
import {
  ALL_MARKING_ALLOCATION_MODE_CODES,
  MarkingAllocationModeDescription
} from '@/types/enums/marking-allocation-mode-enum'
import { MarkingOrganizationStatusCode } from '@/types/enums/marking-organization-status-enum'
import {
  ALL_MARKING_REASSIGN_MODE_CODES,
  MarkingReassignModeDescription
} from '@/types/enums/marking-reassign-mode-enum'
import {
  ALL_MARKING_TASK_STATUS_CODES,
  MarkingTaskStatusCode,
  MarkingTaskStatusDescription
} from '@/types/enums/marking-task-status-enum'
import { QuestionMarkingGroupStatusCode } from '@/types/enums/question-marking-group-status-enum'
import {
  TRIAL_SESSION_MAIN_FLOW_STATUS_CODES,
  TrialSessionStatusCode,
  TrialSessionStatusDescription
} from '@/types/enums/trial-session-status-enum'
import { readAllPages } from '@/utils/page-result'

export { ALL_ALLOCATION_UNIT_CODES, AllocationUnitCode } from '@/types/enums/allocation-unit-enum'
export { AllocationUnitDescription } from '@/types/enums/allocation-unit-enum'
export { AnonymityModeCode } from '@/types/enums/anonymity-mode-enum'
export {
  ALL_ANONYMOUS_TOKEN_POLICY_CODES,
  AnonymousTokenPolicyCode,
} from '@/types/enums/anonymous-token-policy-enum'
export { AnonymousTokenPolicyDescription } from '@/types/enums/anonymous-token-policy-enum'
export {
  ALL_FORMAL_SESSION_STATUS_CODES,
  FormalSessionStatusCode,
} from '@/types/enums/formal-session-status-enum'
export { FormalSessionStatusDescription } from '@/types/enums/formal-session-status-enum'
export {
  ALL_MARKING_ALLOCATION_MODE_CODES,
  MarkingAllocationModeCode,
} from '@/types/enums/marking-allocation-mode-enum'
export { MarkingAllocationModeDescription } from '@/types/enums/marking-allocation-mode-enum'
export {
  ALL_MARKING_ORGANIZATION_STATUS_CODES,
  MarkingOrganizationStatusCode,
} from '@/types/enums/marking-organization-status-enum'
export { MarkingOrganizationStatusDescription } from '@/types/enums/marking-organization-status-enum'

export {
  ALL_MARKING_REASSIGN_MODE_CODES,
  MarkingReassignModeCode,
} from '@/types/enums/marking-reassign-mode-enum'
export { MarkingReassignModeDescription } from '@/types/enums/marking-reassign-mode-enum'
export {
  ALL_MARKING_SESSION_PHASE_CODES,
  MarkingSessionPhaseCode,
} from '@/types/enums/marking-session-phase-enum'
export { MarkingSessionPhaseDescription } from '@/types/enums/marking-session-phase-enum'
export {
  ALL_MARKING_TASK_STATUS_CODES,
  MarkingTaskStatusCode,
} from '@/types/enums/marking-task-status-enum'
export { MarkingTaskStatusDescription } from '@/types/enums/marking-task-status-enum'
export {
  ALL_QUESTION_MARKING_GROUP_STATUS_CODES,
  QuestionMarkingGroupStatusCode,
} from '@/types/enums/question-marking-group-status-enum'
export { QuestionMarkingGroupStatusDescription } from '@/types/enums/question-marking-group-status-enum'
export {
  TRIAL_SESSION_MAIN_FLOW_STATUS_CODES,
  TrialSessionStatusCode,
  TrialSessionStatusDescription,
} from '@/types/enums/trial-session-status-enum'

// ─── 状态枚举与文案 ─────────────────────────────────────────

export const MARKING_ORGANIZATION_STATUS_TONE: Record<
  MarkingOrganizationStatusCode,
  'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'
> = {
  [MarkingOrganizationStatusCode.ORG_DRAFT]: 'gray',
  [MarkingOrganizationStatusCode.ORG_CONFIGURED]: 'blue',
  [MarkingOrganizationStatusCode.TRIAL_MARKING]: 'orange',
  [MarkingOrganizationStatusCode.FORMAL_MARKING]: 'green',
  [MarkingOrganizationStatusCode.QUALITY_REVIEW]: 'purple',
  [MarkingOrganizationStatusCode.CLOSED]: 'red',
}

/** 阅卷组织列表默认分页大小（SessionListQuery / MarkingTaskQuery 缺省时使用） */
const MARK_ORG_LIST_PAGE_SIZE = 100

export const QUESTION_GROUP_STATUS_TONE: Record<
  QuestionMarkingGroupStatusCode,
  'gray' | 'blue' | 'green' | 'red'
> = {
  [QuestionMarkingGroupStatusCode.GROUP_DRAFT]: 'gray',
  [QuestionMarkingGroupStatusCode.GROUP_CONFIGURED]: 'blue',
  [QuestionMarkingGroupStatusCode.GROUP_ACTIVE]: 'green',
  [QuestionMarkingGroupStatusCode.GROUP_CLOSED]: 'red',
}

export const MARKING_ALLOCATION_MODE_OPTIONS: Array<{
  value: MarkingAllocationModeCode
  label: string
}> = ALL_MARKING_ALLOCATION_MODE_CODES.map((value) => ({
  value,
  label: MarkingAllocationModeDescription[value],
}))

export const ALLOCATION_UNIT_OPTIONS: Array<{ value: AllocationUnitCode, label: string }>
  = ALL_ALLOCATION_UNIT_CODES.map((value) => ({
    value,
    label: AllocationUnitDescription[value],
  }))

export const MARKING_REASSIGN_MODE_OPTIONS: Array<{
  value: MarkingReassignModeCode
  label: string
}> = ALL_MARKING_REASSIGN_MODE_CODES.map((value) => ({
  value,
  label: MarkingReassignModeDescription[value],
}))

export const ANONYMOUS_TOKEN_POLICY_OPTIONS: Array<{
  value: AnonymousTokenPolicyCode
  label: string
}> = ALL_ANONYMOUS_TOKEN_POLICY_CODES.map((value) => ({
  value,
  label: AnonymousTokenPolicyDescription[value],
}))

export const MARKING_TASK_STATUS_TONE: Record<
  MarkingTaskStatusCode,
  'gray' | 'blue' | 'orange' | 'green' | 'red'
> = {
  [MarkingTaskStatusCode.ALLOCATED]: 'blue',
  [MarkingTaskStatusCode.IN_PROGRESS]: 'blue',
  [MarkingTaskStatusCode.SUBMITTED]: 'green',
  [MarkingTaskStatusCode.FINALIZED]: 'green',
  [MarkingTaskStatusCode.RECYCLED]: 'gray',
}

/** 阅卷任务状态下拉选项，值必须与后端 MarkingTaskStatus enum 完全一致 */
export const MARKING_TASK_STATUS_OPTIONS: Array<{
  label: string
  value: MarkingTaskStatusCode
}> = ALL_MARKING_TASK_STATUS_CODES.map((value) => ({
  value,
  label: MarkingTaskStatusDescription[value],
}))

/** 创建阅卷组织请求 - 对应后端 OrganizationCreateRequest */
export interface OrganizationCreateRequest {
  examId: string
  anonymousMode: boolean
  remark?: string
  /** 初始评阅教师用户ID列表；创建考试打包接口传入，须包含考试主考 */
  reviewerUserIds?: string[]
}

/** 阅卷组织查询请求 - 对应后端 OrganizationQueryRequest */
export interface OrganizationQueryRequest {
  examId: string
}

/** 阅卷组织按 ID 查询请求 - 对应后端 OrganizationQueryByIdRequest */
export interface OrganizationQueryByIdRequest {
  organizationId: string
}

/** 更新阅卷组织主信息请求 - 对应后端 OrganizationUpdateRequest */
export interface OrganizationUpdateRequest {
  organizationId: string
  anonymousMode: boolean
  remark?: string
}

/** 删除阅卷组织请求 - 对应后端 OrganizationDeleteRequest */
export interface OrganizationDeleteRequest {
  organizationId: string
}

/** 保存题目阅卷小组请求 - 对应后端 QuestionGroupSaveRequest */
export interface QuestionGroupSaveRequest {
  organizationId: string
  groupId?: string
  groupName: string
  layoutQuestionIds: string[]
  /** 整卷批阅题组标记；为 true 时题目范围可为空 */
  wholePaperGroup?: boolean
  leaderUserId: string
  reviewerUserIds: string[]
}

/** 删除题目阅卷小组请求 - 对应后端 QuestionGroupDeleteRequest */
export interface QuestionGroupDeleteRequest {
  groupId: string
}

/** 关闭题目阅卷小组请求 - 对应后端 QuestionGroupCloseRequest */
export interface QuestionGroupCloseRequest {
  groupId: string
}

/** 保存任务分配策略请求 - 对应后端 AllocationPolicySaveRequest */
export interface AllocationPolicySaveRequest {
  organizationId: string
  /** 题组ID，为空时表示组织级默认策略 */
  groupId?: string
  allocationMode: MarkingAllocationModeCode
  anonymityMode: AnonymityModeCode
  allocationUnit: AllocationUnitCode
  /** 每批分配任务数量 */
  batchSize: number
  /** 教师最大待处理任务数 */
  loadLimit: number
  anonymousTokenPolicy: AnonymousTokenPolicyCode
  /** 优先级策略备注 */
  priorityRule?: string
  /** 随机题目抽样数量 */
  randomQuestionSampleSize?: number
}

/** 保存任务回收策略请求 - 对应后端 RecyclePolicySaveRequest */
export interface RecyclePolicySaveRequest {
  organizationId: string
  /** 题组ID，为空时表示组织级默认策略 */
  groupId?: string
  /** 超时时间（分钟） */
  timeoutMinutes?: number
  /** 教师最大待处理任务数 */
  maxPendingCount?: number
  reassignMode?: MarkingReassignModeCode
}

/** 任务分配策略查询响应 - 对应后端 AllocationPolicyResponse */
export interface AllocationPolicyVO {
  id: string
  organizationId: string
  groupId?: string | null
  allocationMode: MarkingAllocationModeCode
  anonymityMode: AnonymityModeCode
  allocationUnit: AllocationUnitCode
  batchSize: number
  loadLimit: number
  anonymousTokenPolicy: AnonymousTokenPolicyCode
  priorityRule?: string
  randomQuestionSampleSize?: number
}

/** 任务回收策略查询响应 - 对应后端 RecyclePolicyResponse */
export interface RecyclePolicyVO {
  id: string
  organizationId: string
  groupId?: string | null
  timeoutMinutes?: number
  maxPendingCount?: number
  reassignMode?: MarkingReassignModeCode
}

/** 阅卷组织任务策略列表响应 - 对应后端 MarkingPolicyListResponse */
export interface MarkingPolicyListVO {
  allocationPolicies: AllocationPolicyVO[]
  recyclePolicies: RecyclePolicyVO[]
}

/** 创建试评会话请求 - 对应后端 TrialSessionCreateRequest */
export interface TrialSessionCreateRequest {
  organizationId: string
  groupId: string
}

/** 试评校准请求 - 对应后端 TrialSessionCalibrateRequest */
export interface TrialSessionCalibrateRequest {
  sessionId: string
  /** 校准结论 */
  calibrationSummary: string
  discussionNotes?: string
}

/** 创建正评会话请求 - 对应后端 FormalSessionCreateRequest */
export interface FormalSessionCreateRequest {
  organizationId: string
  groupId: string
  /** 批阅任务单元 */
  allocationUnit: AllocationUnitCode
}

/** 阅卷任务领取请求 - 对应后端 MarkingTaskClaimRequest */
export interface MarkingTaskClaimRequest {
  sessionId: string
  groupId: string
  /** 试评领取传 TRIAL，正评领取传 FORMAL */
  markingPhase: MarkingSessionPhaseCode
}

/** 阅卷任务提交请求 - 对应后端 MarkingTaskSubmitRequest */
export interface MarkingTaskSubmitRequest {
  taskId: string
  /** 题目给分列表；题目级任务一条，整卷任务覆盖全部题目 */
  questionScores: MarkingQuestionScoreSubmitItem[]
  /** 页面批注列表；仅整卷任务允许提交 */
  pageAnnotations?: MarkingPageAnnotationSubmitItem[]
}

/** 阅卷任务题目给分提交项 - 对应后端 MarkingQuestionScoreSubmitItem */
export interface MarkingQuestionScoreSubmitItem {
  layoutQuestionId: string
  score: number
  annotationText?: string
  correlationId: string
}

/** 整卷阅卷页面批注提交项 - 对应后端 MarkingPageAnnotationSubmitItem */
export interface MarkingPageAnnotationSubmitItem {
  pageId: string
  annotationText: string
  correlationId: string
}

/** 阅卷任务查询请求 - 对应后端 MarkingTaskQueryRequest（继承 QueryDto） */
export interface MarkingTaskQueryRequest extends QueryDto {
  examId: string
  groupId?: string
  sessionId?: string
  reviewerUserId?: string
  taskStatus?: MarkingTaskStatusCode
}

// ─── 响应模型类型 ───────────────────────────────────────────

/** 题目阅卷小组详情响应 - 对应后端 QuestionMarkingGroupResponse */
export interface QuestionGroupReviewerVO {
  reviewerUserId: string
  reviewerUserName: string
  reviewerTeacherNo: string
}

/** 题组负责题目详情 - 对应后端 QuestionMarkingGroupQuestionResponse */
export interface QuestionMarkingGroupQuestionVO {
  groupId: string | null
  layoutQuestionId: string
  /** 题目批改结果 ID，供单题 AI 复评使用 */
  gradeResultId?: string
  questionNo: string
  questionType: QuestionTypeCode
  questionTypeMessage: string
  fullScore: number
  /** AI建议分 */
  aiScore?: number
  /** AI诊断说明 */
  aiDiagnostic?: string
  /** 当前题目 AI 执行 trace，供定标徽标跳转 AI 历史定位 */
  aiTraceId?: string
  /** 正式作答切片ID */
  responseSliceId: string
  /** 正式OCR识别结果ID */
  recognitionResultId: string
  /** 题目切片文件ID */
  sliceFileId: string
  /** 切片所属扫描页ID */
  pageId: string
  /** 正式OCR识别答案 */
  recognizedAnswer?: string
  questionStem?: string
  questionOrder: number
  /** AI 定标引用审计快照 */
  referenceExperienceAudit?: MarkAiReferenceExperienceAuditVO
}

export interface QuestionMarkingGroupVO {
  id: string
  groupName: string
  questions: QuestionMarkingGroupQuestionVO[]
  leaderUserId: string
  leaderUserName: string
  leaderTeacherNo: string
  groupStatus: QuestionMarkingGroupStatusCode
  reviewers: QuestionGroupReviewerVO[]
  reviewerUserIds?: string[]
  createTime?: string
}

/** 阅卷组织详情响应 - 对应后端 MarkingOrganizationResponse */
export interface MarkingOrganizationVO {
  /** 是否已创建阅卷组织 */
  configured: boolean
  id?: string
  examId: string
  examName?: string
  examNo?: string
  leaderUserId?: string
  leaderUserName?: string
  leaderTeacherNo?: string
  organizationStatus: MarkingOrganizationStatusCode
  anonymousMode?: boolean
  remark?: string
  /** 考试主考老师用户 ID - 对应后端 MarkingOrganizationResponse.examCreateUserId */
  examCreateUserId?: string
  /** 当前用户是否具备主考专属权限 - 对应后端 canManageExamOwner */
  canManageExamOwner?: boolean
  groups: QuestionMarkingGroupVO[]
  /** 题组数量 - 对应后端 groupCount */
  groupCount?: number
  /** 去重阅卷教师人数 - 对应后端 uniqueReviewerCount */
  uniqueReviewerCount?: number
  createTime?: string
  updateTime?: string
}

/** 阅卷任务详情响应 - 对应后端 MarkingTaskResponse */
/** 已定稿阅卷任务逐题给分回显 - 对应 MarkingTaskSubmittedQuestionScoreResponse */
export interface MarkingTaskSubmittedQuestionScoreVO {
  layoutQuestionId: string
  questionNo: string
  score: number
  annotationText?: string
}

export interface MarkingTaskVO {
  id: string
  examId: string
  /** 题组ID；组织级整卷任务无题组时为 null */
  groupId?: string | null
  /** 题组名称；组织级整卷任务无题组时为 null */
  groupName?: string | null
  sessionId: string
  /** 阅卷阶段：试评 / 正评 */
  markingPhase: MarkingSessionPhaseCode
  /** 正评会话状态；试评任务为空 */
  sessionStatus?: FormalSessionStatusCode
  /** 试评会话状态；正评任务为空 */
  trialSessionStatus?: TrialSessionStatusCode
  sessionStatusMessage: string
  sessionStartTime?: string
  reviewerUserId: string
  reviewerName: string
  taskUnit: AllocationUnitCode
  anonymityMode: AnonymityModeCode
  taskStatus: MarkingTaskStatusCode
  score?: string | number
  annotationNote?: string
  /** 匿名令牌值；匿名模式为真实令牌，实名模式为 null */
  anonymousToken: string | null
  /** 答卷身份展示信息，由后端按实名 / 匿名策略统一裁决 */
  paperDisplay: PaperInstanceDisplayVO
  /** 题号；整卷任务为 null */
  questionNo: string | null
  /** 题型；整卷任务为 null */
  questionType: QuestionTypeCode | null
  /** 题型文案；整卷任务为 null */
  questionTypeMessage: string | null
  allocatedTime?: string
  submittedTime?: string
  recycledTime?: string
  recycleReason?: string
  /** 已定稿任务的逐题给分回显；非 FINALIZED 为 undefined */
  submittedQuestionScores?: MarkingTaskSubmittedQuestionScoreVO[]
}

export const TRIAL_SESSION_STATUS_TONE: Record<
  TrialSessionStatusCode,
  'gray' | 'blue' | 'orange' | 'green' | 'red'
> = {
  [TrialSessionStatusCode.TRIAL_CREATED]: 'gray',
  [TrialSessionStatusCode.TRIAL_ASSIGNED]: 'blue',
  [TrialSessionStatusCode.TRIAL_SUBMITTED]: 'orange',
  [TrialSessionStatusCode.CALIBRATED]: 'green',
  [TrialSessionStatusCode.TRIAL_CLOSED]: 'red',
}

export const FORMAL_SESSION_STATUS_TONE: Record<
  FormalSessionStatusCode,
  'gray' | 'green' | 'orange' | 'purple' | 'red'
> = {
  [FormalSessionStatusCode.SESSION_CREATED]: 'gray',
  [FormalSessionStatusCode.SESSION_ACTIVE]: 'green',
  [FormalSessionStatusCode.SESSION_PAUSED]: 'orange',
  [FormalSessionStatusCode.SESSION_COMPLETED]: 'purple',
  [FormalSessionStatusCode.SESSION_CLOSED]: 'red',
}


/** 试评会话主流程 hint，文案与 TrialSessionStatusDescription 一致 */
export const TRIAL_SESSION_FLOW_HINT = TRIAL_SESSION_MAIN_FLOW_STATUS_CODES.map(
  (status) => TrialSessionStatusDescription[status],
).join(' → ')

/** 正评会话主流程 hint，文案与 FormalSessionStatusDescription 一致（进行中与已暂停可往返） */
export const FORMAL_SESSION_FLOW_HINT = `${FormalSessionStatusDescription[FormalSessionStatusCode.SESSION_CREATED]} → ${FormalSessionStatusDescription[FormalSessionStatusCode.SESSION_ACTIVE]} ⇄ ${FormalSessionStatusDescription[FormalSessionStatusCode.SESSION_PAUSED]} → ${FormalSessionStatusDescription[FormalSessionStatusCode.SESSION_COMPLETED]} → ${FormalSessionStatusDescription[FormalSessionStatusCode.SESSION_CLOSED]}`

/** 阅卷组织会话页范围说明，供 ContextBar 副标题展示 */
export const MARKING_SESSIONS_SCOPE_HINT = '按题组创建试评校准与正评启停，推进阅卷组织生效'

/** 会话列表查询请求 - 对应后端 SessionListQueryRequest（继承 QueryDto） */
export interface SessionListQueryRequest extends QueryDto {
  organizationId: string
  /** 题组ID，留空表示返回组织下所有题组的会话 */
  groupId?: string
}

/** 试评会话详情响应 - 对应后端 TrialSessionResponse */
export interface TrialSessionVO {
  id: string
  examId: string
  organizationId: string
  groupId: string
  groupName: string
  sessionStatus: TrialSessionStatusCode
  /** 校准结论 */
  calibrationSummary?: string
  discussionNotes?: string
  /** 试评关闭原因，closeTrialSession 写入 */
  closeReason?: string
  /** 试评进入 TRIAL_CLOSED 的时刻 */
  closeTime?: string
  createTime?: string
  updateTime?: string
  /** 本会话派发试评任务总数 */
  totalTaskCount: number
  /** 本会话已定稿试评任务数 */
  finalizedTaskCount: number
  /** 待领取或批改中试评任务数 */
  pendingTaskCount: number
}

/** 正评会话详情响应 - 对应后端 FormalSessionResponse */
export interface FormalSessionQuestionScopeVO {
  sessionId: string
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  questionTypeMessage: string
  fullScore: number
  questionStem?: string
  scopeOrder: number
  selectedByRandom: boolean
  /** 该题目在本会话内派发任务数 */
  scopedTaskCount: number
  /** 该题目在本会话内已定稿任务数 */
  scopedFinalizedTaskCount: number
  /** 该题目在本会话覆盖的卷题项数量 */
  scopedGradeItemCount: number
  /** 该题目在本会话覆盖范围内已确认成绩的卷题项数量 */
  scopedConfirmedGradeCount: number
  /** 该题目在本会话覆盖范围内是否已完成题目成绩闭环 */
  scopedGradeClosureReady: boolean
}

export interface FormalSessionVO {
  id: string
  examId: string
  organizationId: string
  groupId: string
  groupName: string
  sessionStatus: FormalSessionStatusCode
  startTime?: string
  endTime?: string
  /** 批阅任务单元 */
  allocationUnit: AllocationUnitCode
  /** 正评会话实际题目范围数量；题目级会话启动后由后端固化 */
  questionScopeCount: number
  /** 正评会话实际题目范围；随机题目模式展示本次启动固化后的抽题结果 */
  questionScopes: FormalSessionQuestionScopeVO[]
  /** 本会话派发阅卷任务总数 */
  totalTaskCount: number
  /** 本会话已定稿阅卷任务数 */
  finalizedTaskCount: number
  /** 待领取或批改中任务数 */
  pendingTaskCount: number
  /** 回收待处理任务数 */
  recycledTaskCount: number
  /** 是否允许标记本场正评完成 */
  sessionTaskCompletionReady: boolean
  /** 不允许完成时的阻断原因 */
  sessionCompletionBlockedReason?: string
  /** 本会话覆盖的卷题项数量 */
  sessionGradeItemCount: number
  /** 本会话覆盖范围内已确认成绩的卷题项数量 */
  sessionConfirmedGradeCount: number
  /** 本会话覆盖范围内题目成绩是否已闭环 */
  sessionGradeClosureReady: boolean
  /** 会话范围题目成绩闭环口径说明 */
  sessionGradeClosureLabel: string
  /** 会话范围题目成绩未闭环时的原因 */
  sessionGradeClosureBlockedReason?: string
  /** 完成标记口径说明 */
  completionScopeLabel: string
  /** 完成语义补充说明 */
  completionSemanticsNote: string
  /** 正评暂停原因，pauseFormalSession 写入 */
  pauseReason?: string
  /** 正评最近一次进入 SESSION_PAUSED 的时刻 */
  pauseTime?: string
  /** 正评关闭原因，closeFormalSession 写入 */
  closeReason?: string
  /** 正评进入 SESSION_CLOSED 的时刻 */
  closeTime?: string
  createTime?: string
  updateTime?: string
}

const MARKING_ORG_DATA_ERROR = '阅卷组织数据异常，请刷新后重试'

/** 读取已配置阅卷组织的组织 ID；configured 为 true 但 id 缺失时拒绝继续。 */
export function requireMarkingOrganizationId(record: MarkingOrganizationVO): string {
  if (!record.id) {
    throw new Error(MARKING_ORG_DATA_ERROR)
  }
  return record.id
}

// ─── API 调用 ────────────────────────────────────────────────

// ===================== 阅卷组织 =====================

/**
 * 创建阅卷组织。
 * POST /api/mark/organization/create
 */
export function createOrganization(
  request: OrganizationCreateRequest,
): Promise<MarkingOrganizationVO> {
  return http.post<MarkingOrganizationVO>('/api/mark/organization/create', request)
}

/**
 * 查询阅卷组织详情；未创建时返回 configured=false 空壳，不触发业务错误。
 * POST /api/mark/organization/detail
 */
export async function getOrganization(
  request: OrganizationQueryRequest,
): Promise<MarkingOrganizationVO> {
  return http.post<MarkingOrganizationVO>('/api/mark/organization/detail', request)
}

/**
 * 按阅卷组织ID查询详情。
 * POST /api/mark/organization/detailById
 */
export async function getOrganizationById(
  request: OrganizationQueryByIdRequest,
): Promise<MarkingOrganizationVO> {
  return http.post<MarkingOrganizationVO>('/api/mark/organization/detailById', request)
}

/**
 * 更新阅卷组织主信息。
 * POST /api/mark/organization/update
 */
export function updateOrganization(
  request: OrganizationUpdateRequest,
): Promise<MarkingOrganizationVO> {
  return http.post<MarkingOrganizationVO>('/api/mark/organization/update', request)
}

/**
 * 删除阅卷组织。
 * POST /api/mark/organization/delete
 */
export function deleteOrganization(request: OrganizationDeleteRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/delete', request)
}

// ===================== 题组管理 =====================

/**
 * 保存题目阅卷小组（含教师分配）；返回题组ID。
 * POST /api/mark/organization/group/save
 */
export function saveQuestionGroup(request: QuestionGroupSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/organization/group/save', request)
}

/**
 * 删除草稿题目阅卷小组。
 * POST /api/mark/organization/group/delete
 */
export function deleteQuestionGroup(request: QuestionGroupDeleteRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/group/delete', request)
}

/**
 * 关闭题目阅卷小组。
 * POST /api/mark/organization/group/close
 */
export function closeQuestionGroup(request: QuestionGroupCloseRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/group/close', request)
}

// ===================== 策略配置 =====================

/**
 * 保存任务分配策略。
 * POST /api/mark/organization/policy/allocation/save
 */
export function saveAllocationPolicy(request: AllocationPolicySaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/policy/allocation/save', request)
}

/**
 * 保存任务回收策略。
 * POST /api/mark/organization/policy/recycle/save
 */
export function saveRecyclePolicy(request: RecyclePolicySaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/policy/recycle/save', request)
}

/**
 * 查询阅卷组织任务策略列表。
 * POST /api/mark/organization/policy/list
 */
export function listMarkingPolicies(
  request: OrganizationQueryByIdRequest,
): Promise<MarkingPolicyListVO> {
  return http.post<MarkingPolicyListVO>('/api/mark/organization/policy/list', request)
}

// ===================== 试评会话 =====================

/**
 * 创建试评会话；返回试评会话ID。
 * POST /api/mark/organization/trial/create
 */
export function createTrialSession(request: TrialSessionCreateRequest): Promise<string> {
  return http.post<string>('/api/mark/organization/trial/create', request)
}

/**
 * 提交试评校准结论（含校准结果 + 讨论记录）。
 * POST /api/mark/organization/trial/calibrate
 */
export function calibrateTrialSession(request: TrialSessionCalibrateRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/trial/calibrate', request)
}

/**
 * 启动试评会话（CAS 守门 TRIAL_CREATED → TRIAL_ASSIGNED）。
 * POST /api/mark/organization/trial/start
 */
export function startTrialSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/trial/start', { id: sessionId })
}

/**
 * 分页查询试评会话列表。
 * POST /api/mark/organization/trial/list
 */
export function pageTrialSessions(
  request: SessionListQueryRequest,
): Promise<PageResult<TrialSessionVO>> {
  return http.post<PageResult<TrialSessionVO>>('/api/mark/organization/trial/list', request)
}

/**
 * 查询试评会话列表（自动分页拉全）。
 * POST /api/mark/organization/trial/list
 */
export async function listTrialSessions(
  request: SessionListQueryRequest,
): Promise<TrialSessionVO[]> {
  const pageSize = request.pageSize ?? MARK_ORG_LIST_PAGE_SIZE
  return readAllPages(
    (pageNum) => pageTrialSessions({ ...request, pageNum, pageSize }),
    '试评会话列表加载失败，请稍后重试',
  )
}

// ===================== 正评会话 =====================

/**
 * 创建正评会话；返回正评会话ID。
 * POST /api/mark/organization/formal/create
 */
export function createFormalSession(request: FormalSessionCreateRequest): Promise<string> {
  return http.post<string>('/api/mark/organization/formal/create', request)
}

/**
 * 启动正评会话（CAS 守门 SESSION_CREATED → SESSION_ACTIVE）。
 * POST /api/mark/organization/formal/start
 */
export function startFormalSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/formal/start', { id: sessionId })
}

/**
 * 完成正评会话（CAS 守门 SESSION_ACTIVE → SESSION_COMPLETED）。
 * POST /api/mark/organization/formal/complete
 */
export function completeFormalSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/formal/complete', { id: sessionId })
}

/**
 * 分页查询正评会话列表。
 * POST /api/mark/organization/formal/list
 */
export function pageFormalSessions(
  request: SessionListQueryRequest,
): Promise<PageResult<FormalSessionVO>> {
  return http.post<PageResult<FormalSessionVO>>('/api/mark/organization/formal/list', request)
}

/**
 * 查询正评会话列表（自动分页拉全）。
 * POST /api/mark/organization/formal/list
 */
export async function listFormalSessions(
  request: SessionListQueryRequest,
): Promise<FormalSessionVO[]> {
  const pageSize = request.pageSize ?? MARK_ORG_LIST_PAGE_SIZE
  return readAllPages(
    (pageNum) => pageFormalSessions({ ...request, pageNum, pageSize }),
    '正评会话列表加载失败，请稍后重试',
  )
}

// ===================== 阅卷任务 =====================

/**
 * 教师领取阅卷任务（CAS 守门，按当前组织分配策略批量分配）。
 * POST /api/mark/organization/task/claim
 */
export function claimMarkingTasks(request: MarkingTaskClaimRequest): Promise<MarkingTaskVO[]> {
  return http.post<MarkingTaskVO[]>('/api/mark/organization/task/claim', request)
}

/**
 * 教师提交阅卷任务（CAS 守门 reviewer_user_id + IN_PROGRESS，防止超时回收冲突）。
 * POST /api/mark/organization/task/submit
 */
export function submitMarkingTask(request: MarkingTaskSubmitRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/task/submit', request)
}

/** 已回收任务手动再分配请求 - 对应后端 MarkingTaskReassignRequest */
export interface MarkingTaskReassignRequest {
  taskId: string
  targetReviewerUserId: string
  reassignReason?: string
}

/**
 * 手动再分配已回收阅卷任务（RECYCLED → ALLOCATED）。
 * POST /api/mark/organization/task/reassign-recycled
 */
export function reassignRecycledMarkingTask(
  request: MarkingTaskReassignRequest,
): Promise<MarkingTaskVO> {
  return http.post<MarkingTaskVO>('/api/mark/organization/task/reassign-recycled', request)
}

/**
 * 分页查询阅卷任务列表。
 * POST /api/mark/organization/task/list
 */
export function pageMarkingTasks(
  request: MarkingTaskQueryRequest,
): Promise<PageResult<MarkingTaskVO>> {
  return http.post<PageResult<MarkingTaskVO>>('/api/mark/organization/task/list', request)
}

/**
 * 查询阅卷任务列表（自动分页拉全）。
 * POST /api/mark/organization/task/list
 */
export async function listMarkingTasks(request: MarkingTaskQueryRequest): Promise<MarkingTaskVO[]> {
  const pageSize = request.pageSize ?? MARK_ORG_LIST_PAGE_SIZE
  return readAllPages(
    (pageNum) => pageMarkingTasks({ ...request, pageNum, pageSize }),
    '阅卷任务列表加载失败，请稍后重试',
  )
}

/** 单任务详情查询请求 - 对应后端 MarkingTaskDetailQueryRequest */
export interface MarkingTaskDetailQueryRequest {
  taskId: string
}

/**
 * 查询单个阅卷任务详情；仅任务领取人本人可查询。
 * POST /api/mark/organization/task/detail
 */
export function getMarkingTaskDetail(
  request: MarkingTaskDetailQueryRequest,
): Promise<MarkingTaskVO> {
  return http.post<MarkingTaskVO>('/api/mark/organization/task/detail', request)
}

/** 教师领取上下文查询请求 - 对应后端 TeacherClaimContextQueryRequest */
export interface TeacherClaimContextQueryRequest {
  examId: string
  /** 试评任务池传 TRIAL，正评任务池传 FORMAL */
  markingPhase: MarkingSessionPhaseCode
}

/** 题组级领取上下文 - 对应后端 TeacherGroupClaimContextResponse */
export interface GroupClaimContextVO {
  groupId: string
  groupName: string
  organizationId: string
  /** 该题组下当前活跃的正评会话（session_status = SESSION_ACTIVE） */
  activeSessions: FormalSessionVO[]
  /** 该题组下当前可领取的试评会话（session_status = TRIAL_ASSIGNED） */
  activeTrialSessions: TrialSessionVO[]
}

/** 教师任务池状态汇总 - 对应 TeacherMarkingTaskPoolSummaryResponse */
export interface TeacherMarkingTaskPoolSummaryVO {
  totalTaskCount: number
  allocatedTaskCount: number
  inProgressTaskCount: number
  submittedTaskCount: number
  finalizedTaskCount: number
  recycledTaskCount: number
}

/** 教师领取上下文响应 - 对应后端 TeacherClaimContextResponse */
export interface TeacherClaimContextVO {
  examId: string
  markingPhase: MarkingSessionPhaseCode
  /** 教师所属的活跃题组上下文列表 */
  groups: GroupClaimContextVO[]
  /** 当前评阅员在本考试本阶段下的任务状态汇总 */
  taskSummary: TeacherMarkingTaskPoolSummaryVO
}

/**
 * 查询教师阅卷领取上下文。
 * 返回当前用户作为阅卷教师所属的活跃题组列表 + 每个题组下的活跃正评会话，
 * 替代手工输入 sessionId / groupId 的下拉数据源。
 * POST /api/mark/organization/task/claim-context
 */
export function getTeacherClaimContext(
  request: TeacherClaimContextQueryRequest,
): Promise<TeacherClaimContextVO> {
  return http.post<TeacherClaimContextVO>('/api/mark/organization/task/claim-context', request)
}

// ===================== 整卷视图 / 解匿名（P1.5 + P1.6） =====================

/**
 * 整卷视图查询请求 - 对应后端 WholePaperViewRequest。
 * Service 校验 taskId 必须是当前 reviewer 持有的任务，并从任务记录推导试卷实例。
 */
export interface WholePaperViewRequest {
  examId: string
  taskId: string
}

/** 扫描页引用 - 对应后端 ScannedPageRef */
export interface ScannedPageRef {
  pageId: string
  pageSeq: number
  templatePageNo: number
  /** 实名整卷直链 storage；匿名整卷为 undefined */
  fileId?: string
  qualityStatus: QualityDecisionCode
  /** 匿名整卷需走 scan-page/display 遮罩展示 */
  identityMaskedView?: boolean
  /** 题目区域 ROI X（像素） */
  roiX?: number
  /** 题目区域 ROI Y（像素） */
  roiY?: number
  /** 题目区域 ROI 宽度（像素） */
  roiWidth?: number
  /** 题目区域 ROI 高度（像素） */
  roiHeight?: number
  /** 扫描页图像宽度（像素） */
  pageImageWidth?: number
  /** 扫描页图像高度（像素） */
  pageImageHeight?: number
}

/** 整卷视图响应 - 对应后端 WholePaperViewResponse */
export interface WholePaperViewVO {
  /** 匿名 token 值；匿名模式为真实令牌，实名模式为 null */
  anonymousToken: string | null
  /** 扫描页列表，按 page_seq 升序 */
  pages: ScannedPageRef[]
  /** 整卷批阅题目列表，前端逐题评分必须使用该真实题目清单 */
  questions: QuestionMarkingGroupQuestionVO[]
}

/**
 * 题目级批阅视图查询请求 - 对应后端 MarkingQuestionViewRequest。
 * Service 校验 taskId 必须是当前 reviewer 持有的题目级任务，并从任务记录推导切片信息。
 */
export interface MarkingQuestionViewRequest {
  examId: string
  taskId: string
}

/** 题目级批阅视图响应 - 对应后端 MarkingQuestionViewResponse */
export interface MarkingQuestionViewVO {
  /** 匿名 token 值；匿名模式为真实令牌，实名模式为 null */
  anonymousToken: string | null
  layoutQuestionId: string
  /** 题目批改结果 ID，供单题 AI 复评使用 */
  gradeResultId?: string
  questionNo: string
  questionType: QuestionTypeCode
  questionTypeMessage: string
  fullScore: number
  questionStem: string
  questionOrder: number
  sliceFileId: string
  pageId: string
  effectiveStatus: EffectiveStatusCode
  /** 原始扫描页引用，供教师查看整页扫描影像 */
  sourceScanPage?: ScannedPageRef
  /** 标准答案文本 */
  standardAnswer?: string
  /** 标准答案比对策略编码 */
  comparePolicy?: string
  /** 评分细则/采分点说明 */
  evaluationCriteria?: string
  /** OCR识别答案 */
  recognizedAnswer?: string
  /** AI建议分 */
  aiScore?: number
  /** AI诊断说明 */
  aiDiagnostic?: string
  /** 当前题目 AI 执行 trace，供定标徽标跳转 AI 历史定位 */
  aiTraceId?: string
  /** 试卷母版页引用，仅 ANSWER_SHEET 模式回填 */
  masterPaperPage?: ScannedPageRef
  /** AI 定标引用审计快照 */
  referenceExperienceAudit?: MarkAiReferenceExperienceAuditVO
}

/**
 * 查询阅卷任务对应的整卷视图。
 * 后端校验 task.reviewerUserId == 当前用户，并由 taskId 推导 paperInstanceId 防止跨试卷越权浏览。
 * POST /api/mark/organization/task/whole-paper
 */
export function getWholePaperView(request: WholePaperViewRequest): Promise<WholePaperViewVO> {
  return http.post<WholePaperViewVO>('/api/mark/organization/task/whole-paper', request)
}

/**
 * 查询阅卷任务对应的题目级批阅视图。
 * 后端校验 task.reviewerUserId == 当前用户，并由 taskId 推导制卷题目和切片信息。
 * POST /api/mark/organization/task/question-view
 */
export function getMarkingQuestionView(
  request: MarkingQuestionViewRequest,
): Promise<MarkingQuestionViewVO> {
  return http.post<MarkingQuestionViewVO>('/api/mark/organization/task/question-view', request)
}

/** 匿名整卷扫描页遮罩展示请求 - 对应后端 MarkingScanPageDisplayRequest */
export interface MarkingScanPageDisplayRequest {
  examId: string
  taskId: string
  pageId: string
}

/**
 * 获取匿名整卷阅卷遮罩扫描页 Blob URL。
 * POST /api/mark/organization/task/scan-page/display
 */
export async function getMarkingScanPageDisplayBlobUrl(
  request: MarkingScanPageDisplayRequest,
): Promise<string> {
  const response = await http.downloadByPost(
    '/api/mark/organization/task/scan-page/display',
    request,
  )
  const rawContentType = response.headers['content-type']
  const contentType
    = typeof rawContentType === 'string'
      ? rawContentType
      : Array.isArray(rawContentType)
        ? rawContentType.join(';')
        : ''
  if (contentType.includes('application/json')) {
    throw new Error('扫描页遮罩展示加载失败')
  }
  return URL.createObjectURL(response.data)
}

/**
 * 阅卷解匿名请求 - 对应后端 AnonymousRevealRequest。
 *
 * 必须由 Exam.createUser（主考老师本人）触发；必须传入登录密码 + 解匿名理由。
 * 后端通过 UserInternalClient.verifyPassword 校验密码哈希，校验通过后 CAS
 * 写入 5 分钟临时查看态，并写 t_exam_operation_log 审计。
 */
export interface AnonymousRevealRequest {
  examId: string
  taskId: string
  /** 登录密码（明文，仅用于二次验证） */
  currentPassword: string
  /** 解匿名理由（必填，写入审计日志） */
  reason: string
}

/** 解匿名响应 - 对应后端 AnonymousRevealResponse */
export interface AnonymousRevealVO {
  tokenValue: string
  studentName: string
  studentNo: string
  revealTime: string
  revealExpireTime: string
}

/**
 * 阅卷解匿名（R7 step-up reveal）。
 * 仅 Exam.createUser 本人可触发；后端密码二次验证通过后才解匿名。
 * POST /api/mark/organization/anonymous/reveal
 */
export function revealAnonymous(request: AnonymousRevealRequest): Promise<AnonymousRevealVO> {
  return http.post<AnonymousRevealVO>('/api/mark/organization/anonymous/reveal', request)
}

// ===================== 会话生命周期 =====================

/** 会话生命周期动作请求 - 对应后端 SessionLifecycleActionRequest */
export interface SessionLifecycleActionRequest {
  sessionId: string
  /** 操作原因，必填，最多 500 字 */
  reason: string
}

/**
 * 暂停正评会话（SESSION_ACTIVE → SESSION_PAUSED）。
 * 暂停后教师不能领取新任务、超时回收暂停倒计时。
 * POST /api/mark/organization/formal/pause
 */
export function pauseFormalSession(request: SessionLifecycleActionRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/formal/pause', request)
}

/**
 * 恢复正评会话（SESSION_PAUSED → SESSION_ACTIVE）。
 * POST /api/mark/organization/formal/resume
 */
export function resumeFormalSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/formal/resume', { id: sessionId })
}

/**
 * 关闭正评会话（SESSION_ACTIVE / PAUSED / COMPLETED → SESSION_CLOSED）。
 * 终态归档，进入后任务不可修改。
 * POST /api/mark/organization/formal/close
 */
export function closeFormalSession(request: SessionLifecycleActionRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/formal/close', request)
}

/**
 * 关闭试评会话（TRIAL_ASSIGNED / TRIAL_SUBMITTED / CALIBRATED → TRIAL_CLOSED）。
 * 试评失败废弃或校准完成归档。
 * POST /api/mark/organization/trial/close
 */
export function closeTrialSession(request: SessionLifecycleActionRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/trial/close', request)
}

/**
 * 软删除草稿态正评会话（仅 SESSION_CREATED 可删）。
 * 已启动 / 暂停 / 完成的会话不可删除，必须使用 closeFormalSession 归档。
 * POST /api/mark/organization/formal/delete
 */
export function deleteFormalSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/formal/delete', { id: sessionId })
}

/**
 * 软删除草稿态试评会话（仅 TRIAL_CREATED 可删）。
 * 已分配样本 / 已提交 / 已校准的会话不可删除，必须使用 closeTrialSession 归档。
 * POST /api/mark/organization/trial/delete
 */
export function deleteTrialSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/trial/delete', { id: sessionId })
}
