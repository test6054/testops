<template>
  <a-dropdown class="ui-dropdown" v-bind="$attrs">
    <slot />
    <template v-if="$slots.overlay" #overlay>
      <slot name="overlay" />
    </template>
  </a-dropdown>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiDropdown', inheritAttrs: false })
</script>
