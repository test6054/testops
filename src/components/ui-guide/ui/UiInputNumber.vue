<template>
  <div
    class="ui-input-number"
    :class="[
      `ui-input-number--${props.size}`,
      `ui-input-number--${props.status}`,
      { 'ui-input-number--disabled': props.disabled },
    ]"
  >
    <span v-if="props.addonBefore || $slots.addonBefore" class="ui-input-number__addon">
      <slot name="addonBefore">{{ props.addonBefore }}</slot>
    </span>
    <a-input-number
      v-model:value="controlValue"
      class="ui-input-number__control"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :precision="props.precision"
      :disabled="props.disabled"
      :placeholder="props.placeholder"
      :controls="props.controls"
      :string-mode="props.stringMode"
      :size="antSize"
      :style="controlStyle"
      v-bind="$attrs"
      @change="handleChange"
      @press-enter="(e: KeyboardEvent) => emit('enter', e)"
      @focus="(e: FocusEvent) => emit('focus', e)"
      @blur="(e: FocusEvent) => emit('blur', e)"
    />
    <span v-if="props.addonAfter || $slots.addonAfter" class="ui-input-number__addon">
      <slot name="addonAfter">{{ props.addonAfter }}</slot>
    </span>
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

/** 数值录入；默认 number，stringMode 时与后端 BigDecimal 字符串合同对齐 */
const modelValue = defineModel<number | string | null | undefined>()

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number | string
    precision?: number
    disabled?: boolean
    placeholder?: string
    controls?: boolean
    stringMode?: boolean
    size?: UiComponentSize | SizeType
    status?: UiFieldStatus
    width?: string | number
    addonBefore?: string
    addonAfter?: string
  }>(),
  {
    min: undefined,
    max: undefined,
    step: 1,
    precision: undefined,
    disabled: false,
    placeholder: '',
    controls: true,
    stringMode: false,
    size: 'md',
    status: 'default',
    width: '100%',
    addonBefore: undefined,
    addonAfter: undefined,
  },
)

const emit = defineEmits<{
  change: [value: number | string | null]
  enter: [event: KeyboardEvent]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

/** ant InputNumber 不接受 null，清空时对外仍可写 null */
const controlValue = computed<number | string | undefined>({
  get: () => (modelValue.value === null ? undefined : modelValue.value),
  set: (value) => {
    modelValue.value = value === undefined ? null : value
  },
})

const antSize = computed<SizeType>(() => {
  const size = props.size
  if (size === 'sm' || size === 'small') return 'small'
  if (size === 'lg' || size === 'large') return 'large'
  return 'middle'
})

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleChange(value: number | string | null) {
  emit('change', value)
}
</script>

<style lang="scss" scoped>
.ui-input-number {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  width: 100%;
  min-width: 0;
}

.ui-input-number__addon {
  flex: 0 0 auto;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
  line-height: 1.2;
  white-space: nowrap;
}

.ui-input-number__control {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.ui-input-number :deep(.ant-input-number) {
  width: 100%;
  border-radius: var(--dp-radius-control) !important;
  border: 1px solid var(--dp-border) !important;
  background-color: var(--dp-surface) !important;
  box-shadow: none !important;
  transition:
    border-color var(--dp-duration-normal) var(--dp-ease-default),
    box-shadow var(--dp-duration-normal) var(--dp-ease-default),
    background-color var(--dp-duration-normal) ease !important;
}

.ui-input-number:hover :deep(.ant-input-number:not(.ant-input-number-disabled)) {
  border-color: var(--dp-blue-600) !important;
}

.ui-input-number :deep(.ant-input-number-focused),
.ui-input-number :deep(.ant-input-number-affix-wrapper-focused) {
  border-color: var(--dp-blue-600) !important;
  box-shadow: 0 0 0 3px var(--dp-focus-ring) !important;
}

.ui-input-number--sm :deep(.ant-input-number) {
  height: var(--dp-control-height-sm, 32px) !important;
  min-height: var(--dp-control-height-sm, 32px) !important;
  display: flex !important;
  align-items: center !important;
}

.ui-input-number--md :deep(.ant-input-number) {
  height: var(--dp-control-height-md, 36px) !important;
  min-height: var(--dp-control-height-md, 36px) !important;
  display: flex !important;
  align-items: center !important;
}

.ui-input-number--lg :deep(.ant-input-number) {
  height: 40px !important;
  min-height: 40px !important;
  display: flex !important;
  align-items: center !important;
}

.ui-input-number :deep(.ant-input-number-input) {
  height: 100% !important;
  line-height: 22px !important;
  color: var(--dp-text-primary) !important;
  font-variant-numeric: tabular-nums;
}

.ui-input-number--error :deep(.ant-input-number) {
  border-color: var(--dp-red-500) !important;
}

.ui-input-number--warning :deep(.ant-input-number) {
  border-color: var(--dp-orange-500) !important;
}

.ui-input-number--success :deep(.ant-input-number) {
  border-color: var(--dp-green-500) !important;
}

.ui-input-number--disabled :deep(.ant-input-number) {
  opacity: 0.7;
}
</style>
