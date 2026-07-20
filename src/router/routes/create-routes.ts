/**
 * 教师创建页路由（独立全屏 layout，不进入 TeacherLayout 侧栏）
 *
 * 路径：/teacher/create/*
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH]

export const createPageRoutes: RouteRecordRaw = {
  path: '/teacher/create',
  component: () => import('@/layout/CreatePageLayout.vue'),
  meta: {
    title: '创建',
    roles: TEACHER_ROLES,
    hideInMenu: true,
    layout: 'CreatePage',
    requiresAuth: true,
  },
  children: [
    {
      path: 'exam',
      name: 'TeacherCreateExam',
      component: () => import('@/views/teacher/exam-create/exam-create.vue'),
      meta: {
        title: '新建考试',
        roles: TEACHER_ROLES,
        hideInMenu: true,
        noCache: true,
      },
    },
    {
      path: 'archive-task',
      name: 'TeacherCreateArchiveTask',
      component: () => import('@/views/teacher/archive-volume/archive-task-create/archive-task-create.vue'),
      meta: {
        title: '新建课程考核袋',
        roles: TEACHER_ROLES,
        hideInMenu: true,
        noCache: true,
      },
    },
    {
      path: 'archive-offline',
      redirect: (to) => ({
        name: 'TeacherCreateArchiveTask',
        query: { ...to.query, provenance: 'CURRENT_TERM_OFFLINE' },
      }),
    },
    {
      path: 'archive-supplement',
      redirect: (to) => ({
        name: 'TeacherCreateArchiveTask',
        query: { ...to.query, provenance: 'HISTORICAL_DIGITIZE' },
      }),
    },
  ],
}
