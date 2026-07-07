import type { ExamWorkbenchPrepStepResponse } from '@/apis/mark/exam-progress'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import { resolvePrintPackagePrepWorkflowSteps } from '@/utils/workflow-readiness/prep-steps-readiness'

export interface ResolvePrintPackageGenerateGateInput {
  examId: string
  prepBlockingReasons: string[]
  backendPrepSteps?: ExamWorkbenchPrepStepResponse[] | null
  prepStepCards?: PrepStepCard[]
}

export interface PrintPackageGenerateGateViewModel {
  generateBlocked: boolean
  panelSteps: ReturnType<typeof resolvePrintPackagePrepWorkflowSteps>
  disabledTooltip?: string
}

/** 印刷包生成门禁：按钮仍读 prepBlockingReasons；Panel/ tooltip 与 prepSteps 结构化引导对齐。 */
export function resolvePrintPackageGenerateGate(
  input: ResolvePrintPackageGenerateGateInput,
): PrintPackageGenerateGateViewModel {
  const panelSteps = resolvePrintPackagePrepWorkflowSteps({
    examId: input.examId,
    backendPrepSteps: input.backendPrepSteps,
    prepStepCards: input.prepStepCards,
  })
  const generateBlocked = input.prepBlockingReasons.length > 0
  const firstStep = panelSteps[0]
  const disabledTooltip = generateBlocked ? (firstStep?.description ?? firstStep?.label) : undefined
  return {
    generateBlocked,
    panelSteps,
    disabledTooltip,
  }
}
