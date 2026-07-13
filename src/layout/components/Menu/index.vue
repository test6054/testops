<template>
  <DualDomainSideNav
    v-if="isDualTeacherQualityMenu"
    :collapsed="!isDesktop ? false : appStore.menuCollapse"
    :marking-grouped="markingGroupedMenus"
    :platform-grouped="platformGroupedMenus"
    :quality-grouped="qualityGroupedMenus"
    :portfolio-grouped="portfolioGroupedMenus"
    @menu-item-click-after="emit('menu-item-click-after')"
  />
  <a-menu
    v-else
    class="app-side-menu"
    :key="`sidebar-menu-${menuKey}`"
    :inline-collapsed="!isDesktop ? false : appStore.menuCollapse"
    mode="inline"
    :selected-keys="activeMenu"
    :open-keys="appStore.menuCollapse ? [] : openKeys"
    :style="menuStyle"
    @click="onMenuItemClick"
    @open-change="onOpenChange"
  >
    <template v-if="isRoleLayoutRoute">
      <MenuItem
        v-for="item in primaryGroupItems(groupedMenus.ungrouped)"
        :key="item.path || item.name"
        :item="item"
      />
      <a-sub-menu v-for="group in groupedMenus.groups" :key="group.key">
        <template #title>{{ group.title }}</template>
        <template #icon>
          <MenuCollapsedTooltip
            :collapsed="!isDesktop ? false : appStore.menuCollapse"
            :label="group.title"
          >
            <MenuIcon :icon="group.icon" />
          </MenuCollapsedTooltip>
        </template>
        <MenuItem
          v-for="item in primaryGroupItems(group.items)"
          :key="item.path || item.name"
          :item="item"
        />
      </a-sub-menu>
    </template>
    <template v-else>
      <MenuItem v-for="item in stableSidebarRoutes" :key="item.path || item.name" :item="item" />
    </template>
  </a-menu>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { CSSProperties } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { message } from 'ant-design-vue'
import { debounce } from 'lodash-es'
import { computed, ref, watch } from 'vue'
import { ConfirmationStatusCode } from '@/apis/quality/types'
import { useDevice } from '@/hooks'
import { useAppStore, useAuthStore, useQualityStore, useRouteStore, useUserStore } from '@/stores'
import { RoleEnum } from '@/utils/permission'
import {
  isQualityEvaluationRoute,
  PORTFOLIO_ROUTE_PREFIX,
  QUALITY_ADMIN_MENU_GROUP,
} from '@/utils/portfolio-route'
import {
  buildQualityPlanWorkbenchLocation,
  QUALITY_PLAN_GATE_REASON_NO_PLAN,
  QUALITY_PLAN_GATE_REASON_UNCONFIRMED,
} from '@/utils/quality-plan-guard'
import { isExternal } from '@/utils/validate'
import DualDomainSideNav from './DualDomainSideNav.vue'
import MenuCollapsedTooltip from './MenuCollapsedTooltip.vue'
import MenuIcon from './MenuIcon.vue'
import MenuItem from './MenuItem.vue'

defineOptions({ name: 'AppMenu' })
const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits<{
  (e: 'menu-item-click-after'): void
}>()

interface Props {
  menus?: RouteRecordRaw[]
  menuStyle?: CSSProperties
}

const { isDesktop } = useDevice()
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const routeStore = useRouteStore()
const qualityStore = useQualityStore()
const authStore = useAuthStore()
const userStore = useUserStore()

function canSeePlatformManagement(): boolean {
  return authStore.userRole === RoleEnum.SUPER_ADMIN || userStore.isTenantAdmin === true
}

const ROLE_LAYOUT_PREFIXES: string[] = ['/teacher', '/student', '/quality', PORTFOLIO_ROUTE_PREFIX]

function isPlatformAdminRoute(item: RouteRecordRaw): boolean {
  return item.meta?.menuGroup === QUALITY_ADMIN_MENU_GROUP
}

function isSidebarMenuRoute(routeRecord: RouteRecordRaw): boolean {
  return (
    !routeRecord.meta?.hideInMenu
    && !(routeRecord.redirect && !routeRecord.component && !routeRecord.components)
  )
}

function toAbsoluteLayoutPath(prefix: string, child: RouteRecordRaw): RouteRecordRaw {
  const absPath = child.path.startsWith('/') ? child.path : `${prefix}/${child.path}`
  return { ...child, path: absPath }
}

/** 培养方案未确认时门控阻断（可点击引导；勿用 Ant disabled 假权限态） */
function isMenuItemQualityGateBlocked(item: RouteRecordRaw): boolean {
  if (item.meta?.qualityGate !== 'plan-confirmed') {
    return false
  }
  const qualityStore = useQualityStore()
  if (!qualityStore.currentTrainingPlanId) {
    return true
  }
  return qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED
}

function buildLayoutChildren(prefix: string): RouteRecordRaw[] {
  const layoutRoutes = routeStore.routes.length > 0 ? routeStore.routes : routeStore.getMenuRoutes()
  const layoutRoute = layoutRoutes.find((r) => r.path === prefix)
  if (!layoutRoute?.children) {
    return []
  }

  function flattenChildren(children: RouteRecordRaw[]): RouteRecordRaw[] {
    const items: RouteRecordRaw[] = []
    for (const child of children) {
      if (child.meta?.hideInMenu && child.children?.length) {
        items.push(...flattenChildren(child.children))
        continue
      }
      if (isSidebarMenuRoute(child)) {
        items.push(child)
      }
    }
    return items
  }

  return flattenChildren(layoutRoute.children)
    .map((child) => toAbsoluteLayoutPath(prefix, child))
    .map((child) => ({
      ...child,
      meta: {
        ...child.meta,
        qualityGateBlocked: isMenuItemQualityGateBlocked(child),
      },
    }))
}

interface MenuGroup {
  key: string
  title: string
  icon: string
  order: number
  items: RouteRecordRaw[]
}

function stringMetaValue(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError('菜单路由 meta 字符串契约异常')
  }
  return value
}

function numberMetaValue(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number') {
    throw new TypeError('菜单路由 meta 数字契约异常')
  }
  return value
}

function emptyMenuGroups(): { ungrouped: RouteRecordRaw[], groups: MenuGroup[] } {
  return { ungrouped: [], groups: [] }
}

function groupRoutes(routes: RouteRecordRaw[]): {
  ungrouped: RouteRecordRaw[]
  groups: MenuGroup[]
} {
  const ungrouped: RouteRecordRaw[] = []
  const groupMap = new Map<string, MenuGroup>()

  for (const item of routes) {
    const groupKey = stringMetaValue(item.meta?.menuGroup)
    if (!groupKey) {
      ungrouped.push(item)
    } else {
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          title: stringMetaValue(item.meta?.menuGroupTitle) || groupKey,
          icon: stringMetaValue(item.meta?.menuGroupIcon) || 'folder',
          order: numberMetaValue(item.meta?.menuGroupOrder) || 99,
          items: [],
        })
      }
      groupMap.get(groupKey)!.items.push(item)
    }
  }

  return {
    ungrouped,
    groups: Array.from(groupMap.values()).sort((a, b) => a.order - b.order),
  }
}

/** 侧栏全量展示菜单项，禁止「更多」折叠隐藏入口 */
function primaryGroupItems(items: RouteRecordRaw[]): RouteRecordRaw[] {
  return items
}

const layoutRouteSource = computed(() => {
  return routeStore.routes.length > 0 ? routeStore.routes : routeStore.getMenuRoutes()
})

const hasMarkingDomain = computed(() =>
  layoutRouteSource.value.some((entry) => entry.path === '/teacher'),
)
const hasQualityDomain = computed(() =>
  layoutRouteSource.value.some((entry) => entry.path === '/quality'),
)
const hasPortfolioDomain = computed(() =>
  layoutRouteSource.value.some((entry) => entry.path === PORTFOLIO_ROUTE_PREFIX),
)
const isDualTeacherQualityMenu = computed(() => {
  if (props.menus) {
    return false
  }
  if (!hasMarkingDomain.value || !hasQualityDomain.value || !hasPortfolioDomain.value) {
    return false
  }
  return (
    route.path.startsWith('/teacher')
    || isQualityEvaluationRoute(route.path)
    || route.path.startsWith(PORTFOLIO_ROUTE_PREFIX)
  )
})

const activeLayoutPrefix = computed(() => {
  return ROLE_LAYOUT_PREFIXES.find((prefix) => route.path.startsWith(prefix)) ?? null
})

const isRoleLayoutRoute = computed(() => {
  if (isDualTeacherQualityMenu.value) {
    return false
  }
  return activeLayoutPrefix.value !== null
})

const markingSidebarRoutes = computed(() => buildLayoutChildren('/teacher'))
const qualitySidebarRoutes = computed(() => {
  void qualityStore.currentPlan?.confirmationStatus
  void qualityStore.currentTrainingPlanId
  return buildLayoutChildren('/quality')
})
const portfolioSidebarRoutes = computed(() => buildLayoutChildren(PORTFOLIO_ROUTE_PREFIX))

const qualitySidebarRoutesForMenu = computed(() =>
  qualitySidebarRoutes.value.filter((item) => !isPlatformAdminRoute(item)),
)

const platformSidebarRoutes = computed(() => {
  if (!canSeePlatformManagement()) {
    return []
  }
  return [
    ...markingSidebarRoutes.value.filter(isPlatformAdminRoute),
    ...qualitySidebarRoutes.value.filter(isPlatformAdminRoute),
  ]
})

const markingSidebarRoutesForMenu = computed(() =>
  markingSidebarRoutes.value.filter((item) => !isPlatformAdminRoute(item)),
)

const markingGroupedMenus = computed(() => groupRoutes(markingSidebarRoutesForMenu.value))
const platformGroupedMenus = computed(() => ({
  ungrouped: platformSidebarRoutes.value,
  groups: [] as MenuGroup[],
}))
const qualityGroupedMenus = computed(() => groupRoutes(qualitySidebarRoutesForMenu.value))
const portfolioGroupedMenus = computed(() => groupRoutes(portfolioSidebarRoutes.value))

const sidebarRoutes = computed(() => {
  if (props.menus) {
    return props.menus
  }
  if (isDualTeacherQualityMenu.value) {
    return [
      ...markingSidebarRoutesForMenu.value,
      ...qualitySidebarRoutesForMenu.value,
      ...portfolioSidebarRoutes.value,
      ...platformSidebarRoutes.value,
    ]
  }
  const prefix = activeLayoutPrefix.value
  if (prefix) {
    return buildLayoutChildren(prefix)
  }
  return routeStore.getMenuRoutes()
})

const groupedMenus = computed(() => {
  if (!isRoleLayoutRoute.value && !isDualTeacherQualityMenu.value) {
    return emptyMenuGroups()
  }
  if (isDualTeacherQualityMenu.value) {
    return emptyMenuGroups()
  }
  return groupRoutes(sidebarRoutes.value)
})

const stableSidebarRoutes = ref<RouteRecordRaw[]>([])
const menuKey = ref(0)

const updateStableRoutes = debounce(() => {
  const newRoutes = sidebarRoutes.value
  if (JSON.stringify(newRoutes) !== JSON.stringify(stableSidebarRoutes.value)) {
    stableSidebarRoutes.value = newRoutes
    menuKey.value++
  }
}, 100)

watch(sidebarRoutes, updateStableRoutes, { immediate: true, deep: true })

function resolveMenuSelectedKey(raw: string): string {
  if (raw.startsWith('/')) {
    return raw
  }
  const prefix = activeLayoutPrefix.value
  if (prefix) {
    return `${prefix}/${raw}`
  }
  return raw
}

const activeMenu = computed<Key[]>(() => {
  const { meta, path } = route
  if (meta?.activeMenu) {
    const activeMenu = stringMetaValue(meta.activeMenu)
    return activeMenu ? [resolveMenuSelectedKey(activeMenu)] : [path]
  }
  return [path]
})

function findSidebarItemByKey(keyStr: string): RouteRecordRaw | undefined {
  const searchInRoutes = (routes: RouteRecordRaw[]): RouteRecordRaw | undefined => {
    for (const item of routes) {
      if (item.path === keyStr) {
        return item
      }
    }
    return undefined
  }

  const direct = searchInRoutes(sidebarRoutes.value)
  if (direct) {
    return direct
  }

  for (const group of groupedMenus.value.groups) {
    const found = searchInRoutes(group.items)
    if (found) {
      return found
    }
  }

  for (const group of portfolioGroupedMenus.value.groups) {
    const found = searchInRoutes(group.items)
    if (found) {
      return found
    }
  }

  const portfolioDirect = searchInRoutes(portfolioGroupedMenus.value.ungrouped)
  if (portfolioDirect) {
    return portfolioDirect
  }

  for (const group of platformGroupedMenus.value.groups) {
    const found = searchInRoutes(group.items)
    if (found) {
      return found
    }
  }

  const platformDirect = searchInRoutes(platformGroupedMenus.value.ungrouped)
  if (platformDirect) {
    return platformDirect
  }

  for (const group of qualityGroupedMenus.value.groups) {
    const found = searchInRoutes(group.items)
    if (found) {
      return found
    }
  }

  for (const group of markingGroupedMenus.value.groups) {
    const found = searchInRoutes(group.items)
    if (found) {
      return found
    }
  }

  return undefined
}

const onMenuItemClick = ({ key }: { key: Key }) => {
  const keyStr = String(key)
  if (isExternal(keyStr)) {
    window.open(keyStr)
    return
  }
  const menuItem = findSidebarItemByKey(
    keyStr.startsWith('/') ? keyStr : `${activeLayoutPrefix.value}/${keyStr}`,
  )
  if (menuItem?.meta?.qualityGateBlocked) {
    const reason = useQualityStore().currentTrainingPlanId
      ? QUALITY_PLAN_GATE_REASON_UNCONFIRMED
      : QUALITY_PLAN_GATE_REASON_NO_PLAN
    message.warning(
      reason === QUALITY_PLAN_GATE_REASON_NO_PLAN
        ? '请先选择并确认培养方案，再进入达成度结果与质量报告'
        : '培养方案尚未确认。请先在培养方案体系工作台完成确认，再进入达成度与报告',
    )
    void router.push(buildQualityPlanWorkbenchLocation(reason))
    return
  }
  if (keyStr.startsWith('/')) {
    router.push({ path: keyStr })
    emit('menu-item-click-after')
    return
  }
  const prefix = activeLayoutPrefix.value
  const target = prefix ? `${prefix}/${keyStr}` : keyStr
  router.push({ path: target })
  emit('menu-item-click-after')
}

const openKeys = ref<Key[]>([])

const currentGroupKey = computed<Key | null>(() => {
  return stringMetaValue(route.meta?.menuGroup) ?? null
})

watch(
  currentGroupKey,
  (key) => {
    if (isDualTeacherQualityMenu.value) {
      return
    }
    if (!key) {
      return
    }
    if (appStore.menuAccordion) {
      openKeys.value = [key]
    } else if (!openKeys.value.includes(key)) {
      openKeys.value = [...openKeys.value, key]
    }
  },
  { immediate: true },
)

const onOpenChange = (keys: Key[]) => {
  if (appStore.menuAccordion) {
    const latestOpen = keys.find((k) => !openKeys.value.includes(String(k)))
    openKeys.value = latestOpen ? [latestOpen] : []
  } else {
    openKeys.value = keys
  }
}
</script>

<style lang="scss" scoped>
:deep(.app-side-menu.ant-menu-inline-collapsed) {
  > .ant-menu-item,
  > .ant-menu-submenu > .ant-menu-submenu-title {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding-inline: 0 !important;
    text-align: center;
  }

  > .ant-menu-item .ant-menu-item-icon,
  > .ant-menu-submenu > .ant-menu-submenu-title .ant-menu-item-icon {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin-inline-end: 0 !important;
    margin-right: 0 !important;
    min-width: 16px;
    width: 16px;
    line-height: 1;
  }

  > .ant-menu-item .ant-menu-title-content,
  > .ant-menu-submenu > .ant-menu-submenu-title .ant-menu-title-content {
    display: none !important;
  }
}
</style>
