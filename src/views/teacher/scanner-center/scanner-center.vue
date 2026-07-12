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
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  DispatchQueueStatusFilterCode,
  DispatchQueueStatusFilterDescription,
} from '@/types/enums/dispatch-queue-status-filter-enum'
import { ScannerExceptionItemKindCode } from '@/types/enums/scanner-exception-item-kind-enum'
import {
  fetchArchiveSuspectedMixedPendingTotal,
} from '@/utils/archive-suspected-mixed-navigation'
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
const failedTicketCount = ref<number | null>(null)
const failedWorkOrderCount = ref<number | null>(null)
const archiveMixedPendingTotal = ref<number | null>(null)
const pageRegisterBlockedCount = ref<number | null>(null)
const partialTailPendingCount = ref<number | null>(null)
const pendingDispatchCount = ref<number | null>(null)
const processingDispatchCount = ref<number | null>(null)
const suspendedDispatchCount = ref<number | null>(null)
const committingWorkOrderCount = ref<number | null>(null)

const tabItems = [
  { key: 'exception', label: '异常处置' },
  { key: 'dispatch', label: '派单结案' },
  { key: 'ops', label: '运营体检' },
  { key: 'log', label: '处置日志' },
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
  const dispatchStatus = ALL_SCAN_DISPATCH_TICKET_STATUS_CODES.find(
    (code) => code === context.dispatchStatus,
  )
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
  } else if (dispatchContext.dispatchStatus) {
    query.returnDispatchStatus = dispatchContext.dispatchStatus
  }
  return query
}

function resolveLogReturnDispatchLabel(context: DispatchRouteContext): string | undefined {
  if (context.dispatchFilter === DispatchQueueStatusFilterCode.FAILED) {
    return `派单结案 · ${strictEnumLabel(DispatchQueueStatusFilterDescription, DispatchQueueStatusFilterCode.FAILED, 'dispatchQueueStatusFilter')}`
  }
  const status = ALL_SCAN_DISPATCH_TICKET_STATUS_CODES.find(
    (code) => code === context.dispatchStatus,
  )
  if (status) {
    return `派单结案 · ${strictEnumLabel(ScanDispatchTicketStatusDescription, status, 'ticketStatus')}`
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
    const kind
      = route.query.tab === 'exception'
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
  () =>
    activeTab.value === 'dispatch' && dispatchFilter.value === DispatchQueueStatusFilterCode.FAILED,
)

function isExceptionKindActive(kind: ScannerExceptionItemKindCode): boolean {
  return activeTab.value === 'exception' && exceptionKind.value === kind
}

function metricValue(count: number | null): string {
  return count == null ? '—' : String(count)
}

function metricTone(count: number | null, activeTone: SignalMetric['tone']): SignalMetric['tone'] {
  if (count == null) {
    return 'gray'
  }
  return count > 0 ? activeTone : 'green'
}

interface DutyMetric {
  key: string
  label: string
  count: number | null
  tone: SignalMetric['tone']
  active: boolean
  helper?: string
}

/** 共享值班台：固定完整待办看板，零值也展示，避免单卡拉伸留白。 */
const dutyBoardMetrics = computed<DutyMetric[]>(() => {
  const metrics: DutyMetric[] = [
    {
      key: 'page-register-blocked',
      label: '页登记阻断',
      count: pageRegisterBlockedCount.value,
      tone: metricTone(pageRegisterBlockedCount.value, 'red'),
      active: isExceptionKindActive(ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED),
      helper: '阻断续扫',
    },
    {
      key: 'failed-ticket',
      label: '失败派单',
      count: failedTicketCount.value,
      tone: metricTone(failedTicketCount.value, 'red'),
      active: isDispatchFailedQueueActive.value,
      helper: '失败队列',
    },
    {
      key: 'failed-work-order',
      label: '失败工单',
      count: failedWorkOrderCount.value,
      tone: metricTone(failedWorkOrderCount.value, 'red'),
      active: isExceptionKindActive(ScannerExceptionItemKindCode.WORK_ORDER),
      helper: '工单失败',
    },
    {
      key: 'partial-tail',
      label: '余页未切卷',
      count: partialTailPendingCount.value,
      tone: metricTone(partialTailPendingCount.value, 'orange'),
      active: isExceptionKindActive(ScannerExceptionItemKindCode.PARTIAL_TAIL),
      helper: '人工确认',
    },
    {
      key: 'committing-work-order',
      label: '合成中',
      count: committingWorkOrderCount.value,
      tone: metricTone(committingWorkOrderCount.value, 'orange'),
      active: isExceptionKindActive(ScannerExceptionItemKindCode.COMMITTING),
      helper: '合成进行中',
    },
    {
      key: 'pending-dispatch',
      label: '待处理派单',
      count: pendingDispatchCount.value,
      tone: metricTone(pendingDispatchCount.value, 'orange'),
      active:
        activeTab.value === 'dispatch'
        && dispatchStatus.value === ScanDispatchTicketStatusCode.PENDING
        && dispatchFilter.value !== DispatchQueueStatusFilterCode.FAILED,
      helper: '可领取',
    },
    {
      key: 'processing-dispatch',
      label: '处理中派单',
      count: processingDispatchCount.value,
      tone: metricTone(processingDispatchCount.value, 'blue'),
      active:
        activeTab.value === 'dispatch'
        && dispatchStatus.value === ScanDispatchTicketStatusCode.PROCESSING,
      helper: '工位占用中',
    },
    {
      key: 'suspended-dispatch',
      label: '挂起派单',
      count: suspendedDispatchCount.value,
      tone: metricTone(suspendedDispatchCount.value, 'orange'),
      active:
        activeTab.value === 'dispatch'
        && dispatchStatus.value === ScanDispatchTicketStatusCode.SUSPENDED,
      helper: '待恢复',
    },
  ]
  if (archiveMixedPendingTotal.value != null && archiveMixedPendingTotal.value > 0) {
    metrics.splice(1, 0, {
      key: 'mixed-batch',
      label: '混扫复核',
      count: archiveMixedPendingTotal.value,
      tone: 'orange',
      active: false,
      helper: '归档待办',
    })
  }
  return metrics
})

const backlogDutyMetrics = computed(() =>
  dutyBoardMetrics.value.filter((metric) => metric.count != null && metric.count > 0),
)

const headerSignalMetrics = computed<SignalMetric[]>(() =>
  dutyBoardMetrics.value.map((metric) => ({
    key: metric.key,
    label: metric.label,
    value: metricValue(metric.count),
    tone: metric.tone,
    clickable: true,
    active: metric.active,
    helper: metric.count != null && metric.count > 0 ? metric.helper : '正常',
  })),
)

const totalBacklogCount = computed(() =>
  backlogDutyMetrics.value.reduce((sum, metric) => sum + (metric.count ?? 0), 0),
)

const recommendedDutyAction = computed(() => {
  if (overviewLoading.value) {
    return null
  }
  if (overviewLoadFailed.value) {
    return {
      key: 'reload-overview',
      tone: 'error' as const,
      title: '值班概览未加载成功',
      description: '共享队列数字不可用，请先恢复概览后再分工处置。',
      actionLabel: '重新加载概览',
    }
  }
  const pageBlocked = pageRegisterBlockedCount.value ?? 0
  if (pageBlocked > 0) {
    return {
      key: 'page-register-blocked',
      tone: 'error' as const,
      title: `当前推荐：处理 ${pageBlocked} 条页登记阻断`,
      description: '全组可见同一队列；任一带队老师/协助人员均可点开结案。',
      actionLabel: '进入异常处置',
    }
  }
  const failedTickets = failedTicketCount.value ?? 0
  if (failedTickets > 0) {
    return {
      key: 'failed-ticket',
      tone: 'error' as const,
      title: `当前推荐：清理 ${failedTickets} 条失败派单`,
      description: '失败派单影响现场续扫，优先打开失败队列分工处理。',
      actionLabel: '打开失败派单',
    }
  }
  const failedOrders = failedWorkOrderCount.value ?? 0
  if (failedOrders > 0) {
    return {
      key: 'failed-work-order',
      tone: 'error' as const,
      title: `当前推荐：处理 ${failedOrders} 条失败工单`,
      description: '失败工单需回看批次与影像后分工处理。',
      actionLabel: '进入失败工单',
    }
  }
  const mixedPending = archiveMixedPendingTotal.value ?? 0
  if (mixedPending > 0) {
    return {
      key: 'mixed-batch',
      tone: 'warning' as const,
      title: `当前推荐：复核 ${mixedPending} 条混扫待办`,
      description: '混扫待办在归档复核链结案，全组共享同一待办池。',
      actionLabel: '打开混扫复核',
    }
  }
  const partialTail = partialTailPendingCount.value ?? 0
  if (partialTail > 0) {
    return {
      key: 'partial-tail',
      tone: 'warning' as const,
      title: `当前推荐：确认 ${partialTail} 条余页未切卷`,
      description: '切卷余页需教师确认忽略或人工合并，全组共享同一待办池。',
      actionLabel: '进入余页处置',
    }
  }
  const suspended = suspendedDispatchCount.value ?? 0
  if (suspended > 0) {
    return {
      key: 'suspended-dispatch',
      tone: 'warning' as const,
      title: `当前推荐：跟进 ${suspended} 条挂起派单`,
      description: '挂起派单通常对应设备/现场待确认，可转派或恢复处理。',
      actionLabel: '查看挂起派单',
    }
  }
  const pending = pendingDispatchCount.value ?? 0
  if (pending > 0) {
    return {
      key: 'pending-dispatch',
      tone: 'warning' as const,
      title: `当前推荐：领取 ${pending} 条待处理派单`,
      description: '待处理派单可供现场继续扫描或补扫。',
      actionLabel: '打开待处理派单',
    }
  }
  if (totalBacklogCount.value === 0 && !overviewLoading.value) {
    return {
      key: 'healthy',
      tone: 'success' as const,
      title: '当前无待处置积压',
      description: '可切换运营体检查看吞吐与混扫，或在处置日志回溯历史结案。',
      actionLabel: '查看运营体检',
    }
  }
  return null
})

const dutyContextSubtitle = computed(() => {
  if (overviewLoadFailed.value) {
    return '共享协作值班台 · 概览不可用 · 请刷新队列'
  }
  if (totalBacklogCount.value > 0) {
    const hot = backlogDutyMetrics.value
      .slice(0, 3)
      .map((metric) => `${metric.label} ${metric.count}`)
      .join(' · ')
    return `共享协作值班台 · 待处置 ${totalBacklogCount.value} 项 · ${hot}`
  }
  return '共享协作值班台 · 全组可见同一队列 · 当前无积压'
})

async function loadOverview() {
  overviewLoading.value = true
  overviewLoadFailed.value = false
  try {
    const overview = await loadScannerCenterOverview()
    failedTicketCount.value = overview.failedTicketCount ?? null
    failedWorkOrderCount.value = overview.failedWorkOrderCount ?? null
    pageRegisterBlockedCount.value = overview.pageRegisterBlockedCount ?? null
    committingWorkOrderCount.value = overview.committingWorkOrderCount ?? null
    partialTailPendingCount.value = overview.partialTailPendingCount ?? null
    pendingDispatchCount.value = overview.pendingDispatchCount ?? null
    processingDispatchCount.value = overview.processingDispatchCount ?? null
    suspendedDispatchCount.value = overview.suspendedDispatchCount ?? null
  } catch (error) {
    failedTicketCount.value = null
    failedWorkOrderCount.value = null
    pageRegisterBlockedCount.value = null
    committingWorkOrderCount.value = null
    partialTailPendingCount.value = null
    pendingDispatchCount.value = null
    processingDispatchCount.value = null
    suspendedDispatchCount.value = null
    archiveMixedPendingTotal.value = null
    overviewLoadFailed.value = true
    showUserError(error, '扫描值班台概览加载失败')
    return
  } finally {
    overviewLoading.value = false
  }
  try {
    const mixedPendingTotal = await fetchArchiveSuspectedMixedPendingTotal()
    archiveMixedPendingTotal.value = mixedPendingTotal > 0 ? mixedPendingTotal : null
  } catch (mixedError) {
    archiveMixedPendingTotal.value = null
    showUserError(mixedError, '混扫复核待办加载失败')
  }
}

function handleTabChange(key: Key) {
  void router.replace({ query: buildTabQuery(parseTab(key)) })
}

async function navigateMixedBatchScanReview(): Promise<void> {
  if ((archiveMixedPendingTotal.value ?? 0) <= 0) {
    return
  }
  void router.push({
    name: 'TeacherArchiveVolumeEvalCampaign',
    query: { tab: 'mixed-review' },
  })
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
  if (key === 'mixed-batch') {
    void navigateMixedBatchScanReview()
    return
  }
  const exceptionQueryByKey: Record<string, { tab: 'exception', kind: string }> = {
    'committing-work-order': { tab: 'exception', kind: 'COMMITTING' },
    'failed-work-order': { tab: 'exception', kind: 'WORK_ORDER' },
    'page-register-blocked': { tab: 'exception', kind: 'PAGE_REGISTER_BLOCKED' },
    'partial-tail': { tab: 'exception', kind: 'PARTIAL_TAIL' },
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

function handleRecommendedAction() {
  const action = recommendedDutyAction.value
  if (!action) {
    return
  }
  if (action.key === 'reload-overview') {
    void loadOverview()
    return
  }
  if (action.key === 'healthy') {
    void router.replace({ query: { tab: 'ops' } })
    return
  }
  handleHeaderMetricClick(action.key)
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
      <ContextBar layout="workbench" title="扫描值班台" :subtitle="dutyContextSubtitle">
        <template #actions>
          <UiButton
            size="sm"
            variant="outline"
            :loading="overviewLoading"
            @click="() => loadOverview()"
          >
            刷新队列
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <UiAlertStrip
        v-if="recommendedDutyAction"
        dense
        :tone="recommendedDutyAction.tone"
        :title="recommendedDutyAction.title"
        :description="recommendedDutyAction.description"
        class="scanner-center__recommend"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" @click="handleRecommendedAction">
            {{ recommendedDutyAction.actionLabel }}
          </UiButton>
        </template>
      </UiAlertStrip>
      <SignalBand
        v-if="headerSignalMetrics.length > 0 && !overviewLoadFailed"
        variant="panel"
        compact
        class="scanner-center__metrics"
        :metrics="headerSignalMetrics"
        @metric-click="handleHeaderMetricClick"
      />
    </template>

    <WorkbenchSurfaceCard flush class="scanner-center__surface">
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
        @return-dispatch="
          () =>
            void router.replace({ query: buildDispatchTabQuery(readDispatchContextForRestore()) })
        "
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

<style scoped>
.scanner-center__recommend {
  margin-bottom: 8px;
}

.scanner-center__surface {
  min-height: 0;
}
</style>
