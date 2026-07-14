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
  border-radius: var(--dp-radius-control-inner);
  border: 1px solid transparent;
  color: var(--tag-text);
  font-family: var(--dp-font-family), sans-serif;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.ui-tag--sm {
  min-height: 22px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
}

.ui-tag--md {
  min-height: 26px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
}

.ui-tag--lg {
  min-height: 30px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
}

.ui-tag--soft {
  background: var(--tag-bg);
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

.ui-tag--empty {
  opacity: 0.88;
}
</style>
