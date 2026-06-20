<template>
  <a-modal v-model:open="visible" :title="title" :width="640" :footer="null" @cancel="handleClose">
    <!-- 上传区 -->
    <template v-if="!importResult">
      <div class="qip__template-row">
        <span class="qip__template-text">下载模板：</span>
        <UiButton variant="ghost" size="sm" :loading="downloading" @click="handleDownloadTemplate">
          {{ templateButtonLabel }}
        </UiButton>
      </div>

      <a-upload-dragger :before-upload="beforeUpload" :show-upload-list="false" :accept="accept">
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此处</p>
        <p class="ant-upload-hint">{{ acceptHint }}</p>
      </a-upload-dragger>

      <div v-if="selectedFile" class="qip__selected-file">
        <span>已选择：{{ selectedFile.name }}</span>
        <UiButton
          variant="primary"
          size="sm"
          :loading="uploading"
          class="qip__upload-button"
          @click="handleUpload"
        >
          开始导入
        </UiButton>
      </div>
    </template>

    <!-- 导入结果 -->
    <template v-else>
      <a-result
        :status="importResult.errorRows > 0 ? 'warning' : 'success'"
        :title="`导入完成：成功 ${importResult.successRows} 条，失败 ${importResult.errorRows} 条`"
      >
        <template #extra>
          <p>总行数：{{ importResult.totalRows }}</p>
          <p v-if="safeErrorSummary" class="qip__error-summary">错误摘要：{{ safeErrorSummary }}</p>

          <template v-if="failedRows.length > 0">
            <a-divider>失败行详情</a-divider>
            <UiDataTable
              pagination-mode="client"
              :columns="errorColumns"
              :data-source="pagedFailedRows"
              v-model:current="importErrorPage"
              v-model:page-size="importErrorPageSize"
              :total="failedRows.length"
              :show-size-changer="false"
              row-key="rowIndex"
              size="small"
              flat
            />
          </template>

          <UiButton variant="primary" size="sm" class="qip__close-button" @click="handleClose">
            完成
          </UiButton>
        </template>
      </a-result>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios'
import type { ImportDiagnostic, ImportResult } from '@/apis/quality'
import type { BlobDownloadResponse } from '@/config/axios/types'
import { InboxOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { getUserProcessFailureMessage } from '@/utils/error-handler'

/**
 * 通用 Excel 导入面板：模板下载 + 文件选择 + 上传 + 行级诊断展示。
 *
 * 用法：父组件传入：
 * - title：弹窗标题
 * - accept：文件后缀白名单（如 `.xlsx,.xls`）
 * - templateApi：返回 Promise<axios Blob 响应>
 * - uploadApi(file)：返回 Promise<ImportResult>
 * - templateFileName：默认下载文件名（浏览器无法从响应头读取时兜底）
 *
 * 不接管业务校验。所有业务校验由后端解析器完成；本组件只负责渲染诊断结果。
 */
const props = defineProps<{
  open: boolean
  title: string
  /** 文件 accept 字符串，如 ".xlsx,.xls" */
  accept: string
  /** accept 提示文案，如 "支持 .xlsx / .xls 格式" */
  acceptHint: string
  /** 顶部 a-alert 描述（可选） */
  description?: string
  /** 顶部 a-alert 标题（可选） */
  descriptionTitle?: string
  /** 模板下载按钮文案（默认：下载 Excel 模板） */
  templateButtonLabel?: string
  /** 模板下载默认文件名（浏览器无法解析 Content-Disposition 时兜底） */
  templateFileName: string
  /** 模板下载 API：返回 Blob 响应 */
  templateApi: () => Promise<BlobDownloadResponse>
  /** 上传 API：返回标准 ImportResult */
  uploadApi: (file: File) => Promise<ImportResult>
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'imported', result: ImportResult): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const downloading = ref(false)
const importResult = ref<ImportResult | null>(null)

const errorColumns = [
  { title: '行号', dataIndex: 'rowIndex', key: 'rowIndex', width: 70 },
  { title: '处理说明', dataIndex: 'invalidReason', key: 'invalidReason' },
]

const safeErrorSummary = computed(() => {
  if (!importResult.value || importResult.value.errorRows <= 0) return undefined
  return getUserProcessFailureMessage(
    importResult.value?.errorSummary,
    '导入完成，但部分数据未通过校验，请查看失败行详情',
  )
})

const failedRows = computed<ImportDiagnostic[]>(() =>
  (importResult.value?.diagnostics || [])
    .filter((d) => !d.valid)
    .map((diagnostic) => ({
      ...diagnostic,
      invalidReason: getUserProcessFailureMessage(
        diagnostic.invalidReason,
        '该行数据未通过校验，请检查必填项和字段格式',
      ),
    })),
)

const importErrorPage = ref(1)
const importErrorPageSize = ref(10)

const pagedFailedRows = computed(() => {
  const start = (importErrorPage.value - 1) * importErrorPageSize.value
  return failedRows.value.slice(start, start + importErrorPageSize.value)
})

watch(
  () => props.open,
  (v) => {
    if (!v) {
      selectedFile.value = null
      importResult.value = null
    }
  },
)

function beforeUpload(file: File) {
  selectedFile.value = file
  return false
}

async function handleUpload() {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    const result = await props.uploadApi(selectedFile.value)
    importResult.value = result
    if (result.successRows > 0) {
      emit('imported', result)
    }
    if (result.errorRows === 0) {
      message.success(`导入成功 ${result.successRows} 条`)
    } else {
      message.warning(`导入完成：成功 ${result.successRows} 条，失败 ${result.errorRows} 条`)
    }
  } finally {
    uploading.value = false
  }
}

async function handleDownloadTemplate() {
  downloading.value = true
  try {
    const response = await props.templateApi()
    const blob = response.data
    const fileName = resolveFileName(response.headers, props.templateFileName)
    triggerBrowserDownload(blob, fileName)
  } finally {
    downloading.value = false
  }
}

function handleClose() {
  visible.value = false
}

/**
 * 解析 Content-Disposition 中的 filename，否则使用兜底值。
 */
function resolveFileName(
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders | undefined,
  fallback: string,
): string {
  if (!headers) return fallback
  const cd = String(headers['content-disposition'] || headers['Content-Disposition'] || '')
  if (!cd) return fallback
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(cd)
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return fallback
    }
  }
  const asciiMatch = /filename="?([^";]+)"?/i.exec(cd)
  return asciiMatch ? asciiMatch[1] : fallback
}

/**
 * 触发浏览器下载文件。
 */
function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

defineExpose({ failedRows })
</script>

<style scoped lang="scss">
.qip {
  &__alert {
    margin-bottom: 12px;
  }

  &__template-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__template-text {
    color: var(--dp-text-secondary, #475569);
    font-size: 13px;
  }

  &__selected-file {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }

  &__upload-button {
    margin-left: auto;
  }

  &__error-summary {
    margin-top: 4px;
    color: var(--dp-warning, #d97706);
    font-size: 13px;
  }

  &__close-button {
    margin-top: 16px;
  }
}
</style>
