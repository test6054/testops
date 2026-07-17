<script setup lang="ts">
import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeMaterialResponse,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import {
  ArchiveMaterialTypeDescription,
  confirmArchiveDigitalMaterials,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCheckboxGroup from '@/components/ui-guide/ui/UiCheckboxGroup.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveMaterialDeliveryModeCode } from '@/types/enums/archive-material-delivery-mode-enum'
import { ArchiveMaterialSubmissionStatusCode } from '@/types/enums/archive-material-submission-status-enum'
import { ArchiveVolumeSourceTypeCode } from '@/types/enums/archive-volume-source-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const selectedIds = ref<string[]>([])
const confirming = ref(false)

/** 与后端 confirmDigitalMaterials 一致：已有文件且符合电子确认条件、尚未提交。 */
function isDigitalConfirmCandidate(material: ArchiveVolumeMaterialResponse): boolean {
  if (!material.fileId) return false
  if (material.submissionStatus === ArchiveMaterialSubmissionStatusCode.SUBMITTED) return false
  if (material.submissionStatus === ArchiveMaterialSubmissionStatusCode.WAIVED_WITH_REASON)
    return false
  if (material.deliveryMode === ArchiveMaterialDeliveryModeCode.DIGITAL_CONFIRM) return true
  if (material.sourceSystem === 'ONLINE_MARKING') return true
  return material.electronicOriginalStatus === 'ORIGINAL'
}

const confirmableMaterials = computed(() =>
  props.detail.materials.filter(isDigitalConfirmCandidate),
)

const canConfirm = computed(() => props.detail.capabilities?.canConfirmDigitalMaterials === true)

const showPanel = computed(
  () =>
    canConfirm.value
    && confirmableMaterials.value.length > 0
    && (props.detail.volume.sourceType === ArchiveVolumeSourceTypeCode.ONLINE_MARKING
      || confirmableMaterials.value.some(
        (item) => item.deliveryMode === ArchiveMaterialDeliveryModeCode.DIGITAL_CONFIRM,
      )),
)

function materialLabel(material: ArchiveVolumeMaterialResponse): string {
  const typeLabel = strictEnumLabel(
    ArchiveMaterialTypeDescription,
    material.materialType,
    'materialType',
  )
  const name = material.fileName || material.catalogCode
  return name ? `${typeLabel} · ${name}` : typeLabel
}

function toggleAll(checked: boolean) {
  selectedIds.value = checked ? confirmableMaterials.value.map((item) => item.materialId) : []
}

async function handleConfirm() {
  if (confirming.value) return
  if (selectedIds.value.length === 0) {
    showFormValidationMessage('请勾选待确认电子材料')
    return
  }
  confirming.value = true
  try {
    await confirmArchiveDigitalMaterials({
      volumeId: props.volumeId,
      materialIds: selectedIds.value,
    })
    message.success(`已确认 ${selectedIds.value.length} 项电子材料`)
    selectedIds.value = []
    emit('refreshed')
  } catch (error) {
    showUserError(error, '确认电子材料失败')
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <WorkbenchSurfaceCard v-if="showPanel" flush class="digital-confirm-panel">
    <template #head>
      <span>电子材料确认归档</span>
    </template>
    <template #toolbar>
      <UiButton
        size="sm"
        variant="primary"
        :loading="confirming"
        :disabled="selectedIds.length === 0"
        @click="handleConfirm"
      >
        批量确认
      </UiButton>
    </template>
    <p class="digital-confirm-panel__hint">
      线上阅卷已聚合的电子槽位可一键确认，无需逐项扫描登记。
    </p>
    <label class="digital-confirm-panel__all">
      <UiCheckbox
        :checked="
          selectedIds.length === confirmableMaterials.length && confirmableMaterials.length > 0
        "
        :indeterminate="selectedIds.length > 0 && selectedIds.length < confirmableMaterials.length"
        @change="(e: { target: { checked: boolean } }) => toggleAll(e.target.checked)"
      />
      全选（{{ confirmableMaterials.length }} 项）
    </label>
    <UiCheckboxGroup v-model="selectedIds" class="digital-confirm-panel__list" direction="vertical">
      <label
        v-for="material in confirmableMaterials"
        :key="material.materialId"
        class="digital-confirm-panel__item"
      >
        <UiCheckbox :value="material.materialId" />
        <span>{{ materialLabel(material) }}</span>
      </label>
    </UiCheckboxGroup>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.digital-confirm-panel {
  margin-bottom: 12px;
}

.digital-confirm-panel__hint {
  margin: 0 0 12px;
  padding: 0 16px;
  font-size: 13px;
  color: var(--dp-text-muted);
}

.digital-confirm-panel__all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 8px;
  font-size: 13px;
}

.digital-confirm-panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 16px;
  width: 100%;
}

.digital-confirm-panel__item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
</style>
