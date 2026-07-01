<template>
  <UiCard class="stats-card" compact>
    <template #title>整卷测量学质量</template>
    <template #extra>
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </template>

    <p class="paper-quality-card__note">「信度」指测量学 Cronbach α，非档案四性检测。</p>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 3 }" />

    <UiEmpty v-else-if="!analysis" description="暂无整卷质量数据" />

    <SignalBand v-else :metrics="qualityMetrics" compact class="paper-quality-card__metrics" />
  </UiCard>
</template>

<script lang="ts" setup>
import type { ExamPaperAnalysisVO } from '@/apis/mark/question-analysis'
import { getExamPaperAnalysis } from '@/apis/mark/question-analysis'
import type { SignalMetric } from '@/types/workbench'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'PaperQualityCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  classId?: string
}>()

const analysis = ref<ExamPaperAnalysisVO | null>(null)
const loading = ref(false)

function formatMetricValue(value: number | null | undefined, digits = 3): string {
  if (value == null) return '—'
  return value.toFixed(digits)
}

const qualityMetrics = computed((): SignalMetric[] => {
  if (!analysis.value) return []
  const data = analysis.value
  const alphaMetric: SignalMetric =
    data.cronbachAlpha == null
      ? {
          key: 'cronbachAlpha',
          label: 'Cronbach α',
          value: '样本不足（<30），无法计算信度',
          tone: 'gray',
        }
      : {
          key: 'cronbachAlpha',
          label: 'Cronbach α',
          value: formatMetricValue(data.cronbachAlpha, 3),
          tone: 'blue',
        }
  return [
    {
      key: 'paperDifficultyIndex',
      label: '整卷难度',
      value: formatMetricValue(data.paperDifficultyIndex),
    },
    {
      key: 'paperDiscriminationIndex',
      label: '整卷区分度',
      value: formatMetricValue(data.paperDiscriminationIndex),
    },
    alphaMetric,
  ]
})

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    analysis.value = await getExamPaperAnalysis({
      examId: props.examId,
      classId: props.classId || undefined,
    })
  } catch (error) {
    analysis.value = null
    showUserError(error, '整卷质量数据加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    if (props.examId) {
      void reload()
    } else {
      analysis.value = null
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.paper-quality-card__note {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
}

.paper-quality-card__metrics {
  margin-top: 4px;
}
</style>
