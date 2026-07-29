<template>
  <div v-if="showTabBar" class="tab-bar">
    <div
      v-for="item in tabBarItems"
      :key="item.path"
      class="tab-bar-item"
      :class="[{ active: isActive(item) }]"
      @click="handleNavigate(item)"
    >
      <component :is="item.icon" class="tab-bar-icon" />
      <span class="tab-bar-label">{{ item.label }}</span>
      <UiCountBadge v-if="item.badge && item.badge > 0" :count="item.badge" :offset="[-8, 4]" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import type { ShellProductDomain } from '@/utils/shell-domain'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import FolderOutlined from '@ant-design/icons-vue/FolderOutlined'
import HistoryOutlined from '@ant-design/icons-vue/HistoryOutlined'
import MailOutlined from '@ant-design/icons-vue/MailOutlined'
import ReconciliationOutlined from '@ant-design/icons-vue/ReconciliationOutlined'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiCountBadge from '@/components/ui-guide/ui/UiCountBadge.vue'
import { useDevice } from '@/hooks'
import { useAuthStore, useRouteStore } from '@/stores'
import { isValidRole, RoleEnum } from '@/utils/permission'
import {
  listAvailableShellProductDomains,
  rememberShellDomainPath,
  resolveShellDomainNavigateTo,
  resolveShellProductDomain,
  SHELL_PRODUCT_DOMAIN_FULL_LABEL,
  SHELL_PRODUCT_DOMAIN_HOME,
} from '@/utils/shell-domain'

defineOptions({ name: 'TabBar' })

const router = useRouter()
const route = useRoute()
const { isMobile } = useDevice()
const authStore = useAuthStore()
const routeStore = useRouteStore()

interface TabBarItem {
  path: string
  label: string
  icon: Component
  badge?: number
  roles: RoleEnum[]
  /** 教师三域 Tab：与顶栏 DomainSwitch / 侧栏单域同源 */
  domain?: ShellProductDomain
}

const DOMAIN_TAB_ICON: Record<ShellProductDomain, Component> = {
  marking: DashboardOutlined,
  quality: ReconciliationOutlined,
  portfolio: FolderOutlined,
}

// 学生端菜单（叶子与桌面侧栏 student 路由对齐）
const studentTabItems: TabBarItem[] = [
  {
    path: '/student/score',
    label: '我的成绩',
    icon: DashboardOutlined,
    roles: [RoleEnum.SCH_STU],
  },
  {
    path: '/student/exam-history',
    label: '历次考试',
    icon: HistoryOutlined,
    roles: [RoleEnum.SCH_STU],
  },
  {
    path: '/student/appeal',
    label: '复核申请',
    icon: MailOutlined,
    roles: [RoleEnum.SCH_STU],
  },
]

const layoutRouteSource = computed(() => {
  return routeStore.routes.length > 0 ? routeStore.routes : routeStore.getMenuRoutes()
})

const teacherDomainTabItems = computed<TabBarItem[]>(() => {
  const domains = listAvailableShellProductDomains(layoutRouteSource.value)
  return domains.map((domain) => ({
    path: SHELL_PRODUCT_DOMAIN_HOME[domain],
    label: SHELL_PRODUCT_DOMAIN_FULL_LABEL[domain],
    icon: DOMAIN_TAB_ICON[domain],
    roles: [RoleEnum.SUPER_ADMIN, RoleEnum.SCH_TECH],
    domain,
  }))
})

// 是否显示TabBar（仅移动端显示）
const showTabBar = computed(() => isMobile.value)

// 根据当前用户角色筛选可见的TabBar项
const tabBarItems = computed(() => {
  const currentRole = authStore.userRole
  if (!currentRole) {
    return []
  }
  if (!isValidRole(currentRole)) {
    return []
  }

  if (currentRole === RoleEnum.SCH_STU) {
    return studentTabItems.filter((item) => item.roles.includes(currentRole))
  }

  return teacherDomainTabItems.value.filter((item) => item.roles.includes(currentRole))
})

/**
 * 判断当前路由是否激活。
 * 系统管理（quality-admin）不算产品域，三域 Tab 均不高亮，与顶栏 DomainSwitch 一致。
 */
function isActive(item: TabBarItem): boolean {
  if (item.domain) {
    return resolveShellProductDomain(route.path, route.meta?.menuGroup) === item.domain
  }
  return route.path.startsWith(item.path)
}

/**
 * 处理导航点击：教师三域与顶栏 DomainSwitch 相同，恢复域内上次路径。
 */
function handleNavigate(item: TabBarItem) {
  if (item.domain) {
    const current = resolveShellProductDomain(route.path, route.meta?.menuGroup)
    if (current && current !== item.domain) {
      rememberShellDomainPath(current, route.fullPath)
    }
    if (current === item.domain) {
      // 已在本域：回到域首页（任务入口），避免 Tab 无反馈
      const home = SHELL_PRODUCT_DOMAIN_HOME[item.domain]
      if (route.path !== home) {
        void router.push(home)
      }
      return
    }
    const target = resolveShellDomainNavigateTo(router, item.domain)
    if (target !== route.fullPath) {
      void router.push(target)
    }
    return
  }
  if (route.path !== item.path) {
    void router.push(item.path)
  }
}
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  background-color: var(--dp-bg-container);
  border-top: 1px solid var(--dp-border-subtle);
  box-shadow: var(--dp-shadow-sm);
  padding: 0 8px;
  padding-bottom: env(safe-area-inset-bottom); // iOS安全区域适配

  .tab-bar-item {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px;
    cursor: pointer;
    transition: transform 0.3s ease;
    user-select: none;

    .tab-bar-icon {
      font-size: var(--dp-font-size-2xl);
      color: var(--dp-text-tertiary);
      transition:
        color 0.3s ease,
        transform 0.3s ease;
    }

    .tab-bar-label {
      font-size: var(--dp-font-size-xs);
      color: var(--dp-text-tertiary);
      transition: color 0.3s ease;
      white-space: nowrap;
    }

    &.active {
      .tab-bar-icon {
        color: var(--dp-color-primary);
        transform: scale(1.1);
      }

      .tab-bar-label {
        color: var(--dp-color-primary);
        font-weight: 600;
      }
    }

    &:active {
      transform: scale(0.95);
    }
  }
}
</style>
