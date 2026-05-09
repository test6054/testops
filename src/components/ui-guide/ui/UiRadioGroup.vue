<template>
  <div
    class="ui-radio-group"
    :class="[
      `ui-radio-group--${props.size}`,
      { 'ui-radio-group--block': props.block },
    ]"
  >
    <a-radio-group
      v-model:value="modelValue"
      class="ui-radio-group__control"
      :disabled="props.disabled"
      v-bind="$attrs"
    >
      <template v-if="props.options.length > 0">
        <UiRadio
          v-for="option in props.options"
          :key="String(option.value)"
          :value="option.value"
          :disabled="props.disabled || option.disabled"
        >
          {{ option.label }}
        </UiRadio>
      </template>
      <slot v-else />
    </a-radio-group>
  </div>
</template>

<script lang="ts" setup>
import type { UiComponentSize, UiOptionValue, UiSelectOption } from './types'
import { provide } from 'vue'
import { uiRadioGroupKey } from './context'
import UiRadio from './UiRadio.vue'

defineOptions({
  name: 'UiRadioGroup',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue | boolean | undefined>()

const props = withDefaults(defineProps<{
  options?: UiSelectOption[]
  size?: UiComponentSize
  block?: boolean
  disabled?: boolean
}>(), {
  options: () => [],
  size: 'md',
  block: false,
  disabled: false,
})

provide(uiRadioGroupKey, true)
</script>

<style lang="scss" scoped>
.ui-radio-group {
  width: fit-content;
}

.ui-radio-group :deep(.ant-radio-group) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-control, 4px);
  background: var(--dp-gray-100, #f3f4f6);
}

.ui-radio-group--block,
.ui-radio-group--block :deep(.ant-radio-group) {
  display: flex;
  width: 100%;
}

.ui-radio-group :deep(.ant-radio-button-wrapper) {
  height: auto;
  padding: 0 14px;
  border: none;
  border-radius: var(--dp-radius-control-inner, 4px);
  background: transparent;
  color: var(--dp-text-secondary, #475569);
  font-size: 14px;
  font-weight: 500;
  line-height: 32px;
  box-shadow: none;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.ui-radio-group--sm :deep(.ant-radio-button-wrapper) {
  line-height: 28px;
}

.ui-radio-group--lg :deep(.ant-radio-button-wrapper) {
  line-height: 36px;
}

.ui-radio-group--block :deep(.ant-radio-button-wrapper) {
  flex: 1;
  text-align: center;
}

.ui-radio-group :deep(.ant-radio-button-wrapper:not(:first-child)::before) {
  display: none;
}

.ui-radio-group :deep(.ant-radio-button-wrapper:hover) {
  color: var(--dp-text-primary, #0f172a);
}

.ui-radio-group :deep(.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
  background: var(--dp-surface, #fff);
  color: var(--dp-text-primary, #0f172a);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.ui-radio-group :deep(.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover) {
  color: var(--dp-text-primary, #0f172a);
}

.ui-radio-group :deep(.ant-radio-button-wrapper:has(.ant-radio-button-input:focus-visible)) {
  box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(37, 99, 235, 0.25));
}

.ui-radio-group :deep(.ant-radio-button-wrapper-disabled) {
  color: var(--dp-text-muted, #6b7280);
}
</style>
