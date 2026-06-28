<template>
  <UiAlertStrip
    v-if="loading"
    tone="info"
    title="待整改任务"
    description="正在加载整改任务…"
    dense
    class="archive-volume-mine-remediation-banner"
  />
  <UiAlertStrip
    v-else-if="errorMessage"
    tone="error"
    title="待整改任务加载失败"
    :description="errorMessage"
    dense
    class="archive-volume-mine-remediation-banner"
  >
    <template #actions>
      <UiButton size="sm" variant="outline" :loading="loading" @click="emit('retry')">
        重试
      </UiButton>
    </template>
  </UiAlertStrip>
  <UiAlertStrip
    v-else-if="tasks.length === 1"
    tone="warning"
    title="待整改任务"
    :description="singleTaskDescription"
    dense
    class="archive-volume-mine-remediation-banner"
  >
    <template #meta>
      <UiTag :tone="remediationStatusTone(tasks[0].taskStatus)" size="sm">
        {{ remediationStatusLabel(tasks[0].taskStatus) }}
      </UiTag>
    </template>
    <template #actions>
      <UiButton size="sm" variant="primary" @click="emit('go', tasks[0])">
        去处理
      </UiButton>
    </template>
  </UiAlertStrip>
  <UiAlertStrip
    v-else-if="tasks.length > 1"
    tone="warning"
    title="待整改任务"
    :description="`当前有 ${tasks.length} 项开放整改任务待处理`"
    dense
    class="archive-volume-mine-remediation-banner"
  >
    <ul class="archive-volume-mine-remediation-banner__list">
      <li
        v-for="task in tasks"
        :key="task.taskId"
        class="archive-volume-mine-remediation-banner__item"
      >
        <div class="archive-volume-mine-remediation-banner__main">
          <span class="archive-volume-mine-remediation-banner__title">{{ task.taskTitle }}</span>
          <UiTag :tone="remediationStatusTone(task.taskStatus)" size="sm">
            {{ remediationStatusLabel(task.taskStatus) }}
          </UiTag>
          <span v-if="task.dueTime" class="archive-volume-mine-remediation-banner__due">
            截止 {{ formatDateTime(task.dueTime) }}
          </span>
        </div>
        <UiTextAction tone="primary" @click="emit('go', task)">去处理</UiTextAction>
      </li>
    </ul>
  </UiAlertStrip>
</template>

<script lang="ts" setup>
import type {ArchiveRemediationStatusCode, ArchiveRemediationTaskVO} from '@/apis/mark/archive-volume';
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import {
  ARCHIVE_REMEDIATION_STATUS_LABEL
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeMineRemediationBanner' })

const props = defineProps<{
  tasks: ArchiveRemediationTaskVO[]
  loading: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  retry: []
  go: [task: ArchiveRemediationTaskVO]
}>()

const singleTaskDescription = computed(() => {
  const task = props.tasks[0]
  if (!task) return ''
  const parts: string[] = []
  if (task.taskDescription?.trim()) {
    parts.push(task.taskDescription.trim())
  }
  else {
    parts.push(task.taskTitle)
  }
  if (task.dueTime) {
    parts.push(`截止 ${formatDateTime(task.dueTime)}`)
  }
  return parts.join(' · ')
})

function remediationStatusLabel(code: ArchiveRemediationStatusCode) {
  return strictEnumLabel(ARCHIVE_REMEDIATION_STATUS_LABEL, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationStatusCode): BadgeTone {
  if (code === 'CLOSED') return 'gray'
  if (code === 'RESUBMITTED') return 'green'
  if (code === 'IN_PROGRESS') return 'blue'
  return 'orange'
}
</script>

<style scoped>
.archive-volume-mine-remediation-banner__list {
  margin: var(--dp-space-2, 8px) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-mine-remediation-banner__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
}

.archive-volume-mine-remediation-banner__main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  min-width: 0;
}

.archive-volume-mine-remediation-banner__title {
  font-size: 14px;
  font-weight: 500;
}

.archive-volume-mine-remediation-banner__due {
  color: var(--dp-text-secondary, #64748b);
  font-size: 13px;
}
</style>
