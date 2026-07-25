import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type { ExamMaterialLayoutModeCode } from '@/types/enums/exam-material-layout-mode-enum'
import { LayoutDesignPhaseCode, LayoutDesignPhaseDescription } from '@/types/enums/layout-design-phase-enum'
import { computeLayoutRoiStats, hasIdentityBlock, validateLayoutDocumentForSave } from '@/utils/exam-layout-designer'
import {
  documentHasPages,
  documentHasQuestions,
  isAnswerSheetWorkspace,
  isFullPaperWorkspace,
  isLayoutDesignPhaseAccessible,
  layoutDesignPhaseLockReason
} from '@/utils/layout-design-workspace'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 制卷设计器向导步骤展示状态 */
export type LayoutDesignPhaseStepStatus = 'locked' | 'pending' | 'active' | 'completed'

/** 制卷设计器四阶段向导步骤视图 */
export interface LayoutDesignPhaseStepView {
  phase: LayoutDesignPhaseCode
  index: number
  label: string
  summary: string
  guide: string
  status: LayoutDesignPhaseStepStatus
  accessible: boolean
  lockReason?: string
}

const LAYOUT_DESIGN_PHASE_SEQUENCE: LayoutDesignPhaseCode[] = [
  LayoutDesignPhaseCode.SOURCE,
  LayoutDesignPhaseCode.QUESTIONS,
  LayoutDesignPhaseCode.LAYOUT,
  LayoutDesignPhaseCode.REVIEW,
]

const PHASE_SUMMARY: Record<LayoutDesignPhaseCode, string> = {
  [LayoutDesignPhaseCode.SOURCE]: '资料上传或在线生成答题页',
  [LayoutDesignPhaseCode.QUESTIONS]: '核对题号、题型与分值',
  [LayoutDesignPhaseCode.LAYOUT]: '框选身份区与作答 ROI',
  [LayoutDesignPhaseCode.REVIEW]: '校验通过后保存并预览',
}

/**
 * 按制卷形态返回当前阶段的教师操作引导（对标竞品「答题卷制作 → 划区 → 校验」链）。
 */
function resolvePhaseGuide(
  phase: LayoutDesignPhaseCode,
  materialLayoutMode?: ExamMaterialLayoutModeCode,
): string {
  if (!materialLayoutMode) {
    return '请先在考试准备页保存制卷形态（单独试卷或试卷+答题页）'
  }
  if (phase === LayoutDesignPhaseCode.SOURCE) {
    if (isFullPaperWorkspace(materialLayoutMode)) {
      return '上传单独试卷 PDF/Word/图片，异步识别题目并同步分页底图；也可在右侧调整制卷名称与安全边距'
    }
    if (isAnswerSheetWorkspace(materialLayoutMode)) {
      return '选择 A3/A4 纸型，配置题目结构后一键生成标准空白答题页，再进入版式划区微调'
    }
  }
  if (phase === LayoutDesignPhaseCode.QUESTIONS) {
    return '核对识别题单：补录题号、标准答案与主观题区域；客观题填涂区将在下一步自动生成'
  }
  if (phase === LayoutDesignPhaseCode.LAYOUT) {
    return '在第 1 页框选学号/考号填涂区，逐题调整客观填涂矩阵与主观作答区，对齐扫描识别坐标'
  }
  return '逐项处理校验清单，保存制卷设计并预览可打印 PDF，完成后可生成印刷包'
}

function isPhaseCompleted(
  phase: LayoutDesignPhaseCode,
  document: ExamLayoutDocument | null,
): boolean {
  const roiStats = computeLayoutRoiStats(document)
  switch (phase) {
    case LayoutDesignPhaseCode.SOURCE:
      return documentHasPages(document)
    case LayoutDesignPhaseCode.QUESTIONS:
      return documentHasQuestions(document)
    case LayoutDesignPhaseCode.LAYOUT:
      if (!documentHasPages(document) || !documentHasQuestions(document)) {
        return false
      }
      if (!hasIdentityBlock(document)) {
        return false
      }
      if (roiStats.totalQuestionCount <= 0) {
        return false
      }
      return roiStats.roiReadyQuestionCount >= roiStats.totalQuestionCount
    case LayoutDesignPhaseCode.REVIEW:
      return validateLayoutDocumentForSave(document).length === 0
    default:
      return false
  }
}

function resolvePhaseSummary(
  phase: LayoutDesignPhaseCode,
  document: ExamLayoutDocument | null,
  detail: ExamDetailResponse | null | undefined,
): string {
  const roiStats = computeLayoutRoiStats(document)
  if (phase === LayoutDesignPhaseCode.SOURCE && documentHasPages(document)) {
    const pageCount = document?.pages?.length ?? detail?.totalPages ?? 0
    return `已同步 ${pageCount} 页底图`
  }
  if (phase === LayoutDesignPhaseCode.QUESTIONS && documentHasQuestions(document)) {
    return `已识别 ${document?.questions?.length ?? 0} 道题`
  }
  if (phase === LayoutDesignPhaseCode.LAYOUT && documentHasPages(document)) {
    if (!hasIdentityBlock(document)) {
      return '待配置身份填涂区'
    }
    if (roiStats.totalQuestionCount > 0) {
      return `ROI ${roiStats.roiReadyQuestionCount}/${roiStats.totalQuestionCount}`
    }
    return '待框选作答区'
  }
  if (phase === LayoutDesignPhaseCode.REVIEW) {
    const blocking = validateLayoutDocumentForSave(document)
    if (blocking.length === 0) {
      return '校验通过，可保存'
    }
    return `${blocking.length} 项待处理`
  }
  return PHASE_SUMMARY[phase]
}

/**
 * 构建制卷设计器四阶段向导步骤，供 WorkflowRail 渲染进度与引导。
 */
export function buildLayoutDesignPhaseSteps(
  activePhase: LayoutDesignPhaseCode,
  document: ExamLayoutDocument | null,
  detail: ExamDetailResponse | null | undefined,
): LayoutDesignPhaseStepView[] {
  const materialLayoutMode = detail?.materialLayoutMode
  return LAYOUT_DESIGN_PHASE_SEQUENCE.map((phase, index) => {
    const accessible = isLayoutDesignPhaseAccessible(phase, document)
    const lockReason = layoutDesignPhaseLockReason(phase, document)
    const completed = isPhaseCompleted(phase, document)
    let status: LayoutDesignPhaseStepStatus
    if (phase === activePhase) {
      status = 'active'
    } else if (!accessible) {
      status = 'locked'
    } else if (completed) {
      status = 'completed'
    } else {
      status = 'pending'
    }
    return {
      phase,
      index: index + 1,
      label: strictEnumLabel(LayoutDesignPhaseDescription, phase, '制卷设计阶段'),
      summary: resolvePhaseSummary(phase, document, detail),
      guide: resolvePhaseGuide(phase, materialLayoutMode),
      status,
      accessible,
      lockReason,
    }
  })
}

/** 当前激活阶段的引导文案 */
export function resolveActiveLayoutDesignPhaseGuide(
  activePhase: LayoutDesignPhaseCode,
  detail: ExamDetailResponse | null | undefined,
): string {
  return resolvePhaseGuide(activePhase, detail?.materialLayoutMode)
}
