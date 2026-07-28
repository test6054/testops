<template>
  <AiAnalysisSection title="AI 学期能力成长曲线">
    <template #actions>
      <AiAnalysisHistorySelect v-model="historySelectedId" :rows="historyRows" :loading="loading" />
      <UiRadioGroup v-model="form.examScopeMode" size="sm" :options="examScopeModeOptions" />
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload"> 查看历史 </UiButton>
      <UiButton
        v-if="canManageReviewerWrites === true"
        variant="primary"
        size="sm"
        :loading="generating === true"
        @click="handleGenerate"
      >
        生成成长曲线
      </UiButton>
    </template>

    <UiFilterBar
      v-if="showGrowthFilterBar"
      v-model="growthFilterModel"
      :fields="growthFilterFields"
      variant="plain"
      show-labels
      search-text="应用"
      reset-text="清空考试"
      @search="() => {}"
      @reset="handleGrowthFilterReset"
    >
      <template #field-classId>
        <ClassSelector
          v-if="form.examScopeMode === 'AUTO'"
          v-model:value="form.classId"
          :department-id="examSelectScopeReferenceDepartmentId"
          placeholder="请选择班级"
          :allow-clear="false"
          width="100%"
        />
        <UiSelect
          size="sm"
          v-else
          v-model="form.classId"
          :options="classOptions"
          :loading="classLoading"
          placeholder="请选择所选考试共有班级"
          allow-search
          option-filter-prop="label"
          allow-clear
        />
      </template>
      <template #field-examIds>
        <AnalysisExamMultiSelect
          v-model="form.examIds"
          :disabled="growthExamSelectReady !== true"
          disabled-title="请先在上方范围栏选择学年与学期"
          :scope-course-id="examSelectScopeCourseId"
          :scope-teaching-academic-year="effectiveTeachingAcademicYear"
          :scope-teaching-semester="effectiveTeachingSemester"
          :scope-class-id="examSelectScopeClassId"
          :scope-reference-department-id="examSelectScopeReferenceDepartmentId"
          placeholder="请选择至少 2 场考试"
          @selected-exams-change="selectedExams = $event"
        />
      </template>
    </UiFilterBar>

    <UiSkeletonState v-if="loading || generating" variant="card" compact />
    <div v-else class="ai-analysis-section__body ai-analysis-section__body--flush">
      <div v-if="record?.growthSummary || record?.growthTrend" class="ai-analysis-summary-row">
        <p v-if="record?.growthSummary" class="ai-analysis-summary">{{ record.growthSummary }}</p>
        <UiTag v-if="record?.growthTrend" :tone="trendColor(record.growthTrend)" size="sm">
          {{ trendLabel(record.growthTrend) }}
        </UiTag>
      </div>

      <MarkTrendSection
        title="学期考试得分走势"
        :hint="examTrendHint"
        :point-count="examStatTrendPoints.length"
        :option="examTrendChartOption"
        height="280px"
        :last-value="examTrendLastValue"
        value-unit="%"
      />

      <MarkBarSection
        title="能力点起止对比"
        :hint="growthBarHint"
        :item-count="growthBarItems.length"
        :option="growthBarChartOption"
        height="280px"
      />

      <div v-if="growthItems.length > 0" class="ai-profile-block">
        <h5 class="ai-profile-block__title">各阶段能力点</h5>
        <div class="ai-profile-diagnosis-list">
          <div v-for="(item, index) in growthItems" :key="index" class="ai-profile-diagnosis-item">
            <div class="diagnosis-header">
              <span class="diagnosis-type">{{
                item.dimensionLabel || item.dimension || '能力点'
              }}</span>
              <span v-if="item.changeRate != null" class="diagnosis-rate">
                变化 {{ formatRate(item.changeRate) }}
              </span>
            </div>
            <p v-if="item.description" class="diagnosis-text">{{ item.description }}</p>
            <p
              v-if="item.startValue != null || item.endValue != null"
              class="diagnosis-text diagnosis-text--muted"
            >
              起止值：{{ growthValueText(item.startValue) }} / {{ growthValueText(item.endValue) }}
            </p>
            <p v-if="item.improvementNote" class="diagnosis-text diagnosis-text--hint">
              {{ item.improvementNote }}
            </p>
            <p v-if="item.riskNote" class="diagnosis-text">{{ item.riskNote }}</p>
          </div>
        </div>
      </div>

      <AiAnalysisMetaCollapse
        v-if="record"
        :record="record"
        failure-fallback="AI 学期能力成长分析未完成，可重新生成"
        :extra-items="metaExtraItems"
      />
    </div>
  </AiAnalysisSection>
</template>

<script lang="ts" setup>
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type {
  SemesterAbilityGrowthResponse,
  SemesterGrowthTrendCode,
} from '@/apis/mark/cross-exam-analysis'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { BadgeTone, FilterField, UiSelectOption } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  AnalysisScopeTypeCode,
  AnalysisScopeTypeDescription,
} from '@/apis/mark/analysis-scope-type'
import {
  generateClassGrowth,
  listCommonClassScopes,
  listGrowth,
  SEMESTER_GROWTH_TREND_TONE,
  SemesterGrowthTrendDescription,
} from '@/apis/mark/cross-exam-analysis'
import { pageExams } from '@/apis/mark/exam'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AiAnalysisHistorySelect from '@/components/mark/analysis/AiAnalysisHistorySelect.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { useAiAnalysisHistoryPicker } from '@/composables/useAiAnalysisHistoryPicker'
import { useExamSummariesReviewerWriteCapability } from '@/composables/useExamIdsReviewerWriteCapability'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { formatSemester } from '@/types/enums/semester-enum'
import {
  buildRequiredAcademicYearSemesterQuery,
  ensureRequiredAcademicYearSemester,
} from '@/utils/academic-year-semester-query'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  buildBarChartInsight,
  buildTrendChartInsight,
  mergeChartHint,
} from '@/utils/mark-chart-insights'
import {
  buildCategoryBarChartOption,
  buildTrendLineChartOption,
} from '@/utils/mark-echarts-options'
import {
  examStatSnapshotsToTrendPoints,
  growthItemsToBarItems,
} from '@/utils/mark-statistics-chart'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'SemesterGrowthCard' })

const props = withDefaults(
  defineProps<{
    drillClassId?: string | null
    drillClassLabel?: string
    scopeReferenceDepartmentId?: string | null
    scopeOrgCourseId?: string | null
    scopeOrgClassId?: string | null
    scopeAcademicYear?: string
    scopeSemester?: SemesterCode
  }>(),
  {
    drillClassId: null,
    drillClassLabel: '',
    scopeReferenceDepartmentId: null,
    scopeOrgCourseId: null,
    scopeOrgClassId: null,
    scopeAcademicYear: undefined,
    scopeSemester: undefined,
  },
)

const examScopeModeOptions: UiSelectOption[] = [
  { label: '自动选考', value: 'AUTO' },
  { label: '手动选考', value: 'MANUAL' },
]

interface SemesterGrowthForm {
  examScopeMode: 'AUTO' | 'MANUAL'
  classId: string
  examIds: string[]
}

const form = reactive<SemesterGrowthForm>({
  examScopeMode: 'AUTO',
  classId: '',
  examIds: [],
})

const effectiveTeachingAcademicYear = computed(() => props.scopeAcademicYear?.trim() || '')
const effectiveTeachingSemester = computed(() => props.scopeSemester)

const {
  records: historyRecords,
  selectedId: historySelectedId,
  record,
  clearHistory,
  applyLoadedList,
  adoptGenerated,
} = useAiAnalysisHistoryPicker<SemesterAbilityGrowthResponse>()

const historyRows = computed(() =>
  historyRecords.value.map((item) => ({
    id: item.id,
    createTime: item.createTime,
    analysisStatus: item.analysisStatus,
    examCount: item.examCount,
    academicYear: item.academicYear,
    semester: item.semester,
    extraHint: item.scopeName?.trim() || undefined,
  })),
)

const selectedExams = ref<ExamSummaryResponse[]>([])
const classOptions = ref<{ label: string, value: string }[]>([])
const classLoading = ref(false)
const loading = ref(false)
const generating = ref(false)

const growthItems = computed(() => record.value?.growthItems ?? [])
const examStatTrendPoints = computed(() =>
  examStatSnapshotsToTrendPoints(record.value?.examStatSnapshots ?? []),
)
const growthBarItems = computed(() => growthItemsToBarItems(record.value?.growthItems ?? []))

const examTrendHint = computed(() =>
  mergeChartHint('按考试时间序列展示得分率', buildTrendChartInsight(examStatTrendPoints.value)),
)

const growthBarHint = computed(() =>
  mergeChartHint('各能力维度结束值，悬停查看起止对照', buildBarChartInsight(growthBarItems.value)),
)

const examTrendLastValue = computed(() => {
  const points = examStatTrendPoints.value
  if (points.length === 0) {
    return null
  }
  return Number(points[points.length - 1]?.value)
})

const { chartOption: examTrendChartOption } = useChartOption(() =>
  buildTrendLineChartOption(examStatTrendPoints.value, {
    yAxisName: '得分率 %',
    yMax: 100,
    area: true,
    emptyText: '至少需要 2 场考试才能展示走势',
  }),
)

const { chartOption: growthBarChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(growthBarItems.value, {
    orientation: 'vertical',
    yAxisName: '成长值',
    emptyText: '暂无学期成长数据',
  }),
)

const selectedCourseIds = computed(() => {
  const courseIds = new Set<string>()
  for (const examId of form.examIds) {
    const matched = selectedExams.value.find((exam) => exam.examId === examId)
    if (matched?.courseId) {
      courseIds.add(matched.courseId)
    }
  }
  return Array.from(courseIds)
})

const examSelectScopeClassId = computed(() => {
  const orgClassId = props.scopeOrgClassId?.trim()
  if (orgClassId) {
    return orgClassId
  }
  const drillId = props.drillClassId?.trim()
  if (drillId) {
    return drillId
  }
  if (form.classId.trim()) {
    return form.classId.trim()
  }
  return undefined
})

const examSelectScopeCourseId = computed(() => props.scopeOrgCourseId?.trim() || undefined)

const examSelectScopeReferenceDepartmentId = computed(
  () => props.scopeReferenceDepartmentId?.trim() || undefined,
)

const effectiveClassId = computed(() => examSelectScopeClassId.value?.trim() || '')

const effectiveCourseId = computed(() => examSelectScopeCourseId.value?.trim() || '')

const showGrowthClassField = computed(() => {
  if (props.scopeOrgClassId?.trim()) {
    return false
  }
  if (form.examScopeMode === 'AUTO') {
    return true
  }
  return form.examIds.length > 0
})

const showGrowthFilterBar = computed(
  () => form.examScopeMode === 'MANUAL' || showGrowthClassField.value,
)

const growthExamSelectReady = computed(() =>
  Boolean(effectiveTeachingAcademicYear.value && effectiveTeachingSemester.value),
)

const growthFilterFields = computed<FilterField[]>(() => {
  const fields: FilterField[] = []
  if (showGrowthClassField.value) {
    fields.push({
      key: 'classId',
      type: 'custom',
      label: '班级',
      width: 200,
      minWidth: 180,
      maxWidth: 240,
    })
  }
  if (form.examScopeMode === 'MANUAL') {
    fields.push({
      key: 'examIds',
      type: 'custom',
      label: '参与考试',
      flex: 1,
      minWidth: 360,
      maxWidth: 9999,
    })
  }
  return fields
})

const growthFilterModel = computed<Record<string, unknown>>({
  get: () => ({
    classId: form.classId,
    examIds: form.examIds,
  }),
  set: () => {},
})

function handleGrowthFilterReset(): void {
  form.examIds = []
  form.classId = props.scopeOrgClassId?.trim() ?? ''
  selectedExams.value = []
  classOptions.value = []
  clearHistory()
}

const metaExtraItems = computed(() => {
  const value = record.value
  if (!value) {
    return []
  }
  return [
    {
      label: '开课学年',
      value: value.academicYear?.trim() || '—',
    },
    {
      label: '开课学期',
      value: value.semester ? formatSemester(value.semester) : '—',
    },
    {
      label: '分析范围',
      value: `${scopeTypeLabel(value.scopeType)} · ${value.scopeName?.trim() || '—'}`,
    },
    { label: '考试数', value: String(value.examCount ?? '—') },
    { label: '考试范围', value: examScopeSummary(value) },
  ]
})

function examScopeSummary(value: SemesterAbilityGrowthResponse): string {
  if (!value.exams.length) {
    return '无考试范围'
  }
  return value.exams
    .map(
      (exam) =>
        `${exam.examName ?? exam.examId}${exam.examTime ? ` · ${formatDateTime(exam.examTime)}` : ''}`,
    )
    .join('；')
}

/** 将父级班级钻取同步到班级筛选，并在选项未加载时注入班级标签。 */
function applyDrillClassSelection(): void {
  const classId = props.drillClassId?.trim()
  if (!classId) {
    return
  }
  if (classOptions.value.some((option) => option.value === classId)) {
    form.classId = classId
    return
  }
  const label = props.drillClassLabel?.trim()
  if (label) {
    classOptions.value = [{ value: classId, label }, ...classOptions.value]
    form.classId = classId
  }
}

watch(
  () => props.scopeOrgClassId,
  (classId) => {
    if (!classId?.trim()) {
      return
    }
    form.classId = classId.trim()
    applyDrillClassSelection()
  },
  { immediate: true },
)

watch(
  () => props.drillClassId,
  (classId) => {
    if (!classId) {
      form.classId = ''
      return
    }
    applyDrillClassSelection()
  },
  { immediate: true },
)

watch(
  () => [props.scopeAcademicYear, props.scopeSemester] as const,
  () => {
    clearHistory()
    if (form.examScopeMode !== 'MANUAL') {
      return
    }
    form.examIds = []
    selectedExams.value = []
  },
)

watch(
  () => form.examScopeMode,
  (mode) => {
    clearHistory()
    if (mode === 'AUTO') {
      form.examIds = []
      selectedExams.value = []
      classOptions.value = []
      classLoading.value = false
      form.classId = props.scopeOrgClassId?.trim() ?? ''
      return
    }
    if (!props.scopeOrgClassId?.trim()) {
      form.classId = ''
    }
  },
)

watch(
  () => form.classId,
  () => {
    clearHistory()
  },
)

watch(
  () => [...form.examIds],
  async (examIds) => {
    if (form.examScopeMode !== 'MANUAL') {
      return
    }
    form.classId = ''
    classOptions.value = []
    if (examIds.length === 0) {
      return
    }
    if (props.scopeOrgClassId?.trim()) {
      form.classId = props.scopeOrgClassId.trim()
      return
    }
    classLoading.value = true
    try {
      const classRefs = await listCommonClassScopes(examIds)
      classOptions.value = classRefs.map((classRef) => ({
        value: classRef.classId,
        label: classRef.className,
      }))
      if (classOptions.value.length === 0 && examIds.length > 0) {
        showFormValidationMessage('所选考试没有共同班级，请调整考试范围')
      }
      applyDrillClassSelection()
    } catch (e) {
      showUserError(e, '考试班级范围加载失败')
    } finally {
      classLoading.value = false
    }
  },
)

async function reload(): Promise<void> {
  if (
    !ensureRequiredAcademicYearSemester(
      effectiveTeachingAcademicYear.value,
      effectiveTeachingSemester.value,
    )
  ) {
    return
  }
  const termQuery = buildRequiredAcademicYearSemesterQuery(
    effectiveTeachingAcademicYear.value,
    effectiveTeachingSemester.value,
  )
  if (!termQuery) {
    return
  }
  if (!effectiveClassId.value) {
    showFormValidationMessage('请选择班级')
    return
  }
  loading.value = true
  try {
    const list = await listGrowth({
      teachingAcademicYear: termQuery.academicYear,
      teachingSemester: termQuery.semester,
      scopeType: AnalysisScopeTypeCode.CLASS,
      scopeId: effectiveClassId.value,
    })
    const count = applyLoadedList(list)
    if (count === 0) void message.info('暂无历史记录')
  } catch (e) {
    showUserError(e, '学期成长曲线加载失败')
  } finally {
    loading.value = false
  }
}

/** AUTO 模式按开课学期候选考试摘要计算写能力；MANUAL 用已选考试 */
const autoScopedExamSummaries = ref<ExamSummaryResponse[]>([])

const capabilityExamIds = computed(() => {
  if (form.examScopeMode === 'AUTO') {
    return autoScopedExamSummaries.value
      .map((exam) => exam.examId)
      .filter((examId): examId is string => Boolean(examId))
  }
  return form.examIds
})

const capabilityExamSummaries = computed(() =>
  form.examScopeMode === 'AUTO' ? autoScopedExamSummaries.value : selectedExams.value,
)

/** MVR-286：默认拒绝假可写；所选/自动候选考试均须 canManageReviewerWrites */
const { canManageReviewerWrites } = useExamSummariesReviewerWriteCapability(
  capabilityExamIds,
  capabilityExamSummaries,
)

async function refreshAutoScopedExamSummaries(): Promise<void> {
  if (form.examScopeMode !== 'AUTO') {
    autoScopedExamSummaries.value = []
    return
  }
  const teachingYear = effectiveTeachingAcademicYear.value?.trim()
  const teachingSemester = effectiveTeachingSemester.value
  const courseId = effectiveCourseId.value?.trim()
  if (!teachingYear || !teachingSemester) {
    autoScopedExamSummaries.value = []
    return
  }
  try {
    const page = await pageExams({
      pageNum: 1,
      pageSize: 100,
      teachingAcademicYear: teachingYear,
      teachingSemester,
      ...(courseId ? { courseId } : {}),
      ...(effectiveClassId.value?.trim() ? { classId: effectiveClassId.value.trim() } : {}),
      ...(props.scopeReferenceDepartmentId?.trim()
        ? { referenceDepartmentId: props.scopeReferenceDepartmentId.trim() }
        : {}),
    })
    autoScopedExamSummaries.value = page.list ?? []
  } catch {
    autoScopedExamSummaries.value = []
  }
}

watch(
  () => [
    form.examScopeMode,
    effectiveTeachingAcademicYear.value,
    effectiveTeachingSemester.value,
    effectiveCourseId.value,
    effectiveClassId.value,
    props.scopeReferenceDepartmentId,
  ],
  () => {
    void refreshAutoScopedExamSummaries()
  },
  { immediate: true },
)

async function handleGenerate(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    showUserError(null, '仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  if (generating.value === true) return
  if (
    !ensureRequiredAcademicYearSemester(
      effectiveTeachingAcademicYear.value,
      effectiveTeachingSemester.value,
    )
  ) {
    return
  }
  const termQuery = buildRequiredAcademicYearSemesterQuery(
    effectiveTeachingAcademicYear.value,
    effectiveTeachingSemester.value,
  )
  if (!termQuery) {
    return
  }
  if (!effectiveClassId.value) {
    showFormValidationMessage('请选择班级')
    return
  }
  const { academicYear: teachingAcademicYear, semester: teachingSemester } = termQuery

  if (form.examScopeMode === 'AUTO') {
    if (!effectiveCourseId.value) {
      showFormValidationMessage('请先在上方范围栏选择课程')
      return
    }
    generating.value = true
    try {
      const generated = await generateClassGrowth({
        teachingAcademicYear,
        teachingSemester,
        courseId: effectiveCourseId.value,
        classId: effectiveClassId.value,
        examIds: [],
        autoSelectExams: true,
      })
      adoptGenerated(generated)
      void message.success('已按开课学期自动选考并生成成长曲线')
    } catch (e) {
      showUserError(e, '学期成长曲线生成失败')
    } finally {
      generating.value = false
    }
    return
  }

  if (selectedCourseIds.value.length > 1) {
    showFormValidationMessage('请选择同一课程下的考试')
    return
  }
  const courseId = selectedCourseIds.value[0] ?? ''
  const classId = effectiveClassId.value
  const examIds = form.examIds
  if (!courseId) {
    showFormValidationMessage('请选择同一课程下的考试')
    return
  }
  if (examIds.length < 2) {
    showFormValidationMessage('至少需要选择 2 场考试')
    return
  }
  generating.value = true
  try {
    const generated = await generateClassGrowth({
      teachingAcademicYear,
      teachingSemester,
      courseId,
      classId,
      examIds,
      autoSelectExams: false,
    })
    adoptGenerated(generated)
    void message.success('已生成成长曲线')
  } catch (e) {
    showUserError(e, '学期成长曲线生成失败')
  } finally {
    generating.value = false
  }
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function trendLabel(trend: SemesterGrowthTrendCode): string {
  return strictEnumLabel(SemesterGrowthTrendDescription, trend, '学期能力成长趋势')
}

function trendColor(trend: SemesterGrowthTrendCode): BadgeTone {
  return strictEnumTone(SEMESTER_GROWTH_TREND_TONE, trend, '学期能力成长趋势')
}

function scopeTypeLabel(scopeType: SemesterAbilityGrowthResponse['scopeType']): string {
  return strictEnumLabel(AnalysisScopeTypeDescription, scopeType, '分析范围类型')
}

function growthValueText(value: number | undefined): string {
  return String(value)
}
</script>

<style lang="scss" scoped>
.ai-analysis-summary-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
}
.diagnosis-header {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}
.diagnosis-rate {
  margin-left: auto;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
.diagnosis-type {
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
}
.diagnosis-text {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
  color: var(--dp-text-secondary);
}
.diagnosis-text--hint {
  color: var(--dp-text-primary);
}
.diagnosis-text--muted {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
</style>
