import type { ExamWorkbenchPrepStepResponse } from '@/apis/mark/exam-progress'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import { resolvePrintPackagePrepWorkflowSteps } from '@/utils/workflow-readiness/prep-steps-readiness'

/** 印刷包生成依赖制卷形态与制卷设计（扩展能力门禁）；名册独立，不参与阻断。 */
const PRINT_PACKAGE_GATE_STEP_KEYS = new Set(['materialLayout', 'layoutDesign'])

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

/** 印刷包生成门禁：仅制卷形态/制卷设计；名册独立，不得阻断空白母版送印。 */
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
