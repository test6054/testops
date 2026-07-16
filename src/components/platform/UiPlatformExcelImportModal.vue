<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    :width="modalWidth"
    :confirm-loading="submitting"
    :mask-closable="false"
    :ok-text="okText"
    :ok-button-props="{ disabled: okDisabled }"
    @cancel="handleCancel"
    @ok="handleOk"
    class="platform-excel-import-modal"
  >
    <div v-if="phase === 'upload'" class="platform-excel-import-modal__upload">
      <div v-if="!props.hideTemplateDownload" class="platform-excel-import-modal__template">
        <span class="platform-excel-import-modal__template-text"
          >请先下载模板，按格式填写后上传</span
        >
        <UiButton
          variant="outline"
          size="sm"
          :loading="templateLoading"
          @click="handleDownloadTemplate"
        >
          下载{{ props.entityLabel }}导入模板
        </UiButton>
      </div>
      <UiAlertStrip
        v-else-if="props.templateHint"
        tone="info"
        :title="props.templateHint"
        class="platform-excel-import-modal__template-hint"
      />
      <div
        class="platform-excel-import-modal__dropzone"
        role="button"
        tabindex="0"
        @click="openFilePicker"
        @keydown.enter.prevent="openFilePicker"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <UploadOutlined class="platform-excel-import-modal__dropzone-icon" />
        <p class="platform-excel-import-modal__dropzone-hint">
          拖拽文件到此处，或<span class="platform-excel-import-modal__dropzone-link"
            >点击选择文件</span
          >
        </p>
        <p class="platform-excel-import-modal__dropzone-desc">
          支持 .xlsx、.xls，单文件不超过 30MB
        </p>
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls"
          class="sr-only"
          @change="handleFileInputChange"
        />
      </div>
      <div v-if="stagedFile" class="platform-excel-import-modal__file">
        <FileOutlined />
        <span class="platform-excel-import-modal__file-name">{{ stagedFile.name }}</span>
        <span class="platform-excel-import-modal__file-size">{{
          formatFileSize(stagedFile.size)
        }}</span>
        <UiTag tone="green">已选择</UiTag>
        <UiButton variant="ghost" size="sm" @click="clearFile">移除</UiButton>
      </div>
      <ul v-if="props.requirements?.length" class="platform-excel-import-modal__requirements">
        <li v-for="(item, index) in props.requirements" :key="index">{{ item }}</li>
      </ul>
    </div>
    <div v-else-if="phase === 'preview'" class="platform-excel-import-modal__preview">
      <div class="platform-excel-import-modal__summary">
        <div class="platform-excel-import-modal__summary-title">预览校验结果</div>
        <div class="platform-excel-import-modal__summary-stats">
          <span>总计 {{ previewSnapshot?.totalRows ?? 0 }}</span>
          <span class="is-success">可导入 {{ previewSnapshot?.successRows ?? 0 }}</span>
          <span class="is-fail">错误 {{ previewSnapshot?.errorRows ?? 0 }}</span>
        </div>
      </div>
      <UiDataTable
        v-if="rosterPreviewRows.length"
        pagination-mode="client"
        :columns="rosterPreviewColumns"
        :data-source="pagedRosterPreviewRows"
        v-model:current="rosterPreviewPage"
        v-model:page-size="rosterPreviewPageSize"
        :total="rosterPreviewRows.length"
        :show-size-changer="false"
        row-key="rowNo"
        size="small"
        flat
        :sticky-header="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'student'">
            <div class="platform-excel-import-modal__student">
              <span class="platform-excel-import-modal__student-name">
                {{ record.resolvedStudentName || record.studentName }}
              </span>
              <span class="platform-excel-import-modal__student-no">
                {{ record.resolvedStudentNo || record.studentNo }}
              </span>
            </div>
          </template>
          <template v-else-if="column.key === 'className'">
            <span>{{ record.resolvedClassName || record.className }}</span>
          </template>
          <template v-else-if="column.key === 'importActionDisplay'">
            <UiTag
              v-if="record.valid"
              :tone="record.importAction === 'CREATE_STUDENT' ? 'orange' : 'blue'"
              size="sm"
            >
              {{ record.importAction === 'CREATE_STUDENT' ? '将创建学生用户' : '复用学生用户' }}
            </UiTag>
            <UiTag v-else tone="red" size="sm">不可导入</UiTag>
          </template>
          <template v-else-if="column.key === 'message'">
            <span :class="{ 'is-fail': !record.valid }">
              {{ record.errorMessage || '可导入' }}
            </span>
          </template>
        </template>
      </UiDataTable>
      <UiDataTable
        v-else-if="previewDiagnostics.length"
        pagination-mode="client"
        :columns="errorColumns"
        :data-source="previewDiagnostics"
        :show-pagination="false"
        row-key="rowIndex"
        size="small"
        flat
        :sticky-header="false"
      />
      <UiAlertStrip
        v-else
        tone="success"
        :title="`${props.entityLabel}文件校验通过，可以确认导入`"
      />
    </div>
    <div v-else class="platform-excel-import-modal__result">
      <div class="platform-excel-import-modal__summary">
        <div class="platform-excel-import-modal__summary-title">{{ resultTitle }}</div>
        <div class="platform-excel-import-modal__summary-stats">
          <span>总计 {{ result?.totalRows ?? 0 }}</span>
          <span class="is-success">成功 {{ result?.successRows ?? 0 }}</span>
          <span v-if="result?.createdCount != null" class="is-success"
            >新建 {{ result.createdCount }}</span
          >
          <span v-if="result?.updatedCount != null">更新 {{ result.updatedCount }}</span>
          <span class="is-fail">失败 {{ result?.errorRows ?? 0 }}</span>
        </div>
      </div>
      <UiDataTable
        v-if="failedRows.length > 0"
        pagination-mode="client"
        :columns="errorColumns"
        :data-source="pagedFailedRows"
        v-model:current="errorPage"
        v-model:page-size="errorPageSize"
        :total="failedRows.length"
        :show-size-changer="false"
        row-key="rowIndex"
        size="small"
        flat
      />
      <p
        v-if="result?.executionMode === ExcelImportExecutionMode.ASYNC"
        class="platform-excel-import-modal__async-hint"
      >
        已提交解析任务，请在列表中预览确认。
      </p>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { resolveFileStageSceneForExcel } from '@/apis/platform/scene-keys'
import type {
  ExcelImportResult,
  ExcelImportRosterPreviewRow,
  ExcelImportRowDiagnostic,
  PlatformJsonObject,
} from '@/apis/platform/types'
import { ExcelImportExecutionMode } from '@/apis/platform/types'
import { FileOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import { downloadExcelImportTemplate, submitExcelImport } from '@/apis/platform/excel-import'
import { stagePlatformFile } from '@/apis/platform/file'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import {
  getUserErrorMessage,
  getUserProcessFailureMessage,
  showFormValidationMessage,
} from '@/utils/error-handler'
import { formatFileSize } from '@/utils/format'

type ImportPhase = 'upload' | 'preview' | 'result'

const props = defineProps<{
  open: boolean
  sceneKey: ExcelImportSceneKey
  entityLabel: string
  context?: PlatformJsonObject
  requirements?: string[]
  hideTemplateDownload?: boolean
  templateHint?: string
  /** 先 preview（commit=false）再 confirm commit。 */
  previewBeforeCommit?: boolean
  /** 预校验存在错误行时，仍允许提交其余可导入行。 */
  allowPartialCommit?: boolean
  /** 预校验包含 MANUAL_CONFIRM 冲突时，允许用户明确确认覆盖。 */
  allowManualConflictCommit?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success', result: ExcelImportResult): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const fileInputRef = ref<HTMLInputElement | null>(null)
const stagedFile = ref<File | null>(null)
const stagedFileNodeId = ref<string | null>(null)
const templateLoading = ref(false)
const submitting = ref(false)
const phase = ref<ImportPhase>('upload')
const previewSnapshot = ref<ExcelImportResult | null>(null)
const result = ref<ExcelImportResult | null>(null)
const errorPage = ref(1)
const errorPageSize = ref(10)
const rosterPreviewPage = ref(1)
const rosterPreviewPageSize = ref(8)

const modalTitle = computed(() => `导入${props.entityLabel}`)
const modalWidth = computed(() => {
  if (phase.value === 'preview') {
    return 920
  }
  if (phase.value === 'result') {
    return 760
  }
  return 640
})

const okText = computed(() => {
  if (phase.value === 'result') {
    return '关闭'
  }
  if (phase.value === 'preview') {
    return '确认导入'
  }
  if (props.previewBeforeCommit) {
    return '预览校验'
  }
  return '开始导入'
})

const okDisabled = computed(() => {
  if (phase.value === 'result') {
    return false
  }
  if (phase.value === 'preview') {
    const errorRows = previewSnapshot.value?.errorRows ?? 0
    const successRows = previewSnapshot.value?.successRows ?? 0
    if (errorRows === 0) {
      return successRows === 0
    }
    if (props.allowPartialCommit && successRows > 0) {
      return false
    }
    return !(
      props.allowManualConflictCommit &&
      previewDiagnostics.value.some((item) => item.errorCode === 'MANUAL_CONFIRM')
    )
  }
  return !stagedFileNodeId.value
})

const errorColumns: ColumnsType<ExcelImportRowDiagnostic> = [
  {
    title: '行号',
    dataIndex: 'rowIndex',
    key: 'rowIndex',
    width: 80,
    align: 'right',
    customRender: ({ text }) => (Number(text) > 0 ? String(text) : '批次'),
  },
  { title: '处理说明', dataIndex: 'invalidReason', key: 'invalidReason', align: 'left' },
]

const rosterPreviewColumns: ColumnsType<ExcelImportRosterPreviewRow> = [
  { title: '行号', dataIndex: 'rowNo', key: 'rowNo', width: 72 },
  { title: '班级', key: 'className', width: 180 },
  { title: '考生', key: 'student', width: 180 },
  { title: '导入动作', key: 'importActionDisplay', width: 150 },
  { title: '诊断', key: 'message' },
]

const rosterPreviewRows = computed(() => previewSnapshot.value?.rosterPreviewRows ?? [])
const previewDiagnostics = computed(() =>
  (previewSnapshot.value?.diagnostics ?? [])
    .filter((row) => row.valid === false)
    .map((row) => ({
      ...row,
      invalidReason: getUserProcessFailureMessage(row.invalidReason, '该行数据未通过校验'),
    })),
)

const pagedRosterPreviewRows = computed(() => {
  const start = (rosterPreviewPage.value - 1) * rosterPreviewPageSize.value
  return rosterPreviewRows.value.slice(start, start + rosterPreviewPageSize.value)
})

const failedRows = computed(() =>
  (result.value?.diagnostics ?? [])
    .filter((row) => row.valid === false)
    .map((row) => ({
      ...row,
      invalidReason: getUserProcessFailureMessage(row.invalidReason, '该行数据未通过校验'),
    })),
)

const pagedFailedRows = computed(() => {
  const start = (errorPage.value - 1) * errorPageSize.value
  return failedRows.value.slice(start, start + errorPageSize.value)
})

const resultTitle = computed(() => {
  if (!result.value) {
    return ''
  }
  if (result.value.executionMode === ExcelImportExecutionMode.ASYNC) {
    return '已提交导入任务'
  }
  const success = result.value.successRows ?? 0
  const fail = result.value.errorRows ?? 0
  if (fail > 0) {
    return `导入完成：成功 ${success} 条，失败 ${fail} 条`
  }
  return `导入成功 ${success} 条`
})

watch(
  () => props.open,
  (open) => {
    if (!open) {
      resetState()
    }
  },
)

function resetState() {
  stagedFile.value = null
  stagedFileNodeId.value = null
  phase.value = 'upload'
  previewSnapshot.value = null
  result.value = null
  errorPage.value = 1
  rosterPreviewPage.value = 1
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleFileInputChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const file = input.files?.[0]
  if (file) {
    void stageSelectedFile(file)
  }
}

function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    void stageSelectedFile(file)
  }
}

async function stageSelectedFile(file: File) {
  submitting.value = true
  try {
    const stageScene = resolveFileStageSceneForExcel(props.sceneKey)
    const staged = await stagePlatformFile(stageScene, file)
    stagedFile.value = file
    stagedFileNodeId.value = staged.fileNodeId
    previewSnapshot.value = null
    phase.value = 'upload'
  } catch (error) {
    stagedFile.value = null
    stagedFileNodeId.value = null
    message.error(getUserErrorMessage(error, '文件暂存失败'))
  } finally {
    submitting.value = false
  }
}

function clearFile() {
  stagedFile.value = null
  stagedFileNodeId.value = null
  previewSnapshot.value = null
  phase.value = 'upload'
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function handleDownloadTemplate() {
  templateLoading.value = true
  try {
    const template = await downloadExcelImportTemplate({
      sceneKey: props.sceneKey,
      context: props.context,
    })
    const blobResponse = await downloadFile({ nodeId: String(template.fileNodeId) })
    triggerBrowserDownload(blobResponse.data, template.fileName)
  } catch (error) {
    message.error(getUserErrorMessage(error, '模板下载失败'))
  } finally {
    templateLoading.value = false
  }
}

async function submitImport(commit: boolean): Promise<ExcelImportResult | null> {
  if (!stagedFileNodeId.value) {
    showFormValidationMessage('请先选择 Excel 文件')
    return null
  }
  return submitExcelImport({
    sceneKey: props.sceneKey,
    fileNodeId: stagedFileNodeId.value,
    context: {
      ...(props.context ?? {}),
      commit,
      fileName: stagedFile.value?.name,
    },
  })
}

async function handleOk() {
  if (phase.value === 'result') {
    visible.value = false
    return
  }
  if (!stagedFileNodeId.value) {
    return
  }
  submitting.value = true
  try {
    if (props.previewBeforeCommit && phase.value === 'preview') {
      const importResult = await submitImport(true)
      if (!importResult) return
      result.value = importResult
      phase.value = 'result'
      emit('success', importResult)
      if ((importResult.errorRows ?? 0) === 0) {
        message.success(`${props.entityLabel}已导入`)
      } else {
        message.warning(
          `${props.entityLabel}导入完成：成功 ${importResult.successRows ?? 0} 条，失败 ${importResult.errorRows ?? 0} 条`,
        )
      }
      return
    }
    const commit = !props.previewBeforeCommit
    const importResult = await submitImport(commit)
    if (!importResult) return
    if (props.previewBeforeCommit) {
      previewSnapshot.value = importResult
      rosterPreviewPage.value = 1
      phase.value = 'preview'
      if ((importResult.errorRows ?? 0) > 0) {
        message.warning(
          `预览完成：${importResult.successRows ?? 0} 条可直接导入，${importResult.errorRows ?? 0} 条需处理或确认`,
        )
      }
      return
    }
    result.value = importResult
    phase.value = 'result'
    if (
      (importResult.successRows ?? 0) > 0 ||
      importResult.executionMode === ExcelImportExecutionMode.ASYNC
    ) {
      emit('success', importResult)
    }
    if (importResult.executionMode === ExcelImportExecutionMode.ASYNC) {
      message.success('已提交解析任务')
    } else if ((importResult.errorRows ?? 0) === 0) {
      message.success(`导入成功 ${importResult.successRows ?? 0} 条`)
    } else {
      message.warning(
        `导入完成：成功 ${importResult.successRows ?? 0} 条，失败 ${importResult.errorRows ?? 0} 条`,
      )
    }
  } catch (error) {
    message.error(getUserErrorMessage(error, `导入${props.entityLabel}失败`))
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  visible.value = false
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<style scoped lang="scss">
.platform-excel-import-modal {
  &__template {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__template-hint {
    margin-bottom: 16px;
  }

  &__template-text {
    color: var(--dp-text-secondary);
    font-size: 13px;
  }

  &__dropzone {
    border: 1px dashed var(--dp-border-strong);
    border-radius: var(--dp-radius-panel);
    background: var(--ant-color-bg-container);
    padding: 24px 16px;
    text-align: center;
    cursor: pointer;
  }

  &__dropzone-icon {
    font-size: 28px;
    color: var(--dp-text-secondary);
    margin-bottom: 8px;
  }

  &__dropzone-hint {
    margin: 0;
    font-size: 14px;
    color: var(--dp-text-primary);
  }

  &__dropzone-link {
    color: var(--ant-color-primary);
  }

  &__dropzone-desc {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__file {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: var(--dp-radius-control);
    background: var(--dp-surface-subtle);
  }

  &__file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__file-size {
    color: var(--dp-text-secondary);
    font-size: 12px;
  }

  &__requirements {
    margin: 12px 0 0;
    padding-left: 18px;
    color: var(--dp-text-secondary);
    font-size: 12px;
  }

  &__summary {
    margin-bottom: 12px;
  }

  &__summary-title {
    font-weight: var(--dp-font-weight-title);
    margin-bottom: 8px;
  }

  &__summary-stats {
    display: flex;
    gap: 16px;
    font-size: 13px;

    .is-success {
      color: var(--ant-color-success);
    }

    .is-fail {
      color: var(--ant-color-error);
    }
  }

  &__student {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__student-name {
    font-size: 13px;
  }

  &__student-no {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__async-hint {
    margin-top: 12px;
    color: var(--dp-text-secondary);
    font-size: 13px;
  }
}
</style>
