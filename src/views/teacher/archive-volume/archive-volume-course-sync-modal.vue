<template>
  <UiDrawer
    :open="open"
    title="课程平台材料同步"
    :width="880"
    :confirm-loading="submitting"
    ok-text="同步"
    :hide-footer="false"
    @update:open="emit('update:open', $event)"
    @close="emit('update:open', false)"
    @confirm="handleSubmit"
  >
    <UiForm layout="vertical">
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="来源系统" required>
            <UiInput size="sm" v-model="form.sourceSystem" placeholder="如 COURSE_PLATFORM" />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem label="幂等键" required>
            <UiInput
              size="sm"
              v-model="form.idempotencyKey"
              placeholder="同键重放须 payload 一致"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
    </UiForm>
    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <UiButton size="sm" variant="outline" @click="addRow">添加材料行</UiButton>
      </template>
      <input ref="rowFileInputRef" type="file" class="sr-only" @change="onRowFileChange" />
      <UiDataTable
        pagination-mode="none"
        :columns="columns"
        :data-source="rows"
        :show-pagination="false"
        flat
        row-key="uid"
        size="small"
        empty-description="请添加待同步材料"
        :sticky-header="false"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'materialType'">
            <UiSelect
              size="sm"
              v-model="rows[index].materialType"
              :options="ARCHIVE_MATERIAL_TYPE_OPTIONS"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'catalogCode'">
            <UiInput size="sm" v-model="rows[index].catalogCode" placeholder="目录编码" />
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
            <UiInput size="sm" v-model="rows[index].studentNo" placeholder="可选" />
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[{ key: 'delete', label: '删除', tone: 'danger' }]"
              split
              @action="() => removeRow(index)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
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
  syncArchiveCoursePlatform,
} from '@/apis/mark/archive-volume'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  volumeId: string
  /** MVR-377：与父 canRegisterMaterial / BE requireCanManageMaterials 同源 */
  canRegisterMaterial?: boolean
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

const columns: ColumnsType<SyncRow> = [
  { title: '材料类型', key: 'materialType', width: 180 },
  { title: '目录编码', key: 'catalogCode', width: 120 },
  { title: '文件', key: 'file', width: 200 },
  { title: '学号', key: 'studentNo', width: 120 },
  { title: '操作', key: 'actions', width: 80 },
]

watch(
  () => props.open,
  (visible) => {
    if (visible) {
      form.value.idempotencyKey = `CPS-${props.volumeId}-${Date.now()}`
      if (rows.value.length === 0) {
        addRow()
      }
    } else {
      rows.value = []
      form.value.sourceSystem = 'COURSE_PLATFORM'
      form.value.idempotencyKey = ''
      activeRowIndex.value = null
    }
  },
)

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
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const file = input.files?.[0]
  if (!file) {
    return
  }
  rows.value[index].uploading = true
  try {
    const node = await stageBusinessFile(FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL, file)
    rows.value[index].fileId = String(node.id)
    rows.value[index].fileName = node.nodeName
  } catch (error) {
    showUserError(error, '文件上传失败')
  } finally {
    rows.value[index].uploading = false
    input.value = ''
    activeRowIndex.value = null
  }
}

async function handleSubmit() {
  // MVR-377：与 canRegisterMaterial / BE requireCanManageMaterials 二次拦截
  if (!props.canRegisterMaterial) {
    showFormValidationMessage('当前账号无材料登记权限，无法同步课程平台材料')
    return
  }
  if (submitting.value) return
  if (!props.volumeId) return
  if (!form.value.sourceSystem.trim()) {
    showFormValidationMessage('请填写来源系统')
    return
  }
  if (!form.value.idempotencyKey.trim()) {
    showFormValidationMessage('请填写幂等键')
    return
  }
  if (rows.value.length === 0) {
    showFormValidationMessage('请添加至少一行材料')
    return
  }
  for (const row of rows.value) {
    if (!row.materialType) {
      showFormValidationMessage('每行须选择材料类型')
      return
    }
    if (!row.fileId) {
      showFormValidationMessage('每行须上传文件')
      return
    }
  }
  submitting.value = true
  try {
    const materials = rows.value.map((row) => ({
      materialType: row.materialType!,
      catalogCode: row.catalogCode.trim() || undefined,
      requiredFlag: true,
      fileId: row.fileId!,
      mediaType: ArchiveMaterialMediaTypeCode.ELECTRONIC,
      sortRule: row.studentNo.trim()
        ? ArchiveMaterialSortRuleCode.STUDENT_NO
        : ArchiveMaterialSortRuleCode.CATALOG_ORDER,
      electronicOriginalStatus: ArchiveElectronicOriginalStatusCode.SCANNED,
      studentNo: row.studentNo.trim() || undefined,
      triggerOcr: false,
    }))
    await syncArchiveCoursePlatform({
      idempotencyKey: form.value.idempotencyKey.trim(),
      volumeId: props.volumeId,
      sourceSystem: form.value.sourceSystem.trim(),
      materials,
    })
    void message.success(`已同步 ${materials.length} 份材料`)
    emit('update:open', false)
    emit('success')
  } catch (error) {
    showUserError(error, '同步课程平台材料失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.archive-volume-course-sync__file-name {
  display: block;
  margin-bottom: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
