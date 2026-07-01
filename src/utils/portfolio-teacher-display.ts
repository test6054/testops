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
 * 解析教师展示姓名：名册优先 nickName，缺失时回退 userName；二者皆无则 undefined。
 */
export function resolvePortfolioTeacherDisplayName(
  teacher: PortfolioTeacherNameFields,
): string | undefined {
  const nickName = teacher.nickName?.trim()
  if (nickName) {
    return nickName
  }
  const userName = teacher.userName?.trim()
  if (userName) {
    return userName
  }
  return undefined
}

/**
 * 组装教师下拉 label：展示姓名 + 可选工号；姓名不可解析时不生成 label。
 */
export function formatPortfolioTeacherSelectLabel(
  teacher: PortfolioTeacherNameFields,
): string | undefined {
  const displayName = resolvePortfolioTeacherDisplayName(teacher)
  if (!displayName) {
    return undefined
  }
  const teacherNumber = teacher.teacherNumber?.trim()
  return teacherNumber ? `${displayName} · ${teacherNumber}` : displayName
}

/** 将名册行 VO 转为 Ant Design Select 选项；缺少可展示姓名时跳过。 */
export function toPortfolioTeacherSelectOption(
  teacher: PortfolioTeacherSelectSource,
): { value: string, label: string } | undefined {
  const label = formatPortfolioTeacherSelectLabel(teacher)
  if (!label) {
    return undefined
  }
  return { value: teacher.userId, label }
}

/** 批量转换名册行 VO 为 Select 选项，跳过缺少姓名的行。 */
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
