<template>
  <a-avatar
    class="ui-avatar"
    :class="[`ui-avatar--${resolvedSize}`]"
    :size="antSize"
    :shape="props.shape"
    :src="props.src"
    :alt="props.alt"
    :gap="props.gap"
    v-bind="$attrs"
  >
    <slot />
  </a-avatar>
</template>

<script lang="ts" setup>
import type { UiComponentSize } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiAvatar',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    size?: UiComponentSize | number | 'small' | 'default' | 'large'
    shape?: 'circle' | 'square'
    src?: string
    alt?: string
    gap?: number
  }>(),
  {
    size: 'md',
    shape: 'circle',
    src: undefined,
    alt: undefined,
    gap: 4,
  },
)

const resolvedSize = computed(() => {
  if (typeof props.size === 'number') return 'custom'
  if (props.size === 'small' || props.size === 'sm') return 'sm'
  if (props.size === 'large' || props.size === 'lg') return 'lg'
  return 'md'
})

const antSize = computed(() => {
  if (typeof props.size === 'number') return props.size
  if (resolvedSize.value === 'sm') return 'small'
  if (resolvedSize.value === 'lg') return 'large'
  return 'default'
})
</script>

<style lang="scss" scoped>
.ui-avatar {
  background: var(--dp-gray-200);
  color: var(--dp-text-secondary);
  font-weight: 600;
}
</style>
