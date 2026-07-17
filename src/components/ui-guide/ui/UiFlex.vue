<template>
  <a-flex class="ui-flex" v-bind="$attrs">
    <slot />
  </a-flex>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiFlex',
  inheritAttrs: false,
})
</script>
