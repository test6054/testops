import type { Ref } from 'vue'
import type {
  DocumentStartScanJobRequest,
  ScanJobResponse,
  ScannerBusinessScene,
} from '@/apis/mark/scanner-agent-local'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type {
  ArchiveScanBatchModeCode,
  ScanTaskKindCode,
  ScanWorkOrderDiscardRequest,
  ScanWorkOrderLifecycleVO,
} from '@/apis/mark/scanner-work-order'
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  cancelScanJob,
  deleteScanJob,
  endBatch,
  getScanJob,
  pauseScanJob,
  resumeScanJob,
  retryCommit,
  retryUpload,
  startDocumentScanJob,
} from '@/apis/mark/scanner-agent-local'
import { commitScanWorkOrder, discardScanWorkOrder } from '@/apis/mark/scanner-work-order'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { getUserErrorMessage } from '@/utils/error-handler'

const DEFAULT_OUTPUT_CONTAINER_FORMAT = 'PDF' as const
const DEFAULT_PAGE_IMAGE_FORMAT = 'PNG' as const
const DEFAULT_BLANK_PAGE_POLICY = 'BACK_BLANK' as const

export interface WorkOrderScanFlowOptions {
  taskKind: Extract<ScanTaskKindCode, 'EXAM_ARCHIVE' | 'PORTFOLIO_COLLECT'>
  businessScene: ScannerBusinessScene
  getBusinessRefId: () => string
  getArchiveBatchMode?: () => ArchiveScanBatchModeCode | undefined
  getScanConfig: () => ExamScannerScanConfigVO
  getScannerDeviceId: () => string
  getScannerStationId: () => string
  getLocalScannerId: () => string
  /** 与 session 共享 lifecycle，便于恢复 COMMITTING/FAILED 工单。 */
  lifecycle?: Ref<ScanWorkOrderLifecycleVO | null>
}

/**
 * 归档 / 档案袋 work-order 开单后的 Agent 扫描、上传、commit 与 discard 主链。
 *
 * commit 重试分工：
 * - 有 local scan job 时：统一走 Agent retryCommit（组装 container/sourceFileIds）。
 * - 档案袋工单 COMMITTING/FAILED 且无 local job：走浏览器 commitScanWorkOrder 读 DB 快照续做 quality（后端 PortfolioScanWorkOrderCommitHandler）。
 * - 考试卷 / 归档卷：无浏览器 commit 兜底，commit 失败仅 Agent 侧重试。
 */
export function useWorkOrderScanFlow(options: WorkOrderScanFlowOptions) {
  const lifecycle = options.lifecycle ?? ref<ScanWorkOrderLifecycleVO | null>(null)
  const currentJob = ref<ScanJobResponse | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const isScanning = computed(
    () => currentJob.value?.status === 'SCANNING' || currentJob.value?.status === 'PAUSED',
  )
  const isUploading = computed(
    () =>
      currentJob.value?.status === 'UPLOADING'
      || currentJob.value?.status === 'RETRYING'
      || currentJob.value?.status === 'READYTOUPLOAD',
  )
  const isReported = computed(
    () => currentJob.value?.reported === true || currentJob.value?.status === 'REPORTED',
  )
  const canEndBatch = computed(
    () => currentJob.value?.status === 'SCANNING' || currentJob.value?.status === 'PAUSED',
  )
  const canDiscard = computed(() => {
    if (!lifecycle.value?.batchExternalNo) return false
    const status = lifecycle.value.status
    if (status === 'COMMITTING' || status === 'FAILED') return true
    return !isReported.value
  })
  const canRetryUpload = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    if (job.status === 'FAILED' || job.status === 'RETRYING' || job.status === 'READYTOUPLOAD') {
      return job.scannedPages > 0 || job.uploadedPages > 0
    }
    return false
  })
  const canRetryCommit = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    const status = job.status
    if (
      status === 'SCANNING'
      || status === 'PAUSED'
      || status === 'UPLOADING'
      || status === 'CANCELLED'
      || status === 'REPORTED'
    ) {
      return false
    }
    const uploadablePages = job.pages.filter((page) => page.status !== 'DELETED')
    if (uploadablePages.length === 0 || job.uploadedPages <= 0) return false
    return uploadablePages.every(
      (page) => page.status === 'UPLOADED' && Boolean(page.uploadedFileId),
    )
  })

  const canRetryWorkOrderCommit = computed(() => {
    if (options.taskKind !== 'PORTFOLIO_COLLECT') {
      return false
    }
    const status = lifecycle.value?.status
    return (
      Boolean(lifecycle.value?.batchExternalNo) && (status === 'COMMITTING' || status === 'FAILED')
    )
  })

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function startPolling(scanJobId: string) {
    stopPolling()
    pollTimer = setInterval(() => {
      void pollJob(scanJobId)
    }, 1500)
  }

  async function pollJob(scanJobId: string) {
    try {
      currentJob.value = await getScanJob(scanJobId)
      if (currentJob.value.reported || currentJob.value.status === 'REPORTED') {
        stopPolling()
        successMessage.value = '扫描批次已提交'
      }
      if (currentJob.value.status === 'FAILED') {
        stopPolling()
      }
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '刷新扫描任务失败')
    }
  }

  async function startLocalScanAfterWorkOrder(workOrder: ScanWorkOrderLifecycleVO) {
    lifecycle.value = workOrder
    if (!workOrder.batchExternalNo || !workOrder.reportId || !workOrder.resolvedScanConfig) {
      throw new Error('扫描工单缺少 batchExternalNo、reportId 或冻结扫描参数')
    }
    const request: DocumentStartScanJobRequest = {
      taskKind: options.taskKind,
      localScannerId: options.getLocalScannerId(),
      batchExternalNo: workOrder.batchExternalNo,
      reportId: workOrder.reportId,
      businessScene: options.businessScene,
      businessRefId: options.getBusinessRefId(),
      scannerDeviceId: options.getScannerDeviceId(),
      scannerStationId: options.getScannerStationId(),
      archiveBatchMode: options.getArchiveBatchMode?.(),
      outputContainerFormat: DEFAULT_OUTPUT_CONTAINER_FORMAT,
      pageImageFormat: DEFAULT_PAGE_IMAGE_FORMAT,
      blankPagePolicy: DEFAULT_BLANK_PAGE_POLICY,
      resolvedScanConfig: workOrder.resolvedScanConfig,
    }
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await startDocumentScanJob(request)
      startPolling(currentJob.value.scanJobId)
    } finally {
      loading.value = false
    }
  }

  async function endCurrentBatch() {
    if (!currentJob.value || !canEndBatch.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await endBatch(currentJob.value.scanJobId)
      startPolling(currentJob.value.scanJobId)
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '结束批次失败')
    } finally {
      loading.value = false
    }
  }

  async function pauseCurrentJob() {
    if (!currentJob.value) return
    currentJob.value = await pauseScanJob(currentJob.value.scanJobId)
  }

  async function resumeCurrentJob() {
    if (!currentJob.value) return
    currentJob.value = await resumeScanJob(currentJob.value.scanJobId)
    startPolling(currentJob.value.scanJobId)
  }

  async function retryCurrentUpload() {
    if (!currentJob.value) return
    currentJob.value = await retryUpload(currentJob.value.scanJobId)
    startPolling(currentJob.value.scanJobId)
  }

  async function retryCurrentCommit() {
    if (!currentJob.value) return
    currentJob.value = await retryCommit(currentJob.value.scanJobId)
    startPolling(currentJob.value.scanJobId)
  }

  /** 档案袋 quality 失败后无 local job 时，凭工单 DB 快照续做 commit（非考试/归档路径）。 */
  async function retryWorkOrderCommit() {
    if (options.taskKind !== 'PORTFOLIO_COLLECT') {
      return
    }
    if (!lifecycle.value?.batchExternalNo || !canRetryWorkOrderCommit.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      lifecycle.value = await commitScanWorkOrder({
        taskKind: options.taskKind,
        batchExternalNo: lifecycle.value.batchExternalNo,
        pageCount: lifecycle.value.pageCount,
        scanEndTime: new Date().toISOString(),
      })
      if (lifecycle.value.status === 'COMMITTED') {
        successMessage.value = '扫描工单已提交'
      }
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '重试提交扫描工单失败')
    } finally {
      loading.value = false
    }
  }

  async function discardCurrentSession() {
    if (!lifecycle.value?.batchExternalNo) return
    const confirmed = await confirmAsync({
      title: '确认废弃本次扫描？',
      content: '将清除未提交页面并关闭工单，本地扫描任务一并清理。',
      type: 'error',
      okText: '废弃',
    })
    if (!confirmed) return
    loading.value = true
    errorMessage.value = ''
    try {
      if (currentJob.value && !currentJob.value.reported) {
        if (currentJob.value.status === 'SCANNING' || currentJob.value.status === 'PAUSED') {
          await cancelScanJob(currentJob.value.scanJobId)
        }
        await deleteScanJob(currentJob.value.scanJobId)
      }
      const discardRequest: ScanWorkOrderDiscardRequest = {
        taskKind: options.taskKind,
        batchExternalNo: lifecycle.value.batchExternalNo,
        scannerDeviceId: options.getScannerDeviceId(),
        scannerStationId: options.getScannerStationId(),
        discardPendingPages: true,
      }
      lifecycle.value = await discardScanWorkOrder(discardRequest)
      currentJob.value = null
      stopPolling()
      successMessage.value = '扫描工单已废弃'
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '废弃扫描失败')
    } finally {
      loading.value = false
    }
  }

  onBeforeUnmount(() => {
    stopPolling()
  })

  return {
    lifecycle,
    currentJob,
    loading,
    errorMessage,
    successMessage,
    isScanning,
    isUploading,
    isReported,
    canEndBatch,
    canDiscard,
    canRetryUpload,
    canRetryCommit,
    canRetryWorkOrderCommit,
    startLocalScanAfterWorkOrder,
    endCurrentBatch,
    pauseCurrentJob,
    resumeCurrentJob,
    retryCurrentUpload,
    retryCurrentCommit,
    retryWorkOrderCommit,
    discardCurrentSession,
    stopPolling,
  }
}
