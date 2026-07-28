<template>
  <div
    class="ui-year-picker"
    :class="[
      `ui-year-picker--${resolvedSize}`,
      `ui-year-picker--${props.status}`,
      { 'ui-year-picker--disabled': props.disabled },
    ]"
  >
    <a-date-picker
      v-model:value="pickerValue"
      class="ui-year-picker__input"
      picker="year"
      :placeholder="props.placeholder"
      :allow-clear="props.allowClear"
      :disabled="props.disabled"
      :format="props.format"
      :value-format="props.valueFormat"
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
  name: 'UiYearPicker',
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
    size?: UiComponentSize | SizeType
    status?: UiFieldStatus
  }>(),
  {
    placeholder: '选择年份',
    allowClear: true,
    disabled: false,
    format: 'YYYY',
    valueFormat: 'YYYY',
    size: 'md',
    status: 'default',
  },
)

const emit = defineEmits<{
  (e: 'change', value: string | undefined, dateString: string): void
  (e: 'open-change', open: boolean): void
}>()

/** a-date-picker 设置 valueFormat 后，value 类型为 string */
const pickerValue = computed<string>({
  get: () => modelValue.value ?? '',
  set: (val: string) => {
    modelValue.value = val === '' ? undefined : val
  },
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

const handleChange = (value: string | Dayjs | null, dateString: string) => {
  const normalizedValue = typeof value === 'string' && value !== '' ? value : undefined
  emit('change', normalizedValue, dateString)
}

const handleOpenChange = (open: boolean) => {
  emit('open-change', open)
}
</script>

<style lang="scss" scoped>
.ui-year-picker {
  width: 100%;
  position: relative;
}

.ui-year-picker__input {
  width: 100%;
}

.ui-year-picker :deep(.ant-picker) {
  width: 100%;
  border-radius: var(--dp-radius-control);
  border: 1px solid var(--dp-border);
  background-color: var(--dp-surface);
  box-shadow: none;
  transition:
    border-color var(--dp-duration-normal) var(--dp-ease-default),
    box-shadow var(--dp-duration-normal) var(--dp-ease-default),
    background-color var(--dp-duration-normal) var(--dp-ease-default);
}

.ui-year-picker--sm :deep(.ant-picker) {
  min-height: var(--dp-control-height-sm);
}

.ui-year-picker--md :deep(.ant-picker) {
  min-height: var(--dp-control-height-md);
}

.ui-year-picker--lg :deep(.ant-picker) {
  min-height: var(--dp-control-height-lg);
}

.ui-year-picker :deep(.ant-picker:hover) {
  border-color: var(--dp-blue-600);
}

.ui-year-picker :deep(.ant-picker-focused) {
  border-color: var(--dp-blue-600);
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.ui-year-picker :deep(.ant-picker-input > input) {
  color: var(--dp-text-primary);
}

.ui-year-picker :deep(.ant-picker-input > input::placeholder) {
  color: var(--dp-text-muted);
}

.ui-year-picker :deep(.ant-picker-suffix),
.ui-year-picker :deep(.ant-picker-clear) {
  color: var(--dp-text-muted);
}

.ui-year-picker--error :deep(.ant-picker) {
  border-color: var(--dp-red-500);
}

.ui-year-picker--warning :deep(.ant-picker) {
  border-color: var(--dp-orange-500);
}

.ui-year-picker--success :deep(.ant-picker) {
  border-color: var(--dp-green-500);
}

.ui-year-picker--disabled :deep(.ant-picker),
.ui-year-picker :deep(.ant-picker-disabled) {
  opacity: 0.7;
  background-color: var(--dp-bg-control-disabled);
}
</style>
