import type { ExamSummaryVO } from '@/apis/mark/exam'

/** 从考试列表中选取最近 N 个学年学期内的考试 ID，供跨考仪表盘默认范围。 */
export function pickExamIdsFromRecentSemesters(
  exams: ExamSummaryVO[],
  semesterCount: number,
): string[] {
  if (semesterCount <= 0 || exams.length === 0) return []

  const semesterCodes = new Set<string>()
  exams.forEach((exam) => {
    if (exam.academicYear && exam.semester) {
      semesterCodes.add(`${exam.academicYear}_${exam.semester}`)
    }
  })

  const recentCodes = Array.from(semesterCodes)
    .sort((left, right) => right.localeCompare(left))
    .slice(0, semesterCount)

  if (recentCodes.length === 0) return []

  const recentSet = new Set(recentCodes)
  return exams
    .filter((exam) => {
      if (!exam.academicYear || !exam.semester) return false
      return recentSet.has(`${exam.academicYear}_${exam.semester}`)
    })
    .map((exam) => exam.examId)
}

/** 最近 N 个学年学期中的首个学期编码，供学期成长卡片默认选中。 */
export function pickDefaultSemesterCode(
  exams: ExamSummaryVO[],
  semesterCount: number,
): string {
  if (semesterCount <= 0 || exams.length === 0) return ''

  const semesterCodes = new Set<string>()
  exams.forEach((exam) => {
    if (exam.academicYear && exam.semester) {
      semesterCodes.add(`${exam.academicYear}_${exam.semester}`)
    }
  })

  return Array.from(semesterCodes)
    .sort((left, right) => right.localeCompare(left))
    .slice(0, semesterCount)[0] ?? ''
}
