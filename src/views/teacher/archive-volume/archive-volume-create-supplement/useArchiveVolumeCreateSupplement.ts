import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  ArchiveVolumeSupplementBasicForm,
  ArchiveVolumeSupplementConfigForm,
  ArchiveVolumeSupplementSectionKey,
} from './archive-volume-create-supplement-context'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArchiveScoreSourceCode,
  ArchiveSecurityLevelCode,
  createArchiveVolume,
} from '@/apis/mark/archive-volume'
import { useUserStore } from '@/stores/modules/user'
import { ArchiveVolumeSourceTypeCode } from '@/types/enums/archive-volume-source-type-enum'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { ARCHIVE_VOLUME_SUPPLEMENT_SECTION_ORDER } from './archive-volume-create-supplement-context'

export function useArchiveVolumeCreateSupplement() {
  const router = useRouter()
  const userStore = useUserStore()
  const submitting = ref(false)
  const submitErrorMessage = ref('')
  const activeSection = ref<ArchiveVolumeSupplementSectionKey>('archive-create-basic')
  const basicFormRef = ref<FormInstance>()
  const configFormRef = ref<FormInstance>()

  const defaultTerm = getDefaultAcademicYearAndSemester()

  function normalizeTeacherUserId(userId: string | number | null | undefined): string | null {
    if (userId == null || userId === '') return null
    return String(userId)
  }

  const basicForm = reactive<ArchiveVolumeSupplementBasicForm>({
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

  const configForm = reactive<ArchiveVolumeSupplementConfigForm>({
    sourceType: ArchiveVolumeSourceTypeCode.HISTORY_IMPORT,
    examForm: undefined,
    scoreSource: ArchiveScoreSourceCode.NOT_REQUIRED,
    securityLevel: ArchiveSecurityLevelCode.INTERNAL,
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
    sourceType: [{ required: true, message: '请选择归档来源', trigger: 'change' }],
    scoreSource: [{ required: true, message: '请选择成绩事实源', trigger: 'change' }],
    securityLevel: [{ required: true, message: '请选择密级', trigger: 'change' }],
    responsibleUserId: [{ required: true, message: '请选择卷责任人', trigger: 'change' }],
  }

  const navItems = computed(() => [
    { key: 'archive-create-basic', label: '卷宗信息' },
    { key: 'archive-create-config', label: '归档配置' },
    { key: 'archive-create-confirm', label: '确认创建' },
  ])

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

  function setResponsibleUser(userId: string | number | null, nickName: string): void {
    configForm.responsibleUserId = normalizeTeacherUserId(userId)
    configForm.responsibleUserName = nickName
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
    target: ArchiveVolumeSupplementSectionKey,
  ): Promise<boolean> {
    const targetIdx = ARCHIVE_VOLUME_SUPPLEMENT_SECTION_ORDER.indexOf(target)
    for (let i = 0; i < targetIdx; i++) {
      const sectionKey = ARCHIVE_VOLUME_SUPPLEMENT_SECTION_ORDER[i]
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
    submitErrorMessage.value = ''
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
    if (!basicForm.courseId) {
      void message.error('请完善必填项')
      return
    }
    submitting.value = true
    try {
      const volumeId = await createArchiveVolume({
        sourceType: configForm.sourceType,
        courseId: basicForm.courseId,
        archiveTitle: basicForm.archiveTitle.trim(),
        archiveNo: basicForm.archiveNo.trim() || undefined,
        academicYear: basicForm.academicYear.trim(),
        semester: basicForm.semester,
        examForm: configForm.examForm,
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
      submitErrorMessage.value = getUserErrorMessage(error, '创建归档卷失败')
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
  })

  return {
    submitting,
    submitErrorMessage,
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
    setResponsibleUser,
    validateStepsBeforeSection,
    handleCreateVolume,
    handleGoBack,
  }
}
