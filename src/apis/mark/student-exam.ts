/**
 * 学生侧考试聚合 API - 对接 edu-mark 模块 StudentExamController。
 *
 * 后端规则：
 * - 路径前缀 /api/mark/student/exams
 * - 全部为 GET 查询，租户与学生身份从 UserHold 注入
 * - 后端 Long ID 统一以 string 表达到前端
 * - 仅在 finalScoreStatus = PUBLISHED 时返回成绩与逐题明细
 */
import http from '@/config/axios'

/** 最终成绩状态编码 */
export type FinalScoreStatusCode
  = | 'PENDING'
    | 'CALCULATED'
    | 'CONFIRMED'
    | 'CORRECTED'
    | 'PUBLISHED'
    | 'WITHDRAWN'

/** 最终成绩状态文案映射 */
export const FINAL_SCORE_STATUS_LABEL: Record<FinalScoreStatusCode, string> = {
  PENDING: '待计算',
  CALCULATED: '已计算',
  CONFIRMED: '已确认',
  CORRECTED: '已更正',
  PUBLISHED: '已发布',
  WITHDRAWN: '已撤回',
}

/** 最终成绩状态徽标颜色（antd 兼容值，保留旧用法） */
export const FINAL_SCORE_STATUS_COLOR: Record<FinalScoreStatusCode, string> = {
  PENDING: 'default',
  CALCULATED: 'blue',
  CONFIRMED: 'cyan',
  CORRECTED: 'purple',
  PUBLISHED: 'green',
  WITHDRAWN: 'red',
}

/** 最终成绩状态 BadgeTone 映射（用于 UiTag/UiBadge 等 ui-guide 组件） */
export const FINAL_SCORE_STATUS_TONE: Record<FinalScoreStatusCode, 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'yellow'> = {
  PENDING: 'gray',
  CALCULATED: 'blue',
  CONFIRMED: 'blue',
  CORRECTED: 'purple',
  PUBLISHED: 'green',
  WITHDRAWN: 'red',
}

/** 复核窗口状态编码（与后端 ReviewWindowPolicyStatus 对齐） */
export type StudentReviewWindowStatusCode = 'DRAFT' | 'ACTIVE' | 'CLOSED'

/** 学生考试列表项 - 对应 StudentExamItemResponse */
export interface StudentExamItemVO {
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  examId: string
  examName?: string
  examNo?: string
  examStatus?: string
  courseId?: string
  examStartTime?: string
  examEndTime?: string
  paperInstanceId?: string
  bindingStatus?: string
  finalScoreId?: string
  finalScoreStatus?: FinalScoreStatusCode
  /** 仅当 finalScoreStatus = PUBLISHED 时有值 */
  finalScore?: number
  /** 仅当 finalScoreStatus = PUBLISHED 时有值 */
  publishedTime?: string
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus?: StudentReviewWindowStatusCode
}

/** 学生题目得分明细 - 对应 ExamQuestionScoreDto */
export interface StudentQuestionScoreVO {
  questionTemplateId: string
  questionNo?: string
  questionType?: string
  fullScore?: number
  finalScore?: number
  gradeStatus?: string
  objectiveResult?: string
}

/** 学生成绩详情 - 对应 StudentScoreDetailResponse */
export interface StudentScoreDetailVO {
  examId: string
  examName?: string
  examNo?: string
  examStatus?: string
  courseId?: string
  examStartTime?: string
  examEndTime?: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  paperInstanceId?: string
  finalScoreId?: string
  finalScoreStatus?: FinalScoreStatusCode
  /** 总分（仅当 PUBLISHED 时有值） */
  totalScore?: number
  /** 满分（仅当 PUBLISHED 时有值） */
  fullScore?: number
  publishedTime?: string
  questions?: StudentQuestionScoreVO[]
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus?: StudentReviewWindowStatusCode
}

/**
 * 查询当前学生的考试列表（我的成绩 / 历次考试通用）。
 * GET /api/mark/student/exams/list
 */
export function listMyExams(): Promise<StudentExamItemVO[]> {
  return http.get<StudentExamItemVO[]>('/api/mark/student/exams/list')
}

/**
 * 查询当前学生指定考试的成绩详情。
 * GET /api/mark/student/exams/score-detail?examId=
 */
export function getMyScoreDetail(examId: string): Promise<StudentScoreDetailVO> {
  return http.get<StudentScoreDetailVO>('/api/mark/student/exams/score-detail', {
    params: { examId },
  })
}

/**
 * 判断学生是否可在当前时间提交复核申请。
 *
 * <p>仅当成绩已发布（PUBLISHED）且复核窗口处于 ACTIVE 状态、当前时间介于
 * openTime 与 closeTime 之间时返回 true。前端列表与详情按钮均基于此判定。</p>
 */
export function canSubmitReview(item: StudentExamItemVO | StudentScoreDetailVO): boolean {
  if (item.finalScoreStatus !== 'PUBLISHED') {
    return false
  }
  if (item.reviewWindowStatus !== 'ACTIVE') {
    return false
  }
  if (!item.reviewWindowOpenTime || !item.reviewWindowCloseTime) {
    return false
  }
  const now = Date.now()
  const open = new Date(item.reviewWindowOpenTime).getTime()
  const close = new Date(item.reviewWindowCloseTime).getTime()
  return now >= open && now <= close
}
