/**
 * 阅卷端路由预加载策略
 *
 * 设计目标：
 *   - 在用户进入某个页面后（router.afterEach），把「业务上最可能下一步去」的相邻路由
 *     chunk 预先 import()，下次切换时 0 网络等待。
 *   - 角色登录后预加载该角色的默认工作台 + 通用页面，覆盖最常见的首屏跳转。
 *
 * 邻接关系来源（不是猜测）：
 *   1. 路由文件中的 `menuGroup`：同组路由是同一工作流内的相邻菜单项，用户在该流程中
 *      会反复切换。
 *   2. 业务主链顺序：考试管理 → 制卷 → 扫描 → 批阅 → 成绩 → 归档；学生：成绩 → 详情 →
 *      复核；质量评价：配置 → 数据接入 → 达成度 → 改进 → 报告。
 *   3. 列表 ↔ 详情：所有 `:id/detail` 类路由都和其入口列表互相邻接。
 *   4. 跨工作台跳转：阅卷概览 → 扫描监控中控台 / 进度看板 / 阅卷任务池等高频入口。
 *
 * 行业参考：
 *   - egoist/vue-router-prefetch：视口可见即预加载链接 chunk
 *   - Quicklink / Next.js Link prefetch：requestIdleCallback + import() 调度
 *   - 我们采用的是 router.afterEach 邻接预加载，比视口预加载更精准：进入某页
 *     必然意味着工作流上下文已确定，邻接概率远高于视口可见。
 *
 * 失败容忍：
 *   - 任意 chunk 加载失败仅打 warn 日志；用户真正导航时仍会触发 router.onError，
 *     由全局弹窗引导刷新（src/router/index.ts）。
 *
 * 触发与清理：
 *   - guard.ts 的 router.afterEach：登录态下调 `preloadByRole(role)` 预热首页邻居
 *   - 内置 router.afterEach：每次成功导航后预加载当前页邻居
 *   - storage 监听到登出 → `clearPreloadCache()`
 */

import type { Router } from 'vue-router'
import { hasRouteNamePermission } from '@/router/permission'
import { useAuthStore, useUserStore } from '@/stores'
import { RoleEnum } from '@/utils/permission'

// ============================================================================
//  路由名 → 懒加载组件映射
// ============================================================================
//
// 这里维护的是 RouteRecord.name → 组件 import() 函数。所有真实路由都覆盖。
// 路由配置文件 (router/routes/*.ts) 中新增路由时，按角色把名字加到这里 +
// 关系图 ROUTE_NEIGHBORS。lint 不强制校验，但 vite build 会因 import 失败暴露遗漏。

const ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
  // ── 公共 ─────────────────────────────────────────
  UserProfile: () => import('@/views/user/profile/index.vue'),
  UserMessage: () => import('@/views/user/message/index.vue'),
  ExamExportTasks: () => import('@/views/common/exam-export-tasks.vue'),

  // ── 学生 ─────────────────────────────────────────
  StudentScore: () => import('@/views/student/score.vue'),
  StudentExamHistory: () => import('@/views/student/exam-history.vue'),
  StudentAppeal: () => import('@/views/student/appeal.vue'),
  StudentScoreDetail: () => import('@/views/student/score-detail.vue'),

  // ── 教师 ① 考试列表 + 工作台 ────────────────────────
  TeacherExamList: () => import('@/views/teacher/exam-list.vue'),
  TeacherExamWorkspace: () => import('@/views/teacher/exam-workspace-layout.vue'),
  TeacherExamWorkspaceOverview: () => import('@/views/teacher/exam-detail.vue'),
  TeacherExamWorkspacePrep: () => import('@/views/teacher/exam-prep-workbench.vue'),
  TeacherExamWorkspacePaperTemplate: () => import('@/views/teacher/paper-template.vue'),
  TeacherExamWorkspaceAnswerSheet: () => import('@/views/teacher/answer-sheet-template.vue'),
  TeacherExamWorkspacePaperMaster: () => import('@/views/teacher/paper-master.vue'),
  TeacherExamWorkspaceCandidateRoster: () => import('@/views/teacher/candidate-roster.vue'),
  TeacherExamWorkspacePrintPackage: () => import('@/views/teacher/print-package.vue'),
  TeacherExamWorkspaceScanBatches: () => import('@/views/teacher/scan-upload.vue'),
  TeacherExamWorkspaceScanMonitor: () => import('@/views/teacher/scan-live-monitor.vue'),
  TeacherExamWorkspaceScanLedger: () => import('@/views/teacher/image-ledger.vue'),
  TeacherExamWorkspaceScanDevices: () => import('@/views/teacher/printer-management.vue'),
  TeacherExamWorkspaceScanOcr: () => import('@/views/teacher/ocr-settings.vue'),
  TeacherExamWorkspaceMarkingOrg: () => import('@/views/admin/marking-organization/index.vue'),
  TeacherExamWorkspaceMarkingOrgDetail: () => import('@/views/admin/marking-organization/detail.vue'),
  TeacherExamWorkspaceMarkingOrgSessions: () => import('@/views/admin/marking-organization/sessions.vue'),
  TeacherExamWorkspaceReviewAssignment: () => import('@/views/teacher/review-assignment.vue'),
  TeacherExamWorkspaceTrialTaskPool: () => import('@/views/teacher/marking-task-pool.vue'),
  TeacherExamWorkspaceTrialProgress: () => import('@/views/teacher/review-progress.vue'),
  TeacherExamWorkspaceMarkingTaskPool: () => import('@/views/teacher/marking-task-pool.vue'),
  TeacherExamWorkspaceMarkingProgress: () => import('@/views/teacher/review-progress.vue'),
  TeacherExamWorkspaceMarkingArbitration: () => import('@/views/teacher/review-arbitration.vue'),
  TeacherExamWorkspaceMarkingQuality: () => import('@/views/teacher/marking-spot-check.vue'),
  TeacherExamWorkspaceMarkingReview: () => import('@/views/teacher/review-workspace.vue'),
  TeacherExamWorkspaceReviewWorkspace: () => import('@/views/teacher/review-workspace.vue'),
  TeacherExamWorkspaceReviewTaskDetail: () => import('@/views/teacher/review-task-detail.vue'),
  TeacherExamWorkspaceMarkingTaskDetail: () => import('@/views/teacher/marking-task-detail.vue'),
  TeacherExamWorkspaceScoreSummary: () => import('@/views/teacher/score-finalize.vue'),
  TeacherExamWorkspaceScoreRelease: () => import('@/views/teacher/score-publish.vue'),
  TeacherExamWorkspaceScoreAbsence: () => import('@/views/teacher/absence-confirm.vue'),
  TeacherExamWorkspaceScoreAppeal: () => import('@/views/teacher/appeal-handle.vue'),
  TeacherExamWorkspaceArchivePackage: () => import('@/views/teacher/archive/archive-list.vue'),
  TeacherExamWorkspaceArchiveStatistics: () => import('@/views/teacher/statistics.vue'),
  TeacherExamWorkspaceArchiveExports: () => import('@/views/common/exam-export-tasks.vue'),

  // ── 教师 ④ 历史归档详情 ───────────────────────────
  TeacherArchiveDetail: () => import('@/views/teacher/archive/archive-detail.vue'),
  TeacherPaperArchiveList: () => import('@/views/teacher/paper-archive/paper-archive-list.vue'),
  TeacherPaperArchiveDetail: () => import('@/views/teacher/paper-archive/paper-archive-detail.vue'),
  TeacherArchiveVolumeSearch: () => import('@/views/teacher/archive-volume-search.vue'),
  TeacherArchiveSupervisionInspect: () => import('@/views/teacher/archive-supervision-inspect.vue'),

  // ── 管理员 ───────────────────────────────────────
  TeacherMarkingOverview: () => import('@/views/teacher/marking-overview.vue'),
  AdminAuditTrail: () => import('@/views/admin/audit-trail.vue'),
  AdminMarkingQuality: () => import('@/views/admin/marking-quality-dashboard.vue'),
  AdminCrossExamDashboard: () => import('@/views/admin/cross-exam-dashboard.vue'),
  AdminSchoolQualityDashboard: () => import('@/views/admin/school-quality-dashboard.vue'),
  TeacherMarkingOrganizationIndex: () => import('@/views/admin/marking-organization/index.vue'),
  TeacherMarkingOrganizationDetail: () => import('@/views/admin/marking-organization/detail.vue'),
  TeacherMarkingOrganizationSessions: () => import('@/views/admin/marking-organization/sessions.vue'),
  AdminExamExports: () => import('@/views/common/exam-export-tasks.vue'),
  AdminTeachingAffairsSync: () => import('@/views/admin/teaching-affairs-sync.vue'),

  // ── 教学质量评价（quality 模块） ─────────────────
  QualityDashboard: () => import('@/views/quality/dashboard.vue'),
  QualityAccreditationCockpit: () => import('@/views/quality/accreditation-cockpit.vue'),
  QualityAccreditationStandard: () => import('@/views/quality/accreditation-standard.vue'),
  QualityProfessionAlgorithmTemplate: () => import('@/views/quality/profession-algorithm-template.vue'),
  QualityScaleConversionRule: () => import('@/views/quality/scale-conversion-rule.vue'),
  QualityProgramEvaluationProfile: () => import('@/views/quality/program-evaluation-profile.vue'),
  QualityProfessionAlgorithmProfile: () => import('@/views/quality/profession-algorithm-profile.vue'),
  QualityEvaluationWorkgroup: () => import('@/views/quality/evaluation-workgroup.vue'),
  QualityTrainingPlanWorkbench: () => import('@/views/quality/training-plan-workbench.vue'),
  QualityCourseMatrix: () => import('@/views/quality/quality-course-matrix.vue'),
  QualityScoreBatch: () => import('@/views/quality/score-batch.vue'),
  QualityScoreRecord: () => import('@/views/quality/score-record.vue'),
  QualityProcessEvaluation: () => import('@/views/quality/process-evaluation.vue'),
  QualityIndirectEvaluation: () => import('@/views/quality/indirect-evaluation.vue'),
  QualityExternalPull: () => import('@/views/quality/external-pull.vue'),
  QualityAchievement: () => import('@/views/quality/achievement.vue'),
  QualityAchievementDetail: () => import('@/views/quality/achievement-detail.vue'),
  QualityImprovementWorkbench: () => import('@/views/quality/improvement-workbench.vue'),
  QualityAiTask: () => import('@/views/quality/ai-task.vue'),
  QualityAiModelProfile: () => import('@/views/quality/ai-model-profile.vue'),
  QualityAiMaskMapping: () => import('@/views/quality/ai-mask-mapping.vue'),
  QualityReport: () => import('@/views/quality/report.vue'),
  QualityArchive: () => import('@/views/quality/archive.vue'),

  // ── 教学档案袋（portfolio 模块，/portfolio 独立域） ──
  PortfolioOrgAdmin: () => import('@/views/portfolio/org-admin.vue'),
  PortfolioTemplateAdmin: () => import('@/views/portfolio/template-admin.vue'),
  PortfolioTeacherDirectory: () => import('@/views/portfolio/teacher-directory.vue'),
  PortfolioAiCandidateConfirm: () => import('@/views/portfolio/ai-candidate-confirm.vue'),
  PortfolioDepartmentReview: () => import('@/views/portfolio/department-review.vue'),
}

// ============================================================================
//  角色登录后初始预加载列表（默认工作台 + 通用页 + 1~2 个高频入口）
// ============================================================================

const ROLE_INITIAL_PRELOAD: Record<string, string[]> = {
  [RoleEnum.SCH_STU]: ['StudentScore', 'StudentExamHistory', 'UserMessage', 'UserProfile'],
  [RoleEnum.SCH_TECH]: [
    'TeacherMarkingOverview',
    'TeacherExamList',
    'TeacherExamWorkspaceScanMonitor',
    'TeacherExamWorkspaceMarkingProgress',
    'UserMessage',
    'UserProfile',
  ],
  [RoleEnum.CROP_ADMIN]: [
    'TeacherMarkingOverview',
    'TeacherExamList',
    'TeacherExamWorkspaceScanMonitor',
    'TeacherExamWorkspaceMarkingProgress',
    'UserMessage',
    'UserProfile',
  ],
  [RoleEnum.CROP_USER]: [
    'TeacherMarkingOverview',
    'TeacherExamList',
    'TeacherExamWorkspaceScanMonitor',
    'TeacherExamWorkspaceMarkingProgress',
    'UserMessage',
    'UserProfile',
  ],
  [RoleEnum.SUPER_ADMIN]: [
    'TeacherMarkingOverview',
    'AdminAuditTrail',
    'AdminMarkingQuality',
    'UserMessage',
    'UserProfile',
  ],
}

// ============================================================================
//  路由邻接关系图：当前路由 → 业务上最可能下一步去的路由名集合
// ============================================================================
//
// 关系来源说明：
//   - 同 menuGroup 内的同事工作流：用户进入扫描录入后大概率会去看扫描监控中控台 / 影像账本
//   - 列表 ↔ 详情：进入列表必然伴随点击详情
//   - 主链上下游：成绩确认 → 成绩发布 → 复核处理
//   - 跨工作台高频入口：阅卷概览的 KPI 卡片可点击进各专项工作台
//
// 关系是双向声明（A → B 后又 B → A），但同一对路由只在两边各列一次以保持可读。

const ROUTE_NEIGHBORS: Record<string, string[]> = {
  // ── 学生侧 ───────────────────────────────────────
  StudentScore: ['StudentScoreDetail', 'StudentExamHistory', 'StudentAppeal'],
  StudentExamHistory: ['StudentScore', 'StudentScoreDetail'],
  StudentScoreDetail: ['StudentScore', 'StudentAppeal', 'StudentExamHistory'],
  StudentAppeal: ['StudentScoreDetail', 'StudentScore'],

  // ── ① 考试列表 + 工作台 ───────────────────────────
  TeacherExamList: [
    'TeacherExamWorkspaceOverview',
    'TeacherExamWorkspacePrep',
    'TeacherExamWorkspaceScanMonitor',
    'TeacherExamWorkspaceMarkingTaskPool',
    'TeacherExamWorkspaceScoreSummary',
  ],
  TeacherExamWorkspacePrep: [
    'TeacherExamWorkspacePaperTemplate',
    'TeacherExamWorkspaceCandidateRoster',
    'TeacherExamWorkspaceScanBatches',
  ],
  TeacherExamWorkspaceScanBatches: [
    'TeacherExamWorkspaceScanMonitor',
    'TeacherExamWorkspaceScanLedger',
    'TeacherExamWorkspaceScanDevices',
    'TeacherExamWorkspaceScanOcr',
  ],
  TeacherExamWorkspaceScanMonitor: ['TeacherExamWorkspaceScanBatches', 'TeacherExamWorkspaceScanLedger'],
  TeacherExamWorkspaceMarkingTaskPool: ['TeacherExamWorkspaceMarkingTaskDetail', 'TeacherExamWorkspaceMarkingQuality'],
  TeacherExamWorkspaceMarkingProgress: [
    'TeacherExamWorkspaceMarkingArbitration',
    'TeacherExamWorkspaceMarkingReview',
    'TeacherExamWorkspaceMarkingTaskPool',
  ],
  TeacherExamWorkspaceScoreSummary: [
    'TeacherExamWorkspaceScoreRelease',
    'TeacherExamWorkspaceArchiveStatistics',
  ],
  TeacherExamWorkspaceScoreRelease: [
    'TeacherExamWorkspaceScoreAppeal',
    'TeacherExamWorkspaceArchiveStatistics',
  ],
  TeacherExamWorkspaceOverview: [
    'TeacherExamList',
    'TeacherExamWorkspacePrep',
    'TeacherExamWorkspacePaperTemplate',
    'TeacherExamWorkspaceCandidateRoster',
  ],
  TeacherExamWorkspaceMarkingTaskDetail: ['TeacherExamWorkspaceMarkingTaskPool'],
  TeacherExamWorkspaceMarkingOrg: [
    'TeacherExamWorkspaceMarkingOrgDetail',
    'TeacherExamWorkspaceMarkingOrgSessions',
    'TeacherExamWorkspaceReviewAssignment',
  ],
  TeacherExamWorkspaceMarkingOrgDetail: [
    'TeacherExamWorkspaceMarkingOrgSessions',
    'TeacherExamWorkspaceMarkingOrg',
  ],
  TeacherExamWorkspaceMarkingOrgSessions: [
    'TeacherExamWorkspaceMarkingOrgDetail',
    'TeacherExamWorkspaceMarkingOrg',
  ],
  TeacherExamWorkspaceReviewWorkspace: ['TeacherExamWorkspaceMarkingReview', 'TeacherExamWorkspaceReviewTaskDetail'],
  TeacherExamWorkspaceArchivePackage: ['TeacherArchiveDetail', 'TeacherPaperArchiveList'],
  TeacherPaperArchiveList: ['TeacherPaperArchiveDetail', 'TeacherExamWorkspaceArchivePackage'],
  TeacherPaperArchiveDetail: ['TeacherPaperArchiveList', 'TeacherExamWorkspaceArchivePackage'],

  // ── 管理员 ───────────────────────────────────────
  TeacherMarkingOverview: ['AdminAuditTrail', 'AdminMarkingQuality', 'AdminCrossExamDashboard', 'TeacherExamList'],
  AdminAuditTrail: ['TeacherMarkingOverview', 'AdminMarkingQuality'],
  AdminMarkingQuality: ['AdminAuditTrail', 'AdminCrossExamDashboard', 'TeacherMarkingOverview'],
  AdminCrossExamDashboard: ['AdminSchoolQualityDashboard', 'AdminMarkingQuality', 'TeacherMarkingOverview'],
  AdminSchoolQualityDashboard: ['AdminCrossExamDashboard', 'AdminMarkingQuality'],
  TeacherMarkingOrganizationIndex: ['TeacherMarkingOrganizationDetail', 'TeacherMarkingOrganizationSessions'],
  TeacherMarkingOrganizationDetail: ['TeacherMarkingOrganizationSessions', 'TeacherMarkingOrganizationIndex'],
  TeacherMarkingOrganizationSessions: ['TeacherMarkingOrganizationDetail', 'TeacherMarkingOrganizationIndex'],
  AdminExamExports: ['AdminTeachingAffairsSync', 'TeacherMarkingOverview'],
  AdminTeachingAffairsSync: ['AdminExamExports', 'TeacherMarkingOverview'],

  // ── 教学质量评价（quality） ───────────────────────
  QualityDashboard: ['QualityAchievement', 'QualityImprovementWorkbench', 'QualityReport', 'QualityScoreBatch'],

  // ① 顶层配置链
  QualityAccreditationStandard: ['QualityProfessionAlgorithmTemplate', 'QualityScaleConversionRule'],
  QualityProfessionAlgorithmTemplate: ['QualityScaleConversionRule', 'QualityProfessionAlgorithmProfile'],
  QualityScaleConversionRule: ['QualityAccreditationStandard', 'QualityProfessionAlgorithmTemplate'],

  // ② 专业评价配置链
  QualityProgramEvaluationProfile: ['QualityProfessionAlgorithmProfile', 'QualityEvaluationWorkgroup'],
  QualityProfessionAlgorithmProfile: ['QualityProgramEvaluationProfile', 'QualityProfessionAlgorithmTemplate'],
  QualityEvaluationWorkgroup: ['QualityProgramEvaluationProfile', 'QualityProfessionAlgorithmProfile'],

  // ③ 培养方案 ↔ ④ 课程矩阵：综合工作台之间互相邻接
  QualityTrainingPlanWorkbench: ['QualityCourseMatrix', 'QualityProgramEvaluationProfile'],
  QualityCourseMatrix: ['QualityTrainingPlanWorkbench', 'QualityScoreBatch', 'QualityProcessEvaluation'],

  // ⑤ 数据接入链：成绩 / 过程性 / 间接 / 外部 拔取通常按工作日轮换
  QualityScoreBatch: ['QualityScoreRecord', 'QualityProcessEvaluation', 'QualityAchievement'],
  QualityScoreRecord: ['QualityScoreBatch', 'QualityAchievement'],
  QualityProcessEvaluation: ['QualityScoreBatch', 'QualityIndirectEvaluation', 'QualityAchievement'],
  QualityIndirectEvaluation: ['QualityProcessEvaluation', 'QualityAchievement'],
  QualityExternalPull: ['QualityScoreBatch', 'QualityScoreRecord', 'QualityAiMaskMapping'],

  // ⑥ 达成度评价：审核 → 详情 → 改进
  QualityAchievement: ['QualityAchievementDetail', 'QualityImprovementWorkbench', 'QualityReport'],
  QualityAchievementDetail: ['QualityAchievement', 'QualityImprovementWorkbench'],

  // ⑦ 持续改进：单一综合工作台
  QualityImprovementWorkbench: ['QualityAchievement', 'QualityReport', 'QualityArchive'],

  // ⑧ AI 智能诊断
  QualityAiTask: ['QualityAiModelProfile', 'QualityAiMaskMapping', 'QualityAchievement'],
  QualityAiModelProfile: ['QualityAiTask', 'QualityAiMaskMapping'],
  QualityAiMaskMapping: ['QualityAiModelProfile', 'QualityExternalPull'],

  // ⑨ 报告与归档
  QualityReport: ['QualityArchive', 'QualityAchievement', 'QualityImprovementWorkbench'],
  QualityArchive: ['QualityReport', 'QualityImprovementWorkbench'],
}

// ============================================================================
//  RoutePreloadManager
// ============================================================================

export class RoutePreloadManager {
  private preloaded = new Set<string>()
  /**
   * 单飞 Promise 缓存：同一时间多个触发点对同一路由发起预加载只跑一次
   */
  private inflight = new Map<string, Promise<void>>()

  constructor(private readonly router: Router) {
    this.setupAfterEach()
  }

  /**
   * 安装 router.afterEach 钩子：用户成功导航到某页面后，预加载邻接页面
   */
  private setupAfterEach(): void {
    this.router.afterEach((to) => {
      if (typeof to.name !== 'string') return
      const neighbors = ROUTE_NEIGHBORS[to.name]
      if (!neighbors || neighbors.length === 0) return
      for (const neighbor of neighbors) {
        this.schedulePreload(neighbor)
      }
    })
  }

  /**
   * 根据用户角色预加载默认工作台 + 通用页面 + 1~2 个高频入口
   *
   * 由 guard.ts 在登录态下触发（每次路由进入未受保护页面时调用，已加载短路）。
   * 返回 Promise 以兼容调用方 `.catch()` 写法；调度本身是 idle / setTimeout 非阻塞。
   */
  async preloadByRole(roles: RoleEnum[] | string[]): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return

    for (const role of roles) {
      const routeNames = ROLE_INITIAL_PRELOAD[role as string]
      if (!routeNames) continue
      for (const name of routeNames) {
        this.schedulePreload(name)
      }
    }
  }

  /**
   * 调度单个路由的预加载（idle 时段执行，失败容忍，已加载短路）。
   *
   * 预加载必须与路由权限一致：当前登录用户无权限访问的路由不仅菜单不可见、导航会被拦截，其 chunk
   * 也不应被 idle preload 白下载。允许未认证场景冷启动预加载（如 login chunk）。
   */
  private schedulePreload(routeName: string): void {
    if (this.preloaded.has(routeName)) return
    if (this.inflight.has(routeName)) return
    const loader = ROUTE_LOADERS[routeName]
    if (!loader) return

    // 已认证用户：按其角色 + 租户管理员状态过滤无权限路由，避免白下载 chunk
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      const userStore = useUserStore()
      const userRole = authStore.userRole
      const isTenantAdmin = userStore.isTenantAdmin
      if (!hasRouteNamePermission(routeName, userRole, isTenantAdmin)) {
        return
      }
    }

    const task = new Promise<void>((resolve) => {
      const execute = () => {
        loader()
          .then(() => {
            this.preloaded.add(routeName)
          })
          .catch(() => {
            // 预加载失败不抛出；用户真正导航时仍会触发 router.onError 引导刷新
          })
          .finally(() => {
            this.inflight.delete(routeName)
            resolve()
          })
      }

      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(execute, { timeout: 5000 })
      } else {
        setTimeout(execute, 0)
      }
    })

    this.inflight.set(routeName, task)
  }

  /**
   * 用户登出 / 强刷时清理状态，下次登录后重新冷启动预加载
   */
  clearPreloadCache(): void {
    this.preloaded.clear()
    this.inflight.clear()
  }
}

/**
 * 全局路由预加载管理器实例
 */
let routePreloadManager: RoutePreloadManager | null = null

/**
 * 初始化路由预加载
 */
export function setupRoutePreload(router: Router) {
  routePreloadManager = new RoutePreloadManager(router)

  // 监听用户登出，清理预加载缓存
  window.addEventListener('storage', (e) => {
    if (e.key === 'token' && !e.newValue) {
      // token被清除，用户登出
      routePreloadManager?.clearPreloadCache()
    }
  })

  return routePreloadManager
}

/**
 * 获取路由预加载管理器
 */
export function getRoutePreloadManager(): RoutePreloadManager | null {
  return routePreloadManager
}
