<template>
  <UiCard class="marking-task-info-card info-card">
    <template #title>
      <ProfileOutlined />
      <span>任务详情</span>
    </template>
    <a-descriptions :column="{ xs: 1, sm: 2 }" size="middle" bordered class="marking-task-info-card__desc">
      <a-descriptions-item label="任务编号">
        <a-typography-text copyable>{{ task.id }}</a-typography-text>
      </a-descriptions-item>
      <a-descriptions-item label="正评会话编号">
        <a-typography-text copyable>{{ task.sessionId }}</a-typography-text>
      </a-descriptions-item>
      <a-descriptions-item label="题组编号">
        <a-typography-text v-if="task.groupId" copyable>{{ task.groupId }}</a-typography-text>
        <UiTag v-else tone="gray" size="sm">组织级任务</UiTag>
      </a-descriptions-item>
      <a-descriptions-item label="任务单元">
        {{ allocationUnitLabel(task.taskUnit) }}
      </a-descriptions-item>
      <a-descriptions-item label="匿名模式">
        {{ anonymityModeLabel(task.anonymityMode) }}
      </a-descriptions-item>
      <a-descriptions-item label="任务状态">
        <UiTag :tone="taskStatusTone(task.taskStatus)" size="sm">
          {{ taskStatusLabel(task.taskStatus) }}
        </UiTag>
      </a-descriptions-item>
      <a-descriptions-item label="分配时间">
        {{ formatDateTime(task.allocatedTime) }}
      </a-descriptions-item>
      <a-descriptions-item label="提交时间">
        {{ formatDateTime(task.submittedTime) }}
      </a-descriptions-item>
      <a-descriptions-item
        v-if="task.score !== undefined && task.score !== null"
        label="当前给分"
      >
        <a-typography-text strong>{{ task.score }}</a-typography-text>
      </a-descriptions-item>
      <a-descriptions-item v-if="task.annotationNote" label="既有批注" :span="2">
        <a-typography-paragraph :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }">
          {{ task.annotationNote }}
        </a-typography-paragraph>
      </a-descriptions-item>
    </a-descriptions>
  </UiCard>
</template>

<script lang="ts" setup>
import type { AnonymityModeCode } from '@/apis/mark/anonymity-mode'
import type {
  AllocationUnitCode,
  MarkingTaskStatusCode,
  MarkingTaskVO,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({ name: 'MarkingTaskInfoCard' })

defineProps<{
  task: MarkingTaskVO
  formatDateTime: (value?: string) => string
  taskStatusTone: (status: MarkingTaskStatusCode) => BadgeTone
  taskStatusLabel: (status: MarkingTaskStatusCode) => string
  allocationUnitLabel: (unit: AllocationUnitCode) => string
  anonymityModeLabel: (mode: AnonymityModeCode) => string
}>()
</script>

<style lang="scss" scoped>
.marking-task-info-card {
  margin-bottom: 16px;

  &__desc :deep(.ant-descriptions-item-label) {
    width: 140px;
    color: #595959;
  }
}
</style>
