<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="scanBatchContextSubtitle"
      >
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand
        v-if="selectedExamId"
        variant="tiles"
        compact
        :metrics="summaryMetrics"
        @metric-click="handleMetricClick"
      />
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择考试" class="scan-batch-workbench__empty" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="scanAttentionAlertVisible"
        tone="warning"
        :closable="false"
        dense
        title="存在待处置扫描异常"
        :description="scanAttentionAlertDescription"
        class="scan-batch-workbench__attention-alert"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" @click="goScanMonitorAbnormal">
            前往异常队列
          </UiButton>
        </template>
      </UiAlertStrip>

      <ScanOrphanRecoveryAlert
        ref="orphanAlertRef"
        :exam-id="selectedExamId"
        :orphan-pending-event-count="summary?.orphanPendingEventCount ?? 0"
        :orphan-pending-page-count="summary?.orphanPendingPageCount ?? 0"
        class="scan-batch-workbench__orphan-alert"
        @recovered="handleOrphanRecovered"
      />

      <WorkbenchSurfaceCard flush>
        <template #head>
          <UiSectionTabs
            v-model="statusTab"
            :items="statusTabItems"
            compact
            divided
            @update:model-value="handleStatusTabChange"
          />
        </template>

        <template #toolbar>
          <UiFilterBar
            variant="plain"
            :model-value="filterForm"
            :fields="filterFields"
            show-labels
            search-text="查询"
            actions-align="end"
            @update:model-value="syncFilterForm"
            @search="handleSearch"
            @reset="handleReset"
          >
            <template #field-scanWindow>
              <a-range-picker
                v-model:value="filterForm.scanWindow"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
                :placeholder="['扫描开始', '扫描结束']"
                allow-clear
              />
            </template>
          </UiFilterBar>
        </template>

        <UiDataTable
          v-model:current="batchQuery.pageNum"
          v-model:page-size="batchQuery.pageSize"
          :columns="batchColumns"
          :data-source="batches"
          :loading="batchLoading"
          :total="batchTotal"
          :scroll="{ x: 1320 }"
          :custom-row="batchTableCustomRow"
          row-key="scanBatchId"
          size="small"
          flat
          empty-kind="first-run"
          @page-change="onBatchPageChange"
        >
          <template #empty>
            <UiEmpty
              v-if="batchListLoadFailed"
              description="扫描批次列表加载失败"
              action-label="重试"
              @action="() => loadBatches()"
            />
            <UiEmpty v-else description="暂无扫描批次">
              <p class="scan-batch-workbench__empty-guide">
                扫描批次由扫描一体机或扫描终端自动创建。请先在
                <UiTextAction @click="goScannerKiosk">扫描一体机</UiTextAction>
                登录本考试并完成扫描，或在
                <UiTextAction @click="goScanDevices">扫描设备</UiTextAction>
                绑定 Agent 后通过
                <UiTextAction @click="goScanMonitor">扫描监控</UiTextAction>
                查看实时进度。
              </p>
            </UiEmpty>
          </template>

          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'batchNo'">
              <a-typography-text strong :content="record.batchNo" />
              <div v-if="record.batchExternalNo" class="muted">{{ record.batchExternalNo }}</div>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="batchStatusTone(record)" size="sm">
                {{ batchStatusLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'scannerDevice'">
              {{ formatDeviceLabel(record.scannerDeviceId) }}
            </template>
            <template v-else-if="column.key === 'scanWindow'">
              <div>{{ formatDateTimeWithSeconds(record.scanStartTime) }}</div>
              <div class="muted">至 {{ formatDateTimeWithSeconds(record.scanEndTime) }}</div>
            </template>
            <template v-else-if="column.key === 'pageProgress'">
              <span :class="{ 'scan-batch-workbench__warn': (record.pendingUploadCount ?? 0) > 0 }">
                {{ record.receivedPageCount ?? 0 }} / {{ record.pageCount }}
              </span>
            </template>
            <template v-else-if="column.key === 'attentionCount'">
              <UiTag v-if="(record.attentionItemCount ?? 0) > 0" tone="orange" size="sm">
                {{ record.attentionItemCount }} 项
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
            <template v-else-if="column.key === 'orderAudit'">
              <UiTag v-if="record.orderAuditPassed === false" tone="red" size="sm">
                {{ record.orderAuditIssueCount ?? 0 }} 项异常
              </UiTag>
              <UiTag v-else-if="record.orderAuditPassed === true" tone="green" size="sm">通过</UiTag>
              <span v-else class="muted">待审计</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click.stop="openBatchDetail(record)">详情</UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>

    <ScanBatchDetailDrawer
      v-model:open="detailDrawerOpen"
      :exam-id="selectedExamId || ''"
      :scan-batch-id="detailBatchId"
      :batch-summary="detailBatchSummary"
      @updated="handleDetailUpdated"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamScannerDeviceVO } from '@/apis/mark/exam-mark-scanner'
import type { MarkingProgressVO } from '@/apis/mark/exam-progress'
import type {
  ExamScannerBatchQueryRequest,
  ExamScannerBatchVO,
  ExamScannerBatchWorkbenchSummaryVO,
} from '@/apis/mark/exam-scan'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listActiveScannerDevices } from '@/apis/mark/exam-mark-scanner'
import { getMarkingProgress } from '@/apis/mark/exam-progress'
import {
  getScannerBatchWorkbenchSummary,
  pageScannerBatches,
  SCAN_BATCH_STATUS_TONE,
  ScanBatchStatusCode,
  ScanBatchStatusDescription,
} from '@/apis/mark/exam-scan'
import ScanBatchDetailDrawer from '@/components/mark/ScanBatchDetailDrawer.vue'
import ScanOrphanRecoveryAlert from '@/components/mark/ScanOrphanRecoveryAlert.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import mittBus from '@/utils/mitt'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScanBatchWorkbench' })

type StatusTabKey = 'ALL' | ScanBatchStatusCode

const route = useRoute()
const router = useRouter()
const { selectedExamId } = useMarkExamContext()
const {
  contextBarTitle,
  contextBarSubtitle,
  examStatusLabel,
  examStatusTone,
} = useExamJourneyContextBar('扫描批次')

const scanBatchContextSubtitle = computed(() => {
  const journeySubtitle = contextBarSubtitle.value
  if (journeySubtitle.includes('/api/')) {
    return '扫描批次 · 批次汇总与异常处置'
  }
  return journeySubtitle
})
const { refreshSnapshot } = useWorkspaceExamId()

const summary = ref<ExamScannerBatchWorkbenchSummaryVO | null>(null)
const summaryLoadFailed = ref(false)
const batchListLoadFailed = ref(false)
const markingProgress = ref<MarkingProgressVO | null>(null)
const orphanAlertRef = ref<InstanceType<typeof ScanOrphanRecoveryAlert> | null>(null)

const scanAttentionAlertVisible = computed(() => (summary.value?.attentionCount ?? 0) > 0)

const scanAttentionAlertDescription = computed(() => {
  const count = summary.value?.attentionCount ?? 0
  return `当前考试有 ${count} 项扫描异常待处置，请在扫描监控异常队列中逐项处理。`
})

const batches = ref<ExamScannerBatchVO[]>([])
const batchTotal = ref(0)
const batchLoading = ref(false)
const batchQuery = reactive<{ pageNum: number, pageSize: number }>({
  pageNum: 1,
  pageSize: 10,
})

const devices = ref<ExamScannerDeviceVO[]>([])
const statusTab = ref<StatusTabKey>('ALL')

interface ScanBatchWorkbenchFilterForm {
  keyword: string
  scannerDeviceId: string | undefined
  scanWindow: [string, string] | undefined
}

const filterForm = reactive<ScanBatchWorkbenchFilterForm>({
  keyword: '',
  scannerDeviceId: undefined,
  scanWindow: undefined,
})

const detailDrawerOpen = ref(false)
const detailBatchId = ref<string | null>(null)
const detailBatchSummary = ref<ExamScannerBatchVO | null>(null)

const statusTabItems = computed(() => [
  { key: 'ALL', label: '全部', count: summary.value?.batchTotal },
  { key: ScanBatchStatusCode.IN_PROGRESS, label: '进行中', count: summary.value?.inProgressCount },
  { key: ScanBatchStatusCode.BLOCKED, label: '阻断', count: summary.value?.blockedCount },
  { key: ScanBatchStatusCode.RECEIVED, label: '已接收' },
  { key: ScanBatchStatusCode.BOUND, label: '已绑定' },
  { key: ScanBatchStatusCode.COMPLETED, label: '已完成' },
])

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'keyword',
    label: '关键词',
    type: 'input',
    placeholder: '批次号 / 外部批次号 / 设备',
    inputPrefixIcon: 'search',
  },
  {
    key: 'scannerDeviceId',
    label: '扫描设备',
    type: 'select',
    placeholder: '全部设备',
    allowClear: true,
    allowSearch: true,
    options: devices.value
      .filter((device) => device.scannerDeviceId)
      .map((device) => ({
        value: device.scannerDeviceId!,
        label: formatDeviceLabel(device.scannerDeviceId),
      })),
  },
  {
    key: 'scanWindow',
    label: '扫描时间',
  },
])

const summaryMetrics = computed((): SignalMetric[] => {
  const data = summary.value
  if (!data) {
    if (summaryLoadFailed.value) {
      return [{ key: 'kpi-error', label: '批次 KPI', value: '加载失败', tone: 'red' }]
    }
    return [{ key: 'kpi-pending', label: '批次 KPI', value: '—', tone: 'gray' }]
  }
  const metrics: SignalMetric[] = [
    { key: 'batchTotal', label: '批次总数', value: data.batchTotal, unit: '个', tone: 'blue' },
    {
      key: 'inProgress',
      label: '进行中',
      value: data.inProgressCount,
      unit: '个',
      tone: data.inProgressCount > 0 ? 'blue' : 'gray',
    },
    {
      key: 'blocked',
      label: '页登记阻断',
      value: data.blockedCount,
      unit: '个',
      tone: data.blockedCount > 0 ? 'red' : 'green',
    },
    {
      key: 'orphanEvents',
      label: '游离页事件',
      value: data.orphanPendingEventCount,
      unit: '条',
      tone: data.orphanPendingEventCount > 0 ? 'orange' : 'green',
    },
    {
      key: 'attention',
      label: '扫描异常',
      value: data.attentionCount,
      unit: '项',
      tone: data.attentionCount > 0 ? 'orange' : 'green',
    },
  ]
  const progress = markingProgress.value
  if (progress && progress.paperCount > 0) {
    const bindingRate = Math.round((progress.gradablePaperCount / progress.paperCount) * 100)
    metrics.push({
      key: 'bindingRate',
      label: '卷面绑定率',
      value: bindingRate,
      unit: '%',
      helper: `${progress.gradablePaperCount}/${progress.paperCount}`,
      tone: progress.gradablePaperCount < progress.paperCount ? 'orange' : 'green',
    })
  }
  return metrics
})

const batchColumns: ColumnType<ExamScannerBatchVO>[] = [
  { title: '批次号', key: 'batchNo', width: 220 },
  { title: '状态', key: 'status', width: 100 },
  { title: '扫描设备', key: 'scannerDevice', width: 200, ellipsis: true },
  { title: '扫描时间窗', key: 'scanWindow', width: 210 },
  { title: '事件', dataIndex: 'eventCount', key: 'eventCount', width: 72 },
  { title: '文件', key: 'fileCount', width: 72, customRender: ({ record }) => `${record.sourceFileCount ?? 0}` },
  { title: '页数', dataIndex: 'pageCount', key: 'pageCount', width: 72 },
  { title: '落库', key: 'pageProgress', width: 90 },
  { title: '异常', key: 'attentionCount', width: 80 },
  { title: '顺序', key: 'orderAudit', width: 90 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

function batchStatusTone(batch: ExamScannerBatchVO): BadgeTone {
  if (batch.sealedTime) {
    return 'green'
  }
  return strictEnumTone(SCAN_BATCH_STATUS_TONE, batch.status, '扫描批次状态')
}

function batchStatusLabel(batch: ExamScannerBatchVO): string {
  if (batch.sealedTime) {
    return '已封存'
  }
  return strictEnumLabel(ScanBatchStatusDescription, batch.status, '扫描批次状态')
}

function formatDeviceLabel(deviceId?: string): string {
  if (!deviceId) {
    return '—'
  }
  const device = devices.value.find((item) => item.scannerDeviceId === deviceId)
  if (!device) {
    return deviceId
  }
  return device.scannerIp
    ? `${device.deviceName || deviceId} (${device.scannerIp})`
    : device.deviceName || deviceId
}

function syncFilterForm(next: Record<string, unknown>): void {
  filterForm.keyword = String(next.keyword ?? '')
  filterForm.scannerDeviceId = typeof next.scannerDeviceId === 'string' ? next.scannerDeviceId : undefined
  filterForm.scanWindow = isScanWindow(next.scanWindow) ? next.scanWindow : undefined
}

function isScanWindow(value: unknown): value is [string, string] {
  return Array.isArray(value)
    && value.length === 2
    && typeof value[0] === 'string'
    && typeof value[1] === 'string'
}

function buildBatchQuery(): ExamScannerBatchQueryRequest {
  return {
    examId: selectedExamId.value!,
    pageNum: batchQuery.pageNum,
    pageSize: batchQuery.pageSize,
    keyword: filterForm.keyword.trim() || undefined,
    scannerDeviceId: filterForm.scannerDeviceId,
    status: statusTab.value === 'ALL' ? undefined : statusTab.value,
    scanStartTimeFrom: filterForm.scanWindow?.[0],
    scanStartTimeTo: filterForm.scanWindow?.[1],
  }
}

async function loadMarkingProgress(): Promise<void> {
  if (!selectedExamId.value) {
    markingProgress.value = null
    return
  }
  try {
    markingProgress.value = await getMarkingProgress(selectedExamId.value)
  } catch (error) {
    markingProgress.value = null
    showUserError(error, '卷面绑定率加载失败')
  }
}

async function loadSummary(): Promise<void> {
  if (!selectedExamId.value) {
    summary.value = null
    summaryLoadFailed.value = false
    return
  }
  summaryLoadFailed.value = false
  try {
    summary.value = await getScannerBatchWorkbenchSummary({ examId: selectedExamId.value })
  } catch (error) {
    summary.value = null
    summaryLoadFailed.value = true
    showUserError(error, '扫描批次 KPI 加载失败')
  }
}

async function loadBatches(pageNum?: number): Promise<void> {
  if (!selectedExamId.value) {
    batches.value = []
    batchTotal.value = 0
    return
  }
  if (pageNum) {
    batchQuery.pageNum = pageNum
  }
  batchLoading.value = true
  batchListLoadFailed.value = false
  try {
    const result = await pageScannerBatches(buildBatchQuery())
    batches.value = readPageList(result, '扫描批次列表加载失败')
    batchTotal.value = readPageTotal(result, '扫描批次列表加载失败')
  } catch (error) {
    batches.value = []
    batchTotal.value = 0
    batchListLoadFailed.value = true
    showUserError(error, '扫描批次列表加载失败')
  } finally {
    batchLoading.value = false
  }
}

async function loadDevices(): Promise<void> {
  try {
    devices.value = await listActiveScannerDevices()
  } catch (error) {
    devices.value = []
    showUserError(error, '扫描设备列表加载失败')
  }
}

async function loadAllForExam(): Promise<void> {
  await Promise.all([loadSummary(), loadMarkingProgress(), loadBatches(), loadDevices()])
}

async function syncScanWorkbenchState(): Promise<void> {
  await refreshSnapshot()
  mittBus.emit('scan-workbench:refresh')
}

function handleSearch(): void {
  batchQuery.pageNum = 1
  void loadBatches()
}

function handleReset(): void {
  filterForm.keyword = ''
  filterForm.scannerDeviceId = undefined
  filterForm.scanWindow = undefined
  batchQuery.pageNum = 1
  void loadBatches()
}

function handleStatusTabChange(): void {
  batchQuery.pageNum = 1
  void loadBatches()
}

function onBatchPageChange(page: { current: number, pageSize: number }): void {
  batchQuery.pageNum = page.current
  batchQuery.pageSize = page.pageSize
  void loadBatches()
}

function openBatchDetail(batch: ExamScannerBatchVO): void {
  detailBatchId.value = batch.scanBatchId
  detailBatchSummary.value = batch
  detailDrawerOpen.value = true
}

function batchTableCustomRow(record: ExamScannerBatchVO) {
  return {
    onClick: () => openBatchDetail(record),
    style: { cursor: 'pointer' },
  }
}

function handleMetricClick(key: string): void {
  if (key === 'blocked') {
    statusTab.value = ScanBatchStatusCode.BLOCKED
    batchQuery.pageNum = 1
    void loadBatches()
    return
  }
  if (key === 'inProgress') {
    statusTab.value = ScanBatchStatusCode.IN_PROGRESS
    batchQuery.pageNum = 1
    void loadBatches()
    return
  }
  if (key === 'attention') {
    goScanMonitorAbnormal()
    return
  }
  if (key === 'orphanEvents') {
    scrollToOrphanAlert()
    return
  }
  if (key === 'bindingRate') {
    goScanMonitor()
  }
}

function scrollToOrphanAlert(): void {
  const element = orphanAlertRef.value?.$el
  if (element instanceof HTMLElement) {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function clearOrphanFocusQuery(): void {
  if (route.query.focus !== 'orphan') {
    return
  }
  const { focus: _focus, ...restQuery } = route.query
  void router.replace({ query: restQuery })
}

function tryFocusOrphanFromRoute(): void {
  if (route.query.focus !== 'orphan') {
    return
  }
  if (!selectedExamId.value || summary.value == null) {
    return
  }
  void nextTick(() => {
    const orphanCount = summary.value?.orphanPendingEventCount ?? 0
    if (orphanCount <= 0) {
      message.info('当前无待回收的游离扫描页')
      clearOrphanFocusQuery()
      return
    }
    scrollToOrphanAlert()
    clearOrphanFocusQuery()
  })
}

function goScanMonitorAbnormal(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScanMonitor',
    params: { examId: selectedExamId.value },
    query: { tab: 'abnormal' },
  })
}

async function handleOrphanRecovered(): Promise<void> {
  await loadAllForExam()
  await syncScanWorkbenchState()
}

async function handleDetailUpdated(): Promise<void> {
  await loadAllForExam()
  await syncScanWorkbenchState()
}

function goScannerKiosk(): void {
  void router.push({ name: 'ScannerKioskHub' })
}

function goScanDevices(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScanDevices',
    params: { examId: selectedExamId.value },
  })
}

function goScanMonitor(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScanMonitor',
    params: { examId: selectedExamId.value },
  })
}

watch(selectedExamId, (examId) => {
  statusTab.value = 'ALL'
  detailDrawerOpen.value = false
  detailBatchId.value = null
  detailBatchSummary.value = null
  if (examId) {
    void loadAllForExam().then(() => {
      tryFocusOrphanFromRoute()
    })
  } else {
    summary.value = null
    summaryLoadFailed.value = false
    batchListLoadFailed.value = false
    markingProgress.value = null
    batches.value = []
    batchTotal.value = 0
  }
}, { immediate: true })

watch(
  () => route.query.focus,
  () => {
    if (summary.value != null) {
      tryFocusOrphanFromRoute()
    }
  },
)

onMounted(() => {
  mittBus.on('scan-workbench:refresh', loadAllForExam)
})

onBeforeUnmount(() => {
  mittBus.off('scan-workbench:refresh', loadAllForExam)
})
</script>

<style lang="scss" scoped>
.scan-batch-workbench__empty {
  padding: 48px 0;
}

.scan-batch-workbench__attention-alert,
.scan-batch-workbench__orphan-alert {
  margin-bottom: 12px;
}

.scan-batch-workbench__empty-guide {
  margin: 8px 0 0;
  max-width: 420px;
  color: var(--ant-color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}

.scan-batch-workbench__warn {
  color: var(--ant-color-warning);
}

.muted {
  color: var(--ant-color-text-tertiary);
  font-size: 12px;
}
</style>
