import type { ExamWorkbenchPrepStepResponse } from '@/apis/mark/exam-progress'
import type { WorkflowReadinessStep } from '@/components/workbench/workflow-readiness/types'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import { requirePrepStepWorkspaceRouteName } from '@/utils/exam-prep-step-ui'

export interface ResolveIncompletePrepStepsInput {
  prepSteps: PrepStepCard[]
  examId: string
}

export interface ResolvePrintPackagePrepWorkflowInput {
  examId: string
  backendPrepSteps?: ExamWorkbenchPrepStepResponse[] | null
  prepStepCards?: PrepStepCard[]
}

function buildExamWorkspaceRouteContext(examId: string): {
  routeParams: Record<string, string>
  routeQuery: Record<string, string>
} {
  return {
    routeParams: { examId },
    routeQuery: { examId },
  }
}

/** 将未完成 prepSteps 映射为 WorkflowReadinessStep，路由采信卡片上的合同路由。 */
export function resolveIncompletePrepWorkflowSteps(
  input: ResolveIncompletePrepStepsInput,
): WorkflowReadinessStep[] {
  const { routeParams, routeQuery } = buildExamWorkspaceRouteContext(input.examId)
  return input.prepSteps
    .filter((step) => step.status !== 'completed')
    .map((step) => ({
      code: step.key,
      label: step.title,
      status: 'pending' as const,
      description: step.description,
      actionLabel: step.primaryAction,
      routeName: step.routeName,
      routeParams,
      routeQuery,
    }))
}

/**
 * 快照级 prepSteps → workflow steps；不依赖 examDetail，供印刷包在详情加载前展示引导。
 */
export function resolveIncompletePrepWorkflowStepsFromSnapshot(
  backendSteps: ExamWorkbenchPrepStepResponse[],
  examId: string,
): WorkflowReadinessStep[] {
  const { routeParams, routeQuery } = buildExamWorkspaceRouteContext(examId)
  return backendSteps
    .filter((step) => step.status !== 'completed')
    .map((step) => ({
      code: step.key,
      label: step.title,
      status: 'pending' as const,
      description: step.advisoryReason ?? step.statusText ?? step.title,
      actionLabel: `前往${step.title}`,
      routeName: requirePrepStepWorkspaceRouteName(step),
      routeParams,
      routeQuery,
    }))
}

/**
 * 印刷包 prep 引导：优先使用含 examDetail 的卡片；否则回退 snapshot.prepSteps。
 */
export function resolvePrintPackagePrepWorkflowSteps(
  input: ResolvePrintPackagePrepWorkflowInput,
): WorkflowReadinessStep[] {
  if (input.prepStepCards?.length) {
    return resolveIncompletePrepWorkflowSteps({
      prepSteps: input.prepStepCards,
      examId: input.examId,
    })
  }
  if (input.backendPrepSteps?.length) {
    return resolveIncompletePrepWorkflowStepsFromSnapshot(input.backendPrepSteps, input.examId)
  }
  return []
}
