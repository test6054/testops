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

    <SignalBand
      v-else-if="showSignalBand"
      :metrics="displayMetrics"
      compact
      variant="inline"
      class="paper-quality-card__metrics"
    />
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
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
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

const displayMetrics = computed((): SignalMetric[] => {
  if (qualityMetrics.value.length > 0) {
    return qualityMetrics.value
  }
  return [
    { key: 'cronbach', label: 'Cronbach α', value: '—', tone: 'gray' },
    { key: 'discrimination', label: '平均区分度', value: '—', tone: 'gray' },
    { key: 'difficulty', label: '平均难度', value: '—', tone: 'gray' },
  ]
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
</style>
