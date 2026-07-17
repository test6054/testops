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

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
})
const appStore = useAppStore()
const authStore = useAuthStore()
const tenantStore = useTenantStore()
const title = computed(() => appStore.getTitle())
// 优先使用租户自定义 Logo，无租户 Logo 时使用站点默认 Logo
const logo = computed(() => tenantStore.tenantLogo || appStore.getLogo())

interface Props {
  collapsed?: boolean
}

const router = useRouter()
// 根据用户角色跳转到对应的dashboard
const toHome = () => {
  const userRole = authStore.userRole
  const defaultRoute = getDefaultRoute(userRole)
  router.push(defaultRoute)
}
</script>

<style lang="scss" scoped>
.system-logo {
  height: 56px;
  padding: 0 12px;
  color: var(--dp-text);
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;

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
    transition: border-radius 0.2s;
    overflow: hidden;
    flex-shrink: 0;
  }

  .system-name {
    padding-left: 6px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: color 0.3s;
    line-height: 1.5;
    display: inline-flex;
    align-items: center;

    &:hover {
      color: var(--dp-color-primary) !important;
      cursor: pointer;
    }
  }
}
</style>
