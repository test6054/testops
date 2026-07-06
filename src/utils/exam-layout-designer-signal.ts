import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { SignalMetric } from '@/types/workbench'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'

/** 制卷设计器页展示的准备子步骤（题目 + 制卷设计） */
type LayoutDesignerStepKey = 'paperTemplate' | 'layoutDesign'

const LAYOUT_DESIGNER_STEP_KEYS: LayoutDesignerStepKey[] = ['paperTemplate', 'layoutDesign']

const LAYOUT_DESIGNER_STEP_ORDER = new Map<LayoutDesignerStepKey, number>(
  LAYOUT_DESIGNER_STEP_KEYS.map((key, index) => [key, index]),
)

/**
 * 从全量准备步骤中筛出制卷设计器相关的 paperTemplate + layoutDesign，并按固定顺序排列。
 */
export function filterLayoutDesignerPrepSteps(steps: PrepStepCard[]): PrepStepCard[] {
  return steps
    .filter((step): step is PrepStepCard & { key: LayoutDesignerStepKey } =>
      step.key === 'paperTemplate' || step.key === 'layoutDesign',
    )
    .sort(
      (a, b) =>
        (LAYOUT_DESIGNER_STEP_ORDER.get(a.key) ?? 99)
        - (LAYOUT_DESIGNER_STEP_ORDER.get(b.key) ?? 99),
    )
}

/** 制卷形态 KPI：独立答卷页 / 整卷作答，与纸型、印张分离。 */
function buildMaterialLayoutModeMetric(detail: ExamDetailResponse): SignalMetric {
  const modeLabel = detail.materialLayoutModeMessage
  if (!detail.materialLayoutMode) {
    return {
      key: 'layout-mode',
      label: '制卷形态',
      value: '未选择',
      tone: 'orange',
      helper: '请先在考试准备页保存制卷形态',
    }
  }
  let helper: string | undefined
  if (detail.materialLayoutMode === 'ANSWER_SHEET') {
    helper = detail.layoutEntryKindMessage ?? '标准答题卡制卷'
  } else if (detail.materialLayoutMode === 'FULL_PAPER') {
    helper = detail.layoutEntryKindMessage ?? '有源整卷 PDF 制卷'
  }
  return {
    key: 'layout-mode',
    label: '制卷形态',
    value: modeLabel ?? detail.materialLayoutMode,
    tone: 'blue',
    helper,
  }
}

/** 纸型 KPI：A3/A4 规格，与业务形态正交。 */
function buildPaperTypeMetric(detail: ExamDetailResponse): SignalMetric {
  const label = detail.layoutPaperSpecMessage
  let helper: string | undefined
  if (!label) {
    helper = detail.materialLayoutMode === 'FULL_PAPER'
      ? '上传整卷 PDF 后自动识别 A3/A4'
      : '请选择 A3 横版双栏或 A4 单栏模板'
  }
  return {
    key: 'paper-type',
    label: '纸型',
    value: label ?? '未配置',
    tone: label ? 'blue' : 'orange',
    helper,
  }
}

function buildScanSheetMetric(detail: ExamDetailResponse): SignalMetric {
  const text = detail.scanPaperStyleText
  if (!text) {
    return {
      key: 'scan-sheet',
      label: '印张',
      value: '未配置',
      tone: 'orange',
      helper: '保存制卷后按页数推导单双面',
    }
  }
  let helper: string | undefined
  if (text === '1张2面') {
    helper = '建议双面扫描'
  } else if (text === '1张1面') {
    helper = '单面送纸'
  }
  return {
    key: 'scan-sheet',
    label: '印张',
    value: text,
    tone: 'blue',
    helper,
  }
}

/**
 * 制卷设计器 Signal KPI：形态 → 纸型 → 印张 → 就绪项，四格语义固定、与制卷形态分支无关。
 */
export function buildLayoutDesignerSignalMetrics(detail: ExamDetailResponse): SignalMetric[] {
  if (!detail.materialLayoutMode) {
    return [buildMaterialLayoutModeMetric(detail)]
  }

  if (detail.materialLayoutMode === 'ANSWER_SHEET') {
    const regionReady = detail.layoutRegionReady === true
    return [
      buildMaterialLayoutModeMetric(detail),
      buildPaperTypeMetric(detail),
      buildScanSheetMetric(detail),
      {
        key: 'regions',
        label: '版面区域',
        value: regionReady ? '已就绪' : '未就绪',
        tone: regionReady ? 'green' : 'red',
        helper: regionReady ? undefined : '身份区与客观填涂区须配置完整',
      },
    ]
  }

  if (detail.materialLayoutMode === 'FULL_PAPER') {
    const pageReady = detail.pageTemplateReady === true
    const regionReady = detail.layoutRegionReady === true
    return [
      buildMaterialLayoutModeMetric(detail),
      buildPaperTypeMetric(detail),
      buildScanSheetMetric(detail),
      {
        key: 'pages',
        label: '页同步',
        value: String(detail.totalPages ?? 0),
        tone: pageReady ? 'green' : 'orange',
        helper: pageReady
          ? (regionReady ? undefined : '身份区或客观区待补')
          : '制卷页底图尚未同步完成',
      },
    ]
  }

  return [buildMaterialLayoutModeMetric(detail)]
}
