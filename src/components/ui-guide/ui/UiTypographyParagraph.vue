<template>
  <a-typography-paragraph
    class="ui-typography-paragraph"
    :class="{ 'ui-typography-paragraph--secondary': props.type === 'secondary' }"
    :code="props.code"
    :copyable="props.copyable"
    :delete="props.delete"
    :disabled="props.disabled"
    :ellipsis="props.ellipsis"
    :mark="props.mark"
    :strong="props.strong"
    :type="props.type"
    :underline="props.underline"
    :content="props.content"
    v-bind="$attrs"
  >
    <slot />
  </a-typography-paragraph>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiTypographyParagraph',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    code?: boolean
    copyable?: boolean | object
    delete?: boolean
    disabled?: boolean
    ellipsis?: boolean | object
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
    mark: false,
    strong: false,
    type: undefined,
    underline: false,
    content: undefined,
  },
)
</script>

<style lang="scss" scoped>
.ui-typography-paragraph {
  margin-bottom: 0;
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
}

.ui-typography-paragraph--secondary {
  color: var(--dp-text-secondary);
}

.ui-typography-paragraph :deep(.ant-typography-expand),
.ui-typography-paragraph :deep(.ant-typography-collapse) {
  color: var(--dp-primary);
}
</style>
