<template>
  <div class="platform-error-page" :class="{ 'platform-error-page--embedded': embedded }">
    <section class="platform-error-page__panel">
      <div class="platform-error-page__badge" aria-hidden="true">{{ copy.badge }}</div>
      <h1 class="platform-error-page__title">{{ copy.title }}</h1>
      <p class="platform-error-page__subtitle">{{ copy.subtitle }}</p>
      <div class="platform-error-page__actions">
        <UiButton variant="primary" size="md" @click="goHome">{{ backLabel }}</UiButton>
        <UiButton v-if="showSecondary" variant="outline" size="md" @click="goSecondary">
          {{ secondaryLabel }}
        </UiButton>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { useAuthStore } from '@/stores'
import { resolveAppPath } from '@/utils/app-path'
import { isScannerKioskBrowserPage } from '@/utils/kiosk-auth'
import { RoleEnum } from '@/utils/permission'

defineOptions({ name: 'ErrorPage' })

const props = withDefaults(defineProps<Props>(), {
  code: 404,
  kind: undefined,
  embedded: false,
})

interface Props {
  code?: 403 | 404
  kind?: 'not-found' | 'forbidden' | 'render-error'
  embedded?: boolean
}

const router = useRouter()
const authStore = useAuthStore()

const resolvedKind = computed(() => {
  if (props.kind) {
    return props.kind
  }
  return props.code === 403 ? 'forbidden' : 'not-found'
})

const copy = computed(() => {
  if (resolvedKind.value === 'render-error') {
    return {
      badge: '页面异常',
      title: '当前页面暂时无法展示',
      subtitle: '可返回工作台继续其他业务；若多次出现，请联系管理员排查。',
    }
  }
  if (resolvedKind.value === 'forbidden') {
    return {
      badge: '权限不足',
      title: '当前账号无权访问此页面',
      subtitle: '请确认登录身份，或联系管理员开通对应权限。',
    }
  }
  return {
    badge: '地址无效',
    title: '页面不存在或已变更',
    subtitle: '请检查地址，或返回工作台从菜单重新进入。',
  }
})

function resolveHomePath(): string {
  if (isScannerKioskBrowserPage()) {
    return resolveAppPath('scanner-kiosk')
  }
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
  if (isScannerKioskBrowserPage()) {
    return '返回扫描工作台'
  }
  const role = authStore.userRole
  if (role === RoleEnum.SCH_STU) {
    return '返回我的成绩'
  }
  if (role === RoleEnum.SUPER_ADMIN || role === RoleEnum.SCH_TECH) {
    return '返回工作台'
  }
  return '返回登录'
})

const showSecondary = computed(
  () => resolvedKind.value !== 'render-error' && authStore.userRole != null,
)

const secondaryLabel = computed(() => '返回上一页')

function goHome() {
  router.replace({ path: resolveHomePath() })
}

function goSecondary() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  goHome()
}
</script>

<style lang="scss" scoped>
.platform-error-page {
  box-sizing: border-box;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--dp-space-4);
  background: var(--ant-color-bg-layout);

  &--embedded {
    min-height: 240px;
    background: var(--ant-color-bg-container);
    padding: var(--dp-space-4);
  }
}

.platform-error-page__panel {
  width: min(420px, 100%);
  padding: 20px 18px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-panel);
  background: var(--ant-color-bg-container);
  text-align: center;
}

.platform-error-page__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 8px;
  margin-bottom: 10px;
  border-radius: var(--dp-radius-control);
  background: var(--ant-color-fill-tertiary);
  color: var(--ant-color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
}

.platform-error-page__title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: var(--ant-color-text);
}

.platform-error-page__subtitle {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 20px;
  color: var(--ant-color-text-secondary);
}

.platform-error-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
