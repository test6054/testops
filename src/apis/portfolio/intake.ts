import type {
  PortfolioArchiveRecordFieldInput,
  PortfolioMaterialIntakeStartResultVO,
  PortfolioMaterialIntakeStatusVO,
  PortfolioMaterialReassignCategoryResultVO,
  PortfolioMaterialTypeCode,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const INTAKE_BASE = '/api/portfolio/material/intake'

export interface PortfolioMaterialIntakeStartRequest {
  teacherId?: string
  materialId?: string
  categoryId?: string
  fileNodeId?: string
  materialTitle?: string
  materialType?: PortfolioMaterialTypeCode
  submitAi?: boolean
  demoMode?: boolean
  frozenProviderChain?: string
}

export interface PortfolioMaterialIntakeGetStatusRequest {
  teacherId?: string
  materialId?: string
  aiTaskId?: string
  demoMode?: boolean
}

export interface PortfolioMaterialIntakeSaveDraftRequest {
  teacherId?: string
  materialId: string
  recordId?: string
  categoryId: string
  fields: PortfolioArchiveRecordFieldInput[]
  demoMode?: boolean
}

export interface PortfolioMaterialIntakeSubmitRequest {
  teacherId?: string
  materialId: string
  recordId?: string
  categoryId: string
  fields: PortfolioArchiveRecordFieldInput[]
  demoMode?: boolean
}

export interface PortfolioMaterialReassignCategoryRequest {
  teacherId?: string
  materialId: string
  targetCategoryId: string
}

export interface PortfolioMaterialIntakeProviderChainVO {
  providerChain?: string
}

export interface PortfolioMaterialIntakeRestartRejectedRequest {
  teacherId?: string
  materialId: string
}

export const portfolioIntakeApi = {
  start: (data: PortfolioMaterialIntakeStartRequest) =>
    http.post<PortfolioMaterialIntakeStartResultVO>(`${INTAKE_BASE}/start`, data),
  getStatus: (data: PortfolioMaterialIntakeGetStatusRequest) =>
    http.post<PortfolioMaterialIntakeStatusVO>(`${INTAKE_BASE}/get-status`, data),
  saveDraft: (data: PortfolioMaterialIntakeSaveDraftRequest) =>
    http.post<PortfolioMaterialIntakeStatusVO>(`${INTAKE_BASE}/save-draft`, data),
  submit: (data: PortfolioMaterialIntakeSubmitRequest) =>
    http.post<PortfolioMaterialIntakeStatusVO>(`${INTAKE_BASE}/submit`, data),
  restartRejected: (data: PortfolioMaterialIntakeRestartRejectedRequest) =>
    http.post<PortfolioMaterialIntakeStatusVO>(`${INTAKE_BASE}/restart-rejected`, data),
  getProviderChain: () =>
    http.post<PortfolioMaterialIntakeProviderChainVO>(`${INTAKE_BASE}/provider-chain/get`, {}),
  reassignCategory: (data: PortfolioMaterialReassignCategoryRequest) =>
    http.post<PortfolioMaterialReassignCategoryResultVO>(
      '/api/portfolio/material/reassign-category',
      data,
    ),
}
