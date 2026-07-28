import type {
  WorkflowBlockingItem,
  WorkflowReadinessStep,
} from '@/components/workbench/workflow-readiness/types'
import { assertKnownWorkflowBlockingCode } from '@/components/workbench/workflow-readiness/assert-blocking-code'

export interface BlockingItemsToStepsOptions {
  routeParams?: Record<string, string>
  routeQuery?: Record<string, string>
}

/**
 * 将后端 blockingItems 转为 WorkflowReadinessStep。
 * message / targetRouteName / actionLabel 均采信 API，禁止前端拼接「去」前缀平行造文案。
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
    if (!item.actionLabel?.trim()) {
      throw new Error(`工作流阻断项缺少 actionLabel：${item.code}`)
    }
    seenCodes.add(item.code)
    steps.push({
      code: item.code,
      label: item.message,
      status: 'pending',
      description: item.message,
      actionLabel: item.actionLabel,
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
