<template>
  <section :class="{ collapsed: props.collapsed }" class="system-logo" @click="toHome">
    <img v-if="logo" :src="logo" alt="logo" class="logo" />
    <img v-else alt="logo" class="logo" src="/logo.svg" />
    <span class="system-name">{{ title }}</span>
  </section>
</template>

<script lang="ts" setup>
import { getDefaultRoute } from '@/router/permission'
import { useAppStore, useAuthStore } from '@/stores'
import { useTenantStore } from '@/stores/modules/tenant'
import { resolveShellLogoNavigateTo } from '@/utils/shell-domain'

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
})
const appStore = useAppStore()
const authStore = useAuthStore()
const tenantStore = useTenantStore()
const route = useRoute()
const title = computed(() => appStore.getTitle())
// 优先使用租户自定义 Logo，无租户 Logo 时使用站点默认 Logo
const logo = computed(() => tenantStore.tenantLogo || appStore.getLogo())

interface Props {
  collapsed?: boolean
}

const router = useRouter()

/**
 * Logo 回首页：产品域内回到本域首页；系统管理回到归属域上次任务页，避免跨域误跳。
 */
const toHome = () => {
  const shellTarget = resolveShellLogoNavigateTo(router, route.path, route.meta?.menuGroup)
  if (shellTarget) {
    if (shellTarget !== route.fullPath) {
      void router.push(shellTarget)
    }
    return
  }
  const userRole = authStore.userRole
  const defaultRoute = getDefaultRoute(userRole)
  void router.push(defaultRoute)
}
</script>

<style lang="scss" scoped>
.system-logo {
  height: var(--dp-shell-header-height);
  padding: 0 var(--dp-space-block);
  color: var(--dp-text-primary);
  font-size: var(--dp-type-h1-size);
  font-weight: var(--dp-type-h1-weight);
  letter-spacing: -0.03em;
  line-height: 1;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
  border-bottom: 1px solid var(--dp-border);
  background: var(--dp-surface);

  &.collapsed {
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;

    .system-name {
      display: none;
    }
  }

  .logo {
    width: 32px;
    height: 32px;
    border-radius: var(--dp-radius-control);
    transition: border-radius var(--dp-duration-normal);
    overflow: hidden;
    flex-shrink: 0;
  }

  .system-name {
    padding-left: var(--dp-space-component-tight);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: color var(--dp-duration-normal) var(--dp-ease-default);
    line-height: 1.35;
    display: inline-flex;
    align-items: center;

    &:hover {
      color: var(--dp-color-primary) !important;
      cursor: pointer;
    }
  }
}
</style>
