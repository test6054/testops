import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type {
  ArchiveScanBatchModeCode,
  ScanWorkOrderArchiveContextVO,
  ScanWorkOrderLifecycleVO,
} from '@/apis/mark/scanner-work-order'
import {
  getScanWorkOrderContext,
  startScanWorkOrder,
} from '@/apis/mark/scanner-work-order'
import { getAgentSetupContext } from '@/apis/mark/scanner-agent-local'
import { ARCHIVE_MATERIAL_TYPE_LABEL } from '@/apis/mark/archive-volume'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

export function useArchiveScanSession() {
  const route = useRoute()
  const router = useRouter()
  const loading = ref(false)
  const lifecycle = ref<ScanWorkOrderLifecycleVO | null>(null)
  const archiveContext = ref<ScanWorkOrderArchiveContextVO | null>(null)

  const volumeId = computed(() => String(route.query.volumeId ?? ''))
  const catalogCode = computed(() => String(route.query.catalogCode ?? ''))
  const materialType = computed(() => route.query.materialType as ArchiveMaterialTypeCode | undefined)
  const returnTo = computed(() => String(route.query.returnTo ?? ''))
  const batchMode = computed<ArchiveScanBatchModeCode>(() =>
    route.query.batchMode === 'PER_PAGE' ? 'PER_PAGE' : 'MERGED',
  )

  const materialTypeLabel = computed(() =>
    materialType.value
      ? strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, materialType.value, 'materialType')
      : '未指定',
  )

  async function loadContext() {
    if (!volumeId.value) {
      throw new Error('缺少 volumeId')
    }
    loading.value = true
    try {
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
    }
    catch (error) {
      showUserError(error, '加载归档扫描上下文失败')
      throw error
    }
    finally {
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
      lifecycle.value = await startScanWorkOrder({
        taskKind: 'EXAM_ARCHIVE',
        volumeId: volumeId.value,
        catalogCode: catalogCode.value || undefined,
        materialType: materialType.value,
        archiveBatchMode: batchMode.value,
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
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading,
    lifecycle,
    archiveContext,
    volumeId,
    catalogCode,
    materialType,
    materialTypeLabel,
    returnTo,
    batchMode,
    loadContext,
    startSession,
  }
}
