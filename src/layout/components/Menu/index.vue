<template>
  <a-menu
    class="app-side-menu"
    :key="`sidebar-menu-${menuKey}`"
    :inline-collapsed="!isDesktop ? false : appStore.menuCollapse"
    :mode="mode"
    :selected-keys="activeMenu"
    :style="menuStyle"
    @click="onMenuItemClick"
  >
    <!-- 容器路由（/admin、/teacher、/student）：扁平化展开 + menuGroup 分组渲染 -->
    <template v-if="isRoleLayoutRoute && groupedMenus">
      <!-- 无分组（如工作台 / 阅卷概览） -->
      <MenuItem v-for="item in groupedMenus.ungrouped" :key="item.path || item.name" :item="item" />
      <!-- 分组菜单 -->
      <a-sub-menu v-for="group in groupedMenus.groups" :key="group.key">
        <template #title>{{ group.title }}</template>
        <template #icon>
          <MenuIcon :icon="group.icon" />
        </template>
        <MenuItem v-for="item in group.items" :key="item.path || item.name" :item="item" />
      </a-sub-menu>
    </template>
    <!-- 其他路由：正常嵌套渲染 -->
    <template v-else>
      <MenuItem v-for="item in stableSidebarRoutes" :key="item.path || item.name" :item="item" />
    </template>
  </a-menu>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { CSSProperties } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { debounce } from 'lodash-es'
import { useDevice } from '@/hooks'
import { useAppStore, useRouteStore } from '@/stores'
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
const routeStore = useRouteStore()

// 顶层容器路由前缀（各角色布局）
const ROLE_LAYOUT_PREFIXES = ['/admin', '/teacher', '/student'] as const

// 根据当前路径匹配所在的角色容器前缀
const activeLayoutPrefix = computed(() => {
  return ROLE_LAYOUT_PREFIXES.find((prefix) => route.path.startsWith(prefix)) ?? null
})

// 是否处于某个角色容器路由之下（决定是否走扁平化 + 分组渲染）
const isRoleLayoutRoute = computed(() => activeLayoutPrefix.value !== null)

// 使用权限过滤后的菜单路由
const sidebarRoutes = computed(() => {
  if (props.menus) {
    return props.menus
  }
  // 获取过滤后的菜单路由
  const menuRoutes = routeStore.getMenuRoutes()

  // 角色容器路由：直接显示子路由，不显示父级菜单（admin / teacher / student 统一处理）
  const prefix = activeLayoutPrefix.value
  if (prefix) {
    const layoutRoute = menuRoutes.find((r) => r.path === prefix)
    if (layoutRoute?.children) {
      return layoutRoute.children.filter((child) => !child.meta?.hideInMenu)
    }
  }

  return menuRoutes
})

// 分组信息接口
interface MenuGroup {
  key: string
  title: string
  icon: string
  order: number
  items: RouteRecordRaw[]
}

// 按 menuGroup 分组菜单（容器路由启用；无 menuGroup 的项进入 ungrouped 顶部区）
const groupedMenus = computed(() => {
  if (!isRoleLayoutRoute.value) return null

  const routes = sidebarRoutes.value
  const ungrouped: RouteRecordRaw[] = []
  const groupMap = new Map<string, MenuGroup>()

  for (const item of routes) {
    const groupKey = item.meta?.menuGroup as string | undefined
    if (!groupKey) {
      // 无分组的菜单项（如工作台 / 阅卷概览 / 学生端扁平菜单）
      ungrouped.push(item)
    } else {
      // 有分组的菜单项
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

  // 按 order 排序分组
  const groups = Array.from(groupMap.values()).sort((a, b) => a.order - b.order)

  return { ungrouped, groups }
})

// 添加稳定的菜单数据，避免频繁更新导致的slot警告
const stableSidebarRoutes = ref<RouteRecordRaw[]>([])
const menuKey = ref(0)

// 使用防抖更新菜单数据
const updateStableRoutes = debounce(() => {
  const newRoutes = sidebarRoutes.value
  if (JSON.stringify(newRoutes) !== JSON.stringify(stableSidebarRoutes.value)) {
    stableSidebarRoutes.value = newRoutes
    menuKey.value++
  }
}, 100)

// 监听sidebarRoutes变化
watch(sidebarRoutes, updateStableRoutes, { immediate: true, deep: true })

// 菜单垂直模式/水平模式
const mode = computed(() => {
  if (!['left', 'mix'].includes(appStore.layout)) {
    return 'horizontal'
  } else {
    return 'vertical'
  }
})

// 是否默认展开选中的菜单
const autoOpenSelected = computed(() => {
  return ['left', 'mix'].includes(appStore.layout)
})

// 当前页面激活菜单路径，先从路由里面找
const activeMenu = computed<Key[]>(() => {
  const { meta, path } = route
  if (meta?.activeMenu) {
    return [meta.activeMenu as string]
  }
  return [path]
})

// 菜单项点击事件
const onMenuItemClick = ({ key }: { key: Key }) => {
  const keyStr = String(key)
  if (isExternal(keyStr)) {
    window.open(keyStr)
    return
  }
  router.push({ path: keyStr })
  emit('menu-item-click-after')
}

// 折叠状态改变时触发
const onCollapse = (collapsed: boolean) => {
  if (appStore.layout === 'mix') {
    appStore.setMenuCollapse(collapsed)
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
