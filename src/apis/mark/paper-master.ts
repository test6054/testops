/**
 * 制卷主链 API —— 试卷线上母版 & 批量印刷封装
 *
 * 后端 Controller: ExamMarkController
 * 基路径: /api/mark/exams
 */

import type { AxiosResponse } from 'axios'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const PRINT_PACKAGE_DATA_ERROR = '印刷包数据异常，请刷新后重试'

/** 试卷母版未配置业务码 - 与后端 ResultCodeEnum.EXAM_MARK_PAPER_MASTER_NOT_CONFIGURED 对齐 */
export const PAPER_MASTER_NOT_CONFIGURED_CODE = 20015

/** Axios 拦截器抛出的后端业务错误对象 */
type MarkBusinessError = Error & {
  code?: number | string
  response?: AxiosResponse<ResultInfo<null>>
}

/** 试卷线上母版状态编码 */
export type PaperMasterStatusCode = 'ACTIVE'

/** 印刷包状态编码 */
export type PrintPackageStatusCode = 'GENERATED'

/** 印刷包状态文案 - 必须与后端 PrintPackageStatus 完整一致 */
export const PRINT_PACKAGE_STATUS_LABEL: Record<PrintPackageStatusCode, string> = {
  GENERATED: '已生成',
}

/** 印刷包状态色调 - 必须与后端 PrintPackageStatus 完整一致 */
export const PRINT_PACKAGE_STATUS_TONE: Record<PrintPackageStatusCode, BadgeTone> = {
  GENERATED: 'green',
}

/** 印刷包明细状态编码 */
export type PrintPackageItemStatusCode = 'READY'

/** 身份填涂区类型编码 - 与后端 PaperMasterIdentityAreaType 完整一致 */
export type PaperMasterIdentityAreaTypeCode
  = | 'STUDENT_NO'
    | 'CLASS_NAME'
    | 'STUDENT_NAME'

export const PAPER_MASTER_IDENTITY_AREA_TYPE_LABEL: Record<
  PaperMasterIdentityAreaTypeCode,
  string
> = {
  STUDENT_NO: '学号',
  CLASS_NAME: '班级名称',
  STUDENT_NAME: '学生姓名',
}

// ─── 身份填涂区 ────────────────────────────────────────────────────────

/** 身份填涂区请求 */
export interface PaperMasterIdentityAreaRequest {
  /** 身份区域类型 */
  areaType: PaperMasterIdentityAreaTypeCode
  /** 所在页号 */
  pageNo: number
  /** 左上角X坐标 */
  x: number
  /** 左上角Y坐标 */
  y: number
  /** 区域宽度 */
  width: number
  /** 区域高度 */
  height: number
  /** 填涂格数量 */
  fillCellCount?: number
}

/** 身份填涂区响应 */
export interface PaperMasterIdentityAreaVO {
  identityAreaId: string
  areaType: PaperMasterIdentityAreaTypeCode
  pageNo: number
  x: number
  y: number
  width: number
  height: number
  fillCellCount: number
}

// ─── 客观题填涂区 ──────────────────────────────────────────────────────

/** 客观题填涂区选项请求 */
export interface PaperMasterObjectiveOptionRequest {
  /** 选项标签 */
  optionLabel: string
  /** 选项排序号 */
  sortNo: number
}

/** 客观题填涂区选项响应 */
export interface PaperMasterObjectiveOptionVO {
  optionId: string
  optionLabel: string
  sortNo: number
}

/** 客观题填涂区请求 */
export interface PaperMasterObjectiveAreaRequest {
  /** 题目模板ID */
  questionTemplateId: string
  /** 所在页号 */
  pageNo: number
  /** 可填涂选项集合 */
  options: PaperMasterObjectiveOptionRequest[]
  /** 左上角X坐标 */
  x: number
  /** 左上角Y坐标 */
  y: number
  /** 填涂框宽度 */
  boxWidth: number
  /** 填涂框高度 */
  boxHeight: number
}

/** 客观题填涂区响应 */
export interface PaperMasterObjectiveAreaVO {
  objectiveAreaId: string
  questionTemplateId: string
  pageNo: number
  options: PaperMasterObjectiveOptionVO[]
  x: number
  y: number
  boxWidth: number
  boxHeight: number
  optionCount: number
}

// ─── 试卷线上母版 ──────────────────────────────────────────────────────

/** 母版保存请求 */
export interface PaperMasterSaveRequest {
  /** 考试ID */
  examId: string
  /** 母版名称 */
  masterName: string
  /** 母版PDF文件ID */
  masterFileId: string
  /** 防伪水印文字 */
  watermarkText?: string
  /** 身份填涂区集合 */
  identityAreas?: PaperMasterIdentityAreaRequest[]
  /** 客观题填涂区集合 */
  objectiveAreas?: PaperMasterObjectiveAreaRequest[]
}

/** 母版响应 */
export interface PaperMasterVO {
  /** 是否已配置母版；false 时其余母版字段可能为空 */
  configured: boolean
  masterId?: string
  examId?: string
  templateId?: string
  masterName?: string
  masterFileId?: string
  watermarkText?: string
  status?: PaperMasterStatusCode
  identityAreas: PaperMasterIdentityAreaVO[]
  objectiveAreas: PaperMasterObjectiveAreaVO[]
}

// ─── 印刷包考生明细 ────────────────────────────────────────────────────

/** 考生印刷明细响应 */
export interface PrintPackageItemVO {
  printPackageItemId: string
  studentUserId: string
  studentNo: string
  studentName: string
  examRoom: string
  seatNo: string
  qrCode: string
  barCode: string
  securityCode: string
  printFileId: string
  status: PrintPackageItemStatusCode
}

// ─── 批量印刷封装 ──────────────────────────────────────────────────────

/** 印刷包查询请求 */
export interface PrintPackageQueryRequest {
  /** 考试ID */
  examId: string
  /** 印刷包ID（可选，传则查单个详情） */
  printPackageId?: string
}

/** 印刷包响应 */
export interface PrintPackageVO {
  printPackageId: string
  examId: string
  masterId: string
  packageNo: string
  packageName: string
  packageFileId: string
  itemCount: number
  status: PrintPackageStatusCode
  generatedTime: string
  sealRemark: string | null
  items: PrintPackageItemVO[]
}

// ─── 印刷包生成请求 ────────────────────────────────────────────────────

/** 印刷包自动生成请求 */
export interface PrintPackageGenerateRequest {
  /** 考试ID */
  examId: string
  /** 印刷包编号 */
  packageNo: string
  /** 印刷包名称 */
  packageName: string
  /** 封装备注 */
  sealRemark?: string
}

// ─── 印刷包分页查询 ────────────────────────────────────────────────────

/** 印刷包分页查询请求 */
export interface PrintPackagePageRequest extends QueryDto {
  examId: string
}

function requirePrintPackageText(value: string | undefined): void {
  if (!value) {
    throw new Error(PRINT_PACKAGE_DATA_ERROR)
  }
}

function requirePrintPackageNumber(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(PRINT_PACKAGE_DATA_ERROR)
  }
}

function requirePrintPackageRemark(value: string | null | undefined): void {
  if (value === undefined) {
    throw new Error(PRINT_PACKAGE_DATA_ERROR)
  }
}

function validatePrintPackageItemContract(record: PrintPackageItemVO): void {
  requirePrintPackageText(record.printPackageItemId)
  requirePrintPackageText(record.studentUserId)
  requirePrintPackageText(record.studentNo)
  requirePrintPackageText(record.studentName)
  requirePrintPackageText(record.qrCode)
  requirePrintPackageText(record.barCode)
  requirePrintPackageText(record.securityCode)
  requirePrintPackageText(record.printFileId)
  strictEnumLabel({ READY: '待印刷' }, record.status, '印刷包明细状态')
}

export function validatePrintPackageContract(record: PrintPackageVO): void {
  requirePrintPackageText(record.printPackageId)
  requirePrintPackageText(record.examId)
  requirePrintPackageText(record.masterId)
  requirePrintPackageText(record.packageNo)
  requirePrintPackageText(record.packageName)
  requirePrintPackageText(record.packageFileId)
  requirePrintPackageNumber(record.itemCount)
  strictEnumLabel(PRINT_PACKAGE_STATUS_LABEL, record.status, '印刷包状态')
  strictEnumTone(PRINT_PACKAGE_STATUS_TONE, record.status, '印刷包状态')
  requirePrintPackageText(record.generatedTime)
  requirePrintPackageRemark(record.sealRemark)
  record.items?.forEach(validatePrintPackageItemContract)
}

function validatePrintPackagePageContract(page: PageResult<PrintPackageVO>): PageResult<PrintPackageVO> {
  page.list.forEach(validatePrintPackageContract)
  return page
}

// ─── API 函数 ──────────────────────────────────────────────────────────

/**
 * 保存考试当前试卷线上母版
 * POST /api/mark/exams/paper-master/save
 */
export function savePaperMaster(request: PaperMasterSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/paper-master/save', request)
}

/** 生成标准试卷 PDF 请求 */
export interface StandardPaperGenerateRequest {
  examId: string
  universityName: string
  academicYear: string
  semester: string
  courseName: string
  examType?: string
  durationMin?: number
  questionHeaders?: string[]
}

/**
 * 生成中国高校标准期末考试试卷 PDF 并上传，返回母版 fileId
 * POST /api/mark/exams/paper-master/generate-standard
 */
export function generateStandardPaper(request: StandardPaperGenerateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/paper-master/generate-standard', request)
}

/** 生成标准答题卡 PDF 请求 */
export interface StandardAnswerSheetGenerateRequest {
  examId: string
  choiceCount?: number
  trueFalseCount?: number
  subjectNames?: string[]
  subjectLines?: number[]
}

/**
 * 生成中国高校标准答题卡 PDF 并上传，返回母版 fileId
 * POST /api/mark/exams/answer-sheet/generate-standard
 */
export function generateStandardAnswerSheet(request: StandardAnswerSheetGenerateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/answer-sheet/generate-standard', request)
}

/**
 * 查询考试当前试卷线上母版；未配置时返回 configured=false，不抛业务异常。
 * POST /api/mark/exams/paper-master/detail
 */
export function getPaperMaster(examId: string): Promise<PaperMasterVO> {
  return http.post<PaperMasterVO>('/api/mark/exams/paper-master/detail', { examId })
}

/**
 * 撤销考试当前试卷线上母版，释放试卷模板编辑锁。
 * POST /api/mark/exams/paper-master/revoke
 */
export function revokePaperMaster(examId: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/paper-master/revoke', { examId })
}

/**
 * 判断后端是否返回“试卷母版尚未配置”业务态。
 * 用于印刷包生成、选择题 OCR 等必须依赖母版的写操作，不用于 detail 查询。
 */
export function isPaperMasterNotConfiguredError(error: MarkBusinessError): boolean {
  const code = error.code ?? error.response?.data.code
  return Number(code) === PAPER_MASTER_NOT_CONFIGURED_CODE
}

/**
 * 查询印刷包详情
 * POST /api/mark/exams/print-package/detail
 */
export function getPrintPackage(request: PrintPackageQueryRequest): Promise<PrintPackageVO> {
  return http.post<PrintPackageVO>('/api/mark/exams/print-package/detail', request)
    .then((record) => {
      validatePrintPackageContract(record)
      return record
    })
}

/**
 * 自动生成印刷包（后端基于母版 + 名册合成）
 * POST /api/mark/exams/print-package/generate
 */
export function generatePrintPackage(request: PrintPackageGenerateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/print-package/generate', request)
}

/**
 * 分页查询印刷包列表
 * POST /api/mark/exams/print-package/page
 */
export function pagePrintPackages(request: PrintPackagePageRequest): Promise<PageResult<PrintPackageVO>> {
  return http.post<PageResult<PrintPackageVO>>('/api/mark/exams/print-package/page', request)
    .then(validatePrintPackagePageContract)
}
