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
   * 失败态恢复动作文案（如「重试」）。仅内容区操作，不替代右上角 Message 错误提示。
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
  padding: var(--dp-space-3, 12px) var(--dp-space-2, 8px);
}

.ui-empty--sm {
  padding: var(--dp-space-2, 8px) var(--dp-space-2, 8px);
}

.ui-empty--md {
  padding: var(--dp-space-4, 16px) var(--dp-space-3, 12px);
}

.ui-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-bottom: var(--dp-space-2, 8px);
}

.ui-empty__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dp-border);
}

.ui-empty__title {
  margin-bottom: var(--dp-space-1, 4px);
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text);
}

.ui-empty__description {
  max-width: 360px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.ui-empty__action {
  margin-top: var(--dp-space-3, 10px);
}

.ui-empty__action-btn {
  min-height: 28px;
  padding: 0 var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-bg-container);
  color: var(--dp-text);
  font-size: 13px;
  line-height: 26px;
  cursor: pointer;
}

.ui-empty__action-btn:hover {
  border-color: var(--dp-color-primary);
  color: var(--dp-color-primary);
}
</style>
