import type {
  WorkflowBlockingItem,
  WorkflowReadinessStep,
} from '@/components/workbench/workflow-readiness/types'
import { assertKnownWorkflowBlockingCode } from '@/components/workbench/workflow-readiness/assert-blocking-code'

export interface BlockingItemsToStepsOptions {
  routeParams?: Record<string, string>
  routeQuery?: Record<string, string>
  actionLabelPrefix?: string
}

/**
 * 将后端 blockingItems 转为 WorkflowReadinessStep；直接使用 API message 与 targetRouteName。
 */
export function blockingItemsToWorkflowSteps(
  items: WorkflowBlockingItem[] | null | undefined,
  options: BlockingItemsToStepsOptions = {},
): WorkflowReadinessStep[] {
  if (!items?.length) {
    return []
  }
  const seenCodes = new Set<string>()
  const steps: WorkflowReadinessStep[] = []
  for (const item of items) {
    assertKnownWorkflowBlockingCode(item.code, 'blockingItemsToWorkflowSteps')
    if (seenCodes.has(item.code)) {
      continue
    }
    seenCodes.add(item.code)
    steps.push({
      code: item.code,
      label: item.message,
      status: 'pending',
      description: item.message,
      actionLabel: options.actionLabelPrefix
        ? `${options.actionLabelPrefix}${item.message}`
        : `前往${item.message}`,
      routeName: item.targetRouteName,
      routeParams: options.routeParams,
      routeQuery: options.routeQuery,
    })
  }
  return steps
}

export function mergeBlockingItemsByCode(
  examItems: WorkflowBlockingItem[] | null | undefined,
  groupItems: WorkflowBlockingItem[] | null | undefined,
): WorkflowBlockingItem[] {
  const merged: WorkflowBlockingItem[] = []
  const seenCodes = new Set<string>()
  for (const item of [...(examItems ?? []), ...(groupItems ?? [])]) {
    if (seenCodes.has(item.code)) {
      continue
    }
    seenCodes.add(item.code)
    merged.push(item)
  }
  return merged
}

export function truncateTooltip(message: string, maxLength = 40): string {
  if (message.length <= maxLength) {
    return message
  }
  return `${message.slice(0, maxLength)}…`
}
