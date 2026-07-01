import type { AiAbilityCode } from './exam-grade'
import type { MarkingScanPageRefVO } from './exam-scan'
import type { PaperInstanceDisplayVO } from './exam-score'
import type { ObjectiveComparePolicyCode } from './exam-standard-answer'
import type { QuestionTypeCode } from './question-type'
/**
 * 阅卷考试匿名复核任务 API - 对接 /api/mark/exams/review-tasks/*。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import {
  assertUserFacing,
  assertUserFacingFiniteNumber,
  assertUserFacingText,
} from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'
import { AI_ABILITY_LABEL } from './exam-grade'
import { QUESTION_TYPE_LABEL } from './question-type'

const REVIEW_TASK_DATA_ERROR = '复核任务数据异常，请刷新后重试'

/** 匿名批阅任务查询请求 - 对应 ReviewTaskQueryRequest */
export interface ReviewTaskQueryRequest extends QueryDto {
  examId: string
  /** 复核状态编码，空查全部 */
  status?: ReviewTaskStatusCode
  questionTemplateId?: string
  /** 复核任务类型过滤，空查全部 */
  reviewType?: ReviewTaskTypeCode
  /** 批改来源过滤，空查全部 */
  gradeSource?: GradeSourceCode
  /** 是否排除题目复核仲裁任务 */
  excludeArbitration?: boolean
}

/** 复核任务类型编码 - 与后端 com.nybc.edu.common.enums.TaskType 一一对齐。 */
export type ReviewTaskTypeCode
  = | 'OBJECTIVE_AUTO_REVIEW'
    | 'OBJECTIVE_AI_REVIEW'
    | 'SUBJECTIVE_AI_REVIEW'
    | 'QUESTION_REVIEW_ARBITRATION'

/** 复核任务类型中文标签与颜色，便于前端 tag 渲染 */
export const REVIEW_TASK_TYPE_META: Record<
  ReviewTaskTypeCode,
  { label: string, color: 'blue' | 'green' | 'purple' }
> = {
  OBJECTIVE_AUTO_REVIEW: { label: '客观题（硬比对）', color: 'green' },
  OBJECTIVE_AI_REVIEW: { label: '客观题（AI 评分）', color: 'blue' },
  SUBJECTIVE_AI_REVIEW: { label: '主观题（AI 评分）', color: 'purple' },
  QUESTION_REVIEW_ARBITRATION: { label: '题目复核仲裁', color: 'blue' },
}

const REVIEW_TASK_TYPE_LABEL: Record<ReviewTaskTypeCode, string> = {
  OBJECTIVE_AUTO_REVIEW: REVIEW_TASK_TYPE_META.OBJECTIVE_AUTO_REVIEW.label,
  OBJECTIVE_AI_REVIEW: REVIEW_TASK_TYPE_META.OBJECTIVE_AI_REVIEW.label,
  SUBJECTIVE_AI_REVIEW: REVIEW_TASK_TYPE_META.SUBJECTIVE_AI_REVIEW.label,
  QUESTION_REVIEW_ARBITRATION: REVIEW_TASK_TYPE_META.QUESTION_REVIEW_ARBITRATION.label,
}

/** 批改来源编码 - 与后端 com.nybc.edu.common.enums.GradeSource 一一对齐。 */
export type GradeSourceCode
  = 'AUTO_OBJECTIVE' | 'AUTO_OBJECTIVE_AI' | 'LOCAL_SUBJECTIVE_AI' | 'TEACHER'

/** 复核任务状态编码 - 与后端 ReviewTaskStatus 枚举对齐 */
export type ReviewTaskStatusCode
  = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'INVALIDATED'

/** 复核任务状态中文标签 */
export const REVIEW_TASK_STATUS_LABEL: Record<ReviewTaskStatusCode, string> = {
  PENDING: '待复核',
  IN_PROGRESS: '复核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  INVALIDATED: '已失效',
}

/** 复核任务状态标签色 */
export const REVIEW_TASK_STATUS_TONE: Record<ReviewTaskStatusCode, BadgeTone> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  INVALIDATED: 'gray',
}

/** 匿名批阅任务项 - 对应 ReviewTaskItemResponse */
export interface ReviewTaskItemVO {
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
  questionTemplateId: string
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
export interface ReviewTaskDetailVO {
  reviewTaskId: string
  anonymousNo: string
  /** AI trace ID，便于教师在批阅工作台定位本题 AI 执行记录 */
  aiTraceId?: string
  /** AI 能力编码，来源于后端 AI 执行记录，前端不得从 traceId 推断 */
  aiAbilityCode?: AiAbilityCode
  /** AI 是否被限流或阻断，为 true 时教师需依赖人工复核 */
  aiLimited?: boolean
  examId: string
  paperInstanceId: string
  candidateRosterId?: string
  studentUserId: string
  studentNo: string
  studentName: string
  classId?: string
  className: string
  paperDisplay: PaperInstanceDisplayVO
  questionTemplateId: string
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
  /** 试卷母版页引用，仅 ANSWER_SHEET 模式回填 */
  masterPaperPage?: MarkingScanPageRefVO
  /** 题干文本 */
  questionStem?: string
  /** 标准答案文本 */
  standardAnswer?: string
  /** 客观题比较策略编码 */
  comparePolicy?: ObjectiveComparePolicyCode
  /** 评分细则/采分点说明 */
  evaluationCriteria?: string
}

/** 批改来源中文标签 - 与后端 GradeSource.message 完全一致 */
export const GRADE_SOURCE_LABEL: Record<GradeSourceCode, string> = {
  AUTO_OBJECTIVE: '客观题自动判分',
  AUTO_OBJECTIVE_AI: '客观题AI批改',
  LOCAL_SUBJECTIVE_AI: '本地主观题AI批改',
  TEACHER: '教师人工批改',
}

/** 批改来源徽标色调 */
export const GRADE_SOURCE_TONE: Record<GradeSourceCode, BadgeTone> = {
  AUTO_OBJECTIVE: 'green',
  AUTO_OBJECTIVE_AI: 'blue',
  LOCAL_SUBJECTIVE_AI: 'blue',
  TEACHER: 'orange',
}

/** 复核任务列表项契约校验，供 store 与列表页在消费前显式失败。 */
export function validateReviewTaskItemContract(record: ReviewTaskItemVO): void {
  assertUserFacingText(record.reviewTaskId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.examId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.paperInstanceId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.gradeResultId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.questionTemplateId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.questionNo, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.studentUserId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.studentNo, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.studentName, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.className, REVIEW_TASK_DATA_ERROR)
  assertUserFacingFiniteNumber(record.fullScore, REVIEW_TASK_DATA_ERROR)
  strictEnumLabel(REVIEW_TASK_STATUS_LABEL, record.status, '复核任务状态')
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '题型')
  strictEnumLabel(REVIEW_TASK_TYPE_LABEL, record.reviewType, '复核任务类型')
  strictEnumLabel(GRADE_SOURCE_LABEL, record.gradeSource, '批改来源')
  assertUserFacingText(record.paperDisplay?.primaryText, REVIEW_TASK_DATA_ERROR)
}

/** 复核任务详情契约校验：AI trace 与能力编码必须同现。 */
export function validateReviewTaskDetailContract(record: ReviewTaskDetailVO): void {
  assertUserFacingText(record.reviewTaskId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.examId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.paperInstanceId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.gradeResultId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.questionTemplateId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.questionNo, REVIEW_TASK_DATA_ERROR)
  assertUserFacingText(record.responseSliceId, REVIEW_TASK_DATA_ERROR)
  assertUserFacingFiniteNumber(record.fullScore, REVIEW_TASK_DATA_ERROR)
  strictEnumLabel(REVIEW_TASK_STATUS_LABEL, record.status, '复核任务状态')
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '题型')
  strictEnumLabel(REVIEW_TASK_TYPE_LABEL, record.reviewType, '复核任务类型')
  strictEnumLabel(GRADE_SOURCE_LABEL, record.gradeSource, '批改来源')
  if (record.aiTraceId && !record.aiAbilityCode) {
    assertUserFacing(false, REVIEW_TASK_DATA_ERROR)
  }
  if (record.aiAbilityCode) {
    strictEnumLabel(AI_ABILITY_LABEL, record.aiAbilityCode, 'AI 能力编码')
  }
}

/** 查询匿名批阅任务列表。 */
export function listReviewTasks(
  request: ReviewTaskQueryRequest,
): Promise<PageResult<ReviewTaskItemVO>> {
  return http.post<PageResult<ReviewTaskItemVO>>('/api/mark/exams/review-tasks', request)
}

/** 查询匿名批阅任务详情。 */
export function getReviewTaskDetail(request: ReviewTaskActionRequest): Promise<ReviewTaskDetailVO> {
  return http
    .post<ReviewTaskDetailVO>('/api/mark/exams/review-tasks/detail', request)
    .then((record) => {
      validateReviewTaskDetailContract(record)
      return record
    })
}

/** 领取匿名批阅任务（分派给当前教师）。 */
export function claimReviewTask(request: ReviewTaskActionRequest): Promise<ReviewTaskDetailVO> {
  return http
    .post<ReviewTaskDetailVO>('/api/mark/exams/review-tasks/claim', request)
    .then((record) => {
      validateReviewTaskDetailContract(record)
      return record
    })
}
