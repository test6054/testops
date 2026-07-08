import type { Ref } from 'vue'
import { computed, reactive } from 'vue'
import type {
  ArchiveVolumeCapabilitiesVO,
  ArchiveVolumeDetailResponse,
} from '@/apis/mark/archive-volume'
import { canSubmitArchiveVolumeDetail } from '@/composables/useArchiveVolumeSubmitGate'

const EMPTY_CAPABILITIES: ArchiveVolumeCapabilitiesVO = {
  member: false,
  canScan: false,
  canManageMaterials: false,
  canEditCatalog: false,
  canSelfCheck: false,
  canRunIntegrityCheck: false,
  canSubmitVolume: false,
  canManageCollaborators: false,
  canRejectCollection: false,
  canStartCollecting: false,
}

function volumeAcceptsSubmitStatus(status?: string): boolean {
  return status === 'COLLECTING' || status === 'DEPARTMENT_REVIEWED'
}

/** 成绩确认/同步仅收材前阶段；与后端 confirmScoreCompletion / syncTeachingAffairsScoreCompletion 一致。 */
function volumeAcceptsScoreCompletion(status?: string): boolean {
  return status === 'DRAFT' || status === 'COLLECTING'
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
    if (d.volume.volumeStatus !== 'COLLECTING') return false
    return d.volume.requireSelfCheckConfirm === true
  })

  const showSubmitActions = computed(() => {
    const d = detail.value
    if (!d || !volumeAcceptsSubmitStatus(d.volume.volumeStatus)) return false
    if (capabilities.value.canSubmitVolume === true) return true
    return (
      capabilities.value.member === true &&
      (capabilities.value.canScan === true || capabilities.value.canEditCatalog === true)
    )
  })

  const submitActionDisabledHint = computed(() => {
    const d = detail.value
    if (!d || capabilities.value.canSubmitVolume === true) return null
    return d.capabilityDeniedHint ?? null
  })

  const canEditCatalog = computed(() => {
    const d = detail.value
    return capabilities.value.canEditCatalog === true && d?.volume.volumeStatus === 'COLLECTING'
  })

  const canEditSelfCheck = computed(() => {
    const d = detail.value
    if (!capabilities.value.canSelfCheck || !d) return false
    if (d.volume.volumeStatus !== 'COLLECTING') return false
    return d.catalogStatus === 'CONFIRMED'
  })

  const canRegisterMaterial = computed(() => {
    const d = detail.value
    if (!capabilities.value.canManageMaterials || !d?.canManageMaterials) return false
    if (d.hasOpenRemediationTask) return true
    const status = d.volume.volumeStatus
    return status === 'DRAFT' || status === 'COLLECTING'
  })

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
    canRunIntegrityCheck,
    canManageCollaborators,
    canStartCollecting,
    canRejectCollection,
    isCollaborator,
    volumeAcceptsSubmitStatus,
    volumeAcceptsScoreCompletion,
  })
}
