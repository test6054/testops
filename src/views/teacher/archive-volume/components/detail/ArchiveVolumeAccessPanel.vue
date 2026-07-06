<template>
  <WorkbenchSurfaceCard flush class="archive-volume-access-panel">
    <template #head>
      <div class="archive-volume-access-panel__head">
        <h3 class="archive-volume-access-panel__title">查阅/借阅审批</h3>
        <UiButton v-if="canRequestAccess" size="sm" @click="openAccessRequest">发起借阅</UiButton>
      </div>
    </template>

    <UiSkeletonState v-if="accessLoading" variant="card" compact />
    <UiEmpty v-else-if="accessRecords.length === 0" description="暂无查阅记录" />
    <div v-else class="archive-volume-access-panel__list">
      <article
        v-for="record in accessRecords"
        :key="record.accessRecordId"
        class="approval-card"
        :class="archiveAccessApprovalCardClass(record.accessStatus)"
      >
        <div class="approval-card__head">
          <span class="approval-card__applicant">
            {{ archiveAccessApplicantLabel(
              record.applicantNickName,
              record.applicantIdentifier,
              record.applicantUserId,
            ) }}
          </span>
          <UiTag :tone="archiveAccessStatusTone(record.accessStatus)" size="sm">
            {{ archiveAccessStatusLabel(record.accessStatus) }}
          </UiTag>
          <span class="approval-card__time">{{ formatDateTime(record.createTime) }}</span>
        </div>
        <p v-if="record.accessReason" class="approval-card__reason">{{ record.accessReason }}</p>
        <p class="approval-card__meta">
          <span v-if="record.departmentName">{{ record.departmentName }}</span>
          <span v-if="record.approverNickName"> · 审批: {{ record.approverNickName }}</span>
          <span v-if="record.expireTime"> · 到期: {{ formatDateTime(record.expireTime) }}</span>
          <span v-if="record.watermarkApplied"> · 含水印</span>
        </p>
        <p v-if="record.decisionComment && record.accessStatus === 'REJECTED'" class="approval-card__reject">
          拒绝原因: {{ record.decisionComment }}
        </p>
        <p
          v-else-if="record.decisionComment && record.accessStatus === 'ACTIVE'"
          class="approval-card__meta"
        >
          审批意见: {{ record.decisionComment }}
        </p>
        <p
          v-if="record.accessStatus === 'ACTIVE' && record.lastReadPage != null"
          class="approval-card__meta"
        >
          最后阅读: 第 {{ record.lastReadPage }} 页
          <span v-if="record.downloadCount != null"> · 下载次数: {{ record.downloadCount }}</span>
        </p>
        <p
          v-else-if="record.accessStatus === 'ACTIVE' && record.downloadCount != null"
          class="approval-card__meta"
        >
          下载次数: {{ record.downloadCount }}
        </p>

        <div
          v-if="record.accessStatus === 'PENDING' && canApproveAccessRecord(record)"
          class="approval-card__actions"
        >
          <template v-if="rejectingRecordId === record.accessRecordId">
            <a-textarea
              v-model:value="rejectAccessComment"
              :rows="2"
              placeholder="填写驳回原因"
              class="approval-card__reject-input"
            />
            <div class="approval-card__action-row">
              <UiButton
                size="sm"
                variant="outline"
                :loading="rejectAccessSubmitting"
                @click="cancelReject"
              >
                取消
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :loading="rejectAccessSubmitting"
                @click="submitRejectAccess(record.accessRecordId)"
              >
                确认驳回
              </UiButton>
            </div>
          </template>
          <template v-else-if="approvingRecordId === record.accessRecordId">
            <a-textarea
              v-model:value="approveAccessComment"
              :rows="2"
              placeholder="可选审批意见"
              class="approval-card__reject-input"
            />
            <div class="approval-card__action-row">
              <UiButton size="sm" variant="outline" @click="cancelApprove">取消</UiButton>
              <UiButton
                size="sm"
                :loading="approveAccessSubmitting"
                @click="submitApproveAccess(record.accessRecordId)"
              >
                确认批准
              </UiButton>
            </div>
          </template>
          <template v-else>
            <UiButton size="sm" @click="startApprove(record.accessRecordId)">批准</UiButton>
            <UiButton size="sm" variant="outline" @click="startReject(record.accessRecordId)">
              拒绝
            </UiButton>
          </template>
        </div>

        <div
          v-if="record.accessStatus === 'ACTIVE' && record.applicantUserId === currentUserId"
          class="approval-card__actions"
        >
          <UiButton size="sm" variant="outline" @click="handleAccessDownload(record)">
            下载材料
          </UiButton>
          <UiButton size="sm" variant="outline" @click="handleAccessPreview(record)">
            在线预览
          </UiButton>
        </div>
      </article>
    </div>

    <UiDrawer
      :open="accessModalOpen"
      title="发起借阅"
      :width="520"
      :confirm-loading="accessSubmitting"
      ok-text="提交"
      :hide-footer="false"
      @update:open="(v: boolean) => (accessModalOpen = v)"
      @close="accessModalOpen = false"
      @confirm="submitAccessRequest"
    >
      <a-form layout="vertical">
        <a-form-item label="查阅原因" required>
          <a-textarea v-model:value="accessReason" :rows="3" placeholder="说明查阅用途" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      :open="readPageModalOpen"
      title="记录阅读页码"
      :width="520"
      :confirm-loading="readPageSubmitting"
      ok-text="保存"
      cancel-text="跳过"
      :hide-footer="false"
      @update:open="(v: boolean) => (readPageModalOpen = v)"
      @close="closeReadPageModal"
      @confirm="submitReadPage"
    >
      <a-form layout="vertical">
        <a-form-item label="最近阅读页" required>
          <a-input-number
            :value="readPageForm.lastReadPage"
            :min="1"
            :precision="0"
            style="width: 100%"
            @update:value="syncReadPageFormLastReadPage"
          />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type {
  ArchiveVolumeAccessReadPageRequest,
  ArchiveVolumeAccessRecordVO,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  approveArchiveVolumeAccess,
  downloadArchiveAccessMaterial,
  listArchiveVolumeAccessRecords,
  previewArchiveAccessMaterial,
  recordAccessReadPage,
  rejectArchiveVolumeAccess,
  requestArchiveVolumeAccess,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  archiveAccessApplicantLabel,
  archiveAccessApprovalCardClass,
  archiveAccessStatusLabel,
  archiveAccessStatusTone,
} from '@/utils/archive-access-record-ui'
import { showUserError } from '@/utils/error-handler'
import { handleBlobDownload } from '@/utils/file-download'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'ArchiveVolumeAccessPanel' })

const props = defineProps<{
  volumeId: string
  canRequestAccess: boolean
  canApproveAccessRecord: (record: ArchiveVolumeAccessRecordVO) => boolean
  currentUserId: string
}>()

const accessLoading = ref(false)
const accessSubmitting = ref(false)
const approvingRecordId = ref('')
const rejectingRecordId = ref('')
const rejectAccessSubmitting = ref(false)
const approveAccessSubmitting = ref(false)
const rejectAccessComment = ref('')
const approveAccessComment = ref('')
const readPageModalOpen = ref(false)
const readPageSubmitting = ref(false)
const readPageForm = reactive<ArchiveVolumeAccessReadPageRequest>({
  accessRecordId: '',
  lastReadPage: 1,
})
const accessRecords = ref<ArchiveVolumeAccessRecordVO[]>([])
const accessModalOpen = ref(false)
const accessReason = ref('')

async function loadAccessRecords() {
  if (!props.volumeId) return
  accessLoading.value = true
  try {
    accessRecords.value = await listArchiveVolumeAccessRecords(props.volumeId)
  } catch (error) {
    showUserError(error)
  } finally {
    accessLoading.value = false
  }
}

async function handleAccessDownload(record: ArchiveVolumeAccessRecordVO) {
  const materialId = record.materialId
  const downloadToken = record.downloadToken
  if (!materialId) {
    message.error('查阅记录未绑定材料，无法下载')
    return
  }
  if (!downloadToken) {
    message.error('查阅记录缺少下载令牌，请重新申请或联系审批人')
    return
  }
  await handleBlobDownload(
    () =>
      downloadArchiveAccessMaterial({
        accessRecordId: record.accessRecordId,
        materialId,
        downloadToken,
      }),
    'archive-access-material',
    { showSuccessMessage: true, successMessage: '材料下载已开始' },
  )
  await loadAccessRecords()
}

async function handleAccessPreview(record: ArchiveVolumeAccessRecordVO) {
  const materialId = record.materialId
  const downloadToken = record.downloadToken
  if (!materialId) {
    message.error('查阅记录未绑定材料，无法预览')
    return
  }
  if (!downloadToken) {
    message.error('查阅记录缺少下载令牌，请重新申请或联系审批人')
    return
  }
  try {
    const response = await previewArchiveAccessMaterial({
      accessRecordId: record.accessRecordId,
      materialId,
      downloadToken,
    })
    if (response.status !== 200 || !response.data || response.data.size === 0) {
      message.error('材料暂不能预览，请稍后重试')
      return
    }
    if (response.data.type === 'text/plain' || response.data.type === 'application/json') {
      message.error('材料暂不能预览，请稍后重试')
      return
    }
    const url = window.URL.createObjectURL(response.data)
    window.open(url, '_blank', 'noopener,noreferrer')
    readPageForm.accessRecordId = record.accessRecordId
    readPageForm.lastReadPage = record.lastReadPage ?? 1
    readPageModalOpen.value = true
  } catch (error) {
    showUserError(error, '材料预览失败')
  }
}

function resetReadPageForm() {
  readPageForm.accessRecordId = ''
  readPageForm.lastReadPage = 1
}

function syncReadPageFormLastReadPage(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    readPageForm.lastReadPage = value
  }
}

function closeReadPageModal() {
  resetReadPageForm()
}

async function submitReadPage() {
  if (!readPageForm.accessRecordId) {
    readPageModalOpen.value = false
    return
  }
  if (readPageForm.lastReadPage < 1) {
    message.warning('请输入有效页码')
    return
  }
  readPageSubmitting.value = true
  try {
    await recordAccessReadPage({
      accessRecordId: readPageForm.accessRecordId,
      lastReadPage: readPageForm.lastReadPage,
    })
    message.success('阅读页码已保存')
    readPageModalOpen.value = false
    resetReadPageForm()
    await loadAccessRecords()
  } catch (error) {
    showUserError(error)
  } finally {
    readPageSubmitting.value = false
  }
}

function openAccessRequest() {
  accessReason.value = ''
  accessModalOpen.value = true
}

async function submitAccessRequest() {
  if (!accessReason.value.trim()) {
    message.warning('请填写查阅原因')
    return
  }
  accessSubmitting.value = true
  try {
    await requestArchiveVolumeAccess({
      volumeId: props.volumeId,
      accessReason: accessReason.value.trim(),
    })
    message.success('查阅申请已提交')
    accessModalOpen.value = false
    await loadAccessRecords()
  } catch (error) {
    showUserError(error)
  } finally {
    accessSubmitting.value = false
  }
}

function startApprove(accessRecordId: string) {
  approvingRecordId.value = accessRecordId
  approveAccessComment.value = ''
  rejectingRecordId.value = ''
  rejectAccessComment.value = ''
}

function cancelApprove() {
  approvingRecordId.value = ''
  approveAccessComment.value = ''
}

async function submitApproveAccess(accessRecordId: string) {
  approveAccessSubmitting.value = true
  try {
    const decisionComment = approveAccessComment.value.trim()
    await approveArchiveVolumeAccess({
      accessRecordId,
      decisionComment: decisionComment || undefined,
    })
    message.success('已批准查阅')
    cancelApprove()
    await loadAccessRecords()
  } catch (error) {
    showUserError(error)
  } finally {
    approveAccessSubmitting.value = false
  }
}

function startReject(accessRecordId: string) {
  rejectingRecordId.value = accessRecordId
  rejectAccessComment.value = ''
  approvingRecordId.value = ''
  approveAccessComment.value = ''
}

function cancelReject() {
  rejectingRecordId.value = ''
  rejectAccessComment.value = ''
}

async function submitRejectAccess(accessRecordId: string) {
  if (!rejectAccessComment.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  rejectAccessSubmitting.value = true
  try {
    await rejectArchiveVolumeAccess({
      accessRecordId,
      decisionComment: rejectAccessComment.value.trim(),
    })
    message.success('已驳回查阅')
    cancelReject()
    await loadAccessRecords()
  } catch (error) {
    showUserError(error)
  } finally {
    rejectAccessSubmitting.value = false
  }
}

onMounted(() => {
  void loadAccessRecords()
})

defineExpose({ loadAccessRecords })
</script>

<style scoped>
.archive-volume-access-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  width: 100%;
}

.archive-volume-access-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--dp-text, #1a1d21);
}

.archive-volume-access-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
  padding: var(--dp-space-3, 12px) 0;
}

:deep(.approval-card__actions) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  margin-top: var(--dp-space-3, 12px);
}

:deep(.approval-card__action-row) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

:deep(.approval-card__reject-input) {
  width: 100%;
  margin-bottom: var(--dp-space-2, 8px);
}
</style>
