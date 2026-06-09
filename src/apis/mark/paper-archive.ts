/**
 * 纸质试卷档案库 API - 对接 edu-mark 模块 PaperArchiveController
 *
 * 业务定位：
 *   独立于批改主链 / 考后归档主链。用于历史纸质试卷的扫描入库、打 tag、检索、OCR 识别、归档。
 *   不依赖 examId，不复用 ArchivePackageStatus 枚举。
 *
 * 主链：
 *   1. createSet 创建档案集草稿（DRAFT）
 *   2. activateSet 推进 DRAFT -> ACTIVE
 *   3. uploadItem 上传一份扫描影像（multipart），落库后入队 OCR
 *   4. searchItems 跨档案集 / 单档案集检索（支持 tag / OCR 文本 / 学号 / 课程过滤）
 *   5. updateSetTags / updateItemTags 全量替换 tag
 *   6. triggerItemOcr 手动触发 OCR 识别（失败重试）
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

// ─── 状态枚举与文案 ───────────────────────────────────────────

/** 档案集状态编码 - 对应后端 PaperArchiveSetStatus */
export type PaperArchiveSetStatusCode
  = | 'DRAFT'
    | 'ACTIVE'
    | 'APPRAISAL_PENDING'
    | 'APPRAISAL_DECIDED'
    | 'DESTRUCTION_PENDING'
    | 'DESTRUCTION_APPROVED'
    | 'DESTRUCTION_EXECUTING'
    | 'DESTROYED'
    | 'DESTRUCTION_FAILED'

export const PAPER_ARCHIVE_SET_STATUS_LABEL: Record<PaperArchiveSetStatusCode, string> = {
  DRAFT: '草稿',
  ACTIVE: '保管中',
  APPRAISAL_PENDING: '鉴定待办',
  APPRAISAL_DECIDED: '鉴定完成',
  DESTRUCTION_PENDING: '销毁待审',
  DESTRUCTION_APPROVED: '销毁通过',
  DESTRUCTION_EXECUTING: '销毁执行中',
  DESTROYED: '已销毁',
  DESTRUCTION_FAILED: '销毁执行失败',
}

export const PAPER_ARCHIVE_SET_STATUS_TONE: Record<
  PaperArchiveSetStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  APPRAISAL_PENDING: 'orange',
  APPRAISAL_DECIDED: 'purple',
  DESTRUCTION_PENDING: 'orange',
  DESTRUCTION_APPROVED: 'purple',
  DESTRUCTION_EXECUTING: 'blue',
  DESTROYED: 'red',
  DESTRUCTION_FAILED: 'red',
}

/** 纸质试卷档案集状态下拉选项，值必须与后端 PaperArchiveSetStatus 完全一致 */
export const PAPER_ARCHIVE_SET_STATUS_OPTIONS: Array<{
  label: string
  value: PaperArchiveSetStatusCode
}> = [
  { value: 'DRAFT', label: PAPER_ARCHIVE_SET_STATUS_LABEL.DRAFT },
  { value: 'ACTIVE', label: PAPER_ARCHIVE_SET_STATUS_LABEL.ACTIVE },
  { value: 'APPRAISAL_PENDING', label: PAPER_ARCHIVE_SET_STATUS_LABEL.APPRAISAL_PENDING },
  { value: 'APPRAISAL_DECIDED', label: PAPER_ARCHIVE_SET_STATUS_LABEL.APPRAISAL_DECIDED },
  { value: 'DESTRUCTION_PENDING', label: PAPER_ARCHIVE_SET_STATUS_LABEL.DESTRUCTION_PENDING },
  { value: 'DESTRUCTION_APPROVED', label: PAPER_ARCHIVE_SET_STATUS_LABEL.DESTRUCTION_APPROVED },
  { value: 'DESTRUCTION_EXECUTING', label: PAPER_ARCHIVE_SET_STATUS_LABEL.DESTRUCTION_EXECUTING },
  { value: 'DESTROYED', label: PAPER_ARCHIVE_SET_STATUS_LABEL.DESTROYED },
  { value: 'DESTRUCTION_FAILED', label: PAPER_ARCHIVE_SET_STATUS_LABEL.DESTRUCTION_FAILED },
]

/** 档案项 OCR 状态编码 - 对应后端 PaperArchiveOcrStatus */
export type PaperArchiveOcrStatusCode
  = | 'NONE'
    | 'PENDING'
    | 'RUNNING'
    | 'COMPLETED'
    | 'FAILED'

export const PAPER_ARCHIVE_OCR_STATUS_LABEL: Record<PaperArchiveOcrStatusCode, string> = {
  NONE: '未识别',
  PENDING: '已入队',
  RUNNING: '识别中',
  COMPLETED: '已完成',
  FAILED: '失败',
}

export const PAPER_ARCHIVE_OCR_STATUS_TONE: Record<
  PaperArchiveOcrStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange'
> = {
  NONE: 'gray',
  PENDING: 'blue',
  RUNNING: 'orange',
  COMPLETED: 'green',
  FAILED: 'red',
}

/** 纸质试卷档案项 OCR 状态下拉选项，值必须与后端 PaperArchiveOcrStatus 完全一致 */
export const PAPER_ARCHIVE_OCR_STATUS_OPTIONS: Array<{
  label: string
  value: PaperArchiveOcrStatusCode
}> = [
  { value: 'NONE', label: PAPER_ARCHIVE_OCR_STATUS_LABEL.NONE },
  { value: 'PENDING', label: PAPER_ARCHIVE_OCR_STATUS_LABEL.PENDING },
  { value: 'RUNNING', label: PAPER_ARCHIVE_OCR_STATUS_LABEL.RUNNING },
  { value: 'COMPLETED', label: PAPER_ARCHIVE_OCR_STATUS_LABEL.COMPLETED },
  { value: 'FAILED', label: PAPER_ARCHIVE_OCR_STATUS_LABEL.FAILED },
]

// ─── 请求 / 响应模型 ───────────────────────────────────────────

/** 创建档案集请求 - 对应 PaperArchiveSetCreateRequest */
export interface PaperArchiveSetCreateRequest {
  /** 业务编号（租户内唯一），不传由后端按规则生成 PAR-{tenantId}-{yyyymmdd}-{rand} */
  archiveNo?: string
  archiveTitle: string
  /** 关联课程 ID（可空） */
  courseId?: string | null
  examYear?: string
  examTerm?: string
  examRound?: string
  tags?: string[]
  /** 保管年限（年），permanentRetention=true 时忽略，非永久档案集必填 */
  retentionYears?: number
  /** 是否永久保管 */
  permanentRetention?: boolean
}

/** 档案集分页查询请求 - 对应 PaperArchiveSetQueryRequest */
export interface PaperArchiveSetQueryRequest extends QueryDto {
  archiveNoKeyword?: string
  titleKeyword?: string
  courseId?: string | null
  examYear?: string
  examTerm?: string
  archiveStatus?: PaperArchiveSetStatusCode
}

/** tag 更新请求 - 对应 PaperArchiveTagUpdateRequest */
export interface PaperArchiveTagUpdateRequest {
  /** 档案集 ID 或档案项 ID，由调用接口决定语义 */
  targetId: string
  /** tag 列表，传 null 或空数组表示清空 */
  tags?: string[] | null
}

/** 档案项检索请求 - 对应 PaperArchiveItemSearchRequest */
export interface PaperArchiveItemSearchRequest extends QueryDto {
  /** 档案集 ID 过滤；为空表示跨档案集搜索 */
  archiveSetId?: string | null
  /** tag 任一匹配 */
  tagAny?: string[]
  /** OCR 文本关键词（模糊匹配） */
  ocrTextKeyword?: string
  /** 学号精确过滤 */
  studentNo?: string
  /** 姓名关键词 */
  studentNameKeyword?: string
  /** OCR 状态过滤 */
  ocrStatus?: PaperArchiveOcrStatusCode
  /** 关联课程过滤（通过档案集 join 查询） */
  courseId?: string | null
  examYear?: string
  examTerm?: string
}

/** 档案集响应视图 - 对应 PaperArchiveSetResponse */
export interface PaperArchiveSetVO {
  archiveSetId: string
  archiveNo: string
  archiveTitle: string
  courseId?: string
  examYear?: string
  examTerm?: string
  examRound?: string
  paperCount: number
  archiveStatus: PaperArchiveSetStatusCode
  archiveStatusMessage: string
  tags?: string[]
  retentionYears?: number
  retentionUntil?: string
  permanentRetention?: boolean
  createUser?: string
  createTime?: string
  updateTime?: string
}

/** 档案项响应视图 - 对应 PaperArchiveItemResponse */
export interface PaperArchiveItemVO {
  itemId: string
  archiveSetId: string
  archiveSetTitle?: string
  sequenceNo?: number
  studentNo?: string
  studentName?: string
  finalScore?: number
  fileId?: string
  fileName?: string
  pageCount?: number
  ocrStatus: PaperArchiveOcrStatusCode
  ocrStatusMessage: string
  ocrText?: string
  ocrFinishedTime?: string
  ocrFailureReason?: string
  tags?: string[]
  remark?: string
  createUser?: string
  createTime?: string
  updateTime?: string
}

/**
 * 档案项注册请求 - 对应后端 PaperArchiveItemRegisterRequest。
 *
 * 调用约定：调用方必须先调 edu-storage 的 uploadFile() 直传扫描影像，
 * 拿到 FileSystemNodeResponseDTO.id 作为 fileId 后再调本接口。
 * 业务服务会反查 storage 节点 + 元数据，然后把文件 TEMP→CONFIRMED。
 */
export interface PaperArchiveItemRegisterRequest {
  archiveSetId: string
  /** edu-storage 上传后返回的 FileSystemNode.id（即 fileId） */
  fileId: string
  /** 序号；不传时由后端按已有最大序号 + 1 自动分配 */
  sequenceNo?: number
  studentNo?: string
  studentName?: string
  finalScore?: number
  pageCount?: number
  tags?: string[]
  remark?: string
  /** 是否上传后立即触发 OCR 识别（缺省 true） */
  triggerOcr?: boolean
}

// ─── API 调用 ──────────────────────────────────────────────────

/**
 * 创建档案集草稿
 * POST /api/mark/paper-archive/sets/create
 */
export function createPaperArchiveSet(request: PaperArchiveSetCreateRequest): Promise<string> {
  return http.post<string>('/api/mark/paper-archive/sets/create', request)
}

/**
 * 推进档案集 DRAFT -> ACTIVE
 * POST /api/mark/paper-archive/sets/activate
 *
 * @param archiveSetId 档案集 ID
 */
export function activatePaperArchiveSet(archiveSetId: string): Promise<PaperArchiveSetVO> {
  return http.post<PaperArchiveSetVO>('/api/mark/paper-archive/sets/activate', {
    targetId: archiveSetId,
  })
}

/**
 * 分页查询档案集
 * POST /api/mark/paper-archive/sets/page
 */
export function pagePaperArchiveSets(
  request: PaperArchiveSetQueryRequest,
): Promise<PageResult<PaperArchiveSetVO>> {
  return http.post<PageResult<PaperArchiveSetVO>>('/api/mark/paper-archive/sets/page', request)
}

/**
 * 查询档案集详情
 * POST /api/mark/paper-archive/sets/detail
 *
 * @param archiveSetId 档案集 ID
 */
export function getPaperArchiveSetDetail(archiveSetId: string): Promise<PaperArchiveSetVO> {
  return http.post<PaperArchiveSetVO>('/api/mark/paper-archive/sets/detail', {
    targetId: archiveSetId,
  })
}

/**
 * 更新档案集 tag（全量替换）
 * POST /api/mark/paper-archive/sets/tags/update
 */
export function updatePaperArchiveSetTags(
  request: PaperArchiveTagUpdateRequest,
): Promise<PaperArchiveSetVO> {
  return http.post<PaperArchiveSetVO>('/api/mark/paper-archive/sets/tags/update', request)
}

/**
 * 注册一份纸质试卷档案项。
 *
 * 两步上传流程的第二步：调用方先使用 @/apis/edu/file-management.ts 的
 * uploadFile(file, { businessType: 'paper-archive-scan' }) 直传 edu-storage，
 * 拿到 FileSystemNodeResponseDTO.id（即 fileId）后调本接口注册。
 *
 * 业务服务会负责：
 *   1. 反查 storage 节点与元数据，校验租户一致性与 FILE 类型；
 *   2. 调 storage confirmFiles 把节点状态由 TEMP 切为 CONFIRMED；
 *   3. 落库 t_paper_archive_item，fileName/fileSize/fileHash 以 storage 真源为准；
 *   4. 若 triggerOcr 不为 false，会设置 ocr_status=PENDING 入队异步 OCR。
 *
 * POST /api/mark/paper-archive/items/register
 */
export function registerPaperArchiveItem(
  request: PaperArchiveItemRegisterRequest,
): Promise<PaperArchiveItemVO> {
  return http.post<PaperArchiveItemVO>('/api/mark/paper-archive/items/register', request)
}

/**
 * 更新档案项 tag（全量替换）
 * POST /api/mark/paper-archive/items/tags/update
 */
export function updatePaperArchiveItemTags(
  request: PaperArchiveTagUpdateRequest,
): Promise<PaperArchiveItemVO> {
  return http.post<PaperArchiveItemVO>('/api/mark/paper-archive/items/tags/update', request)
}

/**
 * 检索档案项
 * POST /api/mark/paper-archive/items/search
 */
export function searchPaperArchiveItems(
  request: PaperArchiveItemSearchRequest,
): Promise<PageResult<PaperArchiveItemVO>> {
  return http.post<PageResult<PaperArchiveItemVO>>(
    '/api/mark/paper-archive/items/search',
    request,
  )
}

/**
 * 触发档案项 OCR 识别（手动或失败重试）
 * POST /api/mark/paper-archive/items/ocr/trigger
 *
 * @param itemId 档案项 ID
 */
export function triggerPaperArchiveItemOcr(itemId: string): Promise<PaperArchiveItemVO> {
  return http.post<PaperArchiveItemVO>('/api/mark/paper-archive/items/ocr/trigger', {
    targetId: itemId,
  })
}
