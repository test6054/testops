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
      <!-- D-9 错误态：AI 经验有效性评估加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 经验有效性评估加载失败"
        compact
        @retry="reload"
      />
      <UiEmpty v-else-if="!record" description="暂无评估记录，请选择考试和经验案例后评估。" />
      <div v-else class="ai-record">
        <a-row v-if="record.analysisStatus === 'SUCCESS'" :gutter="12" class="metric-row">
          <a-col :span="8">
            <a-statistic
              title="一致性比率"
              :value="record.consistencyRate"
              :precision="2"
              :value-style="rateStyle(record.consistencyRate)"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic title="复用次数" :value="record.reuseCount" />
          </a-col>
          <a-col :span="8">
            <div class="drift-block">
              <div class="drift-label">模型漂移</div>
              <a-tag :color="record.driftDetected ? 'red' : 'green'">
                {{ record.driftDetected ? '已检测到漂移' : '未检测到漂移' }}
              </a-tag>
            </div>
          </a-col>
        </a-row>

        <a-descriptions :column="3" compact bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
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
import AnalysisExamSelect from '@/components/mark/AnalysisExamSelect.vue'
import { UiCard, UiEmpty, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { runContractGuard } from '@/utils/contract-guard'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { rateTone, toneToColor } from '@/utils/score-tone'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ExperienceEffectivenessCard' })

const form = reactive({
  sourceExamId: undefined as string | undefined,
  experienceCaseId: undefined as string | undefined,
  evalExamId: undefined as string | undefined,
})

const record = ref<ExperienceEffectivenessEvalVO | null>(null)
const experiences = ref<GradingExperienceCaseVO[]>([])
const loading = ref(false)
const experienceLoading = ref(false)
// D-9 错误态：AI 经验有效性评估加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
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
  loadError.value = null
  loading.value = true
  try {
    const list = await listExperienceEvals(experienceCaseId)
    record.value = list[0] ? acceptExperienceEffectivenessRecord(list[0]) : null
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    loadError.value = toUserError(e, '经验案例效果评估加载失败')
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
  loadError.value = null
  try {
    record.value = acceptExperienceEffectivenessRecord(
      await evaluateExperienceEffectiveness({ experienceCaseId, evalExamId }),
    )
    message.success('已完成有效性评估')
  } catch (e) {
    loadError.value = toUserError(e, '经验案例效果评估生成失败')
    showUserError(e, '经验案例效果评估生成失败')
  } finally {
    generating.value = false
  }
}

function rateStyle(rate?: number): Record<string, string> {
  if (rate == null) return { color: 'inherit' }
  return { color: toneToColor(rateTone(rate)) }
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
.ai-summary {
  margin: 0;
}
.metric-row {
  background: var(--gi-color-bg-2, #f5f5f5);
  padding: 12px 8px;
  border-radius: 4px;
}
.drift-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.drift-label {
  font-size: 12px;
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
