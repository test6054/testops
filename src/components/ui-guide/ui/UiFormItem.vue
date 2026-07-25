<template>
  <a-form-item
    class="ui-form-item"
    :class="{ 'ui-form-item--compact': props.compact }"
    v-bind="$attrs"
  >
    <template v-if="$slots.label" #label>
      <slot name="label" />
    </template>
    <slot />
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
    <template v-if="$slots.help" #help>
      <slot name="help" />
    </template>
    <template v-if="$slots.tooltip" #tooltip>
      <slot name="tooltip" />
    </template>
  </a-form-item>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiFormItem',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 更紧表单项（标签 12px、间距收） */
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)
</script>

<style scoped>
.ui-form-item :deep(.ant-form-item-label > label) {
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-text-primary);
  height: auto;
}

.ui-form-item :deep(.ant-form-item-explain),
.ui-form-item :deep(.ant-form-item-extra) {
  font-size: var(--dp-font-size-xs);
  line-height: 1.4;
  min-height: 0;
}

.ui-form-item--compact :deep(.ant-form-item-label) {
  padding-bottom: 2px;
}

.ui-form-item--compact :deep(.ant-form-item-control-input) {
  min-height: 32px;
}
</style>
