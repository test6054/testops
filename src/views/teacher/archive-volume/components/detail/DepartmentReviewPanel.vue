<script setup lang="ts">
import type { ArchiveVolumeDetailResponse } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import {
  approveArchiveVolumeDepartmentReview,
  rejectArchiveVolumeDepartmentReview,
  requestArchiveVolumeDepartmentReview,
  withdrawArchiveVolumeDepartmentReview,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import DepartmentReviewMaterialSummary from '@/views/teacher/archive-volume/components/DepartmentReviewMaterialSummary.vue'

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
}>()

const emit = defineEmits<{
  "refreshed": []
  'navigate-tab': [tabKey: string]
}>()

const requesting = ref(false)
const approving = ref(false)
const rejecting = ref(false)
const withdrawing = ref(false)
const rejectOpen = ref(false)
const rejectReason = ref('')
const requestReason = ref('')
const actionBusy = computed(
  () => requesting.value || approving.value || rejecting.value || withdrawing.value,
)

const volumeStatus = computed(() => props.detail.volume.volumeStatus)
const capabilities = computed(() => props.detail.capabilities)

const showMaterialSummary = computed(
  () => capabilities.value?.canReviewDepartmentMaterials === true,
)

const showPanel = computed(() => {
  const status = volumeStatus.value
  if (capabilities.value?.canReviewDepartmentMaterials === true) {
    return (
      status === ArchiveVolumeStatusCode.COLLECTING
      || status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING
      || status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
    )
  }
  if (
    status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING
    || status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
  ) {
    return true
  }
  if (status === ArchiveVolumeStatusCode.COLLECTING) {
    return (
      capabilities.value?.canRequestDepartmentReview === true
      || capabilities.value?.canApproveDepartmentReview === true
    )
  }
  return false
})

const canRequest = computed(
  () =>
    volumeStatus.value === ArchiveVolumeStatusCode.COLLECTING
    && capabilities.value?.canRequestDepartmentReview === true,
)

const canApprove = computed(
  () =>
    volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING
    && capabilities.value?.canApproveDepartmentReview === true,
)

const canWithdraw = computed(
  () =>
    volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
    && capabilities.value?.canWithdrawDepartmentReview === true,
)

const statusTone = computed(() => {
  if (volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING) return 'orange'
  if (volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED) return 'green'
  return 'blue'
})

const statusLabel = computed(() => {
  if (volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING) return '待院系审核'
  if (volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED) return '院系已审'
  return '可发起院系审核'
})

async function handleRequest() {
  if (actionBusy.value) return
  requesting.value = true
  try {
    await requestArchiveVolumeDepartmentReview({
      volumeId: props.volumeId,
      reason: requestReason.value.trim() || undefined,
    })
    message.success('已发起院系审核')
    requestReason.value = ''
    emit('refreshed')
  } catch (error) {
    showUserError(error, '发起院系审核失败')
  } finally {
    requesting.value = false
  }
}

async function handleApprove() {
  if (actionBusy.value) return
  approving.value = true
  try {
    await approveArchiveVolumeDepartmentReview({ volumeId: props.volumeId })
    message.success('院系审核已通过')
    emit('refreshed')
  } catch (error) {
    showUserError(error, '院系审核通过失败')
  } finally {
    approving.value = false
  }
}

async function handleReject() {
  if (actionBusy.value) return
  if (!rejectReason.value.trim()) {
    showFormValidationMessage('请填写驳回原因')
    return
  }
  rejecting.value = true
  try {
    await rejectArchiveVolumeDepartmentReview({
      volumeId: props.volumeId,
      rejectReason: rejectReason.value.trim(),
    })
    message.success('已驳回院系审核')
    rejectOpen.value = false
    rejectReason.value = ''
    emit('refreshed')
  } catch (error) {
    showUserError(error, '驳回院系审核失败')
  } finally {
    rejecting.value = false
  }
}

async function handleWithdraw() {
  if (actionBusy.value) return
  withdrawing.value = true
  try {
    await withdrawArchiveVolumeDepartmentReview({ volumeId: props.volumeId })
    message.success('已撤回院系审核，可继续补件后重新发起')
    emit('refreshed')
  } catch (error) {
    showUserError(error, '撤回院系审核失败')
  } finally {
    withdrawing.value = false
  }
}

function navigateTab(tabKey: string) {
  emit('navigate-tab', tabKey)
}
</script>

<template>
  <WorkbenchSurfaceCard flush class="dept-review-panel">
    <template v-if="showPanel" #head>
      <span>院系审核</span>
      <UiTag :tone="statusTone" size="sm">{{ statusLabel }}</UiTag>
    </template>
    <template v-if="showPanel" #toolbar>
      <UiButton
        v-if="canRequest"
        size="sm"
        variant="primary"
        :loading="requesting"
        :disabled="actionBusy && !requesting"
        @click="handleRequest"
      >
        发起院系审核
      </UiButton>
      <UiButton
        v-if="canApprove"
        size="sm"
        variant="primary"
        :loading="approving"
        :disabled="actionBusy && !approving"
        @click="handleApprove"
      >
        审核通过
      </UiButton>
      <UiButton
        v-if="canApprove"
        size="sm"
        variant="outline"
        :disabled="actionBusy"
        @click="rejectOpen = true"
      >
        驳回
      </UiButton>
      <UiButton
        v-if="canWithdraw"
        size="sm"
        variant="outline"
        :loading="withdrawing"
        :disabled="actionBusy && !withdrawing"
        @click="handleWithdraw"
      >
        撤回审核
      </UiButton>
    </template>
    <div v-if="showPanel" class="dept-review-panel__body">
      <DepartmentReviewMaterialSummary
        v-if="showMaterialSummary"
        class="dept-review-panel__summary"
        :volume-id="volumeId"
        :detail="detail"
        show-navigate-actions
        @navigate="navigateTab"
      />
      <p v-if="detail.volume.departmentReviewRejectReason" class="dept-review-panel__reject">
        驳回原因：{{ detail.volume.departmentReviewRejectReason }}
      </p>
      <a-input
        v-if="canRequest"
        v-model:value="requestReason"
        placeholder="申请说明（可选）"
        class="dept-review-panel__input"
        :maxlength="500"
        show-count
      />
      <p
        v-else-if="volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED"
        class="dept-review-panel__hint"
      >
        院系审核已通过，可提交档案馆验收；若提交前发现缺件，可撤回审核后继续补件。
      </p>
    </div>
    <UiEmpty v-else description="当前任务尚未进入院系审核，或租户未启用院系审核门禁" />

    <UiDrawer
      :open="rejectOpen"
      title="驳回院系审核"
      :width="480"
      :confirm-loading="rejecting"
      ok-text="确认驳回"
      :hide-footer="false"
      @update:open="(v: boolean) => (rejectOpen = v)"
      @close="rejectOpen = false"
      @confirm="handleReject"
    >
      <a-textarea
        v-model:value="rejectReason"
        :rows="4"
        placeholder="驳回原因"
        :maxlength="500"
        show-count
      />
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.dept-review-panel {
  margin-bottom: 12px;
}

.dept-review-panel__body {
  padding: 12px 16px 16px;
}

.dept-review-panel__summary {
  margin-bottom: 12px;
}

.dept-review-panel__reject {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--dp-color-error);
}

.dept-review-panel__input {
  max-width: 360px;
}

.dept-review-panel__hint {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-muted);
}
</style>
