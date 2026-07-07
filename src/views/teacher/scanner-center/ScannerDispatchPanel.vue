<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import type { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ALL_SCAN_DISPATCH_TICKET_STATUS_CODES,
  cancelScanDispatch,
  loadScanDispatchQueueSummary,
  pageScanDispatchTickets,
  SCAN_DISPATCH_TICKET_STATUS_OPTIONS,
  ScanDispatchTicketStatusCode,
  ScanDispatchTicketStatusDescription,
} from '@/apis/mark/scanner-dispatch'
import {
  SCAN_TASK_KIND_OPTIONS,
  ScanTaskKindDescription,
} from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  DispatchQueueStatusFilterCode,
} from '@/types/enums/dispatch-queue-status-filter-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import ScanDispatchForceReleaseDialog from '@/views/teacher/archive-volume/components/ScanDispatchForceReleaseDialog.vue'

defineOptions({ name: 'ScannerDispatchPanel' })

const props = defineProps<{
  initialStatus?: string
  initialDispatchFilter?: string
}>()

const emit = defineEmits<{
  'open-log': [payload: {
    ticketId?: string
    volumeId?: string
    dispatchFilter?: string
    dispatchStatus?: string
  }]
  'metrics-changed': []
}>()

/** 与工位 useDispatchQueue 分页契约一致，避免待办池混入 failure_reason 派单。 */
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

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const summaryLoading = ref(false)
const cancellingTicketId = ref<string>()
const forceReleaseOpen = ref(false)
const forceReleaseTicket = ref<{ ticketId: string } | null>(null)
const tickets = ref<ScanDispatchTicketVO[]>([])
const queueSummary = ref<Awaited<ReturnType<typeof loadScanDispatchQueueSummary>> | null>(null)
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })
const queueFilter = ref<DispatchQueueStatusFilterCode>(DispatchQueueStatusFilterCode.ALL)
/** 丢弃过期派单列表/概览请求，避免快切队列或并发刷新覆盖。 */
let ticketsLoadGeneration = 0
let summaryLoadGeneration = 0

interface DispatchFilters {
  status?: ScanDispatchTicketStatusCode
  taskKind?: ScanTaskKindCode
}

const filters = reactive<DispatchFilters>({})

const isFailedQueueView = computed(() => queueFilter.value === DispatchQueueStatusFilterCode.FAILED)

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'taskKind',
    label: '任务类型',
    type: 'select',
    placeholder: '全部',
    allowClear: true,
    options: SCAN_TASK_KIND_OPTIONS,
  },
  {
    key: 'status',
    label: '派单状态',
    type: 'select',
    placeholder: '全部',
    allowClear: true,
    disabled: isFailedQueueView.value,
    options: SCAN_DISPATCH_TICKET_STATUS_OPTIONS,
  },
])

const columns = computed<ColumnsType<ScanDispatchTicketVO>>(() => {
  const base: ColumnsType<ScanDispatchTicketVO> = [
    { title: '派单 ID', dataIndex: 'ticketId', key: 'ticketId', width: 120 },
    { title: '任务类型', key: 'taskKind', width: 120 },
    { title: '状态', key: 'status', width: 100 },
    { title: '追溯码', dataIndex: 'traceLabelCode', key: 'traceLabelCode', width: 120 },
  ]
  if (isFailedQueueView.value) {
    base.push({ title: '失败原因', key: 'failureReason', ellipsis: true })
  }
  base.push(
    { title: '业务上下文', key: 'archiveTitle', ellipsis: true },
    { title: '创建时间', key: 'createTime', width: 168 },
    { title: '操作', key: 'actions', width: isFailedQueueView.value ? 320 : 200, fixed: 'right' },
  )
  return base
})

const signalMetrics = computed<SignalMetric[]>(() => {
  const summary = queueSummary.value
  if (!summary) {
    return []
  }
  const failedCount = summary.failedTicketCount ?? 0
  return [
    {
      key: 'pending',
      label: '待处理',
      value: String(summary.pendingCount ?? 0),
      tone: 'blue',
      clickable: true,
      active: queueFilter.value === DispatchQueueStatusFilterCode.PENDING,
    },
    {
      key: 'processing',
      label: '处理中',
      value: String(summary.processingCount ?? 0),
      tone: 'orange',
      clickable: true,
      active: queueFilter.value === DispatchQueueStatusFilterCode.PROCESSING,
    },
    {
      key: 'suspended',
      label: '已挂起',
      value: String(summary.suspendedCount ?? 0),
      tone: 'gray',
      clickable: true,
      active: queueFilter.value === DispatchQueueStatusFilterCode.SUSPENDED,
    },
    {
      key: 'failed',
      label: '失败派单',
      value: String(failedCount),
      tone: failedCount > 0 ? 'red' : 'green',
      clickable: true,
      active: queueFilter.value === DispatchQueueStatusFilterCode.FAILED,
      helper: failedCount > 0 ? '打开失败队列' : undefined,
    },
  ]
})

const tableEmptyDescription = computed(() =>
  isFailedQueueView.value ? '暂无失败派单' : '暂无派单记录',
)

function resolveLifecycleFilter(
  value: unknown,
): DispatchQueueStatusFilterCode.PENDING
  | DispatchQueueStatusFilterCode.PROCESSING
  | DispatchQueueStatusFilterCode.SUSPENDED
  | undefined {
  const status = ALL_SCAN_DISPATCH_TICKET_STATUS_CODES.find((code) => code === value)
  if (status === ScanDispatchTicketStatusCode.PENDING) {
    return DispatchQueueStatusFilterCode.PENDING
  }
  if (status === ScanDispatchTicketStatusCode.PROCESSING) {
    return DispatchQueueStatusFilterCode.PROCESSING
  }
  if (status === ScanDispatchTicketStatusCode.SUSPENDED) {
    return DispatchQueueStatusFilterCode.SUSPENDED
  }
  return undefined
}

function lifecycleFilterToStatus(
  filter: DispatchQueueStatusFilterCode,
): ScanDispatchTicketStatusCode | undefined {
  if (filter === DispatchQueueStatusFilterCode.PENDING) {
    return ScanDispatchTicketStatusCode.PENDING
  }
  if (filter === DispatchQueueStatusFilterCode.PROCESSING) {
    return ScanDispatchTicketStatusCode.PROCESSING
  }
  if (filter === DispatchQueueStatusFilterCode.SUSPENDED) {
    return ScanDispatchTicketStatusCode.SUSPENDED
  }
  return undefined
}

function applyRouteQueueFilter() {
  const dispatchFilter = props.initialDispatchFilter ?? route.query.dispatchFilter
  if (dispatchFilter === DispatchQueueStatusFilterCode.FAILED) {
    queueFilter.value = DispatchQueueStatusFilterCode.FAILED
    filters.status = undefined
    return
  }
  const lifecycle = resolveLifecycleFilter(props.initialStatus ?? route.query.dispatchStatus)
  if (lifecycle !== undefined) {
    queueFilter.value = lifecycle
    filters.status = lifecycleFilterToStatus(lifecycle)
    return
  }
  queueFilter.value = DispatchQueueStatusFilterCode.ALL
}

function syncDispatchRouteQuery() {
  if (queueFilter.value === DispatchQueueStatusFilterCode.FAILED) {
    void router.replace({ query: { tab: 'dispatch', dispatchFilter: DispatchQueueStatusFilterCode.FAILED } })
    return
  }
  const status = lifecycleFilterToStatus(queueFilter.value)
  if (status) {
    void router.replace({ query: { tab: 'dispatch', dispatchStatus: status } })
    return
  }
  void router.replace({ query: { tab: 'dispatch' } })
}

function applyQueueFilter(filter: DispatchQueueStatusFilterCode) {
  queueFilter.value = filter
  if (filter === DispatchQueueStatusFilterCode.FAILED) {
    filters.status = undefined
  }
  else if (filter === DispatchQueueStatusFilterCode.ALL) {
    filters.status = undefined
  }
  else {
    filters.status = lifecycleFilterToStatus(filter)
  }
  pagination.current = 1
  syncDispatchRouteQuery()
  void loadTickets()
}

function handleSignalMetricClick(key: string) {
  if (key === 'pending') {
    applyQueueFilter(DispatchQueueStatusFilterCode.PENDING)
    return
  }
  if (key === 'processing') {
    applyQueueFilter(DispatchQueueStatusFilterCode.PROCESSING)
    return
  }
  if (key === 'suspended') {
    applyQueueFilter(DispatchQueueStatusFilterCode.SUSPENDED)
    return
  }
  if (key === 'failed') {
    applyQueueFilter(DispatchQueueStatusFilterCode.FAILED)
  }
}

function taskKindLabel(kind?: ScanTaskKindCode) {
  if (!kind) return '—'
  return strictEnumLabel(ScanTaskKindDescription, kind, 'taskKind')
}

function statusLabel(status?: ScanDispatchTicketStatusCode) {
  if (!status) return '—'
  return strictEnumLabel(ScanDispatchTicketStatusDescription, status, 'ticketStatus')
}

function statusTone(record: ScanDispatchTicketVO): 'blue' | 'red' | 'orange' | 'gray' {
  if (record.failureReason?.trim()) {
    return 'red'
  }
  if (record.status === ScanDispatchTicketStatusCode.PROCESSING) {
    return 'orange'
  }
  if (record.status === ScanDispatchTicketStatusCode.SUSPENDED) {
    return 'gray'
  }
  return 'blue'
}

function archiveTitle(record: ScanDispatchTicketVO) {
  return record.archiveSnapshot?.archiveTitle ?? record.portfolioSnapshot?.gapTaskTitle ?? '—'
}

function contextVolumeId(record: ScanDispatchTicketVO) {
  return record.archiveSnapshot?.volumeId
}

async function loadSummary() {
  const generation = ++summaryLoadGeneration
  summaryLoading.value = true
  try {
    const summary = await loadScanDispatchQueueSummary()
    if (generation !== summaryLoadGeneration) {
      return
    }
    queueSummary.value = summary
  }
  catch (error) {
    if (generation !== summaryLoadGeneration) {
      return
    }
    queueSummary.value = null
    showUserError(error, '派单队列概览加载失败')
  }
  finally {
    if (generation === summaryLoadGeneration) {
      summaryLoading.value = false
    }
  }
}

async function loadTickets() {
  const generation = ++ticketsLoadGeneration
  loading.value = true
  try {
    const filter = queueFilter.value
    const result = await pageScanDispatchTickets({
      taskKind: filters.taskKind,
      statusList: STATUS_FILTER_MAP[filter],
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      failureOnly: filter === DispatchQueueStatusFilterCode.FAILED ? true : undefined,
      excludeFailed: filter === DispatchQueueStatusFilterCode.ALL
        || filter === DispatchQueueStatusFilterCode.PENDING
        ? true
        : undefined,
    })
    if (generation !== ticketsLoadGeneration) {
      return
    }
    tickets.value = result.list
    pagination.total = Number(result.total)
  }
  catch (error) {
    if (generation !== ticketsLoadGeneration) {
      return
    }
    tickets.value = []
    pagination.total = 0
    showUserError(error, '派单列表加载失败')
  }
  finally {
    if (generation === ticketsLoadGeneration) {
      loading.value = false
    }
  }
}

async function reloadAll() {
  await Promise.all([loadSummary(), loadTickets()])
}

function handleSearch() {
  pagination.current = 1
  if (isFailedQueueView.value) {
    void loadTickets()
    return
  }
  if (filters.status) {
    const lifecycle = resolveLifecycleFilter(filters.status)
    queueFilter.value = lifecycle ?? DispatchQueueStatusFilterCode.ALL
  }
  else {
    queueFilter.value = DispatchQueueStatusFilterCode.ALL
  }
  syncDispatchRouteQuery()
  void loadTickets()
}

function handleResetSearch() {
  filters.status = undefined
  filters.taskKind = undefined
  queueFilter.value = DispatchQueueStatusFilterCode.ALL
  pagination.current = 1
  syncDispatchRouteQuery()
  void loadTickets()
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pagination.current = pageEvent.current
  pagination.pageSize = pageEvent.pageSize
  void loadTickets()
}

function openKiosk(ticketId?: string) {
  if (!ticketId) return
  void router.push({ path: `/scanner-kiosk/dispatch/${ticketId}` })
}

function currentDispatchRouteContext(): {
  dispatchFilter?: string
  dispatchStatus?: string
} {
  if (queueFilter.value === DispatchQueueStatusFilterCode.FAILED) {
    return { dispatchFilter: DispatchQueueStatusFilterCode.FAILED }
  }
  const status = lifecycleFilterToStatus(queueFilter.value)
  if (status) {
    return { dispatchStatus: status }
  }
  return {}
}

function openOperationLog(record: ScanDispatchTicketVO) {
  emit('open-log', {
    ticketId: record.ticketId,
    volumeId: contextVolumeId(record),
    ...currentDispatchRouteContext(),
  })
}

function canCancelTicket(record: ScanDispatchTicketVO) {
  return record.status === ScanDispatchTicketStatusCode.PENDING && Boolean(record.ticketId)
}

function canForceReleaseTicket(record: ScanDispatchTicketVO) {
  return Boolean(record.ticketId)
    && (record.status === ScanDispatchTicketStatusCode.PROCESSING
      || record.status === ScanDispatchTicketStatusCode.SUSPENDED)
}

function openForceRelease(record: ScanDispatchTicketVO) {
  if (!canForceReleaseTicket(record) || !record.ticketId) {
    return
  }
  forceReleaseTicket.value = { ticketId: record.ticketId }
  forceReleaseOpen.value = true
}

async function cancelTicket(record: ScanDispatchTicketVO) {
  if (!canCancelTicket(record) || !record.ticketId) {
    return
  }
  await confirmAsync({
    title: '取消派单',
    content: '取消后工位将无法再 claim 该派单，确定继续？',
    type: 'warning',
    onOk: async () => {
      cancellingTicketId.value = record.ticketId
      try {
        await cancelScanDispatch({ ticketId: record.ticketId! })
        await reloadAll()
        emit('metrics-changed')
      }
      catch (error) {
        showUserError(error, '取消派单失败')
      }
      finally {
        cancellingTicketId.value = undefined
      }
    },
  })
}

function handleForceReleased() {
  void reloadAll().then(() => emit('metrics-changed'))
}

watch(
  () => ({
    filterRaw: props.initialDispatchFilter ?? route.query.dispatchFilter,
    statusRaw: props.initialStatus ?? route.query.dispatchStatus,
  }),
  (dispatchQuery) => {
    if (dispatchQuery.filterRaw === DispatchQueueStatusFilterCode.FAILED) {
      if (queueFilter.value === DispatchQueueStatusFilterCode.FAILED) {
        return
      }
      queueFilter.value = DispatchQueueStatusFilterCode.FAILED
      filters.status = undefined
      pagination.current = 1
      void loadTickets()
      return
    }
    const lifecycle = resolveLifecycleFilter(dispatchQuery.statusRaw)
    if (lifecycle !== undefined) {
      if (queueFilter.value === lifecycle && filters.status === lifecycleFilterToStatus(lifecycle)) {
        return
      }
      queueFilter.value = lifecycle
      filters.status = lifecycleFilterToStatus(lifecycle)
      pagination.current = 1
      void loadTickets()
      return
    }
    if (queueFilter.value !== DispatchQueueStatusFilterCode.ALL || filters.status !== undefined) {
      queueFilter.value = DispatchQueueStatusFilterCode.ALL
      filters.status = undefined
      pagination.current = 1
      void loadTickets()
    }
  },
)

onMounted(() => {
  applyRouteQueueFilter()
  void reloadAll()
})
</script>

<template>
  <div class="scanner-dispatch-panel">
    <SignalBand
      v-if="signalMetrics.length"
      variant="tiles"
      compact
      :metrics="signalMetrics"
      class="scanner-dispatch-panel__signal"
      @metric-click="handleSignalMetricClick"
    />

    <UiAlertStrip
      v-if="isFailedQueueView"
      tone="error"
      dense
      title="失败派单队列"
      description="以下均为待处理（PENDING）且已写入 failure_reason 的派单，可取消派单或打开工位确认现场。占用工位锁的处理中/挂起派单请在本页切换队列或使用行内强制释放。"
    >
      <template #actions>
        <UiButton
          size="sm"
          variant="outline"
          @click="applyQueueFilter(DispatchQueueStatusFilterCode.PROCESSING)"
        >
          打开处理中队列
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="applyQueueFilter(DispatchQueueStatusFilterCode.SUSPENDED)"
        >
          打开挂起队列
        </UiButton>
      </template>
    </UiAlertStrip>

    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <div class="scanner-dispatch-panel__toolbar">
          <UiFilterBar
            variant="plain"
            :model-value="filters"
            :fields="filterFields"
            search-text="查询"
            @update:model-value="Object.assign(filters, $event)"
            @search="handleSearch"
            @reset="handleResetSearch"
          />
          <UiButton size="sm" variant="outline" :loading="loading || summaryLoading" @click="() => reloadAll()">
            刷新
          </UiButton>
        </div>
      </template>

      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="tickets"
        :loading="loading"
        :total="pagination.total"
        row-key="ticketId"
        flat
        :empty-description="tableEmptyDescription"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'taskKind'">
            {{ taskKindLabel(record.taskKind) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag size="sm" :tone="statusTone(record)">{{ statusLabel(record.status) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'failureReason'">
            {{ record.failureReason?.trim() || '—' }}
          </template>
          <template v-else-if="column.key === 'archiveTitle'">
            {{ archiveTitle(record) }}
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ record.createTime ? formatDateTime(record.createTime) : '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="scanner-dispatch-panel__actions">
              <UiTextAction tone="primary" @click="openKiosk(record.ticketId)">
                打开工位
              </UiTextAction>
              <UiTextAction
                v-if="canCancelTicket(record)"
                tone="danger"
                :disabled="cancellingTicketId === record.ticketId"
                @click="() => cancelTicket(record)"
              >
                取消派单
              </UiTextAction>
              <UiTextAction
                v-if="canForceReleaseTicket(record)"
                tone="danger"
                @click="() => openForceRelease(record)"
              >
                强制解锁
              </UiTextAction>
              <UiTextAction @click="openOperationLog(record)">
                操作日志
              </UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <ScanDispatchForceReleaseDialog
      v-model:open="forceReleaseOpen"
      :ticket="forceReleaseTicket ? { ticketId: forceReleaseTicket.ticketId } : null"
      @released="handleForceReleased"
    />
  </div>
</template>

<style scoped>
.scanner-dispatch-panel__signal {
  margin-bottom: 12px;
}

.scanner-dispatch-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.scanner-dispatch-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
