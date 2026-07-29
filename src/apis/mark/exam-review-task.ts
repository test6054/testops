import type { AiAbilityCode } from './exam-grade'
import type { MarkingScanPageRefVO } from './exam-scan'
import type { PaperInstanceDisplayVO } from './exam-score'
import type { ObjectiveComparePolicyCode } from './exam-standard-answer'
import type { QuestionTypeCode } from './question-type'
/**
 * 阅卷考试匿名复核任务 API - 对接 /api/mark/exams/review-tasks/*。
 */
import type { MarkAiReferenceExperienceAuditResponse } from '@/apis/mark/grading-experience-assist'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { ExamMaterialLayoutModeCode } from '@/types/enums/exam-material-layout-mode-enum'
import { ALL_EXAM_MATERIAL_LAYOUT_MODE_CODES } from '@/types/enums/exam-material-layout-mode-enum'
import type { ReviewTaskTypeCode } from '@/types/enums/review-task-type-enum'
import { ALL_REVIEW_TASK_TYPE_CODES } from '@/types/enums/review-task-type-enum'
import http from '@/config/axios'
import { ALL_GRADE_SOURCE_CODES, GradeSourceCode } from '@/types/enums/grade-source-enum'
import { ALL_OBJECTIVE_COMPARE_POLICY_CODES } from '@/types/enums/objective-compare-policy-enum'
import { ALL_QUALITY_DECISION_CODES } from '@/types/enums/quality-decision-enum'
import { ALL_QUESTION_TYPE_CODES } from '@/types/enums/question-type-enum'
import {
  ALL_REVIEW_TASK_STATUS_CODES,
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription
} from '@/types/enums/review-task-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 匿名批阅任务查询请求 - 对应 ReviewTaskQueryRequest */
export interface ReviewTaskQueryRequest extends QueryDto {
  examId: string
  /** 复核状态编码，空查全部 */
  status?: ReviewTaskStatusCode
  layoutQuestionId?: string
  /** 复核任务类型过滤，空查全部 */
  reviewType?: ReviewTaskTypeCode
  /** 批改来源过滤，空查全部 */
  gradeSource?: GradeSourceCode
  /** 是否排除题目复核仲裁任务 */
  excludeArbitration?: boolean
  /** 指派教师用户 ID */
  assignedTeacherUserId?: string
  /** 是否仅查询已结案任务 */
  completedOnly?: boolean
  /** 题号精确匹配 */
  questionNo?: string
}

export {
  ALL_GRADE_SOURCE_CODES,
  GradeSourceCode,
  GradeSourceDescription,
} from '@/types/enums/grade-source-enum'

export {
  ALL_REVIEW_TASK_STATUS_CODES,
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription,
} from '@/types/enums/review-task-status-enum'
/** 复核任务类型编码 - 与后端 com.nybc.edu.common.enums.TaskType 一一对齐。 */
export {
  ALL_REVIEW_TASK_TYPE_CODES,
  ReviewTaskTypeCode,
  ReviewTaskTypeDescription,
  ReviewTaskTypeTone,
} from '@/types/enums/review-task-type-enum'

/** 复核任务状态标签色 */
export const REVIEW_TASK_STATUS_TONE: Record<ReviewTaskStatusCode, BadgeTone> = {
  [ReviewTaskStatusCode.PENDING]: 'orange',
  [ReviewTaskStatusCode.IN_PROGRESS]: 'blue',
  [ReviewTaskStatusCode.APPROVED]: 'green',
  [ReviewTaskStatusCode.REJECTED]: 'red',
  [ReviewTaskStatusCode.INVALIDATED]: 'gray',
}

/** 复核任务 Hub 页状态筛选项（仅展示待办相关子集）。 */
export const REVIEW_TASK_HUB_STATUS_FILTER_OPTIONS: Array<{
  label: string
  value: ReviewTaskStatusCode
}> = [
  {
    label: strictEnumLabel(ReviewTaskStatusDescription, ReviewTaskStatusCode.PENDING, '阅卷任务状态'),
    value: ReviewTaskStatusCode.PENDING,
  },
  {
    label: strictEnumLabel(ReviewTaskStatusDescription, ReviewTaskStatusCode.IN_PROGRESS, '阅卷任务状态'),
    value: ReviewTaskStatusCode.IN_PROGRESS,
  },
  {
    label: strictEnumLabel(ReviewTaskStatusDescription, ReviewTaskStatusCode.INVALIDATED, '阅卷任务状态'),
    value: ReviewTaskStatusCode.INVALIDATED,
  },
]

/** 匿名批阅任务项 - 对应 ReviewTaskItemResponse */
export interface ReviewTaskItemResponse {
  reviewTaskId: string
  examId: string
  anonymousNo: string
  paperInstanceId: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  className: string
  paperDisplay: PaperInstanceDisplayVO
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  gradeResultId: string
  aiScore?: number
  status: ReviewTaskStatusCode
  assignedTeacherUserId?: string
  assignedTeacherName?: string
  /** 复核任务类型编码，区分客观题硬比对 / 客观题 AI / 主观题 AI 三个通道 */
  reviewType: ReviewTaskTypeCode
  /** 批改来源编码，便于前端按通道筛选与显示颜色标签 */
  gradeSource: GradeSourceCode
  updateTime?: string
  /** MVR-282：是否可批量确认等写操作；与 BE requireExamReviewerPermission 对齐 */
  canManageReviewerWrites?: boolean
}

/** 匿名批阅任务动作请求 - 对应 ReviewTaskActionRequest */
export interface ReviewTaskActionRequest {
  examId: string
  reviewTaskId: string
}

/** 匿名批阅任务详情 - 对应 ReviewTaskDetailResponse */
export interface ReviewTaskDetailResponse {
  reviewTaskId: string
  anonymousNo: string
  /** AI trace ID，便于教师在批阅工作台定位本题 AI 执行记录 */
  aiTraceId?: string
  /** AI 能力编码，来源于后端 AI 执行记录，前端不得从 traceId 推断 */
  aiAbilityCode?: AiAbilityCode
  /** AI 是否被限流或阻断，为 true 时教师需依赖人工复核 */
  aiLimited?: boolean
  /** AI 定标引用审计快照 */
  referenceExperienceAudit?: MarkAiReferenceExperienceAuditResponse
  examId: string
  paperInstanceId: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  className: string
  paperDisplay: PaperInstanceDisplayVO
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  sliceFileId?: string
  /** 原始扫描页引用，供教师对照整页扫描影像 */
  sourceScanPage?: MarkingScanPageRefVO
  recognizedAnswer?: string
  gradeResultId: string
  aiScore?: number
  aiDiagnostic?: string
  commentText?: string
  status: ReviewTaskStatusCode
  /** 当前认领教师用户 ID；PENDING 未领取时为空 */
  assignedTeacherUserId?: string
  /** 制卷形态 */
  materialLayoutMode?: ExamMaterialLayoutModeCode
  /** 复核任务类型编码 */
  reviewType: ReviewTaskTypeCode
  /** 批改来源编码 */
  gradeSource: GradeSourceCode
  /** 复核详情绑定的作答切片ID */
  responseSliceId: string
  /** 复核详情绑定的 OCR 识别结果ID */
  recognitionResultId?: string
  /** 制卷页引用，仅 ANSWER_SHEET 模式回填 */
  layoutPaperPage?: MarkingScanPageRefVO
  /** 题干文本 */
  questionStem?: string
  /** 标准答案文本 */
  standardAnswer?: string
  /** 客观题比较策略编码 */
  comparePolicy?: ObjectiveComparePolicyCode
  /** 评分细则/采分点说明 */
  evaluationCriteria?: string
  /** MVR-282：是否可 AI 复评等写操作；与 BE requireExamReviewerPermission 对齐 */
  canManageReviewerWrites?: boolean
  /** MVR-327：主考代办接管；与 BE isExamOwner 同源 */
  canManageOwnerReviewOverride?: boolean
}

/** 批改来源徽标色调 */
export const GRADE_SOURCE_TONE: Record<GradeSourceCode, BadgeTone> = {
  [GradeSourceCode.AUTO_OBJECTIVE]: 'green',
  [GradeSourceCode.AUTO_OBJECTIVE_AI]: 'blue',
  [GradeSourceCode.LOCAL_SUBJECTIVE_AI]: 'blue',
  [GradeSourceCode.TEACHER]: 'orange',
}

/** 题目复核仲裁工作台 KPI 汇总 */
export interface ReviewArbitrationSummaryResponse {
  totalCount: string
  pendingCount: string
  inProgressMineCount: string
  completedCount: string
  avgAiRatioPercent?: number | null
}

/** 校验复核任务分页、考试锚点、唯一身份与评分字段，阻止残缺任务进入批量写工作台。 */
export async function listReviewTasks(
  request: ReviewTaskQueryRequest,
): Promise<PageResult<ReviewTaskItemResponse>> {
  const response = await http.post<PageResult<ReviewTaskItemResponse>>(
    '/api/mark/exams/review-tasks',
    request,
  )
  const reviewTaskIds = Array.isArray(response.list)
    ? new Set(response.list.map((item) => item.reviewTaskId))
    : new Set<string>()
  const gradeResultIds = Array.isArray(response.list)
    ? new Set(response.list.map((item) => item.gradeResultId))
    : new Set<string>()
  const reviewerWriteCapabilities = Array.isArray(response.list)
    ? new Set(response.list.map((item) => item.canManageReviewerWrites))
    : new Set<boolean | undefined>()
  if (
    !Array.isArray(response.list)
    || !Number.isInteger(response.total)
    || response.total < 0
    || !Number.isInteger(response.pageNum)
    || response.pageNum < 1
    || !Number.isInteger(response.pageSize)
    || response.pageSize < 1
    || !Number.isInteger(response.pages)
    || response.pages < 0
    || response.list.length > response.pageSize
    || response.list.length > response.total
    || reviewTaskIds.size !== response.list.length
    || gradeResultIds.size !== response.list.length
    || reviewerWriteCapabilities.size > 1
  ) {
    throw new TypeError('复核任务分页合同异常：分页字段或任务集合不可用')
  }
  for (const item of response.list) {
    if (
      !item.reviewTaskId
      || item.examId !== request.examId
      || !item.anonymousNo?.trim()
      || !item.paperInstanceId
      || !item.paperDisplay?.primaryText?.trim()
      || !item.layoutQuestionId
      || !item.questionNo?.trim()
      || !ALL_QUESTION_TYPE_CODES.includes(item.questionType)
      || !Number.isFinite(item.fullScore)
      || item.fullScore < 0
      || !item.gradeResultId
      || (item.aiScore != null
        && (!Number.isFinite(item.aiScore) || item.aiScore < 0 || item.aiScore > item.fullScore))
      || !ALL_REVIEW_TASK_STATUS_CODES.includes(item.status)
      || !ALL_REVIEW_TASK_TYPE_CODES.includes(item.reviewType)
      || !ALL_GRADE_SOURCE_CODES.includes(item.gradeSource)
      || typeof item.canManageReviewerWrites !== 'boolean'
      || (item.assignedTeacherUserId
        ? !item.assignedTeacherName?.trim()
        : item.assignedTeacherName != null)
    ) {
      throw new TypeError('复核任务合同异常：考试锚点、任务身份或评分字段不可用')
    }
  }
  return response
}

/** 同题复核流水线队列查询请求 */
export interface ReviewTaskPipelineQueryRequest {
  examId: string
  layoutQuestionId: string
  reviewType: ReviewTaskTypeCode
  gradeSource: GradeSourceCode
  excludeArbitration?: boolean
  currentReviewTaskId?: string
}

/** 同题复核流水线队列响应 */
export interface ReviewTaskPipelineItemResponse {
  reviewTaskId: string
  examId: string
  layoutQuestionId: string
  gradeResultId: string
  status: ReviewTaskStatusCode
  reviewType: ReviewTaskTypeCode
  gradeSource: GradeSourceCode
  assignedTeacherUserId?: string
}

export interface ReviewTaskPipelineResponse {
  totalCount: number
  currentIndex: number
  items: ReviewTaskPipelineItemResponse[]
}

/** 校验流水线队列身份、考试/题目范围与当前位次，阻止跨题或残缺任务进入连续复核导航。 */
export async function getReviewTaskPipeline(
  request: ReviewTaskPipelineQueryRequest,
): Promise<ReviewTaskPipelineResponse> {
  const response = await http.post<ReviewTaskPipelineResponse>('/api/mark/exams/review-tasks/pipeline', request)
  if (
    !Array.isArray(response.items)
    || !Number.isInteger(response.totalCount)
    || response.totalCount !== response.items.length
    || !Number.isInteger(response.currentIndex)
    || response.currentIndex < 0
    || response.currentIndex > response.totalCount
    || (!request.currentReviewTaskId && response.currentIndex !== 0)
  ) {
    throw new TypeError('复核流水线合同异常：队列计数或当前任务位次不可用')
  }
  const reviewTaskIds = new Set<string>()
  for (const item of response.items) {
    if (
      !item.reviewTaskId
      || reviewTaskIds.has(item.reviewTaskId)
      || item.examId !== request.examId
      || item.layoutQuestionId !== request.layoutQuestionId
      || item.reviewType !== request.reviewType
      || item.gradeSource !== request.gradeSource
      || !item.gradeResultId
      || !ALL_REVIEW_TASK_STATUS_CODES.includes(item.status)
      || (item.status !== ReviewTaskStatusCode.PENDING
        && item.status !== ReviewTaskStatusCode.IN_PROGRESS)
      || (item.status === ReviewTaskStatusCode.PENDING && item.assignedTeacherUserId != null)
      || (item.status === ReviewTaskStatusCode.IN_PROGRESS && !item.assignedTeacherUserId)
    ) {
      throw new TypeError('复核流水线合同异常：任务身份、范围或状态不可用')
    }
    reviewTaskIds.add(item.reviewTaskId)
  }
  if (
    request.currentReviewTaskId
    && response.currentIndex > 0
    && response.items[response.currentIndex - 1]?.reviewTaskId !== request.currentReviewTaskId
  ) {
    throw new TypeError('复核流水线合同异常：当前任务位次与任务标识不一致')
  }
  return response
}

/** 查询题目复核仲裁工作台 KPI 汇总。 */
export function getReviewArbitrationSummary(request: {
  examId: string
}): Promise<ReviewArbitrationSummaryResponse> {
  return http.post<ReviewArbitrationSummaryResponse>(
    '/api/mark/exams/review-tasks/arbitration-summary',
    request,
  )
}

/** 校验匿名复核详情的正式证据、评分范围、任务状态与写能力位。 */
function assertReviewTaskDetail(
  response: ReviewTaskDetailResponse,
  request: ReviewTaskActionRequest,
): ReviewTaskDetailResponse {
  const sourcePage = response.sourceScanPage
  if (
    response.reviewTaskId !== request.reviewTaskId
    || response.examId !== request.examId
    || !response.anonymousNo?.trim()
    || !response.paperInstanceId
    || !response.paperDisplay?.primaryText?.trim()
    || !response.layoutQuestionId
    || !response.questionNo?.trim()
    || !ALL_QUESTION_TYPE_CODES.includes(response.questionType)
    || !Number.isFinite(response.fullScore)
    || response.fullScore < 0
    || !response.gradeResultId
    || !ALL_REVIEW_TASK_STATUS_CODES.includes(response.status)
    || !ALL_REVIEW_TASK_TYPE_CODES.includes(response.reviewType)
    || !ALL_GRADE_SOURCE_CODES.includes(response.gradeSource)
    || !response.responseSliceId
    || !response.recognitionResultId
    || !response.sliceFileId
    || !sourcePage?.pageId
    || !sourcePage.fileId
    || !Number.isInteger(sourcePage.pageSeq)
    || sourcePage.pageSeq < 1
    || !ALL_QUALITY_DECISION_CODES.includes(sourcePage.qualityStatus)
    || (response.aiScore != null
      && (!Number.isFinite(response.aiScore) || response.aiScore < 0 || response.aiScore > response.fullScore))
    || typeof response.canManageReviewerWrites !== 'boolean'
    || typeof response.canManageOwnerReviewOverride !== 'boolean'
    || (response.canManageOwnerReviewOverride && !response.canManageReviewerWrites)
    || (response.status === ReviewTaskStatusCode.PENDING
      && response.assignedTeacherUserId != null)
    || (response.status === ReviewTaskStatusCode.IN_PROGRESS
      && !response.assignedTeacherUserId)
    || (response.aiLimited != null && typeof response.aiLimited !== 'boolean')
    || (response.materialLayoutMode != null
      && !ALL_EXAM_MATERIAL_LAYOUT_MODE_CODES.includes(response.materialLayoutMode))
    || (response.comparePolicy != null
      && !ALL_OBJECTIVE_COMPARE_POLICY_CODES.includes(response.comparePolicy))
  ) {
    throw new TypeError('复核任务详情合同异常：任务身份、正式证据或评分字段不可用')
  }
  return response
}

/** 查询匿名批阅任务详情。 */
export async function getReviewTaskDetail(request: ReviewTaskActionRequest): Promise<ReviewTaskDetailResponse> {
  const response = await http.post<ReviewTaskDetailResponse>('/api/mark/exams/review-tasks/detail', request)
  return assertReviewTaskDetail(response, request)
}

/** 领取匿名批阅任务（分派给当前教师）。 */
export async function claimReviewTask(request: ReviewTaskActionRequest): Promise<ReviewTaskDetailResponse> {
  const response = await http.post<ReviewTaskDetailResponse>('/api/mark/exams/review-tasks/claim', request)
  const detail = assertReviewTaskDetail(response, request)
  if (detail.status !== ReviewTaskStatusCode.IN_PROGRESS || !detail.assignedTeacherUserId) {
    throw new TypeError('复核任务领取回执异常：任务未进入处理中或缺少认领教师')
  }
  return detail
}
