import type { ExamJourneyKey } from '@/constants/exam-journey'

/** 工作流阻断严重级别 - 对应后端 WorkflowBlockingSeverity */
export type BlockingSeverity = 'PREREQUISITE' | 'HARD_BLOCK'

/** 工作流阻断项编码 - 与 edu-mark WorkflowBlockingItemCode 逐值同步 */
export const WorkflowBlockingItemCode = {
  MARKING_ORG_DRAFT: 'MARKING_ORG_DRAFT',
  SCAN_BIND_REQUIRED: 'SCAN_BIND_REQUIRED',
  SCAN_BATCH_MISSING: 'SCAN_BATCH_MISSING',
  PENDING_REVIEW_ITEMS: 'PENDING_REVIEW_ITEMS',
  TRIAL_CALIBRATION_REQUIRED: 'TRIAL_CALIBRATION_REQUIRED',
  EXPERIENCE_ASSIST_BASELINE_NOT_LOCKED: 'EXPERIENCE_ASSIST_BASELINE_NOT_LOCKED',
  EXPERIENCE_ASSIST_BINDING_INCOMPLETE: 'EXPERIENCE_ASSIST_BINDING_INCOMPLETE',
  EXPERIENCE_ASSIST_SUBJECTIVE_CATALOG_EMPTY: 'EXPERIENCE_ASSIST_SUBJECTIVE_CATALOG_EMPTY',
  TENANT_EXPERIENCE_ASSIST_DISABLED: 'TENANT_EXPERIENCE_ASSIST_DISABLED',
  EXPERIENCE_ASSIST_EXAM_POLICY_DISABLED: 'EXPERIENCE_ASSIST_EXAM_POLICY_DISABLED',
  FORMAL_SESSION_EXISTS: 'FORMAL_SESSION_EXISTS',
  GROUP_POLICY_MISSING: 'GROUP_POLICY_MISSING',
  GROUP_REVIEWER_MISSING: 'GROUP_REVIEWER_MISSING',
  SLICE_MISSING: 'SLICE_MISSING',
  LAYOUT_SCOPE_ERROR: 'LAYOUT_SCOPE_ERROR',
  SCORE_NOT_PUBLISHED: 'SCORE_NOT_PUBLISHED',
  ROSTER_ATTENDANCE_UNRECONCILED: 'ROSTER_ATTENDANCE_UNRECONCILED',
  PENDING_ABSENCE_CONFIRMATION: 'PENDING_ABSENCE_CONFIRMATION',
  ABSENCE_SCORE_POLICY_UNRESOLVED: 'ABSENCE_SCORE_POLICY_UNRESOLVED',
  PAPER_BINDING_UNRESOLVED: 'PAPER_BINDING_UNRESOLVED',
  REVIEW_WINDOW_NOT_CLOSED: 'REVIEW_WINDOW_NOT_CLOSED',
  GRADE_REVIEW_UNRESOLVED: 'GRADE_REVIEW_UNRESOLVED',
  EXAM_NOT_CLOSED: 'EXAM_NOT_CLOSED',
  EXAM_NOT_ACTIVE: 'EXAM_NOT_ACTIVE',
  GROUP_CLOSED: 'GROUP_CLOSED',
  GROUP_DRAFT: 'GROUP_DRAFT',
  GROUP_NOT_IN_ORGANIZATION: 'GROUP_NOT_IN_ORGANIZATION',
  ALLOCATION_UNIT_MISMATCH: 'ALLOCATION_UNIT_MISMATCH',
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
  code: WorkflowBlockingItemCodeValue
  message: string
  journeyKey: ExamJourneyKey
  targetRouteName: string
  actionLabel: string
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
