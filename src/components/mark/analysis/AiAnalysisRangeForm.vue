<script setup lang="ts">
defineOptions({ name: 'AiAnalysisRangeForm' })

withDefaults(
  defineProps<{
    /** 底部业务说明，跨整行展示 */
    hint?: string
  }>(),
  { hint: '' },
)
</script>

<template>
  <div class="ai-analysis-range-form">
    <slot />
    <p v-if="hint" class="ai-analysis-range-form__hint">{{ hint }}</p>
  </div>
</template>
