import type { PortfolioTeacherDetailVO, PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'

/** 教师下拉/检索展示所需的 API 姓名字段子集。 */
export type PortfolioTeacherNameFields = Pick<
  PortfolioTeacherSummaryVO,
  'nickName' | 'userName' | 'teacherNumber'
>

/** 教师下拉选项所需的 API 字段子集。 */
export type PortfolioTeacherSelectSource = Pick<
  PortfolioTeacherSummaryVO,
  'userId' | 'nickName' | 'userName' | 'teacherNumber'
>

/**
 * 解析教师展示姓名：仅使用 nickName；空白时返回 undefined，不回退 userName。
 */
export function resolvePortfolioTeacherDisplayName(
  teacher: PortfolioTeacherNameFields,
): string | undefined {
  const nickName = teacher.nickName?.trim()
  return nickName || undefined
}

/**
 * 组装教师下拉 label：nickName 与 teacherNumber 均必填；任一缺失时不生成 label。
 */
export function formatPortfolioTeacherSelectLabel(
  teacher: PortfolioTeacherNameFields,
): string | undefined {
  const displayName = resolvePortfolioTeacherDisplayName(teacher)
  const teacherNumber = teacher.teacherNumber?.trim()
  if (!displayName || !teacherNumber) {
    return undefined
  }
  return `${displayName} · ${teacherNumber}`
}

/** 将名册行 VO 转为 Ant Design Select 选项；缺少 nickName 或 teacherNumber 时跳过。 */
export function toPortfolioTeacherSelectOption(
  teacher: PortfolioTeacherSelectSource,
): { value: string, label: string } | undefined {
  const label = formatPortfolioTeacherSelectLabel(teacher)
  if (!label) {
    return undefined
  }
  return { value: teacher.userId, label }
}

/** 批量转换名册行 VO 为 Select 选项，跳过缺少 nickName 或 teacherNumber 的行。 */
export function portfolioTeacherSelectOptionsFromSummaries(
  teachers: PortfolioTeacherSummaryVO[],
): Array<{ value: string, label: string }> {
  return teachers.flatMap((teacher) => {
    const option = toPortfolioTeacherSelectOption(teacher)
    return option ? [option] : []
  })
}

/** 详情 VO 与名册行共用姓名/工号展示规则。 */
export function formatPortfolioTeacherDetailSelectLabel(
  teacher: Pick<PortfolioTeacherDetailVO, 'nickName' | 'userName' | 'teacherNumber'>,
): string | undefined {
  return formatPortfolioTeacherSelectLabel(teacher)
}

/**
 * 教师业务展示：姓名与工号均必填（合同字段由后端 edu-user 补齐后下发）。
 * 任一缺失视为前后端契约错误。
 */
export function formatPortfolioTeacherDisplay(
  teacherName: string | null | undefined,
  teacherNumber: string | null | undefined,
): string {
  const name = teacherName?.trim() ?? ''
  const number = teacherNumber?.trim() ?? ''
  if (!name || !number) {
    throw new Error('教师展示缺少姓名或工号，前后端契约不完整')
  }
  return `${name}（${number}）`
}

/**
 * PK 脱敏展示：有工号则姓名（工号），无工号仅展示名；姓名缺失视为契约错误。
 */
export function formatPortfolioTeacherPkDisplay(
  displayName: string | null | undefined,
  teacherNumber: string | null | undefined,
): string {
  const name = displayName?.trim() ?? ''
  if (!name) {
    throw new Error('教师展示缺少姓名，前后端契约不完整')
  }
  const number = teacherNumber?.trim() ?? ''
  return number ? `${name}（${number}）` : name
}
