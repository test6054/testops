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
      {
        path: 'marking-organization',
        name: 'AdminMarkingOrganizationIndex',
        component: () => import('@/views/admin/marking-organization/index.vue'),
        meta: {
          title: '阅卷组织',
          roles: ADMIN_ROLES,
          icon: 'team',
          hideInMenu: false,
          menuGroup: 'marking-organization',
          menuGroupTitle: '阅卷组织',
          menuGroupIcon: 'deployment-unit',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'marking-organization/:organizationId',
        name: 'AdminMarkingOrganizationDetail',
        component: () => import('@/views/admin/marking-organization/detail.vue'),
        meta: {
          title: '组织详情',
          roles: ADMIN_ROLES,
          icon: 'setting',
          hideInMenu: true,
          noCache: true,
        },
      },
      {
        path: 'marking-organization/:organizationId/sessions',
        name: 'AdminMarkingOrganizationSessions',
        component: () => import('@/views/admin/marking-organization/sessions.vue'),
        meta: {
          title: '试评 / 正评',
          roles: ADMIN_ROLES,
          icon: 'play-circle',
          hideInMenu: true,
          noCache: true,
        },
      },
      {
        path: 'cross-exam-dashboard',
        name: 'AdminCrossExamDashboard',
        component: () => import('@/views/admin/cross-exam-dashboard.vue'),
        meta: {
          title: '跨考试纵向分析',
          roles: ADMIN_ROLES,
          icon: 'line-chart',
          hideInMenu: false,
          menuGroup: 'ai-analysis',
          menuGroupTitle: 'AI 智能分析',
          menuGroupIcon: 'experiment',
          menuGroupOrder: 3,
        },
      },
      {
        path: 'school-quality-dashboard',
        name: 'AdminSchoolQualityDashboard',
        component: () => import('@/views/admin/school-quality-dashboard.vue'),
        meta: {
          title: '校级质量分析',
          roles: ADMIN_ROLES,
          icon: 'bank',
          hideInMenu: false,
          menuGroup: 'ai-analysis',
          menuGroupTitle: 'AI 智能分析',
          menuGroupIcon: 'experiment',
          menuGroupOrder: 3,
        },
      },
      {
        path: 'marking-quality',
        name: 'AdminMarkingQuality',
        component: () => import('@/views/admin/marking-quality-dashboard.vue'),
        meta: {
          title: '阅卷质量监控',
          roles: ADMIN_ROLES,
          icon: 'safety',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'marking-admin',
          menuGroupTitle: '阅卷监管',
          menuGroupIcon: 'audit',
          menuGroupOrder: 2,
        },
      },
      {
        path: 'exam-exports',
        name: 'AdminExamExports',
        component: () => import('@/views/common/exam-export-tasks.vue'),
        meta: {
          title: '导出任务',
          roles: ADMIN_ROLES,
          icon: 'cloud-download',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam-delivery',
          menuGroupTitle: '考试收口',
          menuGroupIcon: 'safety-certificate',
          menuGroupOrder: 4,
        },
      },
      {
        path: 'teaching-affairs-sync',
        name: 'AdminTeachingAffairsSync',
        component: () => import('@/views/admin/teaching-affairs-sync.vue'),
        meta: {
          title: '教务同步',
          roles: ADMIN_ROLES,
          icon: 'api',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam-delivery',
          menuGroupTitle: '考试收口',
          menuGroupIcon: 'safety-certificate',
          menuGroupOrder: 4,
        },
      },
    ],
  },
]
