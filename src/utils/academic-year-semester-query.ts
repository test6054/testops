import type { SemesterCode } from '@/types/enums/semester-enum'
import { parseSemesterCode } from '@/types/enums/semester-enum'
import { message } from 'ant-design-vue'

/** 与后端 BizException(PARAM_ERROR) 文案一致 */
export const ACADEMIC_YEAR_SEMESTER_PAIR_MESSAGE = '学年和学期须同时选择'

/** 学年、学期须同时有值或同时为空。 */
export function isAcademicYearSemesterPairFilled(
  academicYear?: string | null,
  semester?: SemesterCode | null,
): boolean {
  const hasYear = Boolean(academicYear?.trim())
  const hasSemester = semester != null
  return hasYear === hasSemester
}

/**
 * 构造可选学年学期筛选：两者皆空返回 {}，两者皆有返回成对字段；单填返回 null。
 * 归档卷宽筛、工作台双空默认当前学期等均使用此函数。
 */
export function buildOptionalAcademicYearSemesterQuery(
  academicYear?: string | null,
  semester?: SemesterCode | null,
): { academicYear?: string, semester?: SemesterCode } | null {
  const year = academicYear?.trim() || undefined
  const sem = semester ?? undefined
  if (!year && !sem) {
    return {}
  }
  if (year && sem) {
    return { academicYear: year, semester: sem }
  }
  return null
}

/** 构造必填学年学期参数；缺一返回 null。 */
export function buildRequiredAcademicYearSemesterQuery(
  academicYear?: string | null,
  semester?: SemesterCode | null,
): { academicYear: string, semester: SemesterCode } | null {
  const year = academicYear?.trim()
  if (!year || !semester) {
    return null
  }
  return { academicYear: year, semester }
}

/** 请求前校验学年学期成对；失败时提示并返回 false。 */
export function ensureAcademicYearSemesterPair(
  academicYear?: string | null,
  semester?: SemesterCode | null,
  warn: (text: string) => void = (text) => message.warning(text),
): boolean {
  if (isAcademicYearSemesterPairFilled(academicYear, semester)) {
    return true
  }
  warn(ACADEMIC_YEAR_SEMESTER_PAIR_MESSAGE)
  return false
}

/** 必填学年学期（学期成长等 API）；缺一即提示并返回 false。 */
export function ensureRequiredAcademicYearSemester(
  academicYear?: string | null,
  semester?: SemesterCode | null,
  warn: (text: string) => void = (text) => message.warning(text),
): boolean {
  if (buildRequiredAcademicYearSemesterQuery(academicYear, semester)) {
    return true
  }
  warn('请选择学年和学期')
  return false
}

/** 深链/路由 query：学年与学期同时合法才保留学期。 */
export function readPairedSemesterFromQuery(
  academicYear: string | undefined,
  semester: unknown,
): SemesterCode | undefined {
  if (!academicYear?.trim()) {
    return undefined
  }
  return parseSemesterCode(semester)
}
