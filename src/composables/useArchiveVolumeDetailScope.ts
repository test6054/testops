import type { Ref } from 'vue'
import type { ArchiveVolumeDetailVO } from '@/apis/mark/archive-volume'
import { computed, reactive } from 'vue'
import { ArchiveVolumeRoleDescription } from '@/apis/mark/archive-volume'
import { canSubmitArchiveVolumeDetail } from '@/composables/useArchiveVolumeSubmitGate'
import { ArchiveVolumeRoleCode } from '@/types/enums/archive-volume-role-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/**
 * 归档卷详情页 volumeRole 操作门禁（已移除 wizard/expert 双轨）。
 */
export function useArchiveVolumeDetailScope(
  detail: Ref<ArchiveVolumeDetailVO | null>,
  currentUserId: Ref<string>,
) {
  const volumeRole = computed(() => detail.value?.volumeRole ?? ArchiveVolumeRoleCode.READONLY)
  const isOwner = computed(() => volumeRole.value === ArchiveVolumeRoleCode.OWNER)
  const isContributor = computed(() => volumeRole.value === ArchiveVolumeRoleCode.CONTRIBUTOR)

  const volumeRoleLabel = computed(() => {
    return strictEnumLabel(ArchiveVolumeRoleDescription, volumeRole.value, 'volumeRole')
  })

  const canSubmitVolume = computed(() => {
    if (!isOwner.value) return false
    return detail.value ? canSubmitArchiveVolumeDetail(detail.value, currentUserId.value) : false
  })

  const showSelfCheckButton = computed(() => {
    const d = detail.value
    if (!isOwner.value || !d) return false
    if (d.volume.volumeStatus !== 'COLLECTING') return false
    return d.volume.requireSelfCheckConfirm === true
  })

  const showSubmitActions = computed(() => isOwner.value)

  const canEditCatalog = computed(() => {
    const d = detail.value
    return isOwner.value && d?.volume.volumeStatus === 'COLLECTING'
  })

  const canEditSelfCheck = computed(() => {
    const d = detail.value
    if (!isOwner.value || !d) return false
    if (d.volume.volumeStatus !== 'COLLECTING') return false
    return d.catalogStatus === 'CONFIRMED'
  })

  const canRegisterMaterial = computed(() => {
    const d = detail.value
    if (!d?.canManageMaterials) return false
    if (d.hasOpenRemediationTask) return true
    const status = d.volume.volumeStatus
    return status === 'DRAFT' || status === 'COLLECTING'
  })

  const canRunIntegrityCheck = computed(() => isOwner.value)

  return reactive({
    volumeRole,
    volumeRoleLabel,
    isOwner,
    isContributor,
    canSubmitVolume,
    showSelfCheckButton,
    showSubmitActions,
    canEditCatalog,
    canEditSelfCheck,
    canRegisterMaterial,
    canRunIntegrityCheck,
  })
}
