<script setup lang="ts">
import type { Key } from 'ant-design-vue/es/_util/type'
import type { SignalMetric } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadScannerCenterOverview } from '@/apis/mark/analysis-center'
import {
  ALL_SCAN_DISPATCH_TICKET_STATUS_CODES,
  ScanDispatchTicketStatusCode,
  ScanDispatchTicketStatusDescription,
} from '@/apis/mark/scanner-dispatch'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  DispatchQueueStatusFilterCode,
  DispatchQueueStatusFilterDescription,
} from '@/types/enums/dispatch-queue-status-filter-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import ScannerDispatchPanel from './ScannerDispatchPanel.vue'
import ScannerExceptionPanel from './ScannerExceptionPanel.vue'
import ScannerOperationLogPanel from './ScannerOperationLogPanel.vue'
import ScannerOpsPanel from './ScannerOpsPanel.vue'

defineOptions({ name: 'TeacherScannerCenter' })

type ScannerCenterTab = 'exception' | 'ops' | 'log' | 'dispatch'

interface DispatchRouteContext {
  dispatchFilter?: string
  dispatchStatus?: string
}

interface OpenLogPayload extends DispatchRouteContext {
  ticketId?: string
  volumeId?: string
}

function asQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

const route = useRoute()
const router = useRouter()
const overviewLoading = ref(false)
const overviewLoadFailed = ref(false)
const failedTicketCount = ref(0)
const failedWorkOrderCount = ref(0)
const mixedBatchCount = ref(0)
const pageRegisterBlockedCount = ref(0)
const pendingDispatchCount = ref(0)
const processingDispatchCount = ref(0)
const suspendedDispatchCount = ref(0)
const committingWorkOrderCount = ref(0)

const tabItems = [
  { key: 'exception', label: '异常看板' },
  { key: 'ops', label: '运营统计' },
  { key: 'log', label: '操作日志' },
  { key: 'dispatch', label: '派单调度' },
]

function parseTab(value: unknown): ScannerCenterTab {
  if (value === 'ops' || value === 'log' || value === 'dispatch') {
    return value
  }
  return 'exception'
}

const activeTab = computed<ScannerCenterTab>(() => parseTab(route.query.tab))

const dispatchRouteSnapshot = ref<DispatchRouteContext>({})
const exceptionKindSnapshot = ref<string | undefined>()

function readLogReturnDispatchContext(): DispatchRouteContext {
  if (route.query.tab !== 'log') {
    return {}
  }
  const returnFilter = asQueryString(route.query.returnDispatchFilter)
  const returnStatus = asQueryString(route.query.returnDispatchStatus)
  if (!returnFilter && !returnStatus) {
    return {}
  }
  return { dispatchFilter: returnFilter, dispatchStatus: returnStatus }
}

function readDispatchContextForRestore(): DispatchRouteContext {
  if (route.query.tab === 'dispatch') {
    return {
      dispatchFilter: asQueryString(route.query.dispatchFilter),
      dispatchStatus: asQueryString(route.query.dispatchStatus),
    }
  }
  const logReturn = readLogReturnDispatchContext()
  if (logReturn.dispatchFilter || logReturn.dispatchStatus) {
    return logReturn
  }
  return { ...dispatchRouteSnapshot.value }
}

function buildDispatchTabQuery(context: DispatchRouteContext): Record<string, string> {
  const query: Record<string, string> = { tab: 'dispatch' }
  if (context.dispatchFilter === DispatchQueueStatusFilterCode.FAILED) {
    query.dispatchFilter = DispatchQueueStatusFilterCode.FAILED
    return query
  }
  const dispatchStatus = ALL_SCAN_DISPATCH_TICKET_STATUS_CODES.find((code) => code === context.dispatchStatus)
  if (dispatchStatus) {
    query.dispatchStatus = dispatchStatus
  }
  return query
}

function buildLogTabQuery(
  payload: { ticketId?: string, volumeId?: string },
  dispatchContext: DispatchRouteContext,
): Record<string, string> {
  const query: Record<string, string> = { tab: 'log' }
  if (payload.ticketId) {
    query.ticketId = payload.ticketId
  }
  if (payload.volumeId) {
    query.volumeId = payload.volumeId
  }
  if (dispatchContext.dispatchFilter) {
    query.returnDispatchFilter = dispatchContext.dispatchFilter
  }
  else if (dispatchContext.dispatchStatus) {
    query.returnDispatchStatus = dispatchContext.dispatchStatus
  }
  return query
}

function resolveLogReturnDispatchLabel(context: DispatchRouteContext): string | undefined {
  if (context.dispatchFilter === DispatchQueueStatusFilterCode.FAILED) {
    return `派单调度 · ${strictEnumLabel(DispatchQueueStatusFilterDescription, DispatchQueueStatusFilterCode.FAILED, 'dispatchQueueStatusFilter')}`
  }
  const status = ALL_SCAN_DISPATCH_TICKET_STATUS_CODES.find((code) => code === context.dispatchStatus)
  if (status) {
    return `派单调度 · ${strictEnumLabel(ScanDispatchTicketStatusDescription, status, 'ticketStatus')}`
  }
  return undefined
}

watch(
  () => ({
    dispatchFilter: route.query.dispatchFilter,
    dispatchStatus: route.query.dispatchStatus,
    returnDispatchFilter: route.query.returnDispatchFilter,
    returnDispatchStatus: route.query.returnDispatchStatus,
    tab: route.query.tab,
    kind: route.query.kind,
  }),
  (scannerCenterQuery) => {
    if (scannerCenterQuery.tab === 'dispatch') {
      dispatchRouteSnapshot.value = {
        dispatchFilter: asQueryString(scannerCenterQuery.dispatchFilter),
        dispatchStatus: asQueryString(scannerCenterQuery.dispatchStatus),
      }
      return
    }
    if (scannerCenterQuery.tab === 'log') {
      const returnFilter = asQueryString(scannerCenterQuery.returnDispatchFilter)
      const returnStatus = asQueryString(scannerCenterQuery.returnDispatchStatus)
      if (returnFilter || returnStatus) {
        dispatchRouteSnapshot.value = { dispatchFilter: returnFilter, dispatchStatus: returnStatus }
      }
      return
    }
    if (scannerCenterQuery.tab === 'exception') {
      exceptionKindSnapshot.value = asQueryString(scannerCenterQuery.kind)
    }
  },
  { immediate: true },
)

function buildTabQuery(tab: ScannerCenterTab): Record<string, string> {
  const query: Record<string, string> = { tab }
  if (tab === 'exception') {
    const kind = route.query.tab === 'exception'
      ? asQueryString(route.query.kind)
      : exceptionKindSnapshot.value
    if (kind) {
      query.kind = kind
    }
    return query
  }
  if (tab === 'dispatch') {
    return buildDispatchTabQuery(readDispatchContextForRestore())
  }
  if (tab === 'log') {
    return buildLogTabQuery(
      {
        ticketId: asQueryString(route.query.ticketId),
        volumeId: asQueryString(route.query.volumeId),
      },
      readDispatchContextForRestore(),
    )
  }
  return query
}

const logTicketId = computed(() => {
  const value = route.query.ticketId
  return typeof value === 'string' ? value : undefined
})

const logVolumeId = computed(() => {
  const value = route.query.volumeId
  return typeof value === 'string' ? value : undefined
})

const exceptionKind = computed(() => {
  const value = route.query.kind
  return typeof value === 'string' ? value : undefined
})

const dispatchStatus = computed(() => {
  const value = route.query.dispatchStatus
  return typeof value === 'string' ? value : undefined
})

const dispatchFilter = computed(() => {
  const value = route.query.dispatchFilter
  return typeof value === 'string' ? value : undefined
})

const logReturnDispatchLabel = computed(() =>
  resolveLogReturnDispatchLabel(readLogReturnDispatchContext()),
)

const isDispatchFailedQueueActive = computed(
  () => activeTab.value === 'dispatch'
    && dispatchFilter.value === DispatchQueueStatusFilterCode.FAILED,
)

const headerSignalMetrics = computed<SignalMetric[]>(() => [
  {
    key: 'failed-ticket',
    label: '失败派单',
    value: String(failedTicketCount.value),
    tone: failedTicketCount.value > 0 ? 'red' : 'green',
    clickable: true,
    active: isDispatchFailedQueueActive.value,
    helper: failedTicketCount.value > 0 ? '打开失败队列' : undefined,
  },
  {
    key: 'failed-work-order',
    label: '失败工单',
    value: String(failedWorkOrderCount.value),
    tone: failedWorkOrderCount.value > 0 ? 'red' : 'green',
    clickable: true,
  },
  {
    key: 'mixed-batch',
    label: '疑似混扫',
    value: String(mixedBatchCount.value),
    tone: mixedBatchCount.value > 0 ? 'orange' : 'green',
    clickable: true,
  },
  {
    key: 'page-register-blocked',
    label: '页登记阻断',
    value: String(pageRegisterBlockedCount.value),
    tone: pageRegisterBlockedCount.value > 0 ? 'red' : 'green',
    clickable: true,
  },
  {
    key: 'committing-work-order',
    label: '合成中工单',
    value: String(committingWorkOrderCount.value),
    tone: committingWorkOrderCount.value > 0 ? 'orange' : 'green',
    clickable: true,
  },
  {
    key: 'pending-dispatch',
    label: '待处理派单',
    value: String(pendingDispatchCount.value),
    tone: pendingDispatchCount.value > 0 ? 'orange' : 'green',
    clickable: true,
  },
  {
    key: 'processing-dispatch',
    label: '处理中派单',
    value: String(processingDispatchCount.value),
    tone: processingDispatchCount.value > 0 ? 'blue' : 'green',
    clickable: true,
  },
  {
    key: 'suspended-dispatch',
    label: '挂起派单',
    value: String(suspendedDispatchCount.value),
    tone: suspendedDispatchCount.value > 0 ? 'orange' : 'green',
    clickable: true,
  },
])

async function loadOverview() {
  overviewLoading.value = true
  overviewLoadFailed.value = false
  try {
    const overview = await loadScannerCenterOverview()
    failedTicketCount.value = Number(overview.failedTicketCount ?? 0)
    failedWorkOrderCount.value = Number(overview.failedWorkOrderCount ?? 0)
    mixedBatchCount.value = Number(overview.mixedBatchCount ?? 0)
    pageRegisterBlockedCount.value = Number(overview.pageRegisterBlockedCount ?? 0)
    committingWorkOrderCount.value = Number(overview.committingWorkOrderCount ?? 0)
    pendingDispatchCount.value = Number(overview.pendingDispatchCount ?? 0)
    processingDispatchCount.value = Number(overview.processingDispatchCount ?? 0)
    suspendedDispatchCount.value = Number(overview.suspendedDispatchCount ?? 0)
  }
  catch (error) {
    failedTicketCount.value = 0
    failedWorkOrderCount.value = 0
    mixedBatchCount.value = 0
    pageRegisterBlockedCount.value = 0
    committingWorkOrderCount.value = 0
    pendingDispatchCount.value = 0
    processingDispatchCount.value = 0
    suspendedDispatchCount.value = 0
    overviewLoadFailed.value = true
    showUserError(error, '扫描中心概览加载失败')
  }
  finally {
    overviewLoading.value = false
  }
}

function handleTabChange(key: Key) {
  void router.replace({ query: buildTabQuery(parseTab(key)) })
}

function handleHeaderMetricClick(key: string) {
  if (key === 'failed-ticket') {
    void router.replace({
      query: {
        tab: 'dispatch',
        dispatchFilter: DispatchQueueStatusFilterCode.FAILED,
      },
    })
    return
  }
  const exceptionQueryByKey: Record<string, { tab: 'exception', kind: string }> = {
    'committing-work-order': { tab: 'exception', kind: 'COMMITTING' },
    'failed-work-order': { tab: 'exception', kind: 'WORK_ORDER' },
    'mixed-batch': { tab: 'exception', kind: 'MIXED_BATCH' },
    'page-register-blocked': { tab: 'exception', kind: 'PAGE_REGISTER_BLOCKED' },
  }
  const dispatchStatusByKey: Record<string, ScanDispatchTicketStatusCode> = {
    'pending-dispatch': ScanDispatchTicketStatusCode.PENDING,
    'processing-dispatch': ScanDispatchTicketStatusCode.PROCESSING,
    'suspended-dispatch': ScanDispatchTicketStatusCode.SUSPENDED,
  }
  const exceptionTarget = exceptionQueryByKey[key]
  if (exceptionTarget) {
    void router.replace({ query: exceptionTarget })
    return
  }
  const status = dispatchStatusByKey[key]
  if (status) {
    void router.replace({ query: buildDispatchTabQuery({ dispatchStatus: status }) })
  }
}

function resolveDispatchContextForOpenLog(payload: OpenLogPayload): DispatchRouteContext {
  if (payload.dispatchFilter || payload.dispatchStatus) {
    return {
      dispatchFilter: payload.dispatchFilter,
      dispatchStatus: payload.dispatchStatus,
    }
  }
  if (route.query.tab === 'dispatch') {
    return {
      dispatchFilter: asQueryString(route.query.dispatchFilter),
      dispatchStatus: asQueryString(route.query.dispatchStatus),
    }
  }
  return readDispatchContextForRestore()
}

function handleOpenLog(payload: OpenLogPayload) {
  const dispatchContext = resolveDispatchContextForOpenLog(payload)
  if (dispatchContext.dispatchFilter || dispatchContext.dispatchStatus) {
    dispatchRouteSnapshot.value = {
      dispatchFilter: dispatchContext.dispatchFilter,
      dispatchStatus: dispatchContext.dispatchStatus,
    }
  }
  void router.replace({
    query: buildLogTabQuery(
      { ticketId: payload.ticketId, volumeId: payload.volumeId },
      dispatchContext,
    ),
  })
}

watch(
  () => route.fullPath,
  () => {
    if (route.name === 'TeacherScannerCenter') {
      void loadOverview()
    }
  },
  { immediate: true },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="扫描中心"
        subtitle="异常处理、运营统计、操作日志与派单调度"
      />
    </template>

    <template #signal>
      <SignalBand variant="tiles" compact :metrics="headerSignalMetrics" @metric-click="handleHeaderMetricClick" />
    </template>

    <UiEmpty
      v-if="overviewLoadFailed"
      description="扫描中心概览加载失败"
      action-label="重试"
      @action="() => loadOverview()"
    />

    <WorkbenchSurfaceCard v-else flush>
      <template #head>
        <UiSectionTabs
          :model-value="activeTab"
          :items="tabItems"
          compact
          divided
          @update:model-value="handleTabChange"
        />
      </template>

      <ScannerExceptionPanel
        v-if="activeTab === 'exception'"
        :initial-kind="exceptionKind"
        @open-log="handleOpenLog"
        @metrics-changed="loadOverview"
      />
      <ScannerOpsPanel v-else-if="activeTab === 'ops'" />
      <ScannerOperationLogPanel
        v-else-if="activeTab === 'log'"
        :ticket-id="logTicketId"
        :volume-id="logVolumeId"
        :return-dispatch-label="logReturnDispatchLabel"
        @return-dispatch="() => void router.replace({ query: buildDispatchTabQuery(readDispatchContextForRestore()) })"
      />
      <ScannerDispatchPanel
        v-else-if="activeTab === 'dispatch'"
        :initial-status="dispatchStatus"
        :initial-dispatch-filter="dispatchFilter"
        @open-log="handleOpenLog"
        @metrics-changed="loadOverview"
      />
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>
