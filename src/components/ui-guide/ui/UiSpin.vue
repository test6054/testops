<template>
  <a-spin
    class="ui-spin"
    :class="[
      `ui-spin--${props.size}`,
      { 'ui-spin--block': props.block },
    ]"
    :spinning="props.spinning"
    :tip="props.tip"
    :delay="props.delay"
    :size="antSize"
    v-bind="$attrs"
  >
    <slot />
  </a-spin>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

defineOptions({
  name: 'UiSpin',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    spinning?: boolean
    tip?: string
    delay?: number
    /** sm=small · md=default · lg=large */
    size?: 'sm' | 'md' | 'lg'
    /** 作为块级加载区时占满宽度 */
    block?: boolean
  }>(),
  {
    spinning: true,
    tip: undefined,
    delay: undefined,
    size: 'md',
    block: false,
  },
)

const antSize = computed<'small' | 'default' | 'large'>(() => {
  if (props.size === 'sm') return 'small'
  if (props.size === 'lg') return 'large'
  return 'default'
})
</script>

<style lang="scss" scoped>
.ui-spin--block {
  display: block;
  width: 100%;
}

.ui-spin :deep(.ant-spin-text) {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.ui-spin :deep(.ant-spin-dot-item) {
  background-color: var(--dp-color-primary);
}
</style>
