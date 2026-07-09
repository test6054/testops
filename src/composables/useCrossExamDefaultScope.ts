import type { ExamPageQueryRequest, ExamSummaryResponse } from '@/apis/mark/exam'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { listDistinctExamTerms, pageExams } from '@/apis/mark/exam'

const RECENT_TERM_EXAM_PAGE_SIZE = 100

interface AnalysisExamOrgScope {
  classId?: string
  referenceDepartmentId?: string
}

function buildOrgScopeQuery(orgScope?: AnalysisExamOrgScope) {
  return {
    ...(orgScope?.classId ? { classId: orgScope.classId } : {}),
    ...(orgScope?.referenceDepartmentId
      ? { referenceDepartmentId: orgScope.referenceDepartmentId }
      : {}),
  }
}

/**
 * 单次分页拉取范围内全部考试；超过 pageSize 时显式失败，禁止自动翻页冒充全量。
 */
async function loadBoundedExams(
  query: Omit<ExamPageQueryRequest, 'pageNum'>,
  pageSize = RECENT_TERM_EXAM_PAGE_SIZE,
): Promise<ExamSummaryResponse[]> {
  const page = await pageExams({ ...query, pageNum: 1, pageSize })
  if (page.total > page.list.length) {
    throw new Error(
      `考试数量（${page.total}）超过单页上限（${pageSize}），请缩小学年学期或组织范围`,
    )
  }
  return page.list
}

/**
 * 拉取指定学年学期内教师可见的全部考试（单页有界）。
 */
export async function loadExamsForAcademicYearSemester(
  academicYear: string,
  semester: SemesterCode,
  orgScope?: AnalysisExamOrgScope,
): Promise<ExamSummaryResponse[]> {
  return loadBoundedExams({
    academicYear,
    semester,
    ...buildOrgScopeQuery(orgScope),
    pageSize: RECENT_TERM_EXAM_PAGE_SIZE,
  })
}

/**
 * 拉取指定课程、学年学期内教师可见的全部考试（单页有界）。
 */
export async function loadExamsForCourseAcademicYearSemester(
  courseId: string,
  academicYear: string,
  semester: SemesterCode,
  orgScope?: AnalysisExamOrgScope,
): Promise<ExamSummaryResponse[]> {
  return loadBoundedExams({
    courseId,
    academicYear,
    semester,
    ...buildOrgScopeQuery(orgScope),
    pageSize: RECENT_TERM_EXAM_PAGE_SIZE,
  })
}

/**
 * 拉取指定开课学年学期内教师可见的全部考试（单页有界）。
 */
export async function loadExamsForTeachingTerm(
  teachingAcademicYear: string,
  teachingSemester: SemesterCode,
  orgScope?: AnalysisExamOrgScope,
): Promise<ExamSummaryResponse[]> {
  return loadBoundedExams({
    teachingAcademicYear,
    teachingSemester,
    ...buildOrgScopeQuery(orgScope),
    pageSize: RECENT_TERM_EXAM_PAGE_SIZE,
  })
}

/**
 * 按 DISTINCT 学年学期倒序取最近 N 个学期，并拉取这些学期内教师可见的全部考试。
 * 供 AI 分析卡片默认考试范围，避免仅读首屏 50 条导致学期偏差。
 */
export async function loadExamsForRecentDistinctTerms(
  semesterCount: number,
  orgScope?: AnalysisExamOrgScope,
): Promise<ExamSummaryResponse[]> {
  if (semesterCount <= 0) {
    return []
  }
  const terms = await listDistinctExamTerms(buildOrgScopeQuery(orgScope))
  const recentTerms = terms.slice(0, semesterCount)
  const merged = new Map<string, ExamSummaryResponse>()
  for (const term of recentTerms) {
    const termExams = await loadExamsForAcademicYearSemester(
      term.academicYear,
      term.semester,
      orgScope,
    )
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
  const hasTeachingScope = Boolean(
    input.scopeTeachingAcademicYear?.trim() && input.scopeTeachingSemester,
  )
  if (input.autoSelectLargestCourseClusterInScope && (hasExamScope || hasTeachingScope)) {
    return true
  }
  return input.autoSelectScopedExams && (hasExamScope || hasTeachingScope)
}

/** 跨考趋势等卡片自动勾选时，同一课程簇至少须 2 场考试才预填。 */
export const CROSS_EXAM_TREND_MIN_AUTO_SELECT_COUNT = 2

/**
 * 自动勾选时按 courseId 聚类，仅返回考试数最多的课程簇 ID 列表。
 * 供跨考趋势等须「同一课程」的分析卡片，避免最近 N 学期全选跨课导致生成失败。
 * 无 courseId 的考试不参与聚类；若无有效簇则返回空数组。
 */
export function pickExamIdsByLargestCourseCluster(exams: ExamSummaryResponse[]): string[] {
  if (exams.length === 0) {
    return []
  }

  const examsByCourseId = new Map<string, ExamSummaryResponse[]>()
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
  let selectedExams: ExamSummaryResponse[] = []
  for (const [courseId, courseExams] of examsByCourseId) {
    if (courseExams.length > selectedExams.length) {
      selectedCourseId = courseId
      selectedExams = courseExams
      continue
    }
    if (
      courseExams.length === selectedExams.length
      && courseId.localeCompare(selectedCourseId) > 0
    ) {
      selectedCourseId = courseId
      selectedExams = courseExams
    }
  }
  return selectedExams.map((exam) => exam.examId)
}
