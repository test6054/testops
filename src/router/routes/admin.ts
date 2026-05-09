/**
 * 管理员（SUPER_ADMIN）路由
 *
 * 阅卷端管理员仅关注阅卷专属视角：阅卷概览与批改审计。
 * 租户 / 用户 / 系统公告 / 存储统计等通用管理能力由
 * `edu-practice-web-vue` 统一承载，阅卷端不再重复实现。
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const ADMIN_ROLES = [RoleEnum.SUPER_ADMIN]

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    name: 'AdminLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/admin/dashboard',
    meta: {
      title: '阅卷管理中心',
      roles: ADMIN_ROLES,
      icon: 'dashboard',
      hideInMenu: false,
    },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/dashboard.vue'),
        meta: {
          title: '阅卷概览',
          roles: ADMIN_ROLES,
          icon: 'dashboard',
          hideInMenu: false,
        },
      },
      {
        path: 'audit-trail',
        name: 'AdminAuditTrail',
        component: () => import('@/views/admin/audit-trail.vue'),
        meta: {
          title: '批改审计',
          roles: ADMIN_ROLES,
          icon: 'file-protect',
          hideInMenu: false,
          menuGroup: 'marking-admin',
          menuGroupTitle: '阅卷监管',
          menuGroupIcon: 'audit',
          menuGroupOrder: 2,
        },
      },
    ],
  },
]
