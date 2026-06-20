/**
 * 教师（SCH_TECH / CROP_ADMIN / CROP_USER）路由
 *
 * L0：考试列表 + 质量评价（全局侧栏）
 * L1-L3：/teacher/exam-workspace/:examId/* 考试工作台嵌套路由
 */
import type { RouteRecordRaw } from 'vue-router'
import { RoleEnum } from '@/utils/permission'

const TEACHER_ROLES = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
const ALL_TEACHER_ROLES = [RoleEnum.SUPER_ADMIN, ...TEACHER_ROLES]

const WORKSPACE_LAYOUT = () => import('@/views/teacher/exam-workspace-layout.vue')

function workspaceChild(
  path: string,
  name: string,
  component: () => Promise<unknown>,
  meta: RouteRecordRaw['meta'],
): RouteRecordRaw {
  return {
    path,
    name,
    component,
    meta: {
      roles: TEACHER_ROLES,
      hideInMenu: true,
      layout: 'ExamWorkspace',
      ...meta,
    },
  }
}

export const teacherRoutes: RouteRecordRaw[] = [
  {
    path: '/teacher',
    name: 'TeacherLayout',
    component: () => import('@/layout/index.vue'),
    redirect: '/teacher/exam-list',
    meta: {
      title: '阅卷工作台',
      roles: ALL_TEACHER_ROLES,
      icon: 'audit',
      hideInMenu: false,
    },
    children: [
      {
        path: 'exam-list',
        name: 'TeacherExamList',
        component: () => import('@/views/teacher/exam-list.vue'),
        meta: {
          title: '考试列表',
          roles: TEACHER_ROLES,
          icon: 'dashboard',
          hideInMenu: false,
          keepAlive: true,
          menuGroup: 'exam-prep',
          menuGroupTitle: '阅卷中心',
          menuGroupIcon: 'dashboard',
          menuGroupOrder: 1,
        },
      },
      {
        path: 'exam/:examId/detail',
        name: 'TeacherExamDetail',
        component: () => import('@/views/teacher/exam-detail.vue'),
        meta: {
          title: '考试详情',
          roles: TEACHER_ROLES,
          icon: 'eye',
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/exam-list',
        },
      },
      {
        path: 'paper-archive-list',
        name: 'TeacherPaperArchiveList',
        component: () => import('@/views/teacher/paper-archive/paper-archive-list.vue'),
        meta: {
          title: '历史纸质档案',
          roles: TEACHER_ROLES,
          icon: 'folder-open',
          hideInMenu: true,
          keepAlive: true,
        },
      },
      {
        path: 'paper-archive/:archiveSetId/detail',
        name: 'TeacherPaperArchiveDetail',
        component: () => import('@/views/teacher/paper-archive/paper-archive-detail.vue'),
        meta: {
          title: '纸质档案详情',
          roles: TEACHER_ROLES,
          icon: 'eye',
          hideInMenu: true,
          noCache: true,
          activeMenu: '/teacher/paper-archive-list',
        },
      },
      {
        path: 'marking-organization/:organizationId',
        name: 'TeacherMarkingOrganizationDetail',
        component: () => import('@/views/admin/marking-organization/detail.vue'),
        meta: {
          title: '组织详情',
          roles: TEACHER_ROLES,
          icon: 'setting',
          hideInMenu: true,
          noCache: true,
        },
      },
      {
        path: 'marking-organization/:organizationId/sessions',
        name: 'TeacherMarkingOrganizationSessions',
        component: () => import('@/views/admin/marking-organization/sessions.vue'),
        meta: {
          title: '试评 / 正评',
          roles: TEACHER_ROLES,
          icon: 'play-circle',
          hideInMenu: true,
          noCache: true,
        },
      },
      {
        path: 'archive/:archiveId/detail',
        name: 'TeacherArchiveDetail',
        component: () => import('@/views/teacher/archive/archive-detail.vue'),
        meta: {
          title: '归档详情',
          roles: TEACHER_ROLES,
          icon: 'eye',
          hideInMenu: true,
          noCache: true,
        },
      },
      {
        path: 'exam-workspace/:examId',
        name: 'TeacherExamWorkspace',
        component: WORKSPACE_LAYOUT,
        redirect: (to) => ({
          name: 'TeacherExamWorkspacePrep',
          params: { examId: to.params.examId },
        }),
        meta: {
          title: '考试工作台',
          roles: TEACHER_ROLES,
          hideInMenu: true,
          layout: 'ExamWorkspace',
        },
        children: [
          workspaceChild('prep', 'TeacherExamWorkspacePrep', () => import('@/views/teacher/exam-prep-workbench.vue'), {
            title: '考试准备',
            markStageKey: 'EXAM_PREP',
            workspacePhase: 'prep',
            keepAlive: false,
          }),
          workspaceChild('print-package', 'TeacherExamWorkspacePrintPackage', () => import('@/views/teacher/print-package.vue'), {
            title: '印刷包管理',
            markStageKey: 'EXAM_PREP',
            workspacePhase: 'prep',
            keepAlive: true,
          }),
          workspaceChild('paper-template', 'TeacherExamWorkspacePaperTemplate', () => import('@/views/teacher/paper-template.vue'), {
            title: '试卷题目',
            markStageKey: 'PAPER_TEMPLATE',
            workspacePhase: 'paper-template',
            keepAlive: true,
          }),
          workspaceChild('paper-template/answer-sheet', 'TeacherExamWorkspaceAnswerSheet', () => import('@/views/teacher/answer-sheet-template.vue'), {
            title: '答卷页模板',
            markStageKey: 'PAPER_TEMPLATE',
            workspacePhase: 'paper-template',
            keepAlive: true,
          }),
          workspaceChild('paper-template/master', 'TeacherExamWorkspacePaperMaster', () => import('@/views/teacher/paper-master.vue'), {
            title: '试卷母版',
            markStageKey: 'PAPER_TEMPLATE',
            workspacePhase: 'paper-template',
            keepAlive: true,
          }),
          workspaceChild('candidate-roster', 'TeacherExamWorkspaceCandidateRoster', () => import('@/views/teacher/candidate-roster.vue'), {
            title: '考生名册',
            markStageKey: 'CANDIDATE_ROSTER',
            workspacePhase: 'candidate-roster',
            keepAlive: true,
          }),
          workspaceChild('scan/batches', 'TeacherExamWorkspaceScanBatches', () => import('@/views/teacher/scan-upload.vue'), {
            title: '录入与批次',
            markStageKey: 'SCAN',
            workspacePhase: 'scan',
            keepAlive: true,
          }),
          workspaceChild('scan/monitor', 'TeacherExamWorkspaceScanMonitor', () => import('@/views/teacher/scan-live-monitor.vue'), {
            title: '扫描监控',
            markStageKey: 'SCAN',
            workspacePhase: 'scan',
            keepAlive: false,
            noCache: true,
          }),
          workspaceChild('scan/ledger', 'TeacherExamWorkspaceScanLedger', () => import('@/views/teacher/image-ledger.vue'), {
            title: '影像账本',
            markStageKey: 'SCAN',
            workspacePhase: 'scan',
            keepAlive: true,
          }),
          workspaceChild('scan/devices', 'TeacherExamWorkspaceScanDevices', () => import('@/views/teacher/printer-management.vue'), {
            title: '扫描设备',
            markStageKey: 'SCAN',
            workspacePhase: 'scan',
            keepAlive: true,
          }),
          workspaceChild('scan/ocr', 'TeacherExamWorkspaceScanOcr', () => import('@/views/teacher/ocr-settings.vue'), {
            title: 'OCR 配置',
            markStageKey: 'SCAN',
            workspacePhase: 'scan',
            keepAlive: true,
          }),
          workspaceChild('marking-org', 'TeacherExamWorkspaceMarkingOrg', () => import('@/views/admin/marking-organization/index.vue'), {
            title: '阅卷安排',
            markStageKey: 'MARKING_ORG',
            workspacePhase: 'marking-org',
            keepAlive: true,
          }),
          workspaceChild('marking-org/assignment', 'TeacherExamWorkspaceReviewAssignment', () => import('@/views/teacher/review-assignment.vue'), {
            title: '分派方案',
            markStageKey: 'MARKING_ORG',
            workspacePhase: 'marking-org',
            keepAlive: true,
          }),
          workspaceChild('trial/task-pool', 'TeacherExamWorkspaceTrialTaskPool', () => import('@/views/teacher/marking-task-pool.vue'), {
            title: '试评任务池',
            markStageKey: 'TRIAL_MARKING',
            workspacePhase: 'trial',
            keepAlive: true,
          }),
          workspaceChild('trial/progress', 'TeacherExamWorkspaceTrialProgress', () => import('@/views/teacher/review-progress.vue'), {
            title: '试评进度',
            markStageKey: 'TRIAL_MARKING',
            workspacePhase: 'trial',
            keepAlive: true,
          }),
          workspaceChild('marking/task-pool', 'TeacherExamWorkspaceMarkingTaskPool', () => import('@/views/teacher/marking-task-pool.vue'), {
            title: '阅卷任务池',
            markStageKey: 'FORMAL_MARKING',
            workspacePhase: 'marking',
            keepAlive: true,
          }),
          workspaceChild('marking/task/:taskId', 'TeacherExamWorkspaceMarkingTaskDetail', () => import('@/views/teacher/marking-task-detail.vue'), {
            title: '阅卷工作台',
            markStageKey: 'FORMAL_MARKING',
            workspacePhase: 'marking',
            layoutWide: true,
            keepAlive: false,
            noCache: true,
          }),
          workspaceChild('marking/progress', 'TeacherExamWorkspaceMarkingProgress', () => import('@/views/teacher/review-progress.vue'), {
            title: '进度看板',
            markStageKey: 'FORMAL_MARKING',
            workspacePhase: 'marking',
            keepAlive: true,
          }),
          workspaceChild('marking/arbitration', 'TeacherExamWorkspaceMarkingArbitration', () => import('@/views/teacher/review-arbitration.vue'), {
            title: '仲裁裁定',
            markStageKey: 'FORMAL_MARKING',
            workspacePhase: 'marking',
            keepAlive: true,
          }),
          workspaceChild('marking/quality', 'TeacherExamWorkspaceMarkingQuality', () => import('@/views/teacher/marking-spot-check.vue'), {
            title: '抽检处理',
            markStageKey: 'FORMAL_MARKING',
            workspacePhase: 'marking',
            keepAlive: true,
          }),
          workspaceChild('marking/review', 'TeacherExamWorkspaceMarkingReview', () => import('@/views/teacher/review-workspace.vue'), {
            title: 'OCR/AI 复核',
            markStageKey: 'FORMAL_MARKING',
            workspacePhase: 'marking',
            layoutWide: true,
            keepAlive: false,
          }),
          workspaceChild('marking/review/:taskId', 'TeacherExamWorkspaceReviewWorkspace', () => import('@/views/teacher/review-workspace.vue'), {
            title: 'OCR/AI 单题复核',
            markStageKey: 'FORMAL_MARKING',
            workspacePhase: 'marking',
            layoutWide: true,
            keepAlive: false,
            noCache: true,
          }),
          workspaceChild('marking/review/:taskId/detail', 'TeacherExamWorkspaceReviewTaskDetail', () => import('@/views/teacher/review-task-detail.vue'), {
            title: '复核任务详情',
            markStageKey: 'FORMAL_MARKING',
            workspacePhase: 'marking',
            layoutWide: true,
            keepAlive: false,
            noCache: true,
          }),
          workspaceChild('score/summary', 'TeacherExamWorkspaceScoreSummary', () => import('@/views/teacher/score-finalize.vue'), {
            title: '成绩确认',
            markStageKey: 'SCORE_PUBLISH',
            workspacePhase: 'score',
            keepAlive: true,
          }),
          workspaceChild('score/release', 'TeacherExamWorkspaceScoreRelease', () => import('@/views/teacher/score-publish.vue'), {
            title: '成绩发布',
            markStageKey: 'SCORE_PUBLISH',
            workspacePhase: 'score',
            keepAlive: true,
          }),
          workspaceChild('score/absence', 'TeacherExamWorkspaceScoreAbsence', () => import('@/views/teacher/absence-confirm.vue'), {
            title: '缺考确认',
            markStageKey: 'SCORE_PUBLISH',
            workspacePhase: 'score',
            keepAlive: true,
          }),
          workspaceChild('score/appeal', 'TeacherExamWorkspaceScoreAppeal', () => import('@/views/teacher/appeal-handle.vue'), {
            title: '复核申诉',
            markStageKey: 'SCORE_PUBLISH',
            workspacePhase: 'score',
            keepAlive: true,
          }),
          workspaceChild('archive/package', 'TeacherExamWorkspaceArchivePackage', () => import('@/views/teacher/archive/archive-list.vue'), {
            title: '归档列表',
            markStageKey: 'ARCHIVE',
            workspacePhase: 'archive',
            keepAlive: true,
          }),
          workspaceChild('archive/statistics', 'TeacherExamWorkspaceArchiveStatistics', () => import('@/views/teacher/statistics.vue'), {
            title: '成绩统计',
            markStageKey: 'ARCHIVE',
            workspacePhase: 'archive',
            keepAlive: true,
          }),
          workspaceChild('archive/exports', 'TeacherExamWorkspaceArchiveExports', () => import('@/views/common/exam-export-tasks.vue'), {
            title: '导出任务',
            markStageKey: 'ARCHIVE',
            workspacePhase: 'archive',
            keepAlive: true,
          }),
        ],
      },
    ],
  },
]
