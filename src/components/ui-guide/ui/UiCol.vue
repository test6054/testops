<template>
  <a-col class="ui-col" v-bind="$attrs">
    <slot />
  </a-col>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiCol',
  inheritAttrs: false,
})
</script>
