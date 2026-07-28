<template>
  <a-typography-link class="ui-typography-link" v-bind="$attrs">
    <slot />
  </a-typography-link>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiTypographyLink',
  inheritAttrs: false,
})
</script>

<style lang="scss" scoped>
.ui-typography-link {
  color: var(--dp-color-primary);
  font-size: var(--dp-font-size-sm);
}

.ui-typography-link:hover {
  color: var(--dp-blue-600);
}
</style>
