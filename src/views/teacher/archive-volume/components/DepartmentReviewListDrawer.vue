<script setup lang="ts">
import type { ArchiveVolumeDetailResponse } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import {
  approveArchiveVolumeDepartmentReview,
  getArchiveVolumeDetail,
  rejectArchiveVolumeDepartmentReview,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { showUserError } from '@/utils/error-handler'
import DepartmentReviewMaterialSummary from '@/views/teacher/archive-volume/components/DepartmentReviewMaterialSummary.vue'

const props = defineProps<{
  open: boolean
  volumeId: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "completed": []
  'open-detail': [volumeId: string, tabKey?: string]
}>()

const loading = ref(false)
const loadFailed = ref(false)
const detail = ref<ArchiveVolumeDetailResponse | null>(null)
const approving = ref(false)
const rejecting = ref(false)
const rejectReason = ref('')
const showRejectForm = ref(false)

const canApprove = computed(
  () =>
    detail.value?.volume.volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING
    && detail.value?.capabilities?.canApproveDepartmentReview === true,
)

const canShowSummary = computed(
  () => detail.value?.capabilities?.canReviewDepartmentMaterials === true,
)

const drawerTitle = computed(() => {
  const volume = detail.value?.volume
  if (!volume) return '院系审核'
  return volume.archiveTitle || volume.archiveNo || '院系审核'
})

watch(
  () => [props.open, props.volumeId] as const,
  ([open, volumeId]) => {
    if (!open || !volumeId) {
      detail.value = null
      loadFailed.value = false
      showRejectForm.value = false
      rejectReason.value = ''
      return
    }
    void loadDetail(volumeId)
  },
)

async function loadDetail(volumeId: string) {
  loading.value = true
  loadFailed.value = false
  try {
    detail.value = await getArchiveVolumeDetail(volumeId)
  } catch (error) {
    loadFailed.value = true
    detail.value = null
    showUserError(error, '加载院系审核材料摘要失败')
  } finally {
    loading.value = false
  }
}

function closeDrawer() {
  emit('update:open', false)
}

async function handleApprove() {
  if (!props.volumeId) return
  approving.value = true
  try {
    await approveArchiveVolumeDepartmentReview({ volumeId: props.volumeId })
    message.success('院系审核已通过')
    emit('completed')
    closeDrawer()
  } catch (error) {
    showUserError(error, '院系审核通过失败')
  } finally {
    approving.value = false
  }
}

async function handleReject() {
  if (!props.volumeId) return
  if (!rejectReason.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  rejecting.value = true
  try {
    await rejectArchiveVolumeDepartmentReview({
      volumeId: props.volumeId,
      rejectReason: rejectReason.value.trim(),
    })
    message.success('已驳回院系审核')
    emit('completed')
    closeDrawer()
  } catch (error) {
    showUserError(error, '院系审核驳回失败')
  } finally {
    rejecting.value = false
  }
}

function openDetail(tabKey?: string) {
  if (!props.volumeId) return
  emit('open-detail', props.volumeId, tabKey)
  closeDrawer()
}
</script>

<template>
  <UiDrawer
    :open="open"
    :title="drawerTitle"
    :width="560"
    :hide-footer="true"
    @update:open="(v: boolean) => emit('update:open', v)"
    @close="closeDrawer"
  >
    <UiSkeletonState v-if="loading" variant="card" compact />
    <a-result
      v-else-if="loadFailed"
      status="error"
      title="材料摘要加载失败"
      sub-title="请打开详情页查看完整材料"
    />
    <template v-else-if="detail">
      <div class="dept-review-list-drawer__meta">
        <span>{{ detail.volume.archiveNo }}</span>
        <UiTag tone="orange" size="sm">待院系审核</UiTag>
        <span v-if="detail.volume.teachingClassName">{{ detail.volume.teachingClassName }}</span>
        <span v-if="detail.volume.departmentName">{{ detail.volume.departmentName }}</span>
      </div>
      <DepartmentReviewMaterialSummary
        v-if="canShowSummary && volumeId"
        :volume-id="volumeId"
        :detail="detail"
      />
      <p v-else class="dept-review-list-drawer__denied">
        当前账号不具备院系材料核对权限，请打开详情页或联系管理员。
      </p>
      <div class="dept-review-list-drawer__links">
        <UiTextAction @click="openDetail('materials')">打开详情 · 材料收集</UiTextAction>
        <UiTextAction @click="openDetail('integrity')">打开详情 · 完整性与四性</UiTextAction>
      </div>
      <div v-if="canApprove" class="dept-review-list-drawer__actions">
        <UiButton variant="primary" size="sm" :loading="approving" @click="handleApprove">
          审核通过
        </UiButton>
        <UiButton v-if="!showRejectForm" variant="outline" size="sm" @click="showRejectForm = true">
          驳回
        </UiButton>
      </div>
      <div v-if="canApprove && showRejectForm" class="dept-review-list-drawer__reject">
        <a-textarea v-model:value="rejectReason" :rows="3" placeholder="驳回原因" />
        <div class="dept-review-list-drawer__reject-actions">
          <UiButton variant="outline" size="sm" :loading="rejecting" @click="handleReject">
            确认驳回
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="showRejectForm = false">取消</UiButton>
        </div>
      </div>
    </template>
  </UiDrawer>
</template>

<style scoped lang="scss">
.dept-review-list-drawer__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.dept-review-list-drawer__denied {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-text-muted);
}

.dept-review-list-drawer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.dept-review-list-drawer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--dp-border-light);
}

.dept-review-list-drawer__reject {
  margin-top: 12px;
}

.dept-review-list-drawer__reject-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
