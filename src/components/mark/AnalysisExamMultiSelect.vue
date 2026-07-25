<script setup lang="ts">
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { onMounted, ref, watch } from 'vue'
import { pageExams } from '@/apis/mark/exam'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import {
  CROSS_EXAM_TREND_MIN_AUTO_SELECT_COUNT,
  loadExamsForAcademicYearSemester,
  loadExamsForCourseAcademicYearSemester,
  loadExamsForRecentDistinctTerms,
  loadExamsForTeachingTerm,
  pickExamIdsByLargestCourseCluster,
  shouldAutoSelectAnalysisExams,
} from '@/composables/useCrossExamDefaultScope'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'AnalysisExamMultiSelect' })

const selectedExamIds = defineModel<string[]>({ required: true })

const props = withDefaults(
  defineProps<{
    placeholder?: string
    /** 首次加载后默认勾选最近 N 个学年学期内的全部考试（与 scope 互斥时 scope 优先） */
    defaultRecentSemesterCount?: number
    /** 限定候选考试仅在该课程内 */
    scopeCourseId?: string
    /** 限定候选考试须包含该班级（t_exam_class_scope，classId 来自 edu-user） */
    scopeClassId?: string
    /** 限定候选考试须命中该院系下班级范围（referenceDepartmentId 经 edu-user 解析班级 ID 后按 t_exam_class_scope 过滤） */
    scopeReferenceDepartmentId?: string
    /** 限定候选考试仅在该学年学期内（考试发生学期） */
    scopeAcademicYear?: string
    scopeSemester?: SemesterCode
    /** 限定候选考试仅在该开课学年学期内（学期成长 MANUAL 模式） */
    scopeTeachingAcademicYear?: string
    scopeTeachingSemester?: SemesterCode
    /** 与 scope 联用时是否自动勾选该学期全部考试（默认仅过滤候选池） */
    autoSelectScopedExams?: boolean
    /** 与 scope 联用时自动勾选范围内最大课程簇（≥2 场），供跨考趋势等同课程分析 */
    autoSelectLargestCourseClusterInScope?: boolean
    /** 范围未就绪时置灰，并通过 Tooltip 展示原因 */
    disabled?: boolean
    disabledTitle?: string
  }>(),
  {
    placeholder: '请选择参与分析的考试',
    defaultRecentSemesterCount: 0,
    autoSelectScopedExams: false,
    autoSelectLargestCourseClusterInScope: false,
    disabled: false,
    disabledTitle: '',
  },
)

const emit = defineEmits<{
  (e: 'selected-exams-change', value: ExamSummaryResponse[]): void
}>()

const ANALYSIS_EXAM_SEARCH_PAGE_SIZE = 50

const loading = ref(false)
const exams = ref<ExamSummaryResponse[]>([])
const examOptions = ref<{ label: string, value: string }[]>([])
const defaultScopeApplied = ref(false)
const lastSearchKeyword = ref<string>()

function hasExamOccurrenceScope(): boolean {
  return Boolean(props.scopeAcademicYear?.trim() && props.scopeSemester)
}

function hasTeachingScope(): boolean {
  return Boolean(props.scopeTeachingAcademicYear?.trim() && props.scopeTeachingSemester)
}

function buildOrgScope() {
  const orgScope: { classId?: string, referenceDepartmentId?: string } = {}
  const classId = props.scopeClassId?.trim()
  const referenceDepartmentId = props.scopeReferenceDepartmentId?.trim()
  if (classId) {
    orgScope.classId = classId
  }
  if (referenceDepartmentId) {
    orgScope.referenceDepartmentId = referenceDepartmentId
  }
  return Object.keys(orgScope).length > 0 ? orgScope : undefined
}

function formatExamTermLabel(exam: ExamSummaryResponse): string {
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

function formatExamOptionLabel(exam: ExamSummaryResponse): string {
  if (!exam.examNo) return exam.examName
  return `${exam.examName}（${exam.examNo}）`
}

function mergeExams(loaded: ExamSummaryResponse[]): void {
  const merged = new Map(exams.value.map((exam) => [exam.examId, exam]))
  loaded.forEach((exam) => merged.set(exam.examId, exam))
  exams.value = Array.from(merged.values())
  examOptions.value = exams.value.map((exam: ExamSummaryResponse) => ({
    label: [formatExamOptionLabel(exam), formatExamTermLabel(exam)].filter(Boolean).join(' · '),
    value: exam.examId,
  }))
}

function emitSelectedExamsChange(): void {
  emit(
    'selected-exams-change',
    exams.value.filter((exam) => selectedExamIds.value.includes(exam.examId)),
  )
}

function resetScopeState(): void {
  defaultScopeApplied.value = false
  selectedExamIds.value = []
  exams.value = []
  examOptions.value = []
  lastSearchKeyword.value = undefined
}

function shouldAutoSelectDefaultScope(): boolean {
  return shouldAutoSelectAnalysisExams({
    scopeAcademicYear: props.scopeAcademicYear,
    scopeSemester: props.scopeSemester,
    scopeTeachingAcademicYear: props.scopeTeachingAcademicYear,
    scopeTeachingSemester: props.scopeTeachingSemester,
    defaultRecentSemesterCount: props.defaultRecentSemesterCount,
    autoSelectScopedExams: props.autoSelectScopedExams,
    autoSelectLargestCourseClusterInScope: props.autoSelectLargestCourseClusterInScope,
  })
}

/** 解析首次自动勾选的考试 ID：最近 N 学期或 scope 内跨考趋势按最大课程簇，其余路径全选可见考试。 */
function resolveAutoSelectExamIds(loaded: ExamSummaryResponse[]): string[] {
  const useLargestCourseCluster = (
    props.defaultRecentSemesterCount > 0
    && !hasExamOccurrenceScope()
    && !hasTeachingScope()
  ) || (
    props.autoSelectLargestCourseClusterInScope
    && (hasExamOccurrenceScope() || hasTeachingScope())
  )
  if (useLargestCourseCluster) {
    const clusteredIds = pickExamIdsByLargestCourseCluster(loaded)
    return clusteredIds.length >= CROSS_EXAM_TREND_MIN_AUTO_SELECT_COUNT ? clusteredIds : []
  }
  return loaded.map((exam) => exam.examId)
}

/** 在学期范围或最近 N 学期内默认勾选可见考试。 */
async function applyDefaultExamScope(loaded: ExamSummaryResponse[]): Promise<void> {
  if (
    defaultScopeApplied.value
    || selectedExamIds.value.length > 0
    || loaded.length === 0
    || !shouldAutoSelectDefaultScope()
  ) {
    return
  }
  selectedExamIds.value = resolveAutoSelectExamIds(loaded)
  defaultScopeApplied.value = true
  emitSelectedExamsChange()
}

/** 按 scope / 最近学期 / 关键词加载考试选项。 */
async function loadExamOptions(keyword?: string): Promise<void> {
  loading.value = true
  try {
    const trimmedKeyword = keyword?.trim()
    if (trimmedKeyword) {
      const result = await pageExams({
        pageNum: 1,
        pageSize: ANALYSIS_EXAM_SEARCH_PAGE_SIZE,
        keyword: trimmedKeyword,
        courseId: props.scopeCourseId,
        ...buildOrgScope(),
        academicYear: hasTeachingScope() ? undefined : props.scopeAcademicYear,
        semester: hasTeachingScope() ? undefined : props.scopeSemester,
        teachingAcademicYear: props.scopeTeachingAcademicYear,
        teachingSemester: props.scopeTeachingSemester,
      })
      mergeExams(result.list)
      lastSearchKeyword.value = trimmedKeyword
      emitSelectedExamsChange()
      return
    }

    let scopedExams: ExamSummaryResponse[]
    const orgScope = buildOrgScope()
    if (hasTeachingScope()) {
      scopedExams = await loadExamsForTeachingTerm(
        props.scopeTeachingAcademicYear!.trim(),
        props.scopeTeachingSemester!,
        orgScope,
      )
    } else if (hasExamOccurrenceScope()) {
      if (props.scopeCourseId) {
        scopedExams = await loadExamsForCourseAcademicYearSemester(
          props.scopeCourseId,
          props.scopeAcademicYear!.trim(),
          props.scopeSemester!,
          orgScope,
        )
      } else {
        scopedExams = await loadExamsForAcademicYearSemester(
          props.scopeAcademicYear!.trim(),
          props.scopeSemester!,
          orgScope,
        )
      }
    } else if (props.defaultRecentSemesterCount > 0) {
      scopedExams = await loadExamsForRecentDistinctTerms(props.defaultRecentSemesterCount, orgScope)
    } else {
      scopedExams = await loadExamsForRecentDistinctTerms(1, orgScope)
    }

    mergeExams(scopedExams)
    lastSearchKeyword.value = undefined
    await applyDefaultExamScope(scopedExams)
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

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      resetScopeState()
      return
    }
    void loadExamOptions()
  },
)

watch(
  () => [
    props.scopeCourseId,
    props.scopeClassId,
    props.scopeReferenceDepartmentId,
    props.scopeAcademicYear,
    props.scopeSemester,
    props.scopeTeachingAcademicYear,
    props.scopeTeachingSemester,
  ],
  (next, prev) => {
    if (
      next[0] === prev?.[0]
      && next[1] === prev?.[1]
      && next[2] === prev?.[2]
      && next[3] === prev?.[3]
      && next[4] === prev?.[4]
      && next[5] === prev?.[5]
      && next[6] === prev?.[6]
    ) {
      return
    }
    resetScopeState()
    if (props.disabled === true) {
      return
    }
    void loadExamOptions()
  },
)

onMounted(() => {
  if (props.disabled !== true) {
    void loadExamOptions()
  }
})
</script>

<template>
  <div class="analysis-exam-select">
    <UiTooltip v-if="disabled" :title="disabledTitle">
      <UiSelect
        mode="multiple"
        disabled
        size="sm"
        :placeholder="placeholder"
        :model-value="[]"
        :options="[]"
      />
    </UiTooltip>
    <UiSelect
      size="sm"
      v-else
      v-model="selectedExamIds"
      mode="multiple"
      :options="examOptions"
      :loading="loading"
      :placeholder="placeholder"
      allow-search
      option-filter-prop="label"
      :filter-option="false"
      allow-clear
      max-tag-count="responsive"
      @search="handleExamSearch"
      @change="emitSelectedExamsChange"
      @dropdown-visible-change="
        (open: boolean) => {
          if (open) void loadExamOptions(lastSearchKeyword)
        }
      "
    />
  </div>
</template>

<style scoped lang="scss">
.analysis-exam-select {
  width: 100%;
  min-width: 0;

  :deep(.ui-tooltip) {
    display: block;
    width: 100%;
  }

  :deep(.ant-select) {
    width: 100%;
  }
}
</style>
