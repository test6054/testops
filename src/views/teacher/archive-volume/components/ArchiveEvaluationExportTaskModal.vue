<script setup lang="ts">
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import {
  archiveEvaluationExportTaskView,
  cancelArchiveEvaluationExportTask,
} from '@/composables/useArchiveEvaluationExportFlow'
import {
  ExportTaskStatusCode,
  ExportTaskStatusDescription,
} from '@/types/enums/export-task-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveEvaluationExportTaskModal' })

const taskView = computed(() => archiveEvaluationExportTaskView.value)

const open = computed(() => taskView.value?.open ?? false)

const statusLabel = computed(() => {
  const status = taskView.value?.status
  if (!status) {
    return '—'
  }
  return strictEnumLabel(ExportTaskStatusDescription, status, 'exportTaskStatus')
})

const canCancel = computed(() => {
  const status = taskView.value?.status
  return status === ExportTaskStatusCode.PENDING || status === ExportTaskStatusCode.GENERATING
})

async function handleCancel(): Promise<void> {
  await cancelArchiveEvaluationExportTask()
}
</script>

<template>
  <UiDrawer
    :open="open"
    title="迎评导出进度"
    :width="420"
    :hide-footer="false"
    :mask-closable="false"
    :closable="false"
  >
    <p v-if="taskView?.campaignLabel" class="archive-eval-export-modal__label">
      批次：{{ taskView.campaignLabel }}
    </p>
    <p class="archive-eval-export-modal__status">状态：{{ statusLabel }}</p>
    <p v-if="taskView?.volumeCount != null" class="archive-eval-export-modal__meta">
      覆盖卷数：{{ taskView.volumeCount }}
    </p>
    <p v-if="taskView?.errorMessage" class="archive-eval-export-modal__error">
      {{ taskView.errorMessage }}
    </p>
    <p class="archive-eval-export-modal__hint">
      大批次导出将在后台生成，可在此查看进度；误触发时可取消排队或生成中的任务。
    </p>
    <template #footer>
      <UiButton
        v-if="canCancel"
        variant="outline"
        :loading="taskView?.cancelling"
        @click="handleCancel"
      >
        取消导出
      </UiButton>
    </template>
  </UiDrawer>
</template>

<style scoped lang="scss">
.archive-eval-export-modal__label {
  margin: 0 0 var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.archive-eval-export-modal__status {
  margin: 0 0 var(--dp-space-2);
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-eval-export-modal__meta {
  margin: 0 0 var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.archive-eval-export-modal__error {
  margin: 0 0 var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-danger);
}

.archive-eval-export-modal__hint {
  margin: var(--dp-space-3) 0 0;
  font-size: 12px;
  color: var(--dp-text-muted);
}
</style>
