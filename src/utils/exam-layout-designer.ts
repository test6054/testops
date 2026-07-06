import type {
  ExamLayoutBlockDto,
  ExamLayoutDocument,
  ExamLayoutPageDto,
  ExamLayoutRectNorm
} from '@/apis/mark/exam-layout-design'
import {
  ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES,
  ExamLayoutBlockTypeCode,
  getExamLayoutBlockTypeDescription,
  requireExamLayoutBlockTypeCode,
} from '@/types/enums/exam-layout-block-type-enum'
import {
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES,
  ExamLayoutPaperSpecCode,
  ExamLayoutPaperSpecMm,
  getExamLayoutPaperSpecDescription,
  requireExamLayoutPaperSpecCode,
} from '@/types/enums/exam-layout-paper-spec-enum'

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
  return crypto.randomUUID()
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
    block.identityAreaType = 'STUDENT_NO'
  }
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
    document?.blocks?.some(
      (block) => block.blockType === ExamLayoutBlockTypeCode.IDENTITY_BUBBLE,
    ),
  )
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
  if (!document.totalPages || document.totalPages <= 0) {
    reasons.push('总页数必须大于 0')
  }
  const pageNos = new Set<number>()
  for (const page of document.pages ?? []) {
    if (!page.pageNo || page.pageNo <= 0 || (document.totalPages && page.pageNo > document.totalPages)) {
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
  const questionTypeById = new Map<string, string>()
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
    if (question.fullScore == null || Number(question.fullScore) <= 0) {
      reasons.push(`题 ${question.questionNo || question.id} 的满分必须大于 0`)
    }
    questionTypeById.set(question.id, question.questionType)
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
      if (!block.identityAreaType?.trim()) {
        reasons.push('身份填涂区必须配置身份字段类型')
      }
    }
    if (block.blockType === ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER && !block.layoutQuestionId) {
      reasons.push('主观作答区必须关联制卷题目')
    }
    if (
      block.blockType === ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER
      && block.layoutQuestionId
      && questionTypeById.get(block.layoutQuestionId) !== 'SUBJECTIVE'
    ) {
      reasons.push('主观作答区只能关联主观题')
    }
    if (block.blockType === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX && !block.layoutQuestionId) {
      reasons.push('客观填涂矩阵必须关联制卷题目')
    }
    if (
      block.blockType === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX
      && block.layoutQuestionId
      && questionTypeById.get(block.layoutQuestionId) !== 'OBJECTIVE'
    ) {
      reasons.push('客观填涂矩阵只能关联客观题')
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
