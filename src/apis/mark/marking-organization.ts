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
import http from '@/config/axios'

// ─── 状态枚举与文案 ─────────────────────────────────────────

/** 阅卷组织未创建业务码 - 与后端 ResultCodeEnum.MARKING_ORG_NOT_CREATED 对齐 */
export const MARKING_ORG_NOT_CREATED_CODE = 20013

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

export const QUESTION_GROUP_STATUS_TONE: Record<QuestionMarkingGroupStatusCode, 'gray' | 'blue' | 'green' | 'red'> = {
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

export const MARKING_ALLOCATION_MODE_LABEL: Record<MarkingAllocationModeCode, string> = {
  BY_QUESTION: '按题目分配',
  BY_CLASS: '按班级分配',
  ROUND_ROBIN: '轮询分配',
  RANDOM: '随机分配',
}

/** 任务回收 / 再分配模式编码 - 与后端 ReassignMode enum 对齐 */
export type MarkingReassignModeCode = 'AUTO' | 'MANUAL'

export const MARKING_REASSIGN_MODE_LABEL: Record<MarkingReassignModeCode, string> = {
  AUTO: '自动再分配',
  MANUAL: '手动再分配',
}

/**
 * 匿名令牌策略编码 - 后端存储为 String 自由文本，本常量仅作为前端推荐选项。
 * 后端 ExamTaskAllocationPolicy.anonymousTokenPolicy 字段不使用 enum，接受任意纯文本，
 * 但前端表单限定为以下语义明确的三种策略，避免随意输入。
 */
export type AnonymousTokenPolicyCode = 'NONE' | 'PER_EXAM' | 'PER_GROUP'

export const ANONYMOUS_TOKEN_POLICY_LABEL: Record<AnonymousTokenPolicyCode, string> = {
  NONE: '不匿名',
  PER_EXAM: '考试级匿名',
  PER_GROUP: '题组级匿名',
}

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

export const MARKING_TASK_STATUS_TONE: Record<MarkingTaskStatusCode, 'gray' | 'blue' | 'orange' | 'green' | 'red'> = {
  ALLOCATED: 'blue',
  IN_PROGRESS: 'orange',
  SUBMITTED: 'green',
  FINALIZED: 'green',
  RECYCLED: 'gray',
}

/**
 * 判断后端是否返回“阅卷组织未创建”业务态。
 * 只读取稳定 code，不依赖可变错误文案。
 */
export function isMarkingOrgNotCreatedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const businessError = error as {
    code?: number | string
    response?: {
      data?: {
        code?: number | string
      }
    }
  }
  const code = businessError.code ?? businessError.response?.data?.code
  return Number(code) === MARKING_ORG_NOT_CREATED_CODE
}

// ─── 请求载荷类型 ───────────────────────────────────────────

/** 创建阅卷组织请求 - 对应后端 OrganizationCreateRequest */
export interface OrganizationCreatePayload {
  examId: string
  leaderUserId: string
  anonymousMode?: boolean
  remark?: string
}

/** 阅卷组织查询请求 - 对应后端 OrganizationQueryRequest */
export interface OrganizationQueryPayload {
  examId: string
}

/** 阅卷组织按 ID 查询请求 - 对应后端 OrganizationQueryByIdRequest */
export interface OrganizationQueryByIdPayload {
  organizationId: string
}

/** 更新阅卷组织主信息请求 - 对应后端 OrganizationUpdateRequest */
export interface OrganizationUpdatePayload {
  organizationId: string
  leaderUserId: string
  anonymousMode?: boolean
  remark?: string
}

/** 删除阅卷组织请求 - 对应后端 OrganizationDeleteRequest */
export interface OrganizationDeletePayload {
  organizationId: string
}

/** 更新阅卷组织状态请求 - 对应后端 OrganizationStatusUpdateRequest */
export interface OrganizationStatusUpdatePayload {
  organizationId: string
  targetStatus: MarkingOrganizationStatusCode
}

/** 保存题目阅卷小组请求 - 对应后端 QuestionGroupSaveRequest */
export interface QuestionGroupSavePayload {
  organizationId: string
  groupId?: string
  groupName: string
  questionTemplateIds: string[]
  leaderUserId: string
  reviewerUserIds: string[]
}

/** 删除题目阅卷小组请求 - 对应后端 QuestionGroupDeleteRequest */
export interface QuestionGroupDeletePayload {
  groupId: string
}

/** 关闭题目阅卷小组请求 - 对应后端 QuestionGroupCloseRequest */
export interface QuestionGroupClosePayload {
  groupId: string
}

/** 保存任务分配策略请求 - 对应后端 AllocationPolicySaveRequest */
export interface AllocationPolicySavePayload {
  organizationId: string
  /** 题组ID，为空时表示组织级默认策略 */
  groupId?: string
  allocationMode: MarkingAllocationModeCode
  /** 每批分配任务数量 */
  batchSize?: number
  /** 教师最大待处理任务数 */
  loadLimit?: number
  anonymousTokenPolicy?: AnonymousTokenPolicyCode
  /** 优先级规则原始字段，教师侧页面不再展示或编辑 */
  priorityRule?: string
}

/** 保存任务回收策略请求 - 对应后端 RecyclePolicySaveRequest */
export interface RecyclePolicySavePayload {
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
export interface TrialSessionCreatePayload {
  organizationId: string
  groupId: string
}

/** 试评校准请求 - 对应后端 TrialSessionCalibrateRequest */
export interface TrialSessionCalibratePayload {
  sessionId: string
  /** 校准结果原始字段，教师侧页面不再展示或编辑 */
  calibrationResult?: string
  discussionNotes?: string
}

/** 创建正评会话请求 - 对应后端 FormalSessionCreateRequest */
export interface FormalSessionCreatePayload {
  organizationId: string
  groupId: string
  /** 任务范围描述 */
  taskScope?: string
}

/** 阅卷任务领取请求 - 对应后端 MarkingTaskClaimRequest */
export interface MarkingTaskClaimPayload {
  sessionId: string
  groupId: string
}

/** 阅卷任务提交请求 - 对应后端 MarkingTaskSubmitRequest */
export interface MarkingTaskSubmitPayload {
  taskId: string
  /** 教师给分 */
  score: number
  /** 批改批注 */
  annotationNote?: string
}

/** 阅卷任务查询请求 - 对应后端 MarkingTaskQueryRequest */
export interface MarkingTaskQueryPayload {
  examId: string
  groupId?: string
  sessionId?: string
  reviewerUserId?: string
  taskStatus?: MarkingTaskStatusCode
}

// ─── 响应载荷类型 ───────────────────────────────────────────

/** 题目阅卷小组详情响应 - 对应后端 QuestionMarkingGroupResponse */
export interface QuestionMarkingGroupVO {
  id: string
  groupName: string
  questionTemplateIds: string[]
  leaderUserId: string
  groupStatus: QuestionMarkingGroupStatusCode
  reviewerUserIds: string[]
  createTime?: string
}

/** 阅卷组织详情响应 - 对应后端 MarkingOrganizationResponse */
export interface MarkingOrganizationVO {
  id: string
  examId: string
  leaderUserId: string
  organizationStatus: MarkingOrganizationStatusCode
  anonymousMode: boolean
  remark?: string
  groups: QuestionMarkingGroupVO[]
  createTime?: string
  updateTime?: string
}

/** 阅卷任务详情响应 - 对应后端 MarkingTaskResponse */
export interface MarkingTaskVO {
  id: string
  examId: string
  groupId: string
  sessionId: string
  reviewerUserId: string
  paperInstanceId: string
  questionTemplateId: string
  sliceId: string
  /** 作答切片文件ID，用于前端拉取切片图 */
  sliceFileId?: string
  taskStatus: MarkingTaskStatusCode
  /** 评阅轮次（试评轮次 / 正评轮次） */
  reviewRound: number
  score?: string | number
  annotationNote?: string
  /** 匿名令牌值，匿名模式下代替学生身份 */
  anonymousToken?: string
  allocatedAt?: string
  submittedAt?: string
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

export const TRIAL_SESSION_STATUS_TONE: Record<TrialSessionStatusCode, 'gray' | 'blue' | 'orange' | 'green' | 'red'> = {
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

export const FORMAL_SESSION_STATUS_TONE: Record<FormalSessionStatusCode, 'gray' | 'green' | 'orange' | 'purple' | 'red'> = {
  SESSION_CREATED: 'gray',
  SESSION_ACTIVE: 'green',
  SESSION_PAUSED: 'orange',
  SESSION_COMPLETED: 'purple',
  SESSION_CLOSED: 'red',
}

/** 会话列表查询请求 - 对应后端 SessionListQueryRequest */
export interface SessionListQueryPayload {
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
  sessionStatus: TrialSessionStatusCode
  /** 校准结论原始字段，教师侧页面不直接展示 */
  calibrationResult?: string
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
  sessionStatus: FormalSessionStatusCode
  startTime?: string
  endTime?: string
  /** 任务范围原始字段，教师侧页面不直接展示 */
  taskScope?: string
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

// ─── API 调用 ────────────────────────────────────────────────

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${fieldName}必须是对象`)
  }
  return value as Record<string, unknown>
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${fieldName}必须是非空字符串`)
  }
  return value
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${fieldName}必须是布尔值`)
  }
  return value
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new TypeError(`${fieldName}必须是数字`)
  }
  return value
}

function requireStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new TypeError(`${fieldName}必须是字符串数组`)
  }
  return value
}

function requireOrganizationStatus(value: unknown, fieldName: string): MarkingOrganizationStatusCode {
  const code = requireString(value, fieldName) as MarkingOrganizationStatusCode
  if (!MARKING_ORGANIZATION_STATUS_LABEL[code]) {
    throw new TypeError(`${fieldName}存在未定义枚举值：${code}`)
  }
  return code
}

function requireQuestionGroupStatus(value: unknown, fieldName: string): QuestionMarkingGroupStatusCode {
  const code = requireString(value, fieldName) as QuestionMarkingGroupStatusCode
  if (!QUESTION_GROUP_STATUS_LABEL[code]) {
    throw new TypeError(`${fieldName}存在未定义枚举值：${code}`)
  }
  return code
}

function requireMarkingTaskStatus(value: unknown, fieldName: string): MarkingTaskStatusCode {
  const code = requireString(value, fieldName) as MarkingTaskStatusCode
  if (!MARKING_TASK_STATUS_LABEL[code]) {
    throw new TypeError(`${fieldName}存在未定义枚举值：${code}`)
  }
  return code
}

function requireTrialSessionStatus(value: unknown, fieldName: string): TrialSessionStatusCode {
  const code = requireString(value, fieldName) as TrialSessionStatusCode
  if (!TRIAL_SESSION_STATUS_LABEL[code]) {
    throw new TypeError(`${fieldName}存在未定义枚举值：${code}`)
  }
  return code
}

function requireFormalSessionStatus(value: unknown, fieldName: string): FormalSessionStatusCode {
  const code = requireString(value, fieldName) as FormalSessionStatusCode
  if (!FORMAL_SESSION_STATUS_LABEL[code]) {
    throw new TypeError(`${fieldName}存在未定义枚举值：${code}`)
  }
  return code
}

function validateQuestionMarkingGroup(value: unknown, fieldName: string): QuestionMarkingGroupVO {
  const item = requireObject(value, fieldName)
  return {
    id: requireString(item.id, `${fieldName}.id`),
    groupName: requireString(item.groupName, `${fieldName}.groupName`),
    questionTemplateIds: requireStringArray(item.questionTemplateIds, `${fieldName}.questionTemplateIds`),
    leaderUserId: requireString(item.leaderUserId, `${fieldName}.leaderUserId`),
    groupStatus: requireQuestionGroupStatus(item.groupStatus, `${fieldName}.groupStatus`),
    reviewerUserIds: requireStringArray(item.reviewerUserIds, `${fieldName}.reviewerUserIds`),
    createTime: typeof item.createTime === 'string' ? item.createTime : undefined,
  }
}

function validateMarkingOrganization(value: unknown): MarkingOrganizationVO {
  const item = requireObject(value, '阅卷组织响应')
  if (!Array.isArray(item.groups)) {
    throw new TypeError('阅卷组织响应.groups必须是数组')
  }
  return {
    id: requireString(item.id, '阅卷组织响应.id'),
    examId: requireString(item.examId, '阅卷组织响应.examId'),
    leaderUserId: requireString(item.leaderUserId, '阅卷组织响应.leaderUserId'),
    organizationStatus: requireOrganizationStatus(item.organizationStatus, '阅卷组织响应.organizationStatus'),
    anonymousMode: requireBoolean(item.anonymousMode, '阅卷组织响应.anonymousMode'),
    remark: typeof item.remark === 'string' ? item.remark : undefined,
    groups: item.groups.map((group, index) => validateQuestionMarkingGroup(group, `阅卷组织响应.groups[${index}]`)),
    createTime: typeof item.createTime === 'string' ? item.createTime : undefined,
    updateTime: typeof item.updateTime === 'string' ? item.updateTime : undefined,
  }
}

function validateTrialSession(value: unknown, fieldName: string): TrialSessionVO {
  const item = requireObject(value, fieldName)
  return {
    id: requireString(item.id, `${fieldName}.id`),
    examId: requireString(item.examId, `${fieldName}.examId`),
    organizationId: requireString(item.organizationId, `${fieldName}.organizationId`),
    groupId: requireString(item.groupId, `${fieldName}.groupId`),
    sessionStatus: requireTrialSessionStatus(item.sessionStatus, `${fieldName}.sessionStatus`),
    calibrationResult: typeof item.calibrationResult === 'string' ? item.calibrationResult : undefined,
    discussionNotes: typeof item.discussionNotes === 'string' ? item.discussionNotes : undefined,
    closeReason: typeof item.closeReason === 'string' ? item.closeReason : undefined,
    closeTime: typeof item.closeTime === 'string' ? item.closeTime : undefined,
    createTime: typeof item.createTime === 'string' ? item.createTime : undefined,
    updateTime: typeof item.updateTime === 'string' ? item.updateTime : undefined,
  }
}

function validateFormalSession(value: unknown, fieldName: string): FormalSessionVO {
  const item = requireObject(value, fieldName)
  return {
    id: requireString(item.id, `${fieldName}.id`),
    examId: requireString(item.examId, `${fieldName}.examId`),
    organizationId: requireString(item.organizationId, `${fieldName}.organizationId`),
    groupId: requireString(item.groupId, `${fieldName}.groupId`),
    sessionStatus: requireFormalSessionStatus(item.sessionStatus, `${fieldName}.sessionStatus`),
    startTime: typeof item.startTime === 'string' ? item.startTime : undefined,
    endTime: typeof item.endTime === 'string' ? item.endTime : undefined,
    taskScope: typeof item.taskScope === 'string' ? item.taskScope : undefined,
    pauseReason: typeof item.pauseReason === 'string' ? item.pauseReason : undefined,
    pauseTime: typeof item.pauseTime === 'string' ? item.pauseTime : undefined,
    closeReason: typeof item.closeReason === 'string' ? item.closeReason : undefined,
    closeTime: typeof item.closeTime === 'string' ? item.closeTime : undefined,
    createTime: typeof item.createTime === 'string' ? item.createTime : undefined,
    updateTime: typeof item.updateTime === 'string' ? item.updateTime : undefined,
  }
}

function validateMarkingTask(value: unknown, fieldName: string): MarkingTaskVO {
  const item = requireObject(value, fieldName)
  return {
    id: requireString(item.id, `${fieldName}.id`),
    examId: requireString(item.examId, `${fieldName}.examId`),
    groupId: requireString(item.groupId, `${fieldName}.groupId`),
    sessionId: requireString(item.sessionId, `${fieldName}.sessionId`),
    reviewerUserId: requireString(item.reviewerUserId, `${fieldName}.reviewerUserId`),
    paperInstanceId: requireString(item.paperInstanceId, `${fieldName}.paperInstanceId`),
    questionTemplateId: requireString(item.questionTemplateId, `${fieldName}.questionTemplateId`),
    sliceId: requireString(item.sliceId, `${fieldName}.sliceId`),
    sliceFileId: typeof item.sliceFileId === 'string' ? item.sliceFileId : undefined,
    taskStatus: requireMarkingTaskStatus(item.taskStatus, `${fieldName}.taskStatus`),
    reviewRound: requireNumber(item.reviewRound, `${fieldName}.reviewRound`),
    score: typeof item.score === 'number' || typeof item.score === 'string' ? item.score : undefined,
    annotationNote: typeof item.annotationNote === 'string' ? item.annotationNote : undefined,
    anonymousToken: typeof item.anonymousToken === 'string' ? item.anonymousToken : undefined,
    allocatedAt: typeof item.allocatedAt === 'string' ? item.allocatedAt : undefined,
    submittedAt: typeof item.submittedAt === 'string' ? item.submittedAt : undefined,
  }
}

function validateTeacherClaimContext(value: unknown): TeacherClaimContextVO {
  const item = requireObject(value, '教师领取上下文响应')
  if (!Array.isArray(item.groups)) {
    throw new TypeError('教师领取上下文响应.groups必须是数组')
  }
  return {
    examId: requireString(item.examId, '教师领取上下文响应.examId'),
    groups: item.groups.map((group, groupIndex) => {
      const groupItem = requireObject(group, `教师领取上下文响应.groups[${groupIndex}]`)
      if (!Array.isArray(groupItem.activeSessions)) {
        throw new TypeError(`教师领取上下文响应.groups[${groupIndex}].activeSessions必须是数组`)
      }
      return {
        groupId: requireString(groupItem.groupId, `教师领取上下文响应.groups[${groupIndex}].groupId`),
        groupName: requireString(groupItem.groupName, `教师领取上下文响应.groups[${groupIndex}].groupName`),
        organizationId: requireString(groupItem.organizationId, `教师领取上下文响应.groups[${groupIndex}].organizationId`),
        activeSessions: groupItem.activeSessions.map((session, sessionIndex) =>
          validateFormalSession(session, `教师领取上下文响应.groups[${groupIndex}].activeSessions[${sessionIndex}]`),
        ),
      }
    }),
  }
}

// ===================== 阅卷组织 =====================

/**
 * 创建阅卷组织。
 * POST /api/mark/organization/create
 */
export function createOrganization(payload: OrganizationCreatePayload): Promise<MarkingOrganizationVO> {
  return http.post<unknown>('/api/mark/organization/create', payload).then(validateMarkingOrganization)
}

/**
 * 查询阅卷组织详情。
 * POST /api/mark/organization/detail
 */
export function getOrganization(payload: OrganizationQueryPayload): Promise<MarkingOrganizationVO> {
  return http.post<unknown>('/api/mark/organization/detail', payload).then(validateMarkingOrganization)
}

/**
 * 按阅卷组织ID查询详情。
 * POST /api/mark/organization/detailById
 */
export function getOrganizationById(payload: OrganizationQueryByIdPayload): Promise<MarkingOrganizationVO> {
  return http.post<unknown>('/api/mark/organization/detailById', payload).then(validateMarkingOrganization)
}

/**
 * 更新阅卷组织主信息。
 * POST /api/mark/organization/update
 */
export function updateOrganization(payload: OrganizationUpdatePayload): Promise<MarkingOrganizationVO> {
  return http.post<unknown>('/api/mark/organization/update', payload).then(validateMarkingOrganization)
}

/**
 * 删除阅卷组织。
 * POST /api/mark/organization/delete
 */
export function deleteOrganization(payload: OrganizationDeletePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/delete', payload)
}

/**
 * 更新阅卷组织状态（管理员推进 / 撤销组织阶段）。
 * POST /api/mark/organization/updateStatus
 */
export function updateOrganizationStatus(payload: OrganizationStatusUpdatePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/updateStatus', payload)
}

// ===================== 题组管理 =====================

/**
 * 保存题目阅卷小组（含教师分配）；返回题组ID。
 * POST /api/mark/organization/group/save
 */
export function saveQuestionGroup(payload: QuestionGroupSavePayload): Promise<string> {
  return http.post<string>('/api/mark/organization/group/save', payload)
}

/**
 * 删除草稿题目阅卷小组。
 * POST /api/mark/organization/group/delete
 */
export function deleteQuestionGroup(payload: QuestionGroupDeletePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/group/delete', payload)
}

/**
 * 关闭题目阅卷小组。
 * POST /api/mark/organization/group/close
 */
export function closeQuestionGroup(payload: QuestionGroupClosePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/group/close', payload)
}

// ===================== 策略配置 =====================

/**
 * 保存任务分配策略。
 * POST /api/mark/organization/policy/allocation/save
 */
export function saveAllocationPolicy(payload: AllocationPolicySavePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/policy/allocation/save', payload)
}

/**
 * 保存任务回收策略。
 * POST /api/mark/organization/policy/recycle/save
 */
export function saveRecyclePolicy(payload: RecyclePolicySavePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/policy/recycle/save', payload)
}

// ===================== 试评会话 =====================

/**
 * 创建试评会话；返回试评会话ID。
 * POST /api/mark/organization/trial/create
 */
export function createTrialSession(payload: TrialSessionCreatePayload): Promise<string> {
  return http.post<string>('/api/mark/organization/trial/create', payload)
}

/**
 * 提交试评校准结论（含校准结果 + 讨论记录）。
 * POST /api/mark/organization/trial/calibrate
 */
export function calibrateTrialSession(payload: TrialSessionCalibratePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/trial/calibrate', payload)
}

/**
 * 查询试评会话列表（按阅卷组织，可选按题组过滤）。
 * POST /api/mark/organization/trial/list
 */
export function listTrialSessions(payload: SessionListQueryPayload): Promise<TrialSessionVO[]> {
  return http.post<unknown[]>('/api/mark/organization/trial/list', payload)
    .then(list => list.map((item, index) => validateTrialSession(item, `试评会话列表[${index}]`)))
}

// ===================== 正评会话 =====================

/**
 * 创建正评会话；返回正评会话ID。
 * POST /api/mark/organization/formal/create
 */
export function createFormalSession(payload: FormalSessionCreatePayload): Promise<string> {
  return http.post<string>('/api/mark/organization/formal/create', payload)
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
export function listFormalSessions(payload: SessionListQueryPayload): Promise<FormalSessionVO[]> {
  return http.post<unknown[]>('/api/mark/organization/formal/list', payload)
    .then(list => list.map((item, index) => validateFormalSession(item, `正评会话列表[${index}]`)))
}

// ===================== 阅卷任务 =====================

/**
 * 教师领取阅卷任务（CAS 守门，按当前组织分配策略批量分配）。
 * POST /api/mark/organization/task/claim
 */
export function claimMarkingTasks(payload: MarkingTaskClaimPayload): Promise<MarkingTaskVO[]> {
  return http.post<unknown[]>('/api/mark/organization/task/claim', payload)
    .then(list => list.map((item, index) => validateMarkingTask(item, `领取阅卷任务响应[${index}]`)))
}

/**
 * 教师提交阅卷任务（CAS 守门 reviewer_user_id + IN_PROGRESS，防止超时回收冲突）。
 * POST /api/mark/organization/task/submit
 */
export function submitMarkingTask(payload: MarkingTaskSubmitPayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/task/submit', payload)
}

/**
 * 查询阅卷任务列表。
 * POST /api/mark/organization/task/list
 */
export function listMarkingTasks(payload: MarkingTaskQueryPayload): Promise<MarkingTaskVO[]> {
  return http.post<unknown[]>('/api/mark/organization/task/list', payload)
    .then(list => list.map((item, index) => validateMarkingTask(item, `阅卷任务列表[${index}]`)))
}

/** 单任务详情查询请求 - 对应后端 MarkingTaskDetailQueryRequest */
export interface MarkingTaskDetailQueryPayload {
  taskId: string
}

/**
 * 查询单个阅卷任务详情；仅任务领取人本人可查询。
 * POST /api/mark/organization/task/detail
 */
export function getMarkingTaskDetail(payload: MarkingTaskDetailQueryPayload): Promise<MarkingTaskVO> {
  return http.post<unknown>('/api/mark/organization/task/detail', payload)
    .then(item => validateMarkingTask(item, '阅卷任务详情响应'))
}

/** 教师领取上下文查询请求 - 对应后端 TeacherClaimContextQueryRequest */
export interface TeacherClaimContextQueryPayload {
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
  payload: TeacherClaimContextQueryPayload,
): Promise<TeacherClaimContextVO> {
  return http.post<unknown>('/api/mark/organization/task/claim-context', payload)
    .then(validateTeacherClaimContext)
}

// ===================== 会话生命周期 =====================

/** 会话生命周期动作请求 - 对应后端 SessionLifecycleActionRequest */
export interface SessionLifecycleActionPayload {
  sessionId: string
  /** 操作原因，必填，最多 500 字 */
  reason: string
}

/**
 * 暂停正评会话（SESSION_ACTIVE → SESSION_PAUSED）。
 * 暂停后教师不能领取新任务、超时回收暂停倒计时。
 * POST /api/mark/organization/formal/pause
 */
export function pauseFormalSession(payload: SessionLifecycleActionPayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/formal/pause', payload)
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
export function closeFormalSession(payload: SessionLifecycleActionPayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/formal/close', payload)
}

/**
 * 关闭试评会话（TRIAL_ASSIGNED / TRIAL_SUBMITTED / CALIBRATED → TRIAL_CLOSED）。
 * 试评失败废弃或校准完成归档。
 * POST /api/mark/organization/trial/close
 */
export function closeTrialSession(payload: SessionLifecycleActionPayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/organization/trial/close', payload)
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
