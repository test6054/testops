<script setup lang="ts">
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { onMounted, ref, watch } from 'vue'
import { pageExams } from '@/apis/mark/exam'
import { formatAcademicYearSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { readAllPages } from '@/utils/page-result'

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

const ANALYSIS_EXAM_SEARCH_PAGE_SIZE = 50
const ANALYSIS_EXAM_LIST_PAGE_SIZE = 100

const loading = ref(false)
const examOptions = ref<{ label: string, value: string }[]>([])

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
      examOptions.value = mapExamOptions(result.list)
      return
    }
    const exams = await readAllPages(
      (pageNum) => pageExams({
        pageNum,
        pageSize: ANALYSIS_EXAM_LIST_PAGE_SIZE,
        ...orgScope,
      }),
      '考试列表加载失败',
    )
    examOptions.value = mapExamOptions(exams)
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

onMounted(loadExamOptions)
</script>

<template>
  <div class="analysis-exam-select">
    <a-select
      v-model:value="selectedExamId"
      :options="examOptions"
      :loading="loading"
      :placeholder="placeholder"
      show-search
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
