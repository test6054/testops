<script setup lang="ts">
import type { ExamSummaryVO } from '@/apis/mark/exam'
import { pageExams } from '@/apis/mark/exam'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { onMounted, ref } from 'vue'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

defineOptions({ name: 'AnalysisExamMultiSelect' })

const selectedExamIds = defineModel<string[]>({ required: true })
withDefaults(
  defineProps<{
    placeholder?: string
  }>(),
  {
    placeholder: '请选择参与分析的考试',
  },
)

const emit = defineEmits<{
  (e: 'selected-exams-change', value: ExamSummaryVO[]): void
}>()

const loading = ref(false)
const exams = ref<ExamSummaryVO[]>([])
const examOptions = ref<{ label: string; value: string }[]>([])

/** 加载当前租户考试范围，供 AI 分析卡片选择参与分析的考试实体。 */
async function loadExamOptions(): Promise<void> {
  loading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    exams.value = readPageList(result, '考试列表加载失败，请稍后重试')
    examOptions.value = exams.value.map((exam: ExamSummaryVO) => ({
      label: [formatExamOptionLabel(exam), formatAcademicTerm(exam)].filter(Boolean).join(' · '),
      value: exam.examId,
    }))
    emitSelectedExamsChange()
  } catch (error) {
    showUserError(error, '考试列表加载失败')
  } finally {
    loading.value = false
  }
}

function formatAcademicTerm(exam: ExamSummaryVO): string {
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

function formatExamOptionLabel(exam: ExamSummaryVO): string {
  if (!exam.examNo) return exam.examName
  return `${exam.examName}（${exam.examNo}）`
}

function emitSelectedExamsChange(): void {
  emit(
    'selected-exams-change',
    exams.value.filter((exam) => selectedExamIds.value.includes(exam.examId)),
  )
}

onMounted(loadExamOptions)
</script>

<template>
  <div class="analysis-exam-select">
    <a-select
      v-model:value="selectedExamIds"
      mode="multiple"
      :options="examOptions"
      :loading="loading"
      :placeholder="placeholder"
      show-search
      option-filter-prop="label"
      allow-clear
      max-tag-count="responsive"
      @change="emitSelectedExamsChange"
    />
    <a-button
      class="analysis-exam-select__reload"
      size="small"
      :loading="loading"
      title="刷新考试列表"
      @click="loadExamOptions"
    >
      <template #icon><ReloadOutlined /></template>
    </a-button>
  </div>
</template>

<style scoped lang="scss">
.analysis-exam-select {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 320px;

  :deep(.ant-select) {
    flex: 1;
    min-width: 0;
  }
}

.analysis-exam-select__reload {
  flex: 0 0 auto;
}
</style>
