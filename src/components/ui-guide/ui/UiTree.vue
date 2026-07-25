<template>
  <a-tree
    class="ui-tree"
    :class="{ 'ui-tree--dense': props.dense }"
    v-bind="$attrs"
  >
    <template v-if="$slots.title" #title="slotProps">
      <slot name="title" v-bind="slotProps" />
    </template>
    <template v-if="$slots.icon" #icon="slotProps">
      <slot name="icon" v-bind="slotProps" />
    </template>
    <template v-if="$slots.switcherIcon" #switcherIcon="slotProps">
      <slot name="switcherIcon" v-bind="slotProps" />
    </template>
    <slot />
  </a-tree>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiTree',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    dense?: boolean
  }>(),
  {
    dense: true,
  },
)
</script>

<style lang="scss" scoped>
.ui-tree {
  color: var(--dp-text-primary);
  background: transparent;
}

.ui-tree--dense :deep(.ant-tree-treenode) {
  padding: 2px 0;
}

.ui-tree :deep(.ant-tree-node-content-wrapper) {
  border-radius: var(--dp-radius-control-inner);
  min-height: 28px;
  line-height: 28px;
}

.ui-tree :deep(.ant-tree-node-content-wrapper:hover) {
  background: var(--dp-gray-100);
}

.ui-tree :deep(.ant-tree-node-selected) {
  background: var(--dp-blue-50) !important;
}

.ui-tree :deep(.ant-tree-checkbox-checked .ant-tree-checkbox-inner) {
  background: var(--dp-color-primary);
  border-color: var(--dp-color-primary);
}
</style>
