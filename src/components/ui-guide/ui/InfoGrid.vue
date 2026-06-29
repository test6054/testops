<script lang="ts" setup>
/**
 * 信息网格组件 - 用于展示键值对信息的表格布局
 * @example
 * <UiInfoGrid :columns="4">
 *   <UiInfoGridItem label="类型">课程设计</UiInfoGridItem>
 *   <UiInfoGridItem label="难度">困难</UiInfoGridItem>
 * </UiInfoGrid>
 */
defineOptions({ name: 'UiInfoGrid' })

withDefaults(defineProps<{
  /** 列数 */
  columns?: 2 | 3 | 4
}>(), {
  columns: 4
})
</script>

<template>
  <div class="ui-info-grid" :class="`ui-info-grid--${columns}col`">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.ui-info-grid {
  display: grid;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel);
  overflow: hidden;

  &--2col {
    grid-template-columns: repeat(2, 1fr);
    :deep(.ui-info-grid-item:nth-child(2n)) { border-right: none; }
    :deep(.ui-info-grid-item:nth-last-child(-n+2)) { border-bottom: none; }
  }

  &--3col {
    grid-template-columns: repeat(3, 1fr);
    :deep(.ui-info-grid-item:nth-child(3n)) { border-right: none; }
    :deep(.ui-info-grid-item:nth-last-child(-n+3)) { border-bottom: none; }
  }

  &--4col {
    grid-template-columns: repeat(4, 1fr);
    :deep(.ui-info-grid-item:nth-child(4n)) { border-right: none; }
    :deep(.ui-info-grid-item:nth-last-child(-n+4)) { border-bottom: none; }
  }
}
</style>
