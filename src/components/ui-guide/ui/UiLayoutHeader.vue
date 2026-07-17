<template>
  <a-layout-header class="ui-layout-header" v-bind="$attrs">
    <slot />
  </a-layout-header>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiLayoutHeader', inheritAttrs: false })
</script>
