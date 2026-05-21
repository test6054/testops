<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="scan-batch-page__context">
        <div class="scan-batch-page__context-left">
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
          <UiTag v-if="selectedExamId" :tone="pendingEventTotal > 0 ? 'orange' : 'green'" size="sm">
            待聚合 {{ pendingEventTotal }}
          </UiTag>
          <UiTag v-if="selectedExamId" tone="blue" size="sm">{{ batchTotal }} 批次</UiTag>
        </div>
        <div class="scan-batch-page__context-right">
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
        </div>
      </div>
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
                <strong>{{ progress.gradablePaperCount ?? 0 }}</strong>
                <span class="muted"> / {{ progress.paperCount ?? 0 }} 份卷面</span>
              </div>
              <div class="scan-batch-page__ring-hint">
                {{ paperBindingHint }}
              </div>
            </div>
          </div>
        </UiCard>
      </div>
      <UiCard class="info-card">
        <template #title>
          <FileTextOutlined />
          <span>按扫描仪和时间窗口创建批次</span>
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
            <a-col :xs="24" :md="12">
              <a-form-item label="批次外部编号（可选）" name="batchExternalNo">
                <a-input
                  v-model:value="batchForm.batchExternalNo"
                  placeholder="为本批次取个便于人工识别的编号，留空则用系统批次号"
                  :maxlength="100"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
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

        <!-- 预览结果 -->
        <a-divider class="divider" />
        <div v-if="previewLoaded" class="preview-section">
          <UiStatPanel :items="previewMetrics" :columns="4" variant="strip" compact />
          <UiDataTable
            v-if="(previewData?.deviceBreakdown?.length ?? 0) > 0"
            :columns="deviceBreakdownColumns"
            :data-source="previewData!.deviceBreakdown"
            :show-pagination="false"
            flat
            :total="previewData!.deviceBreakdown.length"
            row-key="scannerDeviceId"
            size="small"
            class="event-table"
          />
          <UiEmpty
            v-else-if="(previewData?.eventCount ?? 0) === 0"
            description="筛选条件下没有待聚合的扫描事件"
          />
        </div>
      </UiCard>

      <!-- D-9 错误态：扫描批次加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="batchesLoadError"
        :error="batchesLoadError"
        title="扫描批次加载失败"
        :helper="`考试 ID：${selectedExamId}`"
        compact
        @retry="() => loadBatches(1)"
      />
      <UiCard v-else class="info-card">
        <template #title>
          <UnorderedListOutlined />
          <span>已创建批次</span>
          <UiBadge tone="blue">{{ batchTotal }} 个</UiBadge>
        </template>
        <template #extra>
          <UiButton size="sm" variant="outline" :loading="batchLoading" @click="loadBatches(1)">
            <template #icon>
              <ReloadOutlined />
            </template>
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
          flat
          @page-change="onBatchPageChange"
          row-key="scanBatchId"
          size="small"
          class="batch-table"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'batchNo'">
              <a-typography-text strong :content="batches[index].batchNo || '-'" />
              <div
                v-if="
                  batches[index].batchExternalNo
                    && batches[index].batchExternalNo !== batches[index].batchNo
                "
                class="muted"
              >
                外部编号：{{ batches[index].batchExternalNo }}
              </div>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="batchStatusTone(batches[index])" size="sm">
                {{ batchStatusLabel(batches[index]) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'scanWindow'">
              <div>{{ formatTime(batches[index].scanStartTime) }}</div>
              <div class="muted">至 {{ formatTime(batches[index].scanEndTime) }}</div>
            </template>
            <template v-else-if="column.key === 'eventCount'">
              {{ batches[index].eventCount ?? '-' }} 条
            </template>
            <template v-else-if="column.key === 'fileCount'">
              {{ batches[index].sourceFileIds?.length ?? 0 }} 份
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard class="info-card">
        <template #title>
          <ThunderboltOutlined />
          <span>快捷入口</span>
        </template>
        <a-space wrap>
          <UiButton size="sm" variant="outline" @click="goAttention">
            <template #icon>
              <WarningOutlined />
            </template>
            扫描异常待办
          </UiButton>
          <UiButton size="sm" variant="outline" @click="goAssignment">
            <template #icon>
              <TeamOutlined />
            </template>
            分派批阅
          </UiButton>
          <UiButton size="sm" variant="outline" @click="goProgress">
            <template #icon>
              <LineChartOutlined />
            </template>
            进度看板
          </UiButton>
          <UiButton size="sm" variant="outline" @click="goScoreFinalize">
            <template #icon>
              <CheckCircleOutlined />
            </template>
            成绩确认
          </UiButton>
        </a-space>
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamScannerBatchCreatePayload,
  ExamScannerBatchPreviewVO,
  ExamScannerBatchQueryPayload,
  ExamScannerBatchVO,
  MarkingProgressVO,
  ScanBatchStatusCode,
} from '@/apis/mark/exam'
import type { ExamScannerDeviceVO } from '@/apis/mark/exam-mark-scanner'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import LineChartOutlined from '@ant-design/icons-vue/LineChartOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import UnorderedListOutlined from '@ant-design/icons-vue/UnorderedListOutlined'
import WarningOutlined from '@ant-design/icons-vue/WarningOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  createScanBatchByCondition,
  getMarkingProgress,
  pageScannerBatches,
  previewScanBatchAggregation,
} from '@/apis/mark/exam'
import { listScannerDevices } from '@/apis/mark/exam-mark-scanner'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiRingProgress,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

defineOptions({ name: 'TeacherScanUpload' })

type ToneCode = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

const BATCH_STATUS_LABEL: Record<ScanBatchStatusCode, string> = {
  RECEIVED: '已接收',
  BLOCKED: '已阻断',
  BOUND: '已绑定',
  COMPLETED: '已完成',
}

const BATCH_STATUS_TONE: Record<ScanBatchStatusCode, ToneCode> = {
  RECEIVED: 'blue',
  BLOCKED: 'red',
  BOUND: 'green',
  COMPLETED: 'green',
}

// helper 严格 typed 接收后端 API 对象 ExamScannerBatchVO。
// ExamScannerBatchVO.status: ScanBatchStatusCode | undefined 本身已严格枚举，只需处理 undefined。
function batchStatusTone(batch: ExamScannerBatchVO): ToneCode {
  return batch.status ? BATCH_STATUS_TONE[batch.status] : 'gray'
}

function batchStatusLabel(batch: ExamScannerBatchVO): string {
  if (batch.statusMessage) return batch.statusMessage
  if (batch.status) return BATCH_STATUS_LABEL[batch.status]
  return '-'
}

const router = useRouter()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 概览统计 ─────────────────────────────
const progress = ref<MarkingProgressVO | null>(null)
const progressLoading = ref(false)
const hasOpenTasks = computed(() => (progress.value?.openProcessingTaskCount ?? 0) > 0)
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
    const errMsg = error instanceof Error ? error.message : '阅卷进度加载失败'
    message.error(errMsg)
  } finally {
    progressLoading.value = false
  }
}

const progressMetrics = computed(() => {
  const scanAttention = progress.value?.scanAttentionCount ?? 0
  return [
    { label: '已创建批次', value: batchTotal.value, unit: '个', tone: 'blue' as const },
    {
      label: '待聚合事件',
      value: pendingEventTotal.value,
      unit: '条',
      tone: pendingEventTotal.value > 0 ? ('orange' as const) : ('green' as const),
    },
    {
      label: '待处理任务',
      value: progress.value?.openProcessingTaskCount ?? 0,
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
  const total = progress.value?.paperCount ?? 0
  const ok = progress.value?.gradablePaperCount ?? 0
  if (total <= 0) return null
  return Math.round((ok / total) * 100)
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

const previewMetrics = computed(() => [
  {
    label: '待聚合事件',
    value: previewData.value?.eventCount ?? 0,
    unit: '条',
    tone: (previewData.value?.eventCount ?? 0) > 0 ? ('orange' as const) : ('gray' as const),
  },
  {
    label: '覆盖文件数',
    value: previewData.value?.fileCount ?? 0,
    unit: '份',
    tone: 'blue' as const,
  },
  {
    label: '累计页数',
    value: previewData.value?.pageCount ?? 0,
    unit: '页',
    tone: 'blue' as const,
  },
  { label: '时间跨度', value: previewTimeSpan.value, tone: 'gray' as const },
])

// ─── 扫描设备列表 ─────────────────────────────
const devices = ref<ExamScannerDeviceVO[]>([])
const devicesLoading = ref(false)
const devicesLoadError = ref('')

const deviceSelectOptions = computed(() =>
  devices.value
    .filter((d) => !!d.scannerDeviceId)
    .map((d) => ({
      value: d.scannerDeviceId!,
      label: d.scannerIp
        ? `${d.deviceName || d.scannerDeviceId} (${d.scannerIp})`
        : d.deviceName || d.scannerDeviceId!,
    })),
)

async function loadDevices(): Promise<void> {
  devicesLoading.value = true
  devicesLoadError.value = ''
  try {
    devices.value = await listScannerDevices()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '扫描设备列表加载失败'
    devicesLoadError.value = errMsg
    message.error(errMsg)
  } finally {
    devicesLoading.value = false
  }
}

// ─── 批次创建表单 ─────────────────────────────
const formRef = ref<FormInstance>()
const batchForm = reactive<{
  scannerDeviceIds: string[]
  scanWindow?: [string, string]
  batchExternalNo?: string
}>({
  scannerDeviceIds: [],
  scanWindow: undefined,
  batchExternalNo: '',
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
const previewTimeSpan = ref('-')

const deviceBreakdownColumns: ColumnType[] = [
  {
    title: '设备ID',
    dataIndex: 'scannerDeviceId',
    key: 'scannerDeviceId',
    width: 200,
    ellipsis: true,
  },
  { title: 'IP', dataIndex: 'scannerIp', key: 'scannerIp', width: 160 },
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
    const payload: ExamScannerBatchCreatePayload = {
      examId: selectedExamId.value,
      scannerDeviceIds: batchForm.scannerDeviceIds,
      scanStartTime: batchForm.scanWindow[0],
      scanEndTime: batchForm.scanWindow[1],
    }
    const result = await previewScanBatchAggregation(payload)
    previewData.value = result
    pendingEventTotal.value = result.eventCount ?? 0
    // 时间跨度
    if (result.scanStartTime && result.scanEndTime) {
      previewTimeSpan.value = `${dayjs(result.scanStartTime).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(result.scanEndTime).format('YYYY-MM-DD HH:mm')}`
    } else {
      previewTimeSpan.value = '-'
    }
    previewLoaded.value = true
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '聚合预览查询失败'
    message.error(errMsg)
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
    const payload: ExamScannerBatchCreatePayload = {
      examId: selectedExamId.value,
      scannerDeviceIds: batchForm.scannerDeviceIds,
      scanStartTime: batchForm.scanWindow[0],
      scanEndTime: batchForm.scanWindow[1],
      batchExternalNo: batchForm.batchExternalNo?.trim() || undefined,
    }
    const result = await createScanBatchByCondition(payload)
    message.success(
      `批次创建成功：聚合 ${result.eventCount ?? 0} 条事件 / ${result.fileCount ?? 0} 份文件 / ${result.pageCount ?? 0} 页`,
    )
    // 重置表单 + 重新加载批次
    previewLoaded.value = false
    previewData.value = null
    pendingEventTotal.value = 0
    batchForm.batchExternalNo = ''
    await loadBatches(1)
    await loadProgress()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '扫描批次创建失败'
    message.error(errMsg)
  } finally {
    creating.value = false
  }
}

// ─── 已创建批次列表 ─────────────────────────────
const batches = ref<ExamScannerBatchVO[]>([])
const batchTotal = ref(0)
const batchLoading = ref(false)
const batchesLoadError = ref<unknown>(null)
const batchQuery = reactive<{ pageNum: number, pageSize: number }>({
  pageNum: 1,
  pageSize: 10,
})

const batchColumns: ColumnType<ExamScannerBatchVO>[] = [
  { title: '批次号', key: 'batchNo', width: 240 },
  { title: '状态', key: 'status', width: 110 },
  {
    title: '主扫描设备',
    dataIndex: 'scannerDeviceId',
    key: 'scannerDeviceId',
    width: 150,
    ellipsis: true,
  },
  { title: '扫描时间窗', key: 'scanWindow', width: 220 },
  { title: '事件数', key: 'eventCount', width: 90 },
  { title: '文件数', key: 'fileCount', width: 90 },
  { title: '页数', dataIndex: 'pageCount', key: 'pageCount', width: 80 },
]

async function loadBatches(pageNum?: number): Promise<void> {
  if (!selectedExamId.value) return
  if (pageNum) batchQuery.pageNum = pageNum
  batchLoading.value = true
  batchesLoadError.value = null
  try {
    const payload: ExamScannerBatchQueryPayload = {
      examId: selectedExamId.value,
      pageNum: batchQuery.pageNum,
      pageSize: batchQuery.pageSize,
    }
    const result = await pageScannerBatches(payload)
    if (!Array.isArray(result.list)) {
      const error = new TypeError('扫描批次列表接口返回格式错误')
      batches.value = []
      batchTotal.value = 0
      batchesLoadError.value = error
      message.error(error.message)
      return
    }
    batches.value = result.list
    batchTotal.value = result.total ?? 0
  } catch (error) {
    batchesLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '扫描批次列表加载失败'
    message.error(errMsg)
  } finally {
    batchLoading.value = false
  }
}

function onBatchPageChange(payload: { current: number, pageSize: number }): void {
  batchQuery.pageNum = payload.current
  batchQuery.pageSize = payload.pageSize
  void loadBatches()
}

// ─── 工具函数 ─────────────────────────────
function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

// ─── 快捷入口 ─────────────────────────────
function goAttention(): void {
  if (!selectedExamId.value) return
  void router.push({ name: 'TeacherScanAttention', query: { examId: selectedExamId.value } })
}

function goAssignment(): void {
  if (!selectedExamId.value) return
  void router.push({ name: 'TeacherReviewAssignment', query: { examId: selectedExamId.value } })
}

function goProgress(): void {
  if (!selectedExamId.value) return
  void router.push({ name: 'TeacherReviewProgress', query: { examId: selectedExamId.value } })
}

function goScoreFinalize(): void {
  if (!selectedExamId.value) return
  void router.push({ name: 'TeacherScoreFinalize', query: { examId: selectedExamId.value } })
}

// ─── 生命周期 ─────────────────────────────
async function loadAllForExam(): Promise<void> {
  await Promise.all([loadDevices(), loadBatches(1), loadProgress()])
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadAllForExam()
  } else {
    progress.value = null
    batches.value = []
    batchTotal.value = 0
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadAllForExam()
  }
})
</script>

<style lang="scss" scoped>
.scan-batch-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    flex-shrink: 0;
  }

  &__exam-select {
    width: 280px;
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

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
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
</style>
