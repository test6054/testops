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
    /**
     * 是否显示 hover 效果
     *
     * 默认 false：阅卷端绝大多数卡片是展示性、非交互的，给非交互元素加 hover 反馈违反
     * Nielsen Heuristic 4（Affordance）。需要交互反馈的卡片显式传 `:hoverable="true"`。
     */
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
    hoverable: false,
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
  background-color: var(--dp-surface);
  border: 1px solid var(--dp-panel-border, var(--dp-border-subtle));
  border-radius: var(--dp-radius-panel);
  box-shadow: var(--dp-shadow-card);
  transition:
    border-color var(--dp-duration-normal) var(--dp-ease-default),
    box-shadow var(--dp-duration-normal) var(--dp-ease-default),
    transform var(--dp-duration-normal) var(--dp-ease-default);
  box-sizing: border-box;
  overflow: hidden;
}

.dp-card--bordered {
  --dp-border: var(--dp-border-strong);
}

.dp-card--hoverable {
  cursor: pointer;
  box-shadow: var(--dp-shadow-card);
}

.dp-card--hoverable:hover {
  border-color: var(--dp-border-subtle);
  box-shadow: var(--dp-shadow-card-hover);
  transform: var(--dp-lift-sm);
}

.dp-card--hoverable:active {
  transform: translateY(0);
  box-shadow: var(--dp-shadow-card);
}

.dp-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component) var(--dp-space-block);
  border-bottom: 1px solid var(--dp-panel-border, var(--dp-border-subtle));
  background: linear-gradient(
    180deg,
    var(--dp-surface-chrome) 0%,
    color-mix(in srgb, var(--dp-surface-chrome) 60%, var(--dp-surface)) 100%
  );
}

.dp-card__title {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  font-size: 15px;
  font-weight: 600;
  color: var(--dp-text-primary);
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.dp-card__title :deep(svg),
.dp-card__title :deep(.anticon) {
  width: 16px;
  height: 16px;
  font-size: var(--dp-font-size-lg);
  color: var(--dp-text-secondary);
  flex-shrink: 0;
}

.dp-card__extra {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component);
  flex-shrink: 0;
}

.dp-card__body {
  padding: var(--dp-space-block);
}

.dp-card__body--no-header {
  padding: var(--dp-space-block);
}

.dp-card--compact .dp-card__header {
  padding: var(--dp-space-component);
}

.dp-card--compact .dp-card__body,
.dp-card--compact .dp-card__body--no-header {
  padding: var(--dp-space-component);
}

@media (prefers-reduced-motion: reduce) {
  .dp-card,
  .dp-card--hoverable {
    transition: none;
  }

  .dp-card--hoverable:hover {
    transform: none;
  }
}
</style>
