import type { MarkStageKey } from '@/stores/modules/markStage'

export interface ExamWorkspaceMenuItem {
  key: string
  label: string
  routeName: string
  markStageKey: MarkStageKey
}

/** 考试工作台侧栏分组：仅作信息架构分组，不做前端角色过滤；权限与数据由后端控制 */
export interface ExamWorkspaceMenuSection {
  key: string
  title: string
  markStageKey: MarkStageKey
  items: ExamWorkspaceMenuItem[]
}

export const EXAM_WORKSPACE_MENU_SECTIONS: ExamWorkspaceMenuSection[] = [
  {
    key: 'overview',
    title: '考试概览',
    markStageKey: 'EXAM_PREP',
    items: [
      { key: 'overview', label: '考试概览', routeName: 'TeacherExamWorkspaceOverview', markStageKey: 'EXAM_PREP' },
    ],
  },
  {
    key: 'prep',
    title: '考试准备',
    markStageKey: 'EXAM_PREP',
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
    markStageKey: 'SCAN',
    items: [
      { key: 'scan-batches', label: '录入与批次', routeName: 'TeacherExamWorkspaceScanBatches', markStageKey: 'SCAN' },
      { key: 'scan-monitor', label: '扫描监控', routeName: 'TeacherExamWorkspaceScanMonitor', markStageKey: 'SCAN' },
      { key: 'scan-ledger', label: '影像账本', routeName: 'TeacherExamWorkspaceScanLedger', markStageKey: 'SCAN' },
      { key: 'scan-devices', label: '扫描设备', routeName: 'TeacherExamWorkspaceScanDevices', markStageKey: 'SCAN' },
      { key: 'scan-ocr', label: 'OCR 配置', routeName: 'TeacherExamWorkspaceScanOcr', markStageKey: 'SCAN' },
    ],
  },
  {
    key: 'marking',
    title: '阅卷批阅',
    markStageKey: 'FORMAL_MARKING',
    items: [
      { key: 'marking-org', label: '阅卷安排', routeName: 'TeacherExamWorkspaceMarkingOrg', markStageKey: 'MARKING_ORG' },
      { key: 'marking-assignment', label: '分派方案', routeName: 'TeacherExamWorkspaceReviewAssignment', markStageKey: 'MARKING_ORG' },
      { key: 'trial-pool', label: '试评任务池', routeName: 'TeacherExamWorkspaceTrialTaskPool', markStageKey: 'TRIAL_MARKING' },
      { key: 'trial-progress', label: '试评进度', routeName: 'TeacherExamWorkspaceTrialProgress', markStageKey: 'TRIAL_MARKING' },
      { key: 'marking-pool', label: '阅卷任务池', routeName: 'TeacherExamWorkspaceMarkingTaskPool', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-progress', label: '进度看板', routeName: 'TeacherExamWorkspaceMarkingProgress', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-arbitration', label: '仲裁裁定', routeName: 'TeacherExamWorkspaceMarkingArbitration', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-quality', label: '抽检处理', routeName: 'TeacherExamWorkspaceMarkingQuality', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-review', label: 'OCR/AI 复核', routeName: 'TeacherExamWorkspaceMarkingReview', markStageKey: 'FORMAL_MARKING' },
      { key: 'marking-review-batch', label: '批量复核确认', routeName: 'TeacherExamWorkspaceReviewBatchConfirm', markStageKey: 'FORMAL_MARKING' },
    ],
  },
  {
    key: 'post-exam',
    title: '成绩归档',
    markStageKey: 'ARCHIVE',
    items: [
      { key: 'score-summary', label: '成绩确认', routeName: 'TeacherExamWorkspaceScoreSummary', markStageKey: 'SCORE_PUBLISH' },
      { key: 'score-release', label: '成绩发布', routeName: 'TeacherExamWorkspaceScoreRelease', markStageKey: 'SCORE_PUBLISH' },
      { key: 'score-absence', label: '缺考确认', routeName: 'TeacherExamWorkspaceScoreAbsence', markStageKey: 'SCORE_PUBLISH' },
      { key: 'score-appeal', label: '复核申诉', routeName: 'TeacherExamWorkspaceScoreAppeal', markStageKey: 'SCORE_PUBLISH' },
      { key: 'archive-package', label: '归档列表', routeName: 'TeacherExamWorkspaceArchivePackage', markStageKey: 'ARCHIVE' },
      { key: 'archive-statistics', label: '成绩统计', routeName: 'TeacherExamWorkspaceArchiveStatistics', markStageKey: 'ARCHIVE' },
      { key: 'archive-grading-experience', label: '阅卷经验库', routeName: 'TeacherExamWorkspaceGradingExperience', markStageKey: 'ARCHIVE' },
      { key: 'archive-exports', label: '导出任务', routeName: 'TeacherExamWorkspaceArchiveExports', markStageKey: 'ARCHIVE' },
    ],
  },
]

/** 详情子路由高亮回退到所属菜单项 */
export const EXAM_WORKSPACE_MENU_ROUTE_FALLBACK: Record<string, string> = {
  TeacherExamWorkspaceMarkingTaskDetail: 'marking-pool',
  TeacherExamWorkspaceReviewWorkspace: 'marking-review',
  TeacherExamWorkspaceReviewTaskDetail: 'marking-review',
}

const MENU_ITEM_BY_ROUTE = new Map<string, ExamWorkspaceMenuItem>()
for (const section of EXAM_WORKSPACE_MENU_SECTIONS) {
  for (const item of section.items) {
    MENU_ITEM_BY_ROUTE.set(item.routeName, item)
  }
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
  for (const section of EXAM_WORKSPACE_MENU_SECTIONS) {
    const item = section.items.find((entry) => entry.key === menuKey)
    if (item) {
      return item
    }
  }
  return undefined
}
