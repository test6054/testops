<template>
  <AiAnalysisCardShell :embedded="embedded" title="AI 教学改进建议" card-class="stats-card">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">AI 教学改进方案</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <div class="ai-analysis-card-toolbar">
        <UiButton
          v-if="canManageReviewerWrites"
          variant="outline"
          size="sm"
          :loading="generating"
          @click="handleGenerate"
        >
          重新生成
        </UiButton>
        <UiButton variant="outline" size="sm" :disabled="!canShareRecord" @click="copyShareText">
          复制分享
        </UiButton>
        <UiButton variant="outline" size="sm" :disabled="!canShareRecord" @click="exportRecordText">
          导出文本
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </UiButton>
      </div>
    </template>

    <template v-if="embedded" #actions>
      <div class="ai-analysis-card-toolbar">
        <UiButton
          v-if="canManageReviewerWrites"
          variant="outline"
          size="sm"
          :loading="generating"
          @click="handleGenerate"
        >
          重新生成
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload"> 刷新 </UiButton>
      </div>
    </template>

    <AiAnalysisCardBody
      :loading="loading"
      :generating="generating"
      :has-content="true"
      empty-description="暂无改进建议，可点击重新生成"
      progress-title="AI 教学改进方案生成中"
      :progress-waiting-text="
        props.classId
          ? '正在等待后端返回当前班级的真实教学改进方案。'
          : '正在等待后端返回本场考试的真实教学改进方案。'
      "
    >
      <div class="ai-analysis-section__body ai-analysis-section__body--flush">
        <MarkBarSection
          title="改进项严重程度分布"
          :hint="improvementChartHint"
          :item-count="improvementBarItems.length"
          :option="improvementChartOption"
          height="220px"
          empty-description="生成教学改进方案后展示各严重等级改进项数量"
        />

        <template v-if="record != null">
          <p v-if="record.overallSummary" class="ai-analysis-summary">
            {{ record.overallSummary }}
          </p>

          <AiRecommendationBlock
            v-for="(item, index) in record.improvementItems ?? []"
            :key="`${item.questionType ?? 'item'}-${index}`"
            :area-label="item.questionType ? questionTypeLabel(item.questionType) : '教学改进'"
            :issue="item.problemDescription"
            :suggestion="item.suggestion ?? '—'"
            :severity-label="item.severity ? severityLabel(item.severity) : undefined"
            :severity-tone="item.severity ? severityTone(item.severity) : undefined"
          />

          <AiAnalysisMetaCollapse
            :record="record"
            failure-fallback="AI 教学改进方案未完成，可重新生成"
          />
        </template>
      </div>
    </AiAnalysisCardBody>
  </AiAnalysisCardShell>
</template>

<script lang="ts" setup>
import type {
  TeachingAnalysisRecordResponse,
  TeachingImprovementItemResponse,
  TeachingImprovementSeverityCode,
} from '@/apis/mark/teaching-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, ref, watch } from 'vue'
import { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import {
  generateTeachingImprovement,
  getLatestTeachingImprovement,
  TEACHING_IMPROVEMENT_SEVERITY_TONE,
  TeachingImprovementSeverityDescription,
} from '@/apis/mark/teaching-analysis'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import AiAnalysisCardBody from '@/components/mark/analysis/AiAnalysisCardBody.vue'
import AiAnalysisCardShell from '@/components/mark/analysis/AiAnalysisCardShell.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiRecommendationBlock from '@/components/mark/analysis/AiRecommendationBlock.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { useAiAnalysisGenerationFeedback } from '@/composables/useAiAnalysisGenerationFeedback'
import { AI_ANALYSIS_CAN_MANAGE_REVIEWER_WRITES_KEY } from '@/composables/useAiAnalysisScope'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import { teachingImprovementToBarItems } from '@/utils/mark-statistics-chart'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeachingImprovementCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    reloadToken: number
    classId?: string
    examLabel?: string
    embedded?: boolean
  }>(),
  { embedded: false },
)

const record = ref<TeachingAnalysisRecordResponse | null>(null)
const loading = ref(false)
const { generating, runGeneration } = useAiAnalysisGenerationFeedback()

/** MVR-285：默认拒绝假可写；依赖 AI 分析中心 overview 或页面 provide 的能力位 */
const injectedCanManageReviewerWrites = inject(AI_ANALYSIS_CAN_MANAGE_REVIEWER_WRITES_KEY, null)
const canManageReviewerWrites = computed(() => injectedCanManageReviewerWrites?.value === true)

const canShareRecord = computed(() => record.value?.analysisStatus === AiAnalysisStatusCode.SUCCESS)

const improvementBarItems = computed(() =>
  teachingImprovementToBarItems(record.value?.improvementItems ?? []),
)

const improvementChartHint = computed(() =>
  mergeChartHint('按严重等级统计改进项', buildBarChartInsight(improvementBarItems.value)),
)

const { chartOption: improvementChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(improvementBarItems.value, {
    yAxisName: '项数',
    unit: '项',
    emptyText: '暂无改进项分布',
  }),
)

function questionTypeLabel(value: TeachingImprovementItemResponse['questionType']): string {
  return strictEnumLabel(QuestionTypeDescription, value, '题目类型')
}

function severityLabel(value: TeachingImprovementSeverityCode): string {
  return strictEnumLabel(TeachingImprovementSeverityDescription, value, '严重程度')
}

function severityTone(value: TeachingImprovementSeverityCode) {
  return strictEnumTone(TEACHING_IMPROVEMENT_SEVERITY_TONE, value, '严重程度')
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    record.value = await getLatestTeachingImprovement({
      examId: props.examId,
      classId: props.classId || undefined,
    })
  } catch (e) {
    record.value = null
    showUserError(e, '教学改进方案加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  if (!canManageReviewerWrites.value) {
    showUserError(null, '仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  await runGeneration(
    () =>
      generateTeachingImprovement({
        examId: props.examId,
        classId: props.classId || undefined,
      }),
    {
      successMessage: '已生成最新改进方案',
      onSuccess: (generated) => {
        record.value = generated
      },
      onFailure: () => {
        record.value = null
      },
    },
  )
}

function buildShareText(): string | null {
  const current = record.value
  if (!current || current.analysisStatus !== AiAnalysisStatusCode.SUCCESS) {
    return null
  }
  const lines = [
    'AI 教学改进方案',
    `生成时间：${formatDateTime(current.createTime!)}`,
    '',
    current.overallSummary,
  ]
  current.improvementItems?.forEach((item, index) => {
    lines.push(
      '',
      `第 ${index + 1} 项：${item.questionType ? questionTypeLabel(item.questionType) : '教学改进'}`,
      `问题：${item.problemDescription || '无'}`,
      `改进措施：${item.suggestion || '无'}`,
    )
  })
  return lines.join('\n')
}

async function copyShareText(): Promise<void> {
  const text = buildShareText()
  if (!text) {
    showUserError(null, '暂无可分享的智能教学改进方案')
    return
  }
  await navigator.clipboard.writeText(text)
  void message.success('已复制教学改进方案')
}

function exportRecordText(): void {
  const text = buildShareText()
  if (!text) {
    showUserError(null, '暂无可分享的智能教学改进方案')
    return
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `teaching-improvement-${props.examId}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)

defineExpose({ exportRecordText })
</script>

<style lang="scss" scoped>
.ai-analysis-section__body--flush {
  padding-top: 0;
}
</style>
