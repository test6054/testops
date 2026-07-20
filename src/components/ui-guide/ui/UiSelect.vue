<template>
  <div
    class="ui-select"
    :class="[
      `ui-select--${props.size}`,
      `ui-select--${props.status}`,
      { 'ui-select--disabled': props.disabled },
      rootClass,
    ]"
    :style="rootStyle"
  >
    <a-select
      v-model:value="modelValue"
      class="ui-select__control"
      :mode="props.mode"
      :options="props.options"
      :placeholder="props.placeholder"
      :allow-clear="props.allowClear"
      :show-search="props.allowSearch"
      :filter-option="props.filterOption"
      :option-filter-prop="props.optionFilterProp"
      :disabled="props.disabled"
      :loading="props.loading"
      :size="antSize"
      :get-popup-container="resolvePopupContainer"
      popup-class-name="ui-select-dropdown"
      placement="bottomLeft"
      style="width: 100%"
      v-bind="selectAttrs"
      @change="handleChange"
    >
      <template v-if="$slots.option" #option="slotProps">
        <slot name="option" v-bind="slotProps" />
      </template>
    </a-select>
  </div>
</template>

<script lang="ts" setup>
import type { SizeType } from 'ant-design-vue/es/config-provider'
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { CSSProperties } from 'vue'
import type { UiComponentSize, UiFieldStatus, UiOptionValue, UiSelectOption } from './types'
import { computed, useAttrs } from 'vue'
import { resolvePopupContainer } from './popup-container'

defineOptions({
  name: 'UiSelect',
  inheritAttrs: false,
})

/** 业务选择值：string/number 或数组；禁止 LabeledValue 对象合同 */
const modelValue = defineModel<UiOptionValue | UiOptionValue[] | undefined>()

const props = withDefaults(
  defineProps<{
    options?: Array<UiSelectOption | DefaultOptionType>
    placeholder?: string
    allowClear?: boolean
    allowSearch?: boolean
    filterOption?: boolean
    optionFilterProp?: string
    /** multiple=多选；tags=可录入标签（如筛选多值） */
    mode?: 'multiple' | 'tags'
    disabled?: boolean
    loading?: boolean
    size?: UiComponentSize | SizeType
    status?: UiFieldStatus
  }>(),
  {
    options: () => [],
    placeholder: '请选择',
    allowClear: true,
    allowSearch: false,
    filterOption: true,
    optionFilterProp: 'label',
    mode: undefined,
    disabled: false,
    loading: false,
    size: 'md',
    status: 'default',
  },
)

const emit = defineEmits<{
  change: [value: UiOptionValue | UiOptionValue[] | undefined]
}>()

const attrs = useAttrs()

/** class/style 落到外层容器，避免 width:100% 的 .ui-select 吃掉业务定宽导致整行堆叠 */
const rootClass = computed(() => attrs.class as string | Record<string, boolean> | Array<unknown> | undefined)
const rootStyle = computed(() => attrs.style as CSSProperties | string | undefined)
const selectAttrs = computed(() => {
  const next: Record<string, unknown> = { ...attrs }
  delete next.class
  delete next.style
  return next
})

/** 将 Ant Design 选择值转换为平台统一的原始值，避免把 LabeledValue 泄漏到业务层。 */
function handleChange(
  value: SelectValue,
  _option?: DefaultOptionType | DefaultOptionType[],
): void {
  if (Array.isArray(value)) {
    emit(
      'change',
      value.map((item) => (typeof item === 'object' ? item.value : item)),
    )
    return
  }
  emit('change', typeof value === 'object' && value !== null ? value.value : value)
}

const antSize = computed<SizeType>(() => {
  const size = props.size
  if (size === 'sm' || size === 'small') return 'small'
  if (size === 'lg' || size === 'large') return 'large'
  return 'middle'
})
</script>

<style lang="scss" scoped>
.ui-select {
  width: 100%;
  display: block;
  position: relative;
  min-width: 0;
}

.ui-select :deep(.ant-select) {
  width: 100% !important;
  display: block;
}

.ui-select :deep(.ant-select-selector) {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  border-radius: var(--dp-radius-control) !important;
  border: 1px solid var(--dp-border) !important;
  background-color: var(--dp-surface) !important;
  box-shadow: none !important;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease !important;
}

.ui-select:hover :deep(.ant-select-selector) {
  border-color: var(--dp-blue-600) !important;
}

.ui-select :deep(.ant-select-focused .ant-select-selector),
.ui-select :deep(.ant-select-open .ant-select-selector) {
  border-color: var(--dp-blue-600) !important;
  box-shadow: 0 0 0 3px var(--dp-focus-ring) !important;
}

.ui-select :deep(.ant-select-selection-placeholder) {
  color: var(--dp-text-muted) !important;
}

.ui-select :deep(.ant-select-selection-item) {
  color: var(--dp-text-primary) !important;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-overflow) {
  gap: 4px;
  padding: 1px 0 !important;
  align-items: center !important;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-wrap) {
  align-items: center !important;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-item) {
  display: inline-flex !important;
  align-items: center !important;
  min-height: 24px !important;
  margin: 1px 0 !important;
  padding: 0 8px !important;
  border: 1px solid var(--dp-blue-200) !important;
  border-radius: var(--dp-radius-control-inner) !important;
  background: var(--dp-blue-50) !important;
  color: var(--dp-text-primary) !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  position: static !important;
  inset: auto !important;
  transform: none !important;
  max-width: none;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-item-content) {
  color: var(--dp-text-primary) !important;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-item-remove) {
  color: var(--dp-text-muted) !important;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-item-remove:hover) {
  color: var(--dp-error) !important;
}

.ui-select :deep(.ant-select-arrow),
.ui-select :deep(.ant-select-clear) {
  inset-inline-end: 11px !important;
  top: 50% !important;
  margin-top: 0 !important;
  transform: translateY(-50%) !important;
  height: auto !important;
  display: inline-flex !important;
  align-items: center !important;
  color: var(--dp-text-secondary) !important;
}

.ui-select--sm :deep(.ant-select-selector) {
  height: var(--dp-control-height-sm, 32px) !important;
  min-height: var(--dp-control-height-sm, 32px) !important;
  padding-block: 0 !important;
  padding-inline: 11px 28px !important;
}

.ui-select--md :deep(.ant-select-selector) {
  height: var(--dp-control-height-md, 36px) !important;
  min-height: var(--dp-control-height-md, 36px) !important;
  padding-block: 0 !important;
  padding-inline: 11px 28px !important;
}

.ui-select--lg :deep(.ant-select-selector) {
  height: 40px !important;
  min-height: 40px !important;
  padding-block: 0 !important;
  padding-inline: 11px 28px !important;
}

/* 绝对铺满 + flex 居中：避免 translateY 偏 1px，且空值不 shrink */
.ui-select :deep(.ant-select-selection-wrap) {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
}

.ui-select :deep(.ant-select-selection-search) {
  inset-inline-start: 0 !important;
  inset-inline-end: 0 !important;
  margin-inline-start: 0 !important;
}

.ui-select :deep(.ant-select-selection-search-input) {
  height: 100% !important;
  line-height: 22px !important;
}

.ui-select--sm :deep(.ant-select-selection-item),
.ui-select--sm :deep(.ant-select-selection-placeholder),
.ui-select--md :deep(.ant-select-selection-item),
.ui-select--md :deep(.ant-select-selection-placeholder),
.ui-select--lg :deep(.ant-select-selection-item),
.ui-select--lg :deep(.ant-select-selection-placeholder) {
  position: absolute !important;
  inset-block: 0 !important;
  inset-inline: 11px 28px !important;
  display: flex !important;
  align-items: center !important;
  margin: 0 !important;
  padding: 0 !important;
  transform: none !important;
  line-height: 22px !important;
  max-width: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-select--error :deep(.ant-select-selector) {
  border-color: var(--dp-red-500) !important;
}

.ui-select--warning :deep(.ant-select-selector) {
  border-color: var(--dp-orange-500) !important;
}

.ui-select--success :deep(.ant-select-selector) {
  border-color: var(--dp-green-500) !important;
}

.ui-select--disabled :deep(.ant-select-selector) {
  background-color: var(--dp-gray-100) !important;
  opacity: 0.7;
}
</style>

<style lang="scss">
.ui-select-dropdown {
  border-radius: var(--dp-radius-overlay) !important;
  padding: 6px !important;
  box-shadow: var(--dp-shadow-md) !important;

  .ant-select-item {
    display: flex !important;
    align-items: center !important;
    min-height: var(--dp-control-height-md, 36px) !important;
    border-radius: var(--dp-radius-control-inner) !important;
    color: var(--dp-text-primary) !important;
    font-family: var(--dp-font-family) !important;
  }

  .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
    background-color: var(--dp-surface) !important;
    outline: 1px solid var(--dp-border);
  }

  .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
    background-color: color-mix(in srgb, var(--dp-primary) 8%, var(--dp-surface)) !important;
    color: var(--dp-text-primary) !important;
    font-weight: 600 !important;
  }

  .ant-select-item-option-content {
    color: inherit !important;
  }

  .ant-select-item-option-state {
    color: var(--dp-text-muted) !important;
  }
}
</style>
