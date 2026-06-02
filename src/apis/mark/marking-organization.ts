import type { AxiosResponse } from 'axios'
/**
 * 阅卷组织 API - 对接 edu-mark 模块 MarkingOrganizationController。
 *
 * 后端规则：
 * - 路径前缀 /api/mark/organization
 * - 写 / 查询全部为 POST + DTO body；启动/完成正评会话用 POST + @RequestParam(sessionId)
 * - 租户 / 操作人从 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 统一以 string 表达到前端
 *
 * 业务阶段（任课老师 / 阅卷管理员视角）：
 *   1. createOrganization 创建阅卷组织
 *   2. saveQuestionGroup 编排题组（题目模板 + 题组组长 + 阅卷教师）
 *   3. saveAllocationPolicy / saveRecyclePolicy 配置任务分配 / 回收策略
 *   4. createTrialSession + calibrateTrialSession 走试评校准
 *   5. createFormalSession + startFormalSession + completeFormalSession 走正评全流程
 *   6. claimTasks / submitTask / listTasks 教师领取与提交阅卷任务
 *   7. updateOrganizationStatus 管理员推进 / 撤销组织状态
 *   8. getOrganization / getOrganizationById 查询组织全貌（按 examId 或 organizationId）
 */
import type { PaperInstanceDisplayVO, QualityDecisionCode } from './exam'
import http from '@/config/axios'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

// ─── 状态枚举与文案 ─────────────────────────────────────────

/** 阅卷组织未创建业务码 - 与后端 ResultCodeEnum.MARKING_ORG_NOT_CREATED 对齐 */
export const MARKING_ORG_NOT_CREATED_CODE = 20013

/** Axios 拦截器抛出的后端业务错误对象 */
type MarkBusinessError = Error & {
  code?: number | string
  response?: AxiosResponse<ResultInfo<null>>
}

/** 阅卷组织状态编码 - 与后端 OrganizationStatus enum 对齐 */
export type MarkingOrganizationStatusCode
  = | 'ORG_DRAFT'
    | 'ORG_CONFIGURED'
    | 'TRIAL_MARKING'
    | 'FORMAL_MARKING'
    | 'QUALITY_REVIEW'
    | 'CLOSED'

export const MARKING_ORGANIZATION_STATUS_LABEL: Record<MarkingOrganizationStatusCode, string> = {
  ORG_DRAFT: '草稿',
  ORG_CONFIGURED: '已配置',
  TRIAL_MARKING: '试评中',
  FORMAL_MARKING: '正评中',
  QUALITY_REVIEW: '质量复核中',
  CLOSED: '已关闭',
}

export const MARKING_ORGANIZATION_STATUS_TONE: Record<
  MarkingOrganizationStatusCode,
  'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'
> = {
  ORG_DRAFT: 'gray',
  ORG_CONFIGURED: 'blue',
  TRIAL_MARKING: 'orange',
  FORMAL_MARKING: 'green',
  QUALITY_REVIEW: 'purple',
  CLOSED: 'red',
}

/** 题组状态编码 - 与后端 QuestionGroupStatus enum 对齐 */
export type QuestionMarkingGroupStatusCode
  = | 'GROUP_DRAFT'
    | 'GROUP_CONFIGURED'
    | 'GROUP_ACTIVE'
    | 'GROUP_CLOSED'

export const QUESTION_GROUP_STATUS_LABEL: Record<QuestionMarkingGroupStatusCode, string> = {
  GROUP_DRAFT: '草稿',
  GROUP_CONFIGURED: '已配置',
  GROUP_ACTIVE: '启用',
  GROUP_CLOSED: '已关闭',
}

export const QUESTION_GROUP_STATUS_TONE: Record<
  QuestionMarkingGroupStatusCode,
  'gray' | 'blue' | 'green' | 'red'
> = {
  GROUP_DRAFT: 'gray',
  GROUP_CONFIGURED: 'blue',
  GROUP_ACTIVE: 'green',
  GROUP_CLOSED: 'red',
}

/** 任务分配模式编码 - 与后端 AllocationMode enum 对齐 */
export type MarkingAllocationModeCode
  = | 'BY_QUESTION'
    | 'BY_CLASS'
    | 'ROUND_ROBIN'
    | 'RANDOM'
    | 'BY_PAPER_RANDOM'

export const MARKING_ALLOCATION_MODE_LABEL: Record<MarkingAllocationModeCode, string> = {
  BY_QUESTION: '按题目分配',
  BY_CLASS: '按班级分配',
  ROUND_ROBIN: '轮询分配',
  RANDOM: '随机分配',
  BY_PAPER_RANDOM: '整卷随机派发',
}
/** 阅卷分配单元编码 - 与后端 AllocationUnit enum 对齐 */
export type AllocationUnitCode = 'WHOLE_PAPER' | 'SELECTED_QUESTIONS' | 'RANDOM_QUESTIONS'

export const ALLOCATION_UNIT_LABEL: Record<AllocationUnitCode, string> = {
  WHOLE_PAPER: '整卷批阅',
  SELECTED_QUESTIONS: '选中试题批阅',
  RANDOM_QUESTIONS: '随机题目批阅',
}

/** 阅卷分配单元下拉选项，值必须与后端 AllocationUnit 枚举完全一致 */
export const ALLOCATION_UNIT_OPTIONS: Array<{
  label: string
  value: AllocationUnitCode
}> = [
  { value: 'WHOLE_PAPER', label: ALLOCATION_UNIT_LABEL.WHOLE_PAPER },
  { value: 'SELECTED_QUESTIONS', label: ALLOCATION_UNIT_LABEL.SELECTED_QUESTIONS },
  { value: 'RANDOM_QUESTIONS', label: ALLOCATION_UNIT_LABEL.RANDOM_QUESTIONS },
]

/** 阅卷匿名模式编码 - 与后端 AnonymityMode enum 对齐 */
export type AnonymityModeCode = 'ANONYMOUS' | 'NAMED'

export const ANONYMITY_MODE_LABEL: Record<AnonymityModeCode, string> = {
  ANONYMOUS: '匿名',
  NAMED: '实名',
}

/** 阅卷匿名模式下拉选项，值必须与后端 AnonymityMode 枚举完全一致 */
export const ANONYMITY_MODE_OPTIONS: Array<{
  label: string
  value: AnonymityModeCode
}> = [
  { value: 'ANONYMOUS', label: ANONYMITY_MODE_LABEL.ANONYMOUS },
  { value: 'NAMED', label: ANONYMITY_MODE_LABEL.NAMED },
]

/** 任务回收 / 再分配模式编码 - 与后端 ReassignMode enum 对齐 */
export type MarkingReassignModeCode = 'AUTO' | 'MANUAL'

export const MARKING_REASSIGN_MODE_LABEL: Record<MarkingReassignModeCode, string> = {
  AUTO: '自动再分配',
  MANUAL: '手动再分配',
}

/** 匿名令牌策略编码 - 与后端 AnonymousTokenPolicy enum 对齐 */
export type AnonymousTokenPolicyCode = 'NONE' | 'PER_EXAM' | 'PER_GROUP'

export const ANONYMOUS_TOKEN_POLICY_LABEL: Record<AnonymousTokenPolicyCode, string> = {
  NONE: '不匿名',
  PER_EXAM: '考试级匿名',
  PER_GROUP: '题组级匿名',
}

/** 匿名令牌策略下拉选项，值必须与前端提交合同完全一致 */
export const ANONYMOUS_TOKEN_POLICY_OPTIONS: Array<{
  label: string
  value: AnonymousTokenPolicyCode
}> = [
  { value: 'NONE', label: ANONYMOUS_TOKEN_POLICY_LABEL.NONE },
  { value: 'PER_EXAM', label: ANONYMOUS_TOKEN_POLICY_LABEL.PER_EXAM },
  { value: 'PER_GROUP', label: ANONYMOUS_TOKEN_POLICY_LABEL.PER_GROUP },
]

/** 阅卷任务状态编码 - 与后端 MarkingTaskStatus enum 对齐 */
export type MarkingTaskStatusCode
  = | 'ALLOCATED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'FINALIZED'
    | 'RECYCLED'

export const MARKING_TASK_STATUS_LABEL: Record<MarkingTaskStatusCode, string> = {
  ALLOCATED: '已分配',
  IN_PROGRESS: '批改中',
  SUBMITTED: '已提交',
  FINALIZED: '已定稿',
  RECYCLED: '已回收',
}

export const MARKING_TASK_STATUS_TONE: Record<
  MarkingTaskStatusCode,
  'gray' | 'blue' | 'orange' | 'green' | 'red'
> = {
  ALLOCATED: 'blue',
  IN_PROGRESS: 'orange',
  SUBMITTED: 'green',
  FINALIZED: 'green',
  RECYCLED: 'gray',
}

/** 阅卷任务状态下拉选项，值必须与后端 MarkingTaskStatus enum 完全一致 */
export const MARKING_TASK_STATUS_OPTIONS: Array<{
  label: string
  value: MarkingTaskStatusCode
}> = [
  { value: 'ALLOCATED', label: MARKING_TASK_STATUS_LABEL.ALLOCATED },
  { value: 'IN_PROGRESS', label: MARKING_TASK_STATUS_LABEL.IN_PROGRESS },
  { value: 'SUBMITTED', label: MARKING_TASK_STATUS_LABEL.SUBMITTED },
  { value: 'FINALIZED', label: MARKING_TASK_STATUS_LABEL.FINALIZED },
  { value: 'RECYCLED', label: MARKING_TASK_STATUS_LABEL.RECYCLED },
]

/** 题目类型编码 - 与后端 QuestionType enum 对齐 */
export type QuestionTypeCode = 'OBJECTIVE' | 'SUBJECTIVE'

export const QUESTION_TYPE_LABEL: Record<QuestionTypeCode, string> = {
  OBJECTIVE: '客观题',
  SUBJECTIVE: '主观题',
}

/** 生效状态编码 - 与后端 EffectiveStatus enum 对齐 */
export type EffectiveStatusCode = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'DISCARDED'
/**
 * 判断后端是否返回“阅卷组织未创建”业务态。
 * 只读取稳定 code，不依赖可变错误文案。
 */
export function isMarkingOrgNotCreatedError(error: MarkBusinessError): boolean {
  const code = error.code ?? error.response?.data.code
  return Number(code) === MARKING_ORG_NOT_CREATED_CODE
}

// ─── 请求模型类型 ───────────────────────────────────────────

/** 创建阅卷组织请求 - 对应后端 OrganizationCreateRequest */
export interface OrganizationCreateRequest {
  examId: string
  leaderUserId: string
  anonymousMode?: boolean
  remark?: string
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
  leaderUserId: string
  anonymousMode?: boolean
  remark?: string
}

/** 删除阅卷组织请求 - 对应后端 OrganizationDeleteRequest */
export interface OrganizationDeleteRequest {
  organizationId: string
}

/** 更新阅卷组织状态请求 - 对应后端 OrganizationStatusUpdateRequest */
export interface OrganizationStatusUpdateRequest {
  organizationId: string
  targetStatus: MarkingOrganizationStatusCode
}

/** 考试阅卷分配一站式规划请求 - 对应后端 ExamAllocationPlanRequest */
export interface ExamAllocationPlanRequest {
  examId: string
  leaderUserId: string
  anonymityMode: AnonymityModeCode
  allocationUnit: AllocationUnitCode
  allocationMode: MarkingAllocationModeCode
  /** 题目模板ID列表，题目级分配时必填 */
  questionTemplateIds?: string[]
  reviewerUserIds: string[]
  /** 每批分配任务数量 */
  batchSize: number
  /** 教师最大待处理任务数 */
  loadLimit: number
  anonymousTokenPolicy: AnonymousTokenPolicyCode
  /** 随机题目抽样数量 */
  randomQuestionSampleSize?: number
  /** 是否开启整卷双评 */
  dualReviewEnabled: boolean
  /** 仲裁分差阈值 */
  arbitrationScoreThreshold?: number
  /** 仲裁分差比例阈值 */
  arbitrationRatioThreshold?: number
  /** 仲裁教师用户ID */
  arbitratorUserId?: string
  remark?: string
}

/** 保存题目阅卷小组请求 - 对应后端 QuestionGroupSaveRequest */
export interface QuestionGroupSaveRequest {
  organizationId: string
  groupId?: string
  groupName: string
  questionTemplateIds: string[]
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
  /** 是否开启整卷双评 */
  dualReviewEnabled: boolean
  /** 仲裁分差阈值 */
  arbitrationScoreThreshold?: number
  /** 仲裁分差比例阈值 */
  arbitrationRatioThreshold?: number
  /** 仲裁教师用户ID */
  arbitratorUserId?: string
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
  questionTemplateId: string
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

/** 阅卷任务查询请求 - 对应后端 MarkingTaskQueryRequest */
export interface MarkingTaskQueryRequest {
  examId: string
  groupId?: string
  sessionId?: string
  reviewerUserId?: string
  taskStatus?: MarkingTaskStatusCode
  reviewRound?: number
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
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  questionTypeMessage: string
  fullScore: number
  questionStem?: string
  questionOrder: number
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
  createTime?: string
}

/** 阅卷组织详情响应 - 对应后端 MarkingOrganizationResponse */
export interface MarkingOrganizationVO {
  id: string
  examId: string
  examName: string
  examNo?: string
  leaderUserId: string
  leaderUserName: string
  leaderTeacherNo: string
  organizationStatus: MarkingOrganizationStatusCode
  anonymousMode: boolean
  remark?: string
  groups: QuestionMarkingGroupVO[]
  createTime?: string
  updateTime?: string
}

/** 考试阅卷分配一站式规划响应 - 对应后端 ExamAllocationPlanResponse */
export interface ExamAllocationPlanVO {
  organizationId: string
  groupId: string
  policyId: string
  sessionId: string
  taskCount: number
  allocationUnit: AllocationUnitCode
  anonymityMode: AnonymityModeCode
}

/** 考试阅卷分配规划预览响应 - 对应后端 ExamAllocationPlanPreviewResponse */
export interface ExamAllocationPlanPreviewVO {
  allocationUnit: AllocationUnitCode
  boundPaperCount: number
  questionScopeCount?: number
  randomSampleSize?: number
  registeredSliceCount?: number
  expectedTaskCount?: number
  reviewerCount: number
  ready: boolean
  readinessMessage?: string
  coverageMessage?: string
}

/** 阅卷任务详情响应 - 对应后端 MarkingTaskResponse */
/** 已定稿阅卷任务逐题给分回显 - 对应 MarkingTaskSubmittedQuestionScoreResponse */
export interface MarkingTaskSubmittedQuestionScoreVO {
  questionTemplateId: string
  questionNo: string
  score: number
  annotationText?: string
}

export interface MarkingTaskVO {
  id: string
  examId: string
  /** 题组ID */
  groupId: string
  /** 题组名称 */
  groupName: string
  sessionId: string
  sessionStatus: FormalSessionStatusCode
  sessionStatusMessage: string
  sessionStartTime?: string
  reviewerUserId: string
  reviewerName: string
  taskUnit: AllocationUnitCode
  anonymityMode: AnonymityModeCode
  taskStatus: MarkingTaskStatusCode
  /** 评阅轮次（试评轮次 / 正评轮次） */
  reviewRound: number
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
  allocatedAt?: string
  submittedAt?: string
  /** 已定稿任务的逐题给分回显；非 FINALIZED 为 undefined */
  submittedQuestionScores?: MarkingTaskSubmittedQuestionScoreVO[]
}

/** 试评会话状态编码 - 与后端 TrialSessionStatus enum 对齐 */
export type TrialSessionStatusCode
  = | 'TRIAL_CREATED'
    | 'TRIAL_ASSIGNED'
    | 'TRIAL_SUBMITTED'
    | 'CALIBRATED'
    | 'TRIAL_CLOSED'

export const TRIAL_SESSION_STATUS_LABEL: Record<TrialSessionStatusCode, string> = {
  TRIAL_CREATED: '已创建',
  TRIAL_ASSIGNED: '已分配样本',
  TRIAL_SUBMITTED: '教师已提交',
  CALIBRATED: '已校准',
  TRIAL_CLOSED: '试评关闭',
}

export const TRIAL_SESSION_STATUS_TONE: Record<
  TrialSessionStatusCode,
  'gray' | 'blue' | 'orange' | 'green' | 'red'
> = {
  TRIAL_CREATED: 'gray',
  TRIAL_ASSIGNED: 'blue',
  TRIAL_SUBMITTED: 'orange',
  CALIBRATED: 'green',
  TRIAL_CLOSED: 'red',
}

/** 正评会话状态编码 - 与后端 FormalSessionStatus enum 对齐 */
export type FormalSessionStatusCode
  = | 'SESSION_CREATED'
    | 'SESSION_ACTIVE'
    | 'SESSION_PAUSED'
    | 'SESSION_COMPLETED'
    | 'SESSION_CLOSED'

export const FORMAL_SESSION_STATUS_LABEL: Record<FormalSessionStatusCode, string> = {
  SESSION_CREATED: '已创建',
  SESSION_ACTIVE: '进行中',
  SESSION_PAUSED: '已暂停',
  SESSION_COMPLETED: '已完成',
  SESSION_CLOSED: '已关闭',
}

export const FORMAL_SESSION_STATUS_TONE: Record<
  FormalSessionStatusCode,
  'gray' | 'green' | 'orange' | 'purple' | 'red'
> = {
  SESSION_CREATED: 'gray',
  SESSION_ACTIVE: 'green',
  SESSION_PAUSED: 'orange',
  SESSION_COMPLETED: 'purple',
  SESSION_CLOSED: 'red',
}

/** 会话列表查询请求 - 对应后端 SessionListQueryRequest */
export interface SessionListQueryRequest {
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
}

/** 正评会话详情响应 - 对应后端 FormalSessionResponse */
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

/**
 * 校验题组合同枚举，保证页面状态写入前已发现后端枚举漂移。
 */
export function validateQuestionMarkingGroupContract(record: QuestionMarkingGroupVO): void {
  strictEnumLabel(QUESTION_GROUP_STATUS_LABEL, record.groupStatus, '题组状态')
  strictEnumTone(QUESTION_GROUP_STATUS_TONE, record.groupStatus, '题组状态')
  record.questions.forEach((question) => {
    strictEnumLabel(QUESTION_TYPE_LABEL, question.questionType, '题型')
  })
}

/**
 * 校验阅卷组织合同枚举，避免模板渲染路径成为首次失败位置。
 */
export function validateMarkingOrganizationContract(record: MarkingOrganizationVO): void {
  strictEnumLabel(MARKING_ORGANIZATION_STATUS_LABEL, record.organizationStatus, '阅卷组织状态')
  strictEnumTone(MARKING_ORGANIZATION_STATUS_TONE, record.organizationStatus, '阅卷组织状态')
  record.groups.forEach(validateQuestionMarkingGroupContract)
}

/**
 * 校验试评会话合同枚举，确保会话列表展示前合同已通过。
 */
export function validateTrialSessionContract(record: TrialSessionVO): void {
  strictEnumLabel(TRIAL_SESSION_STATUS_LABEL, record.sessionStatus, '试评会话状态')
  strictEnumTone(TRIAL_SESSION_STATUS_TONE, record.sessionStatus, '试评会话状态')
}

/**
 * 校验正评会话合同枚举，确保会话状态和任务单元与后端枚举一致。
 */
export function validateFormalSessionContract(record: FormalSessionVO): void {
  strictEnumLabel(FORMAL_SESSION_STATUS_LABEL, record.sessionStatus, '正评会话状态')
  strictEnumTone(FORMAL_SESSION_STATUS_TONE, record.sessionStatus, '正评会话状态')
  strictEnumLabel(ALLOCATION_UNIT_LABEL, record.allocationUnit, '批阅任务单元')
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
 * 查询阅卷组织详情。
 * POST /api/mark/organization/detail
 */
export function getOrganization(request: OrganizationQueryRequest): Promise<MarkingOrganizationVO> {
  return http.post<MarkingOrganizationVO>('/api/mark/organization/detail', request)
}

/**
 * 按阅卷组织ID查询详情。
 * POST /api/mark/organization/detailById
 */
export function getOrganizationById(
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

/**
 * 更新阅卷组织状态（管理员推进 / 撤销组织阶段）。
 * POST /api/mark/organization/updateStatus
 */
export function updateOrganizationStatus(
  request: OrganizationStatusUpdateRequest,
): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/updateStatus', request)
}

/**
 * 一站式规划考试阅卷分配（创建组织、题组、策略与正评草稿会话，不立即生成任务）。
 * POST /api/mark/organization/allocation/plan
 */
export function planAllocation(request: ExamAllocationPlanRequest): Promise<ExamAllocationPlanVO> {
  return http.post<ExamAllocationPlanVO>('/api/mark/organization/allocation/plan', request)
}

/**
 * 预览阅卷分配覆盖范围与预计任务量。
 * POST /api/mark/organization/allocation/preview
 */
export function previewAllocationPlan(
  request: ExamAllocationPlanRequest,
): Promise<ExamAllocationPlanPreviewVO> {
  return http.post<ExamAllocationPlanPreviewVO>(
    '/api/mark/organization/allocation/preview',
    request,
  )
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
 * 查询试评会话列表（按阅卷组织，可选按题组过滤）。
 * POST /api/mark/organization/trial/list
 */
export function listTrialSessions(request: SessionListQueryRequest): Promise<TrialSessionVO[]> {
  return http.post<TrialSessionVO[]>('/api/mark/organization/trial/list', request)
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
 * POST /api/mark/organization/formal/start?sessionId=
 */
export function startFormalSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>(
    `/api/mark/organization/formal/start?sessionId=${encodeURIComponent(sessionId)}`,
  )
}

/**
 * 完成正评会话（CAS 守门 SESSION_ACTIVE → SESSION_COMPLETED）。
 * POST /api/mark/organization/formal/complete?sessionId=
 */
export function completeFormalSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>(
    `/api/mark/organization/formal/complete?sessionId=${encodeURIComponent(sessionId)}`,
  )
}

/**
 * 查询正评会话列表（按阅卷组织，可选按题组过滤）。
 * POST /api/mark/organization/formal/list
 */
export function listFormalSessions(request: SessionListQueryRequest): Promise<FormalSessionVO[]> {
  return http.post<FormalSessionVO[]>('/api/mark/organization/formal/list', request)
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

/**
 * 查询阅卷任务列表。
 * POST /api/mark/organization/task/list
 */
export function listMarkingTasks(request: MarkingTaskQueryRequest): Promise<MarkingTaskVO[]> {
  return http.post<MarkingTaskVO[]>('/api/mark/organization/task/list', request)
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
}

/** 题组级领取上下文 - 对应后端 TeacherClaimContextResponse.GroupClaimContext */
export interface GroupClaimContextVO {
  groupId: string
  groupName: string
  organizationId: string
  /** 该题组下当前活跃的正评会话（session_status = SESSION_ACTIVE） */
  activeSessions: FormalSessionVO[]
}

/** 教师领取上下文响应 - 对应后端 TeacherClaimContextResponse */
export interface TeacherClaimContextVO {
  examId: string
  /** 教师所属的活跃题组上下文列表 */
  groups: GroupClaimContextVO[]
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
  questionTemplateId: string
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
 * 后端校验 task.reviewerUserId == 当前用户，并由 taskId 推导题目模板和切片信息。
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
 * POST /api/mark/organization/formal/resume?sessionId=
 */
export function resumeFormalSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>(
    `/api/mark/organization/formal/resume?sessionId=${encodeURIComponent(sessionId)}`,
  )
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
 * POST /api/mark/organization/formal/delete?sessionId=
 */
export function deleteFormalSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>(
    `/api/mark/organization/formal/delete?sessionId=${encodeURIComponent(sessionId)}`,
  )
}

/**
 * 软删除草稿态试评会话（仅 TRIAL_CREATED 可删）。
 * 已分配样本 / 已提交 / 已校准的会话不可删除，必须使用 closeTrialSession 归档。
 * POST /api/mark/organization/trial/delete?sessionId=
 */
export function deleteTrialSession(sessionId: string): Promise<boolean> {
  return http.post<boolean>(
    `/api/mark/organization/trial/delete?sessionId=${encodeURIComponent(sessionId)}`,
  )
}
