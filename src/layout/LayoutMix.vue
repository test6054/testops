<template>
  <div class="layout-mix">
    <section class="layout-mix-right">
      <header class="header">
        <div class="header-content">
          <!-- 添加 Logo 到顶部，因为左侧菜单已隐藏 -->
          <Logo :collapsed="false"></Logo>
          <nav v-if="isDesktop && groupedTopMenus.length > 0" class="top-nav" aria-label="顶部导航">
            <template v-for="entry in groupedTopMenus" :key="entry.key">
              <a-dropdown
                v-if="entry.type === 'group'"
                overlay-class-name="top-nav-dropdown"
                placement="bottomLeft"
                trigger="hover"
              >
                <button
                  type="button"
                  class="top-nav__item"
                  :class="{ 'is-active': isEntryActive(entry) }"
                >
                  <span class="top-nav__item-icon">
                    <MenuIcon :icon="entry.icon" />
                  </span>
                  <span class="top-nav__item-label">{{ entry.title }}</span>
                </button>
                <template #overlay>
                  <a-menu :selected-keys="activeMenu" @click="handleGroupMenuClick">
                    <a-menu-item v-for="child in entry.items" :key="child.path || child.name">
                      <template #icon>
                        <MenuIcon :icon="getRouteIcon(child)" />
                      </template>
                      <span>{{ getMenuTitle(child) }}</span>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>

              <button
                v-else
                type="button"
                class="top-nav__item"
                :class="{ 'is-active': isEntryActive(entry) }"
                @click="handleTopEntryClick(entry)"
              >
                <span class="top-nav__item-icon">
                  <MenuIcon :icon="getRouteIcon(entry.route!)" />
                </span>
                <span class="top-nav__item-label">{{ getMenuTitle(entry.route!) }}</span>
              </button>
            </template>
          </nav>
          <HeaderRightBar></HeaderRightBar>
        </div>
      </header>

      <Main></Main>
      <!-- <GiFooter v-if="appStore.copyrightDisplay" /> -->
    </section>

    <!-- 公告弹窗 -->
    <NoticePopup ref="noticePopupRef" />
  </div>
</template>

<script lang="ts" setup>
import type { RouteRecordRaw } from 'vue-router'
import { debounce } from 'lodash-es'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDevice } from '@/hooks'
import { useRouteStore } from '@/stores'
import { getToken } from '@/utils/auth'

import { isExternal } from '@/utils/validate'
import NoticePopup from '@/views/user/message/components/NoticePopup.vue'
import HeaderRightBar from './components/HeaderRightBar/index.vue'
import Logo from './components/Logo.vue'
import Main from './components/Main.vue'
import MenuIcon from './components/Menu/MenuIcon.vue'

defineOptions({ name: 'LayoutMix' })
const route = useRoute()
const router = useRouter()
const routeStore = useRouteStore()
const { isDesktop } = useDevice()
// 顶部菜单：根据用户角色获取对应的子路由
const topMenus = computed(() => {
  try {
    const filteredRoutes = routeStore.getMenuRoutes()

    if (!filteredRoutes || filteredRoutes.length === 0) {
      return []
    }

    // 根据当前路由路径确定要显示的菜单
    if (route.path.startsWith('/admin/')) {
      const adminRoute = filteredRoutes.find((r) => r.path === '/admin')
      return adminRoute?.children?.filter((child) => !child.meta?.hideInMenu) || []
    } else if (route.path.startsWith('/teacher/')) {
      const teacherRoute = filteredRoutes.find((r) => r.path === '/teacher')
      return teacherRoute?.children?.filter((child) => !child.meta?.hideInMenu) || []
    } else if (route.path.startsWith('/student/')) {
      const studentRoute = filteredRoutes.find((r) => r.path === '/student')
      return studentRoute?.children?.filter((child) => !child.meta?.hideInMenu) || []
    }

    // 默认返回第一个路由的子路由
    const firstRoute = filteredRoutes[0]
    return firstRoute?.children?.filter((child) => !child.meta?.hideInMenu) || []
  } catch {
    return []
  }
})

// 公告弹窗引用
const noticePopupRef = ref<InstanceType<typeof NoticePopup>>()

// 检查并显示未读公告
const checkAndShowNotices = () => {
  const token = getToken()
  if (token) {
    setTimeout(() => {
      noticePopupRef.value?.open()
    }, 1000) // 延迟1秒显示，让页面先加载完成
  }
}

// 直接从路由 meta.icon 获取图标名，不再用关键词匹配
const getRouteIcon = (item: RouteRecordRaw): string => {
  const icon = item.meta?.icon || item.children?.[0]?.meta?.icon
  return typeof icon === 'string' ? icon : 'appstore'
}

const getMenuTitle = (item: RouteRecordRaw): string => {
  const title = item.meta?.title || item.children?.[0]?.meta?.title
  return typeof title === 'string' ? title : '未命名菜单'
}

// 添加稳定的菜单数据，避免频繁更新导致的slot警告
const stableTopMenus = ref<RouteRecordRaw[]>([])

// 使用防抖更新菜单数据
const updateStableMenus = debounce(() => {
  const newMenus = topMenus.value
  if (JSON.stringify(newMenus) !== JSON.stringify(stableTopMenus.value)) {
    stableTopMenus.value = newMenus
  }
}, 100)

// 监听topMenus变化
watch(topMenus, updateStableMenus, { immediate: true, deep: true })

interface TopMenuEntry {
  type: 'item' | 'group'
  key: string
  title?: string
  icon?: string
  order?: number
  route?: RouteRecordRaw
  items?: RouteRecordRaw[]
}

const groupedTopMenus = computed<TopMenuEntry[]>(() => {
  const menus = stableTopMenus.value
  if (!menus || menus.length === 0) return []

  const entries: TopMenuEntry[] = []
  const groupMap = new Map<string, TopMenuEntry>()

  for (const item of menus) {
    const groupKey = item.meta?.menuGroup as string | undefined
    if (!groupKey) {
      entries.push({
        type: 'item',
        key: (item.path || item.name || '') as string,
        route: item,
      })
    } else {
      if (!groupMap.has(groupKey)) {
        const entry: TopMenuEntry = {
          type: 'group',
          key: `group-${groupKey}`,
          title: (item.meta?.menuGroupTitle as string) || groupKey,
          icon: (item.meta?.menuGroupIcon as string) || 'folder',
          order: (item.meta?.menuGroupOrder as number) || 99,
          items: [],
        }
        groupMap.set(groupKey, entry)
        entries.push(entry)
      }
      groupMap.get(groupKey)!.items!.push(item)
    }
  }

  return entries
})

// 当前选中的菜单项
const activeMenu = ref<string[]>([])

const navigateToMenuKey = (keyStr: string) => {
  const targetKey = String(keyStr)
  if (targetKey.startsWith('group-') || isExternal(targetKey)) {
    if (isExternal(targetKey)) window.open(targetKey)
    return
  }

  let basePath = ''
  if (route.path.startsWith('/admin/')) {
    basePath = '/admin'
  } else if (route.path.startsWith('/teacher/')) {
    basePath = '/teacher'
  } else if (route.path.startsWith('/student/')) {
    basePath = '/student'
  }

  router.push({ path: `${basePath}/${targetKey}` })
}

const handleTopEntryClick = (entry: TopMenuEntry) => {
  if (entry.type !== 'item' || !entry.route) {
    return
  }

  navigateToMenuKey(String(entry.route.path || entry.route.name || ''))
}

const handleGroupMenuClick = ({ key }: { key: string | number }) => {
  navigateToMenuKey(String(key))
}

const isEntryActive = (entry: TopMenuEntry) => {
  const currentKey = activeMenu.value[0]
  if (!currentKey) {
    return false
  }

  if (entry.type === 'item') {
    return entry.key === currentKey
  }

  return (entry.items || []).some((child) => String(child.path || child.name || '') === currentKey)
}

function normalizeActiveMenuKey(path: string) {
  if (path.startsWith('/admin/')) {
    return path.replace('/admin/', '')
  }
  if (path.startsWith('/teacher/')) {
    return path.replace('/teacher/', '')
  }
  if (path.startsWith('/student/')) {
    return path.replace('/student/', '')
  }
  return path
}

// 监听路由变化，设置选中状态
watch(
  () => ({ path: route.path, activeMenu: route.meta?.activeMenu as string | undefined }),
  ({ path, activeMenu: currentActiveMenu }) => {
    activeMenu.value = [normalizeActiveMenuKey(currentActiveMenu || path)]
  },
  { immediate: true },
)

onMounted(() => {
  checkAndShowNotices()
})
</script>

<style lang="scss" scoped>
.top-nav {
  flex: 1;
  display: flex;
  height: 100%;
  align-self: stretch;
  align-items: stretch;
  gap: 8px;
  margin-left: 32px; // 与品牌 Logo 拉开距离
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.top-nav::-webkit-scrollbar {
  display: none;
}

.top-nav__item {
  position: relative;
  height: 100%;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: var(--ant-color-text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease;
}

.top-nav__item::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--ant-color-primary);
  opacity: 0;
  transform: scaleX(0.84);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.top-nav__item:hover,
.top-nav__item.is-active {
  color: var(--ant-color-primary);
}

.top-nav__item.is-active::after {
  opacity: 1;
  transform: scaleX(1);
}

.top-nav__item-icon {
  width: 18px;
  min-width: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: inherit;
}

.top-nav__item-label {
  color: inherit;
  line-height: 1;
}

.layout-mix {
  height: 100%;
  display: flex;
  align-items: stretch;
  overflow: hidden;

  &-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.header {
  width: 100%;
  height: 64px;
  color: var(--ant-color-text);
  background: var(--ant-color-bg-container);
  border-bottom: 1px solid var(--ant-color-border-secondary);
  box-shadow: var(--dp-shadow-md);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
  z-index: 100; // 确保阴影盖住下方内容

  // 按钮样式
  :deep(.ant-btn-default) {
    background: color-mix(in srgb, var(--ant-color-bg-container) 65%, transparent);

    &:hover {
      background: color-mix(in srgb, var(--ant-color-bg-container) 95%, transparent);
    }
  }
}

// 内容包装器 - 与 Main.vue 保持一致的 max-width
.header-content {
  width: 100%;
  max-width: 1400px;
  height: 100%;
  padding: 0 $padding;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

<!-- 下拉弹出层样式需要非 scoped 才能生效 -->
<style lang="scss">
.top-nav-dropdown.ant-dropdown {
  .ant-dropdown-menu {
    padding: 6px !important;
    border-radius: var(--dp-radius-lg, 8px) !important;
    box-shadow:
      0 6px 24px 0 rgba(0, 0, 0, 0.1),
      0 2px 8px 0 rgba(0, 0, 0, 0.06) !important;
    min-width: 160px;

    .ant-dropdown-menu-item,
    .ant-dropdown-menu-submenu-title {
      height: 42px !important;
      line-height: 42px !important;
      margin: 2px 0 !important;
      padding: 0 14px !important;
      border-radius: var(--dp-radius-md, 6px) !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      color: var(--ant-color-text) !important;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;

      .ant-dropdown-menu-item-icon {
        margin-right: 8px !important;
        font-size: 16px !important;
        color: var(--ant-color-text);
      }

      &:hover {
        background-color: var(--ant-color-fill-secondary) !important;
        color: var(--ant-color-primary) !important;

        .ant-dropdown-menu-item-icon {
          color: var(--ant-color-primary);
        }
      }

      &.ant-dropdown-menu-item-selected {
        background-color: color-mix(in srgb, var(--ant-color-primary) 8%, transparent) !important;
        color: var(--ant-color-primary) !important;
        font-weight: 700 !important;

        .ant-dropdown-menu-item-icon {
          color: var(--ant-color-primary);
        }
      }
    }
  }
}
</style>
