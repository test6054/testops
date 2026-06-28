<template>
  <div class="archive-volume-material-table">
    <div v-if="canRegisterMaterial" class="archive-volume-material-table__toolbar">
      <UiButton size="sm" @click="openUploadModal">登记材料</UiButton>
      <UiButton size="sm" variant="outline" @click="openArchiveScan">一体机扫描</UiButton>
      <UiButton size="sm" variant="outline" @click="batchRegisterOpen = true">批量登记</UiButton>
      <UiButton size="sm" variant="outline" @click="courseSyncOpen = true">课程平台同步</UiButton>
      <UiButton size="sm" variant="outline" @click="openSharedRefModal">引用合用材料</UiButton>
    </div>
    <UiDataTable
      pagination-mode="none"
      :columns="materialColumns"
      :data-source="filteredMaterials"
      :show-pagination="false"
      flat
      row-key="materialId"
      size="middle"
      empty-description="该目录项下暂无材料"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'materialType'">
          {{ materialTypeLabel(record.materialType) }}
        </template>
        <template v-else-if="column.key === 'submissionStatus'">
          <UiTag
            v-if="record.submissionStatus"
            :tone="submissionStatusTone(record.submissionStatus)"
            size="sm"
          >
            {{ submissionStatusLabel(record.submissionStatus) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'ocrStatus'">
          <UiTag
            v-if="record.ocrStatus"
            :tone="materialOcrStatusTone(record.ocrStatus)"
            size="sm"
          >
            {{ materialOcrStatusLabel(record.ocrStatus) }}
          </UiTag>
          <span
            v-if="record.ocrStatus === 'FAILED' && record.ocrFailureReason"
            class="archive-volume-material-table__ocr-failure"
          >
            {{ record.ocrFailureReason }}
          </span>
        </template>
        <template v-else-if="column.key === 'materialActions'">
          <UiTextAction
            v-if="canViewMaterialOcr(record)"
            tone="primary"
            @click="openMaterialOcrDetail(record)"
          >
            查看 OCR
          </UiTextAction>
          <UiTextAction
            v-if="canRetryMaterialOcr(record)"
            tone="primary"
            @click="confirmRetryMaterialOcr(record)"
          >
            重试 OCR
          </UiTextAction>
        </template>
      </template>
    </UiDataTable>

    <a-modal
      v-model:open="uploadModalOpen"
      title="登记归档材料"
      :confirm-loading="uploading"
      ok-text="登记"
      cancel-text="取消"
      @ok="submitMaterial"
    >
      <a-form layout="vertical">
        <a-form-item label="材料类型" required>
          <a-select
            v-model:value="uploadForm.materialType"
            :options="materialTypeOptions"
            placeholder="选择材料类型"
          />
        </a-form-item>
        <a-form-item label="学号">
          <a-input v-model:value="uploadForm.studentNo" placeholder="学生试卷可填学号" />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input v-model:value="uploadForm.studentName" placeholder="学生姓名" />
        </a-form-item>
        <a-form-item label="重修/补考">
          <a-checkbox v-model:checked="uploadForm.retakeFlag">标记为重修或补考答卷</a-checkbox>
        </a-form-item>
        <a-form-item v-if="uploadForm.retakeFlag" label="补考轮次">
          <a-input v-model:value="uploadForm.makeupRound" placeholder="如 补考1" />
        </a-form-item>
        <a-form-item label="扫描文件" required>
          <UiPlatformFileField
            v-model:file-node-id="uploadForm.fileNodeId"
            v-model:file-name="uploadForm.fileName"
            :scene-key="FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL"
            button-text="选择文件"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="sharedRefModalOpen"
      title="引用合用材料"
      :confirm-loading="sharedRefSubmitting"
      ok-text="保存引用"
      cancel-text="取消"
      @ok="submitSharedRef"
    >
      <a-form layout="vertical">
        <a-form-item label="引用类型" required>
          <a-select
            v-model:value="sharedRefForm.refType"
            :options="sharedRefTypeOptions"
            placeholder="选择引用类型"
          />
        </a-form-item>
        <a-form-item label="目标卷 ID" required>
          <a-input v-model:value="sharedRefForm.targetVolumeId" placeholder="合用材料所在归档卷 ID" />
        </a-form-item>
        <a-form-item label="目标材料 ID" required>
          <a-input v-model:value="sharedRefForm.targetMaterialId" placeholder="目标材料 ID" />
        </a-form-item>
        <a-form-item label="目录备注">
          <a-input v-model:value="sharedRefForm.catalogNote" placeholder="如 合用材料见××班级卷" />
        </a-form-item>
      </a-form>
    </a-modal>

    <ArchiveVolumeBatchRegisterModal
      v-model:open="batchRegisterOpen"
      :volume-id="volumeId"
      @success="emitRefreshed"
    />
    <ArchiveVolumeCourseSyncModal
      v-model:open="courseSyncOpen"
      :volume-id="volumeId"
      @success="emitRefreshed"
    />
    <ArchiveVolumeMaterialOcrDetailModal
      v-model:open="ocrDetailOpen"
      :material-id="ocrDetailMaterialId"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveMaterialSubmissionStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveVolumeDetailVO,
  ArchiveVolumeMaterialVO,
} from '@/apis/mark/archive-volume'
import type { PaperArchiveOcrStatusCode } from '@/apis/mark/paper-archive'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ARCHIVE_MATERIAL_SUBMISSION_STATUS_LABEL,
  ARCHIVE_MATERIAL_SUBMISSION_STATUS_TONE,
  ARCHIVE_MATERIAL_TYPE_LABEL,
  registerArchiveSharedMaterialRef,
  registerArchiveVolumeMaterial,
  triggerArchiveVolumeMaterialOcr,
} from '@/apis/mark/archive-volume'
import {
  PAPER_ARCHIVE_OCR_STATUS_LABEL,
  PAPER_ARCHIVE_OCR_STATUS_TONE,
} from '@/apis/mark/paper-archive'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeBatchRegisterModal from '@/views/teacher/archive-volume/archive-volume-batch-register-modal.vue'
import ArchiveVolumeCourseSyncModal from '@/views/teacher/archive-volume/archive-volume-course-sync-modal.vue'
import ArchiveVolumeMaterialOcrDetailModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue'

defineOptions({ name: 'ArchiveVolumeMaterialTablePanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailVO
  selectedCatalogKeys: string[]
  canRegisterMaterial: boolean
}>()

const emit = defineEmits<{
  "refreshed": [options?: { silent?: boolean }]
  'ocr-completed-stale': []
}>()

const route = useRoute()
const router = useRouter()
const batchRegisterOpen = ref(false)
const courseSyncOpen = ref(false)
const uploading = ref(false)
const uploadModalOpen = ref(false)
const sharedRefModalOpen = ref(false)
const sharedRefSubmitting = ref(false)
const ocrDetailOpen = ref(false)
const ocrDetailMaterialId = ref<string>()

const uploadForm = reactive({
  materialType: undefined as ArchiveMaterialTypeCode | undefined,
  fileNodeId: undefined as string | undefined,
  fileName: undefined as string | undefined,
  studentNo: '',
  studentName: '',
  retakeFlag: false,
  makeupRound: '',
})
const sharedRefForm = reactive({
  refType: 'MERGED_CLASS_SHARED' as 'UNIFIED_EXAM_PUBLIC' | 'MERGED_CLASS_SHARED',
  targetVolumeId: '',
  targetMaterialId: '',
  catalogNote: '',
})
const sharedRefTypeOptions = [
  { value: 'UNIFIED_EXAM_PUBLIC', label: '统考公用' },
  { value: 'MERGED_CLASS_SHARED', label: '合班合用' },
]

const materialTypeOptions = Object.entries(ARCHIVE_MATERIAL_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const materialColumns: ColumnsType<ArchiveVolumeMaterialVO> = [
  { title: '材料类型', key: 'materialType', width: 160 },
  { title: '目录编码', dataIndex: 'catalogCode', width: 120 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '提交状态', key: 'submissionStatus', width: 120 },
  { title: 'OCR 状态', key: 'ocrStatus', width: 160 },
  { title: '操作', key: 'materialActions', width: 160 },
]

const filteredMaterials = computed(() => {
  const materials = props.detail.materials ?? []
  const key = props.selectedCatalogKeys[0]
  if (!key) return materials
  return materials.filter(item => (item.catalogCode || item.materialType) === key)
})

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

function submissionStatusLabel(code: ArchiveMaterialSubmissionStatusCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_SUBMISSION_STATUS_LABEL, code, 'submissionStatus')
}

function submissionStatusTone(code: ArchiveMaterialSubmissionStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_MATERIAL_SUBMISSION_STATUS_TONE, code, 'submissionStatus')
}

function materialOcrStatusLabel(code: PaperArchiveOcrStatusCode) {
  return strictEnumLabel(PAPER_ARCHIVE_OCR_STATUS_LABEL, code, 'ocrStatus')
}

function materialOcrStatusTone(code: PaperArchiveOcrStatusCode): BadgeTone {
  return strictEnumTone(PAPER_ARCHIVE_OCR_STATUS_TONE, code, 'ocrStatus')
}

function canRetryMaterialOcr(material: ArchiveVolumeMaterialVO): boolean {
  return material.ocrStatus === 'FAILED' && Boolean(material.fileId)
}

function canViewMaterialOcr(material: ArchiveVolumeMaterialVO): boolean {
  return material.ocrStatus === 'COMPLETED' || material.ocrStatus === 'FAILED' || material.ocrStatus === 'RUNNING'
}

function openMaterialOcrDetail(material: ArchiveVolumeMaterialVO): void {
  ocrDetailMaterialId.value = material.materialId
  ocrDetailOpen.value = true
}

function emitRefreshed(options?: { silent?: boolean }) {
  emit('refreshed', options)
}

function confirmRetryMaterialOcr(material: ArchiveVolumeMaterialVO): void {
  void confirmAsync({
    title: '重试 OCR 识别？',
    content: `材料「${material.fileName ?? material.materialId}」将重新进入 OCR 队列。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
    onOk: async () => {
      try {
        await triggerArchiveVolumeMaterialOcr(material.materialId)
        message.success('已入队，等待识别')
        emitRefreshed()
      }
      catch (error) {
        showUserError(error, 'OCR 重试提交失败')
      }
    },
  })
}

let materialOcrPollTimer: ReturnType<typeof setInterval> | null = null

const shouldPollMaterialOcr = computed(() =>
  (props.detail.materials ?? []).some(
    item => item.ocrStatus === 'PENDING' || item.ocrStatus === 'RUNNING',
  ),
)

watch(shouldPollMaterialOcr, (shouldPoll, wasPolling) => {
  if (shouldPoll && !materialOcrPollTimer) {
    materialOcrPollTimer = setInterval(() => {
      emitRefreshed({ silent: true })
    }, 5000)
  }
  else if (!shouldPoll && materialOcrPollTimer) {
    clearInterval(materialOcrPollTimer)
    materialOcrPollTimer = null
  }
  if (wasPolling && !shouldPoll) {
    void (async () => {
      emitRefreshed({ silent: true })
      if (props.detail.fourPropertyStale) {
        emit('ocr-completed-stale')
      }
    })()
  }
}, { immediate: true })

onUnmounted(() => {
  if (materialOcrPollTimer) {
    clearInterval(materialOcrPollTimer)
    materialOcrPollTimer = null
  }
})

function openUploadModal() {
  uploadForm.materialType = undefined
  uploadForm.fileNodeId = undefined
  uploadForm.fileName = undefined
  uploadForm.studentNo = ''
  uploadForm.studentName = ''
  uploadForm.retakeFlag = false
  uploadForm.makeupRound = ''
  uploadModalOpen.value = true
}

function resolveArchiveScanQuery(): Record<string, string> | null {
  const key = props.selectedCatalogKeys[0]
  if (!key) {
    return null
  }
  const query: Record<string, string> = {
    volumeId: props.volumeId,
    returnTo: route.fullPath,
    batchMode: 'PER_PAGE',
  }
  if (key in ARCHIVE_MATERIAL_TYPE_LABEL) {
    query.materialType = key
    return query
  }
  const material = props.detail.materials.find(item => item.catalogCode === key)
  const missing = props.detail.latestIntegrityCheck?.missingItems?.find(item => item.catalogCode === key)
  const resolvedMaterialType = material?.materialType ?? missing?.materialType
  if (!resolvedMaterialType) {
    return null
  }
  query.catalogCode = key
  query.materialType = resolvedMaterialType
  return query
}

function openArchiveScan() {
  const query = resolveArchiveScanQuery()
  if (!query) {
    message.warning('请先在左侧目录选择可登记的材料项')
    return
  }
  void router.push({ path: '/scanner-kiosk/archive/session', query })
}

function openSharedRefModal() {
  sharedRefForm.refType = 'MERGED_CLASS_SHARED'
  sharedRefForm.targetVolumeId = ''
  sharedRefForm.targetMaterialId = ''
  sharedRefForm.catalogNote = ''
  sharedRefModalOpen.value = true
}

async function submitMaterial() {
  if (!uploadForm.materialType || !uploadForm.fileNodeId) {
    message.warning('请选择材料类型和文件')
    return
  }
  uploading.value = true
  try {
    const ext = uploadForm.fileName?.includes('.')
      ? uploadForm.fileName.split('.').pop() ?? 'bin'
      : 'bin'
    await registerArchiveVolumeMaterial({
      volumeId: props.volumeId,
      materialType: uploadForm.materialType,
      fileId: uploadForm.fileNodeId,
      mediaType: 'ELECTRONIC',
      fileFormat: ext,
      sortRule: uploadForm.retakeFlag ? 'STUDENT_NO' : 'CATALOG_ORDER',
      electronicOriginalStatus: 'SCANNED',
      studentNo: uploadForm.studentNo.trim() || undefined,
      studentName: uploadForm.studentName.trim() || undefined,
      retakeFlag: uploadForm.retakeFlag || undefined,
      makeupRound: uploadForm.makeupRound.trim() || undefined,
      triggerOcr: true,
    })
    message.success('材料登记成功')
    uploadModalOpen.value = false
    emitRefreshed()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    uploading.value = false
  }
}

async function submitSharedRef() {
  if (!sharedRefForm.targetVolumeId.trim() || !sharedRefForm.targetMaterialId.trim()) {
    message.warning('请填写目标卷与材料 ID')
    return
  }
  sharedRefSubmitting.value = true
  try {
    await registerArchiveSharedMaterialRef({
      volumeId: props.volumeId,
      refType: sharedRefForm.refType,
      targetVolumeId: sharedRefForm.targetVolumeId.trim(),
      targetMaterialId: sharedRefForm.targetMaterialId.trim(),
      catalogNote: sharedRefForm.catalogNote.trim() || undefined,
    })
    message.success('合用材料引用已保存')
    sharedRefModalOpen.value = false
    emitRefreshed()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    sharedRefSubmitting.value = false
  }
}
</script>

<style scoped>
.archive-volume-material-table {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-material-table__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-material-table__ocr-failure {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}
</style>
