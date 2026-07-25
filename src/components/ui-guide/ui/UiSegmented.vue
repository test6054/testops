<template>
  <div
    class="ui-segmented"
    :class="[
      `ui-segmented--${resolvedSize}`,
      { 'ui-segmented--block': props.block, 'ui-segmented--disabled': props.disabled },
    ]"
  >
    <a-segmented
      v-model:value="modelValue"
      class="ui-segmented__control"
      :options="props.options"
      :disabled="props.disabled"
      :block="props.block"
      :size="antSize"
      v-bind="$attrs"
      @change="handleChange"
    />
  </div>
</template>

<script lang="ts" setup>
import type { UiComponentSize, UiOptionValue } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiSegmented',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue | undefined>()

const props = withDefaults(
  defineProps<{
    options?: UiSegmentedOption[]
    disabled?: boolean
    block?: boolean
    size?: UiComponentSize | 'small' | 'middle' | 'large'
  }>(),
  {
    options: () => [],
    disabled: false,
    block: false,
    size: 'md',
  },
)

const emit = defineEmits<{
  change: [value: UiOptionValue]
}>()

/** 分段选项：与 ant Segmented options 对齐 */
export interface UiSegmentedOption {
  label: string
  value: UiOptionValue
  disabled?: boolean
  icon?: unknown
  payload?: unknown
}

const resolvedSize = computed<'sm' | 'md' | 'lg'>(() => {
  const size = props.size
  if (size === 'small' || size === 'sm') return 'sm'
  if (size === 'large' || size === 'lg') return 'lg'
  return 'md'
})

// ant Segmented 仅 small | large；md 用默认尺寸（不传 size）
const antSize = computed<'small' | 'large' | undefined>(() => {
  if (resolvedSize.value === 'sm') return 'small'
  if (resolvedSize.value === 'lg') return 'large'
  return undefined
})

const handleChange = (value: string | number) => {
  emit('change', value)
}
</script>

<style lang="scss" scoped>
.ui-segmented {
  display: inline-flex;
  max-width: 100%;
}

.ui-segmented--block {
  display: flex;
  width: 100%;
}

.ui-segmented--block :deep(.ant-segmented) {
  width: 100%;
}

.ui-segmented :deep(.ant-segmented) {
  padding: 2px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control);
  background: var(--dp-gray-100);
  color: var(--dp-text-secondary);
}

.ui-segmented :deep(.ant-segmented-item) {
  min-height: 28px;
  border-radius: calc(var(--dp-radius-control) - 2px);
  color: var(--dp-text-secondary);
  transition:
    color var(--dp-duration-fast) var(--dp-ease-default),
    background-color var(--dp-duration-fast) var(--dp-ease-default),
    box-shadow var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-segmented--sm :deep(.ant-segmented-item) {
  min-height: 24px;
  font-size: var(--dp-font-size-xs);
  padding-inline: var(--dp-space-component-tight);
}

.ui-segmented--md :deep(.ant-segmented-item) {
  font-size: var(--dp-font-size-sm);
  padding-inline: var(--dp-space-component);
}

.ui-segmented--lg :deep(.ant-segmented-item) {
  min-height: 32px;
  font-size: var(--dp-font-size-md);
  padding-inline: var(--dp-space-component);
}

.ui-segmented :deep(.ant-segmented-item-selected) {
  color: var(--dp-text-primary);
  background: var(--dp-surface-elevated);
  box-shadow: var(--dp-shadow-xs);
  font-weight: 500;
}

.ui-segmented :deep(.ant-segmented-thumb) {
  border-radius: calc(var(--dp-radius-control) - 2px);
  background: var(--dp-surface-elevated);
  box-shadow: var(--dp-shadow-xs);
}

.ui-segmented :deep(.ant-segmented-item:hover:not(.ant-segmented-item-selected):not(.ant-segmented-item-disabled)) {
  color: var(--dp-text-primary);
}

.ui-segmented--disabled {
  opacity: 0.72;
}
</style>
