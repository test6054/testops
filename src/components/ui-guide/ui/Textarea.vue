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

const props = withDefaults(
  defineProps<{
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
  }>(),
  {
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
  },
)

const emit = defineEmits<{
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const showCount = computed(() => props.showCount || props.showWordLimit)
const resolvedStatus = computed<UiFieldStatus>(() => (props.error ? 'error' : props.status))
</script>

<style lang="scss" scoped>
.ui-textarea {
  width: 100%;
}

.ui-textarea :deep(.ant-input) {
  border-radius: var(--dp-radius-control) !important;
  border: 1px solid var(--dp-border) !important;
  background: var(--dp-surface) !important;
  box-shadow: none !important;
  color: var(--dp-text-primary) !important;
  font-family: var(--dp-font-family) !important;
  line-height: 1.6 !important;
  resize: vertical !important;
  transition:
    border-color var(--dp-duration-normal) var(--dp-ease-default),
    box-shadow var(--dp-duration-normal) var(--dp-ease-default),
    background-color var(--dp-duration-normal) ease !important;
}

.ui-textarea :deep(.ant-input:hover) {
  border-color: var(--dp-border-hover) !important;
}

.ui-textarea :deep(.ant-input:focus),
.ui-textarea :deep(.ant-input-focused) {
  border-color: var(--dp-blue-600) !important;
  box-shadow: 0 0 0 3px var(--dp-focus-ring) !important;
}

.ui-textarea :deep(.ant-input::placeholder) {
  color: var(--dp-text-muted) !important;
}

.ui-textarea :deep(.ant-input-data-count) {
  color: var(--dp-text-muted) !important;
  font-size: var(--dp-font-size-xs) !important;
}

.ui-textarea--sm :deep(.ant-input) {
  min-height: 64px !important;
  padding: var(--dp-space-component-tight) var(--dp-space-component) !important;
  font-size: var(--dp-font-size-sm) !important;
}

.ui-textarea--md :deep(.ant-input) {
  min-height: 80px !important;
  padding: var(--dp-space-component-tight) var(--dp-space-component) !important;
  font-size: var(--dp-font-size-md) !important;
}

.ui-textarea--lg :deep(.ant-input) {
  min-height: 96px !important;
  padding: var(--dp-space-component) !important;
  font-size: var(--dp-type-panel-title-size) !important;
}

.ui-textarea--error :deep(.ant-input) {
  border-color: var(--dp-red-500) !important;
}

.ui-textarea--warning :deep(.ant-input) {
  border-color: var(--dp-orange-500) !important;
}

.ui-textarea--success :deep(.ant-input) {
  border-color: var(--dp-green-500) !important;
}

.ui-textarea--disabled :deep(.ant-input),
.ui-textarea--readonly :deep(.ant-input) {
  background: var(--dp-bg-control-disabled) !important;
  color: var(--dp-text-secondary) !important;
}

.ui-textarea--disabled :deep(.ant-input) {
  cursor: not-allowed !important;
}
</style>
