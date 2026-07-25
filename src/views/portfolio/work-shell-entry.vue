<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { ensurePortfolioReviewAccessLoaded } from '@/composables/usePortfolioReviewAccess'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'

const router = useRouter()
const { canPickTeachers } = usePortfolioTeacherAccess()
const entering = ref(true)
const loadFailed = ref(false)

/**
 * 进入教学档案袋时按服务端工作壳合同重定向；可代办角色默认进教师名册（B 入口），
 * 避免落到本人工作台却无 teacherId。仅当访问范围加载成功且无可用壳时进入 /403。
 */
async function enterPortfolioWorkShell() {
  entering.value = true
  loadFailed.value = false
  const scope = await ensurePortfolioReviewAccessLoaded(true)
  if (!scope) {
    entering.value = false
    loadFailed.value = true
    return
  }
  let target = scope.defaultWorkShellRoute || '/403'
  if (
    canPickTeachers.value
    && (
      scope.defaultWorkShell === 'TEACHER'
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
  <div class="portfolio-work-shell-entry" aria-live="polite">
    <p v-if="entering" class="portfolio-work-shell-entry__status" aria-busy="true">
      正在进入教学档案袋工作壳…
    </p>
    <template v-else-if="loadFailed">
      <UiAlertStrip
        tone="error"
        title="工作壳访问范围加载失败"
        description="无法确认可用工作壳；这不是权限拒绝。请刷新本页，或离开后再进入。"
      />
      <UiButton size="sm" class="portfolio-work-shell-entry__refresh" @click="enterPortfolioWorkShell">
        刷新
      </UiButton>
    </template>
  </div>
</template>

<style scoped>
.portfolio-work-shell-entry {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
  padding: var(--dp-space-page) var(--dp-space-block);
  min-height: 120px;
}
.portfolio-work-shell-entry__status {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--dp-font-size-sm);
}
.portfolio-work-shell-entry__refresh {
  align-self: flex-start;
}
</style>
