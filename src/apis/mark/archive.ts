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
import type { PageResult, QueryDto } from '@/types'
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
export interface ArchiveQueryPayload extends QueryDto {
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
  archiveFileSize?: string
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
  fileSize?: string
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
  return http.post<unknown>('/api/mark/exams/archive/package', { archiveId })
    .then(validateArchivePackage)
}

/**
 * 查询归档包列表
 * POST /api/mark/exams/archive/list
 */
export function listArchives(payload: ArchiveQueryPayload): Promise<PageResult<ArchivePackageVO>> {
  return http.post<unknown>('/api/mark/exams/archive/list', payload)
    .then(validateArchivePackagePage)
}

/**
 * 查询归档包详情（含 items + events）
 * POST /api/mark/exams/archive/detail
 */
export function getArchiveDetail(archiveId: string): Promise<ArchiveDetailVO> {
  return http.post<unknown>('/api/mark/exams/archive/detail', { archiveId })
    .then(validateArchiveDetail)
}

/**
 * 申请档案鉴定
 * POST /api/mark/exams/archive/request-appraisal
 */
export function requestAppraisal(archiveId: string): Promise<ArchivePackageVO> {
  return http.post<unknown>('/api/mark/exams/archive/request-appraisal', { archiveId })
    .then(validateArchivePackage)
}

/**
 * 提交鉴定决议
 * POST /api/mark/exams/archive/appraise
 */
export function appraiseArchive(payload: ArchiveAppraisalPayload): Promise<ArchivePackageVO> {
  return http.post<unknown>('/api/mark/exams/archive/appraise', payload)
    .then(validateArchivePackage)
}

/**
 * 申请销毁
 * POST /api/mark/exams/archive/request-destruction
 */
export function requestDestruction(payload: ArchiveDestructionPayload): Promise<ArchivePackageVO> {
  return http.post<unknown>('/api/mark/exams/archive/request-destruction', payload)
    .then(validateArchivePackage)
}

/**
 * 审批销毁申请
 * POST /api/mark/exams/archive/approve-destruction
 */
export function approveDestruction(
  payload: ArchiveDestructionApprovalPayload,
): Promise<ArchivePackageVO> {
  return http.post<unknown>('/api/mark/exams/archive/approve-destruction', payload)
    .then(validateArchivePackage)
}

/**
 * 执行物理销毁
 * POST /api/mark/exams/archive/execute-destruction
 */
export function executeDestruction(archiveId: string): Promise<ArchivePackageVO> {
  return http.post<unknown>('/api/mark/exams/archive/execute-destruction', { archiveId })
    .then(validateArchivePackage)
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`考后归档接口缺少 ${fieldName}`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`考后归档接口 ${fieldName} 格式错误`)
  }
  return value
}

function optionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`考后归档接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`考后归档接口 ${fieldName} 格式错误`)
  }
  return value
}

function optionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(`考后归档接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireArchivePackageStatus(value: unknown): ArchivePackageStatusCode {
  if (
    value !== 'DRAFT'
    && value !== 'PACKAGING'
    && value !== 'PACKAGING_FAILED'
    && value !== 'STORED'
    && value !== 'ACTIVE'
    && value !== 'APPRAISAL_PENDING'
    && value !== 'APPRAISAL_DECIDED'
    && value !== 'DESTRUCTION_PENDING'
    && value !== 'DESTRUCTION_APPROVED'
    && value !== 'DESTRUCTION_EXECUTING'
    && value !== 'DESTRUCTION_FAILED'
    && value !== 'DESTROYED'
  ) {
    throw new TypeError('考后归档接口 archiveStatus 枚举格式错误')
  }
  return value
}

function optionalArchivePackagingPhase(value: unknown): ArchivePackagingPhase | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (
    value !== 'QUEUED'
    && value !== 'AGGREGATING'
    && value !== 'WRITING_ZIP'
    && value !== 'UPLOADING_PARTS'
    && value !== 'FINALIZING'
    && value !== 'COMPLETED'
    && value !== 'FAILED'
  ) {
    throw new TypeError('考后归档接口 packagingPhase 枚举格式错误')
  }
  return value
}

function optionalAppraisalDecision(value: unknown): ArchiveAppraisalDecisionCode | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (value !== 'RETAIN' && value !== 'DESTROY') {
    throw new TypeError('考后归档接口 appraisalDecision 枚举格式错误')
  }
  return value
}

function optionalDestructionDecision(value: unknown): ArchiveDestructionDecisionCode | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (value !== 'APPROVED' && value !== 'REJECTED') {
    throw new TypeError('考后归档接口 destructionApprovalDecision 枚举格式错误')
  }
  return value
}

function validateArchivePackage(value: unknown): ArchivePackageVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考后归档包接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    archiveId: requireString(record.archiveId, 'archiveId'),
    examId: requireString(record.examId, 'examId'),
    archiveNo: requireString(record.archiveNo, 'archiveNo'),
    archiveTitle: requireString(record.archiveTitle, 'archiveTitle'),
    archiveStatus: requireArchivePackageStatus(record.archiveStatus),
    archiveStatusMessage: requireString(record.archiveStatusMessage, 'archiveStatusMessage'),
    retentionYears: optionalNumber(record.retentionYears, 'retentionYears'),
    retentionUntil: optionalString(record.retentionUntil, 'retentionUntil'),
    permanentRetention: optionalBoolean(record.permanentRetention, 'permanentRetention'),
    includeOriginalScans: optionalBoolean(record.includeOriginalScans, 'includeOriginalScans'),
    includeMarkedSlices: optionalBoolean(record.includeMarkedSlices, 'includeMarkedSlices'),
    includeAnswerBooklet: optionalBoolean(record.includeAnswerBooklet, 'includeAnswerBooklet'),
    archiveFileId: optionalString(record.archiveFileId, 'archiveFileId'),
    archiveFileName: optionalString(record.archiveFileName, 'archiveFileName'),
    archiveFileSize: optionalString(record.archiveFileSize, 'archiveFileSize'),
    archiveChecksum: optionalString(record.archiveChecksum, 'archiveChecksum'),
    itemCount: optionalNumber(record.itemCount, 'itemCount'),
    originalScanCount: optionalNumber(record.originalScanCount, 'originalScanCount'),
    markedSliceCount: optionalNumber(record.markedSliceCount, 'markedSliceCount'),
    answerBookletCount: optionalNumber(record.answerBookletCount, 'answerBookletCount'),
    packagingStartedTime: optionalString(record.packagingStartedTime, 'packagingStartedTime'),
    packagingCompletedTime: optionalString(record.packagingCompletedTime, 'packagingCompletedTime'),
    packagingDiagnostic: optionalString(record.packagingDiagnostic, 'packagingDiagnostic'),
    packagingPhase: optionalArchivePackagingPhase(record.packagingPhase),
    packagingProgressPercent: optionalNumber(
      record.packagingProgressPercent,
      'packagingProgressPercent',
    ),
    packagingProgressMessage: optionalString(
      record.packagingProgressMessage,
      'packagingProgressMessage',
    ),
    packagingUploadId: optionalString(record.packagingUploadId, 'packagingUploadId'),
    appraisalRequestedTime: optionalString(record.appraisalRequestedTime, 'appraisalRequestedTime'),
    appraisalRequestedUserId: optionalString(
      record.appraisalRequestedUserId,
      'appraisalRequestedUserId',
    ),
    appraisalDecidedTime: optionalString(record.appraisalDecidedTime, 'appraisalDecidedTime'),
    appraisalDecidedUserId: optionalString(record.appraisalDecidedUserId, 'appraisalDecidedUserId'),
    appraisalDecision: optionalAppraisalDecision(record.appraisalDecision),
    appraisalRemark: optionalString(record.appraisalRemark, 'appraisalRemark'),
    destructionRequestedTime: optionalString(
      record.destructionRequestedTime,
      'destructionRequestedTime',
    ),
    destructionRequestedUserId: optionalString(
      record.destructionRequestedUserId,
      'destructionRequestedUserId',
    ),
    destructionRequestReason: optionalString(
      record.destructionRequestReason,
      'destructionRequestReason',
    ),
    destructionApprovalTime: optionalString(
      record.destructionApprovalTime,
      'destructionApprovalTime',
    ),
    destructionApprovalUserId: optionalString(
      record.destructionApprovalUserId,
      'destructionApprovalUserId',
    ),
    destructionApprovalDecision: optionalDestructionDecision(record.destructionApprovalDecision),
    destructionApprovalRemark: optionalString(
      record.destructionApprovalRemark,
      'destructionApprovalRemark',
    ),
    destroyedTime: optionalString(record.destroyedTime, 'destroyedTime'),
    destroyedUserId: optionalString(record.destroyedUserId, 'destroyedUserId'),
    destroyedSummary: optionalString(record.destroyedSummary, 'destroyedSummary'),
    createUser: optionalString(record.createUser, 'createUser'),
    updateUser: optionalString(record.updateUser, 'updateUser'),
    createTime: optionalString(record.createTime, 'createTime'),
    updateTime: optionalString(record.updateTime, 'updateTime'),
  }
}

function validateArchivePackagePage(value: unknown): PageResult<ArchivePackageVO> {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考后归档分页接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.list)) {
    throw new TypeError('考后归档分页列表接口返回格式错误')
  }
  return {
    list: record.list.map(validateArchivePackage),
    total: requireNumber(record.total, 'total'),
    pageNum: requireNumber(record.pageNum, 'pageNum'),
    pageSize: requireNumber(record.pageSize, 'pageSize'),
    pages: requireNumber(record.pages, 'pages'),
  }
}

function validateArchiveItem(value: unknown): ArchiveItemVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考后归档清单接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    itemId: requireString(record.itemId, 'itemId'),
    itemCategory: optionalString(record.itemCategory, 'itemCategory'),
    itemCategoryMessage: optionalString(record.itemCategoryMessage, 'itemCategoryMessage'),
    sourceEntityType: optionalString(record.sourceEntityType, 'sourceEntityType'),
    sourceEntityId: optionalString(record.sourceEntityId, 'sourceEntityId'),
    sourceFileId: optionalString(record.sourceFileId, 'sourceFileId'),
    relativePath: requireString(record.relativePath, 'relativePath'),
    fileSize: optionalString(record.fileSize, 'fileSize'),
    fileChecksum: optionalString(record.fileChecksum, 'fileChecksum'),
    studentUserId: optionalString(record.studentUserId, 'studentUserId'),
    studentNo: optionalString(record.studentNo, 'studentNo'),
    studentName: optionalString(record.studentName, 'studentName'),
    questionTemplateId: optionalString(record.questionTemplateId, 'questionTemplateId'),
    questionNo: optionalString(record.questionNo, 'questionNo'),
    pageSeq: optionalNumber(record.pageSeq, 'pageSeq'),
    diagnostic: optionalString(record.diagnostic, 'diagnostic'),
  }
}

function validateArchiveEvent(value: unknown): ArchiveEventVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考后归档事件接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    eventId: requireString(record.eventId, 'eventId'),
    eventType: optionalString(record.eventType, 'eventType'),
    eventTypeMessage: optionalString(record.eventTypeMessage, 'eventTypeMessage'),
    eventTime: optionalString(record.eventTime, 'eventTime'),
    operatorId: optionalString(record.operatorId, 'operatorId'),
    operatorRole: optionalString(record.operatorRole, 'operatorRole'),
    reason: optionalString(record.reason, 'reason'),
    payload: optionalString(record.payload, 'payload'),
    traceId: optionalString(record.traceId, 'traceId'),
  }
}

function validateArchiveDetail(value: unknown): ArchiveDetailVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考后归档详情接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.items)) {
    throw new TypeError('考后归档详情接口 items 格式错误')
  }
  if (!Array.isArray(record.events)) {
    throw new TypeError('考后归档详情接口 events 格式错误')
  }
  return {
    archive: validateArchivePackage(record.archive),
    items: record.items.map(validateArchiveItem),
    events: record.events.map(validateArchiveEvent),
  }
}
