import type { ExamSummaryVO } from '@/apis/mark/exam'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { listDistinctExamTerms, pageExams } from '@/apis/mark/exam'
import { readAllPages } from '@/utils/page-result'

const RECENT_TERM_EXAM_PAGE_SIZE = 100

interface AnalysisExamOrgScope {
  classId?: string
  referenceDepartmentId?: string
}

function buildOrgScopeQuery(orgScope?: AnalysisExamOrgScope) {
  return {
    ...(orgScope?.classId ? { classId: orgScope.classId } : {}),
    ...(orgScope?.referenceDepartmentId ? { referenceDepartmentId: orgScope.referenceDepartmentId } : {}),
  }
}

/**
 * 拉取指定学年学期内教师可见的全部考试（分页读完）。
 */
export async function loadExamsForAcademicYearSemester(
  academicYear: string,
  semester: SemesterCode,
  orgScope?: AnalysisExamOrgScope,
): Promise<ExamSummaryVO[]> {
  return readAllPages(
    (pageNum) => pageExams({
      academicYear,
      semester,
      ...buildOrgScopeQuery(orgScope),
      pageNum,
      pageSize: RECENT_TERM_EXAM_PAGE_SIZE,
    }),
    '考试列表加载失败',
  )
}

/**
 * 拉取指定课程、学年学期内教师可见的全部考试（分页读完）。
 */
export async function loadExamsForCourseAcademicYearSemester(
  courseId: string,
  academicYear: string,
  semester: SemesterCode,
  orgScope?: AnalysisExamOrgScope,
): Promise<ExamSummaryVO[]> {
  return readAllPages(
    (pageNum) => pageExams({
      courseId,
      academicYear,
      semester,
      ...buildOrgScopeQuery(orgScope),
      pageNum,
      pageSize: RECENT_TERM_EXAM_PAGE_SIZE,
    }),
    '考试列表加载失败',
  )
}

/**
 * 拉取指定开课学年学期内教师可见的全部考试（分页读完）。
 */
export async function loadExamsForTeachingTerm(
  teachingAcademicYear: string,
  teachingSemester: SemesterCode,
  orgScope?: AnalysisExamOrgScope,
): Promise<ExamSummaryVO[]> {
  return readAllPages(
    (pageNum) => pageExams({
      teachingAcademicYear,
      teachingSemester,
      ...buildOrgScopeQuery(orgScope),
      pageNum,
      pageSize: RECENT_TERM_EXAM_PAGE_SIZE,
    }),
    '考试列表加载失败',
  )
}

/**
 * 按 DISTINCT 学年学期倒序取最近 N 个学期，并拉取这些学期内教师可见的全部考试。
 * 供 AI 分析卡片默认考试范围，避免仅读首屏 50 条导致学期偏差。
 */
export async function loadExamsForRecentDistinctTerms(
  semesterCount: number,
  orgScope?: AnalysisExamOrgScope,
): Promise<ExamSummaryVO[]> {
  if (semesterCount <= 0) {
    return []
  }
  const terms = await listDistinctExamTerms(buildOrgScopeQuery(orgScope))
  const recentTerms = terms.slice(0, semesterCount)
  const merged = new Map<string, ExamSummaryVO>()
  for (const term of recentTerms) {
    const termExams = await loadExamsForAcademicYearSemester(term.academicYear, term.semester, orgScope)
    for (const exam of termExams) {
      merged.set(exam.examId, exam)
    }
  }
  return Array.from(merged.values())
}

/**
 * 是否应在 AnalysisExamMultiSelect 首次加载后自动勾选候选考试。
 * scope 仅过滤候选池；自动全选须显式 defaultRecentSemesterCount 或 autoSelectScopedExams。
 */
export function shouldAutoSelectAnalysisExams(input: {
  scopeAcademicYear?: string
  scopeSemester?: SemesterCode
  scopeTeachingAcademicYear?: string
  scopeTeachingSemester?: SemesterCode
  defaultRecentSemesterCount: number
  autoSelectScopedExams: boolean
  autoSelectLargestCourseClusterInScope: boolean
}): boolean {
  if (input.defaultRecentSemesterCount > 0) {
    return true
  }
  const hasExamScope = Boolean(input.scopeAcademicYear?.trim() && input.scopeSemester)
  const hasTeachingScope = Boolean(input.scopeTeachingAcademicYear?.trim() && input.scopeTeachingSemester)
  if (input.autoSelectLargestCourseClusterInScope && (hasExamScope || hasTeachingScope)) {
    return true
  }
  if (input.autoSelectScopedExams && (hasExamScope || hasTeachingScope)) {
    return true
  }
  return false
}

/** 跨考趋势等卡片自动勾选时，同一课程簇至少须 2 场考试才预填。 */
export const CROSS_EXAM_TREND_MIN_AUTO_SELECT_COUNT = 2

/**
 * 自动勾选时按 courseId 聚类，仅返回考试数最多的课程簇 ID 列表。
 * 供跨考趋势等须「同一课程」的分析卡片，避免最近 N 学期全选跨课导致生成失败。
 * 无 courseId 的考试不参与聚类；若无有效簇则返回空数组。
 */
export function pickExamIdsByLargestCourseCluster(exams: ExamSummaryVO[]): string[] {
  if (exams.length === 0) {
    return []
  }

  const examsByCourseId = new Map<string, ExamSummaryVO[]>()
  for (const exam of exams) {
    const courseId = exam.courseId?.trim()
    if (!courseId) {
      continue
    }
    const courseExams = examsByCourseId.get(courseId) ?? []
    courseExams.push(exam)
    examsByCourseId.set(courseId, courseExams)
  }
  if (examsByCourseId.size === 0) {
    return []
  }

  let selectedCourseId = ''
  let selectedExams: ExamSummaryVO[] = []
  for (const [courseId, courseExams] of examsByCourseId) {
    if (courseExams.length > selectedExams.length) {
      selectedCourseId = courseId
      selectedExams = courseExams
      continue
    }
    if (courseExams.length === selectedExams.length && courseId.localeCompare(selectedCourseId) > 0) {
      selectedCourseId = courseId
      selectedExams = courseExams
    }
  }
  return selectedExams.map((exam) => exam.examId)
}
