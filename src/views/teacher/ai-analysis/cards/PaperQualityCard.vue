<template>
  <AiAnalysisCardShell :embedded="embedded" title="整卷测量学质量" card-class="stats-card">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">整卷测量学质量</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </template>

    <UiSkeletonState v-if="loading" variant="card" compact />

    <UiEmpty v-else-if="qualityMetrics.length === 0" description="暂无整卷质量数据" />

    <SignalBand
      v-else-if="showSignalBand"
      :metrics="qualityMetrics"
      compact
      class="paper-quality-card__metrics"
    />

    <div v-else class="paper-quality-card__summary">
      <p class="paper-quality-card__summary-text">{{ qualitySummary }}</p>
      <p v-if="qualitySnapshotMeta" class="paper-quality-card__summary-meta">
        {{ qualitySnapshotMeta }}
      </p>
    </div>
  </AiAnalysisCardShell>
</template>

<script lang="ts" setup>
import type { ExamPaperAnalysisResponse } from '@/apis/mark/question-analysis'
import type { SignalMetric } from '@/types/workbench'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, ref, watch } from 'vue'
import { getExamPaperAnalysis } from '@/apis/mark/question-analysis'
import AiAnalysisCardShell from '@/components/mark/analysis/AiAnalysisCardShell.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { formatDateTime } from '@/utils/format'
import { buildPaperQualitySignalMetrics } from '@/utils/paper-quality-signals'

defineOptions({ name: 'PaperQualityCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    reloadToken: number
    classId?: string
    examLabel?: string
    embedded?: boolean
    /** 页面壳层已展示 Signal 时可关闭卡片内重复指标 */
    showSignalBand?: boolean
  }>(),
  { embedded: false, showSignalBand: true },
)

const analysis = ref<ExamPaperAnalysisResponse | null>(null)
const loading = ref(false)
let analysisLoadSequence = 0

const qualityMetrics = computed((): SignalMetric[] =>
  buildPaperQualitySignalMetrics(analysis.value),
)

const qualitySummary = computed(() => {
  if (!analysis.value) {
    return ''
  }
  const pieces: string[] = []
  if (analysis.value.cronbachAlpha == null) {
    pieces.push('Cronbach α 样本不足（<30），暂无法计算信度')
  } else {
    pieces.push(`Cronbach α ${analysis.value.cronbachAlpha.toFixed(3)}`)
  }
  if (analysis.value.paperDiscriminationIndex != null) {
    pieces.push(`平均区分度 ${analysis.value.paperDiscriminationIndex.toFixed(3)}`)
  }
  if (analysis.value.paperDifficultyIndex != null) {
    pieces.push(`平均难度 ${analysis.value.paperDifficultyIndex.toFixed(3)}`)
  }
  return pieces.join('；')
})

const qualitySnapshotMeta = computed(() => {
  if (!analysis.value) {
    return ''
  }
  const pieces: string[] = []
  if (analysis.value.reliabilitySampleCount != null) {
    pieces.push(`有效样本 ${analysis.value.reliabilitySampleCount}`)
  }
  if (analysis.value.snapshotTime) {
    pieces.push(`快照时间 ${formatDateTime(analysis.value.snapshotTime)}`)
  }
  return pieces.join(' · ')
})

async function reload(): Promise<void> {
  const currentLoad = ++analysisLoadSequence
  if (!props.examId) return
  loading.value = true
  try {
    const response = await getExamPaperAnalysis({
      examId: props.examId,
      classId: props.classId || undefined,
    })
    if (currentLoad !== analysisLoadSequence) {
      return
    }
    analysis.value = response
  } catch (error) {
    if (currentLoad !== analysisLoadSequence) {
      return
    }
    analysis.value = null
  } finally {
    if (currentLoad === analysisLoadSequence) {
      loading.value = false
    }
  }
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    if (props.examId) {
      void reload()
    } else {
      analysisLoadSequence += 1
      analysis.value = null
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.paper-quality-card__metrics {
  margin-top: 4px;
}

.paper-quality-card__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.paper-quality-card__summary-text,
.paper-quality-card__summary-meta {
  margin: 0;
}

.paper-quality-card__summary-text {
  color: var(--dp-text-primary);
}

.paper-quality-card__summary-meta {
  font-size: 12px;
  color: var(--dp-text-secondary);
}
</style>
