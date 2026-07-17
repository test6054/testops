<template>
  <div
    class="ui-range-picker"
    :class="[
      `ui-range-picker--${resolvedSize}`,
      `ui-range-picker--${props.status}`,
      { 'ui-range-picker--disabled': props.disabled },
    ]"
  >
    <a-range-picker
      v-model:value="pickerValue"
      class="ui-range-picker__input"
      :placeholder="props.placeholder"
      :allow-clear="props.allowClear"
      :disabled="props.disabled"
      :format="props.format"
      :value-format="props.valueFormat"
      :show-time="resolvedShowTime"
      :size="antSize"
      :get-popup-container="resolvePopupContainer"
      popup-class-name="ui-date-picker-dropdown"
      v-bind="$attrs"
      @change="handleChange"
      @open-change="handleOpenChange"
    />
  </div>
</template>

<script lang="ts" setup>
import type { SizeType } from 'ant-design-vue/es/config-provider'
import type { Dayjs } from 'dayjs'
import type { UiComponentSize, UiFieldStatus } from './types'
import { computed } from 'vue'
import { resolvePopupContainer } from './popup-container'

defineOptions({
  name: 'UiRangePicker',
  inheritAttrs: false,
})

/** 区间值：value-format 开启后为 [string, string] */
const modelValue = defineModel<[string, string] | undefined>()

const props = withDefaults(
  defineProps<{
    placeholder?: [string, string]
    allowClear?: boolean
    disabled?: boolean
    format?: string
    valueFormat?: string
    showTime?: boolean
    /** 透传 RangePicker showTime 配置（defaultValue 需为 [Dayjs, Dayjs]） */
    timePickerProps?: Record<string, unknown>
    size?: UiComponentSize | SizeType
    status?: UiFieldStatus
  }>(),
  {
    placeholder: () => ['开始日期', '结束日期'],
    allowClear: true,
    disabled: false,
    format: 'YYYY-MM-DD',
    valueFormat: 'YYYY-MM-DD',
    showTime: false,
    size: 'md',
    status: 'default',
  },
)

const emit = defineEmits<{
  (e: 'change', value: [string, string] | undefined, dateString: [string, string] | string): void
  (e: 'open-change', open: boolean): void
}>()

const pickerValue = computed<[string, string] | undefined>({
  get: () => modelValue.value,
  set: (val) => {
    if (!val || !Array.isArray(val) || val.length < 2) {
      modelValue.value = undefined
      return
    }
    const start = val[0]
    const end = val[1]
    if (!start || !end) {
      modelValue.value = undefined
      return
    }
    modelValue.value = [String(start), String(end)]
  },
})

// RangePicker 的 showTime 与单日 DatePicker 合同不同（defaultValue 为 Dayjs[]）
const resolvedShowTime = computed<boolean | Record<string, unknown>>(() => {
  if (!props.showTime) return false
  if (!props.timePickerProps || Object.keys(props.timePickerProps).length === 0) return true
  return { ...props.timePickerProps } as Record<string, unknown>
})

const resolvedSize = computed<'sm' | 'md' | 'lg'>(() => {
  const size = props.size
  if (size === 'small' || size === 'sm') return 'sm'
  if (size === 'large' || size === 'lg') return 'lg'
  return 'md'
})

const antSize = computed<SizeType>(() => {
  if (resolvedSize.value === 'sm') return 'small'
  if (resolvedSize.value === 'lg') return 'large'
  return 'middle'
})

const handleChange = (
  value: [string, string] | [Dayjs, Dayjs] | null,
  dateString: [string, string] | string,
) => {
  if (!value || !Array.isArray(value) || value.length < 2) {
    emit('change', undefined, dateString)
    return
  }
  const start = value[0]
  const end = value[1]
  if (typeof start === 'string' && typeof end === 'string' && start && end) {
    emit('change', [start, end], dateString)
    return
  }
  emit('change', undefined, dateString)
}

const handleOpenChange = (open: boolean) => {
  emit('open-change', open)
}
</script>

<style lang="scss" scoped>
.ui-range-picker {
  width: 100%;
  position: relative;
}

.ui-range-picker__input {
  width: 100%;
}

.ui-range-picker :deep(.ant-picker) {
  width: 100%;
  border-radius: var(--dp-radius-control);
  border: 1px solid var(--dp-border);
  background-color: var(--dp-bg-control);
  box-shadow: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.ui-range-picker--sm :deep(.ant-picker) {
  min-height: var(--dp-control-height-sm);
}

.ui-range-picker--md :deep(.ant-picker) {
  min-height: var(--dp-control-height-md);
}

.ui-range-picker--lg :deep(.ant-picker) {
  min-height: var(--dp-control-height-lg);
}

.ui-range-picker :deep(.ant-picker:hover) {
  border-color: var(--dp-blue-600);
}

.ui-range-picker :deep(.ant-picker-focused) {
  border-color: var(--dp-blue-600);
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.ui-range-picker :deep(.ant-picker-input > input) {
  color: var(--dp-text-primary);
}

.ui-range-picker :deep(.ant-picker-input > input::placeholder) {
  color: var(--dp-text-muted);
}

.ui-range-picker :deep(.ant-picker-separator),
.ui-range-picker :deep(.ant-picker-suffix),
.ui-range-picker :deep(.ant-picker-clear) {
  color: var(--dp-text-muted);
}

.ui-range-picker--error :deep(.ant-picker) {
  border-color: var(--dp-red-500);
}

.ui-range-picker--warning :deep(.ant-picker) {
  border-color: var(--dp-orange-500);
}

.ui-range-picker--success :deep(.ant-picker) {
  border-color: var(--dp-green-500);
}

.ui-range-picker--disabled :deep(.ant-picker),
.ui-range-picker :deep(.ant-picker-disabled) {
  opacity: 0.7;
  background-color: var(--dp-bg-control-disabled);
}
</style>
