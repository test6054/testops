import type { PageResult } from '@/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { ALL_SEMESTER_CODES } from '@/types/enums/semester-enum'

function contractTypeError(field: string, domain: string): TypeError {
  return new TypeError(`${domain}响应缺少合法字段：${field}`)
}

/** 可选 semester：空值返回 undefined，非法值显式失败。 */
export function assertOptionalSemesterCode(
  value: unknown,
  field: string,
  domain = 'API',
): SemesterCode | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw contractTypeError(field, domain)
  }
  const semester = ALL_SEMESTER_CODES.find((code) => code === value)
  if (!semester) {
    throw contractTypeError(field, domain)
  }
  return semester
}

/** 必填 semester：缺失或非法值显式失败。 */
export function assertRequiredSemesterCode(
  value: unknown,
  field: string,
  domain = 'API',
): SemesterCode {
  const semester = assertOptionalSemesterCode(value, field, domain)
  if (!semester) {
    throw contractTypeError(field, domain)
  }
  return semester
}

/** semester 数组：逐项校验合法 SemesterCode。 */
export function assertSemesterCodeList(
  values: unknown,
  field: string,
  domain = 'API',
): SemesterCode[] {
  if (!Array.isArray(values)) {
    throw contractTypeError(field, domain)
  }
  return values.map((item, index) =>
    assertRequiredSemesterCode(item, `${field}[${index}]`, domain),
  )
}

/** HTTP 响应 optional flat 学年学期：缺失 OK；存在则须成对且 semester 合法。 */
export function guardOptionalAcademicYearSemesterPairOnVo(
  vo: { academicYear?: string, semester?: SemesterCode | null },
  prefix: string,
  domain = 'API',
): void {
  if (vo.academicYear !== undefined && typeof vo.academicYear !== 'string') {
    throw contractTypeError(`${prefix}.academicYear`, domain)
  }
  const year = vo.academicYear?.trim() || undefined
  const sem = assertOptionalSemesterCode(vo.semester, `${prefix}.semester`, domain)
  const hasYear = Boolean(year)
  const hasSem = Boolean(sem)
  if (hasYear !== hasSem) {
    throw contractTypeError(`${prefix}（学年学期须成对）`, domain)
  }
  vo.academicYear = year
  vo.semester = sem
}

/** HTTP 响应必填 flat 学年学期。 */
export function guardRequiredAcademicYearSemesterPairOnVo(
  vo: { academicYear?: string, semester?: SemesterCode | null },
  prefix: string,
  domain = 'API',
): void {
  guardOptionalAcademicYearSemesterPairOnVo(vo, prefix, domain)
  if (!vo.academicYear || !vo.semester) {
    throw contractTypeError(prefix, domain)
  }
}

/** 持久化/路由恢复：非法或单填学期一律丢弃，不保留脏数据。 */
export function sanitizePersistedSchoolPeriod(
  schoolYear: string | null | undefined,
  semester: unknown,
): { schoolYear: string, semester: SemesterCode | undefined } {
  const year = schoolYear?.trim() || ''
  if (!year) {
    return { schoolYear: '', semester: undefined }
  }
  if (typeof semester !== 'string') {
    return { schoolYear: year, semester: undefined }
  }
  return { schoolYear: year, semester: ALL_SEMESTER_CODES.find((code) => code === semester) }
}

/** 分页 list 逐项守卫。 */
export function guardPageResult<T>(
  page: PageResult<T>,
  guardItem: (item: T, index: number) => T,
  listField: string,
  domain: string,
): PageResult<T> {
  if (!page || !Array.isArray(page.list)) {
    throw contractTypeError(listField, domain)
  }
  return {
    ...page,
    list: page.list.map((item, index) => guardItem(item, index)),
  }
}

/** 数组响应逐项守卫。 */
export function guardArrayResponse<T>(
  rows: T[],
  guardItem: (item: T, index: number) => T,
  listField: string,
  domain: string,
): T[] {
  if (!Array.isArray(rows)) {
    throw contractTypeError(listField, domain)
  }
  return rows.map((item, index) => guardItem(item, index))
}
