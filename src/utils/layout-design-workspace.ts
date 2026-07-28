import type { LocationQueryValue } from 'vue-router'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { ExamMaterialLayoutModeCode } from '@/types/enums/exam-material-layout-mode-enum'
import {
  LayoutDesignPhaseCode,
  requireLayoutDesignPhaseCode,
} from '@/types/enums/layout-design-phase-enum'

export type LayoutWorkspaceMode = ExamMaterialLayoutModeCode.FULL_PAPER | ExamMaterialLayoutModeCode.ANSWER_SHEET

/** 工作区模式真源：优先 materialLayoutMode，禁止在冷启动时仅依赖 document.layoutEntryKind。 */
export function deriveWorkspaceMode(
  materialLayoutMode?: ExamMaterialLayoutModeCode,
): LayoutWorkspaceMode | null {
  if (materialLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER) {
    return ExamMaterialLayoutModeCode.FULL_PAPER
  }
  if (materialLayoutMode === ExamMaterialLayoutModeCode.ANSWER_SHEET) {
    return ExamMaterialLayoutModeCode.ANSWER_SHEET
  }
  return null
}

export function isFullPaperWorkspace(materialLayoutMode?: ExamMaterialLayoutModeCode): boolean {
  return deriveWorkspaceMode(materialLayoutMode) === ExamMaterialLayoutModeCode.FULL_PAPER
}

export function isAnswerSheetWorkspace(materialLayoutMode?: ExamMaterialLayoutModeCode): boolean {
  return deriveWorkspaceMode(materialLayoutMode) === ExamMaterialLayoutModeCode.ANSWER_SHEET
}

export function documentHasPages(document: ExamLayoutDocument | null): boolean {
  return Boolean(document?.pages?.length)
}

export function documentHasQuestions(document: ExamLayoutDocument | null): boolean {
  return Boolean(document?.questions?.length)
}

export function resolveDefaultLayoutDesignPhase(
  detail: ExamDetailResponse | null | undefined,
  document: ExamLayoutDocument | null,
): LayoutDesignPhaseCode {
  if (!detail?.materialLayoutMode) {
    return LayoutDesignPhaseCode.SOURCE
  }
  if (isAnswerSheetWorkspace(detail.materialLayoutMode)) {
    if (!documentHasPages(document)) {
      return LayoutDesignPhaseCode.SOURCE
    }
    if (!documentHasQuestions(document)) {
      return LayoutDesignPhaseCode.QUESTIONS
    }
    return LayoutDesignPhaseCode.LAYOUT
  }
  if (!documentHasPages(document)) {
    return LayoutDesignPhaseCode.SOURCE
  }
  if (!documentHasQuestions(document)) {
    return LayoutDesignPhaseCode.SOURCE
  }
  return LayoutDesignPhaseCode.LAYOUT
}

export function resolvePrepStepLayoutDesignPhase(
  detail: ExamDetailResponse,
  document: ExamLayoutDocument | null,
): LayoutDesignPhaseCode {
  if (detail.materialLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER) {
    if (!documentHasPages(document) || !documentHasQuestions(document)) {
      return LayoutDesignPhaseCode.SOURCE
    }
    return LayoutDesignPhaseCode.LAYOUT
  }
  return resolveDefaultLayoutDesignPhase(detail, document)
}

export type LayoutDesignPhaseRouteQuery
   = | LocationQueryValue
     | LocationQueryValue[]
     | undefined

/** 将 Vue Router query 归一为制卷阶段解析可用的字符串合同。 */
export function normalizeLayoutDesignPhaseQuery(
  raw: LayoutDesignPhaseRouteQuery,
): string | string[] | null | undefined {
  if (raw === undefined) {
    return undefined
  }
  if (Array.isArray(raw)) {
    const values = raw.filter((item): item is string => typeof item === 'string')
    if (values.length === 0) {
      return undefined
    }
    if (values.length === 1) {
      return values[0]
    }
    return values
  }
  if (typeof raw === 'string') {
    return raw
  }
  return undefined
}

export function parseLayoutDesignPhaseQuery(
  raw: LayoutDesignPhaseRouteQuery,
  fallback: LayoutDesignPhaseCode,
): LayoutDesignPhaseCode {
  const normalized = normalizeLayoutDesignPhaseQuery(raw)
  const value = Array.isArray(normalized) ? normalized[0] : normalized
  if (!value?.trim()) {
    return fallback
  }
  try {
    return requireLayoutDesignPhaseCode(value.trim())
  } catch {
    return fallback
  }
}

const LAYOUT_DESIGN_PHASE_ORDER: LayoutDesignPhaseCode[] = [
  LayoutDesignPhaseCode.SOURCE,
  LayoutDesignPhaseCode.QUESTIONS,
  LayoutDesignPhaseCode.LAYOUT,
  LayoutDesignPhaseCode.REVIEW,
]

/**
 * 解析 URL phase 并按当前 document 门禁 clamp；不可达时回退到链上最近可达阶段（竞品向导「不可跳步」语义）。
 */
export function resolveAccessibleLayoutDesignPhase(
  document: ExamLayoutDocument | null,
  raw: LayoutDesignPhaseRouteQuery,
  fallback: LayoutDesignPhaseCode,
): LayoutDesignPhaseCode {
  const requested = parseLayoutDesignPhaseQuery(raw, fallback)
  if (isLayoutDesignPhaseAccessible(requested, document)) {
    return requested
  }
  const requestedIndex = LAYOUT_DESIGN_PHASE_ORDER.indexOf(requested)
  for (let index = requestedIndex; index >= 0; index -= 1) {
    const candidate = LAYOUT_DESIGN_PHASE_ORDER[index]
    if (isLayoutDesignPhaseAccessible(candidate, document)) {
      return candidate
    }
  }
  return LayoutDesignPhaseCode.SOURCE
}

export function layoutDesignPhaseQueryDrifted(
  document: ExamLayoutDocument | null,
  raw: LayoutDesignPhaseRouteQuery,
  fallback: LayoutDesignPhaseCode,
): boolean {
  const normalized = normalizeLayoutDesignPhaseQuery(raw)
  const value = Array.isArray(normalized) ? normalized[0] : normalized
  if (!value?.trim()) {
    return false
  }
  const resolved = resolveAccessibleLayoutDesignPhase(document, raw, fallback)
  try {
    const requested = requireLayoutDesignPhaseCode(value.trim())
    return requested !== resolved
  } catch {
    return true
  }
}

export function isLayoutDesignPhaseAccessible(
  phase: LayoutDesignPhaseCode,
  document: ExamLayoutDocument | null,
): boolean {
  switch (phase) {
    case LayoutDesignPhaseCode.SOURCE:
      return true
    case LayoutDesignPhaseCode.QUESTIONS:
      return documentHasQuestions(document) || documentHasPages(document)
    case LayoutDesignPhaseCode.LAYOUT:
      return documentHasPages(document)
    case LayoutDesignPhaseCode.REVIEW:
      return documentHasPages(document) && documentHasQuestions(document)
    default:
      return false
  }
}

export function layoutDesignPhaseLockReason(
  phase: LayoutDesignPhaseCode,
  document: ExamLayoutDocument | null,
): string | undefined {
  if (isLayoutDesignPhaseAccessible(phase, document)) {
    return undefined
  }
  switch (phase) {
    case LayoutDesignPhaseCode.QUESTIONS:
      return '请先上传资料或生成答题纸'
    case LayoutDesignPhaseCode.LAYOUT:
      return '请先完成资料入口并同步页底图'
    case LayoutDesignPhaseCode.REVIEW:
      return '请先完成题目结构与版式划区'
    default:
      return undefined
  }
}
