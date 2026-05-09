<template>
  <a-checkbox
    v-if="inGroup"
    class="ui-checkbox"
    :value="props.value"
    :disabled="props.disabled"
    :indeterminate="props.indeterminate"
    v-bind="$attrs"
  >
    <slot />
  </a-checkbox>

  <a-checkbox
    v-else
    v-model:checked="checkedModel"
    class="ui-checkbox"
    :disabled="props.disabled"
    :indeterminate="props.indeterminate"
    v-bind="$attrs"
  >
    <slot />
  </a-checkbox>
</template>

<script lang="ts" setup>
import type { UiOptionValue } from './types'
import { inject } from 'vue'
import { uiCheckboxGroupKey } from './context'

defineOptions({
  name: 'UiCheckbox',
  inheritAttrs: false,
})

const checkedModel = defineModel<boolean>({ default: false })

const props = withDefaults(defineProps<{
  value?: UiOptionValue
  disabled?: boolean
  indeterminate?: boolean
}>(), {
  value: undefined,
  disabled: false,
  indeterminate: false,
})

const inGroup = inject(uiCheckboxGroupKey, undefined) === true
</script>

<style lang="scss" scoped>
.ui-checkbox {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  color: var(--dp-text-primary, #0f172a);
  font-size: 14px;
  line-height: 1.6;
  font-family: var(--dp-font-family, 'Inter', 'PingFang SC', sans-serif);
}

.ui-checkbox :deep(.ant-checkbox) {
  top: 0;
}

.ui-checkbox :deep(.ant-checkbox + span) {
  padding-inline-start: 10px;
  color: var(--dp-text-secondary, #475569);
}

.ui-checkbox :deep(.ant-checkbox-inner) {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border-color: var(--dp-border, #e5e7eb);
  background: var(--dp-bg-control, #f3f4f6);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.ui-checkbox:hover :deep(.ant-checkbox-inner) {
  border-color: var(--dp-border-hover, #2563eb);
}

.ui-checkbox :deep(.ant-checkbox-input:focus-visible + .ant-checkbox-inner) {
  border-color: var(--dp-border-hover, #2563eb);
  box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(37, 99, 235, 0.25));
}

.ui-checkbox :deep(.ant-checkbox-checked .ant-checkbox-inner),
.ui-checkbox :deep(.ant-checkbox-indeterminate .ant-checkbox-inner) {
  background: var(--dp-blue-600, #2563eb);
  border-color: var(--dp-blue-600, #2563eb);
}

.ui-checkbox :deep(.ant-checkbox-checked .ant-checkbox-inner::after) {
  inset-inline-start: 4px;
  width: 6px;
  height: 10px;
}

.ui-checkbox :deep(.ant-checkbox-indeterminate .ant-checkbox-inner::after) {
  width: 8px;
  height: 2px;
  border-radius: 999px;
  background-color: #fff;
}

.ui-checkbox :deep(.ant-checkbox-disabled + span),
.ui-checkbox :deep(.ant-checkbox-wrapper-disabled) {
  color: var(--dp-text-muted, #6b7280);
}

.ui-checkbox :deep(.ant-checkbox-disabled .ant-checkbox-inner) {
  background: var(--dp-bg-control-disabled, #eef2f7);
  border-color: var(--dp-border, #e5e7eb);
}
</style>
