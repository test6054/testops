import type { PortfolioComplianceAlertLevelCode } from '@/types/enums/portfolio-compliance-alert-level-enum'
import type { PortfolioComplianceAlertTypeCode } from '@/types/enums/portfolio-compliance-alert-type-enum'
import type { PortfolioComplianceCompareDirectionCode } from '@/types/enums/portfolio-compliance-compare-direction-enum'
import type { PortfolioComplianceMetricStatusCode } from '@/types/enums/portfolio-compliance-metric-status-enum'
import type { PortfolioComplianceScopeTypeCode } from '@/types/enums/portfolio-compliance-scope-type-enum'
import http from '@/config/axios'

export interface PortfolioComplianceThresholdVO {
  id: string
  metricCode: PortfolioComplianceAlertTypeCode
  scopeType: PortfolioComplianceScopeTypeCode
  departmentId?: string
  targetValue: string
  yellowThreshold: string
  redThreshold: string
  compareDirection: PortfolioComplianceCompareDirectionCode
  denominatorBasisValue?: string
  counselorRatioStandard?: number
  enabled: boolean
  updateTime: string
}

export interface PortfolioComplianceMetricVO {
  metricCode: PortfolioComplianceAlertTypeCode
  scopeType: PortfolioComplianceScopeTypeCode
  departmentId?: string
  numeratorValue?: string
  denominatorValue?: string
  metricValue?: string
  targetValue?: string
  yellowThreshold?: string
  redThreshold?: string
  metricStatus: PortfolioComplianceMetricStatusCode
  alertLevel?: PortfolioComplianceAlertLevelCode
  summaryText: string
  computedTime?: string
}

/** 指标定义目录 - PortfolioComplianceMetricDefinitionVO */
export interface PortfolioComplianceMetricDefinitionVO {
  metricCode: PortfolioComplianceAlertTypeCode
  metricLabel: string
  compareDirection: PortfolioComplianceCompareDirectionCode
  unitLabel: string
  valueMin: string
  valueMax: string
  suggestedRangeHint: string
  requiresDenominatorBasis: boolean
  requiresCounselorRatioStandard: boolean
}

export interface PortfolioComplianceThresholdSaveRequest {
  id?: string
  metricCode: PortfolioComplianceAlertTypeCode
  scopeType: PortfolioComplianceScopeTypeCode
  departmentId?: string
  targetValue: string
  yellowThreshold: string
  redThreshold: string
  compareDirection: PortfolioComplianceCompareDirectionCode
  denominatorBasisValue?: string
  counselorRatioStandard?: number
  enabled: boolean
}

export const portfolioComplianceApi = {
  listThreshold: (data?: {
    scopeType?: PortfolioComplianceScopeTypeCode
    departmentId?: string
  }) => http.post<PortfolioComplianceThresholdVO[]>('/api/portfolio/compliance/threshold/list', data ?? {}),

  saveThreshold: (data: PortfolioComplianceThresholdSaveRequest) =>
    http.post<string>('/api/portfolio/compliance/threshold/save', data),

  deleteThreshold: (data: { id: string }) =>
    http.post<void>('/api/portfolio/compliance/threshold/delete', data),

  listMetricDefinitions: () =>
    http.post<PortfolioComplianceMetricDefinitionVO[]>(
      '/api/portfolio/compliance/metric/definitions',
      {},
    ),

  getMetrics: (data: {
    scopeType?: PortfolioComplianceScopeTypeCode
    departmentId?: string
    refresh?: boolean
  }) => http.post<PortfolioComplianceMetricVO[]>('/api/portfolio/compliance/metric/get', data),

  recompute: (data: {
    scopeType?: PortfolioComplianceScopeTypeCode
    departmentId?: string
  }) =>
    http.post<PortfolioComplianceMetricVO[]>('/api/portfolio/compliance/metric/recompute', {
      ...data,
      refresh: true,
    }),
}

export type { PortfolioComplianceMetricStatusCode }
