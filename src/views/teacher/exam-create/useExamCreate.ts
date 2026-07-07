import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { NamePath } from 'ant-design-vue/es/form/interface'
import type {
  ExamCreateBasicForm,
  ExamCreateMarkingTeamForm,
  ExamCreateRosterForm,
  ExamCreateSectionKey,
} from './exam-create-context'
import type {
  ExamCreateBundleRequest,
  ExamCreateRequest,
  ExamRosterCreateRequest,
} from '@/apis/mark/exam'
import type { ExamCandidateResponse, ExamCandidateRosterRequest } from '@/apis/mark/exam-scope'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  createExamBundle,
  ExamGradingStrategyCode,
  ExamKindCode,
  examKindRequiresSource,
  ExamRosterScopeModeCode,
  ExamScorePolicyCode,
  previewCreateExamRoster,
} from '@/apis/mark/exam'
import { useUserStore } from '@/stores/modules/user'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import { rejectFormValidation, showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { EXAM_CREATE_SECTION_ORDER } from './exam-create-context'
import { mergePreviewCandidates, requirePreviewCandidates } from './exam-create-roster'

export type {
  ExamCreateBasicForm,
  ExamCreateMarkingTeamForm,
  ExamCreateRosterForm,
  ExamCreateSectionKey,
  ExamRosterScopeModeCode,
  ExamScoreCompositionMode,
} from './exam-create-context'
export {
  EXAM_CREATE_SECTION_ORDER,
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
  /** 提交校验失败时，用于滚动定位到首个错误表单项。 */
  const lastInvalidField = ref<{ section: ExamCreateSectionKey, name: NamePath } | null>(null)

  function captureFormValidationError(section: ExamCreateSectionKey, error: unknown): void {
    const errorFields = (error as { errorFields?: Array<{ name: NamePath }> })?.errorFields
    const firstName = errorFields?.[0]?.name
    if (firstName == null) return
    lastInvalidField.value = { section, name: firstName }
  }

  function scrollToFirstInvalidField(): void {
    const target = lastInvalidField.value
    if (!target) return
    const formRef = target.section === 'exam-create-basic'
      ? basicFormRef.value
      : target.section === 'exam-create-marking-team'
        ? markingTeamFormRef.value
        : target.section === 'exam-create-candidates'
          ? rosterFormRef.value
          : undefined
    formRef?.scrollToField(target.name, { behavior: 'smooth', block: 'center' })
    lastInvalidField.value = null
  }

  const defaultTerm = getDefaultAcademicYearAndSemester()
  const examForm = reactive<ExamCreateBasicForm>({
    courseId: null,
    courseName: '',
    examName: '',
    examNo: '',
    academicYear: defaultTerm.academicYear,
    semester: defaultTerm.semester,
    examWindow: undefined,
    gradingStrategy: ExamGradingStrategyCode.SINGLE,
    scoreCompositionMode: 'EXAM_ONLY',
    dailyScoreFull: undefined,
    confidential: false,
    examKind: ExamKindCode.REGULAR,
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
    scopeMode: ExamRosterScopeModeCode.BY_CLASS,
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
            return rejectFormValidation('请选择原考试')
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
      { required: true, message: '请输入学年', trigger: 'blur' },
      {
        validator: async (_rule, value: string): Promise<void> => {
          const academicYear = value?.trim()
          if (!academicYear) {
            return rejectFormValidation('请输入学年')
          }
          const match = /^(\d{4})-(\d{4})$/.exec(academicYear)
          if (!match || Number(match[2]) !== Number(match[1]) + 1) {
            return rejectFormValidation('学年格式应为 2024-2025')
          }
        },
        trigger: 'blur',
      },
    ],
    semester: [
      { required: true, message: '请选择学期', trigger: 'change' },
    ],
    examWindow: [
      {
        validator: async (): Promise<void> => {
          const [startTime, endTime] = examForm.examWindow ?? []
          if (!startTime || !endTime) {
            return rejectFormValidation('请选择考试时间窗')
          }
          if (startTime >= endTime) {
            return rejectFormValidation('考试开始时间必须早于结束时间')
          }
        },
        trigger: 'change',
      },
    ],
    dailyScoreFull: [
      {
        validator: async (): Promise<void> => {
          if (examForm.examKind !== ExamKindCode.REGULAR) return
          if (examForm.scoreCompositionMode !== 'EXAM_WITH_DAILY') return
          const value = examForm.dailyScoreFull
          if (value == null || value <= 0) {
            return rejectFormValidation('请填写平时成绩满分（须大于 0）')
          }
          if (value > 1000) {
            return rejectFormValidation('平时成绩满分不能超过 1000')
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
            return rejectFormValidation('请至少选择一名阅卷教师')
          }
          const chiefId = markingTeamForm.chiefExaminerUserId
          if (chiefId && !markingTeamForm.reviewerUserIds.includes(chiefId)) {
            return rejectFormValidation('主考须为阅卷教师之一')
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
            return rejectFormValidation('请选择参考班级')
          }
        },
        trigger: 'change',
      },
      {
        validator: async (): Promise<void> => {
          if (rosterForm.scopeMode !== ExamRosterScopeModeCode.BY_CLASS) return
          if (!rosterForm.classIds.length) return
          if (rosterForm.candidates.length === 0) {
            return rejectFormValidation('整班纳入须包含所选班级的全部学生')
          }
        },
        trigger: 'change',
      },
      {
        validator: async (): Promise<void> => {
          if (rosterForm.scopeMode !== ExamRosterScopeModeCode.BY_STUDENT) return
          if (rosterForm.candidates.length === 0) return
          if (!rosterForm.classIds.length) {
            return rejectFormValidation('按人勾选须先选择参考班级')
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
            return rejectFormValidation('存在考生班级不在参考班级范围内')
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

  function normalizeTeacherUserId(userId: string | number | null | undefined): string | null {
    if (userId == null || userId === '') return null
    return String(userId)
  }

  function replaceChiefInReviewerList(
    previousChiefId: string | null,
    chiefId: string,
    chiefName: string,
  ): void {
    const pairs: Array<{ id: string, name: string }> = []
    for (let index = 0; index < markingTeamForm.reviewerUserIds.length; index += 1) {
      pairs.push({
        id: markingTeamForm.reviewerUserIds[index],
        name: markingTeamForm.reviewerNickNames[index] ?? '',
      })
    }

    let nextPairs = pairs
    if (previousChiefId && previousChiefId !== chiefId) {
      nextPairs = nextPairs.filter(pair => pair.id !== previousChiefId)
    }
    nextPairs = nextPairs.filter(pair => pair.id !== chiefId)

    const trimmedChiefName = chiefName.trim()
    markingTeamForm.reviewerUserIds = [chiefId, ...nextPairs.map(pair => pair.id)]
    markingTeamForm.reviewerNickNames = trimmedChiefName
      ? [trimmedChiefName, ...nextPairs.map(pair => pair.name).filter(Boolean)]
      : nextPairs.map(pair => pair.name).filter(Boolean)
  }

  function ensureChiefInReviewers(): void {
    const chiefId = markingTeamForm.chiefExaminerUserId
    if (!chiefId) return
    if (markingTeamForm.reviewerUserIds.includes(chiefId)) return
    replaceChiefInReviewerList(null, chiefId, markingTeamForm.chiefExaminerNickName)
  }

  function setCourseSelection(courseId: string | null, courseName: string): void {
    examForm.courseId = courseId
    examForm.courseName = courseName
  }

  function setReviewerNickNames(nickNames: string[]): void {
    markingTeamForm.reviewerNickNames = [...nickNames]
  }

  function setChiefExaminer(userId: string | number | null, nickName: string): void {
    const normalizedUserId = normalizeTeacherUserId(userId)
    const previousChiefId = markingTeamForm.chiefExaminerUserId
    markingTeamForm.chiefExaminerUserId = normalizedUserId
    markingTeamForm.chiefExaminerNickName = nickName
    if (!normalizedUserId) return
    replaceChiefInReviewerList(previousChiefId, normalizedUserId, nickName)
  }

  function changeScopeMode(mode: ExamRosterScopeModeCode): void {
    rosterForm.scopeMode = mode
    rosterForm.classIds = []
    rosterForm.candidates = []
  }

  function addCandidates(candidates: ExamCandidateResponse[]): void {
    rosterForm.candidates = mergePreviewCandidates(rosterForm.candidates, candidates)
    const classSet = new Set(rosterForm.classIds)
    for (const candidate of candidates) {
      if (candidate.classId) {
        classSet.add(candidate.classId)
      }
    }
    const mergedClassIds = [...classSet]
    if (!isSameStringIdSet(rosterForm.classIds, mergedClassIds)) {
      rosterForm.classIds = mergedClassIds
    }
  }

  function setRosterPreviewSyncing(syncing: boolean): void {
    rosterPreviewSyncing.value = syncing
  }

  function isSameStringIdSet(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false
    const leftSet = new Set(left)
    return right.every(id => leftSet.has(id))
  }

  function isSameCandidateSnapshot(left: ExamCandidateResponse[], right: ExamCandidateResponse[]): boolean {
    if (left.length !== right.length) return false
    return left.every((row, index) => row.studentUserId === right[index]?.studentUserId)
  }

  function syncClassScopeCandidates(candidates: ExamCandidateResponse[], classIds: string[]): void {
    if (!isSameStringIdSet(rosterForm.classIds, classIds)) {
      rosterForm.classIds = [...classIds]
    }
    if (!isSameCandidateSnapshot(rosterForm.candidates, candidates)) {
      rosterForm.candidates = candidates
    }
  }

  function removeCandidate(studentUserId: string): void {
    rosterForm.candidates = rosterForm.candidates.filter(row => row.studentUserId !== studentUserId)
  }

  /** 按人勾选时，参考班级缩窄后同步剔除不在范围内的考生预览行。 */
  function pruneCandidatesToClassScope(): void {
    if (rosterForm.scopeMode !== ExamRosterScopeModeCode.BY_STUDENT) return
    const allowedClassIds = new Set(rosterForm.classIds)
    const pruned = rosterForm.candidates.filter(
      candidate => candidate.classId != null && allowedClassIds.has(candidate.classId),
    )
    if (pruned.length === rosterForm.candidates.length) return
    rosterForm.candidates = pruned
  }

  function validateRosterScopeInline(): string | null {
    if (rosterForm.candidates.length === 0) {
      return null
    }
    if (!rosterForm.referenceDepartmentId) {
      return '请选择院系'
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
    if (examForm.examKind === ExamKindCode.REGULAR) {
      return examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'
        ? ExamScorePolicyCode.FULL
        : ExamScorePolicyCode.ACTUAL_ONLY
    }
    if (examForm.examKind === ExamKindCode.RETAKE) {
      return ExamScorePolicyCode.ACTUAL_ONLY
    }
    return ExamScorePolicyCode.MAKEUP_CAP60
  }

  function buildExamRequest(): ExamCreateRequest | null {
    const [startTime, endTime] = examForm.examWindow ?? []
    const academicYear = examForm.academicYear?.trim()
    if (!examForm.courseId || !startTime || !endTime || !academicYear || !examForm.semester) {
      void message.error('请完善考务信息')
      return null
    }
    return {
      courseId: examForm.courseId,
      examName: examForm.examName.trim(),
      examNo: examForm.examNo.trim(),
      academicYear,
      semester: examForm.semester,
      examStartTime: startTime,
      examEndTime: endTime,
      gradingStrategy: ExamGradingStrategyCode.SINGLE,
      examKind: examForm.examKind,
      sourceExamId: examForm.sourceExamId,
      scorePolicy: resolveSubmitScorePolicy(),
      dailyScoreFull: examForm.examKind === ExamKindCode.REGULAR
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
    if (!rosterForm.referenceDepartmentId) {
      showFormValidationMessage('请选择院系')
      return undefined
    }
    const candidates: ExamCandidateRosterRequest[] = []
    for (const candidate of rosterForm.candidates) {
      if (!candidate.classId) {
        showFormValidationMessage('存在缺少班级的考生预览')
        return undefined
      }
      candidates.push({
        classId: candidate.classId,
        studentUserId: candidate.studentUserId,
      })
    }
    return {
      scopeMode: rosterForm.scopeMode,
      classIds: [...rosterForm.classIds],
      referenceDepartmentId: rosterForm.referenceDepartmentId,
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
    const roster = buildRosterRequest()
    if (rosterForm.candidates.length > 0 && !roster) {
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
    } catch (error) {
      captureFormValidationError('exam-create-basic', error)
      return false
    }
  }

  async function validateMarkingTeamStep(): Promise<boolean> {
    ensureChiefInReviewers()
    if (!markingTeamFormRef.value) return false
    try {
      await markingTeamFormRef.value.validate()
      return true
    } catch (error) {
      captureFormValidationError('exam-create-marking-team', error)
      return false
    }
  }

  async function validateRosterStep(): Promise<boolean> {
    if (rosterPreviewSyncing.value) {
      void message.error('名册预览加载中，请稍候再提交')
      return false
    }
    if (
      rosterForm.scopeMode === ExamRosterScopeModeCode.BY_CLASS
      && rosterForm.classIds.length > 0
      && rosterForm.candidates.length === 0
    ) {
      void message.error('整班纳入须包含所选班级的全部学生')
      return false
    }
    if (
      rosterForm.scopeMode === ExamRosterScopeModeCode.BY_STUDENT
      && rosterForm.classIds.length > 0
      && rosterForm.candidates.length === 0
    ) {
      void message.error('所选参考班级暂无在籍学生，请重新选择或通过「按学生选择」追加')
      return false
    }
    const inlineError = validateRosterScopeInline()
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
    } catch (error) {
      captureFormValidationError('exam-create-candidates', error)
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

  async function validateAllSteps(): Promise<ExamCreateSectionKey | null> {
    if (!(await validateBasicStep())) {
      activeSection.value = 'exam-create-basic'
      void message.warning('请先完善考务信息')
      return 'exam-create-basic'
    }
    if (!(await validateMarkingTeamStep())) {
      activeSection.value = 'exam-create-marking-team'
      void message.warning('请先完善阅卷队伍')
      return 'exam-create-marking-team'
    }
    if (!(await validateRosterStep())) {
      activeSection.value = 'exam-create-candidates'
      return 'exam-create-candidates'
    }
    return null
  }

  async function refreshByClassRosterBeforeSubmit(): Promise<boolean> {
    if (rosterForm.scopeMode !== ExamRosterScopeModeCode.BY_CLASS || rosterForm.classIds.length === 0) {
      return true
    }
    if (rosterForm.candidates.length === 0) {
      return true
    }
    try {
      const preview = await previewCreateExamRoster({
        scopeMode: ExamRosterScopeModeCode.BY_CLASS,
        classIds: [...rosterForm.classIds],
      })
      const validatedCandidates = requirePreviewCandidates(preview.candidates)
      if (!validatedCandidates) {
        return false
      }
      rosterForm.candidates = validatedCandidates
      return true
    } catch (error) {
      showUserError(error, '提交前名册预览失败，请重新选择参考班级')
      return false
    }
  }

  async function handleCreateExam(): Promise<ExamCreateSectionKey | null> {
    const failedSection = await validateAllSteps()
    if (failedSection) {
      return failedSection
    }
    if (!(await refreshByClassRosterBeforeSubmit())) {
      activeSection.value = 'exam-create-candidates'
      return 'exam-create-candidates'
    }
    const request = buildBundleRequest()
    if (!request) {
      activeSection.value = 'exam-create-basic'
      return 'exam-create-basic'
    }
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
    return null
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
  })

  watch(
    () => examForm.examKind,
    (examKind: ExamKindCode) => {
      if (examKindRequiresSource(examKind)) {
        examForm.scoreCompositionMode = 'EXAM_ONLY'
        examForm.dailyScoreFull = undefined
        rosterForm.scopeMode = ExamRosterScopeModeCode.BY_STUDENT
        rosterForm.classIds = []
        rosterForm.candidates = []
      }
    },
  )

  watch(
    () => rosterForm.classIds.map(id => id).sort().join(','),
    () => pruneCandidatesToClassScope(),
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
    scrollToFirstInvalidField,
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
