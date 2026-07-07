/**
 * 教学档案袋（edu-quality 标准包）前端路由
 * 与质量评价 /quality 平级，独立 Layout 域；API 前缀 /api/portfolio/*
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'
import { PORTFOLIO_ROUTE_PREFIX } from '@/utils/portfolio-route'

const TEACHER_ROLES = [RoleEnum.SCH_TECH]
const ALL_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]

/** 档案袋组织管理：超管或 edu-user 判定的租户管理员 */
const PORTFOLIO_ADMIN_ROUTE_META = {
  roles: [RoleEnum.SUPER_ADMIN, RoleEnum.SCH_TECH],
  requireTenantAdmin: true,
}

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

const PORTFOLIO_ANALYTICS_MENU_GROUP = 'portfolio-analytics'
const portfolioAnalyticsMenuMeta = {
  menuGroup: PORTFOLIO_ANALYTICS_MENU_GROUP,
  menuGroupTitle: '师资分析',
  menuGroupIcon: 'bar-chart',
  menuGroupOrder: 7,
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
        path: 'teacher/onboarding',
        name: 'PortfolioTeacherOnboarding',
        component: () => import('@/views/portfolio/teacher-onboarding.vue'),
        meta: {
          title: '认识档案',
          roles: ALL_ROLES,
          hideInMenu: true,
          keepAlive: false,
        },
      },
      {
        path: 'teacher/intake',
        name: 'PortfolioTeacherIntake',
        component: () => import('@/views/portfolio/teacher-intake.vue'),
        meta: {
          title: '材料采集',
          roles: ALL_ROLES,
          icon: 'cloud-upload',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioTeacherMenuMeta,
        },
      },
      {
        path: 'teacher/review-status',
        name: 'PortfolioTeacherReviewStatus',
        component: () => import('@/views/portfolio/teacher-review-status.vue'),
        meta: {
          title: '审核进度',
          roles: ALL_ROLES,
          icon: 'audit',
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
        path: 'teacher/evaluation',
        name: 'PortfolioTeacherEvaluation',
        component: () => import('@/views/portfolio/teacher-evaluation.vue'),
        meta: {
          title: '我的评价',
          roles: ALL_ROLES,
          icon: 'form',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioTeacherMenuMeta,
        },
      },
      {
        path: 'teacher/materials',
        redirect: to => ({
          path: '/portfolio/teacher/intake',
          query: to.query,
        }),
      },
      {
        path: 'teacher/materials-legacy',
        name: 'PortfolioTeacherMaterials',
        component: () => import('@/views/portfolio/teacher-materials.vue'),
        meta: {
          title: '材料库',
          roles: ALL_ROLES,
          hideInMenu: true,
          keepAlive: false,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'team',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioOrgMenuMeta,
        },
      },
      {
        path: 'ai-candidate-confirm',
        redirect: to => {
          const query = { ...to.query }
          if (typeof query.taskId === 'string') {
            return { path: '/portfolio/teacher/intake', query }
          }
          return { path: '/portfolio/teacher/intake', query }
        },
      },
      {
        path: 'ai-candidate-confirm-legacy',
        name: 'PortfolioAiCandidateConfirm',
        component: () => import('@/views/portfolio/ai-candidate-confirm.vue'),
        meta: {
          title: 'AI 候选字段确认',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          hideInMenu: true,
          keepAlive: false,
        },
      },
      {
        path: 'ai-orchestration',
        name: 'PortfolioAiOrchestration',
        component: () => import('@/views/portfolio/ai-orchestration.vue'),
        meta: {
          title: 'AI 问数与政策核验',
          roles: ALL_ROLES,
          icon: 'message',
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
          requirePortfolioReviewer: true,
          icon: 'audit',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioOrgMenuMeta,
        },
      },
      {
        path: 'department/gap',
        name: 'PortfolioDepartmentGap',
        component: () => import('@/views/portfolio/department-gap.vue'),
        meta: {
          title: '补采督办',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          requirePortfolioReviewer: true,
          icon: 'alert',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioOrgMenuMeta,
        },
      },
      {
        path: 'department/objection',
        name: 'PortfolioDepartmentObjection',
        component: () => import('@/views/portfolio/department-objection.vue'),
        meta: {
          title: '公示异议',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          requirePortfolioReviewer: true,
          icon: 'message',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioEvaluationMenuMeta,
        },
      },
      {
        path: 'school/evaluation',
        name: 'PortfolioSchoolEvaluation',
        component: () => import('@/views/portfolio/school-evaluation.vue'),
        meta: {
          title: '学校评价',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'audit',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioEvaluationMenuMeta,
        },
      },
      {
        path: 'admin/correction',
        name: 'PortfolioCorrectionAdmin',
        component: () => import('@/views/portfolio/correction-admin.vue'),
        meta: {
          title: '纠错处理',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'exception',
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          title: '教师年度规划',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'calendar',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/development-plan-department',
        name: 'PortfolioDevelopmentPlanDepartmentAdmin',
        component: () => import('@/views/portfolio/development-plan-department-admin.vue'),
        meta: {
          title: '部门年度规划',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          requirePortfolioReviewer: true,
          icon: 'cluster',
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'crown',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/double-duty',
        name: 'PortfolioDoubleDutyAdmin',
        component: () => import('@/views/portfolio/double-duty-admin.vue'),
        meta: {
          title: '双肩挑台账',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'swap',
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'edit',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioEvaluationMenuMeta,
        },
      },
      {
        path: 'admin/evaluation-comprehensive',
        name: 'PortfolioEvaluationComprehensiveAdmin',
        component: () => import('@/views/portfolio/evaluation-comprehensive-admin.vue'),
        meta: {
          title: '评价综合分析',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'bar-chart',
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
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'read',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/dept-one-table',
        name: 'PortfolioDeptOneTable',
        component: () => import('@/views/portfolio/dept-one-table.vue'),
        meta: {
          title: '部门一张表',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'table',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioOrgMenuMeta,
        },
      },
      {
        path: 'admin/teacher-analytics',
        name: 'PortfolioTeacherAnalyticsDashboard',
        component: () => import('@/views/portfolio/teacher-analytics-dashboard.vue'),
        meta: {
          title: '师资分析看板',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'dashboard',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioAnalyticsMenuMeta,
        },
      },
      {
        path: 'department/cockpit',
        name: 'PortfolioDepartmentCockpit',
        component: () => import('@/views/portfolio/department-cockpit.vue'),
        meta: {
          title: '院系驾驶舱',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          requirePortfolioReviewer: true,
          icon: 'dashboard',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioAnalyticsMenuMeta,
        },
      },
      {
        path: 'school/cockpit',
        name: 'PortfolioSchoolCockpit',
        component: () => import('@/views/portfolio/school-cockpit.vue'),
        meta: {
          title: '学校驾驶舱',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'dashboard',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioAnalyticsMenuMeta,
        },
      },
      {
        path: 'admin/evaluation-workgroup',
        name: 'PortfolioEvaluationWorkgroupNav',
        component: () => import('@/views/portfolio/evaluation-workgroup-admin.vue'),
        meta: {
          title: '评价工作组',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'team',
          hideInMenu: false,
          keepAlive: true,
          portfolioDomain: true,
          ...portfolioEvaluationMenuMeta,
        },
      },
      {
        path: 'admin/teaching-resource-library',
        name: 'PortfolioTeachingResourceLibrary',
        component: () => import('@/views/portfolio/teaching-resource-library-admin.vue'),
        meta: {
          title: '教学资源库',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'read',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/research-resource-library',
        name: 'PortfolioResearchResourceLibrary',
        component: () => import('@/views/portfolio/research-resource-library-admin.vue'),
        meta: {
          title: '科研资源库',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'experiment',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/practice-resource-library',
        name: 'PortfolioPracticeResourceLibrary',
        component: () => import('@/views/portfolio/practice-resource-library-admin.vue'),
        meta: {
          title: '实践资源库',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'tool',
          hideInMenu: false,
          keepAlive: true,
          ...portfolioResourceMenuMeta,
        },
      },
      {
        path: 'admin/national-achievement',
        name: 'PortfolioNationalAchievement',
        component: () => import('@/views/portfolio/national-achievement-admin.vue'),
        meta: {
          title: '国家级成果',
          ...PORTFOLIO_ADMIN_ROUTE_META,
          icon: 'crown',
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
