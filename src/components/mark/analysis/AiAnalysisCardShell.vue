<script lang="ts" setup>
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'

defineOptions({ name: 'AiAnalysisCardShell' })

withDefaults(
  defineProps<{
    /** true 时嵌入 AI 分析 Tab，使用 AiAnalysisSection；false 时使用 WorkbenchSurfaceCard */
    embedded?: boolean
    /** embedded 模式下 AiAnalysisSection 标题 */
    title: string
    /** embedded 模式下右上角上下文文案 */
    context?: string
    /** embedded 模式下隐藏区块标题（折叠治理等场景） */
    headless?: boolean
    /** 非 embedded 时 WorkbenchSurfaceCard 附加 class */
    cardClass?: string
  }>(),
  {
    embedded: false,
    headless: false,
  },
)

defineSlots<{
  /** 非 embedded：WorkbenchSurfaceCard 标题区 */
  head?: () => unknown
  /** 非 embedded：WorkbenchSurfaceCard 工具栏 */
  toolbar?: () => unknown
  /** embedded：AiAnalysisSection 右上角操作区 */
  actions?: () => unknown
  default?: () => unknown
}>()
</script>

<template>
  <WorkbenchSurfaceCard v-if="!embedded" :class="cardClass">
    <template v-if="$slots.head" #head>
      <slot name="head" />
    </template>
    <template v-if="$slots.toolbar" #toolbar>
      <slot name="toolbar" />
    </template>
    <slot />
  </WorkbenchSurfaceCard>
  <AiAnalysisSection v-else :title="title" :context="context" :headless="headless">
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
    <slot />
  </AiAnalysisSection>
</template>
