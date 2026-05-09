<template>
  <div
    class="dp-card"
    :class="{
      'dp-card--hoverable': hoverable,
      'dp-card--bordered': bordered,
      'dp-card--compact': compact,
    }"
    v-bind="$attrs"
  >
    <!-- 卡片头部：标题 + 操作区 -->
    <div v-if="hasHeader" class="dp-card__header">
      <div class="dp-card__title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div v-if="$slots.extra" class="dp-card__extra">
        <slot name="extra" />
      </div>
    </div>
    <!-- 卡片内容 -->
    <div
      class="dp-card__body"
      :class="{ 'dp-card__body--no-header': !$slots.title && !title && !$slots.extra }"
    >
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue'

defineOptions({
  name: 'UiCard',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 卡片标题（也可使用 #title 插槽） */
    title?: string
    /** 是否显示 hover 效果 */
    hoverable?: boolean
    /** 是否显示边框 */
    bordered?: boolean
    /** 是否显示头部 */
    showHeader?: boolean
    /** 紧凑模式 */
    compact?: boolean
  }>(),
  {
    title: '',
    hoverable: true,
    bordered: false,
    showHeader: true,
    compact: false,
  },
)
const slots = useSlots()
const hasHeader = computed(
  () => props.showHeader && (!!slots.title || !!props.title || !!slots.extra),
)
</script>

<style scoped>
.dp-card {
  background-color: var(--dp-surface, #fff);
  border: 1px solid var(--dp-card-border, transparent);
  border-radius: var(--dp-radius-lg, 8px);
  box-shadow: var(--dp-shadow-card);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  box-sizing: border-box;
  overflow: hidden;
}

.dp-card--bordered {
  --dp-card-border: var(--dp-border-strong, #e2e8f0);
}

.dp-card--hoverable:hover {
  border-color: var(--dp-border-strong, #e2e8f0);
}

.dp-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
}

.dp-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
  line-height: 1.5;
}

.dp-card__title :deep(svg),
.dp-card__title :deep(.anticon) {
  width: 16px;
  height: 16px;
  font-size: 16px;
  color: var(--dp-text-secondary, #475569);
  flex-shrink: 0;
}

.dp-card__extra {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.dp-card__body {
  padding: 24px;
}

.dp-card__body--no-header {
  padding: 24px;
}

.dp-card--compact .dp-card__header {
  padding: 16px 20px;
}

.dp-card--compact .dp-card__body,
.dp-card--compact .dp-card__body--no-header {
  padding: 20px;
}
</style>
