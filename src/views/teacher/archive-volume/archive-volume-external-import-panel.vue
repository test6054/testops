<template>
  <div class="archive-volume-external-import">
    <p class="archive-volume-external-import__hint">
      上传 CSV/Excel 批量建卷并登记材料。请先下载模板，按表头填写后上传；file_id 须为 edu-storage 已上传节点 ID。
    </p>
    <a-form layout="vertical">
      <a-form-item label="来源系统" required>
        <a-input v-model:value="form.sourceSystem" placeholder="如 TEACHING_AFFAIRS / HISTORY_BACKFILL" />
      </a-form-item>
      <a-form-item label="导入类型" required>
        <a-select
          v-model:value="form.importType"
          :options="importTypeOptions"
          disabled
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="导入文件" required>
        <a-upload
          :before-upload="handleBeforeUpload"
          :file-list="fileList"
          :max-count="1"
          accept=".csv,.xlsx,.xls"
          @remove="handleRemoveFile"
        >
          <UiButton size="sm">选择 CSV / Excel</UiButton>
        </a-upload>
      </a-form-item>
    </a-form>
    <UiFormActions align="between">
      <UiButton size="sm" variant="outline" :loading="templateLoading" @click="handleDownloadTemplate">
        下载模板
      </UiButton>
      <UiButton size="sm" variant="primary" :loading="importing" @click="handleImport">
        开始导入
      </UiButton>
    </UiFormActions>
    <UiAlertStrip
      v-if="lastResult"
      :tone="resultTone(lastResult.batchStatus)"
      :title="`批次 ${lastResult.batchNo}`"
      :description="resultDescription(lastResult)"
      dense
      class="archive-volume-external-import__result"
    />
  </div>
</template>

<script setup lang="ts">
import type { UploadFile } from 'ant-design-vue'
import type {
  ArchiveExternalImportResultVO,
  ArchiveImportBatchStatusCode,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { ref } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_EXTERNAL_IMPORT_TYPE_LABEL,
  ARCHIVE_IMPORT_BATCH_STATUS_LABEL,
  downloadArchiveExternalImportTemplate,
  importArchiveExternalData,
} from '@/apis/mark/archive-volume'
import UiAlertStrip from '@/components/ui-guide/ui/AlertStrip.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFormActions from '@/components/ui-guide/ui/FormActions.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeExternalImportPanel' })

const importing = ref(false)
const templateLoading = ref(false)
const selectedFile = ref<File | null>(null)
const fileList = ref<UploadFile[]>([])
const lastResult = ref<ArchiveExternalImportResultVO | null>(null)

const form = ref({
  sourceSystem: '',
  importType: 'VOLUME_MATERIAL' as const,
})

const importTypeOptions = Object.entries(ARCHIVE_EXTERNAL_IMPORT_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

function handleBeforeUpload(file: File) {
  selectedFile.value = file
  fileList.value = [{ uid: 'import-file', name: file.name, status: 'done' }]
  return false
}

function handleRemoveFile() {
  selectedFile.value = null
  fileList.value = []
}

async function handleDownloadTemplate() {
  templateLoading.value = true
  try {
    const template = await downloadArchiveExternalImportTemplate()
    const blob = new Blob([template.csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = template.fileName || 'archive-volume-import-template.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    templateLoading.value = false
  }
}

function resultTone(status: ArchiveImportBatchStatusCode): 'green' | 'orange' | 'red' | 'blue' {
  if (status === 'SUCCESS') return 'green'
  if (status === 'PARTIAL_FAILED') return 'orange'
  if (status === 'FAILED') return 'red'
  return 'blue'
}

function resultDescription(result: ArchiveExternalImportResultVO) {
  const statusLabel = strictEnumLabel(ARCHIVE_IMPORT_BATCH_STATUS_LABEL, result.batchStatus, 'batchStatus')
  return `${statusLabel} · 共 ${result.totalCount} 行，成功 ${result.successCount}，失败 ${result.failureCount}`
}

async function handleImport() {
  if (!form.value.sourceSystem.trim()) {
    message.warning('请填写来源系统')
    return
  }
  if (!selectedFile.value) {
    message.warning('请选择导入文件')
    return
  }
  importing.value = true
  lastResult.value = null
  try {
    const node = await uploadFile(selectedFile.value, { businessType: 'archive-volume-import' })
    lastResult.value = await importArchiveExternalData({
      sourceSystem: form.value.sourceSystem.trim(),
      sourceFileId: String(node.id),
      importType: form.value.importType,
    })
    message.success('导入批次已提交')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    importing.value = false
  }
}
</script>

<style scoped>
.archive-volume-external-import__hint {
  margin: 0 0 12px;
  color: var(--dp-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

.archive-volume-external-import__result {
  margin-top: 16px;
}
</style>
