/**
 * 教学质量评价（edu-quality）前端工作台路由
 *
 * 菜单分组（流程导向，5 组）：
 *   ① 工作台：dashboard / 工程认证驾驶舱 / 考核合理性审核
 *   ② 体系与矩阵：培养方案 / 课程矩阵
 *   ③ 数据与达成：数据接入 hub / 达成度
 *   ④ 改进与输出：改进闭环 / 报告 / 归档 / AI 任务
 *   ⑤ 平台管理：仅 SUPER_ADMIN（SaaS 租户级配置，展示在考试阅卷域）
 * 教师角色仅见 ①～④ 业务分组；SUPER_ADMIN 可见全部质量评价菜单 + 平台管理
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]
const SUPER_ADMIN_ROLES = [RoleEnum.SUPER_ADMIN]

const WORKBENCH_GROUP = {
  menuGroup: 'quality-workbench',
  menuGroupTitle: '工作台',
  menuGroupIcon: 'dashboard',
  menuGroupOrder: 1,
} as const

const SYSTEM_GROUP = {
  menuGroup: 'quality-system',
  menuGroupTitle: '体系与矩阵',
  menuGroupIcon: 'database',
  menuGroupOrder: 2,
} as const

const DATA_GROUP = {
  menuGroup: 'quality-data',
  menuGroupTitle: '数据与达成',
  menuGroupIcon: 'inbox',
  menuGroupOrder: 3,
} as const

const OUTPUT_GROUP = {
  menuGroup: 'quality-output',
  menuGroupTitle: '改进与输出',
  menuGroupIcon: 'file-text',
  menuGroupOrder: 4,
} as const

const ADMIN_GROUP = {
  menuGroup: 'quality-admin',
  menuGroupTitle: '平台管理',
  menuGroupIcon: 'setting',
  menuGroupOrder: 5,
} as const

const PORTFOLIO_GROUP = {
  menuGroup: 'quality-portfolio',
  menuGroupTitle: '教学档案袋',
  menuGroupIcon: 'folder',
  menuGroupOrder: 6,
} as const

export const qualityRoutes: RouteRecordRaw[] = [
  {
    path: '/quality',
    name: 'QualityLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/quality/dashboard',
    meta: {
      title: '质量评价',
      roles: ALL_ROLES,
      icon: 'reconciliation',
      hideInMenu: true,
      hideInBreadcrumb: true,
    },
    children: [
      {
        path: 'dashboard',
        name: 'QualityDashboard',
        component: () => import('@/views/quality/dashboard.vue'),
        meta: {
          title: '评价工作台',
          roles: ALL_ROLES,
          icon: 'dashboard',
          hideInMenu: false,
          keepAlive: true,
          ...WORKBENCH_GROUP,
        },
      },
      {
        path: 'accreditation-cockpit',
        name: 'QualityAccreditationCockpit',
        component: () => import('@/views/quality/accreditation-cockpit.vue'),
        meta: {
          title: '工程认证驾驶舱',
          roles: ALL_ROLES,
          icon: 'cluster',
          hideInMenu: false,
          keepAlive: true,
          ...WORKBENCH_GROUP,
        },
      },
      {
        path: 'rationality-audit',
        name: 'QualityRationalityAudit',
        component: () => import('@/views/quality/rationality-audit.vue'),
        meta: {
          title: '考核合理性审核',
          roles: ALL_ROLES,
          icon: 'audit',
          hideInMenu: false,
          keepAlive: true,
          ...WORKBENCH_GROUP,
        },
      },

      {
        path: 'training-plan-workbench',
        name: 'QualityTrainingPlanWorkbench',
        component: () => import('@/views/quality/training-plan-workbench.vue'),
        meta: {
          title: '培养方案体系工作台',
          roles: ALL_ROLES,
          icon: 'database',
          hideInMenu: false,
          keepAlive: true,
          ...SYSTEM_GROUP,
        },
      },
      {
        path: 'quality-course-matrix',
        name: 'QualityCourseMatrix',
        component: () => import('@/views/quality/quality-course-matrix.vue'),
        meta: {
          title: '课程支撑矩阵工作台',
          roles: ALL_ROLES,
          icon: 'book',
          hideInMenu: false,
          keepAlive: true,
          ...SYSTEM_GROUP,
        },
      },

      {
        path: 'ingest-hub',
        name: 'QualityIngestHub',
        component: () => import('@/views/quality/quality-ingest-hub-layout.vue'),
        redirect: '/quality/ingest-hub/score-batch',
        meta: {
          title: '数据接入',
          roles: ALL_ROLES,
          icon: 'cloud-upload',
          hideInMenu: false,
          keepAlive: true,
          ...DATA_GROUP,
        },
        children: [
          {
            path: 'score-batch',
            name: 'QualityIngestScoreBatch',
            component: () => import('@/views/quality/score-batch.vue'),
            meta: {
              title: '成绩 Excel 导入',
              roles: ALL_ROLES,
              hideInMenu: true,
              keepAlive: true,
              activeMenu: '/quality/ingest-hub',
            },
          },
          {
            path: 'score-record',
            name: 'QualityIngestScoreRecord',
            component: () => import('@/views/quality/score-record.vue'),
            meta: {
              title: '成绩明细核对',
              roles: ALL_ROLES,
              hideInMenu: true,
              keepAlive: true,
              activeMenu: '/quality/ingest-hub',
            },
          },
          {
            path: 'process-evaluation',
            name: 'QualityIngestProcessEvaluation',
            component: () => import('@/views/quality/process-evaluation.vue'),
            meta: {
              title: '过程性评价',
              roles: ALL_ROLES,
              hideInMenu: true,
              keepAlive: true,
              activeMenu: '/quality/ingest-hub',
            },
          },
          {
            path: 'indirect-evaluation',
            name: 'QualityIngestIndirectEvaluation',
            component: () => import('@/views/quality/indirect-evaluation.vue'),
            meta: {
              title: '间接评价',
              roles: ALL_ROLES,
              hideInMenu: true,
              keepAlive: true,
              activeMenu: '/quality/ingest-hub',
            },
          },
          {
            path: 'external-pull',
            name: 'QualityIngestExternalPull',
            component: () => import('@/views/quality/external-pull.vue'),
            meta: {
              title: '外部数据拔取',
              roles: ALL_ROLES,
              hideInMenu: true,
              keepAlive: true,
              activeMenu: '/quality/ingest-hub',
            },
          },
        ],
      },
      {
        path: 'achievement',
        name: 'QualityAchievement',
        component: () => import('@/views/quality/achievement.vue'),
        meta: {
          title: '达成度结果与审核',
          roles: ALL_ROLES,
          icon: 'trophy',
          hideInMenu: false,
          keepAlive: true,
          requiresPlanConfirmed: true,
          ...DATA_GROUP,
        },
      },
      {
        path: 'achievement/:resultId',
        name: 'QualityAchievementDetail',
        component: () => import('@/views/quality/achievement-detail.vue'),
        meta: {
          title: '达成度详情',
          roles: ALL_ROLES,
          icon: 'eye',
          hideInMenu: true,
          noCache: true,
          requiresPlanConfirmed: true,
          activeMenu: '/quality/achievement',
        },
      },

      {
        path: 'improvement-workbench',
        name: 'QualityImprovementWorkbench',
        component: () => import('@/views/quality/improvement-workbench.vue'),
        meta: {
          title: '持续改进与审核闭环',
          roles: ALL_ROLES,
          icon: 'reload',
          hideInMenu: false,
          keepAlive: true,
          ...OUTPUT_GROUP,
        },
      },
      {
        path: 'report',
        name: 'QualityReport',
        component: () => import('@/views/quality/report.vue'),
        meta: {
          title: '质量评价报告',
          roles: ALL_ROLES,
          icon: 'file-text',
          hideInMenu: false,
          keepAlive: true,
          requiresPlanConfirmed: true,
          ...OUTPUT_GROUP,
        },
      },
      {
        path: 'archive',
        name: 'QualityArchive',
        component: () => import('@/views/quality/archive.vue'),
        meta: {
          title: '材料归档与专家包',
          roles: ALL_ROLES,
          icon: 'inbox',
          hideInMenu: false,
          keepAlive: true,
          ...OUTPUT_GROUP,
        },
      },
      {
        path: 'ai-task',
        name: 'QualityAiTask',
        component: () => import('@/views/quality/ai-task.vue'),
        meta: {
          title: 'AI 任务中心',
          roles: ALL_ROLES,
          icon: 'robot',
          hideInMenu: false,
          keepAlive: true,
          ...OUTPUT_GROUP,
        },
      },

      {
        path: 'accreditation-standard',
        name: 'QualityAccreditationStandard',
        component: () => import('@/views/quality/accreditation-standard.vue'),
        meta: {
          title: '认证标准',
          roles: SUPER_ADMIN_ROLES,
          icon: 'safety-certificate',
          hideInMenu: false,
          keepAlive: true,
          ...ADMIN_GROUP,
        },
      },
      {
        path: 'profession-algorithm-template',
        name: 'QualityProfessionAlgorithmTemplate',
        component: () => import('@/views/quality/profession-algorithm-template.vue'),
        meta: {
          title: '专业算法模板',
          roles: SUPER_ADMIN_ROLES,
          icon: 'block',
          hideInMenu: false,
          keepAlive: true,
          ...ADMIN_GROUP,
        },
      },
      {
        path: 'scale-conversion-rule',
        name: 'QualityScaleConversionRule',
        component: () => import('@/views/quality/scale-conversion-rule.vue'),
        meta: {
          title: '量表换算规则',
          roles: SUPER_ADMIN_ROLES,
          icon: 'function',
          hideInMenu: false,
          keepAlive: true,
          ...ADMIN_GROUP,
        },
      },
      {
        path: 'ai-model-profile',
        name: 'QualityAiModelProfile',
        component: () => import('@/views/quality/ai-model-profile.vue'),
        meta: {
          title: 'AI 模型配置',
          roles: SUPER_ADMIN_ROLES,
          icon: 'setting',
          hideInMenu: false,
          keepAlive: true,
          ...ADMIN_GROUP,
        },
      },
      {
        path: 'ai-mask-mapping',
        name: 'QualityAiMaskMapping',
        component: () => import('@/views/quality/ai-mask-mapping.vue'),
        meta: {
          title: 'AI 脱敏映射审计',
          roles: SUPER_ADMIN_ROLES,
          icon: 'safety',
          hideInMenu: false,
          keepAlive: false,
          ...ADMIN_GROUP,
        },
      },

      // ─── 隐藏路由：cockpit / dashboard deep link，保留 bookmark ───
      {
        path: 'program-evaluation-profile',
        name: 'QualityProgramEvaluationProfile',
        component: () => import('@/views/quality/program-evaluation-profile.vue'),
        meta: {
          title: '专业评价口径',
          roles: ALL_ROLES,
          icon: 'profile',
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/quality/accreditation-cockpit',
        },
      },
      {
        path: 'profession-algorithm-profile',
        name: 'QualityProfessionAlgorithmProfile',
        component: () => import('@/views/quality/profession-algorithm-profile.vue'),
        meta: {
          title: '专业算法实例',
          roles: ALL_ROLES,
          icon: 'experiment',
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/quality/accreditation-cockpit',
        },
      },
      {
        path: 'evaluation-workgroup',
        name: 'QualityEvaluationWorkgroup',
        component: () => import('@/views/quality/evaluation-workgroup.vue'),
        meta: {
          title: '校院两级评价工作组',
          roles: ALL_ROLES,
          icon: 'team',
          hideInMenu: true,
          keepAlive: true,
          activeMenu: '/quality/accreditation-cockpit',
        },
      },

      {
        path: 'portfolio/org',
        name: 'QualityPortfolioOrg',
        component: () => import('@/views/portfolio/org-admin.vue'),
        meta: {
          title: '档案袋组织',
          roles: ALL_ROLES,
          icon: 'apartment',
          hideInMenu: false,
          keepAlive: true,
          ...PORTFOLIO_GROUP,
        },
      },
      {
        path: 'portfolio/teachers',
        name: 'QualityPortfolioTeachers',
        component: () => import('@/views/portfolio/teacher-directory.vue'),
        meta: {
          title: '档案袋教师名册',
          roles: ALL_ROLES,
          icon: 'team',
          hideInMenu: false,
          keepAlive: true,
          ...PORTFOLIO_GROUP,
        },
      },

      // ─── 数据接入子页：redirect 至 hub ───
      {
        path: 'score-batch',
        redirect: '/quality/ingest-hub/score-batch',
      },
      {
        path: 'score-record',
        redirect: '/quality/ingest-hub/score-record',
      },
      {
        path: 'process-evaluation',
        redirect: '/quality/ingest-hub/process-evaluation',
      },
      {
        path: 'indirect-evaluation',
        redirect: '/quality/ingest-hub/indirect-evaluation',
      },
      {
        path: 'external-pull',
        redirect: '/quality/ingest-hub/external-pull',
      },
    ],
  },
]
