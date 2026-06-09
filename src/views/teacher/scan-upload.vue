<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="selectedExamId"
            class="scan-batch-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag v-if="selectedExamId" :tone="livePendingEventTotal > 0 ? 'orange' : 'green'" size="sm">
            待聚合 {{ livePendingEventTotal }}
          </UiTag>
          <UiTag v-if="selectedExamId" tone="blue" size="sm">{{ batchTotal }} 批次</UiTag>
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="globalLoading"
            @click="loadAllForExam"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton
            v-if="selectedExamId"
            :variant="scanAttentionCount > 0 ? 'primary' : 'outline'"
            size="sm"
            @click="goScanLiveMonitor"
          >
            扫描监控
            <span v-if="scanAttentionCount > 0" class="scan-batch-page__action-count">
              {{ scanAttentionCount }}
            </span>
          </UiButton>
          <div v-if="selectedExamId" class="operations-cell scan-batch-page__advanced-links">
            <span class="op-link" role="button" @click="goScanAdvanced('TeacherImageLedger')">
              影像账本
            </span>
            <span class="op-link" role="button" @click="goScanAdvanced('TeacherPrinterManagement')">
              设备管理
            </span>
            <span class="op-link" role="button" @click="goScanAdvanced('TeacherOcrSettings')">
              OCR 配置
            </span>
          </div>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请先选择需要管理的考试"
      class="scan-batch-page__empty"
    />

    <template v-else>
      <!-- 扫描进度概览 KPI + 卷面绑定率环 -->
      <div v-if="progress" class="scan-batch-page__progress-row">
        <UiStatPanel
          title="扫描进度概览"
          :items="progressMetrics"
          :columns="4"
          variant="grid"
          compact
          class="scan-batch-page__progress-panel"
        />
        <UiCard
          v-if="paperBindingPercent !== null"
          class="scan-batch-page__ring-card"
          :show-header="false"
        >
          <div class="scan-batch-page__ring-wrap">
            <UiRingProgress
              :percent="paperBindingPercent"
              size="lg"
              :color="paperBindingColor"
              label="卷面绑定率"
            />
            <div class="scan-batch-page__ring-meta">
              <div class="scan-batch-page__ring-formula">
                <strong>{{ progress.gradablePaperCount }}</strong>
                <span class="muted"> / {{ progress.paperCount }} 份卷面</span>
              </div>
              <div class="scan-batch-page__ring-hint">
                {{ paperBindingHint }}
              </div>
            </div>
          </div>
        </UiCard>
      </div>
      <UiErrorRetryPanel
        v-else-if="progressLoadError"
        :error="progressLoadError"
        title="扫描进度加载失败"
        :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
        compact
        @retry="loadProgress"
      />

      <div class="scan-batch-page__monitor-grid">
        <UiCard class="scan-batch-page__device-card">
          <template #title>
            <DesktopOutlined />
            <span>当前连接扫描仪</span>
            <span class="scan-batch-page__panel-meta">{{ onlineDeviceCount }} / {{ devices.length }} 在线</span>
          </template>
          <UiErrorRetryPanel
            v-if="devicesLoadError"
            :error="devicesErrorObject"
            title="扫描设备列表加载失败"
            compact
            @retry="loadDevices"
          />
          <UiEmpty
            v-else-if="!devicesLoading && devices.length === 0"
            description="当前租户尚未接入扫描仪"
          />
          <div v-else class="scan-batch-page__device-list">
            <article
              v-for="device in devices"
              :key="device.id"
              class="scan-batch-page__device-row"
            >
              <div class="scan-batch-page__device-main">
                <strong>{{ device.deviceName || device.scannerDeviceId }}</strong>
                <span>{{ device.scannerStationId }}</span>
              </div>
              <div class="scan-batch-page__device-meta">
                <UiTag :tone="deviceOnlineTone(device)" size="sm">
                  {{ deviceOnlineLabel(device) }}
                </UiTag>
                <span v-if="device.scannerIp" class="muted">{{ device.scannerIp }}</span>
                <span v-if="device.pendingUploadPageCount" class="muted">
                  待上传 {{ device.pendingUploadPageCount }} 页
                </span>
              </div>
              <div v-if="device.diagnosticMessage" class="scan-batch-page__device-diagnostic">
                {{ device.diagnosticMessage }}
              </div>
            </article>
          </div>
        </UiCard>

        <UiCard class="scan-batch-page__events-card">
          <template #title>
            <ThunderboltOutlined />
            <span>实时扫描事件</span>
            <span class="scan-batch-page__panel-meta">{{ connectionLabel }} · 最新 {{ liveEvents.length }} 条</span>
          </template>
          <UiErrorRetryPanel
            v-if="scanLiveError"
            :error="scanLiveError"
            title="实时事件订阅失败"
            compact
            @retry="refreshScanLive"
          />
          <UiEmpty
            v-else-if="liveEvents.length === 0"
            description="暂无扫描事件，等待扫描端推送"
          />
          <div v-else class="scan-batch-page__event-list">
            <div
              v-for="event in liveEventPreview"
              :key="event.eventId"
              class="scan-batch-page__event-row"
            >
              <div class="scan-batch-page__event-main">
                <UiTag :tone="scanEventStatusTone(event.status)" size="sm">
                  {{ scanEventStatusLabel(event.status) }}
                </UiTag>
                <strong>{{ formatDeviceLabel(event.scannerDeviceId) }}</strong>
                <span>{{ event.pageCount }} 页</span>
              </div>
              <div class="scan-batch-page__event-meta">
                <span>{{ event.scannerStationId }}</span>
                <span>{{ formatTimeOfDay(event.scanEndTime || event.createTime) }}</span>
              </div>
            </div>
          </div>
        </UiCard>
      </div>

      <UiCard class="info-card">
        <template #title>
          <FileTextOutlined />
          <span>高级聚合：按扫描仪和时间窗口创建批次</span>
        </template>

        <a-form ref="formRef" :model="batchForm" :rules="batchFormRules" layout="vertical">
          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-form-item label="扫描仪（多选，至少 1 台）" name="scannerDeviceIds" required>
                <a-select
                  v-model:value="batchForm.scannerDeviceIds"
                  mode="multiple"
                  placeholder="选择参与本批次的扫描仪"
                  :options="deviceSelectOptions"
                  :loading="devicesLoading"
                  show-search
                  option-filter-prop="label"
                  allow-clear
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="扫描时间窗口（开始 / 结束）" name="scanWindow" required>
                <a-range-picker
                  v-model:value="batchForm.scanWindow"
                  show-time
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                  :placeholder="['扫描开始时间', '扫描结束时间']"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :xs="24">
              <a-form-item label="操作">
                <a-space>
                  <UiButton
                    size="md"
                    variant="outline"
                    :loading="previewLoading"
                    :disabled="!canPreview"
                    @click="previewPendingEvents"
                  >
                    预览待聚合事件
                  </UiButton>
                  <UiButton
                    size="md"
                    :loading="creating"
                    :disabled="!canCreate"
                    @click="handleCreateBatch"
                  >
                    创建扫描批次
                  </UiButton>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>

        <UiAlertStrip
          v-if="devicesLoadError"
          tone="error"
          title="扫描设备列表加载失败"
          :description="devicesLoadError"
          dense
          class="scan-batch-page__alert"
        />
        <UiAlertStrip
          v-if="batchCreateError"
          tone="error"
          title="扫描批次创建失败"
          :description="batchCreateError"
          dense
          class="scan-batch-page__alert"
        />

        <!-- 预览结果 -->
        <a-divider class="divider" />
        <UiErrorRetryPanel
          v-if="previewLoadError"
          :error="previewLoadError"
          title="聚合预览查询失败"
          compact
          @retry="previewPendingEvents"
        />
        <div v-if="previewLoaded" class="preview-section">
          <UiStatPanel :items="previewMetrics" :columns="4" variant="strip" compact />
          <UiDataTable
            v-if="previewData && previewData.deviceBreakdown.length > 0"
            class="student-detail-table__data-table event-table"
            :columns="deviceBreakdownColumns"
            :data-source="previewData.deviceBreakdown"
            :show-pagination="false"
            flat
            :total="previewData.deviceBreakdown.length"
            row-key="scannerDeviceId"
            size="small"
          />
          <UiEmpty
            v-else-if="previewData && previewData.eventCount === 0"
            description="筛选条件下没有待聚合的扫描事件"
          />
        </div>
      </UiCard>

      <!-- D-9 错误态：扫描批次加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="batchesLoadError"
        :error="batchesLoadError"
        title="扫描批次加载失败"
        :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
        compact
        @retry="() => loadBatches(1)"
      />
      <a-card v-else :bordered="false" class="detail-table-card scan-batch-page__batch-list-card">
        <template #title>
          <UnorderedListOutlined />
          <span>已创建批次</span>
        </template>

        <div class="filter-card">
          <a-form layout="inline" class="filter-form filter-form--toolbar">
            <a-form-item class="filter-form__actions">
              <a-space class="filter-form__action-group">
                <UiButton variant="outline" size="sm" :loading="globalLoading" @click="loadAllForExam">
                  刷新
                </UiButton>
              </a-space>
            </a-form-item>
          </a-form>
        </div>

        <UiDataTable
          v-model:current="batchQuery.pageNum"
          v-model:page-size="batchQuery.pageSize"
          :columns="batchColumns"
          :data-source="batches"
          :loading="batchLoading"
          :total="batchTotal"
          :scroll="{ x: 1290 }"
          flat
          @page-change="onBatchPageChange"
          row-key="scanBatchId"
          size="small"
          class="batch-table student-detail-table__data-table"
        >
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.key === 'batchNo'">
              <a-typography-text strong :content="record.batchNo" />
            </template>
            <template v-else-if="column.key === 'scannerDevice'">
              {{ formatDeviceLabel(record.scannerDeviceId) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="batchStatusTone(record)" size="sm">
                {{ batchStatusLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'scanWindow'">
              <div>{{ formatDateTimeWithSeconds(record.scanStartTime) }}</div>
              <div class="muted">至 {{ formatDateTimeWithSeconds(record.scanEndTime) }}</div>
            </template>
            <template v-else-if="column.key === 'eventCount'">
              {{ record.eventCount }} 条
            </template>
            <template v-else-if="column.key === 'fileCount'">
              <template v-if="record.sourceFileCount"> {{ record.sourceFileCount }} 份 </template>
              <template v-else>0 份</template>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <span
                  class="op-link"
                  :class="{ 'is-disabled': !record.sourceFileCount }"
                  role="button"
                  @click="record.sourceFileCount && openBatchSourceFiles(record)"
                >
                  查看扫描原件
                </span>
                <span
                  class="op-link danger"
                  :class="{
                    'is-disabled':
                      batchDiscarding === record.scanBatchId
                      || record.status === 'DISCARDED'
                      || Boolean(record.sealedAt),
                  }"
                  role="button"
                  :title="
                    record.sealedAt
                      ? '批次已封存，禁止废弃；请联系扫描终审角色'
                      : record.status === 'DISCARDED'
                        ? '批次已废弃'
                        : '废弃整批'
                  "
                  @click="
                    batchDiscarding !== record.scanBatchId
                      && record.status !== 'DISCARDED'
                      && !record.sealedAt
                      && onDiscardBatch(record)
                  "
                >
                  {{ record.status === 'DISCARDED' ? '已废弃' : '废弃' }}
                </span>
              </div>
            </template>
            <template v-else>{{ text }}</template>
          </template>
        </UiDataTable>
      </a-card>
    </template>

    <UiDrawer
      v-model:open="sourceFilesDrawerOpen"
      :title="sourceFilesDrawerTitle"
      width="520"
      hide-footer
    >
      <UiEmpty v-if="!sourceFilesTarget?.sourceFiles?.length" description="本批次暂无扫描原件" />
      <a-list v-else size="small" :data-source="sourceFilesTarget.sourceFiles">
        <template #render-item="{ item }">
          <a-list-item>
            <a-list-item-meta :title="item.fileName || item.fileId" />
            <template #actions>
              <UiButton
                size="sm"
                variant="outline"
                :loading="sourceFileDownloading === item.fileId"
                @click="downloadBatchSourceFile(item)"
              >
                下载
              </UiButton>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </UiDrawer>

    <a-modal
      v-model:open="batchDiscardModalOpen"
      title="废弃扫描批次"
      ok-text="废弃"
      ok-type="danger"
      cancel-text="取消"
      :confirm-loading="Boolean(batchDiscarding)"
      @ok="confirmDiscardBatch"
      @cancel="closeBatchDiscardModal"
    >
      <a-form layout="vertical">
        <a-form-item
          label="废弃原因"
          required
          :validate-status="batchDiscardReasonError ? 'error' : undefined"
          :help="batchDiscardReasonError"
        >
          <a-textarea
            v-model:value="batchDiscardReason"
            placeholder="请输入废弃原因（必填，1-255 字）"
            :maxlength="255"
            show-count
            :rows="4"
          />
        </a-form-item>
      </a-form>
      <UiAlertStrip
        v-if="batchDiscardError"
        tone="error"
        title="扫描批次废弃失败"
        :description="batchDiscardError"
        dense
      />
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamFileRefVO,
  ExamScannerBatchCreateRequest,
  ExamScannerBatchDeviceBreakdownVO,
  ExamScannerBatchPreviewVO,
  ExamScannerBatchQueryRequest,
  ExamScannerBatchVO,
  MarkingProgressVO,
} from '@/apis/mark/exam'
import type {
  ExamScannerDeviceQueryRequest,
  ExamScannerDeviceVO,
} from '@/apis/mark/exam-mark-scanner'
import type { ScanEventStatusCode } from '@/apis/mark/scan-live'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import DesktopOutlined from '@ant-design/icons-vue/DesktopOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import UnorderedListOutlined from '@ant-design/icons-vue/UnorderedListOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  createScanBatchByCondition,
  getMarkingProgress,
  pageScannerBatches,
  previewScanBatchAggregation,
  SCAN_BATCH_STATUS_LABEL,
  SCAN_BATCH_STATUS_TONE,
} from '@/apis/mark/exam'
import { listScannerDevices } from '@/apis/mark/exam-mark-scanner'
import { discardScanJob, listScanJobs } from '@/apis/mark/scanner-agent-local'
import { discardScannerKioskBatch } from '@/apis/mark/scanner-kiosk'
import {
  UiAlertStrip,
  UiButton,
  UiCard,
  UiDataTable,
  UiDrawer,
  UiEmpty,
  UiErrorRetryPanel,
  UiRingProgress,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useScanLiveStream } from '@/composables/useScanLiveStream'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { formatDateTime, formatDateTimeWithSeconds, formatTimeOfDay } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScanUpload' })

const router = useRouter()

function goScanAdvanced(routeName: string): void {
  if (!selectedExamId.value) return
  void router.push({ name: routeName, query: { examId: selectedExamId.value } })
}

function goScanLiveMonitor(): void {
  if (!selectedExamId.value) return
  void router.push({ name: 'TeacherScanLiveMonitor', query: { examId: selectedExamId.value } })
}

function batchStatusTone(batch: ExamScannerBatchVO): BadgeTone {
  return strictEnumTone(SCAN_BATCH_STATUS_TONE, batch.status, '扫描批次状态')
}

function batchStatusLabel(batch: ExamScannerBatchVO): string {
  return strictEnumLabel(SCAN_BATCH_STATUS_LABEL, batch.status, '扫描批次状态')
}

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 概览统计 ─────────────────────────────
const progress = ref<MarkingProgressVO | null>(null)
const progressLoading = ref(false)
const progressLoadError = ref<Error | null>(null)
const hasOpenTasks = computed(() => {
  const current = progress.value
  return current ? current.openProcessingTaskCount > 0 : false
})

const scanAttentionCount = computed(() => progress.value?.scanAttentionCount ?? 0)

const {
  events: liveEvents,
  ready: scanLiveReady,
  isStreaming: scanLiveStreaming,
  error: scanLiveError,
  start: startScanLive,
  stop: stopScanLive,
  refresh: refreshScanLive,
} = useScanLiveStream({
  filter: () => ({
    examId: selectedExamId.value || undefined,
  }),
  initialLimit: 50,
  maxEvents: 120,
})

const livePendingEventTotal = computed(() =>
  liveEvents.value.filter((event) => event.status === 'PENDING').length,
)
const liveEventPreview = computed(() => liveEvents.value.slice(0, 8))

const connectionLabel = computed(() => {
  if (scanLiveError.value) return '实时连接异常'
  if (scanLiveReady.value) return '实时连接中'
  if (scanLiveStreaming.value) return '正在建立连接'
  return '未连接'
})

function scanEventStatusLabel(status: ScanEventStatusCode): string {
  const labels: Record<ScanEventStatusCode, string> = {
    PENDING: '待聚合',
    BATCHED: '已聚合',
    INVALID: '已失效',
  }
  return strictEnumLabel(labels, status, '扫描事件状态')
}

function scanEventStatusTone(status: ScanEventStatusCode): BadgeTone {
  const tones: Record<ScanEventStatusCode, BadgeTone> = {
    PENDING: 'orange',
    BATCHED: 'green',
    INVALID: 'red',
  }
  return strictEnumTone(tones, status, '扫描事件状态')
}

/** 全局加载状态：任一子加载中即视为正在加载 */
const globalLoading = computed(
  () => progressLoading.value || devicesLoading.value || batchLoading.value || previewLoading.value,
)

async function loadProgress(): Promise<void> {
  if (!selectedExamId.value) return
  progressLoading.value = true
  progressLoadError.value = null
  try {
    progress.value = await getMarkingProgress(selectedExamId.value)
  } catch (error) {
    progressLoadError.value = toUserError(error, '阅卷进度加载失败')
    showUserError(error, '阅卷进度加载失败')
  } finally {
    progressLoading.value = false
  }
}

const progressMetrics = computed(() => {
  const current = progress.value
  const scanAttention = current ? current.scanAttentionCount : 0
  return [
    { label: '已创建批次', value: batchTotal.value, unit: '个', tone: 'blue' as const },
    {
      label: '待聚合事件',
      value: livePendingEventTotal.value,
      unit: '条',
      tone: livePendingEventTotal.value > 0 ? ('orange' as const) : ('green' as const),
    },
    {
      label: '待处理任务',
      value: current ? current.openProcessingTaskCount : 0,
      unit: '条',
      tone: hasOpenTasks.value ? ('red' as const) : ('green' as const),
    },
    {
      label: '扫描异常',
      value: scanAttention,
      unit: '条',
      tone: scanAttention > 0 ? ('red' as const) : ('green' as const),
    },
  ]
})

// ─── D-8 卷面绑定率环 ────────────────────────────────
// 绑定率 = gradablePaperCount（已绑定到学生的卷面）/ paperCount（扫描入库总卷面）
// 仅当后端返回 paperCount > 0 时显示，避免空考试出现 0/0 误导。
const paperBindingPercent = computed<number | null>(() => {
  const current = progress.value
  if (!current || current.paperCount <= 0) return null
  return Math.round((current.gradablePaperCount / current.paperCount) * 100)
})

/** ≥95% 绿 / ≥80% 橙 / 其余红，提示教师哪些卷面尚未识别绑定 */
const paperBindingColor = computed<string>(() => {
  const p = paperBindingPercent.value
  if (p == null) return '#94a3b8'
  if (p >= 95) return '#16a34a'
  if (p >= 80) return '#ea580c'
  return '#dc2626'
})

const paperBindingHint = computed<string>(() => {
  const p = paperBindingPercent.value
  if (p == null) return '尚未识别任何卷面'
  if (p >= 95) return '绑定率良好，可推进批阅环节'
  if (p >= 80) return '存在少量未绑定卷面，请处理扫描异常'
  return '绑定率偏低，请优先处理扫描异常与冲突卷'
})

const previewMetrics = computed(() => {
  const data = previewData.value
  if (!data) return []
  return [
    {
      label: '待聚合事件',
      value: data.eventCount,
      unit: '条',
      tone: data.eventCount > 0 ? ('orange' as const) : ('gray' as const),
    },
    {
      label: '覆盖文件数',
      value: data.fileCount,
      unit: '份',
      tone: 'blue' as const,
    },
    {
      label: '累计页数',
      value: data.pageCount,
      unit: '页',
      tone: 'blue' as const,
    },
    { label: '时间跨度', value: previewTimeSpan.value, tone: 'gray' as const },
  ]
})

// ─── 扫描设备列表 ─────────────────────────────
const devices = ref<ExamScannerDeviceVO[]>([])
const devicesLoading = ref(false)
const devicesLoadError = ref('')
const devicesErrorObject = computed(() => new Error(devicesLoadError.value))

const deviceSelectOptions = computed(() =>
  devices.value
    .filter((d) => !!d.scannerDeviceId)
    .map((d) => ({
      value: d.scannerDeviceId!,
      label: formatDeviceLabel(d.scannerDeviceId),
    })),
)

function formatDeviceLabel(deviceId?: string): string {
  if (!deviceId) return '—'
  const device = devices.value.find((d) => d.scannerDeviceId === deviceId)
  if (!device) return deviceId
  return device.scannerIp
    ? `${device.deviceName || deviceId} (${device.scannerIp})`
    : device.deviceName || deviceId
}

const onlineDeviceCount = computed(() =>
  devices.value.filter((device) => device.endpointOnlineStatus === 'ONLINE' || device.scannerConnected).length,
)

function deviceOnlineTone(device: ExamScannerDeviceVO): BadgeTone {
  if (device.diagnosticStatus === 'ERROR') return 'red'
  if (device.diagnosticStatus === 'WARNING' || device.endpointOnlineStatus === 'OFFLINE') return 'orange'
  if (device.endpointOnlineStatus === 'ONLINE' || device.scannerConnected) return 'green'
  return 'gray'
}

function deviceOnlineLabel(device: ExamScannerDeviceVO): string {
  if (device.diagnosticStatus === 'ERROR') return '诊断异常'
  if (device.diagnosticStatus === 'WARNING') return '诊断告警'
  if (device.endpointOnlineStatus === 'ONLINE' || device.scannerConnected) return '在线'
  if (device.endpointOnlineStatus === 'OFFLINE') return '离线'
  return '未上报'
}

async function loadDevices(): Promise<void> {
  devicesLoading.value = true
  devicesLoadError.value = ''
  try {
    const query: ExamScannerDeviceQueryRequest = {}
    devices.value = await listScannerDevices(query)
  } catch (error) {
    devicesLoadError.value = getUserErrorMessage(error, '扫描设备列表加载失败')
    showUserError(error, '扫描设备列表加载失败')
  } finally {
    devicesLoading.value = false
  }
}

// ─── 批次创建表单 ─────────────────────────────
const formRef = ref<FormInstance>()
const batchForm = reactive<{
  scannerDeviceIds: string[]
  scanWindow?: [string, string]
}>({
  scannerDeviceIds: [],
  scanWindow: undefined,
})

const batchFormRules: Record<string, Rule[]> = {
  scannerDeviceIds: [
    { required: true, type: 'array', min: 1, message: '至少选择 1 台扫描仪', trigger: 'change' },
  ],
  scanWindow: [{ required: true, type: 'array', message: '请选择扫描时间窗口', trigger: 'change' }],
}

const canPreview = computed(
  () =>
    !!selectedExamId.value
    && !devicesLoadError.value
    && batchForm.scannerDeviceIds.length > 0
    && !!batchForm.scanWindow
    && batchForm.scanWindow.length === 2,
)

const canCreate = computed(() => canPreview.value)

// ─── 待聚合事件预览（聚合统计，不含事件明细） ─────────────────────────────
const previewData = ref<ExamScannerBatchPreviewVO | null>(null)
const pendingEventTotal = ref(0)
const previewLoaded = ref(false)
const previewLoading = ref(false)
const previewLoadError = ref<Error | null>(null)
const previewTimeSpan = ref('未执行预览')

const deviceBreakdownColumns: ColumnType<ExamScannerBatchDeviceBreakdownVO>[] = [
  {
    title: '扫描设备',
    key: 'scannerDevice',
    width: 240,
    ellipsis: true,
    customRender: ({ record }) => formatDeviceLabel(record.scannerDeviceId),
  },
  { title: '设备地址', dataIndex: 'scannerIp', key: 'scannerIp', width: 160 },
  { title: '事件数', dataIndex: 'eventCount', key: 'eventCount', width: 100 },
  { title: '页数', dataIndex: 'pageCount', key: 'pageCount', width: 100 },
]

async function previewPendingEvents(): Promise<void> {
  if (!formRef.value || !selectedExamId.value || !batchForm.scanWindow) return
  try {
    await formRef.value.validate(['scannerDeviceIds', 'scanWindow'])
  } catch {
    return
  }
  previewLoading.value = true
  previewLoaded.value = false
  previewLoadError.value = null
  try {
    const request: ExamScannerBatchCreateRequest = {
      examId: selectedExamId.value,
      scannerDeviceIds: batchForm.scannerDeviceIds,
      scanStartTime: batchForm.scanWindow[0],
      scanEndTime: batchForm.scanWindow[1],
    }
    const result = await previewScanBatchAggregation(request)
    previewData.value = result
    pendingEventTotal.value = result.eventCount
    previewTimeSpan.value
      = result.eventCount > 0
        ? `${formatDateTime(result.scanStartTime)} ~ ${formatDateTime(result.scanEndTime)}`
        : '无待聚合事件'
    previewLoaded.value = true
  } catch (error) {
    previewLoadError.value = toUserError(error, '扫描事件预览加载失败')
    showUserError(error, '扫描事件预览加载失败')
  } finally {
    previewLoading.value = false
  }
}

// ─── 创建批次 ─────────────────────────────
const creating = ref(false)
const batchCreateError = ref('')

async function handleCreateBatch(): Promise<void> {
  if (!selectedExamId.value || !formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!batchForm.scanWindow) return
  creating.value = true
  batchCreateError.value = ''
  try {
    const request: ExamScannerBatchCreateRequest = {
      examId: selectedExamId.value,
      scannerDeviceIds: batchForm.scannerDeviceIds,
      scanStartTime: batchForm.scanWindow[0],
      scanEndTime: batchForm.scanWindow[1],
    }
    const result = await createScanBatchByCondition(request)
    message.success(
      `批次创建成功：聚合 ${result.eventCount} 条事件 / ${result.fileCount} 份文件 / ${result.pageCount} 页`,
    )
    previewLoaded.value = false
    previewData.value = null
    await loadBatches(1)
    await loadProgress()
    await refreshScanLive()
  } catch (error) {
    batchCreateError.value = getUserErrorMessage(error, '扫描批次创建失败')
    showUserError(error, '扫描批次创建失败')
  } finally {
    creating.value = false
  }
}

// ─── 已创建批次列表 ─────────────────────────────
const batches = ref<ExamScannerBatchVO[]>([])
const batchTotal = ref(0)
const batchLoading = ref(false)
const batchesLoadError = ref<Error | null>(null)
const batchQuery = reactive<{ pageNum: number, pageSize: number }>({
  pageNum: 1,
  pageSize: 10,
})

const batchColumns: ColumnType<ExamScannerBatchVO>[] = [
  { title: '批次号', key: 'batchNo', width: 240 },
  { title: '状态', key: 'status', width: 110 },
  {
    title: '主扫描设备',
    key: 'scannerDevice',
    width: 240,
    ellipsis: true,
  },
  { title: '扫描时间窗', key: 'scanWindow', width: 220 },
  { title: '事件数', key: 'eventCount', width: 90 },
  { title: '文件数', key: 'fileCount', width: 90 },
  { title: '页数', dataIndex: 'pageCount', key: 'pageCount', width: 80 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' as const },
]

/**
 * 教师在扫描审阅场景对扫描批次发起废弃。
 * 已 sealed/已 DISCARDED 的批次禁用入口；其余状态二次确认 + 必填理由后调用扫描工作台废弃接口。
 */
const batchDiscarding = ref<string | null>(null)
const batchDiscardModalOpen = ref(false)
const batchDiscardTarget = ref<ExamScannerBatchVO | null>(null)
const batchDiscardReason = ref('')
const batchDiscardReasonError = ref('')
const batchDiscardError = ref('')

const sourceFilesDrawerOpen = ref(false)
const sourceFilesTarget = ref<ExamScannerBatchVO | null>(null)
const sourceFileDownloading = ref<string | null>(null)

const sourceFilesDrawerTitle = computed(() => {
  const batch = sourceFilesTarget.value
  if (!batch) return '扫描原件'
  return `扫描原件 · ${batch.batchNo}`
})

function openBatchSourceFiles(batch: ExamScannerBatchVO): void {
  if (!batch.sourceFileCount) {
    message.info('本批次暂无扫描原件')
    return
  }
  sourceFilesTarget.value = batch
  sourceFilesDrawerOpen.value = true
}

async function downloadBatchSourceFile(file: ExamFileRefVO): Promise<void> {
  sourceFileDownloading.value = file.fileId
  try {
    await handleDownloadFile({
      fileId: file.fileId,
      fileName: file.fileName,
    })
  } finally {
    sourceFileDownloading.value = null
  }
}

async function onDiscardBatch(batch: ExamScannerBatchVO): Promise<void> {
  if (!batch.scanBatchId) return
  if (batch.status === 'DISCARDED') {
    message.info('批次已废弃，无需重复操作')
    return
  }
  if (batch.sealedAt) {
    message.warning('批次已封存，禁止废弃；请联系扫描终审角色解封后再处置')
    return
  }
  batchDiscardTarget.value = batch
  batchDiscardReason.value = ''
  batchDiscardReasonError.value = ''
  batchDiscardError.value = ''
  batchDiscardModalOpen.value = true
}

function closeBatchDiscardModal(): void {
  if (batchDiscarding.value) return
  batchDiscardModalOpen.value = false
  batchDiscardTarget.value = null
  batchDiscardReason.value = ''
  batchDiscardReasonError.value = ''
  batchDiscardError.value = ''
}

async function confirmDiscardBatch(): Promise<void> {
  const batch = batchDiscardTarget.value
  if (!batch?.scanBatchId) {
    closeBatchDiscardModal()
    return
  }
  const trimmed = batchDiscardReason.value.trim()
  if (!trimmed) {
    batchDiscardReasonError.value = '废弃原因不能为空'
    return
  }
  if (trimmed.length > 255) {
    batchDiscardReasonError.value = '废弃原因长度不能超过 255 字'
    return
  }
  batchDiscardReasonError.value = ''
  batchDiscardError.value = ''
  batchDiscarding.value = batch.scanBatchId
  try {
    await discardScannerKioskBatch({ scanBatchId: batch.scanBatchId, discardReason: trimmed })
    let localAgentCleanupWarning: string
    try {
      localAgentCleanupWarning = await cleanupLocalAgentScanJobForDiscardedBatch(batch, trimmed)
    } catch (error) {
      localAgentCleanupWarning = getUserErrorMessage(
        error,
        '无法连接本机扫描 Agent，服务端批次已废弃但本机扫描任务未清理',
      )
    }
    if (localAgentCleanupWarning) {
      message.warning(`扫描批次已废弃；${localAgentCleanupWarning}`)
    } else {
      message.success(`扫描批次已废弃，并已清理本机扫描任务，批次编号：${batch.batchNo}`)
    }
    batchDiscardModalOpen.value = false
    batchDiscardTarget.value = null
    batchDiscardReason.value = ''
    await loadBatches()
    await loadProgress()
  } catch (error) {
    batchDiscardError.value = getUserErrorMessage(error, '扫描批次废弃失败')
    showUserError(error, '扫描批次废弃失败')
  } finally {
    batchDiscarding.value = null
  }
}

/**
 * 教师废弃后端批次后，按后端批次标识精确清理同一台工作站上的 Reported Agent 任务。
 * 返回非空文案表示后端已废弃但本机清理未完成，调用方必须显式提示教师。
 */
async function cleanupLocalAgentScanJobForDiscardedBatch(
  batch: ExamScannerBatchVO,
  discardReason: string,
): Promise<string> {
  const scannerDeviceId = batch.scannerDeviceId?.trim()
  const scannerStationId = batch.scannerStationId?.trim()
  if (!scannerDeviceId || !scannerStationId) {
    return '批次缺少扫描设备或扫描站点，无法定位本机 Agent 任务'
  }
  const response = await listScanJobs({
    examId: batch.examId,
    scannerDeviceId,
    scannerStationId,
    includeTerminal: true,
  })
  const matchedJobs = response.jobs.filter((job) => {
    if (!job.reported || job.status !== 'REPORTED') {
      return false
    }
    if (job.scanBatchId && job.scanBatchId === batch.scanBatchId) {
      return true
    }
    return Boolean(batch.batchExternalNo && job.batchExternalNo === batch.batchExternalNo)
  })
  if (matchedJobs.length === 0) {
    return `本机 Agent 未找到批次 ${batch.batchNo} 对应的已上报扫描任务，请在原扫描工作站清理`
  }
  if (matchedJobs.length > 1) {
    return `本机 Agent 匹配到 ${matchedJobs.length} 个批次 ${batch.batchNo} 的已上报任务，已阻断本机自动清理`
  }
  const cleared = await discardScanJob(matchedJobs[0].scanJobId, discardReason)
  return cleared ? '' : `本机 Agent 未确认批次 ${batch.batchNo} 的任务清理结果`
}

async function loadBatches(pageNum?: number): Promise<void> {
  if (!selectedExamId.value) return
  if (pageNum) batchQuery.pageNum = pageNum
  batchLoading.value = true
  batchesLoadError.value = null
  try {
    const request: ExamScannerBatchQueryRequest = {
      examId: selectedExamId.value,
      pageNum: batchQuery.pageNum,
      pageSize: batchQuery.pageSize,
    }
    const result = await pageScannerBatches(request)
    batches.value = readPageList(result, '扫描批次加载失败，请稍后重试')
    batchTotal.value = readPageTotal(result, '扫描批次加载失败，请稍后重试')
  } catch (error) {
    batchesLoadError.value = toUserError(error, '扫描批次列表加载失败')
    showUserError(error, '扫描批次列表加载失败')
  } finally {
    batchLoading.value = false
  }
}

function onBatchPageChange(page: { current: number, pageSize: number }): void {
  batchQuery.pageNum = page.current
  batchQuery.pageSize = page.pageSize
  void loadBatches()
}

// ─── 生命周期 ─────────────────────────────
async function loadAllForExam(): Promise<void> {
  await Promise.all([loadDevices(), loadBatches(1), loadProgress(), refreshScanLive()])
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadAllForExam()
  } else {
    progress.value = null
    batches.value = []
    batchTotal.value = 0
    progressLoadError.value = null
    batchesLoadError.value = null
    devicesLoadError.value = ''
    previewLoadError.value = null
    batchCreateError.value = ''
    batchDiscardError.value = ''
    stopScanLive()
  }
})

onMounted(async () => {
  await initExamSelector()
  await startScanLive()
  if (selectedExamId.value) {
    await loadAllForExam()
  }
})

onBeforeUnmount(() => {
  stopScanLive()
})
</script>

<style lang="scss" scoped>
.scan-batch-page {
  &__exam-select {
    width: 280px;
  }

  &__advanced-links {
    display: inline-flex;
    gap: 12px;
    margin-left: 8px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__progress-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    align-items: stretch;
    flex-wrap: wrap;
  }

  &__progress-panel {
    flex: 1 1 480px;
    min-width: 0;
    margin-bottom: 0;
  }

  &__ring-card {
    flex: 0 0 240px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__ring-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  &__ring-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__ring-formula {
    font-size: 16px;
    color: var(--dp-text-primary, #0f172a);
  }

  &__ring-hint {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
    max-width: 140px;
  }

  &__monitor-grid {
    display: grid;
    grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  &__device-card,
  &__events-card {
    min-width: 0;
  }

  &__panel-meta {
    margin-left: 8px;
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
    font-weight: 400;
  }

  &__device-list,
  &__event-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 360px;
    overflow-y: auto;
  }

  &__device-row,
  &__event-row {
    padding: 12px;
    border: 1px solid var(--dp-border, #e5e7eb);
    border-radius: 8px;
    background: var(--dp-surface, #fff);
  }

  &__device-main,
  &__event-main,
  &__device-meta,
  &__event-meta {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  &__device-main,
  &__event-main {
    gap: 8px;
    color: var(--dp-text-primary, #0f172a);
  }

  &__device-main {
    justify-content: space-between;

    span {
      color: var(--dp-text-secondary, #475569);
      font-size: 12px;
    }
  }

  &__device-meta,
  &__event-meta {
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
  }

  &__device-diagnostic {
    margin-top: 8px;
    color: var(--ant-color-error, #ff4d4f);
    font-size: 12px;
    line-height: 1.5;
  }

  &__action-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--dp-surface, #fff);
    color: var(--ant-color-error, #ff4d4f);
    font-size: 12px;
    font-weight: 700;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.batch-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.divider {
  margin: 12px 0;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-table {
  margin-top: 8px;
}

.muted {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 60px 0;
}

@media (max-width: 980px) {
  .scan-batch-page {
    &__monitor-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
