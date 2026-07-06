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
    document?.blocks?.some(
      (block) => block.blockType === ExamLayoutBlockTypeCode.IDENTITY_BUBBLE,
    ),
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
