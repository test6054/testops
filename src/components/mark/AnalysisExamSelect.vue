<script setup lang="ts">
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import { onMounted, ref, watch } from 'vue'
import { pageExams } from '@/apis/mark/exam'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { formatAcademicYearSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'AnalysisExamSelect' })

const selectedExamId = defineModel<string | undefined>()

const props = withDefaults(
  defineProps<{
    placeholder?: string
    scopeCourseId?: string
    scopeClassId?: string
    scopeReferenceDepartmentId?: string
  }>(),
  {
    placeholder: '请选择考试',
  },
)

const emit = defineEmits<{
  (e: 'selected-exam-change', value: ExamSummaryResponse | null): void
}>()

const ANALYSIS_EXAM_SEARCH_PAGE_SIZE = 50
const ANALYSIS_EXAM_LIST_PAGE_SIZE = 100

const loading = ref(false)
const examOptions = ref<{ label: string, value: string }[]>([])
const exams = ref<ExamSummaryResponse[]>([])

function buildOrgScopeQuery() {
  const query: {
    courseId?: string
    classId?: string
    referenceDepartmentId?: string
  } = {}
  const courseId = props.scopeCourseId?.trim()
  const classId = props.scopeClassId?.trim()
  const referenceDepartmentId = props.scopeReferenceDepartmentId?.trim()
  if (courseId) {
    query.courseId = courseId
  }
  if (classId) {
    query.classId = classId
  }
  if (referenceDepartmentId) {
    query.referenceDepartmentId = referenceDepartmentId
  }
  return query
}

function formatExamOptionLabel(exam: ExamSummaryResponse): string {
  if (!exam.examNo) return exam.examName
  return `${exam.examName}（${exam.examNo}）`
}

function mapExamOptions(exams: ExamSummaryResponse[]): { label: string, value: string }[] {
  return exams.map((exam) => ({
    label: [formatExamOptionLabel(exam), formatAcademicYearSemester(exam.academicYear, exam.semester)].filter(Boolean).join(' · '),
    value: exam.examId,
  }))
}

/** 加载当前租户考试范围，供 AI 分析卡片选择单个考试实体。 */
async function loadExamOptions(keyword?: string): Promise<void> {
  loading.value = true
  try {
    const orgScope = buildOrgScopeQuery()
    const trimmedKeyword = keyword?.trim()
    if (trimmedKeyword) {
      const result = await pageExams({
        pageNum: 1,
        pageSize: ANALYSIS_EXAM_SEARCH_PAGE_SIZE,
        keyword: trimmedKeyword,
        ...orgScope,
      })
      exams.value = result.list
      examOptions.value = mapExamOptions(result.list)
      return
    }
    const result = await pageExams({
      pageNum: 1,
      pageSize: ANALYSIS_EXAM_LIST_PAGE_SIZE,
      ...orgScope,
    })
    exams.value = result.list
      examOptions.value = mapExamOptions(result.list)
  } catch (error) {
    showUserError(error, '考试列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleExamSearch(keyword: string): void {
  void loadExamOptions(keyword)
}

watch(
  () => [props.scopeCourseId, props.scopeClassId, props.scopeReferenceDepartmentId],
  () => {
    selectedExamId.value = undefined
    void loadExamOptions()
  },
)


watch(
  selectedExamId,
  (examId) => {
    if (!examId) {
      emit('selected-exam-change', null)
      return
    }
    emit('selected-exam-change', exams.value.find((item) => item.examId === examId) ?? null)
  },
)

onMounted(loadExamOptions)
</script>

<template>
  <div class="analysis-exam-select">
    <UiSelect
      size="sm"
      v-model="selectedExamId"
      :options="examOptions"
      :loading="loading"
      :placeholder="placeholder"
      allow-search
      option-filter-prop="label"
      :filter-option="false"
      allow-clear
      @search="handleExamSearch"
      @dropdown-visible-change="
        (open: boolean) => {
          if (open) void loadExamOptions()
        }
      "
    />
  </div>
</template>

<style scoped lang="scss">
.analysis-exam-select {
  width: 100%;
  min-width: 0;

  :deep(.ant-select) {
    width: 100%;
  }
}
</style>
