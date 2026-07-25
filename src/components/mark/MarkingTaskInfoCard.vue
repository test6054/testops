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
      <UiDescriptionsItem v-if="task.reviewSuggestion" label="批阅建议" :span="2">
        <UiTypographyParagraph :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }">
          {{ task.reviewSuggestion }}
        </UiTypographyParagraph>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="批阅记录" :span="2">
        <UiTypographyText v-if="reviewRecordsLoading" type="secondary">记录加载中...</UiTypographyText>
        <UiTypographyText v-else-if="reviewRecords.length === 0" type="secondary">
          暂无已提交的批阅记录
        </UiTypographyText>
        <div v-else class="marking-task-info-card__records">
          <div v-for="record in reviewRecords" :key="record.id" class="marking-task-info-card__record">
            <UiTypographyText strong>{{ operationLabel(record.operationType) }}</UiTypographyText>
            <span>{{ formatDateTime(record.createTime) }}</span>
            <span>{{ record.operatorName }}</span>
            <UiTypographyParagraph v-if="record.reason" :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }">
              {{ record.reason }}
            </UiTypographyParagraph>
          </div>
        </div>
      </UiDescriptionsItem>
    </UiDescriptions>
  </GradingImmersionSection>
</template>

<script lang="ts" setup>
import type { OperationLogResponse } from '@/apis/mark/admin-audit'
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
import { OperationTypeDescription } from '@/types/enums/operation-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingTaskInfoCard' })

defineProps<{
  task: MarkingTaskResponse
  reviewRecords: OperationLogResponse[]
  reviewRecordsLoading: boolean
  formatDateTime: (value?: string) => string
  taskStatusTone: (status: MarkingTaskStatusCode) => BadgeTone
  taskStatusLabel: (status: MarkingTaskStatusCode) => string
  allocationUnitLabel: (unit: AllocationUnitCode) => string
  anonymityModeLabel: (mode: AnonymityModeCode) => string
}>()

function operationLabel(operationType: OperationLogResponse['operationType']): string {
  return strictEnumLabel(OperationTypeDescription, operationType, '批阅操作类型')
}
</script>

<style lang="scss" scoped>
.marking-task-info-card {
  &__desc :deep(.ant-descriptions-item-label) {
    width: 108px;
  }

  &__records {
    display: grid;
    gap: var(--dp-space-component-tight);
  }

  &__record {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: var(--dp-space-component-xs) var(--dp-space-component-tight);
    padding: var(--dp-space-component-tight);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-panel);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);

    :deep(.ant-typography) {
      margin: 0;
    }

    :deep(.ant-typography-paragraph) {
      grid-column: 1 / -1;
    }
  }
}
</style>
