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
import type { ReviewTaskTypeCode } from '@/types/enums/review-task-type-enum'
import http from '@/config/axios'
import { GradeSourceCode } from '@/types/enums/grade-source-enum'
import {
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription,
} from '@/types/enums/review-task-status-enum'

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
    label: ReviewTaskStatusDescription[ReviewTaskStatusCode.PENDING],
    value: ReviewTaskStatusCode.PENDING,
  },
  {
    label: ReviewTaskStatusDescription[ReviewTaskStatusCode.IN_PROGRESS],
    value: ReviewTaskStatusCode.IN_PROGRESS,
  },
  {
    label: ReviewTaskStatusDescription[ReviewTaskStatusCode.INVALIDATED],
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
  studentUserId: string
  studentNo: string
  studentName: string
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
  studentUserId: string
  studentNo: string
  studentName: string
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
  /** 制卷形态: ANSWER_SHEET / FULL_PAPER */
  materialLayoutMode?: string
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
}

/** 批改来源徽标色调 */
export const GRADE_SOURCE_TONE: Record<GradeSourceCode, BadgeTone> = {
  [GradeSourceCode.AUTO_OBJECTIVE]: 'green',
  [GradeSourceCode.AUTO_OBJECTIVE_AI]: 'blue',
  [GradeSourceCode.LOCAL_SUBJECTIVE_AI]: 'blue',
  [GradeSourceCode.TEACHER]: 'orange',
}

/** 查询匿名批阅任务列表。 */
export function listReviewTasks(
  request: ReviewTaskQueryRequest,
): Promise<PageResult<ReviewTaskItemResponse>> {
  return http.post<PageResult<ReviewTaskItemResponse>>('/api/mark/exams/review-tasks', request)
}

/** 查询匿名批阅任务详情。 */
export function getReviewTaskDetail(request: ReviewTaskActionRequest): Promise<ReviewTaskDetailResponse> {
  return http.post<ReviewTaskDetailResponse>('/api/mark/exams/review-tasks/detail', request)
}

/** 领取匿名批阅任务（分派给当前教师）。 */
export function claimReviewTask(request: ReviewTaskActionRequest): Promise<ReviewTaskDetailResponse> {
  return http.post<ReviewTaskDetailResponse>('/api/mark/exams/review-tasks/claim', request)
}
