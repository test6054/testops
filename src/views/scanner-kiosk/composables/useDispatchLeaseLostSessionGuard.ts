import type { Ref } from 'vue'
import type { ScanWorkOrderLifecycleVO } from '@/apis/mark/scanner-work-order'
import { watch } from 'vue'
import { ScanWorkOrderStatusCode } from '@/types/enums/scan-work-order-status-enum'

export interface DispatchLeaseLostSessionGuardOptions {
  /** 派单心跳租约是否已失效 */
  leaseLost: Ref<boolean>
  /** 与工单共享的 lifecycle，用于识别 DISCARDED */
  lifecycle: Ref<ScanWorkOrderLifecycleVO | null>
  /** 是否存在派单 ticket（派单链才需回队列） */
  hasDispatchTicket: () => boolean
  /** 租约失效后主动拉取工单最新状态 */
  refreshWorkOrderLifecycle: () => Promise<void>
  /** 停止 Agent 轮询与工单 settling 轮询 */
  suspendActiveScan: () => void
  /** 工单已 DISCARDED 时回派单队列 */
  returnToDispatchQueue: () => void
}

/**
 * 派单租约失效闭环：刷新工单状态、阻断续扫，并在服务端已 discard 时回队列。
 */
export function useDispatchLeaseLostSessionGuard(options: DispatchLeaseLostSessionGuardOptions) {
  watch(
    () => options.leaseLost.value,
    (lost) => {
      if (!lost) {
        return
      }
      options.suspendActiveScan()
      void reconcileLeaseLostLifecycle()
    },
  )

  async function reconcileLeaseLostLifecycle() {
    try {
      await options.refreshWorkOrderLifecycle()
    } catch {
      // 租约已失效仍保持阻断；刷新失败不解除 leaseLost
    }
    if (
      options.lifecycle.value?.status === ScanWorkOrderStatusCode.DISCARDED
      && options.hasDispatchTicket()
    ) {
      options.returnToDispatchQueue()
    }
  }

  return {
    isScanSessionBlocked: options.leaseLost,
    reconcileLeaseLostLifecycle,
  }
}
