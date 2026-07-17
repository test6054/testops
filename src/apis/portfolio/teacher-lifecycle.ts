import http from '@/config/axios'

/** 教师生命周期状态 */
export type PortfolioTeacherLifecycleStatusCode
  = | 'ACTIVE'
    | 'SEALED'
    | 'TRANSFER_FROZEN'
    | 'TRANSFERRED'
    | 'TEMP_HOLD'

/** 教师生命周期变更类型 */
export type PortfolioTeacherLifecycleChangeTypeCode
  = | 'LEFT'
    | 'RETIRED'
    | 'TRANSFERRED_OUT'
    | 'STUDY_LEAVE'
    | 'SECONDMENT'
    | 'LONG_SICK_LEAVE'
    | 'REHIRED'
    | 'RESUME_FROM_HOLD'
    | 'EXPORT_COMPLETED'

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

export const PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL: Record<
  PortfolioTeacherLifecycleStatusCode,
  string
> = {
  ACTIVE: '在职',
  SEALED: '封存',
  TRANSFER_FROZEN: '迁出冻结',
  TRANSFERRED: '已迁出',
  TEMP_HOLD: '暂挂',
}

export const PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS: Array<{
  value: PortfolioTeacherLifecycleChangeTypeCode
  label: string
  from: PortfolioTeacherLifecycleStatusCode[]
}> = [
  { value: 'LEFT', label: '离职（封存）', from: ['ACTIVE'] },
  { value: 'RETIRED', label: '退休（封存）', from: ['ACTIVE'] },
  { value: 'TRANSFERRED_OUT', label: '调出（迁出冻结）', from: ['ACTIVE'] },
  { value: 'STUDY_LEAVE', label: '访学（暂挂）', from: ['ACTIVE'] },
  { value: 'SECONDMENT', label: '挂职（暂挂）', from: ['ACTIVE'] },
  { value: 'LONG_SICK_LEAVE', label: '长期病假（暂挂）', from: ['ACTIVE'] },
  { value: 'REHIRED', label: '返聘（恢复在职）', from: ['SEALED'] },
  { value: 'RESUME_FROM_HOLD', label: '暂挂恢复在职', from: ['TEMP_HOLD'] },
]

export interface PortfolioTeacherLifecycleEventPageRequest {
  pageNum?: number
  pageSize?: number
  teacherUserId?: string | number
  changeType?: PortfolioTeacherLifecycleChangeTypeCode
  departmentId?: string | number
  approvalStatus?: PortfolioTeacherLifecycleApprovalStatusCode
}

export type PortfolioTeacherLifecycleSourceTypeCode = 'MANUAL' | 'HR_SYNC' | 'SELF_DECLARE'
export type PortfolioTeacherLifecycleApprovalStatusCode = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED'

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
