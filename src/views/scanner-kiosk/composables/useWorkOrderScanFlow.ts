import type { Ref } from 'vue'
import type {
  DocumentStartScanJobRequest,
  ScanJobResponse,
  ScannerBusinessSceneCode,
} from '@/apis/mark/scanner-agent-local'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type {
  ArchiveScanBatchModeCode,
  ScanWorkOrderDiscardRequest,
  ScanWorkOrderLifecycleVO,
} from '@/apis/mark/scanner-work-order'
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  cancelScanJob,
  deleteScanJob,
  endBatch,
  getScanJob,
  LocalScanJobStatusCode,
  LocalScanPageStatusCode,
  pauseScanJob,
  resumeScanJob,
  retryCommit,
  retryUpload,
  ScannerBlankPagePolicyCode,
  ScannerOutputContainerFormat,
  ScannerPageImageFormat,
  startDocumentScanJob,
} from '@/apis/mark/scanner-agent-local'
import { commitScanWorkOrder, discardScanWorkOrder } from '@/apis/mark/scanner-work-order'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { ScanWorkOrderStatusCode } from '@/types/enums/scan-work-order-status-enum'
import { getUserErrorMessage } from '@/utils/error-handler'

export interface WorkOrderScanFlowOptions {
  taskKind: ScanTaskKindCode
  businessScene: ScannerBusinessSceneCode
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
 * - 档案袋 / 归档 MERGED 工单 COMMITTING/FAILED 且无 local job：走浏览器 commitScanWorkOrder 读 DB 快照续做（后端分阶段 commit）。
 * - 考试卷 PER_PAGE：无浏览器 commit 兜底，commit 失败仅 Agent 侧重试。
 */
export function useWorkOrderScanFlow(options: WorkOrderScanFlowOptions) {
  const lifecycle = options.lifecycle ?? ref<ScanWorkOrderLifecycleVO | null>(null)
  const currentJob = ref<ScanJobResponse | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const isScanning = computed(
    () => currentJob.value?.status === LocalScanJobStatusCode.SCANNING
      || currentJob.value?.status === LocalScanJobStatusCode.PAUSED,
  )
  const isUploading = computed(
    () =>
      currentJob.value?.status === LocalScanJobStatusCode.UPLOADING
      || currentJob.value?.status === LocalScanJobStatusCode.RETRYING
      || currentJob.value?.status === LocalScanJobStatusCode.READYTOUPLOAD,
  )
  const isReported = computed(
    () => currentJob.value?.reported === true
      || currentJob.value?.status === LocalScanJobStatusCode.REPORTED,
  )
  const canEndBatch = computed(
    () => currentJob.value?.status === LocalScanJobStatusCode.SCANNING
      || currentJob.value?.status === LocalScanJobStatusCode.PAUSED,
  )
  const canDiscard = computed(() => {
    if (!lifecycle.value?.batchExternalNo) return false
    const status = lifecycle.value.status
    if (status === ScanWorkOrderStatusCode.COMMITTING) {
      return false
    }
    if (status === ScanWorkOrderStatusCode.FAILED) {
      return true
    }
    return !isReported.value
  })
  const canRetryUpload = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    if (
      job.status === LocalScanJobStatusCode.FAILED
      || job.status === LocalScanJobStatusCode.RETRYING
      || job.status === LocalScanJobStatusCode.READYTOUPLOAD
    ) {
      return job.scannedPages > 0 || job.uploadedPages > 0
    }
    return false
  })
  const canRetryCommit = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    const status = job.status
    if (
      status === LocalScanJobStatusCode.SCANNING
      || status === LocalScanJobStatusCode.PAUSED
      || status === LocalScanJobStatusCode.UPLOADING
      || status === LocalScanJobStatusCode.CANCELLED
      || status === LocalScanJobStatusCode.REPORTED
    ) {
      return false
    }
    const uploadablePages = job.pages.filter((page) => page.status !== LocalScanPageStatusCode.DELETED)
    if (uploadablePages.length === 0 || job.uploadedPages <= 0) return false
    return uploadablePages.every(
      (page) => page.status === LocalScanPageStatusCode.UPLOADED && Boolean(page.uploadedFileId),
    )
  })

  const canRetryWorkOrderCommit = computed(() => {
    if (
      options.taskKind !== ScanTaskKindCode.PORTFOLIO_COLLECT
      && options.taskKind !== ScanTaskKindCode.EXAM_ARCHIVE
    ) {
      return false
    }
    const status = lifecycle.value?.status
    return (
      Boolean(lifecycle.value?.batchExternalNo)
      && (status === ScanWorkOrderStatusCode.COMMITTING || status === ScanWorkOrderStatusCode.FAILED)
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
      if (currentJob.value.reported || currentJob.value.status === LocalScanJobStatusCode.REPORTED) {
        stopPolling()
        successMessage.value = '扫描批次已提交'
      }
      if (currentJob.value.status === LocalScanJobStatusCode.FAILED) {
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
      outputContainerFormat: ScannerOutputContainerFormat.PDF,
      pageImageFormat: ScannerPageImageFormat.PNG,
      blankPagePolicy: ScannerBlankPagePolicyCode.BACK_BLANK,
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

  /** 档案袋 quality / 归档 MERGED 失败后无 local job 时，凭工单 DB 快照续做 commit。 */
  async function retryWorkOrderCommit() {
    if (
      options.taskKind !== ScanTaskKindCode.PORTFOLIO_COLLECT
      && options.taskKind !== ScanTaskKindCode.EXAM_ARCHIVE
    ) {
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
      if (lifecycle.value.status === ScanWorkOrderStatusCode.COMMITTED) {
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
        if (
          currentJob.value.status === LocalScanJobStatusCode.SCANNING
          || currentJob.value.status === LocalScanJobStatusCode.PAUSED
        ) {
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
