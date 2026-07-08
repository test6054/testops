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
      :value="pickerValue"
      class="ui-range-picker__input"
      :placeholder="props.placeholder"
      :allow-clear="props.allowClear"
      :disabled="props.disabled"
      :format="props.format"
      :value-format="props.valueFormat"
      :show-time="resolvedShowTime"
      :size="antSize"
      :get-popup-container="resolvePopupContainer"
      popup-class-name="ui-date-picker-dropdown ui-range-picker-dropdown"
      v-bind="$attrs"
      @change="handleChange"
      @update:value="handleValueUpdate"
      @open-change="handleOpenChange"
    >
      <template v-if="$slots.separator" #separator>
        <slot name="separator" />
      </template>
      <template v-if="$slots.suffixIcon" #suffixIcon>
        <slot name="suffixIcon" />
      </template>
    </a-range-picker>
  </div>
</template>

<script lang="ts" setup>
import type { SizeType } from 'ant-design-vue/es/config-provider'
import type { SharedTimeProps } from 'ant-design-vue/es/vc-picker/panels/TimePanel'
import type { Dayjs } from 'dayjs'
import type { UiComponentSize, UiFieldStatus } from './types'
import { computed } from 'vue'
import { resolvePopupContainer } from './popup-container'

type RangeValue = [string, string] | undefined
type PickerRangeValue = [string, string] | [Dayjs, Dayjs] | undefined
type PickerRangeChangeValue = PickerRangeValue | null
type RangeTimePickerProps = Omit<SharedTimeProps<Dayjs>, 'defaultValue'> & {
  defaultValue?: Dayjs[]
}

defineOptions({
  name: 'UiRangePicker',
  inheritAttrs: false,
})

const modelValue = defineModel<RangeValue>()

const props = withDefaults(
  defineProps<{
    placeholder?: [string, string]
    allowClear?: boolean
    disabled?: boolean
    format?: string
    valueFormat?: string
    showTime?: boolean
    timePickerProps?: RangeTimePickerProps
    size?: UiComponentSize | SizeType
    status?: UiFieldStatus
  }>(),
  {
    placeholder: (): [string, string] => ['开始日期', '结束日期'],
    allowClear: true,
    disabled: false,
    format: 'YYYY-MM-DD',
    valueFormat: 'YYYY-MM-DD',
    showTime: false,
    timePickerProps: undefined,
    size: 'md',
    status: 'default',
  },
)
const emit = defineEmits<{
  (e: 'change', value: RangeValue, dateString: [string, string]): void
  (e: 'open-change', open: boolean): void
}>()

const pickerValue = computed<PickerRangeValue>(() => {
  if (!modelValue.value) {
    return undefined
  }
  return [modelValue.value[0], modelValue.value[1]]
})

const resolvedShowTime = computed<boolean | RangeTimePickerProps | undefined>(() => {
  if (!props.showTime) return false
  if (!props.timePickerProps || Object.keys(props.timePickerProps).length === 0) return true
  const { defaultValue, ...rest } = props.timePickerProps
  return {
    ...rest,
    ...(defaultValue ? { defaultValue } : {}),
  }
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

const handleValueUpdate = (value: PickerRangeChangeValue) => {
  if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) {
    modelValue.value = undefined
    return
  }
  modelValue.value = [String(value[0]), String(value[1])]
}

const handleChange = (_value: PickerRangeChangeValue, dateString: [string, string]) => {
  if (!dateString[0] || !dateString[1]) {
    emit('change', undefined, dateString)
    return
  }
  emit('change', [dateString[0], dateString[1]], dateString)
}

const handleOpenChange = (open: boolean) => {
  emit('open-change', open)
}
</script>

<style scoped>
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
  background-color: transparent;
}

.ui-range-picker :deep(.ant-picker-input > input::placeholder) {
  color: var(--dp-text-muted);
}

.ui-range-picker :deep(.ant-picker-range-separator),
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
