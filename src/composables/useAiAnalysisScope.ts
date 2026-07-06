import type { InjectionKey, Ref } from 'vue'
import type { AiAnalysisCenterOverviewResponse } from '@/apis/mark/analysis-center'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { computed, inject, provide, ref, watch } from 'vue'
import { loadAiAnalysisCenterOverview } from '@/apis/mark/analysis-center'
import { pageExams } from '@/apis/mark/exam'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import {
  generateAcademicYearOptions,
  getDefaultAcademicYearAndSemester,
} from '@/utils/academic-year'
import { showUserError } from '@/utils/error-handler'
import { readAllPages } from '@/utils/page-result'

/** 工作台内锁定 AI 分析考试范围（注入后禁止切换考试） */
export const AI_ANALYSIS_LOCK_EXAM_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisLockExamId')

/** 趋势/校级 Tab 与顶栏概览共享的院系 org scope */
export const AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisReferenceDepartmentId')

/** 趋势/校级 Tab 与顶栏概览共享的班级 scope */
export const AI_ANALYSIS_CLASS_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisClassId')

/** 趋势/校级 Tab 与顶栏概览共享的课程 scope */
export const AI_ANALYSIS_COURSE_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aiAnalysisCourseId')

/** 趋势 Tab 面包屑展示用班级名称 */
export const AI_ANALYSIS_CLASS_LABEL_KEY: InjectionKey<Ref<string>> = Symbol('aiAnalysisClassLabel')

/** 工作台内同步学年学期课程，避免锁定考试后范围漂移 */
export interface AiAnalysisLockTerm {
  academicYear?: string
  semester?: SemesterCode
  courseId?: string
}

export const AI_ANALYSIS_LOCK_TERM_KEY: InjectionKey<Ref<AiAnalysisLockTerm | null>> = Symbol('aiAnalysisLockTerm')

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
  const courseId = ref<string | undefined>(undefined)
  const examId = ref<string | undefined>(undefined)
  const classId = ref<string | undefined>(undefined)
  const classLabel = ref('')
  const referenceDepartmentId = ref<string | undefined>(undefined)
  provide(AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY, referenceDepartmentId)
  provide(AI_ANALYSIS_COURSE_ID_KEY, courseId)
  provide(AI_ANALYSIS_CLASS_ID_KEY, classId)
  provide(AI_ANALYSIS_CLASS_LABEL_KEY, classLabel)
  const examsLoading = ref(false)
  const exams = ref<ExamSummaryResponse[]>([])
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

  const courseOptions = computed(() => {
    const courseMap = new Map<string, string>()
    exams.value.forEach((exam) => {
      if (!exam.courseId) {
        return
      }
      const label = exam.courseName?.trim() || exam.courseId
      courseMap.set(exam.courseId, label)
    })
    return Array.from(courseMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
  })

  const filteredExams = computed(() => {
    if (!courseId.value) {
      return exams.value
    }
    return exams.value.filter(exam => exam.courseId === courseId.value)
  })

  const filteredExamOptions = computed(() =>
    filteredExams.value.map(exam => ({
      label: exam.examName ?? exam.examId ?? '—',
      value: exam.examId ?? '',
    })).filter(option => option.value),
  )

  const selectedExam = computed(() =>
    exams.value.find(exam => exam.examId === examId.value),
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
    if (courseId.value) {
      const courseName = courseOptions.value.find(item => item.value === courseId.value)?.label
      if (courseName) {
        parts.push(courseName)
      }
    }
    if (selectedExamLabel.value) {
      parts.push(selectedExamLabel.value)
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

  function buildExamPageQuery(pageNum: number) {
    const query: Parameters<typeof pageExams>[0] = {
      academicYear: academicYear.value,
      semester: semester.value,
      pageNum,
      pageSize: 100,
    }
    const scopedCourseId = courseId.value?.trim()
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
        courseId: courseId.value,
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

  async function loadExams() {
    examsLoading.value = true
    try {
      exams.value = await readAllPages(
        pageNum => pageExams(buildExamPageQuery(pageNum)),
        '考试列表加载失败',
      )
      if (examId.value && !exams.value.some(exam => exam.examId === examId.value)) {
        if (!examLocked.value) {
          examId.value = undefined
        }
      }
      if (courseId.value && !exams.value.some(exam => exam.courseId === courseId.value)) {
        courseId.value = undefined
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

  watch([academicYear, semester, referenceDepartmentId, classId], () => {
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
      courseId.value = term.courseId
    }
  }, { immediate: true, deep: true })

  watch(() => lockExamId?.value, (id) => {
    if (id) {
      examId.value = id
    }
  }, { immediate: true })

  watch([courseId, examId], () => {
    void loadOverview()
  })

  watch(courseId, () => {
    if (examLocked.value) {
      return
    }
    if (examId.value && !filteredExams.value.some(exam => exam.examId === examId.value)) {
      examId.value = undefined
    }
  })

  watch(examId, (id) => {
    if (lockExamId?.value && id !== lockExamId.value) {
      examId.value = lockExamId.value
      return
    }
    classId.value = undefined
    classLabel.value = ''
  })

  return {
    academicYear,
    semester,
    courseId,
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
    loadExams,
    refreshAnalysis,
    examLocked,
  }
}
