<template>
  <section class="archive-volume-transfer-panel">
    <UiAlertStrip
      v-if="
        detail.volume.transferStatus === 'REJECTED' && detail.volume.volumeStatus === 'COLLECTING'
      "
      tone="info"
      title="移交已退回"
      description="请补正材料、重新执行完整性/四性检测后再提交归档"
      dense
      class="archive-volume-transfer-panel__alert"
    />
    <a-descriptions bordered size="small" :column="1">
      <a-descriptions-item label="移交状态">
        {{ transferStatusLabel(detail.volume.transferStatus) }}
      </a-descriptions-item>
      <a-descriptions-item label="成绩完成">
        {{ scoreCompletionLabel(detail.volume.scoreCompletionStatus) }}
      </a-descriptions-item>
    </a-descriptions>
    <div
      v-if="detail.latestTransferRecord?.transferPackageFileId"
      class="archive-volume-transfer-panel__actions"
    >
      <UiButton size="sm" @click="downloadTransferPackage"> 下载移交包（DA/T93） </UiButton>
    </div>
    <div
      v-if="canReviewTransfer && detail.volume.transferStatus === 'PENDING_REVIEW'"
      class="archive-volume-transfer-panel__actions"
    >
      <UiButton size="sm" :loading="approvingTransfer" @click="handleApproveTransfer">
        验收通过
      </UiButton>
      <UiButton v-if="canRejectTransfer" size="sm" variant="outline" @click="openRejectTransfer">
        退回补正
      </UiButton>
    </div>

    <a-modal
      v-model:open="rejectTransferOpen"
      title="移交退回"
      :confirm-loading="rejectingTransfer"
      ok-text="确认退回"
      cancel-text="取消"
      @ok="submitRejectTransfer"
    >
      <a-form layout="vertical">
        <a-form-item label="退回原因" required>
          <a-textarea v-model:value="rejectTransferReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import type { ArchiveVolumeDetailVO } from '@/apis/mark/archive-volume'
import {
  approveArchiveVolumeTransfer,
  ARCHIVE_SCORE_COMPLETION_STATUS_LABEL,
  ARCHIVE_TRANSFER_STATUS_LABEL,
  rejectArchiveVolumeTransfer,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeTransferPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailVO
  canReviewTransfer: boolean
  canRejectTransfer: boolean
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const approvingTransfer = ref(false)
const rejectingTransfer = ref(false)
const rejectTransferOpen = ref(false)
const rejectTransferReason = ref('')

function transferStatusLabel(code: ArchiveVolumeDetailVO['volume']['transferStatus']) {
  return strictEnumLabel(ARCHIVE_TRANSFER_STATUS_LABEL, code, 'transferStatus')
}

function scoreCompletionLabel(code: ArchiveVolumeDetailVO['volume']['scoreCompletionStatus']) {
  return strictEnumLabel(ARCHIVE_SCORE_COMPLETION_STATUS_LABEL, code, 'scoreCompletionStatus')
}

async function downloadTransferPackage() {
  const fileId = props.detail.latestTransferRecord?.transferPackageFileId
  if (!fileId) return
  try {
    await downloadFile({ nodeId: fileId })
  } catch (error) {
    showUserError(error, '下载移交包失败')
  }
}

async function handleApproveTransfer() {
  approvingTransfer.value = true
  try {
    await approveArchiveVolumeTransfer({ volumeId: props.volumeId })
    message.success('移交验收通过')
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    approvingTransfer.value = false
  }
}

function openRejectTransfer() {
  rejectTransferReason.value = ''
  rejectTransferOpen.value = true
}

async function submitRejectTransfer() {
  if (!rejectTransferReason.value.trim()) {
    message.warning('请填写退回原因')
    return
  }
  rejectingTransfer.value = true
  try {
    await rejectArchiveVolumeTransfer({
      volumeId: props.volumeId,
      rejectReason: rejectTransferReason.value.trim(),
    })
    message.success('已退回补正')
    rejectTransferOpen.value = false
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    rejectingTransfer.value = false
  }
}
</script>

<style scoped>
.archive-volume-transfer-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-transfer-panel__alert {
  margin-bottom: 0;
}

.archive-volume-transfer-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}
</style>
