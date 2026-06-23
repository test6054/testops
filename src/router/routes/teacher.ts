/**
 * 考试阅卷路由（/teacher）
 *
 * L0 全局左栏：
 *   - 教师业务：考试列表、历史纸质档案；阅卷组织在考试工作台内按 examId 配置（非 L0 菜单）
 *   - SUPER_ADMIN SaaS 治理：阅卷概览 / 监管 / AI 分析 / 考试收口 / 平台配置
 * L1：/teacher/exam-workspace/:examId/* 考试详情工作台
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_TEACHER_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]
const SUPER_ADMIN_ROLES = [RoleEnum.SUPER_ADMIN]

export const teacherRoutes: RouteRecordRaw[] = [
  {
    path: '/teacher',
    name: 'TeacherLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/teacher/exam-list',
    meta: {
      title: '考试阅卷',
      roles: ALL_TEACHER_ROLES,
      icon: 'audit',
      hideInMenu: true,
      hideInBreadcrumb: true,
    },
    children: [
      {
        path: 'exam-list',
        name: 'TeacherExamList',
        component: () => import('@/views/teacher/exam-list.vue'),
        meta: {
          title: '考试列表',
          roles: TEACHER_ROLES,
          icon: 'unordered-list',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'paper-archive-list',
        name: 'TeacherPaperArchiveList',
        component: () => import('@/views/teacher/paper-archive/paper-archive-list.vue'),
        meta: {
          title: '历史纸质档案',
          roles: TEACHER_ROLES,
          icon: 'folder-open',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/dashboard.vue'),
        meta: {
          title: '阅卷概览',
          roles: SUPER_ADMIN_ROLES,
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
          roles: SUPER_ADMIN_ROLES,
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
        name: 'TeacherMarkingOrganizationIndex',
        component: () => import('@/views/admin/marking-organization/index.vue'),
        meta: {
          title: '阅卷组织',
          roles: TEACHER_ROLES,
          icon: 'team',
          hideInMenu: true,
          keepAlive: true,
        },
      },
      {
        path: 'marking-organization/:organizationId',
        name: 'TeacherMarkingOrganizationDetail',
        component: () => import('@/views/admin/marking-organization/detail.vue'),
        meta: {
          title: '组织详情',
          roles: TEACHER_ROLES,
          icon: 'setting',
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/exam-list',
        },
      },
      {
        path: 'marking-organization/:organizationId/sessions',
        name: 'TeacherMarkingOrganizationSessions',
        component: () => import('@/views/admin/marking-organization/sessions.vue'),
        meta: {
          title: '试评 / 正评',
          roles: TEACHER_ROLES,
          icon: 'play-circle',
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/exam-list',
        },
      },
      {
        path: 'cross-exam-dashboard',
        name: 'AdminCrossExamDashboard',
        component: () => import('@/views/admin/cross-exam-dashboard.vue'),
        meta: {
          title: '跨考试纵向分析',
          roles: SUPER_ADMIN_ROLES,
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
          roles: SUPER_ADMIN_ROLES,
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
          roles: SUPER_ADMIN_ROLES,
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
          roles: SUPER_ADMIN_ROLES,
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
          roles: SUPER_ADMIN_ROLES,
          icon: 'api',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam-delivery',
          menuGroupTitle: '考试收口',
          menuGroupIcon: 'safety-certificate',
          menuGroupOrder: 4,
        },
      },
      {
        path: 'paper-archive/:archiveSetId/detail',
        name: 'TeacherPaperArchiveDetail',
        component: () => import('@/views/teacher/paper-archive/paper-archive-detail.vue'),
        meta: {
          title: '纸质档案详情',
          roles: TEACHER_ROLES,
          icon: 'eye',
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/paper-archive-list',
        },
      },
      {
        path: 'archive/:archiveId/detail',
        name: 'TeacherArchiveDetail',
        component: () => import('@/views/teacher/archive/archive-detail.vue'),
        meta: {
          title: '归档详情',
          roles: TEACHER_ROLES,
          icon: 'eye',
          hideInMenu: true,
          noCache: true,
        },
      },
    ],
  },
]
