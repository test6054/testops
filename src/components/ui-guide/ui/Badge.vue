<template>
  <span
    class="ui-badge"
    :class="[`ui-badge--${props.variant}`, `ui-badge--${props.tone}`, `ui-badge--${props.size}`]"
    v-bind="$attrs"
  >
    <slot />
  </span>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiComponentSize } from './types'

defineOptions({ name: 'UiBadge' })

const props = withDefaults(
  defineProps<{
    variant?: BadgeVariant
    tone?: BadgeTone
    size?: UiComponentSize
  }>(),
  {
    variant: 'outline',
    tone: 'gray',
    size: 'md',
  },
)

type BadgeVariant = 'solid' | 'outline' | 'soft'
</script>

<style scoped>
.ui-badge {
  --badge-text: var(--dp-text-secondary);
  --badge-bg: var(--dp-gray-50);
  --badge-border: var(--dp-gray-200);
  --badge-solid-bg: var(--dp-gray-600);
  --badge-solid-text: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--badge-border);
  border-radius: var(--dp-radius-control-inner);
  white-space: nowrap;
  font-weight: 500;
  line-height: 1;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.ui-badge--sm {
  min-height: 22px;
  padding: 0 8px;
  font-size: 11px;
}

.ui-badge--md {
  min-height: 26px;
  padding: 0 10px;
  font-size: 12px;
}

.ui-badge--lg {
  min-height: 30px;
  padding: 0 12px;
  font-size: 13px;
}

.ui-badge--outline {
  color: var(--badge-text);
  background: transparent;
}

.ui-badge--soft {
  color: var(--badge-text);
  background: var(--badge-bg);
  border-color: transparent;
}

.ui-badge--solid {
  color: var(--badge-solid-text);
  background: var(--badge-solid-bg);
  border-color: transparent;
}

.ui-badge--gray {
  --badge-text: var(--dp-text-secondary);
  --badge-bg: var(--dp-gray-100);
  --badge-border: var(--dp-gray-200);
  --badge-solid-bg: var(--dp-gray-600);
}

.ui-badge--blue {
  --badge-text: var(--dp-blue-700);
  --badge-bg: var(--dp-blue-50);
  --badge-border: var(--dp-blue-200);
  --badge-solid-bg: var(--dp-blue-600);
}

.ui-badge--orange {
  --badge-text: var(--dp-orange-700);
  --badge-bg: var(--dp-orange-50);
  --badge-border: var(--dp-orange-200);
  --badge-solid-bg: var(--dp-orange-500);
}

.ui-badge--green {
  --badge-text: var(--dp-green-700);
  --badge-bg: var(--dp-green-50);
  --badge-border: var(--dp-green-200);
  --badge-solid-bg: var(--dp-green-500);
}

.ui-badge--yellow {
  --badge-text: var(--dp-yellow-700);
  --badge-bg: var(--dp-yellow-50);
  --badge-border: var(--dp-yellow-200);
  --badge-solid-bg: var(--dp-yellow-500);
}

.ui-badge--red {
  --badge-text: var(--dp-red-700);
  --badge-bg: var(--dp-red-50);
  --badge-border: var(--dp-red-200);
  --badge-solid-bg: var(--dp-red-500);
}

.ui-badge--purple {
  --badge-text: var(--dp-purple-700);
  --badge-bg: var(--dp-purple-50);
  --badge-border: var(--dp-purple-200);
  --badge-solid-bg: var(--dp-purple-700);
}
</style>
