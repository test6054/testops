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
  listDocumentScanJobs,
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
import { getUserErrorMessage, rejectUserError } from '@/utils/error-handler'

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
  /** Agent 上报后轮询 work-order context，直至 COMMITTED/FAILED（归档/档案袋异步 commit）。 */
  refreshWorkOrderLifecycle?: () => Promise<void>
  /** 派单租约失效等场景阻断扫描写操作 */
  isScanSessionBlocked?: () => boolean
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
  let workOrderPollTimer: ReturnType<typeof setInterval> | null = null

  function isScanSessionBlocked() {
    return options.isScanSessionBlocked?.() === true
  }

  /** COMMITTING/FAILED 工单恢复阶段：派单租约失效仍允许 retry commit / discard。 */
  const isWorkOrderRecoveryPhase = computed(() => {
    const status = lifecycle.value?.status
    return status === ScanWorkOrderStatusCode.COMMITTING
      || status === ScanWorkOrderStatusCode.FAILED
  })

  function assertScanSessionActive() {
    if (isScanSessionBlocked() && !isWorkOrderRecoveryPhase.value) {
      return rejectUserError('派单租约已失效，请返回队列后重新领取')
    }
  }

  const isDocumentWorkOrderTask = computed(
    () =>
      options.taskKind === ScanTaskKindCode.EXAM_ARCHIVE
      || options.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT,
  )

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
  const isWorkOrderCommitted = computed(
    () => lifecycle.value?.status === ScanWorkOrderStatusCode.COMMITTED,
  )
  const isWorkOrderSettling = computed(
    () => lifecycle.value?.status === ScanWorkOrderStatusCode.COMMITTING,
  )
  const canEndBatch = computed(
    () => !isScanSessionBlocked()
      && (currentJob.value?.status === LocalScanJobStatusCode.SCANNING
        || currentJob.value?.status === LocalScanJobStatusCode.PAUSED),
  )
  const canDiscard = computed(() => {
    if (isScanSessionBlocked() && !isWorkOrderRecoveryPhase.value) return false
    if (!lifecycle.value?.batchExternalNo) return false
    const status = lifecycle.value.status
    if (status === ScanWorkOrderStatusCode.COMMITTING) {
      return true
    }
    if (status === ScanWorkOrderStatusCode.FAILED) {
      return true
    }
    return !isReported.value
  })
  const canRetryUpload = computed(() => {
    if (isScanSessionBlocked()) return false
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
    if (isScanSessionBlocked()) return false
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
    if (isScanSessionBlocked() && !isWorkOrderRecoveryPhase.value) return false
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

  function stopWorkOrderPolling() {
    if (workOrderPollTimer) {
      clearInterval(workOrderPollTimer)
      workOrderPollTimer = null
    }
  }

  function mergePageCountFromCurrentJob() {
    const job = currentJob.value
    if (!job || !lifecycle.value?.batchExternalNo) {
      return
    }
    const pageCount = job.scannedPages > 0 ? job.scannedPages : job.uploadedPages
    if (pageCount <= 0) {
      return
    }
    lifecycle.value = {
      ...lifecycle.value,
      pageCount: lifecycle.value.pageCount ?? pageCount,
    }
  }

  async function enrichCommittedLifecycle() {
    if (!lifecycle.value?.batchExternalNo || !isWorkOrderCommitted.value) {
      return
    }
    const pageCount = lifecycle.value.pageCount ?? currentJob.value?.scannedPages ?? currentJob.value?.uploadedPages
    if (!pageCount || pageCount <= 0) {
      return
    }
    try {
      lifecycle.value = await commitScanWorkOrder({
        taskKind: options.taskKind,
        batchExternalNo: lifecycle.value.batchExternalNo,
        pageCount,
        scanEndTime: new Date().toISOString(),
      })
    } catch {
      // context 已确认 COMMITTED，幂等 commit 失败不阻断导航
    }
  }

  async function pollWorkOrderLifecycleOnce() {
    if (isScanSessionBlocked()) {
      stopWorkOrderPolling()
      return
    }
    if (!options.refreshWorkOrderLifecycle) {
      return
    }
    await options.refreshWorkOrderLifecycle()
    if (lifecycle.value?.status === ScanWorkOrderStatusCode.COMMITTED) {
      stopWorkOrderPolling()
      await enrichCommittedLifecycle()
      successMessage.value = '扫描工单已提交'
      return
    }
    if (lifecycle.value?.status === ScanWorkOrderStatusCode.FAILED) {
      stopWorkOrderPolling()
      errorMessage.value = lifecycle.value.diagnostic || '扫描工单提交失败，可重试提交或废弃后重新开单'
    }
  }

  function startWorkOrderPolling() {
    if (isScanSessionBlocked()) {
      return
    }
    if (!options.refreshWorkOrderLifecycle || !isDocumentWorkOrderTask.value) {
      return
    }
    stopWorkOrderPolling()
    void pollWorkOrderLifecycleOnce()
    workOrderPollTimer = setInterval(() => {
      void pollWorkOrderLifecycleOnce()
    }, 2000)
  }

  function startPolling(scanJobId: string) {
    stopPolling()
    pollTimer = setInterval(() => {
      void pollJob(scanJobId)
    }, 1500)
  }

  async function pollJob(scanJobId: string) {
    if (isScanSessionBlocked()) {
      stopPolling()
      return
    }
    try {
      currentJob.value = await getScanJob(scanJobId)
      if (currentJob.value.reported || currentJob.value.status === LocalScanJobStatusCode.REPORTED) {
        stopPolling()
        if (isDocumentWorkOrderTask.value) {
          mergePageCountFromCurrentJob()
          if (isWorkOrderCommitted.value) {
            await enrichCommittedLifecycle()
            successMessage.value = '扫描工单已提交'
          } else {
            successMessage.value = '扫描页已上传，正在登记材料…'
            startWorkOrderPolling()
          }
        } else {
          successMessage.value = '扫描批次已提交'
        }
      }
      if (currentJob.value.status === LocalScanJobStatusCode.FAILED) {
        stopPolling()
      }
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '刷新扫描任务失败')
    }
  }

  function isRecoverableLocalJob(job: ScanJobResponse) {
    return [
      LocalScanJobStatusCode.CREATED,
      LocalScanJobStatusCode.SCANNING,
      LocalScanJobStatusCode.PAUSED,
      LocalScanJobStatusCode.READYTOUPLOAD,
      LocalScanJobStatusCode.UPLOADING,
      LocalScanJobStatusCode.RETRYING,
      LocalScanJobStatusCode.FAILED,
    ].includes(job.status)
  }

  function shouldPollRecoveredJob(job: ScanJobResponse) {
    return [
      LocalScanJobStatusCode.CREATED,
      LocalScanJobStatusCode.SCANNING,
      LocalScanJobStatusCode.PAUSED,
      LocalScanJobStatusCode.READYTOUPLOAD,
      LocalScanJobStatusCode.UPLOADING,
      LocalScanJobStatusCode.RETRYING,
      LocalScanJobStatusCode.FAILED,
    ].includes(job.status)
  }

  /** 归档 / 档案袋 Kiosk 刷新后恢复 Agent 本地未完成任务，避免磁盘残留任务阻断新开扫。 */
  async function recoverLocalScanJob() {
    if (isScanSessionBlocked()) {
      return
    }
    const deviceId = options.getScannerDeviceId().trim()
    const stationId = options.getScannerStationId().trim()
    if (!deviceId || !stationId) {
      return
    }
    const batchExternalNo = lifecycle.value?.batchExternalNo?.trim()
    let response
    try {
      response = await listDocumentScanJobs({
        taskKind: options.taskKind,
        scannerDeviceId: deviceId,
        scannerStationId: stationId,
        batchExternalNo: batchExternalNo || undefined,
        includeTerminal: false,
      })
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '恢复本地扫描任务失败')
      return
    }
    const currentJobId = currentJob.value?.scanJobId?.trim() ?? ''
    const recoverableJobs = response.jobs.filter(isRecoverableLocalJob)
    const recoverableJob
      = (currentJobId ? recoverableJobs.find((job) => job.scanJobId === currentJobId) : undefined)
        || (batchExternalNo
          ? recoverableJobs.find((job) => job.batchExternalNo === batchExternalNo)
          : undefined)
        || recoverableJobs[0]
    if (!recoverableJob) {
      return
    }
    if (currentJob.value?.scanJobId === recoverableJob.scanJobId) {
      if (shouldPollRecoveredJob(recoverableJob)) {
        startPolling(recoverableJob.scanJobId)
      }
      return
    }
    currentJob.value = await getScanJob(recoverableJob.scanJobId)
    if (shouldPollRecoveredJob(currentJob.value)) {
      startPolling(currentJob.value.scanJobId)
    }
    successMessage.value = '已恢复本地未完成扫描任务'
  }

  async function startLocalScanAfterWorkOrder(workOrder: ScanWorkOrderLifecycleVO) {
    if (loading.value) {
      return rejectUserError('正在处理中')
    }
    assertScanSessionActive()
    lifecycle.value = workOrder
    if (!workOrder.batchExternalNo || !workOrder.reportId || !workOrder.resolvedScanConfig) {
      return rejectUserError('扫描工单缺少 batchExternalNo、reportId 或冻结扫描参数')
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
    if (!currentJob.value || !canEndBatch.value || loading.value) return
    assertScanSessionActive()
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
    if (!currentJob.value || loading.value) return
    assertScanSessionActive()
    loading.value = true
    try {
      currentJob.value = await pauseScanJob(currentJob.value.scanJobId)
    } finally {
      loading.value = false
    }
  }

  async function resumeCurrentJob() {
    if (!currentJob.value || loading.value) return
    assertScanSessionActive()
    loading.value = true
    try {
      currentJob.value = await resumeScanJob(currentJob.value.scanJobId)
      startPolling(currentJob.value.scanJobId)
    } finally {
      loading.value = false
    }
  }

  async function retryCurrentUpload() {
    if (!currentJob.value || loading.value) return
    assertScanSessionActive()
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await retryUpload(currentJob.value.scanJobId)
      startPolling(currentJob.value.scanJobId)
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '重试上传失败')
    } finally {
      loading.value = false
    }
  }

  async function retryCurrentCommit() {
    if (!currentJob.value || loading.value) return
    assertScanSessionActive()
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await retryCommit(currentJob.value.scanJobId)
      startPolling(currentJob.value.scanJobId)
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '重试提交失败')
    } finally {
      loading.value = false
    }
  }

  /** 档案袋 quality / 归档 MERGED 失败后无 local job 时，凭工单 DB 快照续做 commit。 */
  async function retryWorkOrderCommit() {
    if (
      options.taskKind !== ScanTaskKindCode.PORTFOLIO_COLLECT
      && options.taskKind !== ScanTaskKindCode.EXAM_ARCHIVE
    ) {
      return
    }
    if (!lifecycle.value?.batchExternalNo || !canRetryWorkOrderCommit.value || loading.value) return
    assertScanSessionActive()
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
      } else if (lifecycle.value.status === ScanWorkOrderStatusCode.COMMITTING) {
        successMessage.value = '正在登记材料…'
        startWorkOrderPolling()
      }
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '重试提交扫描工单失败')
    } finally {
      loading.value = false
    }
  }

  async function discardCurrentSession() {
    if (!lifecycle.value?.batchExternalNo || loading.value) return
    assertScanSessionActive()
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
      stopWorkOrderPolling()
      successMessage.value = '扫描工单已废弃'
    } catch (error) {
      errorMessage.value = getUserErrorMessage(error, '废弃扫描失败')
    } finally {
      loading.value = false
    }
  }

  async function resumeWorkOrderPollingIfNeeded() {
    if (isScanSessionBlocked()) {
      return
    }
    if (!isDocumentWorkOrderTask.value || !options.refreshWorkOrderLifecycle) {
      return
    }
    if (lifecycle.value?.status === ScanWorkOrderStatusCode.COMMITTED) {
      await enrichCommittedLifecycle()
      return
    }
    if (lifecycle.value?.status === ScanWorkOrderStatusCode.COMMITTING) {
      startWorkOrderPolling()
    }
  }

  onBeforeUnmount(() => {
    stopPolling()
    stopWorkOrderPolling()
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
    isWorkOrderCommitted,
    isWorkOrderSettling,
    canEndBatch,
    canDiscard,
    canRetryUpload,
    canRetryCommit,
    canRetryWorkOrderCommit,
    isScanSessionBlocked,
    startLocalScanAfterWorkOrder,
    endCurrentBatch,
    pauseCurrentJob,
    resumeCurrentJob,
    retryCurrentUpload,
    retryCurrentCommit,
    retryWorkOrderCommit,
    discardCurrentSession,
    recoverLocalScanJob,
    resumeWorkOrderPollingIfNeeded,
    stopPolling,
    stopWorkOrderPolling,
    suspendActiveScan: () => {
      stopPolling()
      stopWorkOrderPolling()
    },
  }
}
