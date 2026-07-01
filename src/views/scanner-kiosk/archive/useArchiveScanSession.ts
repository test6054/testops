import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type { ScanDispatchArchiveSnapshotVO } from '@/apis/mark/scanner-dispatch'
import type {
  ArchiveScanBatchModeCode,
  ScanWorkOrderArchiveContextVO,
  ScanWorkOrderLifecycleVO,
} from '@/apis/mark/scanner-work-order'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ARCHIVE_MATERIAL_TYPE_LABEL } from '@/apis/mark/archive-volume'
import { getAgentSetupContext } from '@/apis/mark/scanner-agent-local'
import { previewScanDispatch } from '@/apis/mark/scanner-dispatch'
import { getScanWorkOrderContext, startScanWorkOrder } from '@/apis/mark/scanner-work-order'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

export function useArchiveScanSession() {
  const route = useRoute()
  const loading = ref(false)
  const lifecycle = ref<ScanWorkOrderLifecycleVO | null>(null)
  const archiveContext = ref<ScanWorkOrderArchiveContextVO | null>(null)
  const dispatchSnapshot = ref<ScanDispatchArchiveSnapshotVO | null>(null)
  const dispatchTraceLabelCode = ref('')

  const volumeId = computed(() => String(route.query.volumeId ?? ''))
  const catalogCode = computed(() => String(route.query.catalogCode ?? ''))
  const materialType = computed(
    () => route.query.materialType as ArchiveMaterialTypeCode | undefined,
  )
  const returnTo = computed(() => String(route.query.returnTo ?? ''))
  const dispatchTicketId = computed(() => String(route.query.dispatchTicketId ?? ''))
  const batchMode = computed<ArchiveScanBatchModeCode>(() => {
    const queryMode = route.query.batchMode
    if (queryMode === 'PER_PAGE' || queryMode === 'MERGED') {
      return queryMode
    }
    const snapshotMode = route.query.archiveBatchMode
    if (snapshotMode === 'PER_PAGE' || snapshotMode === 'MERGED') {
      return snapshotMode
    }
    return 'MERGED'
  })

  const materialTypeLabel = computed(() =>
    materialType.value
      ? strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, materialType.value, 'materialType')
      : '未指定',
  )

  async function loadDispatchSnapshot() {
    if (!dispatchTicketId.value) {
      dispatchSnapshot.value = null
      dispatchTraceLabelCode.value = ''
      return
    }
    try {
      const ticket = await previewScanDispatch({ ticketId: dispatchTicketId.value })
      dispatchSnapshot.value = ticket.archiveSnapshot ?? null
      dispatchTraceLabelCode.value = ticket.traceLabelCode ?? ''
    } catch {
      dispatchSnapshot.value = null
      dispatchTraceLabelCode.value = ''
    }
  }

  async function loadContext() {
    if (!volumeId.value) {
      throw new Error('缺少 volumeId')
    }
    loading.value = true
    try {
      await loadDispatchSnapshot()
      const setup = await getAgentSetupContext()
      if (!setup.bound || !setup.scannerDeviceId || !setup.scannerStationId) {
        archiveContext.value = null
        return
      }
      const context = await getScanWorkOrderContext({
        taskKind: 'EXAM_ARCHIVE',
        scannerDeviceId: setup.scannerDeviceId,
        scannerStationId: setup.scannerStationId,
        volumeId: volumeId.value,
        batchExternalNo: lifecycle.value?.batchExternalNo,
      })
      archiveContext.value = context.archiveContext ?? null
      const batchNo = context.activeBatchExternalNo ?? context.archiveContext?.activeBatchExternalNo
      const status = context.activeWorkOrderStatus ?? context.archiveContext?.activeWorkOrderStatus
      if (batchNo && status === 'IN_PROGRESS') {
        lifecycle.value = {
          workOrderId: context.activeWorkOrderId ?? context.archiveContext?.activeWorkOrderId,
          batchExternalNo: batchNo,
          status,
          taskKind: 'EXAM_ARCHIVE',
        }
      }
    } catch (error) {
      showUserError(error, '加载归档扫描上下文失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function startSession() {
    if (!volumeId.value || !materialType.value) {
      throw new Error('缺少卷或材料类型')
    }
    if (archiveContext.value?.canRegisterMaterial !== true) {
      throw new Error('当前卷状态不允许登记材料')
    }
    loading.value = true
    try {
      const setup = await getAgentSetupContext()
      if (!setup.bound || !setup.scannerDeviceId || !setup.scannerStationId) {
        throw new Error('扫描设备未绑定，请先激活一体机')
      }
      lifecycle.value = await startScanWorkOrder({
        taskKind: 'EXAM_ARCHIVE',
        volumeId: volumeId.value,
        catalogCode: catalogCode.value || undefined,
        materialType: materialType.value,
        archiveBatchMode: batchMode.value,
        dispatchTicketId: dispatchTicketId.value || undefined,
        scannerDeviceId: setup.scannerDeviceId,
        scannerStationId: setup.scannerStationId,
        scanConfig: {
          dpi: 300,
          colorMode: 'COLOR',
          duplexMode: 'SIMPLEX',
          blankPageDetectionEnabled: true,
        },
      })
      await loadContext()
      return lifecycle.value
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    lifecycle,
    archiveContext,
    dispatchSnapshot,
    dispatchTraceLabelCode,
    volumeId,
    catalogCode,
    materialType,
    materialTypeLabel,
    returnTo,
    dispatchTicketId,
    batchMode,
    loadContext,
    startSession,
  }
}
