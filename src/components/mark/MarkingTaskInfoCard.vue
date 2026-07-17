<template>
  <GradingImmersionSection title="任务详情">
    <template #icon>
      <ProfileOutlined />
    </template>
    <UiDescriptions
      :column="{ xs: 1, sm: 2 }"
      size="middle"
      bordered
      class="marking-task-info-card__desc"
    >
      <UiDescriptionsItem label="任务编号">
        <UiTypographyText copyable>{{ task.id }}</UiTypographyText>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="正评会话编号">
        <UiTypographyText copyable>{{ task.sessionId }}</UiTypographyText>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="题组编号">
        <UiTypographyText v-if="task.groupId" copyable>{{ task.groupId }}</UiTypographyText>
        <UiTag v-else tone="gray" size="sm">组织级任务</UiTag>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="任务单元">
        {{ allocationUnitLabel(task.taskUnit) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="匿名模式">
        {{ anonymityModeLabel(task.anonymityMode) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="任务状态">
        <UiTag :tone="taskStatusTone(task.taskStatus)" size="sm">
          {{ taskStatusLabel(task.taskStatus) }}
        </UiTag>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="分配时间">
        {{ formatDateTime(task.allocatedTime) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="提交时间">
        {{ formatDateTime(task.submittedTime) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem v-if="task.score !== undefined && task.score !== null" label="当前给分">
        <UiTypographyText strong>{{ task.score }}</UiTypographyText>
      </UiDescriptionsItem>
      <UiDescriptionsItem v-if="task.annotationNote" label="既有批注" :span="2">
        <UiTypographyParagraph :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }">
          {{ task.annotationNote }}
        </UiTypographyParagraph>
      </UiDescriptionsItem>
    </UiDescriptions>
  </GradingImmersionSection>
</template>

<script lang="ts" setup>
import type { AnonymityModeCode } from '@/apis/mark/anonymity-mode'
import type {
  AllocationUnitCode,
  MarkingTaskResponse,
  MarkingTaskStatusCode,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import GradingImmersionSection from '@/components/mark/GradingImmersionSection.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'

defineOptions({ name: 'MarkingTaskInfoCard' })

defineProps<{
  task: MarkingTaskResponse
  formatDateTime: (value?: string) => string
  taskStatusTone: (status: MarkingTaskStatusCode) => BadgeTone
  taskStatusLabel: (status: MarkingTaskStatusCode) => string
  allocationUnitLabel: (unit: AllocationUnitCode) => string
  anonymityModeLabel: (mode: AnonymityModeCode) => string
}>()
</script>

<style lang="scss" scoped>
.marking-task-info-card {
  &__desc :deep(.ant-descriptions-item-label) {
    width: 108px;
  }
}
</style>
