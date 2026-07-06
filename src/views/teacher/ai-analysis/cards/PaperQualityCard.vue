<template>
  <component :is="embedded ? AiAnalysisSection : WorkbenchSurfaceCard" v-bind="shellProps">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">整卷测量学质量</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </template>

    <template v-if="embedded" #actions>
      <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
        刷新
      </UiButton>
    </template>

    <p class="paper-quality-card__note">「信度」指测量学 Cronbach α，非档案四性检测。</p>

    <UiSkeletonState v-if="loading" variant="card" compact />

    <UiEmpty v-else-if="!analysis" description="暂无整卷质量数据" />

    <SignalBand
      v-else-if="showSignalBand"
      :metrics="qualityMetrics"
      compact
      class="paper-quality-card__metrics"
    />
  </component>
</template>

<script lang="ts" setup>
import type { ExamPaperAnalysisResponse } from '@/apis/mark/question-analysis'
import type { SignalMetric } from '@/types/workbench'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, ref, watch } from 'vue'
import { getExamPaperAnalysis } from '@/apis/mark/question-analysis'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showUserError } from '@/utils/error-handler'
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

const shellProps = computed(() =>
  props.embedded
    ? { title: '整卷测量学质量', context: props.examLabel }
    : { class: 'stats-card' },
)

const qualityMetrics = computed((): SignalMetric[] =>
  buildPaperQualitySignalMetrics(analysis.value),
)

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    analysis.value = await getExamPaperAnalysis({
      examId: props.examId,
    })
  } catch (error) {
    analysis.value = null
    showUserError(error, '整卷质量数据加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.examId, props.reloadToken],
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
