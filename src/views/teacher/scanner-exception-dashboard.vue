<script setup lang="ts">
import type {
  FailedTicketItemVO,
  FailedWorkOrderItemVO,
  PageRegisterBlockedBatchItemVO,
  ScannerExceptionDashboardVO,
  SuspectedMixedBatchItemVO,
} from '@/apis/mark/scanner-dispatch'
import type { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { retryScanBatchPageRegister } from '@/apis/mark/exam-scan'
import {
  loadScannerExceptionDashboard,
  SCAN_BATCH_QUALITY_FLAG_LABEL,
  SCAN_DISPATCH_TICKET_STATUS_LABEL,
} from '@/apis/mark/scanner-dispatch'
import { SCAN_WORK_ORDER_STATUS_LABEL } from '@/apis/mark/scanner-work-order'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiLoadFailure from '@/components/ui-guide/ui/UiLoadFailure.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePageLoadFailure } from '@/composables/usePageLoadFailure'
import { strictEnumLabel } from '@/utils/strict-enum'
import ScanDispatchForceReleaseDialog from '@/views/teacher/archive-volume/components/ScanDispatchForceReleaseDialog.vue'

defineOptions({ name: 'ScannerExceptionDashboard' })

type ExceptionDashboardRowKind = 'TICKET' | 'WORK_ORDER' | 'MIXED_BATCH' | 'PAGE_REGISTER_BLOCKED'

interface ExceptionDashboardRow {
  rowKey: string
  itemKind: ExceptionDashboardRowKind
  ticketId?: string
  workOrderId?: string
  volumeId?: string
  scanBatchId?: string
  examId?: string
  batchExternalNo?: string
  batchNo?: string
  status?: string
  traceLabelCode?: string
  failureReason?: string
  diagnostic?: string
  batchQualityFlag?: keyof typeof SCAN_BATCH_QUALITY_FLAG_LABEL
  taskKind?: ScanTaskKindCode
  contextExamId?: string
  contextVolumeId?: string
  contextCollectMode?: string
  contextTeacherId?: string
  contextGapTaskId?: string
  pageRegisterDiagnostic?: string
  registeredPageCount?: number
  pageCount?: number
}

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const { loadError, captureLoadFailure, clearLoadFailure } = usePageLoadFailure()
const dashboard = ref<ScannerExceptionDashboardVO | null>(null)
const itemKindFilter = ref<ExceptionDashboardRowKind | undefined>(undefined)
const forceReleaseOpen = ref(false)
const forceReleaseTicket = ref<{ ticketId: string } | null>(null)
const pageRegisterRetryingKey = ref<string | null>(null)

const columns = [
  { title: '类型', key: 'itemKind', dataIndex: 'itemKind', width: 96 },
  { title: '标识', key: 'identifier', dataIndex: 'identifier', width: 140 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 120 },
  { title: '说明', key: 'detail', dataIndex: 'detail', ellipsis: true },
  { title: '操作', key: 'actions', width: 200 },
]

function buildTicketRows(items: FailedTicketItemVO[]): ExceptionDashboardRow[] {
  return items.map((item) => ({
    rowKey: `ticket-${item.ticketId ?? ''}`,
    itemKind: 'TICKET',
    ticketId: item.ticketId,
    status: item.status,
    traceLabelCode: item.traceLabelCode,
    failureReason: item.failureReason,
  }))
}

function buildWorkOrderRows(items: FailedWorkOrderItemVO[]): ExceptionDashboardRow[] {
  return items.map((item) => ({
    rowKey: `work-order-${item.workOrderId ?? ''}`,
    itemKind: 'WORK_ORDER',
    workOrderId: item.workOrderId,
    status: item.status,
    batchExternalNo: item.batchExternalNo,
    diagnostic: item.diagnostic,
    taskKind: item.taskKind,
    contextExamId: item.contextExamId,
    contextVolumeId: item.contextVolumeId,
    contextCollectMode: item.contextCollectMode,
    contextTeacherId: item.contextTeacherId,
    contextGapTaskId: item.contextGapTaskId,
  }))
}

function buildMixedBatchRows(items: SuspectedMixedBatchItemVO[]): ExceptionDashboardRow[] {
  return items.map((item) => ({
    rowKey: `mixed-${item.workOrderId ?? ''}-${item.volumeId ?? ''}`,
    itemKind: 'MIXED_BATCH',
    workOrderId: item.workOrderId,
    volumeId: item.volumeId,
    batchQualityFlag: item.batchQualityFlag,
    diagnostic: item.diagnostic,
  }))
}

function buildPageRegisterBlockedRows(items: PageRegisterBlockedBatchItemVO[]): ExceptionDashboardRow[] {
  return items.map((item) => ({
    rowKey: `page-register-${item.scanBatchId ?? ''}`,
    itemKind: 'PAGE_REGISTER_BLOCKED',
    scanBatchId: item.scanBatchId,
    examId: item.examId,
    workOrderId: item.workOrderId,
    batchExternalNo: item.batchExternalNo ?? item.workOrderBatchExternalNo,
    batchNo: item.batchNo,
    status: 'BLOCKED',
    diagnostic: item.batchDiagnostic,
    pageRegisterDiagnostic: item.pageRegisterDiagnostic,
    registeredPageCount: item.registeredPageCount,
    pageCount: item.pageCount,
    taskKind: item.taskKind,
    contextExamId: item.examId,
  }))
}

const allRows = computed<ExceptionDashboardRow[]>(() => {
  const data = dashboard.value
  if (!data) {
    return []
  }
  return [
    ...buildTicketRows(data.failedTickets ?? []),
    ...buildWorkOrderRows(data.failedWorkOrders ?? []),
    ...buildMixedBatchRows(data.suspectedMixedBatches ?? []),
    ...buildPageRegisterBlockedRows(data.pageRegisterBlockedBatches ?? []),
  ]
})

const filteredRows = computed(() => {
  if (!itemKindFilter.value) {
    return allRows.value
  }
  return allRows.value.filter(row => row.itemKind === itemKindFilter.value)
})

const signalMetrics = computed<SignalMetric[]>(() => {
  const data = dashboard.value
  if (!data) {
    return []
  }
  const failedTicketCount = data.failedTickets?.length ?? 0
  const failedWorkOrderCount = data.failedWorkOrders?.length ?? 0
  const suspectedMixedBatchCount = data.suspectedMixedBatches?.length ?? 0
  const pageRegisterBlockedCount = data.pageRegisterBlockedBatches?.length ?? 0
  return [
    {
      key: 'failed-ticket',
      label: '失败派单',
      value: String(failedTicketCount),
      tone: failedTicketCount > 0 ? 'red' : 'green',
    },
    {
      key: 'failed-work-order',
      label: '失败工单',
      value: String(failedWorkOrderCount),
      tone: failedWorkOrderCount > 0 ? 'red' : 'green',
    },
    {
      key: 'mixed-batch',
      label: '疑似混扫',
      value: String(suspectedMixedBatchCount),
      tone: suspectedMixedBatchCount > 0 ? 'orange' : 'green',
    },
    {
      key: 'page-register-blocked',
      label: '页登记阻断',
      value: String(pageRegisterBlockedCount),
      tone: pageRegisterBlockedCount > 0 ? 'red' : 'green',
    },
  ]
})

async function loadDashboard() {
  loading.value = true
  clearLoadFailure()
  try {
    dashboard.value = await loadScannerExceptionDashboard()
  }
  catch (error) {
    dashboard.value = null
    captureLoadFailure(error, '扫描异常看板加载失败')
  }
  finally {
    loading.value = false
  }
}

function filterByKind(kind?: ExceptionDashboardRowKind) {
  itemKindFilter.value = kind
}

function applyRouteKindFilter() {
  const kind = route.query.kind
  if (kind === 'TICKET' || kind === 'WORK_ORDER' || kind === 'MIXED_BATCH' || kind === 'PAGE_REGISTER_BLOCKED') {
    itemKindFilter.value = kind
  }
}

function itemKindLabel(kind: ExceptionDashboardRowKind) {
  if (kind === 'TICKET') return '派单'
  if (kind === 'WORK_ORDER') return '工单'
  if (kind === 'PAGE_REGISTER_BLOCKED') return '页登记阻断'
  return '混扫批次'
}

function rowIdentifier(row: ExceptionDashboardRow) {
  if (row.itemKind === 'TICKET') {
    return row.ticketId ?? row.traceLabelCode ?? '—'
  }
  if (row.itemKind === 'WORK_ORDER') {
    return row.workOrderId ?? row.batchExternalNo ?? '—'
  }
  if (row.itemKind === 'PAGE_REGISTER_BLOCKED') {
    return row.batchNo ?? row.batchExternalNo ?? row.scanBatchId ?? '—'
  }
  return row.volumeId ?? row.workOrderId ?? '—'
}

function statusLabel(row: ExceptionDashboardRow) {
  if (row.itemKind === 'WORK_ORDER' && row.status) {
    return strictEnumLabel(
      SCAN_WORK_ORDER_STATUS_LABEL,
      row.status as keyof typeof SCAN_WORK_ORDER_STATUS_LABEL,
      'workOrderStatus',
    )
  }
  if (row.itemKind === 'TICKET' && row.status) {
    return strictEnumLabel(
      SCAN_DISPATCH_TICKET_STATUS_LABEL,
      row.status as keyof typeof SCAN_DISPATCH_TICKET_STATUS_LABEL,
      'ticketStatus',
    )
  }
  if (row.itemKind === 'MIXED_BATCH' && row.batchQualityFlag) {
    return strictEnumLabel(
      SCAN_BATCH_QUALITY_FLAG_LABEL,
      row.batchQualityFlag,
      'batchQualityFlag',
    )
  }
  if (row.itemKind === 'PAGE_REGISTER_BLOCKED') {
    return '页登记阻断'
  }
  return '—'
}

function rowDetail(row: ExceptionDashboardRow) {
  if (row.itemKind === 'TICKET') {
    return row.failureReason ?? row.traceLabelCode ?? '—'
  }
  if (row.itemKind === 'PAGE_REGISTER_BLOCKED') {
    const progress = `${row.registeredPageCount ?? 0}/${row.pageCount ?? 0} 页`
    return row.pageRegisterDiagnostic ?? row.diagnostic ?? progress
  }
  if (row.itemKind === 'WORK_ORDER') {
    return row.diagnostic ?? row.batchExternalNo ?? '—'
  }
  return row.diagnostic ?? '—'
}

function openForceRelease(row: ExceptionDashboardRow) {
  if (!row.ticketId) {
    return
  }
  forceReleaseTicket.value = { ticketId: row.ticketId }
  forceReleaseOpen.value = true
}

function openOperationLogs(row: ExceptionDashboardRow) {
  void router.push({
    name: 'TeacherScannerOperationLogs',
    query: {
      ticketId: row.ticketId,
      volumeId: row.volumeId ?? row.contextVolumeId,
    },
  })
}

function openWorkOrderTarget(row: ExceptionDashboardRow) {
  if (row.itemKind === 'TICKET' && row.ticketId) {
    void router.push({ path: `/scanner-kiosk/dispatch/${row.ticketId}` })
    return
  }
  if (row.itemKind === 'MIXED_BATCH' && row.volumeId) {
    void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId: row.volumeId } })
    return
  }
  if (row.itemKind === 'PAGE_REGISTER_BLOCKED' && row.contextExamId) {
    void router.push({
      name: 'TeacherExamWorkspaceScanBatches',
      params: { examId: row.contextExamId },
      query: row.scanBatchId ? { scanBatchId: row.scanBatchId } : undefined,
    })
    return
  }
  if (row.itemKind !== 'WORK_ORDER') {
    return
  }
  if (row.taskKind === 'EXAM_ARCHIVE' && row.contextVolumeId) {
    void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId: row.contextVolumeId } })
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

async function retryPageRegister(row: ExceptionDashboardRow) {
  if (row.itemKind !== 'PAGE_REGISTER_BLOCKED' || !row.scanBatchId || !row.examId) {
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
    }
    else {
      message.success('页登记重试成功')
    }
    await loadDashboard()
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '页登记重试失败')
  }
  finally {
    pageRegisterRetryingKey.value = null
  }
}

onMounted(() => {
  applyRouteKindFilter()
  void loadDashboard()
})

watch(
  () => route.query.kind,
  () => applyRouteKindFilter(),
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        title="扫描异常看板"
        subtitle="汇总失败派单、失败工单、疑似混扫与页登记阻断批次"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" :loading="loading" @click="() => loadDashboard()">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="!loadError && signalMetrics.length" #signal>
      <SignalBand :metrics="signalMetrics" variant="panel" />
    </template>

    <UiLoadFailure
      v-if="loadError"
      title="扫描异常看板加载失败"
      :description="loadError"
    />

    <template v-else>
      <div class="scanner-exception-dashboard__filters">
        <UiButton size="sm" :variant="itemKindFilter === undefined ? 'primary' : 'outline'" @click="filterByKind(undefined)">
          全部
        </UiButton>
        <UiButton size="sm" :variant="itemKindFilter === 'TICKET' ? 'primary' : 'outline'" @click="filterByKind('TICKET')">
          派单
        </UiButton>
        <UiButton size="sm" :variant="itemKindFilter === 'WORK_ORDER' ? 'primary' : 'outline'" @click="filterByKind('WORK_ORDER')">
          工单
        </UiButton>
        <UiButton size="sm" :variant="itemKindFilter === 'MIXED_BATCH' ? 'primary' : 'outline'" @click="filterByKind('MIXED_BATCH')">
          混扫
        </UiButton>
        <UiButton size="sm" :variant="itemKindFilter === 'PAGE_REGISTER_BLOCKED' ? 'primary' : 'outline'" @click="filterByKind('PAGE_REGISTER_BLOCKED')">
          页登记阻断
        </UiButton>
      </div>

      <UiDataTable
        pagination-mode="none"
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :show-pagination="false"
        row-key="rowKey"
        size="middle"
        flat
        empty-description="暂无异常记录"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'itemKind'">
            <UiTag tone="blue" size="sm">{{ itemKindLabel(record.itemKind) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'identifier'">
            {{ rowIdentifier(record) }}
          </template>
          <template v-else-if="column.key === 'status'">
            {{ statusLabel(record) }}
          </template>
          <template v-else-if="column.key === 'detail'">
            {{ rowDetail(record) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="scanner-exception-dashboard__actions">
              <UiTextAction
                v-if="record.itemKind === 'TICKET' && record.ticketId"
                tone="primary"
                @click="openWorkOrderTarget(record)"
              >
                查看派单
              </UiTextAction>
              <UiTextAction
                v-if="record.itemKind === 'WORK_ORDER' || record.itemKind === 'MIXED_BATCH' || record.itemKind === 'PAGE_REGISTER_BLOCKED'"
                tone="primary"
                @click="openWorkOrderTarget(record)"
              >
                前往处理
              </UiTextAction>
              <UiTextAction
                v-if="record.itemKind === 'PAGE_REGISTER_BLOCKED' && record.scanBatchId && record.examId"
                tone="primary"
                :disabled="pageRegisterRetryingKey === record.rowKey"
                @click="retryPageRegister(record)"
              >
                重试页登记
              </UiTextAction>
              <UiTextAction @click="openOperationLogs(record)">
                操作日志
              </UiTextAction>
              <UiTextAction
                v-if="record.itemKind === 'TICKET' && record.ticketId"
                tone="danger"
                @click="openForceRelease(record)"
              >
                强制解锁
              </UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>

      <ScanDispatchForceReleaseDialog
        v-model:open="forceReleaseOpen"
        :ticket="forceReleaseTicket ? { ticketId: forceReleaseTicket.ticketId } : null"
        @released="loadDashboard"
      />
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.scanner-exception-dashboard__filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.scanner-exception-dashboard__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
