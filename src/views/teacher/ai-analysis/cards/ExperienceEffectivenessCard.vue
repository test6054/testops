<template>
  <AiAnalysisSection title="AI 经验案例有效性评估">
    <template #actions>
      <AiAnalysisHistorySelect v-model="historySelectedId" :rows="historyRows" :loading="loading" />
      <UiButton
        variant="outline"
        size="sm"
        :loading="loading"
        :disabled="!form.experienceCaseId"
        @click="reload"
      >
        查看历史
      </UiButton>
      <UiButton
        v-if="canManageReviewerWrites === true"
        variant="primary"
        size="sm"
        :loading="generating === true"
        @click="handleGenerate"
      >
        评估有效性
      </UiButton>
    </template>

    <UiFilterBar
      v-model="effectivenessFilterModel"
      class="experience-effectiveness-filter"
      :fields="effectivenessFilterFields"
      variant="plain"
      show-labels
      hide-actions
    >
      <template #field-sourceExamId>
        <AnalysisExamSelect
          v-model="form.sourceExamId"
          @selected-exam-change="sourceExamSummary = $event"
          placeholder="请选择经验来源考试"
          :scope-course-id="examSelectScopeCourseId"
          :scope-class-id="examSelectScopeClassId"
          :scope-reference-department-id="examSelectScopeReferenceDepartmentId"
        />
      </template>
      <template #field-experienceCaseId>
        <UiSelect
          size="sm"
          v-model="form.experienceCaseId"
          :options="experienceOptions"
          :loading="experienceLoading"
          placeholder="请选择来源考试下的经验案例"
          allow-search
          option-filter-prop="label"
          allow-clear
          :disabled="!form.sourceExamId"
        />
      </template>
      <template #field-evalExamId>
        <AnalysisExamSelect
          v-model="form.evalExamId"
          @selected-exam-change="evalExamSummary = $event"
          placeholder="请选择评估所用考试"
          :scope-course-id="examSelectScopeCourseId"
          :scope-class-id="examSelectScopeClassId"
          :scope-reference-department-id="examSelectScopeReferenceDepartmentId"
        />
      </template>
    </UiFilterBar>

    <UiSkeletonState v-if="loading || generating" variant="card" compact />
    <div v-else class="ai-analysis-section__body ai-analysis-section__body--flush">
      <SignalBand
        v-if="record && record.analysisStatus === AiAnalysisStatusCode.SUCCESS"
        :metrics="effectivenessMetrics"
        compact
        variant="inline"
      />

      <div class="ai-record__charts">
        <MarkBarSection
          title="当前评估指标"
          :hint="effectivenessBarHint"
          :item-count="effectivenessBarItems.length"
          :option="effectivenessBarOption"
          height="220px"
          :aria-label="effectivenessBarAriaLabel"
        />
        <MarkTrendSection
          title="一致性率历史走势"
          :hint="effectivenessTrendHint"
          :point-count="effectivenessTrendPoints.length"
          :option="effectivenessTrendOption"
          height="220px"
          value-unit="%"
          :last-value="effectivenessTrendLastValue"
          :aria-label="effectivenessTrendAriaLabel"
        />
      </div>

      <template v-if="record">
        <p v-if="record.evalSummary" class="ai-analysis-summary">{{ record.evalSummary }}</p>
        <p v-if="record.detailedAnalysis" class="ai-analysis-summary">
          {{ record.detailedAnalysis }}
        </p>
        <p v-if="record.recommendation" class="ai-analysis-summary">
          维护动作：{{ recommendationLabel(record.recommendation) }}
        </p>

        <div v-if="record.analysisStatus === AiAnalysisStatusCode.SUCCESS" class="ai-evidence">
          <div class="ai-evidence__header">
            <strong>评估脱敏样本</strong>
            <span class="text-muted">共 {{ evidenceRows.length }} 条，供复核 AI 一致性依据</span>
          </div>
          <UiDataTable
            v-if="evidenceRows.length"
            :columns="evidenceColumns"
            :data-source="evidenceRows"
            row-key="rowKey"
            size="small"
            flat
            bordered
            pagination-mode="none"
            :show-pagination="false"
            :sticky-header="false"
            :scroll="{ x: 1200 }"
            :total="evidenceRows.length"
          />
          <p v-else class="ai-analysis-shell-caption">评估考试无同题型作答样本</p>
        </div>

        <AiAnalysisMetaCollapse
          :record="record"
          failure-fallback="AI 经验案例有效性评估未完成，可重新评估"
          :extra-items="metaExtraItems"
        />
      </template>
    </div>
  </AiAnalysisSection>
</template>

<script lang="ts" setup>
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type { GradingExperienceCaseResponse } from '@/apis/mark/grading-experience'
import type { QuestionTypeCode } from '@/apis/mark/question-type'
import type {
  ExperienceEffectivenessEvalEvidenceResponse,
  ExperienceEffectivenessEvalResponse,
  ExperienceRecommendationCode,
} from '@/apis/mark/school-quality'
import type { FilterField, UiBarChartItem, UiTrendPoint } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import {
  ExperienceCaseStatusCode,
  ExperienceCaseStatusDescription,
  pageExperiences,
} from '@/apis/mark/grading-experience'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import {
  evaluateExperienceEffectiveness,
  ExperienceRecommendationDescription,
  listExperienceEvals,
} from '@/apis/mark/school-quality'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AiAnalysisHistorySelect from '@/components/mark/analysis/AiAnalysisHistorySelect.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AnalysisExamSelect from '@/components/mark/AnalysisExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useAiAnalysisHistoryPicker } from '@/composables/useAiAnalysisHistoryPicker'
import { useExamSummariesReviewerWriteCapability } from '@/composables/useExamIdsReviewerWriteCapability'
import { EXPORT_PAGE_SIZE } from '@/constants/pagination'
import { useChartOption } from '@/hooks/modules/useChartOption'
import {
  getUserProcessFailureMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
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
import { rateTone } from '@/utils/score-tone'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ExperienceEffectivenessCard' })

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

const examSelectScopeCourseId = computed(() => props.scopeOrgCourseId?.trim() || undefined)
const examSelectScopeClassId = computed(() => props.scopeOrgClassId?.trim() || undefined)
const examSelectScopeReferenceDepartmentId = computed(
  () => props.scopeReferenceDepartmentId?.trim() || undefined,
)

interface ExperienceEffectivenessForm {
  sourceExamId: string | undefined
  experienceCaseId: string | undefined
  evalExamId: string | undefined
}

const form = reactive<ExperienceEffectivenessForm>({
  sourceExamId: undefined,
  experienceCaseId: undefined,
  evalExamId: undefined,
})

const sourceExamSummary = ref<ExamSummaryResponse | null>(null)
const evalExamSummary = ref<ExamSummaryResponse | null>(null)
const effectivenessExamSummaries = computed(() =>
  [sourceExamSummary.value, evalExamSummary.value].filter(
    (item): item is ExamSummaryResponse => item != null,
  ),
)
const effectivenessExamIds = computed(() =>
  [form.sourceExamId, form.evalExamId].filter((item): item is string => Boolean(item)),
)

const effectivenessFilterFields = computed<FilterField[]>(() => [
  {
    key: 'sourceExamId',
    type: 'custom',
    label: '来源考试',
    flex: 1,
    minWidth: 0,
    maxWidth: 9999,
  },
  {
    key: 'experienceCaseId',
    type: 'custom',
    label: '经验案例',
    flex: 1,
    minWidth: 0,
    maxWidth: 9999,
  },
  {
    key: 'evalExamId',
    type: 'custom',
    label: '评估考试',
    flex: 1,
    minWidth: 0,
    maxWidth: 9999,
  },
])

const effectivenessFilterModel = computed<Record<string, unknown>>({
  get: () => ({
    sourceExamId: form.sourceExamId,
    experienceCaseId: form.experienceCaseId,
    evalExamId: form.evalExamId,
  }),
  set: () => {},
})

const {
  records: historyRecords,
  selectedId: historySelectedId,
  record,
  clearHistory,
  applyLoadedList,
} = useAiAnalysisHistoryPicker<ExperienceEffectivenessEvalResponse>()

const historyRows = computed(() =>
  historyRecords.value.map((item) => ({
    id: item.id,
    createTime: item.createTime,
    analysisStatus: item.analysisStatus,
    extraHint: formatExamName(item.evalExamName, item.evalExamNo),
  })),
)

const experiences = ref<GradingExperienceCaseResponse[]>([])
const loading = ref(false)
const experienceLoading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const generating = ref(false)

const experienceOptions = computed(() =>
  experiences.value
    .filter(
      (item): item is GradingExperienceCaseResponse & { id: string } =>
        Boolean(item.id)
        && item.caseStatus === ExperienceCaseStatusCode.CONFIRMED
        && item.analysisStatus === AiAnalysisStatusCode.SUCCESS,
    )
    .map((item) => ({
      label: [
        questionTypeLabel(item.questionType),
        experienceCaseStatusLabel(item.caseStatus),
        experienceCaseSummaryText(item),
      ]
        .filter(Boolean)
        .join(' · '),
      value: item.id,
    })),
)

const effectivenessMetrics = computed((): SignalMetric[] => {
  if (!record.value || record.value.analysisStatus !== AiAnalysisStatusCode.SUCCESS) return []
  const data = record.value
  return [
    {
      key: 'consistencyRate',
      label: '一致性比率',
      value: (() => {
        const percent = toConsistencyPercent(data.consistencyRate)
        return percent == null ? '—' : `${percent.toFixed(1)}%`
      })(),
      tone: rateTone(data.consistencyRate),
    },
    {
      key: 'reuseCount',
      label: '复用次数',
      value: data.reuseCount ?? 0,
      unit: '次',
    },
  ]
})

const metaExtraItems = computed(() => {
  const value = record.value
  if (!value) {
    return []
  }
  return [
    { label: '来源考试', value: formatExamName(value.sourceExamName, value.sourceExamNo) },
    { label: '评估所用考试', value: formatExamName(value.evalExamName, value.evalExamNo) },
    { label: '题型', value: questionTypeLabel(value.questionType) },
    { label: '经验摘要', value: value.experienceSummary?.trim() || '—' },
  ]
})

function toConsistencyPercent(value?: number): number | null {
  if (value == null || Number.isNaN(Number(value))) return null
  const num = Number(value)
  return num <= 1 ? num * 100 : num
}

const effectivenessBarItems = computed((): UiBarChartItem[] => {
  if (!record.value || record.value.analysisStatus !== AiAnalysisStatusCode.SUCCESS) return []
  const data = record.value
  const items: UiBarChartItem[] = []
  const consistency = toConsistencyPercent(data.consistencyRate)
  if (consistency != null) {
    items.push({
      key: 'consistency',
      label: '一致性率',
      value: Number(consistency.toFixed(1)),
      tone: rateTone(data.consistencyRate),
      helper: `${consistency.toFixed(1)}%`,
    })
  }
  if (data.reuseCount != null && data.reuseCount > 0) {
    items.push({
      key: 'reuse',
      label: '复用次数',
      value: data.reuseCount,
      tone: 'blue',
      helper: `${data.reuseCount} 次`,
    })
  }
  return items
})

const { chartOption: effectivenessBarOption } = useChartOption(() =>
  buildCategoryBarChartOption(effectivenessBarItems.value, {
    orientation: 'vertical',
    yAxisName: '数值',
    emptyText: '暂无评估指标',
  }),
)

const effectivenessBarAriaLabel = computed(() => {
  const count = effectivenessBarItems.value.length
  if (count <= 0) return '当前评估指标暂无数据'
  return `当前评估指标，共 ${count} 项`
})

const effectivenessTrendPoints = computed((): UiTrendPoint[] => {
  const successRecords = [...historyRecords.value]
    .filter(
      (item) =>
        item.analysisStatus === AiAnalysisStatusCode.SUCCESS
        && toConsistencyPercent(item.consistencyRate) != null,
    )
    .reverse()
  return successRecords.map((item, index) => {
    const percent = toConsistencyPercent(item.consistencyRate) ?? 0
    const timeLabel = item.createTime
      ? formatDateTime(item.createTime).slice(5, 16)
      : `记录 ${index + 1}`
    return {
      key: item.id || `eval-${index}`,
      label: timeLabel,
      value: Number(percent.toFixed(1)),
    }
  })
})

const effectivenessBarHint = computed(() =>
  mergeChartHint('一致性率与复用次数', buildBarChartInsight(effectivenessBarItems.value)),
)

const effectivenessTrendHint = computed(() =>
  mergeChartHint(
    '同一经验案例历次评估记录',
    buildTrendChartInsight(effectivenessTrendPoints.value),
  ),
)

const effectivenessTrendLastValue = computed(() => {
  const points = effectivenessTrendPoints.value
  if (points.length === 0) return null
  return points[points.length - 1]?.value ?? null
})

const { chartOption: effectivenessTrendOption } = useChartOption(() =>
  buildTrendLineChartOption(effectivenessTrendPoints.value, {
    yAxisName: '一致性率 %',
    yMax: 100,
    area: true,
    emptyText: '暂无历史评估记录',
  }),
)

const effectivenessTrendAriaLabel = computed(() => {
  const count = effectivenessTrendPoints.value.length
  if (count < 2) return '一致性率历史走势，至少需要两次成功评估'
  return `一致性率历史走势，共 ${count} 次评估`
})

interface EvidenceTableRow extends ExperienceEffectivenessEvalEvidenceResponse {
  rowKey: string
  scoreDiffText: string
}

const evidenceRows = computed((): EvidenceTableRow[] => {
  const items = record.value?.evidenceItems
  if (!items?.length) return []
  return items.map((item, index) => ({
    ...item,
    rowKey: `${item.anonymousId ?? 'sample'}-${item.questionNo ?? index}`,
    scoreDiffText: formatScoreDiff(item.aiScore, item.teacherReviewScore),
  }))
})

const evidenceColumns: ColumnType<EvidenceTableRow>[] = [
  { title: '脱敏学生', dataIndex: 'anonymousId', key: 'anonymousId', width: 100, fixed: 'left' },
  { title: '班级', dataIndex: 'anonymousClassLabel', key: 'anonymousClassLabel', width: 88 },
  { title: '题号', dataIndex: 'questionNo', key: 'questionNo', width: 72 },
  {
    title: '题型',
    key: 'questionType',
    width: 88,
    customRender: ({ record: row }) =>
      row.questionType ? questionTypeLabel(row.questionType) : '—',
  },
  {
    title: '识别作答',
    dataIndex: 'recognizedAnswer',
    key: 'recognizedAnswer',
    ellipsis: true,
    width: 180,
  },
  {
    title: 'AI 分',
    key: 'aiScore',
    width: 72,
    align: 'right',
    customRender: ({ record: row }) => formatScoreCell(row.aiScore),
  },
  {
    title: '教师分',
    key: 'teacherReviewScore',
    width: 72,
    align: 'right',
    customRender: ({ record: row }) => formatScoreCell(row.teacherReviewScore),
  },
  { title: '分差', dataIndex: 'scoreDiffText', key: 'scoreDiffText', width: 72, align: 'right' },
  {
    title: '评语',
    dataIndex: 'commentText',
    key: 'commentText',
    ellipsis: true,
    width: 160,
  },
]

function formatScoreCell(value?: number): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return String(Number(value))
}

function formatScoreDiff(aiScore?: number, teacherScore?: number): string {
  if (aiScore == null || teacherScore == null) return '—'
  if (!Number.isFinite(Number(aiScore)) || !Number.isFinite(Number(teacherScore))) return '—'
  const diff = Number(aiScore) - Number(teacherScore)
  if (diff === 0) return '0'
  return diff > 0 ? `+${diff}` : String(diff)
}

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 经验案例有效性评估未完成，可重新评估')
}

function questionTypeLabel(value: QuestionTypeCode): string {
  return strictEnumLabel(QuestionTypeDescription, value, '题目类型')
}

function recommendationLabel(value: ExperienceRecommendationCode): string {
  return strictEnumLabel(ExperienceRecommendationDescription, value, '维护动作')
}

function experienceCaseStatusLabel(value: GradingExperienceCaseResponse['caseStatus']): string {
  return strictEnumLabel(ExperienceCaseStatusDescription, value, '经验案例状态')
}

function requireText(value: string | undefined, _fieldName: string): string {
  const normalized = value?.trim()
  if (!normalized) {
    return '经验有效性评估数据不完整'
  }
  return normalized
}

function experienceCaseSummaryText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS) {
    return requireText(item.experienceSummary, 'experienceSummary')
  }
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING) return '经验摘要生成中'
  return analysisFailureMessage(item.errorMessage)
}

async function reload(): Promise<void> {
  const experienceCaseId = form.experienceCaseId
  if (!experienceCaseId) {
    showFormValidationMessage('请选择经验案例')
    return
  }
  loading.value = true
  try {
    const list = await listExperienceEvals(experienceCaseId)
    const count = applyLoadedList(list)
    if (count === 0) void message.info('暂无历史记录')
  } catch (e) {
    showUserError(e, '经验案例效果评估加载失败')
  } finally {
    loading.value = false
  }
}

/** MVR-286：默认拒绝假可写；所选考试均须 canManageReviewerWrites */
const { canManageReviewerWrites } = useExamSummariesReviewerWriteCapability(
  computed(() => effectivenessExamIds.value),
  computed(() => effectivenessExamSummaries.value),
)

async function handleGenerate(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    showUserError(null, '仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  if (generating.value === true) return
  const experienceCaseId = form.experienceCaseId
  const evalExamId = form.evalExamId
  if (!experienceCaseId || !evalExamId) {
    showFormValidationMessage('经验案例和评估所用考试都必填')
    return
  }
  const selectedCase = experiences.value.find((item) => item.id === experienceCaseId)
  if (!selectedCase || selectedCase.caseStatus !== ExperienceCaseStatusCode.CONFIRMED) {
    showFormValidationMessage('请先在阅卷经验库确认该经验案例后再评估有效性')
    return
  }
  if (selectedCase.sourceExamId === evalExamId) {
    showFormValidationMessage('评估所用考试不能与经验来源考试相同')
    return
  }
  generating.value = true
  try {
    const generated = await evaluateExperienceEffectiveness({ experienceCaseId, evalExamId })
    const list = await listExperienceEvals(experienceCaseId)
    applyLoadedList(list)
    historySelectedId.value = generated.id
    void message.success('已完成有效性评估')
  } catch (e) {
    showUserError(e, '经验案例效果评估生成失败')
  } finally {
    generating.value = false
  }
}

async function handleSourceExamChange(): Promise<void> {
  form.experienceCaseId = undefined
  clearHistory()
  experiences.value = []
  if (!form.sourceExamId) return
  experienceLoading.value = true
  try {
    const result = await pageExperiences({
      examId: form.sourceExamId,
      pageNum: 1,
      pageSize: EXPORT_PAGE_SIZE,
    })
    experiences.value = result.list
  } catch (e) {
    experiences.value = []
    showUserError(e, '经验案例列表加载失败')
  } finally {
    experienceLoading.value = false
  }
}

function formatExamName(name?: string, no?: string): string {
  const examName = requireText(name, 'examName')
  return no ? `${examName}（${no}）` : examName
}

watch(() => form.sourceExamId, handleSourceExamChange)

watch(
  () => form.experienceCaseId,
  () => {
    clearHistory()
  },
)
</script>

<style lang="scss" scoped>
.school-quality-card__title {
  margin: 0;
  font-size: var(--dp-font-size-lg);
  font-weight: var(--dp-font-weight-title);
  line-height: 1.5;
}

.ai-form {
  width: 100%;
}
.ai-record {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-record__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--dp-space-3, 12px);
}
.ai-summary {
  margin: 0;
}
.ai-evidence {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-evidence__header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.text-muted {
  color: var(--dp-text-tertiary);
}
.experience-effectiveness-filter {
  width: 100%;

  :deep(.dp-filter-bar) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: end;
    gap: 12px;
    width: 100%;
  }

  :deep(.dp-filter-bar__field) {
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    flex: none !important;
  }

  :deep(.dp-filter-bar__control),
  :deep(.analysis-exam-select),
  :deep(.ant-select) {
    width: 100%;
  }
}
</style>
