<script setup lang="ts">
import type { ExamDistinctTermItemVO } from '@/apis/mark/exam'
import { listDistinctExamTerms } from '@/apis/mark/exam'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { onMounted, ref } from 'vue'
import { getSemesterDescription } from '@/types/enums/semester-enum'
import { formatAcademicYearSemesterValue } from '@/utils/academic-year'
import { showUserError } from '@/utils/error-handler'

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

const loading = ref(false)
const semesterOptions = ref<{ label: string; value: string }[]>([])
const defaultScopeApplied = ref(false)

function formatTermLabel(item: ExamDistinctTermItemVO): string {
  return `${item.academicYear} · ${getSemesterDescription(item.semester)}`
}

/** 加载 DISTINCT 考试学年学期列表，供 AI 分析卡片按业务周期选择。 */
async function loadSemesterOptions(): Promise<void> {
  loading.value = true
  try {
    const terms = await listDistinctExamTerms()
    semesterOptions.value = terms.map((item) => ({
      value: formatAcademicYearSemesterValue(item.academicYear, item.semester),
      label: formatTermLabel(item),
    }))
    if (
      !defaultScopeApplied.value &&
      props.defaultRecentSemesterCount > 0 &&
      !selectedSemesterCode.value
    ) {
      const defaultCode = semesterOptions.value.slice(0, props.defaultRecentSemesterCount)[0]?.value
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
