/**
 * 公共路由（所有角色可访问）+ 错误页面路由
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const ALL_ROLES = [
  RoleEnum.SUPER_ADMIN,
  RoleEnum.SCH_TECH,
  RoleEnum.CROP_ADMIN,
  RoleEnum.CROP_USER,
  RoleEnum.SCH_STU,
]

export const commonRoutes: RouteRecordRaw[] = [
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/user/profile/index.vue'),
    meta: {
      title: '个人资料',
      roles: ALL_ROLES,
      icon: 'user',
      hideInMenu: true,
    },
  },
  {
    path: '/messages',
    name: 'Messages',
    component: () => import('@/views/user/message/index.vue'),
    meta: {
      title: '消息中心',
      roles: ALL_ROLES,
      icon: 'message',
      hideInMenu: true,
    },
  },
]

export const errorRoutes: RouteRecordRaw[] = [
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: {
      title: '权限不足',
      requiresAuth: false,
    },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: {
      title: '页面不存在',
      requiresAuth: false,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
]
