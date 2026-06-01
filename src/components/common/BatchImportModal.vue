<template>
  <a-modal
    :open="props.open"
    :title="modalTitle"
    :width="modalWidth"
    :confirm-loading="loading"
    :mask-closable="false"
    @cancel="handleCancel"
    @ok="handleModalOk"
    class="batch-import-modal"
  >
    <div v-if="viewMode === 'upload'" class="import-container">
      <!-- 下载模板提示 -->
      <div class="template-section">
        <div class="template-info">
          <InfoCircleOutlined class="info-icon" />
          <span>请先下载模板，按照格式填写数据后再上传</span>
        </div>
        <a-button
          type="default"
          :loading="templateLoading"
          @click="handleDownloadTemplate"
          class="download-btn"
        >
          <template #icon>
            <DownloadOutlined />
          </template>
          下载{{ props.entityLabel }}导入模板
        </a-button>
      </div>

      <!-- 文件上传区域 -->
      <div class="upload-section">
        <a-upload
          :file-list="fileList"
          :before-upload="beforeUpload"
          :custom-request="customRequest"
          @change="handleFileChange"
          @remove="handleFileRemove"
          accept=".xlsx,.xls"
          :show-upload-list="false"
          class="upload-area"
        >
          <div class="upload-dragger">
            <div class="upload-content">
              <UploadOutlined class="upload-icon" />
              <div class="upload-text">
                <p class="upload-hint">
                  拖拽文件到此处，或<span class="upload-link">点击选择文件</span>
                </p>
                <p class="upload-desc">支持 .xlsx .xls 格式，文件大小不超过 30MB</p>
              </div>
            </div>
          </div>
        </a-upload>

        <!-- 已选择的文件信息 -->
        <div v-if="fileList.length > 0" class="file-info">
          <div class="file-item">
            <FileOutlined class="file-icon" />
            <div class="file-details">
              <span class="file-name">{{ fileList[0].name }}</span>
              <span class="file-size">{{ formatFileSize(getFileSize(fileList[0])) }}</span>
            </div>
            <a-tag color="green" class="file-status">
              <CheckOutlined />
              已选择
            </a-tag>
            <a-button type="text" size="small" @click="handleFileRemove" class="file-remove">
              <CloseOutlined />
            </a-button>
          </div>
        </div>
      </div>

      <!-- 格式要求提示 -->
      <div class="requirements">
        <div v-for="(req, index) in requirementList" :key="index" class="requirement-item">
          <CheckOutlined class="req-icon" />
          <span>{{ req }}</span>
        </div>
      </div>
    </div>

    <div v-else class="import-result">
      <div class="result-summary" :class="`is-${resultStatus}`">
        <div class="summary-icon">
          <CheckCircleFilled v-if="resultStatus === 'success'" />
          <ExclamationCircleFilled v-else-if="resultStatus === 'warning'" />
          <CloseCircleFilled v-else />
        </div>
        <div class="summary-content">
          <div class="summary-title">
            {{ resultTitle }}
          </div>
          <div class="summary-desc">
            {{ resultSubtitle }}
          </div>
        </div>
        <div class="summary-stats">
          <div class="summary-stat">
            <span>总计</span>
            <strong>{{ importResult.totalCount }}</strong>
          </div>
          <div class="summary-stat success">
            <span>成功</span>
            <strong>{{ importResult.successCount }}</strong>
          </div>
          <div class="summary-stat fail">
            <span>失败</span>
            <strong>{{ importResult.failCount }}</strong>
          </div>
        </div>
      </div>

      <!-- 错误详情 -->
      <div v-if="errorRows.length > 0" class="error-details">
        <h4 class="error-title">
          <ExclamationCircleFilled class="error-icon" />
          异常明细
        </h4>
        <a-table
          :columns="errorColumns"
          :data-source="errorRows"
          :pagination="errorTablePagination"
          size="small"
          row-key="key"
          class="error-table"
        />
      </div>
    </div>

    <!-- 自定义底部按钮 -->
    <template #footer>
      <div class="modal-footer">
        <template v-if="viewMode === 'upload'">
          <a-button @click="handleCancel">取消</a-button>
          <a-button
            type="primary"
            :disabled="fileList.length === 0"
            :loading="loading"
            @click="handleConfirm"
          >
            开始导入
          </a-button>
        </template>
        <template v-else>
          <a-button v-if="importResult.failCount > 0" @click="handleImportAgain">
            重新导入
          </a-button>
          <a-button type="primary" @click="handleCloseResult">确定</a-button>
        </template>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
import type { TableColumnsType, UploadChangeParam, UploadFile } from 'ant-design-vue'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import CheckCircleFilled from '@ant-design/icons-vue/CheckCircleFilled'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import CloseCircleFilled from '@ant-design/icons-vue/CloseCircleFilled'
import CloseOutlined from '@ant-design/icons-vue/CloseOutlined'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import ExclamationCircleFilled from '@ant-design/icons-vue/ExclamationCircleFilled'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import { computed, ref, watch } from 'vue'
import {
  getUserProcessFailureMessage,
  isDeveloperDiagnosticMessage,
  showUserError,
} from '@/utils/error-handler'

type ResultStatus = 'success' | 'warning' | 'error'

interface Props {
  open?: boolean
  title?: string
  /** 导入实体名称，用于文案显示（如 '学生'、'教师'、'专业课程'） */
  entityLabel?: string
  /** 导入处理函数，接收文件返回导入结果 */
  importHandler: (file: File) => Promise<unknown>
  /** 格式要求提示列表 */
  requirements?: string[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
  (e: 'download-template'): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '批量导入',
  entityLabel: '数据',
})

const emit = defineEmits<Emits>()

// 响应式数据
const loading = ref(false)
const templateLoading = ref(false)
const fileList = ref<UploadFile[]>([])
const viewMode = ref<'upload' | 'result'>('upload')

// 导入结果接口定义
interface ImportResult {
  totalCount: number
  successCount: number
  failCount: number
  errorMessages: string[]
}

// 导入结果
const importResult = ref<ImportResult>({
  totalCount: 0,
  successCount: 0,
  failCount: 0,
  errorMessages: [],
})

interface ErrorRow {
  key: string
  index: number
  rowText: string
  message: string
}

const modalTitle = computed(() => (viewMode.value === 'result' ? '导入结果' : props.title))
const modalWidth = computed(() => (viewMode.value === 'result' ? '760px' : '600px'))

const resultStatus = computed<ResultStatus>(() => {
  if (!importResult.value) return 'error'

  if (importResult.value.failCount === 0) {
    return 'success'
  } else if (importResult.value.successCount > 0 && importResult.value.failCount > 0) {
    return 'warning'
  } else {
    return 'error'
  }
})

const errorRows = computed<ErrorRow[]>(() => {
  return (importResult.value.errorMessages || []).map((messageText, index) => {
    const parsed = parseErrorMessage(messageText)
    return {
      key: `${index}-${messageText}`,
      index: index + 1,
      rowText: parsed.rowText,
      message: sanitizeImportFailureMessage(parsed.message),
    }
  })
})

const errorColumns: TableColumnsType<ErrorRow> = [
  {
    title: '序号',
    dataIndex: 'index',
    key: 'index',
    width: 72,
    align: 'center',
  },
  {
    title: '位置',
    dataIndex: 'rowText',
    key: 'rowText',
    width: 100,
  },
  {
    title: '导入处理说明',
    dataIndex: 'message',
    key: 'message',
  },
]

const errorTablePagination = computed(() => {
  if (errorRows.value.length <= 6) return false
  return {
    pageSize: 6,
    size: 'small' as const,
    showSizeChanger: false,
    showTotal: (total: number) => `共 ${total} 条失败明细`,
  }
})

const resultTitle = computed(() => {
  switch (resultStatus.value) {
    case 'success':
      return '导入成功'
    case 'warning':
      return '部分导入成功'
    default:
      return '导入失败'
  }
})

const resultSubtitle = computed(() => {
  if (!importResult.value) return '导入失败'
  if (importResult.value.failCount > 0 && importResult.value.successCount === 0) {
    return `发现 ${importResult.value.failCount} 条失败明细，本次未导入数据`
  }
  if (importResult.value.successCount > 0 && importResult.value.failCount > 0) {
    return `成功 ${importResult.value.successCount} 条，失败 ${importResult.value.failCount} 条；请检查失败明细`
  }
  return `成功导入 ${importResult.value.successCount} 条${props.entityLabel}数据`
})

/** 格式要求列表：优先使用外部传入，否则使用默认 */
const requirementList = computed(() => {
  if (props.requirements && props.requirements.length > 0) {
    return props.requirements
  }
  return ['请使用官方模板格式', '确保必填字段完整', '数据不能重复']
})

const parseErrorMessage = (rawMessage: string) => {
  const messageText = String(rawMessage || '').trim()
  const match = messageText.match(/^第(\d+)行[：:]\s*(.*)$/)
  if (match) {
    return {
      rowText: `第 ${match[1]} 行`,
      message: match[2] || messageText,
    }
  }
  return {
    rowText: '全局',
    message: messageText,
  }
}

const sanitizeImportFailureMessage = (messageText: string): string => {
  return getUserProcessFailureMessage(messageText, '该行数据无法导入，请检查必填项和字段格式')
}

const splitBackendErrorMessages = (messageText: string): string[] => {
  const text = String(messageText || '').trim()
  if (!text) return []
  if (isDeveloperDiagnosticMessage(text)) return ['导入失败，请检查文件格式和数据']

  const withoutSummary = text.replace(/^导入失败，共\s*\d+\s*条错误[：:]\s*/u, '')
  const normalized = withoutSummary.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (normalized.includes('\n')) {
    return normalized
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  const matches = normalized.match(/第\d+行[：:]\s*.*?(?=\s*第\d+行[：:]|$)/gu)
  if (matches && matches.length > 0) {
    return matches.map((item) => item.trim()).filter(Boolean)
  }

  return [text]
}

const extractImportFailureMessages = (error: unknown): string[] => {
  if (error != null && typeof error === 'object') {
    const obj = error as {
      message?: unknown
      response?: {
        data?: {
          msg?: unknown
          message?: unknown
          data?: unknown
        }
      }
    }
    const responseData = obj.response?.data
    const resultData = responseData?.data
    if (resultData != null && typeof resultData === 'object') {
      const maybeResult = resultData as Partial<ImportResult>
      if (Array.isArray(maybeResult.errorMessages) && maybeResult.errorMessages.length > 0) {
        return maybeResult.errorMessages.map((item) => {
          const parsed = parseErrorMessage(item)
          if (parsed.rowText === '全局') return sanitizeImportFailureMessage(parsed.message)
          return `${parsed.rowText.replace(/\s+/g, '')}：${sanitizeImportFailureMessage(parsed.message)}`
        })
      }
    }

    const backendMessage = responseData?.msg ?? responseData?.message ?? obj.message
    if (typeof backendMessage === 'string') {
      return splitBackendErrorMessages(backendMessage)
    }
  }

  if (typeof error === 'string') {
    return splitBackendErrorMessages(error)
  }

  return ['导入失败，请检查文件格式和数据']
}

const showImportResult = (result: ImportResult) => {
  importResult.value = {
    totalCount: result.totalCount ?? 0,
    successCount: result.successCount ?? 0,
    failCount: result.failCount ?? 0,
    errorMessages: result.errorMessages ?? [],
  }
  viewMode.value = 'result'
}

// 方法
const handleDownloadTemplate = async () => {
  templateLoading.value = true
  emit('download-template')
  templateLoading.value = false
}

const beforeUpload = (file: File) => {
  const isExcel
    = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || file.type === 'application/vnd.ms-excel'
      || file.name.endsWith('.xlsx')
      || file.name.endsWith('.xls')

  if (!isExcel) {
    showUserError(new Error('只能上传 Excel 文件（.xlsx 或 .xls 格式）'))
    originalFile.value = null
    fileList.value = []
    return false
  }

  const isLt30M = file.size / 1024 / 1024 < 30
  if (!isLt30M) {
    showUserError(new Error('文件大小不能超过 30MB'))
    originalFile.value = null
    fileList.value = []
    return false
  }

  originalFile.value = file
  // 返回 false 阻止自动上传，文件会通过 handleFileChange 维护展示状态
  return false
}

// 自定义上传请求（阻止组件自动上传）
const customRequest = (option: UploadRequestOption) => {
  // 不执行实际上传，只是标记为成功
  // 文件已经通过 beforeUpload 和 handleFileChange 处理了
  if (option.onSuccess) {
    option.onSuccess('ok')
  }
}

// 存储原始文件
const originalFile = ref<File | null>(null)

const handleFileChange = (info: UploadChangeParam) => {
  // 文件选择变化处理
  if (info.file) {
    // 保存完整的 FileItem 对象
    fileList.value = [info.file]

    // 如果状态不是 done，手动设置为 done (因为我们拦截了上传)
    if (info.file.status !== 'done') {
      info.file.status = 'done'
    }
  }
}

const handleFileRemove = () => {
  fileList.value = []
  originalFile.value = null
}

const handleConfirm = async () => {
  if (fileList.value.length === 0) {
    showUserError(new Error('请选择要导入的文件'))
    return
  }

  if (!originalFile.value) {
    showUserError(new Error('当前导入文件读取失败，请重新选择文件'))
    return
  }

  loading.value = true
  const file = originalFile.value

  try {
    const result = (await props.importHandler(file)) as ImportResult

    if (!result || typeof result !== 'object') {
      showUserError(new TypeError('导入结果响应格式异常'), '导入结果读取失败，请重新导入')
      return
    }

    const typedResult = result as ImportResult

    showImportResult(typedResult)

    if (typedResult.totalCount === 0) {
      showImportResult({
        totalCount: 0,
        successCount: 0,
        failCount: 1,
        errorMessages: ['导入文件中没有数据'],
      })
    } else if (typedResult.failCount === 0 && typedResult.successCount > 0) {
      emit('success')
    } else if (typedResult.successCount > 0 && typedResult.failCount > 0) {
      emit('success')
    }
  } catch (error) {
    const errorMessages = extractImportFailureMessages(error)
    showImportResult({
      totalCount: errorMessages.length,
      successCount: 0,
      failCount: errorMessages.length,
      errorMessages,
    })
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('update:open', false)
  resetModal()
  originalFile.value = null
}

const handleCloseResult = () => {
  emit('update:open', false)
  resetModal()
  originalFile.value = null
}

const handleImportAgain = () => {
  viewMode.value = 'upload'
  importResult.value = {
    totalCount: 0,
    successCount: 0,
    failCount: 0,
    errorMessages: [],
  }
}

const handleModalOk = () => {
  if (viewMode.value === 'result') {
    handleCloseResult()
    return
  }
  handleConfirm()
}

const resetModal = () => {
  viewMode.value = 'upload'
  fileList.value = []
  importResult.value = {
    totalCount: 0,
    successCount: 0,
    failCount: 0,
    errorMessages: [],
  }
}

// 获取文件大小（兼容不同的文件对象结构）
const getFileSize = (fileItem: UploadFile) => {
  // 尝试多种方式获取文件大小
  if (fileItem.size !== undefined) return fileItem.size
  if (fileItem.originFileObj?.size !== undefined) return fileItem.originFileObj.size
  return 0
}

const formatFileSize = (size: number) => {
  if (!size || size === 0) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 监听visible变化，重置状态
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      resetModal()
    }
  },
)
</script>

<style lang="scss" scoped>
.batch-import-modal {
  :deep(.ant-modal-body) {
    padding: 24px;
  }
}

.import-container {
  .template-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--ant-color-fill-quaternary);
    border-radius: var(--dp-radius-md);
    margin-bottom: 20px;

    .template-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--ant-color-text-secondary);

      .info-icon {
        color: var(--ant-color-primary);
      }
    }

    .download-btn {
      flex-shrink: 0;
    }
  }

  .upload-section {
    margin-bottom: 20px;

    .upload-area {
      :deep(.ant-upload) {
        width: 100%;
      }

      .upload-dragger {
        border: 2px dashed var(--ant-color-border-secondary);
        border-radius: var(--dp-radius-md);
        padding: 40px 20px;
        text-align: center;
        transition:
          border-color 0.3s ease,
          background-color 0.3s ease;
        cursor: pointer;

        &:hover {
          border-color: var(--ant-color-primary);
          background: var(--ant-color-primary-bg);
        }

        .upload-content {
          .upload-icon {
            font-size: 48px;
            color: var(--ant-color-text-tertiary);
            margin-bottom: 16px;
          }

          .upload-text {
            .upload-hint {
              font-size: 16px;
              color: var(--ant-color-text);
              margin-bottom: 8px;

              .upload-link {
                color: var(--ant-color-primary);
              }
            }

            .upload-desc {
              font-size: 14px;
              color: var(--ant-color-text-tertiary);
            }
          }
        }
      }
    }

    .file-info {
      margin-top: 16px;
      padding: 12px;
      background: var(--ant-color-fill-quaternary);
      border-radius: var(--ant-border-radius);

      .file-item {
        display: flex;
        align-items: center;
        gap: 12px;

        .file-icon {
          font-size: 20px;
          color: var(--ant-color-primary);
        }

        .file-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;

          .file-name {
            font-weight: 500;
            color: var(--ant-color-text);
          }

          .file-size {
            font-size: 12px;
            color: var(--ant-color-text-tertiary);
          }
        }

        .file-status {
          margin-left: auto;
        }

        .file-remove {
          color: var(--ant-color-text-tertiary);

          &:hover {
            color: var(--ant-color-error);
          }
        }
      }
    }
  }

  .template-content {
    display: flex;
    align-items: center;
    gap: 20px;

    .download-btn {
      height: 44px;
      padding: 0 24px;
      font-size: 14px;
      font-weight: 500;
      border-radius: var(--ant-border-radius);
      box-shadow: var(--dp-shadow-sm);

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--dp-shadow-card);
      }
    }

    .template-info {
      flex: 1;

      .template-desc {
        margin: 0 0 8px 0;
        color: var(--ant-color-text-secondary);
        font-size: 13px;
        line-height: 1.5;
      }

      .template-tips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
    }
  }

  .enhanced-upload {
    :deep(.ant-upload-drag) {
      border: 2px dashed var(--ant-color-split);
      border-radius: var(--dp-radius-md);
      background: var(--ant-color-bg-container);
      transition:
        border-color 0.3s ease,
        background-color 0.3s ease;

      &:hover {
        border-color: var(--ant-color-primary);
        background: var(--ant-color-primary-bg);
      }
    }

    .upload-area {
      padding: 40px 20px;
      text-align: center;

      .upload-icon-container {
        margin-bottom: 16px;

        .upload-main-icon {
          font-size: 48px;
          color: var(--ant-color-text-tertiary);
          transition: color 0.3s ease;
        }
      }

      .upload-content {
        .upload-title {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 500;
          color: var(--ant-color-text);
        }

        .upload-subtitle {
          margin: 0 0 20px 0;
          color: var(--ant-color-text-tertiary);
          font-size: 13px;
        }

        .upload-requirements {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;

          .requirement-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--ant-color-text-secondary);

            .req-icon {
              font-size: 14px;

              &.success {
                color: var(--ant-color-success);
              }
            }
          }
        }
      }
    }

    &:hover .upload-area .upload-icon-container .upload-main-icon {
      color: var(--ant-color-primary);
    }
  }

  .file-info {
    margin-top: 16px;
    padding: 12px;
    background: var(--ant-color-bg-layout);
    border-radius: var(--ant-border-radius);
    border: 1px solid var(--ant-color-border-secondary);

    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .file-icon {
        font-size: 20px;
        color: var(--ant-color-primary);
      }

      .file-details {
        flex: 1;

        .file-name {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--ant-color-text);
          margin-bottom: 2px;
        }

        .file-size {
          font-size: 12px;
          color: var(--ant-color-text-tertiary);
        }
      }

      .file-status {
        font-size: 12px;
      }
    }
  }

  .important-tips {
    .tips-alert {
      border-radius: var(--dp-radius-md);

      .tips-title {
        font-weight: 600;
        font-size: 15px;
      }

      .tips-content {
        margin-top: 12px;

        .tips-list {
          margin: 0;
          padding-left: 16px;

          li {
            margin-bottom: 8px;
            color: var(--ant-color-text-secondary);
            font-size: 13px;
            line-height: 1.5;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.import-result {
  .result-summary {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
    padding: 16px;
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-md);
    background: var(--ant-color-fill-quaternary);

    &.is-success {
      background: var(--ant-color-success-bg);
      border-color: var(--ant-color-success-border);

      .summary-icon {
        color: var(--ant-color-success);
      }
    }

    &.is-warning {
      background: var(--ant-color-warning-bg);
      border-color: var(--ant-color-warning-border);

      .summary-icon {
        color: var(--ant-color-warning);
      }
    }

    &.is-error {
      background: var(--ant-color-error-bg);
      border-color: var(--ant-color-error-border);

      .summary-icon {
        color: var(--ant-color-error);
      }
    }

    .summary-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      font-size: 24px;
    }

    .summary-content {
      min-width: 0;

      .summary-title {
        margin-bottom: 4px;
        color: var(--ant-color-text);
        font-size: 16px;
        font-weight: 600;
        line-height: 1.4;
      }

      .summary-desc {
        color: var(--ant-color-text-secondary);
        font-size: 13px;
        line-height: 1.5;
      }
    }

    .summary-stats {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }

    .summary-stat {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 68px;
      padding: 8px 12px;
      background: var(--ant-color-bg-container);
      border: 1px solid var(--ant-color-border-secondary);
      border-radius: var(--ant-border-radius);

      span {
        color: var(--ant-color-text-tertiary);
        font-size: 12px;
        line-height: 1.2;
      }

      strong {
        margin-top: 4px;
        color: var(--ant-color-primary);
        font-size: 20px;
        font-weight: 600;
        line-height: 1;
      }

      &.success strong {
        color: var(--ant-color-success);
      }

      &.fail strong {
        color: var(--ant-color-error);
      }
    }
  }

  .error-details {
    margin-top: 16px;

    .error-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--ant-color-text);

      .error-icon {
        color: var(--ant-color-error);
        font-size: 18px;
      }
    }

    .error-table {
      border: 1px solid var(--ant-color-border-secondary);
      border-radius: var(--ant-border-radius);
      overflow: hidden;

      :deep(.ant-table) {
        border-radius: var(--ant-border-radius);
      }

      :deep(.ant-table-cell) {
        vertical-align: top;
      }

      :deep(.ant-table-tbody > tr > td) {
        color: var(--ant-color-text-secondary);
        line-height: 1.5;
        white-space: normal;
        word-break: break-word;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .batch-import-modal {
    :deep(.ant-modal) {
      width: 95vw !important;
      margin: 10px;
    }
  }

  .import-container {
    .template-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;

      .download-btn {
        width: 100%;
      }
    }

    .upload-area {
      padding: 30px 15px !important;

      .upload-requirements {
        .requirement-item {
          font-size: 11px;
        }
      }
    }
  }

  .import-result {
    .result-summary {
      grid-template-columns: auto minmax(0, 1fr);

      .summary-stats {
        grid-column: 1 / -1;
        flex-wrap: wrap;
      }
    }
  }
}

// 简化的样式覆盖
.requirements {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--ant-color-fill-quaternary);
  border-radius: var(--ant-border-radius);
  border: 1px solid var(--ant-color-border-secondary);

  .requirement-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--ant-color-text-secondary);

    .req-icon {
      color: var(--ant-color-success);
      font-size: 16px;
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
