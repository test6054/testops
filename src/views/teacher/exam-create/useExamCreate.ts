import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  ExamCreateBundleRequest,
  ExamCreateRequest,
  ExamRosterCreateRequest,
  ExamRosterScopeMode,
  GradingStrategyCode,
} from '@/apis/mark/exam'
import { EXAM_ROSTER_SCOPE_MODE_LABEL } from '@/apis/mark/exam'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createExamBundle } from '@/apis/mark/exam'
import type { ExamCandidateRosterRequest } from '@/apis/mark/exam-scope'
import { useUserStore } from '@/stores/modules/user'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import { showUserError } from '@/utils/error-handler'
import { mergeCandidateRows } from './candidate-tree-utils'

export type ExamScoreCompositionMode = 'EXAM_ONLY' | 'EXAM_WITH_DAILY'

export type ExamCreateSectionKey =
  | 'exam-create-basic'
  | 'exam-create-marking-team'
  | 'exam-create-candidates'
  | 'exam-create-confirm'

const EXAM_CREATE_SECTION_ORDER: ExamCreateSectionKey[] = [
  'exam-create-basic',
  'exam-create-marking-team',
  'exam-create-candidates',
  'exam-create-confirm',
]

export type { ExamRosterScopeMode }
export { EXAM_ROSTER_SCOPE_MODE_LABEL }

export interface ExamBasicForm {
  courseId: string | null
  courseName: string
  examName: string
  examNo: string
  academicYear: string
  semester?: string
  examWindow?: [string, string]
  gradingStrategy: GradingStrategyCode
  scoreCompositionMode: ExamScoreCompositionMode
  dailyScoreFull?: number
  remark?: string
}

export interface ExamMarkingTeamForm {
  chiefExaminerUserId: string | null
  chiefExaminerNickName: string
  anonymousMode: boolean
  reviewerUserIds: string[]
  reviewerNickNames: string[]
  remark?: string
}

export interface ExamCreateCandidateRow {
  studentUserId: string
  classId: string
  className: string
  studentNo: string
  studentName: string
}

export interface ExamRosterForm {
  scopeMode: ExamRosterScopeMode
  classIds: string[]
  candidates: ExamCreateCandidateRow[]
}

export function useExamCreate() {
  const router = useRouter()
  const userStore = useUserStore()
  const submitting = ref(false)
  const showSuccessModal = ref(false)
  const createdExamId = ref<string | null>(null)
  const activeSection = ref<ExamCreateSectionKey>('exam-create-basic')
  const basicFormRef = ref<FormInstance>()
  const markingTeamFormRef = ref<FormInstance>()
  const rosterFormRef = ref<FormInstance>()

  const examForm = reactive<ExamBasicForm>({
    courseId: null,
    courseName: '',
    examName: '',
    examNo: '',
    academicYear: '',
    semester: undefined,
    examWindow: undefined,
    gradingStrategy: 'SINGLE',
    scoreCompositionMode: 'EXAM_ONLY',
    dailyScoreFull: undefined,
    remark: '',
  })

  const markingTeamForm = reactive<ExamMarkingTeamForm>({
    chiefExaminerUserId: null,
    chiefExaminerNickName: '',
    anonymousMode: true,
    reviewerUserIds: [],
    reviewerNickNames: [],
    remark: '',
  })

  const rosterForm = reactive<ExamRosterForm>({
    scopeMode: 'BY_CLASS',
    classIds: [],
    candidates: [],
  })

  const basicRules: Record<string, Rule[]> = {
    courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
    examName: [
      { required: true, message: '请输入考试名称', trigger: 'blur' },
      { max: 100, message: '考试名称最多 100 个字符', trigger: 'blur' },
    ],
    examNo: [
      { required: true, message: '请输入考务编号', trigger: 'blur' },
      { max: 64, message: '考务编号最多 64 个字符', trigger: 'blur' },
    ],
    academicYear: [
      {
        validator: async (): Promise<void> => {
          const academicYear = examForm.academicYear?.trim()
          if (!academicYear && !examForm.semester) return
          if (!academicYear || !examForm.semester) {
            throw new Error('学年与学期必须同时填写或同时留空')
          }
          const match = /^(\d{4})-(\d{4})$/.exec(academicYear)
          if (!match || Number(match[2]) !== Number(match[1]) + 1) {
            throw new Error('学年格式应为 2024-2025')
          }
        },
        trigger: 'blur',
      },
    ],
    semester: [
      {
        validator: async (): Promise<void> => {
          const academicYear = examForm.academicYear?.trim()
          if (!academicYear && !examForm.semester) return
          if (!academicYear || !examForm.semester) {
            throw new Error('学年与学期必须同时填写或同时留空')
          }
        },
        trigger: 'change',
      },
    ],
    examWindow: [
      {
        validator: async (): Promise<void> => {
          const [startTime, endTime] = examForm.examWindow ?? []
          if (!startTime || !endTime) {
            throw new Error('请选择考试时间窗')
          }
          if (startTime >= endTime) {
            throw new Error('考试开始时间必须早于结束时间')
          }
        },
        trigger: 'change',
      },
    ],
    dailyScoreFull: [
      {
        validator: async (): Promise<void> => {
          if (examForm.scoreCompositionMode !== 'EXAM_WITH_DAILY') return
          const value = examForm.dailyScoreFull
          if (value == null || value <= 0) {
            throw new Error('请填写平时成绩满分（须大于 0）')
          }
          if (value > 1000) {
            throw new Error('平时成绩满分不能超过 1000')
          }
        },
        trigger: 'change',
      },
    ],
    remark: [{ max: 500, message: '备注最多 500 个字符', trigger: 'blur' }],
  }

  const markingTeamRules: Record<string, Rule[]> = {
    chiefExaminerUserId: [{ required: true, message: '请选择主考教师', trigger: 'change' }],
    reviewerUserIds: [
      {
        validator: async (): Promise<void> => {
          if (markingTeamForm.reviewerUserIds.length < 1) {
            throw new Error('请至少选择一名阅卷教师')
          }
          const chiefId = markingTeamForm.chiefExaminerUserId
          if (chiefId && !markingTeamForm.reviewerUserIds.includes(chiefId)) {
            throw new Error('主考须为阅卷教师之一')
          }
        },
        trigger: 'change',
      },
    ],
    remark: [{ max: 200, message: '备注最多 200 个字符', trigger: 'blur' }],
  }

  const rosterRules: Record<string, Rule[]> = {
    scopeMode: [{ required: true, message: '请选择考生纳入方式', trigger: 'change' }],
    classIds: [
      {
        validator: async (): Promise<void> => {
          if (rosterForm.candidates.length === 0 && rosterForm.classIds.length === 0) return
          if (!rosterForm.classIds.length) {
            throw new Error('请选择参考班级')
          }
        },
        trigger: 'change',
      },
      {
        validator: async (): Promise<void> => {
          if (rosterForm.scopeMode !== 'BY_CLASS') return
          if (!rosterForm.classIds.length) return
          if (rosterForm.candidates.length === 0) {
            throw new Error('整班纳入须包含所选班级的全部学生')
          }
        },
        trigger: 'change',
      },
      {
        validator: async (): Promise<void> => {
          if (rosterForm.scopeMode !== 'BY_STUDENT') return
          if (rosterForm.candidates.length === 0) return
          if (!rosterForm.classIds.length) {
            throw new Error('按人勾选须先选择参考班级')
          }
        },
        trigger: 'change',
      },
    ],
    candidates: [
      {
        validator: async (): Promise<void> => {
          if (rosterForm.candidates.length === 0) return
          const classSet = new Set(rosterForm.classIds)
          const invalid = rosterForm.candidates.find(row => !classSet.has(row.classId))
          if (invalid) {
            throw new Error('存在考生班级不在参考班级范围内')
          }
        },
        trigger: 'change',
      },
    ],
  }

  const navItems = computed(() => [
    { key: 'exam-create-basic', label: '考务信息' },
    { key: 'exam-create-marking-team', label: '阅卷队伍' },
    { key: 'exam-create-candidates', label: '考生范围' },
    { key: 'exam-create-confirm', label: '确认创建' },
  ])

  function ensureChiefInReviewers(): void {
    const chiefId = markingTeamForm.chiefExaminerUserId
    if (!chiefId) return
    if (!markingTeamForm.reviewerUserIds.includes(chiefId)) {
      markingTeamForm.reviewerUserIds = [chiefId, ...markingTeamForm.reviewerUserIds]
    }
  }

  function setCourseSelection(courseId: string | null, courseName: string): void {
    examForm.courseId = courseId
    examForm.courseName = courseName
  }

  function setReviewerNickNames(nickNames: string[]): void {
    markingTeamForm.reviewerNickNames = [...nickNames]
  }

  function setChiefExaminer(userId: string | null, nickName: string): void {
    markingTeamForm.chiefExaminerUserId = userId
    markingTeamForm.chiefExaminerNickName = nickName
    ensureChiefInReviewers()
  }

  function changeScopeMode(mode: ExamRosterScopeMode): void {
    rosterForm.scopeMode = mode
    rosterForm.classIds = []
    rosterForm.candidates = []
  }

  function replaceCandidates(rows: ExamCreateCandidateRow[]): void {
    rosterForm.candidates = rows
  }

  function addCandidates(rows: ExamCreateCandidateRow[]): void {
    rosterForm.candidates = mergeCandidateRows(rosterForm.candidates, rows)
    const classSet = new Set(rosterForm.classIds)
    for (const row of rows) {
      classSet.add(row.classId)
    }
    rosterForm.classIds = [...classSet]
  }

  function syncClassScopeCandidates(rows: ExamCreateCandidateRow[], classIds: string[]): void {
    rosterForm.classIds = [...classIds]
    rosterForm.candidates = rows
  }

  function removeCandidate(studentUserId: string): void {
    rosterForm.candidates = rosterForm.candidates.filter(row => row.studentUserId !== studentUserId)
  }

  /** 按人勾选时，参考班级缩窄后同步剔除不在范围内的考生预览行。 */
  function pruneCandidatesToClassScope(): void {
    if (rosterForm.scopeMode !== 'BY_STUDENT') return
    const allowedClassIds = new Set(rosterForm.classIds)
    rosterForm.candidates = rosterForm.candidates.filter(row => allowedClassIds.has(row.classId))
  }

  function validateRosterContractInline(): string | null {
    if (rosterForm.candidates.length === 0) {
      return null
    }
    if (!rosterForm.classIds.length) {
      return '请选择参考班级'
    }
    const classSet = new Set(rosterForm.classIds)
    if (rosterForm.candidates.some(row => !classSet.has(row.classId))) {
      return '存在考生班级不在参考班级范围内'
    }
    return null
  }

  function buildExamRequest(): ExamCreateRequest | null {
    const [startTime, endTime] = examForm.examWindow ?? []
    if (!examForm.courseId || !startTime || !endTime) {
      message.error('请完善考务信息')
      return null
    }
    return {
      courseId: examForm.courseId,
      examName: examForm.examName.trim(),
      examNo: examForm.examNo.trim(),
      academicYear: examForm.academicYear?.trim() || undefined,
      semester: examForm.semester,
      examStartTime: startTime,
      examEndTime: endTime,
      gradingStrategy: 'SINGLE',
      dailyScoreFull: examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'
        ? examForm.dailyScoreFull
        : null,
      remark: examForm.remark?.trim() || undefined,
    }
  }

  function buildRosterRequest(): ExamRosterCreateRequest | undefined {
    if (rosterForm.candidates.length === 0) {
      return undefined
    }
    const candidates: ExamCandidateRosterRequest[] = rosterForm.candidates.map(row => ({
      classId: row.classId,
      studentUserId: row.studentUserId,
    }))
    return {
      scopeMode: rosterForm.scopeMode,
      classIds: [...rosterForm.classIds],
      candidates,
    }
  }

  function buildBundleRequest(): ExamCreateBundleRequest | null {
    const exam = buildExamRequest()
    if (!exam) return null
    if (!markingTeamForm.chiefExaminerUserId || !markingTeamForm.chiefExaminerNickName) {
      message.error('请选择主考教师')
      return null
    }
    return {
      exam,
      markingTeam: {
        chiefExaminerUserId: markingTeamForm.chiefExaminerUserId,
        anonymousMode: markingTeamForm.anonymousMode,
        reviewerUserIds: [...markingTeamForm.reviewerUserIds],
        remark: markingTeamForm.remark?.trim() || undefined,
      },
      roster: buildRosterRequest(),
    }
  }

  async function validateBasicStep(): Promise<boolean> {
    if (!basicFormRef.value) return false
    try {
      await basicFormRef.value.validate()
      return true
    } catch {
      return false
    }
  }

  async function validateMarkingTeamStep(): Promise<boolean> {
    ensureChiefInReviewers()
    if (!markingTeamFormRef.value) return false
    try {
      await markingTeamFormRef.value.validate()
      return true
    } catch {
      return false
    }
  }

  async function validateRosterStep(): Promise<boolean> {
    if (
      rosterForm.scopeMode === 'BY_CLASS'
      && rosterForm.classIds.length > 0
      && rosterForm.candidates.length === 0
    ) {
      message.error('整班纳入须包含所选班级的全部学生')
      return false
    }
    if (
      rosterForm.scopeMode === 'BY_STUDENT'
      && rosterForm.classIds.length > 0
      && rosterForm.candidates.length === 0
    ) {
      message.error('请通过「按学生选择」纳入补考或部分考生')
      return false
    }
    const inlineError = validateRosterContractInline()
    if (inlineError) {
      message.error(inlineError)
      return false
    }
    if (rosterForm.candidates.length === 0) return true
    if (!rosterFormRef.value) {
      message.error('考生范围表单尚未就绪，请稍后重试')
      return false
    }
    try {
      await rosterFormRef.value.validate()
      return true
    } catch {
      return false
    }
  }

  async function validateStepsBeforeSection(target: ExamCreateSectionKey): Promise<boolean> {
    const targetIdx = EXAM_CREATE_SECTION_ORDER.indexOf(target)
    for (let i = 0; i < targetIdx; i++) {
      const sectionKey = EXAM_CREATE_SECTION_ORDER[i]
      if (sectionKey === 'exam-create-basic') {
        if (!(await validateBasicStep())) {
          message.warning('请先完善考务信息')
          activeSection.value = sectionKey
          return false
        }
        continue
      }
      if (sectionKey === 'exam-create-marking-team') {
        if (!(await validateMarkingTeamStep())) {
          message.warning('请先完善阅卷队伍')
          activeSection.value = sectionKey
          return false
        }
        continue
      }
      if (sectionKey === 'exam-create-candidates') {
        if (!(await validateRosterStep())) {
          activeSection.value = sectionKey
          return false
        }
      }
    }
    return true
  }

  async function validateAllSteps(): Promise<boolean> {
    const basicOk = await validateBasicStep()
    if (!basicOk) {
      activeSection.value = 'exam-create-basic'
      return false
    }
    const teamOk = await validateMarkingTeamStep()
    if (!teamOk) {
      activeSection.value = 'exam-create-marking-team'
      return false
    }
    const rosterOk = await validateRosterStep()
    if (!rosterOk) {
      activeSection.value = 'exam-create-candidates'
      return false
    }
    return true
  }

  async function handleCreateExam(): Promise<void> {
    if (!(await validateAllSteps())) return
    const request = buildBundleRequest()
    if (!request) return
    submitting.value = true
    try {
      const response = await createExamBundle(request)
      createdExamId.value = response.examId
      showSuccessModal.value = true
    } catch (error) {
      showUserError(error, '创建考试失败')
    } finally {
      submitting.value = false
    }
  }

  function handleGoBack(): void {
    void router.push({ name: 'TeacherExamList' })
  }

  function handleViewWorkspace(): void {
    if (!createdExamId.value) return
    void router.push({
      name: 'TeacherExamWorkspacePrep',
      params: { examId: createdExamId.value },
    })
  }

  function handleBackToList(): void {
    void router.push({ name: 'TeacherExamList' })
  }

  onMounted(() => {
    const defaults = getDefaultAcademicYearAndSemester()
    examForm.academicYear = defaults.academicYear
    examForm.semester = defaults.semester
    const { userId, nickName } = userStore.userInfo
    setChiefExaminer(userId, nickName)
    markingTeamForm.reviewerNickNames = [nickName]
  })

  watch(
    () => rosterForm.classIds,
    () => pruneCandidatesToClassScope(),
    { deep: true },
  )

  return {
    examForm,
    markingTeamForm,
    rosterForm,
    basicFormRef,
    markingTeamFormRef,
    rosterFormRef,
    basicRules,
    markingTeamRules,
    rosterRules,
    activeSection,
    navItems,
    submitting,
    showSuccessModal,
    createdExamId,
    setChiefExaminer,
    setCourseSelection,
    setReviewerNickNames,
    changeScopeMode,
    replaceCandidates,
    syncClassScopeCandidates,
    ensureChiefInReviewers,
    addCandidates,
    removeCandidate,
    validateBasicStep,
    validateMarkingTeamStep,
    validateRosterStep,
    validateStepsBeforeSection,
    handleCreateExam,
    handleGoBack,
    handleViewWorkspace,
    handleBackToList,
  }
}
