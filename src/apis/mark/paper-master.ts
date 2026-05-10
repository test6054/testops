/**
 * 制卷主链 API —— 试卷线上母版 & 批量印刷封装
 *
 * 后端 Controller: ExamMarkController
 * 基路径: /api/mark/exams
 */

import http from '@/config/axios'

// ─── 身份填涂区 ────────────────────────────────────────────────────────

/** 身份填涂区请求 */
export interface PaperMasterIdentityAreaPayload {
  /** 身份区域类型（如 STUDENT_NO / NAME） */
  areaType: string
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
  areaType: string
  pageNo: number
  x: number
  y: number
  width: number
  height: number
  fillCellCount: number
}

// ─── 客观题填涂区 ──────────────────────────────────────────────────────

/** 客观题填涂区请求 */
export interface PaperMasterObjectiveAreaPayload {
  /** 题目模板ID */
  questionTemplateId: string
  /** 所在页号 */
  pageNo: number
  /** 选项标签文本（如 A,B,C,D） */
  optionLabels: string
  /** 左上角X坐标 */
  x: number
  /** 左上角Y坐标 */
  y: number
  /** 填涂框宽度 */
  boxWidth: number
  /** 填涂框高度 */
  boxHeight: number
  /** 选项数量 */
  optionCount: number
}

/** 客观题填涂区响应 */
export interface PaperMasterObjectiveAreaVO {
  objectiveAreaId: string
  questionTemplateId: string
  pageNo: number
  optionLabels: string
  x: number
  y: number
  boxWidth: number
  boxHeight: number
  optionCount: number
}

// ─── 试卷线上母版 ──────────────────────────────────────────────────────

/** 母版保存请求 */
export interface PaperMasterSavePayload {
  /** 考试ID */
  examId: string
  /** 母版名称 */
  masterName: string
  /** 母版PDF文件ID */
  masterFileId: string
  /** 防伪水印文字 */
  watermarkText?: string
  /** 身份填涂区集合 */
  identityAreas?: PaperMasterIdentityAreaPayload[]
  /** 客观题填涂区集合 */
  objectiveAreas?: PaperMasterObjectiveAreaPayload[]
}

/** 母版响应 */
export interface PaperMasterVO {
  masterId: string
  examId: string
  templateId: string
  masterName: string
  masterFileId: string
  watermarkText: string
  status: string
  identityAreas: PaperMasterIdentityAreaVO[]
  objectiveAreas: PaperMasterObjectiveAreaVO[]
}

// ─── 印刷包考生明细 ────────────────────────────────────────────────────

/** 考生印刷明细请求 */
export interface PrintPackageItemPayload {
  /** 考生名单ID */
  candidateRosterId: string
  /** 考场名称 */
  examRoom?: string
  /** 座位号 */
  seatNo?: string
  /** 二维码内容 */
  qrCode: string
  /** 条形码内容 */
  barCode: string
  /** 防伪码 */
  securityCode: string
  /** 考生印刷文件ID */
  printFileId: string
}

/** 考生印刷明细响应 */
export interface PrintPackageItemVO {
  printPackageItemId: string
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  examRoom: string
  seatNo: string
  qrCode: string
  barCode: string
  securityCode: string
  printFileId: string
  status: string
}

// ─── 批量印刷封装 ──────────────────────────────────────────────────────

/** 印刷包保存请求 */
export interface PrintPackageSavePayload {
  /** 考试ID */
  examId: string
  /** 印刷包编号 */
  packageNo: string
  /** 印刷包名称 */
  packageName: string
  /** 合并印刷文件ID */
  packageFileId: string
  /** 封装备注 */
  sealRemark?: string
  /** 考生印刷明细集合 */
  items?: PrintPackageItemPayload[]
}

/** 印刷包查询请求 */
export interface PrintPackageQueryPayload {
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
  status: string
  generatedTime: string
  sealRemark: string
  items: PrintPackageItemVO[]
}

// ─── 印刷包生成请求 ────────────────────────────────────────────────────

/** 印刷包自动生成请求 */
export interface PrintPackageGeneratePayload {
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
export interface PrintPackagePagePayload {
  examId: string
  pageNum: number
  pageSize: number
}

/** 分页结果通用结构 */
export interface PageResult<T> {
  list: T[]
  total: number
  pages: number
  pageNum: number
  pageSize: number
}

// ─── API 函数 ──────────────────────────────────────────────────────────

/**
 * 保存考试当前试卷线上母版
 * POST /api/mark/exams/paper-master/save
 */
export function savePaperMaster(payload: PaperMasterSavePayload): Promise<string> {
  return http.post<string>('/api/mark/exams/paper-master/save', payload)
}

/**
 * 查询考试当前试卷线上母版
 * POST /api/mark/exams/paper-master/detail
 */
export function getPaperMaster(examId: string): Promise<PaperMasterVO> {
  return http.post<PaperMasterVO>('/api/mark/exams/paper-master/detail', { examId })
}

/**
 * 保存批量打印封装
 * POST /api/mark/exams/print-package/save
 */
export function savePrintPackage(payload: PrintPackageSavePayload): Promise<string> {
  return http.post<string>('/api/mark/exams/print-package/save', payload)
}

/**
 * 查询印刷包详情
 * POST /api/mark/exams/print-package/detail
 */
export function getPrintPackage(payload: PrintPackageQueryPayload): Promise<PrintPackageVO> {
  return http.post<PrintPackageVO>('/api/mark/exams/print-package/detail', payload)
}

/**
 * 自动生成印刷包（后端基于母版 + 名册合成）
 * POST /api/mark/exams/print-package/generate
 */
export function generatePrintPackage(payload: PrintPackageGeneratePayload): Promise<string> {
  return http.post<string>('/api/mark/exams/print-package/generate', payload)
}

/**
 * 分页查询印刷包列表
 * POST /api/mark/exams/print-package/page
 */
export function pagePrintPackages(payload: PrintPackagePagePayload): Promise<PageResult<PrintPackageVO>> {
  return http.post<PageResult<PrintPackageVO>>('/api/mark/exams/print-package/page', payload)
}
