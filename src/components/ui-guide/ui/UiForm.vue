<template>
  <a-form
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
    :size="props.size"
    :style="formStyle"
    v-bind="$attrs"
    @finish="handleFinish"
    @finish-failed="handleFinishFailed"
  >
    <slot />
  </a-form>
</template>

<script lang="ts" setup>
import type { FormProps } from 'ant-design-vue/es/form/Form'
import type { CSSProperties } from 'vue'
import { computed } from 'vue'

defineOptions({
  name: 'UiForm',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    model?: Record<string, unknown>
    rules?: FormProps['rules']
    layout?: 'vertical' | 'horizontal' | 'inline'
    disabled?: boolean
    colon?: boolean
    requiredMark?: boolean | 'optional'
    labelAlign?: 'left' | 'right'
    scrollToFirstError?: boolean
    size?: 'small' | 'middle' | 'large'
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
    gap: 16,
    bordered: false,
  },
)

const emit = defineEmits<{
  (e: 'finish', values: Record<string, unknown>): void
  (e: 'finish-failed', errorInfo: unknown): void
}>()

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

const handleFinish = (values: Record<string, unknown>) => {
  emit('finish', values)
}

const handleFinishFailed = (errorInfo: unknown) => {
  emit('finish-failed', errorInfo)
}
</script>

<style scoped>
.ui-form {
  --ui-form-label-width: 120px;
  --ui-form-gap: 16px;
}

.ui-form :deep(.ant-form-item) {
  margin-bottom: var(--ui-form-gap);
}

.ui-form--bordered {
  padding: 20px;
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
  gap: 0 16px;
}

.ui-form--inline :deep(.ant-form-item) {
  margin-right: 0;
}
</style>
