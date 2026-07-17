<template>
  <a-config-provider class="ui-config-provider" v-bind="$attrs">
    <slot />
  </a-config-provider>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiConfigProvider', inheritAttrs: false })
</script>
