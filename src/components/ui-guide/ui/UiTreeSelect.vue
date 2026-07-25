<template>
  <a-tree-select
    class="ui-tree-select"
    :class="[`ui-tree-select--${resolvedSize}`]"
    :size="antSize"
    v-bind="$attrs"
  >
    <template v-if="$slots.title" #title="slotProps">
      <slot name="title" v-bind="slotProps" />
    </template>
    <template v-if="$slots.tagRender" #tagRender="slotProps">
      <slot name="tagRender" v-bind="slotProps" />
    </template>
    <template v-if="$slots.maxTagPlaceholder" #maxTagPlaceholder="slotProps">
      <slot name="maxTagPlaceholder" v-bind="slotProps" />
    </template>
    <slot />
  </a-tree-select>
</template>

<script lang="ts" setup>
import type { UiComponentSize } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiTreeSelect',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    size?: UiComponentSize | 'small' | 'middle' | 'large'
  }>(),
  {
    size: 'sm',
  },
)

const resolvedSize = computed<'sm' | 'md' | 'lg'>(() => {
  const size = props.size
  if (size === 'small' || size === 'sm') return 'sm'
  if (size === 'large' || size === 'lg') return 'lg'
  return 'md'
})

const antSize = computed<'small' | 'middle' | 'large'>(() => {
  if (resolvedSize.value === 'sm') return 'small'
  if (resolvedSize.value === 'lg') return 'large'
  return 'middle'
})
</script>

<style lang="scss" scoped>
.ui-tree-select {
  width: 100%;
}

.ui-tree-select :deep(.ant-select-selector) {
  border-radius: var(--dp-radius-control) !important;
  border-color: var(--dp-border) !important;
  background: var(--dp-surface) !important;
}
</style>
