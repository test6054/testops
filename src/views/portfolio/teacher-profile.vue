<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherProfileVO,
  PortfolioTeacherTaughtCourseSaveRequest,
  PortfolioTeacherTaughtCourseVO,
} from '@/apis/portfolio/teacher-profile'
import type { TeacherTaughtCourseSourceTypeCode } from '@/types/enums/teacher-taught-course-source-type-enum'
import { Form, Input, InputNumber, message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { portfolioTeacherCohortProfileApi } from '@/apis/portfolio/teacher-cohort-profile'
import { portfolioTeacherProfileApi } from '@/apis/portfolio/teacher-profile'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { TeacherTaughtCourseSourceTypeDescription } from '@/types/enums/teacher-taught-course-source-type-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const loading = ref(false)
const savingProfile = ref(false)
const courseLoading = ref(false)
const courseSaving = ref(false)
const loadFailed = ref(false)
const profile = ref<PortfolioTeacherProfileVO | null>(null)
const courses = ref<PortfolioTeacherTaughtCourseVO[]>([])
const courseTotal = ref(0)
const coursePageNum = ref(1)
const courseModalOpen = ref(false)
const editingCourse = ref<PortfolioTeacherTaughtCourseVO | null>(null)
const requestToken = ref(0)

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
  if (canPickTeachers.value && !targetTeacherId.value) {
    profile.value = null
    courses.value = []
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    const nextProfile = await portfolioTeacherProfileApi.get({
      teacherId: targetTeacherId.value || undefined,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    profile.value = nextProfile
    profileForm.researchDirection = profile.value.researchDirection || ''
    profileForm.teachingGroupName = profile.value.teachingGroupName || ''
    if (canPickTeachers.value && targetTeacherId.value) {
      const cohortProfile = await portfolioTeacherCohortProfileApi.get(targetTeacherId.value)
      cohortProfileForm.jobLevel = cohortProfile.jobLevel || ''
      cohortProfileForm.majorGroupCode = cohortProfile.majorGroupCode || ''
      cohortProfileForm.majorGroupName = cohortProfile.majorGroupName || ''
    }
    await loadCourses(currentToken)
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    loadFailed.value = true
    showUserError(error)
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

async function saveCohortProfile() {
  if (!targetTeacherId.value) return
  savingCohortProfile.value = true
  try {
    await portfolioTeacherCohortProfileApi.save({
      teacherId: targetTeacherId.value,
      jobLevel: cohortProfileForm.jobLevel.trim() || undefined,
      majorGroupCode: cohortProfileForm.majorGroupCode.trim() || undefined,
      majorGroupName: cohortProfileForm.majorGroupName.trim() || undefined,
    })
    message.success('画像对标主数据已保存')
  } catch (error) {
    showUserError(error)
  } finally {
    savingCohortProfile.value = false
  }
}

async function loadCourses(currentToken = requestToken.value) {
  courseLoading.value = true
  try {
    const page = await portfolioTeacherProfileApi.pageTaughtCourses({
      teacherId: targetTeacherId.value || undefined,
      pageNum: coursePageNum.value,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    courses.value = page.list
    courseTotal.value = page.total
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    showUserError(error)
  } finally {
    if (requestToken.value === currentToken) {
      courseLoading.value = false
    }
  }
}

async function saveProfile() {
  if (readonlyProfile.value) {
    message.warning('管理员查看模式下不可编辑个人资料')
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
    showUserError(error)
  } finally {
    savingProfile.value = false
  }
}

function openCourseModal(row?: PortfolioTeacherTaughtCourseVO) {
  if (readonlyProfile.value) {
    message.warning('管理员查看模式下不可维护讲授课程')
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
    showUserError(error)
  } finally {
    courseSaving.value = false
  }
}

async function removeCourse(row: PortfolioTeacherTaughtCourseVO) {
  if (row.sourceType !== 'MANUAL') {
    message.warning('教务同步课程不可删除')
    return
  }
  const confirmed = await confirmAsync({
    title: '删除手工讲授课程',
    content: `确认删除 ${row.courseName}（${row.academicYear} ${row.semester}）？`,
  })
  if (!confirmed) {
    return
  }
  try {
    await portfolioTeacherProfileApi.deleteTaughtCourse({ id: row.id })
    message.success('已删除')
    await loadCourses()
  } catch (error) {
    showUserError(error)
  }
}

function onCoursePageChange(pageEvent: { current: number, pageSize: number }) {
  coursePageNum.value = pageEvent.current
  void loadCourses()
}

usePortfolioScopedLoader(loadProfile, () => targetTeacherId.value)
watch(
  () => targetTeacherId.value,
  () => {
    requestToken.value += 1
    courseModalOpen.value = false
    resetCourseEditorContext()
  },
)
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

    <UiCard v-if="loadFailed" title="加载失败">
      <UiEmpty description="个人资料加载失败">
        <UiButton @click="loadProfile">重试</UiButton>
      </UiEmpty>
    </UiCard>

    <template v-else>
      <UiCard title="人事主数据" :loading="loading">
        <div class="profile-readonly-grid">
          <div><span class="label">工号</span>{{ profile?.teacherNumber || '—' }}</div>
          <div><span class="label">院系</span>{{ profile?.departmentName || '—' }}</div>
          <div><span class="label">职称</span>{{ profile?.title || '—' }}</div>
        </div>
      </UiCard>

      <UiCard v-if="readonlyProfile" title="画像对标主数据" class="mt-16">
        <Form layout="vertical">
          <Form.Item label="岗位等级">
            <Input v-model:value="cohortProfileForm.jobLevel" placeholder="例如：专技十级" />
          </Form.Item>
          <Form.Item label="专业群编码">
            <Input
              v-model:value="cohortProfileForm.majorGroupCode"
              placeholder="例如：MG-COMPUTING"
            />
          </Form.Item>
          <Form.Item label="专业群名称">
            <Input
              v-model:value="cohortProfileForm.majorGroupName"
              placeholder="例如：新一代信息技术专业群"
            />
          </Form.Item>
          <UiButton :loading="savingCohortProfile" @click="saveCohortProfile">
            保存对标主数据
          </UiButton>
        </Form>
      </UiCard>

      <UiCard title="可补充资料" class="mt-16">
        <Form layout="vertical">
          <Form.Item label="研究方向">
            <Input
              v-model:value="profileForm.researchDirection"
              :disabled="readonlyProfile"
              placeholder="可补充研究方向"
            />
          </Form.Item>
          <Form.Item label="教研室">
            <Input
              v-model:value="profileForm.teachingGroupName"
              :disabled="readonlyProfile"
              placeholder="可补充教研室名称"
            />
          </Form.Item>
          <UiButton v-if="!readonlyProfile" :loading="savingProfile" @click="saveProfile">
            保存资料
          </UiButton>
        </Form>
      </UiCard>

      <UiCard title="讲授课程" class="mt-16">
        <template #extra>
          <UiButton v-if="!readonlyProfile" @click="openCourseModal()"> 手工补充 </UiButton>
        </template>
        <UiDataTable
          :columns="courseColumns"
          :data-source="courses"
          :loading="courseLoading"
          :pagination="{
            current: coursePageNum,
            total: courseTotal,
            pageSize: DEFAULT_LIST_PAGE_SIZE,
          }"
          row-key="id"
          @page-change="onCoursePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'sourceType'">
              <UiTag>{{ sourceLabel(record.sourceType) }}</UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                v-if="record.sourceType === 'MANUAL' && !readonlyProfile"
                variant="ghost"
                @click="openCourseModal(record)"
              >
                编辑
              </UiButton>
              <UiButton
                v-if="record.sourceType === 'MANUAL' && !readonlyProfile"
                variant="ghost"
                status="danger"
                @click="removeCourse(record)"
              >
                删除
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
  </StageWorkbenchShell>

  <a-modal
    v-model:open="courseModalOpen"
    :title="editingCourse ? '编辑讲授课程' : '手工补充讲授课程'"
    :confirm-loading="courseSaving"
    @ok="saveCourse"
    @cancel="resetCourseEditorContext"
  >
    <Form layout="vertical">
      <Form.Item label="课程编码" required>
        <Input v-model:value="courseForm.courseCode" />
      </Form.Item>
      <Form.Item label="课程名称" required>
        <Input v-model:value="courseForm.courseName" />
      </Form.Item>
      <Form.Item label="学年" required>
        <Input v-model:value="courseForm.academicYear" placeholder="如 2025-2026" />
      </Form.Item>
      <Form.Item label="学期" required>
        <Input v-model:value="courseForm.semester" placeholder="如 1 / 2" />
      </Form.Item>
      <Form.Item label="本人学时">
        <InputNumber v-model:value="courseForm.personalHours" class="w-full" :min="0" />
      </Form.Item>
      <Form.Item label="总学时">
        <InputNumber v-model:value="courseForm.totalHours" class="w-full" :min="0" />
      </Form.Item>
      <Form.Item label="选课人数">
        <InputNumber v-model:value="courseForm.studentCount" class="w-full" :min="0" />
      </Form.Item>
    </Form>
  </a-modal>
</template>

<style scoped>
.profile-readonly-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.label {
  display: block;
  color: var(--text-secondary, #666);
  margin-bottom: 4px;
}
.mt-16 {
  margin-top: 16px;
}
.w-full {
  width: 100%;
}
</style>
