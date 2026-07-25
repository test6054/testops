<template>
  <div class="ui-empty" :class="`ui-empty--${props.size}`" v-bind="$attrs">
    <div v-if="props.showIcon" class="ui-empty__icon" aria-hidden="true">
      <slot name="image">
        <span class="ui-empty__dot" />
      </slot>
    </div>
    <div v-if="props.title || $slots.title" class="ui-empty__title">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <div v-if="showDescription" class="ui-empty__description">
      <slot>{{ resolvedDescription }}</slot>
    </div>
    <div v-if="showAction" class="ui-empty__action">
      <slot name="action">
        <button
          v-if="resolvedActionLabel"
          type="button"
          class="ui-empty__action-btn"
          @click="emit('action')"
        >
          {{ resolvedActionLabel }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue'

defineOptions({ name: 'UiEmpty' })

const props = withDefaults(defineProps<{
  title?: string
  /**
   * 空态说明。传空字符串表示不展示说明（仅标题）。
   * 未传时：无 title 用默认短句；有 title 则默认不展示说明，避免「标题 + 空话」。
   */
  description?: string
  size?: 'sm' | 'md'
  /** 默认不展示大插画，减少占屏 */
  showIcon?: boolean
  /**
   * 可选内容区动作文案。加载失败场景禁止使用「重试 / 重新加载」类文案（见 AGENTS.md §14.7）。
   * 与 action-label 属性同义（模板 kebab 写法）。
   */
  actionLabel?: string
}>(), {
  title: '',
  description: undefined,
  size: 'sm',
  showIcon: false,
  actionLabel: undefined,
})

const emit = defineEmits<{
  action: []
}>()

const slots = useSlots()

const resolvedActionLabel = computed(() => props.actionLabel?.trim() || '')

const showAction = computed(() => Boolean(slots.action) || Boolean(resolvedActionLabel.value))

/** 有默认插槽，或显式非空 description，或「无标题且未显式传 description」时才展示说明区 */
const showDescription = computed(() => {
  if (slots.default) {
    return true
  }
  if (props.description !== undefined) {
    return Boolean(props.description.trim())
  }
  // 未传 description：仅在无标题时用默认句，避免「加载失败 + 空话说明」
  return !props.title
})

const resolvedDescription = computed(() => {
  if (props.description !== undefined) {
    return props.description
  }
  return showDescription.value ? '暂无数据' : ''
})
</script>

<style scoped>
.ui-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--dp-space-page) var(--dp-space-block);
  border-radius: var(--dp-radius-panel);
  background: linear-gradient(
    180deg,
    var(--dp-surface-chrome) 0%,
    color-mix(in srgb, var(--dp-surface-chrome) 50%, var(--dp-surface)) 100%
  );
  border: 1px dashed var(--dp-panel-border, var(--dp-border-subtle));
}

.ui-empty--sm {
  padding: var(--dp-space-component) var(--dp-space-component-tight);
  background: transparent;
  border: none;
}

.ui-empty--md {
  padding: var(--dp-space-section) var(--dp-space-block);
}

.ui-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: var(--dp-space-component);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-chrome);
  border: 1px solid var(--dp-panel-border, var(--dp-border-subtle));
  box-shadow: var(--dp-shadow-xs);
  color: var(--dp-text-secondary);
}

/* 单色线性空态 + 品牌蓝点缀（学术严肃，避免多色卡通） */
.ui-empty__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dp-color-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dp-color-primary) 12%, transparent);
}

.ui-empty__title {
  margin-bottom: var(--dp-space-component-xs);
  font-size: 15px;
  font-weight: 600;
  color: var(--dp-text-primary);
  letter-spacing: -0.01em;
}

.ui-empty__description {
  max-width: 360px;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.ui-empty__action {
  margin-top: var(--dp-space-block);
}

.ui-empty__action-btn {
  min-height: 30px;
  padding: 0 var(--dp-space-block);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-full, 999px);
  background: var(--dp-surface);
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-sm);
  font-weight: 500;
  line-height: 28px;
  cursor: pointer;
  transition:
    border-color var(--dp-duration-fast) var(--dp-ease-default),
    color var(--dp-duration-fast) var(--dp-ease-default),
    box-shadow var(--dp-duration-fast) var(--dp-ease-default),
    transform var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-empty__action-btn:hover {
  border-color: var(--dp-border);
  color: var(--dp-text-primary);
  box-shadow: var(--dp-shadow-sm);
  transform: var(--dp-lift-sm);
}

.ui-empty__action-btn:active {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .ui-empty__action-btn {
    transition: none;
  }

  .ui-empty__action-btn:hover {
    transform: none;
  }
}
</style>
