import type { MarkStageKey } from '@/stores/modules/markStage'

export type MarkWorkspacePhase
  = | 'prep'
    | 'paper-template'
    | 'candidate-roster'
    | 'scan'
    | 'marking-org'
    | 'trial'
    | 'marking'
    | 'score'
    | 'archive'

export interface MarkWorkspaceNavItem {
  key: string
  title: string
  routeName: string
  markStageKey: MarkStageKey
}

export interface MarkWorkspaceNavGroup {
  phase: MarkWorkspacePhase
  title: string
  markStageKey: MarkStageKey
  items: MarkWorkspaceNavItem[]
}

/** 阶段默认子路由：StageRail 点击跳转目标 */
export const MARK_STAGE_DEFAULT_ROUTE: Record<MarkStageKey, string> = {
  EXAM_PREP: 'TeacherExamWorkspacePrep',
  PAPER_TEMPLATE: 'TeacherExamWorkspacePaperTemplate',
  CANDIDATE_ROSTER: 'TeacherExamWorkspaceCandidateRoster',
  SCAN: 'TeacherExamWorkspaceScanBatches',
  MARKING_ORG: 'TeacherExamWorkspaceMarkingOrg',
  TRIAL_MARKING: 'TeacherExamWorkspaceTrialTaskPool',
  FORMAL_MARKING: 'TeacherExamWorkspaceMarkingTaskPool',
  SCORE_PUBLISH: 'TeacherExamWorkspaceScoreSummary',
  ARCHIVE: 'TeacherExamWorkspaceArchivePackage',
}

export const MARK_WORKSPACE_NAV_GROUPS: MarkWorkspaceNavGroup[] = [
  {
    phase: 'prep',
    title: '考试准备',
    markStageKey: 'EXAM_PREP',
    items: [
      { key: 'prep', title: '准备工作台', routeName: 'TeacherExamWorkspacePrep', markStageKey: 'EXAM_PREP' },
      { key: 'print-package', title: '印刷包', routeName: 'TeacherExamWorkspacePrintPackage', markStageKey: 'EXAM_PREP' },
    ],
  },
  {
    phase: 'paper-template',
    title: '模板制卷',
    markStageKey: 'PAPER_TEMPLATE',
    items: [
      { key: 'paper-template', title: '试卷题目', routeName: 'TeacherExamWorkspacePaperTemplate', markStageKey: 'PAPER_TEMPLATE' },
      { key: 'answer-sheet', title: '答卷页模板', routeName: 'TeacherExamWorkspaceAnswerSheet', markStageKey: 'PAPER_TEMPLATE' },
      { key: 'paper-master', title: '试卷母版', routeName: 'TeacherExamWorkspacePaperMaster', markStageKey: 'PAPER_TEMPLATE' },
    ],
  },
  {
    phase: 'candidate-roster',
    title: '考生名册',
    markStageKey: 'CANDIDATE_ROSTER',
    items: [
      { key: 'candidate-roster', title: '名册管理', routeName: 'TeacherExamWorkspaceCandidateRoster', markStageKey: 'CANDIDATE_ROSTER' },
    ],
  },
  {
    phase: 'scan',
    title: '扫描识别',
    markStageKey: 'SCAN',
    items: [
      { key: 'batches', title: '录入与批次', routeName: 'TeacherExamWorkspaceScanBatches', markStageKey: 'SCAN' },
      { key: 'monitor', title: '扫描监控', routeName: 'TeacherExamWorkspaceScanMonitor', markStageKey: 'SCAN' },
      { key: 'ledger', title: '影像账本', routeName: 'TeacherExamWorkspaceScanLedger', markStageKey: 'SCAN' },
      { key: 'devices', title: '扫描设备', routeName: 'TeacherExamWorkspaceScanDevices', markStageKey: 'SCAN' },
      { key: 'ocr', title: 'OCR 配置', routeName: 'TeacherExamWorkspaceScanOcr', markStageKey: 'SCAN' },
    ],
  },
  {
    phase: 'marking-org',
    title: '阅卷组织',
    markStageKey: 'MARKING_ORG',
    items: [
      { key: 'marking-org', title: '阅卷安排', routeName: 'TeacherExamWorkspaceMarkingOrg', markStageKey: 'MARKING_ORG' },
      { key: 'assignment', title: '分派方案', routeName: 'TeacherExamWorkspaceReviewAssignment', markStageKey: 'MARKING_ORG' },
    ],
  },
  {
    phase: 'trial',
    title: '试评',
    markStageKey: 'TRIAL_MARKING',
    items: [
      { key: 'trial-pool', title: '试评任务池', routeName: 'TeacherExamWorkspaceTrialTaskPool', markStageKey: 'TRIAL_MARKING' },
      { key: 'trial-progress', title: '试评进度', routeName: 'TeacherExamWorkspaceTrialProgress', markStageKey: 'TRIAL_MARKING' },
    ],
  },
  {
    phase: 'marking',
    title: '正评',
    markStageKey: 'FORMAL_MARKING',
    items: [
      { key: 'task-pool', title: '阅卷任务池', routeName: 'TeacherExamWorkspaceMarkingTaskPool', markStageKey: 'FORMAL_MARKING' },
      { key: 'progress', title: '进度看板', routeName: 'TeacherExamWorkspaceMarkingProgress', markStageKey: 'FORMAL_MARKING' },
      { key: 'arbitration', title: '仲裁裁定', routeName: 'TeacherExamWorkspaceMarkingArbitration', markStageKey: 'FORMAL_MARKING' },
      { key: 'quality', title: '抽检处理', routeName: 'TeacherExamWorkspaceMarkingQuality', markStageKey: 'FORMAL_MARKING' },
      { key: 'review', title: 'OCR/AI 复核', routeName: 'TeacherExamWorkspaceMarkingReview', markStageKey: 'FORMAL_MARKING' },
    ],
  },
  {
    phase: 'score',
    title: '成绩发布',
    markStageKey: 'SCORE_PUBLISH',
    items: [
      { key: 'summary', title: '成绩确认', routeName: 'TeacherExamWorkspaceScoreSummary', markStageKey: 'SCORE_PUBLISH' },
      { key: 'release', title: '成绩发布', routeName: 'TeacherExamWorkspaceScoreRelease', markStageKey: 'SCORE_PUBLISH' },
      { key: 'absence', title: '缺考确认', routeName: 'TeacherExamWorkspaceScoreAbsence', markStageKey: 'SCORE_PUBLISH' },
      { key: 'appeal', title: '复核申诉', routeName: 'TeacherExamWorkspaceScoreAppeal', markStageKey: 'SCORE_PUBLISH' },
    ],
  },
  {
    phase: 'archive',
    title: '归档复盘',
    markStageKey: 'ARCHIVE',
    items: [
      { key: 'package', title: '归档列表', routeName: 'TeacherExamWorkspaceArchivePackage', markStageKey: 'ARCHIVE' },
      { key: 'statistics', title: '成绩统计', routeName: 'TeacherExamWorkspaceArchiveStatistics', markStageKey: 'ARCHIVE' },
      { key: 'exports', title: '导出任务', routeName: 'TeacherExamWorkspaceArchiveExports', markStageKey: 'ARCHIVE' },
    ],
  },
]

export function resolveWorkspaceNavGroup(phase?: string): MarkWorkspaceNavGroup | undefined {
  if (!phase) {
    return undefined
  }
  return MARK_WORKSPACE_NAV_GROUPS.find((group) => group.phase === phase)
}
