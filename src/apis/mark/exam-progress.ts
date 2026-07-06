import type { ExamStatusCode } from './exam'
import type { ReviewTaskStatusCode } from './exam-review-task'
import type { FinalScoreRiskOverviewVO } from './exam-score'
import type { FormalSessionVO, TrialSessionVO } from './marking-organization'
/**
 * 阅卷考试进度与工作台阶段快照 API - 对接 /api/mark/exams/marking-progress 与 workbench-stage-snapshot。
 */
import type { QuestionTypeCode } from './question-type'
import type { MarkTeacherDashboardPendingTodoItemVO } from './teacher-dashboard'
import type { WorkbenchNextActionKeyCode } from '@/types/enums/exam-workbench-next-action-key-enum'
import type { ExamWorkbenchStageKeyCode } from '@/types/enums/exam-workbench-stage-key-enum'
import type { WorkbenchStageStatusCode } from '@/types/enums/exam-workbench-stage-status-enum'
import http from '@/config/axios'

export {
  ALL_WORKBENCH_NEXT_ACTION_KEY_CODES,
  WorkbenchNextActionKeyCode,
  WorkbenchNextActionKeyDescription,
} from '@/types/enums/exam-workbench-next-action-key-enum'

/** 阅卷进度响应 - 对应 MarkingProgressResponse */
export interface MarkingProgressVO {
  examId: string
  /** 试卷数量（含未绑定 / 冲突 / 已绑定的全部扫描卷面） */
  paperCount: number
  /** 可阅卷试卷数（bindingStatus = BOUND，完成率分母真源） */
  gradablePaperCount: number
  questionCount: number
  /** 应批阅题目总数 = gradablePaperCount × questionCount，已排除缺考 / 未绑定 / 冲突卷 */
  totalQuestionGradeCount: number
  confirmedQuestionGradeCount: number
  pendingReviewTaskCount: number
  inProgressReviewTaskCount: number
  openProcessingTaskCount: number
  scanAttentionCount: number
  /** 待教师复核的批改结果数（grade_status = NEED_REVIEW） */
  needReviewGradeResultCount: number
  reviewTaskStatusSummaryList: ReviewTaskStatusSummaryVO[]
  reviewQuestionProgressList: ReviewQuestionProgressItemVO[]
}

/** 复核任务状态汇总项 - 对应 ReviewTaskStatusSummaryResponse */
export interface ReviewTaskStatusSummaryVO {
  statusCode: ReviewTaskStatusCode
  taskCount: number
}

/** 按题目聚合的复核进度项 - 对应 ReviewQuestionProgressItemResponse */
export interface ReviewQuestionProgressItemVO {
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  totalTaskCount: number
  pendingTaskCount: number
  inProgressTaskCount: number
  approvedTaskCount: number
  rejectedTaskCount: number
}

export {
  ALL_EXAM_WORKBENCH_STAGE_KEY_CODES,
  ExamWorkbenchStageKeyCode,
  ExamWorkbenchStageKeyDescription,
} from '@/types/enums/exam-workbench-stage-key-enum'

export {
  ALL_WORKBENCH_STAGE_STATUS_CODES,
  WorkbenchStageStatusCode,
  WorkbenchStageStatusDescription,
} from '@/types/enums/exam-workbench-stage-status-enum'

/** 考试工作台阶段项 - 对应 ExamWorkbenchStageItemResponse */
export interface ExamWorkbenchStageItemVO {
  key: ExamWorkbenchStageKeyCode
  title: string
  status: WorkbenchStageStatusCode
  hint?: string
}

/** 考试工作台准备步骤 - 对应 ExamWorkbenchPrepStepResponse */
export interface ExamWorkbenchPrepStepVO {
  key: string
  title: string
  status: WorkbenchStageStatusCode
  statusText: string
  advisoryReason?: string
}

/** 工作台下一步动作 - 对应 ExamWorkbenchNextActionResponse */
export interface WorkbenchNextActionVO {
  actionKey: WorkbenchNextActionKeyCode
  label: string
  enabled: boolean
  disabledReason?: string
  targetStageKey: ExamWorkbenchStageKeyCode
}

/** 阅卷任务状态汇总 - 对应 ExamWorkbenchMarkingTaskSummaryResponse */
export interface WorkbenchMarkingTaskSummaryVO {
  totalTaskCount: number
  finalizedTaskCount: number
  pendingTaskCount: number
  recycledTaskCount: number
}

/** 快速统计 - 对应 ExamWorkbenchQuickStatsResponse */
export interface WorkbenchQuickStatsVO {
  reviewerCount: number
  groupCount: number
  recycledTaskCount: number
  arbitrationPendingCount: number
  spotCheckPendingCount: number
}

/** 质量概览条 - 对应 ExamWorkbenchQualityOverviewItemResponse */
export interface WorkbenchQualityOverviewItemVO {
  reviewerUserId: string
  reviewerDisplayName: string
  consistencyRate: number
}

/** 考试级质量汇总 - 对应 ExamWorkbenchQualitySummaryResponse */
export interface WorkbenchQualitySummaryVO {
  /** 考试级评阅一致性率；抽检证据不足时为 null */
  examConsistencyRate: number | null
  consistencyReviewerCount: number
  reviewerNormalRate: number | null
  spotCheckPassRate: number | null
  markingCompletionRate: number | null
  markingSpeedScore: number | null
  taskRetentionRate: number | null
  spotCheckCompletedCount: number
  spotCheckAbnormalCount: number
}

/** 质量雷达维度项 - 对应 ExamWorkbenchQualityDimensionItemResponse */
export interface WorkbenchQualityDimensionItemVO {
  dimensionCode: string
  dimensionLabel: string
  score: number | null
}

/** 考试质量看板面板 - 对应 ExamWorkbenchQualityPanelResponse */
export interface WorkbenchQualityPanelVO {
  examId: string
  qualitySummary: WorkbenchQualitySummaryVO
  qualityOverviewItems: WorkbenchQualityOverviewItemVO[]
  qualityDimensionItems: WorkbenchQualityDimensionItemVO[]
  openSpotCheckCount: number
  arbitrationPendingCount: number
  reviewerWarningCount: number
  reviewerSuspendedCount: number
}

/** 概览仪表盘面板 - 对应 ExamWorkbenchDashboardPanelResponse */
export interface WorkbenchDashboardPanelVO {
  pendingTodos: MarkTeacherDashboardPendingTodoItemVO[]
  markingTaskSummary: WorkbenchMarkingTaskSummaryVO
  quickStats: WorkbenchQuickStatsVO
  qualityOverviewItems: WorkbenchQualityOverviewItemVO[]
  qualitySummary: WorkbenchQualitySummaryVO
  qualityDimensionItems: WorkbenchQualityDimensionItemVO[]
}

/** 考试工作台阶段快照 - 对应 ExamWorkbenchStageSnapshotResponse */
export interface WorkbenchStageSnapshotVO {
  examId: string
  examName: string
  examNo: string
  examStatus: ExamStatusCode
  suggestedStageKey: ExamWorkbenchStageKeyCode
  stages: ExamWorkbenchStageItemVO[]
  prepSteps: ExamWorkbenchPrepStepVO[]
  prepAdvisoryReasons: string[]
  prepBlockingReasons: string[]
  /** 试评阶段经验辅助定标阻断原因 */
  experienceAssistBlockingReasons: string[]
  markingProgress: MarkingProgressVO
  markingOrgConfigured: boolean
  trialSessionActive: boolean
  formalSessionActive: boolean
  archiveClosed: boolean
  /** 涉密 / 统考涉密场次 */
  confidential?: boolean
  nextActions: WorkbenchNextActionVO[]
  dashboardPanel: WorkbenchDashboardPanelVO
}

/** 批量阅卷进度响应 */
export interface MarkingProgressBatchVO {
  items: MarkingProgressVO[]
}

/** 查询考试工作台阶段快照。 */
export function getWorkbenchStageSnapshot(examId: string): Promise<WorkbenchStageSnapshotVO> {
  return http.post<WorkbenchStageSnapshotVO>('/api/mark/exams/workbench-stage-snapshot', { examId })
}

/** 查询阅卷进度。 */
export function getMarkingProgress(examId: string): Promise<MarkingProgressVO> {
  return http.post<MarkingProgressVO>('/api/mark/exams/marking-progress', { examId })
}

/** 批量查询阅卷进度（考试工作台列表聚合，一次请求）。 */
export async function batchGetMarkingProgress(examIds: string[]): Promise<MarkingProgressVO[]> {
  const response = await http.post<MarkingProgressBatchVO>(
    '/api/mark/exams/marking-progress/batch',
    { examIds },
  )
  return response.items
}

/** 阅卷进度看板面板 - 对应 ExamWorkbenchMarkingProgressPanelResponse */
export interface WorkbenchMarkingProgressPanelVO {
  examId: string
  organizationId?: string
  markingOrgConfigured: boolean
  markingTaskSummary: WorkbenchMarkingTaskSummaryVO
  formalSessions: FormalSessionVO[]
  trialSessions: TrialSessionVO[]
}

/** 查询阅卷进度看板（正评 / 试评进度页真源）。 */
export function getMarkingProgressPanel(examId: string): Promise<WorkbenchMarkingProgressPanelVO> {
  return http.post<WorkbenchMarkingProgressPanelVO>('/api/mark/exams/marking-progress-panel', {
    examId,
  })
}

/** 查询考试质量看板（质控页考试级 Signal 真源）。 */
export function getQualityPanel(examId: string): Promise<WorkbenchQualityPanelVO> {
  return http.post<WorkbenchQualityPanelVO>('/api/mark/exams/quality-panel', { examId })
}

/** 考生名册看板面板 - 对应 ExamWorkbenchCandidateRosterPanelResponse */
export interface WorkbenchCandidateRosterPanelVO {
  examId: string
  totalCount: number
  activeCount: number
  absentCount: number
  classCount: number
  attendanceRate: number | null
}

/** 查询考生名册看板（名册页 Signal 真源）。 */
export function getCandidateRosterPanel(examId: string): Promise<WorkbenchCandidateRosterPanelVO> {
  return http.post<WorkbenchCandidateRosterPanelVO>('/api/mark/exams/candidate-roster-panel', {
    examId,
  })
}

/** 印刷包看板面板 - 对应 ExamWorkbenchPrintPackagePanelResponse */
export interface WorkbenchPrintPackagePanelVO {
  examId: string
  candidateCount: number
  packageCount: number
  generatedPackageCount: number
  totalItemCount: number
  printPackageReady: boolean
  coverageRate: number | null
}

/** 查询印刷包看板（印刷包页 Signal 真源）。 */
export function getPrintPackagePanel(examId: string): Promise<WorkbenchPrintPackagePanelVO> {
  return http.post<WorkbenchPrintPackagePanelVO>('/api/mark/exams/print-package-panel', { examId })
}

/** 成绩看板面板 - 对应 ExamWorkbenchScorePanelResponse */
export interface WorkbenchScorePanelVO {
  examId: string
  riskOverview: FinalScoreRiskOverviewVO
  absentCount: number
  distributionAvailable: boolean
  participantCount?: number
  avgScore?: number
  passRate?: number
  stdDev?: number
  maxScore?: number
  minScore?: number
  medianScore?: number
  excellentRate?: number
  ranges?: string[]
  counts?: number[]
}

/** 查询考试成绩看板（成绩确认 / 发布页 Signal 真源）。 */
export function getScorePanel(examId: string): Promise<WorkbenchScorePanelVO> {
  return http.post<WorkbenchScorePanelVO>('/api/mark/exams/score-panel', { examId })
}

/** 扫描监控看板面板 - 对应 ExamWorkbenchScanMonitorPanelResponse */
export interface WorkbenchScanMonitorPanelVO {
  examId: string
  batchTotal: number
  settledBatchCount: number
  inProgressCount: number
  blockedCount: number
  scannedPageCount: number
  boundPaperCount: number
  missingCandidateCount: number
  duplicatePageCount: number
  attentionCount: number
  orphanPendingEventCount: number
}

/** 查询扫描监控看板（扫描监控页 Signal 真源）。 */
export function getScanMonitorPanel(examId: string): Promise<WorkbenchScanMonitorPanelVO> {
  return http.post<WorkbenchScanMonitorPanelVO>('/api/mark/exams/scan-monitor-panel', { examId })
}
