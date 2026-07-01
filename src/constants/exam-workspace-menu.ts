import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'

export interface ExamWorkspaceMenuItem {
  key: string
  label: string
  routeName: string
  markStageKey: MarkStageKey
}

export interface ExamWorkspaceMenuGroup {
  key: string
  title: string
  journeyKey: ExamWorkspaceJourneyKey
  stageKeys: readonly MarkStageKey[]
  items: ExamWorkspaceMenuItem[]
}

/** 9 个 group、34 个 menu item；侧栏按 activeJourneyKey 过滤 group */
export const EXAM_WORKSPACE_MENU_GROUPS: readonly ExamWorkspaceMenuGroup[] = [
  {
    key: 'overview',
    title: '考试概览',
    journeyKey: 'overview',
    stageKeys: ['EXAM_PREP'],
    items: [
      { key: 'overview', label: '考试概览', routeName: 'TeacherExamWorkspaceOverview', markStageKey: 'EXAM_PREP' },
    ],
  },
  {
    key: 'prep',
    title: '准备项进度',
    journeyKey: 'prep',
    stageKeys: ['EXAM_PREP', 'PAPER_TEMPLATE', 'CANDIDATE_ROSTER'],
    items: [
      { key: 'prep', label: '准备工作台', routeName: 'TeacherExamWorkspacePrep', markStageKey: 'EXAM_PREP' },
      { key: 'paper-template', label: '试卷题目', routeName: 'TeacherExamWorkspacePaperTemplate', markStageKey: 'PAPER_TEMPLATE' },
      { key: 'answer-sheet', label: '答卷页模板', routeName: 'TeacherExamWorkspaceAnswerSheet', markStageKey: 'PAPER_TEMPLATE' },
      { key: 'paper-master', label: '试卷母版', routeName: 'TeacherExamWorkspacePaperMaster', markStageKey: 'PAPER_TEMPLATE' },
      { key: 'candidate-roster', label: '考生名册', routeName: 'TeacherExamWorkspaceCandidateRoster', markStageKey: 'CANDIDATE_ROSTER' },
      { key: 'print-package', label: '印刷包', routeName: 'TeacherExamWorkspacePrintPackage', markStageKey: 'EXAM_PREP' },
    ],
  },
  {
    key: 'scan',
    title: '扫描识别',
    journeyKey: 'scan',
    stageKeys: ['SCAN'],
    items: [
      { key: 'scan-batches', label: '扫描批次', routeName: 'TeacherExamWorkspaceScanBatches', markStageKey: 'SCAN' },
      { key: 'scan-monitor', label: '扫描监控', routeName: 'TeacherExamWorkspaceScanMonitor', markStageKey: 'SCAN' },
      { key: 'scan-ledger', label: '影像账本', routeName: 'TeacherExamWorkspaceScanLedger', markStageKey: 'SCAN' },
      { key: 'scan-devices', label: '扫描设备', routeName: 'TeacherExamWorkspaceScanDevices', markStageKey: 'SCAN' },
      { key: 'scan-ocr', label: 'OCR 配置', routeName: 'TeacherExamWorkspaceScanOcr', markStageKey: 'SCAN' },
    ],
  },
  {
    key: 'assign',
    title: '阅卷设置',
    journeyKey: 'assign',
    stageKeys: ['MARKING_ORG'],
    items: [
      { key: 'marking-org', label: '阅卷设置', routeName: 'TeacherExamWorkspaceMarkingOrg', markStageKey: 'MARKING_ORG' },
    ],
  },
  {
    key: 'mark-trial',
    title: '试评',
    journeyKey: 'mark',
    stageKeys: ['TRIAL_MARKING'],
    items: [
      { key: 'trial-pool', label: '试评任务池', routeName: 'TeacherExamWorkspaceTrialTaskPool', markStageKey: 'TRIAL_MARKING' },
      { key: 'trial-progress', label: '试评进度', routeName: 'TeacherExamWorkspaceTrialProgress', markStageKey: 'TRIAL_MARKING' },
    ],
  },
  {
    key: 'mark-formal',
    title: '正评',
    journeyKey: 'mark',
    stageKeys: ['FORMAL_MARKING'],
    items: [
      { key: 'marking-pool', label: '阅卷任务池', routeName: 'TeacherExamWorkspaceMarkingTaskPool', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-progress', label: '进度看板', routeName: 'TeacherExamWorkspaceMarkingProgress', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-review', label: 'OCR/AI 复核', routeName: 'TeacherExamWorkspaceMarkingReview', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-review-batch', label: '批量复核确认', routeName: 'TeacherExamWorkspaceReviewBatchConfirm', markStageKey: 'FORMAL_MARKING' },
    ],
  },
  {
    key: 'mark-qc',
    title: '质控',
    journeyKey: 'mark',
    stageKeys: ['FORMAL_MARKING'],
    items: [
      { key: 'marking-arbitration', label: '仲裁裁定', routeName: 'TeacherExamWorkspaceMarkingArbitration', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-quality', label: '抽检处理', routeName: 'TeacherExamWorkspaceMarkingQuality', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-quality-monitor', label: '阅卷质量监控', routeName: 'TeacherExamWorkspaceMarkingQualityMonitor', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-audit-trail', label: '批改审计', routeName: 'TeacherExamWorkspaceMarkingAuditTrail', markStageKey: 'FORMAL_MARKING' },
    ],
  },
  {
    key: 'publish',
    title: '成绩发布',
    journeyKey: 'publish',
    stageKeys: ['SCORE_PUBLISH'],
    items: [
      { key: 'score-summary', label: '成绩确认', routeName: 'TeacherExamWorkspaceScoreSummary', markStageKey: 'SCORE_PUBLISH' },
      { key: 'score-release', label: '成绩发布', routeName: 'TeacherExamWorkspaceScoreRelease', markStageKey: 'SCORE_PUBLISH' },
      { key: 'score-absence', label: '缺考确认', routeName: 'TeacherExamWorkspaceScoreAbsence', markStageKey: 'SCORE_PUBLISH' },
      { key: 'score-appeal', label: '复核申诉', routeName: 'TeacherExamWorkspaceScoreAppeal', markStageKey: 'SCORE_PUBLISH' },
    ],
  },
  {
    key: 'archive',
    title: '归档',
    journeyKey: 'archive',
    stageKeys: ['ARCHIVE'],
    items: [
      { key: 'archive-package', label: '归档列表', routeName: 'TeacherExamWorkspaceArchivePackage', markStageKey: 'ARCHIVE' },
      { key: 'archive-statistics', label: '成绩统计', routeName: 'TeacherExamWorkspaceArchiveStatistics', markStageKey: 'ARCHIVE' },
      { key: 'archive-grading-experience', label: '阅卷经验库', routeName: 'TeacherExamWorkspaceGradingExperience', markStageKey: 'ARCHIVE' },
      { key: 'archive-exports', label: '导出任务', routeName: 'TeacherExamWorkspaceArchiveExports', markStageKey: 'ARCHIVE' },
      { key: 'archive-teaching-affairs', label: '教务同步', routeName: 'TeacherExamWorkspaceArchiveTeachingAffairs', markStageKey: 'ARCHIVE' },
    ],
  },
]

/** 详情子路由高亮回退到所属菜单项 */
export const EXAM_WORKSPACE_MENU_ROUTE_FALLBACK: Record<string, string> = {
  TeacherExamWorkspaceMarkingOrgDetail: 'marking-org',
  TeacherExamWorkspaceMarkingOrgSessions: 'marking-org',
  TeacherExamWorkspaceMarkingTaskDetail: 'marking-pool',
  TeacherExamWorkspaceReviewWorkspace: 'marking-review',
  TeacherExamWorkspaceReviewTaskDetail: 'marking-review',
}

const MENU_ITEM_BY_ROUTE = new Map<string, ExamWorkspaceMenuItem>()
for (const group of EXAM_WORKSPACE_MENU_GROUPS) {
  for (const item of group.items) {
    MENU_ITEM_BY_ROUTE.set(item.routeName, item)
  }
}

export function getMenuGroupsForJourney(journeyKey: ExamWorkspaceJourneyKey): ExamWorkspaceMenuGroup[] {
  if (journeyKey === 'overview') {
    return EXAM_WORKSPACE_MENU_GROUPS.filter((group) => group.journeyKey === 'overview')
  }
  return EXAM_WORKSPACE_MENU_GROUPS.filter((group) => group.journeyKey === journeyKey)
}

export function resolveExamWorkspaceMenuKey(routeName: string | undefined): string {
  if (!routeName) {
    return 'overview'
  }
  const direct = MENU_ITEM_BY_ROUTE.get(routeName)
  if (direct) {
    return direct.key
  }
  const fallbackKey = EXAM_WORKSPACE_MENU_ROUTE_FALLBACK[routeName]
  if (fallbackKey) {
    return fallbackKey
  }
  return 'overview'
}

export function findExamWorkspaceMenuItem(menuKey: string): ExamWorkspaceMenuItem | undefined {
  for (const group of EXAM_WORKSPACE_MENU_GROUPS) {
    const item = group.items.find((entry) => entry.key === menuKey)
    if (item) {
      return item
    }
  }
  return undefined
}

/** 所有菜单项 key，供侧栏图标映射使用 */
export type ExamWorkspaceMenuKey = typeof EXAM_WORKSPACE_MENU_GROUPS[number]['items'][number]['key']
