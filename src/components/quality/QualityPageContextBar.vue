<script setup lang="ts">
/**
 * 质量评价页 ContextBar：Layout 已注入范围选择器时仅展示标题与操作区。
 * subtitle 默认省略；动态范围优先 #status。
 */
import { computed, useSlots } from 'vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import { useQualityPageScope } from '@/composables/useQualityPageScope'

defineOptions({ name: 'QualityPageContextBar' })

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    showTitle?: boolean
  }>(),
  {
    showTitle: false,
  },
)

const { showPageScopeHeader } = useQualityPageScope()
const slots = useSlots()

const showContextBar = computed(() => {
  if (props.showTitle) return true
  if (showPageScopeHeader) return true
  return Boolean(slots.actions || slots.status)
})
</script>

<template>
  <ContextBar v-if="showContextBar" :show-title="showTitle" :title="title" :subtitle="subtitle">
    <template v-if="$slots.status" #status>
      <slot name="status" />
    </template>
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
  </ContextBar>
</template>
