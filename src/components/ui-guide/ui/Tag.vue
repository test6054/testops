<template>
  <span
    class="ui-tag"
    :class="[
      `ui-tag--${resolvedTone}`,
      `ui-tag--${props.variant}`,
      `ui-tag--${props.size}`,
      { 'ui-tag--empty': props.empty },
    ]"
    v-bind="$attrs"
  >
    <slot />
  </span>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiComponentSize } from './types'
import { computed } from 'vue'

defineOptions({ name: 'UiTag' })

const props = withDefaults(
  defineProps<{
    tone?: BadgeTone
    empty?: boolean
    size?: UiComponentSize
    variant?: 'soft' | 'outline'
  }>(),
  {
    tone: 'gray',
    empty: false,
    size: 'md',
    variant: 'soft',
  },
)

const resolvedTone = computed<BadgeTone>(() => (props.empty ? 'gray' : props.tone))
</script>

<style scoped>
.ui-tag {
  --tag-text: var(--dp-blue-700);
  --tag-bg: var(--dp-blue-50);
  --tag-border: var(--dp-blue-200);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: var(--dp-radius-full, 999px);
  border: 1px solid transparent;
  color: var(--tag-text);
  font-family: var(--dp-font-family), sans-serif;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition:
    background-color var(--dp-duration-fast) var(--dp-ease-default),
    border-color var(--dp-duration-fast) var(--dp-ease-default),
    color var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-tag--sm {
  min-height: 22px;
  padding: 0 9px;
  font-size: var(--dp-font-size-xxs);
}

.ui-tag--md {
  min-height: 26px;
  padding: 0 11px;
  font-size: var(--dp-font-size-xs);
}

.ui-tag--lg {
  min-height: 30px;
  padding: 0 13px;
  font-size: var(--dp-font-size-sm);
}

.ui-tag--soft {
  background: var(--tag-bg);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tag-text) 8%, transparent);
}

.ui-tag--outline {
  background: transparent;
  border-color: var(--tag-border);
}

.ui-tag--gray {
  --tag-text: var(--dp-text-secondary);
  --tag-bg: var(--dp-gray-50);
  --tag-border: var(--dp-gray-200);
}

.ui-tag--blue {
  --tag-text: var(--dp-blue-700);
  --tag-bg: var(--dp-blue-50);
  --tag-border: var(--dp-blue-200);
}

.ui-tag--green {
  --tag-text: var(--dp-green-700);
  --tag-bg: var(--dp-green-50);
  --tag-border: var(--dp-green-200);
}

.ui-tag--orange {
  --tag-text: var(--dp-orange-700);
  --tag-bg: var(--dp-orange-50);
  --tag-border: var(--dp-orange-200);
}

.ui-tag--red {
  --tag-text: var(--dp-red-700);
  --tag-bg: var(--dp-red-50);
  --tag-border: var(--dp-red-200);
}

.ui-tag--yellow {
  --tag-text: var(--dp-yellow-700);
  --tag-bg: var(--dp-yellow-50);
  --tag-border: var(--dp-yellow-200);
}

.ui-tag--purple {
  --tag-text: var(--dp-purple-700);
  --tag-bg: var(--dp-purple-50);
  --tag-border: var(--dp-purple-200);
}

.ui-tag--ink {
  --tag-text: var(--dp-gray-900);
  --tag-bg: var(--dp-gray-100);
  --tag-border: var(--dp-gray-300);
}

.ui-tag--empty {
  opacity: 0.88;
}
</style>
