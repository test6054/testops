<template>
  <a-collapse
    class="ui-collapse"
    :class="{ 'ui-collapse--ghost': props.ghost, 'ui-collapse--bordered': props.bordered }"
    :bordered="props.bordered"
    :ghost="props.ghost"
    :accordion="props.accordion"
    :expand-icon-position="props.expandIconPosition"
    v-bind="$attrs"
  >
    <slot />
  </a-collapse>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiCollapse',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    bordered?: boolean
    ghost?: boolean
    accordion?: boolean
    expandIconPosition?: 'start' | 'end'
  }>(),
  {
    bordered: true,
    ghost: false,
    accordion: false,
    expandIconPosition: 'end',
  },
)
</script>

<style lang="scss" scoped>
.ui-collapse {
  background: var(--dp-surface-elevated);
  border-radius: var(--dp-radius-control);
}

.ui-collapse :deep(.ant-collapse-header) {
  padding: var(--dp-space-component) !important;
  color: var(--dp-text-primary);
  font-weight: 600;
  font-size: var(--dp-font-size-sm);
}

.ui-collapse :deep(.ant-collapse-content-box) {
  padding: var(--dp-space-component) !important;
}

.ui-collapse :deep(.ant-collapse-item) {
  border-color: var(--dp-border);
}
</style>
