import type { Ref } from 'vue'
import { computed, reactive, ref, watch } from 'vue'
import type { ArchiveVolumeDetailVO, ArchiveVolumeRoleCode } from '@/apis/mark/archive-volume'
import { ARCHIVE_VOLUME_ROLE_LABEL } from '@/apis/mark/archive-volume'
import { canSubmitArchiveVolumeDetail } from '@/composables/useArchiveVolumeSubmitGate'
import { strictEnumLabel } from '@/utils/strict-enum'

export type ArchiveVolumeDetailViewMode = 'wizard' | 'expert'

/**
 * 归档卷详情页视图裁剪：向导/专家模式与 volumeRole 操作门禁。
 */
export function useArchiveVolumeDetailScope(
  detail: Ref<ArchiveVolumeDetailVO | null>,
  currentUserId: Ref<string>,
) {
  const viewMode = ref<ArchiveVolumeDetailViewMode>('wizard')

  const volumeRole = computed(() => detail.value?.volumeRole ?? 'READONLY')

  const wizardEligible = computed(() => {
    const d = detail.value
    if (!d) return false
    const status = d.volume.volumeStatus
    if (status !== 'COLLECTING' && status !== 'SUBMITTED') return false
    const role = d.volumeRole
    return role === 'OWNER' || role === 'CONTRIBUTOR'
  })

  const effectiveViewMode = computed<ArchiveVolumeDetailViewMode>(() => {
    if (!wizardEligible.value) return 'expert'
    return viewMode.value
  })

  const isOwner = computed(() => volumeRole.value === 'OWNER')
  const isContributor = computed(() => volumeRole.value === 'CONTRIBUTOR')
  const isReadonlyWizard = computed(() => isContributor.value)

  const volumeRoleLabel = computed(() =>
    strictEnumLabel(
      ARCHIVE_VOLUME_ROLE_LABEL,
      volumeRole.value as ArchiveVolumeRoleCode,
      'volumeRole',
    ),
  )

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

  function switchToExpertMode() {
    viewMode.value = 'expert'
  }

  function switchToWizardMode() {
    if (wizardEligible.value) {
      viewMode.value = 'wizard'
    }
  }

  watch(wizardEligible, (eligible) => {
    if (!eligible) {
      viewMode.value = 'expert'
    }
  })

  return reactive({
    viewMode,
    effectiveViewMode,
    wizardEligible,
    volumeRole,
    volumeRoleLabel,
    isOwner,
    isContributor,
    isReadonlyWizard,
    canSubmitVolume,
    showSelfCheckButton,
    showSubmitActions,
    canEditCatalog,
    canEditSelfCheck,
    canRegisterMaterial,
    canRunIntegrityCheck,
    switchToExpertMode,
    switchToWizardMode,
  })
}
