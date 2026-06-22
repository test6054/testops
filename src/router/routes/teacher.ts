/**
 * 教师（SCH_TECH / CROP_ADMIN / CROP_USER）路由
 *
 * L0 全局左栏（跨考试）：考试列表、历史纸质档案
 * L1：/teacher/exam-workspace/:examId/* 考试详情工作台（九组功能菜单）
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
      title: '阅卷中心',
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
