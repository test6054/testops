<template>
  <a-list
    class="ui-list"
    :class="[
      `ui-list--${resolvedSize}`,
      { 'ui-list--bordered': props.bordered, 'ui-list--split': props.split },
    ]"
    :bordered="props.bordered"
    :split="props.split"
    :size="antSize"
    :item-layout="props.itemLayout"
    :loading="props.loading"
    :data-source="props.dataSource"
    v-bind="$attrs"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
    <template v-if="$slots.renderItem" #renderItem="slotProps">
      <slot name="renderItem" v-bind="slotProps" />
    </template>
    <template v-if="$slots.loadMore" #loadMore>
      <slot name="loadMore" />
    </template>
    <slot />
  </a-list>
</template>

<script lang="ts" setup>
import type { UiComponentSize } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiList',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    bordered?: boolean
    split?: boolean
    size?: UiComponentSize | 'small' | 'default' | 'large'
    itemLayout?: 'horizontal' | 'vertical'
    loading?: boolean
    dataSource?: unknown[]
  }>(),
  {
    bordered: false,
    split: true,
    size: 'sm',
    itemLayout: 'horizontal',
    loading: false,
    dataSource: undefined,
  },
)

const resolvedSize = computed<'sm' | 'md' | 'lg'>(() => {
  const size = props.size
  if (size === 'small' || size === 'sm') return 'sm'
  if (size === 'large' || size === 'lg') return 'lg'
  return 'md'
})

const antSize = computed<'small' | 'default' | 'large'>(() => {
  if (resolvedSize.value === 'sm') return 'small'
  if (resolvedSize.value === 'lg') return 'large'
  return 'default'
})
</script>

<style lang="scss" scoped>
.ui-list {
  background: var(--dp-bg-elevated, var(--dp-surface));
}

.ui-list--bordered {
  border-radius: var(--dp-radius-control);
  border-color: var(--dp-border);
}

.ui-list--sm :deep(.ant-list-item) {
  padding: 10px 12px;
}

.ui-list :deep(.ant-list-item-meta-title) {
  margin-bottom: 2px;
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
}

.ui-list :deep(.ant-list-item-meta-description) {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
  line-height: 1.5;
}
</style>
