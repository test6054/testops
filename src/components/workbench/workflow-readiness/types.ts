import type { ExamJourneyKey } from '@/constants/exam-journey'

/** 工作流阻断严重级别 - 对应后端 WorkflowBlockingSeverity */
export type BlockingSeverity = 'PREREQUISITE' | 'HARD_BLOCK'

/** 工作流阻断项编码 - 与 edu-mark WorkflowBlockingItemCode 逐值同步 */
export const WorkflowBlockingItemCode = {
  MARKING_ORG_DRAFT: 'MARKING_ORG_DRAFT',
  SCAN_BIND_REQUIRED: 'SCAN_BIND_REQUIRED',
  SCAN_BATCH_MISSING: 'SCAN_BATCH_MISSING',
  REVIEW_REMAINING: 'REVIEW_REMAINING',
  GROUP_POLICY_MISSING: 'GROUP_POLICY_MISSING',
  GROUP_REVIEWER_MISSING: 'GROUP_REVIEWER_MISSING',
  SLICE_MISSING: 'SLICE_MISSING',
  LAYOUT_SCOPE_ERROR: 'LAYOUT_SCOPE_ERROR',
  SCORE_NOT_PUBLISHED: 'SCORE_NOT_PUBLISHED',
  EXAM_NOT_CLOSED: 'EXAM_NOT_CLOSED',
} as const

export type WorkflowBlockingItemCodeValue
  = (typeof WorkflowBlockingItemCode)[keyof typeof WorkflowBlockingItemCode]

const KNOWN_BLOCKING_CODES = new Set<string>(Object.values(WorkflowBlockingItemCode))

/** 校验 blocking code 是否为已知枚举；未知 code 显式失败。 */
export function isKnownWorkflowBlockingCode(code: string): code is WorkflowBlockingItemCodeValue {
  return KNOWN_BLOCKING_CODES.has(code)
}

/** 工作流阻断项 - 对应后端 WorkflowBlockingItemResponse */
export interface WorkflowBlockingItem {
  code: string
  message: string
  journeyKey: ExamJourneyKey
  targetRouteName: string
  severity: BlockingSeverity
}

export type WorkflowReadinessStepStatus = 'pending' | 'completed' | 'skipped'

export interface WorkflowReadinessStep {
  code: string
  label: string
  status: WorkflowReadinessStepStatus
  description?: string
  actionLabel?: string
  routeName?: string
  routeParams?: Record<string, string>
  routeQuery?: Record<string, string>
}

export interface WorkflowReadinessMetric {
  key: string
  label: string
  value: string | number
}

export interface WorkflowReadinessAction {
  label: string
  routeName: string
  routeParams?: Record<string, string>
  routeQuery?: Record<string, string>
}

export interface WorkflowPrerequisiteEmptyViewModel {
  title: string
  description: string
  steps?: WorkflowReadinessStep[]
  primaryAction?: WorkflowReadinessAction
  secondaryAction?: WorkflowReadinessAction
}

export interface SessionCreateWorkflowViewModel {
  canCreate: boolean
  panelTitle: string
  disabledTooltip?: string
  steps: WorkflowReadinessStep[]
  metrics: WorkflowReadinessMetric[]
  emptyState: WorkflowPrerequisiteEmptyViewModel
}

export interface ArchiveGateWorkflowViewModel {
  panelTitle: string
  steps: WorkflowReadinessStep[]
}
