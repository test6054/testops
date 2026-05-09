/**
 * 通知类型枚举 - 与后端 NotificationTypeEnum 完全对应
 */
export enum NotificationTypeEnum {
  // --- 系统级通知 ---
  /** 系统通知 */
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
  /** 系统告警 */
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  /** 班级公告 */
  CLASS_ANNOUNCEMENT = 'CLASS_ANNOUNCEMENT',
  /** 账号安全 */
  ACCOUNT_SECURITY = 'ACCOUNT_SECURITY',

  // --- 任务生命周期通知 ---
  /** 任务发布：老师布置并发布项目 */
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  /** 任务到期提醒：2天/1天到期提醒 */
  TASK_DUE_REMINDER = 'TASK_DUE_REMINDER',
  /** 任务逾期提醒 */
  TASK_OVERDUE = 'TASK_OVERDUE',
  /** 任务驳回：教师驳回学生作答 */
  TASK_REJECTED = 'TASK_REJECTED',
  /** 任务延期：教师为学生延期 */
  TASK_EXTENDED = 'TASK_EXTENDED',
  /** AI评分完成 */
  AI_GRADING_COMPLETED = 'AI_GRADING_COMPLETED',
  /** 查重完成 */
  PLAGIARISM_CHECK_COMPLETED = 'PLAGIARISM_CHECK_COMPLETED',
  /** 答辩开启 */
  DEFENSE_OPENED = 'DEFENSE_OPENED',
  /** 答辩成绩 */
  DEFENSE_GRADED = 'DEFENSE_GRADED',
  /** 未提交学生提醒（教师） */
  UNSUBMITTED_STUDENTS_ALERT = 'UNSUBMITTED_STUDENTS_ALERT',

  // --- 实践活动通知 ---
  /** 实践完成通知 */
  PRACTICE_COMPLETION_NOTIFICATION = 'PRACTICE_COMPLETION_NOTIFICATION',

  // --- 资源管理通知 ---
  /** Token使用预警 */
  TOKEN_USAGE_ALERT = 'TOKEN_USAGE_ALERT',

  // --- 成绩发布相关（三期新增） ---
  /** 成绩评分规则发布 */
  SCORE_RULE_PUBLISHED = 'SCORE_RULE_PUBLISHED',
  /** 成绩发布 */
  SCORE_PUBLISHED = 'SCORE_PUBLISHED',

  // --- 重新提交申请相关（三期新增） ---
  /** 重新提交申请（发给指导老师） */
  RESUBMIT_REQUESTED = 'RESUBMIT_REQUESTED',
  /** 重新提交申请通过（发给学生） */
  RESUBMIT_APPROVED = 'RESUBMIT_APPROVED',
  /** 重新提交申请被拒（发给学生） */
  RESUBMIT_REJECTED = 'RESUBMIT_REJECTED',
}
