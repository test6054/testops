import http from '@/config/axios'

const BASE = '/api/quality/workbench'

export type ObeJourneyStepStatus = 'pending' | 'active' | 'completed'

export type ObeJourneyStepKey
  = | 'config'
    | 'plan'
    | 'data'
    | 'calc'
    | 'audit'
    | 'improve'
    | 'archive'

export interface ObeJourneyStepVO {
  stepKey: ObeJourneyStepKey
  title: string
  status: ObeJourneyStepStatus
  routeName?: string
  primaryCount?: number
}

export interface ObeJourneySummaryVO {
  programId?: string
  trainingPlanId?: string
  confirmationStatus?: string
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
  semester?: string
}

export const workbenchApi = {
  obeJourneySummary(request: ObeJourneySummaryRequest): Promise<ObeJourneySummaryVO> {
    return http.post<ObeJourneySummaryVO>(`${BASE}/obe-journey-summary`, request)
  },
}
