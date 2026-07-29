<template>
  <nav
    v-if="visible"
    class="domain-switch"
    :class="{ 'domain-switch--platform': isPlatformContext }"
    :aria-label="isPlatformContext ? '业务域切换（当前系统管理）' : '业务域切换'"
  >
    <UiSegmented
      :model-value="segmentValue"
      class="domain-switch__control"
      size="sm"
      :options="segmentOptions"
      @change="handleDomainChange"
    />
  </nav>
</template>

<script lang="ts" setup>
import type { UiOptionValue } from '@/components/ui-guide/ui/types'
import type { ShellProductDomain } from '@/utils/shell-domain'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiSegmented from '@/components/ui-guide/ui/UiSegmented.vue'
import { useDevice } from '@/hooks'
import { useRouteStore } from '@/stores'
import {
  isShellProductDomainPath,
  listAvailableShellProductDomains,
  rememberShellDomainPath,
  resolveShellDomainNavigateTo,
  resolveShellProductDomain,
  SHELL_PRODUCT_DOMAIN_OPTIONS,
} from '@/utils/shell-domain'

defineOptions({ name: 'DomainSwitch' })

const route = useRoute()
const router = useRouter()
const routeStore = useRouteStore()
const { isMobile } = useDevice()

const layoutRouteSource = computed(() => {
  return routeStore.routes.length > 0 ? routeStore.routes : routeStore.getMenuRoutes()
})

const availableDomains = computed<ShellProductDomain[]>(() => {
  return listAvailableShellProductDomains(layoutRouteSource.value)
})

/**
 * 桌面顶栏域切换：移动端改由底部 TabBar 承担三域切换，避免双入口。
 */
const visible = computed(() => {
  return (
    !isMobile.value
    && availableDomains.value.length >= 2
    && isShellProductDomainPath(route.path)
  )
})

const segmentOptions = computed(() => {
  const allowed = new Set(availableDomains.value)
  return SHELL_PRODUCT_DOMAIN_OPTIONS
    .filter((item) => allowed.has(item.value))
    .map((item) => ({ label: item.label, value: item.value }))
})

const activeDomain = ref<ShellProductDomain | undefined>(undefined)

/**
 * 分段控件展示值：系统管理用空串（不匹配任何 option），强制三域均不选中，避免假选中首项。
 */
const segmentValue = computed<UiOptionValue>(() => activeDomain.value ?? '')

/** 系统管理页：顶栏三域均不选中，侧栏已切到平台菜单 */
const isPlatformContext = computed(() => {
  return isShellProductDomainPath(route.path) && activeDomain.value === undefined
})

function syncActiveFromRoute(): void {
  const domain = resolveShellProductDomain(route.path, route.meta?.menuGroup)
  activeDomain.value = domain ?? undefined
  if (domain) {
    rememberShellDomainPath(domain, route.fullPath)
  }
}

watch(
  () => [route.fullPath, route.meta?.menuGroup] as const,
  (_current, previous) => {
    if (previous) {
      const prevFullPath = String(previous[0] ?? '')
      const prevMenuGroup = previous[1]
      const prevPathOnly = prevFullPath.split('?')[0] ?? ''
      const prevDomain = resolveShellProductDomain(prevPathOnly, prevMenuGroup)
      const nextDomain = resolveShellProductDomain(route.path, route.meta?.menuGroup)
      if (prevDomain && nextDomain === null) {
        rememberShellDomainPath(prevDomain, prevFullPath)
      }
    }
    syncActiveFromRoute()
  },
  { immediate: true },
)

/**
 * 顶栏切域：先记住当前域路径，再进入目标域上次位置或首页。
 */
function handleDomainChange(value: UiOptionValue): void {
  if (typeof value !== 'string') {
    return
  }
  if (value !== 'marking' && value !== 'quality' && value !== 'portfolio') {
    return
  }
  const nextDomain = value
  const current = resolveShellProductDomain(route.path, route.meta?.menuGroup)
  if (current === nextDomain) {
    return
  }
  if (current) {
    rememberShellDomainPath(current, route.fullPath)
  }
  const target = resolveShellDomainNavigateTo(router, nextDomain)
  if (target === route.fullPath) {
    return
  }
  void router.push(target)
}
</script>

<style lang="scss" scoped>
.domain-switch {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.domain-switch__control {
  flex-shrink: 0;
}

/* 系统管理：分段不选中，弱化为主导航旁路，避免误以为仍在某一产品域 */
.domain-switch--platform :deep(.ant-segmented-item-selected) {
  color: inherit;
}

.domain-switch--platform :deep(.ant-segmented-item-label) {
  opacity: 0.72;
}

/* 顶栏紧凑：分段控件高度对齐 48px 壳顶栏 */
.domain-switch :deep(.ant-segmented) {
  font-size: 13px;
  font-weight: 500;
}

.domain-switch :deep(.ant-segmented-item-label) {
  min-height: 28px;
  line-height: 28px;
  padding: 0 12px;
}
</style>
