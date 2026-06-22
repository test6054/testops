<template>
  <UiCard title="AI 经验案例有效性评估" compact>
    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="来源考试">
          <AnalysisExamSelect v-model="form.sourceExamId" placeholder="请选择经验来源考试" />
        </a-form-item>
        <a-form-item label="经验案例">
          <a-select
            v-model:value="form.experienceCaseId"
            :options="experienceOptions"
            :loading="experienceLoading"
            placeholder="请选择来源考试下的经验案例"
            show-search
            option-filter-prop="label"
            allow-clear
            style="width: 360px"
            :disabled="!form.sourceExamId"
          />
        </a-form-item>
        <a-form-item label="评估所用考试">
          <AnalysisExamSelect v-model="form.evalExamId" placeholder="请选择评估所用考试" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button :loading="loading" :disabled="!form.experienceCaseId" @click="reload">
              <template #icon><ReloadOutlined /></template>查看历史
            </a-button>
            <a-button type="primary" :loading="generating" @click="handleGenerate">
              评估有效性
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <UiEmpty
        v-if="!loading && !generating && !record"
        description="暂无数据"
      />
      <div v-else-if="record" class="ai-record">
        <UiStatPanel
          v-if="record.analysisStatus === 'SUCCESS'"
          :items="effectivenessMetrics"
          :columns="3"
          variant="strip"
          compact
        />

        <div v-if="record.analysisStatus === 'SUCCESS'" class="ai-record__charts">
          <MarkBarSection
            title="当前评估指标"
            hint="一致性率与复用次数"
            :item-count="effectivenessBarItems.length"
            :option="effectivenessBarOption"
            height="220px"
            :aria-label="effectivenessBarAriaLabel"
          />
          <MarkTrendSection
            title="一致性率历史走势"
            hint="同一经验案例历次评估记录"
            :point-count="effectivenessTrendPoints.length"
            :option="effectivenessTrendOption"
            height="220px"
            value-unit="%"
            :last-value="effectivenessTrendLastValue"
            :aria-label="effectivenessTrendAriaLabel"
          />
        </div>

        <a-descriptions :column="3" compact bordered>
          <a-descriptions-item label="状态">
            <UiTag :tone="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="来源考试">
            {{ formatExamName(record.sourceExamName, record.sourceExamNo) }}
          </a-descriptions-item>
          <a-descriptions-item label="评估所用考试">
            {{ formatExamName(record.evalExamName, record.evalExamNo) }}
          </a-descriptions-item>
          <a-descriptions-item label="题型">
            {{ questionTypeLabel(record.questionType) }}
          </a-descriptions-item>
          <a-descriptions-item label="经验摘要" :span="2">
            {{ record.experienceSummary }}
          </a-descriptions-item>
          <a-descriptions-item label="生成耗时">
            {{ analysisLatencyText(record) }}
          </a-descriptions-item>
          <a-descriptions-item label="生成时间" :span="2">
            {{ formatDateTime(record.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="处理追踪编号">
            <a-typography-text :content="analysisTraceText(record)" copyable />
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="评估处理说明" :span="3">
            <a-typography-text type="danger">
              {{ analysisFailureMessage(record.errorMessage) }}
            </a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.evalSummary" class="ai-summary">
          <strong>评估摘要：</strong>{{ record.evalSummary }}
        </a-typography-paragraph>

        <a-typography-paragraph v-if="record.driftDescription" class="ai-summary">
          <strong>漂移说明：</strong>{{ record.driftDescription }}
        </a-typography-paragraph>

        <a-typography-paragraph v-if="record.recommendation" class="ai-summary">
          <strong>维护动作：</strong>{{ record.recommendation }}
        </a-typography-paragraph>
      </div>
    </a-spin>
  </UiCard>
</template>

<script lang="ts" setup>
import type { GradingExperienceCaseVO, QuestionTypeCode } from '@/apis/mark/grading-experience'
import type { ExperienceEffectivenessEvalVO } from '@/apis/mark/school-quality'
import type { UiBarChartItem, UiStatPanelItem, UiTrendPoint } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  EXPERIENCE_CASE_STATUS_LABEL,
  listExperiences,
  QUESTION_TYPE_LABEL,
} from '@/apis/mark/grading-experience'
import { evaluateExperienceEffectiveness, listExperienceEvals } from '@/apis/mark/school-quality'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/teaching-analysis'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import AnalysisExamSelect from '@/components/mark/AnalysisExamSelect.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { runContractGuard } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildCategoryBarChartOption, buildTrendLineChartOption } from '@/utils/mark-echarts-options'
import { rateTone } from '@/utils/score-tone'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ExperienceEffectivenessCard' })

const form = reactive({
  sourceExamId: undefined as string | undefined,
  experienceCaseId: undefined as string | undefined,
  evalExamId: undefined as string | undefined,
})

const record = ref<ExperienceEffectivenessEvalVO | null>(null)
const evalHistory = ref<ExperienceEffectivenessEvalVO[]>([])
const experiences = ref<GradingExperienceCaseVO[]>([])
const loading = ref(false)
const experienceLoading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const generating = ref(false)

const experienceOptions = computed(() =>
  experiences.value
    .filter((item): item is GradingExperienceCaseVO & { id: string } => Boolean(item.id))
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

const effectivenessMetrics = computed((): UiStatPanelItem[] => {
  if (!record.value || record.value.analysisStatus !== 'SUCCESS') return []
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
    {
      key: 'driftDetected',
      label: '模型漂移',
      value: data.driftDetected ? '已检测到' : '未检测到',
      tone: data.driftDetected ? 'red' : 'green',
    },
  ]
})

function toConsistencyPercent(value?: number): number | null {
  if (value == null || Number.isNaN(Number(value))) return null
  const num = Number(value)
  return num <= 1 ? num * 100 : num
}

const effectivenessBarItems = computed((): UiBarChartItem[] => {
  if (!record.value || record.value.analysisStatus !== 'SUCCESS') return []
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
  if (count <= 0) return '当前评估指标，暂无数据'
  return `当前评估指标，共 ${count} 项`
})

const effectivenessTrendPoints = computed((): UiTrendPoint[] => {
  const successRecords = [...evalHistory.value]
    .filter((item) => item.analysisStatus === 'SUCCESS' && toConsistencyPercent(item.consistencyRate) != null)
    .reverse()
  return successRecords.map((item, index) => {
    const percent = toConsistencyPercent(item.consistencyRate) ?? 0
    const timeLabel = item.createTime ? formatDateTime(item.createTime).slice(5, 16) : `记录 ${index + 1}`
    return {
      key: item.id || `eval-${index}`,
      label: timeLabel,
      value: Number(percent.toFixed(1)),
    }
  })
})

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

function analysisFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 经验案例有效性评估未完成，请稍后重新评估')
}

function questionTypeLabel(value: QuestionTypeCode): string {
  return strictEnumLabel(QUESTION_TYPE_LABEL, value, '题目类型')
}

function experienceCaseStatusLabel(value: GradingExperienceCaseVO['caseStatus']): string {
  return strictEnumLabel(EXPERIENCE_CASE_STATUS_LABEL, value, '经验案例状态')
}

function requireText(value: string | undefined, _fieldName: string): string {
  const normalized = value?.trim()
  if (!normalized) {
    throw toUserError(null, '经验有效性评估数据不完整，请刷新后重试')
  }
  return normalized
}

function requireNumber(value: number | undefined, _fieldName: string): number {
  if (value == null || !Number.isFinite(value)) {
    throw toUserError(null, '经验有效性评估数据不完整，请刷新后重试')
  }
  return value
}

function requireBoolean(value: boolean | undefined, _fieldName: string): boolean {
  if (value == null) {
    throw toUserError(null, '经验有效性评估数据不完整，请刷新后重试')
  }
  return value
}

function acceptExperienceEffectivenessRecord(
  item: ExperienceEffectivenessEvalVO,
): ExperienceEffectivenessEvalVO {
  runContractGuard(() => {
    strictEnumLabel(QUESTION_TYPE_LABEL, item.questionType, '题目类型')
    aiAnalysisStatusLabel(item.analysisStatus)
    if (item.analysisStatus === 'SUCCESS') {
      requireText(item.sourceExamName, 'sourceExamName')
      requireText(item.evalExamName, 'evalExamName')
      requireText(item.experienceSummary, 'experienceSummary')
      requireText(item.evalSummary, 'evalSummary')
      requireText(item.aiTraceId, 'aiTraceId')
      requireNumber(item.consistencyRate, 'consistencyRate')
      requireNumber(item.reuseCount, 'reuseCount')
      requireNumber(item.latencyMs, 'latencyMs')
      requireBoolean(item.driftDetected, 'driftDetected')
    } else if (item.analysisStatus === 'FAILED' || item.analysisStatus === 'BLOCKED') {
      requireText(item.errorMessage, 'errorMessage')
    }
  }, '经验有效性评估数据异常，请刷新后重试')
  return item
}

function acceptExperienceCase(item: GradingExperienceCaseVO): GradingExperienceCaseVO {
  runContractGuard(() => {
    questionTypeLabel(item.questionType)
    experienceCaseStatusLabel(item.caseStatus)
    aiAnalysisStatusLabel(item.analysisStatus)
    if (item.analysisStatus === 'SUCCESS') {
      requireText(item.id, 'experienceCaseId')
      requireText(item.experienceSummary, 'experienceSummary')
    } else if (item.analysisStatus === 'FAILED' || item.analysisStatus === 'BLOCKED') {
      requireText(item.errorMessage, 'errorMessage')
    }
  }, '批改经验案例数据异常，请刷新后重试')
  return item
}

function experienceCaseSummaryText(item: GradingExperienceCaseVO): string {
  if (item.analysisStatus === 'SUCCESS') {
    return requireText(item.experienceSummary, 'experienceSummary')
  }
  if (item.analysisStatus === 'PENDING') return '经验摘要生成中'
  return analysisFailureMessage(item.errorMessage)
}

function analysisLatencyText(item: ExperienceEffectivenessEvalVO): string {
  if (item.analysisStatus === 'PENDING') return '处理中，尚未生成耗时'
  if (item.analysisStatus === 'SUCCESS') return `${requireNumber(item.latencyMs, 'latencyMs')} ms`
  return '处理失败，未生成耗时'
}

function analysisTraceText(item: ExperienceEffectivenessEvalVO): string {
  if (item.analysisStatus === 'PENDING') return '处理中，尚未生成追踪编号'
  if (item.analysisStatus === 'SUCCESS') return requireText(item.aiTraceId, 'aiTraceId')
  return '处理失败，未生成追踪编号'
}

async function reload(): Promise<void> {
  const experienceCaseId = form.experienceCaseId
  if (!experienceCaseId) {
    message.warning('请选择经验案例')
    return
  }
  loading.value = true
  try {
    const list = await listExperienceEvals(experienceCaseId)
    evalHistory.value = list.map((item) => acceptExperienceEffectivenessRecord(item))
    record.value = evalHistory.value[0] ?? null
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    showUserError(e, '经验案例效果评估加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const experienceCaseId = form.experienceCaseId
  const evalExamId = form.evalExamId
  if (!experienceCaseId || !evalExamId) {
    message.warning('经验案例和评估所用考试都必填')
    return
  }
  generating.value = true
  try {
    record.value = acceptExperienceEffectivenessRecord(
      await evaluateExperienceEffectiveness({ experienceCaseId, evalExamId }),
    )
    const list = await listExperienceEvals(experienceCaseId)
    evalHistory.value = list.map((item) => acceptExperienceEffectivenessRecord(item))
    message.success('已完成有效性评估')
  } catch (e) {
    showUserError(e, '经验案例效果评估生成失败')
  } finally {
    generating.value = false
  }
}

async function handleSourceExamChange(): Promise<void> {
  form.experienceCaseId = undefined
  record.value = null
  experiences.value = []
  if (!form.sourceExamId) return
  experienceLoading.value = true
  try {
    experiences.value = (await listExperiences(form.sourceExamId)).map(acceptExperienceCase)
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
</script>

<style lang="scss" scoped>
.ai-form {
  margin-bottom: 16px;
}
.ai-record {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-record__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.ai-summary {
  margin: 0;
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
