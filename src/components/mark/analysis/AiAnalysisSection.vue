<script setup lang="ts">
defineOptions({ name: 'AiAnalysisSection' })

defineProps<{
  title: string
  /** 卡片右上角上下文，如考试名、课程名 */
  context?: string
}>()
</script>

<template>
  <section class="ai-analysis-section">
    <header class="ai-analysis-section__head">
      <h4 class="ai-analysis-section__title">{{ title }}</h4>
      <div class="ai-analysis-section__actions">
        <span v-if="context" class="ai-analysis-section__context">{{ context }}</span>
        <slot name="actions" />
      </div>
    </header>
    <div class="ai-analysis-section__body">
      <slot />
    </div>
  </section>
</template>
