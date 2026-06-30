import { onUnmounted, ref } from 'vue'
import { heartbeatScanDispatch } from '@/apis/mark/scanner-dispatch'

const HEARTBEAT_INTERVAL_MS = 60_000
const LEASE_LOST_FAILURE_THRESHOLD = 2

export interface LeaseHeartbeatCallbacks {
  onLeaseLost?: () => void
}

export function useLeaseHeartbeat() {
  const activeTicketId = ref<string | null>(null)
  const leaseLost = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null
  let consecutiveFailures = 0
  let callbacks: LeaseHeartbeatCallbacks | null = null

  function stopHeartbeat() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    activeTicketId.value = null
    consecutiveFailures = 0
    callbacks = null
  }

  function markLeaseLost() {
    if (leaseLost.value) {
      return
    }
    leaseLost.value = true
    stopHeartbeat()
    callbacks?.onLeaseLost?.()
  }

  async function sendHeartbeat(ticketId: string, scannerDeviceId: string, scannerStationId: string) {
    try {
      await heartbeatScanDispatch({ ticketId, scannerDeviceId, scannerStationId })
      consecutiveFailures = 0
    }
    catch {
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
    void sendHeartbeat(ticketId, scannerDeviceId, scannerStationId)
    timer = setInterval(() => {
      void sendHeartbeat(ticketId, scannerDeviceId, scannerStationId)
    }, HEARTBEAT_INTERVAL_MS)
  }

  onUnmounted(stopHeartbeat)

  return {
    activeTicketId,
    leaseLost,
    startHeartbeat,
    stopHeartbeat,
  }
}
