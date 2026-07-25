<template>
  <UiForm
    ref="formRef"
    :model="examForm"
    :rules="basicRules"
    layout="horizontal"
    :label-col="labelCol"
    :wrapper-col="{ flex: 1 }"
    class="create-form"
  >
    <div id="exam-create-basic" class="form-section">
      <div class="section-header">
        <h3 class="section-title">考务信息</h3>
      </div>
      <p class="section-desc">填写课程、时间与成绩规则；带 * 为必填。</p>

      <UiFormItem label="课程" name="courseId" required>
        <CatalogCourseSelector
          v-model:value="examForm.courseId"
          placeholder="选择课程"
          :allow-clear="false"
          @change="handleCourseChange"
        />
      </UiFormItem>

      <UiFormItem label="考试名称" name="examName" required>
        <UiInput
          size="sm"
          v-model="examForm.examName"
          placeholder="例如：2026 春《工程制图》期末"
          :maxlength="100"
        />
      </UiFormItem>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem
            label="考试性质"
            name="examKind"
            required
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <UiSelect
              size="sm"
              v-model="examForm.examKind"
              :options="EXAM_KIND_FILTER_OPTIONS"
              placeholder="选择考试性质"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="考务编号"
            name="examNo"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <UiInput
              size="sm"
              v-model="examForm.examNo"
              placeholder="教务系统编号或自定义编号"
              :maxlength="64"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiFormItem
        label="成绩构成"
        name="scoreCompositionMode"
        required
        :tooltip="scoreCompositionTip"
      >
        <UiRadioGroup
          v-model="examForm.scoreCompositionMode"
          :disabled="nonRegularScoreLocked === true"
          size="sm"
          block
          :options="[
            { label: '仅计入考试成绩（期末笔试）', value: 'EXAM_ONLY' },
            { label: '期末考试 + 平时成绩合成', value: 'EXAM_WITH_DAILY' },
          ]"
        />
      </UiFormItem>

      <UiFormItem
        v-if="showSourceExamField"
        label="原考试"
        name="sourceExamId"
        required
        tooltip="须关联已关闭的正考；跨学期补考时开课学期须与原正考一致。"
      >
        <UiSelect
          size="sm"
          v-model="examForm.sourceExamId"
          :options="sourceExamOptions"
          :loading="sourceExamLoading"
          placeholder="搜索已关闭的正考"
          allow-search
          option-filter-prop="label"
          :filter-option="false"
          allow-clear
          @search="handleSourceExamSearch"
          @change="handleSourceExamChange"
          @dropdown-visible-change="handleSourceExamDropdown"
        />
      </UiFormItem>

      <UiFormItem
        v-if="examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'"
        label="平时满分"
        name="dailyScoreFull"
        required
      >
        <UiInputNumber
          size="sm"
          v-model="examForm.dailyScoreFull"
          :min="0.01"
          :max="1000"
          :precision="2"
          style="width: 100%"
          placeholder="例如 30"
        />
      </UiFormItem>

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
              size="sm" v-model="examForm.academicYear" placeholder="2024-2025" :maxlength="9"
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
              v-model="examForm.semester"
              placeholder="选择学期"
              :options="SemesterOptions"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiFormItem label="考试时间窗" name="examWindow" required>
        <UiRangePicker
          v-model="examForm.examWindow"
          show-time
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          :placeholder="['开始时间', '结束时间']"
        />
      </UiFormItem>

      <UiRow :gutter="24" class="create-form__split-row">
        <UiCol :span="12">
          <UiFormItem
            label="阅卷策略"
            name="gradingStrategy"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <UiInput
              size="sm"
              :value="
                strictEnumLabel(
                  ExamGradingStrategyDescription,
                  ExamGradingStrategyCode.SINGLE,
                  '阅卷策略',
                )
              "
              disabled
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem
            label="涉密场次"
            name="confidential"
            :tooltip="confidentialFieldTip"
            :label-col="labelCol"
            :wrapper-col="wrapperCol"
          >
            <div class="create-form__switch-row">
              <UiSwitch size="sm" v-model="examForm.confidential" />
              <span class="create-form__switch-label">
                {{ examForm.confidential === true ? '已开启强制水印' : '未开启' }}
              </span>
            </div>
          </UiFormItem>
        </UiCol>
      </UiRow>

      <UiFormItem label="备注" name="remark">
        <UiTextarea
          size="sm"
          v-model="examForm.remark"
          :rows="3"
          placeholder="可填写考试用途、班级范围说明等"
          :maxlength="500"
          :show-count="true"
        />
      </UiFormItem>
    </div>
  </UiForm>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { CourseListVO } from '@/apis/quality/user-catalog'
import { computed, onMounted, ref, watch } from 'vue'
import {
  EXAM_KIND_FILTER_OPTIONS,
  ExamGradingStrategyCode,
  ExamGradingStrategyDescription,
  ExamKindCode,
  examKindRequiresSource,
  ExamStatusCode,
  pageExams,
} from '@/apis/mark/exam'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiRangePicker from '@/components/ui-guide/ui/RangePicker.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { useInjectedExamCreateBasicForm } from './exam-create-context'

defineProps<{
  basicRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'update:basic-form-ref': [ref: FormInstance | undefined]
  'course-change': [courseId: string | null, courseName: string]
}>()

const labelCol = { style: { width: '88px' } }
const wrapperCol = { flex: 1 }
const examForm = useInjectedExamCreateBasicForm()
const formRef = ref<FormInstance>()
const sourceExamLoading = ref(false)
const sourceExamOptions = ref<Array<{ label: string, value: string }>>([])

const SOURCE_EXAM_PAGE_SIZE = 50
let sourceExamSearchTimer: ReturnType<typeof setTimeout> | undefined

const showSourceExamField = computed(() => examKindRequiresSource(examForm.examKind))
const nonRegularScoreLocked = computed(() => examKindRequiresSource(examForm.examKind))
const confidentialFieldTip = computed(() =>
  examForm.confidential
    ? '本场考试将启用强制水印与涉密警示条，请确认考务流程符合保密要求。'
    : '统考或涉密试卷须开启；创建后阅卷、扫描与成绩页面将强制水印并展示警示条。',
)
const scoreCompositionTip = computed(() => {
  if (
    examForm.examKind === ExamKindCode.MAKEUP
    || examForm.examKind === ExamKindCode.REEXAM
    || examForm.examKind === ExamKindCode.DEFERRED
  ) {
    return '补考、重考、缓考按非正考成绩规则处理，合成后封顶 60 分。'
  }
  if (examForm.examKind === ExamKindCode.RETAKE) {
    return '重修仅计入本次考试实际成绩，不纳入原正考平时分。'
  }
  return '平时成绩含出勤、作业、课堂表现等；选择合成后，成绩确认时需录入平时分。'
})

function handleCourseChange(courseId: string | null, option?: CourseListVO): void {
  emit('course-change', courseId, option?.courseName?.trim() ?? '')
}

function formatSourceExamLabel(exam: ExamSummaryResponse): string {
  return exam.examNo ? `${exam.examName}（${exam.examNo}）` : exam.examName
}

function isRegularSourceExam(exam: ExamSummaryResponse): boolean {
  return !exam.examKind || exam.examKind === ExamKindCode.REGULAR
}

async function loadSourceExamOptions(keyword?: string): Promise<void> {
  sourceExamLoading.value = true
  try {
    const result = await pageExams({
      pageNum: 1,
      pageSize: SOURCE_EXAM_PAGE_SIZE,
      status: ExamStatusCode.CLOSED,
      courseId: examForm.courseId ?? undefined,
      keyword: keyword?.trim() || undefined,
    })
    sourceExamOptions.value = result.list.filter(isRegularSourceExam).map((exam) => ({
      label: formatSourceExamLabel(exam),
      value: exam.examId,
    }))
  } catch (error) {
    showUserError(error, '原考试列表加载失败')
  } finally {
    sourceExamLoading.value = false
  }
}

function handleSourceExamSearch(keyword: string): void {
  if (sourceExamSearchTimer) {
    clearTimeout(sourceExamSearchTimer)
  }
  sourceExamSearchTimer = setTimeout(() => {
    void loadSourceExamOptions(keyword)
  }, 300)
}

function handleSourceExamDropdown(open: boolean): void {
  if (open) {
    void loadSourceExamOptions()
  }
}

function handleSourceExamChange(value: SelectValue): void {
  if (typeof value !== 'string') {
    examForm.sourceExamId = undefined
    examForm.sourceExamName = undefined
    return
  }
  examForm.sourceExamId = value
  const selected = sourceExamOptions.value.find((option) => option.value === value)
  examForm.sourceExamName = selected?.label
}

watch(
  () => examForm.examKind,
  (examKind: ExamKindCode, previous: ExamKindCode) => {
    if (examKind === previous) return
    if (examKindRequiresSource(examKind)) {
      examForm.scoreCompositionMode = 'EXAM_ONLY'
      examForm.dailyScoreFull = undefined
    }
    if (!examKindRequiresSource(examKind)) {
      examForm.sourceExamId = undefined
      examForm.sourceExamName = undefined
    }
  },
)

watch(
  () => examForm.courseId,
  () => {
    if (showSourceExamField.value) {
      examForm.sourceExamId = undefined
      examForm.sourceExamName = undefined
      sourceExamOptions.value = []
    }
  },
)

onMounted(() => {
  emit('update:basic-form-ref', formRef.value)
})

watch(formRef, (value) => {
  emit('update:basic-form-ref', value)
})
</script>
