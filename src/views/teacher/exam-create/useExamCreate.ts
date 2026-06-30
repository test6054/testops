import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  ExamCreateBasicForm,
  ExamCreateMarkingTeamForm,
  ExamCreateRosterForm,
  ExamCreateSectionKey,
  ExamRosterScopeMode,
} from './exam-create-context'
import type {
  ExamCreateBundleRequest,
  ExamCreateRequest,
  ExamKindCode,
  ExamRosterCreateRequest,
  ExamScorePolicyCode,
} from '@/apis/mark/exam'
import type { ExamCandidateRosterRequest, ExamCandidateVO } from '@/apis/mark/exam-scope'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createExamBundle, examKindRequiresSource, previewCreateExamRoster } from '@/apis/mark/exam'
import { useUserStore } from '@/stores/modules/user'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import { showUserError } from '@/utils/error-handler'
import { EXAM_CREATE_SECTION_ORDER } from './exam-create-context'
import { mergePreviewCandidates, requirePreviewCandidates } from './exam-create-roster'

export type {
  ExamCreateBasicForm,
  ExamCreateMarkingTeamForm,
  ExamCreateRosterForm,
  ExamCreateSectionKey,
  ExamRosterScopeMode,
  ExamScoreCompositionMode,
} from './exam-create-context'
export {
  EXAM_CREATE_SECTION_ORDER,
  EXAM_ROSTER_SCOPE_MODE_LABEL,
  examCreateBasicFormKey,
  examCreateMarkingTeamFormKey,
  examCreateRosterFormKey,
  isExamCreateSectionKey,
  useInjectedExamCreateBasicForm,
  useInjectedExamCreateMarkingTeamForm,
  useInjectedExamCreateRosterForm,
} from './exam-create-context'

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
  /** 整班纳入 preview 请求进行中；提交前须等待完成，避免携带过期考生快照。 */
  const rosterPreviewSyncing = ref(false)

  const examForm = reactive<ExamCreateBasicForm>({
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
    confidential: false,
    examKind: 'REGULAR',
    sourceExamId: undefined,
    sourceExamName: undefined,
    scorePolicy: undefined,
    remark: '',
  })

  const markingTeamForm = reactive<ExamCreateMarkingTeamForm>({
    chiefExaminerUserId: null,
    chiefExaminerNickName: '',
    anonymousMode: true,
    reviewerUserIds: [],
    reviewerNickNames: [],
    remark: '',
  })

  const rosterForm = reactive<ExamCreateRosterForm>({
    scopeMode: 'BY_CLASS',
    classIds: [],
    candidates: [],
  })

  const basicRules: Record<string, Rule[]> = {
    courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
    examKind: [{ required: true, message: '请选择考试性质', trigger: 'change' }],
    sourceExamId: [
      {
        validator: async (): Promise<void> => {
          if (!examKindRequiresSource(examForm.examKind)) return
          if (!examForm.sourceExamId) {
            throw new Error('请选择原考试')
          }
        },
        trigger: 'change',
      },
    ],
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
          if (examForm.examKind === 'MAKEUP') return
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
          const invalid = rosterForm.candidates.find(
            candidate => !candidate.classId || !classSet.has(candidate.classId),
          )
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
    const chiefName = markingTeamForm.chiefExaminerNickName?.trim()
    if (chiefName && !markingTeamForm.reviewerNickNames.includes(chiefName)) {
      markingTeamForm.reviewerNickNames = [chiefName, ...markingTeamForm.reviewerNickNames]
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

  function addCandidates(candidates: ExamCandidateVO[]): void {
    rosterForm.candidates = mergePreviewCandidates(rosterForm.candidates, candidates)
    const classSet = new Set(rosterForm.classIds)
    for (const candidate of candidates) {
      if (candidate.classId) {
        classSet.add(candidate.classId)
      }
    }
    rosterForm.classIds = [...classSet]
  }

  function setRosterPreviewSyncing(syncing: boolean): void {
    rosterPreviewSyncing.value = syncing
  }

  function syncClassScopeCandidates(candidates: ExamCandidateVO[], classIds: string[]): void {
    rosterForm.classIds = [...classIds]
    rosterForm.candidates = candidates
  }

  function removeCandidate(studentUserId: string): void {
    rosterForm.candidates = rosterForm.candidates.filter(row => row.studentUserId !== studentUserId)
  }

  /** 按人勾选时，参考班级缩窄后同步剔除不在范围内的考生预览行。 */
  function pruneCandidatesToClassScope(): void {
    if (rosterForm.scopeMode !== 'BY_STUDENT') return
    const allowedClassIds = new Set(rosterForm.classIds)
    rosterForm.candidates = rosterForm.candidates.filter(
      candidate => candidate.classId != null && allowedClassIds.has(candidate.classId),
    )
  }

  function validateRosterContractInline(): string | null {
    if (rosterForm.candidates.length === 0) {
      return null
    }
    if (!rosterForm.classIds.length) {
      return '请选择参考班级'
    }
    const classSet = new Set(rosterForm.classIds)
    if (rosterForm.candidates.some(candidate => !candidate.classId || !classSet.has(candidate.classId))) {
      return '存在考生班级不在参考班级范围内'
    }
    return null
  }

  function resolveSubmitScorePolicy(): ExamScorePolicyCode {
    if (examForm.examKind === 'REGULAR') {
      return examForm.scoreCompositionMode === 'EXAM_WITH_DAILY' ? 'FULL' : 'ACTUAL_ONLY'
    }
    if (examForm.examKind === 'RETAKE') {
      return 'ACTUAL_ONLY'
    }
    return 'MAKEUP_CAP60'
  }

  function buildExamRequest(): ExamCreateRequest | null {
    const [startTime, endTime] = examForm.examWindow ?? []
    if (!examForm.courseId || !startTime || !endTime) {
      void message.error('请完善考务信息')
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
      examKind: examForm.examKind,
      sourceExamId: examForm.sourceExamId,
      scorePolicy: resolveSubmitScorePolicy(),
      dailyScoreFull: examForm.examKind === 'REGULAR'
        && examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'
        ? examForm.dailyScoreFull
        : null,
      confidential: examForm.confidential,
      remark: examForm.remark?.trim() || undefined,
    }
  }

  function buildRosterRequest(): ExamRosterCreateRequest | undefined {
    if (rosterForm.candidates.length === 0) {
      return undefined
    }
    const candidates: ExamCandidateRosterRequest[] = rosterForm.candidates.map((candidate) => {
      if (!candidate.classId) {
        throw new Error('存在缺少班级的考生预览')
      }
      return {
        classId: candidate.classId,
        studentUserId: candidate.studentUserId,
      }
    })
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
      void message.error('请选择主考教师')
      return null
    }
    let roster: ExamRosterCreateRequest | undefined
    try {
      roster = buildRosterRequest()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '考生名册不完整')
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
      roster,
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
    if (rosterPreviewSyncing.value) {
      void message.error('名册预览加载中，请稍候再提交')
      return false
    }
    if (
      rosterForm.scopeMode === 'BY_CLASS'
      && rosterForm.classIds.length > 0
      && rosterForm.candidates.length === 0
    ) {
      void message.error('整班纳入须包含所选班级的全部学生')
      return false
    }
    if (
      rosterForm.scopeMode === 'BY_STUDENT'
      && rosterForm.classIds.length > 0
      && rosterForm.candidates.length === 0
    ) {
      void message.error('请通过「按学生选择」纳入补考或部分考生')
      return false
    }
    const inlineError = validateRosterContractInline()
    if (inlineError) {
      void message.error(inlineError)
      return false
    }
    if (rosterForm.candidates.length === 0) return true
    if (!rosterFormRef.value) {
      void message.error('考生范围表单尚未就绪，请稍后重试')
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
          void message.warning('请先完善考务信息')
          activeSection.value = sectionKey
          return false
        }
        continue
      }
      if (sectionKey === 'exam-create-marking-team') {
        if (!(await validateMarkingTeamStep())) {
          void message.warning('请先完善阅卷队伍')
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

  async function refreshByClassRosterBeforeSubmit(): Promise<boolean> {
    if (rosterForm.scopeMode !== 'BY_CLASS' || rosterForm.classIds.length === 0) {
      return true
    }
    if (rosterForm.candidates.length === 0) {
      return true
    }
    try {
      const preview = await previewCreateExamRoster({
        scopeMode: 'BY_CLASS',
        classIds: [...rosterForm.classIds],
      })
      rosterForm.candidates = requirePreviewCandidates(preview.candidates)
      return true
    } catch (error) {
      showUserError(error, '提交前名册预览失败，请重新选择参考班级')
      return false
    }
  }

  async function handleCreateExam(): Promise<void> {
    if (!(await validateAllSteps())) return
    if (!(await refreshByClassRosterBeforeSubmit())) {
      activeSection.value = 'exam-create-candidates'
      return
    }
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
    () => examForm.examKind,
    (examKind: ExamKindCode) => {
      if (examKind === 'MAKEUP') {
        rosterForm.scopeMode = 'BY_STUDENT'
        rosterForm.classIds = []
        rosterForm.candidates = []
      }
    },
  )

  watch(
    () => examForm.academicYear,
    (academicYear) => {
      if (!academicYear?.trim()) {
        examForm.semester = undefined
      }
    },
  )

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
    rosterPreviewSyncing,
    setChiefExaminer,
    setCourseSelection,
    setReviewerNickNames,
    changeScopeMode,
    setRosterPreviewSyncing,
    syncClassScopeCandidates,
    addCandidates,
    removeCandidate,
    validateStepsBeforeSection,
    handleCreateExam,
    handleGoBack,
    handleViewWorkspace,
    handleBackToList,
  }
}
