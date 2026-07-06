import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import type { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { computed, ref } from 'vue'
import { pageScanDispatchTickets } from '@/apis/mark/scanner-dispatch'
import { DispatchQueueStatusFilterCode } from '@/types/enums/dispatch-queue-status-filter-enum'
import { ScanDispatchTicketStatusCode } from '@/types/enums/scan-dispatch-ticket-status-enum'
import { getUserErrorMessage } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'

const STATUS_FILTER_MAP: Record<DispatchQueueStatusFilterCode, ScanDispatchTicketStatusCode[]> = {
  [DispatchQueueStatusFilterCode.ALL]: [
    ScanDispatchTicketStatusCode.PENDING,
    ScanDispatchTicketStatusCode.PROCESSING,
    ScanDispatchTicketStatusCode.SUSPENDED,
  ],
  [DispatchQueueStatusFilterCode.PENDING]: [ScanDispatchTicketStatusCode.PENDING],
  [DispatchQueueStatusFilterCode.PROCESSING]: [ScanDispatchTicketStatusCode.PROCESSING],
  [DispatchQueueStatusFilterCode.SUSPENDED]: [ScanDispatchTicketStatusCode.SUSPENDED],
  [DispatchQueueStatusFilterCode.FAILED]: [ScanDispatchTicketStatusCode.PENDING],
}

export {
  DispatchQueueStatusFilterCode,
  DispatchQueueStatusFilterDescription,
} from '@/types/enums/dispatch-queue-status-filter-enum'

export function useDispatchQueue() {
  const loading = ref(false)
  const errorMessage = ref('')
  const tickets = ref<ScanDispatchTicketVO[]>([])
  const pageNum = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const statusFilter = ref<DispatchQueueStatusFilterCode>(DispatchQueueStatusFilterCode.ALL)
  const scannerDeviceId = ref('')
  const scannerStationId = ref('')
  const taskKind = ref<ScanTaskKindCode | undefined>()

  const pendingCount = computed(() =>
    tickets.value.filter(item => item.status === ScanDispatchTicketStatusCode.PENDING).length,
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
        taskKind: taskKind.value,
        scannerDeviceId: scannerDeviceId.value || undefined,
        scannerStationId: scannerStationId.value || undefined,
        failureOnly: filter === DispatchQueueStatusFilterCode.FAILED ? true : undefined,
        excludeFailed: filter === DispatchQueueStatusFilterCode.ALL
          || filter === DispatchQueueStatusFilterCode.PENDING
          ? true
          : undefined,
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

  function setStatusFilter(filter: DispatchQueueStatusFilterCode) {
    statusFilter.value = filter
    pageNum.value = 1
  }

  function setTaskKindFilter(kind?: ScanTaskKindCode) {
    taskKind.value = kind
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
    scannerDeviceId,
    scannerStationId,
    taskKind,
    pendingCount,
    loadQueue,
    setStationFilter,
    setStatusFilter,
    setTaskKindFilter,
  }
}
