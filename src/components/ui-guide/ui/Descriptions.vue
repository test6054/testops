<template>
  <div class="ui-descriptions">
    <a-descriptions
      class="ui-descriptions__inner"
      :title="props.title"
      :column="props.column"
      :size="props.size"
      :bordered="props.bordered"
      v-bind="$attrs"
    >
      <slot />
    </a-descriptions>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiDescriptions',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  column?: number | Record<string, number>
  size?: 'default' | 'middle' | 'small'
  bordered?: boolean
}>(), {
  title: undefined,
  column: 2,
  size: 'default',
  bordered: true,
})
</script>

<style scoped>
.ui-descriptions :deep(.ant-descriptions) {
  width: 100%;
}

.ui-descriptions :deep(.ant-descriptions-title) {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-descriptions :deep(.ant-descriptions-view) {
  overflow: hidden;
  border-radius: var(--dp-radius-panel, 10px);
  border: 1px solid var(--dp-border, #e5e7eb);
}

.ui-descriptions :deep(.ant-descriptions-row > th),
.ui-descriptions :deep(.ant-descriptions-row > td) {
  padding: 14px 16px;
  font-size: 14px;
}

.ui-descriptions :deep(.ant-descriptions-row > th) {
  background: var(--dp-table-header-bg, #f8fafc);
  color: var(--dp-text-secondary, #475569);
  font-weight: 600;
}

.ui-descriptions :deep(.ant-descriptions-row > td) {
  color: var(--dp-text-primary, #0f172a);
  background: var(--dp-surface, #fff);
}
</style>
