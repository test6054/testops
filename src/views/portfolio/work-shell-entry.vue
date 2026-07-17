<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ensurePortfolioReviewAccessLoaded } from '@/composables/usePortfolioReviewAccess'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'

const router = useRouter()
const { canPickTeachers } = usePortfolioTeacherAccess()

/**
 * 进入教学档案袋时按服务端工作壳合同重定向；可代办角色默认进教师名册（B 入口），
 * 避免落到本人工作台却无 teacherId。接口不可用时落到无权限页，不猜测角色壳。
 */
async function enterPortfolioWorkShell() {
  const scope = await ensurePortfolioReviewAccessLoaded()
  let target = scope?.defaultWorkShellRoute || '/403'
  if (
    canPickTeachers.value
    && (
      scope?.defaultWorkShell === 'TEACHER'
      || target === '/portfolio/teacher/home'
    )
  ) {
    target = '/portfolio/teachers'
  }
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
