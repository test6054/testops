import type { PortfolioTeacherLifecycleApprovalStatusCode } from '@/types/enums/portfolio-teacher-lifecycle-approval-status-enum'
import type { PortfolioTeacherLifecycleSourceTypeCode } from '@/types/enums/portfolio-teacher-lifecycle-source-type-enum'
import http from '@/config/axios'
import { PortfolioTeacherLifecycleChangeTypeCode } from '@/types/enums/portfolio-teacher-lifecycle-change-type-enum'
import {
  PortfolioTeacherLifecycleStatusCode,
  PortfolioTeacherLifecycleStatusDescription,
} from '@/types/enums/portfolio-teacher-lifecycle-status-enum'

export { PortfolioTeacherLifecycleApprovalStatusCode } from '@/types/enums/portfolio-teacher-lifecycle-approval-status-enum'
export { PortfolioTeacherLifecycleChangeTypeCode } from '@/types/enums/portfolio-teacher-lifecycle-change-type-enum'
export { PortfolioTeacherLifecycleSourceTypeCode } from '@/types/enums/portfolio-teacher-lifecycle-source-type-enum'
export {
  PortfolioTeacherLifecycleStatusCode,
  PortfolioTeacherLifecycleStatusDescription,
} from '@/types/enums/portfolio-teacher-lifecycle-status-enum'

export interface PortfolioTeacherLifecycleApplyRequest {
  teacherUserId: string | number
  changeType: PortfolioTeacherLifecycleChangeTypeCode
  effectiveTime?: string
  reasonText?: string
}

export interface PortfolioTeacherLifecycleGetRequest {
  teacherUserId: string | number
}

export interface PortfolioTeacherLifecycleExportRequest {
  teacherUserId: string | number
  /** 导出用途（必填，写入强审计） */
  exportPurpose: string
}

export interface PortfolioTeacherLifecycleStateVO {
  teacherUserId: string | number
  lifecycleStatus: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  changeType?: PortfolioTeacherLifecycleChangeTypeCode
  changeTypeLabel?: string
  effectiveTime?: string
  reasonText?: string
  archiveWriteForbidden?: boolean
  evaluationHeld?: boolean
}

export interface PortfolioTeacherLifecycleTransferExportVO {
  teacherUserId: string | number
  fileName?: string
  fileNodeId?: string | number
  officialRecordCount?: number
  attachmentCount?: number
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  exportedAt?: string
}


export interface PortfolioTeacherLifecycleImportRequest {
  targetTeacherUserId: string | number
  fileNodeId: string | number
}

export interface PortfolioTeacherLifecycleTransferImportVO {
  targetTeacherUserId?: string | number
  sourceFileNodeId?: string | number
  officialRecordCount?: number
  materialCount?: number
  attachmentCount?: number
  idempotentHit?: boolean
  importLogId?: string | number
  importedAt?: string
}

const BASE = '/api/portfolio/teacher-lifecycle'

export const portfolioTeacherLifecycleApi = {
  apply: (data: PortfolioTeacherLifecycleApplyRequest) =>
    http.post<PortfolioTeacherLifecycleStateVO>(`${BASE}/apply`, data),
  get: (data: PortfolioTeacherLifecycleGetRequest) =>
    http.post<PortfolioTeacherLifecycleStateVO>(`${BASE}/get`, data),
  exportTransferPackage: (data: PortfolioTeacherLifecycleExportRequest) =>
    http.post<PortfolioTeacherLifecycleTransferExportVO>(`${BASE}/export-transfer-package`, data),
  importTransferPackage: (data: PortfolioTeacherLifecycleImportRequest) =>
    http.post<PortfolioTeacherLifecycleTransferImportVO>(`${BASE}/import-transfer-package`, data),
  pageEvents: (data: PortfolioTeacherLifecycleEventPageRequest) =>
    http.post<PortfolioPageResult<PortfolioTeacherLifecycleEventVO>>(`${BASE}/event/page`, data),
  listSnapshots: (data: PortfolioTeacherLifecycleSnapshotListRequest) =>
    http.post<PortfolioTeacherLifecycleSnapshotVO[]>(`${BASE}/snapshot/list`, data),
  selfDeclare: (data: PortfolioTeacherLifecycleApplyRequest) =>
    http.post<PortfolioTeacherLifecycleEventVO>(`${BASE}/self-declare`, data),
  approveDeclare: (data: PortfolioTeacherLifecycleDeclareDecisionRequest) =>
    http.post<PortfolioTeacherLifecycleStateVO>(`${BASE}/approve-declare`, data),
  rejectDeclare: (data: PortfolioTeacherLifecycleDeclareDecisionRequest) =>
    http.post<PortfolioTeacherLifecycleEventVO>(`${BASE}/reject-declare`, data),
}

export const PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL = PortfolioTeacherLifecycleStatusDescription

export const PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS: Array<{
  value: PortfolioTeacherLifecycleChangeTypeCode
  label: string
  from: PortfolioTeacherLifecycleStatusCode[]
}> = [
  { value: PortfolioTeacherLifecycleChangeTypeCode.LEFT, label: '离职（封存）', from: [PortfolioTeacherLifecycleStatusCode.ACTIVE] },
  { value: PortfolioTeacherLifecycleChangeTypeCode.RETIRED, label: '退休（封存）', from: [PortfolioTeacherLifecycleStatusCode.ACTIVE] },
  { value: PortfolioTeacherLifecycleChangeTypeCode.TRANSFERRED_OUT, label: '调出（迁出冻结）', from: [PortfolioTeacherLifecycleStatusCode.ACTIVE] },
  { value: PortfolioTeacherLifecycleChangeTypeCode.STUDY_LEAVE, label: '访学（暂挂）', from: [PortfolioTeacherLifecycleStatusCode.ACTIVE] },
  { value: PortfolioTeacherLifecycleChangeTypeCode.SECONDMENT, label: '挂职（暂挂）', from: [PortfolioTeacherLifecycleStatusCode.ACTIVE] },
  { value: PortfolioTeacherLifecycleChangeTypeCode.LONG_SICK_LEAVE, label: '长期病假（暂挂）', from: [PortfolioTeacherLifecycleStatusCode.ACTIVE] },
  { value: PortfolioTeacherLifecycleChangeTypeCode.REHIRED, label: '返聘（恢复在职）', from: [PortfolioTeacherLifecycleStatusCode.SEALED] },
  { value: PortfolioTeacherLifecycleChangeTypeCode.RESUME_FROM_HOLD, label: '暂挂恢复在职', from: [PortfolioTeacherLifecycleStatusCode.TEMP_HOLD] },
]

export interface PortfolioTeacherLifecycleEventPageRequest {
  pageNum?: number
  pageSize?: number
  teacherUserId?: string | number
  changeType?: PortfolioTeacherLifecycleChangeTypeCode
  departmentId?: string | number
  approvalStatus?: PortfolioTeacherLifecycleApprovalStatusCode
}

export interface PortfolioTeacherLifecycleDeclareDecisionRequest {
  eventId: string | number
  approvalComment?: string
}

export interface PortfolioTeacherLifecycleEventVO {
  id?: string | number
  teacherUserId?: string | number
  fromStatus?: PortfolioTeacherLifecycleStatusCode
  fromStatusLabel?: string
  toStatus?: PortfolioTeacherLifecycleStatusCode
  toStatusLabel?: string
  changeType?: PortfolioTeacherLifecycleChangeTypeCode
  changeTypeLabel?: string
  effectiveTime?: string
  reasonText?: string
  createTime?: string
  sourceType?: PortfolioTeacherLifecycleSourceTypeCode
  sourceTypeLabel?: string
  approvalStatus?: PortfolioTeacherLifecycleApprovalStatusCode
  approvalStatusLabel?: string
  approvedBy?: string | number
  approvedTime?: string
  approvalComment?: string
}

export interface PortfolioTeacherLifecycleSnapshotListRequest {
  teacherUserId: string | number
}

export interface PortfolioTeacherLifecycleSnapshotVO {
  id?: string | number
  teacherUserId?: string | number
  eventId?: string | number
  fromStatus?: PortfolioTeacherLifecycleStatusCode
  toStatus?: PortfolioTeacherLifecycleStatusCode
  changeType?: PortfolioTeacherLifecycleChangeTypeCode
  changeTypeLabel?: string
  beforeMetricsJson?: string
  afterMetricsJson?: string
  createTime?: string
}

export interface PortfolioPageResult<T> {
  list: T[]
  total: number
  pageNum?: number
  pageSize?: number
}
