/** 审计目标类型 */
export enum AuditTargetTypeCode {
  EXAM = 'EXAM',
  EXAM_QUESTION_GRADE_RESULT = 'EXAM_QUESTION_GRADE_RESULT',
  EXAM_FINAL_SCORE = 'EXAM_FINAL_SCORE',
  ABSENCE_RECORD = 'ABSENCE_RECORD',
  GRADE_REVIEW_REQUEST = 'GRADE_REVIEW_REQUEST',
  GRADE_CORRECTION = 'GRADE_CORRECTION',
  MARKING_TASK = 'MARKING_TASK',
  EXAM_PAPER_INSTANCE = 'EXAM_PAPER_INSTANCE',
  SCAN_BATCH = 'SCAN_BATCH',
  SYNC_TASK = 'SYNC_TASK',
  PASSBACK_RECORD = 'PASSBACK_RECORD',
  EXAM_EXPORT_TASK = 'EXAM_EXPORT_TASK',
  EXAM_ARCHIVE_PACKAGE = 'EXAM_ARCHIVE_PACKAGE',
}

export const ALL_AUDIT_TARGET_TYPE_CODES: readonly AuditTargetTypeCode[] = [
  AuditTargetTypeCode.EXAM,
  AuditTargetTypeCode.EXAM_QUESTION_GRADE_RESULT,
  AuditTargetTypeCode.EXAM_FINAL_SCORE,
  AuditTargetTypeCode.ABSENCE_RECORD,
  AuditTargetTypeCode.GRADE_REVIEW_REQUEST,
  AuditTargetTypeCode.GRADE_CORRECTION,
  AuditTargetTypeCode.MARKING_TASK,
  AuditTargetTypeCode.EXAM_PAPER_INSTANCE,
  AuditTargetTypeCode.SCAN_BATCH,
  AuditTargetTypeCode.SYNC_TASK,
  AuditTargetTypeCode.PASSBACK_RECORD,
  AuditTargetTypeCode.EXAM_EXPORT_TASK,
  AuditTargetTypeCode.EXAM_ARCHIVE_PACKAGE,
]

export const AuditTargetTypeDescription: Record<AuditTargetTypeCode, string> = {
  [AuditTargetTypeCode.EXAM]: '考试',
  [AuditTargetTypeCode.EXAM_QUESTION_GRADE_RESULT]: '题目批改结果',
  [AuditTargetTypeCode.EXAM_FINAL_SCORE]: '最终成绩',
  [AuditTargetTypeCode.ABSENCE_RECORD]: '缺考记录',
  [AuditTargetTypeCode.GRADE_REVIEW_REQUEST]: '复核申请',
  [AuditTargetTypeCode.GRADE_CORRECTION]: '成绩更正',
  [AuditTargetTypeCode.MARKING_TASK]: '阅卷任务',
  [AuditTargetTypeCode.EXAM_PAPER_INSTANCE]: '试卷实例',
  [AuditTargetTypeCode.SCAN_BATCH]: '扫描批次',
  [AuditTargetTypeCode.SYNC_TASK]: '教务同步任务',
  [AuditTargetTypeCode.PASSBACK_RECORD]: '成绩回写记录',
  [AuditTargetTypeCode.EXAM_EXPORT_TASK]: '导出任务',
  [AuditTargetTypeCode.EXAM_ARCHIVE_PACKAGE]: '考后归档包',
}

