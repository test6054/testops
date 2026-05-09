/**
 * 格式规范适用范围枚举
 * 与后端 ApplyScope 枚举保持一致
 */
export enum ApplyScopeCode {
  /** 毕业论文 */
  THESIS = 'THESIS',
  /** 课程设计报告 */
  COURSE_DESIGN = 'COURSE_DESIGN',
  /** 实验报告 */
  LAB_REPORT = 'LAB_REPORT',
}
/**
 * 适用范围标签映射
 */
export const ApplyScopeLabel: Record<string, string> = {
  [ApplyScopeCode.THESIS]: '毕业论文',
  [ApplyScopeCode.COURSE_DESIGN]: '课程设计报告',
  [ApplyScopeCode.LAB_REPORT]: '实验报告',
}

/**
 * 根据code获取标签
 */
export function getApplyScopeLabel(code?: string): string {
  return code ? (ApplyScopeLabel[code] || code) : ''
}
