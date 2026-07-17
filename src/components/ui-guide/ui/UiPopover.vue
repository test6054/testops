<template>
  <a-popover class="ui-popover" v-bind="$attrs">
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.content" #content>
      <slot name="content" />
    </template>
    <slot />
  </a-popover>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiPopover', inheritAttrs: false })
</script>
