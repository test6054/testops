<script lang="ts" setup>
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { resolveAiAnalysisCardPhase } from '@/utils/ai-analysis-card-phase'
import AiGenerationProgressPanel from '@/views/teacher/ai-analysis/cards/AiGenerationProgressPanel.vue'

defineOptions({ name: 'AiAnalysisCardBody' })

const props = withDefaults(
  defineProps<{
    loading: boolean
    generating: boolean
    hasContent: boolean
    emptyDescription: string
    progressTitle: string
    progressWaitingText: string
    /** 最近一次加载失败；有旧内容时保留展示并提示 stale */
    loadFailed?: boolean
    errorDescription?: string
  }>(),
  {
    loadFailed: false,
    errorDescription: '分析加载失败',
  },
)

const phase = computed(() =>
  resolveAiAnalysisCardPhase({
    loading: props.loading,
    generating: props.generating,
    hasContent: props.hasContent,
    loadFailed: props.loadFailed,
  }),
)
</script>

<template>
  <UiSkeletonState v-if="phase === 'loading'" variant="card" compact />
  <AiGenerationProgressPanel
    v-else-if="phase === 'generating'"
    :title="progressTitle"
    :waiting-text="progressWaitingText"
  />
  <UiEmpty
    v-else-if="phase === 'error'"
    size="sm"
    :description="errorDescription"
  />
  <UiEmpty size="sm" v-else-if="phase === 'empty'" :description="emptyDescription" />
  <template v-else>
    <UiAlertStrip
      v-if="loadFailed"
      tone="warning"
      dense
      inline
      :title="errorDescription"
      description="仍显示上次成功结果"
      class="ai-analysis-card-body__stale"
    />
    <slot />
  </template>
</template>

<style scoped lang="scss">
.ai-analysis-card-body__stale {
  margin-bottom: var(--dp-space-component-tight);
}
</style>
