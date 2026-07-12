<script setup lang="ts">
import type { ArchiveEvaluationExportProgressResponse } from '@/apis/mark/archive-volume'
import { Modal, Progress } from 'ant-design-vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import { cancelEvaluationExport, getEvaluationExportProgress } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { ExportTaskStatusCode } from '@/types/enums/export-task-status-enum'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  taskId: string
  volumeCount?: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "completed": []
  "cancelled": []
}>()

const polling = ref(false)
const cancelling = ref(false)
const progress = ref<ArchiveEvaluationExportProgressResponse | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

const ACTIVE_STATUSES = new Set<ExportTaskStatusCode>([
  ExportTaskStatusCode.PENDING,
  ExportTaskStatusCode.GENERATING,
])

function close(): void {
  emit('update:open', false)
}

function isTaskActive(status: ExportTaskStatusCode | undefined): boolean {
  return status != null && ACTIVE_STATUSES.has(status)
}

function requestClose(): void {
  const status = progress.value?.status
  if (isTaskActive(status)) {
    Modal.confirm({
      title: '导出仍在进行',
      content: '关闭窗口不会停止后台导出。如需终止请点击「取消导出」。',
      okText: '仍要关闭',
      cancelText: '继续等待',
      onOk: () => close(),
    })
    return
  }
  close()
}

async function pollOnce(): Promise<void> {
  if (!props.taskId) {
    return
  }
  polling.value = true
  try {
    progress.value = await getEvaluationExportProgress({ taskId: props.taskId })
    const status = progress.value.status
    if (status === ExportTaskStatusCode.COMPLETED) {
      stopPolling()
      if (progress.value.exportFileId) {
        await downloadFile({ nodeId: progress.value.exportFileId })
      }
      emit('completed')
      close()
      return
    }
    if (status === ExportTaskStatusCode.FAILED) {
      stopPolling()
      showUserError(new Error(progress.value.errorMessage ?? '导出失败'))
      return
    }
    if (status === ExportTaskStatusCode.CANCELLED) {
      stopPolling()
      emit('cancelled')
      close()
    }
  } catch (error) {
    stopPolling()
    showUserError(error, '导出进度查询失败')
  } finally {
    polling.value = false
  }
}

async function handleCancel(): Promise<void> {
  if (!props.taskId || cancelling.value) {
    return
  }
  cancelling.value = true
  try {
    await cancelEvaluationExport({ taskId: props.taskId })
    await pollOnce()
  } catch (error) {
    showUserError(error, '取消导出失败')
  } finally {
    cancelling.value = false
  }
}

function startPolling(): void {
  stopPolling()
  void pollOnce()
  timer = setInterval(() => {
    void pollOnce()
  }, 3000)
}

function stopPolling(): void {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

watch(
  () => [props.open, props.taskId] as const,
  ([open, taskId]) => {
    if (open && taskId) {
      progress.value = null
      startPolling()
      return
    }
    stopPolling()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <Modal
    :open="open"
    title="迎评材料包导出中"
    :footer="null"
    :mask-closable="false"
    @cancel="requestClose"
  >
    <p>共 {{ volumeCount ?? progress?.volumeCount ?? '—' }} 卷，后台打包中…</p>
    <Progress :percent="progress?.status === ExportTaskStatusCode.COMPLETED ? 100 : undefined" status="active" />
    <p v-if="progress?.exportFileName" class="archive-export-progress__meta">
      {{ progress.exportFileName }}
    </p>
    <div class="archive-export-progress__actions">
      <UiButton variant="outline" size="sm" :loading="cancelling" @click="handleCancel">
        取消导出
      </UiButton>
    </div>
  </Modal>
</template>

<style scoped>
.archive-export-progress__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.archive-export-progress__meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--nybc-text-secondary, #64748b);
}
</style>
