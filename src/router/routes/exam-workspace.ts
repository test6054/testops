/**
 * 考试详情工作台路由（独立全屏 layout，对标 web-vue practice-detail-layout）
 *
 * 路径：/teacher/exam-workspace/:examId/*
 * 不在 TeacherLayout 内，进入后隐藏全局侧栏，使用考试专属侧栏菜单。
 */
import type { RouteMeta, RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]

/**
 * 考试工作台子路由 meta：journeyKey 与 markStageKey 必填。
 *
 * journeyKey 是「该路由属于哪一步教师旅程」的单一可信来源（Vue Router 官方设计：
 * 路由固有属性写在 meta 上）。设为必填后，任何新增 workspace 子路由若遗漏 journeyKey，
 * 在 tsc 阶段即报错，无需运行时反查菜单或 markStageKey 兜底。
 */
type WorkspaceChildMeta
  = & Omit<RouteMeta, 'journeyKey' | 'markStageKey'>
    & Required<Pick<RouteMeta, 'journeyKey' | 'markStageKey'>>

function workspaceChild(
  path: string,
  name: string,
  component: () => Promise<unknown>,
  meta: WorkspaceChildMeta,
): RouteRecordRaw {
  return {
    path,
    name,
    component,
    meta: {
      roles: TEACHER_ROLES,
      hideInMenu: true,
      layout: 'ExamWorkspace',
      requiresAuth: true,
      ...meta,
    },
  }
}

export const examWorkspaceRoutes: RouteRecordRaw = {
  path: '/teacher/exam-workspace/:examId',
  name: 'TeacherExamWorkspace',
  component: () => import('@/views/teacher/exam-workspace-layout.vue'),
  redirect: (to) => ({
    name: 'TeacherExamWorkspaceOverview',
    params: { examId: to.params.examId },
  }),
  meta: {
    title: '考试工作台',
    roles: TEACHER_ROLES,
    hideInMenu: true,
    layout: 'ExamWorkspace',
    requiresAuth: true,
  },
  children: [
    workspaceChild('overview', 'TeacherExamWorkspaceOverview', () => import('@/views/teacher/exam-detail.vue'), {
      title: '考试概览',
      markStageKey: 'EXAM_PREP',
      journeyKey: 'overview',
      workspacePhase: 'overview',
      keepAlive: true,
    }),
    workspaceChild('prep', 'TeacherExamWorkspacePrep', () => import('@/views/teacher/exam-prep-workbench.vue'), {
      title: '考试准备',
      markStageKey: 'EXAM_PREP',
      journeyKey: 'prep',
      workspacePhase: 'prep',
      keepAlive: false,
    }),
    workspaceChild('print-package', 'TeacherExamWorkspacePrintPackage', () => import('@/views/teacher/print-package.vue'), {
      title: '印刷包管理',
      markStageKey: 'EXAM_PREP',
      journeyKey: 'prep',
      workspacePhase: 'prep',
      keepAlive: true,
    }),
    workspaceChild('paper-template', 'TeacherExamWorkspacePaperTemplate', () => import('@/views/teacher/paper-template.vue'), {
      title: '试卷题目',
      markStageKey: 'PAPER_TEMPLATE',
      journeyKey: 'prep',
      workspacePhase: 'paper-template',
      keepAlive: true,
    }),
    workspaceChild('paper-template/answer-sheet', 'TeacherExamWorkspaceAnswerSheet', () => import('@/views/teacher/answer-sheet-template.vue'), {
      title: '答卷页模板',
      markStageKey: 'PAPER_TEMPLATE',
      journeyKey: 'prep',
      workspacePhase: 'paper-template',
      keepAlive: true,
    }),
    workspaceChild('paper-template/master', 'TeacherExamWorkspacePaperMaster', () => import('@/views/teacher/paper-master.vue'), {
      title: '试卷母版',
      markStageKey: 'PAPER_TEMPLATE',
      journeyKey: 'prep',
      workspacePhase: 'paper-template',
      keepAlive: true,
    }),
    workspaceChild('candidate-roster', 'TeacherExamWorkspaceCandidateRoster', () => import('@/views/teacher/candidate-roster.vue'), {
      title: '考生名册',
      markStageKey: 'CANDIDATE_ROSTER',
      journeyKey: 'prep',
      workspacePhase: 'candidate-roster',
      keepAlive: true,
    }),
    workspaceChild('scan/batches', 'TeacherExamWorkspaceScanBatches', () => import('@/views/teacher/scan-upload.vue'), {
      title: '录入与批次',
      markStageKey: 'SCAN',
      journeyKey: 'scan',
      workspacePhase: 'scan',
      keepAlive: true,
    }),
    workspaceChild('scan/monitor', 'TeacherExamWorkspaceScanMonitor', () => import('@/views/teacher/scan-live-monitor.vue'), {
      title: '扫描监控',
      markStageKey: 'SCAN',
      journeyKey: 'scan',
      workspacePhase: 'scan',
      keepAlive: false,
      noCache: true,
    }),
    workspaceChild('scan/ledger', 'TeacherExamWorkspaceScanLedger', () => import('@/views/teacher/image-ledger.vue'), {
      title: '影像账本',
      markStageKey: 'SCAN',
      journeyKey: 'scan',
      workspacePhase: 'scan',
      keepAlive: true,
    }),
    workspaceChild('scan/devices', 'TeacherExamWorkspaceScanDevices', () => import('@/views/teacher/printer-management.vue'), {
      title: '扫描设备',
      markStageKey: 'SCAN',
      journeyKey: 'scan',
      workspacePhase: 'scan',
      keepAlive: true,
    }),
    workspaceChild('scan/ocr', 'TeacherExamWorkspaceScanOcr', () => import('@/views/teacher/ocr-settings.vue'), {
      title: 'OCR 配置',
      markStageKey: 'SCAN',
      journeyKey: 'scan',
      workspacePhase: 'scan',
      keepAlive: true,
    }),
    workspaceChild('marking-org', 'TeacherExamWorkspaceMarkingOrg', () => import('@/views/admin/marking-organization/index.vue'), {
      title: '阅卷安排',
      markStageKey: 'MARKING_ORG',
      journeyKey: 'assign',
      workspacePhase: 'marking-org',
      keepAlive: true,
    }),
    workspaceChild('marking-org/assignment', 'TeacherExamWorkspaceReviewAssignment', () => import('@/views/teacher/review-assignment.vue'), {
      title: '分派方案',
      markStageKey: 'MARKING_ORG',
      journeyKey: 'assign',
      workspacePhase: 'marking-org',
      keepAlive: true,
    }),
    workspaceChild('trial/task-pool', 'TeacherExamWorkspaceTrialTaskPool', () => import('@/views/teacher/marking-task-pool.vue'), {
      title: '试评任务池',
      markStageKey: 'TRIAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'trial',
      keepAlive: true,
    }),
    workspaceChild('trial/progress', 'TeacherExamWorkspaceTrialProgress', () => import('@/views/teacher/review-progress.vue'), {
      title: '试评进度',
      markStageKey: 'TRIAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'trial',
      keepAlive: true,
    }),
    workspaceChild('marking/review-batch', 'TeacherExamWorkspaceReviewBatchConfirm', () => import('@/views/teacher/review-batch-confirm.vue'), {
      title: '批量复核确认',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      keepAlive: true,
    }),
    workspaceChild('marking/task-pool', 'TeacherExamWorkspaceMarkingTaskPool', () => import('@/views/teacher/marking-task-pool.vue'), {
      title: '阅卷任务池',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      keepAlive: true,
    }),
    workspaceChild('marking/task/:taskId', 'TeacherExamWorkspaceMarkingTaskDetail', () => import('@/views/teacher/marking-task-detail.vue'), {
      title: '阅卷工作台',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      layoutWide: true,
      keepAlive: false,
      noCache: true,
    }),
    workspaceChild('marking/progress', 'TeacherExamWorkspaceMarkingProgress', () => import('@/views/teacher/review-progress.vue'), {
      title: '进度看板',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      keepAlive: true,
    }),
    workspaceChild('marking/arbitration', 'TeacherExamWorkspaceMarkingArbitration', () => import('@/views/teacher/review-arbitration.vue'), {
      title: '仲裁裁定',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      keepAlive: true,
    }),
    workspaceChild('marking/quality', 'TeacherExamWorkspaceMarkingQuality', () => import('@/views/teacher/marking-spot-check.vue'), {
      title: '抽检处理',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      keepAlive: true,
    }),
    workspaceChild('marking/review', 'TeacherExamWorkspaceMarkingReview', () => import('@/views/teacher/review-workspace.vue'), {
      title: 'OCR/AI 复核',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      keepAlive: true,
    }),
    workspaceChild('marking/review/:taskId', 'TeacherExamWorkspaceReviewWorkspace', () => import('@/views/teacher/review-workspace.vue'), {
      title: 'OCR/AI 单题复核',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      layoutWide: true,
      keepAlive: false,
      noCache: true,
    }),
    workspaceChild('marking/review/:taskId/detail', 'TeacherExamWorkspaceReviewTaskDetail', () => import('@/views/teacher/review-task-detail.vue'), {
      title: '复核任务详情',
      markStageKey: 'FORMAL_MARKING',
      journeyKey: 'mark',
      workspacePhase: 'marking',
      layoutWide: true,
      keepAlive: false,
      noCache: true,
    }),
    workspaceChild('score/summary', 'TeacherExamWorkspaceScoreSummary', () => import('@/views/teacher/score-finalize.vue'), {
      title: '成绩确认',
      markStageKey: 'SCORE_PUBLISH',
      journeyKey: 'publish',
      workspacePhase: 'score',
      keepAlive: true,
    }),
    workspaceChild('score/release', 'TeacherExamWorkspaceScoreRelease', () => import('@/views/teacher/score-publish.vue'), {
      title: '成绩发布',
      markStageKey: 'SCORE_PUBLISH',
      journeyKey: 'publish',
      workspacePhase: 'score',
      keepAlive: true,
    }),
    workspaceChild('score/absence', 'TeacherExamWorkspaceScoreAbsence', () => import('@/views/teacher/absence-confirm.vue'), {
      title: '缺考确认',
      markStageKey: 'SCORE_PUBLISH',
      journeyKey: 'publish',
      workspacePhase: 'score',
      keepAlive: true,
    }),
    workspaceChild('score/appeal', 'TeacherExamWorkspaceScoreAppeal', () => import('@/views/teacher/appeal-handle.vue'), {
      title: '复核申诉',
      markStageKey: 'SCORE_PUBLISH',
      journeyKey: 'publish',
      workspacePhase: 'score',
      keepAlive: true,
    }),
    workspaceChild('archive/package', 'TeacherExamWorkspaceArchivePackage', () => import('@/views/teacher/archive/archive-list.vue'), {
      title: '归档列表',
      markStageKey: 'ARCHIVE',
      journeyKey: 'archive',
      workspacePhase: 'archive',
      keepAlive: true,
    }),
    workspaceChild('archive/statistics', 'TeacherExamWorkspaceArchiveStatistics', () => import('@/views/teacher/statistics.vue'), {
      title: '成绩统计',
      markStageKey: 'ARCHIVE',
      journeyKey: 'archive',
      workspacePhase: 'archive',
      keepAlive: true,
    }),
    workspaceChild('archive/grading-experience', 'TeacherExamWorkspaceGradingExperience', () => import('@/views/teacher/grading-experience-hub.vue'), {
      title: '阅卷经验库',
      markStageKey: 'ARCHIVE',
      journeyKey: 'archive',
      workspacePhase: 'archive',
      keepAlive: true,
    }),
    workspaceChild('archive/exports', 'TeacherExamWorkspaceArchiveExports', () => import('@/views/common/exam-export-tasks.vue'), {
      title: '导出任务',
      markStageKey: 'ARCHIVE',
      journeyKey: 'archive',
      workspacePhase: 'archive',
      keepAlive: true,
    }),
  ],
}
