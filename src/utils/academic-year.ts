/**
 * 学年学期默认计算：9 月起为新学年；3–8 月为春季，其余为秋季。
 */
import { SemesterCode, SemesterOptions } from '@/types/enums/semester-enum'

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

/** 解析首页默认筛选：优先客户端当前学年学期，不在后端 filterOptions 时回退到后端首项 */
export function resolveDefaultDashboardFilter(options: DashboardFilterOptions): AcademicYearSemester {
  const defaults = getDefaultAcademicYearAndSemester()
  const academicYears = options.academicYears?.length ? options.academicYears : generateAcademicYearOptions()
  const semesters = options.semesters?.length
    ? options.semesters
    : SemesterOptions.map(item => item.value)
  const academicYear = academicYears.includes(defaults.academicYear)
    ? defaults.academicYear
    : academicYears[0]
  const semester = semesters.includes(defaults.semester)
    ? defaults.semester
    : semesters[0]
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
