<script setup lang="ts">
defineOptions({ name: 'AiAnalysisSection' })

withDefaults(
  defineProps<{
    title: string
    /** 卡片右上角上下文，如考试名、课程名 */
    context?: string
    /** 折叠治理等场景隐藏标题行，仅保留操作区 */
    headless?: boolean
  }>(),
  { headless: false },
)
</script>

<template>
  <section class="ai-analysis-section">
    <header
      v-if="!headless || context || $slots.actions"
      class="ai-analysis-section__head"
      :class="{ 'ai-analysis-section__head--headless': headless }"
    >
      <h4 v-if="!headless" class="ai-analysis-section__title">{{ title }}</h4>
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
