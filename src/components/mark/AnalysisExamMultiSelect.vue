<script setup lang="ts">
import type { ExamSummaryVO } from '@/apis/mark/exam'
import { pageExams } from '@/apis/mark/exam'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { onMounted, ref } from 'vue'
import { pickExamIdsFromRecentSemesters } from '@/composables/useCrossExamDefaultScope'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

defineOptions({ name: 'AnalysisExamMultiSelect' })

const selectedExamIds = defineModel<string[]>({ required: true })

const props = withDefaults(
  defineProps<{
    placeholder?: string
    /** 首次加载后默认勾选最近 N 个学年学期内的考试 */
    defaultRecentSemesterCount?: number
  }>(),
  {
    placeholder: '请选择参与分析的考试',
    defaultRecentSemesterCount: 0,
  },
)

const emit = defineEmits<{
  (e: 'selected-exams-change', value: ExamSummaryVO[]): void
}>()

const ANALYSIS_EXAM_MULTI_OPTION_PAGE_SIZE = 50

const loading = ref(false)
const exams = ref<ExamSummaryVO[]>([])
const examOptions = ref<{ label: string; value: string }[]>([])
const defaultScopeApplied = ref(false)

/** 加载当前租户考试范围，供 AI 分析卡片选择参与分析的考试实体。 */
async function loadExamOptions(keyword?: string): Promise<void> {
  loading.value = true
  try {
    const result = await pageExams({
      pageNum: 1,
      pageSize: ANALYSIS_EXAM_MULTI_OPTION_PAGE_SIZE,
      keyword: keyword?.trim() || undefined,
    })
    const loaded = readPageList(result, '考试列表加载失败，请稍后重试')
    const merged = new Map(exams.value.map((exam) => [exam.examId, exam]))
    loaded.forEach((exam) => merged.set(exam.examId, exam))
    exams.value = Array.from(merged.values())
    examOptions.value = exams.value.map((exam: ExamSummaryVO) => ({
      label: [formatExamOptionLabel(exam), formatAcademicTerm(exam)].filter(Boolean).join(' · '),
      value: exam.examId,
    }))
    if (
      !defaultScopeApplied.value &&
      !keyword?.trim() &&
      props.defaultRecentSemesterCount > 0 &&
      selectedExamIds.value.length === 0
    ) {
      const defaults = pickExamIdsFromRecentSemesters(exams.value, props.defaultRecentSemesterCount)
      if (defaults.length > 0) {
        selectedExamIds.value = defaults
        defaultScopeApplied.value = true
      }
    }
    emitSelectedExamsChange()
  } catch (error) {
    showUserError(error, '考试列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleExamSearch(keyword: string): void {
  void loadExamOptions(keyword)
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
      :filter-option="false"
      allow-clear
      max-tag-count="responsive"
      @search="handleExamSearch"
      @change="emitSelectedExamsChange"
      @dropdown-visible-change="
        (open: boolean) => {
          if (open) void loadExamOptions()
        }
      "
    />
    <a-button
      class="analysis-exam-select__reload"
      size="small"
      :loading="loading"
      title="刷新考试列表"
      @click="() => loadExamOptions()"
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
