import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import type { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { computed, ref } from 'vue'
import { pageScanDispatchTickets } from '@/apis/mark/scanner-dispatch'
import { DispatchQueueStatusFilterCode } from '@/types/enums/dispatch-queue-status-filter-enum'
import { ScanDispatchTicketStatusCode } from '@/types/enums/scan-dispatch-ticket-status-enum'
import { getUserErrorMessage } from '@/utils/error-handler'

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
  /** 队列筛选/分页请求代际：丢弃过期响应，失败时保留上次成功列表 */
  let queueLoadGeneration = 0

  const pendingCount = computed(
    () =>
      tickets.value.filter((item) => item.status === ScanDispatchTicketStatusCode.PENDING).length,
  )

  async function loadQueue() {
    const loadGeneration = ++queueLoadGeneration
    const requestFingerprint = {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      statusFilter: statusFilter.value,
      taskKind: taskKind.value,
      scannerDeviceId: scannerDeviceId.value,
      scannerStationId: scannerStationId.value,
    }
    loading.value = true
    errorMessage.value = ''
    try {
      const filter = requestFingerprint.statusFilter
      const page = await pageScanDispatchTickets({
        pageNum: requestFingerprint.pageNum,
        pageSize: requestFingerprint.pageSize,
        statusList: STATUS_FILTER_MAP[filter],
        taskKind: requestFingerprint.taskKind,
        scannerDeviceId: requestFingerprint.scannerDeviceId || undefined,
        scannerStationId: requestFingerprint.scannerStationId || undefined,
        failureOnly: filter === DispatchQueueStatusFilterCode.FAILED ? true : undefined,
        excludeFailed:
          filter === DispatchQueueStatusFilterCode.ALL
          || filter === DispatchQueueStatusFilterCode.PENDING
            ? true
            : undefined,
      })
      if (loadGeneration !== queueLoadGeneration) {
        return
      }
      tickets.value = page.list
      total.value = page.total
    } catch (error) {
      if (loadGeneration !== queueLoadGeneration) {
        return
      }
      errorMessage.value = getUserErrorMessage(error)
    } finally {
      if (loadGeneration === queueLoadGeneration) {
        loading.value = false
      }
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
