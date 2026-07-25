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
  /** table=表格操作列（对齐原型 act）；md=通用 14px；sm=紧凑 13px 无 hover 底 */
  size?: 'table' | 'sm' | 'md'
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
  gap: var(--dp-space-component-xs);
  padding: var(--dp-space-component-xs) 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-weight: 500;
  color: var(--dp-text-primary);
  cursor: pointer;
  transition: color var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-text-action--md {
  font-size: var(--dp-font-size-md);
}

.ui-text-action--sm {
  font-size: var(--dp-font-size-sm);
}

.ui-text-action--table {
  padding: 2px var(--dp-space-component-tight);
  border-radius: var(--dp-radius-xs);
  font-size: var(--dp-font-size-sm);
  font-weight: 400;
  transition: background var(--dp-duration-fast) var(--dp-ease-default), color var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-text-action--default:hover:not(:disabled) {
  color: var(--dp-color-primary);
}

.ui-text-action--table.ui-text-action--default,
.ui-text-action--table.ui-text-action--primary {
  color: var(--dp-color-primary);
  font-weight: 400;
}

.ui-text-action--table.ui-text-action--default:hover:not(:disabled),
.ui-text-action--table.ui-text-action--primary:hover:not(:disabled) {
  color: var(--dp-color-primary);
  background: var(--dp-blue-50);
}

.ui-text-action--primary {
  color: var(--dp-color-primary);
  font-weight: 600;
}

.ui-text-action--primary:hover:not(:disabled) {
  color: var(--dp-color-primary-hover);
}

.ui-text-action--table.ui-text-action--danger {
  color: var(--dp-error);
  font-weight: 400;
}

.ui-text-action--table.ui-text-action--danger:hover:not(:disabled) {
  color: var(--dp-error);
  background: var(--dp-red-50);
}

.ui-text-action--danger {
  color: var(--dp-error);
  font-weight: 500;
}

.ui-text-action--danger:hover:not(:disabled) {
  color: color-mix(in srgb, var(--dp-error) 82%, var(--dp-text-primary));
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
