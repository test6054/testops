import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  ArchiveVolumeCreateBasicForm,
  ArchiveVolumeCreateConfigForm,
  ArchiveVolumeCreateSectionKey,
} from './archive-volume-create-context'
import { ARCHIVE_VOLUME_CREATE_SECTION_ORDER } from './archive-volume-create-context'
import type { ArchiveTenantTemplateSetVO } from '@/apis/mark/archive-platform-template'
import { listArchiveTenantTemplateSets } from '@/apis/mark/archive-platform-template'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createOfflineArchiveVolume } from '@/apis/mark/archive-volume'
import { useUserStore } from '@/stores/modules/user'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import { showUserError } from '@/utils/error-handler'

export type {
  ArchiveVolumeCreateBasicForm,
  ArchiveVolumeCreateConfigForm,
  ArchiveVolumeCreateSectionKey,
} from './archive-volume-create-context'
export {
  ARCHIVE_VOLUME_CREATE_SECTION_ORDER,
  archiveVolumeCreateBasicFormKey,
  archiveVolumeCreateConfigFormKey,
  isArchiveVolumeCreateSectionKey,
  useInjectedArchiveVolumeCreateBasicForm,
  useInjectedArchiveVolumeCreateConfigForm,
} from './archive-volume-create-context'

export function useArchiveVolumeCreateOffline() {
  const router = useRouter()
  const userStore = useUserStore()
  const submitting = ref(false)
  const templateLoading = ref(false)
  const templateSets = ref<ArchiveTenantTemplateSetVO[]>([])
  const activeSection = ref<ArchiveVolumeCreateSectionKey>('archive-create-basic')
  const basicFormRef = ref<FormInstance>()
  const configFormRef = ref<FormInstance>()

  const defaultTerm = getDefaultAcademicYearAndSemester()

  function normalizeTeacherUserId(userId: string | number | null | undefined): string | null {
    if (userId == null || userId === '') return null
    return String(userId)
  }

  const basicForm = reactive<ArchiveVolumeCreateBasicForm>({
    courseId: null,
    courseName: '',
    archiveTitle: '',
    archiveNo: '',
    academicYear: defaultTerm.academicYear,
    semester: defaultTerm.semester,
    departmentId: null,
    departmentName: '',
    teachingClassId: null,
    teachingClassName: '',
    relatedExamId: null,
    relatedExamName: '',
  })

  const configForm = reactive<ArchiveVolumeCreateConfigForm>({
    templateSetCode: null,
    templateSetName: '',
    examForm: undefined,
    scoreSource: 'OFFLINE_CONFIRMED',
    securityLevel: 'INTERNAL',
    retentionYears: 10,
    permanentRetention: false,
    responsibleUserId: normalizeTeacherUserId(userStore.userInfo?.userId),
    responsibleUserName: userStore.userInfo?.nickName ?? '',
  })

  const basicRules: Record<string, Rule[]> = {
    courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
    archiveTitle: [
      { required: true, message: '请输入归档标题', trigger: 'blur' },
      { max: 512, message: '归档标题最多 512 个字符', trigger: 'blur' },
    ],
    academicYear: [{ required: true, message: '请输入学年', trigger: 'blur' }],
    semester: [{ required: true, message: '请选择学期', trigger: 'change' }],
  }

  const configRules: Record<string, Rule[]> = {
    templateSetCode: [{ required: true, message: '请选择目录模板套', trigger: 'change' }],
    scoreSource: [{ required: true, message: '请选择成绩事实源', trigger: 'change' }],
    securityLevel: [{ required: true, message: '请选择密级', trigger: 'change' }],
    responsibleUserId: [{ required: true, message: '请选择卷责任人', trigger: 'change' }],
  }

  const navItems = computed(() => [
    { key: 'archive-create-basic', label: '卷宗信息' },
    { key: 'archive-create-config', label: '归档配置' },
    { key: 'archive-create-confirm', label: '确认创建' },
  ])

  const templateSetOptions = computed(() =>
    templateSets.value.map((item) => ({
      value: item.templateSetCode,
      label: item.templateSetName,
      examForm: item.examForm,
    })),
  )

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
    examForm?: ArchiveVolumeCreateConfigForm['examForm'],
  ): void {
    configForm.templateSetCode = code
    configForm.templateSetName = name
    if (examForm) {
      configForm.examForm = examForm
    }
  }

  function setResponsibleUser(userId: string | number | null, nickName: string): void {
    configForm.responsibleUserId = normalizeTeacherUserId(userId)
    configForm.responsibleUserName = nickName
  }

  async function loadTemplateSets(): Promise<void> {
    templateLoading.value = true
    try {
      templateSets.value = await listArchiveTenantTemplateSets()
    } catch (error) {
      showUserError(error, '加载目录模板套失败')
      templateSets.value = []
    } finally {
      templateLoading.value = false
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

  async function validateConfigStep(): Promise<boolean> {
    if (!configFormRef.value) return false
    try {
      await configFormRef.value.validate()
      return true
    } catch {
      return false
    }
  }

  async function validateStepsBeforeSection(
    target: ArchiveVolumeCreateSectionKey,
  ): Promise<boolean> {
    const targetIdx = ARCHIVE_VOLUME_CREATE_SECTION_ORDER.indexOf(target)
    for (let i = 0; i < targetIdx; i++) {
      const sectionKey = ARCHIVE_VOLUME_CREATE_SECTION_ORDER[i]
      if (sectionKey === 'archive-create-basic') {
        if (!(await validateBasicStep())) {
          void message.warning('请先完善卷宗信息')
          activeSection.value = sectionKey
          return false
        }
        continue
      }
      if (sectionKey === 'archive-create-config') {
        if (!(await validateConfigStep())) {
          void message.warning('请先完善归档配置')
          activeSection.value = sectionKey
          return false
        }
      }
    }
    return true
  }

  async function handleCreateVolume(): Promise<void> {
    if (!(await validateBasicStep())) {
      activeSection.value = 'archive-create-basic'
      void message.warning('请先完善卷宗信息')
      return
    }
    if (!(await validateConfigStep())) {
      activeSection.value = 'archive-create-config'
      void message.warning('请先完善归档配置')
      return
    }
    if (!basicForm.courseId || !configForm.templateSetCode) {
      void message.error('请完善必填项')
      return
    }
    submitting.value = true
    try {
      const volumeId = await createOfflineArchiveVolume({
        courseId: basicForm.courseId,
        archiveTitle: basicForm.archiveTitle.trim(),
        archiveNo: basicForm.archiveNo.trim() || undefined,
        academicYear: basicForm.academicYear.trim(),
        semester: basicForm.semester,
        examForm: configForm.examForm,
        templateSetCode: configForm.templateSetCode,
        scoreSource: configForm.scoreSource,
        securityLevel: configForm.securityLevel,
        teachingClassId: basicForm.teachingClassId ?? undefined,
        departmentId: basicForm.departmentId ?? undefined,
        teachingClassName: basicForm.teachingClassName.trim() || undefined,
        departmentName: basicForm.departmentName.trim() || undefined,
        relatedExamId: basicForm.relatedExamId ?? undefined,
        retentionYears: configForm.permanentRetention ? undefined : configForm.retentionYears,
        permanentRetention: configForm.permanentRetention,
        responsibleUserId: configForm.responsibleUserId ?? undefined,
      })
      void message.success('归档卷创建成功')
      void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId } })
    } catch (error) {
      showUserError(error)
    } finally {
      submitting.value = false
    }
  }

  function handleGoBack(): void {
    void router.push({ name: 'TeacherArchiveVolumeList' })
  }

  onMounted(() => {
    const { userId, nickName } = userStore.userInfo
    setResponsibleUser(userId, nickName)
    void loadTemplateSets()
  })

  return {
    submitting,
    templateLoading,
    templateSetOptions,
    activeSection,
    basicFormRef,
    configFormRef,
    basicForm,
    configForm,
    basicRules,
    configRules,
    navItems,
    setCourseSelection,
    setDepartmentSelection,
    setTeachingClassSelection,
    setTemplateSet,
    setResponsibleUser,
    validateStepsBeforeSection,
    handleCreateVolume,
    handleGoBack,
  }
}
