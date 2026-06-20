/**
 * 教师（SCH_TECH / CROP_ADMIN / CROP_USER）路由
 *
 * L0：考试列表、扫描设备维护 + 质量评价（全局侧栏）
 * L1-L3：/teacher/exam-workspace/:examId/* 考试工作台嵌套路由
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_TEACHER_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]

export const teacherRoutes: RouteRecordRaw[] = [
  {
    path: '/teacher',
    name: 'TeacherLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/teacher/exam-list',
    meta: {
      title: '阅卷工作台',
      roles: ALL_TEACHER_ROLES,
      icon: 'audit',
      hideInMenu: false,
    },
    children: [
      {
        path: 'exam-list',
        name: 'TeacherExamList',
        component: () => import('@/views/teacher/exam-list.vue'),
        meta: {
          title: '考试列表',
          roles: TEACHER_ROLES,
          icon: 'dashboard',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam-prep',
          menuGroupTitle: '阅卷中心',
          menuGroupIcon: 'dashboard',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'scan-devices',
        name: 'TeacherScanDeviceManagement',
        component: () => import('@/views/teacher/printer-management.vue'),
        meta: {
          title: '扫描设备',
          roles: TEACHER_ROLES,
          icon: 'desktop',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam-prep',
          menuGroupTitle: '阅卷中心',
          menuGroupIcon: 'dashboard',
          menuGroupOrder: 1,
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
          hideInMenu: true,
          keepAlive: true,
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
        path: 'marking-organization/:organizationId',
        name: 'TeacherMarkingOrganizationDetail',
        component: () => import('@/views/admin/marking-organization/detail.vue'),
        meta: {
          title: '组织详情',
          roles: TEACHER_ROLES,
          icon: 'setting',
          hideInMenu: true,
          noCache: true,
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
