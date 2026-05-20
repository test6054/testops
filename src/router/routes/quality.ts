/**
 * 教学质量评价（edu-quality）前端工作台路由
 *
 * 角色：教师 / 专业负责人 / 教务处质量办复用 SCH_TECH 角色；管理员复用 SUPER_ADMIN。
 *
 * 菜单分组（按业务主链 + 支撑配置）：
 *   ① 顶层配置（平台 / 教务处）：认证标准 / 算法模板 / 量表换算规则
 *   ② 专业评价配置（专业负责人）：评价口径 / 算法实例 / 校院工作组
 *   ③ 培养方案体系（综合工作台，4-in-1）：培养方案 + 培养目标 + 毕业要求 + 观测点 + 标准条款映射
 *   ④ 课程支撑矩阵（综合工作台，3-in-1）：质量评价课程 + 课程目标 + 课程支撑映射 + 考核环节 + 考核权重 + Rubric + 计算规则
 *   ⑤ 数据接入：成绩 Excel 导入 / 外部数据拔取 / 过程性评价 / 成绩明细 / 间接评价
 *   ⑥ 达成度评价：达成度结果与审核（含详情）
 *   ⑦ 持续改进与审核：改进任务 / 审核评估问题 / 整改台账 / 督导复查
 *   ⑧ AI 智能诊断：AI 任务中心 / 模型配置
 *   ⑨ 报告与归档：质量报告 / 材料归档与专家包
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]

export const qualityRoutes: RouteRecordRaw[] = [
  {
    path: '/quality',
    name: 'QualityLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/quality/dashboard',
    meta: {
      title: '教学质量评价',
      roles: ALL_ROLES,
      icon: 'reconciliation',
      hideInMenu: false,
    },
    children: [
      // ─── 工作台首页 ───────────────────────────────────────
      {
        path: 'dashboard',
        name: 'QualityDashboard',
        component: () => import('@/views/quality/dashboard.vue'),
        meta: {
          title: '评价工作台',
          roles: ALL_ROLES,
          icon: 'dashboard',
          hideInMenu: false,
        },
      },

      // ─── ① 顶层配置 ──────────────────────────────
      {
        path: 'accreditation-standard',
        name: 'QualityAccreditationStandard',
        component: () => import('@/views/quality/accreditation-standard.vue'),
        meta: {
          title: '认证标准',
          roles: [RoleEnum.SUPER_ADMIN, RoleEnum.SCH_TECH],
          icon: 'safety-certificate',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-platform',
          menuGroupTitle: '顶层配置',
          menuGroupIcon: 'cluster',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'profession-algorithm-template',
        name: 'QualityProfessionAlgorithmTemplate',
        component: () => import('@/views/quality/profession-algorithm-template.vue'),
        meta: {
          title: '专业算法模板',
          roles: [RoleEnum.SUPER_ADMIN, RoleEnum.SCH_TECH],
          icon: 'block',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-platform',
          menuGroupTitle: '顶层配置',
          menuGroupIcon: 'cluster',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'scale-conversion-rule',
        name: 'QualityScaleConversionRule',
        component: () => import('@/views/quality/scale-conversion-rule.vue'),
        meta: {
          title: '量表换算规则',
          roles: [RoleEnum.SUPER_ADMIN, RoleEnum.SCH_TECH],
          icon: 'function',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-platform',
          menuGroupTitle: '顶层配置',
          menuGroupIcon: 'cluster',
          menuGroupOrder: 1,
        },
      },

      // ─── ② 专业评价配置 ──────────────────────────
      {
        path: 'program-evaluation-profile',
        name: 'QualityProgramEvaluationProfile',
        component: () => import('@/views/quality/program-evaluation-profile.vue'),
        meta: {
          title: '专业评价口径',
          roles: ALL_ROLES,
          icon: 'profile',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-program',
          menuGroupTitle: '专业评价配置',
          menuGroupIcon: 'control',
          menuGroupOrder: 2,
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
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-program',
          menuGroupTitle: '专业评价配置',
          menuGroupIcon: 'control',
          menuGroupOrder: 2,
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
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-program',
          menuGroupTitle: '专业评价配置',
          menuGroupIcon: 'control',
          menuGroupOrder: 2,
        },
      },

      // ─── ③ 培养方案体系（4-in-1 综合工作台） ───────────
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
          menuGroup: 'quality-plan',
          menuGroupTitle: '培养方案体系',
          menuGroupIcon: 'database',
          menuGroupOrder: 3,
        },
      },

      // ─── ④ 课程支撑矩阵（3-in-1 综合工作台） ───────────
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
          menuGroup: 'quality-course-master',
          menuGroupTitle: '课程与考核',
          menuGroupIcon: 'book',
          menuGroupOrder: 4,
        },
      },

      // ─── ⑤ 数据接入 ───────────────────────────────
      {
        path: 'score-batch',
        name: 'QualityScoreBatch',
        component: () => import('@/views/quality/score-batch.vue'),
        meta: {
          title: '成绩 Excel 导入',
          roles: ALL_ROLES,
          icon: 'cloud-upload',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-ingest',
          menuGroupTitle: '数据接入',
          menuGroupIcon: 'inbox',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'score-record',
        name: 'QualityScoreRecord',
        component: () => import('@/views/quality/score-record.vue'),
        meta: {
          title: '成绩明细核对',
          roles: ALL_ROLES,
          icon: 'table',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-ingest',
          menuGroupTitle: '数据接入',
          menuGroupIcon: 'inbox',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'process-evaluation',
        name: 'QualityProcessEvaluation',
        component: () => import('@/views/quality/process-evaluation.vue'),
        meta: {
          title: '过程性评价',
          roles: ALL_ROLES,
          icon: 'history',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-ingest',
          menuGroupTitle: '数据接入',
          menuGroupIcon: 'inbox',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'indirect-evaluation',
        name: 'QualityIndirectEvaluation',
        component: () => import('@/views/quality/indirect-evaluation.vue'),
        meta: {
          title: '间接评价',
          roles: ALL_ROLES,
          icon: 'form',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-ingest',
          menuGroupTitle: '数据接入',
          menuGroupIcon: 'inbox',
          menuGroupOrder: 5,
        },
      },
      {
        path: 'external-pull',
        name: 'QualityExternalPull',
        component: () => import('@/views/quality/external-pull.vue'),
        meta: {
          title: '外部数据拔取',
          roles: ALL_ROLES,
          icon: 'api',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-ingest',
          menuGroupTitle: '数据接入',
          menuGroupIcon: 'inbox',
          menuGroupOrder: 5,
        },
      },

      // ─── ⑥ 达成度评价 ──────────────────────────────
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
          menuGroup: 'quality-achievement',
          menuGroupTitle: '达成度评价',
          menuGroupIcon: 'line-chart',
          menuGroupOrder: 6,
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
        },
      },

      // ─── ⑦ 持续改进与审核（4-in-1 综合工作台） ────────
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
          menuGroup: 'quality-improvement',
          menuGroupTitle: '持续改进与审核',
          menuGroupIcon: 'reload',
          menuGroupOrder: 7,
        },
      },

      // ─── ⑧ AI 智能诊断 ──────────────────────────────
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
          menuGroup: 'quality-ai',
          menuGroupTitle: 'AI 智能诊断',
          menuGroupIcon: 'experiment',
          menuGroupOrder: 8,
        },
      },
      {
        path: 'ai-model-profile',
        name: 'QualityAiModelProfile',
        component: () => import('@/views/quality/ai-model-profile.vue'),
        meta: {
          title: 'AI 模型配置',
          roles: [RoleEnum.SUPER_ADMIN, RoleEnum.SCH_TECH],
          icon: 'setting',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'quality-ai',
          menuGroupTitle: 'AI 智能诊断',
          menuGroupIcon: 'experiment',
          menuGroupOrder: 8,
        },
      },
      {
        path: 'ai-mask-mapping',
        name: 'QualityAiMaskMapping',
        component: () => import('@/views/quality/ai-mask-mapping.vue'),
        meta: {
          title: 'AI 脱敏映射审计',
          roles: [RoleEnum.SUPER_ADMIN, RoleEnum.SCH_TECH],
          icon: 'safety',
          hideInMenu: false,
          keepAlive: false,
          menuGroup: 'quality-ai',
          menuGroupTitle: 'AI 智能诊断',
          menuGroupIcon: 'experiment',
          menuGroupOrder: 8,
        },
      },

      // ─── ⑨ 报告与归档 ──────────────────────────────
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
          menuGroup: 'quality-report',
          menuGroupTitle: '报告与归档',
          menuGroupIcon: 'safety-certificate',
          menuGroupOrder: 9,
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
          menuGroup: 'quality-report',
          menuGroupTitle: '报告与归档',
          menuGroupIcon: 'safety-certificate',
          menuGroupOrder: 9,
        },
      },
    ],
  },
]
