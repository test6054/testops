<template>
  <AiAnalysisSection title="AI 校级质量分析">
    <template #actions>
      <AiAnalysisHistorySelect
        v-model="historySelectedId"
        :rows="historyRows"
        :loading="loading"
      />
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
        查看历史
      </UiButton>
      <UiButton variant="primary" size="sm" :loading="generating" @click="handleGenerate">
        生成分析
      </UiButton>
    </template>

    <AiAnalysisConfigCollapse title="校级质量分析范围">
      <div class="ai-form">
        <a-form layout="inline" :model="form" size="small">
          <a-form-item label="分析维度">
            <a-select v-model:value="form.analysisDimension" style="width: 140px">
              <a-select-option
                v-for="item in SCHOOL_QUALITY_DIMENSION_OPTIONS"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item v-if="form.analysisDimension === SchoolQualityDimensionCode.COURSE" label="课程">
            <CatalogCourseSelector
              v-model:value="form.dimensionId"
              placeholder="请选择课程"
              :allow-clear="false"
              width="220px"
            />
          </a-form-item>
          <a-form-item v-if="form.analysisDimension === SchoolQualityDimensionCode.CLASS" label="班级">
            <ClassSelector
              v-model:value="form.dimensionId"
              :department-id="examSelectScopeReferenceDepartmentId"
              placeholder="请选择班级"
              :allow-clear="false"
              width="220px"
            />
          </a-form-item>
          <a-form-item label="学年">
            <AnalysisSemesterSelect
              v-model:academic-year="form.academicYear"
              v-model:semester="form.semester"
              :course-id="examSelectScopeCourseId"
              :class-id="examSelectScopeClassId"
              :reference-department-id="examSelectScopeReferenceDepartmentId"
              :allow-clear="form.analysisDimension !== SchoolQualityDimensionCode.SEMESTER"
              :default-recent-semester-count="form.analysisDimension === SchoolQualityDimensionCode.SEMESTER ? 1 : 0"
            />
          </a-form-item>
          <p v-if="form.analysisDimension === SchoolQualityDimensionCode.SEMESTER" class="semester-dimension-hint">
            学期维度须同时选择学年与学期；课程/班级维度查看历史可不选学期，生成分析须选择学年与学期
          </p>
          <p v-else-if="form.analysisDimension === SchoolQualityDimensionCode.CLASS" class="semester-dimension-hint">
            班级维度须手动勾选至少 2 场包含该班级的考试
          </p>
          <a-form-item label="参与考试列表" style="flex: 1; min-width: 320px">
            <AnalysisExamMultiSelect
              v-if="examSelectReady"
              v-model="form.examIds"
              :scope-course-id="examSelectScopeCourseId"
              :scope-class-id="examSelectScopeClassId"
              :scope-reference-department-id="examSelectScopeReferenceDepartmentId"
              :scope-academic-year="form.academicYear"
              :scope-semester="form.semester"
              :auto-select-scoped-exams="examSelectAutoSelectScoped"
              placeholder="请选择至少 2 场考试"
            />
            <span v-else class="exam-hint">{{ examSelectHint }}</span>
          </a-form-item>
        </a-form>
      </div>
    </AiAnalysisConfigCollapse>

    <UiSkeletonState v-if="loading || generating" variant="card" compact />
    <UiEmpty v-else-if="!record" description="配置范围后生成或查看校级质量分析" />
    <div v-else-if="record" class="ai-analysis-section__body ai-analysis-section__body--flush">
      <SignalBand :metrics="qualitySignalMetrics" compact variant="inline" />

      <p v-if="record.qualitySummary" class="ai-analysis-summary">{{ record.qualitySummary }}</p>

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
            <p v-if="item.suggestion" class="diagnosis-text diagnosis-text--hint">{{ item.suggestion }}</p>
          </div>
        </div>
      </div>

      <AiAnalysisMetaCollapse
        :record="record"
        failure-fallback="AI 校级质量分析未完成，请核对考试范围后重新生成"
        :extra-items="metaExtraItems"
      />
    </div>
  </AiAnalysisSection>
</template>

<script lang="ts" setup>
import type {
  SchoolQualityAnalysisVO,
  SchoolQualityItemVO,
  SchoolQualityRatingCode,
} from '@/apis/mark/school-quality'
import type { BadgeTone, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
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
import AiAnalysisConfigCollapse from '@/components/mark/analysis/AiAnalysisConfigCollapse.vue'
import AiAnalysisHistorySelect from '@/components/mark/analysis/AiAnalysisHistorySelect.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AnalysisExamMultiSelect from '@/components/mark/AnalysisExamMultiSelect.vue'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useAiAnalysisHistoryPicker } from '@/composables/useAiAnalysisHistoryPicker'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { formatSemester } from '@/types/enums/semester-enum'
import {
  buildOptionalAcademicYearSemesterQuery,
  buildRequiredAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
  ensureRequiredAcademicYearSemester,
} from '@/utils/academic-year-semester-query'
import { showUserError } from '@/utils/error-handler'
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
  }>(),
  {
    scopeReferenceDepartmentId: null,
    scopeOrgCourseId: null,
    scopeOrgClassId: null,
  },
)

interface SchoolQualityForm {
  analysisDimension: SchoolQualityDimensionCode
  dimensionId: string
  academicYear: string | undefined
  semester: SemesterCode | undefined
  examIds: string[]
}
const form = reactive<SchoolQualityForm>({
  analysisDimension: SchoolQualityDimensionCode.COURSE,
  dimensionId: '',
  academicYear: undefined,
  semester: undefined,
  examIds: [],
})

const {
  records: historyRecords,
  selectedId: historySelectedId,
  record,
  clearHistory,
  applyLoadedList,
  adoptGenerated,
} = useAiAnalysisHistoryPicker<SchoolQualityAnalysisVO>()

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

const examSelectScopeCourseId = computed(() => {
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && form.dimensionId) {
    return form.dimensionId
  }
  return props.scopeOrgCourseId?.trim() || undefined
})
const examSelectScopeClassId = computed(() => {
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS && form.dimensionId) {
    return form.dimensionId
  }
  return props.scopeOrgClassId?.trim() || undefined
})
const examSelectScopeReferenceDepartmentId = computed(() =>
  props.scopeReferenceDepartmentId?.trim() || undefined,
)
const examSelectAutoSelectScoped = computed(() =>
  form.analysisDimension === SchoolQualityDimensionCode.SEMESTER
  || form.analysisDimension === SchoolQualityDimensionCode.COURSE,
)
const examSelectReady = computed(() => {
  if (!form.academicYear || !form.semester) {
    return false
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && !form.dimensionId) {
    return false
  }
  return !(form.analysisDimension === SchoolQualityDimensionCode.CLASS && !form.dimensionId);
})
const examSelectHint = computed(() => {
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && !form.dimensionId) {
    return '请先选择课程'
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS && !form.dimensionId) {
    return '请先选择班级'
  }
  return '生成分析须先选择学年与学期'
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
  return toSignalMetrics(qualityMetrics.value).map(metric =>
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

function examScopeSummary(value: SchoolQualityAnalysisVO): string {
  if (!value.exams?.length) {
    return '—'
  }
  return value.exams
    .map(exam => `${exam.examName ?? exam.examId}${exam.examTime ? ` · ${formatDateTime(exam.examTime)}` : ''}`)
    .join('；')
}

function qualityRatingLabel(rating: SchoolQualityRatingCode): string {
  return strictEnumLabel(SchoolQualityRatingDescription, rating, '校级质量评价等级')
}

function qualityRatingColor(rating: SchoolQualityRatingCode): BadgeTone {
  return strictEnumTone(SCHOOL_QUALITY_RATING_TONE, rating, '校级质量评价等级')
}

function qualityItemTitle(item: SchoolQualityItemVO): string {
  if (item.qualityDimension) {
    return strictEnumLabel(SchoolQualityItemDimensionDescription, item.qualityDimension, '质量维度')
  }
  return item.metricName || '质量指标'
}

watch(
  () => form.analysisDimension,
  () => {
    form.dimensionId = ''
    form.academicYear = undefined
    form.semester = undefined
    form.examIds = []
    clearHistory()
  },
)

watch(
  () => form.dimensionId,
  () => {
    clearHistory()
  },
)

watch(
  () => [form.academicYear, form.semester],
  () => {
    form.examIds = []
    clearHistory()
  },
)

function schoolQualityDimensionLabel(value: SchoolQualityDimensionCode): string {
  return strictEnumLabel(SchoolQualityDimensionDescription, value, '校级质量分析维度')
}

function qualityListDimensionId(): string | undefined {
  if (form.analysisDimension === SchoolQualityDimensionCode.SEMESTER) {
    return undefined
  }
  return form.dimensionId || undefined
}

async function reload(): Promise<void> {
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && !form.dimensionId) {
    message.warning('请选择课程')
    return
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS && !form.dimensionId) {
    message.warning('请选择班级')
    return
  }
  if (
    form.analysisDimension === SchoolQualityDimensionCode.SEMESTER
    && !ensureRequiredAcademicYearSemester(form.academicYear, form.semester)
  ) {
    return
  }
  if (!ensureAcademicYearSemesterPair(form.academicYear, form.semester)) {
    return
  }
  const termQuery = buildOptionalAcademicYearSemesterQuery(form.academicYear, form.semester)
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

async function handleGenerate(): Promise<void> {
  const examIds = form.examIds
  if (form.analysisDimension === SchoolQualityDimensionCode.COURSE && !form.dimensionId) {
    message.warning('请选择课程')
    return
  }
  if (form.analysisDimension === SchoolQualityDimensionCode.CLASS && !form.dimensionId) {
    message.warning('请选择班级')
    return
  }
  const termQuery = buildRequiredAcademicYearSemesterQuery(form.academicYear, form.semester)
  if (!termQuery) {
    message.warning('生成分析须同时选择学年与学期')
    return
  }
  if (examIds.length < 2) {
    message.warning('至少需要选择 2 场考试')
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
.ai-form {
  width: 100%;
}
.exam-hint {
  font-size: 14px;
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
  line-height: 32px;
}
.semester-dimension-hint {
  flex: 1 1 100%;
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
  line-height: 1.5;
}
.diagnosis-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.diagnosis-rate {
  margin-left: auto;
  font-size: 12px;
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
}
.diagnosis-type {
  font-size: 13px;
  font-weight: 600;
}
.diagnosis-text {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.75));
}
.diagnosis-text--hint {
  color: var(--dp-text-primary, rgba(0, 0, 0, 0.88));
}
.diagnosis-text--muted {
  font-size: 12px;
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
}
</style>


