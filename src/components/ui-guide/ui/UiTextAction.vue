<template>
  <button
    type="button"
    class="ui-text-action"
    :class="[
      `ui-text-action--${props.tone}`,
      `ui-text-action--${props.size}`,
      { 'is-disabled': props.disabled },
    ]"
    :disabled="props.disabled"
    @click="onClick"
  >
    <span v-if="$slots.icon" class="ui-text-action__icon">
      <slot name="icon" />
    </span>
    <slot />
  </button>
</template>

<script lang="ts" setup>
/**
 * 列表行内文字操作按钮：替代 span.op-link，提供真 button 语义与键盘焦点环。
 * 视觉克制（14px/500），主操作走 tone=primary，危险操作走 tone=danger。
 */
defineOptions({ name: 'UiTextAction' })

const props = withDefaults(defineProps<{
  /** 文字色调：default 正文色 / primary 主操作蓝 / danger 危险红 */
  tone?: 'default' | 'primary' | 'danger'
  disabled?: boolean
  /** md=列表操作列 14px；sm=紧凑场景 13px */
  size?: 'sm' | 'md'
}>(), {
  tone: 'default',
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const onClick = (event: MouseEvent) => {
  if (props.disabled) return
  emit('click', event)
}
</script>

<style scoped>
.ui-text-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-weight: 500;
  color: var(--ant-color-text);
  cursor: pointer;
  transition: color 0.15s ease;
}

.ui-text-action--md {
  font-size: 14px;
}

.ui-text-action--sm {
  font-size: 13px;
}

.ui-text-action--default:hover:not(:disabled) {
  color: var(--ant-color-primary);
}

.ui-text-action--primary {
  color: var(--ant-color-primary);
  font-weight: 600;
}

.ui-text-action--primary:hover:not(:disabled) {
  color: var(--ant-color-primary-hover);
}

.ui-text-action--danger {
  color: var(--ant-color-error);
  font-weight: 500;
}

.ui-text-action--danger:hover:not(:disabled) {
  color: color-mix(in srgb, var(--ant-color-error) 82%, var(--ant-color-text));
}

.ui-text-action.is-disabled,
.ui-text-action:disabled {
  color: var(--dp-text-disabled);
  cursor: not-allowed;
  pointer-events: none;
}

.ui-text-action:focus-visible {
  outline: 2px solid var(--dp-focus-ring);
  outline-offset: 2px;
  border-radius: 2px;
}

.ui-text-action__icon {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.ui-text-action__icon :deep(svg),
.ui-text-action__icon :deep(.anticon) {
  font-size: 1em;
  width: 1em;
  height: 1em;
}
</style>
