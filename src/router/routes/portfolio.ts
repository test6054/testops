/**
 * 教学档案袋（edu-quality 标准包）前端路由
 * 与质量评价 /quality 平级，独立 Layout 域；API 前缀 /api/portfolio/*
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'
import { PORTFOLIO_ROUTE_PREFIX } from '@/utils/portfolio-route'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]

export const portfolioRoutes: RouteRecordRaw[] = [
  {
    path: PORTFOLIO_ROUTE_PREFIX,
    name: 'PortfolioLayout',
    component: () => import('@/layout/index.vue'),
    redirect: `${PORTFOLIO_ROUTE_PREFIX}/teacher/home`,
    meta: {
      title: '教学档案袋',
      roles: ALL_ROLES,
      icon: 'folder',
      hideInMenu: true,
    },
    children: [
      {
        path: 'teacher/home',
        name: 'PortfolioTeacherHome',
        component: () => import('@/views/portfolio/teacher-home.vue'),
        meta: {
          title: '教师首页',
          roles: ALL_ROLES,
          icon: 'home',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'teacher/portrait',
        name: 'PortfolioTeacherPortrait',
        component: () => import('@/views/portfolio/teacher-portrait.vue'),
        meta: {
          title: '教师画像',
          roles: ALL_ROLES,
          icon: 'radar-chart',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'teacher/gap/:taskId',
        name: 'PortfolioTeacherGap',
        component: () => import('@/views/portfolio/teacher-gap.vue'),
        meta: {
          title: '补采任务',
          roles: ALL_ROLES,
          hideInMenu: true,
          keepAlive: false,
        },
      },
      {
        path: 'teacher/archive/:categoryId',
        name: 'PortfolioArchiveCategoryEdit',
        component: () => import('@/views/portfolio/archive-category-edit.vue'),
        meta: {
          title: '分类填报',
          roles: ALL_ROLES,
          hideInMenu: true,
          keepAlive: false,
        },
      },
      {
        path: 'teacher/correction',
        name: 'PortfolioTeacherCorrection',
        component: () => import('@/views/portfolio/correction.vue'),
        meta: {
          title: '我的纠错',
          roles: ALL_ROLES,
          icon: 'exception',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'teacher/archive',
        name: 'PortfolioTeacherArchive',
        component: () => import('@/views/portfolio/teacher-archive.vue'),
        meta: {
          title: '我的档案',
          roles: ALL_ROLES,
          icon: 'profile',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'org',
        name: 'PortfolioOrgAdmin',
        component: () => import('@/views/portfolio/org-admin.vue'),
        meta: {
          title: '档案袋组织',
          roles: ALL_ROLES,
          icon: 'apartment',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'admin/template',
        name: 'PortfolioTemplateAdmin',
        component: () => import('@/views/portfolio/template-admin.vue'),
        meta: {
          title: '档案模板配置',
          roles: ALL_ROLES,
          icon: 'file-protect',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'teachers',
        name: 'PortfolioTeacherDirectory',
        component: () => import('@/views/portfolio/teacher-directory.vue'),
        meta: {
          title: '档案袋教师名册',
          roles: ALL_ROLES,
          icon: 'team',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'ai-candidate-confirm',
        name: 'PortfolioAiCandidateConfirm',
        component: () => import('@/views/portfolio/ai-candidate-confirm.vue'),
        meta: {
          title: 'AI 候选字段确认',
          roles: ALL_ROLES,
          icon: 'robot',
          hideInMenu: false,
          keepAlive: true,
        },
      },
      {
        path: 'department/review',
        name: 'PortfolioDepartmentReview',
        component: () => import('@/views/portfolio/department-review.vue'),
        meta: {
          title: '院系审核台',
          roles: ALL_ROLES,
          requirePortfolioReviewer: true,
          icon: 'audit',
          hideInMenu: false,
          keepAlive: true,
        },
      },
    ],
  },
]
