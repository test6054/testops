<template>
  <button
    type="button"
    class="ui-action-link"
    :class="{
      'ui-action-link--danger': props.danger,
      'ui-action-link--disabled': props.disabled,
    }"
    :disabled="props.disabled"
    v-bind="$attrs"
    @click="handleClick"
  >
    <span v-if="$slots.icon" class="ui-action-link__icon">
      <slot name="icon" />
    </span>
    <span v-if="$slots.default || props.text" class="ui-action-link__text">
      <slot>{{ props.text }}</slot>
    </span>
    <span v-if="$slots.suffix" class="ui-action-link__icon">
      <slot name="suffix" />
    </span>
  </button>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiActionLink',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  text?: string
  danger?: boolean
  disabled?: boolean
}>(), {
  text: '',
  danger: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const handleClick = (event: MouseEvent) => {
  if (props.disabled === true) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<style scoped>
.ui-action-link {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 5px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  color: var(--dp-color-primary);
  transition: color var(--dp-duration-normal) var(--dp-ease-default), opacity var(--dp-duration-normal) var(--dp-ease-default);
}

.ui-action-link:hover:not(:disabled) {
  color: var(--dp-color-primary-hover);
}

.ui-action-link--danger {
  color: var(--dp-error);
}

.ui-action-link--danger:hover:not(:disabled) {
  color: var(--dp-red-600);
}

.ui-action-link--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ui-action-link__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--dp-type-panel-title-size);
  line-height: 1;
}

/* 确保 antd icon svg 尺寸正确 */
.ui-action-link__icon :deep(svg),
.ui-action-link__icon :deep(.anticon) {
  font-size: var(--dp-type-panel-title-size);
  width: 1em;
  height: 1em;
}

.ui-action-link__text {
  font-weight: 600;
}
</style>
