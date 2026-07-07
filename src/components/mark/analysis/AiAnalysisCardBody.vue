<script lang="ts" setup>
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { resolveAiAnalysisCardPhase } from '@/utils/ai-analysis-card-phase'
import AiGenerationProgressPanel from '@/views/teacher/ai-analysis/cards/AiGenerationProgressPanel.vue'

defineOptions({ name: 'AiAnalysisCardBody' })

const props = defineProps<{
  loading: boolean
  generating: boolean
  hasContent: boolean
  emptyDescription: string
  progressTitle: string
  progressWaitingText: string
}>()

const phase = computed(() =>
  resolveAiAnalysisCardPhase({
    loading: props.loading,
    generating: props.generating,
    hasContent: props.hasContent,
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
  <UiEmpty v-else-if="phase === 'empty'" :description="emptyDescription" />
  <slot v-else />
</template>
