/**
 * 枚举统一导出
 * 所有枚举定义都应该从这里导入，确保与后端枚举保持一致
 */

// AI相关状态（评分 + 评审）
export {
  AI_GRADING_STATUS_CONFIG,
  AI_REVIEW_STATUS_CONFIG,
  type AiGradingStatusConfig,
  AiGradingStatusEnum,
  AiReviewStatusEnum,
  type AiReviewStatusItem,
  canRequestReview,
  getAiReviewStatusConfig,
  isReviewCompleted,
  isReviewFailed,
  isReviewInProgress
} from './ai-status'

// 分析状态
export * from './analysis-status'

export * from './apply-scope'

// 小组相关枚举已删除

// 通用状态（异步任务/启用禁用/告警/邀请码/课程）
export * from './common-enums'

// 课程教学引导状态
export * from './course-teaching-guide-status'

// 答辩相关
export {
  AnswerStatus,
  DEFENSE_SESSION_STATUS_CONFIG,
  DEFENSE_TASK_STATUS_COLOR,
  DefenseDifficulty,
  DefenseQuestionType,
  DefenseResult,
  DefenseSessionStatus,
  type DefenseSessionStatusConfig,
  DefenseTaskStatus,
  getDefenseResultColor,
  getDefenseResultText,
  getDefenseTaskStatusColor,
  getQuestionTypeColor,
  getQuestionTypeText,
  getSessionStatusColor,
  getSessionStatusDescription,
  getSessionStatusText,
  isActiveSession,
  isCompletedSession
} from './defense-status'

// 难度等级
export {
  DIFFICULTY_CONFIG,
  DIFFICULTY_OPTIONS,
  DifficultyEnum,
  getDifficultyColor,
  getDifficultyLabel
} from './difficulty'

// 导出格式
export * from './export-format'

// 通知类型
export * from './notification-type'

// 实训状态
export * from './practice-status'

// 角色枚举
export * from './role-enum'

// 学期枚举
export {
  formatSemester,
  getSemesterDescription,
  isValidSemesterCode,
  SemesterCode,
  SemesterDescription,
  SemesterOptions
} from './semester-enum'

// 学生任务状态
export * from './student-task-status'

// 教师评阅状态
export * from './teacher-review-status'

// 租户状态
export * from './tenant-status'

// 租户类型
export * from './tenant-type'

// 用户状态
export * from './user-status'
