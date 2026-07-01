<template>
  <section class="archive-volume-access-panel">
    <UiButton v-if="canRequestAccess" size="sm" @click="openAccessRequest">申请查阅</UiButton>
    <UiDataTable
      pagination-mode="none"
      :columns="accessColumns"
      :data-source="accessRecords"
      :loading="accessLoading"
      :show-pagination="false"
      flat
      row-key="accessRecordId"
      size="middle"
      empty-description="暂无查阅记录"
      class="archive-volume-access-panel__table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'accessStatus'">
          <UiTag :tone="accessStatusTone(record.accessStatus)" size="sm">
            {{ accessStatusLabel(record.accessStatus) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'approvedTime'">
          {{ formatDateTime(record.approvedTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTextAction
            v-if="record.accessStatus === 'PENDING' && canApproveAccessRecord(record)"
            tone="primary"
            @click="handleApproveAccess(record.accessRecordId)"
          >
            批准
          </UiTextAction>
          <UiTextAction
            v-if="record.accessStatus === 'PENDING' && canApproveAccessRecord(record)"
            @click="handleRejectAccess(record.accessRecordId)"
          >
            驳回
          </UiTextAction>
          <UiTextAction
            v-if="record.accessStatus === 'ACTIVE' && record.applicantUserId === currentUserId"
            tone="primary"
            @click="handleAccessDownload(record)"
          >
            下载材料
          </UiTextAction>
          <UiTextAction
            v-if="record.accessStatus === 'ACTIVE' && record.applicantUserId === currentUserId"
            @click="handleAccessPreview(record)"
          >
            在线预览
          </UiTextAction>
        </template>
      </template>
    </UiDataTable>

    <a-modal
      v-model:open="accessModalOpen"
      title="申请查阅"
      :confirm-loading="accessSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitAccessRequest"
    >
      <a-form layout="vertical">
        <a-form-item label="查阅原因" required>
          <a-textarea v-model:value="accessReason" :rows="3" placeholder="说明查阅用途" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="rejectAccessOpen"
      title="驳回查阅"
      :confirm-loading="rejectAccessSubmitting"
      ok-text="确认驳回"
      cancel-text="取消"
      @ok="submitRejectAccess"
    >
      <a-form layout="vertical">
        <a-form-item label="驳回原因" required>
          <a-textarea v-model:value="rejectAccessComment" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="readPageModalOpen"
      title="记录阅读页码"
      :confirm-loading="readPageSubmitting"
      ok-text="保存"
      cancel-text="跳过"
      @ok="submitReadPage"
      @cancel="closeReadPageModal"
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
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveAccessStatusCode,
  ArchiveVolumeAccessReadPageRequest,
  ArchiveVolumeAccessRecordVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  approveArchiveVolumeAccess,
  ARCHIVE_ACCESS_STATUS_LABEL,
  ARCHIVE_ACCESS_STATUS_TONE,
  downloadArchiveAccessMaterial,
  listArchiveVolumeAccessRecords,
  previewArchiveAccessMaterial,
  recordAccessReadPage,
  rejectArchiveVolumeAccess,
  requestArchiveVolumeAccess,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { showUserError } from '@/utils/error-handler'
import { handleBlobDownload } from '@/utils/file-download'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeAccessPanel' })

const props = defineProps<{
  volumeId: string
  canRequestAccess: boolean
  canApproveAccessRecord: (record: ArchiveVolumeAccessRecordVO) => boolean
  currentUserId: string
}>()

const accessLoading = ref(false)
const accessSubmitting = ref(false)
const rejectAccessOpen = ref(false)
const rejectAccessSubmitting = ref(false)
const rejectAccessComment = ref('')
const rejectAccessRecordId = ref('')
const readPageModalOpen = ref(false)
const readPageSubmitting = ref(false)
const readPageForm = reactive<ArchiveVolumeAccessReadPageRequest>({
  accessRecordId: '',
  lastReadPage: 1,
})
const accessRecords = ref<ArchiveVolumeAccessRecordVO[]>([])
const accessModalOpen = ref(false)
const accessReason = ref('')

const accessColumns: ColumnsType<ArchiveVolumeAccessRecordVO> = [
  { title: '状态', key: 'accessStatus', width: 100 },
  { title: '原因', dataIndex: 'accessReason' },
  { title: '最近阅读页', dataIndex: 'lastReadPage', width: 100 },
  { title: '批准时间', key: 'approvedTime', width: 160 },
  { title: '操作', key: 'actions', width: 180 },
]

function accessStatusLabel(code: ArchiveAccessStatusCode) {
  return strictEnumLabel(ARCHIVE_ACCESS_STATUS_LABEL, code, 'accessStatus')
}

function accessStatusTone(code: ArchiveAccessStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_ACCESS_STATUS_TONE, code, 'accessStatus')
}

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

async function handleApproveAccess(accessRecordId: string) {
  try {
    await approveArchiveVolumeAccess({ accessRecordId })
    message.success('已批准查阅')
    await loadAccessRecords()
  } catch (error) {
    showUserError(error)
  }
}

async function handleRejectAccess(accessRecordId: string) {
  rejectAccessRecordId.value = accessRecordId
  rejectAccessComment.value = ''
  rejectAccessOpen.value = true
}

async function submitRejectAccess() {
  if (!rejectAccessComment.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  rejectAccessSubmitting.value = true
  try {
    await rejectArchiveVolumeAccess({
      accessRecordId: rejectAccessRecordId.value,
      decisionComment: rejectAccessComment.value.trim(),
    })
    message.success('已驳回查阅')
    rejectAccessOpen.value = false
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
.archive-volume-access-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-access-panel__table {
  margin-top: var(--dp-space-3, 12px);
}
</style>
