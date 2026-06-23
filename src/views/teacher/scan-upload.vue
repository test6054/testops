<template>
  <div class="scan-batch-page">
    <UiEmpty
      v-if="!selectedExamId"
      description="请选择考试"
      class="scan-batch-page__empty"
    />

    <template v-else>
      <section v-if="progress" class="scan-batch-page__progress-overview">
        <h2 class="scan-batch-page__section-title">扫描进度概览</h2>
        <div class="scan-batch-page__progress-row">
          <UiStatPanel
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
            compact
          >
            <MarkGaugeBlock v-bind="paperBindingGaugeBlockProps">
              <div class="mark-gauge-block__formula">
                <strong>{{ progress.gradablePaperCount }}</strong>
                <span class="muted"> / {{ progress.paperCount }} 份卷面</span>
              </div>
              <p class="mark-gauge-block__hint">
                {{ paperBindingHint }}
              </p>
            </MarkGaugeBlock>
          </UiCard>
        </div>
      </section>

      <section class="scan-batch-page__section">
        <h2 class="scan-batch-page__section-title">扫描录入</h2>
        <ScanManualSupplementPanel
          :exam-id="selectedExamId"
          :devices="devices"
          :devices-loading="devicesLoading"
          @success="onManualSupplementSuccess"
        />

        <div class="scan-batch-page__monitor-grid">
          <UiCard class="scan-batch-page__device-card">
            <template #title>
              <DesktopOutlined />
              <span>当前连接扫描仪</span>
              <span class="scan-batch-page__panel-meta">{{ connectedDevices.length }} 台在线</span>
            </template>

            <UiDataTable
              pagination-mode="none"
              :columns="scannerDeviceColumns"
              :data-source="connectedDevices"
              :loading="devicesLoading"
              :show-pagination="false"
              flat
              :total="connectedDevices.length"
              row-key="id"
              size="small"
              empty-kind="first-run"
              :empty-description="connectedDevicesEmptyDescription"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'deviceName'">
                  <div>{{ record.deviceName || record.scannerDeviceId }}</div>
                  <div v-if="record.scannerDeviceId" class="muted">{{ record.scannerDeviceId }}</div>
                </template>
                <template v-else-if="column.key === 'status'">
                  <UiTag :tone="deviceOnlineTone(record)" size="sm">
                    {{ deviceOnlineLabel(record) }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'pendingUpload'">
                  <span v-if="record.pendingUploadPageCount">{{ record.pendingUploadPageCount }} 页</span>
                  <span v-else class="muted">—</span>
                </template>
                <template v-else-if="column.key === 'diagnostic'">
                  <span v-if="record.diagnosticMessage">{{ record.diagnosticMessage }}</span>
                  <span v-else class="muted">—</span>
                </template>
              </template>
            </UiDataTable>
          </UiCard>

          <UiCard class="scan-batch-page__events-card">
            <template #title>
              <ThunderboltOutlined />
              <span>最近扫描事件</span>
              <span class="scan-batch-page__panel-meta">{{ connectionLabel }} · 最新 {{ liveEvents.length }} 条</span>
            </template>
            <template #extra>
              <UiTextAction @click="goScanLiveMonitor">打开实时监控</UiTextAction>
            </template>

            <UiDataTable
              pagination-mode="none"
              :columns="liveEventColumns"
              :data-source="liveEvents"
              :loading="recentEventsLoading"
              :show-pagination="false"
              flat
              :total="liveEvents.length"
              row-key="eventId"
              size="small"
              empty-kind="first-run"
              empty-description="当前无在线扫描仪时暂无事件快照，请先在扫描终端登录"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <UiTag :tone="scanEventStatusTone(record.status)" size="sm">
                    {{ scanEventStatusLabel(record.status) }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'device'">
                  {{ formatDeviceLabel(record.scannerDeviceId) }}
                </template>
                <template v-else-if="column.key === 'time'">
                  {{ formatTimeOfDay(record.scanEndTime || record.createTime) }}
                </template>
              </template>
            </UiDataTable>
          </UiCard>
        </div>
      </section>

      <section class="scan-batch-page__section">
        <h2 class="scan-batch-page__section-title">批次管理</h2>
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

          <!-- 预览结果 -->
          <a-divider class="divider" />
          <div v-if="previewLoaded" class="preview-section">
            <UiStatPanel :items="previewMetrics" :columns="4" variant="strip" compact />
            <UiDataTable
              pagination-mode="none"
              class="student-detail-table__data-table event-table"
              :columns="deviceBreakdownColumns"
              :data-source="previewData?.deviceBreakdown ?? []"
              :show-pagination="false"
              flat
              :total="previewData?.deviceBreakdown?.length ?? 0"
              row-key="scannerDeviceId"
              size="small"
            />
          </div>
        </UiCard>

        <a-card :bordered="false" class="detail-table-card scan-batch-page__batch-list-card">
          <template #title>
            <UnorderedListOutlined />
            <span>已创建批次</span>
          </template>
          <template #extra>
            <UiButton variant="outline" size="sm" :loading="globalLoading" @click="loadAllForExam">
              刷新
            </UiButton>
          </template>



          <UiDataTable
            v-model:current="batchQuery.pageNum"
            v-model:page-size="batchQuery.pageSize"
            :columns="batchColumns"
            :data-source="batches"
            :loading="batchLoading"
            :total="batchTotal"
            :scroll="{ x: 1470 }"
            flat
            empty-kind="first-run"
            empty-description="尚未创建扫描批次，选择扫描仪与时间窗口后点击「创建扫描批次」"
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
              <template v-else-if="column.key === 'pageProgress'">
                <span :class="{ warn: (record.pendingUploadCount ?? 0) > 0 }">
                  {{ record.receivedPageCount ?? 0 }} / {{ record.pageCount }}
                </span>
              </template>
              <template v-else-if="column.key === 'attentionCount'">
                <UiTag v-if="(record.attentionItemCount ?? 0) > 0" tone="orange" size="sm">
                  {{ record.attentionItemCount }} 项
                </UiTag>
                <span v-else class="muted">0</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction
                    :disabled="!record.sourceFileCount"
                    @click="openBatchSourceFiles(record)"
                  >
                    查看扫描原件
                  </UiTextAction>
                  <UiTextAction
                    :disabled="batchSealing === record.scanBatchId || !canSealBatch(record)"
                    :title="batchSealBlockedReason(record) || '封存批次'"
                    @click="onSealBatch(record)"
                  >
                    {{ record.sealedAt ? '已封存' : '封存' }}
                  </UiTextAction>
                  <UiTextAction
                    tone="danger"
                    :disabled="
                      batchDiscarding === record.scanBatchId
                        || record.status === 'DISCARDED'
                        || Boolean(record.sealedAt)
                    "
                    :title="
                      record.sealedAt
                        ? '批次已封存，禁止废弃；请联系扫描终审角色'
                        : record.status === 'DISCARDED'
                          ? '批次已废弃'
                          : '废弃整批'
                    "
                    @click="onDiscardBatch(record)"
                  >
                    {{ record.status === 'DISCARDED' ? '已废弃' : '废弃' }}
                  </UiTextAction>
                </div>
              </template>
              <template v-else>{{ text }}</template>
            </template>
          </UiDataTable>
        </a-card>
      </section>
    </template>

    <UiDrawer
      v-model:open="sourceFilesDrawerOpen"
      :title="sourceFilesDrawerTitle"
      width="520"
      hide-footer
    >
      <UiEmpty
        v-if="!sourceFilesTarget?.sourceFiles?.length"
        description="该批次暂无扫描原件记录"
      />
      <a-list v-else size="small" :data-source="sourceFilesTarget.sourceFiles">
        <template #renderItem="{ item }">
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
    </a-modal>

    <a-modal
      v-model:open="batchSealModalOpen"
      title="封存扫描批次"
      ok-text="确认封存"
      cancel-text="取消"
      :confirm-loading="Boolean(batchSealing)"
      :ok-button-props="{ disabled: !batchSealReady }"
      @ok="confirmSealBatch"
      @cancel="cancelSealBatch"
    >
      <template v-if="batchSealTarget">
        <p class="scan-batch-page__seal-intro">
          封存批次 <strong>{{ batchSealTarget.batchNo }}</strong> 后，扫描端将无法再向该批次追加页面。
        </p>
        <ul class="scan-batch-page__seal-checklist">
          <li
            v-for="item in batchSealChecklist"
            :key="item.key"
            :class="item.ok ? 'is-pass' : 'is-fail'"
          >
            <span class="scan-batch-page__seal-check-label">{{ item.label }}</span>
            <span v-if="item.detail" class="scan-batch-page__seal-check-detail">{{ item.detail }}</span>
          </li>
        </ul>
        <p v-if="(batchSealTarget.attentionItemCount ?? 0) > 0" class="scan-batch-page__seal-hint">
          请先前往
          <UiTextAction @click="openSealAttentionMonitor">扫描监控</UiTextAction>
          处置异常后再封存。
        </p>
      </template>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamFileRefVO,
} from '@/apis/mark/exam'
import type {ExamScannerDeviceVO} from '@/apis/mark/exam-mark-scanner';
import type {MarkingProgressVO} from '@/apis/mark/exam-progress';
import type {
  ExamScannerBatchCreateRequest,
  ExamScannerBatchDeviceBreakdownVO,
  ExamScannerBatchPreviewVO,
  ExamScannerBatchQueryRequest,
  ExamScannerBatchVO,
} from '@/apis/mark/exam-scan'
import type { ScanLiveEventVO } from '@/apis/mark/scan-live'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import DesktopOutlined from '@ant-design/icons-vue/DesktopOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import UnorderedListOutlined from '@ant-design/icons-vue/UnorderedListOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  isScannerDeviceOnline,
  listActiveScannerDevices
} from '@/apis/mark/exam-mark-scanner'
import { getMarkingProgress } from '@/apis/mark/exam-progress'
import {
  createScanBatchByCondition,
  pageScannerBatches,
  previewScanBatchAggregation,
  SCAN_BATCH_STATUS_LABEL,
  SCAN_BATCH_STATUS_TONE,
  sealScanBatchByTeacher,
} from '@/apis/mark/exam-scan'
import {
  listRecentScanEvents,
  SCAN_EVENT_STATUS_LABEL,
  SCAN_EVENT_STATUS_TONE,
} from '@/apis/mark/scan-live'
import { discardScanJob, listScanJobs } from '@/apis/mark/scanner-agent-local'
import { discardScannerKioskBatch } from '@/apis/mark/scanner-kiosk'
import MarkGaugeBlock from '@/components/chart/MarkGaugeBlock.vue'
import ScanManualSupplementPanel from '@/components/mark/ScanManualSupplementPanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { formatDateTime, formatDateTimeWithSeconds, formatTimeOfDay } from '@/utils/format'
import { formatGaugeAriaLabel } from '@/utils/mark-chart-accessibility'
import { buildGaugeChartOption } from '@/utils/mark-echarts-options'
import mittBus from '@/utils/mitt'
import { readPageList, readPageTotal } from '@/utils/page-result'
import {
  batchSealBlockedReason,
  buildBatchSealChecklist,
  canSealBatch,
} from '@/utils/scan-batch-seal'
import { progressTone, toneToColor } from '@/utils/score-tone'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScanUploadBatches' })

const router = useRouter()

function goScanLiveMonitor(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceScanMonitor',
    params: { examId: selectedExamId.value },
  })
}

function batchStatusTone(batch: ExamScannerBatchVO): BadgeTone {
  if (batch.sealedAt) return 'green'
  return strictEnumTone(SCAN_BATCH_STATUS_TONE, batch.status, '扫描批次状态')
}

function batchStatusLabel(batch: ExamScannerBatchVO): string {
  if (batch.sealedAt) return '已封存'
  return strictEnumLabel(SCAN_BATCH_STATUS_LABEL, batch.status, '扫描批次状态')
}

function openSealAttentionMonitor(): void {
  if (!selectedExamId.value) return
  batchSealModalOpen.value = false
  void router.push({
    name: 'TeacherExamWorkspaceScanMonitor',
    params: { examId: selectedExamId.value },
  })
}

const examContext = useMarkExamContext()
const { selectedExamId } = examContext
const { refreshSnapshot } = useWorkspaceExamId()

/** 扫描链写操作后同步 StageRail 与本页进度。 */
async function syncScanWorkbenchState(): Promise<void> {
  await refreshSnapshot()
  mittBus.emit('scan-workbench:refresh')
}

async function onManualSupplementSuccess(): Promise<void> {
  await loadAllForExam()
  await syncScanWorkbenchState()
}

// ─── 概览统计 ─────────────────────────────
const progress = ref<MarkingProgressVO | null>(null)
const progressLoading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const hasOpenTasks = computed(() => {
  const current = progress.value
  return current ? current.openProcessingTaskCount > 0 : false
})
const liveEvents = ref<ScanLiveEventVO[]>([])
const recentEventsLoading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳

const livePendingEventTotal = computed(() =>
  liveEvents.value.filter((event) => event.status === 'PENDING').length,
)

const scannerDeviceColumns: ColumnType<ExamScannerDeviceVO>[] = [
  { title: '设备', key: 'deviceName', width: 180, ellipsis: true },
  { title: '工位', dataIndex: 'scannerStationId', key: 'scannerStationId', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: 'IP', dataIndex: 'scannerIp', key: 'scannerIp', width: 130 },
  { title: '待上传', key: 'pendingUpload', width: 90, align: 'right' },
  { title: '诊断', key: 'diagnostic', ellipsis: true },
]

const liveEventColumns: ColumnType<ScanLiveEventVO>[] = [
  { title: '状态', key: 'status', width: 90 },
  { title: '扫描仪', key: 'device', width: 180, ellipsis: true },
  { title: '页数', dataIndex: 'pageCount', key: 'pageCount', width: 70, align: 'right' },
  { title: '工位', dataIndex: 'scannerStationId', key: 'scannerStationId', width: 120 },
  { title: '时间', key: 'time', width: 100 },
]

const connectionLabel = computed(() => '最近事件快照')

function scanEventStatusLabel(status: ScanLiveEventVO['status']): string {
  return strictEnumLabel(SCAN_EVENT_STATUS_LABEL, status, '扫描事件状态')
}

function scanEventStatusTone(status: ScanLiveEventVO['status']): BadgeTone {
  return strictEnumTone(SCAN_EVENT_STATUS_TONE, status, '扫描事件状态')
}

/** 全局加载状态：任一子加载中即视为正在加载 */
const globalLoading = computed(
  () => progressLoading.value || devicesLoading.value || batchLoading.value || previewLoading.value,
)

async function loadProgress(): Promise<void> {
  if (!selectedExamId.value) return
  progressLoading.value = true
  try {
    progress.value = await getMarkingProgress(selectedExamId.value)
  } catch (error) {
    progress.value = null
    showUserError(error, '扫描进度加载失败')
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
const paperBindingColor = computed<string>(() => toneToColor(progressTone(paperBindingPercent.value)))

const { chartOption: paperBindingGaugeOption } = useChartOption(() =>
  buildGaugeChartOption(paperBindingPercent.value ?? 0, {
    label: '卷面绑定率',
    color: paperBindingColor.value,
    size: 'md',
  }),
)

const paperBindingAriaLabel = computed(() => {
  const current = progress.value
  const percent = paperBindingPercent.value ?? 0
  const detail = current
    ? `已绑定 ${current.gradablePaperCount} / ${current.paperCount} 份卷面`
    : undefined
  return formatGaugeAriaLabel('卷面绑定率', percent, detail)
})

const paperBindingGaugeBlockProps = computed(() => ({
  option: paperBindingGaugeOption.value,
  ariaLabel: paperBindingAriaLabel.value,
  gaugeSize: 'md' as const,
}))

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

const connectedDevices = computed(() => devices.value.filter(isScannerDeviceOnline))

const connectedDevicesEmptyDescription = computed(() => {
  if (devices.value.length === 0) {
    return '尚未注册扫描仪，请先在「扫描设备管理」绑定 Agent 后再刷新'
  }
  return '当前无在线扫描仪，请在扫描终端登录本考试后再刷新'
})

function deviceOnlineTone(device: ExamScannerDeviceVO): BadgeTone {
  if (device.diagnosticStatus === 'ERROR') return 'red'
  if (device.diagnosticStatus === 'WARNING') return 'orange'
  return 'green'
}

function deviceOnlineLabel(device: ExamScannerDeviceVO): string {
  if (device.diagnosticStatus === 'ERROR') return '诊断异常'
  if (device.diagnosticStatus === 'WARNING') return '诊断告警'
  return '在线'
}

// 加载失败：toast 提示，主区保持空态/列表壳

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

async function loadDevices(): Promise<void> {
  devicesLoading.value = true
  try {
    devices.value = await listActiveScannerDevices()
  } catch (error) {
    devices.value = []
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
    previewData.value = null
    pendingEventTotal.value = 0
    showUserError(error, '扫描事件预览加载失败')
  } finally {
    previewLoading.value = false
  }
}

// ─── 创建批次 ─────────────────────────────
const creating = ref(false)

async function handleCreateBatch(): Promise<void> {
  if (!selectedExamId.value || !formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!batchForm.scanWindow) return
  creating.value = true
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
    await loadRecentEventsSnapshot()
    await syncScanWorkbenchState()
  } catch (error) {
    showUserError(error, '扫描批次创建失败')
  } finally {
    creating.value = false
  }
}

// ─── 已创建批次列表 ─────────────────────────────
const batches = ref<ExamScannerBatchVO[]>([])
const batchTotal = ref(0)
const batchLoading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
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
  { title: '页数', dataIndex: 'pageCount', key: 'pageCount', width: 70 },
  { title: '落库进度', key: 'pageProgress', width: 100 },
  { title: '异常', key: 'attentionCount', width: 80 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' as const },
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

const batchSealing = ref<string | null>(null)
const batchSealModalOpen = ref(false)
const batchSealTarget = ref<ExamScannerBatchVO | null>(null)

const batchSealChecklist = computed(() =>
  batchSealTarget.value ? buildBatchSealChecklist(batchSealTarget.value) : [],
)
const batchSealBlockedReasonActive = computed(() =>
  batchSealTarget.value ? batchSealBlockedReason(batchSealTarget.value) : '',
)
const batchSealReady = computed(() => batchSealBlockedReasonActive.value === '')

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
  batchDiscardModalOpen.value = true
}

function onSealBatch(batch: ExamScannerBatchVO): void {
  if (!batch.scanBatchId || !canSealBatch(batch)) return
  batchSealTarget.value = batch
  batchSealModalOpen.value = true
}

function cancelSealBatch(): void {
  if (batchSealing.value) return
  batchSealModalOpen.value = false
  batchSealTarget.value = null
}

async function confirmSealBatch(): Promise<void> {
  const batch = batchSealTarget.value
  if (!batch?.scanBatchId) {
    cancelSealBatch()
    return
  }
  if (!canSealBatch(batch)) {
    message.warning(batchSealBlockedReason(batch) || '当前批次不满足封存条件')
    return
  }
  batchSealing.value = batch.scanBatchId
  try {
    await sealScanBatchByTeacher({ scanBatchId: batch.scanBatchId })
    message.success(`扫描批次已封存：${batch.batchNo}`)
    batchSealModalOpen.value = false
    batchSealTarget.value = null
    await Promise.all([loadBatches(), loadProgress(), loadRecentEventsSnapshot()])
    await syncScanWorkbenchState()
  } catch (error) {
    showUserError(error, '扫描批次封存失败')
  } finally {
    batchSealing.value = null
  }
}

function closeBatchDiscardModal(): void {
  if (batchDiscarding.value) return
  batchDiscardModalOpen.value = false
  batchDiscardTarget.value = null
  batchDiscardReason.value = ''
  batchDiscardReasonError.value = ''
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
    await syncScanWorkbenchState()
  } catch (error) {
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
  try {
    const request: ExamScannerBatchQueryRequest = {
      examId: selectedExamId.value,
      pageNum: batchQuery.pageNum,
      pageSize: batchQuery.pageSize,
    }
    const result = await pageScannerBatches(request)
    batches.value = readPageList(result, '扫描批次加载失败，请稍后重试')
    batchTotal.value = readPageTotal(result, '扫描批次加载失败，请稍后重试')
    if (result.pageNum != null) {
      batchQuery.pageNum = result.pageNum
    }
    if (result.pageSize != null) {
      batchQuery.pageSize = result.pageSize
    }
  } catch (error) {
    batches.value = []
    batchTotal.value = 0
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

async function loadRecentEventsSnapshot(): Promise<void> {
  if (!selectedExamId.value) {
    liveEvents.value = []
    return
  }
  recentEventsLoading.value = true
  try {
    const onlineDeviceIds = new Set(
      connectedDevices.value.map((device) => device.scannerDeviceId).filter(Boolean),
    )
    if (onlineDeviceIds.size === 0) {
      liveEvents.value = []
      return
    }
    const events = await listRecentScanEvents({
      examId: selectedExamId.value,
      limit: 8,
    })
    liveEvents.value = events.filter((event) => onlineDeviceIds.has(event.scannerDeviceId))
  }
  catch (error) {
    liveEvents.value = []
    showUserError(error, '扫描事件快照加载失败')
  }
  finally {
    recentEventsLoading.value = false
  }
}

// ─── 生命周期 ─────────────────────────────
async function loadAllForExam(): Promise<void> {
  await loadDevices()
  await Promise.all([loadBatches(1), loadProgress(), loadRecentEventsSnapshot()])
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadAllForExam()
  } else {
    progress.value = null
    batches.value = []
    batchTotal.value = 0
    liveEvents.value = []
  }
}, { immediate: true })

function onWorkbenchRefresh(): void {
  if (selectedExamId.value) {
    void loadAllForExam()
  }
}

onMounted(() => {
  mittBus.on('scan-workbench:refresh', onWorkbenchRefresh)
})

onBeforeUnmount(() => {
  mittBus.off('scan-workbench:refresh', onWorkbenchRefresh)
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

  &__progress-overview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__progress-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 280px);
    gap: 16px;
    align-items: stretch;
  }

  &__progress-panel {
    min-width: 0;
    height: 100%;

    :deep(.ui-stat-panel) {
      height: 100%;
    }

    :deep(.ui-stat-panel__list) {
      align-items: stretch;
      height: 100%;
    }

    :deep(.ui-metric-card) {
      height: 100%;
      align-items: center;
    }
  }

  &__ring-card {
    min-width: 0;
    display: flex;
    align-items: stretch;
  }

  &__ring-card :deep(.dp-card__body) {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 14px 16px;
  }

  &__ring-card :deep(.mark-gauge-block) {
    width: 100%;
  }

  @media (max-width: 900px) {
    &__progress-row {
      grid-template-columns: 1fr;
    }
  }

  &__monitor-grid {
    display: grid;
    grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
    gap: 16px;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: var(--dp-space-6, 24px);

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__section-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--dp-text-primary, #0f172a);
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
    font-weight: 600;
  }

  &__seal-intro {
    margin: 0 0 12px;
    font-size: 14px;
    line-height: 1.5;
  }

  &__seal-checklist {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__seal-checklist > li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--dp-border, #e5e7eb);
  }

  &__seal-checklist > li.is-pass {
    background: var(--ant-color-success-bg);
    border-color: var(--ant-color-success-border);
  }

  &__seal-checklist > li.is-fail {
    background: var(--ant-color-warning-bg);
    border-color: var(--dp-yellow-200);
  }

  &__seal-check-label {
    font-size: 13px;
    font-weight: 600;
  }

  &__seal-check-detail {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__seal-hint {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--dp-text-secondary, #475569);
  }
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

  .warn {
    color: var(--ant-color-warning, #faad14);
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
