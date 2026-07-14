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
    <div v-if="$slots.action" class="ui-empty__action">
      <slot name="action" />
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
}>(), {
  title: '',
  description: undefined,
  size: 'sm',
  showIcon: false,
})

const slots = useSlots()

/** 有默认插槽，或显式非空 description，或「无标题且未显式传 description」时才展示说明区 */
const showDescription = computed(() => {
  if (slots.default) {
    return true
  }
  if (props.description !== undefined) {
    return Boolean(props.description.trim())
  }
  // 未传 description：仅在无标题时用默认句，避免「加载失败 + 当前没有可展示的内容」
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
  padding: 16px 12px;
}

.ui-empty--sm {
  padding: 12px 8px;
}

.ui-empty--md {
  padding: 20px 12px;
}

.ui-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-bottom: 8px;
}

.ui-empty__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ant-color-border);
}

.ui-empty__title {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.ui-empty__description {
  max-width: 360px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ant-color-text-secondary);
}

.ui-empty__action {
  margin-top: 10px;
}
</style>
