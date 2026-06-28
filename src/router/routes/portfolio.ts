/**
 * 教学档案袋（edu-quality 标准包）前端路由
 * 与质量评价 /quality 平级，独立 Layout 域；API 前缀 /api/portfolio/*
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'
import { PORTFOLIO_ROUTE_PREFIX } from '@/utils/portfolio-route'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]
const PORTFOLIO_ADMIN_ROLES = [RoleEnum.SUPER_ADMIN, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]

const PORTFOLIO_TEACHER_MENU_GROUP = 'portfolio-teacher'
const portfolioTeacherMenuMeta = {
  menuGroup: PORTFOLIO_TEACHER_MENU_GROUP,
  menuGroupTitle: '教师自助',
  menuGroupIcon: 'user',
  menuGroupOrder: 1,
}

const PORTFOLIO_ORG_MENU_GROUP = 'portfolio-org'
const portfolioOrgMenuMeta = {
  menuGroup: PORTFOLIO_ORG_MENU_GROUP,
  menuGroupTitle: '组织与模板',
  menuGroupIcon: 'apartment',
  menuGroupOrder: 2,
}

const PORTFOLIO_DUAL_TEACHER_MENU_GROUP = 'portfolio-dual-teacher'
const portfolioDualTeacherMenuMeta = {
  menuGroup: PORTFOLIO_DUAL_TEACHER_MENU_GROUP,
  menuGroupTitle: '双师管理',
  menuGroupIcon: 'team',
  menuGroupOrder: 3,
}

/** 侧栏「发展指标」分组 */
const INDICATOR_MENU_GROUP = 'portfolio-indicator'
const indicatorMenuMeta = {
  menuGroup: INDICATOR_MENU_GROUP,
  menuGroupTitle: '发展指标',
  menuGroupIcon: 'bar-chart',
  menuGroupOrder: 4,
}

const PORTFOLIO_EVALUATION_MENU_GROUP = 'portfolio-evaluation'
const portfolioEvaluationMenuMeta = {
  menuGroup: PORTFOLIO_EVALUATION_MENU_GROUP,
  menuGroupTitle: '多元评价',
  menuGroupIcon: 'form',
  menuGroupOrder: 5,
}

const PORTFOLIO_RESOURCE_MENU_GROUP = 'portfolio-resource'
const portfolioResourceMenuMeta = {
  menuGroup: PORTFOLIO_RESOURCE_MENU_GROUP,
  menuGroupTitle: '专项资源库',
  menuGroupIcon: 'database',
  menuGroupOrder: 6,
}

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
          ...portfolioTeacherMenuMeta,
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
          ...portfolioTeacherMenuMeta,
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
          ...portfolioTeacherMenuMeta,
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
          ...portfolioTeacherMenuMeta,
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
          ...portfolioOrgMenuMeta,
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
          ...portfolioOrgMenuMeta,
        },
      },
      {
        path: 'admin/archive-score-rule',
        name: 'PortfolioArchiveScoreRuleAdmin',
        component: () => import('@/views/portfolio/archive-score-rule-admin.vue'),
        meta: {
          title: '档案评分规则',
          roles: ALL_ROLES,
          icon: 'calculator',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioOrgMenuMeta,
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
          ...portfolioOrgMenuMeta,
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
          ...portfolioOrgMenuMeta,
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
          ...portfolioOrgMenuMeta,
        },
      },
      {
        path: 'admin/indicator/platform',
        name: 'PortfolioIndicatorPlatform',
        component: () => import('@/views/portfolio/indicator-platform-admin.vue'),
        meta: {
          title: '平台指标资产',
          roles: ALL_ROLES,
          icon: 'table',
          hideInMenu: false,
          keepAlive: true,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'admin/indicator',
        name: 'PortfolioIndicatorTenant',
        component: () => import('@/views/portfolio/indicator-tenant-admin.vue'),
        meta: {
          title: '租户指标配置',
          roles: ALL_ROLES,
          icon: 'setting',
          hideInMenu: false,
          keepAlive: true,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'admin/indicator/eligibility',
        name: 'PortfolioIndicatorEligibility',
        component: () => import('@/views/portfolio/indicator-eligibility.vue'),
        meta: {
          title: '资格规则',
          roles: ALL_ROLES,
          icon: 'branches',
          hideInMenu: false,
          keepAlive: true,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'admin/indicator/publish-wizard',
        name: 'PortfolioIndicatorPublishWizard',
        component: () => import('@/views/portfolio/indicator-publish-wizard.vue'),
        meta: {
          title: '规则发布向导',
          roles: ALL_ROLES,
          icon: 'rocket',
          hideInMenu: false,
          keepAlive: false,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'admin/indicator/history',
        name: 'PortfolioIndicatorHistory',
        component: () => import('@/views/portfolio/indicator-history.vue'),
        meta: {
          title: '规则快照历史',
          roles: ALL_ROLES,
          icon: 'history',
          hideInMenu: false,
          keepAlive: true,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'admin/indicator/ops',
        name: 'PortfolioIndicatorOps',
        component: () => import('@/views/portfolio/indicator-ops-admin.vue'),
        meta: {
          title: '计分与审计',
          roles: PORTFOLIO_ADMIN_ROLES,
          icon: 'audit',
          hideInMenu: false,
          keepAlive: true,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'admin/indicator-dashboard',
        name: 'PortfolioIndicatorDashboard',
        component: () => import('@/views/portfolio/indicator-dashboard-admin.vue'),
        meta: {
          title: '指标看板',
          roles: ALL_ROLES,
          icon: 'bar-chart',
          hideInMenu: false,
          keepAlive: true,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'admin/indicator/reference-status',
        name: 'PortfolioIndicatorReferenceStatus',
        component: () => import('@/views/portfolio/indicator-reference-status.vue'),
        meta: {
          title: '指标引用状态',
          roles: ALL_ROLES,
          icon: 'link',
          hideInMenu: false,
          keepAlive: true,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'teacher/indicator',
        name: 'PortfolioTeacherIndicator',
        component: () => import('@/views/portfolio/teacher-indicator.vue'),
        meta: {
          title: '资格评估',
          roles: ALL_ROLES,
          icon: 'safety-certificate',
          hideInMenu: false,
          keepAlive: true,
          ...indicatorMenuMeta,
        },
      },
      {
        path: 'teacher/dual-teacher-apply',
        name: 'PortfolioDualTeacherApply',
        component: () => import('@/views/portfolio/dual-teacher-apply.vue'),
        meta: {
          title: '双师认定申请',
          roles: ALL_ROLES,
          icon: 'form',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioTeacherMenuMeta,
        },
      },
      {
        path: 'admin/dual-teacher',
        name: 'PortfolioDualTeacherAdmin',
        component: () => import('@/views/portfolio/dual-teacher-admin.vue'),
        meta: {
          title: '双师认定',
          roles: PORTFOLIO_ADMIN_ROLES,
          icon: 'audit',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioDualTeacherMenuMeta,
        },
      },
      {
        path: 'admin/dual-teacher/analytics',
        name: 'PortfolioDualTeacherAnalytics',
        component: () => import('@/views/portfolio/dual-teacher-analytics.vue'),
        meta: {
          title: '双师分析',
          roles: PORTFOLIO_ADMIN_ROLES,
          icon: 'pie-chart',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioDualTeacherMenuMeta,
        },
      },
      {
        path: 'admin/external-teacher',
        name: 'PortfolioExternalTeacherAdmin',
        component: () => import('@/views/portfolio/external-teacher-admin.vue'),
        meta: {
          title: '外聘教师',
          roles: PORTFOLIO_ADMIN_ROLES,
          icon: 'team',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/development-plan',
        name: 'PortfolioDevelopmentPlanAdmin',
        component: () => import('@/views/portfolio/development-plan-admin.vue'),
        meta: {
          title: '年度规划',
          roles: ALL_ROLES,
          icon: 'calendar',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/development-plan-review',
        name: 'PortfolioDevelopmentPlanReview',
        component: () => import('@/views/portfolio/development-plan-review.vue'),
        meta: {
          title: '规划审核',
          roles: ALL_ROLES,
          requirePortfolioReviewer: true,
          icon: 'audit',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/teacher-report',
        name: 'PortfolioTeacherReportAdmin',
        component: () => import('@/views/portfolio/teacher-report-admin.vue'),
        meta: {
          title: '文本分析报告',
          roles: ALL_ROLES,
          icon: 'file-text',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/honor-library',
        name: 'PortfolioHonorLibraryAdmin',
        component: () => import('@/views/portfolio/honor-library-admin.vue'),
        meta: {
          title: '荣誉库',
          roles: ALL_ROLES,
          icon: 'trophy',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/key-teacher',
        name: 'PortfolioKeyTeacherAdmin',
        component: () => import('@/views/portfolio/key-teacher-admin.vue'),
        meta: {
          title: '骨干/带头人',
          roles: ALL_ROLES,
          icon: 'crown',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/teacher-salary',
        name: 'PortfolioTeacherSalaryAdmin',
        component: () => import('@/views/portfolio/teacher-salary-admin.vue'),
        meta: {
          title: '教师工资',
          roles: ALL_ROLES,
          icon: 'pay-circle',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/teacher-library',
        name: 'PortfolioTeacherLibraryAdmin',
        component: () => import('@/views/portfolio/teacher-library-admin.vue'),
        meta: {
          title: '图书借阅',
          roles: ALL_ROLES,
          icon: 'read',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/teacher-recommendation',
        name: 'PortfolioTeacherRecommendationAdmin',
        component: () => import('@/views/portfolio/teacher-recommendation-admin.vue'),
        meta: {
          title: '优秀教师推荐',
          roles: ALL_ROLES,
          icon: 'like',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/development-record',
        name: 'PortfolioDevelopmentRecordAdmin',
        component: () => import('@/views/portfolio/development-record-admin.vue'),
        meta: {
          title: '发展档案库',
          roles: ALL_ROLES,
          icon: 'database',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/achievement-comprehensive',
        name: 'PortfolioAchievementComprehensive',
        component: () => import('@/views/portfolio/achievement-comprehensive.vue'),
        meta: {
          title: '成果综合查询',
          roles: ALL_ROLES,
          icon: 'search',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/portrait-template',
        name: 'PortfolioPortraitTemplateAdmin',
        component: () => import('@/views/portfolio/portrait-template-admin.vue'),
        meta: {
          title: '画像设置',
          roles: ALL_ROLES,
          icon: 'layout',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioOrgMenuMeta,
        },
      },
      {
        path: 'admin/evaluation-task',
        name: 'PortfolioEvaluationTaskAdmin',
        component: () => import('@/views/portfolio/evaluation-task-admin.vue'),
        meta: {
          title: '多元评价',
          roles: PORTFOLIO_ADMIN_ROLES,
          icon: 'form',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioEvaluationMenuMeta,
        },
      },
      {
        path: 'admin/evaluation-fill',
        name: 'PortfolioEvaluationFillAdmin',
        component: () => import('@/views/portfolio/evaluation-fill-admin.vue'),
        meta: {
          title: '评价填报',
          roles: ALL_ROLES,
          icon: 'edit',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioEvaluationMenuMeta,
        },
      },
      {
        path: 'admin/training-archive',
        name: 'PortfolioTrainingArchiveAdmin',
        component: () => import('@/views/portfolio/training-archive-admin.vue'),
        meta: {
          title: '培训档案',
          roles: ALL_ROLES,
          icon: 'read',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'teacher/one-table',
        name: 'PortfolioTeacherOneTable',
        component: () => import('@/views/portfolio/teacher-one-table.vue'),
        meta: {
          title: '教师一张表',
          roles: ALL_ROLES,
          icon: 'table',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioTeacherMenuMeta,
        },
      },
    ],
  },
]
