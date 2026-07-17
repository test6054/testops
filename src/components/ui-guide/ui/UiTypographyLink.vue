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
  color: var(--dp-primary);
  font-size: 13px;
}

.ui-typography-link:hover {
  color: var(--dp-blue-600);
}
</style>
