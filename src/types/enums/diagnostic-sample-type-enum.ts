import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** DiagnosticSampleType */
export enum DiagnosticSampleTypeCode {
  OCR_CONFLICT = 'OCR_CONFLICT',
  IQA_EDGE = 'IQA_EDGE',
  AI_DRIFT = 'AI_DRIFT',
  BINDING_AMBIGUOUS = 'BINDING_AMBIGUOUS',
}

export const ALL_DIAGNOSTIC_SAMPLE_TYPE_CODES: readonly DiagnosticSampleTypeCode[] = [
  DiagnosticSampleTypeCode.OCR_CONFLICT,
  DiagnosticSampleTypeCode.IQA_EDGE,
  DiagnosticSampleTypeCode.AI_DRIFT,
  DiagnosticSampleTypeCode.BINDING_AMBIGUOUS,
]

export const DiagnosticSampleTypeDescription: Record<DiagnosticSampleTypeCode, string> = {
  [DiagnosticSampleTypeCode.OCR_CONFLICT]: 'OCR 冲突',
  [DiagnosticSampleTypeCode.IQA_EDGE]: 'IQA 边界',
  [DiagnosticSampleTypeCode.AI_DRIFT]: 'AI 漂移',
  [DiagnosticSampleTypeCode.BINDING_AMBIGUOUS]: '绑定歧义',
}

/** 异常留痕样本类型展示色调：按识别冲突、边界与漂移风险分组 */
export const DIAGNOSTIC_SAMPLE_TYPE_TONE: Record<DiagnosticSampleTypeCode, BadgeTone> = {
  [DiagnosticSampleTypeCode.OCR_CONFLICT]: 'orange',
  [DiagnosticSampleTypeCode.IQA_EDGE]: 'yellow',
  [DiagnosticSampleTypeCode.AI_DRIFT]: 'red',
  [DiagnosticSampleTypeCode.BINDING_AMBIGUOUS]: 'orange',
}
