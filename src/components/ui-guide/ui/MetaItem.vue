<template>
  <span class="ui-meta-item" :class="{ 'ui-meta-item--highlight': highlight }">
    <slot name="icon" />
    <slot />
  </span>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiMetaItem' })

withDefaults(defineProps<{
  highlight?: boolean
}>(), {
  highlight: false,
})
</script>

<style lang="scss">
.ui-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ant-color-text-secondary);

  :deep(svg) {
    font-size: 14px;
    color: var(--ant-color-text-tertiary);
  }

  &--highlight {
    color: var(--ant-color-primary);
    font-weight: 600;

    :deep(svg) {
      color: var(--ant-color-primary);
    }
  }
}
</style>
