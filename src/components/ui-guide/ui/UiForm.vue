<template>
  <a-form
    ref="formRef"
    class="ui-form"
    :class="[`ui-form--${props.layout}`, { 'ui-form--bordered': props.bordered }]"
    :model="props.model"
    :rules="props.rules"
    :layout="props.layout"
    :disabled="props.disabled"
    :colon="props.colon"
    :required-mark="props.requiredMark"
    :label-align="props.labelAlign"
    :scroll-to-first-error="props.scrollToFirstError"
    :size="antSize"
    :style="formStyle"
    v-bind="$attrs"
    @finish="handleFinish"
    @finish-failed="handleFinishFailed"
  >
    <slot />
  </a-form>
</template>

<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue/es/form'
import type { FormProps } from 'ant-design-vue/es/form/Form'
import type { CSSProperties } from 'vue'
import { computed, ref } from 'vue'

defineOptions({
  name: 'UiForm',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 表单模型：兼容业务 reactive/interface，不做 index signature 强制 */
    model?: object
    rules?: FormProps['rules']
    layout?: 'vertical' | 'horizontal' | 'inline'
    disabled?: boolean
    colon?: boolean
    requiredMark?: boolean | 'optional'
    labelAlign?: 'left' | 'right'
    scrollToFirstError?: boolean
    size?: 'small' | 'middle' | 'large' | 'sm' | 'md' | 'lg'
    labelWidth?: number | string
    gap?: number | string
    bordered?: boolean
  }>(),
  {
    model: () => ({}),
    rules: () => ({}),
    layout: 'vertical',
    disabled: false,
    colon: false,
    requiredMark: true,
    labelAlign: 'left',
    scrollToFirstError: true,
    size: 'middle',
    labelWidth: undefined,
    bordered: false,
  },
)

const emit = defineEmits<{
  (e: 'finish', values: object): void
  (e: 'finish-failed', errorInfo: unknown): void
}>()

const formRef = ref<FormInstance>()

const antSize = computed(() => {
  if (props.size === 'sm' || props.size === 'small') return 'small' as const
  if (props.size === 'lg' || props.size === 'large') return 'large' as const
  return 'middle' as const
})

type UiFormStyle = CSSProperties
  & Partial<Record<'--ui-form-label-width' | '--ui-form-gap', string>>

const formStyle = computed<UiFormStyle>(() => {
  const style: UiFormStyle = {}
  if (props.labelWidth !== undefined) {
    style['--ui-form-label-width']
      = typeof props.labelWidth === 'number' ? `${props.labelWidth}px` : String(props.labelWidth)
  }
  if (props.gap !== undefined) {
    style['--ui-form-gap'] = typeof props.gap === 'number' ? `${props.gap}px` : String(props.gap)
  }
  return style
})

const handleFinish = (values: object) => {
  emit('finish', values)
}

const handleFinishFailed = (errorInfo: unknown) => {
  emit('finish-failed', errorInfo)
}

/** 透传 ant FormInstance 方法，保证 ref 校验合同不中断 */
defineExpose({
  validate: (...args: Parameters<FormInstance['validate']>) => formRef.value?.validate(...args),
  validateFields: (...args: Parameters<FormInstance['validateFields']>) =>
    formRef.value?.validateFields(...args),
  resetFields: (...args: Parameters<FormInstance['resetFields']>) => formRef.value?.resetFields(...args),
  clearValidate: (...args: Parameters<FormInstance['clearValidate']>) =>
    formRef.value?.clearValidate(...args),
  scrollToField: (...args: Parameters<FormInstance['scrollToField']>) =>
    formRef.value?.scrollToField(...args),
  getFieldsValue: (...args: Parameters<FormInstance['getFieldsValue']>) =>
    formRef.value?.getFieldsValue(...args),
  setFieldsValue: (values: object) =>
    (formRef.value as FormInstance & { setFieldsValue?: (v: object) => void } | undefined)?.setFieldsValue?.(
      values,
    ),
})
</script>

<style scoped>
.ui-form {
  --ui-form-label-width: 120px;
  --ui-form-gap: var(--dp-space-component);
}

.ui-form :deep(.ant-form-item) {
  margin-bottom: var(--ui-form-gap);
}

.ui-form--bordered {
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.ui-form--horizontal :deep(.ant-form-item) {
  display: flex;
  align-items: flex-start;
}

.ui-form--horizontal :deep(.ant-form-item-label) {
  width: var(--ui-form-label-width, 120px);
  padding-bottom: 0;
}

.ui-form--horizontal :deep(.ant-form-item-control) {
  flex: 1;
  min-width: 0;
}

.ui-form--inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--dp-space-component);
}

.ui-form--inline :deep(.ant-form-item) {
  margin-right: 0;
}
</style>
