/**
 * 基础路由（无需认证）
 */
import type { RouteRecordRaw } from 'vue-router'
import type { SeoMeta } from '@/utils/seo'
import { RoleEnum } from '@/utils/permission'

const LOGIN_SEO: SeoMeta = {
  title: '阅卷中心 | 高校在线试卷批改与成绩管理',
  description:
    '阅卷中心是面向高校的纸质试卷扫描批改与成绩发布平台，覆盖扫描录入、影像账本、智能识别、教师匿名批阅、复核审计、成绩发布、解匿名查分等完整阅卷链路。',
  keywords: '在线阅卷,试卷扫描,智能批改,匿名批阅,影像账本,成绩发布,复核审计,高校阅卷系统',
  canonical: 'https://shixunfang.com/marking',
}

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Root',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
      seo: LOGIN_SEO,
    },
  },
  {
    path: '/cas-first-login-completion',
    name: 'CasFirstLoginCompletion',
    component: () => import('@/views/auth/cas-first-login-completion.vue'),
    meta: {
      title: '首次登录补录',
      requiresAuth: false,
    },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/forgot-password.vue'),
    meta: {
      title: '忘记密码',
      requiresAuth: false,
    },
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: () => import('@/views/auth/change-password.vue'),
    meta: {
      title: '修改密码',
      requiresAuth: true,
      roles: [
        RoleEnum.SUPER_ADMIN,
        RoleEnum.SCH_TECH,
        RoleEnum.CROP_ADMIN,
        RoleEnum.CROP_USER,
        RoleEnum.SCH_STU,
      ],
    },
  },
  {
    path: '/scanner-kiosk',
    name: 'ScannerKiosk',
    component: () => import('@/views/scanner-kiosk/index.vue'),
    meta: {
      title: '扫描一体机',
      requiresAuth: false,
    },
  },
]
