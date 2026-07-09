<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { QualityCourseGoalForMarkVO } from '@/apis/mark/exam-question-course-goal-mapping'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'

defineOptions({ name: 'ExamQuestionCourseGoalMappingTable' })

defineProps<{
  loading: boolean
  courseGoals: QualityCourseGoalForMarkVO[]
  columns: ColumnsType<MappingRow>
  rows: MappingRow[]
  goalOptions: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  (e: 'mapping-row-action', key: string, row: MappingRow): void
}>()

interface MappingRow {
  layoutQuestionId: string
  questionNo: string
  fullScore?: number
  mappingId?: string
  qualityCourseGoalId?: string
  weight: number
  saving: boolean
  deleting: boolean
}
</script>

<template>
  <UiSkeletonState v-if="loading" variant="card" compact />
  <UiEmpty
    v-else-if="courseGoals.length === 0"
    description="质量评价未配置课程目标，请先在质量评价域维护后再映射"
  />
  <UiDataTable
    v-else
    pagination-mode="none"
    :columns="columns"
    :data-source="rows"
    :show-pagination="false"
    flat
    row-key="layoutQuestionId"
    size="middle"
    empty-description="暂无试题，请先完成题目质量分析"
    :sticky-header="false"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'goal'">
        <a-select
          v-model:value="record.qualityCourseGoalId"
          class="exam-goal-mapping-card__select"
          placeholder="选择课程目标"
          :options="goalOptions"
          allow-clear
          show-search
          option-filter-prop="label"
        />
      </template>
      <template v-else-if="column.key === 'weight'">
        <a-input-number
          v-model:value="record.weight"
          class="exam-goal-mapping-card__weight"
          :min="0.0001"
          :max="999"
          :step="0.1"
          :precision="4"
        />
      </template>
      <template v-else-if="column.key === 'actions'">
        <UiTableActions
          :items="[
            { key: 'save', label: '保存', tone: 'primary', disabled: record.saving },
            {
              key: 'clear',
              label: '清除',
              tone: 'danger',
              hidden: !record.mappingId,
              disabled: record.deleting,
            },
          ]"
          split
          @action="(key) => emit('mapping-row-action', key, record)"
        />
      </template>
    </template>
  </UiDataTable>
</template>
