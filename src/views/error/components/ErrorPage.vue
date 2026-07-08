<template>
  <div class="platform-error-page" :class="{ 'platform-error-page--embedded': embedded }">
    <section class="platform-error-page__panel">
      <a-result :status="resultStatus" :title="copy.title" :sub-title="copy.subtitle">
        <template #extra>
          <div class="platform-error-page__actions">
            <UiButton variant="primary" size="md" @click="refreshPage">刷新页面</UiButton>
            <UiButton variant="outline" size="md" @click="goHome">{{ backLabel }}</UiButton>
          </div>
        </template>
      </a-result>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
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

const resultStatus = computed(() => {
  if (resolvedKind.value === 'render-error') {
    return 'error'
  }
  if (resolvedKind.value === 'forbidden') {
    return '403'
  }
  return '404'
})

const copy = computed(() => {
  if (resolvedKind.value === 'render-error') {
    return {
      title: '页面渲染异常',
      subtitle: '当前页面遇到意外错误，请先刷新页面；若仍无法恢复，再返回工作台继续其他操作',
    }
  }
  if (resolvedKind.value === 'forbidden') {
    return {
      title: '无访问权限',
      subtitle: '当前账号无权访问此页面，请确认登录身份或联系管理员开通权限',
    }
  }
  return {
    title: '页面不存在',
    subtitle: '地址可能已变更或输入有误，可先刷新页面；仍无法访问时返回工作台',
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

function refreshPage() {
  window.location.reload()
}

function goHome() {
  router.replace({ path: resolveHomePath() })
}
</script>

<style lang="scss" scoped>
.platform-error-page {
  box-sizing: border-box;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--dp-space-6);
  background: var(--ant-color-bg-layout);

  &--embedded {
    min-height: 100%;
    background: var(--ant-color-bg-container);
    padding: var(--dp-space-8) var(--dp-space-4);
  }
}

.platform-error-page__panel {
  width: min(520px, 100%);
  padding: var(--dp-space-6) var(--dp-space-5);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--ant-color-bg-container);
  box-shadow: var(--dp-shadow-xs);
}

.platform-error-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3);
  justify-content: center;
}

:deep(.ant-result) {
  padding: var(--dp-space-4) 0;
}

:deep(.ant-result-title) {
  font-size: var(--dp-type-h1-size);
  line-height: var(--dp-type-h1-line-height);
  font-weight: var(--dp-type-h1-weight);
  color: var(--ant-color-text);
}

:deep(.ant-result-subtitle) {
  font-size: var(--dp-font-size-md);
  line-height: var(--dp-line-height-normal);
  color: var(--ant-color-text-secondary);
}
</style>
