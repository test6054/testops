<script setup lang="ts">
import type { ExamDistinctTermItemVO } from '@/apis/mark/exam'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { listDistinctExamTerms, listDistinctTeachingExamTerms } from '@/apis/mark/exam'
import { getSemesterDescription } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'AnalysisSemesterSelect' })

const academicYear = defineModel<string | undefined>('academicYear')
const semester = defineModel<SemesterCode | undefined>('semester')

const props = withDefaults(
  defineProps<{
    yearPlaceholder?: string
    semesterPlaceholder?: string
    allowClear?: boolean
    /** 首次加载后默认选中最近 N 个学年学期（按考试时间倒序） */
    defaultRecentSemesterCount?: number
    /** EXAM_OCCURRENCE=考试发生学期；TEACHING=开课学期 */
    termSource?: 'EXAM_OCCURRENCE' | 'TEACHING'
    /** 限定 DISTINCT 学期仅含该课程下有考试的学期 */
    courseId?: string
    /** 限定 DISTINCT 学期仅含该班级考试范围内的学期（classId 来自 edu-user） */
    classId?: string
    /** 限定 DISTINCT 学期仅含该院系下班级范围涉及的考试学期（经 edu-user 解析班级后按 t_exam_class_scope 过滤） */
    referenceDepartmentId?: string
  }>(),
  {
    yearPlaceholder: '学年',
    semesterPlaceholder: '学期',
    allowClear: true,
    defaultRecentSemesterCount: 0,
    termSource: 'EXAM_OCCURRENCE',
  },
)

const loading = ref(false)
const distinctTerms = ref<ExamDistinctTermItemVO[]>([])
const defaultScopeApplied = ref(false)

const yearOptions = computed(() => {
  const seen = new Set<string>()
  const options: { label: string, value: string }[] = []
  for (const item of distinctTerms.value) {
    if (seen.has(item.academicYear)) {
      continue
    }
    seen.add(item.academicYear)
    options.push({ label: item.academicYear, value: item.academicYear })
  }
  return options
})

const semesterOptions = computed(() => {
  const year = academicYear.value?.trim()
  if (!year) {
    return []
  }
  return distinctTerms.value
    .filter(item => item.academicYear === year)
    .map(item => ({
      label: getSemesterDescription(item.semester),
      value: item.semester,
    }))
})

function applyDefaultScope(): void {
  if (
    defaultScopeApplied.value
    || props.defaultRecentSemesterCount <= 0
    || academicYear.value
    || distinctTerms.value.length === 0
  ) {
    return
  }
  const defaultTerm = distinctTerms.value[0]
  if (!defaultTerm) {
    return
  }
  academicYear.value = defaultTerm.academicYear
  semester.value = defaultTerm.semester
  defaultScopeApplied.value = true
}

/** 加载 DISTINCT 学年学期列表，供 AI 分析卡片按业务周期选择。 */
async function loadSemesterOptions(applyDefaultScopeOnLoad = false): Promise<void> {
  loading.value = true
  try {
    const request = {
      ...(props.courseId ? { courseId: props.courseId } : {}),
      ...(props.classId ? { classId: props.classId } : {}),
      ...(props.referenceDepartmentId ? { referenceDepartmentId: props.referenceDepartmentId } : {}),
    }
    distinctTerms.value = props.termSource === 'TEACHING'
      ? await listDistinctTeachingExamTerms(request)
      : await listDistinctExamTerms(request)
    if (applyDefaultScopeOnLoad) {
      applyDefaultScope()
    }
  } catch (error) {
    showUserError(error, '学年学期列表加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.courseId, props.classId, props.referenceDepartmentId],
  (next, prev) => {
    if (next[0] === prev?.[0] && next[1] === prev?.[1] && next[2] === prev?.[2]) {
      return
    }
    academicYear.value = undefined
    semester.value = undefined
    defaultScopeApplied.value = false
    void loadSemesterOptions(true)
  },
)

watch(academicYear, (year, prev) => {
  if (year === prev) {
    return
  }
  if (!year?.trim()) {
    semester.value = undefined
    return
  }
  if (
    semester.value
    && !distinctTerms.value.some(item => item.academicYear === year && item.semester === semester.value)
  ) {
    semester.value = undefined
  }
})

onMounted(() => loadSemesterOptions(true))
</script>

<template>
  <div class="analysis-semester-select">
    <a-select
      v-model:value="academicYear"
      :options="yearOptions"
      :loading="loading"
      :placeholder="yearPlaceholder"
      :allow-clear="allowClear"
      show-search
      option-filter-prop="label"
      style="width: 120px"
    />
    <a-select
      v-model:value="semester"
      :options="semesterOptions"
      :loading="loading"
      :placeholder="semesterPlaceholder"
      :allow-clear="allowClear"
      :disabled="!academicYear?.trim()"
      show-search
      option-filter-prop="label"
      style="width: 120px"
    />
    <a-button
      class="analysis-semester-select__reload"
      size="small"
      :loading="loading"
      title="刷新学年学期列表"
      @click="loadSemesterOptions(false)"
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
  min-width: 280px;
}

.analysis-semester-select__reload {
  flex: 0 0 auto;
}
</style>
