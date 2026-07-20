<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherAcademicAppointmentVO,
  PortfolioTeacherAcademicExperienceVO,
  PortfolioTeacherEducationVO,
  PortfolioTeacherProfileVO,
  PortfolioTeacherTaughtCourseSaveRequest,
  PortfolioTeacherTaughtCourseVO,
} from '@/apis/portfolio/teacher-profile'
import type { BadgeTone, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { TeacherTaughtCourseSourceTypeCode } from '@/types/enums/teacher-taught-course-source-type-enum'
import { PlusOutlined } from '@ant-design/icons-vue'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { portfolioTeacherCohortProfileApi } from '@/apis/portfolio/teacher-cohort-profile'
import { portfolioTeacherProfileApi } from '@/apis/portfolio/teacher-profile'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { TeacherTaughtCourseSourceTypeDescription } from '@/types/enums/teacher-taught-course-source-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()

const loading = ref(false)

function lifecycleTagTone(status?: string): BadgeTone {
  if (status === 'ACTIVE') return 'green'
  if (status === 'TEMP_HOLD') return 'orange'
  if (status === 'SEALED') return 'red'
  return 'gray'
}

const profileActiveTab = ref('education')
const profileTabItems = [
  { key: 'education', label: '主要学历' },
  { key: 'academic-experience', label: '主要学术经历' },
  { key: 'academic-appointment', label: '教学学术任（兼）职' },
]
const savingProfile = ref(false)
const courseLoading = ref(false)
const courseSaving = ref(false)
const loadFailed = ref(false)
const profile = ref<PortfolioTeacherProfileVO | null>(null)
const courses = ref<PortfolioTeacherTaughtCourseVO[]>([])
const courseTotal = ref(0)
const coursePageNum = ref(1)
const coursePageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const courseModalOpen = ref(false)
const editingCourse = ref<PortfolioTeacherTaughtCourseVO | null>(null)
const courseDeletingId = ref('')
const requestToken = ref(0)
const courseRequestToken = ref(0)
const cvRequestToken = ref(0)
const cvLoading = ref(false)
const cvSaving = ref(false)
const cvDeletingKey = ref('')
const cvModalOpen = ref(false)
const cvKind = ref<CvKind>('education')
const cvEditingId = ref('')
const educations = ref<PortfolioTeacherEducationVO[]>([])
const academicExperiences = ref<PortfolioTeacherAcademicExperienceVO[]>([])
const academicAppointments = ref<PortfolioTeacherAcademicAppointmentVO[]>([])

type CvKind = 'education' | 'academicExperience' | 'academicAppointment'
type CvRecord
  = | PortfolioTeacherEducationVO
    | PortfolioTeacherAcademicExperienceVO
    | PortfolioTeacherAcademicAppointmentVO

const cvForm = reactive({
  schoolName: '',
  departmentMajor: '',
  degreeName: '',
  organizationUnit: '',
  positionTitle: '',
  professionalTitle: '',
  startYearMonth: '',
  endYearMonth: '',
})

const profileForm = reactive({
  researchDirection: '',
  teachingGroupName: '',
})
const cohortProfileForm = reactive({ jobLevel: '', majorGroupCode: '', majorGroupName: '' })
const savingCohortProfile = ref(false)

const courseForm = reactive<PortfolioTeacherTaughtCourseSaveRequest>({
  courseCode: '',
  courseName: '',
  academicYear: '',
  semester: '',
  personalHours: undefined,
  totalHours: undefined,
  studentCount: undefined,
})

const readonlyProfile = computed(() => canPickTeachers.value && !!targetTeacherId.value)
const courseWriteBusy = computed(() => courseSaving.value || Boolean(courseDeletingId.value))
const cvWriteBusy = computed(() => cvSaving.value || Boolean(cvDeletingKey.value))
const cvModalTitle = computed(() => {
  const action = cvEditingId.value ? '编辑' : '新增'
  if (cvKind.value === 'education') return `${action}主要学历`
  if (cvKind.value === 'academicExperience') return `${action}主要学术经历`
  return `${action}教学学术任（兼）职`
})

const courseColumns: ColumnsType = [
  { title: '课程编码', dataIndex: 'courseCode', key: 'courseCode', width: 120 },
  { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 100 },
  { title: '学期', dataIndex: 'semester', key: 'semester', width: 80 },
  {
    title: '本人学时',
    dataIndex: 'personalHours',
    key: 'personalHours',
    width: 88,
    align: 'right',
  },
  { title: '总学时', dataIndex: 'totalHours', key: 'totalHours', width: 80, align: 'right' },
  { title: '人数', dataIndex: 'studentCount', key: 'studentCount', width: 72, align: 'right' },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 96 },
  { title: '操作', key: 'actions', width: 88 },
]

const educationColumns: ColumnsType = [
  { title: '学校', dataIndex: 'schoolName', key: 'schoolName' },
  { title: '系或专业', dataIndex: 'departmentMajor', key: 'departmentMajor' },
  { title: '学位', dataIndex: 'degreeName', key: 'degreeName', width: 120 },
  { title: '起止年月', key: 'period', width: 160 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 96 },
  { title: '操作', key: 'actions', width: 112 },
]
const academicExperienceColumns: ColumnsType = [
  { title: '单位', dataIndex: 'organizationUnit', key: 'organizationUnit' },
  { title: '职务', dataIndex: 'positionTitle', key: 'positionTitle', width: 140 },
  { title: '职称', dataIndex: 'professionalTitle', key: 'professionalTitle', width: 140 },
  { title: '起止年月', key: 'period', width: 160 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 96 },
  { title: '操作', key: 'actions', width: 112 },
]
const academicAppointmentColumns: ColumnsType = [
  { title: '单位', dataIndex: 'organizationUnit', key: 'organizationUnit' },
  { title: '职务', dataIndex: 'positionTitle', key: 'positionTitle' },
  { title: '起止年月', key: 'period', width: 160 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 96 },
  { title: '操作', key: 'actions', width: 112 },
]

function sourceLabel(sourceType: TeacherTaughtCourseSourceTypeCode) {
  return strictEnumLabel(TeacherTaughtCourseSourceTypeDescription, sourceType, '讲授课程来源')
}

/** 教师作用域切换或关闭课程弹窗时必须清空旧课程编辑态，避免继续提交上一位教师的手工课程。 */
function resetCourseEditorContext() {
  editingCourse.value = null
  courseForm.id = undefined
  courseForm.courseCode = ''
  courseForm.courseName = ''
  courseForm.academicYear = ''
  courseForm.semester = ''
  courseForm.personalHours = undefined
  courseForm.totalHours = undefined
  courseForm.studentCount = undefined
}

async function loadProfile() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const teacherId = targetTeacherId.value
  if (canPickTeachers.value && !targetTeacherId.value) {
    loading.value = false
    courseLoading.value = false
    loadFailed.value = false
    profile.value = null
    courses.value = []
    courseTotal.value = 0
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    const nextProfile = await portfolioTeacherProfileApi.get({
      teacherId: teacherId || undefined,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    profile.value = nextProfile
    profileForm.researchDirection = profile.value.researchDirection || ''
    profileForm.teachingGroupName = profile.value.teachingGroupName || ''
    if (canPickTeachers.value && teacherId) {
      const cohortProfile = await portfolioTeacherCohortProfileApi.get(teacherId)
      if (requestToken.value !== currentToken) {
        return
      }
      cohortProfileForm.jobLevel = cohortProfile.jobLevel || ''
      cohortProfileForm.majorGroupCode = cohortProfile.majorGroupCode || ''
      cohortProfileForm.majorGroupName = cohortProfile.majorGroupName || ''
    }
    await Promise.all([loadCourses(), loadCvRecords()])
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    profile.value = null
    courses.value = []
    courseTotal.value = 0
    loadFailed.value = true
    showUserError(error, '加载教师档案失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

async function saveCohortProfile() {
  if (!targetTeacherId.value || savingCohortProfile.value) return

  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('保存分群画像'))) {
    return
  }
  const scopeToken = requestToken.value
  const teacherId = targetTeacherId.value
  savingCohortProfile.value = true
  try {
    await portfolioTeacherCohortProfileApi.save({
      teacherId,
      jobLevel: cohortProfileForm.jobLevel.trim() || undefined,
      majorGroupCode: cohortProfileForm.majorGroupCode.trim() || undefined,
      majorGroupName: cohortProfileForm.majorGroupName.trim() || undefined,
    })
    if (requestToken.value !== scopeToken || targetTeacherId.value !== teacherId) {
      return
    }
    message.success('画像对标主数据已保存')
  } catch (error) {
    if (requestToken.value !== scopeToken || targetTeacherId.value !== teacherId) {
      return
    }
    showUserError(error, '保存画像对标主数据失败')
  } finally {
    if (requestToken.value === scopeToken && targetTeacherId.value === teacherId) {
      savingCohortProfile.value = false
    }
  }
}

async function loadCourses() {
  const scopeToken = requestToken.value
  const currentToken = courseRequestToken.value + 1
  courseRequestToken.value = currentToken
  const request = {
    teacherId: targetTeacherId.value || undefined,
    pageNum: coursePageNum.value,
    pageSize: coursePageSize.value,
  }
  courseLoading.value = true
  try {
    const page = await portfolioTeacherProfileApi.pageTaughtCourses(request)
    if (requestToken.value !== scopeToken || courseRequestToken.value !== currentToken) {
      return
    }
    courses.value = page.list
    courseTotal.value = page.total
  } catch (error) {
    if (requestToken.value !== scopeToken || courseRequestToken.value !== currentToken) {
      return
    }
    courses.value = []
    courseTotal.value = 0
    showUserError(error, '加载讲授课程失败')
  } finally {
    if (requestToken.value === scopeToken && courseRequestToken.value === currentToken) {
      courseLoading.value = false
    }
  }
}

/** 教师履历三类列表按同一教师 Scope 加载；各类失败互不影响，成功项可展示。 */
async function loadCvRecords() {
  const scopeToken = requestToken.value
  const currentToken = ++cvRequestToken.value
  const teacherId = targetTeacherId.value
  cvLoading.value = true
  try {
    const request = { teacherId: teacherId || undefined }
    const [eduResult, expResult, apptResult] = await Promise.allSettled([
      portfolioTeacherProfileApi.listEducations(request),
      portfolioTeacherProfileApi.listAcademicExperiences(request),
      portfolioTeacherProfileApi.listAcademicAppointments(request),
    ])
    if (
      requestToken.value !== scopeToken
      || cvRequestToken.value !== currentToken
      || targetTeacherId.value !== teacherId
    ) {
      return
    }
    if (eduResult.status === 'fulfilled') {
      educations.value = eduResult.value
    } else {
      educations.value = []
      showUserError(eduResult.reason, '教育经历加载失败')
    }
    if (expResult.status === 'fulfilled') {
      academicExperiences.value = expResult.value
    } else {
      academicExperiences.value = []
      showUserError(expResult.reason, '学术经历加载失败')
    }
    if (apptResult.status === 'fulfilled') {
      academicAppointments.value = apptResult.value
    } else {
      academicAppointments.value = []
      showUserError(apptResult.reason, '学术任职加载失败')
    }
  } finally {
    if (cvRequestToken.value === currentToken && targetTeacherId.value === teacherId) {
      cvLoading.value = false
    }
  }
}

function resetCvEditor() {
  cvEditingId.value = ''
  cvForm.schoolName = ''
  cvForm.departmentMajor = ''
  cvForm.degreeName = ''
  cvForm.organizationUnit = ''
  cvForm.positionTitle = ''
  cvForm.professionalTitle = ''
  cvForm.startYearMonth = ''
  cvForm.endYearMonth = ''
}

function openCvModal(kind: CvKind, row?: CvRecord) {
  if (readonlyProfile.value || cvWriteBusy.value) {
    return
  }
  resetCvEditor()
  cvKind.value = kind
  cvEditingId.value = row?.id ?? ''
  cvForm.startYearMonth = row?.startYearMonth ?? ''
  cvForm.endYearMonth = row?.endYearMonth ?? ''
  if (kind === 'education' && row && 'schoolName' in row) {
    cvForm.schoolName = row.schoolName
    cvForm.departmentMajor = row.departmentMajor ?? ''
    cvForm.degreeName = row.degreeName
  } else if (row && 'organizationUnit' in row) {
    cvForm.organizationUnit = row.organizationUnit
    cvForm.positionTitle = row.positionTitle ?? ''
    cvForm.professionalTitle = 'professionalTitle' in row ? (row.professionalTitle ?? '') : ''
  }
  cvModalOpen.value = true
}

function validateCvForm(): boolean {
  if (!cvForm.startYearMonth) {
    showFormValidationMessage('请选择开始年月')
    return false
  }
  if (cvForm.endYearMonth && cvForm.endYearMonth < cvForm.startYearMonth) {
    showFormValidationMessage('结束年月不能早于开始年月')
    return false
  }
  if (cvKind.value === 'education') {
    if (!cvForm.schoolName.trim() || !cvForm.degreeName.trim()) {
      showFormValidationMessage('请填写学校和学位')
      return false
    }
    return true
  }
  if (!cvForm.organizationUnit.trim()) {
    showFormValidationMessage('请填写单位')
    return false
  }
  if (cvKind.value === 'academicAppointment' && !cvForm.positionTitle.trim()) {
    showFormValidationMessage('请填写职务')
    return false
  }
  return true
}

/** 履历保存绑定打开弹窗时的教师 Scope，响应返回后不得改写已切换教师的新页面。 */
async function saveCvRecord() {
  if (!validateCvForm() || cvWriteBusy.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('保存履历记录'))) {
    return
  }

  const scopeToken = requestToken.value
  const teacherId = targetTeacherId.value
  cvSaving.value = true
  try {
    const base = {
      id: cvEditingId.value || undefined,
      startYearMonth: cvForm.startYearMonth,
      endYearMonth: cvForm.endYearMonth || undefined,
    }
    if (cvKind.value === 'education') {
      await portfolioTeacherProfileApi.saveEducation({
        ...base,
        schoolName: cvForm.schoolName.trim(),
        departmentMajor: cvForm.departmentMajor.trim() || undefined,
        degreeName: cvForm.degreeName.trim(),
      })
    } else if (cvKind.value === 'academicExperience') {
      await portfolioTeacherProfileApi.saveAcademicExperience({
        ...base,
        organizationUnit: cvForm.organizationUnit.trim(),
        positionTitle: cvForm.positionTitle.trim() || undefined,
        professionalTitle: cvForm.professionalTitle.trim() || undefined,
      })
    } else {
      await portfolioTeacherProfileApi.saveAcademicAppointment({
        ...base,
        organizationUnit: cvForm.organizationUnit.trim(),
        positionTitle: cvForm.positionTitle.trim(),
      })
    }
    if (requestToken.value !== scopeToken || targetTeacherId.value !== teacherId) {
      return
    }
    cvModalOpen.value = false
    resetCvEditor()
    message.success('履历记录已保存')
    await loadCvRecords()
  } catch (error) {
    if (requestToken.value === scopeToken && targetTeacherId.value === teacherId) {
      showUserError(error, '保存履历记录失败')
    }
  } finally {
    if (requestToken.value === scopeToken && targetTeacherId.value === teacherId) {
      cvSaving.value = false
    }
  }
}

function buildCvActions(row: CvRecord): UiTableRowActionItem[] {
  const editable = row.sourceType === 'MANUAL' && !readonlyProfile.value
  return [
    { key: 'edit', label: '编辑', hidden: !editable, disabled: cvWriteBusy.value },
    {
      key: 'delete',
      label: '删除',
      tone: 'danger',
      hidden: !editable,
      disabled: cvWriteBusy.value,
    },
  ]
}

async function handleCvAction(key: string, kind: CvKind, row: CvRecord) {
  if (key === 'edit') {
    openCvModal(kind, row)
    return
  }
  if (key !== 'delete' || row.sourceType !== 'MANUAL' || readonlyProfile.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '删除履历记录',
    content: '确认删除这条手工维护的履历记录？',
  })
  if (!confirmed || cvWriteBusy.value) {
    return
  }
  const scopeToken = requestToken.value
  const teacherId = targetTeacherId.value
  cvDeletingKey.value = `${kind}:${row.id}`
  try {
    if (kind === 'education') {
      await portfolioTeacherProfileApi.deleteEducation({ id: row.id })
    } else if (kind === 'academicExperience') {
      await portfolioTeacherProfileApi.deleteAcademicExperience({ id: row.id })
    } else {
      await portfolioTeacherProfileApi.deleteAcademicAppointment({ id: row.id })
    }
    if (requestToken.value !== scopeToken || targetTeacherId.value !== teacherId) {
      return
    }
    message.success('履历记录已删除')
    await loadCvRecords()
  } catch (error) {
    if (requestToken.value === scopeToken && targetTeacherId.value === teacherId) {
      showUserError(error, '删除履历记录失败')
    }
  } finally {
    if (requestToken.value === scopeToken && targetTeacherId.value === teacherId) {
      cvDeletingKey.value = ''
    }
  }
}

function cvPeriod(row: CvRecord) {
  return `${row.startYearMonth} 至 ${row.endYearMonth || '至今'}`
}

async function saveProfile() {
  if (readonlyProfile.value) {
    showFormValidationMessage('管理员查看模式下不可编辑个人资料')
    return
  }
  if (savingProfile.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('保存个人资料'))) {
    return
  }

  savingProfile.value = true
  try {
    await portfolioTeacherProfileApi.save({
      researchDirection: profileForm.researchDirection.trim() || undefined,
      teachingGroupName: profileForm.teachingGroupName.trim() || undefined,
    })
    message.success('个人资料已保存')
    await loadProfile()
  } catch (error) {
    showUserError(error, '保存个人资料失败')
  } finally {
    savingProfile.value = false
  }
}

function openCourseModal(row?: PortfolioTeacherTaughtCourseVO) {
  if (readonlyProfile.value) {
    showFormValidationMessage('管理员查看模式下不可维护讲授课程')
    return
  }
  editingCourse.value = row || null
  courseForm.courseCode = row?.courseCode || ''
  courseForm.courseName = row?.courseName || ''
  courseForm.academicYear = row?.academicYear || ''
  courseForm.semester = row?.semester || ''
  courseForm.personalHours = row?.personalHours
  courseForm.totalHours = row?.totalHours
  courseForm.studentCount = row?.studentCount
  courseForm.id = row?.id
  courseModalOpen.value = true
}

async function saveCourse() {
  if (courseWriteBusy.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('保存授课课程'))) {
    return
  }

  courseSaving.value = true
  try {
    await portfolioTeacherProfileApi.saveTaughtCourse({
      id: courseForm.id,
      courseCode: courseForm.courseCode.trim(),
      courseName: courseForm.courseName.trim(),
      academicYear: courseForm.academicYear.trim(),
      semester: courseForm.semester.trim(),
      personalHours: courseForm.personalHours,
      totalHours: courseForm.totalHours,
      studentCount: courseForm.studentCount,
    })
    message.success('讲授课程已保存')
    courseModalOpen.value = false
    await loadCourses()
  } catch (error) {
    showUserError(error, '保存讲授课程失败')
  } finally {
    courseSaving.value = false
  }
}

async function removeCourse(row: PortfolioTeacherTaughtCourseVO) {
  if (row.sourceType !== 'MANUAL') {
    showFormValidationMessage('教务同步课程不可删除')
    return
  }
  if (readonlyProfile.value || courseWriteBusy.value) return

  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除授课课程'))) {
    return
  }
  const operationToken = courseRequestToken.value
  const confirmed = await confirmAsync({
    title: '删除手工讲授课程',
    content: `确认删除 ${row.courseName}（${row.academicYear} ${row.semester}）？`,
  })
  if (!confirmed || courseRequestToken.value !== operationToken) {
    return
  }
  courseDeletingId.value = row.id
  try {
    await portfolioTeacherProfileApi.deleteTaughtCourse({ id: row.id })
    if (courseRequestToken.value !== operationToken) return
    message.success('已删除')
    await loadCourses()
  } catch (error) {
    if (courseRequestToken.value !== operationToken) return
    showUserError(error, '删除讲授课程失败')
  } finally {
    if (courseDeletingId.value === row.id) courseDeletingId.value = ''
  }
}

function onCoursePageChange(pageEvent: { current: number, pageSize: number }) {
  coursePageNum.value = pageEvent.current
  coursePageSize.value = pageEvent.pageSize
  void loadCourses()
}

watch(
  () => targetTeacherId.value,
  () => {
    requestToken.value += 1
    courseRequestToken.value += 1
    cvRequestToken.value += 1
    loading.value = false
    courseLoading.value = false
    cvLoading.value = false
    savingProfile.value = false
    savingCohortProfile.value = false
    courseSaving.value = false
    courseDeletingId.value = ''
    cvSaving.value = false
    cvDeletingKey.value = ''
    loadFailed.value = false
    profile.value = null
    courses.value = []
    courseTotal.value = 0
    educations.value = []
    academicExperiences.value = []
    academicAppointments.value = []
    coursePageNum.value = 1
    profileForm.researchDirection = ''
    profileForm.teachingGroupName = ''
    cohortProfileForm.jobLevel = ''
    cohortProfileForm.majorGroupCode = ''
    cohortProfileForm.majorGroupName = ''
    courseModalOpen.value = false
    cvModalOpen.value = false
    resetCourseEditorContext()
    resetCvEditor()
  },
)
usePortfolioScopedLoader(loadProfile, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="个人资料"
        :subtitle="profile?.nickName || profile?.teacherNumber"
      />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <UiCard v-else-if="loadFailed" title="加载失败">
      <UiEmpty size="sm" description="个人资料加载失败">
        <UiButton size="sm" variant="primary" @click="loadProfile">重试</UiButton>
      </UiEmpty>
    </UiCard>

    <template v-else>
      <UiCard title="人事主数据" :loading="loading">
        <div
          v-if="profile?.lifecycleStatus || profile?.ownerIdentityLayers?.length"
          class="profile-status-band"
          role="status"
        >
          <UiTag
            v-if="profile?.lifecycleStatus"
            :tone="lifecycleTagTone(profile.lifecycleStatus)"
          >
            {{ profile.lifecycleStatusLabel || profile.lifecycleStatus }}
          </UiTag>
          <UiTag v-if="profile?.evaluationHeld" tone="orange">参评 hold</UiTag>
          <UiTag
            v-if="profile?.countsInCurrentFacultyStructure === false"
            tone="gray"
          >
            非当前在岗
          </UiTag>
          <PortfolioOwnerIdentityLayersCell
            v-if="profile?.ownerIdentityLayers?.length"
            :layers="profile.ownerIdentityLayers"
            :note="profile.ownerMultiIdentityNote"
            show-note
          />
        </div>
        <div class="profile-readonly-grid">
          <div><span class="label">工号</span>{{ profile?.teacherNumber || '—' }}</div>
          <div><span class="label">院系</span>{{ profile?.departmentName || '—' }}</div>
          <div><span class="label">职称</span>{{ profile?.title || '—' }}</div>
        </div>
      </UiCard>

      <UiCard v-if="readonlyProfile" title="画像对标主数据" class="mt-16">
        <UiForm layout="vertical">
          <UiFormItem label="岗位等级" compact>
            <UiInput v-model="cohortProfileForm.jobLevel" size="sm" placeholder="例如：专技十级" />
          </UiFormItem>
          <UiFormItem label="专业群编码" compact>
            <UiInput
              v-model="cohortProfileForm.majorGroupCode"
              size="sm"
              placeholder="例如：MG-COMPUTING"
            />
          </UiFormItem>
          <UiFormItem label="专业群名称" compact>
            <UiInput
              v-model="cohortProfileForm.majorGroupName"
              size="sm"
              placeholder="例如：新一代信息技术专业群"
            />
          </UiFormItem>
          <UiButton
            size="sm"
            variant="primary"
            :loading="savingCohortProfile"
            @click="saveCohortProfile"
          >
            保存对标主数据
          </UiButton>
        </UiForm>
      </UiCard>

      <UiCard title="可补充资料" class="mt-16">
        <UiForm layout="vertical">
          <UiFormItem label="研究方向" compact>
            <UiInput
              v-model="profileForm.researchDirection"
              size="sm"
              :disabled="readonlyProfile"
              placeholder="可补充研究方向"
            />
          </UiFormItem>
          <UiFormItem label="教研室" compact>
            <UiInput
              v-model="profileForm.teachingGroupName"
              size="sm"
              :disabled="readonlyProfile"
              placeholder="可补充教研室名称"
            />
          </UiFormItem>
          <UiButton
            variant="primary"
            size="sm"
            v-if="!readonlyProfile"
            :loading="savingProfile"
            @click="saveProfile"
          >
            保存资料
          </UiButton>
        </UiForm>
      </UiCard>

      <UiCard title="讲授课程" class="mt-16">
        <template #extra>
          <UiButton size="sm" v-if="!readonlyProfile" @click="openCourseModal()">
            手工补充
          </UiButton>
        </template>
        <UiDataTable
          v-model:current="coursePageNum"
          v-model:page-size="coursePageSize"
          :columns="courseColumns"
          :data-source="courses"
          :loading="courseLoading"
          pagination-mode="server"
          :total="courseTotal"
          row-key="id"
          @page-change="onCoursePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'sourceType'">
              <UiTag>{{ sourceLabel(record.sourceType) }}</UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                size="sm"
                v-if="record.sourceType === 'MANUAL' && !readonlyProfile"
                variant="ghost"
                :disabled="courseWriteBusy"
                @click="openCourseModal(record)"
              >
                编辑
              </UiButton>
              <UiButton
                size="sm"
                v-if="record.sourceType === 'MANUAL' && !readonlyProfile"
                variant="ghost"
                status="danger"
                :loading="courseDeletingId === record.id"
                :disabled="courseWriteBusy"
                @click="removeCourse(record)"
              >
                删除
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard title="学历与学术履历" class="mt-16">
        <UiSectionTabs v-model="profileActiveTab" :items="profileTabItems" compact divided />
        <template v-if="profileActiveTab === 'education'">
          <div v-if="!readonlyProfile" class="cv-actions">
            <UiButton
              variant="primary"
              size="sm"
              :disabled="cvWriteBusy"
              @click="openCvModal('education')"
            >
              <PlusOutlined />
              新增学历
            </UiButton>
          </div>
          <UiDataTable
            pagination-mode="none"
            :columns="educationColumns"
            :data-source="educations"
            :loading="cvLoading"
            :show-pagination="false"
            row-key="id"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'period'">{{ cvPeriod(record) }}</template>
              <template v-else-if="column.key === 'sourceType'">
                <UiTag>{{ sourceLabel(record.sourceType) }}</UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildCvActions(record)"
                  @action="(key) => handleCvAction(key, 'education', record)"
                />
              </template>
            </template>
          </UiDataTable>
        </template>
        <template v-else-if="profileActiveTab === 'academic-experience'">
          <div v-if="!readonlyProfile" class="cv-actions">
            <UiButton
              variant="primary"
              size="sm"
              :disabled="cvWriteBusy"
              @click="openCvModal('academicExperience')"
            >
              <PlusOutlined />
              新增经历
            </UiButton>
          </div>
          <UiDataTable
            pagination-mode="none"
            :columns="academicExperienceColumns"
            :data-source="academicExperiences"
            :loading="cvLoading"
            :show-pagination="false"
            row-key="id"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'period'">{{ cvPeriod(record) }}</template>
              <template v-else-if="column.key === 'sourceType'">
                <UiTag>{{ sourceLabel(record.sourceType) }}</UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildCvActions(record)"
                  @action="(key) => handleCvAction(key, 'academicExperience', record)"
                />
              </template>
            </template>
          </UiDataTable>
        </template>
        <template v-else-if="profileActiveTab === 'academic-appointment'">
          <div v-if="!readonlyProfile" class="cv-actions">
            <UiButton
              variant="primary"
              size="sm"
              :disabled="cvWriteBusy"
              @click="openCvModal('academicAppointment')"
            >
              <PlusOutlined />
              新增任职
            </UiButton>
          </div>
          <UiDataTable
            pagination-mode="none"
            :columns="academicAppointmentColumns"
            :data-source="academicAppointments"
            :loading="cvLoading"
            :show-pagination="false"
            row-key="id"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'period'">{{ cvPeriod(record) }}</template>
              <template v-else-if="column.key === 'sourceType'">
                <UiTag>{{ sourceLabel(record.sourceType) }}</UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildCvActions(record)"
                  @action="(key) => handleCvAction(key, 'academicAppointment', record)"
                />
              </template>
            </template>
          </UiDataTable>
        </template>
      </UiCard>
    </template>
  </StageWorkbenchShell>

  <UiDialog
    v-model:open="courseModalOpen"
    :title="editingCourse ? '编辑讲授课程' : '手工补充讲授课程'"
    :confirm-loading="courseSaving"
    @ok="saveCourse"
    @cancel="resetCourseEditorContext"
  >
    <UiForm layout="vertical">
      <UiFormItem label="课程编码" required compact>
        <UiInput v-model="courseForm.courseCode" size="sm" />
      </UiFormItem>
      <UiFormItem label="课程名称" required compact>
        <UiInput v-model="courseForm.courseName" size="sm" />
      </UiFormItem>
      <UiFormItem label="学年" required compact>
        <UiInput v-model="courseForm.academicYear" size="sm" placeholder="如 2025-2026" />
      </UiFormItem>
      <UiFormItem label="学期" required compact>
        <UiInput v-model="courseForm.semester" size="sm" placeholder="如 1 / 2" />
      </UiFormItem>
      <UiFormItem label="本人学时" compact>
        <UiInputNumber v-model="courseForm.personalHours" size="sm" :min="0" />
      </UiFormItem>
      <UiFormItem label="总学时" compact>
        <UiInputNumber v-model="courseForm.totalHours" size="sm" :min="0" />
      </UiFormItem>
      <UiFormItem label="选课人数" compact>
        <UiInputNumber v-model="courseForm.studentCount" size="sm" :min="0" />
      </UiFormItem>
    </UiForm>
  </UiDialog>

  <UiDialog
    v-model:open="cvModalOpen"
    :title="cvModalTitle"
    :confirm-loading="cvSaving"
    :mask-closable="false"
    @ok="saveCvRecord"
    @cancel="resetCvEditor"
  >
    <UiForm layout="vertical">
      <template v-if="cvKind === 'education'">
        <UiFormItem label="学校" required compact>
          <UiInput v-model="cvForm.schoolName" size="sm" :disabled="cvWriteBusy" />
        </UiFormItem>
        <UiFormItem label="系或专业" compact>
          <UiInput v-model="cvForm.departmentMajor" size="sm" :disabled="cvWriteBusy" />
        </UiFormItem>
        <UiFormItem label="学位" required compact>
          <UiInput v-model="cvForm.degreeName" size="sm" :disabled="cvWriteBusy" />
        </UiFormItem>
      </template>
      <template v-else>
        <UiFormItem label="单位" required compact>
          <UiInput v-model="cvForm.organizationUnit" size="sm" :disabled="cvWriteBusy" />
        </UiFormItem>
        <UiFormItem label="职务" :required="cvKind === 'academicAppointment'" compact>
          <UiInput v-model="cvForm.positionTitle" size="sm" :disabled="cvWriteBusy" />
        </UiFormItem>
        <UiFormItem v-if="cvKind === 'academicExperience'" label="职称" compact>
          <UiInput v-model="cvForm.professionalTitle" size="sm" :disabled="cvWriteBusy" />
        </UiFormItem>
      </template>
      <div class="cv-period-grid">
        <UiFormItem label="开始年月" required compact>
          <UiDatePicker
            v-model="cvForm.startYearMonth"
            picker="month"
            value-format="YYYY-MM"
            format="YYYY-MM"
            size="sm"
            :disabled="cvWriteBusy"
          />
        </UiFormItem>
        <UiFormItem label="结束年月" compact>
          <UiDatePicker
            v-model="cvForm.endYearMonth"
            picker="month"
            value-format="YYYY-MM"
            format="YYYY-MM"
            allow-clear
            size="sm"
            :disabled="cvWriteBusy"
          />
        </UiFormItem>
      </div>
    </UiForm>
  </UiDialog>
</template>

<style scoped>
.profile-readonly-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-3, 12px);
}
.label {
  display: block;
  color: var(--dp-text-secondary);
  margin-bottom: 4px;
}
.mt-16 {
  margin-top: 16px;
}
.w-full {
  width: 100%;
}
.cv-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.cv-period-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-3, 12px);
}
@media (max-width: 640px) {
  .profile-readonly-grid,
  .cv-period-grid {
    grid-template-columns: 1fr;
  }
}
</style>
