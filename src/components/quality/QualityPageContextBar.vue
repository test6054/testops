<script setup lang="ts">
/** 质量评价页 ContextBar：标题与操作区（scope 由 quality-workspace-layout 承担）。 */
import { computed, useSlots } from 'vue'
import ContextBar from '@/components/workbench/ContextBar.vue'

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

const slots = useSlots()

const showContextBar = computed(() => {
  if (props.showTitle) {
    return true
  }
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
