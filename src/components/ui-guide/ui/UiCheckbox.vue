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

const props = withDefaults(
  defineProps<{
    value?: UiOptionValue
    disabled?: boolean
    indeterminate?: boolean
  }>(),
  {
    value: undefined,
    disabled: false,
    indeterminate: false,
  },
)

const inGroup = inject(uiCheckboxGroupKey, undefined) === true
</script>

<style lang="scss" scoped>
.ui-checkbox {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-md);
  line-height: 1.6;
  font-family: var(--dp-font-family);
}

.ui-checkbox :deep(.ant-checkbox) {
  top: 0;
}

.ui-checkbox :deep(.ant-checkbox + span) {
  padding-inline-start: var(--dp-space-component);
  color: var(--dp-text-secondary);
}

.ui-checkbox :deep(.ant-checkbox-inner) {
  width: 18px;
  height: 18px;
  border-radius: var(--dp-radius-xs);
  border-color: var(--dp-border);
  background: var(--dp-bg-control);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dp-surface) 35%, transparent);
  transition:
    border-color var(--dp-duration-normal) var(--dp-ease-default),
    background-color var(--dp-duration-normal) var(--dp-ease-default),
    box-shadow var(--dp-duration-normal) var(--dp-ease-default);
}

.ui-checkbox:hover :deep(.ant-checkbox-inner) {
  border-color: var(--dp-border-hover);
}

.ui-checkbox :deep(.ant-checkbox-input:focus-visible + .ant-checkbox-inner) {
  border-color: var(--dp-border-hover);
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.ui-checkbox :deep(.ant-checkbox-checked .ant-checkbox-inner),
.ui-checkbox :deep(.ant-checkbox-indeterminate .ant-checkbox-inner) {
  background: var(--dp-blue-600);
  border-color: var(--dp-blue-600);
}

.ui-checkbox :deep(.ant-checkbox-checked .ant-checkbox-inner::after) {
  inset-inline-start: 4px;
  width: 6px;
  height: 10px;
}

.ui-checkbox :deep(.ant-checkbox-indeterminate .ant-checkbox-inner::after) {
  width: 8px;
  height: 2px;
  border-radius: var(--dp-radius-full);
  background-color: var(--dp-text-inverse);
}

.ui-checkbox :deep(.ant-checkbox-disabled + span),
.ui-checkbox :deep(.ant-checkbox-wrapper-disabled) {
  color: var(--dp-text-muted);
}

.ui-checkbox :deep(.ant-checkbox-disabled .ant-checkbox-inner) {
  background: var(--dp-bg-control-disabled);
  border-color: var(--dp-border);
}
</style>
