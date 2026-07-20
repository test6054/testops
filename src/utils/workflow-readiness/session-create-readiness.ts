import type { SessionCreateReadinessResponse } from '@/apis/mark/marking-organization'
import type {
  SessionCreateWorkflowViewModel,
  WorkflowBlockingItem,
  WorkflowReadinessAction,
  WorkflowReadinessStep,
} from '@/components/workbench/workflow-readiness/types'
import type { MarkingOrgSessionPhase } from '@/composables/useMarkingOrgSessionWorkspace'
import {
  blockingItemsToWorkflowSteps,
  mergeBlockingItemsByCode,
  truncateTooltip,
} from '@/components/workbench/workflow-readiness/workflow-blocking-items'

export interface ResolveSessionCreateWorkflowInput {
  readiness: SessionCreateReadinessResponse | null | undefined
  phase: MarkingOrgSessionPhase
  examId?: string
  organizationId?: string
  groupBlockingItems?: WorkflowBlockingItem[] | null
}

function buildRouteParams(examId?: string, organizationId?: string): Record<string, string> {
  const params: Record<string, string> = {}
  if (organizationId) {
    params.organizationId = organizationId
  }
  if (examId) {
    params.examId = examId
  }
  return params
}

function buildRouteQuery(examId?: string): Record<string, string> {
  if (!examId) {
    return {}
  }
  return { examId }
}

function resolvePrimaryAction(steps: WorkflowReadinessStep[]): WorkflowReadinessAction | undefined {
  const first = steps.find((step) => step.status === 'pending' && step.routeName)
  if (!first?.routeName) {
    return undefined
  }
  return {
    label: first.actionLabel ?? first.label,
    routeName: first.routeName,
    routeParams: first.routeParams,
    routeQuery: first.routeQuery,
  }
}

function resolveSecondaryAction(
  steps: WorkflowReadinessStep[],
): WorkflowReadinessAction | undefined {
  const pending = steps.filter((step) => step.status === 'pending' && step.routeName)
  if (pending.length < 2) {
    return undefined
  }
  const second = pending[1]
  if (!second.routeName) {
    return undefined
  }
  return {
    label: second.actionLabel ?? second.label,
    routeName: second.routeName,
    routeParams: second.routeParams,
    routeQuery: second.routeQuery,
  }
}

function collectEffectiveBlockingItems(
  readiness: SessionCreateReadinessResponse,
): WorkflowBlockingItem[] {
  if (readiness.blockingItems.length > 0) {
    return readiness.blockingItems
  }
  // MVR-397：仅认 canCreate===true，禁止 truthy 缺省
  if (readiness.canCreate === true) {
    return []
  }
  const blockedGroupItems: WorkflowBlockingItem[] = []
  for (const group of readiness.groups ?? []) {
    if (group.canCreate === true || !group.blockingItems?.length) {
      continue
    }
    blockedGroupItems.push(...group.blockingItems)
  }
  return mergeBlockingItemsByCode([], blockedGroupItems)
}

export function resolveSessionCreateWorkflowSteps(
  input: ResolveSessionCreateWorkflowInput,
): SessionCreateWorkflowViewModel {
  const phase = input.phase
  const panelTitle = phase === 'trial' ? '创建试评前还需完成' : '创建正评前还需完成'
  const sessionLabel = phase === 'trial' ? '试评会话' : '正评会话'

  if (!input.readiness) {
    return {
      canCreate: false,
      panelTitle,
      steps: [],
      metrics: [],
      emptyState: {
        title: `尚无${sessionLabel}`,
        description: `完成上游步骤后，可在此创建${sessionLabel}。`,
      },
    }
  }

  const routeParams = buildRouteParams(input.examId, input.organizationId)
  const routeQuery = buildRouteQuery(input.examId)
  const effectiveBlockingItems = collectEffectiveBlockingItems(input.readiness)
  const mergedItems = mergeBlockingItemsByCode(
    effectiveBlockingItems,
    input.groupBlockingItems ?? undefined,
  )
  const steps = blockingItemsToWorkflowSteps(mergedItems, {
    routeParams,
    routeQuery,
    actionLabelPrefix: '去',
  })
  const firstPending = steps.find((step) => step.status === 'pending')
  const disabledTooltip = firstPending?.description
    ? truncateTooltip(firstPending.description)
    : undefined

  const metrics = [
    {
      key: 'gradable-paper-count',
      label: '已绑定答卷',
      value: input.readiness.gradablePaperCount,
    },
    {
      key: 'scan-batch-count',
      label: '扫描批次',
      value: input.readiness.scanBatchCount,
    },
  ]

  const primaryAction = resolvePrimaryAction(steps)
  const secondaryAction = resolveSecondaryAction(steps)

  return {
    canCreate: input.readiness.canCreate,
    panelTitle,
    disabledTooltip,
    steps,
    metrics,
    emptyState: {
      title: `尚无${sessionLabel}`,
      description: firstPending
        ? `完成${firstPending.label}后，可在此创建${sessionLabel}。`
        : `完成上游步骤后，可在此创建${sessionLabel}。`,
      steps,
      primaryAction,
      secondaryAction,
    },
  }
}
