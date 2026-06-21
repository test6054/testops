<template>
  <a-modal
    v-model:open="visible"
    title="AI 文档解析导入答卷"
    :width="780"
    :footer="null"
    :mask-closable="!isPolling"
    @cancel="handleClose"
  >
    <!-- ① 上传区：选择文件 + 提交 -->
    <template v-if="phase === 'upload'">
      <a-upload-dragger :before-upload="beforeUpload" :show-upload-list="false" :accept="ACCEPT">
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此处</p>
        <p class="ant-upload-hint">
          支持 .pdf / .docx / .txt / .jpg / .jpeg / .png / .webp / .bmp / .tiff
        </p>
      </a-upload-dragger>

      <div v-if="selectedFile" class="ird__selected-file">
        <span>已选择：{{ selectedFile.name }}（{{ formatBytes(selectedFile.size) }}）</span>
        <UiButton
          variant="primary"
          size="sm"
          :loading="uploading"
          class="ird__upload-button"
          @click="handleSubmitAiParse"
        >
          开始 AI 解析
        </UiButton>
      </div>
    </template>

    <!-- ② 处理中：轮询 AI 任务状态 -->
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

    <!-- ③ 成功 -->
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

    <!-- ④ 失败 -->
    <template v-if="phase === 'failed'">
      <a-result status="error" title="AI 文档解析失败" :sub-title="failureReason" />
      <div class="ird__action-row">
        <UiButton variant="ghost" size="sm" @click="resetToUpload"> 重新上传 </UiButton>
        <UiButton variant="primary" size="sm" @click="handleClose"> 关闭 </UiButton>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import type { AiTaskStatus } from '@/apis/quality/types'
import { InboxOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  aiTaskApi,
} from '@/apis/quality/ai-task'
import {
  indirectResponseApi,
} from '@/apis/quality/indirect-response'
import {
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
} from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { getUserProcessFailureMessage } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

/**
 * 间接评价答卷 AI 文档解析面板：
 * 上传 → 提交异步 AI 任务 → 轮询状态 → 完成/失败反馈。
 *
 * 生命周期：upload → processing → succeeded | failed
 */
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

type Phase = 'upload' | 'processing' | 'succeeded' | 'failed'

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const phase = ref<Phase>('upload')
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const currentTaskId = ref<string | null>(null)
const currentTaskStatus = ref<AiTaskStatus>('PENDING')
const failureReason = ref<string | null>(null)
const pollCount = ref(0)
const pollFailureCount = ref(0)
let pollTimer: ReturnType<typeof setInterval> | null = null

const isPolling = computed(() => phase.value === 'processing')

const statusLabel = computed(() => {
  const s = currentTaskStatus.value
  return strictEnumLabel(AI_TASK_STATUS_LABEL, s, 'AI 任务状态')
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

watch(
  () => props.open,
  (v) => {
    if (!v) {
      stopPolling()
      resetState()
    }
  },
)

onBeforeUnmount(() => {
  stopPolling()
})

function beforeUpload(file: File): boolean {
  selectedFile.value = file
  return false
}

async function handleSubmitAiParse() {
  if (!selectedFile.value || !props.formId) return
  uploading.value = true
  try {
    const result = await indirectResponseApi.importDocumentAi(props.formId, selectedFile.value)
    currentTaskId.value = result.taskId
    currentTaskStatus.value = 'PENDING'
    phase.value = 'processing'
    pollCount.value = 0
    pollFailureCount.value = 0
    message.info('AI 解析任务已提交，正在后台处理…')
    startPolling()
  } finally {
    uploading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollTaskStatus, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollTaskStatus() {
  if (!currentTaskId.value) return
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
    } else if (task.status === 'FAILED') {
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
  selectedFile.value = null
  uploading.value = false
  currentTaskId.value = null
  currentTaskStatus.value = 'PENDING'
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
  &__alert {
    margin-bottom: 12px;

    p {
      margin: 0 0 4px;
      line-height: 1.6;

      &:last-child {
        margin-bottom: 0;
      }
    }
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
      color: var(--dp-text-primary, #0f172a);
    }
  }

  &__processing-hint {
    margin: 0 0 4px;
    font-size: 13px;
    color: var(--dp-text-muted, #94a3b8);
  }

  &__poll-count {
    font-size: 12px;
    color: var(--dp-text-muted, #94a3b8);
  }

  &__action-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }
}
</style>
