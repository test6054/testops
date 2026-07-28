<script setup lang="ts">
// MVR-948：本地 can* 显隐/禁用仅认 === true
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
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
  // MVR-318：仅排队/生成中可取消（与 canCancel 可见性同源）
  if (canCancel.value !== true) {
    return
  }
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
        size="sm"
        v-if="canCancel === true"
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
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.archive-eval-export-modal__status {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-eval-export-modal__meta {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.archive-eval-export-modal__error {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-danger);
}

.archive-eval-export-modal__hint {
  margin: var(--dp-space-component) 0 0;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
</style>
