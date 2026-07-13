import type {
  ExamLayoutBlockDto,
  ExamLayoutDocument,
  ExamLayoutPageDto,
  ExamLayoutRectNorm,
} from '@/apis/mark/exam-layout-design'
import {
  ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES,
  ExamLayoutBlockTypeCode,
  getExamLayoutBlockTypeDescription,
  requireExamLayoutBlockTypeCode,
} from '@/types/enums/exam-layout-block-type-enum'
import { ExamLayoutEntryKindCode } from '@/types/enums/exam-layout-entry-kind-enum'
import {
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES,
  ExamLayoutPaperSpecCode,
  ExamLayoutPaperSpecMm,
  getExamLayoutPaperSpecDescription,
  requireExamLayoutPaperSpecCode,
} from '@/types/enums/exam-layout-paper-spec-enum'
import { MarkOcrSceneCode } from '@/types/enums/mark-ocr-scene-enum'
import { ObjectiveComparePolicyCode } from '@/types/enums/objective-compare-policy-enum'
import {
  ALL_PAPER_MASTER_IDENTITY_AREA_TYPE_CODES,
  PaperMasterIdentityAreaTypeCode,
} from '@/types/enums/paper-master-identity-area-type-enum'
import { createClientUuid } from '@/utils/client-uuid'

export {
  ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES,
  ExamLayoutBlockTypeCode,
  ExamLayoutBlockTypeDescription,
  ExamLayoutBlockTypeOptions,
  getExamLayoutBlockTypeDescription,
  requireExamLayoutBlockTypeCode,
} from '@/types/enums/exam-layout-block-type-enum'

export {
  ExamLayoutEntryKindCode,
  ExamLayoutEntryKindDescription,
} from '@/types/enums/exam-layout-entry-kind-enum'

export {
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES,
  defaultBlankSheetPaperSpec,
  ExamLayoutPaperSpecCode,
  ExamLayoutPaperSpecDescription,
  ExamLayoutPaperSpecMm,
  ExamLayoutPaperSpecOptions,
  getExamLayoutPaperSpecDescription,
  requireExamLayoutPaperSpecCode,
} from '@/types/enums/exam-layout-paper-spec-enum'

export const EXAM_LAYOUT_BLOCK_TYPE_COLOR: Record<ExamLayoutBlockTypeCode, string> = {
  [ExamLayoutBlockTypeCode.IDENTITY_BUBBLE]: 'rgba(22, 119, 255, 0.14)',
  [ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX]: 'rgba(82, 196, 26, 0.14)',
  [ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER]: 'rgba(250, 173, 20, 0.16)',
  [ExamLayoutBlockTypeCode.QUESTION_STEM]: 'rgba(114, 46, 209, 0.12)',
  [ExamLayoutBlockTypeCode.FORBIDDEN_ZONE]: 'rgba(255, 77, 79, 0.12)',
}

export const EXAM_LAYOUT_BLOCK_TYPE_STROKE: Record<ExamLayoutBlockTypeCode, string> = {
  [ExamLayoutBlockTypeCode.IDENTITY_BUBBLE]: '#1677ff',
  [ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX]: '#52c41a',
  [ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER]: '#faad14',
  [ExamLayoutBlockTypeCode.QUESTION_STEM]: '#722ed1',
  [ExamLayoutBlockTypeCode.FORBIDDEN_ZONE]: '#ff4d4f',
}

const DEFAULT_SAFE_MARGIN_MM = 5
const DEFAULT_STAGE_WIDTH = 760

export function resolvePaperSpecLabel(paperSpec: string | undefined): string {
  return getExamLayoutPaperSpecDescription(requireExamLayoutPaperSpecCode(paperSpec))
}

export function resolvePaperMm(
  paperSpec: string | undefined,
  page: ExamLayoutPageDto,
): { widthMm: number, heightMm: number } {
  const code = ALL_EXAM_LAYOUT_PAPER_SPEC_CODES.find((item) => item === paperSpec)
  if (code) {
    return ExamLayoutPaperSpecMm[code]
  }
  if (page.naturalWidthPx >= page.naturalHeightPx) {
    return ExamLayoutPaperSpecMm[ExamLayoutPaperSpecCode.A3_2COL]
  }
  return ExamLayoutPaperSpecMm[ExamLayoutPaperSpecCode.A4_1COL]
}

export function resolveBlockTypeLabel(blockType: string | undefined): string {
  return getExamLayoutBlockTypeDescription(requireExamLayoutBlockTypeCode(blockType))
}

export function resolveBlockFill(blockType: string): string {
  const code = ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES.find((item) => item === blockType)
  if (code) {
    return EXAM_LAYOUT_BLOCK_TYPE_COLOR[code]
  }
  return 'rgba(22, 119, 255, 0.08)'
}

export function resolveBlockStroke(blockType: string): string {
  const code = ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES.find((item) => item === blockType)
  if (code) {
    return EXAM_LAYOUT_BLOCK_TYPE_STROKE[code]
  }
  return '#94a3b8'
}

export function resolveSafeMarginMm(document: ExamLayoutDocument | null): number {
  return document?.printSafeMarginMm ?? DEFAULT_SAFE_MARGIN_MM
}

export function mmToPx(mm: number, naturalSizePx: number, mmReference: number): number {
  return Math.round((mm * naturalSizePx) / mmReference)
}

export function pxToMm(px: number, naturalSizePx: number, mmReference: number): number {
  return Math.round((px / naturalSizePx) * mmReference * 10) / 10
}

export function normToStageRect(
  rectNorm: ExamLayoutRectNorm,
  page: ExamLayoutPageDto,
  stageWidth: number,
): { x: number, y: number, width: number, height: number } {
  const stageHeight = Math.round(stageWidth * (page.naturalHeightPx / page.naturalWidthPx))
  return {
    x: rectNorm.x * stageWidth,
    y: rectNorm.y * stageHeight,
    width: rectNorm.w * stageWidth,
    height: rectNorm.h * stageHeight,
  }
}

export function stageRectToNorm(
  x: number,
  y: number,
  width: number,
  height: number,
  page: ExamLayoutPageDto,
  stageWidth: number,
): ExamLayoutRectNorm {
  const stageHeight = Math.round(stageWidth * (page.naturalHeightPx / page.naturalWidthPx))
  const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max)
  const nx = clamp(x, stageWidth) / stageWidth
  const ny = clamp(y, stageHeight) / stageHeight
  const nw = clamp(width, stageWidth - x) / stageWidth
  const nh = clamp(height, stageHeight - y) / stageHeight
  return {
    x: roundNorm(nx),
    y: roundNorm(ny),
    w: roundNorm(nw),
    h: roundNorm(nh),
  }
}

function roundNorm(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

export function computeStageSize(
  page: ExamLayoutPageDto | null,
  stageWidth = DEFAULT_STAGE_WIDTH,
): {
  width: number
  height: number
} {
  if (!page?.naturalWidthPx || !page.naturalHeightPx) {
    return { width: stageWidth, height: Math.round(stageWidth * 1.414) }
  }
  const height = Math.round(stageWidth * (page.naturalHeightPx / page.naturalWidthPx))
  return { width: stageWidth, height }
}

export function blocksOnPage(
  document: ExamLayoutDocument | null,
  pageNo: number,
): ExamLayoutBlockDto[] {
  if (!document?.blocks?.length) {
    return []
  }
  return document.blocks
    .filter((block) => block.pageNo === pageNo)
    .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0))
}

export function pageByNo(
  document: ExamLayoutDocument | null,
  pageNo: number,
): ExamLayoutPageDto | null {
  return document?.pages?.find((page) => page.pageNo === pageNo) ?? null
}

export function createClientBlockId(): string {
  return createClientUuid()
}

export function createDefaultBlock(
  pageNo: number,
  blockType: ExamLayoutBlockTypeCode,
  layer: number,
): ExamLayoutBlockDto {
  const block: ExamLayoutBlockDto = {
    id: createClientBlockId(),
    pageNo,
    blockType,
    layer,
    rectNorm: { x: 0.12, y: 0.12, w: 0.28, h: 0.06 },
  }
  if (blockType === ExamLayoutBlockTypeCode.IDENTITY_BUBBLE) {
    block.identityAreaType = PaperMasterIdentityAreaTypeCode.STUDENT_NO
  }
  return block
}

/** 在指定归一化坐标创建识别块，供画布框选工具使用。 */
export function createBlockWithRect(
  pageNo: number,
  blockType: ExamLayoutBlockTypeCode,
  layer: number,
  rectNorm: ExamLayoutRectNorm,
): ExamLayoutBlockDto {
  const block = createDefaultBlock(pageNo, blockType, layer)
  block.rectNorm = rectNorm
  return block
}

export function formatRectMmLabel(
  rectNorm: ExamLayoutRectNorm,
  page: ExamLayoutPageDto,
  paperSpec?: string,
): string {
  const paperMm = resolvePaperMm(paperSpec, page)
  const xPx = rectNorm.x * page.naturalWidthPx
  const yPx = rectNorm.y * page.naturalHeightPx
  const wPx = rectNorm.w * page.naturalWidthPx
  const hPx = rectNorm.h * page.naturalHeightPx
  return `${pxToMm(xPx, page.naturalWidthPx, paperMm.widthMm)}×${pxToMm(yPx, page.naturalHeightPx, paperMm.heightMm)} mm · ${pxToMm(wPx, page.naturalWidthPx, paperMm.widthMm)}×${pxToMm(hPx, page.naturalHeightPx, paperMm.heightMm)} mm`
}

export function hasIdentityBlock(document: ExamLayoutDocument | null): boolean {
  return Boolean(
    document?.blocks?.some((block) => block.blockType === ExamLayoutBlockTypeCode.IDENTITY_BUBBLE),
  )
}

const ANSWER_BLOCK_TYPES = new Set<string>([
  ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER,
  ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX,
])

/** 题级主作答 ROI 是否就绪，与 summary roiReady 谓词一致。 */
export function isLayoutQuestionRoiReady(
  document: ExamLayoutDocument | null,
  questionId: string,
): boolean {
  return Boolean(
    document?.blocks?.some(
      (block) => block.layoutQuestionId === questionId && ANSWER_BLOCK_TYPES.has(block.blockType),
    ),
  )
}

/** 查找题目主作答块，用于题单点击定位 ROI。 */
export function findPrimaryAnswerBlockForQuestion(
  document: ExamLayoutDocument | null,
  questionId: string,
): ExamLayoutBlockDto | null {
  if (!document?.blocks?.length) {
    return null
  }
  const answerBlocks = document.blocks.filter(
    (block) => block.layoutQuestionId === questionId && ANSWER_BLOCK_TYPES.has(block.blockType),
  )
  if (answerBlocks.length === 0) {
    return null
  }
  return answerBlocks.sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0))[0]
}

/** 查找题目的首个结构块；不变量：题单点击即使缺少作答 ROI，也要定位到可复核的题干切片。 */
export function findPrimaryBlockForQuestion(
  document: ExamLayoutDocument | null,
  questionId: string,
): ExamLayoutBlockDto | null {
  if (!document?.blocks?.length) {
    return null
  }
  const relatedBlocks = document.blocks.filter((block) => block.layoutQuestionId === questionId)
  if (relatedBlocks.length === 0) {
    return null
  }
  return relatedBlocks.sort((a, b) => {
    const typeOrder = (blockType: string) => {
      if (blockType === ExamLayoutBlockTypeCode.QUESTION_STEM) {
        return 0
      }
      if (ANSWER_BLOCK_TYPES.has(blockType)) {
        return 1
      }
      return 2
    }
    return (
      typeOrder(a.blockType) - typeOrder(b.blockType)
      || a.pageNo - b.pageNo
      || (a.layer ?? 0) - (b.layer ?? 0)
    )
  })[0]
}

/** 仅选择/判断使用客观填涂矩阵；填空/数值虽为主类型 OBJECTIVE，但作答块仍为书写作答区。 */
const BUBBLE_OCR_SCENES = new Set(['CHOICE', 'TRUE_FALSE'])

export function isBubbleOcrScene(ocrScene?: string): boolean {
  return Boolean(ocrScene && BUBBLE_OCR_SCENES.has(ocrScene))
}

export function expectedAnswerBlockTypeForOcrScene(ocrScene?: string): string {
  return isBubbleOcrScene(ocrScene)
    ? ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX
    : ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER
}

export interface LayoutRoiStats {
  totalQuestionCount: number
  roiReadyQuestionCount: number
  notReadyQuestionNos: string[]
}

/** 统计设计器内题级 ROI 就绪度，供顶栏与 Banner 展示。 */
export function computeLayoutRoiStats(document: ExamLayoutDocument | null): LayoutRoiStats {
  const questions = document?.questions ?? []
  const notReadyQuestionNos: string[] = []
  let roiReadyQuestionCount = 0
  for (const question of questions) {
    if (!question.id) {
      continue
    }
    if (isLayoutQuestionRoiReady(document, question.id)) {
      roiReadyQuestionCount += 1
    } else if (question.questionNo) {
      notReadyQuestionNos.push(question.questionNo)
    }
  }
  return {
    totalQuestionCount: questions.length,
    roiReadyQuestionCount,
    notReadyQuestionNos,
  }
}

/**
 * 制卷保存前业务校验；不变量：与后端 ExamLayoutDesignValidator 保存门禁保持一致，前端只提前暴露可修复问题。
 */
export function validateLayoutDocumentForSave(document: ExamLayoutDocument | null): string[] {
  const reasons: string[] = []
  if (!document) {
    return ['请先生成答题卡或自动预划区后再保存']
  }
  if (!document.layoutName?.trim()) {
    reasons.push('请填写制卷名称')
  }
  if (document.layoutEntryKind === ExamLayoutEntryKindCode.SOURCE_FILE) {
    if (!document.sourcePdfFileId?.trim()) {
      reasons.push('请上传整卷试卷源文件')
    }
    if (document.totalPages != null && document.totalPages < 0) {
      reasons.push('整卷试卷页数不能为负数')
    }
    if (!document.pages?.length) {
      reasons.push('整卷试卷尚未完成分页解析，请等待题目识别完成')
    }
    const sourcePageNos = new Set<number>()
    const sourceTotalPages
      = document.totalPages && document.totalPages > 0 ? document.totalPages : document.pages?.length
    for (const page of document.pages ?? []) {
      if (
        !page.pageNo
        || page.pageNo <= 0
        || (sourceTotalPages && page.pageNo > sourceTotalPages)
      ) {
        reasons.push('整卷试卷页号必须在 1 到总页数之间')
        continue
      }
      if (sourcePageNos.has(page.pageNo)) {
        reasons.push(`整卷试卷第 ${page.pageNo} 页重复`)
      }
      sourcePageNos.add(page.pageNo)
      if (!page.backgroundFileId) {
        reasons.push(`整卷试卷第 ${page.pageNo} 页缺少背景文件`)
      }
      if (!page.naturalWidthPx || !page.naturalHeightPx) {
        reasons.push(`整卷试卷第 ${page.pageNo} 页尺寸未解析`)
      }
    }
    const sourceQuestions = document.questions ?? []
    if (sourceQuestions.length === 0) {
      reasons.push('整卷试卷尚未解析出题目，请重新识别后再保存')
    }
    const roiStats = computeLayoutRoiStats(document)
    if (roiStats.notReadyQuestionNos.length > 0) {
      const preview = roiStats.notReadyQuestionNos.slice(0, 6).join('、')
      const suffix = roiStats.notReadyQuestionNos.length > 6 ? ' 等' : ''
      reasons.push(
        `${roiStats.notReadyQuestionNos.length} 道题未配置 ROI：第 ${preview}${suffix} 题`,
      )
    }
    for (const question of sourceQuestions) {
      if (!question.id) {
        reasons.push('整卷试卷题目缺少前端标识')
      }
      if (!question.questionNo?.trim() || !question.normalizedQuestionNo?.trim()) {
        reasons.push(`题 ${question.questionNo || question.id || '-'} 缺少题号`)
      }
      if (question.questionType !== 'OBJECTIVE' && question.questionType !== 'SUBJECTIVE') {
        reasons.push(`题 ${question.questionNo || question.id} 的题型必须是客观题或主观题`)
      }
      if (!question.ocrScene?.trim()) {
        reasons.push(`题 ${question.questionNo || question.id} 缺少 OCR 场景`)
      }
      if (question.fullScore == null || Number(question.fullScore) <= 0) {
        reasons.push(`题 ${question.questionNo || question.id} 的满分必须大于 0`)
      }
    }
    if (!hasIdentityBlock(document)) {
      reasons.push('请至少配置一个身份填涂区')
    } else {
      reasons.push(...validateIdentityAreaTypes(document))
    }
    return reasons
  }
  if (!document.totalPages || document.totalPages <= 0) {
    reasons.push('总页数必须大于 0')
  }
  const pageNos = new Set<number>()
  for (const page of document.pages ?? []) {
    if (
      !page.pageNo
      || page.pageNo <= 0
      || (document.totalPages && page.pageNo > document.totalPages)
    ) {
      reasons.push('制卷页号必须在 1 到总页数之间')
      continue
    }
    if (pageNos.has(page.pageNo)) {
      reasons.push(`第 ${page.pageNo} 页重复`)
    }
    pageNos.add(page.pageNo)
    if (!page.backgroundFileId) {
      reasons.push(`第 ${page.pageNo} 页缺少背景文件`)
    }
    if (!page.naturalWidthPx || !page.naturalHeightPx) {
      reasons.push(`第 ${page.pageNo} 页尺寸未解析`)
    }
  }
  if (document.totalPages && pageNos.size !== document.totalPages) {
    reasons.push('制卷页数量必须与总页数一致')
  }
  for (let pageNo = 1; pageNo <= (document.totalPages ?? 0); pageNo += 1) {
    if (!pageNos.has(pageNo)) {
      reasons.push(`缺少第 ${pageNo} 页制卷背景`)
    }
  }

  const questionIds = new Set<string>()
  const questionOcrSceneById = new Map<string, string | undefined>()
  for (const question of document.questions ?? []) {
    if (!question.id) {
      reasons.push('制卷题目缺少前端标识')
      continue
    }
    if (questionIds.has(question.id)) {
      reasons.push(`制卷题目标识重复：${question.questionNo || question.id}`)
    }
    questionIds.add(question.id)
    if (!question.questionNo?.trim() || !question.normalizedQuestionNo?.trim()) {
      reasons.push('制卷题目题号不能为空')
    }
    if (question.questionType !== 'OBJECTIVE' && question.questionType !== 'SUBJECTIVE') {
      reasons.push(`题 ${question.questionNo || question.id} 的题型必须是客观题或主观题`)
    }
    if (!question.ocrScene?.trim()) {
      reasons.push(`题 ${question.questionNo || question.id} 缺少 OCR 场景`)
    }
    if (question.fullScore == null || Number(question.fullScore) <= 0) {
      reasons.push(`题 ${question.questionNo || question.id} 的满分必须大于 0`)
    }
    reasons.push(...validateQuestionAnswerAsset(question))
    questionOcrSceneById.set(question.id, question.ocrScene)
  }
  if (questionIds.size === 0) {
    reasons.push('请至少配置一道制卷题目')
  }

  const blockIds = new Set<string>()
  const objectiveBlockIds = new Set<string>()
  let hasIdentity = false
  for (const block of document.blocks ?? []) {
    if (!block.id) {
      reasons.push('识别区域缺少前端标识')
      continue
    }
    if (blockIds.has(block.id)) {
      reasons.push('识别区域标识重复')
    }
    blockIds.add(block.id)
    if (!block.blockType) {
      reasons.push('识别区域类型不能为空')
    }
    if (!pageNos.has(block.pageNo)) {
      reasons.push(`识别区域绑定的第 ${block.pageNo} 页不存在`)
    }
    if (block.blockType === ExamLayoutBlockTypeCode.IDENTITY_BUBBLE) {
      hasIdentity = true
    }
    if (block.blockType === ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER && !block.layoutQuestionId) {
      reasons.push('书写作答区必须关联制卷题目')
    }
    if (
      block.blockType === ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER
      && block.layoutQuestionId
      && expectedAnswerBlockTypeForOcrScene(questionOcrSceneById.get(block.layoutQuestionId))
      !== ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER
    ) {
      reasons.push('书写作答区只能关联填空、数值、简答等非填涂题')
    }
    if (block.blockType === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX && !block.layoutQuestionId) {
      reasons.push('客观填涂矩阵必须关联制卷题目')
    }
    if (
      block.blockType === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX
      && block.layoutQuestionId
      && expectedAnswerBlockTypeForOcrScene(questionOcrSceneById.get(block.layoutQuestionId))
      !== ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX
    ) {
      reasons.push('客观填涂矩阵只能关联选择题或判断题')
    }
    if (block.layoutQuestionId && !questionIds.has(block.layoutQuestionId)) {
      reasons.push('识别区域关联的制卷题目不存在')
    }
    if (block.blockType === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX) {
      objectiveBlockIds.add(block.id)
    }
    if (!block.rectNorm || block.rectNorm.w <= 0 || block.rectNorm.h <= 0) {
      reasons.push('识别区域坐标不完整')
    }
  }
  if (!document.blocks?.length) {
    reasons.push('请至少配置身份填涂区和作答识别区')
  }
  if (!hasIdentity) {
    reasons.push('请至少配置一个身份填涂区')
  }
  reasons.push(...validateIdentityAreaTypes(document))

  for (const option of document.blockOptions ?? []) {
    if (!blockIds.has(option.blockId)) {
      reasons.push('客观填涂格关联的识别区域不存在')
    }
    if (!objectiveBlockIds.has(option.blockId)) {
      reasons.push('客观填涂格必须归属客观题矩阵区')
    }
    if (!option.layoutQuestionId || !questionIds.has(option.layoutQuestionId)) {
      reasons.push('客观填涂格关联的制卷题目不存在')
    }
    if (!option.optionLabel?.trim()) {
      reasons.push('客观填涂格选项标签不能为空')
    }
    if (!option.rectNorm || option.rectNorm.w <= 0 || option.rectNorm.h <= 0) {
      reasons.push('客观填涂格坐标不完整')
    }
  }

  return Array.from(new Set(reasons))
}

/** 有源整卷是否已有识别结果（重新识别会覆盖题单/ROI/身份区）。 */
export function layoutHasSourceFileDetectResult(document: ExamLayoutDocument | null): boolean {
  return (
    document?.layoutEntryKind === ExamLayoutEntryKindCode.SOURCE_FILE
    && (document.questions?.length ?? 0) > 0
  )
}

/** 校验身份填涂区类型；须与 PaperMasterIdentityAreaType 枚举一致。 */
function validateIdentityAreaTypes(document: ExamLayoutDocument | null): string[] {
  const reasons: string[] = []
  for (const block of document?.blocks ?? []) {
    if (block.blockType !== ExamLayoutBlockTypeCode.IDENTITY_BUBBLE) {
      continue
    }
    if (!block.identityAreaType?.trim()) {
      reasons.push('身份填涂区必须配置身份字段类型')
      continue
    }
    if (
      ALL_PAPER_MASTER_IDENTITY_AREA_TYPE_CODES.find((code) => code === block.identityAreaType)
      == null
    ) {
      reasons.push('身份填涂区类型无效，请选择学号、班级或姓名填涂区')
    }
  }
  return reasons
}

/**
 * 校验题目评分资产完整性；不变量：进入保存的题目必须能支撑客观自动判分或主观/AI评分。
 */
function validateQuestionAnswerAsset(question: {
  id?: string
  questionNo?: string
  questionType?: string
  ocrScene?: string
  answer?: {
    standardAnswer?: string
    comparePolicy?: string
    numericExpectedValue?: number
    gradingRubric?: string
    declaredOptions?: Array<{ optionLabel?: string }>
    choiceOptions?: Array<{ optionLabel?: string }>
  }
}): string[] {
  const label = `题 ${question.questionNo || question.id || '-'}`
  const answer = question.answer
  if (question.questionType === 'SUBJECTIVE') {
    if (answer?.standardAnswer?.trim() || answer?.gradingRubric?.trim()) {
      return []
    }
    return [`${label} 需填写参考答案或评分细则`]
  }
  if (!answer?.comparePolicy) {
    return [`${label} 需配置客观题比较策略`]
  }
  if (requiresDeclaredOptions(question) && !hasNonBlankOption(answer.declaredOptions)) {
    return [`${label} 需填写选项空间`]
  }
  if (answer.comparePolicy === ObjectiveComparePolicyCode.CHOICE_SET) {
    if (!hasNonBlankOption(answer.choiceOptions)) {
      return [`${label} 需填写正确选项`]
    }
    return []
  }
  if (answer.comparePolicy === ObjectiveComparePolicyCode.NUMERIC_TOLERANCE) {
    return answer.numericExpectedValue == null ? [`${label} 需填写数值标准值`] : []
  }
  if (answer.comparePolicy === ObjectiveComparePolicyCode.AI_GRADE) {
    return answer.gradingRubric?.trim() ? [] : [`${label} 使用 AI 评分时需填写评分细则`]
  }
  return answer.standardAnswer?.trim() ? [] : [`${label} 需填写标准答案`]
}

/**
 * 判断选项数组是否存在有效标签；不变量：空白选项不构成可评分选项空间。
 */
function hasNonBlankOption(options?: Array<{ optionLabel?: string }>): boolean {
  return Boolean(options?.some((option) => option.optionLabel?.trim()))
}

/**
 * 判断当前题目后续识别/评分链是否强依赖正式声明选项空间。
 */
function requiresDeclaredOptions(question: { questionType?: string, ocrScene?: string }): boolean {
  return question.questionType === 'OBJECTIVE'
    && (question.ocrScene === MarkOcrSceneCode.CHOICE || question.ocrScene === MarkOcrSceneCode.TRUE_FALSE)
}

export function snapStageValue(
  value: number,
  gridMm: number,
  page: ExamLayoutPageDto,
  stageWidth: number,
  axis: 'x' | 'y',
  paperSpec?: string,
): number {
  if (gridMm <= 0) {
    return value
  }
  const paperMm = resolvePaperMm(paperSpec, page)
  const natural = axis === 'x' ? page.naturalWidthPx : page.naturalHeightPx
  const mmReference = axis === 'x' ? paperMm.widthMm : paperMm.heightMm
  const stageSize
    = axis === 'x'
      ? stageWidth
      : Math.round(stageWidth * (page.naturalHeightPx / page.naturalWidthPx))
  const gridStagePx = (gridMm / mmReference) * natural * (stageSize / natural)
  return Math.round(value / gridStagePx) * gridStagePx
}
