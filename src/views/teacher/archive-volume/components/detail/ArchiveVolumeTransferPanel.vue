<template>
  <WorkbenchSurfaceCard embedded class="archive-volume-transfer-panel">
    <UiAlertStrip
      v-if="
        detail.volume.transferStatus === ArchiveTransferStatusCode.REJECTED
          && detail.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
      "
      tone="info"
      title="移交已退回"
      description="请补正材料、重新执行完整性/四性检测后再提交归档"
      dense
      class="archive-volume-transfer-panel__alert"
    />
    <UiAlertStrip
      v-if="
        detail.volume.transferStatus === ArchiveTransferStatusCode.PENDING_REVIEW
          && detail.hasOpenRemediationTask === true
      "
      tone="warning"
      title="存在未关闭整改"
      description="请先完成整改或退回移交后再验收；验收通过将被后端拒绝"
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
        v-if="
          (canApproveTransferAction || canRejectTransferAction)
            && detail.volume.transferStatus === ArchiveTransferStatusCode.PENDING_REVIEW
        "
        class="archive-volume-transfer-panel__actions"
      >
        <UiButton
          v-if="canApproveTransferAction === true"
          variant="primary"
          size="sm"
          :loading="approvingTransfer"
          :disabled="rejectingTransfer || detail.hasOpenRemediationTask === true"
          @click="handleApproveTransfer"
        >
          验收通过
        </UiButton>
        <UiButton
          v-if="canRejectTransferAction === true"
          size="sm"
          variant="outline"
          :disabled="approvingTransfer"
          @click="openRejectTransfer"
        >
          退回补正
        </UiButton>
      </div>
    </template>

    <UiSkeletonState v-if="historyLoading" variant="card" compact />
    <div v-else-if="historyLoadFailed" class="archive-volume-transfer-panel__load-error">
      <span>移交记录加载失败</span>
      <UiButton size="sm" variant="outline" @click="loadTransferRecords">重试</UiButton>
    </div>
    <UiEmpty size="sm" v-else-if="transferRecords.length === 0" description="暂无移交流程记录" />
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
      <UiForm layout="vertical">
        <UiFormItem label="退回原因" required>
          <UiTextarea size="sm" v-model="rejectTransferReason" :rows="3" :maxlength="500" :show-count="true" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeTransferRecordResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  approveArchiveVolumeTransfer,
  ARCHIVE_TRANSFER_STATUS_TONE,
  ArchiveTransferStatusCode,
  ArchiveTransferStatusDescription,
  ArchiveVolumeStatusCode,
  listArchiveVolumeTransferRecords,
  rejectArchiveVolumeTransfer,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeTransferPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  canReviewTransfer: boolean
  canRejectTransfer: boolean
  /** 当前登录用户，用于 MVR-190 移交提交人自批屏蔽 */
  currentUserId?: string
}>()

const emit = defineEmits<{
  refreshed: []
}>()

/** MVR-190/193：与 BE assertTransferApproverSeparatedFromSubmitter 同源，禁止提交人自批/自驳 */
function isTransferSubmitterSelf(): boolean {
  const submitUserId = props.detail.latestTransferRecord?.submitUserId
  return Boolean(
    submitUserId
    && props.currentUserId
    && String(submitUserId) === String(props.currentUserId),
  )
}

const canApproveTransferAction = computed(() => {
  if (props.canReviewTransfer !== true) return false
  if (props.detail.volume.transferStatus !== ArchiveTransferStatusCode.PENDING_REVIEW) return false
  if (isTransferSubmitterSelf()) return false
  return true
})

const canRejectTransferAction = computed(() => {
  if (props.canRejectTransfer !== true) return false
  if (props.detail.volume.transferStatus !== ArchiveTransferStatusCode.PENDING_REVIEW) return false
  // MVR-193：提交人不得驳回本人提交的移交
  if (isTransferSubmitterSelf()) return false
  return true
})

const approvingTransfer = ref(false)
const rejectingTransfer = ref(false)
const rejectTransferOpen = ref(false)
const rejectTransferReason = ref('')
const historyLoading = ref(false)
const historyLoadFailed = ref(false)
const transferRecords = ref<ArchiveVolumeTransferRecordResponse[]>([])

function transferStatusLabel(code: ArchiveTransferStatusCode) {
  return strictEnumLabel(ArchiveTransferStatusDescription, code, 'transferStatus')
}

function transferStatusTone(code: ArchiveTransferStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_TRANSFER_STATUS_TONE, code, 'transferStatus')
}

function transferActionLabel(status?: ArchiveTransferStatusCode): string {
  if (status === ArchiveTransferStatusCode.NOT_SUBMITTED) return '尚未提交移交'
  if (status === ArchiveTransferStatusCode.PENDING_REVIEW) return '提交移交验收'
  if (status === ArchiveTransferStatusCode.APPROVED) return '移交验收通过'
  if (status === ArchiveTransferStatusCode.REJECTED) return '移交退回补正'
  return '移交记录'
}

function transferCardClass(status?: ArchiveTransferStatusCode): string {
  if (status === ArchiveTransferStatusCode.APPROVED) return 'approval-card--approved'
  if (status === ArchiveTransferStatusCode.PENDING_REVIEW) return 'approval-card--pending'
  if (status === ArchiveTransferStatusCode.REJECTED) return 'approval-card--rejected'
  return ''
}

function formatRecordTime(record: ArchiveVolumeTransferRecordResponse): string {
  const time
    = record.transferStatus === ArchiveTransferStatusCode.APPROVED
      || record.transferStatus === ArchiveTransferStatusCode.REJECTED
      ? record.reviewedTime
      : record.submitTime
  return time ? formatDateTime(time) : '—'
}

function formatRecordActor(record: ArchiveVolumeTransferRecordResponse): string {
  if (
    record.transferStatus === ArchiveTransferStatusCode.APPROVED
    || record.transferStatus === ArchiveTransferStatusCode.REJECTED
  ) {
    return record.reviewerUserNickName || '验收人'
  }
  return record.submitUserNickName || '提交人'
}

async function loadTransferRecords() {
  historyLoading.value = true
  historyLoadFailed.value = false
  try {
    transferRecords.value = await listArchiveVolumeTransferRecords(props.volumeId)
  } catch (error) {
    showUserError(error, '加载移交记录失败')
    historyLoadFailed.value = true
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
  if (approvingTransfer.value || rejectingTransfer.value) return
  // MVR-348：与 canApproveTransferAction / BE requireTransferReviewer 二次拦截
  if (canApproveTransferAction.value !== true) {
    message.warning('当前账号不可验收通过该移交（无权限、状态不符或本人提交）')
    return
  }
  if (props.detail.hasOpenRemediationTask === true) {
    showFormValidationMessage('存在未关闭整改，请先完成整改或退回移交')
    return
  }
  approvingTransfer.value = true
  try {
    await approveArchiveVolumeTransfer({ volumeId: props.volumeId })
    message.success('移交验收通过')
    emit('refreshed')
    await loadTransferRecords()
  } catch (error) {
    showUserError(error, '移交验收失败')
  } finally {
    approvingTransfer.value = false
  }
}

function openRejectTransfer() {
  // MVR-348：与 canRejectTransferAction 同源二次拦截
  if (canRejectTransferAction.value !== true) {
    message.warning('当前账号无移交退回权限')
    return
  }
  rejectTransferReason.value = ''
  rejectTransferOpen.value = true
}

async function submitRejectTransfer() {
  if (approvingTransfer.value || rejectingTransfer.value) return
  // MVR-300：与 canRejectTransferAction 同源二次拦截
  if (canRejectTransferAction.value !== true) {
    message.warning('当前账号无移交退回权限')
    return
  }
  if (!rejectTransferReason.value.trim()) {
    showFormValidationMessage('请填写退回原因')
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
    showUserError(error, '退回移交失败')
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
