/**
 * 学年学期默认计算：9 月起为新学年；3–8 月为春季，其余为秋季。
 */
import { SemesterCode } from '@/types/enums/semester-enum'

export interface AcademicYearSemester {
  academicYear: string
  semester: SemesterCode
}

/** 根据当前时间计算默认学年学期 */
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
  return { academicYear, semester }
}

/** 学年学期 Select 值，仅 UI 边界使用：YYYY-YYYY_学期 */
export function formatAcademicYearSemesterValue(academicYear: string, semester: SemesterCode): string {
  return `${academicYear}_${semester}`
}

/** 解析学年学期 Select 值 */
export function parseAcademicYearSemesterValue(value: string): AcademicYearSemester {
  const separatorIndex = value.lastIndexOf('_')
  if (separatorIndex <= 0 || separatorIndex >= value.length - 1) {
    throw new Error('学年学期格式须为 YYYY-YYYY_学期编码')
  }
  const academicYear = value.substring(0, separatorIndex)
  const semester = value.substring(separatorIndex + 1) as SemesterCode
  if (!/^(\d{4})-(\d{4})$/.test(academicYear)) {
    throw new Error('学年格式须为 YYYY-YYYY')
  }
  if (semester !== SemesterCode.AUTUMN && semester !== SemesterCode.SPRING) {
    throw new Error('学期取值仅支持 1 或 2')
  }
  return { academicYear, semester }
}
