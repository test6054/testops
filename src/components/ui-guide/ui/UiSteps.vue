<template>
  <a-steps
    class="ui-steps"
    :class="[`ui-steps--${resolvedSize}`, { 'ui-steps--compact': props.compact }]"
    :current="props.current"
    :size="antSize"
    :direction="props.direction"
    :status="props.status"
    :label-placement="props.labelPlacement"
    v-bind="$attrs"
  >
    <slot />
  </a-steps>
</template>

<script lang="ts" setup>
import type { UiComponentSize } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiSteps',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    current?: number
    size?: UiComponentSize | 'small' | 'default'
    direction?: 'horizontal' | 'vertical'
    status?: 'wait' | 'process' | 'finish' | 'error'
    labelPlacement?: 'horizontal' | 'vertical'
    compact?: boolean
  }>(),
  {
    current: 0,
    size: 'sm',
    direction: 'horizontal',
    status: 'process',
    labelPlacement: 'horizontal',
    compact: true,
  },
)

const resolvedSize = computed<'sm' | 'md'>(() => {
  const size = props.size
  if (size === 'small' || size === 'sm') return 'sm'
  return 'md'
})

const antSize = computed<'small' | 'default'>(() => (resolvedSize.value === 'sm' ? 'small' : 'default'))
</script>

<style lang="scss" scoped>
.ui-steps {
  width: 100%;
}

.ui-steps--compact :deep(.ant-steps-item-title) {
  font-size: var(--dp-font-size-sm);
  line-height: 1.4;
}

.ui-steps :deep(.ant-steps-item-process .ant-steps-item-icon) {
  background: var(--dp-primary);
  border-color: var(--dp-primary);
}

.ui-steps :deep(.ant-steps-item-finish .ant-steps-item-icon) {
  border-color: var(--dp-primary);
  color: var(--dp-primary);
}

.ui-steps :deep(.ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon) {
  color: var(--dp-primary);
}
</style>
