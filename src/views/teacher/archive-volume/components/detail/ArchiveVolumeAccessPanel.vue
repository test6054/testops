<template>
  <WorkbenchSurfaceCard flush class="archive-volume-access-panel">
    <template #head>
      <div class="archive-volume-access-panel__head">
        <h3 class="archive-volume-access-panel__title">查阅/借阅审批</h3>
        <UiButton v-if="canRequestAccess" size="sm" @click="openAccessRequest">发起借阅</UiButton>
      </div>
    </template>

    <UiSkeletonState v-if="accessLoading" variant="card" compact />
    <div v-else-if="accessLoadFailed" class="archive-volume-access-panel__load-error">
      <p>查阅记录加载失败</p>
      <UiButton size="sm" variant="outline" @click="loadAccessRecords">重试</UiButton>
    </div>
    <UiEmpty size="sm" v-else-if="accessRecords.length === 0" description="暂无查阅记录" />
    <div v-else class="archive-volume-access-panel__list">
      <article
        v-for="record in accessRecords"
        :key="record.accessRecordId"
        class="approval-card"
        :class="archiveAccessApprovalCardClass(record.accessStatus)"
      >
        <div class="approval-card__head">
          <span class="approval-card__applicant">
            {{
              archiveAccessApplicantLabel(
                record.applicantNickName,
                record.applicantIdentifier,
                record.applicantUserId,
              )
            }}
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
        <p
          v-if="record.decisionComment && record.accessStatus === ArchiveAccessStatusCode.REJECTED"
          class="approval-card__reject"
        >
          拒绝原因: {{ record.decisionComment }}
        </p>
        <p
          v-else-if="
            record.decisionComment && record.accessStatus === ArchiveAccessStatusCode.ACTIVE
          "
          class="approval-card__meta"
        >
          审批意见: {{ record.decisionComment }}
        </p>
        <p
          v-if="
            record.accessStatus === ArchiveAccessStatusCode.ACTIVE && record.lastReadPage != null
          "
          class="approval-card__meta"
        >
          最后阅读: 第 {{ record.lastReadPage }} 页
          <span v-if="record.downloadCount != null"> · 下载次数: {{ record.downloadCount }}</span>
        </p>
        <p
          v-else-if="
            record.accessStatus === ArchiveAccessStatusCode.ACTIVE && record.downloadCount != null
          "
          class="approval-card__meta"
        >
          下载次数: {{ record.downloadCount }}
        </p>

        <div
          v-if="
            record.accessStatus === ArchiveAccessStatusCode.PENDING
              && canApproveAccessRecord(record)
          "
          class="approval-card__actions"
        >
          <template v-if="rejectingRecordId === record.accessRecordId">
            <UiTextarea
              size="sm"
              v-model="rejectAccessComment"
              :maxlength="500"
              :rows="2"
              placeholder="填写驳回原因"
              class="approval-card__reject-input"
              :show-count="true"
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
            <UiTextarea
              size="sm"
              v-model="approveAccessComment"
              :maxlength="500"
              :rows="2"
              placeholder="可选审批意见"
              class="approval-card__reject-input"
              :show-count="true"
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
          v-if="
            record.accessStatus === ArchiveAccessStatusCode.ACTIVE
              && record.applicantUserId === currentUserId
          "
          class="approval-card__actions"
        >
          <UiSelect
            size="sm"
            v-if="!record.materialId"
            v-model="activeMaterialSelections[record.accessRecordId]"
            :options="materialOptions"
            placeholder="选择要查阅的材料"
            class="approval-card__material-select"
          />
          <UiButton
            size="sm"
            variant="outline"
            :loading="accessDownloadBusyId === record.accessRecordId"
            :disabled="!resolveAccessMaterialId(record) || !!accessDownloadBusyId || !!accessPreviewBusyId"
            @click="handleAccessDownload(record)"
          >
            下载材料
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :loading="accessPreviewBusyId === record.accessRecordId"
            :disabled="!resolveAccessMaterialId(record) || !!accessDownloadBusyId || !!accessPreviewBusyId"
            @click="handleAccessPreview(record)"
          >
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
      <UiForm layout="vertical">
        <UiFormItem label="查阅范围" required>
          <UiSelect
            size="sm" v-model="accessRequestMaterialId" :options="accessScopeOptions"
          />
        </UiFormItem>
        <UiFormItem label="查阅原因" required>
          <UiTextarea
            size="sm"
            v-model="accessReason"
            :maxlength="500"
            :rows="3"
            placeholder="说明查阅用途"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
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
      <UiForm layout="vertical">
        <UiFormItem label="最近阅读页" required>
          <UiInputNumber
            size="sm"
            :value="readPageForm.lastReadPage"
            :min="1"
            :precision="0"
            style="width: 100%"
            @update:value="syncReadPageFormLastReadPage"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type {
  ArchiveVolumeAccessReadPageRequest,
  ArchiveVolumeAccessRecordResponse,
  ArchiveVolumeMaterialResponse,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  approveArchiveVolumeAccess,
  ArchiveAccessStatusCode,
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
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  archiveAccessApplicantLabel,
  archiveAccessApprovalCardClass,
  archiveAccessStatusLabel,
  archiveAccessStatusTone,
} from '@/utils/archive-access-record-ui'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { handleBlobDownload } from '@/utils/file-download'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'ArchiveVolumeAccessPanel' })

const props = defineProps<{
  volumeId: string
  canRequestAccess: boolean
  canApproveAccessRecord: (record: ArchiveVolumeAccessRecordResponse) => boolean
  currentUserId: string
  materials: ArchiveVolumeMaterialResponse[]
}>()

const accessDownloadBusyId = ref<string | null>(null)
const accessPreviewBusyId = ref<string | null>(null)
const accessLoading = ref(false)
const accessLoadFailed = ref(false)
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
const accessRecords = ref<ArchiveVolumeAccessRecordResponse[]>([])
const accessModalOpen = ref(false)
const accessReason = ref('')
const accessRequestMaterialId = ref('')
const activeMaterialSelections = reactive<Record<string, string | undefined>>({})

const materialOptions = computed(() =>
  props.materials
    .filter((material) => Boolean(material.materialId && material.fileId))
    .map((material) => ({
      value: material.materialId,
      label: material.fileName || material.catalogCode || material.materialType,
    })),
)

const accessScopeOptions = computed(() => [
  { value: '', label: '整卷全部材料' },
  ...materialOptions.value,
])

async function loadAccessRecords() {
  if (!props.volumeId) return
  accessLoading.value = true
  try {
    const records = await listArchiveVolumeAccessRecords(props.volumeId)
    accessRecords.value = records
    accessLoadFailed.value = false
  } catch (error) {
    showUserError(error, '加载查阅记录失败')
    accessLoadFailed.value = true
  } finally {
    accessLoading.value = false
  }
}

async function handleAccessDownload(record: ArchiveVolumeAccessRecordResponse) {
  if (accessDownloadBusyId.value || accessPreviewBusyId.value) return
  const materialId = resolveAccessMaterialId(record)
  const downloadToken = record.downloadToken
  if (!materialId) {
    message.error('查阅记录未绑定材料，无法下载')
    return
  }
  if (!downloadToken) {
    message.error('查阅记录缺少下载令牌，请重新申请或联系审批人')
    return
  }
  accessDownloadBusyId.value = record.accessRecordId
  try {
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
  } finally {
    accessDownloadBusyId.value = null
  }
}

async function handleAccessPreview(record: ArchiveVolumeAccessRecordResponse) {
  if (accessDownloadBusyId.value || accessPreviewBusyId.value) return
  const materialId = resolveAccessMaterialId(record)
  const downloadToken = record.downloadToken
  if (!materialId) {
    message.error('查阅记录未绑定材料，无法预览')
    return
  }
  if (!downloadToken) {
    message.error('查阅记录缺少下载令牌，请重新申请或联系审批人')
    return
  }
  accessPreviewBusyId.value = record.accessRecordId
  try {
    const response = await previewArchiveAccessMaterial({
      accessRecordId: record.accessRecordId,
      materialId,
      downloadToken,
    })
    if (response.status !== 200 || !response.data || response.data.size === 0) {
      message.error('材料暂不能预览')
      return
    }
    if (response.data.type === 'text/plain' || response.data.type === 'application/json') {
      message.error('材料暂不能预览')
      return
    }
    const url = window.URL.createObjectURL(response.data)
    window.open(url, '_blank', 'noopener,noreferrer')
    readPageForm.accessRecordId = record.accessRecordId
    readPageForm.lastReadPage = record.lastReadPage ?? 1
    readPageModalOpen.value = true
  } catch (error) {
    showUserError(error, '材料预览失败')
  } finally {
    accessPreviewBusyId.value = null
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
  if (readPageSubmitting.value) return
  if (!readPageForm.accessRecordId) {
    readPageModalOpen.value = false
    return
  }
  if (readPageForm.lastReadPage < 1) {
    showFormValidationMessage('请输入有效页码')
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
    showUserError(error, '保存阅读页码失败')
  } finally {
    readPageSubmitting.value = false
  }
}

function openAccessRequest() {
  accessReason.value = ''
  accessRequestMaterialId.value = ''
  accessModalOpen.value = true
}

function resolveAccessMaterialId(record: ArchiveVolumeAccessRecordResponse): string | undefined {
  return record.materialId || activeMaterialSelections[record.accessRecordId]
}

async function submitAccessRequest() {
  if (accessSubmitting.value) return
  if (!accessReason.value.trim()) {
    showFormValidationMessage('请填写查阅原因')
    return
  }
  accessSubmitting.value = true
  try {
    await requestArchiveVolumeAccess({
      volumeId: props.volumeId,
      materialId: accessRequestMaterialId.value || undefined,
      accessReason: accessReason.value.trim(),
    })
    message.success('查阅申请已提交')
    accessModalOpen.value = false
    await loadAccessRecords()
  } catch (error) {
    showUserError(error, '提交查阅申请失败')
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
  if (approveAccessSubmitting.value) return
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
    showUserError(error, '批准查阅失败')
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
  if (rejectAccessSubmitting.value) return
  if (!rejectAccessComment.value.trim()) {
    showFormValidationMessage('请填写驳回原因')
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
    showUserError(error, '驳回查阅失败')
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
  gap: var(--dp-space-3);
  width: 100%;
}

.archive-volume-access-panel__load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
}

.archive-volume-access-panel__load-error p {
  margin: 0;
  color: var(--dp-text-secondary);
}

.approval-card__material-select {
  min-width: 220px;
}

.archive-volume-access-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--dp-text);
}

.archive-volume-access-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
  padding: var(--dp-space-3) 0;
}

:deep(.approval-card__actions) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  margin-top: var(--dp-space-3);
}

:deep(.approval-card__action-row) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

:deep(.approval-card__reject-input) {
  width: 100%;
  margin-bottom: var(--dp-space-2);
}
</style>
