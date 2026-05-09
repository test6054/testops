<template>
  <div class="auth-placeholder">
    <h2>首次登录补录</h2>
    <p>CAS 首次登录后用户信息补录页（Batch 2 实现）。</p>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'CasFirstLoginCompletion' })
</script>

<style lang="scss" scoped>
.auth-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--dp-space-6, 24px);
  text-align: center;

  h2 {
    margin: 0 0 var(--dp-space-3, 12px);
    color: var(--ant-color-text);
  }

  p {
    margin: 0;
    color: var(--ant-color-text-secondary);
  }
}
</style>
