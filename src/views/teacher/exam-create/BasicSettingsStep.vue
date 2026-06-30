<template>
  <section id="exam-create-basic" class="form-section exam-create-form">
    <header class="section-header">
      <h2 class="section-title">考务信息</h2>
    </header>
    <a-form ref="formRef" :model="examForm" :rules="basicRules" layout="vertical">
      <a-form-item label="课程" name="courseId">
        <CatalogCourseSelector
          v-model:value="examForm.courseId"
          placeholder="选择课程"
          :allow-clear="false"
          @change="handleCourseChange"
        />
      </a-form-item>
      <a-form-item label="考试性质" name="examKind">
        <a-select
          v-model:value="examForm.examKind"
          :options="EXAM_KIND_FILTER_OPTIONS"
          placeholder="选择考试性质"
        />
      </a-form-item>
      <a-form-item
        v-if="showSourceExamField"
        label="原考试"
        name="sourceExamId"
      >
        <a-select
          v-model:value="examForm.sourceExamId"
          :options="sourceExamOptions"
          :loading="sourceExamLoading"
          placeholder="搜索已关闭的正考"
          show-search
          option-filter-prop="label"
          :filter-option="false"
          allow-clear
          @search="handleSourceExamSearch"
          @change="handleSourceExamChange"
          @dropdown-visible-change="handleSourceExamDropdown"
        />
        <div class="exam-create-form__hint">
          须关联已关闭的正考；跨学期补考时开课学期须与原正考一致。
        </div>
      </a-form-item>
      <a-form-item label="考试名称" name="examName">
        <a-input
          v-model:value="examForm.examName"
          placeholder="例如：2026 春《工程制图》期末"
          :maxlength="100"
          show-count
        />
      </a-form-item>
      <a-form-item label="考务编号" name="examNo">
        <a-input
          v-model:value="examForm.examNo"
          placeholder="教务系统编号或自定义编号"
          :maxlength="64"
        />
      </a-form-item>
      <a-form-item label="学年" name="academicYear">
        <a-input v-model:value="examForm.academicYear" placeholder="2024-2025" :maxlength="9" />
      </a-form-item>
      <a-form-item label="学期" name="semester">
        <a-select
          v-model:value="examForm.semester"
          placeholder="选择学期"
          allow-clear
          :options="SemesterOptions"
        />
      </a-form-item>
      <a-form-item label="考试时间窗" name="examWindow">
        <a-range-picker
          v-model:value="examForm.examWindow"
          style="width: 100%"
          show-time
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          :placeholder="['开始时间', '结束时间']"
        />
      </a-form-item>
      <a-form-item label="阅卷策略" name="gradingStrategy">
        <a-input :value="GRADING_STRATEGY_LABEL.SINGLE" disabled />
      </a-form-item>
      <a-form-item label="成绩构成" name="scoreCompositionMode">
        <a-radio-group
          v-model:value="examForm.scoreCompositionMode"
          :disabled="makeupScoreLocked"
        >
          <a-radio value="EXAM_ONLY">仅计入考试成绩（期末笔试）</a-radio>
          <a-radio value="EXAM_WITH_DAILY">期末考试 + 平时成绩合成</a-radio>
        </a-radio-group>
        <div class="exam-create-form__hint">
          <template v-if="makeupScoreLocked">
            补考仅计入卷面实际分，且合成后封顶 60 分。
          </template>
          <template v-else>
            平时成绩指出勤、作业、课堂表现等；选择合成后，成绩确认时需为每位考生录入平时分。
          </template>
        </div>
      </a-form-item>
      <a-form-item label="涉密场次" name="confidential">
        <a-switch v-model:checked="examForm.confidential" />
        <div class="exam-create-form__hint">
          统考或涉密试卷须开启；创建后阅卷、扫描与成绩页面将强制水印并展示警示条。
        </div>
      </a-form-item>
      <UiAlertStrip
        v-if="examForm.confidential"
        tone="error"
        title="涉密资料，禁止传播"
        description="本场考试将启用强制水印与涉密切换警示，请确认考务流程符合保密要求。"
        :closable="false"
        dense
        class="exam-create-form__confidential-strip"
      />
      <a-form-item
        v-if="examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'"
        label="平时成绩满分"
        name="dailyScoreFull"
      >
        <a-input-number
          v-model:value="examForm.dailyScoreFull"
          :min="0.01"
          :max="1000"
          :precision="2"
          style="width: 100%"
          placeholder="例如 30"
        />
      </a-form-item>
      <a-form-item label="备注" name="remark">
        <a-textarea
          v-model:value="examForm.remark"
          :rows="3"
          placeholder="可填写考试用途、班级范围说明等"
          :maxlength="500"
          show-count
        />
      </a-form-item>
    </a-form>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { CourseListVO } from '@/apis/quality/user-catalog'
import type { ExamKindCode, ExamSummaryVO } from '@/apis/mark/exam'
import { computed, onMounted, ref, watch } from 'vue'
import {
  EXAM_KIND_FILTER_OPTIONS,
  examKindRequiresSource,
  GRADING_STRATEGY_LABEL,
  pageExams,
} from '@/apis/mark/exam'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { useInjectedExamCreateBasicForm } from './exam-create-context'

defineProps<{
  basicRules: Record<string, Rule[]>
}>()

const emit = defineEmits<{
  'update:basic-form-ref': [ref: FormInstance | undefined]
  'course-change': [courseId: string | null, courseName: string]
}>()
const examForm = useInjectedExamCreateBasicForm()

const formRef = ref<FormInstance>()
const sourceExamLoading = ref(false)
const sourceExamOptions = ref<Array<{ label: string, value: string }>>([])

const SOURCE_EXAM_PAGE_SIZE = 50
let sourceExamSearchTimer: ReturnType<typeof setTimeout> | undefined

const showSourceExamField = computed(() => examKindRequiresSource(examForm.examKind))
const makeupScoreLocked = computed(() => examForm.examKind === 'MAKEUP')

function handleCourseChange(courseId: string | null, option?: CourseListVO): void {
  emit('course-change', courseId, option?.courseName?.trim() ?? '')
}

function formatSourceExamLabel(exam: ExamSummaryVO): string {
  const name = exam.examNo ? `${exam.examName}（${exam.examNo}）` : exam.examName
  return name
}

function isRegularSourceExam(exam: ExamSummaryVO): boolean {
  return !exam.examKind || exam.examKind === 'REGULAR'
}

async function loadSourceExamOptions(keyword?: string): Promise<void> {
  sourceExamLoading.value = true
  try {
    const result = await pageExams({
      pageNum: 1,
      pageSize: SOURCE_EXAM_PAGE_SIZE,
      status: 'CLOSED',
      courseId: examForm.courseId ?? undefined,
      keyword: keyword?.trim() || undefined,
    })
    sourceExamOptions.value = readPageList(result, '原考试列表加载失败')
      .filter(isRegularSourceExam)
      .map((exam) => ({
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
    if (examKind === 'MAKEUP') {
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

<style scoped lang="scss">
.exam-create-form__hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}

.exam-create-form__confidential-strip {
  margin-bottom: 16px;
}
</style>
