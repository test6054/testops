<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ScannerExceptionDashboardItemVO } from '@/apis/mark/scanner-dispatch'
import {
  cancelScanDispatch,
  pageScannerExceptionDashboard,
  ScanDispatchTicketStatusCode,
  ScanDispatchTicketStatusDescription,
} from '@/apis/mark/scanner-dispatch'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dismissScanBatchCollateAttention, retryScanBatchPageRegister } from '@/apis/mark/exam-scan'
import { ScanWorkOrderStatusDescription } from '@/apis/mark/scanner-work-order'
import { resolveUiDataTableEmptyKind } from '@/components/ui-guide/ui/data-table'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEllipsisText from '@/components/ui-guide/ui/UiEllipsisText.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  PageRegisterStateCode,
  PageRegisterStateDescription,
} from '@/types/enums/page-register-state-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import {
  ScannerExceptionItemKindCode,
  ScannerExceptionItemKindDescription,
} from '@/types/enums/scanner-exception-item-kind-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import ScanDispatchForceReleaseDialog from '@/views/teacher/archive-volume/components/ScanDispatchForceReleaseDialog.vue'

defineOptions({ name: 'ScanExceptionPanel' })

const props = defineProps<{
  initialKind?: string
  taskKind?: ScanTaskKindCode
  examId?: string
}>()

const emit = defineEmits<{
  'open-log': [payload: { ticketId?: string; volumeId?: string }]
  'metrics-changed': []
}>()

type ExceptionDashboardRowKind = ScannerExceptionItemKindCode

interface ExceptionDashboardRow extends ScannerExceptionDashboardItemVO {
  rowKey: string
}

const EXAM_EXCEPTION_KINDS: readonly ScannerExceptionItemKindCode[] = [
  ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED,
  ScannerExceptionItemKindCode.PARTIAL_TAIL,
  ScannerExceptionItemKindCode.BINDING_CONFLICT,
]

const DISPATCH_EXCEPTION_KINDS: readonly ScannerExceptionItemKindCode[] = [
  ScannerExceptionItemKindCode.TICKET,
  ScannerExceptionItemKindCode.WORK_ORDER,
  ScannerExceptionItemKindCode.COMMITTING,
]

const isExamScope = computed(() => Boolean(props.examId?.trim()))

const availableKindFilters = computed(() =>
  isExamScope.value ? EXAM_EXCEPTION_KINDS : DISPATCH_EXCEPTION_KINDS,
)

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const loadPageError = ref(false)
const rows = ref<ExceptionDashboardRow[]>([])
const itemKindFilter = ref<ExceptionDashboardRowKind | undefined>(undefined)
const forceReleaseOpen = ref(false)
const forceReleaseTicket = ref<{ ticketId: string } | null>(null)
/** MVR-373：与 BE canForceReleaseTicket 同源；禁止对话框写死 true */
const forceReleaseAllowed = ref(false)

const cancellingTicketId = ref<string>()
const pageRegisterRetryingKey = ref<string | null>(null)
const partialTailDismissingKey = ref<string | null>(null)
const pagination = reactive({ current: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
let pageLoadGeneration = 0

const tableEmptyKind = computed(() =>
  resolveUiDataTableEmptyKind({
    hasError: loadPageError.value,
    hasActiveFilters: itemKindFilter.value != null,
    isFirstRun: itemKindFilter.value == null,
  }),
)

const tableEmptyDescription = computed(() => {
  if (loadPageError.value) {
    return ''
  }
  if (itemKindFilter.value === ScannerExceptionItemKindCode.BINDING_CONFLICT) {
    return '当前无身份绑定冲突；若刚完成扫描请刷新。有冲突时须手工确认绑定，不可当作“无问题”。'
  }
  if (itemKindFilter.value === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) {
    return '当前无页登记阻断；出现阻断时请重试页登记或进入批次处理。'
  }
  if (itemKindFilter.value === ScannerExceptionItemKindCode.PARTIAL_TAIL) {
    return '当前无余页待确认；余页须「忽略并继续」或人工合并后才能封存。'
  }
  if (itemKindFilter.value != null) {
    return `当前筛选下无「${itemKindLabel(itemKindFilter.value)}」异常`
  }
  return '当前无扫描异常待处置。异常出现后须按行完成重试、手工绑定或强制解锁，勿将空表理解为系统无风险。'
})

const columns: ColumnsType<ExceptionDashboardRow> = [
  { title: '类型', key: 'itemKind', dataIndex: 'itemKind', width: 100, fixed: 'left' },
  { title: '标识', key: 'identifier', dataIndex: 'identifier', width: 168, ellipsis: true },
  { title: '状态', key: 'status', dataIndex: 'status', width: 112 },
  {
    title: '页进度',
    key: 'pageProgress',
    width: 96,
    align: 'right',
  },
  {
    title: '说明',
    key: 'detail',
    dataIndex: 'detail',
    minWidth: 280,
    ellipsis: true,
    align: 'left',
    className: 'ui-data-table__col--text-left',
  },
  { title: '更新时间', key: 'updateTime', width: 156 },
  { title: '操作', key: 'actions', width: 360, fixed: 'right' },
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
  if (item.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) {
    return `page-register-${item.scanBatchId ?? ''}`
  }
  if (item.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL) {
    return `partial-tail-${item.scanBatchId ?? ''}`
  }
  if (item.itemKind === ScannerExceptionItemKindCode.BINDING_CONFLICT) {
    return `binding-${item.paperInstanceId ?? ''}`
  }
  return `exception-${item.workOrderId ?? item.ticketId ?? item.scanBatchId ?? ''}`
}

function toExceptionDashboardRow(item: ScannerExceptionDashboardItemVO): ExceptionDashboardRow {
  return { ...item, rowKey: buildRowKey(item) }
}

function resolveApiTaskKind(): ScanTaskKindCode | undefined {
  if (props.taskKind) {
    return props.taskKind
  }
  if (props.examId) {
    return ScanTaskKindCode.EXAM_MARKING
  }
  return undefined
}

async function loadPage() {
  beginLoad()
  const generation = ++pageLoadGeneration
  loading.value = true
  loadPageError.value = false
  try {
    const page = await pageScannerExceptionDashboard({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      itemKind: itemKindFilter.value,
      taskKind: resolveApiTaskKind(),
      examId: props.examId,
    })
    if (generation !== pageLoadGeneration) {
      return
    }
    pagination.total = Number(page.total ?? 0)
    rows.value = (page.list ?? []).map(toExceptionDashboardRow)

    okLoad()
  } catch (error) {
    failLoad()
    if (generation !== pageLoadGeneration) {
      return
    }
    loadPageError.value = true
    rows.value = []
    pagination.total = 0
    showUserError(error, '加载失败')
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
  const routeKind = route.query.kind
  const kind = props.initialKind ?? (typeof routeKind === 'string' ? routeKind : undefined)
  if (
    kind === ScannerExceptionItemKindCode.TICKET ||
    kind === ScannerExceptionItemKindCode.WORK_ORDER ||
    kind === ScannerExceptionItemKindCode.COMMITTING ||
    kind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED ||
    kind === ScannerExceptionItemKindCode.PARTIAL_TAIL ||
    kind === ScannerExceptionItemKindCode.BINDING_CONFLICT
  ) {
    if (availableKindFilters.value.includes(kind)) {
      itemKindFilter.value = kind
      return
    }
  }
  itemKindFilter.value = undefined
}

function itemKindLabel(kind: ExceptionDashboardRowKind) {
  return strictEnumLabel(ScannerExceptionItemKindDescription, kind, 'itemKind')
}

function itemKindTone(kind?: ExceptionDashboardRowKind): 'red' | 'orange' | 'blue' | 'gray' {
  if (
    kind === ScannerExceptionItemKindCode.TICKET ||
    kind === ScannerExceptionItemKindCode.WORK_ORDER ||
    kind === ScannerExceptionItemKindCode.BINDING_CONFLICT
  ) {
    return 'red'
  }
  if (
    kind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED ||
    kind === ScannerExceptionItemKindCode.PARTIAL_TAIL
  ) {
    return 'orange'
  }
  if (kind === ScannerExceptionItemKindCode.COMMITTING) {
    return 'blue'
  }
  return 'gray'
}

function pageProgressLabel(row: ExceptionDashboardRow): string {
  if (
    row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED ||
    row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL ||
    row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER ||
    row.itemKind === ScannerExceptionItemKindCode.COMMITTING
  ) {
    if (row.registeredPageCount == null && row.pageCount == null) {
      return '—'
    }
    return formatPageProgress(row.registeredPageCount, row.pageCount)
  }
  return '—'
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
  if (row.itemKind === ScannerExceptionItemKindCode.BINDING_CONFLICT) {
    return row.paperInstanceId ?? row.batchNo ?? '—'
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
  if (row.itemKind === ScannerExceptionItemKindCode.BINDING_CONFLICT) {
    return '身份绑定冲突'
  }
  return '—'
}

function formatPageProgress(registered?: number, total?: number): string {
  const registeredText = registered == null ? '—' : String(registered)
  const totalText = total == null ? '—' : String(total)
  return `${registeredText}/${totalText} 页`
}

function rowDetail(row: ExceptionDashboardRow) {
  if (row.itemKind === ScannerExceptionItemKindCode.TICKET) {
    return row.failureReason ?? row.traceLabelCode ?? '—'
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED) {
    const progress = formatPageProgress(row.registeredPageCount, row.pageCount)
    return row.pageRegisterDiagnostic ?? row.diagnostic ?? progress
  }
  if (row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL) {
    const progress = `${formatPageProgress(row.registeredPageCount, row.pageCount)}已落库`
    return row.diagnostic ?? progress
  }
  if (row.itemKind === ScannerExceptionItemKindCode.BINDING_CONFLICT) {
    return row.diagnostic ?? 'OCR 身份与名册冲突，需人工确认绑定'
  }
  if (row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER) {
    return row.diagnostic ?? row.batchExternalNo ?? '—'
  }
  return row.diagnostic ?? '—'
}

function canForceReleaseTicket(row: ExceptionDashboardRow) {
  // MVR-309：状态 + BE canForceReleaseTicket（归档 ARCHIVE_ADMIN / 档案袋 scanAllowed）
  return (
    row.itemKind === ScannerExceptionItemKindCode.TICKET &&
    Boolean(row.ticketId) &&
    (row.ticketStatus === ScanDispatchTicketStatusCode.PROCESSING ||
      row.ticketStatus === ScanDispatchTicketStatusCode.SUSPENDED) &&
    row.canForceReleaseTicket === true
  )
}

function canCancelTicket(row: ExceptionDashboardRow) {
  // MVR-309：状态 + BE canCancelTicket（归档 canManageMaterials / 档案袋 scanAllowed）
  return (
    row.itemKind === ScannerExceptionItemKindCode.TICKET &&
    Boolean(row.ticketId) &&
    row.ticketStatus === ScanDispatchTicketStatusCode.PENDING &&
    row.canCancelTicket === true
  )
}

function handleForceReleased(): void {
  forceReleaseAllowed.value = false
  void reloadAll().then(() => emit('metrics-changed'))
}

function openForceRelease(row: ExceptionDashboardRow) {
  if (!canForceReleaseTicket(row) || !row.ticketId) {
    forceReleaseAllowed.value = false
    return
  }
  // MVR-373：对话框二次闸须认 BE 行级 canForceReleaseTicket，禁止写死 true
  forceReleaseAllowed.value = row.canForceReleaseTicket === true
  forceReleaseTicket.value = { ticketId: row.ticketId }
  forceReleaseOpen.value = true
}

async function cancelTicket(row: ExceptionDashboardRow) {
  if (!canCancelTicket(row) || !row.ticketId) {
    return
  }
  if (cancellingTicketId.value) {
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
  // MVR-262：与 BE requireExamOwnerPermission 对齐，非主考不展示重试
  if (row.canManageOwnerExamWrites !== true) {
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
  // 行内仅 1 个 primary：绑定 > 重试页登记 > 前往处理/派单 > 忽略并继续
  const actions: UiTableRowActionItem[] = []
  if (row.itemKind === ScannerExceptionItemKindCode.TICKET && row.ticketId) {
    actions.push({ key: 'view-dispatch', label: '查看派单' })
  }
  if (canRetryPageRegisterRow(row)) {
    actions.push({
      key: 'retry-register',
      label: '重试页登记',
      disabled: pageRegisterRetryingKey.value === row.rowKey,
    })
  }
  if (row.itemKind === ScannerExceptionItemKindCode.BINDING_CONFLICT) {
    if (row.canManageOwnerExamWrites === true) {
      actions.push({ key: 'goto-handle', label: '手工绑定' })
    } else {
      actions.push({ key: 'goto-handle', label: '查看详情' })
    }
  } else if (
    row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER ||
    row.itemKind === ScannerExceptionItemKindCode.COMMITTING ||
    row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED ||
    row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL
  ) {
    actions.push({ key: 'goto-handle', label: '前往处理' })
  }
  if (
    row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL &&
    row.scanBatchId &&
    row.examId &&
    row.canManageOwnerExamWrites === true
  ) {
    actions.push({
      key: 'ignore-partial-tail',
      label: '忽略并继续',
      disabled: partialTailDismissingKey.value === row.rowKey,
    })
    actions.push({ key: 'manual-merge', label: '人工合并' })
  }
  actions.push({ key: 'logs', label: '处置日志' })
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
  const primaryKey = actions.some((item) => item.key === 'goto-handle' && item.label === '手工绑定')
    ? 'goto-handle'
    : actions.some((item) => item.key === 'retry-register')
      ? 'retry-register'
      : actions.some((item) => item.key === 'goto-handle')
        ? 'goto-handle'
        : actions.some((item) => item.key === 'view-dispatch')
          ? 'view-dispatch'
          : actions.some((item) => item.key === 'ignore-partial-tail')
            ? 'ignore-partial-tail'
            : undefined
  return actions.map((action) =>
    action.key === primaryKey && action.tone !== 'danger'
      ? { ...action, tone: 'primary' as const }
      : action,
  )
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

function navigateArchiveWorkOrder(row: ExceptionDashboardRow) {
  if (row.contextVolumeId) {
    void router.push({
      name: 'TeacherArchiveVolumeDetail',
      params: { volumeId: row.contextVolumeId },
    })
  }
}

function navigatePortfolioWorkOrder(row: ExceptionDashboardRow) {
  if (row.contextGapTaskId) {
    void router.push({ name: 'PortfolioTeacherGap', params: { taskId: row.contextGapTaskId } })
    return
  }
  void router.push({ path: '/portfolio/teacher/gap' })
}

function openWorkOrderTarget(row: ExceptionDashboardRow) {
  if (row.itemKind === ScannerExceptionItemKindCode.TICKET && row.ticketId) {
    void router.push({ path: `/scanner-kiosk/dispatch/${row.ticketId}` })
    return
  }
  const batchExamId = props.examId ?? row.contextExamId ?? row.examId
  if (
    row.itemKind === ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED &&
    batchExamId &&
    row.scanBatchId
  ) {
    void router.push({
      name: 'TeacherExamWorkspaceScanBatchDetail',
      params: { examId: batchExamId, scanBatchId: row.scanBatchId },
    })
    return
  }
  if (
    row.itemKind === ScannerExceptionItemKindCode.PARTIAL_TAIL &&
    batchExamId &&
    row.scanBatchId
  ) {
    void router.push({
      name: 'TeacherExamWorkspaceScanBatchDetail',
      params: { examId: batchExamId, scanBatchId: row.scanBatchId },
    })
    return
  }
  if (row.itemKind === ScannerExceptionItemKindCode.BINDING_CONFLICT && batchExamId) {
    void router.push({
      name: 'TeacherExamWorkspaceScanMonitor',
      params: { examId: batchExamId },
      query: row.paperInstanceId
        ? { attentionType: 'BINDING_CONFLICT', paperInstanceId: row.paperInstanceId }
        : { attentionType: 'BINDING_CONFLICT' },
    })
    return
  }
  if (
    row.itemKind === ScannerExceptionItemKindCode.WORK_ORDER ||
    row.itemKind === ScannerExceptionItemKindCode.COMMITTING
  ) {
    if (props.taskKind === ScanTaskKindCode.EXAM_ARCHIVE) {
      navigateArchiveWorkOrder(row)
      return
    }
    if (props.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT) {
      navigatePortfolioWorkOrder(row)
    }
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
  // MVR-307：与 canManageOwnerExamWrites / 行动作展示闸同源
  if (row.canManageOwnerExamWrites !== true) {
    void message.warning('仅本场主考可忽略余页异常')
    return
  }
  if (partialTailDismissingKey.value) {
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
        void message.success('已忽略余页异常')
        await reloadAll()
        emit('metrics-changed')
      } catch (error) {
        void message.error(error instanceof Error ? error.message : '忽略余页异常失败')
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
  // MVR-307：与 canRetryPageRegisterRow / canManageOwnerExamWrites 同源
  if (!canRetryPageRegisterRow(row)) {
    void message.warning('仅本场主考可重试页登记')
    return
  }
  if (pageRegisterRetryingKey.value) {
    return
  }
  pageRegisterRetryingKey.value = row.rowKey
  try {
    const response = await retryScanBatchPageRegister({
      examId: row.examId,
      scanBatchId: row.scanBatchId,
    })
    if (response.pageRegisterBlocked) {
      void message.warning(response.pageRegisterDiagnostic ?? '页登记仍被阻断')
    } else {
      void message.success('页登记重试成功')
    }
    await reloadAll()
    emit('metrics-changed')
  } catch (error) {
    void message.error(error instanceof Error ? error.message : '页登记重试失败')
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
  () => [props.initialKind, route.query.kind, props.taskKind, props.examId],
  () => {
    applyRouteKindFilter()
    pagination.current = 1
    void loadPage()
  },
)
</script>

<template>
  <div class="scan-exception-panel">
    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <div class="scan-exception-panel__filters">
          <UiButton
            size="sm"
            :variant="itemKindFilter === undefined ? 'primary' : 'outline'"
            @click="filterByKind(undefined)"
          >
            全部
          </UiButton>
          <UiButton
            v-for="kind in availableKindFilters"
            :key="kind"
            size="sm"
            :variant="itemKindFilter === kind ? 'primary' : 'outline'"
            @click="filterByKind(kind)"
          >
            {{ itemKindLabel(kind) }}
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
        :load-error="loadError"
        :total="pagination.total"
        row-key="rowKey"
        size="middle"
        flat
        zebra
        sticky-header
        :empty-kind="tableEmptyKind"
        :empty-description="tableEmptyDescription"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'itemKind'">
            <UiTag :tone="itemKindTone(record.itemKind)" size="sm">
              {{ itemKindLabel(record.itemKind) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'identifier'">
            <UiEllipsisText :text="rowIdentifier(record)" />
          </template>
          <template v-else-if="column.key === 'status'">
            {{ statusLabel(record) }}
          </template>
          <template v-else-if="column.key === 'pageProgress'">
            {{ pageProgressLabel(record) }}
          </template>
          <template v-else-if="column.key === 'detail'">
            <UiEllipsisText :text="rowDetail(record)" tone="secondary" />
          </template>
          <template v-else-if="column.key === 'updateTime'">
            {{ record.updateTime ? formatDateTime(record.updateTime) : '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildExceptionRowActions(record)"
              :max-visible="8"
              split
              @action="(key) => handleExceptionRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <ScanDispatchForceReleaseDialog
      v-model:open="forceReleaseOpen"
      :can-force-release="forceReleaseAllowed"
      :ticket="forceReleaseTicket ? { ticketId: forceReleaseTicket.ticketId } : null"
      @released="handleForceReleased"
    />
  </div>
</template>

<style scoped>
.scan-exception-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}
</style>
