/**
 * 考试制卷摘要查询 API — 对接 POST /api/mark/exams/layout-question/summary（layout 域只读摘要）。
 */
import type { AnonymityModeCode } from './anonymity-mode'
import type { EffectiveStatusCode } from './effective-status'
import type { ExamLayoutEntryKindCode } from './exam-layout-entry-kind'
import type { ExamPaperPageKindCode } from './exam-paper-page-kind'
import type { ExamQuestionRegionRoleCode } from './exam-question-region-role'
import type { MarkOcrSceneCode } from './ocr-scene'
import type { QuestionTypeCode } from './question-type'
import http from '@/config/axios'

export interface ExamPaperPageTemplateResponse {
  pageTemplateId: string
  pageNo: number
  templateFileId?: string
  widthPx?: number
  heightPx?: number
}

export interface ExamLayoutQuestionViewResponse {
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  /** OCR 细粒度场景，与后端 MarkOcrScene.code 一致 */
  ocrScene: MarkOcrSceneCode
  /** 主 ROI 是否已配置；false 时 sourcePageKind 与 regionRole 为空 */
  roiReady: boolean
  /** 主 ROI 来源页面类型，仅 roiReady=true 时有值；题级不出现 HYBRID */
  sourcePageKind?: ExamPaperPageKindCode
  /** 主 ROI 区域角色，仅 roiReady=true 时有值 */
  regionRole?: ExamQuestionRegionRoleCode
  fullScore: number
  pageNo?: number
  x?: number
  y?: number
  width?: number
  height?: number
  knowledgeId?: string
  sortNo?: number
  questionStem?: string
}

export interface ExamTemplateResponse {
  configured: boolean
  examId: string
  templateId?: string
  templateName?: string
  totalPages?: number
  status?: EffectiveStatusCode
  pages: ExamPaperPageTemplateResponse[]
  questions: ExamLayoutQuestionViewResponse[]
  subjectiveAnonymityMode?: AnonymityModeCode
  /** 当前生效制卷入口类型 */
  layoutEntryKind?: ExamLayoutEntryKindCode
  /** 制卷题目总数 */
  totalQuestionCount?: number
  /** ROI 已就绪题目数 */
  roiReadyQuestionCount?: number
  /** MVR-277：阅卷写权限能力位（修正答案等） */
  canManageReviewerWrites?: boolean
}

export function getExamLayoutQuestionSummary(examId: string): Promise<ExamTemplateResponse> {
  return http.post<ExamTemplateResponse>('/api/mark/exams/layout-question/summary', { examId })
}
