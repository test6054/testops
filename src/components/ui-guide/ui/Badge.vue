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
  --badge-text: var(--dp-text-secondary, #475569);
  --badge-bg: var(--dp-gray-50, #f8fafc);
  --badge-border: var(--dp-gray-200, #e5e7eb);
  --badge-solid-bg: var(--dp-gray-600, #475569);
  --badge-solid-text: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--badge-border);
  border-radius: var(--dp-radius-control-inner, 4px);
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
  --badge-text: var(--dp-text-secondary, #475569);
  --badge-bg: var(--dp-gray-100, #f3f4f6);
  --badge-border: var(--dp-gray-200, #e5e7eb);
  --badge-solid-bg: var(--dp-gray-600, #475569);
}

.ui-badge--blue {
  --badge-text: var(--dp-blue-700, #1d4ed8);
  --badge-bg: var(--dp-blue-50, #eff6ff);
  --badge-border: var(--dp-blue-200, #bfdbfe);
  --badge-solid-bg: var(--dp-blue-600, #2563eb);
}

.ui-badge--orange {
  --badge-text: var(--dp-orange-700, #c2410c);
  --badge-bg: var(--dp-orange-50, #fff7ed);
  --badge-border: var(--dp-orange-200, #fed7aa);
  --badge-solid-bg: var(--dp-orange-500, #f97316);
}

.ui-badge--green {
  --badge-text: var(--dp-green-700, #15803d);
  --badge-bg: var(--dp-green-50, #ecfdf3);
  --badge-border: var(--dp-green-200, #bbf7d0);
  --badge-solid-bg: var(--dp-green-500, #22c55e);
}

.ui-badge--yellow {
  --badge-text: var(--dp-yellow-700, #a16207);
  --badge-bg: var(--dp-yellow-50, #fefce8);
  --badge-border: var(--dp-yellow-200, #fef08a);
  --badge-solid-bg: var(--dp-yellow-500, #eab308);
}

.ui-badge--red {
  --badge-text: var(--dp-red-700, #b91c1c);
  --badge-bg: var(--dp-red-50, #fef2f2);
  --badge-border: var(--dp-red-200, #fecdd3);
  --badge-solid-bg: var(--dp-red-500, #ef4444);
}

.ui-badge--purple {
  --badge-text: var(--dp-purple-700, #7c3aed);
  --badge-bg: var(--dp-purple-50, #f5f3ff);
  --badge-border: var(--dp-purple-200, #ddd6fe);
  --badge-solid-bg: var(--dp-purple-700, #7c3aed);
}
</style>
