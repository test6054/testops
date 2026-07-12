<script setup lang="ts">
import type { WeaknessLevelCode } from '@/utils/ai-analysis-display'
import { WEAKNESS_LEVEL_TONE, WeaknessLevelDescription } from '@/utils/ai-analysis-display'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'AiWeaknessRow' })

defineProps<{
  title: string
  weaknessLevel: WeaknessLevelCode
  metricText?: string
  questionNos?: string
}>()
</script>

<template>
  <div class="ai-weakness-row">
    <UiTag :tone="WEAKNESS_LEVEL_TONE[weaknessLevel]" size="sm">
      {{ strictEnumLabel(WeaknessLevelDescription, weaknessLevel, '薄弱点等级') }}
    </UiTag>
    <span class="ai-weakness-row__title">{{ title }}</span>
    <span v-if="questionNos" class="ai-weakness-row__meta">题号：{{ questionNos }}</span>
    <span v-if="metricText" class="ai-weakness-row__metric">{{ metricText }}</span>
  </div>
</template>
