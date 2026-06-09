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
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import HighlightOutlined from '@ant-design/icons-vue/HighlightOutlined'
import UnorderedListOutlined from '@ant-design/icons-vue/UnorderedListOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDevice } from '@/hooks'
import { useAuthStore } from '@/stores'
import { RoleEnum } from '@/utils/permission'

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
    path: '/student/tasks',
    label: '我的任务',
    icon: UnorderedListOutlined,
    roles: [RoleEnum.SCH_STU],
  },
  // 实训市场暂时隐藏
  // {
  //   path: '/student/practice-market',
  //   label: '实训市场',
  //   icon: IconApps,
  //   roles: [RoleEnum.SCH_STU],
  // },
  // 我的成绩暂时隐藏
  // {
  //   path: '/student/grades',
  //   label: '我的成绩',
  //   icon: IconTrophy,
  //   roles: [RoleEnum.SCH_STU],
  // },
  {
    path: '/student/order-center',
    label: '订单',
    icon: UnorderedListOutlined,
    roles: [RoleEnum.SCH_STU],
  },

  // 教师端菜单
  {
    path: '/teacher/exam-list',
    label: '考试工作台',
    icon: DashboardOutlined,
    roles: [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER],
  },
  {
    path: '/teacher/marking-task-pool',
    label: '阅卷任务',
    icon: HighlightOutlined,
    roles: [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER],
  },
  {
    path: '/teacher/marking-organization',
    label: '阅卷安排',
    icon: EditOutlined,
    roles: [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER],
  },

  // 管理员菜单
  {
    path: '/admin/dashboard',
    label: '工作台',
    icon: DashboardOutlined,
    roles: [RoleEnum.SUPER_ADMIN],
  },
  {
    path: '/admin/tenants',
    label: '租户',
    icon: UserOutlined,
    roles: [RoleEnum.SUPER_ADMIN],
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

  return allTabBarItems.filter((item) => item.roles.includes(currentRole as RoleEnum))
})

/**
 * 判断当前路由是否激活
 */
function isActive(path: string): boolean {
  if (path === '/teacher/exam-list') {
    return (
      route.path.startsWith('/teacher/exam-list')
      || route.path.startsWith('/teacher/exam-prep-workbench')
    )
  }
  if (path === '/teacher/marking-task-pool') {
    return (
      route.path.startsWith('/teacher/marking-task-pool')
      || route.path.startsWith('/teacher/marking-task/')
      || route.path.startsWith('/teacher/review-workspace')
    )
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
