<template>
  <div
    class="ui-date-picker"
    :class="[
      `ui-date-picker--${resolvedSize}`,
      `ui-date-picker--${props.status}`,
      { 'ui-date-picker--disabled': props.disabled },
    ]"
  >
    <a-date-picker
      v-model:value="pickerValue"
      class="ui-date-picker__input"
      :placeholder="props.placeholder"
      :allow-clear="props.allowClear"
      :disabled="props.disabled"
      :format="props.format"
      :value-format="props.valueFormat"
      :show-time="resolvedShowTime"
      :disabled-date="props.disabledDate"
      :disabled-time="props.disabledTime"
      :presets="props.shortcuts"
      :size="antSize"
      :get-popup-container="resolvePopupContainer"
      popup-class-name="ui-date-picker-dropdown"
      v-bind="$attrs"
      @change="handleChange"
      @open-change="handleOpenChange"
    >
      <template v-if="$slots.suffixIcon" #suffixIcon>
        <slot name="suffixIcon" />
      </template>
    </a-date-picker>
  </div>
</template>

<script lang="ts" setup>
import type { SizeType } from 'ant-design-vue/es/config-provider'
import type { SharedTimeProps } from 'ant-design-vue/es/vc-picker/panels/TimePanel'
import type { Dayjs } from 'dayjs'
import type { UiComponentSize, UiFieldStatus } from './types'
import { computed } from 'vue'
import { resolvePopupContainer } from './popup-container'

defineOptions({
  name: 'UiDatePicker',
  inheritAttrs: false,
})

const modelValue = defineModel<string>()

const props = withDefaults(
  defineProps<{
    placeholder?: string
    allowClear?: boolean
    disabled?: boolean
    format?: string
    valueFormat?: string
    showTime?: boolean
    timePickerProps?: SharedTimeProps<Dayjs>
    disabledDate?: (current: Dayjs) => boolean
    disabledTime?: (current: Dayjs | null) => DisabledTimeResult
    shortcuts?: PresetDate[]
    size?: UiComponentSize | SizeType
    status?: UiFieldStatus
  }>(),
  {
    placeholder: '选择日期',
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
  (e: 'change', value: string | undefined, dateString: string): void
  (e: 'open-change', open: boolean): void
}>()

interface PresetDate {
  label: string
  value: Dayjs
}

interface DisabledTimeResult {
  disabledHours?: () => number[]
  disabledMinutes?: (selectedHour: number) => number[]
  disabledSeconds?: (selectedHour: number, selectedMinute: number) => number[]
}

/** a-date-picker 设置 valueFormat 后，value 类型为 string */
const pickerValue = computed<string>({
  get: () => modelValue.value ?? '',
  set: (val: string) => {
    modelValue.value = val === '' ? undefined : val
  },
})

/** showTime 为 true 时，合并 timePickerProps（如 defaultValue） */
const resolvedShowTime = computed<boolean | SharedTimeProps<Dayjs>>(() => {
  if (!props.showTime) return false
  if (!props.timePickerProps || Object.keys(props.timePickerProps).length === 0) return true
  return { ...props.timePickerProps }
})

const resolvedSize = computed<UiComponentSize>(() => {
  const size = props.size
  if (size === 'small' || size === 'sm') return 'sm'
  if (size === 'large' || size === 'lg') return 'lg'
  return 'md'
})

const antSize = computed<SizeType>(() => {
  const sizeMap: Record<UiComponentSize, SizeType> = {
    sm: 'small',
    md: 'middle',
    lg: 'large',
  }
  return sizeMap[resolvedSize.value]
})

const handleChange = (value: string | Dayjs | null, dateString: string) => {
  const normalizedValue = typeof value === 'string' && value !== '' ? value : undefined
  emit('change', normalizedValue, dateString)
}

const handleOpenChange = (open: boolean) => {
  emit('open-change', open)
}
</script>

<style scoped>
.ui-date-picker {
  width: 100%;
  position: relative;
}

.ui-date-picker__input {
  width: 100%;
}

.ui-date-picker :deep(.ant-picker) {
  width: 100%;
  border-radius: var(--dp-radius-control);
  border: 1px solid var(--dp-border);
  background-color: var(--dp-bg-control);
  font-size: 14px;
  color: var(--dp-text-primary);
  font-family: var(--dp-font-family);
  box-shadow: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.ui-date-picker--sm :deep(.ant-picker) {
  min-height: var(--dp-control-height-sm);
}

.ui-date-picker--md :deep(.ant-picker) {
  min-height: var(--dp-control-height-md);
}

.ui-date-picker--lg :deep(.ant-picker) {
  min-height: var(--dp-control-height-lg);
}

.ui-date-picker :deep(.ant-picker:hover) {
  border-color: var(--dp-blue-600);
}

.ui-date-picker :deep(.ant-picker-focused) {
  border-color: var(--dp-blue-600);
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.ui-date-picker :deep(.ant-picker-input > input) {
  background-color: transparent;
  color: var(--dp-text-primary);
  font-size: 14px;
  font-family: var(--dp-font-family);
}

.ui-date-picker :deep(.ant-picker-input > input::placeholder) {
  color: var(--dp-text-muted);
}

.ui-date-picker :deep(.ant-picker-suffix) {
  color: var(--dp-text-muted);
}

.ui-date-picker :deep(.ant-picker-clear) {
  background: transparent;
  color: var(--dp-text-muted);
}

.ui-date-picker--error :deep(.ant-picker) {
  border-color: var(--dp-red-500);
}

.ui-date-picker--warning :deep(.ant-picker) {
  border-color: var(--dp-orange-500);
}

.ui-date-picker--success :deep(.ant-picker) {
  border-color: var(--dp-green-500);
}

.ui-date-picker--disabled :deep(.ant-picker),
.ui-date-picker :deep(.ant-picker-disabled) {
  opacity: 0.7;
  background-color: var(--dp-bg-control-disabled);
}

/* 弹出面板样式 — 通过 teleport 渲染，需要非 scoped */
</style>

<style>
.ui-date-picker-dropdown {
  border-radius: var(--dp-radius-overlay) !important;
  box-shadow: var(--dp-shadow-dropdown) !important;
  font-family: var(--dp-font-family) !important;
  overflow: hidden !important;
  padding: 6px !important;
}

.ui-date-picker-dropdown .ant-picker-panel-container {
  overflow: hidden !important;
}

.ui-date-picker-dropdown .ant-picker-header {
  font-family: var(--dp-font-family) !important;
  font-weight: 600 !important;
  color: var(--dp-text-primary) !important;
}

.ui-date-picker-dropdown .ant-picker-header-view {
  font-size: 15px !important;
  font-weight: 600 !important;
  color: var(--dp-text-primary) !important;
}

.ui-date-picker-dropdown .ant-picker-content th {
  font-family: var(--dp-font-family) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: var(--dp-text-muted) !important;
}

.ui-date-picker-dropdown .ant-picker-cell-inner {
  font-family: var(--dp-font-family) !important;
  font-size: 14px !important;
  color: var(--dp-text-primary) !important;
  border-radius: var(--dp-radius-control-inner) !important;
}

.ui-date-picker-dropdown .ant-picker-cell-selected .ant-picker-cell-inner {
  background-color: var(--dp-blue-600) !important;
  color: #fff !important;
}

.ui-date-picker-dropdown .ant-picker-cell-today .ant-picker-cell-inner::before {
  border: 1px solid var(--dp-blue-600) !important;
}

.ui-date-picker-dropdown .ant-picker-cell:hover .ant-picker-cell-inner {
  background-color: var(--dp-gray-100) !important;
}

.ui-date-picker-dropdown
  .ant-picker-time-panel-column
  > li.ant-picker-time-panel-cell-selected
  .ant-picker-time-panel-cell-inner {
  font-weight: 600 !important;
  color: var(--dp-text-primary) !important;
  background-color: var(--dp-gray-100) !important;
}

.ui-date-picker-dropdown .ant-picker-footer {
  border-top: 1px solid var(--dp-border) !important;
  padding: 8px 12px !important;
}

.ui-date-picker-dropdown .ant-picker-ranges .ant-picker-ok .ant-btn-primary {
  font-family: var(--dp-font-family) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  background-color: var(--dp-blue-600) !important;
  border: none !important;
  border-radius: var(--dp-radius-control-inner) !important;
  padding: 4px 8px !important;
  box-shadow: none !important;
  height: auto !important;
}

.ui-date-picker-dropdown .ant-picker-ranges .ant-picker-ok .ant-btn-primary:hover {
  background-color: var(--dp-blue-700) !important;
}
</style>
