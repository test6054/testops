<template>
  <a-menu
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
      <MenuItem v-for="item in groupedMenus.ungrouped" :key="item.path || item.name" :item="item" />
      <a-sub-menu v-for="group in groupedMenus.groups" :key="group.key">
        <template #title>{{ group.title }}</template>
        <template #icon>
          <MenuIcon :icon="group.icon" />
        </template>
        <MenuItem v-for="item in group.items" :key="item.path || item.name" :item="item" />
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
import { useDevice } from '@/hooks'
import { useAppStore, useAuthStore, useRouteStore } from '@/stores'
import { useQualityStore } from '@/stores/modules/quality'
import { isExternal } from '@/utils/validate'
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
const authStore = useAuthStore()
const routeStore = useRouteStore()
const qualityStore = useQualityStore()

const ROLE_LAYOUT_PREFIXES = ['/admin', '/teacher', '/student', '/quality'] as const

function isSidebarMenuRoute(routeRecord: RouteRecordRaw): boolean {
  return !routeRecord.meta?.hideInMenu && !(routeRecord.redirect && !routeRecord.component && !routeRecord.components)
}

function toAbsoluteLayoutPath(prefix: string, child: RouteRecordRaw): RouteRecordRaw {
  const absPath = child.path.startsWith('/') ? child.path : `${prefix}/${child.path}`
  return { ...child, path: absPath }
}

function isMenuItemDisabled(item: RouteRecordRaw): boolean {
  if (!route.path.startsWith('/quality')) {
    return false
  }
  if (!item.meta?.requiresPlanConfirmed) {
    return false
  }
  const planId = qualityStore.currentTrainingPlanId
  if (!planId) {
    return true
  }
  if (qualityStore.trainingPlanLoading) {
    return true
  }
  const plan = qualityStore.currentPlan
  if (!plan) {
    return true
  }
  return plan.confirmationStatus !== 'CONFIRMED'
}

const activeLayoutPrefix = computed(() => {
  return ROLE_LAYOUT_PREFIXES.find((prefix) => route.path.startsWith(prefix)) ?? null
})

const isRoleLayoutRoute = computed(() => activeLayoutPrefix.value !== null)

const sidebarRoutes = computed(() => {
  if (props.menus) {
    return props.menus
  }
  const menuRoutes = routeStore.getMenuRoutes()
  const prefix = activeLayoutPrefix.value
  if (prefix) {
    const layoutRoute = menuRoutes.find((r) => r.path === prefix)
    if (layoutRoute?.children) {
      return layoutRoute.children
        .filter(isSidebarMenuRoute)
        .map((child) => toAbsoluteLayoutPath(prefix, child))
        .map((child) => ({
          ...child,
          meta: {
            ...child.meta,
            disabled: isMenuItemDisabled(child),
          },
        }))
    }
  }
  return menuRoutes
})

interface MenuGroup {
  key: string
  title: string
  icon: string
  order: number
  items: RouteRecordRaw[]
}

const groupedMenus = computed(() => {
  const empty = { ungrouped: [] as RouteRecordRaw[], groups: [] as MenuGroup[] }
  if (!isRoleLayoutRoute.value) return empty

  const ungrouped: RouteRecordRaw[] = []
  const groupMap = new Map<string, MenuGroup>()

  for (const item of sidebarRoutes.value) {
    const groupKey = item.meta?.menuGroup as string | undefined
    if (!groupKey) {
      ungrouped.push(item)
    } else {
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          title: (item.meta?.menuGroupTitle as string) || groupKey,
          icon: (item.meta?.menuGroupIcon as string) || 'folder',
          order: (item.meta?.menuGroupOrder as number) || 99,
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

watch(
  () =>
    [
      route.path.startsWith('/quality'),
      qualityStore.currentProgramId,
      qualityStore.currentTrainingPlanId,
    ] as const,
  ([isQuality, programId, planId]) => {
    if (isQuality && (programId || planId)) {
      void qualityStore.loadTrainingPlanOptions({
        programId: programId || undefined,
      })
    }
  },
  { immediate: true },
)

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
    return [resolveMenuSelectedKey(meta.activeMenu as string)]
  }
  return [path]
})

function findSidebarItemByKey(keyStr: string): RouteRecordRaw | undefined {
  for (const item of sidebarRoutes.value) {
    if (item.path === keyStr) {
      return item
    }
  }
  for (const group of groupedMenus.value.groups) {
    for (const item of group.items) {
      if (item.path === keyStr) {
        return item
      }
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
  const menuItem = findSidebarItemByKey(keyStr.startsWith('/') ? keyStr : `${activeLayoutPrefix.value}/${keyStr}`)
  if (menuItem?.meta?.disabled) {
    message.error('培养方案尚未确认，请先在「培养方案体系工作台」完成确认')
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
  return (route.meta?.menuGroup as string | undefined) ?? null
})

watch(
  currentGroupKey,
  (key) => {
    if (!key) return
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
