import type {
  PortfolioArchiveAuditFlowBindingVO,
  PortfolioArchiveAuditFlowBindRequest,
  PortfolioArchiveCategoryDeleteRequest,
  PortfolioArchiveCategoryListRequest,
  PortfolioArchiveCategorySaveRequest,
  PortfolioArchiveCategoryTreeNodeVO,
  PortfolioArchiveFieldDefSaveRequest,
  PortfolioArchiveFieldDefVO,
  PortfolioArchiveFieldDeleteRequest,
  PortfolioArchiveFieldListRequest,
  PortfolioArchivePublishedFieldsRequest,
  PortfolioArchivePublishedFieldsVO,
  PortfolioArchiveTemplateChangeLogVO,
  PortfolioArchiveTemplateSeedResultVO,
  PortfolioArchiveTemplateVersionVO,
  PortfolioArchiveVersionActionRequest,
  PortfolioArchiveVersionMutationRequest,
} from '@/apis/portfolio/types'
import http from '@/config/axios'

const BASE = '/api/portfolio/archive-template'

export const portfolioArchiveTemplateApi = {
  listCategoryTree: (data?: PortfolioArchiveCategoryListRequest) =>
    http.post<PortfolioArchiveCategoryTreeNodeVO[]>(`${BASE}/category/list`, data ?? {}),
  saveCategory: (data: PortfolioArchiveCategorySaveRequest) =>
    http.post<string>(`${BASE}/category/save`, data),
  deleteCategory: (data: PortfolioArchiveCategoryDeleteRequest) =>
    http.post<void>(`${BASE}/category/delete`, data),
  listFieldDefs: (data: PortfolioArchiveFieldListRequest) =>
    http.post<PortfolioArchiveFieldDefVO[]>(`${BASE}/field/list`, data),
  saveFieldDef: (data: PortfolioArchiveFieldDefSaveRequest) =>
    http.post<string>(`${BASE}/field/save`, data),
  deleteFieldDef: (data: PortfolioArchiveFieldDeleteRequest) =>
    http.post<void>(`${BASE}/field/delete`, data),
  saveDraftVersion: (data: PortfolioArchiveVersionActionRequest) =>
    http.post<string>(`${BASE}/version/save-draft`, data),
  trialVersion: (data: PortfolioArchiveVersionMutationRequest) =>
    http.post<void>(`${BASE}/version/trial`, data),
  publishVersion: (data: PortfolioArchiveVersionMutationRequest) =>
    http.post<void>(`${BASE}/version/publish`, data),
  deprecateVersion: (data: PortfolioArchiveVersionMutationRequest) =>
    http.post<void>(`${BASE}/version/deprecate`, data),
  listVersionHistory: (data: PortfolioArchiveVersionActionRequest) =>
    http.post<PortfolioArchiveTemplateVersionVO[]>(`${BASE}/history/list`, data),
  listChangeHistory: (data: PortfolioArchiveVersionActionRequest) =>
    http.post<PortfolioArchiveTemplateChangeLogVO[]>(`${BASE}/history/change-log`, data),
  listPublishedFields: (data: PortfolioArchivePublishedFieldsRequest) =>
    http.post<PortfolioArchivePublishedFieldsVO>(`${BASE}/published/fields`, data),
  seedDefaultTemplates: () =>
    http.post<PortfolioArchiveTemplateSeedResultVO>(`${BASE}/seed/defaults`, {}),
  bindAuditFlow: (data: PortfolioArchiveAuditFlowBindRequest) =>
    http.post<void>(`${BASE}/audit-flow/bind`, data),
  getAuditFlowBinding: (data: PortfolioArchiveVersionActionRequest) =>
    http.post<PortfolioArchiveAuditFlowBindingVO | null>(`${BASE}/audit-flow/get`, data),
}
