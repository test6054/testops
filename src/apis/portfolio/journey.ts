import type { PortfolioTeacherJourneyStepKeyCode } from '@/types/enums/portfolio-teacher-journey-step-key-enum'
import type { PortfolioTeacherJourneyStepStatusCode } from '@/types/enums/portfolio-teacher-journey-step-status-enum'
import http from '@/config/axios'

export interface PortfolioTeacherJourneySnapshotGetRequest {
  teacherId?: string
}

export interface PortfolioTeacherJourneyStepVO {
  journeyKey: PortfolioTeacherJourneyStepKeyCode
  title: string
  stepStatus: PortfolioTeacherJourneyStepStatusCode
  blockingCount: number
  statusSummary?: string
  nextHint?: string
}

export interface PortfolioTeacherJourneySnapshotVO {
  generatedAt: string
  teacherUserId: string
  currentAcademicYear: string
  templatePublished: boolean
  steps: PortfolioTeacherJourneyStepVO[]
}

export const portfolioTeacherJourneyApi = {
  getSnapshot: (data: PortfolioTeacherJourneySnapshotGetRequest = {}) =>
    http.post<PortfolioTeacherJourneySnapshotVO>(
      '/api/portfolio/teacher/journey/snapshot/get',
      data,
    ),
}
