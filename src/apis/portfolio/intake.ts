import type {
  PortfolioArchiveRecordFieldInput,
  PortfolioMaterialIntakeStartResultVO,
  PortfolioMaterialIntakeStatusVO,
  PortfolioMaterialReassignCategoryResultVO,
  PortfolioMaterialType,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const INTAKE_BASE = '/api/portfolio/material/intake'

export interface PortfolioMaterialIntakeStartRequest {
  teacherId?: string
  materialId?: string
  categoryId?: string
  fileNodeId?: string
  materialTitle?: string
  materialType?: PortfolioMaterialType
  submitAi?: boolean
  demoMode?: boolean
  frozenProviderChain?: string
  scanFileNodeId?: string
}

export interface PortfolioMaterialIntakeGetStatusRequest {
  teacherId?: string
  materialId?: string
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

export const portfolioIntakeApi = {
  start: (data: PortfolioMaterialIntakeStartRequest) =>
    http.post<PortfolioMaterialIntakeStartResultVO>(`${INTAKE_BASE}/start`, data),
  getStatus: (data: PortfolioMaterialIntakeGetStatusRequest) =>
    http.post<PortfolioMaterialIntakeStatusVO>(`${INTAKE_BASE}/get-status`, data),
  saveDraft: (data: PortfolioMaterialIntakeSaveDraftRequest) =>
    http.post<PortfolioMaterialIntakeStatusVO>(`${INTAKE_BASE}/save-draft`, data),
  submit: (data: PortfolioMaterialIntakeSubmitRequest) =>
    http.post<PortfolioMaterialIntakeStatusVO>(`${INTAKE_BASE}/submit`, data),
  getProviderChain: () =>
    http.post<{ providerChain: string }>(`${INTAKE_BASE}/provider-chain/get`, {}),
  reassignCategory: (data: PortfolioMaterialReassignCategoryRequest) =>
    http.post<PortfolioMaterialReassignCategoryResultVO>(
      '/api/portfolio/material/reassign-category',
      data,
    ),
}
