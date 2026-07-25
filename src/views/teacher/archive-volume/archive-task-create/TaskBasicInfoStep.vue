<template>
  <UiForm
    ref="formRef"
    :model="basicForm"
    :rules="basicRules"
    layout="horizontal"
    :label-col="labelCol"
    :wrapper-col="wrapperCol"
    class="create-form"
  >
    <div id="archive-task-basic" class="form-section">
      <div class="section-header">
        <h3 class="section-title">任务信息</h3>
      </div>
      <p class="section-desc">填写课程、学年学期与归档标题；带 * 为必填。</p>

      <UiFormItem label="课程" name="courseId" required>
        <CatalogCourseSelector
          v-model:value="basicForm.courseId"
          class="create-form__control-wide"
          placeholder="请选择课程"
          :allow-clear="false"
          @change="handleCourseChange"
        />
      </UiFormItem>

      <UiFormItem label="归档标题" name="archiveTitle" required>
        <UiInput
          size="sm"
          v-model="basicForm.archiveTitle"
          placeholder="例如：2024-2025 高等数学期末考查"
          :maxlength="512"
        />
      </UiFormItem>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem label="院系" name="departmentId" :label-col="labelCol" :wrapper-col="wrapperCol">
            <UiSelect
              size="sm"
              v-model="departmentIdSelectValue"
              :options="departmentOptions"
              :loading="departmentLoading"
              placeholder="请选择院系"
              allow-search
              option-filter-prop="label"
              allow-clear
              @change="handleDepartmentChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="授课班级"
            required
            name="teachingClassId"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <ClassSelector
              v-model:value="basicForm.teachingClassId"
              :department-id="basicForm.departmentId"
              :disabled="!basicForm.departmentId"
              placeholder="请选择授课班级"
              @change="handleClassChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem
            label="学年"
            name="academicYear"
            required
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <UiInput
              size="sm"
              v-model="basicForm.academicYear"
              placeholder="2024-2025"
              :maxlength="9"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="学期"
            name="semester"
            required
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <UiSelect
              size="sm"
              v-model="basicForm.semester"
              :options="SemesterOptions"
              placeholder="请选择学期"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem label="档案编号" :label-col="labelCol" :wrapper-col="wrapperCol">
            <UiInput
              size="sm"
              v-model="basicForm.archiveNo"
              placeholder="不填则自动生成"
              :maxlength="64"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiFormItem
        v-if="showRelatedExamField"
        label="关联考试"
        tooltip="仅作备查引用，不会自动收阅卷材料；若该考试已有线上归档卷将被拒绝。"
      >
        <UiSelect
          size="sm"
          v-model="relatedExamIdSelectValue"
          :options="relatedExamOptions"
          :loading="relatedExamLoading"
          placeholder="可选，选择关联考试"
          allow-search
          allow-clear
          option-filter-prop="label"
          @search="handleRelatedExamSearch"
          @change="handleRelatedExamChange"
        />
      </UiFormItem>
    </div>
  </UiForm>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ClassInfoDto } from '@/apis/edu/class'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { CourseListVO } from '@/apis/quality/user-catalog'
import type { UiOptionValue } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { pageExams } from '@/apis/mark/exam'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import {
  useInjectedArchiveTaskCreateBasicForm,
  useInjectedArchiveTaskCreateWizardState,
} from './archive-task-create-context'
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

const labelCol = { style: { width: '112px' } }
const wrapperCol = { flex: 1 }

const basicForm = useInjectedArchiveTaskCreateBasicForm()
const wizardState = useInjectedArchiveTaskCreateWizardState()
const formRef = ref<FormInstance>()
/** S2 可关联考试；S3 历史补录不展示 */
const isCurrentTermOffline = computed(
  () => wizardState.provenance === ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE,
)
const departmentIdSelectValue = computed({
  get: () => nullableStringToSelectValue(basicForm.departmentId),
  set: (value: UiOptionValue | UiOptionValue[] | undefined) => {
    basicForm.departmentId = selectValueToNullableString(value)
  },
})

const relatedExamIdSelectValue = computed({
  get: () => nullableStringToSelectValue(basicForm.relatedExamId),
  set: (value: UiOptionValue | UiOptionValue[] | undefined) => {
    basicForm.relatedExamId = selectValueToNullableString(value)
  },
})
const departmentLoading = ref(false)
const departmentOptions = ref<Array<{ value: string, label: string }>>([])
const relatedExamLoading = ref(false)
const relatedExamOptions = ref<Array<{ value: string, label: string }>>([])
/** 无关键字查询时该课程/学年/学期下是否存在可选考试 */
const relatedExamAvailable = ref(false)

const RELATED_EXAM_PAGE_SIZE = 50
let relatedExamSearchTimer: ReturnType<typeof setTimeout> | undefined

const canLoadRelatedExams = computed(
  () => Boolean(basicForm.courseId && basicForm.academicYear.trim() && basicForm.semester),
)

/** 选课且该条件有考试数据时才展示；默认展开，无折叠 */
const showRelatedExamField = computed(
  () => isCurrentTermOffline.value && relatedExamAvailable.value,
)

function handleCourseChange(courseId: string | null, option?: CourseListVO) {
  resetRelatedExamOptions()
  emit('course-change', courseId, option?.courseName?.trim() ?? '')
  void loadRelatedExamOptions()
}

function handleDepartmentChange(value: UiOptionValue | UiOptionValue[] | undefined): void {
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

function formatRelatedExamLabel(exam: ExamSummaryResponse): string {
  return exam.examNo ? `${exam.examName}（${exam.examNo}）` : exam.examName
}

function clearRelatedExamSelection(): void {
  basicForm.relatedExamId = null
  basicForm.relatedExamName = ''
}

function resetRelatedExamOptions(): void {
  clearRelatedExamSelection()
  relatedExamOptions.value = []
  relatedExamAvailable.value = false
}

async function loadRelatedExamOptions(keyword?: string): Promise<void> {
  if (!isCurrentTermOffline.value || !canLoadRelatedExams.value) {
    resetRelatedExamOptions()
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
    relatedExamOptions.value = result.list.map((exam) => ({
      label: formatRelatedExamLabel(exam),
      value: exam.examId,
    }))
    if (!keyword?.trim()) {
      relatedExamAvailable.value = relatedExamOptions.value.length > 0
      if (!relatedExamAvailable.value) {
        clearRelatedExamSelection()
      }
    }
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
    if (!keyword?.trim()) {
      relatedExamAvailable.value = false
      clearRelatedExamSelection()
    }
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

function handleRelatedExamChange(value: UiOptionValue | UiOptionValue[] | undefined): void {
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
    const departments = await departmentCatalogApi.list()
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
  () => wizardState.provenance,
  (provenance) => {
    if (provenance !== ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE) {
      resetRelatedExamOptions()
    }
  },
)

watch(
  () => [basicForm.academicYear, basicForm.semester],
  () => {
    resetRelatedExamOptions()
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
