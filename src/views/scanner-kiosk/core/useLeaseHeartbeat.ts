import { onUnmounted, ref } from 'vue'
import { heartbeatScanDispatch } from '@/apis/mark/scanner-dispatch'
import { ResultCode } from '@/types/enums/result-code'
import { readBusinessResultCode } from '@/utils/error-handler'

const HEARTBEAT_INTERVAL_MS = 60_000
const LEASE_LOST_FAILURE_THRESHOLD = 2

export interface LeaseHeartbeatCallbacks {
  onLeaseLost?: () => void
}

export function useLeaseHeartbeat() {
  const activeTicketId = ref<string | null>(null)
  const leaseLost = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let heartbeatGeneration = 0
  let consecutiveFailures = 0
  let callbacks: LeaseHeartbeatCallbacks | null = null

  function stopHeartbeat() {
    heartbeatGeneration += 1
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    activeTicketId.value = null
    consecutiveFailures = 0
    callbacks = null
  }

  /** 租约失效时先取出回调再停心跳，避免 stopHeartbeat 清空 callbacks 导致 onLeaseLost 永不执行。 */
  function markLeaseLost() {
    if (leaseLost.value) {
      return
    }
    leaseLost.value = true
    const onLeaseLost = callbacks?.onLeaseLost
    stopHeartbeat()
    onLeaseLost?.()
  }

  async function sendHeartbeat(ticketId: string, scannerDeviceId: string, scannerStationId: string) {
    try {
      await heartbeatScanDispatch({ ticketId, scannerDeviceId, scannerStationId })
      consecutiveFailures = 0
    }
    catch (error) {
      const businessCode = readBusinessResultCode(error)
      if (
        businessCode === ResultCode.CONFLICT
        || businessCode === ResultCode.NOT_FOUND
        || businessCode === ResultCode.FORBIDDEN
      ) {
        markLeaseLost()
        return
      }
      consecutiveFailures += 1
      if (consecutiveFailures >= LEASE_LOST_FAILURE_THRESHOLD) {
        markLeaseLost()
      }
    }
  }

  function startHeartbeat(
    ticketId: string,
    scannerDeviceId: string,
    scannerStationId: string,
    nextCallbacks?: LeaseHeartbeatCallbacks,
  ) {
    stopHeartbeat()
    leaseLost.value = false
    callbacks = nextCallbacks ?? null
    activeTicketId.value = ticketId
    const generation = heartbeatGeneration
    const scheduleNext = (delayMs: number) => {
      if (generation !== heartbeatGeneration) {
        return
      }
      timer = setTimeout(() => {
        void (async () => {
          if (generation !== heartbeatGeneration) {
            return
          }
          await sendHeartbeat(ticketId, scannerDeviceId, scannerStationId)
          if (generation !== heartbeatGeneration) {
            return
          }
          scheduleNext(HEARTBEAT_INTERVAL_MS)
        })()
      }, delayMs)
    }
    scheduleNext(0)
  }

  function releaseLease() {
    stopHeartbeat()
    leaseLost.value = false
  }

  onUnmounted(stopHeartbeat)

  return {
    activeTicketId,
    leaseLost,
    startHeartbeat,
    stopHeartbeat,
    releaseLease,
  }
}
