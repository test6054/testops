<template>
  <a-form-item
    class="ui-form-item"
    :label="props.label"
    :name="props.name"
    :rules="props.rules"
    :required="props.required"
    :help="props.help"
    :extra="props.extra"
    :validate-status="props.validateStatus"
    v-bind="$attrs"
  >
    <template v-if="$slots.label" #label>
      <slot name="label" />
    </template>
    <slot />
  </a-form-item>
</template>

<script lang="ts" setup>
import type { FormItemProps } from 'ant-design-vue/es/form/FormItem'
import type { UiFormName } from './types'

defineOptions({
  name: 'UiFormItem',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  label?: string
  name?: UiFormName
  rules?: FormItemProps['rules']
  required?: boolean
  help?: string
  extra?: string
  validateStatus?: '' | 'success' | 'warning' | 'error' | 'validating'
}>(), {
  label: '',
  name: undefined,
  rules: undefined,
  required: false,
  help: '',
  extra: '',
  validateStatus: '',
})
</script>

<style scoped>
.ui-form-item :deep(.ant-form-item-label > label) {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.ui-form-item :deep(.ant-form-item-required::before) {
  color: var(--dp-red-500, #ef4444) !important;
}

.ui-form-item :deep(.ant-form-item-explain),
.ui-form-item :deep(.ant-form-item-extra) {
  font-size: 13px;
  line-height: 1.5;
}

.ui-form-item :deep(.ant-form-item-extra) {
  color: var(--dp-text-muted, #6b7280);
}

.ui-form-item :deep(.ant-form-item-explain-error) {
  color: var(--dp-red-500, #ef4444);
}
</style>
