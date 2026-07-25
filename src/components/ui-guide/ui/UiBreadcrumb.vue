<template>
  <a-breadcrumb class="ui-breadcrumb" v-bind="$attrs">
    <slot />
  </a-breadcrumb>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiBreadcrumb',
  inheritAttrs: false,
})
</script>

<style lang="scss" scoped>
.ui-breadcrumb {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.ui-breadcrumb :deep(.ant-breadcrumb-link),
.ui-breadcrumb :deep(.ant-breadcrumb-separator) {
  color: var(--dp-text-secondary);
}

.ui-breadcrumb :deep(a) {
  color: var(--dp-text-secondary);
}

.ui-breadcrumb :deep(a:hover) {
  color: var(--dp-color-primary);
}
</style>
