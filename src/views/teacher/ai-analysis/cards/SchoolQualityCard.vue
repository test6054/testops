<template>
  <AiAnalysisSection title="AI 校级质量分析">
    <template #actions>
      <AiAnalysisHistorySelect v-model="historySelectedId" :rows="historyRows" :loading="loading" />
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload"> 查看历史 </UiButton>
      <UiButton
        v-if="canManageReviewerWrites === true" variant="primary" size="sm" :loading="generating" @click="handleGenerate"
      >
        生成分析
      </UiButton>
    </template>

    <UiFilterBar
      v-model="qualityFilterModel"
      :fields="qualityFilterFields"
      variant="plain"
      show-labels
      search-text="应用"
      reset-text="清空考试"
      @search="() => {}"
      @reset="handleQualityFilterReset"
    >
      <template #field-examIds>
        <AnalysisExamMultiSelect
          v-model="form.examIds"
          :disabled="!examSelectReady"
          :disabled-title="examSelectHint"
          :scope-course-id="examSelectScopeCourseId"
          :scope-class-id="examSelectScopeClassId"
          :scope-reference-department-id="examSelectScopeReferenceDepartmentId"
          :scope-academic-year="effectiveAcademicYear"
          :scope-semester="effectiveSemester"
          :auto-select-scoped-exams="examSelectAutoSelectScoped"
          placeholder="请选择至少 2 场考试"
          @selected-exams-change="selectedExams = $event"
        />
      </template>
    </UiFilterBar>

    <UiSkeletonState v-if="loading || generating" variant="card" compact />
    <div v-else class="ai-analysis-section__body ai-analysis-section__body--flush">
      <SignalBand
        v-if="record"
        :metrics="qualitySignalMetrics"
        compact
        variant="inline"
      />

      <p v-if="record?.qualitySummary" class="ai-analysis-summary">{{ record.qualitySummary }}</p>

      <MarkTrendSection
        title="参与考试得分走势"
        :hint="examTrendHint"
        :point-count="examStatTrendPoints.length"
        :option="examTrendChartOption"
        height="320px"
        :last-value="examTrendLastValue"
        value-unit="%"
      />

      <div v-if="qualityItems.length > 0" class="ai-profile-block">
        <h5 class="ai-profile-block__title">分项评估</h5>
        <div class="ai-profile-diagnosis-list">
          <div v-for="(item, index) in qualityItems" :key="index" class="ai-profile-diagnosis-item">
            <div class="diagnosis-header">
              <span class="diagnosis-type">{{ qualityItemTitle(item) }}</span>
              <UiTag v-if="item.rating" :tone="qualityRatingColor(item.rating)" size="sm">
                {{ qualityRatingLabel(item.rating) }}
              </UiTag>
              <span v-if="item.metricValue != null" class="diagnosis-rate">
                {{ item.metricValue.toFixed(2) }}
              </span>
            </div>
            <p v-if="item.description" class="diagnosis-text">{{ item.description }}</p>
            <p v-if="item.baselineComparison" class="diagnosis-text diagnosis-text--muted">
              基线对比：{{ item.baselineComparison }}
            </p>
            <p v-if="item.suggestion" class="diagnosis-text diagnosis-text--hint">
              {{ item.suggestion }}
            </p>
          </div>
        </div>
      </div>

      <AiAnalysisMetaCollapse
        v-if="record"
        :record="record"
        failure-fallback="AI 校级质量分析未完成，请核对考试范围后重新生成"
        :extra-items="metaExtraItems"
      />
    </div>
  </AiAnalysisSection>
</template>

<script lang="ts" setup>
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { SchoolQualityAnalysisResponse, SchoolQualityItemResponse, SchoolQualityRatingCode } from '@/apis/mark/school-quality'
import type { BadgeTone, FilterField, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, toRef, watch } from 'vue'
import {
  generateQualityAnalysis,
  listQualityAnalysis,
  SCHOOL_QUALITY_DIMENSION_OPTIONS,
  SCHOOL_QUALITY_RATING_TONE,
  SchoolQualityDimensionCode,
  SchoolQualityDimensionDescription,
  SchoolQualityItemDimensionDescription,
  SchoolQualityRatingDescription,
} from '@/apis/mark/school-quality'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AiAnalysisHistorySelect from '@/components/mark/analysis/AiAnalysisHistorySelect.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useAiAnalysisHistoryPicker } from '@/composables/useAiAnalysisHistoryPicker'
import { useExamSummariesReviewerWriteCapability } from '@/composables/useExamIdsReviewerWriteCapability'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { formatSemester } from '@/types/enums/semester-enum'
import {
  buildOptionalAcademicYearSemesterQuery,
  buildRequiredAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
  ensureRequiredAcademicYearSemester,
} from '@/utils/academic-year-semester-query'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildTrendChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildTrendLineChartOption } from '@/utils/mark-echarts-options'
import { examStatSnapshotsToTrendPoints } from '@/utils/mark-statistics-chart'
import { scoreTone } from '@/utils/score-tone'
import { computeTrendPointDelta, toSignalMetrics } from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'SchoolQualityCard' })

const props = withDefaults(
  defineProps<{
    scopeReferenceDepartmentId?: string | null
    scopeOrgCourseId?: string | null
    scopeOrgClassId?: string | null
    scopeAcademicYear?: string
    scopeSemester?: SemesterCode
  }>(),
  {
    scopeReferenceDepartmentId: null,
    scopeOrgCourseId: null,
    scopeOrgClassId: null,
    scopeAcademicYear: undefined,
    scopeSemester: undefined,
  },
)

const effectiveAcademicYear = toRef(() => props.scopeAcademicYear)
const effectiveSemester = toRef(() => props.scopeSemester)

interface SchoolQualityForm {
  analysisDimension: SchoolQualityDimensionCode
  dimensionId: string
  examIds: string[]
}
const form = reactive<SchoolQualityForm>({
  analysisDimension: SchoolQualityDimensionCode.COURSE,
  dimensionId: '',
  examIds: [],
})

const selectedExams = ref<ExamSummaryResponse[]>([])

const {
  records: historyRecords,
  selectedId: historySelectedId,
  record,
  clearHistory,
  applyLoadedList,
  adoptGenerated,
} = useAiAnalysisHistoryPicker<SchoolQualityAnalysisResponse>()

const historyRows = computed(() =>
  historyRecords.value.map((item) => ({
    id: item.id,
    createTime: item.createTime,
    analysisStatus: item.analysisStatus,
    examCount: item.examCount,
    academicYear: item.academicYear,
    semester: item.semester,
    extraHint: `${schoolQualityDimensionLabel(item.analysisDimension)} · ${item.dimensionName ?? '—'}`,
  })),
)

const loading = ref(false)
const generating = ref(false)

const examSelectScopeCourseId = computed(() => props.scopeOrgCourseId?.trim() || undefined)
const examSelectScopeClassId = computed(() => props.scopeOrgClassId?.trim() || undefined)
const examSelectScopeReferenceDepartmentId = computed(
  () => props.scopeReferenceDepartmentId?.trim() || undefined,
)
const examSelectAutoSelectScoped = computed(
  () =>
    form.analysisDimension === SchoolQualityDimensionCode.SEMESTER
    || form.analysisDimension === SchoolQualityDimensionCode.COURSE,
)
const examSelectReady = computed(() => {
  if (!effectiveAcademicYear.value || !effectiveSemester.value) {
    return false
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && !props.scopeOrgCourseId?.trim()) {
    return false
  }
  return !(form.analysisDimension === SchoolQualityDimensionCode.CLASS && !props.scopeOrgClassId?.trim())
})

const qualityFilterFields = computed<FilterField[]>(() => [
  {
    key: 'analysisDimension',
    type: 'select',
    label: '分析维度',
    width: 140,
    minWidth: 120,
    maxWidth: 160,
    allowClear: false,
    triggerSearchOnChange: true,
    options: SCHOOL_QUALITY_DIMENSION_OPTIONS.map((item) => ({
      label: item.label,
      value: item.value,
    })),
  },
  {
    key: 'examIds',
    type: 'custom',
    label: '参与考试',
    flex: 1,
    minWidth: 360,
    maxWidth: 9999,
  },
])

const qualityFilterModel = computed<Record<string, unknown>>({
  get: () => ({
    analysisDimension: form.analysisDimension,
    examIds: form.examIds,
  }),
  set: (value) => {
    if (value.analysisDimension !== undefined) {
      form.analysisDimension = value.analysisDimension as SchoolQualityDimensionCode
    }
    if (value.examIds !== undefined && Array.isArray(value.examIds)) {
      form.examIds = value.examIds.map((item) => String(item))
    }
  },
})

function handleQualityFilterReset(): void {
  form.examIds = []
  clearHistory()
}

const examSelectHint = computed(() => {
  if (!effectiveAcademicYear.value || !effectiveSemester.value) {
    return '请先在上方范围栏选择学年与学期'
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && !props.scopeOrgCourseId?.trim()) {
    return '课程维度请先在上方范围栏选择课程'
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS && !props.scopeOrgClassId?.trim()) {
    return '班级维度请先在上方范围栏选择班级'
  }
  return '请选择至少 2 场考试'
})

const qualityItems = computed(() => record.value?.qualityItems ?? [])
const examStatTrendPoints = computed(() =>
  examStatSnapshotsToTrendPoints(record.value?.examStatSnapshots ?? []),
)

const examTrendHint = computed(() =>
  mergeChartHint('多考试对比：得分率走势', buildTrendChartInsight(examStatTrendPoints.value)),
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

const qualityMetrics = computed((): UiStatPanelItem[] => {
  if (!record.value) return []
  const data = record.value
  return [
    {
      key: 'teachingQualityScore',
      label: '教学质量',
      value: data.teachingQualityScore != null ? data.teachingQualityScore.toFixed(1) : '—',
      tone: data.teachingQualityScore != null ? scoreTone(data.teachingQualityScore) : 'gray',
    },
    {
      key: 'questionQualityScore',
      label: '命题质量',
      value: data.questionQualityScore != null ? data.questionQualityScore.toFixed(1) : '—',
      tone: data.questionQualityScore != null ? scoreTone(data.questionQualityScore) : 'gray',
    },
    {
      key: 'markingQualityScore',
      label: '阅卷质量',
      value: data.markingQualityScore != null ? data.markingQualityScore.toFixed(1) : '—',
      tone: data.markingQualityScore != null ? scoreTone(data.markingQualityScore) : 'gray',
    },
  ]
})

const qualitySignalMetrics = computed<SignalMetric[]>(() => {
  const scoreRateTrend = computeTrendPointDelta(examStatTrendPoints.value)
  return toSignalMetrics(qualityMetrics.value).map((metric) =>
    metric.key === 'teachingQualityScore'
      ? { ...metric, trend: scoreRateTrend, trendPolarity: 'positive' }
      : metric,
  )
})

const metaExtraItems = computed(() => {
  const value = record.value
  if (!value) {
    return []
  }
  return [
    {
      label: '分析维度',
      value: `${schoolQualityDimensionLabel(value.analysisDimension)} / ${value.dimensionName}`,
    },
    {
      label: '学年',
      value: value.academicYear?.trim() || '未限定',
    },
    {
      label: '学期',
      value: value.semester ? formatSemester(value.semester) : '未限定',
    },
    { label: '考试数', value: String(value.examCount ?? '—') },
    { label: '考试范围', value: examScopeSummary(value) },
  ]
})

function examScopeSummary(value: SchoolQualityAnalysisResponse): string {
  if (!value.exams?.length) {
    return '—'
  }
  return value.exams
    .map(
      (exam) =>
        `${exam.examName ?? exam.examId}${exam.examTime ? ` · ${formatDateTime(exam.examTime)}` : ''}`,
    )
    .join('；')
}

function qualityRatingLabel(rating: SchoolQualityRatingCode): string {
  return strictEnumLabel(SchoolQualityRatingDescription, rating, '校级质量评价等级')
}

function qualityRatingColor(rating: SchoolQualityRatingCode): BadgeTone {
  return strictEnumTone(SCHOOL_QUALITY_RATING_TONE, rating, '校级质量评价等级')
}

function qualityItemTitle(item: SchoolQualityItemResponse): string {
  if (item.qualityDimension) {
    return strictEnumLabel(SchoolQualityItemDimensionDescription, item.qualityDimension, '质量维度')
  }
  return item.metricName || '质量指标'
}

watch(
  () => form.analysisDimension,
  () => {
    syncDimensionFromPageScope()
    form.examIds = []
    clearHistory()
  },
)

watch(
  () => [props.scopeOrgCourseId, props.scopeOrgClassId] as const,
  () => {
    syncDimensionFromPageScope()
    form.examIds = []
    clearHistory()
  },
  { immediate: true },
)

watch(
  () => [effectiveAcademicYear.value, effectiveSemester.value] as const,
  () => {
    form.examIds = []
    clearHistory()
  },
)

function schoolQualityDimensionLabel(value: SchoolQualityDimensionCode): string {
  return strictEnumLabel(SchoolQualityDimensionDescription, value, '校级质量分析维度')
}

function syncDimensionFromPageScope(): void {
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE) {
    form.dimensionId = props.scopeOrgCourseId?.trim() ?? ''
    return
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS) {
    form.dimensionId = props.scopeOrgClassId?.trim() ?? ''
    return
  }
  form.dimensionId = ''
}

function qualityListDimensionId(): string | undefined {
  if (form.analysisDimension === SchoolQualityDimensionCode.SEMESTER) {
    return undefined
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE) {
    return props.scopeOrgCourseId?.trim() || undefined
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS) {
    return props.scopeOrgClassId?.trim() || undefined
  }
  return form.dimensionId || undefined
}

async function reload(): Promise<void> {
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && !props.scopeOrgCourseId?.trim()) {
    showFormValidationMessage('请先在上方范围栏选择课程')
    return
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS && !props.scopeOrgClassId?.trim()) {
    showFormValidationMessage('请先在上方范围栏选择班级')
    return
  }
  if (
    form.analysisDimension === SchoolQualityDimensionCode.SEMESTER
    && !ensureRequiredAcademicYearSemester(effectiveAcademicYear.value, effectiveSemester.value)
  ) {
    return
  }
  if (!ensureAcademicYearSemesterPair(effectiveAcademicYear.value, effectiveSemester.value)) {
    return
  }
  const termQuery = buildOptionalAcademicYearSemesterQuery(
    effectiveAcademicYear.value,
    effectiveSemester.value,
  )
  if (termQuery === null) {
    return
  }
  loading.value = true
  try {
    const list = await listQualityAnalysis({
      analysisDimension: form.analysisDimension,
      dimensionId: qualityListDimensionId(),
      ...termQuery,
    })
    const count = applyLoadedList(list)
    if (count === 0) message.info('暂无历史记录')
  } catch (e) {
    showUserError(e, '校级质量分析加载失败')
  } finally {
    loading.value = false
  }
}


/** MVR-286：默认拒绝假可写；所选考试均须 canManageReviewerWrites */
const { canManageReviewerWrites } = useExamSummariesReviewerWriteCapability(
  computed(() => form.examIds),
  computed(() => selectedExams.value),
)

async function handleGenerate(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    showUserError(null, '仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  if (generating.value) return
  const examIds = form.examIds
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && !props.scopeOrgCourseId?.trim()) {
    showFormValidationMessage('请先在上方范围栏选择课程')
    return
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS && !props.scopeOrgClassId?.trim()) {
    showFormValidationMessage('请先在上方范围栏选择班级')
    return
  }
  const termQuery = buildRequiredAcademicYearSemesterQuery(
    effectiveAcademicYear.value,
    effectiveSemester.value,
  )
  if (!termQuery) {
    showFormValidationMessage('生成分析须同时选择学年与学期')
    return
  }
  if (examIds.length < 2) {
    showFormValidationMessage('至少需要选择 2 场考试')
    return
  }
  generating.value = true
  try {
    const generated = await generateQualityAnalysis({
      analysisDimension: form.analysisDimension,
      dimensionId: qualityListDimensionId(),
      ...termQuery,
      examIds,
    })
    adoptGenerated(generated)
    message.success('已生成校级质量分析')
  } catch (e) {
    showUserError(e, '校级质量分析生成失败')
  } finally {
    generating.value = false
  }
}
</script>

<style lang="scss" scoped>
.diagnosis-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.diagnosis-rate {
  margin-left: auto;
  font-size: 12px;
  color: var(--dp-text-secondary);
}
.diagnosis-type {
  font-size: 13px;
  font-weight: 600;
}
.diagnosis-text {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}
.diagnosis-text--hint {
  color: var(--dp-text-primary);
}
.diagnosis-text--muted {
  font-size: 12px;
  color: var(--dp-text-muted);
}
</style>
