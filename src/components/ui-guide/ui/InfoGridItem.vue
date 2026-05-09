<script lang="ts" setup>
/**
 * 信息网格项组件 - 配合 UiInfoGrid 使用
 * @example
 * <UiInfoGridItem label="类型">课程设计</UiInfoGridItem>
 */
defineOptions({ name: 'UiInfoGridItem' })

defineProps<{
  /** 标签文本 */
  label: string
}>()
</script>

<template>
  <div class="ui-info-grid-item">
    <span class="ui-info-grid-item__label">{{ label }}</span>
    <span class="ui-info-grid-item__value">
      <slot />
    </span>
  </div>
</template>

<style lang="scss" scoped>
.ui-info-grid-item {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--ant-color-border-secondary);
  border-right: 1px solid var(--ant-color-border-secondary);
  background: var(--ant-color-bg-container);
}

.ui-info-grid-item__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ant-color-text);
  min-width: 70px;
  flex-shrink: 0;
}

.ui-info-grid-item__value {
  font-size: 14px;
  font-weight: 500;
  color: var(--ant-color-text);

  :deep(strong) {
    font-size: 16px;
    color: var(--ant-color-primary);
  }
}
</style>
