<template>
  <a-menu class="ui-menu" v-bind="$attrs">
    <slot />
  </a-menu>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiMenu', inheritAttrs: false })
</script>

<style lang="scss" scoped>
.ui-menu {
  background: transparent;
  border-inline-end: 0 !important;
  color: var(--dp-text-primary);
}
.ui-menu :deep(.ant-menu-item-selected) {
  color: var(--dp-primary);
  background: var(--dp-blue-50) !important;
}
.ui-menu :deep(.ant-menu-item:hover),
.ui-menu :deep(.ant-menu-submenu-title:hover) {
  color: var(--dp-primary);
}
</style>
