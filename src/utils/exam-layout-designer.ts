import type {
  ExamLayoutBlockDto,
  ExamLayoutDocument,
  ExamLayoutPageDto,
  ExamLayoutRectNorm
} from '@/apis/mark/exam-layout-design'
import { throwUserFacing } from '@/utils/contract-guard'

/** 与后端 ExamLayoutBlockType 逐值一致 */
export const EXAM_LAYOUT_BLOCK_TYPE = {
  IDENTITY_BUBBLE: 'IDENTITY_BUBBLE',
  OBJECTIVE_MATRIX: 'OBJECTIVE_MATRIX',
  SUBJECTIVE_ANSWER: 'SUBJECTIVE_ANSWER',
  QUESTION_STEM: 'QUESTION_STEM',
  FORBIDDEN_ZONE: 'FORBIDDEN_ZONE',
} as const

export type ExamLayoutBlockTypeCode
  = (typeof EXAM_LAYOUT_BLOCK_TYPE)[keyof typeof EXAM_LAYOUT_BLOCK_TYPE]

export const EXAM_LAYOUT_BLOCK_TYPE_LABEL: Record<ExamLayoutBlockTypeCode, string> = {
  IDENTITY_BUBBLE: '身份填涂区',
  OBJECTIVE_MATRIX: '客观填涂矩阵',
  SUBJECTIVE_ANSWER: '主观作答区',
  QUESTION_STEM: '题面区',
  FORBIDDEN_ZONE: '禁止识别区',
}

export const EXAM_LAYOUT_BLOCK_TYPE_COLOR: Record<ExamLayoutBlockTypeCode, string> = {
  IDENTITY_BUBBLE: 'rgba(22, 119, 255, 0.14)',
  OBJECTIVE_MATRIX: 'rgba(82, 196, 26, 0.14)',
  SUBJECTIVE_ANSWER: 'rgba(250, 173, 20, 0.16)',
  QUESTION_STEM: 'rgba(114, 46, 209, 0.12)',
  FORBIDDEN_ZONE: 'rgba(255, 77, 79, 0.12)',
}

export const EXAM_LAYOUT_BLOCK_TYPE_STROKE: Record<ExamLayoutBlockTypeCode, string> = {
  IDENTITY_BUBBLE: '#1677ff',
  OBJECTIVE_MATRIX: '#52c41a',
  SUBJECTIVE_ANSWER: '#faad14',
  QUESTION_STEM: '#722ed1',
  FORBIDDEN_ZONE: '#ff4d4f',
}

export const EXAM_LAYOUT_ENTRY_KIND = {
  SOURCE_FILE: 'SOURCE_FILE',
  BLANK_SHEET: 'BLANK_SHEET',
} as const

export const EXAM_LAYOUT_ENTRY_KIND_LABEL: Record<string, string> = {
  SOURCE_FILE: '有源整卷',
  BLANK_SHEET: '标准答题卡',
}

export const EXAM_LAYOUT_PAPER_SPEC = {
  A4_1COL: 'A4_1COL',
  A3_2COL: 'A3_2COL',
} as const

export type ExamLayoutPaperSpecCode
  = (typeof EXAM_LAYOUT_PAPER_SPEC)[keyof typeof EXAM_LAYOUT_PAPER_SPEC]

export const EXAM_LAYOUT_PAPER_SPEC_LABEL: Record<ExamLayoutPaperSpecCode, string> = {
  A3_2COL: 'A3 双栏（推荐）',
  A4_1COL: 'A4 单栏',
}

/** 与后端 ExamLayoutPaperSpec 毫米尺寸一致 */
export const EXAM_LAYOUT_PAPER_SPEC_MM: Record<ExamLayoutPaperSpecCode, { widthMm: number, heightMm: number }> = {
  A4_1COL: { widthMm: 210, heightMm: 297 },
  A3_2COL: { widthMm: 420, heightMm: 297 },
}

const DEFAULT_SAFE_MARGIN_MM = 5
const DEFAULT_STAGE_WIDTH = 760

export function resolvePaperSpecLabel(paperSpec: string | undefined): string {
  if (!paperSpec || !(paperSpec in EXAM_LAYOUT_PAPER_SPEC_LABEL)) {
    throwUserFacing('纸张规格契约异常，请刷新后重试')
  }
  return EXAM_LAYOUT_PAPER_SPEC_LABEL[paperSpec as ExamLayoutPaperSpecCode]
}

export function resolvePaperMm(
  paperSpec: string | undefined,
  page: ExamLayoutPageDto,
): { widthMm: number, heightMm: number } {
  if (paperSpec && paperSpec in EXAM_LAYOUT_PAPER_SPEC_MM) {
    return EXAM_LAYOUT_PAPER_SPEC_MM[paperSpec as ExamLayoutPaperSpecCode]
  }
  if (page.naturalWidthPx >= page.naturalHeightPx) {
    return EXAM_LAYOUT_PAPER_SPEC_MM.A3_2COL
  }
  return EXAM_LAYOUT_PAPER_SPEC_MM.A4_1COL
}

export function resolveBlockTypeLabel(blockType: string | undefined): string {
  if (!blockType || !(blockType in EXAM_LAYOUT_BLOCK_TYPE_LABEL)) {
    throwUserFacing('布局块类型契约异常，请刷新后重试')
  }
  return EXAM_LAYOUT_BLOCK_TYPE_LABEL[blockType as ExamLayoutBlockTypeCode]
}

export function resolveBlockFill(blockType: string): string {
  if (blockType in EXAM_LAYOUT_BLOCK_TYPE_COLOR) {
    return EXAM_LAYOUT_BLOCK_TYPE_COLOR[blockType as ExamLayoutBlockTypeCode]
  }
  return 'rgba(22, 119, 255, 0.08)'
}

export function resolveBlockStroke(blockType: string): string {
  if (blockType in EXAM_LAYOUT_BLOCK_TYPE_STROKE) {
    return EXAM_LAYOUT_BLOCK_TYPE_STROKE[blockType as ExamLayoutBlockTypeCode]
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
  return {
    id: createClientBlockId(),
    pageNo,
    blockType,
    layer,
    rectNorm: { x: 0.12, y: 0.12, w: 0.28, h: 0.06 },
  }
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
    document?.blocks?.some((block) => block.blockType === EXAM_LAYOUT_BLOCK_TYPE.IDENTITY_BUBBLE),
  )
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
