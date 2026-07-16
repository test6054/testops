import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  ArchiveTaskCreateBasicForm,
  ArchiveTaskCreatePlanForm,
  ArchiveTaskCreateSectionKey,
  ArchiveTaskCreateWizardState,
} from './archive-task-create-context'
import type { ArchiveTenantTemplateSetResponse } from '@/apis/mark/archive-platform-template'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { listArchiveTenantTemplateSets } from '@/apis/mark/archive-platform-template'
import {
  ArchiveScoreSourceCode,
  ArchiveSecurityLevelCode,
  createArchiveTask,
  discardArchiveTaskScoreProof,
} from '@/apis/mark/archive-volume'
import { useUserStore } from '@/stores/modules/user'
import { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import {
  composeAcademicYear,
  getDefaultAcademicYearAndSemester,
  parseAcademicYearStart,
} from '@/utils/academic-year'
import { getUserErrorMessage, showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { ARCHIVE_TASK_CREATE_SECTION_ORDER } from './archive-task-create-context'

export type {
  ArchiveTaskCreateBasicForm,
  ArchiveTaskCreatePlanForm,
  ArchiveTaskCreateSectionKey,
} from './archive-task-create-context'
export {
  ARCHIVE_TASK_CREATE_SECTION_ORDER,
  archiveTaskCreateBasicFormKey,
  archiveTaskCreatePlanFormKey,
  archiveTaskCreateWizardStateKey,
  isArchiveTaskCreateSectionKey,
  useInjectedArchiveTaskCreateBasicForm,
  useInjectedArchiveTaskCreatePlanForm,
  useInjectedArchiveTaskCreateWizardState,
} from './archive-task-create-context'

const MANUAL_PROVENANCE_SET = new Set<ArchiveTaskProvenanceCode>([
  ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE,
  ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE,
])

function parseRouteProvenance(raw: unknown): ArchiveTaskProvenanceCode | null {
  if (typeof raw !== 'string') return null
  for (const code of MANUAL_PROVENANCE_SET) {
    if (code === raw) return code
  }
  return null
}

function normalizeTeacherUserId(userId: string | number | null | undefined): string | null {
  if (userId == null || userId === '') return null
  return String(userId)
}

function defaultScoreSourceForProvenance(
  provenance: ArchiveTaskProvenanceCode | null,
): ArchiveScoreSourceCode {
  if (provenance === ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE) {
    return ArchiveScoreSourceCode.NOT_REQUIRED
  }
  return ArchiveScoreSourceCode.OFFLINE_CONFIRMED
}

export function useArchiveTaskCreate() {
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  const submitting = ref(false)
  const submitErrorMessage = ref('')
  const templateLoading = ref(false)
  const templateLoadFailed = ref(false)
  const templateSets = ref<ArchiveTenantTemplateSetResponse[]>([])
  const activeSection = ref<ArchiveTaskCreateSectionKey>('archive-task-provenance')
  const basicFormRef = ref<FormInstance>()
  const planFormRef = ref<FormInstance>()

  const defaultTerm = getDefaultAcademicYearAndSemester()
  const defaultStartYear
    = parseAcademicYearStart(defaultTerm.academicYear) ?? new Date().getFullYear()

  const wizardState = reactive<ArchiveTaskCreateWizardState>({
    provenance: parseRouteProvenance(route.query.provenance),
  })

  const basicForm = reactive<ArchiveTaskCreateBasicForm>({
    courseId: null,
    courseName: '',
    archiveTitle: '',
    archiveNo: '',
    academicYearStartYear: defaultStartYear,
    semester: defaultTerm.semester,
    departmentId: null,
    departmentName: '',
    teachingClassId: null,
    teachingClassName: '',
    relatedExamId: null,
    relatedExamName: '',
  })

  const planForm = reactive<ArchiveTaskCreatePlanForm>({
    templateSetCode: null,
    templateSetName: '',
    examForm: undefined,
    scoreSource: defaultScoreSourceForProvenance(wizardState.provenance),
    securityLevel: ArchiveSecurityLevelCode.INTERNAL,
    retentionYears: undefined,
    permanentRetention: false,
    responsibleUserId: normalizeTeacherUserId(userStore.userInfo?.userId),
    responsibleUserName: userStore.userInfo?.nickName ?? '',
  })

  const basicRules: Record<string, Rule[]> = {
    courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
    departmentId: [{ required: true, message: '请选择院系', trigger: 'change' }],
    archiveTitle: [
      { required: true, message: '请输入归档标题', trigger: 'blur' },
      { max: 512, message: '归档标题最多 512 个字符', trigger: 'blur' },
    ],
    academicYearStartYear: [{ required: true, message: '请选择学年起始年', trigger: 'change' }],
    semester: [{ required: true, message: '请选择学期', trigger: 'change' }],
  }

  const planRules: Record<string, Rule[]> = {
    templateSetCode: [{ required: true, message: '请选择目录模板套', trigger: 'change' }],
    scoreSource: [{ required: true, message: '请选择成绩事实源', trigger: 'change' }],
    securityLevel: [{ required: true, message: '请选择密级', trigger: 'change' }],
    responsibleUserId: [{ required: true, message: '请选择归档责任人', trigger: 'change' }],
  }

  const navItems = computed(() => [
    { key: 'archive-task-provenance', label: '任务来源' },
    { key: 'archive-task-basic', label: '任务信息' },
    { key: 'archive-task-plan', label: '归档方案' },
    { key: 'archive-task-confirm', label: '确认创建' },
  ])

  const templateSetOptions = computed(() =>
    templateSets.value.map((item) => ({
      value: item.templateSetCode,
      label: item.templateSetName,
      examForm: item.examForm,
      defaultPermanentRetention: item.defaultPermanentRetention,
      defaultRetentionYears: item.defaultRetentionYears,
    })),
  )

  function resolveAcademicYear(): string {
    return composeAcademicYear(basicForm.academicYearStartYear)
  }

  const provenanceLabel = computed(() => {
    if (!wizardState.provenance) return '未选择'
    if (wizardState.provenance === ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE) {
      return '本学期线下考核归档'
    }
    if (wizardState.provenance === ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE) {
      return '历史档案数字化'
    }
    return wizardState.provenance
  })

  async function applyProvenanceDefaults(provenance: ArchiveTaskProvenanceCode): Promise<boolean> {
    const nextScoreSource = defaultScoreSourceForProvenance(provenance)
    if (nextScoreSource !== ArchiveScoreSourceCode.OFFLINE_CONFIRMED) {
      if (!(await discardStagedScoreProof())) return false
    }
    wizardState.provenance = provenance
    planForm.scoreSource = nextScoreSource
    return true
  }

  function setCourseSelection(courseId: string | null, courseName: string): void {
    basicForm.courseId = courseId
    basicForm.courseName = courseName
    basicForm.relatedExamId = null
    basicForm.relatedExamName = ''
  }

  function setDepartmentSelection(departmentId: string | null, departmentName: string): void {
    basicForm.departmentId = departmentId
    basicForm.departmentName = departmentName
    basicForm.teachingClassId = null
    basicForm.teachingClassName = ''
  }

  function setTeachingClassSelection(
    teachingClassId: string | null,
    teachingClassName: string,
    departmentId?: string | null,
    departmentName?: string,
  ): void {
    basicForm.teachingClassId = teachingClassId
    basicForm.teachingClassName = teachingClassName
    if (departmentId && departmentName) {
      basicForm.departmentId = departmentId
      basicForm.departmentName = departmentName
    }
  }

  function setTemplateSet(
    code: string | null,
    name: string,
    examForm?: ArchiveTaskCreatePlanForm['examForm'],
    retention?: { defaultPermanentRetention?: boolean, defaultRetentionYears?: number },
  ): void {
    planForm.templateSetCode = code
    planForm.templateSetName = name
    if (examForm) {
      planForm.examForm = examForm
    }
    if (retention?.defaultPermanentRetention === true) {
      planForm.permanentRetention = true
      planForm.retentionYears = undefined
    } else if (
      retention?.defaultPermanentRetention === false
      && retention.defaultRetentionYears != null
    ) {
      planForm.permanentRetention = false
      planForm.retentionYears = retention.defaultRetentionYears
    } else {
      planForm.permanentRetention = false
      planForm.retentionYears = undefined
    }
  }

  function setResponsibleUser(userId: string | number | null, nickName: string): void {
    planForm.responsibleUserId = normalizeTeacherUserId(userId)
    planForm.responsibleUserName = nickName
  }

  async function selectProvenanceAndContinue(provenance: ArchiveTaskProvenanceCode): Promise<void> {
    if (!(await applyProvenanceDefaults(provenance))) return
    activeSection.value = 'archive-task-basic'
  }

  function goBatchExcelImport(): void {
    void router.push({
      name: 'TeacherArchiveVolumeList',
      query: { openHistoryImport: '1' },
    })
  }

  async function loadTemplateSets(): Promise<void> {
    templateLoading.value = true
    templateLoadFailed.value = false
    try {
      templateSets.value = await listArchiveTenantTemplateSets()
    } catch (error) {
      showUserError(error, '加载目录模板套失败')
      templateLoadFailed.value = true
    } finally {
      templateLoading.value = false
    }
  }

  async function validateProvenanceStep(): Promise<boolean> {
    if (!wizardState.provenance) {
      showFormValidationMessage('请选择任务来源')
      return false
    }
    return true
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

  async function validatePlanStep(): Promise<boolean> {
    if (!planFormRef.value) return false
    try {
      await planFormRef.value.validate()
    } catch {
      return false
    }
    if (!planForm.permanentRetention && planForm.retentionYears == null) {
      showFormValidationMessage('请填写保管年限或勾选永久保管')
      return false
    }
    return true
  }

  async function validateStepsBeforeSection(target: ArchiveTaskCreateSectionKey): Promise<boolean> {
    const targetIdx = ARCHIVE_TASK_CREATE_SECTION_ORDER.indexOf(target)
    for (let i = 0; i < targetIdx; i++) {
      const sectionKey = ARCHIVE_TASK_CREATE_SECTION_ORDER[i]
      if (sectionKey === 'archive-task-provenance') {
        if (!(await validateProvenanceStep())) {
          activeSection.value = sectionKey
          return false
        }
        continue
      }
      if (sectionKey === 'archive-task-basic') {
        if (!(await validateBasicStep())) {
          showFormValidationMessage('请先完善任务信息')
          activeSection.value = sectionKey
          return false
        }
        continue
      }
      if (sectionKey === 'archive-task-plan') {
        if (!(await validatePlanStep())) {
          showFormValidationMessage('请先完善归档方案')
          activeSection.value = sectionKey
          return false
        }
      }
    }
    return true
  }

  async function handleCreateTask(): Promise<ArchiveTaskCreateSectionKey | null> {
    submitErrorMessage.value = ''
    if (templateLoading.value || templateLoadFailed.value) {
      void message.error(
        templateLoading.value ? '目录模板正在加载，请稍候' : '目录模板加载失败，请重新加载',
      )
      activeSection.value = 'archive-task-plan'
      return 'archive-task-plan'
    }
    if (!(await validateProvenanceStep())) {
      activeSection.value = 'archive-task-provenance'
      return 'archive-task-provenance'
    }
    if (!(await validateBasicStep())) {
      activeSection.value = 'archive-task-basic'
      showFormValidationMessage('请先完善任务信息')
      return 'archive-task-basic'
    }
    if (!(await validatePlanStep())) {
      activeSection.value = 'archive-task-plan'
      showFormValidationMessage('请先完善归档方案')
      return 'archive-task-plan'
    }
    if (
      !basicForm.courseId
      || !basicForm.departmentId
      || !planForm.templateSetCode
      || !wizardState.provenance
    ) {
      void message.error('请完善必填项')
      if (!wizardState.provenance) return 'archive-task-provenance'
      if (!basicForm.courseId || !basicForm.departmentId) return 'archive-task-basic'
      return 'archive-task-plan'
    }
    submitting.value = true
    try {
      const volumeId = await createArchiveTask({
        provenance: wizardState.provenance,
        templateSetCode: planForm.templateSetCode,
        courseId: basicForm.courseId,
        archiveTitle: basicForm.archiveTitle.trim(),
        archiveNo: basicForm.archiveNo.trim() || undefined,
        academicYear: resolveAcademicYear(),
        semester: basicForm.semester,
        examForm: planForm.examForm,
        scoreSource: planForm.scoreSource,
        scoreProofFileId: planForm.scoreProofFileId ?? undefined,
        securityLevel: planForm.securityLevel,
        teachingClassId: basicForm.teachingClassId ?? undefined,
        departmentId: basicForm.departmentId,
        relatedExamId: basicForm.relatedExamId ?? undefined,
        retentionYears: planForm.permanentRetention ? undefined : planForm.retentionYears,
        permanentRetention: planForm.permanentRetention,
        responsibleUserId: planForm.responsibleUserId ?? undefined,
        archiveDueTimeOverride: planForm.archiveDueTimeOverride,
      })
      planForm.scoreProofFileId = null
      void message.success('归档任务创建成功')
      void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId } })
      return null
    } catch (error) {
      submitErrorMessage.value = getUserErrorMessage(error, '创建归档任务失败')
      showUserError(error, '创建归档任务失败')
      return null
    } finally {
      submitting.value = false
    }
  }

  async function discardStagedScoreProof(): Promise<boolean> {
    const fileId = planForm.scoreProofFileId
    if (!fileId) return true
    try {
      await discardArchiveTaskScoreProof(fileId)
      planForm.scoreProofFileId = null
      return true
    } catch (error) {
      showUserError(error, '清理临时成绩证明失败')
      return false
    }
  }

  async function handleGoBack(): Promise<void> {
    if (!(await discardStagedScoreProof())) return
    void router.push({ name: 'TeacherArchiveVolumeList' })
  }

  onBeforeRouteLeave(async () => discardStagedScoreProof())

  watch(
    () => route.query.provenance,
    async (raw) => {
      const parsed = parseRouteProvenance(raw)
      if (parsed) {
        await applyProvenanceDefaults(parsed)
      }
    },
  )

  onMounted(() => {
    const { userId, nickName } = userStore.userInfo
    setResponsibleUser(userId, nickName)
    void loadTemplateSets()
    if (wizardState.provenance) {
      activeSection.value = 'archive-task-basic'
    }
  })

  return {
    submitting,
    submitErrorMessage,
    templateLoading,
    templateLoadFailed,
    templateSetOptions,
    loadTemplateSets,
    activeSection,
    basicFormRef,
    planFormRef,
    basicForm,
    planForm,
    wizardState,
    basicRules,
    planRules,
    navItems,
    provenanceLabel,
    applyProvenanceDefaults,
    selectProvenanceAndContinue,
    goBatchExcelImport,
    setCourseSelection,
    setDepartmentSelection,
    setTeachingClassSelection,
    setTemplateSet,
    setResponsibleUser,
    validateStepsBeforeSection,
    handleCreateTask,
    handleGoBack,
  }
}
