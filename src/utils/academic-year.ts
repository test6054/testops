/**
 * 学年学期默认计算：9 月起为新学年；3–8 月为春季，其余为秋季。
 */
import { ALL_SEMESTER_CODES, SemesterCode } from '@/types/enums/semester-enum'

export interface AcademicYearSemester {
  academicYear: string
  semester: SemesterCode
}

/** 根据当前时间计算默认学年学期；学期规则与 AcademicYearUtils 一致（9~1 月秋季，2~8 月春季） */
export function getDefaultAcademicYearAndSemester(): AcademicYearSemester {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const academicYear = month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
  const semester = month >= 9 || month <= 1 ? SemesterCode.AUTUMN : SemesterCode.SPRING

  return { academicYear, semester }
}

/** 判断学年学期对象是否满足成对且 semester 为合法编码。 */
export function isValidAcademicYearSemesterTerm(
  term: AcademicYearSemester | null | undefined,
): term is AcademicYearSemester {
  return Boolean(term?.academicYear?.trim())
    && (term?.semester === SemesterCode.AUTUMN || term?.semester === SemesterCode.SPRING)
}

/** flat API 字段合成 UI 用学年学期对象；任一缺失返回 undefined。 */
export function academicYearSemesterFromFields(
  academicYear?: string | null,
  semester?: SemesterCode | null,
): AcademicYearSemester | undefined {
  const year = academicYear?.trim()
  if (!year || (semester !== SemesterCode.AUTUMN && semester !== SemesterCode.SPRING)) {
    return undefined
  }
  return { academicYear: year, semester }
}

/** 生成学年选项（基准年前后各 2 年，9 月为基准年分界） */
export function generateAcademicYearOptions(): string[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const baseYear = month >= 9 ? year : year - 1
  const options: string[] = []
  for (let i = -2; i <= 2; i++) {
    const startYear = baseYear + i
    options.push(`${startYear}-${startYear + 1}`)
  }
  return options
}

/** 生成学年起始年选项（基准年前后各 2 年，9 月为基准年分界） */
export function generateAcademicYearStartOptions(): number[] {
  return generateAcademicYearOptions().map((year) => Number(year.split('-')[0]))
}

/** 由起始年合成 YYYY-YYYY 合同字符串 */
export function composeAcademicYear(startYear: number): string {
  return `${startYear}-${startYear + 1}`
}

/** 解析 YYYY-YYYY 起始年；非法返回 null */
export function parseAcademicYearStart(academicYear: string): number | null {
  const match = /^(\d{4})-\d{4}$/.exec(academicYear.trim())
  if (!match) return null
  const start = Number(match[1])
  const end = Number(academicYear.trim().substring(5, 9))
  if (end !== start + 1) return null
  return start
}

export interface DashboardFilterOptions {
  academicYears: string[]
  semesters: SemesterCode[]
}

/** 解析首页默认筛选：优先客户端当前学年学期，不在后端 filterOptions 时回退到后端首项 */
export function resolveDefaultDashboardFilter(options: DashboardFilterOptions): AcademicYearSemester {
  const defaults = getDefaultAcademicYearAndSemester()
  const academicYears = options.academicYears?.length ? options.academicYears : generateAcademicYearOptions()
  const semesters = options.semesters?.length
    ? options.semesters
    : [...ALL_SEMESTER_CODES]
  const academicYear = academicYears.includes(defaults.academicYear)
    ? defaults.academicYear
    : academicYears[0]
  const semester = semesters.includes(defaults.semester)
    ? defaults.semester
    : semesters[0]
  return { academicYear, semester }
}
