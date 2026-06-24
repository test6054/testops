/** 与后端 QualityPiiRedactor 占位符口径一致，用于前端确认门禁 */
export const PORTFOLIO_PII_PLACEHOLDERS = ['[姓名]', '[手机号]', '[身份证]', '[邮箱]', '[编号]'] as const

export function containsPortfolioPiiPlaceholder(text: string | undefined | null): boolean {
  if (!text) {
    return false
  }
  for (const placeholder of PORTFOLIO_PII_PLACEHOLDERS) {
    if (text.includes(placeholder)) {
      return true
    }
  }
  return false
}
