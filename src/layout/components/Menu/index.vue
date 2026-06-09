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
import { ref, watch } from 'vue'
import { useDevice } from '@/hooks'
import { useAppStore, useAuthStore, useRouteStore } from '@/stores'
import { RoleEnum } from '@/types/enums'
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

const TEACHER_MARKING_ROLES: RoleEnum[] = [
  RoleEnum.SCH_TECH,
  RoleEnum.CROP_ADMIN,
  RoleEnum.CROP_USER,
  RoleEnum.SUPER_ADMIN,
]

// 顶层容器路由前缀（各角色布局 / 工作台）
const ROLE_LAYOUT_PREFIXES = ['/admin', '/teacher', '/student', '/quality'] as const

const MERGED_TEACHER_QUALITY_PREFIXES = ['/teacher', '/quality'] as const

// 根据当前路径匹配所在的角色容器前缀
const activeLayoutPrefix = computed(() => {
  return ROLE_LAYOUT_PREFIXES.find((prefix) => route.path.startsWith(prefix)) ?? null
})

// 是否处于某个角色容器路由之下（决定是否走扁平化 + 分组渲染）
const isRoleLayoutRoute = computed(() => activeLayoutPrefix.value !== null)

const useMergedTeacherQualitySidebar = computed(() => {
  const role = authStore.userRole as RoleEnum
  if (!TEACHER_MARKING_ROLES.includes(role)) {
    return false
  }
  const path = route.path
  return MERGED_TEACHER_QUALITY_PREFIXES.some((prefix) => path.startsWith(prefix))
})

function normalizeQualitySidebarItem(child: RouteRecordRaw): RouteRecordRaw {
  const absPath = child.path.startsWith('/') ? child.path : `/quality/${child.path}`
  const groupKey = child.meta?.menuGroup as string | undefined
  if (!groupKey) {
    return {
      ...child,
      path: absPath,
      meta: {
        ...child.meta,
        menuGroup: 'quality-overview',
        menuGroupTitle: '教学质量评价',
        menuGroupIcon: 'reconciliation',
        menuGroupOrder: 7,
      },
    }
  }
  const baseOrder = (child.meta?.menuGroupOrder as number) || 1
  return {
    ...child,
    path: absPath,
    meta: {
      ...child.meta,
      menuGroupOrder: baseOrder + 6,
    },
  }
}

function buildMergedTeacherQualityRoutes(menuRoutes: RouteRecordRaw[]): RouteRecordRaw[] {
  const teacherRoute = menuRoutes.find((r) => r.path === '/teacher')
  const qualityRoute = menuRoutes.find((r) => r.path === '/quality')
  const teacherItems = (teacherRoute?.children ?? []).filter((child) => !child.meta?.hideInMenu)
  const qualityItems = (qualityRoute?.children ?? [])
    .filter((child) => !child.meta?.hideInMenu)
    .map((child) => normalizeQualitySidebarItem(child))
  return [...teacherItems, ...qualityItems]
}

// 使用权限过滤后的菜单路由
const sidebarRoutes = computed(() => {
  if (props.menus) {
    return props.menus
  }
  const menuRoutes = routeStore.getMenuRoutes()

  if (useMergedTeacherQualitySidebar.value) {
    return buildMergedTeacherQualityRoutes(menuRoutes)
  }

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
  if (!isRoleLayoutRoute.value && !useMergedTeacherQualitySidebar.value) return null

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

// 当前页面激活菜单路径，先从路由里面找
function resolveMenuSelectedKey(raw: string): string {
  if (raw.startsWith('/quality/')) {
    return raw
  }
  if (raw.startsWith('/teacher/')) {
    const relative = raw.slice('/teacher/'.length)
    const firstSegment = relative.split('/')[0]
    return firstSegment || relative
  }
  const prefix = activeLayoutPrefix.value
  if (prefix && raw.startsWith(`${prefix}/`)) {
    const relative = raw.slice(prefix.length + 1)
    const firstSegment = relative.split('/')[0]
    return firstSegment || relative
  }
  return raw
}

const activeMenu = computed<Key[]>(() => {
  const { meta, path } = route
  if (meta?.activeMenu) {
    return [resolveMenuSelectedKey(meta.activeMenu as string)]
  }
  return [resolveMenuSelectedKey(path)]
})

// 菜单项点击事件
const onMenuItemClick = ({ key }: { key: Key }) => {
  const keyStr = String(key)
  if (isExternal(keyStr)) {
    window.open(keyStr)
    return
  }
  // 修复：layout 子路由 path 在 routes 中是相对（如 'review-workspace'），
  // vue-router 4 对 router.push({ path: 相对 }) 的解析规则是替换当前路由最后一段。
  // 当用户处于含动态参数的兄弟详情路由（例如 /teacher/review/task/:taskId）时，
  // 点击侧边栏菜单会跳到 /teacher/review/task/<menu-key>，
  // 反而匹配到兄弟动态路由（如 review/task/:taskId）并把 menu-key 当作 taskId，
  // 触发"缺少必要参数：examId / taskId"等假错误页。
  // 这里把所有非外链、非绝对路径的 menu key 拼上当前 layout 前缀，强制绝对化。
  const isAbsolute = keyStr.startsWith('/')
  const prefix = useMergedTeacherQualitySidebar.value
    ? (keyStr.startsWith('/quality/') ? null : '/teacher')
    : activeLayoutPrefix.value
  const target = !isAbsolute && prefix ? `${prefix}/${keyStr}` : keyStr
  router.push({ path: target })
  emit('menu-item-click-after')
}

// ─── 子菜单展开状态 ────────────────────────────────────────
// 当前展开的 SubMenu key 列表（仅 inline 模式使用；vertical/collapsed 模式由 antd 内部 popup 接管）
const openKeys = ref<Key[]>([])

// 当前激活路由所属的 menuGroup（来自 route.meta.menuGroup）
const currentGroupKey = computed<Key | null>(() => {
  const groupKey = route.meta?.menuGroup as string | undefined
  if (groupKey) return groupKey
  if (route.path.startsWith('/quality/')) {
    return 'quality-overview'
  }
  return null
})

// 路由变化时自动展开所属分组：手风琴模式只保留当前分组
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

// 用户手动展开/收起子菜单
const onOpenChange = (keys: Key[]) => {
  if (appStore.menuAccordion) {
    // 手风琴模式：只保留最新打开的那一个
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
