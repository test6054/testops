<template>
  <div v-if="showTabBar" class="tab-bar">
    <div
      v-for="item in tabBarItems"
      :key="item.path"
      class="tab-bar-item"
      :class="[{ active: isActive(item.path) }]"
      @click="handleNavigate(item.path)"
    >
      <component :is="item.icon" class="tab-bar-icon" />
      <span class="tab-bar-label">{{ item.label }}</span>
      <a-badge v-if="item.badge && item.badge > 0" :count="item.badge" :offset="[-8, 4]" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import { computed } from 'vue'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import FolderOutlined from '@ant-design/icons-vue/FolderOutlined'
import HistoryOutlined from '@ant-design/icons-vue/HistoryOutlined'
import MailOutlined from '@ant-design/icons-vue/MailOutlined'
import ReconciliationOutlined from '@ant-design/icons-vue/ReconciliationOutlined'
import { useRoute, useRouter } from 'vue-router'
import { useDevice } from '@/hooks'
import { useAuthStore } from '@/stores'
import { isValidRole, RoleEnum } from '@/utils/permission'
import { isQualityEvaluationRoute, PORTFOLIO_ROUTE_PREFIX } from '@/utils/portfolio-route'

defineOptions({ name: 'TabBar' })

const router = useRouter()
const route = useRoute()
const { isMobile } = useDevice()
const authStore = useAuthStore()

interface TabBarItem {
  path: string
  label: string
  icon: Component
  badge?: number
  roles: RoleEnum[]
}

// TabBar菜单项配置（根据角色动态显示）
const allTabBarItems: TabBarItem[] = [
  // 学生端菜单
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

  // 教师端菜单（移动端 TabBar：阅卷概览为入口，子页与工作台仍归属同一域）
  {
    path: '/teacher/dashboard',
    label: '考试阅卷',
    icon: DashboardOutlined,
    roles: [RoleEnum.SUPER_ADMIN, RoleEnum.SCH_TECH],
  },
  {
    path: '/quality/dashboard',
    label: '质量评价',
    icon: ReconciliationOutlined,
    roles: [RoleEnum.SCH_TECH, RoleEnum.SUPER_ADMIN],
  },
  {
    path: `${PORTFOLIO_ROUTE_PREFIX}/teacher/home`,
    label: '教学档案袋',
    icon: FolderOutlined,
    roles: [RoleEnum.SCH_TECH, RoleEnum.SUPER_ADMIN],
  },
]

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

  return allTabBarItems.filter((item) => item.roles.includes(currentRole))
})

/**
 * 判断当前路由是否激活
 */
function isActive(path: string): boolean {
  if (path === '/teacher/dashboard') {
    return (
      route.path.startsWith('/teacher/dashboard') ||
      route.path.startsWith('/teacher/exam-list') ||
      route.path.startsWith('/teacher/exam-workspace/') ||
      route.path.startsWith('/teacher/archive-volumes')
    )
  }
  if (path === '/quality/dashboard') {
    return isQualityEvaluationRoute(route.path)
  }
  if (path === `${PORTFOLIO_ROUTE_PREFIX}/teacher/home`) {
    return route.path.startsWith(PORTFOLIO_ROUTE_PREFIX)
  }
  return route.path.startsWith(path)
}

/**
 * 处理导航点击
 */
function handleNavigate(path: string) {
  if (route.path !== path) {
    router.push(path)
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
  background-color: var(--ant-color-bg-container);
  border-top: 1px solid var(--ant-color-border-secondary);
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
      font-size: 20px;
      color: var(--ant-color-text-tertiary);
      transition:
        color 0.3s ease,
        transform 0.3s ease;
    }

    .tab-bar-label {
      font-size: 11px;
      color: var(--ant-color-text-tertiary);
      transition: color 0.3s ease;
      white-space: nowrap;
    }

    &.active {
      .tab-bar-icon {
        color: var(--ant-color-primary);
        transform: scale(1.1);
      }

      .tab-bar-label {
        color: var(--ant-color-primary);
        font-weight: 600;
      }
    }

    &:active {
      transform: scale(0.95);
    }
  }
}
</style>
