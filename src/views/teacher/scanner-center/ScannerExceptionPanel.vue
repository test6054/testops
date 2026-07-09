<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ScannerExceptionDashboardItemVO } from '@/apis/mark/scanner-dispatch'
import {
  cancelScanDispatch,
  pageScannerExceptionDashboard,
  ScanBatchQualityFlagDescription,
  ScanDispatchTicketStatusCode,
  ScanDispatchTicketStatusDescription,
} from '@/apis/mark/scanner-dispatch'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dismissScanBatchCollateAttention, retryScanBatchPageRegister } from '@/apis/mark/exam-scan'
import { ScanWorkOrderStatusDescription } from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEllipsisText from '@/components/ui-guide/ui/UiEllipsisText.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  PageRegisterStateCode,
  PageRegisterStateDescription,
} from '@/types/enums/page-register-state-enum'
import { ScannerExceptionItemKindCode } from '@/types/enums/scanner-exception-item-kind-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import ScanDispatchForceReleaseDialog from '@/views/teacher/archive-volume/components/ScanDispatchForceReleaseDialog.vue'

defineOptions({ name: 'ScannerExceptionPanel' })

const props = defineProps<{
  initialKind?: string
}>()

const emit = defineEmits<{
  'open-log': [payload: { ticketId?: string; volumeId?: string }]
  'metrics-changed': []
}>()

type ExceptionDashboardRowKind = ScannerExceptionItemKindCode

interface ExceptionDashboardRow extends ScannerExceptionDashboardItemVO {
  rowKey: string
}

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const rows = ref<ExceptionDashboardRow[]>([])
const itemKindFilter = ref<ExceptionDashboardRowKind | undefined>(undefined)
const forceReleaseOpen = ref(false)
const forceReleaseTicket = ref<{ ticketId: string } | null>(null)
const cancellingTicketId = ref<string>()
const pageRegisterRetryingKey = ref<string | null>(null)
const partialTailDismissingKey = ref<string | null>(null)
const pagination = reactive({ current: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
let pageLoadGeneration = 0

const columns: ColumnsType<ExceptionDashboardRow> = [
  { title: '类型', key: 'itemKind', dataIndex: 'itemKind', width: 88, fixed: 'left' },
  { title: '标识', key: 'identifier', dataIndex: 'identifier', width: 168, ellipsis: true },
  { title: '状态', key: 'status', dataIndex: 'status', width: 108 },
  {
    title: '说明',
    key: 'detail',
    dataIndex: 'detail',
    minWidth: 320,
    ellipsis: true,
    align: 'left',
    className: 'ui-data-table__col--text-left',
  },
  { title: '操作', key: 'actions', width: 248 },
]

function buildRowKey(item: ScannerExceptionDashboardItemVO): string {
  if (item.itemKind === ScannerExceptionItemKindCode.TICKET) {
    return `ticket-${item.ticketId ?? ''}`
  }
  if (item.itemKind === ScannerExceptionItemKindCode.WORK_ORDER) {
    return `work-order-${item.workOrderId ?? ''}`
  }
  if (item.itemKind === ScannerExceptionItemKindCode.COMMITTING) {
    return `committing-${item.workOrderId ?? ''}`
  }
  if (item.itemKind === ScannerExceptionItemKindCode.MIXED_BATCH) {
    return `mixed-${item.workOrderId ?? ''}-${item.volumeId ?? ''}`
  }
  if (item.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) {
    return `page-register-${item.scanBatchId ?? ''}`
  }
  if (item.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL) {
    return `partial-tail-${item.scanBatchId ?? ''}`
  }
  return `exception-${item.workOrderId ?? item.ticketId ?? item.scanBatchId ?? ''}`
}

function toExceptionDashboardRow(item: ScannerExceptionDashboardItemVO): ExceptionDashboardRow {
  return { ...item, rowKey: buildRowKey(item) }
}

async function loadPage() {
  const generation = ++pageLoadGeneration
  loading.value = true
  try {
    const page = await pageScannerExceptionDashboard({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      itemKind: itemKindFilter.value,
    })
    if (generation !== pageLoadGeneration) {
      return
    }
    pagination.total = Number(page.total ?? 0)
    rows.value = (page.list ?? []).map(toExceptionDashboardRow)
  } catch (error) {
    if (generation !== pageLoadGeneration) {
      return
    }
    rows.value = []
    pagination.total = 0
    showUserError(error, '扫描异常看板加载失败')
  } finally {
    if (generation === pageLoadGeneration) {
      loading.value = false
    }
  }
}

async function reloadAll() {
  await loadPage()
}

function filterByKind(kind?: ExceptionDashboardRowKind) {
  itemKindFilter.value = kind
  pagination.current = 1
  const query: Record<string, string> = { tab: 'exception' }
  if (kind) {
    query.kind = kind
  }
  void router.replace({ query })
  void loadPage()
}

function applyRouteKindFilter() {
  const kind = props.initialKind ?? route.query.kind
  if (
    kind === ScannerExceptionItemKindCode.TICKET ||
    kind === ScannerExceptionItemKindCode.WORK_ORDER ||
    kind === ScannerExceptionItemKindCode.COMMITTING ||
    kind === ScannerExceptionItemKindCode.MIXED_BATCH ||
    kind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED ||
    kind === ScannerExceptionItemKindCode.PARTIAL_TAIL
  ) {
    itemKindFilter.value = kind
    return
  }
  itemKindFilter.value = undefined
}

function itemKindLabel(kind: ExceptionDashboardRowKind) {
  if (kind === ScannerExceptionItemKindCode.TICKET) return '派单'
  if (kind === ScannerExceptionItemKindCode.WORK_ORDER) return '工单'
  if (kind === ScannerExceptionItemKindCode.COMMITTING) return '合成中'
  if (kind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) return '页登记阻断'
  if (kind === ScannerExceptionItemKindCode.PARTIAL_TAIL) return '余页未切卷'
  return '混扫批次'
}

function rowIdentifier(row: ExceptionDashboardRow) {
  if (row.itemKind === ScannerExceptionItemKindCode.TICKET) {
    return row.ticketId ?? row.traceLabelCode ?? '—'
  }
  if (
    row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER ||
    row.itemKind === ScannerExceptionItemKindCode.COMMITTING
  ) {
    return row.workOrderId ?? row.batchExternalNo ?? '—'
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) {
    return row.batchNo ?? row.batchExternalNo ?? row.scanBatchId ?? '—'
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL) {
    return row.batchNo ?? row.batchExternalNo ?? row.scanBatchId ?? '—'
  }
  return row.volumeId ?? row.workOrderId ?? '—'
}

function statusLabel(row: ExceptionDashboardRow) {
  if (
    (row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER ||
      row.itemKind === ScannerExceptionItemKindCode.COMMITTING) &&
    row.workOrderStatus
  ) {
    return strictEnumLabel(ScanWorkOrderStatusDescription, row.workOrderStatus, 'workOrderStatus')
  }
  if (row.itemKind === ScannerExceptionItemKindCode.TICKET && row.ticketStatus) {
    return strictEnumLabel(ScanDispatchTicketStatusDescription, row.ticketStatus, 'ticketStatus')
  }
  if (row.itemKind === ScannerExceptionItemKindCode.MIXED_BATCH && row.batchQualityFlag) {
    return strictEnumLabel(
      ScanBatchQualityFlagDescription,
      row.batchQualityFlag,
      'batchQualityFlag',
    )
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) {
    const state = row.pageRegisterState
    if (state === PageRegisterStateCode.BLOCKED_FATAL) {
      return strictEnumLabel(PageRegisterStateDescription, state, 'pageRegisterState')
    }
    if (
      state === PageRegisterStateCode.BLOCKED_RECOVERABLE ||
      state === PageRegisterStateCode.PENDING
    ) {
      return strictEnumLabel(PageRegisterStateDescription, state, 'pageRegisterState')
    }
    return '页登记阻断'
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL) {
    return '余页待确认'
  }
  return '—'
}

function rowDetail(row: ExceptionDashboardRow) {
  if (row.itemKind === ScannerExceptionItemKindCode.TICKET) {
    return row.failureReason ?? row.traceLabelCode ?? '—'
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) {
    const progress = `${row.registeredPageCount ?? 0}/${row.pageCount ?? 0} 页`
    return row.pageRegisterDiagnostic ?? row.diagnostic ?? progress
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL) {
    const progress = `${row.registeredPageCount ?? 0}/${row.pageCount ?? 0} 页已落库`
    return row.diagnostic ?? progress
  }
  if (row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER) {
    return row.diagnostic ?? row.batchExternalNo ?? '—'
  }
  return row.diagnostic ?? '—'
}

function canForceReleaseTicket(row: ExceptionDashboardRow) {
  return (
    row.itemKind === ScannerExceptionItemKindCode.TICKET &&
    Boolean(row.ticketId) &&
    (row.ticketStatus === ScanDispatchTicketStatusCode.PROCESSING ||
      row.ticketStatus === ScanDispatchTicketStatusCode.SUSPENDED)
  )
}

function canCancelTicket(row: ExceptionDashboardRow) {
  return (
    row.itemKind === ScannerExceptionItemKindCode.TICKET &&
    Boolean(row.ticketId) &&
    row.ticketStatus === ScanDispatchTicketStatusCode.PENDING
  )
}

function openForceRelease(row: ExceptionDashboardRow) {
  if (!canForceReleaseTicket(row) || !row.ticketId) {
    return
  }
  forceReleaseTicket.value = { ticketId: row.ticketId }
  forceReleaseOpen.value = true
}

async function cancelTicket(row: ExceptionDashboardRow) {
  if (!canCancelTicket(row) || !row.ticketId) {
    return
  }
  await confirmAsync({
    title: '取消派单',
    content: '取消后工位将无法再 claim 该派单，确定继续？',
    type: 'warning',
    onOk: async () => {
      cancellingTicketId.value = row.ticketId
      try {
        await cancelScanDispatch({ ticketId: row.ticketId! })
        await reloadAll()
        emit('metrics-changed')
      } catch (error) {
        showUserError(error, '取消派单失败')
      } finally {
        cancellingTicketId.value = undefined
      }
    },
  })
}

function canRetryPageRegisterRow(row: ExceptionDashboardRow): boolean {
  if (row.itemKind !== ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) {
    return false
  }
  if (!row.scanBatchId || !row.examId) {
    return false
  }
  const state = row.pageRegisterState
  return (
    state === PageRegisterStateCode.BLOCKED_RECOVERABLE ||
    state === PageRegisterStateCode.PENDING ||
    state == null
  )
}

function buildExceptionRowActions(row: ExceptionDashboardRow): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (row.itemKind === ScannerExceptionItemKindCode.TICKET && row.ticketId) {
    actions.push({ key: 'view-dispatch', label: '查看派单', tone: 'primary' })
  }
  if (canRetryPageRegisterRow(row)) {
    actions.push({
      key: 'retry-register',
      label: '重试页登记',
      tone: 'primary',
      disabled: pageRegisterRetryingKey.value === row.rowKey,
    })
  }
  if (
    row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER ||
    row.itemKind === ScannerExceptionItemKindCode.COMMITTING ||
    row.itemKind === ScannerExceptionItemKindCode.MIXED_BATCH ||
    row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED ||
    row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL
  ) {
    actions.push({
      key: 'goto-handle',
      label: '前往处理',
      tone: canRetryPageRegisterRow(row) ? 'default' : 'primary',
    })
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL && row.scanBatchId && row.examId) {
    actions.push({
      key: 'ignore-partial-tail',
      label: '忽略并继续',
      tone: 'primary',
      disabled: partialTailDismissingKey.value === row.rowKey,
    })
    actions.push({ key: 'manual-merge', label: '人工合并', tone: 'default' })
  }
  actions.push({ key: 'logs', label: '操作日志' })
  if (canCancelTicket(row)) {
    actions.push({
      key: 'cancel',
      label: '取消派单',
      tone: 'danger',
      disabled: cancellingTicketId.value === row.ticketId,
    })
  }
  if (canForceReleaseTicket(row)) {
    actions.push({ key: 'force-release', label: '强制解锁', tone: 'danger' })
  }
  return actions
}

function handleExceptionRowAction(key: string, row: ExceptionDashboardRow): void {
  switch (key) {
    case 'view-dispatch':
    case 'goto-handle':
      openWorkOrderTarget(row)
      break
    case 'retry-register':
      void retryPageRegister(row)
      break
    case 'ignore-partial-tail':
      void dismissPartialTail(row)
      break
    case 'manual-merge':
      openWorkOrderTarget(row)
      break
    case 'logs':
      openOperationLogs(row)
      break
    case 'cancel':
      void cancelTicket(row)
      break
    case 'force-release':
      openForceRelease(row)
      break
  }
}

function openOperationLogs(row: ExceptionDashboardRow) {
  emit('open-log', {
    ticketId: row.ticketId,
    volumeId: row.volumeId ?? row.contextVolumeId,
  })
}

function navigateWorkOrderByTaskKind(row: ExceptionDashboardRow) {
  if (row.taskKind === 'EXAM_ARCHIVE' && row.contextVolumeId) {
    void router.push({
      name: 'TeacherArchiveVolumeDetail',
      params: { volumeId: row.contextVolumeId },
    })
    return
  }
  if (row.taskKind === 'EXAM_MARKING' && row.contextExamId) {
    void router.push({
      name: 'TeacherExamWorkspaceScanBatches',
      params: { examId: row.contextExamId },
    })
    return
  }
  if (row.taskKind === 'PORTFOLIO_COLLECT') {
    if (row.contextGapTaskId) {
      void router.push({ name: 'PortfolioTeacherGap', params: { taskId: row.contextGapTaskId } })
      return
    }
    void router.push({ path: '/portfolio/teacher/gap' })
  }
}

function openWorkOrderTarget(row: ExceptionDashboardRow) {
  if (row.itemKind === ScannerExceptionItemKindCode.TICKET && row.ticketId) {
    void router.push({ path: `/scanner-kiosk/dispatch/${row.ticketId}` })
    return
  }
  if (row.itemKind === ScannerExceptionItemKindCode.MIXED_BATCH && row.volumeId) {
    void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId: row.volumeId } })
    return
  }
  if (
    row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED &&
    row.contextExamId &&
    row.scanBatchId
  ) {
    void router.push({
      name: 'TeacherExamWorkspaceScanBatchDetail',
      params: { examId: row.contextExamId, scanBatchId: row.scanBatchId },
    })
    return
  }
  if (
    row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL &&
    row.contextExamId &&
    row.scanBatchId
  ) {
    void router.push({
      name: 'TeacherExamWorkspaceScanBatchDetail',
      params: { examId: row.contextExamId, scanBatchId: row.scanBatchId },
    })
    return
  }
  if (
    row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER ||
    row.itemKind === ScannerExceptionItemKindCode.COMMITTING
  ) {
    navigateWorkOrderByTaskKind(row)
  }
}

async function dismissPartialTail(row: ExceptionDashboardRow) {
  if (
    row.itemKind !== ScannerExceptionItemKindCode.PARTIAL_TAIL ||
    !row.scanBatchId ||
    !row.examId
  ) {
    return
  }
  await confirmAsync({
    title: '忽略并继续',
    content: '余页将保留在扫描页中，不创建试卷实例。确认后可继续封存批次。',
    type: 'warning',
    onOk: async () => {
      partialTailDismissingKey.value = row.rowKey
      try {
        await dismissScanBatchCollateAttention({
          examId: row.examId!,
          scanBatchId: row.scanBatchId!,
        })
        message.success('已忽略余页异常')
        await reloadAll()
        emit('metrics-changed')
      } catch (error) {
        message.error(error instanceof Error ? error.message : '忽略余页异常失败')
      } finally {
        partialTailDismissingKey.value = null
      }
    },
  })
}

async function retryPageRegister(row: ExceptionDashboardRow) {
  if (
    row.itemKind !== ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED ||
    !row.scanBatchId ||
    !row.examId
  ) {
    return
  }
  pageRegisterRetryingKey.value = row.rowKey
  try {
    const response = await retryScanBatchPageRegister({
      examId: row.examId,
      scanBatchId: row.scanBatchId,
    })
    if (response.pageRegisterBlocked) {
      message.warning(response.pageRegisterDiagnostic ?? '页登记仍被阻断')
    } else {
      message.success('页登记重试成功')
    }
    await reloadAll()
    emit('metrics-changed')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '页登记重试失败')
  } finally {
    pageRegisterRetryingKey.value = null
  }
}

function handlePageChange(pageEvent: { current: number; pageSize: number }) {
  pagination.current = pageEvent.current
  pagination.pageSize = pageEvent.pageSize
  void loadPage()
}

onMounted(() => {
  applyRouteKindFilter()
  void reloadAll()
})

watch(
  () => props.initialKind ?? route.query.kind,
  () => {
    applyRouteKindFilter()
    pagination.current = 1
    void loadPage()
  },
)
</script>

<template>
  <div class="scanner-exception-panel">
    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <div class="scanner-exception-panel__filters">
          <UiButton
            size="sm"
            :variant="itemKindFilter === undefined ? 'primary' : 'outline'"
            @click="filterByKind(undefined)"
          >
            全部
          </UiButton>
          <UiButton
            size="sm"
            :variant="
              itemKindFilter === ScannerExceptionItemKindCode.TICKET ? 'primary' : 'outline'
            "
            @click="filterByKind(ScannerExceptionItemKindCode.TICKET)"
          >
            派单
          </UiButton>
          <UiButton
            size="sm"
            :variant="
              itemKindFilter === ScannerExceptionItemKindCode.WORK_ORDER ? 'primary' : 'outline'
            "
            @click="filterByKind(ScannerExceptionItemKindCode.WORK_ORDER)"
          >
            工单
          </UiButton>
          <UiButton
            size="sm"
            :variant="
              itemKindFilter === ScannerExceptionItemKindCode.COMMITTING ? 'primary' : 'outline'
            "
            @click="filterByKind(ScannerExceptionItemKindCode.COMMITTING)"
          >
            合成中
          </UiButton>
          <UiButton
            size="sm"
            :variant="
              itemKindFilter === ScannerExceptionItemKindCode.MIXED_BATCH ? 'primary' : 'outline'
            "
            @click="filterByKind(ScannerExceptionItemKindCode.MIXED_BATCH)"
          >
            混扫
          </UiButton>
          <UiButton
            size="sm"
            :variant="
              itemKindFilter === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED
                ? 'primary'
                : 'outline'
            "
            @click="filterByKind(ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED)"
          >
            页登记阻断
          </UiButton>
          <UiButton
            size="sm"
            :variant="
              itemKindFilter === ScannerExceptionItemKindCode.PARTIAL_TAIL ? 'primary' : 'outline'
            "
            @click="filterByKind(ScannerExceptionItemKindCode.PARTIAL_TAIL)"
          >
            余页未切卷
          </UiButton>
        </div>
      </template>

      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pagination.total"
        row-key="rowKey"
        size="middle"
        flat
        empty-description="暂无异常记录"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'itemKind'">
            <UiTag tone="blue" size="sm">{{ itemKindLabel(record.itemKind) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'identifier'">
            <UiEllipsisText :text="rowIdentifier(record)" />
          </template>
          <template v-else-if="column.key === 'status'">
            {{ statusLabel(record) }}
          </template>
          <template v-else-if="column.key === 'detail'">
            <UiEllipsisText :text="rowDetail(record)" tone="secondary" />
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildExceptionRowActions(record)"
              split
              @action="(key) => handleExceptionRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <ScanDispatchForceReleaseDialog
      v-model:open="forceReleaseOpen"
      :ticket="forceReleaseTicket ? { ticketId: forceReleaseTicket.ticketId } : null"
      @released="
        () => {
          void reloadAll().then(() => emit('metrics-changed'))
        }
      "
    />
  </div>
</template>

<style scoped>
.scanner-exception-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}
</style>
