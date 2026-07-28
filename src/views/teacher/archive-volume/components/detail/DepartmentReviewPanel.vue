<script setup lang="ts">
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
import type { ArchiveVolumeDetailResponse } from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  approveArchiveVolumeDepartmentReview,
  previewArchiveVolumeSubmitChecklist,
  rejectArchiveVolumeDepartmentReview,
  requestArchiveVolumeDepartmentReview,
  withdrawArchiveVolumeDepartmentReview,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { resolveSubmitChecklistNavigation } from '@/composables/useArchiveSubmitChecklistRouter'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { isArchiveDueOverdue } from '@/utils/archive-volume-list-ui'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { navigateExamWorkspaceRoute } from '@/utils/exam-workspace-navigation'
import DepartmentReviewMaterialSummary from '@/views/teacher/archive-volume/components/DepartmentReviewMaterialSummary.vue'

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
}>()

const emit = defineEmits<{
  "refreshed": []
  'navigate-tab': [tabKey: string]
}>()

const router = useRouter()

const requesting = ref(false)
const approving = ref(false)
const rejecting = ref(false)
const withdrawing = ref(false)
const rejectOpen = ref(false)
const rejectReason = ref('')
const requestReason = ref('')
const confirming = ref(false)
const actionBusy = computed(
  () =>
    confirming.value || requesting.value || approving.value || rejecting.value || withdrawing.value,
)

const volumeStatus = computed(() => props.detail.volume.volumeStatus)
const capabilities = computed(() => props.detail.capabilities)

const hardDueBlocked = computed(() => {
  const volume = props.detail.volume
  if (volume.overdueSubmitBlocked !== true) return false
  if (!volume.archiveDueTime || !isArchiveDueOverdue(volume.archiveDueTime)) return false
  return true
})

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
      || hardDueBlocked.value === true
      || capabilities.value?.canManageCollaborators === true
    )
  }
  return false
})

const canRequest = computed(
  () =>
    volumeStatus.value === ArchiveVolumeStatusCode.COLLECTING
    && capabilities.value?.canRequestDepartmentReview === true
    && hardDueBlocked.value !== true,
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
  if (hardDueBlocked.value === true && volumeStatus.value === ArchiveVolumeStatusCode.COLLECTING) {
    return 'red'
  }
  if (volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING) return 'orange'
  if (volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED) return 'green'
  return 'blue'
})

const statusLabel = computed(() => {
  if (hardDueBlocked.value === true && volumeStatus.value === ArchiveVolumeStatusCode.COLLECTING) {
    return '硬截止已逾期'
  }
  if (volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING) return '待院系审核'
  if (volumeStatus.value === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED) return '院系已审'
  return '可发起院系审核'
})

async function handleRequest() {
  if (actionBusy.value === true) return
  if (hardDueBlocked.value === true) {
    void message.warning('归档已逾期且启用硬截止，禁止发起院系审核；请先展期归档截止时刻')
    return
  }
  // MVR-300：与 canRequest 同源二次拦截
  if (canRequest.value !== true) {
    void message.warning('当前账号无发起院系审核权限')
    return
  }
  confirming.value = true
  const confirmed = await confirmAsync({
    title: '发起院系审核？',
    content: '发起后系统会停止在途归档扫描并冻结材料补录，审核退回或主动撤回后才能继续补件。',
    type: 'warning',
    okText: '发起审核',
  })
  confirming.value = false
  if (!confirmed) return
  // MVR-935：确认后再次认 canRequest
  if (canRequest.value !== true) {
    void message.warning('当前账号无发起院系审核权限')
    return
  }
  requesting.value = true
  try {
    await requestArchiveVolumeDepartmentReview({
      volumeId: props.volumeId,
      reason: requestReason.value.trim() || undefined,
    })
    void message.success('已发起院系审核')
    requestReason.value = ''
    emit('refreshed')
  } catch (error) {
    showUserError(error, '发起院系审核失败')
    await navigateFirstChecklistBlocker()
  } finally {
    requesting.value = false
  }
}

async function handleApprove() {
  if (actionBusy.value === true) return
  // MVR-300：与 canApprove 同源二次拦截
  if (canApprove.value !== true) {
    void message.warning('当前账号无院系审核通过权限')
    return
  }
  approving.value = true
  try {
    await approveArchiveVolumeDepartmentReview({ volumeId: props.volumeId })
    void message.success('院系审核已通过')
    emit('refreshed')
  } catch (error) {
    showUserError(error, '院系审核通过失败')
    await navigateFirstChecklistBlocker()
  } finally {
    approving.value = false
  }
}

async function handleReject() {
  if (actionBusy.value === true) return
  // MVR-300：与 canApprove 同源二次拦截（驳回同审批职责）
  if (canApprove.value !== true) {
    void message.warning('当前账号无院系审核驳回权限')
    return
  }
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
    void message.success('已驳回院系审核')
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
  if (actionBusy.value === true) return
  // MVR-300：与 canWithdraw 同源二次拦截
  if (canWithdraw.value !== true) {
    void message.warning('当前账号无撤回院系审核权限')
    return
  }
  confirming.value = true
  const confirmed = await confirmAsync({
    title: '撤回院系审核？',
    content: '撤回后归档卷回到材料收集状态，原审核通过结果失效；补件完成后需要重新发起院系审核。',
    type: 'warning',
    okText: '确认撤回',
  })
  confirming.value = false
  if (!confirmed) return
  // MVR-934：确认后再次认 canWithdraw
  if (canWithdraw.value !== true) {
    void message.warning('当前账号无撤回院系审核权限')
    return
  }
  withdrawing.value = true
  try {
    await withdrawArchiveVolumeDepartmentReview({ volumeId: props.volumeId })
    void message.success('已撤回院系审核，可继续补件后重新发起')
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

/** 院系审核写入失败后按后端提交清单跳转首个真实业务阻断项。 */
async function navigateFirstChecklistBlocker() {
  try {
    const preview = await previewArchiveVolumeSubmitChecklist(props.volumeId)
    const blocker = preview.blockingItems?.find((item) => item.passed !== true)
    if (!blocker) return
    const navigation = resolveSubmitChecklistNavigation(blocker, props.detail.volume.examId)
    if (navigation.kind === 'examWorkspace') {
      navigateExamWorkspaceRoute(
        router,
        navigation.routeName,
        { examId: navigation.examId },
        '归档院系审核阻塞项考试门禁入口',
      )
      return
    }
    emit('navigate-tab', navigation.target.detailTabKey)
  } catch (error) {
    showUserError(error, '加载院系审核阻断项失败')
  }
}
</script>

<template>
  <WorkbenchSurfaceCard flush embedded class="dept-review-panel">
    <template v-if="showPanel" #head>
      <span>院系审核</span>
      <UiTag :tone="statusTone" size="sm">{{ statusLabel }}</UiTag>
    </template>
    <template v-if="showPanel" #toolbar>
      <UiButton
        v-if="canRequest === true"
        size="sm"
        variant="primary"
        :loading="requesting === true"
        :disabled="actionBusy === true && requesting !== true"
        @click="handleRequest"
      >
        发起院系审核
      </UiButton>
      <UiButton
        v-if="canApprove === true"
        size="sm"
        variant="primary"
        :loading="approving === true"
        :disabled="actionBusy === true && approving !== true"
        @click="handleApprove"
      >
        审核通过
      </UiButton>
      <UiButton
        v-if="canApprove === true"
        size="sm"
        variant="outline"
        :disabled="actionBusy === true"
        @click="rejectOpen = true"
      >
        驳回
      </UiButton>
      <UiButton
        v-if="canWithdraw === true"
        size="sm"
        variant="outline"
        :loading="withdrawing === true"
        :disabled="actionBusy === true && withdrawing !== true"
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
      <p v-if="hardDueBlocked === true" class="dept-review-panel__hint dept-review-panel__hint--danger">
        归档已逾期且本租户/院系启用硬截止，禁止发起院系审核；请由责任人在「任务设置」展期归档截止时刻后再操作。
      </p>
      <p v-if="detail.volume.departmentReviewRejectReason" class="dept-review-panel__reject">
        驳回原因：{{ detail.volume.departmentReviewRejectReason }}
      </p>
      <UiInput
        size="sm"
        v-if="canRequest === true"
        v-model="requestReason"
        placeholder="申请说明（可选）"
        class="dept-review-panel__input"
        :maxlength="500"
      />
      <p
        v-else-if="volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED"
        class="dept-review-panel__hint"
      >
        院系审核已通过，可提交档案馆验收；若提交前发现缺件，可撤回审核后继续补件。
      </p>
    </div>
    <UiEmpty v-else size="sm" description="当前任务尚未进入院系审核，或租户未启用院系审核门禁" />

    <UiDrawer
      :open="rejectOpen"
      title="驳回院系审核"
      :width="480"
      :confirm-loading="rejecting === true"
      ok-text="确认驳回"
      :hide-footer="false"
      @update:open="(v: boolean) => (rejectOpen = v)"
      @close="rejectOpen = false"
      @confirm="handleReject"
    >
      <UiTextarea
        size="sm"
        v-model="rejectReason"
        :rows="4"
        placeholder="驳回原因"
        :maxlength="500"
        :show-count="true"
      />
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.dept-review-panel {
  margin-bottom: var(--dp-space-component);
}

.dept-review-panel__body {
  padding: var(--dp-space-component) var(--dp-space-block);
}

.dept-review-panel__summary {
  margin-bottom: var(--dp-space-component);
}

.dept-review-panel__reject {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-error);
}

.dept-review-panel__input {
  max-width: 360px;
}

.dept-review-panel__hint {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-muted);
}

.dept-review-panel__hint--danger {
  margin-bottom: var(--dp-space-component-tight);
  color: var(--dp-error);
}
</style>
