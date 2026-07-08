<template>
  <div class="create-page-layout">
    <router-view />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'CreatePageLayout' })
</script>

<style lang="scss" scoped>
.create-page-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  background: var(--ant-color-bg-container, #fff);
}
</style>
