<template>
  <div
    class="ui-textarea"
    :class="[
      `ui-textarea--${props.size}`,
      `ui-textarea--${resolvedStatus}`,
      {
        'ui-textarea--disabled': props.disabled,
        'ui-textarea--readonly': props.readonly,
      },
    ]"
  >
    <a-textarea
      v-model:value="modelValue"
      class="ui-textarea__control"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :rows="props.rows"
      :maxlength="props.maxlength"
      :show-count="showCount"
      :auto-size="props.autoSize"
      v-bind="$attrs"
      @focus="(event: FocusEvent) => emit('focus', event)"
      @blur="(event: FocusEvent) => emit('blur', event)"
    />
  </div>
</template>

<script lang="ts" setup>
import type { UiComponentSize, UiFieldStatus } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiTextarea',
  inheritAttrs: false,
})

const modelValue = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  error?: boolean
  rows?: number
  maxlength?: number
  showCount?: boolean
  showWordLimit?: boolean
  autoSize?: boolean | { minRows?: number, maxRows?: number }
  size?: UiComponentSize
  status?: UiFieldStatus
}>(), {
  placeholder: '',
  disabled: false,
  readonly: false,
  error: false,
  rows: 3,
  maxlength: undefined,
  showCount: false,
  showWordLimit: false,
  autoSize: false,
  size: 'md',
  status: 'default',
})

const emit = defineEmits<{
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const showCount = computed(() => props.showCount || props.showWordLimit)
const resolvedStatus = computed<UiFieldStatus>(() => props.error ? 'error' : props.status)
</script>

<style lang="scss" scoped>
.ui-textarea {
  width: 100%;
}

.ui-textarea :deep(.ant-input) {
  border-radius: var(--dp-radius-control, 4px) !important;
  border: 1px solid var(--dp-border, #e5e7eb) !important;
  background: var(--dp-bg-control, #f3f4f6) !important;
  box-shadow: none !important;
  color: var(--dp-text-primary, #0f172a) !important;
  font-family: var(--dp-font-family) !important;
  line-height: 1.6 !important;
  resize: vertical !important;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease !important;
}

.ui-textarea :deep(.ant-input:hover) {
  border-color: var(--dp-border-hover, #2563eb) !important;
}

.ui-textarea :deep(.ant-input:focus),
.ui-textarea :deep(.ant-input-focused) {
  border-color: var(--dp-blue-600, #2563eb) !important;
  box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(37, 99, 235, 0.25)) !important;
}

.ui-textarea :deep(.ant-input::placeholder) {
  color: var(--dp-text-muted, #6b7280) !important;
}

.ui-textarea :deep(.ant-input-data-count) {
  color: var(--dp-text-muted, #6b7280) !important;
  font-size: 12px !important;
}

.ui-textarea--sm :deep(.ant-input) {
  min-height: 72px !important;
  padding: 8px 12px !important;
  font-size: 13px !important;
}

.ui-textarea--md :deep(.ant-input) {
  min-height: 92px !important;
  padding: 10px 12px !important;
  font-size: 14px !important;
}

.ui-textarea--lg :deep(.ant-input) {
  min-height: 112px !important;
  padding: 12px 14px !important;
  font-size: 15px !important;
}

.ui-textarea--error :deep(.ant-input) {
  border-color: var(--dp-red-500, #ef4444) !important;
}

.ui-textarea--warning :deep(.ant-input) {
  border-color: var(--dp-orange-500, #f97316) !important;
}

.ui-textarea--success :deep(.ant-input) {
  border-color: var(--dp-green-500, #22c55e) !important;
}

.ui-textarea--disabled :deep(.ant-input),
.ui-textarea--readonly :deep(.ant-input) {
  background: var(--dp-bg-control-disabled, #eef2f7) !important;
  color: var(--dp-text-secondary, #475569) !important;
}

.ui-textarea--disabled :deep(.ant-input) {
  cursor: not-allowed !important;
}
</style>
