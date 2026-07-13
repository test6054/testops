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

/** 印刷包生成门禁：未完成名册/制卷设计等前置步骤时禁用；硬阻断 prepBlockingReasons 仍生效。 */
export function resolvePrintPackageGenerateGate(
  input: ResolvePrintPackageGenerateGateInput,
): PrintPackageGenerateGateViewModel {
  const panelSteps = resolvePrintPackagePrepWorkflowSteps({
    examId: input.examId,
    backendPrepSteps: input.backendPrepSteps,
    prepStepCards: input.prepStepCards,
  })
  const blockingPrepSteps = panelSteps.filter((step) => step.code !== 'printPackage')
  const generateBlocked = input.prepBlockingReasons.length > 0 || blockingPrepSteps.length > 0
  const firstStep = blockingPrepSteps[0]
  const disabledTooltip = generateBlocked
    ? (input.prepBlockingReasons[0] ?? firstStep?.description ?? firstStep?.label)
    : undefined
  return {
    generateBlocked,
    panelSteps,
    disabledTooltip,
  }
}
