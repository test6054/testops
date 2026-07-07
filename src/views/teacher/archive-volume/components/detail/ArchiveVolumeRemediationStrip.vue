<script setup lang="ts">
import type { ArchiveRemediationTaskResponse } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import {
  ARCHIVE_REMEDIATION_STATUS_TONE,
  ArchiveRemediationStatusCode,
  ArchiveRemediationStatusDescription,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { remediationAssigneeLabel } from '@/utils/archive-remediation-display'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeRemediationStrip' })

const props = defineProps<{
  task: ArchiveRemediationTaskResponse | null
  currentUserId: string
  canAdvance: boolean
  canManageCoordinator: boolean
  updating?: boolean
}>()

const emit = defineEmits<{
  'register-material': []
  "advance": [status: ArchiveRemediationStatusCode]
}>()

const assigneeLabel = computed(() => {
  const task = props.task
  if (!task?.assigneeUserId || task.assigneeUserId === props.currentUserId) {
    return null
  }
  return remediationAssigneeLabel(task)
})

const description = computed(() => {
  const task = props.task
  if (!task) return '当前卷存在未关闭整改任务'
  const parts: string[] = []
  if (task.taskDescription?.trim()) {
    parts.push(task.taskDescription.trim())
  } else {
    parts.push(task.taskTitle)
  }
  if (task.dueTime) {
    parts.push(`截止 ${formatDateTime(task.dueTime)}`)
  }
  return parts.join(' · ')
})

function remediationStatusLabel(code: ArchiveRemediationStatusCode) {
  return strictEnumLabel(ArchiveRemediationStatusDescription, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_REMEDIATION_STATUS_TONE, code, 'taskStatus')
}
</script>

<template>
  <UiAlertStrip
    v-if="task"
    tone="warning"
    title="迎评整改进行中"
    :description="description"
    dense
    class="archive-volume-remediation-strip"
  >
    <template #meta>
      <UiTag :tone="remediationStatusTone(task.taskStatus)" size="sm">
        {{ remediationStatusLabel(task.taskStatus) }}
      </UiTag>
      <span v-if="assigneeLabel" class="archive-volume-remediation-strip__assignee">
        责任人 {{ assigneeLabel }}
      </span>
    </template>
    <template #actions>
      <UiButton size="sm" variant="primary" @click="emit('register-material')">
        登记补正材料
      </UiButton>
      <UiButton
        v-if="canAdvance && task.taskStatus === ArchiveRemediationStatusCode.OPEN"
        size="sm"
        variant="outline"
        :loading="updating"
        @click="emit('advance', ArchiveRemediationStatusCode.IN_PROGRESS)"
      >
        开始处理
      </UiButton>
      <UiButton
        v-if="canAdvance && task.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS"
        size="sm"
        variant="outline"
        :loading="updating"
        @click="emit('advance', ArchiveRemediationStatusCode.RESUBMITTED)"
      >
        标记已重提
      </UiButton>
      <UiButton
        v-if="canManageCoordinator && task.taskStatus === ArchiveRemediationStatusCode.OPEN"
        size="sm"
        variant="outline"
        :loading="updating"
        @click="emit('advance', ArchiveRemediationStatusCode.IN_PROGRESS)"
      >
        开始处理
      </UiButton>
      <UiButton
        v-if="canManageCoordinator && task.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS"
        size="sm"
        variant="outline"
        :loading="updating"
        @click="emit('advance', ArchiveRemediationStatusCode.RESUBMITTED)"
      >
        标记已重提
      </UiButton>
      <UiButton
        v-if="canManageCoordinator && task.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED"
        size="sm"
        variant="outline"
        :loading="updating"
        @click="emit('advance', ArchiveRemediationStatusCode.CLOSED)"
      >
        复检关闭
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<style scoped>
.archive-volume-remediation-strip {
  margin-bottom: var(--dp-space-4, 16px);
}

.archive-volume-remediation-strip__assignee {
  color: var(--dp-text-secondary, #64748b);
  font-size: 13px;
}
</style>
