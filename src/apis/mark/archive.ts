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
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

// ─── 状态枚举与文案 ───────────────────────────────────────────

/** 归档包状态编码 - 与后端 ArchivePackageStatus 完整一致。 */
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

/** 异步打包阶段编码 - 与后端 ArchivePackagingPhase 完整一致。 */
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

/** 归档清单项类别编码 - 与后端 ArchiveItemCategory 完整一致。 */
export type ArchiveItemCategoryCode
  = | 'ORIGINAL_SCAN_PAGE'
    | 'MARKED_SLICE'
    | 'GRADING_MANIFEST'
    | 'STANDARD_ANSWER_BOOKLET'
    | 'RUBRIC_BOOKLET'
    | 'PACKAGE_README'
    | 'PACKAGE_MANIFEST'

export const ARCHIVE_ITEM_CATEGORY_LABEL: Record<ArchiveItemCategoryCode, string> = {
  ORIGINAL_SCAN_PAGE: '原始扫描页',
  MARKED_SLICE: '批改切片',
  GRADING_MANIFEST: '成绩清单',
  STANDARD_ANSWER_BOOKLET: '标准答案册',
  RUBRIC_BOOKLET: '评分细则册',
  PACKAGE_README: '归档说明',
  PACKAGE_MANIFEST: '归档清单',
}

/** 归档事件类型编码 - 与后端 ArchiveEventType 完整一致。 */
export type ArchiveEventTypeCode
  = | 'CREATED'
    | 'PACKAGING_STARTED'
    | 'PACKAGING_COMPLETED'
    | 'PACKAGING_FAILED'
    | 'STORED_DELIVERED'
    | 'APPRAISAL_REQUESTED'
    | 'APPRAISAL_DECIDED'
    | 'RETENTION_EXTENDED'
    | 'DESTRUCTION_REQUESTED'
    | 'DESTRUCTION_APPROVED'
    | 'DESTRUCTION_REJECTED'
    | 'DESTRUCTION_EXECUTING'
    | 'DESTRUCTION_RETRY_FAILED'
    | 'DESTRUCTION_FAILED'
    | 'DESTROYED'

export const ARCHIVE_EVENT_TONE: Record<ArchiveEventTypeCode, 'gray' | 'blue' | 'green' | 'red' | 'purple'> = {
  CREATED: 'gray',
  PACKAGING_STARTED: 'blue',
  PACKAGING_COMPLETED: 'green',
  PACKAGING_FAILED: 'red',
  STORED_DELIVERED: 'green',
  APPRAISAL_REQUESTED: 'blue',
  APPRAISAL_DECIDED: 'purple',
  RETENTION_EXTENDED: 'green',
  DESTRUCTION_REQUESTED: 'blue',
  DESTRUCTION_APPROVED: 'green',
  DESTRUCTION_REJECTED: 'red',
  DESTRUCTION_EXECUTING: 'blue',
  DESTRUCTION_RETRY_FAILED: 'red',
  DESTRUCTION_FAILED: 'red',
  DESTROYED: 'red',
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

// ─── 请求 / 响应模型 ───────────────────────────────────────────

/** 归档包创建请求 - 对应 ArchiveCreateRequest */
export interface ArchiveCreateRequest {
  examId: string
  archiveTitle?: string
  retentionYears?: number
  permanentRetention?: boolean
  includeOriginalScans?: boolean
  includeMarkedSlices?: boolean
  includeAnswerBooklet?: boolean
}

/** 归档包查询请求 - 对应 ArchiveQueryRequest */
export interface ArchiveQueryRequest extends QueryDto {
  examId?: string
  archiveStatus?: ArchivePackageStatusCode
}

/** 鉴定决议请求 - 对应 ArchiveAppraisalRequest */
export interface ArchiveAppraisalRequest {
  archiveId: string
  decision: ArchiveAppraisalDecisionCode
  remark?: string
  /** 仅 RETAIN 决议生效：延长保管年限 */
  retentionExtensionYears?: number
  /** 仅 RETAIN 决议生效：是否调整为永久保管 */
  permanentRetention?: boolean
}

/** 销毁申请请求 - 对应 ArchiveDestructionRequest */
export interface ArchiveDestructionRequest {
  archiveId: string
  reason: string
}

/** 销毁审批请求 - 对应 ArchiveDestructionApprovalRequest */
export interface ArchiveDestructionApprovalRequest {
  archiveId: string
  decision: ArchiveDestructionDecisionCode
  remark?: string
}

/** 归档包响应 - 对应 ArchivePackageResponse */
export interface ArchivePackageVO {
  archiveId: string
  examId: string
  examName: string
  examNo?: string
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
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

/** 归档清单项响应 - 对应 ArchiveItemResponse */
export interface ArchiveItemVO {
  itemId: string
  itemCategory: ArchiveItemCategoryCode
  itemCategoryMessage: string
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
  eventType: ArchiveEventTypeCode
  eventTypeMessage: string
  eventTime?: string
  operatorId?: string
  operatorRole?: string
  reason?: string
  traceId?: string
}

/** 归档详情响应 - 对应 ArchiveDetailResponse */
export interface ArchiveDetailVO {
  archive: ArchivePackageVO
  items: ArchiveItemVO[]
  events: ArchiveEventVO[]
}

export const ARCHIVE_PACKAGE_STATUS_CODES: ArchivePackageStatusCode[] = [
  'DRAFT',
  'PACKAGING',
  'PACKAGING_FAILED',
  'STORED',
  'ACTIVE',
  'APPRAISAL_PENDING',
  'APPRAISAL_DECIDED',
  'DESTRUCTION_PENDING',
  'DESTRUCTION_APPROVED',
  'DESTRUCTION_EXECUTING',
  'DESTRUCTION_FAILED',
  'DESTROYED',
]

export const ARCHIVE_PACKAGING_PHASE_CODES: ArchivePackagingPhase[] = [
  'QUEUED',
  'AGGREGATING',
  'WRITING_ZIP',
  'UPLOADING_PARTS',
  'FINALIZING',
  'COMPLETED',
  'FAILED',
]

function requireArchiveText(value: string | undefined, fieldName: string): void {
  if (!value) {
    throw new Error(`${fieldName}不能为空`)
  }
}

function requireArchiveBoolean(value: boolean | undefined, fieldName: string): void {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${fieldName}不能为空`)
  }
}

function requireArchiveNumber(value: number | undefined, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName}不能为空`)
  }
  return value
}

function requireArchiveNonNegativeNumber(value: number | undefined, fieldName: string): number {
  const numberValue = requireArchiveNumber(value, fieldName)
  if (numberValue < 0) {
    throw new Error(`${fieldName}不能小于0`)
  }
  return numberValue
}

function requireArchivePositiveSize(value: string | undefined, fieldName: string): void {
  requireArchiveText(value, fieldName)
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`${fieldName}必须为正数字节数`)
  }
}

const ARCHIVE_FILE_READY_STATUSES: readonly ArchivePackageStatusCode[] = [
  'STORED',
  'ACTIVE',
  'APPRAISAL_PENDING',
  'APPRAISAL_DECIDED',
  'DESTRUCTION_PENDING',
  'DESTRUCTION_APPROVED',
  'DESTRUCTION_EXECUTING',
  'DESTRUCTION_FAILED',
  'DESTROYED',
]

function isArchiveFileReadyStatus(status: ArchivePackageStatusCode): boolean {
  return ARCHIVE_FILE_READY_STATUSES.includes(status)
}

export function validateArchivePackageContract(record: ArchivePackageVO): void {
  requireArchiveText(record.archiveId, '归档包ID')
  requireArchiveText(record.examId, '考试ID')
  requireArchiveText(record.examName, '考试名称')
  requireArchiveText(record.archiveNo, '归档编号')
  requireArchiveText(record.archiveTitle, '归档标题')
  requireArchiveBoolean(record.permanentRetention, '归档是否永久保管')
  strictEnumLabel(ARCHIVE_STATUS_LABEL, record.archiveStatus, '归档状态')
  strictEnumTone(ARCHIVE_STATUS_TONE, record.archiveStatus, '归档状态')
  if (!record.permanentRetention) {
    requireArchiveNumber(record.retentionYears, '归档保管年限')
  }
  if (record.packagingPhase) {
    strictEnumLabel(ARCHIVE_PHASE_LABEL, record.packagingPhase, '归档打包阶段')
  }
  if (record.archiveStatus === 'PACKAGING' || record.archiveStatus === 'PACKAGING_FAILED') {
    if (!record.packagingPhase) {
      throw new Error('归档处于打包状态但缺少打包阶段')
    }
    const packagingProgressPercent = requireArchiveNonNegativeNumber(
      record.packagingProgressPercent,
      '归档打包进度百分比',
    )
    requireArchiveText(record.packagingProgressMessage, '归档打包阶段说明')
    if (packagingProgressPercent > 100) {
      throw new Error('归档打包进度百分比不能超过100')
    }
  }
  if (isArchiveFileReadyStatus(record.archiveStatus)) {
    requireArchivePositiveSize(record.archiveFileSize, '归档文件大小')
    requireArchiveText(record.archiveChecksum, '归档文件校验码')
    requireArchiveNonNegativeNumber(record.itemCount, '归档清单数')
    requireArchiveNonNegativeNumber(record.originalScanCount, '原始扫描件数量')
    requireArchiveNonNegativeNumber(record.markedSliceCount, '批改切片数量')
    requireArchiveNonNegativeNumber(record.answerBookletCount, '标准答案与评分细则文件数量')
  }
  if (record.appraisalDecision) {
    strictEnumLabel(ARCHIVE_APPRAISAL_LABEL, record.appraisalDecision, '归档鉴定决议')
  }
  if (record.destructionApprovalDecision) {
    strictEnumLabel(ARCHIVE_DESTRUCTION_LABEL, record.destructionApprovalDecision, '归档销毁审批决议')
  }
}

function validateArchiveItemContract(record: ArchiveItemVO): void {
  requireArchiveText(record.itemId, '归档清单项ID')
  requireArchiveText(record.relativePath, '归档清单相对路径')
  strictEnumValue(ARCHIVE_ITEM_CATEGORY_LABEL, record.itemCategory, '归档清单项类别')
}

function validateArchiveEventContract(record: ArchiveEventVO): void {
  requireArchiveText(record.eventId, '归档事件ID')
  strictEnumTone(ARCHIVE_EVENT_TONE, record.eventType, '归档事件类型')
}

export function validateArchiveDetailContract(record: ArchiveDetailVO): void {
  validateArchivePackageContract(record.archive)
  record.items.forEach(validateArchiveItemContract)
  record.events.forEach(validateArchiveEventContract)
}

function validateArchivePageContract(page: PageResult<ArchivePackageVO>): PageResult<ArchivePackageVO> {
  page.list.forEach(validateArchivePackageContract)
  return page
}

// ─── API 调用 ──────────────────────────────────────────────────

/**
 * 创建归档包草稿
 * POST /api/mark/exams/archive/create
 */
export function createArchive(request: ArchiveCreateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/archive/create', request)
}

/**
 * 触发归档打包（异步入队）
 * POST /api/mark/exams/archive/package
 */
export function packageArchive(archiveId: string): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/package', { archiveId })
    .then((record) => {
      validateArchivePackageContract(record)
      return record
    })
}

/**
 * 查询归档包列表
 * POST /api/mark/exams/archive/list
 */
export function listArchives(request: ArchiveQueryRequest): Promise<PageResult<ArchivePackageVO>> {
  return http.post<PageResult<ArchivePackageVO>>('/api/mark/exams/archive/list', request)
    .then(validateArchivePageContract)
}

/**
 * 查询归档包详情（含 items + events）
 * POST /api/mark/exams/archive/detail
 */
export function getArchiveDetail(archiveId: string): Promise<ArchiveDetailVO> {
  return http.post<ArchiveDetailVO>('/api/mark/exams/archive/detail', { archiveId })
    .then((record) => {
      validateArchiveDetailContract(record)
      return record
    })
}

/**
 * 申请档案鉴定
 * POST /api/mark/exams/archive/request-appraisal
 */
export function requestAppraisal(archiveId: string): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/request-appraisal', { archiveId })
    .then((record) => {
      validateArchivePackageContract(record)
      return record
    })
}

/**
 * 提交鉴定决议
 * POST /api/mark/exams/archive/appraise
 */
export function appraiseArchive(request: ArchiveAppraisalRequest): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/appraise', request)
    .then((record) => {
      validateArchivePackageContract(record)
      return record
    })
}

/**
 * 申请销毁
 * POST /api/mark/exams/archive/request-destruction
 */
export function requestDestruction(request: ArchiveDestructionRequest): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/request-destruction', request)
    .then((record) => {
      validateArchivePackageContract(record)
      return record
    })
}

/**
 * 审批销毁申请
 * POST /api/mark/exams/archive/approve-destruction
 */
export function approveDestruction(
  request: ArchiveDestructionApprovalRequest,
): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/approve-destruction', request)
    .then((record) => {
      validateArchivePackageContract(record)
      return record
    })
}

/**
 * 执行物理销毁
 * POST /api/mark/exams/archive/execute-destruction
 */
export function executeDestruction(archiveId: string): Promise<ArchivePackageVO> {
  return http.post<ArchivePackageVO>('/api/mark/exams/archive/execute-destruction', { archiveId })
    .then((record) => {
      validateArchivePackageContract(record)
      return record
    })
}
