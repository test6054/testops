<template>
  <a-badge
    class="ui-count-badge"
    :count="props.count"
    :dot="props.dot"
    :offset="props.offset"
    :overflow-count="props.overflowCount"
    :show-zero="props.showZero"
    :status="props.status"
    :color="props.color"
    v-bind="$attrs"
  >
    <slot />
  </a-badge>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiCountBadge',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    count?: number | string
    dot?: boolean
    offset?: [number | string, number | string]
    overflowCount?: number
    showZero?: boolean
    status?: 'success' | 'processing' | 'default' | 'error' | 'warning'
    color?: string
  }>(),
  {
    count: undefined,
    dot: false,
    offset: undefined,
    overflowCount: 99,
    showZero: false,
    status: undefined,
    color: undefined,
  },
)
</script>

<style lang="scss" scoped>
.ui-count-badge :deep(.ant-badge-count) {
  background: var(--dp-danger);
  box-shadow: none;
  font-size: var(--dp-font-size-xxs);
  font-weight: 600;
}
</style>
