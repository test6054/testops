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
  background: var(--dp-bg-muted);

  // router-view 根节点须吃满高度，否则 CreateFormPageShell 的内部滚动失效、底部被裁切
  > :deep(*) {
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
}
</style>
