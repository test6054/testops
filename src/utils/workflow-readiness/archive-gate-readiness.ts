import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import type { ArchiveGateWorkflowViewModel } from '@/components/workbench/workflow-readiness/types'
import { blockingItemsToWorkflowSteps } from '@/components/workbench/workflow-readiness/workflow-blocking-items'

export interface ResolveArchiveGateWorkflowInput {
  gate: ArchiveVolumeExamGateResponse | null | undefined
  examId?: string
}

export function resolveArchiveGateWorkflowSteps(
  input: ResolveArchiveGateWorkflowInput,
): ArchiveGateWorkflowViewModel | null {
  const gate = input.gate
  if (!gate || gate.gateOpen === true) {
    return null
  }
  const routeParams: Record<string, string> | undefined = input.examId
    ? { examId: input.examId }
    : undefined
  const routeQuery: Record<string, string> | undefined = input.examId
    ? { examId: input.examId }
    : undefined
  const steps = blockingItemsToWorkflowSteps(gate.blockingItems, {
    routeParams,
    routeQuery,
    actionLabelPrefix: '前往',
  })
  if (steps.length === 0) {
    throw new Error('归档双门禁契约异常：gateOpen=false 但 blockingItems 为空')
  }
  return {
    panelTitle: '尚未满足归档创建条件',
    steps,
  }
}
