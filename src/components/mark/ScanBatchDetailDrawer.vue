<template>
  <UiDrawer
    :open="open"
    :title="drawerTitle"
    width="720"
    hide-footer
    @update:open="emit('update:open', $event)"
  >
    <a-spin :spinning="detailLoading">
      <UiEmpty v-if="!batchDetail && !detailLoading" description="扫描批次详情加载失败" />

      <template v-else-if="batchDetail">
        <UiSectionTabs
          v-model="activeTab"
          :items="tabItems"
          compact
          class="scan-batch-detail__tabs"
        >
          <section v-if="activeTab === 'overview'" class="scan-batch-detail__panel">
            <dl class="scan-batch-detail__meta">
              <div>
                <dt>批次号</dt>
                <dd>{{ batchDetail.batchNo }}</dd>
              </div>
              <div v-if="batchDetail.batchExternalNo">
                <dt>外部批次号</dt>
                <dd>{{ batchDetail.batchExternalNo }}</dd>
              </div>
              <div>
                <dt>状态</dt>
                <dd>
                  <UiTag :tone="batchStatusTone(batchDetail)" size="sm">
                    {{ batchStatusLabel(batchDetail) }}
                  </UiTag>
                </dd>
              </div>
              <div>
                <dt>扫描设备</dt>
                <dd>
                  {{ batchDetail.scannerDeviceId || '—' }} ·
                  {{ batchDetail.scannerStationId || '—' }}
                </dd>
              </div>
              <div>
                <dt>扫描时间</dt>
                <dd>
                  {{ formatDateTimeWithSeconds(batchDetail.scanStartTime) }} 至
                  {{ formatDateTimeWithSeconds(batchDetail.scanEndTime) }}
                </dd>
              </div>
              <div>
                <dt>事件数</dt>
                <dd>{{ batchDetail.eventCount }} 条</dd>
              </div>
              <div>
                <dt>来源文件</dt>
                <dd>{{ batchDetail.sourceFileCount }} 份</dd>
              </div>
              <div>
                <dt>落库进度</dt>
                <dd>{{ batchDetail.receivedPageCount ?? 0 }} / {{ batchDetail.pageCount }} 页</dd>
              </div>
              <div>
                <dt>异常项</dt>
                <dd>{{ batchDetail.attentionItemCount ?? 0 }} 项</dd>
              </div>
              <div>
                <dt>顺序审计</dt>
                <dd>
                  <UiTag v-if="batchDetail.orderAuditPassed === false" tone="red" size="sm">
                    {{ batchDetail.orderAuditIssueCount ?? 0 }} 项异常
                  </UiTag>
                  <UiTag v-else-if="batchDetail.orderAuditPassed === true" tone="green" size="sm">
                    通过
                  </UiTag>
                  <span v-else class="muted">待审计</span>
                </dd>
              </div>
              <div v-if="batchDetail.diagnostic">
                <dt>诊断</dt>
                <dd>{{ batchDetail.diagnostic }}</dd>
              </div>
            </dl>
          </section>

          <section v-else-if="activeTab === 'pages'" class="scan-batch-detail__panel">
            <UiDataTable
              v-model:current="pageQuery.pageNum"
              v-model:page-size="pageQuery.pageSize"
              :columns="pageColumns"
              :data-source="pages"
              :loading="pagesLoading"
              :total="pageTotal"
              row-key="pageId"
              size="small"
              flat
              empty-description="该批次暂无扫描页"
              @page-change="onPageChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'qualityStatus'">
                  <UiTag
                    :tone="
                      strictEnumTone(QUALITY_DECISION_TONE, record.qualityStatus, '扫描页质量判定')
                    "
                    size="sm"
                  >
                    {{
                      strictEnumLabel(
                        QualityDecisionDescription,
                        record.qualityStatus,
                        '扫描页质量判定',
                      )
                    }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'effectiveStatus'">
                  <UiTag tone="gray" size="sm">
                    {{
                      strictEnumLabel(
                        EffectiveStatusDescription,
                        record.effectiveStatus,
                        '扫描页生效状态',
                      )
                    }}
                  </UiTag>
                </template>
              </template>
            </UiDataTable>
          </section>

          <section v-else-if="activeTab === 'sources'" class="scan-batch-detail__panel">
            <UiEmpty v-if="!batchDetail.sourceFiles?.length" description="该批次暂无扫描原件记录" />
            <a-list v-else size="small" :data-source="batchDetail.sourceFiles">
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
          </section>

          <section v-else-if="activeTab === 'attentions'" class="scan-batch-detail__panel">
            <UiDataTable
              v-model:current="attentionQuery.pageNum"
              v-model:page-size="attentionQuery.pageSize"
              :columns="attentionColumns"
              :data-source="attentions"
              :loading="attentionsLoading"
              :total="attentionTotal"
              row-key="id"
              size="small"
              flat
              empty-description="该批次暂无扫描异常"
              @page-change="onAttentionPageChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'attentionType'">
                  <UiTag
                    :tone="
                      strictEnumTone(SCAN_ATTENTION_TYPE_TONE, record.attentionType, '扫描异常类型')
                    "
                    size="sm"
                  >
                    {{
                      strictEnumLabel(
                        ScanAttentionTypeDescription,
                        record.attentionType,
                        '扫描异常类型',
                      )
                    }}
                  </UiTag>
                </template>
              </template>
            </UiDataTable>
          </section>

          <section v-else-if="activeTab === 'supplement'" class="scan-batch-detail__panel">
            <p class="scan-batch-detail__hint">
              教师 Web 端仅支持在已 commit 批次内指定页补扫，设备与批次上下文自动锁定。
            </p>
            <UiButton size="sm" :disabled="!canSupplement" @click="supplementModalOpen = true">
              打开补扫表单
            </UiButton>
            <p v-if="supplementBlockReason" class="scan-batch-detail__warn muted">
              {{ supplementBlockReason }}
            </p>
          </section>

          <section v-else-if="activeTab === 'dispose'" class="scan-batch-detail__panel">
            <div class="scan-batch-detail__actions">
              <UiButton
                v-if="batchDetail.orderAuditPassed === false"
                size="sm"
                variant="outline"
                @click="openOrderAudit"
              >
                查看顺序诊断
              </UiButton>
              <UiButton
                v-if="batchDetail.status === 'BLOCKED'"
                size="sm"
                variant="outline"
                :loading="pageRegisterRetrying"
                @click="onRetryPageRegister"
              >
                重试页登记
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!canSealBatch(batchDetail) || sealing"
                :title="batchSealBlockedReason(batchDetail) || '封存批次'"
                :loading="sealing"
                @click="onSealBatch"
              >
                {{ batchDetail.sealedTime ? '已封存' : '封存批次' }}
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                status="danger"
                :disabled="
                  batchDetail.status === 'DISCARDED'
                    || Boolean(batchDetail.sealedTime)
                    || discarding
                "
                :loading="discarding"
                @click="onDiscardBatch"
              >
                {{ batchDetail.status === 'DISCARDED' ? '已废弃' : '废弃批次' }}
              </UiButton>
            </div>
            <UiAlertStrip
              v-if="batchDetail.orderAuditPassed === false"
              tone="error"
              :closable="false"
              dense
              title="顺序审计未通过"
              :description="`存在 ${batchDetail.orderAuditIssueCount ?? 0} 项顺序异常，封存已阻断`"
              class="scan-batch-detail__alert"
            />
          </section>
        </UiSectionTabs>
      </template>
    </a-spin>

    <UiDrawer
      v-model:open="orderAuditDrawerOpen"
      :title="orderAuditDrawerTitle"
      width="560"
      hide-footer
    >
      <UiEmpty
        v-if="!orderAuditLoading && !orderAuditDetail?.issues?.length"
        description="暂无顺序审计异常"
      />
      <UiDataTable
        v-else
        pagination-mode="none"
        :columns="orderAuditIssueColumns"
        :data-source="orderAuditDetail?.issues ?? []"
        :loading="orderAuditLoading"
        :show-pagination="false"
        flat
        :total="orderAuditDetail?.issues?.length ?? 0"
        row-key="message"
        size="small"
      />
    </UiDrawer>

    <ScanBatchDiscardDialog
      v-model:open="discardModalOpen"
      :confirm-loading="discarding"
      @confirm="confirmDiscardBatch"
    />

    <ScanBatchSupplementModal
      v-model:open="supplementModalOpen"
      :exam-id="examId"
      :batch="batchDetail"
      @success="handleSupplementSuccess"
    />
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamFileRefVO } from '@/apis/mark/exam'
import type {
  ExamScannerBatchPageItemVO,
  ExamScannerBatchResponse,
  ScanAttentionItemResponse,
  ScanBatchOrderAuditIssueResponse,
  ScanBatchOrderAuditResponse,
} from '@/apis/mark/exam-scan'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { EffectiveStatusDescription } from '@/apis/mark/effective-status'
import {
  getScanBatchOrderAudit,
  getScannerBatchDetail,
  listScanAttentions,
  pageScannerBatchPages,
  QUALITY_DECISION_TONE,
  QualityDecisionDescription,
  retryScanBatchPageRegister,
  SCAN_ATTENTION_TYPE_TONE,
  SCAN_BATCH_STATUS_TONE,
  ScanAttentionTypeDescription,
  ScanBatchOrderAuditDescription,
  ScanBatchStatusDescription,
  sealScanBatchByTeacher,
} from '@/apis/mark/exam-scan'
import { discardScanJob, listScanJobs } from '@/apis/mark/scanner-agent-local'
import { discardScannerKioskBatch } from '@/apis/mark/scanner-kiosk'
import ScanBatchDiscardDialog from '@/components/mark/ScanBatchDiscardDialog.vue'
import ScanBatchSupplementModal from '@/components/mark/ScanBatchSupplementModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useWorkspaceConfidentialContext } from '@/composables/useWorkspaceConfidentialContext'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { formatDateTimeWithSeconds } from '@/utils/format'
import {
  batchSealBlockedReason,
  canSealBatch,
  formatBatchSealConfirmContent,
} from '@/utils/scan-batch-seal'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ScanBatchDetailDrawer' })

const props = defineProps<{
  open: boolean
  examId: string
  scanBatchId: string | null
  batchSummary: ExamScannerBatchResponse | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "updated": []
}>()

const { isExamConfidential } = useWorkspaceConfidentialContext()

const activeTab = ref('overview')
const batchDetail = ref<ExamScannerBatchResponse | null>(null)
const detailLoading = ref(false)

const pages = ref<ExamScannerBatchPageItemVO[]>([])
const pageTotal = ref(0)
const pagesLoading = ref(false)
const pageQuery = reactive({ pageNum: 1, pageSize: 10 })

const attentions = ref<ScanAttentionItemResponse[]>([])
const attentionTotal = ref(0)
const attentionsLoading = ref(false)
const attentionQuery = reactive({ pageNum: 1, pageSize: 10 })

const sourceFileDownloading = ref<string | null>(null)
const pageRegisterRetrying = ref(false)
const sealing = ref(false)
const discarding = ref(false)
const discardModalOpen = ref(false)
const supplementModalOpen = ref(false)

const orderAuditDrawerOpen = ref(false)
const orderAuditLoading = ref(false)
const orderAuditDetail = ref<ScanBatchOrderAuditResponse | null>(null)

const drawerTitle = computed(() => {
  const batch = batchDetail.value ?? props.batchSummary
  if (!batch) {
    return '扫描批次详情'
  }
  return `扫描批次 · ${batch.batchNo}`
})

const orderAuditDrawerTitle = computed(() => {
  const batch = batchDetail.value
  if (!batch) {
    return '批次顺序诊断'
  }
  return `批次顺序诊断 · ${batch.batchNo}`
})

const tabItems = computed(() => [
  { key: 'overview', label: '概览' },
  { key: 'pages', label: '扫描页', count: batchDetail.value?.pageCount },
  { key: 'sources', label: '扫描原件', count: batchDetail.value?.sourceFileCount },
  { key: 'attentions', label: '异常', count: batchDetail.value?.attentionItemCount },
  { key: 'supplement', label: '补扫' },
  { key: 'dispose', label: '处置' },
])

const canSupplement = computed(() => {
  const batch = batchDetail.value
  if (!batch) {
    return false
  }
  if (batch.status === 'DISCARDED' || batch.sealedTime) {
    return false
  }
  return Boolean(batch.scannerDeviceId && batch.scannerStationId)
})

const supplementBlockReason = computed(() => {
  const batch = batchDetail.value
  if (!batch) {
    return ''
  }
  if (batch.sealedTime) {
    return '批次已封存，不可补扫'
  }
  if (batch.status === 'DISCARDED') {
    return '批次已废弃，不可补扫'
  }
  if (!batch.scannerDeviceId || !batch.scannerStationId) {
    return '批次缺少扫描设备信息，不可补扫'
  }
  return ''
})

const pageColumns: ColumnType<ExamScannerBatchPageItemVO>[] = [
  { title: '进纸序', dataIndex: 'pageSeq', key: 'pageSeq', width: 72 },
  { title: '模板页', dataIndex: 'templatePageNo', key: 'templatePageNo', width: 72 },
  { title: '质量', key: 'qualityStatus', width: 100 },
  { title: '生效状态', key: 'effectiveStatus', width: 100 },
  { title: '诊断', dataIndex: 'diagnostic', key: 'diagnostic', ellipsis: true },
]

const attentionColumns: ColumnType<ScanAttentionItemResponse>[] = [
  { title: '类型', key: 'attentionType', width: 120 },
  { title: '来源', dataIndex: 'sourceDisplayName', key: 'sourceDisplayName', ellipsis: true },
  { title: '页', dataIndex: 'pageDisplayName', key: 'pageDisplayName', width: 120 },
  { title: '诊断', dataIndex: 'diagnostic', key: 'diagnostic', ellipsis: true },
]

const orderAuditIssueColumns: ColumnType<ScanBatchOrderAuditIssueResponse>[] = [
  {
    title: '异常码',
    key: 'auditCode',
    width: 140,
    customRender: ({ record }) =>
      strictEnumLabel(ScanBatchOrderAuditDescription, record.auditCode, '顺序审计异常码'),
  },
  { title: '说明', dataIndex: 'message', key: 'message', ellipsis: true },
  { title: '进纸序', dataIndex: 'pageSeq', key: 'pageSeq', width: 72 },
  { title: '模板页', dataIndex: 'templatePageNo', key: 'templatePageNo', width: 72 },
]

function batchStatusTone(batch: ExamScannerBatchResponse): BadgeTone {
  if (batch.sealedTime) {
    return 'green'
  }
  return strictEnumTone(SCAN_BATCH_STATUS_TONE, batch.status, '扫描批次状态')
}

function batchStatusLabel(batch: ExamScannerBatchResponse): string {
  if (batch.sealedTime) {
    return '已封存'
  }
  return strictEnumLabel(ScanBatchStatusDescription, batch.status, '扫描批次状态')
}

async function loadDetail(): Promise<void> {
  if (!props.examId || !props.scanBatchId) {
    batchDetail.value = null
    return
  }
  detailLoading.value = true
  try {
    batchDetail.value = await getScannerBatchDetail({
      examId: props.examId,
      scanBatchId: props.scanBatchId,
    })
  } catch (error) {
    batchDetail.value = null
    showUserError(error, '扫描批次详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function loadPages(): Promise<void> {
  if (!props.examId || !props.scanBatchId) {
    pages.value = []
    pageTotal.value = 0
    return
  }
  pagesLoading.value = true
  try {
    const result = await pageScannerBatchPages({
      examId: props.examId,
      scanBatchId: props.scanBatchId,
      pageNum: pageQuery.pageNum,
      pageSize: pageQuery.pageSize,
    })
    pages.value = result.list
    pageTotal.value = result.total
  } catch (error) {
    pages.value = []
    pageTotal.value = 0
    showUserError(error, '扫描页列表加载失败')
  } finally {
    pagesLoading.value = false
  }
}

async function loadAttentions(): Promise<void> {
  if (!props.examId || !props.scanBatchId) {
    attentions.value = []
    attentionTotal.value = 0
    return
  }
  attentionsLoading.value = true
  try {
    const result = await listScanAttentions({
      examId: props.examId,
      scanBatchId: props.scanBatchId,
      pageNum: attentionQuery.pageNum,
      pageSize: attentionQuery.pageSize,
    })
    attentions.value = result.list
    attentionTotal.value = result.total
  } catch (error) {
    attentions.value = []
    attentionTotal.value = 0
    showUserError(error, '扫描异常列表加载失败')
  } finally {
    attentionsLoading.value = false
  }
}

function onPageChange(page: { current: number, pageSize: number }): void {
  pageQuery.pageNum = page.current
  pageQuery.pageSize = page.pageSize
  void loadPages()
}

function onAttentionPageChange(page: { current: number, pageSize: number }): void {
  attentionQuery.pageNum = page.current
  attentionQuery.pageSize = page.pageSize
  void loadAttentions()
}

async function downloadBatchSourceFile(file: ExamFileRefVO): Promise<void> {
  if (isExamConfidential.value) {
    const confirmed = await confirmAsync({
      title: '下载涉密扫描原件',
      content: '该考试为涉密场次，下载扫描原件将留存操作记录。确认继续下载？',
      type: 'error',
      okText: '确认下载',
      cancelText: '取消',
    })
    if (!confirmed) {
      return
    }
  }
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

async function openOrderAudit(): Promise<void> {
  const batch = batchDetail.value
  if (!batch?.scanBatchId || !props.examId) {
    return
  }
  orderAuditDrawerOpen.value = true
  orderAuditLoading.value = true
  orderAuditDetail.value = null
  try {
    orderAuditDetail.value = await getScanBatchOrderAudit({
      examId: props.examId,
      scanBatchId: batch.scanBatchId,
    })
  } catch (error) {
    showUserError(error, '加载顺序诊断失败')
  } finally {
    orderAuditLoading.value = false
  }
}

async function onRetryPageRegister(): Promise<void> {
  const batch = batchDetail.value
  if (!batch?.scanBatchId || !props.examId || batch.status !== 'BLOCKED') {
    return
  }
  pageRegisterRetrying.value = true
  try {
    const response = await retryScanBatchPageRegister({
      examId: props.examId,
      scanBatchId: batch.scanBatchId,
    })
    if (response.pageRegisterBlocked) {
      message.warning(response.pageRegisterDiagnostic ?? '页登记仍被阻断')
    } else {
      message.success('页登记重试成功')
    }
    await refreshAll()
  } catch (error) {
    showUserError(error, '页登记重试失败')
  } finally {
    pageRegisterRetrying.value = false
  }
}

function onSealBatch(): void {
  const batch = batchDetail.value
  if (!batch?.scanBatchId || !canSealBatch(batch)) {
    return
  }
  void confirmAsync({
    title: '封存扫描批次',
    content: formatBatchSealConfirmContent(batch),
    okText: '确认封存',
    cancelText: '取消',
    type: 'warning',
    width: 520,
    onOk: async () => {
      if (!batch.scanBatchId || !canSealBatch(batch)) {
        message.warning(batchSealBlockedReason(batch) || '当前批次不满足封存条件')
        return false
      }
      sealing.value = true
      try {
        await sealScanBatchByTeacher({ scanBatchId: batch.scanBatchId })
        message.success(`扫描批次已封存：${batch.batchNo}`)
        await refreshAll()
      } catch (error) {
        showUserError(error, '扫描批次封存失败')
        return false
      } finally {
        sealing.value = false
      }
    },
  })
}

function onDiscardBatch(): void {
  const batch = batchDetail.value
  if (!batch?.scanBatchId) {
    return
  }
  if (batch.status === 'DISCARDED') {
    message.info('批次已废弃，无需重复操作')
    return
  }
  if (batch.sealedTime) {
    message.warning('批次已封存，禁止废弃；请联系扫描终审角色解封后再处置')
    return
  }
  discardModalOpen.value = true
}

async function cleanupLocalAgentScanJobForDiscardedBatch(
  batch: ExamScannerBatchResponse,
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

async function confirmDiscardBatch(trimmed: string): Promise<void> {
  const batch = batchDetail.value
  if (!batch?.scanBatchId) {
    discardModalOpen.value = false
    return
  }
  discarding.value = true
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
    discardModalOpen.value = false
    await refreshAll()
  } catch (error) {
    showUserError(error, '扫描批次废弃失败')
  } finally {
    discarding.value = false
  }
}

async function handleSupplementSuccess(): Promise<void> {
  await refreshAll()
}

async function refreshAll(): Promise<void> {
  await loadDetail()
  if (activeTab.value === 'pages') {
    await loadPages()
  }
  if (activeTab.value === 'attentions') {
    await loadAttentions()
  }
  emit('updated')
}

watch(
  () => [props.open, props.scanBatchId, props.examId],
  ([open, scanBatchId]) => {
    if (open && scanBatchId) {
      activeTab.value = 'overview'
      pageQuery.pageNum = 1
      attentionQuery.pageNum = 1
      batchDetail.value = props.batchSummary
      void loadDetail()
    }
  },
)

watch(activeTab, (tab) => {
  if (!props.open) {
    return
  }
  if (tab === 'pages') {
    void loadPages()
  } else if (tab === 'attentions') {
    void loadAttentions()
  }
})
</script>

<style lang="scss" scoped>
.scan-batch-detail__tabs {
  margin-top: -8px;
}

.scan-batch-detail__panel {
  padding-top: 12px;
}

.scan-batch-detail__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  margin: 0;

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  dt {
    margin: 0;
    color: var(--ant-color-text-tertiary);
    font-size: 12px;
  }

  dd {
    margin: 0;
    font-size: 14px;
  }
}

.scan-batch-detail__hint {
  margin: 0 0 12px;
  color: var(--ant-color-text-secondary);
  font-size: 14px;
}

.scan-batch-detail__warn {
  margin-top: 12px;
}

.scan-batch-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scan-batch-detail__alert {
  margin-top: 12px;
}

.muted {
  color: var(--ant-color-text-tertiary);
}
</style>
