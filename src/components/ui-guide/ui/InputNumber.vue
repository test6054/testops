<template>
  <div
    class="ui-input-number"
    :class="[
      `ui-input-number--${props.size}`,
      `ui-input-number--${props.status}`,
      {
        'ui-input-number--disabled': props.disabled,
        'ui-input-number--readonly': props.readonly,
      },
    ]"
  >
    <a-input-number
      :value="modelValue"
      class="ui-input-number__control"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :precision="props.precision"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :controls="props.controls"
      :size="antSize"
      style="width: 100%"
      v-bind="$attrs"
      @update:value="handleUpdateValue"
      @change="handleChange"
      @blur="(event: FocusEvent) => emit('blur', event)"
      @focus="(event: FocusEvent) => emit('focus', event)"
    />
  </div>
</template>

<script lang="ts" setup>
import type { SizeType } from 'ant-design-vue/es/config-provider'
import type { UiComponentSize, UiFieldStatus } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiInputNumber',
  inheritAttrs: false,
})

const modelValue = defineModel<number | undefined>({ default: undefined })

const props = withDefaults(defineProps<{
  min?: number
  max?: number
  step?: number
  precision?: number
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  controls?: boolean
  size?: UiComponentSize
  status?: UiFieldStatus
}>(), {
  min: undefined,
  max: undefined,
  step: 1,
  precision: undefined,
  placeholder: '',
  disabled: false,
  readonly: false,
  controls: true,
  size: 'md',
  status: 'default',
})

const emit = defineEmits<{
  (e: 'change', value: number | undefined): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
}>()

const antSize = computed<SizeType>(() => {
  const sizeMap: Record<UiComponentSize, SizeType> = {
    sm: 'small',
    md: 'middle',
    lg: 'large',
  }
  return sizeMap[props.size]
})

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '')
    return undefined

  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(numberValue) ? undefined : numberValue
}

function handleUpdateValue(value: string | number | null) {
  modelValue.value = normalizeValue(value)
}

function handleChange(value: string | number | null) {
  emit('change', normalizeValue(value))
}
</script>

<style lang="scss" scoped>
.ui-input-number {
  width: 100%;
}

.ui-input-number :deep(.ant-input-number) {
  width: 100%;
  border-radius: var(--dp-radius-control, 4px) !important;
  border: 1px solid var(--dp-border, #e5e7eb) !important;
  background: var(--dp-bg-control, #f3f4f6) !important;
  box-shadow: none !important;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease !important;
}

.ui-input-number :deep(.ant-input-number:hover) {
  border-color: var(--dp-border-hover, #2563eb) !important;
}

.ui-input-number :deep(.ant-input-number-focused) {
  border-color: var(--dp-blue-600, #2563eb) !important;
  box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(37, 99, 235, 0.25)) !important;
}

.ui-input-number :deep(.ant-input-number-input) {
  color: var(--dp-text-primary, #0f172a) !important;
  font-family: var(--dp-font-family) !important;
}

.ui-input-number :deep(.ant-input-number-input::placeholder) {
  color: var(--dp-text-muted, #6b7280) !important;
}

.ui-input-number :deep(.ant-input-number-handler-wrap) {
  border-inline-start: 1px solid var(--dp-border, #e5e7eb) !important;
  background: rgba(255, 255, 255, 0.42) !important;
  border-start-end-radius: var(--dp-radius-control, 4px) !important;
  border-end-end-radius: var(--dp-radius-control, 4px) !important;
  opacity: 1 !important;
}

.ui-input-number :deep(.ant-input-number-handler) {
  color: var(--dp-text-secondary, #475569) !important;
}

.ui-input-number :deep(.ant-input-number-handler:hover) {
  color: var(--dp-blue-600, #2563eb) !important;
}

.ui-input-number--sm :deep(.ant-input-number) {
  min-height: var(--dp-control-height-sm, 32px) !important;
}

.ui-input-number--md :deep(.ant-input-number) {
  min-height: var(--dp-control-height-md, 36px) !important;
}

.ui-input-number--lg :deep(.ant-input-number) {
  min-height: var(--dp-control-height-lg, 40px) !important;
}

.ui-input-number--error :deep(.ant-input-number) {
  border-color: var(--dp-red-500, #ef4444) !important;
}

.ui-input-number--warning :deep(.ant-input-number) {
  border-color: var(--dp-orange-500, #f97316) !important;
}

.ui-input-number--success :deep(.ant-input-number) {
  border-color: var(--dp-green-500, #22c55e) !important;
}

.ui-input-number--disabled :deep(.ant-input-number),
.ui-input-number--readonly :deep(.ant-input-number) {
  background: var(--dp-bg-control-disabled, #eef2f7) !important;
}
</style>
