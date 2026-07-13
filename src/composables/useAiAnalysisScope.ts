import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { AiAnalysisCenterOverviewResponse } from '@/apis/mark/analysis-center'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { CourseListVO } from '@/apis/quality/user-catalog'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { computed, inject, provide, ref, watch } from 'vue'
import { loadAiAnalysisCenterOverview } from '@/apis/mark/analysis-center'
import { getExamDetail, pageExams } from '@/apis/mark/exam'
import { courseCatalogApi } from '@/apis/quality/user-catalog'
import { MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE } from '@/composables/useMarkExamSelector'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { generateAcademicYearOptions, getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import { showUserError } from '@/utils/error-handler'
import { examSummaryFromDetail } from '@/utils/mark-exam-option'

/** 工作台内锁定 AI 分析考试范围（注入后禁止切换考试） */
export const AI_ANALYSIS_LOCK_EXAM_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisLockExamId')

/** 趋势/校级 Tab 与顶栏概览共享的院系 org scope */
export const AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisReferenceDepartmentId')

/** 趋势/校级 Tab 与顶栏概览共享的班级 scope */
export const AI_ANALYSIS_CLASS_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisClassId')

/** 趋势/校级 Tab 与顶栏概览共享的课程 scope */
export const AI_ANALYSIS_COURSE_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisCourseId')

/** 趋势/校级 Tab 院系只读展示名 */
export const AI_ANALYSIS_REFERENCE_DEPARTMENT_LABEL_KEY: InjectionKey<Ref<string>> = Symbol('aiAnalysisReferenceDepartmentLabel')

/** 趋势/校级 Tab 课程只读展示名 */
export const AI_ANALYSIS_SCOPE_COURSE_LABEL_KEY: InjectionKey<Ref<string>> = Symbol('aiAnalysisScopeCourseLabel')

/** 趋势 Tab 面包屑展示用班级名称 */
export const AI_ANALYSIS_CLASS_LABEL_KEY: InjectionKey<Ref<string>> = Symbol('aiAnalysisClassLabel')

/** 工作台内同步学年学期课程，避免锁定考试后范围漂移 */
export interface AiAnalysisLockTerm {
  academicYear?: string
  semester?: SemesterCode
  courseId?: string
  referenceDepartmentId?: string
  referenceDepartmentName?: string
  courseName?: string
}

export const AI_ANALYSIS_LOCK_TERM_KEY: InjectionKey<Ref<AiAnalysisLockTerm | null>> = Symbol('aiAnalysisLockTerm')

/** 顶栏学年，趋势/校级卡片与 SignalBand 同源 */
export const AI_ANALYSIS_ACADEMIC_YEAR_KEY: InjectionKey<Ref<string>> = Symbol('aiAnalysisAcademicYear')

/** 顶栏学期，趋势/校级卡片与 SignalBand 同源 */
export const AI_ANALYSIS_SEMESTER_KEY: InjectionKey<Ref<SemesterCode>> = Symbol('aiAnalysisSemester')

/** 是否处于考试工作台锁定上下文 */
export const AI_ANALYSIS_EXAM_LOCKED_KEY: InjectionKey<ComputedRef<boolean>> = Symbol('aiAnalysisExamLocked')

/** 教学/聚类 Tab 选定考试 */
export const AI_ANALYSIS_EXAM_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisExamId')

/** 教学/聚类 Tab 课程筛考试 */
export const AI_ANALYSIS_EXAM_FILTER_COURSE_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisExamFilterCourseId')

/** 教学/聚类 Tab 考试列表加载态 */
export const AI_ANALYSIS_EXAMS_LOADING_KEY: InjectionKey<Ref<boolean>> = Symbol('aiAnalysisExamsLoading')

/** 学年学期选项与考试选项（范围面板只读消费） */
export const AI_ANALYSIS_ACADEMIC_YEAR_OPTIONS_KEY: InjectionKey<ComputedRef<Array<{ label: string, value: string }>>> = Symbol('aiAnalysisAcademicYearOptions')
export const AI_ANALYSIS_SEMESTER_OPTIONS_KEY: InjectionKey<ComputedRef<Array<{ label: string, value: string }>>> = Symbol('aiAnalysisSemesterOptions')
export const AI_ANALYSIS_EXAM_OPTIONS_KEY: InjectionKey<ComputedRef<Array<{ label: string, value: string }>>> = Symbol('aiAnalysisExamOptions')

/** 范围面板动作：课程筛选、组织范围展示名 */
export interface AiAnalysisScopePanelActions {
  setExamFilterCourse: (courseId: string | null, option?: CourseListVO) => void
  setOrgDepartmentLabel: (label: string) => void
  setOrgCourseLabel: (label: string) => void
  setOrgClassLabel: (label: string, classId?: string | null) => void
}

export const AI_ANALYSIS_SCOPE_PANEL_ACTIONS_KEY: InjectionKey<AiAnalysisScopePanelActions> = Symbol('aiAnalysisScopePanelActions')


/** 工作台内覆盖 AI 分析页 ContextBar 标题 */
export interface AiAnalysisWorkspaceChrome {
  title: string
  subtitle: string
}

export const AI_ANALYSIS_WORKSPACE_CHROME_KEY: InjectionKey<Ref<AiAnalysisWorkspaceChrome | null>> = Symbol('aiAnalysisWorkspaceChrome')

/** AI 分析中心范围：学年 / 学期 / 课程 / 考试 / 班级 / 院系 */
export function useAiAnalysisScope() {
  const lockExamId = inject(AI_ANALYSIS_LOCK_EXAM_ID_KEY, null)
  const lockTerm = inject(AI_ANALYSIS_LOCK_TERM_KEY, null)
  const examLocked = computed(() => Boolean(lockExamId?.value))
  const defaultTerm = getDefaultAcademicYearAndSemester()
  const academicYear = ref(defaultTerm.academicYear)
  const semester = ref(defaultTerm.semester)
  /** 教学/聚类顶栏：按考试列表课程筛考试 */
  const examFilterCourseId = ref<string | undefined>(undefined)
  /** 趋势/校级 org scope：单院系单课程，禁止跨域 */
  const scopeCourseId = ref<string | undefined>(undefined)
  const referenceDepartmentLabel = ref('')
  const scopeCourseLabel = ref('')
  const examId = ref<string | undefined>(undefined)
  const classId = ref<string | undefined>(undefined)
  const classLabel = ref('')
  const referenceDepartmentId = ref<string | undefined>(undefined)
  const examsLoading = ref(false)
  const exams = ref<ExamSummaryResponse[]>([])
  const pinnedExam = ref<ExamSummaryResponse | null>(null)
  const authorizedCourses = ref<CourseListVO[]>([])
  const overview = ref<AiAnalysisCenterOverviewResponse | null>(null)
  const overviewLoading = ref(false)
  const overviewLoadFailed = ref(false)
  const reloadToken = ref(0)

  const academicYearOptions = computed(() =>
    generateAcademicYearOptions().map(year => ({ label: year, value: year })),
  )

  const semesterOptions = computed(() =>
    SemesterOptions.map(item => ({
      label: formatSemester(item.value),
      value: item.value,
    })),
  )

  const examOptions = computed(() =>
    exams.value.map(exam => ({
      label: exam.examName ?? exam.examId ?? '—',
      value: exam.examId ?? '',
    })).filter(option => option.value),
  )

  const courseOptions = computed(() =>
    authorizedCourses.value.map(course => ({
      value: course.id,
      label: course.courseName,
    })),
  )

  const filteredExams = computed(() => {
    const mergedExams = pinnedExam.value
      ? [pinnedExam.value, ...exams.value.filter(exam => exam.examId !== pinnedExam.value!.examId)]
      : exams.value
    return mergedExams
  })

  const filteredExamOptions = computed(() =>
    filteredExams.value.map(exam => ({
      label: exam.examName ?? exam.examId ?? '—',
      value: exam.examId ?? '',
    })).filter(option => option.value),
  )

  const selectedExam = computed(() =>
    filteredExams.value.find(exam => exam.examId === examId.value)
    ?? (pinnedExam.value?.examId === examId.value ? pinnedExam.value : undefined),
  )

  const selectedExamLabel = computed(() => {
    if (!examId.value) {
      return undefined
    }
    return overview.value?.selectedExamName?.trim()
      || selectedExam.value?.examName
      || examOptions.value.find(item => item.value === examId.value)?.label
  })

  const scopeSummary = computed(() => {
    const semesterLabel = semesterOptions.value.find(item => item.value === semester.value)?.label ?? semester.value
    const parts = [`${academicYear.value} · ${semesterLabel}`]
    if (examFilterCourseId.value) {
      const courseName = courseOptions.value.find(item => item.value === examFilterCourseId.value)?.label
      if (courseName) {
        parts.push(courseName)
      }
    }
    if (classLabel.value) {
      parts.push(classLabel.value)
    }
    return parts.join(' · ')
  })

  function setClassScope(value: string | undefined, option?: MarkClassOption): void {
    classId.value = value
    classLabel.value = option?.className ?? ''
  }

  /** 教学/聚类顶栏课程筛选：edu-user 目录真源；未选课程时不传 courseId，按学年学期查全部可见考试。 */
  function setExamFilterCourse(courseId: string | null, option?: CourseListVO): void {
    const lockedCourseId = lockTerm?.value?.courseId
    if (examLocked.value && lockedCourseId) {
      examFilterCourseId.value = lockedCourseId
      return
    }
    examFilterCourseId.value = courseId ?? undefined
    const courseName = option?.courseName?.trim()
    if (courseName) {
      scopeCourseLabel.value = courseName
    }
    else if (!courseId) {
      scopeCourseLabel.value = ''
    }
    if (!examLocked.value) {
      scopeCourseId.value = courseId ?? undefined
    }
  }

  async function loadAuthorizedCourses(): Promise<void> {
    try {
      authorizedCourses.value = await courseCatalogApi.authorizedList()
    }
    catch (error) {
      authorizedCourses.value = []
      showUserError(error, '课程目录加载失败')
    }
  }

  /** 从考试列表项同步趋势/校级 org scope，禁止跨院系跨课程分析 */
  function syncOrgScopeFromExam(exam: ExamSummaryResponse): void {
    if (exam.referenceDepartmentId) {
      referenceDepartmentId.value = exam.referenceDepartmentId
      const departmentName = exam.departmentName?.trim()
      if (departmentName) {
        referenceDepartmentLabel.value = departmentName
      }
    }
    if (exam.courseId) {
      scopeCourseId.value = exam.courseId
      examFilterCourseId.value = exam.courseId
      const courseName = exam.courseName?.trim()
      if (courseName) {
        scopeCourseLabel.value = courseName
      }
    }
  }

  function clearOrgScope(): void {
    referenceDepartmentId.value = undefined
    referenceDepartmentLabel.value = ''
    scopeCourseId.value = undefined
    scopeCourseLabel.value = ''
  }

  function buildExamPageQuery(pageNum: number, keyword?: string) {
    const query: Parameters<typeof pageExams>[0] = {
      academicYear: academicYear.value,
      semester: semester.value,
      pageNum,
      pageSize: MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE,
      keyword: keyword?.trim() || undefined,
    }
    const scopedCourseId = examFilterCourseId.value?.trim()
    if (scopedCourseId) {
      query.courseId = scopedCourseId
    }
    const scopedClassId = classId.value?.trim()
    const scopedReferenceDepartmentId = referenceDepartmentId.value?.trim()
    if (scopedClassId) {
      query.classId = scopedClassId
    }
    else if (scopedReferenceDepartmentId) {
      query.referenceDepartmentId = scopedReferenceDepartmentId
    }
    return query
  }

  async function loadOverview() {
    overviewLoading.value = true
    overviewLoadFailed.value = false
    try {
      overview.value = await loadAiAnalysisCenterOverview({
        academicYear: academicYear.value,
        semester: semester.value,
        courseId: examFilterCourseId.value ?? scopeCourseId.value,
        classId: classId.value,
        referenceDepartmentId: referenceDepartmentId.value,
        examId: examId.value,
      })
    }
    catch (error) {
      overview.value = null
      overviewLoadFailed.value = true
      showUserError(error, 'AI 分析中心概览加载失败')
    }
    finally {
      overviewLoading.value = false
    }
  }

  async function syncPinnedExam(id?: string): Promise<void> {
    if (!id) {
      pinnedExam.value = null
      return
    }
    const inPage = exams.value.find(exam => exam.examId === id)
    if (inPage) {
      pinnedExam.value = inPage
      return
    }
    try {
      pinnedExam.value = examSummaryFromDetail(await getExamDetail(id))
    }
    catch {
      pinnedExam.value = null
    }
  }

  async function loadExams(keyword?: string) {
    examsLoading.value = true
    try {
      const page = await pageExams(buildExamPageQuery(1, keyword))
      exams.value = page.list
      await syncPinnedExam(examId.value)
      const mergedExams = pinnedExam.value
        ? [pinnedExam.value, ...exams.value.filter(exam => exam.examId !== pinnedExam.value!.examId)]
        : exams.value
      if (examId.value && !mergedExams.some(exam => exam.examId === examId.value)) {
        if (!examLocked.value) {
          examId.value = undefined
        }
      }
    }
    catch (error) {
      exams.value = []
      showUserError(error, '考试列表加载失败')
    }
    finally {
      examsLoading.value = false
    }
  }

  function refreshAnalysis() {
    reloadToken.value += 1
    void loadOverview()
    void loadExams()
  }

  watch([academicYear, semester, referenceDepartmentId, classId, examFilterCourseId], () => {
    void loadExams()
    void loadOverview()
  }, { immediate: true })

  watch(() => lockTerm?.value, (term) => {
    if (!term) {
      return
    }
    if (term.academicYear) {
      academicYear.value = term.academicYear
    }
    if (term.semester) {
      semester.value = term.semester
    }
    if (term.courseId) {
      scopeCourseId.value = term.courseId
      examFilterCourseId.value = term.courseId
    }
    if (term.referenceDepartmentId) {
      referenceDepartmentId.value = term.referenceDepartmentId
    }
    if (term.referenceDepartmentName) {
      referenceDepartmentLabel.value = term.referenceDepartmentName
    }
    if (term.courseName) {
      scopeCourseLabel.value = term.courseName
    }
  }, { immediate: true, deep: true })

  watch(academicYear, (value) => {
    const lockedYear = lockTerm?.value?.academicYear
    if (examLocked.value && lockedYear && value !== lockedYear) {
      academicYear.value = lockedYear
    }
  })

  watch(semester, (value) => {
    const lockedSemester = lockTerm?.value?.semester
    if (examLocked.value && lockedSemester && value !== lockedSemester) {
      semester.value = lockedSemester
    }
  })

  watch(examFilterCourseId, (value) => {
    const lockedCourseId = lockTerm?.value?.courseId
    if (examLocked.value && lockedCourseId && value !== lockedCourseId) {
      examFilterCourseId.value = lockedCourseId
      return
    }
    if (examLocked.value) {
      return
    }
    if (!value) {
      scopeCourseLabel.value = ''
      if (!examId.value) {
        scopeCourseId.value = undefined
      }
    }
    else {
      const courseName = authorizedCourses.value.find(course => course.id === value)?.courseName?.trim()
      if (courseName) {
        scopeCourseLabel.value = courseName
      }
    }
    if (examId.value && !filteredExams.value.some(exam => exam.examId === examId.value)) {
      examId.value = undefined
    }
  })

  watch(scopeCourseId, (value) => {
    const lockedCourseId = lockTerm?.value?.courseId
    if (examLocked.value && lockedCourseId && value !== lockedCourseId) {
      scopeCourseId.value = lockedCourseId
    }
  })

  watch(referenceDepartmentId, (value) => {
    const lockedDepartmentId = lockTerm?.value?.referenceDepartmentId
    if (examLocked.value && lockedDepartmentId && value !== lockedDepartmentId) {
      referenceDepartmentId.value = lockedDepartmentId
    }
  })

  watch(() => lockExamId?.value, (id) => {
    if (id) {
      examId.value = id
    }
  }, { immediate: true })

  watch([examFilterCourseId, examId, scopeCourseId, referenceDepartmentId], () => {
    void loadOverview()
  })

  watch(examId, (id) => {
    if (lockExamId?.value && id !== lockExamId.value) {
      examId.value = lockExamId.value
      return
    }
    classId.value = undefined
    classLabel.value = ''
    if (!id) {
      if (!examLocked.value) {
        clearOrgScope()
      }
      return
    }
    const exam = selectedExam.value ?? exams.value.find(item => item.examId === id)
    if (exam) {
      syncOrgScopeFromExam(exam)
    }
  })

  watch([examId, exams], () => {
    if (!examId.value) {
      return
    }
    const exam = selectedExam.value ?? exams.value.find(item => item.examId === examId.value)
    if (exam) {
      syncOrgScopeFromExam(exam)
    }
  })

  void loadAuthorizedCourses()

  const scopePanelActions: AiAnalysisScopePanelActions = {
    setExamFilterCourse,
    setOrgDepartmentLabel(label: string) {
      referenceDepartmentLabel.value = label
    },
    setOrgCourseLabel(label: string) {
      scopeCourseLabel.value = label
    },
    setOrgClassLabel(label: string, classIdValue?: string | null) {
      classLabel.value = label
      if (!classIdValue) {
        classLabel.value = ''
      }
    },
  }

  provide(AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY, referenceDepartmentId)
  provide(AI_ANALYSIS_COURSE_ID_KEY, scopeCourseId)
  provide(AI_ANALYSIS_REFERENCE_DEPARTMENT_LABEL_KEY, referenceDepartmentLabel)
  provide(AI_ANALYSIS_SCOPE_COURSE_LABEL_KEY, scopeCourseLabel)
  provide(AI_ANALYSIS_CLASS_ID_KEY, classId)
  provide(AI_ANALYSIS_CLASS_LABEL_KEY, classLabel)
  provide(AI_ANALYSIS_ACADEMIC_YEAR_KEY, academicYear)
  provide(AI_ANALYSIS_SEMESTER_KEY, semester)
  provide(AI_ANALYSIS_EXAM_ID_KEY, examId)
  provide(AI_ANALYSIS_EXAM_FILTER_COURSE_ID_KEY, examFilterCourseId)
  provide(AI_ANALYSIS_EXAMS_LOADING_KEY, examsLoading)
  provide(AI_ANALYSIS_ACADEMIC_YEAR_OPTIONS_KEY, academicYearOptions)
  provide(AI_ANALYSIS_SEMESTER_OPTIONS_KEY, semesterOptions)
  provide(AI_ANALYSIS_EXAM_OPTIONS_KEY, filteredExamOptions)
  provide(AI_ANALYSIS_EXAM_LOCKED_KEY, examLocked)
  provide(AI_ANALYSIS_SCOPE_PANEL_ACTIONS_KEY, scopePanelActions)

  return {
    academicYear,
    semester,
    examFilterCourseId,
    scopeCourseId,
    referenceDepartmentLabel,
    scopeCourseLabel,
    examId,
    classId,
    classLabel,
    referenceDepartmentId,
    examsLoading,
    overview,
    overviewLoading,
    overviewLoadFailed,
    reloadToken,
    academicYearOptions,
    semesterOptions,
    courseOptions,
    examOptions: filteredExamOptions,
    selectedExamLabel,
    scopeSummary,
    setClassScope,
    setExamFilterCourse,
    loadExams,
    refreshAnalysis,
    examLocked,
  }
}

/** Tab 内范围面板注入上下文；须在已调用 useAiAnalysisScope 的父级下使用 */
export function useAiAnalysisScopeContext() {
  const academicYear = inject(AI_ANALYSIS_ACADEMIC_YEAR_KEY, null)
  const semester = inject(AI_ANALYSIS_SEMESTER_KEY, null)
  const examId = inject(AI_ANALYSIS_EXAM_ID_KEY, null)
  const examFilterCourseId = inject(AI_ANALYSIS_EXAM_FILTER_COURSE_ID_KEY, null)
  const referenceDepartmentId = inject(AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY, null)
  const scopeCourseId = inject(AI_ANALYSIS_COURSE_ID_KEY, null)
  const classId = inject(AI_ANALYSIS_CLASS_ID_KEY, null)
  const referenceDepartmentLabel = inject(AI_ANALYSIS_REFERENCE_DEPARTMENT_LABEL_KEY, null)
  const scopeCourseLabel = inject(AI_ANALYSIS_SCOPE_COURSE_LABEL_KEY, null)
  const classLabel = inject(AI_ANALYSIS_CLASS_LABEL_KEY, null)
  const examsLoading = inject(AI_ANALYSIS_EXAMS_LOADING_KEY, null)
  const academicYearOptions = inject(AI_ANALYSIS_ACADEMIC_YEAR_OPTIONS_KEY, null)
  const semesterOptions = inject(AI_ANALYSIS_SEMESTER_OPTIONS_KEY, null)
  const examOptions = inject(AI_ANALYSIS_EXAM_OPTIONS_KEY, null)
  const examLocked = inject(AI_ANALYSIS_EXAM_LOCKED_KEY, null)
  const actions = inject(AI_ANALYSIS_SCOPE_PANEL_ACTIONS_KEY, null)

  if (
    !academicYear
    || !semester
    || !examId
    || !examFilterCourseId
    || !referenceDepartmentId
    || !scopeCourseId
    || !classId
    || !referenceDepartmentLabel
    || !scopeCourseLabel
    || !classLabel
    || !examsLoading
    || !academicYearOptions
    || !semesterOptions
    || !examOptions
    || !examLocked
    || !actions
  ) {
    throw new Error('AI 分析中心未提供 scope 上下文')
  }

  return {
    academicYear,
    semester,
    examId,
    examFilterCourseId,
    referenceDepartmentId,
    scopeCourseId,
    classId,
    referenceDepartmentLabel,
    scopeCourseLabel,
    classLabel,
    examsLoading,
    academicYearOptions,
    semesterOptions,
    examOptions,
    examLocked,
    setExamFilterCourse: actions.setExamFilterCourse,
    setOrgDepartmentLabel: actions.setOrgDepartmentLabel,
    setOrgCourseLabel: actions.setOrgCourseLabel,
    setOrgClassLabel: actions.setOrgClassLabel,
  }
}
