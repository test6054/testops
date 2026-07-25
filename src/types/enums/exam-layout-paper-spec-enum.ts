/**
 * 标准答题纸纸张规格
 */
import { strictEnumLabel } from '@/utils/strict-enum'

export enum ExamLayoutPaperSpecCode {
  A4_1COL = 'A4_1COL',
  A3_2COL = 'A3_2COL',
}

/** 全部合法纸张规格（显式枚举成员列表）。 */
export const ALL_EXAM_LAYOUT_PAPER_SPEC_CODES: readonly ExamLayoutPaperSpecCode[] = [
  ExamLayoutPaperSpecCode.A4_1COL,
  ExamLayoutPaperSpecCode.A3_2COL,
]

/** 纸张规格文案 */
export const ExamLayoutPaperSpecDescription: Record<ExamLayoutPaperSpecCode, string> = {
  [ExamLayoutPaperSpecCode.A4_1COL]: 'A4 单栏',
  [ExamLayoutPaperSpecCode.A3_2COL]: 'A3 双栏',
}

/** 纸张规格毫米尺寸 */
export const ExamLayoutPaperSpecMm: Record<
  ExamLayoutPaperSpecCode,
  { widthMm: number, heightMm: number }
> = {
  [ExamLayoutPaperSpecCode.A4_1COL]: { widthMm: 210, heightMm: 297 },
  [ExamLayoutPaperSpecCode.A3_2COL]: { widthMm: 420, heightMm: 297 },
}

export const ExamLayoutPaperSpecOptions: Array<{ value: ExamLayoutPaperSpecCode, label: string }> = [
  {
    value: ExamLayoutPaperSpecCode.A3_2COL,
    label: strictEnumLabel(ExamLayoutPaperSpecDescription, ExamLayoutPaperSpecCode.A3_2COL, '纸张规格'),
  },
  {
    value: ExamLayoutPaperSpecCode.A4_1COL,
    label: strictEnumLabel(ExamLayoutPaperSpecDescription, ExamLayoutPaperSpecCode.A4_1COL, '纸张规格'),
  },
]

/** 高校期末默认空白答题纸规格 - 与 ExamLayoutPaperSpec.defaultBlankSheet() 一致 */
export function defaultBlankSheetPaperSpec(): ExamLayoutPaperSpecCode {
  return ExamLayoutPaperSpecCode.A3_2COL
}

export function getExamLayoutPaperSpecDescription(code: ExamLayoutPaperSpecCode): string {
  return strictEnumLabel(ExamLayoutPaperSpecDescription, code, '纸张规格')
}

/** 协议边界：非法时显式失败。 */
export function requireExamLayoutPaperSpecCode(value: unknown): ExamLayoutPaperSpecCode {
  if (typeof value !== 'string') {
    throw new TypeError('纸张规格契约异常')
  }
  const code = ALL_EXAM_LAYOUT_PAPER_SPEC_CODES.find((item) => item === value)
  if (!code) {
    throw new Error('纸张规格契约异常')
  }
  return code
}
