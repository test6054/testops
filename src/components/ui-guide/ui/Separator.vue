<template>
  <hr class="dp-separator" v-bind="$attrs" />
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiSeparator' })
</script>

<style scoped>
.dp-separator {
  border: none;
  border-top: 1px solid var(--dp-border, #f1f5f9);
  margin: 16px 0;
}
</style>
