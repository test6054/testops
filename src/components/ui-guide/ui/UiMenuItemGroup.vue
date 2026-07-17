<template>
  <a-menu-item-group class="ui-menu-item-group" v-bind="$attrs">
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <slot />
  </a-menu-item-group>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiMenuItemGroup', inheritAttrs: false })
</script>
