<template>
  <a-modal
    :open="open"
    title="课程平台材料同步"
    width="880"
    :confirm-loading="submitting"
    ok-text="同步"
    cancel-text="取消"
    @update:open="emit('update:open', $event)"
    @ok="handleSubmit"
  >
    <a-form layout="vertical">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="来源系统" required>
            <a-input v-model:value="form.sourceSystem" placeholder="如 COURSE_PLATFORM" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="幂等键" required>
            <a-input v-model:value="form.idempotencyKey" placeholder="同键重放须 payload 一致" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
    <div class="archive-volume-course-sync__toolbar">
      <UiButton size="sm" variant="outline" @click="addRow">添加材料行</UiButton>
    </div>
    <input
      ref="rowFileInputRef"
      type="file"
      class="sr-only"
      @change="onRowFileChange"
    >
    <UiDataTable
      pagination-mode="none"
      :columns="columns"
      :data-source="rows"
      :show-pagination="false"
      flat
      row-key="uid"
      size="small"
      empty-description="请添加待同步材料"
    >
      <template #bodyCell="{ column, index }">
        <template v-if="column.key === 'materialType'">
          <a-select
            v-model:value="rows[index].materialType"
            :options="materialTypeOptions"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'catalogCode'">
          <a-input v-model:value="rows[index].catalogCode" placeholder="目录编码" />
        </template>
        <template v-else-if="column.key === 'file'">
          <span v-if="rows[index].fileName" class="archive-volume-course-sync__file-name">
            {{ rows[index].fileName }}
          </span>
          <UiButton
            size="sm"
            variant="outline"
            :loading="rows[index].uploading"
            @click="openRowFilePicker(index)"
          >
            {{ rows[index].fileId ? '重新选择' : '选择文件' }}
          </UiButton>
        </template>
        <template v-else-if="column.key === 'studentNo'">
          <a-input v-model:value="rows[index].studentNo" placeholder="可选" />
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTextAction tone="danger" @click="removeRow(index)">删除</UiTextAction>
        </template>
      </template>
    </UiDataTable>
  </a-modal>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'
import {
  ARCHIVE_MATERIAL_TYPE_LABEL,
  syncArchiveCoursePlatform,
} from '@/apis/mark/archive-volume'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  volumeId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
}>()

interface SyncRow {
  uid: string
  materialType?: ArchiveMaterialTypeCode
  catalogCode: string
  fileId?: string
  fileName?: string
  uploading?: boolean
  studentNo: string
}

const submitting = ref(false)
const form = ref({
  sourceSystem: 'COURSE_PLATFORM',
  idempotencyKey: '',
})
const rows = ref<SyncRow[]>([])
const rowFileInputRef = ref<HTMLInputElement | null>(null)
const activeRowIndex = ref<number | null>(null)

const materialTypeOptions = Object.entries(ARCHIVE_MATERIAL_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const columns: ColumnsType<SyncRow> = [
  { title: '材料类型', key: 'materialType', width: 180 },
  { title: '目录编码', key: 'catalogCode', width: 120 },
  { title: '文件', key: 'file', width: 200 },
  { title: '学号', key: 'studentNo', width: 120 },
  { title: '操作', key: 'actions', width: 80 },
]

watch(() => props.open, (visible) => {
  if (visible) {
    form.value.idempotencyKey = `CPS-${props.volumeId}-${Date.now()}`
    if (rows.value.length === 0) {
      addRow()
    }
  }
  else {
    rows.value = []
    form.value.sourceSystem = 'COURSE_PLATFORM'
    form.value.idempotencyKey = ''
    activeRowIndex.value = null
  }
})

function addRow() {
  rows.value.push({
    uid: `${Date.now()}-${rows.value.length}`,
    catalogCode: '',
    studentNo: '',
  })
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
}

function openRowFilePicker(index: number) {
  activeRowIndex.value = index
  rowFileInputRef.value?.click()
}

async function onRowFileChange(event: Event) {
  const index = activeRowIndex.value
  if (index === null) {
    return
  }
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  rows.value[index].uploading = true
  try {
    const node = await stageBusinessFile(FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL, file)
    rows.value[index].fileId = String(node.id)
    rows.value[index].fileName = node.nodeName
  }
  catch (error) {
    showUserError(error, '文件上传失败')
  }
  finally {
    rows.value[index].uploading = false
    input.value = ''
    activeRowIndex.value = null
  }
}

function resolveFileFormat(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0) return 'UNKNOWN'
  return fileName.slice(dot + 1).toUpperCase()
}

async function handleSubmit() {
  if (!props.volumeId) return
  if (!form.value.sourceSystem.trim()) {
    message.warning('请填写来源系统')
    return
  }
  if (!form.value.idempotencyKey.trim()) {
    message.warning('请填写幂等键')
    return
  }
  if (rows.value.length === 0) {
    message.warning('请添加至少一行材料')
    return
  }
  for (const row of rows.value) {
    if (!row.materialType) {
      message.warning('每行须选择材料类型')
      return
    }
    if (!row.fileId) {
      message.warning('每行须上传文件')
      return
    }
  }
  submitting.value = true
  try {
    const materials = rows.value.map((row) => ({
      volumeId: props.volumeId,
      materialType: row.materialType as ArchiveMaterialTypeCode,
      catalogCode: row.catalogCode.trim() || undefined,
      requiredFlag: true,
      fileId: row.fileId as string,
      mediaType: 'ELECTRONIC' as const,
      fileFormat: resolveFileFormat(row.fileName ?? ''),
      sortRule: row.studentNo.trim() ? 'STUDENT_NO' as const : 'CATALOG_ORDER' as const,
      electronicOriginalStatus: 'SCANNED' as const,
      studentNo: row.studentNo.trim() || undefined,
      triggerOcr: false,
    }))
    await syncArchiveCoursePlatform({
      idempotencyKey: form.value.idempotencyKey.trim(),
      volumeId: props.volumeId,
      sourceSystem: form.value.sourceSystem.trim(),
      materials,
    })
    message.success(`已同步 ${materials.length} 份材料`)
    emit('update:open', false)
    emit('success')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.archive-volume-course-sync__toolbar {
  margin-bottom: 8px;
}

.archive-volume-course-sync__file-name {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--dp-text-secondary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
