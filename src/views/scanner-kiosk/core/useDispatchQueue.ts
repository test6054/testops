import type { ScanDispatchTicketStatusCode, ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import { computed, ref } from 'vue'
import { pageScanDispatchTickets } from '@/apis/mark/scanner-dispatch'
import { getUserErrorMessage } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'

export type DispatchQueueStatusFilter = 'ALL' | ScanDispatchTicketStatusCode | 'FAILED'

const STATUS_FILTER_MAP: Record<DispatchQueueStatusFilter, ScanDispatchTicketStatusCode[]> = {
  ALL: ['PENDING', 'PROCESSING', 'SUSPENDED'],
  PENDING: ['PENDING'],
  PROCESSING: ['PROCESSING'],
  SUSPENDED: ['SUSPENDED'],
  DONE: ['DONE'],
  EXPIRED: ['EXPIRED'],
  CANCELLED: ['CANCELLED'],
  FAILED: ['PENDING'],
}

export function useDispatchQueue() {
  const loading = ref(false)
  const errorMessage = ref('')
  const tickets = ref<ScanDispatchTicketVO[]>([])
  const pageNum = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const statusFilter = ref<DispatchQueueStatusFilter>('ALL')
  const scannerDeviceId = ref('')
  const scannerStationId = ref('')

  const pendingCount = computed(() =>
    tickets.value.filter(item => item.status === 'PENDING').length,
  )

  async function loadQueue() {
    loading.value = true
    errorMessage.value = ''
    try {
      const filter = statusFilter.value
      const page = await pageScanDispatchTickets({
        pageNum: pageNum.value,
        pageSize: pageSize.value,
        statusList: STATUS_FILTER_MAP[filter],
        scannerDeviceId: scannerDeviceId.value || undefined,
        scannerStationId: scannerStationId.value || undefined,
        failureOnly: filter === 'FAILED' ? true : undefined,
        excludeFailed: filter === 'ALL' || filter === 'PENDING' ? true : undefined,
      })
      tickets.value = readPageList(page, '派单队列加载失败，请稍后重试')
      total.value = readPageTotal(page, '派单队列总数加载失败，请稍后重试')
    }
    catch (error) {
      errorMessage.value = getUserErrorMessage(error)
      tickets.value = []
      total.value = 0
    }
    finally {
      loading.value = false
    }
  }

  function setStationFilter(deviceId: string, stationId: string) {
    scannerDeviceId.value = deviceId
    scannerStationId.value = stationId
  }

  function setStatusFilter(filter: DispatchQueueStatusFilter) {
    statusFilter.value = filter
    pageNum.value = 1
  }

  return {
    loading,
    errorMessage,
    tickets,
    pageNum,
    pageSize,
    total,
    statusFilter,
    pendingCount,
    loadQueue,
    setStationFilter,
    setStatusFilter,
  }
}
