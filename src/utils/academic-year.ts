/**
 * 学年学期默认计算，与后端 AcademicYearUtils 一致：
 * 9月1日起为新学年；3-8月为春季学期，9月-次年2月为秋季学期。
 */
import { SemesterCode } from '@/types/enums/semester-enum'

export interface AcademicYearSemester {
  academicYear: string
  semester: SemesterCode
}

/** 根据当前时间计算默认学年学期（与后端 AcademicYearUtils 一致） */
export function getDefaultAcademicYearAndSemester(): AcademicYearSemester {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const academicYear = month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
  const semester = month >= 3 && month <= 8 ? SemesterCode.SPRING : SemesterCode.AUTUMN

  return { academicYear, semester }
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

export interface DashboardFilterOptions {
  academicYears: string[]
  semesters: SemesterCode[]
}

/** 在租户筛选项范围内解析默认学年学期；不在库内时返回空字段 */
export function resolveDefaultDashboardFilter(options: DashboardFilterOptions): {
  academicYear?: string
  semester?: SemesterCode
} {
  const defaults = getDefaultAcademicYearAndSemester()
  const academicYear = options.academicYears.includes(defaults.academicYear)
    ? defaults.academicYear
    : undefined
  const semester = academicYear && options.semesters.includes(defaults.semester)
    ? defaults.semester
    : undefined
  return { academicYear, semester }
}
