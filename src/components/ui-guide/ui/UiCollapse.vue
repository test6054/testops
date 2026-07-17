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
  background: var(--dp-bg-elevated, var(--dp-surface));
  border-radius: var(--dp-radius-control);
}

.ui-collapse :deep(.ant-collapse-header) {
  padding: 10px 12px !important;
  color: var(--dp-text-primary);
  font-weight: 600;
  font-size: 13px;
}

.ui-collapse :deep(.ant-collapse-content-box) {
  padding: 12px !important;
}

.ui-collapse :deep(.ant-collapse-item) {
  border-color: var(--dp-border);
}
</style>
