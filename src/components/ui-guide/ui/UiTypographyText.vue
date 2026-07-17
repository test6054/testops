<template>
  <a-typography-text
    class="ui-typography-text"
    :class="{
      'ui-typography-text--strong': props.strong,
      'ui-typography-text--secondary': props.type === 'secondary',
      'ui-typography-text--danger': props.type === 'danger',
      'ui-typography-text--success': props.type === 'success',
      'ui-typography-text--warning': props.type === 'warning',
    }"
    :code="props.code"
    :copyable="props.copyable"
    :delete="props.delete"
    :disabled="props.disabled"
    :ellipsis="props.ellipsis"
    :keyboard="props.keyboard"
    :mark="props.mark"
    :strong="props.strong"
    :type="props.type"
    :underline="props.underline"
    :content="props.content"
    v-bind="$attrs"
  >
    <slot />
  </a-typography-text>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiTypographyText',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    code?: boolean
    copyable?: boolean | object
    delete?: boolean
    disabled?: boolean
    ellipsis?: boolean | object
    keyboard?: boolean
    mark?: boolean
    strong?: boolean
    type?: 'secondary' | 'success' | 'warning' | 'danger'
    underline?: boolean
    content?: string
  }>(),
  {
    code: false,
    copyable: false,
    delete: false,
    disabled: false,
    ellipsis: false,
    keyboard: false,
    mark: false,
    strong: false,
    type: undefined,
    underline: false,
    content: undefined,
  },
)
</script>

<style lang="scss" scoped>
.ui-typography-text {
  color: var(--dp-text-primary);
  font-size: 13px;
  line-height: 1.55;
}

.ui-typography-text--strong {
  font-weight: 600;
}

.ui-typography-text--secondary {
  color: var(--dp-text-secondary);
}

.ui-typography-text--danger {
  color: var(--dp-danger);
}

.ui-typography-text--success {
  color: var(--dp-success);
}

.ui-typography-text--warning {
  color: var(--dp-warning);
}
</style>
