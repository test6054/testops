<template>
  <button
    :type="resolvedNativeType"
    class="dp-btn"
    :class="[
      `dp-btn--${computedVariant}`,
      `dp-btn--${size}`,
      { 'dp-btn--block': block },
      { 'dp-btn--loading': loading },
      { 'dp-btn--icon-only': iconOnly },
    ]"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    :aria-disabled="isDisabled || undefined"
    v-bind="$attrs"
    @click="onClick"
  >
    <span v-if="loading" class="dp-btn__loading">
      <svg
        class="dp-btn__spinner"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray="31.4 31.4"
        />
      </svg>
    </span>
    <span v-if="hasPrefixIcon && !loading" class="dp-btn__icon">
      <slot name="icon" />
    </span>
    <span v-if="!iconOnly" class="dp-btn__content">
      <slot />
    </span>
    <span v-if="$slots.suffix && !loading" class="dp-btn__icon">
      <slot name="suffix" />
    </span>
  </button>
</template>

<script lang="ts" setup>
import type { UiButtonStatus, UiButtonVariant, UiComponentSize } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiButton',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    variant?: UiButtonVariant
    size?: UiComponentSize
    block?: boolean
    disabled?: boolean
    loading?: boolean
    status?: UiButtonStatus
    type?: 'button' | 'submit' | 'reset'
    htmlType?: 'button' | 'submit' | 'reset'
    iconOnly?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    block: false,
    disabled: false,
    loading: false,
    status: 'normal',
    type: 'button',
    htmlType: undefined,
    iconOnly: false,
  },
)

const emit = defineEmits<{
  (e: 'click', evt: MouseEvent): void
}>()

const hasPrefixIcon = computed(() => !!useSlots().icon)

const computedVariant = computed(() => {
  if (props.status === 'danger' && (props.variant === 'outline' || props.variant === 'ghost')) {
    return 'danger-outline'
  }
  if (props.status === 'danger') return 'destructive'
  if (props.status === 'success') return 'success'
  if (props.status === 'warning') return 'warning'
  return props.variant
})

const isDisabled = computed(() => props.disabled || props.loading)
const resolvedNativeType = computed(() => props.htmlType || props.type)

const onClick = (evt: MouseEvent) => {
  if (isDisabled.value) {
    evt.preventDefault()
    evt.stopPropagation()
    return
  }
  emit('click', evt)
}
</script>

<style>
.dp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--dp-radius-control);
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  font-family: var(--dp-font-family);
  white-space: nowrap;
  user-select: none;
}

.dp-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.dp-btn--md {
  padding: 0 14px;
  min-height: var(--dp-button-height-md);
}

.dp-btn--sm {
  padding: 0 12px;
  font-size: 13px;
  min-height: var(--dp-button-height-sm);
}

.dp-btn--lg {
  padding: 0 16px;
  font-size: 14px;
  min-height: var(--dp-button-height-lg);
}

.dp-btn--block {
  width: 100%;
}

.dp-btn--icon-only {
  padding-inline: 0;
  aspect-ratio: 1 / 1;
}

.dp-btn--icon-only.dp-btn--sm {
  width: 32px;
}

.dp-btn--icon-only.dp-btn--md {
  width: 36px;
}

.dp-btn--icon-only.dp-btn--lg {
  width: 40px;
}

.dp-btn--primary {
  background-color: var(--ant-color-primary);
  color: var(--ant-color-white);
  border-color: var(--ant-color-primary);
}

.dp-btn--primary:hover {
  background-color: var(--ant-color-primary-hover);
  border-color: var(--ant-color-primary-hover);
}

.dp-btn--outline {
  background-color: var(--dp-surface);
  color: var(--dp-text-primary);
  border-color: var(--dp-border);
}

.dp-btn--outline:hover {
  background-color: var(--dp-gray-50);
  border-color: var(--dp-border-strong);
}

.dp-btn--ghost {
  background-color: transparent;
  color: var(--dp-text-primary);
  border-color: transparent;
}

.dp-btn--ghost:hover {
  background-color: var(--dp-gray-50);
  color: var(--dp-text-secondary);
}

/* Soft 变体（浅蓝色背景） */
.dp-btn--soft {
  background-color: var(--dp-blue-50);
  color: var(--dp-blue-700);
  border-color: var(--dp-blue-200);
}

.dp-btn--soft:hover {
  background-color: var(--dp-blue-200);
  border-color: var(--dp-blue-200);
}

.dp-btn--destructive {
  background-color: var(--dp-red-500);
  color: #fff;
  border-color: var(--dp-red-500);
}

.dp-btn--destructive:hover {
  background-color: var(--dp-red-700);
  border-color: var(--dp-red-700);
}

.dp-btn--danger-outline {
  background-color: var(--dp-surface);
  color: var(--ant-color-error);
  border-color: var(--ant-color-error-border);
}

.dp-btn--danger-outline:hover {
  background-color: var(--ant-color-error-bg);
  border-color: var(--ant-color-error-border-hover);
}

.dp-btn--danger-outline :deep(svg) {
  color: var(--ant-color-error);
}

.dp-btn:not(:disabled):active {
  transform: translateY(1px);
}

.dp-btn:disabled {
  cursor: not-allowed;
  opacity: 1;
  box-shadow: none;
  color: var(--dp-text-disabled);
  border-color: var(--dp-border);
  background-color: var(--dp-bg-button-disabled);
}

.dp-btn--primary:disabled {
  color: var(--ant-color-white);
  background: var(--ant-color-primary-border);
  border-color: var(--ant-color-primary-border);
}

.dp-btn--destructive:disabled {
  color: #fff;
  background: #fca5a5;
  border-color: #fca5a5;
  box-shadow: none;
}

/* Success 变体 */
.dp-btn--success {
  background-color: var(--dp-green-500);
  color: #fff;
  border-color: var(--dp-green-500);
}

.dp-btn--success:hover {
  background-color: var(--dp-green-700);
  border-color: var(--dp-green-700);
}

/* Warning 变体 */
.dp-btn--warning {
  background-color: var(--dp-orange-500);
  color: #fff;
  border-color: var(--dp-orange-500);
}

.dp-btn--warning:hover {
  background-color: var(--dp-orange-700);
  border-color: var(--dp-orange-700);
}

/* Loading 状态 */
.dp-btn--loading {
  cursor: wait;
  opacity: 0.85;
}

.dp-btn__loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dp-btn__spinner {
  width: 16px;
  height: 16px;
  animation: dp-btn-spin 1s linear infinite;
}

.dp-btn__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dp-btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dp-btn__icon :deep(svg),
.dp-btn__icon :deep(.anticon) {
  font-size: 14px;
}

@keyframes dp-btn-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
