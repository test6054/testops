<template>
  <UiDrawer
    :open="open"
    title="批量登记材料"
    :width="800"
    :confirm-loading="submitting"
    ok-text="登记"
    :hide-footer="false"
    @update:open="emit('update:open', $event)"
    @close="emit('update:open', false)"
    @confirm="handleSubmit"
  >
    <UiAlertStrip
      v-if="catalogCode"
      dense
      tone="info"
      :title="`当前目录：${catalogCode}${catalogName ? ` · ${catalogName}` : ''}`"
    />
    <UiForm layout="vertical" class="archive-volume-batch-register__form">
      <UiFormItem label="默认材料类型">
        <UiSelect
          size="sm"
          v-model="defaultMaterialType"
          :options="ARCHIVE_MATERIAL_TYPE_OPTIONS"
          allow-clear
          placeholder="可为每行单独设置"
          style="width: 100%"
        />
      </UiFormItem>
      <UiFormItem label="默认自由标签" tooltip="应用于各行；可在表格中单独调整">
        <ArchiveMaterialTagSelect v-model="defaultTags" :volume-id="volumeId" />
      </UiFormItem>
      <UiFormItem label="待登记文件" required>
        <UiButton size="sm" variant="outline" @click="openFilePicker">添加文件</UiButton>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          class="sr-only"
          @change="handleFilesSelected"
        />
      </UiFormItem>
    </UiForm>
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
          <UiSelect
            size="sm"
            v-model="rows[index].materialType"
            :options="ARCHIVE_MATERIAL_TYPE_OPTIONS"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'tags'">
          <ArchiveMaterialTagSelect v-model="rows[index].tags" :volume-id="volumeId" />
        </template>
        <template v-else-if="column.key === 'fileName'">
          {{ record.fileName }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="[{ key: 'remove', label: '移除', tone: 'danger' }]"
            split
            @action="() => removeRow(record.uid)"
          />
        </template>
      </template>
    </UiDataTable>
  </UiDrawer>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { ref, watch } from 'vue'
import {
  ARCHIVE_MATERIAL_TYPE_OPTIONS,
  ArchiveElectronicOriginalStatusCode,
  ArchiveMaterialMediaTypeCode,
  ArchiveMaterialSortRuleCode,
  batchRegisterArchiveVolumeMaterials,
} from '@/apis/mark/archive-volume'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { normalizeMaterialTagsForRegister } from '@/utils/archive-material-tag'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import ArchiveMaterialTagSelect from '@/views/teacher/archive-volume/components/ArchiveMaterialTagSelect.vue'

const props = defineProps<{
  open: boolean
  volumeId: string
  catalogCode?: string
  catalogName?: string
  initialMaterialType?: ArchiveMaterialTypeCode
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
}>()

interface BatchRow {
  uid: string
  file: File
  fileName: string
  materialType?: ArchiveMaterialTypeCode
  tags: string[]
}

const submitting = ref(false)
const defaultMaterialType = ref<ArchiveMaterialTypeCode>()
const defaultTags = ref<string[]>([])
const rows = ref<BatchRow[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const columns: ColumnsType<BatchRow> = [
  { title: '文件名', key: 'fileName' },
  { title: '材料类型', key: 'materialType', width: 180 },
  { title: '标签', key: 'tags', width: 200 },
  { title: '操作', key: 'actions', width: 72 },
]

watch(
  () => props.open,
  (visible) => {
    if (visible) {
      defaultMaterialType.value = props.initialMaterialType
      defaultTags.value = []
      rows.value = []
      return
    }
    rows.value = []
    defaultMaterialType.value = undefined
    defaultTags.value = []
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  },
)

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleFilesSelected(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
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
      tags: [...defaultTags.value],
    })
  }
  input.value = ''
}

function removeRow(uid: string) {
  rows.value = rows.value.filter((item) => item.uid !== uid)
}

async function handleSubmit() {
  if (submitting.value) return
  if (!props.volumeId) return
  if (rows.value.length === 0) {
    showFormValidationMessage('请添加至少一个文件')
    return
  }
  for (const row of rows.value) {
    if (!row.materialType) {
      showFormValidationMessage(`请为 ${row.fileName} 选择材料类型`)
      return
    }
    const tags = normalizeMaterialTagsForRegister(row.tags)
    if (tags === undefined && row.tags.length > 0) {
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
      const tags = normalizeMaterialTagsForRegister(row.tags)
      materials.push({
        materialType: row.materialType!,
        catalogCode: props.catalogCode,
        fileId: String(node.id),
        mediaType: ArchiveMaterialMediaTypeCode.ELECTRONIC,
        sortRule: ArchiveMaterialSortRuleCode.CATALOG_ORDER,
        electronicOriginalStatus: ArchiveElectronicOriginalStatusCode.SCANNED,
        tags,
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
    showUserError(error, '批量登记材料失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.archive-volume-batch-register__form {
  margin-top: var(--dp-space-3);
}
.archive-volume-batch-register__table {
  margin-top: 12px;
}
</style>
