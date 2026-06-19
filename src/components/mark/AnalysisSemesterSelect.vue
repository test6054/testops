<script setup lang="ts">
import type { ExamSummaryVO } from '@/apis/mark/exam'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { onMounted, ref } from 'vue'
import { pageExams } from '@/apis/mark/exam'
import { pickDefaultSemesterCode } from '@/composables/useCrossExamDefaultScope'
import { getSemesterDescription } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { readAllPages } from '@/utils/page-result'

defineOptions({ name: 'AnalysisSemesterSelect' })

const selectedSemesterCode = defineModel<string | undefined>()

const props = withDefaults(
  defineProps<{
    placeholder?: string
    allowClear?: boolean
    /** 首次加载后默认选中最近 N 个学年学期（按考试时间倒序） */
    defaultRecentSemesterCount?: number
  }>(),
  {
    placeholder: '请选择学年学期',
    allowClear: true,
    defaultRecentSemesterCount: 0,
  },
)

const ANALYSIS_SEMESTER_EXAM_PAGE_SIZE = 100

const loading = ref(false)
const semesterOptions = ref<{ label: string, value: string }[]>([])
const defaultScopeApplied = ref(false)

/** 加载考试中的学年学期范围，供 AI 分析卡片按业务周期选择。 */
async function loadSemesterOptions(): Promise<void> {
  loading.value = true
  try {
    const termMap = new Map<string, string>()
    const exams = await readAllPages(
      (pageNum) => pageExams({
        pageNum,
        pageSize: ANALYSIS_SEMESTER_EXAM_PAGE_SIZE,
      }),
      '考试列表加载失败，请稍后重试',
    )
    exams.forEach((exam: ExamSummaryVO) => {
      if (!exam.academicYear || !exam.semester) return
      const value = `${exam.academicYear}-${exam.semester}`
      termMap.set(value, `${exam.academicYear} · ${getSemesterDescription(exam.semester)}`)
    })
    semesterOptions.value = Array.from(termMap.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((left, right) => right.value.localeCompare(left.value))
    if (
      !defaultScopeApplied.value
      && props.defaultRecentSemesterCount > 0
      && !selectedSemesterCode.value
    ) {
      const defaultCode = pickDefaultSemesterCode(exams, props.defaultRecentSemesterCount)
      if (defaultCode) {
        selectedSemesterCode.value = defaultCode
        defaultScopeApplied.value = true
      }
    }
  } catch (error) {
    showUserError(error, '学年学期列表加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadSemesterOptions)
</script>

<template>
  <div class="analysis-semester-select">
    <a-select
      v-model:value="selectedSemesterCode"
      :options="semesterOptions"
      :loading="loading"
      :placeholder="placeholder"
      :allow-clear="allowClear"
      show-search
      option-filter-prop="label"
    />
    <a-button
      class="analysis-semester-select__reload"
      size="small"
      :loading="loading"
      title="刷新学年学期列表"
      @click="loadSemesterOptions"
    >
      <template #icon><ReloadOutlined /></template>
    </a-button>
  </div>
</template>

<style scoped lang="scss">
.analysis-semester-select {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;

  :deep(.ant-select) {
    flex: 1;
    min-width: 0;
  }
}

.analysis-semester-select__reload {
  flex: 0 0 auto;
}
</style>
