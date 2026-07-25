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
  border: 1px solid var(--dp-card-border);
  border-radius: var(--dp-radius-panel);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--dp-text-primary) 4%, transparent),
    0 1px 3px color-mix(in srgb, var(--dp-text-primary) 6%, transparent);
  transition:
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  overflow: hidden;
}

.dp-card--bordered {
  --dp-card-border: var(--dp-border-strong);
}

.dp-card--hoverable {
  cursor: pointer;
  box-shadow:
    0 1px 3px color-mix(in srgb, var(--dp-text-primary) 5%, transparent),
    0 4px 12px color-mix(in srgb, var(--dp-text-primary) 7%, transparent);
}

.dp-card--hoverable:hover {
  border-color: var(--dp-color-primary-border, var(--dp-blue-200));
  box-shadow:
    0 4px 8px color-mix(in srgb, var(--dp-color-primary) 8%, transparent),
    0 8px 24px color-mix(in srgb, var(--dp-text-primary) 10%, transparent);
  transform: translateY(-2px);
}

.dp-card--hoverable:active {
  transform: translateY(0);
  box-shadow:
    0 1px 3px color-mix(in srgb, var(--dp-text-primary) 5%, transparent),
    0 4px 12px color-mix(in srgb, var(--dp-text-primary) 7%, transparent);
}

.dp-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  border-bottom: 1px solid var(--dp-border);
  background: linear-gradient(
    180deg,
    var(--dp-surface-elevated) 0%,
    color-mix(in srgb, var(--dp-surface-elevated) 60%, var(--dp-surface)) 100%
  );
}

.dp-card__title {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
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
  gap: var(--dp-space-3, 10px);
  flex-shrink: 0;
}

.dp-card__body {
  padding: var(--dp-space-4, 16px);
}

.dp-card__body--no-header {
  padding: var(--dp-space-4, 16px);
}

.dp-card--compact .dp-card__header {
  padding: 10px var(--dp-space-3, 12px);
}

.dp-card--compact .dp-card__body,
.dp-card--compact .dp-card__body--no-header {
  padding: var(--dp-space-3, 12px);
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
