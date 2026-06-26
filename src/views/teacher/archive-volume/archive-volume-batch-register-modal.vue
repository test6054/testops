<template>
  <a-modal
    :open="open"
    title="批量登记材料"
    width="720"
    :confirm-loading="submitting"
    ok-text="登记"
    cancel-text="取消"
    @update:open="emit('update:open', $event)"
    @ok="handleSubmit"
  >
    <a-form layout="vertical">
      <a-form-item label="默认材料类型">
        <a-select
          v-model:value="defaultMaterialType"
          :options="materialTypeOptions"
          allow-clear
          placeholder="可为每行单独设置"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="待登记文件" required>
        <a-upload
          multiple
          :before-upload="handleBeforeUpload"
          :file-list="uploadFiles"
          @remove="handleRemove"
        >
          <UiButton size="sm">添加文件</UiButton>
        </a-upload>
      </a-form-item>
    </a-form>
    <UiDataTable
      v-if="rows.length > 0"
      pagination-mode="none"
      :columns="columns"
      :data-source="rows"
      :show-pagination="false"
      flat
      row-key="uid"
      size="small"
      class="archive-volume-batch-register__table"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'materialType'">
          <a-select
            v-model:value="rows[index].materialType"
            :options="materialTypeOptions"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'fileName'">
          {{ record.file.name }}
        </template>
      </template>
    </UiDataTable>
  </a-modal>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { UploadFile } from 'ant-design-vue'
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_MATERIAL_TYPE_LABEL,
  batchRegisterArchiveVolumeMaterials,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  volumeId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

interface BatchRow {
  uid: string
  file: File
  materialType?: ArchiveMaterialTypeCode
}

const submitting = ref(false)
const defaultMaterialType = ref<ArchiveMaterialTypeCode>()
const rows = ref<BatchRow[]>([])
const uploadFiles = ref<UploadFile[]>([])

const materialTypeOptions = Object.entries(ARCHIVE_MATERIAL_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const columns: ColumnsType<BatchRow> = [
  { title: '文件名', key: 'fileName' },
  { title: '材料类型', key: 'materialType', width: 220 },
]

watch(() => props.open, (visible) => {
  if (!visible) {
    rows.value = []
    uploadFiles.value = []
    defaultMaterialType.value = undefined
  }
})

function handleBeforeUpload(file: File) {
  const uid = `${Date.now()}-${file.name}`
  rows.value.push({
    uid,
    file,
    materialType: defaultMaterialType.value,
  })
  uploadFiles.value.push({ uid, name: file.name, status: 'done' })
  return false
}

function handleRemove(file: UploadFile) {
  rows.value = rows.value.filter(item => item.uid !== file.uid)
  uploadFiles.value = uploadFiles.value.filter(item => item.uid !== file.uid)
}

function resolveFileFormat(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0) return 'UNKNOWN'
  return fileName.slice(dot + 1).toUpperCase()
}

async function handleSubmit() {
  if (!props.volumeId) return
  if (rows.value.length === 0) {
    message.warning('请添加至少一个文件')
    return
  }
  for (const row of rows.value) {
    if (!row.materialType) {
      message.warning(`请为 ${row.file.name} 选择材料类型`)
      return
    }
  }
  submitting.value = true
  try {
    const materials = []
    for (const row of rows.value) {
      const node = await uploadFile(row.file, { businessType: 'archive-volume-material' })
      materials.push({
        volumeId: props.volumeId,
        materialType: row.materialType as ArchiveMaterialTypeCode,
        fileId: String(node.id),
        mediaType: 'ELECTRONIC' as const,
        fileFormat: resolveFileFormat(row.file.name),
        sortRule: 'CATALOG_ORDER' as const,
        electronicOriginalStatus: 'SCANNED' as const,
        triggerOcr: true,
      })
    }
    await batchRegisterArchiveVolumeMaterials({
      volumeId: props.volumeId,
      materials,
    })
    message.success(`已登记 ${materials.length} 份材料`)
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
.archive-volume-batch-register__table {
  margin-top: 12px;
}
</style>
