<template>
  <div v-if="hasError" class="ui-error-boundary">
    <section class="ui-error-boundary__container">
      <div class="ui-error-boundary__img">
        <Icon404 class="ui-error-boundary__icon" />
      </div>
      <div class="ui-error-boundary__tip">
        <div class="ui-error-boundary__title">页面渲染异常</div>
        <div class="ui-error-boundary__subtitle">当前页面遇到意外错误，请返回工作台后继续操作</div>
        <UiButton variant="primary" size="lg" @click="goHome">{{ backLabel }}</UiButton>
      </div>
    </section>
  </div>
  <slot v-else />
</template>

<script lang="ts" setup>
import { computed, onErrorCaptured, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon404 from '@/components/icons/Icon404.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { useAuthStore } from '@/stores'
import { RoleEnum } from '@/utils/permission'

defineOptions({ name: 'UiErrorBoundary' })

const hasError = ref(false)
const router = useRouter()
const authStore = useAuthStore()

onErrorCaptured(() => {
  hasError.value = true
  return false
})

function resolveHomePath(): string {
  const role = authStore.userRole
  if (role === RoleEnum.SCH_STU) {
    return '/student/score'
  }
  if (role === RoleEnum.SUPER_ADMIN || role === RoleEnum.SCH_TECH) {
    return '/teacher/dashboard'
  }
  return '/login'
}

const backLabel = computed(() => {
  const role = authStore.userRole
  if (role === RoleEnum.SCH_STU) {
    return '返回我的成绩'
  }
  if (role === RoleEnum.SUPER_ADMIN || role === RoleEnum.SCH_TECH) {
    return '返回教学质量中心'
  }
  return '返回登录'
})

function goHome() {
  router.replace({ path: resolveHomePath() })
}
</script>

<style lang="scss" scoped>
.ui-error-boundary {
  width: 100%;
  height: 100%;
  min-height: 320px;
  background: var(--ant-color-bg-container);
  display: flex;
  justify-content: center;
  align-items: center;
}

.ui-error-boundary__container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ui-error-boundary__img {
  display: flex;
  justify-content: center;
  align-items: center;
}

.ui-error-boundary__icon {
  max-width: 90%;
  height: min(40vh, 320px);
}

.ui-error-boundary__tip {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ui-error-boundary__title {
  margin-top: var(--dp-space-6);
  font-size: var(--dp-font-size-3xl);
  font-weight: var(--dp-font-weight-title);
  color: var(--ant-color-text);
}

.ui-error-boundary__subtitle {
  margin: var(--dp-space-4) 0 var(--dp-space-6);
  font-size: var(--dp-font-size-md);
  color: var(--ant-color-text-secondary);
  text-align: center;
}
</style>
