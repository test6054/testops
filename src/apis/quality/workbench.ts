import type { ExternalDataSourceQueryRequest } from './external-data-source'
import type { ExternalPullTaskQueryRequest } from './external-pull-task'
import type { ConfirmationStatusCode } from './types'
import type { ObeJourneyStepKeyCode } from '@/types/enums/obe-journey-step-key-enum'
import type { ObeJourneyStepStatusCode } from '@/types/enums/obe-journey-step-status-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

const BASE = '/api/quality/workbench'

export interface ObeJourneyStepVO {
  stepKey: ObeJourneyStepKeyCode
  title: string
  status: ObeJourneyStepStatusCode
  routeName?: string
  primaryCount?: number
}

export interface ObeJourneySummaryVO {
  programId?: string
  trainingPlanId?: string
  confirmationStatus?: ConfirmationStatusCode
  achievementTotal?: number
  achievementCalculated?: number
  achievementSubmitted?: number
  achievementConfirmed?: number
  achievementArchived?: number
  achievementNotAchieved?: number
  improvementTotal?: number
  improvementOpen?: number
  improvementInProgress?: number
  improvementSubmitted?: number
  improvementClosed?: number
  scoreBatchCount?: number
  aiTaskTotal?: number
  aiTaskPending?: number
  aiTaskProcessing?: number
  aiTaskSucceeded?: number
  aiTaskFailed?: number
  steps: ObeJourneyStepVO[]
}

export interface ObeJourneySummaryRequest {
  trainingPlanId: string
  schoolYear?: string
  semester?: SemesterCode
}

export interface ImprovementWorkbenchSignalSummaryVO {
  improvementTotal: number
  improvementInProgressCount: number
  improvementSubmittedCount: number
  overdueCount: number
  dueSoonCount: number
  openIssueCount: number
  activeRectificationCount: number
  supervisionWarningCount: number
}

export interface ImprovementWorkbenchSignalSummaryRequest {
  programId?: string
  trainingPlanId?: string
}

export interface ProcessEvaluationSignalSummaryVO {
  nodeTotal: number
  nodeDraftCount: number
  nodeSubmittedCount: number
  nodeConfirmedCount: number
  nodeReturnedCount: number
  weightSum?: number
  avgCoverageRequired?: number
  recordTotal: number
  recordDraftCount: number
  recordSubmittedCount: number
  recordConfirmedCount: number
  recordReturnedCount: number
}

export interface ProcessEvaluationSignalSummaryRequest {
  qualityCourseId: string
  nodeId?: string
}

export interface TrainingPlanWorkbenchSignalSummaryVO {
  planConfirmationStatus?: ConfirmationStatusCode
  objectiveTotal: number
  requirementTotal: number
  indicatorTotal: number
  objectiveHealthyCount: number
  requirementHealthyCount: number
  standardMappingTotal: number
}

export interface TrainingPlanWorkbenchSignalSummaryRequest {
  trainingPlanId: string
}

export interface ExternalPullWorkbenchSignalSummaryVO {
  sourceTotalCount: number
  sourceEnabledCount: number
  taskTotalCount: number
  taskRunningCount: number
  taskSucceededCount: number
  taskFailedCount: number
  taskPendingCount: number
}

export interface ExternalPullWorkbenchSignalSummaryRequest {
  sourceQuery?: ExternalDataSourceQueryRequest
  taskQuery?: ExternalPullTaskQueryRequest
}

export interface QualityCourseMatrixSignalSummaryVO {
  courseGoalTotal: number
  courseGoalCoveredCount: number
  requirementTotal: number
  requirementCoveredCount: number
  indicatorTotal: number
  indicatorCoveredCount: number
  assessmentItemTotal: number
  assessmentItemWeightedCount: number
  assessmentItemHealthyCount: number
  courseGoalWeightedCount: number
  courseGoalHealthyCount: number
}

export interface QualityCourseMatrixSignalSummaryRequest {
  qualityCourseId: string
}

export interface IndirectEvaluationWorkbenchSignalSummaryVO {
  formTotal: number
  formEnabledCount: number
  itemTotal: number
  submissionCount: number
  expectedSample: number
  receivedResponseCount: number
  expectedResponseCount: number
  pendingConversionCount: number
  responseValidCount: number
  responsePendingCount: number
  responseInvalidCount: number
  itemPendingConversionCount?: number
  itemConvertedCount?: number
  itemNoSubstantiveCount?: number
  completionRate?: number
  collectionRate?: number
}

export interface IndirectEvaluationWorkbenchSignalSummaryRequest {
  trainingPlanId?: string
  programId?: string
  itemId?: string
}

export const workbenchApi = {
  obeJourneySummary(request: ObeJourneySummaryRequest): Promise<ObeJourneySummaryVO> {
    return http.post<ObeJourneySummaryVO>(`${BASE}/obe-journey-summary`, request)
  },
  improvementSignalSummary(
    request: ImprovementWorkbenchSignalSummaryRequest,
  ): Promise<ImprovementWorkbenchSignalSummaryVO> {
    return http.post<ImprovementWorkbenchSignalSummaryVO>(
      `${BASE}/improvement-workbench/signal-summary`,
      request,
    )
  },
  processEvaluationSignalSummary(
    request: ProcessEvaluationSignalSummaryRequest,
  ): Promise<ProcessEvaluationSignalSummaryVO> {
    return http.post<ProcessEvaluationSignalSummaryVO>(
      `${BASE}/process-evaluation/signal-summary`,
      request,
    )
  },
  trainingPlanWorkbenchSignalSummary(
    request: TrainingPlanWorkbenchSignalSummaryRequest,
  ): Promise<TrainingPlanWorkbenchSignalSummaryVO> {
    return http.post<TrainingPlanWorkbenchSignalSummaryVO>(
      `${BASE}/training-plan-workbench/signal-summary`,
      request,
    )
  },
  externalPullSignalSummary(
    request: ExternalPullWorkbenchSignalSummaryRequest,
  ): Promise<ExternalPullWorkbenchSignalSummaryVO> {
    return http.post<ExternalPullWorkbenchSignalSummaryVO>(
      `${BASE}/external-pull/signal-summary`,
      request,
    )
  },
  qualityCourseMatrixSignalSummary(
    request: QualityCourseMatrixSignalSummaryRequest,
  ): Promise<QualityCourseMatrixSignalSummaryVO> {
    return http.post<QualityCourseMatrixSignalSummaryVO>(
      `${BASE}/quality-course-matrix/signal-summary`,
      request,
    )
  },
  indirectEvaluationSignalSummary(
    request: IndirectEvaluationWorkbenchSignalSummaryRequest,
  ): Promise<IndirectEvaluationWorkbenchSignalSummaryVO> {
    return http.post<IndirectEvaluationWorkbenchSignalSummaryVO>(
      `${BASE}/indirect-evaluation/signal-summary`,
      request,
    )
  },
}
