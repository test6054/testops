<template>
  <a-layout class="ui-layout" v-bind="$attrs">
    <slot />
  </a-layout>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiLayout', inheritAttrs: false })
</script>
