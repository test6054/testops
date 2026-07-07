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
  improvementTotal?: number
  improvementClosed?: number
  scoreBatchCount?: number
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
}
