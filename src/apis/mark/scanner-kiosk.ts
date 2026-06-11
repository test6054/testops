import type {
  DuplicateResolutionStatusCode,
  ExamFileRefVO,
  ExamStatusCode,
  QualityDecisionCode,
  ScanAttentionSourceTypeCode,
  ScanAttentionTypeCode,
  TaskStatusCode,
} from '@/apis/mark/exam'
import type {
  ScannerAgentDiagnosticStatusCode,
  ScannerDeviceStatusCode,
  ScannerEndpointOnlineStatusCode,
} from '@/apis/mark/exam-mark-scanner'
import type { GradeStatusCode } from '@/apis/mark/student-exam'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

export type {
  DuplicateResolutionStatusCode,
  GradeStatusCode,
  QualityDecisionCode,
  ScanAttentionSourceTypeCode,
  ScanAttentionTypeCode,
  TaskStatusCode,
}
export type { ScannerAgentDiagnosticStatusCode, ScannerEndpointOnlineStatusCode }

export type ScannerKioskScanMode = 'DIRECT' | 'SUPPLEMENT' | 'ARCHIVE'
export type ScanBatchStatusCode = 'RECEIVED' | 'BLOCKED' | 'BOUND' | 'COMPLETED' | 'DISCARDED'
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
  scannerDeviceId: string
  scannerStationId: string
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
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
}

export interface ExamScannerKioskDeviceVO {
  scannerDeviceId: string
  scannerStationId: string
  scannerStationName?: string
  deviceName: string
  status: ScannerDeviceStatusCode
  onlineStatus: ScannerEndpointOnlineStatusCode
  scannerConnected: boolean
  pendingJobCount: number
  pendingUploadPageCount: number
  diagnosticStatus: ScannerAgentDiagnosticStatusCode
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
  /** 扫描站点业务 ID（与 deviceId 共同定位一体机） */
  scannerStationId?: string
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
  /** 批次级已绑定学生数 */
  boundStudentCount: number
  /** 批次级已绑定学生登记页数 */
  boundRegisteredPageCount: number
  status: ScanBatchStatusCode
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

export function getScannerKioskContext(
  request: ExamScannerKioskContextRequest,
): Promise<ExamScannerKioskContextVO> {
  return http.post<ExamScannerKioskContextVO>('/api/mark/scanner/kiosk/context', request)
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

export function pageScannerKioskExamOptions(
  request: ExamScannerKioskExamOptionRequest,
): Promise<PageResult<ExamScannerKioskExamOptionVO>> {
  return http.post<PageResult<ExamScannerKioskExamOptionVO>>(
    '/api/mark/scanner/kiosk/exam-options',
    request,
  )
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
  /** 后端签发的扫描报告 ID；本地 Agent push / commit 必须原值透传 */
  reportId?: string
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

export function startScannerKioskBatch(
  request: ExamScannerBatchStartRequest,
): Promise<ExamScannerBatchLifecycleVO> {
  return http.post<ExamScannerBatchLifecycleVO>('/api/mark/scanner/kiosk/batch/start', request)
}

export function closeScannerKioskBatch(
  request: ExamScannerBatchCloseRequest,
): Promise<ExamScannerBatchLifecycleVO> {
  return http.post<ExamScannerBatchLifecycleVO>('/api/mark/scanner/kiosk/batch/close', request)
}

export function sealScannerKioskBatch(
  request: ExamScannerBatchSealRequest,
): Promise<ExamScannerBatchLifecycleVO> {
  return http.post<ExamScannerBatchLifecycleVO>('/api/mark/scanner/kiosk/batch/seal', request)
}

export function discardScannerKioskBatch(request: ExamScanBatchDiscardRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/scanner/kiosk/batch/discard', request)
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

export function discardScannedPage(request: ExamScannedPageDiscardRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/scanner/kiosk/page/discard', request)
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
  /** 异常类型编码：QUALITY_BLOCK / PROCESSING_BLOCK / DUPLICATE_PENDING / RECOGNITION_REVIEW / BINDING_CONFLICT */
  attentionType?: ScanAttentionTypeCode
  attentionMessage?: string
  /** 已落库扫描页的最后操作人昵称；未 commit 的 pending 页无操作人 */
  operatorName?: string
  occurredAt?: string
}

/**
 * 异常待办合并视图，与 page-ledger items 通过 paperInstanceId / pageId 关联。
 */
export interface ExamScannerAttentionItemVO {
  id: string
  attentionType: ScanAttentionTypeCode
  sourceType: ScanAttentionSourceTypeCode
  sourceId?: string
  paperInstanceId?: string
  pageId?: string
  qualityDecision?: QualityDecisionCode
  processingStatus?: TaskStatusCode
  duplicateResolutionStatus?: DuplicateResolutionStatusCode
  gradeStatus?: GradeStatusCode
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

export function fetchScannerPageLedger(
  request: ExamScannerPageLedgerRequest,
): Promise<ExamScannerPageLedgerVO> {
  return http.post<ExamScannerPageLedgerVO>('/api/mark/scanner/kiosk/page-ledger', request)
}

export interface ExamScannerBoundPaperListRequest {
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  /** 当前活跃扫描批次 ID，必填 */
  scanBatchId: string
}

export interface ExamScannerBoundPaperItemVO {
  paperInstanceId: string
  scanBatchId: string
  scanBatchDisplayName: string
  candidateRosterId: string
  studentNo: string
  studentName: string
  classId?: string
  className?: string
  registeredPageCount: number
  boundTime: string
}

export function listScannerKioskBoundPapers(
  request: ExamScannerBoundPaperListRequest,
): Promise<ExamScannerBoundPaperItemVO[]> {
  return http.post<ExamScannerBoundPaperItemVO[]>('/api/mark/scanner/kiosk/bound-papers', request)
}

// ============================================================================
// 历史批次分页（按 examId + scannerDeviceId + scannerStationId 严格隔离）
// ============================================================================

/**
 * 扫描工作台历史批次分页查询请求。
 *
 * <p>一体机封存视图历史浏览专用：必须传 examId、scannerDeviceId、scannerStationId 三个 ID，
 * 后端 Controller 会强校验，防止跨 station 越权读取其它一体机的批次数据。</p>
 *
 * <p>缺省 includeDiscarded=true，让用户能查看完整生命周期（含已废弃批次的诊断信息）。</p>
 */
export interface ExamScannerKioskBatchHistoryRequest extends QueryDto {
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  /** 可选状态过滤：RECEIVED / BLOCKED / BOUND / COMPLETED / DISCARDED */
  status?: ScanBatchStatusCode
  /** 缺省 true，明确传 false 时排除已废弃批次 */
  includeDiscarded?: boolean
  /** 扫描开始时间下界（ISO 字符串） */
  scanStartTimeFrom?: string
  /** 扫描开始时间上界（ISO 字符串） */
  scanStartTimeTo?: string
}

/**
 * 扫描工作台历史批次列表项。
 *
 * <p>对应后端 {@code ExamScannerBatchResponse}，字段集合是 latestBatch 的超集：
 * 增加了 createTime / updateTime / eventCount / sourceFiles，但不包含
 * receivedPageCount / pendingUploadCount / attentionItemCount（后端聚合视图层差异，
 * 历史浏览场景已通过 statusMessage / diagnostic 表达）。</p>
 */
export interface ExamScannerKioskBatchHistoryItem {
  scanBatchId: string
  batchNo: string
  batchExternalNo: string
  scannerDeviceId: string
  scannerStationId?: string
  sourceFiles: ExamFileRefVO[]
  sourceFileCount: number
  pageCount: number
  /** 服务端实际已落库页数（一体机端实时统计；后端 latestBatch 与 history list 现已对齐字段） */
  receivedPageCount?: number
  /** 待上传页数（pageCount - receivedPageCount） */
  pendingUploadCount?: number
  /** 异常处置项数量（QUALITY_BLOCK / PROCESSING_BLOCK / DUPLICATE_PENDING / RECOGNITION_REVIEW / BINDING_CONFLICT） */
  attentionItemCount?: number
  scanMode: ScannerKioskScanMode
  targetPageNo?: number
  supplementReason?: string
  replaceTargetPage: boolean
  sealedAt?: string
  sealedBy?: string
  discardedAt?: string
  discardedBy?: string
  discardReason?: string
  status: ScanBatchStatusCode
  statusMessage: string
  diagnostic?: string
  scanStartTime?: string
  scanEndTime?: string
  createTime?: string
  updateTime?: string
  eventCount?: number
}

export async function pageScannerKioskBatchHistory(
  request: ExamScannerKioskBatchHistoryRequest,
): Promise<PageResult<ExamScannerKioskBatchHistoryItem>> {
  return http.post<PageResult<ExamScannerKioskBatchHistoryItem>>(
    '/api/mark/scanner/kiosk/batch/list',
    request,
  )
}
