<template>
  <a-modal
    v-model:open="visible"
    title="文档导入答卷"
    :width="780"
    :footer="null"
    :mask-closable="!isBusy"
    @cancel="handleClose"
  >
    <template v-if="phase === 'upload'">
      <UiAlertStrip
        tone="info"
        title="批量结构化导入优先使用 Excel；文档支持 AI 自动解析或抽取文本后手工录入。"
        dense
        class="ird__intro"
      />
      <div class="ird__upload-zone">
        <UiPlatformFileField
          v-model:file-node-id="sourceFileId"
          v-model:file-name="sourceFileName"
          v-model:file-size="sourceFileSize"
          :scene-key="FileUploadSceneKey.QUALITY_INDIRECT_RESPONSE_DOC"
          :accept="ACCEPT"
          button-text="选择文件"
          tip="支持 .pdf / .docx / .txt / .jpg / .jpeg / .png / .webp / .bmp / .tiff"
        />
      </div>

      <div v-if="sourceFileId" class="ird__selected-file">
        <span class="ird__file-label"
          >已选择：{{ sourceFileName }}（{{ formatBytes(sourceFileSize ?? 0) }}）</span
        >
        <div class="ird__action-row ird__action-row--upload">
          <UiButton
            variant="outline"
            size="sm"
            :loading="extracting"
            :disabled="uploading"
            @click="handleSubmitManualExtract"
          >
            仅抽取文本
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :loading="uploading"
            :disabled="extracting"
            @click="handleSubmitAiParse"
          >
            AI 自动解析
          </UiButton>
        </div>
      </div>
    </template>

    <template v-if="phase === 'processing'">
      <div class="ird__processing">
        <a-spin size="large" />
        <div class="ird__processing-text">
          <h4>AI 正在解析文档…</h4>
          <p class="ird__processing-hint">解析任务已提交，系统正在处理。</p>
          <p class="ird__processing-hint">
            状态：<UiTag :tone="statusColor">{{ statusLabel }}</UiTag>
            <span v-if="pollCount > 0" class="ird__poll-count">（已轮询 {{ pollCount }} 次）</span>
          </p>
          <p class="ird__processing-hint">解析通常需要 30 秒 ~ 2 分钟，请耐心等待。</p>
        </div>
      </div>
      <div class="ird__action-row">
        <UiButton variant="ghost" size="sm" @click="handleClose"> 后台继续，关闭弹窗 </UiButton>
      </div>
    </template>

    <template v-if="phase === 'extracted'">
      <UiAlertStrip
        tone="info"
        title="文本已抽取，不会自动写入答卷"
        :description="extractAlertDescription"
        dense
        class="ird__intro"
      />
      <div v-if="extractWarnings.length" class="ird__warnings">
        <p v-for="(line, index) in extractWarnings" :key="index" class="ird__warning-line">
          {{ line }}
        </p>
      </div>
      <pre v-if="extractDisplayText" class="ird__extract-text">{{ extractDisplayText }}</pre>
      <UiEmpty v-else description="未能从文档中抽取可读文本，请检查扫描清晰度或改用 Excel 导入。" />
      <div class="ird__action-row">
        <UiButton variant="ghost" size="sm" @click="resetToUpload"> 重新选择文件 </UiButton>
        <UiButton variant="primary" size="sm" @click="handleClose"> 关闭并对照录入 </UiButton>
      </div>
    </template>

    <template v-if="phase === 'succeeded'">
      <a-result
        status="success"
        title="AI 文档解析完成"
        sub-title="答卷草稿已写入，请在列表中查看并确认。"
      />
      <div class="ird__action-row">
        <UiButton variant="ghost" size="sm" @click="resetToUpload"> 继续上传 </UiButton>
        <UiButton variant="primary" size="sm" @click="handleCloseAndRefresh">
          关闭并刷新列表
        </UiButton>
      </div>
    </template>

    <template v-if="phase === 'failed'">
      <a-result status="error" title="AI 文档解析失败" :sub-title="failureReason" />
      <div class="ird__action-row ird__action-row--failed">
        <UiButton variant="ghost" size="sm" @click="resetToUpload"> 重新上传 </UiButton>
        <UiButton
          v-if="sourceFileId"
          variant="outline"
          size="sm"
          :loading="extracting"
          @click="handleSubmitManualExtract"
        >
          改为仅抽取文本
        </UiButton>
        <UiButton variant="primary" size="sm" @click="handleClose"> 关闭 </UiButton>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import type { IndirectResponseDocumentExtractionVO } from '@/apis/quality/indirect-response'
import { indirectResponseApi } from '@/apis/quality/indirect-response'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { aiTaskApi } from '@/apis/quality/ai-task'
import {
  AI_TASK_STATUS_COLOR,
  AiTaskStatusCode,
  AiTaskStatusDescription,
} from '@/apis/quality/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { usePolling } from '@/composables/usePolling'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  open: boolean
  formId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'refresh'): void
}>()

const ACCEPT = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp,.tiff'
const POLL_INTERVAL_MS = 3000
const MAX_POLL_COUNT = 120
const MAX_POLL_FAILURE_COUNT = 3

type Phase = 'upload' | 'processing' | 'extracted' | 'succeeded' | 'failed'

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const phase = ref<Phase>('upload')
const sourceFileId = ref<string | undefined>()
const sourceFileName = ref<string | undefined>()
const sourceFileSize = ref<number | undefined>()
const uploading = ref(false)
const extracting = ref(false)
const extractDisplayText = ref('')
const extractFileName = ref('')
const extractWarnings = ref<string[]>([])
const currentTaskId = ref<string | null>(null)
const currentTaskStatus = ref<AiTaskStatusCode>(AiTaskStatusCode.PENDING)
const failureReason = ref<string | null>(null)
const pollCount = ref(0)
const pollFailureCount = ref(0)

const taskPolling = usePolling(() => pollTaskStatus(), {
  getOptions: () => ({
    intervalMs: POLL_INTERVAL_MS,
    when: phase.value === 'processing' && visible.value,
  }),
  pauseWhenDocumentHidden: true,
})

const isBusy = computed(() => phase.value === 'processing' || extracting.value)

const extractAlertDescription = computed(() =>
  extractFileName.value
    ? `请对照《${extractFileName.value}》抽取结果，在答卷列表中使用「新增答卷」逐条录入。`
    : '请对照下方抽取结果，在答卷列表中使用「新增答卷」逐条录入。',
)

const statusLabel = computed(() => {
  const s = currentTaskStatus.value
  return strictEnumLabel(AiTaskStatusDescription, s, 'AI 任务状态')
})
const statusColor = computed(() => {
  const s = currentTaskStatus.value
  return strictEnumTone(AI_TASK_STATUS_COLOR, s, 'AI 任务状态')
})

function aiDocumentParseFailureText(messageText?: string | null): string {
  return getUserProcessFailureMessage(
    messageText,
    'AI 文档解析未完成，请检查文件内容是否清晰完整后重新上传',
  )
}

/** 将 edu-mark 抽取结果转为弹窗展示文本：优先 fullText，否则按页拼接。 */
function buildExtractDisplayText(result: IndirectResponseDocumentExtractionVO): string {
  const fullText = result.extraction.fullText?.trim()
  if (fullText) {
    return fullText
  }
  const pages = result.extraction.pages ?? []
  if (pages.length === 0) {
    return ''
  }
  return pages
    .slice()
    .sort((left, right) => (left.pageIndex ?? 0) - (right.pageIndex ?? 0))
    .map((page) => {
      const label = page.pageIndex != null ? `第 ${page.pageIndex + 1} 页` : '未编号页'
      return `${label}\n${page.text ?? ''}`
    })
    .join('\n\n')
}

watch(
  () => props.open,
  (v) => {
    if (!v) {
      taskPolling.pause()
      resetState()
    }
  },
)

onBeforeUnmount(() => {
  taskPolling.pause()
})

async function handleSubmitAiParse() {
  if (!sourceFileId.value || !props.formId) {
    return
  }
  uploading.value = true
  try {
    const result = await indirectResponseApi.importDocumentAi({
      formId: props.formId,
      sourceFileId: sourceFileId.value,
    })
    currentTaskId.value = result.taskId
    currentTaskStatus.value = AiTaskStatusCode.PENDING
    phase.value = 'processing'
    pollCount.value = 0
    pollFailureCount.value = 0
    message.info('AI 解析任务已提交，正在后台处理…')
    taskPolling.resume()
    taskPolling.syncPolling()
  } catch (error) {
    showUserError(error, 'AI 文档解析任务提交失败')
  } finally {
    uploading.value = false
  }
}

async function handleSubmitManualExtract() {
  if (!sourceFileId.value || !props.formId) {
    return
  }
  extracting.value = true
  try {
    const result = await indirectResponseApi.importDocument({
      formId: props.formId,
      sourceFileId: sourceFileId.value,
    })
    extractFileName.value = result.fileName
    extractDisplayText.value = buildExtractDisplayText(result)
    extractWarnings.value = result.extraction.diagnostic?.warningMessages ?? []
    phase.value = 'extracted'
    stopPolling()
    failureReason.value = null
  } catch (error) {
    showUserError(error, '文档文本抽取失败')
  } finally {
    extracting.value = false
  }
}

function stopPolling(): void {
  taskPolling.pause()
}

async function pollTaskStatus() {
  if (!currentTaskId.value) {
    return
  }
  pollCount.value++

  if (pollCount.value > MAX_POLL_COUNT) {
    stopPolling()
    failureReason.value = '轮询超时（超过 6 分钟），请稍后在任务列表中查看结果。'
    phase.value = 'failed'
    return
  }

  try {
    const task = await aiTaskApi.detail(currentTaskId.value)
    pollFailureCount.value = 0
    currentTaskStatus.value = task.status

    if (task.status === 'SUCCEEDED') {
      stopPolling()
      phase.value = 'succeeded'
      message.success('AI 文档解析完成，答卷草稿已写入')
    } else if (task.status === AiTaskStatusCode.FAILED) {
      stopPolling()
      failureReason.value = aiDocumentParseFailureText(task.failureReason)
      phase.value = 'failed'
    } else if (task.status === 'CANCELLED') {
      stopPolling()
      failureReason.value = '任务已被取消。'
      phase.value = 'failed'
    }
  } catch {
    pollFailureCount.value++
    if (pollFailureCount.value >= MAX_POLL_FAILURE_COUNT) {
      stopPolling()
      failureReason.value = '连续查询 AI 任务状态失败，请稍后在 AI 任务列表查看处理结果。'
      phase.value = 'failed'
    }
  }
}

function resetState() {
  phase.value = 'upload'
  sourceFileId.value = undefined
  sourceFileName.value = undefined
  sourceFileSize.value = undefined
  uploading.value = false
  extracting.value = false
  extractDisplayText.value = ''
  extractFileName.value = ''
  extractWarnings.value = []
  currentTaskId.value = null
  currentTaskStatus.value = AiTaskStatusCode.PENDING
  failureReason.value = null
  pollCount.value = 0
  pollFailureCount.value = 0
}

function resetToUpload() {
  stopPolling()
  resetState()
}

function handleClose() {
  stopPolling()
  visible.value = false
}

function handleCloseAndRefresh() {
  emit('refresh')
  handleClose()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<style scoped lang="scss">
.ird {
  &__intro {
    margin-bottom: var(--dp-space-4);
  }

  &__upload-zone {
    padding: 24px 16px;
    border: 1px dashed var(--ant-color-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-subtle);
  }

  &__selected-file {
    margin-top: var(--dp-space-3);
  }

  &__file-label {
    display: block;
    margin-bottom: var(--dp-space-3);
    font-size: 14px;
    color: var(--dp-text-secondary);
  }

  &__processing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 40px 0 24px;
  }

  &__processing-text {
    text-align: center;

    h4 {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 600;
      color: var(--dp-text-primary);
    }
  }

  &__processing-hint {
    margin: 0 0 4px;
    font-size: 13px;
    color: var(--dp-text-muted);
  }

  &__poll-count {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__warnings {
    margin-bottom: var(--dp-space-3);
  }

  &__warning-line {
    margin: 0 0 4px;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__extract-text {
    max-height: 360px;
    margin: 0;
    padding: var(--dp-space-3);
    overflow: auto;
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-control);
    background: var(--ant-color-bg-container);
    font-family: var(--dp-font-family);
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--dp-text-primary);
  }

  &__action-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: var(--dp-space-3);

    &--upload,
    &--failed {
      flex-wrap: wrap;
    }
  }
}
</style>
