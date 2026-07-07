<script setup lang="ts">
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({ name: 'AiRecommendationBlock' })

defineProps<{
  areaLabel: string
  issue?: string
  suggestion: string
  severityLabel?: string
  severityTone?: BadgeTone
}>()
</script>

<template>
  <article class="ai-recommendation-block">
    <div class="ai-recommendation-block__head">
      <UiTag tone="blue" size="sm">{{ areaLabel }}</UiTag>
      <UiTag v-if="severityLabel" :tone="severityTone ?? 'gray'" size="sm">{{ severityLabel }}</UiTag>
      <span v-if="issue" class="ai-recommendation-block__issue">{{ issue }}</span>
    </div>
    <div class="ai-recommendation-block__advice">
      <span class="ai-recommendation-block__advice-label">AI 建议</span>
      <p class="ai-recommendation-block__advice-text">{{ suggestion }}</p>
    </div>
  </article>
</template>
