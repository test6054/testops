<template>
  <a-radio-button
    v-if="inGroup"
    class="ui-radio"
    :value="props.value"
    :disabled="props.disabled"
    v-bind="$attrs"
  >
    <slot>{{ props.label }}</slot>
  </a-radio-button>

  <a-radio
    v-else
    v-model:checked="checkedModel"
    class="ui-radio ui-radio--single"
    :disabled="props.disabled"
    v-bind="$attrs"
  >
    <slot>{{ props.label }}</slot>
  </a-radio>
</template>

<script lang="ts" setup>
import type { UiOptionValue } from './types'
import { inject } from 'vue'
import { uiRadioGroupKey } from './context'

defineOptions({
  name: 'UiRadio',
  inheritAttrs: false,
})

const checkedModel = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    value?: UiOptionValue | boolean
    label?: string
    disabled?: boolean
  }>(),
  {
    value: undefined,
    label: '',
    disabled: false,
  },
)

const inGroup = inject(uiRadioGroupKey, undefined) === true
</script>

<style lang="scss" scoped>
.ui-radio--single {
  color: var(--dp-text-secondary, #475569);
  font-size: 14px;
}

.ui-radio--single :deep(.ant-radio-inner) {
  width: 18px;
  height: 18px;
  border-color: var(--dp-border, #e5e7eb);
  background: var(--dp-bg-control, #f3f4f6);
}

.ui-radio--single:hover :deep(.ant-radio-inner),
.ui-radio--single :deep(.ant-radio-wrapper:hover .ant-radio-inner) {
  border-color: var(--dp-border-hover, #2563eb);
}

.ui-radio--single :deep(.ant-radio-checked .ant-radio-inner) {
  border-color: var(--dp-blue-600, #2563eb);
  background: #fff;
}

.ui-radio--single :deep(.ant-radio-checked .ant-radio-inner::after) {
  background: var(--dp-blue-600, #2563eb);
}

.ui-radio--single :deep(.ant-radio-input:focus-visible + .ant-radio-inner) {
  box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(37, 99, 235, 0.25));
}
</style>
