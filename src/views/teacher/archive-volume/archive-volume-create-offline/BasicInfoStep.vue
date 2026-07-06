<template>
  <div id="archive-create-basic" class="archive-create-step">
    <WorkbenchSurfaceCard flush class="archive-create-form">
      <template #head>
        <div class="archive-create-step__head">
          <h2 class="archive-create-step__title">卷宗信息</h2>
          <p class="archive-create-step__desc">填写课程、学年学期与归档标题；带 * 为必填。</p>
        </div>
      </template>
      <a-form
        ref="formRef"
        :model="basicForm"
        :rules="basicRules"
        layout="vertical"
        class="archive-create-form__body"
      >
        <div class="archive-create-form__grid">
          <a-form-item label="课程" name="courseId" class="archive-create-form__full">
            <CatalogCourseSelector
              v-model:value="basicForm.courseId"
              placeholder="选择课程"
              :allow-clear="false"
              @change="handleCourseChange"
            />
          </a-form-item>
          <a-form-item label="归档标题" name="archiveTitle" class="archive-create-form__full">
            <a-input
              v-model:value="basicForm.archiveTitle"
              placeholder="如 2024-2025 高等数学期末考查"
              :maxlength="512"
              show-count
            />
          </a-form-item>
          <a-form-item label="档案编号">
            <a-input
              v-model:value="basicForm.archiveNo"
              placeholder="不填则自动生成"
              :maxlength="64"
            />
          </a-form-item>
          <a-form-item label="学年" name="academicYear">
            <a-input v-model:value="basicForm.academicYear" placeholder="2024-2025" :maxlength="9" />
          </a-form-item>
          <a-form-item label="学期" name="semester">
            <a-select
              v-model:value="basicForm.semester"
              :options="SemesterOptions"
              placeholder="选择学期"
            />
          </a-form-item>
          <a-form-item label="院系" name="departmentId">
            <a-select
              v-model:value="departmentIdSelectValue"
              :options="departmentOptions"
              :loading="departmentLoading"
              placeholder="请选择院系"
              show-search
              option-filter-prop="label"
              allow-clear
              @change="handleDepartmentChange"
            />
          </a-form-item>
          <a-form-item label="授课班级" name="teachingClassId">
            <ClassSelector
              v-model:value="basicForm.teachingClassId"
              :department-id="basicForm.departmentId"
              :disabled="!basicForm.departmentId"
              :placeholder="basicForm.departmentId ? '请选择授课班级' : '请先选择院系'"
              @change="handleClassChange"
            />
          </a-form-item>
          <a-form-item label="关联考试">
            <a-select
              v-model:value="relatedExamIdSelectValue"
              :options="relatedExamOptions"
              :loading="relatedExamLoading"
              :disabled="!canLoadRelatedExams"
              :placeholder="relatedExamPlaceholder"
              show-search
              allow-clear
              option-filter-prop="label"
              @search="handleRelatedExamSearch"
              @change="handleRelatedExamChange"
            />
          </a-form-item>
        </div>
      </a-form>
    </WorkbenchSurfaceCard>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ClassInfoDto } from '@/apis/edu/class'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import type { CourseListVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { computed, onMounted, ref, watch } from 'vue'
import { pageExams } from '@/apis/mark/exam'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import { requireArrayResult } from '@/components/quality/selectors/page-contract'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { useInjectedArchiveVolumeCreateBasicForm } from './archive-volume-create-context'
import { nullableStringToSelectValue, selectValueToNullableString } from './select-value-bridge'

defineProps<{
  basicRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'course-change': [courseId: string | null, courseName: string]
  'department-change': [departmentId: string | null, departmentName: string]
  'teaching-class-change': [
    classId: string | null,
    className: string,
    departmentId?: string,
    departmentName?: string,
  ]
  'update:basic-form-ref': [form: FormInstance | undefined]
}>()

const basicForm = useInjectedArchiveVolumeCreateBasicForm()
const formRef = ref<FormInstance>()
const departmentIdSelectValue = computed({
  get: () => nullableStringToSelectValue(basicForm.departmentId),
  set: (value: SelectValue) => {
    basicForm.departmentId = selectValueToNullableString(value)
  },
})

const relatedExamIdSelectValue = computed({
  get: () => nullableStringToSelectValue(basicForm.relatedExamId),
  set: (value: SelectValue) => {
    basicForm.relatedExamId = selectValueToNullableString(value)
  },
})
const departmentLoading = ref(false)
const departmentOptions = ref<Array<{ value: string, label: string }>>([])
const relatedExamLoading = ref(false)
const relatedExamOptions = ref<Array<{ value: string, label: string }>>([])

const RELATED_EXAM_PAGE_SIZE = 50
let relatedExamSearchTimer: ReturnType<typeof setTimeout> | undefined

const canLoadRelatedExams = computed(() =>
  Boolean(basicForm.courseId && basicForm.academicYear.trim() && basicForm.semester),
)

const relatedExamPlaceholder = computed(() => {
  if (!basicForm.courseId) return '请先选择课程'
  if (!basicForm.academicYear.trim() || !basicForm.semester) return '请先填写学年学期'
  return '可选，选择关联考试'
})

function handleCourseChange(courseId: string | null, option?: CourseListVO) {
  clearRelatedExamSelection()
  emit('course-change', courseId, option?.courseName?.trim() ?? '')
  void loadRelatedExamOptions()
}

function handleDepartmentChange(value: SelectValue): void {
  const departmentId = selectValueToNullableString(value)
  basicForm.departmentId = departmentId
  const selected = departmentId
    ? departmentOptions.value.find((item) => item.value === departmentId)
    : undefined
  emit('department-change', departmentId, selected?.label ?? '')
}

function handleClassChange(classId: string | null, option?: ClassInfoDto) {
  emit(
    'teaching-class-change',
    classId,
    option?.className?.trim() ?? '',
    option?.departmentId,
    option?.departmentName,
  )
}

function formatRelatedExamLabel(exam: ExamSummaryVO): string {
  return exam.examNo ? `${exam.examName}（${exam.examNo}）` : exam.examName
}

function clearRelatedExamSelection(): void {
  basicForm.relatedExamId = null
  basicForm.relatedExamName = ''
}

async function loadRelatedExamOptions(keyword?: string): Promise<void> {
  if (!canLoadRelatedExams.value) {
    relatedExamOptions.value = []
    return
  }
  relatedExamLoading.value = true
  try {
    const result = await pageExams({
      pageNum: 1,
      pageSize: RELATED_EXAM_PAGE_SIZE,
      courseId: basicForm.courseId ?? undefined,
      academicYear: basicForm.academicYear.trim(),
      semester: basicForm.semester,
      keyword: keyword?.trim() || undefined,
    })
    relatedExamOptions.value = readPageList(result, '关联考试列表加载失败').map((exam) => ({
      label: formatRelatedExamLabel(exam),
      value: exam.examId,
    }))
    if (basicForm.relatedExamId) {
      const selected = relatedExamOptions.value.find(
        (item) => item.value === basicForm.relatedExamId,
      )
      if (selected) {
        basicForm.relatedExamName = selected.label
      }
    }
  } catch (error) {
    showUserError(error, '关联考试列表加载失败')
    relatedExamOptions.value = []
  } finally {
    relatedExamLoading.value = false
  }
}

function handleRelatedExamSearch(keyword: string): void {
  if (relatedExamSearchTimer) {
    clearTimeout(relatedExamSearchTimer)
  }
  relatedExamSearchTimer = setTimeout(() => {
    void loadRelatedExamOptions(keyword)
  }, 300)
}

function handleRelatedExamChange(value: SelectValue): void {
  const examId = selectValueToNullableString(value)
  basicForm.relatedExamId = examId
  const selected = examId
    ? relatedExamOptions.value.find((item) => item.value === examId)
    : undefined
  basicForm.relatedExamName = selected?.label ?? ''
}

async function loadDepartments() {
  departmentLoading.value = true
  try {
    const departments = requireArrayResult<TenantSchoolDepartmentDto>(
      await departmentCatalogApi.list(),
      '院系',
    )
    departmentOptions.value = departments.map((item) => ({
      value: item.id,
      label: item.deptName,
    }))
  } catch (error) {
    showUserError(error, '院系列表加载失败')
    departmentOptions.value = []
  } finally {
    departmentLoading.value = false
  }
}

watch(
  () => [basicForm.academicYear, basicForm.semester],
  () => {
    clearRelatedExamSelection()
    void loadRelatedExamOptions()
  },
)

watch(
  formRef,
  (form) => {
    emit('update:basic-form-ref', form)
  },
  { immediate: true },
)

onMounted(() => {
  void loadDepartments()
  void loadRelatedExamOptions()
})
</script>
