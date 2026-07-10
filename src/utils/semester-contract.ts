import type { SemesterCode } from '@/types/enums/semester-enum'
import { parseSemesterCode } from '@/types/enums/semester-enum'

/** 持久化/路由恢复：非法或单填学期一律丢弃，不保留脏数据。 */
export function sanitizePersistedSchoolPeriod(
  schoolYear: string | null | undefined,
  semester: unknown,
): { schoolYear: string, semester: SemesterCode | undefined } {
  const year = schoolYear?.trim() || ''
  if (!year) {
    return { schoolYear: '', semester: undefined }
  }
  return { schoolYear: year, semester: parseSemesterCode(semester) }
}
