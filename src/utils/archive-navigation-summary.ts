import type {
  ArchiveVolumeLifecycleNodeVO,
  ArchiveVolumeNavigationChainStatusCode,
  ArchiveVolumeNavigationSummaryVO,
} from '@/apis/mark/archive-volume'
import type { ArchiveLifecycleStep, ArchiveLifecycleStepStatus } from '@/utils/archive-volume-lifecycle'

const NAVIGATION_CHAIN_STATUS_TO_PIPE_STATUS: Record<
  ArchiveVolumeNavigationChainStatusCode,
  ArchiveLifecycleStepStatus
> = {
  done: 'done',
  current: 'active',
  pending: 'pending',
  warn: 'warn',
}

/**
 * 将后端 navigationSummary.lifecycleNodes 映射为 lifecycle-pipe 步骤；禁止本地重算卷主链进度。
 */
export function mapNavigationLifecycleNodesToPipeSteps(
  nodes: ArchiveVolumeLifecycleNodeVO[],
): ArchiveLifecycleStep[] {
  return nodes.map((node, index) => {
    const status = NAVIGATION_CHAIN_STATUS_TO_PIPE_STATUS[node.nodeStatus]
    if (!status) {
      throw new Error(
        `navigationSummary.lifecycleNodes[${index}] 无效 nodeStatus: ${String(node.nodeStatus)}`,
      )
    }
    return {
      key: `lifecycle-${index}`,
      label: node.label,
      status,
    }
  })
}

export interface ArchiveVolumeNavigationLifecycleView {
  steps: ArchiveLifecycleStep[]
  completedCount: number
  totalCount: number
}

/**
 * 从详情 navigationSummary 构建卷主链 lifecycle-pipe 视图；summary 缺失或 lifecycleNodes 为空时返回 null。
 */
export function buildVolumeNavigationLifecycleView(
  summary: ArchiveVolumeNavigationSummaryVO | undefined | null,
): ArchiveVolumeNavigationLifecycleView | null {
  if (!summary?.lifecycleNodes?.length) {
    return null
  }
  return {
    steps: mapNavigationLifecycleNodesToPipeSteps(summary.lifecycleNodes),
    completedCount: summary.completedLifecycleCount ?? 0,
    totalCount: summary.totalLifecycleCount ?? summary.lifecycleNodes.length,
  }
}
