<template>
  <a-watermark class="ui-watermark" v-bind="$attrs">
    <slot />
  </a-watermark>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiWatermark', inheritAttrs: false })
</script>
