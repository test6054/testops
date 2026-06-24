/**
 * 学年学期默认计算，与 edu-practice-web-vue practice-create.vue 保持一致（7 月为分界点）。
 */
import { SemesterCode } from '@/types/enums/semester-enum'

export interface AcademicYearSemester {
  academicYear: string
  semester: string
}

/** 根据当前时间计算默认学年学期（7 月为分界点） */
export function getDefaultAcademicYearAndSemester(): AcademicYearSemester {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  if (month >= 7) {
    return {
      academicYear: `${year}-${year + 1}`,
      semester: SemesterCode.AUTUMN,
    }
  }
  return {
    academicYear: `${year - 1}-${year}`,
    semester: SemesterCode.SPRING,
  }
}

/** 生成学年选项（基准年前后各 2 年，7 月为基准年分界） */
export function generateAcademicYearOptions(): string[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const month = now.getMonth() + 1
  const baseYear = month >= 7 ? currentYear : currentYear - 1
  const options: string[] = []
  for (let i = -2; i <= 2; i++) {
    const startYear = baseYear + i
    options.push(`${startYear}-${startYear + 1}`)
  }
  return options
}

export interface DashboardFilterOptions {
  academicYears: string[]
  semesters: string[]
}

/** 在租户筛选项范围内解析默认学年学期；不在库内时返回空字段 */
export function resolveDefaultDashboardFilter(options: DashboardFilterOptions): AcademicYearSemester {
  const defaults = getDefaultAcademicYearAndSemester()
  const academicYear = options.academicYears.includes(defaults.academicYear)
    ? defaults.academicYear
    : ''
  const semester = academicYear && options.semesters.includes(defaults.semester)
    ? defaults.semester
    : ''
  return { academicYear, semester }
}
