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
        <UiButton size="sm" variant="outline" @click="openFilePicker">添加文件</UiButton>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          class="sr-only"
          @change="handleFilesSelected"
        />
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
          {{ record.fileName }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTextAction tone="danger" @click="removeRow(record.uid)">移除</UiTextAction>
        </template>
      </template>
    </UiDataTable>
  </a-modal>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import {
  ARCHIVE_MATERIAL_TYPE_LABEL,
  batchRegisterArchiveVolumeMaterials,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'
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
  success: []
}>()

interface BatchRow {
  uid: string
  file: File
  fileName: string
  materialType?: ArchiveMaterialTypeCode
}

const submitting = ref(false)
const defaultMaterialType = ref<ArchiveMaterialTypeCode>()
const rows = ref<BatchRow[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const materialTypeOptions = Object.entries(ARCHIVE_MATERIAL_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const columns: ColumnsType<BatchRow> = [
  { title: '文件名', key: 'fileName' },
  { title: '材料类型', key: 'materialType', width: 220 },
  { title: '操作', key: 'actions', width: 72 },
]

watch(
  () => props.open,
  (visible) => {
    if (!visible) {
      rows.value = []
      defaultMaterialType.value = undefined
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    }
  },
)

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length) {
    return
  }
  for (const file of Array.from(files)) {
    rows.value.push({
      uid: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      fileName: file.name,
      materialType: defaultMaterialType.value,
    })
  }
  input.value = ''
}

function removeRow(uid: string) {
  rows.value = rows.value.filter((item) => item.uid !== uid)
}

async function handleSubmit() {
  if (!props.volumeId) return
  if (rows.value.length === 0) {
    message.warning('请添加至少一个文件')
    return
  }
  for (const row of rows.value) {
    if (!row.materialType) {
      message.warning(`请为 ${row.fileName} 选择材料类型`)
      return
    }
  }
  submitting.value = true
  try {
    const materials = []
    for (const row of rows.value) {
      const node = await stageBusinessFile(
        FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL,
        row.file,
      )
      materials.push({
        volumeId: props.volumeId,
        materialType: row.materialType as ArchiveMaterialTypeCode,
        fileId: String(node.id),
        mediaType: 'ELECTRONIC' as const,
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
  } catch (error) {
    showUserError(error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.archive-volume-batch-register__table {
  margin-top: 12px;
}
</style>
