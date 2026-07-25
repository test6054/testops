/** 正评会话启动阻断编码 - FormalSessionStartBlockingCode */
export enum FormalSessionStartBlockingCode {
  EXPERIENCE_ASSIST_BASELINE_NOT_LOCKED = 'EXPERIENCE_ASSIST_BASELINE_NOT_LOCKED',
  EXPERIENCE_ASSIST_BINDING_INCOMPLETE = 'EXPERIENCE_ASSIST_BINDING_INCOMPLETE',
  EXPERIENCE_ASSIST_SUBJECTIVE_CATALOG_EMPTY = 'EXPERIENCE_ASSIST_SUBJECTIVE_CATALOG_EMPTY',
  TENANT_EXPERIENCE_ASSIST_DISABLED = 'TENANT_EXPERIENCE_ASSIST_DISABLED',
  PENDING_REVIEW_ITEMS = 'PENDING_REVIEW_ITEMS',
}

export const ALL_FORMAL_SESSION_START_BLOCKING_CODES: readonly FormalSessionStartBlockingCode[] = [
  FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_BASELINE_NOT_LOCKED,
  FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_BINDING_INCOMPLETE,
  FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_SUBJECTIVE_CATALOG_EMPTY,
  FormalSessionStartBlockingCode.TENANT_EXPERIENCE_ASSIST_DISABLED,
  FormalSessionStartBlockingCode.PENDING_REVIEW_ITEMS,
]

export const FormalSessionStartBlockingDescription: Record<FormalSessionStartBlockingCode, string> = {
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_BASELINE_NOT_LOCKED]: '标答评分基线未锁定',
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_BINDING_INCOMPLETE]: '经验辅助评阅定标未完成',
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_SUBJECTIVE_CATALOG_EMPTY]: '经验辅助评阅尚无主观题',
  [FormalSessionStartBlockingCode.TENANT_EXPERIENCE_ASSIST_DISABLED]: '租户未启用经验辅助评阅',
  [FormalSessionStartBlockingCode.PENDING_REVIEW_ITEMS]: '考试仍有待复核题目',
}

/** 阻断编码 → 工作台路由 name；与后端 FormalSessionStartBlockingCode.workspaceRouteName 对齐 */
export const FormalSessionStartBlockingRouteName: Record<FormalSessionStartBlockingCode, string> = {
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_BASELINE_NOT_LOCKED]:
    'TeacherExamWorkspaceMarkingExperienceAssistPolicy',
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_BINDING_INCOMPLETE]:
    'TeacherExamWorkspaceMarkingExperienceAssistPolicy',
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_SUBJECTIVE_CATALOG_EMPTY]:
    'TeacherExamWorkspaceMarkingExperienceAssistPolicy',
  [FormalSessionStartBlockingCode.TENANT_EXPERIENCE_ASSIST_DISABLED]:
    'TeacherExamWorkspaceMarkingExperienceAssistPolicy',
  [FormalSessionStartBlockingCode.PENDING_REVIEW_ITEMS]: 'TeacherExamWorkspaceReviewBatchConfirm',
}

/** 阻断编码 → 确认按钮文案；与后端 FormalSessionStartBlockingCode.actionLabel 对齐 */
export const FormalSessionStartBlockingActionLabel: Record<FormalSessionStartBlockingCode, string> = {
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_BASELINE_NOT_LOCKED]: '前往经验辅助评阅',
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_BINDING_INCOMPLETE]: '前往经验辅助评阅',
  [FormalSessionStartBlockingCode.EXPERIENCE_ASSIST_SUBJECTIVE_CATALOG_EMPTY]: '前往经验辅助评阅',
  [FormalSessionStartBlockingCode.TENANT_EXPERIENCE_ASSIST_DISABLED]: '前往经验辅助评阅',
  [FormalSessionStartBlockingCode.PENDING_REVIEW_ITEMS]: '前往识别复核',
}

export function isFormalSessionStartBlockingCode(
  value: unknown,
): value is FormalSessionStartBlockingCode {
  return typeof value === 'string'
    && ALL_FORMAL_SESSION_START_BLOCKING_CODES.map(String).includes(value)
}
