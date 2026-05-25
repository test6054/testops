import type { ScanAttentionStatusCode, ScanAttentionTypeCode } from '@/apis/mark/exam'
import type { PageResult, QueryDto } from '@/types'
import { validateScanAttentionStatus } from '@/apis/mark/exam'
import http from '@/config/axios'

export type { ScanAttentionStatusCode, ScanAttentionTypeCode }

export type ScannerKioskScanMode = 'DIRECT' | 'SUPPLEMENT' | 'ARCHIVE'
export type ExamScannerLedgerDataSource = 'DATABASE' | 'REDIS_PENDING' | 'NONE'
export type ExamScannerPageScanStatus = 'SCANNED'
export type ExamScannerPageUploadStatus = 'UPLOADED'
export type ExamScannerPageServerReceiveStatus = 'RECEIVED'
export type ExamScannerPageRegistrationStatus
  = | 'REGISTERED'
    | 'PENDING'
    | 'DISCARDED'
    | 'SUPERSEDED'

export interface ExamScannerKioskContextRequest {
  examId: string
  scannerDeviceId?: string
  scannerStationId?: string
  scanMode: ScannerKioskScanMode
}

export interface ExamScannerKioskExamVO {
  examId: string
  examName: string
  courseName?: string
  /** 学年，如 '2024-2025' */
  academicYear?: string
  /** 学期，'1'=秋季学期, '2'=春季学期 */
  semester?: string
  examNo: string
  status: string
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
}

export interface ExamScannerKioskDeviceVO {
  scannerDeviceId: string
  scannerStationId: string
  scannerStationName?: string
  deviceName: string
  status: string
  onlineStatus: string
  scannerConnected: boolean
  pendingJobCount: number
  pendingUploadPageCount: number
  diagnosticStatus: string
  diagnosticMessage: string
  lastHeartbeatAt?: string
}

export interface ExamScannerKioskPolicyVO {
  dpi: number
  colorMode: 'COLOR' | 'GRAY' | 'LINEART'
  duplexMode: 'SIMPLEX' | 'DUPLEX'
  blankPageDetectionEnabled: boolean
  kioskLockEnabled: boolean
}

export interface ExamScannerKioskBatchVO {
  scanBatchId: string
  batchNo: string
  batchExternalNo: string
  scannerDeviceId: string
  scanMode: ScannerKioskScanMode
  targetPageNo?: number
  supplementReason?: string
  /** 仅 SUPPLEMENT 模式有效：true=替换目标页，false=追加补扫 */
  replaceTargetPage: boolean
  /** 批次封存时间 */
  sealedAt?: string
  /** 批次封存执行人 ID */
  sealedBy?: string
  /** 批次废弃时间 */
  discardedAt?: string
  /** 批次废弃执行人 ID */
  discardedBy?: string
  /** 批次废弃原因 */
  discardReason?: string
  /** 批次申报页数（创建时由扫描端报送） */
  pageCount: number
  /** 服务端实际已落库页数 */
  receivedPageCount: number
  /** 待上传页数（pageCount - receivedPageCount） */
  pendingUploadCount: number
  /** 批次级异常处置项数量 */
  attentionItemCount: number
  status: string
  statusMessage: string
  diagnostic?: string
  scanStartTime?: string
  scanEndTime?: string
}

export interface ExamScannerKioskContextVO {
  exam: ExamScannerKioskExamVO
  classIds: string[]
  /** 与 classIds 顺序一致的班级名称；班级被删除时该位置为 null */
  declaredClassNames: (string | null)[]
  device?: ExamScannerKioskDeviceVO
  policy?: ExamScannerKioskPolicyVO
  latestBatch?: ExamScannerKioskBatchVO
  scannedPages: number
  paperInstances: number
  boundPaperInstances: number
  scanBatchCount: number
  attentionCount: number
  scanMode: ScannerKioskScanMode
  canStartScan: boolean
  canStartSupplementScan: boolean
  blockReason?: string
  supplementBlockReason?: string
}

export async function getScannerKioskContext(payload: ExamScannerKioskContextRequest) {
  const data = await http.post<unknown>('/api/mark/scanner/kiosk/context', payload)
  return validateScannerKioskContext(data)
}

// ============================================================================
// 考试选择下拉
// ============================================================================

/**
 * 扫描工作台考试选择下拉请求。
 *
 * 仅用于在一体机端开始扫描前的考试搜索：按学年、学期、班级与关键字过滤当前租户内
 * status=ACTIVE 的考试。已归档（CLOSED）考试在后端被强制过滤，不会出现在响应中。
 */
export interface ExamScannerKioskExamOptionRequest extends QueryDto {
  /** 模糊关键字，匹配 examName / examNo */
  keyword?: string
  /** 学年过滤，例如 '2024-2025' */
  academicYear?: string
  /** 学期过滤，'1'=秋季学期，'2'=春季学期 */
  semester?: string
  /** 班级 ID 过滤；不为空时仅返回 t_exam_class_scope 命中该班级的考试 */
  classId?: string
}

/**
 * 扫描工作台考试选择下拉项视图。
 *
 * declaredClassNames 与 classIds 顺序一一对应，被删除班级位置为 null。scanBatchCount
 * 为该考试已落库扫描批次数，可用于在选项中预览扫描进度。
 */
export interface ExamScannerKioskExamOptionVO {
  examId: string
  examNo: string
  examName: string
  courseName?: string
  /** 学年，如 '2024-2025' */
  academicYear?: string
  /** 学期，'1'=秋季学期，'2'=春季学期 */
  semester?: string
  examStartTime?: string
  examEndTime?: string
  classIds: string[]
  /** 与 classIds 顺序一致；被删除班级位置为 null */
  declaredClassNames: (string | null)[]
  /** 已落库扫描批次数量，用于在选项内展示扫描进度 */
  scanBatchCount: number
}

export async function pageScannerKioskExamOptions(payload: ExamScannerKioskExamOptionRequest) {
  const data = await http.post<unknown>('/api/mark/scanner/kiosk/exam-options', payload)
  return validateScannerKioskExamOptionPage(data)
}

// ============================================================================
// 批次 lifecycle：开启 / 关闭 / 封存
// ============================================================================

/**
 * 扫描工作台开启批次锚点请求。
 *
 * declaredClassIds 必须从已选考试 t_exam_class_scope 范围内勾选；scanMode=SUPPLEMENT 时
 * 必须填写 targetPageNo + supplementReason，scanMode=ARCHIVE 与 DIRECT 不允许这两个字段。
 */
export interface ExamScannerBatchStartRequest {
  examId: string
  scannerDeviceId: string
  /** 扫描站点 ID（绑定 station 时使用） */
  scannerStationId: string
  declaredClassIds: string[]
  scanMode: ScannerKioskScanMode
  /** 仅 SUPPLEMENT 模式必填：补扫的目标页码（>=1） */
  targetPageNo?: number
  /** 仅 SUPPLEMENT 模式必填：补扫原因说明 */
  supplementReason?: string
  /** 仅 SUPPLEMENT 模式有效：true=替换目标页，false=追加补扫 */
  replaceTargetPage: boolean
}

/**
 * 扫描工作台关闭批次锚点请求。
 *
 * 默认仅清理 Redis 锚点；当 discardPendingPages=true 时主动清空该锚点对应批次的 pending
 * pages 中间态。调用方需自行确保业务允许丢弃。
 */
export interface ExamScannerBatchCloseRequest {
  examId: string
  scannerDeviceId: string
  /** 扫描站点 ID，和 scannerDeviceId 共同定位唯一工作台锚点 */
  scannerStationId: string
  /** 当前 Agent 任务对应的批次外部号，后端用它防止误关已切换的新锚点 */
  batchExternalNo: string
  /** true 时主动清空 pending pages，否则保留并通过 pendingPages 诊断回执提示 */
  discardPendingPages?: boolean
}

/**
 * 扫描工作台封存批次请求。
 *
 * scanBatchId 必须是当前租户已落库的批次 ID；封存后仅写入 sealed_at / sealed_by，
 * 该批次后续 push / commit 都将被服务端拒绝。
 */
export interface ExamScannerBatchSealRequest {
  scanBatchId: string
  scannerDeviceId: string
  /** 扫描站点 ID，用于校验封存请求与批次所属工位一致 */
  scannerStationId: string
}

/**
 * 扫描工作台废弃已落库批次请求。
 *
 * scanBatchId 必须是当前租户已落库的扫描批次；废弃后批次状态变为 DISCARDED，
 * 批次内扫描页 effective_status 同步废弃。
 */
export interface ExamScanBatchDiscardRequest {
  scanBatchId: string
  discardReason: string
}

/**
 * 扫描工作台批次 lifecycle 响应视图。
 *
 * <p>对齐后端 {@code com.nybc.mark.model.response.ExamScannerBatchLifecycleVO}。
 * Redis 锚点投影：start / close / seal 三个端点共用此结构。锚点已不存在（关闭后或未开启）
 * 时 {@code anchorExists=false}，{@code anchorMutated} 表示本次调用是否真正改写了锚点状态
 * （幂等回放为 false）。close 端点遇到 Redis 中残留 pending pages 时通过
 * {@code pendingPageCount} 与 {@code pendingPagesDiagnostic} 反馈给调用方决定 commit 或主动丢弃。</p>
 */
export interface ExamScannerBatchLifecycleVO {
  /** 锚点是否存在（true=Redis 锚点存在或本次新建，false=不存在或已被清理） */
  anchorExists: boolean
  /** 本次调用是否变更了锚点状态（start 新建 / close 清理 / seal 固定 false） */
  anchorMutated: boolean
  /** 后端签发的批次外部号；前端 push / commit 时必须使用此值 */
  batchExternalNo?: string
  examId?: string
  scannerDeviceId?: string
  scannerStationId?: string
  scanMode?: ScannerKioskScanMode
  /** 补扫目标页号；仅 SUPPLEMENT 模式有值 */
  targetPageNo?: number
  /** 补扫原因；仅 SUPPLEMENT 模式有值 */
  supplementReason?: string
  /** 是否替换目标页；仅 SUPPLEMENT 模式有意义，非补扫固定为 false */
  replaceTargetPage: boolean
  /** 工作台锚点对应的申报班级 ID（后端 List<Long> 经字符串序列化后到达前端） */
  declaredClassIds?: string[]
  /** 工作台锚点创建时间（ISO 字符串） */
  startedAt?: string
  /** 工作台锚点创建人用户 ID */
  startedBy?: string
  /** close 残留 pending pages 时的人类可读诊断 */
  pendingPagesDiagnostic?: string
  /** close 时 Redis 中仍残留的 pending pages 数量；无残留为 0 / undefined */
  pendingPageCount?: number
  /** 封存时间，仅 seal 成功时填写 */
  sealedAt?: string
  /** 封存操作人，仅 seal 成功时填写 */
  sealedBy?: string
}

export async function startScannerKioskBatch(payload: ExamScannerBatchStartRequest) {
  const data = await http.post<unknown>('/api/mark/scanner/kiosk/batch/start', payload)
  return validateScannerBatchLifecycle(data)
}

export async function closeScannerKioskBatch(payload: ExamScannerBatchCloseRequest) {
  const data = await http.post<unknown>('/api/mark/scanner/kiosk/batch/close', payload)
  return validateScannerBatchLifecycle(data)
}

export async function sealScannerKioskBatch(payload: ExamScannerBatchSealRequest) {
  const data = await http.post<unknown>('/api/mark/scanner/kiosk/batch/seal', payload)
  return validateScannerBatchLifecycle(data)
}

export async function discardScannerKioskBatch(payload: ExamScanBatchDiscardRequest) {
  const data = await http.post<unknown>('/api/mark/scanner/kiosk/batch/discard', payload)
  return validateBooleanResult(data)
}

/**
 * 单张扫描页废弃请求。只允许作用于已 commit 落库的扫描页，Redis pending 页没有 scannedPageId。
 */
export interface ExamScannedPageDiscardRequest {
  /** 已落库扫描页 ID */
  scannedPageId: string
  /** 单页废弃原因 */
  discardReason: string
}

export async function discardScannedPage(payload: ExamScannedPageDiscardRequest) {
  const data = await http.post<unknown>('/api/mark/scanner/kiosk/page/discard', payload)
  return validateBooleanResult(data)
}

/**
 * 扫描工作台页级账本查询请求。后端按 (tenantId, examId, scannerDeviceId, scannerStationId, batchExternalNo) 拼装
 * 某批次的逐页状态视图：已 commit 走 t_exam_scanned_page，未 commit 走 Redis pending。
 */
export interface ExamScannerPageLedgerRequest {
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  batchExternalNo: string
}

/**
 * 单页账本条目。任一阶段失败必须显式表达，前端不允许把失败降级为正常状态。
 */
export interface ExamScannerPageLedgerItemVO {
  pageNo: number
  sha256?: string
  /** 已落库扫描页 ID；commit 前为 null */
  localPageId?: string
  /** 扫描页 storage 文件 ID */
  sourceFileId?: string
  /** 当前账本只展示已扫描页 */
  scanStatus: ExamScannerPageScanStatus
  /** 当前账本只展示已上传到 storage 的页 */
  uploadStatus: ExamScannerPageUploadStatus
  /** 当前账本只展示已被服务端接收的页 */
  serverReceiveStatus: ExamScannerPageServerReceiveStatus
  /** 识别登记状态；异常通过 attentionType 独立表达 */
  registrationStatus: ExamScannerPageRegistrationStatus
  /** 异常类型编码：QUALITY_BLOCK / PROCESSING_BLOCK / DUPLICATE_PENDING / RECOGNITION_REVIEW */
  attentionType?: ScanAttentionTypeCode
  attentionMessage?: string
  operatorName?: string
  occurredAt?: string
}

/**
 * 异常待办合并视图，与 page-ledger items 通过 paperInstanceId / pageId 关联。
 */
export interface ExamScannerAttentionItemVO {
  id: string
  attentionType: ScanAttentionTypeCode
  sourceType: string
  sourceId?: string
  paperInstanceId?: string
  pageId?: string
  status?: ScanAttentionStatusCode
  diagnostic?: string
  updateTime?: string
}

/**
 * 页级账本响应。空批次返回 items 与 attentionItems 为空数组的合法响应。
 */
export interface ExamScannerPageLedgerVO {
  examId: string
  batchExternalNo: string
  scanBatchId?: string
  scannerDeviceId: string
  scannerStationId: string
  scanMode?: ScannerKioskScanMode
  /** 数据来源：DATABASE 已 commit / REDIS_PENDING 未 commit / NONE 空批次 */
  dataSource: ExamScannerLedgerDataSource
  items: ExamScannerPageLedgerItemVO[]
  attentionItems: ExamScannerAttentionItemVO[]
  pendingCount: number
  registeredCount: number
  attentionCount: number
}

export async function fetchScannerPageLedger(payload: ExamScannerPageLedgerRequest) {
  const data = await http.post<unknown>('/api/mark/scanner/kiosk/page-ledger', payload)
  return validateScannerPageLedger(data)
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`扫描工作台接口缺少 ${fieldName}`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`扫描工作台接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`扫描工作台接口 ${fieldName} 格式错误`)
  }
  return value
}

function optionalFiniteNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return requireFiniteNumber(value, fieldName)
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`扫描工作台接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireStringList(value: unknown, fieldName: string): string[] {
  if (
    !Array.isArray(value)
    || value.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    throw new TypeError(`扫描工作台接口 ${fieldName} 格式错误`)
  }
  return value
}

function optionalStringList(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return requireStringList(value, fieldName)
}

function requireNullableStringList(value: unknown, fieldName: string): (string | null)[] {
  if (
    !Array.isArray(value)
    || value.some((item) => item !== null && (typeof item !== 'string' || item.length === 0))
  ) {
    throw new TypeError(`扫描工作台接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireColorMode(value: unknown, fieldName: string): 'COLOR' | 'GRAY' | 'LINEART' {
  if (value !== 'COLOR' && value !== 'GRAY' && value !== 'LINEART') {
    throw new TypeError(`扫描工作台接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireDuplexMode(value: unknown, fieldName: string): 'SIMPLEX' | 'DUPLEX' {
  if (value !== 'SIMPLEX' && value !== 'DUPLEX') {
    throw new TypeError(`扫描工作台接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireScanMode(value: unknown, fieldName: string): ScannerKioskScanMode {
  if (value !== 'DIRECT' && value !== 'SUPPLEMENT' && value !== 'ARCHIVE') {
    throw new TypeError(`扫描工作台接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireLedgerDataSource(value: unknown): ExamScannerLedgerDataSource {
  if (value !== 'DATABASE' && value !== 'REDIS_PENDING' && value !== 'NONE') {
    throw new TypeError('扫描工作台接口 dataSource 格式错误')
  }
  return value
}

function requireLedgerScanStatus(value: unknown): ExamScannerPageScanStatus {
  if (value !== 'SCANNED') {
    throw new TypeError('扫描工作台接口 items.scanStatus 格式错误')
  }
  return value
}

function requireLedgerUploadStatus(value: unknown): ExamScannerPageUploadStatus {
  if (value !== 'UPLOADED') {
    throw new TypeError('扫描工作台接口 items.uploadStatus 格式错误')
  }
  return value
}

function requireLedgerServerReceiveStatus(value: unknown): ExamScannerPageServerReceiveStatus {
  if (value !== 'RECEIVED') {
    throw new TypeError('扫描工作台接口 items.serverReceiveStatus 格式错误')
  }
  return value
}

function requireLedgerRegistrationStatus(value: unknown): ExamScannerPageRegistrationStatus {
  if (
    value !== 'REGISTERED'
    && value !== 'PENDING'
    && value !== 'DISCARDED'
    && value !== 'SUPERSEDED'
  ) {
    throw new TypeError('扫描工作台接口 items.registrationStatus 格式错误')
  }
  return value
}

function optionalScanMode(value: unknown, fieldName: string): ScannerKioskScanMode | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return requireScanMode(value, fieldName)
}

function validateScannerKioskExam(value: unknown): ExamScannerKioskExamVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描工作台考试返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    examId: requireString(record.examId, 'exam.examId'),
    examName: requireString(record.examName, 'exam.examName'),
    courseName: optionalString(record.courseName, 'exam.courseName'),
    academicYear: optionalString(record.academicYear, 'exam.academicYear'),
    semester: optionalString(record.semester, 'exam.semester'),
    examNo: requireString(record.examNo, 'exam.examNo'),
    status: requireString(record.status, 'exam.status'),
    statusMessage: requireString(record.statusMessage, 'exam.statusMessage'),
    examStartTime: optionalString(record.examStartTime, 'exam.examStartTime'),
    examEndTime: optionalString(record.examEndTime, 'exam.examEndTime'),
  }
}

function validateScannerKioskDevice(value: unknown): ExamScannerKioskDeviceVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描工作台设备返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    scannerDeviceId: requireString(record.scannerDeviceId, 'device.scannerDeviceId'),
    scannerStationId: requireString(record.scannerStationId, 'device.scannerStationId'),
    scannerStationName: optionalString(record.scannerStationName, 'device.scannerStationName'),
    deviceName: requireString(record.deviceName, 'device.deviceName'),
    status: requireString(record.status, 'device.status'),
    onlineStatus: requireString(record.onlineStatus, 'device.onlineStatus'),
    scannerConnected: requireBoolean(record.scannerConnected, 'device.scannerConnected'),
    pendingJobCount: requireFiniteNumber(record.pendingJobCount, 'device.pendingJobCount'),
    pendingUploadPageCount: requireFiniteNumber(
      record.pendingUploadPageCount,
      'device.pendingUploadPageCount',
    ),
    diagnosticStatus: requireString(record.diagnosticStatus, 'device.diagnosticStatus'),
    diagnosticMessage: requireString(record.diagnosticMessage, 'device.diagnosticMessage'),
    lastHeartbeatAt: optionalString(record.lastHeartbeatAt, 'device.lastHeartbeatAt'),
  }
}

function validateScannerKioskPolicy(value: unknown): ExamScannerKioskPolicyVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描工作台策略返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    dpi: requireFiniteNumber(record.dpi, 'policy.dpi'),
    colorMode: requireColorMode(record.colorMode, 'policy.colorMode'),
    duplexMode: requireDuplexMode(record.duplexMode, 'policy.duplexMode'),
    blankPageDetectionEnabled: requireBoolean(
      record.blankPageDetectionEnabled,
      'policy.blankPageDetectionEnabled',
    ),
    kioskLockEnabled: requireBoolean(record.kioskLockEnabled, 'policy.kioskLockEnabled'),
  }
}

function validateScannerKioskBatch(value: unknown): ExamScannerKioskBatchVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描工作台批次返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    scanBatchId: requireString(record.scanBatchId, 'latestBatch.scanBatchId'),
    batchNo: requireString(record.batchNo, 'latestBatch.batchNo'),
    batchExternalNo: requireString(record.batchExternalNo, 'latestBatch.batchExternalNo'),
    scannerDeviceId: requireString(record.scannerDeviceId, 'latestBatch.scannerDeviceId'),
    scanMode: requireScanMode(record.scanMode, 'latestBatch.scanMode'),
    targetPageNo: optionalFiniteNumber(record.targetPageNo, 'latestBatch.targetPageNo'),
    supplementReason: optionalString(record.supplementReason, 'latestBatch.supplementReason'),
    replaceTargetPage: requireBoolean(record.replaceTargetPage, 'latestBatch.replaceTargetPage'),
    sealedAt: optionalString(record.sealedAt, 'latestBatch.sealedAt'),
    sealedBy: optionalString(record.sealedBy, 'latestBatch.sealedBy'),
    discardedAt: optionalString(record.discardedAt, 'latestBatch.discardedAt'),
    discardedBy: optionalString(record.discardedBy, 'latestBatch.discardedBy'),
    discardReason: optionalString(record.discardReason, 'latestBatch.discardReason'),
    pageCount: requireFiniteNumber(record.pageCount, 'latestBatch.pageCount'),
    receivedPageCount: requireFiniteNumber(
      record.receivedPageCount,
      'latestBatch.receivedPageCount',
    ),
    pendingUploadCount: requireFiniteNumber(
      record.pendingUploadCount,
      'latestBatch.pendingUploadCount',
    ),
    attentionItemCount: requireFiniteNumber(
      record.attentionItemCount,
      'latestBatch.attentionItemCount',
    ),
    status: requireString(record.status, 'latestBatch.status'),
    statusMessage: requireString(record.statusMessage, 'latestBatch.statusMessage'),
    diagnostic: optionalString(record.diagnostic, 'latestBatch.diagnostic'),
    scanStartTime: optionalString(record.scanStartTime, 'latestBatch.scanStartTime'),
    scanEndTime: optionalString(record.scanEndTime, 'latestBatch.scanEndTime'),
  }
}

function validateScannerKioskContext(value: unknown): ExamScannerKioskContextVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描工作台上下文返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    exam: validateScannerKioskExam(record.exam),
    classIds: requireStringList(record.classIds, 'classIds'),
    declaredClassNames: requireNullableStringList(record.declaredClassNames, 'declaredClassNames'),
    device:
      record.device === undefined || record.device === null
        ? undefined
        : validateScannerKioskDevice(record.device),
    policy:
      record.policy === undefined || record.policy === null
        ? undefined
        : validateScannerKioskPolicy(record.policy),
    latestBatch:
      record.latestBatch === undefined || record.latestBatch === null
        ? undefined
        : validateScannerKioskBatch(record.latestBatch),
    scannedPages: requireFiniteNumber(record.scannedPages, 'scannedPages'),
    paperInstances: requireFiniteNumber(record.paperInstances, 'paperInstances'),
    boundPaperInstances: requireFiniteNumber(record.boundPaperInstances, 'boundPaperInstances'),
    scanBatchCount: requireFiniteNumber(record.scanBatchCount, 'scanBatchCount'),
    attentionCount: requireFiniteNumber(record.attentionCount, 'attentionCount'),
    scanMode: requireScanMode(record.scanMode, 'scanMode'),
    canStartScan: requireBoolean(record.canStartScan, 'canStartScan'),
    canStartSupplementScan: requireBoolean(record.canStartSupplementScan, 'canStartSupplementScan'),
    blockReason: optionalString(record.blockReason, 'blockReason'),
    supplementBlockReason: optionalString(record.supplementBlockReason, 'supplementBlockReason'),
  }
}

function validateScannerKioskExamOption(value: unknown): ExamScannerKioskExamOptionVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描工作台考试选项返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    examId: requireString(record.examId, 'list.examId'),
    examNo: requireString(record.examNo, 'list.examNo'),
    examName: requireString(record.examName, 'list.examName'),
    courseName: optionalString(record.courseName, 'list.courseName'),
    academicYear: optionalString(record.academicYear, 'list.academicYear'),
    semester: optionalString(record.semester, 'list.semester'),
    examStartTime: optionalString(record.examStartTime, 'list.examStartTime'),
    examEndTime: optionalString(record.examEndTime, 'list.examEndTime'),
    classIds: requireStringList(record.classIds, 'list.classIds'),
    declaredClassNames: requireNullableStringList(
      record.declaredClassNames,
      'list.declaredClassNames',
    ),
    scanBatchCount: requireFiniteNumber(record.scanBatchCount, 'list.scanBatchCount'),
  }
}

function validateScannerKioskExamOptionPage(
  value: unknown,
): PageResult<ExamScannerKioskExamOptionVO> {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描工作台考试分页返回格式错误')
  }
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.list)) {
    throw new TypeError('扫描工作台接口 list 格式错误')
  }
  return {
    list: record.list.map(validateScannerKioskExamOption),
    total: requireFiniteNumber(record.total, 'total'),
    pageNum: requireFiniteNumber(record.pageNum, 'pageNum'),
    pageSize: requireFiniteNumber(record.pageSize, 'pageSize'),
    pages: requireFiniteNumber(record.pages, 'pages'),
  }
}

function validateScannerBatchLifecycle(value: unknown): ExamScannerBatchLifecycleVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描工作台批次锚点返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    anchorExists: requireBoolean(record.anchorExists, 'anchorExists'),
    anchorMutated: requireBoolean(record.anchorMutated, 'anchorMutated'),
    batchExternalNo: optionalString(record.batchExternalNo, 'batchExternalNo'),
    examId: optionalString(record.examId, 'examId'),
    scannerDeviceId: optionalString(record.scannerDeviceId, 'scannerDeviceId'),
    scannerStationId: optionalString(record.scannerStationId, 'scannerStationId'),
    scanMode: optionalScanMode(record.scanMode, 'scanMode'),
    targetPageNo: optionalFiniteNumber(record.targetPageNo, 'targetPageNo'),
    supplementReason: optionalString(record.supplementReason, 'supplementReason'),
    replaceTargetPage: requireBoolean(record.replaceTargetPage, 'replaceTargetPage'),
    declaredClassIds: optionalStringList(record.declaredClassIds, 'declaredClassIds'),
    startedAt: optionalString(record.startedAt, 'startedAt'),
    startedBy: optionalString(record.startedBy, 'startedBy'),
    pendingPagesDiagnostic: optionalString(record.pendingPagesDiagnostic, 'pendingPagesDiagnostic'),
    pendingPageCount: optionalFiniteNumber(record.pendingPageCount, 'pendingPageCount'),
    sealedAt: optionalString(record.sealedAt, 'sealedAt'),
    sealedBy: optionalString(record.sealedBy, 'sealedBy'),
  }
}

function validateBooleanResult(value: unknown): boolean {
  return requireBoolean(value, '操作结果')
}

function validateScannerPageLedgerItem(value: unknown): ExamScannerPageLedgerItemVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('页级账本明细返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    pageNo: requireFiniteNumber(record.pageNo, 'items.pageNo'),
    sha256: optionalString(record.sha256, 'items.sha256'),
    localPageId: optionalString(record.localPageId, 'items.localPageId'),
    sourceFileId: optionalString(record.sourceFileId, 'items.sourceFileId'),
    scanStatus: requireLedgerScanStatus(record.scanStatus),
    uploadStatus: requireLedgerUploadStatus(record.uploadStatus),
    serverReceiveStatus: requireLedgerServerReceiveStatus(record.serverReceiveStatus),
    registrationStatus: requireLedgerRegistrationStatus(record.registrationStatus),
    attentionType: optionalScanAttentionType(record.attentionType, 'items.attentionType'),
    attentionMessage: optionalString(record.attentionMessage, 'items.attentionMessage'),
    operatorName: optionalString(record.operatorName, 'items.operatorName'),
    occurredAt: optionalString(record.occurredAt, 'items.occurredAt'),
  }
}

function validateScannerAttentionItem(value: unknown): ExamScannerAttentionItemVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('页级账本异常项返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: requireString(record.id, 'attentionItems.id'),
    attentionType: requireScanAttentionType(record.attentionType, 'attentionItems.attentionType'),
    sourceType: requireString(record.sourceType, 'attentionItems.sourceType'),
    sourceId: optionalString(record.sourceId, 'attentionItems.sourceId'),
    paperInstanceId: optionalString(record.paperInstanceId, 'attentionItems.paperInstanceId'),
    pageId: optionalString(record.pageId, 'attentionItems.pageId'),
    status: validateScanAttentionStatus(record.status, 'attentionItems.status'),
    diagnostic: optionalString(record.diagnostic, 'attentionItems.diagnostic'),
    updateTime: optionalString(record.updateTime, 'attentionItems.updateTime'),
  }
}

function optionalScanAttentionType(
  value: unknown,
  fieldName: string,
): ScanAttentionTypeCode | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return requireScanAttentionType(value, fieldName)
}

function requireScanAttentionType(value: unknown, fieldName: string): ScanAttentionTypeCode {
  if (
    value !== 'QUALITY_BLOCK'
    && value !== 'PROCESSING_BLOCK'
    && value !== 'DUPLICATE_PENDING'
    && value !== 'RECOGNITION_REVIEW'
  ) {
    throw new TypeError(`${fieldName} 格式错误`)
  }
  return value
}

function validateScannerPageLedger(value: unknown): ExamScannerPageLedgerVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('页级账本返回格式错误')
  }
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.items)) {
    throw new TypeError('页级账本接口 items 格式错误')
  }
  if (!Array.isArray(record.attentionItems)) {
    throw new TypeError('页级账本接口 attentionItems 格式错误')
  }
  return {
    examId: requireString(record.examId, 'examId'),
    batchExternalNo: requireString(record.batchExternalNo, 'batchExternalNo'),
    scanBatchId: optionalString(record.scanBatchId, 'scanBatchId'),
    scannerDeviceId: requireString(record.scannerDeviceId, 'scannerDeviceId'),
    scannerStationId: requireString(record.scannerStationId, 'scannerStationId'),
    scanMode: optionalScanMode(record.scanMode, 'scanMode'),
    dataSource: requireLedgerDataSource(record.dataSource),
    items: record.items.map(validateScannerPageLedgerItem),
    attentionItems: record.attentionItems.map(validateScannerAttentionItem),
    pendingCount: requireFiniteNumber(record.pendingCount, 'pendingCount'),
    registeredCount: requireFiniteNumber(record.registeredCount, 'registeredCount'),
    attentionCount: requireFiniteNumber(record.attentionCount, 'attentionCount'),
  }
}
