import type { ExamWorkbenchPrepStepResponse } from '@/apis/mark/exam-progress'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import { ExamWorkbenchPrepStepKeyCode as PrepStepKey } from '@/types/enums/exam-workbench-prep-step-key-enum'
import { resolvePrintPackagePrepWorkflowSteps } from '@/utils/workflow-readiness/prep-steps-readiness'

/** 印刷包生成依赖制卷形态与制卷设计；学院命题签审由印刷包页独立硬拦（APPROVED_FOR_PRINT），名册不参与阻断。 */
const PRINT_PACKAGE_GATE_STEP_KEYS: ReadonlySet<string> = new Set([
  PrepStepKey.MATERIAL_LAYOUT,
  PrepStepKey.LAYOUT_DESIGN,
])

export interface ResolvePrintPackageGenerateGateInput {
  examId: string
  backendPrepSteps?: ExamWorkbenchPrepStepResponse[] | null
  prepStepCards?: PrepStepCard[]
}

export interface PrintPackageGenerateGateViewModel {
  generateBlocked: boolean
  panelSteps: ReturnType<typeof resolvePrintPackagePrepWorkflowSteps>
  disabledTooltip?: string
}

/**
 * 印刷包准备步骤门禁：仅制卷形态/制卷设计。
 * 命题签审硬拦由印刷包页 `governanceApprovedForPrint` 与 BE `requirePrintReady` 共同承担，不得在此绕过。
 */
export function resolvePrintPackageGenerateGate(
  input: ResolvePrintPackageGenerateGateInput,
): PrintPackageGenerateGateViewModel {
  const panelSteps = resolvePrintPackagePrepWorkflowSteps({
    examId: input.examId,
    backendPrepSteps: input.backendPrepSteps,
    prepStepCards: input.prepStepCards,
  }).filter((step) => PRINT_PACKAGE_GATE_STEP_KEYS.has(step.code))
  const generateBlocked = panelSteps.length > 0
  const firstStep = panelSteps[0]
  const disabledTooltip = generateBlocked
    ? (firstStep?.description ?? firstStep?.label)
    : undefined
  return {
    generateBlocked,
    panelSteps,
    disabledTooltip,
  }
}
