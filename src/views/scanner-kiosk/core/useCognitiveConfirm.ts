import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import { ref } from 'vue'

export function useCognitiveConfirm() {
  const confirmOpen = ref(false)
  const pendingTicket = ref<ScanDispatchTicketVO | null>(null)

  function requestConfirm(ticket: ScanDispatchTicketVO) {
    pendingTicket.value = ticket
    confirmOpen.value = true
  }

  function clearConfirm() {
    confirmOpen.value = false
    pendingTicket.value = null
  }

  return {
    confirmOpen,
    pendingTicket,
    requestConfirm,
    clearConfirm,
  }
}
