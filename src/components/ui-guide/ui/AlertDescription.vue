<template>
  <div class="dp-alert__description" v-bind="$attrs">
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiAlertDescription' })
</script>

<style scoped>
.dp-alert__description {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
  line-height: 1.6;
}
</style>
