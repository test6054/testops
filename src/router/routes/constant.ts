/**
 * 基础路由（无需认证）
 */
import type { RouteRecordRaw } from 'vue-router'
import type { SeoMeta } from '@/utils/seo'
import { RoleEnum } from '@/utils/permission'

const LOGIN_SEO: SeoMeta = {
  title: '教学质量中心 | 考试阅卷与教学质量治理',
  description:
    '教学质量中心面向高校提供考试阅卷、OBE 质量评价与教师档案治理，覆盖扫描录入、智能识别、批阅复核、成绩发布、达成度分析与认证支撑等完整链路。',
  keywords: '教学质量中心,在线阅卷,质量评价,OBE,达成度,教师档案,高校阅卷系统',
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
    // 一体机扫描工作站：父路由挂载 KioskLayout，三阶段主链 + 独立历史页。
    path: '/scanner-kiosk',
    name: 'ScannerKiosk',
    component: () => import('@/views/scanner-kiosk/KioskLayout.vue'),
    redirect: '/scanner-kiosk/setup',
    meta: {
      title: '扫描一体机',
      requiresAuth: false,
    },
    children: [
      {
        path: 'step',
        redirect: '/scanner-kiosk/setup',
        meta: {
          title: '准备扫描',
          requiresAuth: false,
        },
      },
      {
        path: 'setup',
        name: 'ScannerKioskSetup',
        component: () => import('@/views/scanner-kiosk/stages/SetupStage.vue'),
        meta: {
          title: '准备扫描',
          requiresAuth: false,
        },
      },
      {
        path: 'scanning',
        name: 'ScannerKioskScanning',
        component: () => import('@/views/scanner-kiosk/stages/ScanningStage.vue'),
        meta: {
          title: '扫描中',
          requiresAuth: false,
        },
      },
      {
        path: 'review',
        name: 'ScannerKioskReview',
        component: () => import('@/views/scanner-kiosk/stages/ReviewStage.vue'),
        meta: {
          title: '复核与异常处置',
          requiresAuth: false,
        },
      },
      {
        path: 'history',
        name: 'ScannerKioskHistory',
        component: () => import('@/views/scanner-kiosk/stages/HistoryStage.vue'),
        meta: {
          title: '本机历史批次',
          requiresAuth: false,
        },
      },
    ],
  },
  {
    path: '/survey/:token',
    name: 'PublicSurvey',
    component: () => import('@/views/public/survey-fill.vue'),
    meta: {
      title: '问卷填写',
      requiresAuth: false,
    },
  },
]
