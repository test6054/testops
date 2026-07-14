<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ensurePortfolioReviewAccessLoaded } from '@/composables/usePortfolioReviewAccess'

const router = useRouter()

/**
 * 进入教学档案袋时按服务端工作壳合同重定向；接口不可用时明确落到无权限页，不猜测角色壳。
 */
async function enterPortfolioWorkShell() {
  const scope = await ensurePortfolioReviewAccessLoaded()
  const target = scope?.defaultWorkShellRoute || '/403'
  await router.replace(target)
}

onMounted(() => {
  void enterPortfolioWorkShell()
})
</script>

<template>
  <div class="portfolio-work-shell-entry" aria-busy="true" />
</template>

<style scoped>
.portfolio-work-shell-entry {
  min-height: 1px;
}
</style>
