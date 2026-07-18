import type { Ref } from 'vue'
import type {
  ArchiveVolumeCapabilitiesVO,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import { computed, reactive } from 'vue'
import { canSubmitArchiveVolumeDetail } from '@/composables/useArchiveVolumeSubmitGate'
import { ArchiveCatalogStatusCode } from '@/types/enums/archive-catalog-status-enum'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'

const EMPTY_CAPABILITIES: ArchiveVolumeCapabilitiesVO = {
  member: false,
  canScan: false,
  canManageMaterials: false,
  canRemoveSharedMaterialRef: false,
  canMaintainMaterial: false,
  canEditCatalog: false,
  canSelfCheck: false,
  canRunIntegrityCheck: false,
  canSubmitVolume: false,
  canManageCollaborators: false,
  canRejectCollection: false,
  canStartCollecting: false,
}

function volumeAcceptsSubmitStatus(status?: ArchiveVolumeStatusCode): boolean {
  return (
    status === ArchiveVolumeStatusCode.COLLECTING
    || status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
  )
}

/** 人工成绩确认仅收材前阶段；教务成绩由 internal API 回写。 */
function volumeAcceptsScoreCompletion(status?: ArchiveVolumeStatusCode): boolean {
  return status === ArchiveVolumeStatusCode.DRAFT || status === ArchiveVolumeStatusCode.COLLECTING
}

/**
 * 归档卷详情 capabilities 门禁；唯一真源为后端 ArchiveVolumeCapabilitiesVO。
 */
export function useArchiveVolumeDetailScope(
  detail: Ref<ArchiveVolumeDetailResponse | null>,
  currentUserId: Ref<string>,
) {
  const capabilities = computed(() => detail.value?.capabilities ?? EMPTY_CAPABILITIES)

  const canSubmitVolume = computed(() => {
    if (!capabilities.value.canSubmitVolume) return false
    return detail.value ? canSubmitArchiveVolumeDetail(detail.value, currentUserId.value) : false
  })

  const showSelfCheckButton = computed(() => {
    const d = detail.value
    if (!capabilities.value.canSelfCheck || !d) return false
    if (d.volume.volumeStatus !== ArchiveVolumeStatusCode.COLLECTING) return false
    return d.volume.requireSelfCheckConfirm === true
  })

  const showSubmitActions = computed(() => {
    const d = detail.value
    if (!d || !volumeAcceptsSubmitStatus(d.volume.volumeStatus)) return false
    if (capabilities.value.canSubmitVolume === true) return true
    return (
      capabilities.value.member === true
      && (capabilities.value.canScan === true || capabilities.value.canEditCatalog === true)
    )
  })

  const submitActionDisabledHint = computed(() => {
    const d = detail.value
    if (!d || capabilities.value.canSubmitVolume === true) return null
    return d.capabilityDeniedHint ?? null
  })

  const canEditCatalog = computed(() => {
    const d = detail.value
    return (
      capabilities.value.canEditCatalog === true
      && d?.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
    )
  })

  const canEditSelfCheck = computed(() => {
    const d = detail.value
    if (!capabilities.value.canSelfCheck || !d) return false
    if (d.volume.volumeStatus !== ArchiveVolumeStatusCode.COLLECTING) return false
    return d.catalogStatus === ArchiveCatalogStatusCode.CONFIRMED
  })

  const canRegisterMaterial = computed(() => {
    const d = detail.value
    if (!d?.canManageMaterials) return false
    if (d.hasOpenRemediationTask) return true
    if (!capabilities.value.canManageMaterials) return false
    const status = d.volume.volumeStatus
    return status === ArchiveVolumeStatusCode.DRAFT || status === ArchiveVolumeStatusCode.COLLECTING
  })

  /** MVR-183：解除合用引用与收材窗口解耦，高级卷态可触发回退 */
  const canRemoveSharedMaterialRef = computed(
    () => capabilities.value.canRemoveSharedMaterialRef === true,
  )

  /** MVR-185：标签/OCR 与收材窗口解耦 */
  const canMaintainMaterial = computed(
    () => capabilities.value.canMaintainMaterial === true,
  )

  const canRunIntegrityCheck = computed(() => capabilities.value.canRunIntegrityCheck === true)

  const canManageCollaborators = computed(() => capabilities.value.canManageCollaborators === true)

  const canStartCollecting = computed(() => capabilities.value.canStartCollecting === true)

  const canRejectCollection = computed(() => capabilities.value.canRejectCollection === true)

  const isCollaborator = computed(() => {
    return capabilities.value.member === true && capabilities.value.canManageCollaborators !== true
  })

  return reactive({
    capabilities,
    canSubmitVolume,
    showSelfCheckButton,
    showSubmitActions,
    submitActionDisabledHint,
    canEditCatalog,
    canEditSelfCheck,
    canRegisterMaterial,
    canRemoveSharedMaterialRef,
    canMaintainMaterial,
    canRunIntegrityCheck,
    canManageCollaborators,
    canStartCollecting,
    canRejectCollection,
    isCollaborator,
    volumeAcceptsSubmitStatus,
    volumeAcceptsScoreCompletion,
  })
}
