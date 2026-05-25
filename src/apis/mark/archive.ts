/**
 * 考后归档 API - 对接 edu-mark 模块 ExamArchiveController
 *
 * 主链：
 *   1. createArchive 创建草稿（DRAFT）
 *   2. packageArchive 入队 PACKAGING+QUEUED，由后端异步执行器分阶段更新进度
 *   3. listArchives / getArchiveDetail 用于列表与轮询
 *   4. requestAppraisal / appraise 走鉴定决议流（保留延期 / 销毁待审）
 *   5. requestDestruction / approveDestruction / executeDestruction 走销毁审批与执行流
 */
import http from '@/config/axios'

// ─── 状态枚举与文案 ───────────────────────────────────────────

/** 归档包状态编码 - 对应后端 ArchivePackageStatus */
export type ArchivePackageStatusCode
  = | 'DRAFT'
    | 'PACKAGING'
    | 'PACKAGING_FAILED'
    | 'STORED'
    | 'ACTIVE'
    | 'APPRAISAL_PENDING'
    | 'APPRAISAL_DECIDED'
    | 'DESTRUCTION_PENDING'
    | 'DESTRUCTION_APPROVED'
    | 'DESTRUCTION_EXECUTING'
    | 'DESTRUCTION_FAILED'
    | 'DESTROYED'

export const ARCHIVE_STATUS_LABEL: Record<ArchivePackageStatusCode, string> = {
  DRAFT: '草稿',
  PACKAGING: '打包中',
  PACKAGING_FAILED: '打包失败',
  STORED: '已落地',
  ACTIVE: '保管中',
  APPRAISAL_PENDING: '鉴定待办',
  APPRAISAL_DECIDED: '鉴定完成',
  DESTRUCTION_PENDING: '销毁待审',
  DESTRUCTION_APPROVED: '销毁通过',
  DESTRUCTION_EXECUTING: '销毁执行中',
  DESTRUCTION_FAILED: '销毁执行失败',
  DESTROYED: '已销毁',
}

export const ARCHIVE_STATUS_TONE: Record<
  ArchivePackageStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  DRAFT: 'gray',
  PACKAGING: 'blue',
  PACKAGING_FAILED: 'red',
  STORED: 'blue',
  ACTIVE: 'green',
  APPRAISAL_PENDING: 'orange',
  APPRAISAL_DECIDED: 'purple',
  DESTRUCTION_PENDING: 'orange',
  DESTRUCTION_APPROVED: 'purple',
  DESTRUCTION_EXECUTING: 'orange',
  DESTRUCTION_FAILED: 'red',
  DESTROYED: 'red',
}

/** 异步打包阶段编码 */
export type ArchivePackagingPhase
  = | 'QUEUED'
    | 'AGGREGATING'
    | 'WRITING_ZIP'
    | 'UPLOADING_PARTS'
    | 'FINALIZING'
    | 'COMPLETED'
    | 'FAILED'

export const ARCHIVE_PHASE_LABEL: Record<ArchivePackagingPhase, string> = {
  QUEUED: '已入队',
  AGGREGATING: '聚合归档物料',
  WRITING_ZIP: '生成 ZIP',
  UPLOADING_PARTS: '分片上传',
  FINALIZING: '收尾落地',
  COMPLETED: '完成',
  FAILED: '失败',
}

/** 鉴定决议编码 */
export type ArchiveAppraisalDecisionCode = 'RETAIN' | 'DESTROY'

export const ARCHIVE_APPRAISAL_LABEL: Record<ArchiveAppraisalDecisionCode, string> = {
  RETAIN: '继续保留',
  DESTROY: '可销毁',
}

/** 销毁审批决议编码 */
export type ArchiveDestructionDecisionCode = 'APPROVED' | 'REJECTED'

export const ARCHIVE_DESTRUCTION_LABEL: Record<ArchiveDestructionDecisionCode, string> = {
  APPROVED: '通过',
  REJECTED: '驳回',
}

// ─── 请求 / 响应载荷 ───────────────────────────────────────────

/** 归档包创建请求 - 对应 ArchiveCreateRequest */
export interface ArchiveCreatePayload {
  examId: string
  archiveTitle?: string
  retentionYears?: number
  permanentRetention?: boolean
  includeOriginalScans?: boolean
  includeMarkedSlices?: boolean
  includeAnswerBooklet?: boolean
}

/** 归档包查询请求 - 对应 ArchiveQueryRequest */
export interface ArchiveQueryPayload {
  examId?: string
  archiveStatus?: ArchivePackageStatusCode
}

/** 鉴定决议请求 - 对应 ArchiveAppraisalRequest */
export interface ArchiveAppraisalPayload {
  archiveId: string
  decision: ArchiveAppraisalDecisionCode
  remark?: string
  /** 仅 RETAIN 决议生效：延长保管年限 */
  retentionExtensionYears?: number
  /** 仅 RETAIN 决议生效：是否调整为永久保管 */
  permanentRetention?: boolean
}

/** 销毁申请请求 - 对应 ArchiveDestructionRequest */
export interface ArchiveDestructionPayload {
  archiveId: string
  reason: string
}

/** 销毁审批请求 - 对应 ArchiveDestructionApprovalRequest */
export interface ArchiveDestructionApprovalPayload {
  archiveId: string
  decision: ArchiveDestructionDecisionCode
  remark?: string
}

/** 归档包响应 - 对应 ArchivePackageResponse */
export interface ArchivePackageVO {
  archiveId: string
  examId: string
  archiveNo: string
  archiveTitle: string
  archiveStatus: ArchivePackageStatusCode
  archiveStatusMessage: string
  retentionYears?: number
  retentionUntil?: string
  permanentRetention?: boolean
  includeOriginalScans?: boolean
  includeMarkedSlices?: boolean
  includeAnswerBooklet?: boolean
  archiveFileId?: string
  archiveFileName?: string
  archiveFileSize?: number
  archiveChecksum?: string
  itemCount?: number
  originalScanCount?: number
  markedSliceCount?: number
  answerBookletCount?: number
  packagingStartedTime?: string
  packagingCompletedTime?: string
  packagingDiagnostic?: string
  packagingPhase?: ArchivePackagingPhase
  packagingProgressPercent?: number
  packagingProgressMessage?: string
  packagingUploadId?: string
  appraisalRequestedTime?: string
  appraisalRequestedUserId?: string
  appraisalDecidedTime?: string
  appraisalDecidedUserId?: string
  appraisalDecision?: ArchiveAppraisalDecisionCode
  appraisalRemark?: string
  destructionRequestedTime?: string
  destructionRequestedUserId?: string
  destructionRequestReason?: string
  destructionApprovalTime?: string
  destructionApprovalUserId?: string
  destructionApprovalDecision?: ArchiveDestructionDecisionCode
  destructionApprovalRemark?: string
  destroyedTime?: string
  destroyedUserId?: string
  destroyedSummary?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

/** 归档清单项响应 - 对应 ArchiveItemResponse */
export interface ArchiveItemVO {
  itemId: string
  itemCategory?: string
  itemCategoryMessage?: string
  sourceEntityType?: string
  sourceEntityId?: string
  sourceFileId?: string
  relativePath: string
  fileSize?: number
  fileChecksum?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  questionTemplateId?: string
  questionNo?: string
  pageSeq?: number
  diagnostic?: string
}

/** 归档事件响应 - 对应 ArchiveEventResponse */
export interface ArchiveEventVO {
  eventId: string
  eventType?: string
  eventTypeMessage?: string
  eventTime?: string
  operatorId?: string
  operatorRole?: string
  reason?: string
  payload?: string
  traceId?: string
}

/** 归档详情响应 - 对应 ArchiveDetailResponse */
export interface ArchiveDetailVO {
  archive: ArchivePackageVO
  items: ArchiveItemVO[]
  events: ArchiveEventVO[]
}

// ─── API 调用 ──────────────────────────────────────────────────

/**
 * 创建归档包草稿
 * POST /api/mark/exams/archive/create
 */
export function createArchive(payload: ArchiveCreatePayload): Promise<string> {
  return http.post<string>('/api/mark/exams/archive/create', payload)
}

/**
 * 触发归档打包（异步入队）
 * POST /api/mark/exams/archive/package
 */
export function packageArchive(archiveId: string): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/package', { archiveId })
}

/**
 * 查询归档包列表
 * POST /api/mark/exams/archive/list
 */
export function listArchives(payload: ArchiveQueryPayload): Promise<ArchivePackageVO[]> {
  return http.post<ArchivePackageVO[]>('/api/mark/exams/archive/list', payload)
}

/**
 * 查询归档包详情（含 items + events）
 * POST /api/mark/exams/archive/detail
 */
export function getArchiveDetail(archiveId: string): Promise<ArchiveDetailVO> {
  return http.post<ArchiveDetailVO>('/api/mark/exams/archive/detail', { archiveId })
}

/**
 * 申请档案鉴定
 * POST /api/mark/exams/archive/request-appraisal
 */
export function requestAppraisal(archiveId: string): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/request-appraisal', { archiveId })
}

/**
 * 提交鉴定决议
 * POST /api/mark/exams/archive/appraise
 */
export function appraiseArchive(payload: ArchiveAppraisalPayload): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/appraise', payload)
}

/**
 * 申请销毁
 * POST /api/mark/exams/archive/request-destruction
 */
export function requestDestruction(payload: ArchiveDestructionPayload): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/request-destruction', payload)
}

/**
 * 审批销毁申请
 * POST /api/mark/exams/archive/approve-destruction
 */
export function approveDestruction(
  payload: ArchiveDestructionApprovalPayload,
): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/approve-destruction', payload)
}

/**
 * 执行物理销毁
 * POST /api/mark/exams/archive/execute-destruction
 */
export function executeDestruction(archiveId: string): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/execute-destruction', { archiveId })
}
