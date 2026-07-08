<template>
  <div
    class="ui-select"
    :class="[
      `ui-select--${props.size}`,
      `ui-select--${props.status}`,
      { 'ui-select--disabled': props.disabled },
    ]"
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
      v-bind="$attrs"
    >
      <template v-if="$slots.option" #option="slotProps">
        <slot name="option" v-bind="slotProps" />
      </template>
    </a-select>
  </div>
</template>

<script lang="ts" setup>
import type { SizeType } from 'ant-design-vue/es/config-provider'
import type { UiComponentSize, UiFieldStatus, UiOptionValue, UiSelectOption } from './types'
import { computed } from 'vue'
import { resolvePopupContainer } from './popup-container'

defineOptions({
  name: 'UiSelect',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue | UiOptionValue[] | undefined>()

const props = withDefaults(
  defineProps<{
    options: UiSelectOption[]
    placeholder?: string
    allowClear?: boolean
    allowSearch?: boolean
    filterOption?: boolean
    optionFilterProp?: string
    mode?: 'multiple'
    disabled?: boolean
    loading?: boolean
    size?: UiComponentSize
    status?: UiFieldStatus
  }>(),
  {
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

const antSize = computed<SizeType>(() => {
  const sizeMap: Record<UiComponentSize, SizeType> = {
    sm: 'small',
    md: 'middle',
    lg: 'large',
  }
  return sizeMap[props.size]
})
</script>

<style lang="scss" scoped>
.ui-select {
  width: 100%;
  position: relative;
}

.ui-select :deep(.ant-select-selector) {
  border-radius: var(--dp-radius-control) !important;
  border: 1px solid var(--dp-border) !important;
  background-color: var(--dp-gray-100) !important;
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
  border: 1px solid #d6e8ff !important;
  border-radius: var(--dp-radius-control-inner) !important;
  background: #eef5ff !important;
  color: var(--dp-text-primary) !important;
  font-size: 14px !important;
  font-weight: 500 !important;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-item-content) {
  color: var(--dp-text-primary) !important;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-item-remove) {
  color: var(--dp-text-muted) !important;
}

.ui-select :deep(.ant-select-multiple .ant-select-selection-item-remove:hover) {
  color: var(--ant-color-error, #ff4d4f) !important;
}

.ui-select :deep(.ant-select-arrow),
.ui-select :deep(.ant-select-clear) {
  color: var(--dp-text-secondary) !important;
}

.ui-select--sm :deep(.ant-select-selector) {
  min-height: 32px !important;
}

.ui-select--md :deep(.ant-select-selector) {
  min-height: 36px !important;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

.ui-select--lg :deep(.ant-select-selector) {
  min-height: 40px !important;
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
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12) !important;

  .ant-select-item {
    display: flex !important;
    align-items: center !important;
    min-height: 36px !important;
    border-radius: var(--dp-radius-control-inner) !important;
    color: var(--dp-text-primary) !important;
    font-family: var(--dp-font-family) !important;
  }

  .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
    background-color: var(--dp-surface-subtle) !important;
  }

  .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
    background-color: var(--dp-gray-100) !important;
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
