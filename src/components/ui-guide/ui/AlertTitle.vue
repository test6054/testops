<template>
  <div class="dp-alert__title" v-bind="$attrs">
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiAlertTitle' })
</script>

<style scoped>
.dp-alert__title {
  font-weight: 700;
  font-size: 14px;
  color: var(--ant-color-text);
  margin-bottom: 4px;
}
</style>
