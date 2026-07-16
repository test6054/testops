/**
 * 教学质量评价（edu-quality）前端工作台路由
 *
 * 上下文：子 shell quality-workspace-layout + meta.scopeProfile / qualityGate
 * 教学档案袋见 portfolio.ts（/portfolio）
 */
import type { RouteRecordRaw } from 'vue-router'
import type { QualityGate, QualityScopeProfile } from '@/constants/quality-scope-profile'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH]
const ALL_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]
const SUPER_ADMIN_ROLES = [RoleEnum.SUPER_ADMIN]

interface QualityScopeMeta {
  scopeProfile: QualityScopeProfile
}

interface QualityGateMeta {
  qualityGate: QualityGate
}

interface QualityMenuGroupMeta {
  menuGroup: string
  menuGroupTitle: string
  menuGroupIcon: string
  menuGroupOrder: number
}

const SCOPE_NONE: QualityScopeMeta = { scopeProfile: 'none' }
const SCOPE_PLAN: QualityScopeMeta = { scopeProfile: 'plan' }
const SCOPE_PLAN_PERIOD: QualityScopeMeta = { scopeProfile: 'plan-period' }
const SCOPE_PLAN_COURSE: QualityScopeMeta = { scopeProfile: 'plan-course' }
const SCOPE_ACCREDITATION: QualityScopeMeta = { scopeProfile: 'accreditation' }
const GATE_PLAN_CONFIRMED: QualityGateMeta = { qualityGate: 'plan-confirmed' }

const WORKBENCH_GROUP: QualityMenuGroupMeta = {
  menuGroup: 'quality-workbench',
  menuGroupTitle: '工作台',
  menuGroupIcon: 'dashboard',
  menuGroupOrder: 1,
}

const SYSTEM_GROUP: QualityMenuGroupMeta = {
  menuGroup: 'quality-system',
  menuGroupTitle: '体系与矩阵',
  menuGroupIcon: 'database',
  menuGroupOrder: 2,
}

const DATA_GROUP: QualityMenuGroupMeta = {
  menuGroup: 'quality-data',
  menuGroupTitle: '数据与达成',
  menuGroupIcon: 'inbox',
  menuGroupOrder: 3,
}

const OUTPUT_GROUP: QualityMenuGroupMeta = {
  menuGroup: 'quality-output',
  menuGroupTitle: '改进与输出',
  menuGroupIcon: 'file-text',
  menuGroupOrder: 4,
}

const ADMIN_GROUP: QualityMenuGroupMeta = {
  menuGroup: 'quality-admin',
  menuGroupTitle: '系统管理',
  menuGroupIcon: 'setting',
  menuGroupOrder: 5,
}

const qualityWorkspaceChildren: RouteRecordRaw[] = [
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
      ...SCOPE_PLAN_PERIOD,
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
      ...SCOPE_ACCREDITATION,
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
      menuTier: 'secondary',
      keepAlive: true,
      ...SCOPE_PLAN_PERIOD,
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
      ...SCOPE_NONE,
      ...SYSTEM_GROUP,
    },
  },
  {
    path: 'training-plan-review',
    name: 'QualityTrainingPlanReviewQueue',
    component: () => import('@/views/quality/training-plan-review-queue.vue'),
    meta: {
      title: '培养方案院审',
      roles: ALL_ROLES,
      icon: 'audit',
      hideInMenu: false,
      menuTier: 'secondary',
      keepAlive: true,
      ...SCOPE_NONE,
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
      ...SCOPE_PLAN,
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
      ...SCOPE_PLAN_PERIOD,
      ...GATE_PLAN_CONFIRMED,
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
          ...SCOPE_PLAN_COURSE,
          ...GATE_PLAN_CONFIRMED,
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
          ...SCOPE_PLAN_COURSE,
          ...GATE_PLAN_CONFIRMED,
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
          ...SCOPE_PLAN_COURSE,
          ...GATE_PLAN_CONFIRMED,
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
          ...SCOPE_PLAN_COURSE,
          ...GATE_PLAN_CONFIRMED,
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
          ...SCOPE_PLAN_COURSE,
          ...GATE_PLAN_CONFIRMED,
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
      ...SCOPE_PLAN_PERIOD,
      ...GATE_PLAN_CONFIRMED,
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
      activeMenu: '/quality/achievement',
      ...SCOPE_PLAN_PERIOD,
      ...GATE_PLAN_CONFIRMED,
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
      ...SCOPE_PLAN,
      ...GATE_PLAN_CONFIRMED,
      ...OUTPUT_GROUP,
    },
  },
  {
    path: 'improvement-tasks/:improvementTaskId',
    redirect: (to) => ({
      name: 'QualityImprovementWorkbench',
      query: {
        improvementTaskId: String(to.params.improvementTaskId ?? ''),
      },
    }),
    meta: {
      hideInMenu: true,
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
      ...SCOPE_PLAN_PERIOD,
      ...GATE_PLAN_CONFIRMED,
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
      menuTier: 'secondary',
      keepAlive: true,
      ...SCOPE_ACCREDITATION,
      ...OUTPUT_GROUP,
    },
  },
  {
    path: 'archive-destruction-ledger',
    name: 'QualityArchiveDestructionLedger',
    component: () => import('@/views/quality/archive-destruction-ledger.vue'),
    meta: {
      title: '销毁清册',
      roles: ALL_ROLES,
      icon: 'file-excel',
      hideInMenu: false,
      menuTier: 'secondary',
      keepAlive: true,
      ...SCOPE_ACCREDITATION,
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
      menuTier: 'secondary',
      keepAlive: true,
      ...SCOPE_PLAN_PERIOD,
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
      ...SCOPE_NONE,
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
      menuTier: 'secondary',
      keepAlive: true,
      ...SCOPE_NONE,
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
      menuTier: 'secondary',
      keepAlive: true,
      ...SCOPE_NONE,
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
      ...SCOPE_NONE,
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
      menuTier: 'secondary',
      keepAlive: false,
      ...SCOPE_NONE,
      ...ADMIN_GROUP,
    },
  },

  {
    path: 'help/indirect-weighted-attainment',
    name: 'QualityHelpIndirectWeightedAttainment',
    component: () => import('@/views/quality/help/indirect-weighted-attainment.vue'),
    meta: {
      title: '间接达成度题项加权说明',
      roles: ALL_ROLES,
      hideInMenu: true,
      keepAlive: false,
      activeMenu: '/quality/ingest-hub/indirect-evaluation',
      ...SCOPE_NONE,
    },
  },

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
      ...SCOPE_ACCREDITATION,
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
      ...SCOPE_ACCREDITATION,
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
      ...SCOPE_ACCREDITATION,
    },
  },
]

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
        path: '',
        component: () => import('@/views/quality/quality-workspace-layout.vue'),
        meta: {
          hideInMenu: true,
        },
        children: qualityWorkspaceChildren,
      },
    ],
  },
]

/** 契约校验：所有叶子路由必须声明 scopeProfile */
export function listQualityLeafRouteMetas(): Array<{ name?: string, meta: RouteRecordRaw['meta'] }> {
  const leaves: Array<{ name?: string, meta: RouteRecordRaw['meta'] }> = []
  function walk(routes: RouteRecordRaw[]): void {
    for (const route of routes) {
      if (route.children?.length) {
        walk(route.children)
      }
      else if (route.component && route.meta) {
        leaves.push({
          name: typeof route.name === 'string' ? route.name : undefined,
          meta: route.meta,
        })
      }
    }
  }
  walk(qualityWorkspaceChildren)
  return leaves
}
