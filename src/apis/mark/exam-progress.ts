import type { ExamStatusCode } from './exam'
import type { ReviewTaskStatusCode } from './exam-review-task'
import type { FinalScoreRiskOverviewResponse } from './exam-score'
/**
 * 阅卷考试进度与工作台阶段快照 API - 对接 /api/mark/exams/marking-progress 与 workbench-stage-snapshot。
 */
import type { QuestionTypeCode } from './question-type'
import type { MarkTeacherDashboardPendingTodoItemVO } from './teacher-dashboard'
import type { PageResult, QueryDto } from '@/types'
import type { ExamScanMonitorSignalActionKeyCode } from '@/types/enums/exam-scan-monitor-signal-action-key-enum'
import type { ExamScanMonitorSignalCode } from '@/types/enums/exam-scan-monitor-signal-code-enum'
import type { ExamScanMonitorSignalToneCode } from '@/types/enums/exam-scan-monitor-signal-tone-enum'
import type { WorkbenchNextActionKeyCode } from '@/types/enums/exam-workbench-next-action-key-enum'
import type { ExamWorkbenchStageKeyCode } from '@/types/enums/exam-workbench-stage-key-enum'
import type { WorkbenchStageStatusCode } from '@/types/enums/exam-workbench-stage-status-enum'
import type { LedgerStatusCode } from '@/types/enums/ledger-status-enum'
import http from '@/config/axios'
import { isExamScanMonitorSignalActionKeyCode } from '@/types/enums/exam-scan-monitor-signal-action-key-enum'
import { isExamScanMonitorSignalCode } from '@/types/enums/exam-scan-monitor-signal-code-enum'
import { isExamScanMonitorSignalToneCode } from '@/types/enums/exam-scan-monitor-signal-tone-enum'
import { ALL_LEDGER_STATUS_CODES } from '@/types/enums/ledger-status-enum'

export {
  ALL_EXAM_SCAN_MONITOR_SIGNAL_ACTION_KEY_CODES,
  ExamScanMonitorSignalActionKeyCode,
  isExamScanMonitorSignalActionKeyCode,
} from '@/types/enums/exam-scan-monitor-signal-action-key-enum'

/** 阅卷进度响应 - 对应 MarkingProgressResponse */
export interface MarkingProgressResponse {
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
  reviewTaskStatusSummaryList: ReviewTaskStatusSummaryResponse[]
}

export interface ReviewQuestionProgressSummaryResponse {
  examId: string
  items: ReviewQuestionProgressItemResponse[]
}

export interface ReviewQuestionProgressPageRequest extends QueryDto {
  examId: string
}

/** 复核任务状态汇总项 - 对应 ReviewTaskStatusSummaryResponse */
export interface ReviewTaskStatusSummaryResponse {
  statusCode: ReviewTaskStatusCode
  taskCount: number
}

/** 按题目聚合的复核进度项 - 对应 ReviewQuestionProgressItemResponse */
export interface ReviewQuestionProgressItemResponse {
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
  ALL_EXAM_SCAN_MONITOR_SIGNAL_CODES,
  ExamScanMonitorSignalCode,
  isExamScanMonitorSignalCode,
} from '@/types/enums/exam-scan-monitor-signal-code-enum'

export {
  ALL_EXAM_SCAN_MONITOR_SIGNAL_TONE_CODES,
  ExamScanMonitorSignalToneCode,
  isExamScanMonitorSignalToneCode,
} from '@/types/enums/exam-scan-monitor-signal-tone-enum'

/** 考试工作台阶段项 - 对应 ExamWorkbenchStageItemResponse */
export interface ExamWorkbenchStageItemResponse {
  key: ExamWorkbenchStageKeyCode
  title: string
  status: WorkbenchStageStatusCode
  hint?: string
}

/** 考试工作台准备步骤 - 对应 ExamWorkbenchPrepStepResponse */
export interface ExamWorkbenchPrepStepResponse {
  key: string
  title: string
  status: WorkbenchStageStatusCode
  statusText: string
  advisoryReason?: string
}

/** 工作台下一步动作 - 对应 ExamWorkbenchNextActionResponse */
export interface ExamWorkbenchNextActionResponse {
  actionKey: WorkbenchNextActionKeyCode
  label: string
  enabled: boolean
  disabledReason?: string
  targetStageKey: ExamWorkbenchStageKeyCode
  /** 可行动时的任务说明条目，首条供任务条主文案 */
  actionPrompts?: string[]
  /** 待办项数量，供任务条角标 */
  pendingItemCount?: number
}

/** 阅卷任务状态汇总 - 对应 ExamWorkbenchMarkingTaskSummaryResponse */
export interface ExamWorkbenchMarkingTaskSummaryResponse {
  totalTaskCount: number
  finalizedTaskCount: number
  pendingTaskCount: number
  recycledTaskCount: number
}

/** 快速统计 - 对应 ExamWorkbenchQuickStatsResponse */
export interface ExamWorkbenchQuickStatsResponse {
  reviewerCount: number
  groupCount: number
  recycledTaskCount: number
  arbitrationPendingCount: number
  spotCheckPendingCount: number
}

/** 质量概览条 - 对应 ExamWorkbenchQualityOverviewItemResponse */
export interface ExamWorkbenchQualityOverviewItemResponse {
  reviewerUserId: string
  reviewerDisplayName: string
  consistencyRate: number
}

/** 考试级质量汇总 - 对应 ExamWorkbenchQualitySummaryResponse */
export interface ExamWorkbenchQualitySummaryResponse {
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
export interface ExamWorkbenchQualityDimensionItemResponse {
  dimensionCode: string
  dimensionLabel: string
  score: number | null
}

/** 考试质量看板面板 - 对应 ExamWorkbenchQualityPanelResponse */
export interface ExamWorkbenchQualityPanelResponse {
  examId: string
  qualitySummary: ExamWorkbenchQualitySummaryResponse
  qualityOverviewItems: ExamWorkbenchQualityOverviewItemResponse[]
  qualityDimensionItems: ExamWorkbenchQualityDimensionItemResponse[]
  openSpotCheckCount: number
  arbitrationPendingCount: number
  reviewerWarningCount: number
  reviewerSuspendedCount: number
}

/** 概览仪表盘面板 - 对应 ExamWorkbenchDashboardPanelResponse */
export interface ExamWorkbenchDashboardPanelResponse {
  pendingTodos: MarkTeacherDashboardPendingTodoItemVO[]
  markingTaskSummary: ExamWorkbenchMarkingTaskSummaryResponse
  quickStats: ExamWorkbenchQuickStatsResponse
  qualityOverviewItems: ExamWorkbenchQualityOverviewItemResponse[]
  qualitySummary: ExamWorkbenchQualitySummaryResponse
  qualityDimensionItems: ExamWorkbenchQualityDimensionItemResponse[]
}

/** 考试工作台阶段快照 - 对应 ExamWorkbenchStageSnapshotResponse */
export interface ExamWorkbenchStageSnapshotResponse {
  examId: string
  examName: string
  examNo: string
  examStatus: ExamStatusCode
  suggestedStageKey: ExamWorkbenchStageKeyCode
  stages: ExamWorkbenchStageItemResponse[]
  prepSteps: ExamWorkbenchPrepStepResponse[]
  prepAdvisoryReasons: string[]
  prepBlockingReasons: string[]
  /** 租户是否启用经验辅助评阅 */
  tenantExperienceAssistEnabled: boolean
  markingProgress: MarkingProgressResponse
  markingOrgConfigured: boolean
  trialSessionActive: boolean
  formalSessionActive: boolean
  archiveClosed: boolean
  /** 涉密 / 统考涉密场次 */
  confidential?: boolean
  nextActions: ExamWorkbenchNextActionResponse[]
  dashboardPanel: ExamWorkbenchDashboardPanelResponse
  /** 是否须人工确认最终成绩 */
  manualFinalScoreConfirmRequired: boolean
  /** 延迟自动确认与撤回窗口（分钟） */
  delayedFinalScoreConfirmMinutes: number
}

/** 批量阅卷进度响应 */
export interface MarkingProgressBatchResponse {
  items: MarkingProgressResponse[]
}

/** 查询考试工作台阶段快照。 */
export function getWorkbenchStageSnapshot(
  examId: string,
): Promise<ExamWorkbenchStageSnapshotResponse> {
  return http.post<ExamWorkbenchStageSnapshotResponse>('/api/mark/exams/workbench-stage-snapshot', {
    examId,
  })
}

/** 查询阅卷进度。 */
export function getMarkingProgress(examId: string): Promise<MarkingProgressResponse> {
  return http.post<MarkingProgressResponse>('/api/mark/exams/marking-progress', { examId })
}

export function pageReviewQuestionProgress(
  request: ReviewQuestionProgressPageRequest,
): Promise<PageResult<ReviewQuestionProgressItemResponse>> {
  return http.post<PageResult<ReviewQuestionProgressItemResponse>>(
    '/api/mark/exams/marking-progress/review-questions/page',
    request,
  )
}

export function getReviewQuestionProgressSummary(
  examId: string,
): Promise<ReviewQuestionProgressSummaryResponse> {
  return http.post<ReviewQuestionProgressSummaryResponse>(
    '/api/mark/exams/marking-progress/review-questions/summary',
    { examId },
  )
}

/** 批量查询阅卷进度（考试工作台列表聚合，一次请求）。 */
export async function batchGetMarkingProgress(
  examIds: string[],
): Promise<MarkingProgressResponse[]> {
  const response = await http.post<MarkingProgressBatchResponse>(
    '/api/mark/exams/marking-progress/batch',
    { examIds },
  )
  return response.items
}

/** 阅卷进度看板面板 - 对应 ExamWorkbenchMarkingProgressPanelResponse */
export interface ExamWorkbenchMarkingProgressPanelResponse {
  examId: string
  organizationId?: string
  markingOrgConfigured: boolean
  markingTaskSummary: ExamWorkbenchMarkingTaskSummaryResponse
}

/** 查询阅卷进度看板（正评 / 试评进度页真源）。 */
export function getMarkingProgressPanel(
  examId: string,
): Promise<ExamWorkbenchMarkingProgressPanelResponse> {
  return http.post<ExamWorkbenchMarkingProgressPanelResponse>(
    '/api/mark/exams/marking-progress-panel',
    {
      examId,
    },
  )
}

/** 查询考试质量看板（质控页考试级 Signal 真源）。 */
export function getQualityPanel(examId: string): Promise<ExamWorkbenchQualityPanelResponse> {
  return http.post<ExamWorkbenchQualityPanelResponse>('/api/mark/exams/quality-panel', { examId })
}

/** 考生名册看板查询 - 对应 ExamWorkbenchCandidateRosterPanelQueryRequest */
export interface ExamWorkbenchCandidateRosterPanelQueryRequest {
  examId: string
  classId?: string
  keyword?: string
}

/** 考生名册看板面板 - 对应 ExamWorkbenchCandidateRosterPanelResponse */
export interface ExamWorkbenchCandidateRosterPanelResponse {
  examId: string
  totalCount: number
  activeCount: number
  absentCount: number
  classCount: number
  attendanceRate: number | null
  notScannedCount: number
  scannedUnboundCount: number
  boundCount: number
  conflictCount: number
  attentionOpenCount: number
  discardedCount: number
  filterScopeApplied: boolean
}

/** 查询考生名册看板（名册页 Signal 与扫描进度 chip 计数真源）。 */
export function getCandidateRosterPanel(
  request: ExamWorkbenchCandidateRosterPanelQueryRequest,
): Promise<ExamWorkbenchCandidateRosterPanelResponse> {
  return http.post<ExamWorkbenchCandidateRosterPanelResponse>(
    '/api/mark/exams/candidate-roster-panel',
    request,
  )
}

/** 印刷包看板面板 - 对应 ExamWorkbenchPrintPackagePanelResponse */
export interface ExamWorkbenchPrintPackagePanelResponse {
  examId: string
  candidateCount: number
  packageCount: number
  generatedPackageCount: number
  totalItemCount: number
  printPackageReady: boolean
  coverageRate: number | null
}

/** 查询印刷包看板（印刷包页 Signal 真源）。 */
export function getPrintPackagePanel(
  examId: string,
): Promise<ExamWorkbenchPrintPackagePanelResponse> {
  return http.post<ExamWorkbenchPrintPackagePanelResponse>('/api/mark/exams/print-package-panel', {
    examId,
  })
}

/** 成绩看板面板 - 对应 ExamWorkbenchScorePanelResponse */
export interface ExamWorkbenchScorePanelResponse {
  examId: string
  riskOverview: FinalScoreRiskOverviewResponse
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
  manualFinalScoreConfirmRequired: boolean
  delayedFinalScoreConfirmMinutes: number
  pendingDelayedFinalScoreConfirmCount: number
  blockedDelayedFinalScoreConfirmCount: number
  /** 制卷未完成等前置阻塞说明；非空时页面内联展示，不弹全局错误 */
  panelBlockedReason?: string
}

/** 查询考试成绩看板（成绩确认 / 发布页 Signal 真源）。 */
export function getScorePanel(examId: string): Promise<ExamWorkbenchScorePanelResponse> {
  return http.post<ExamWorkbenchScorePanelResponse>('/api/mark/exams/score-panel', { examId })
}

export {
  ALL_WORKBENCH_NEXT_ACTION_KEY_CODES,
  WorkbenchNextActionKeyCode,
  WorkbenchNextActionKeyDescription,
} from '@/types/enums/exam-workbench-next-action-key-enum'

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

export {
  ALL_LEDGER_STATUS_CODES,
  LedgerStatusCode,
  LedgerStatusDescription,
} from '@/types/enums/ledger-status-enum'

/** 扫描监控看板面板 - 对应 ExamWorkbenchScanMonitorPanelResponse */
export interface ExamWorkbenchScanMonitorPanelResponse {
  examId: string
  batchTotal: number
  settledBatchCount: number
  inProgressCount: number
  blockedCount: number
  scannedPageCount: number
  expectedPageCount?: number
  boundPaperCount: number
  missingCandidateCount: number
  duplicatePageCount: number
  attentionCount: number
  abnormalAttentionCount: number
  duplicateAttentionCount: number
  orphanPendingEventCount: number
  ledgerStatus?: LedgerStatusCode
  progressPercent?: number | null
  progressDisplay?: string
  diagnostic?: string
  signalCode?: ExamScanMonitorSignalCode
  signalBandTone?: ExamScanMonitorSignalToneCode
  signalBandMessage?: string
  signalActionKey?: ExamScanMonitorSignalActionKeyCode | null
  primaryMetricTone?: ExamScanMonitorSignalToneCode
}

function parseScanMonitorLedgerStatus(value: unknown): LedgerStatusCode | undefined {
  if (value == null || value === '') {
    return undefined
  }
  if (
    typeof value !== 'string'
    || !(ALL_LEDGER_STATUS_CODES as readonly string[]).includes(value)
  ) {
    throw new Error(`枚举合同不同步：ledgerStatus=${String(value)}`)
  }
  return value as LedgerStatusCode
}

function parseScanMonitorSignalCode(value: unknown): ExamScanMonitorSignalCode | undefined {
  if (value == null || value === '') {
    return undefined
  }
  if (typeof value !== 'string' || !isExamScanMonitorSignalCode(value)) {
    throw new Error(`枚举合同不同步：signalCode=${String(value)}`)
  }
  return value
}

function parseScanMonitorSignalTone(value: unknown): ExamScanMonitorSignalToneCode | undefined {
  if (value == null || value === '') {
    return undefined
  }
  if (typeof value !== 'string' || !isExamScanMonitorSignalToneCode(value)) {
    throw new Error(`枚举合同不同步：signalTone=${String(value)}`)
  }
  return value
}

function parseScanMonitorSignalActionKey(
  value: unknown,
): ExamScanMonitorSignalActionKeyCode | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null || value === '') {
    return null
  }
  if (typeof value !== 'string' || !isExamScanMonitorSignalActionKeyCode(value)) {
    throw new Error(`枚举合同不同步：signalActionKey=${String(value)}`)
  }
  return value
}

/** 校验扫描监控看板枚举契约，非空无效枚举值显式失败。 */
export function normalizeScanMonitorPanel(
  panel: ExamWorkbenchScanMonitorPanelResponse,
): ExamWorkbenchScanMonitorPanelResponse {
  return {
    ...panel,
    ledgerStatus: parseScanMonitorLedgerStatus(panel.ledgerStatus),
    signalCode: parseScanMonitorSignalCode(panel.signalCode),
    signalBandTone: parseScanMonitorSignalTone(panel.signalBandTone),
    signalActionKey: parseScanMonitorSignalActionKey(panel.signalActionKey),
    primaryMetricTone: parseScanMonitorSignalTone(panel.primaryMetricTone),
  }
}

/** 查询扫描监控看板（扫描监控页 Signal 真源）。 */
export async function getScanMonitorPanel(
  examId: string,
): Promise<ExamWorkbenchScanMonitorPanelResponse> {
  const panel = await http.post<ExamWorkbenchScanMonitorPanelResponse>(
    '/api/mark/exams/scan-monitor-panel',
    { examId },
  )
  return normalizeScanMonitorPanel(panel)
}

/** 考试扫描监控在线设备 - 对应 ExamScanMonitorDeviceResponse */
export interface ExamScanMonitorDeviceResponse {
  id?: string
  scannerDeviceId: string
  scannerStationId?: string
  scannerIp?: string
  deviceName?: string
  status?: string
  interfaceMode?: string
  endpointOnlineStatus?: string
  endpointMachineCode?: string
  endpointName?: string
  agentVersion?: string
  clientVersion?: string
  scannerConnected?: boolean
  pendingJobCount?: number
  pendingUploadPageCount?: number
  diagnosticStatus?: string
  diagnosticMessage?: string
  lastHeartbeatTime?: string
  location?: string
  activeScanBatchId?: string
  activeScanBatchNo?: string
  activeScanBatchStatus?: import('@/types/enums/scan-batch-status-enum').ScanBatchStatusCode
  activeScanBatchPageCount?: number
  kioskBoundToCurrentExam?: boolean
}

/** 考试扫描监控在线设备列表 - 对应 ExamScanMonitorDeviceListResponse */
export interface ExamScanMonitorDeviceListResponse {
  examId: string
  items: ExamScanMonitorDeviceResponse[]
}

/** 查询与当前考试关联且 Agent 在线的扫描监控设备。 */
export function listExamScanMonitorDevices(
  examId: string,
): Promise<ExamScanMonitorDeviceListResponse> {
  return http.post<ExamScanMonitorDeviceListResponse>('/api/mark/exams/scan-monitor-devices/list', {
    examId,
  })
}
