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
    <div class="ui-empty__description">
      <slot>{{ props.description }}</slot>
    </div>
    <div v-if="$slots.action" class="ui-empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiEmpty' })

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  size?: 'sm' | 'md'
  /** 默认不展示大插画，减少占屏 */
  showIcon?: boolean
}>(), {
  title: '',
  description: '当前没有可展示的内容',
  size: 'sm',
  showIcon: false,
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
