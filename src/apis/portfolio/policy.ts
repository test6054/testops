import type { PageResult } from '@/types'
import type { PortfolioPolicyDocumentStatusCode } from '@/types/enums/portfolio-policy-document-status-enum'
import type { PortfolioPolicyLevelCode } from '@/types/enums/portfolio-policy-level-enum'
import http from '@/config/axios'

export interface PortfolioPolicyDocumentVO {
  id: string
  rootDocumentId: string
  versionNo: number
  documentCode: string
  documentTitle: string
  policyLevel: PortfolioPolicyLevelCode
  topicCategory: string
  publishOrg?: string
  publishDate: string
  effectiveDate?: string
  expireDate?: string
  documentStatus: PortfolioPolicyDocumentStatusCode
  supersededById?: string
  attachmentFileId?: string
  beyondTenYearRemark?: string
  createTime: string
  updateTime?: string
  statusVersion: number
  policyHash?: string
}

export interface PortfolioPolicyDocumentSearchVO {
  id: string
  documentCode: string
  documentTitle: string
  policyLevel: PortfolioPolicyLevelCode
  topicCategory: string
  documentStatus: PortfolioPolicyDocumentStatusCode
  publishOrg?: string
  publishDate?: string
  versionNo?: number
  snippet: string
}

export interface PortfolioPolicyDocumentDetailVO {
  document: PortfolioPolicyDocumentVO
  fullTextContent: string
  versionHistory: PortfolioPolicyDocumentVO[]
  mappings: PortfolioPolicyIndicatorMappingVO[]
  policyHash?: string
  mappingHash?: string
}

export interface PortfolioPolicyDocumentPreviewVO {
  id: string
  documentTitle: string
  documentCode: string
  policyLevel: PortfolioPolicyLevelCode
  topicCategory: string
  publishOrg?: string
  publishDate?: string
  versionNo?: number
  documentStatus: PortfolioPolicyDocumentStatusCode
  contentDigest?: string
  fullTextContent: string
  attachmentFileId?: string
}

export interface PortfolioPolicyIndicatorMappingVO {
  id: string
  policyDocumentId: string
  clauseCode: string
  clauseTitle: string
  indicatorCode: string
  materialRequirement?: string
}

export interface PortfolioPolicyMappingSaveResultVO {
  mappings: PortfolioPolicyIndicatorMappingVO[]
  mappingHash: string
  policyHash: string
  statusVersion: number
}

export interface PortfolioPolicyPublishDryRunVO {
  documentId: string
  statusVersion: number
  policyHash: string
  mappingHash: string
  mappingCount: number
  indicatorCodes: string[]
  referencedSceneCodes: string[]
  demoteEffectiveCount: number
  canPublish: boolean
  blockReason?: string
}

export interface PortfolioPolicyDocumentDownloadVO {
  id: string
  documentTitle: string
  documentCode: string
  attachmentFileId?: string
  auditLogId: string
}

export interface PortfolioPolicyTextDiffHunkVO {
  changeType: 'EQUAL' | 'DELETE' | 'INSERT'
  leftLineNo?: number
  rightLineNo?: number
  text: string
}

export interface PortfolioPolicyDocumentCompareVO {
  leftDocument: PortfolioPolicyDocumentVO
  rightDocument: PortfolioPolicyDocumentVO
  leftFullText: string
  rightFullText: string
  changedLineCount: number
  hunks: PortfolioPolicyTextDiffHunkVO[]
}

export const portfolioPolicyApi = {
  save: (data: {
    id?: string
    documentCode: string
    documentTitle: string
    policyLevel: PortfolioPolicyLevelCode
    topicCategory: string
    publishOrg?: string
    publishDate: string
    effectiveDate?: string
    expireDate?: string
    fullTextContent: string
    attachmentFileId?: string
    beyondTenYearRemark?: string
    statusVersion?: number
  }) => http.post<PortfolioPolicyDocumentVO>('/api/portfolio/policy-document/save', data),
  publishDryRun: (data: { id: string }) =>
    http.post<PortfolioPolicyPublishDryRunVO>('/api/portfolio/policy-document/publish/dry-run', data),
  publish: (data: { id: string, statusVersion: number }) =>
    http.post<PortfolioPolicyDocumentVO>('/api/portfolio/policy-document/publish', data),
  page: (data: {
    pageNum: number
    pageSize: number
    policyLevel?: PortfolioPolicyLevelCode
    topicCategory?: string
    documentStatus?: PortfolioPolicyDocumentStatusCode
    documentCode?: string
    documentTitle?: string
    includeHistory?: boolean
  }) =>
    http.post<PageResult<PortfolioPolicyDocumentVO>>('/api/portfolio/policy-document/page', data),
  get: (data: { id: string }) =>
    http.post<PortfolioPolicyDocumentDetailVO>('/api/portfolio/policy-document/get', data),
  search: (data: {
    pageNum: number
    pageSize: number
    keyword: string
    includeHistory?: boolean
  }) =>
    http.post<PageResult<PortfolioPolicyDocumentSearchVO>>(
      '/api/portfolio/policy-document/search',
      data,
    ),
  preview: (data: { id: string }) =>
    http.post<PortfolioPolicyDocumentPreviewVO>('/api/portfolio/policy-document/preview', data),
  download: (data: { id: string }) =>
    http.post<PortfolioPolicyDocumentDownloadVO>('/api/portfolio/policy-document/download', data),
  supersede: (data: {
    sourceDocumentId: string
    documentCode: string
    documentTitle: string
    policyLevel: PortfolioPolicyLevelCode
    topicCategory: string
    publishOrg?: string
    publishDate: string
    effectiveDate?: string
    expireDate?: string
    fullTextContent: string
    attachmentFileId?: string
    beyondTenYearRemark?: string
  }) => http.post<PortfolioPolicyDocumentVO>('/api/portfolio/policy-document/supersede', data),
  saveMapping: (data: {
    policyDocumentId: string
    statusVersion: number
    mappings: Array<{
      clauseCode: string
      clauseTitle: string
      indicatorCode: string
      materialRequirement?: string
    }>
  }) =>
    http.post<PortfolioPolicyMappingSaveResultVO>(
      '/api/portfolio/policy-document/mapping/save',
      data,
    ),
  compare: (data: { leftDocumentId: string, rightDocumentId: string }) =>
    http.post<PortfolioPolicyDocumentCompareVO>('/api/portfolio/policy-document/compare', data),
}
