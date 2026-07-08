<template>
  <WorkbenchSurfaceCard class="archive-volume-transfer-panel">
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
    <template #head>
      <div class="archive-volume-transfer-panel__head">
        <h3 class="archive-volume-transfer-panel__title">移交流程</h3>
        <div class="archive-volume-transfer-panel__head-actions">
          <UiTag :tone="transferStatusTone(detail.volume.transferStatus)" size="sm">
            {{ transferStatusLabel(detail.volume.transferStatus) }}
          </UiTag>
        </div>
      </div>
    </template>
    <template #toolbar>
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
    </template>

    <UiSkeletonState v-if="historyLoading" variant="card" compact />
    <UiEmpty v-else-if="transferRecords.length === 0" description="暂无移交流程记录" />
    <div v-else class="archive-volume-transfer-panel__list">
      <article
        v-for="record in transferRecords"
        :key="record.transferRecordId ?? record.submitTime"
        class="approval-card"
        :class="transferCardClass(record.transferStatus)"
      >
        <div class="approval-card__head">
          <span class="approval-card__action">{{
            transferActionLabel(record.transferStatus)
          }}</span>
          <UiTag
            v-if="record.transferStatus"
            :tone="transferStatusTone(record.transferStatus)"
            size="sm"
          >
            {{ transferStatusLabel(record.transferStatus) }}
          </UiTag>
          <span class="approval-card__time">{{ formatRecordTime(record) }}</span>
        </div>
        <p v-if="record.rejectReason" class="approval-card__remark">{{ record.rejectReason }}</p>
        <p class="approval-card__meta">{{ formatRecordActor(record) }}</p>
      </article>
    </div>

    <div
      v-if="detail.latestTransferRecord?.transferPackageFileId"
      class="archive-volume-transfer-panel__footer-actions"
    >
      <UiButton size="sm" variant="ghost" @click="downloadTransferPackage"> 下载移交包 </UiButton>
    </div>

    <UiDrawer
      :open="rejectTransferOpen"
      title="移交退回"
      :width="520"
      :confirm-loading="rejectingTransfer"
      ok-text="确认退回"
      :hide-footer="false"
      @update:open="(v: boolean) => (rejectTransferOpen = v)"
      @close="rejectTransferOpen = false"
      @confirm="submitRejectTransfer"
    >
      <a-form layout="vertical">
        <a-form-item label="退回原因" required>
          <a-textarea v-model:value="rejectTransferReason" :rows="3" />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type {
  ArchiveTransferStatusCode,
  ArchiveVolumeDetailResponse,
  ArchiveVolumeTransferRecordResponse,
} from '@/apis/mark/archive-volume'
import {
  approveArchiveVolumeTransfer,
  ARCHIVE_TRANSFER_STATUS_TONE,
  ArchiveTransferStatusDescription,
  listArchiveVolumeTransferRecords,
  rejectArchiveVolumeTransfer,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeTransferPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
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
const historyLoading = ref(false)
const transferRecords = ref<ArchiveVolumeTransferRecordResponse[]>([])

function transferStatusLabel(code: ArchiveTransferStatusCode) {
  return strictEnumLabel(ArchiveTransferStatusDescription, code, 'transferStatus')
}

function transferStatusTone(code: ArchiveTransferStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_TRANSFER_STATUS_TONE, code, 'transferStatus')
}

function transferActionLabel(status?: ArchiveTransferStatusCode): string {
  if (status === 'NOT_SUBMITTED') return '尚未提交移交'
  if (status === 'PENDING_REVIEW') return '提交移交验收'
  if (status === 'APPROVED') return '移交验收通过'
  if (status === 'REJECTED') return '移交退回补正'
  return '移交记录'
}

function transferCardClass(status?: ArchiveTransferStatusCode): string {
  if (status === 'APPROVED') return 'approval-card--approved'
  if (status === 'PENDING_REVIEW') return 'approval-card--pending'
  if (status === 'REJECTED') return 'approval-card--rejected'
  return ''
}

function formatRecordTime(record: ArchiveVolumeTransferRecordResponse): string {
  const time =
    record.transferStatus === 'APPROVED' || record.transferStatus === 'REJECTED'
      ? record.reviewedTime
      : record.submitTime
  return time ? formatDateTime(time) : '—'
}

function formatRecordActor(record: ArchiveVolumeTransferRecordResponse): string {
  if (record.transferStatus === 'APPROVED' || record.transferStatus === 'REJECTED') {
    return record.reviewerUserNickName || '验收人'
  }
  return record.submitUserNickName || '提交人'
}

async function loadTransferRecords() {
  historyLoading.value = true
  try {
    transferRecords.value = await listArchiveVolumeTransferRecords(props.volumeId)
  } catch (error) {
    showUserError(error)
    transferRecords.value = []
  } finally {
    historyLoading.value = false
  }
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
    await loadTransferRecords()
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
    await loadTransferRecords()
  } catch (error) {
    showUserError(error)
  } finally {
    rejectingTransfer.value = false
  }
}

onMounted(() => {
  void loadTransferRecords()
})
</script>

<style scoped>
.archive-volume-transfer-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.archive-volume-transfer-panel__alert {
  margin-bottom: 0;
}

.archive-volume-transfer-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  width: 100%;
}

.archive-volume-transfer-panel__head-actions {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-volume-transfer-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-transfer-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-volume-transfer-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
}

.archive-volume-transfer-panel__footer-actions {
  display: flex;
  gap: var(--dp-space-2);
  margin-top: var(--dp-space-3);
}
</style>
