<template>
  <a-descriptions
    class="ui-descriptions"
    :class="[
      `ui-descriptions--${resolvedSize}`,
      { 'ui-descriptions--bordered': props.bordered },
    ]"
    :column="props.column"
    :bordered="props.bordered"
    :size="antSize"
    :layout="props.layout"
    :colon="props.colon"
    v-bind="$attrs"
  >
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
    <slot />
  </a-descriptions>
</template>

<script lang="ts" setup>
import type { UiComponentSize } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiDescriptions',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    column?: number | object
    bordered?: boolean
    size?: UiComponentSize | 'small' | 'middle' | 'default' | 'large'
    layout?: 'horizontal' | 'vertical'
    colon?: boolean
  }>(),
  {
    column: 2,
    bordered: false,
    size: 'sm',
    layout: 'horizontal',
    colon: true,
  },
)

const resolvedSize = computed<'sm' | 'md' | 'lg'>(() => {
  const size = props.size
  if (size === 'small' || size === 'sm') return 'sm'
  if (size === 'large' || size === 'lg') return 'lg'
  return 'md'
})

const antSize = computed<'small' | 'middle' | 'default'>(() => {
  if (resolvedSize.value === 'sm') return 'small'
  if (resolvedSize.value === 'lg') return 'middle'
  return 'middle'
})
</script>

<style lang="scss" scoped>
.ui-descriptions :deep(.ant-descriptions-item-label) {
  color: var(--dp-text-secondary);
  font-weight: 500;
}

.ui-descriptions--sm :deep(.ant-descriptions-item-label),
.ui-descriptions--sm :deep(.ant-descriptions-item-content) {
  padding-bottom: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
}

.ui-descriptions--bordered :deep(.ant-descriptions-view) {
  border-radius: var(--dp-radius-control);
  border-color: var(--dp-border);
}

.ui-descriptions :deep(.ant-descriptions-item-content) {
  color: var(--dp-text-primary);
}
</style>
