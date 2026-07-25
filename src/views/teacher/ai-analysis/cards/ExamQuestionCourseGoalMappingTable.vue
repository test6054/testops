<script setup lang="ts">
import type {
  CourseObjectiveMappingReadinessVO,
  ExamQuestionCourseGoalMappingWorkspaceRowVO,
  QualityCourseGoalForMarkVO,
} from '@/apis/mark/exam-question-course-goal-mapping'
import type { UiDataTableColumn } from '@/components/ui-guide/ui/data-table'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, reactive } from 'vue'
import ExamQuestionIdentityCells from '@/components/mark/analysis/ExamQuestionIdentityCells.vue'
import { buildNumericColumn } from '@/components/ui-guide/ui/data-table'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkflowReadinessPanel from '@/components/workbench/workflow-readiness/WorkflowReadinessPanel.vue'
import {
  EXAM_QUESTION_COURSE_GOAL_MAPPING_STATUS_TONE,
  ExamQuestionCourseGoalMappingStatusCode,
  ExamQuestionCourseGoalMappingStatusDescription,
} from '@/types/enums/exam-question-course-goal-mapping-status-enum'
import { formatDateTime } from '@/utils/format'
import {
  buildExamQuestionIdentityColumns,
  EXAM_QUESTION_IDENTITY_COLUMN_KEYS,
  fmtExamQuestionScore,
} from '@/utils/mark-exam-question-table-columns'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamQuestionCourseGoalMappingTable' })

const props = withDefaults(defineProps<{
  loading: boolean
  courseGoalConfigured?: boolean
  readiness?: CourseObjectiveMappingReadinessVO | null
  courseGoals: QualityCourseGoalForMarkVO[]
  rows: MappingEditableRow[]
  goalOptions: Array<{ value: string, label: string }>
  /** MVR-270：仅主考可写；与 BE requireExamOwnerPermission 对齐 */
  canManageOwnerWrites?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
}>(), {
  canManageOwnerWrites: false,
})

const emit = defineEmits<{
  (e: 'mapping-row-action', key: string, row: MappingEditableRow): void
  (e: 'goal-change', row: MappingEditableRow): void
  (e: 'weight-change', row: MappingEditableRow): void
}>()

export interface MappingEditableRow extends ExamQuestionCourseGoalMappingWorkspaceRowVO {
  fullScore?: number
  saving: boolean
  deleting: boolean
}

interface MappingFilterForm extends Record<string, unknown> {
  mappingStatus?: ExamQuestionCourseGoalMappingStatusCode | 'ALL'
}

const filterForm = reactive<MappingFilterForm>({ mappingStatus: 'ALL' })

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'mappingStatus',
    type: 'select',
    placeholder: '映射状态',
    width: 140,
    options: [
      { value: 'ALL', label: '全部状态' },
      {
        value: ExamQuestionCourseGoalMappingStatusCode.MAPPED,
        label: ExamQuestionCourseGoalMappingStatusDescription.MAPPED,
      },
      {
        value: ExamQuestionCourseGoalMappingStatusCode.UNMAPPED,
        label: ExamQuestionCourseGoalMappingStatusDescription.UNMAPPED,
      },
    ],
  },
]

const readinessMetrics = computed<SignalMetric[]>(() => {
  const readiness = props.readiness
  if (!readiness) {
    return [
      { key: 'total', label: '制卷题目', value: '—', tone: 'blue' },
      { key: 'mapped', label: '已映射', value: '—', tone: 'green' },
      { key: 'goal-covered', label: '目标覆盖', value: '—', tone: 'blue' },
      { key: 'report-ready', label: '报告就绪', value: '—', tone: 'gray' },
    ]
  }
  const totalGoals = readiness.totalGoalCount ?? 0
  const coveredGoals = readiness.coveredGoalCount ?? 0
  return [
    {
      key: 'total',
      label: '制卷题目',
      value: readiness.totalQuestionCount ?? 0,
      tone: 'blue',
    },
    {
      key: 'mapped',
      label: '已映射',
      value: `${readiness.mappedQuestionCount ?? 0}/${readiness.totalQuestionCount ?? 0}`,
      tone:
        (readiness.mappedQuestionCount ?? 0) >= (readiness.totalQuestionCount ?? 0)
        && (readiness.totalQuestionCount ?? 0) > 0
          ? 'green'
          : 'orange',
    },
    {
      key: 'goal-covered',
      label: '目标覆盖',
      value: `${coveredGoals}/${totalGoals}`,
      tone: coveredGoals >= totalGoals && totalGoals > 0 ? 'green' : 'blue',
    },
    {
      key: 'report-ready',
      label: '报告就绪',
      value: readiness.reportReady ? '是' : '否',
      tone: readiness.reportReady ? 'green' : 'orange',
    },
  ]
})

const filteredRows = computed(() => {
  if (filterForm.mappingStatus === 'ALL' || !filterForm.mappingStatus) {
    return props.rows
  }
  return props.rows.filter((row) => row.mappingStatus === filterForm.mappingStatus)
})

const columns: UiDataTableColumn<MappingEditableRow>[] = [
  ...buildExamQuestionIdentityColumns<MappingEditableRow>(),
  { title: '映射状态', key: 'mappingStatus', width: 96 },
  { title: '课程目标', key: 'goal', width: 240 },
  buildNumericColumn({ title: '支撑权重', key: 'weight', width: 96, meta: { hideBelow: 'lg' } }),
  buildNumericColumn({
    title: '达成阈值',
    key: 'goalThresholdValue',
    width: 96,
    meta: { hideBelow: 'lg' },
  }),
  buildNumericColumn({
    title: '计分贡献',
    key: 'weightedScoreContribution',
    width: 96,
    meta: { hideBelow: 'lg' },
  }),
  { title: '更新时间', key: 'updateTime', width: 152, meta: { hideBelow: 'lg' } },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const qualityGoalSteps = [
  {
    code: 'COURSE_GOAL_CONFIG',
    label: '在质量评价域维护课程目标',
    status: 'pending' as const,
    description: '按考试关联课程的学年学期，在质量评价中配置 OBE 课程目标后再维护映射。',
    actionLabel: '前往质量评价',
    routeName: 'QualityCourseMatrix',
  },
]

function mappingStatusLabel(code: ExamQuestionCourseGoalMappingStatusCode): string {
  return strictEnumLabel(ExamQuestionCourseGoalMappingStatusDescription, code, '映射状态')
}

function handleGoalChange(row: MappingEditableRow): void {
  emit('goal-change', row)
}

function handleWeightChange(row: MappingEditableRow): void {
  emit('weight-change', row)
}

function handleFilterReset(): void {
  filterForm.mappingStatus = 'ALL'
}
</script>

<template>
  <UiSkeletonState v-if="loading" variant="card" compact />
  <WorkflowReadinessPanel
    v-else-if="courseGoalConfigured === false"
    title="课程目标未配置"
    :steps="qualityGoalSteps"
  />
  <div v-else class="exam-goal-mapping-table">
    <SignalBand :metrics="readinessMetrics" compact variant="inline" />

    <UiFilterBar
      v-model="filterModel"
      :fields="filterFields"
      variant="plain"
      search-text="筛选"
      reset-text="重置"
      @search="() => {}"
      @reset="handleFilterReset"
    />

    <UiDataTable
      pagination-mode="client"
      :columns="columns"
      :data-source="filteredRows"
      :show-pagination="filteredRows.length > 20"
      flat
      row-key="layoutQuestionId"
      size="middle"
      sticky-header
      empty-description="制卷未配置题目，请先在考试工作台维护试卷结构"
    >
      <template #bodyCell="{ column, record }">
        <ExamQuestionIdentityCells
          v-if="
            column.key === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionType
              || column.key === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionStem
              || column.key === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.fullScore
          "
          :column-key="String(column.key)"
          :record="record"
        />
        <template v-else-if="column.key === 'mappingStatus'">
          <UiTag
            :tone="
              strictEnumTone(
                EXAM_QUESTION_COURSE_GOAL_MAPPING_STATUS_TONE,
                record.mappingStatus,
                '映射状态',
              )
            "
            size="sm"
          >
            {{ mappingStatusLabel(record.mappingStatus) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'goal'">
          <UiSelect
            size="sm"
            v-model="record.qualityCourseGoalId"
            class="exam-goal-mapping-table__select"
            placeholder="选择课程目标"
            :options="goalOptions"
            :disabled="canManageOwnerWrites !== true"
            allow-clear
            allow-search
            option-filter-prop="label"
            @change="() => handleGoalChange(record)"
          />
          <div v-if="record.goalCode && record.goalName" class="exam-goal-mapping-table__goal-meta">
            {{ record.goalCode }} · {{ record.goalName }}
          </div>
        </template>
        <template v-else-if="column.key === 'weight'">
          <UiInputNumber
            size="sm"
            v-model="record.weight"
            class="exam-goal-mapping-table__weight"
            :min="0.0001"
            :max="999"
            :step="0.1"
            :precision="4"
            :disabled="canManageOwnerWrites !== true"
            @change="() => handleWeightChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'goalThresholdValue'">
          {{ fmtExamQuestionScore(record.goalThresholdValue) }}
        </template>
        <template v-else-if="column.key === 'weightedScoreContribution'">
          {{ fmtExamQuestionScore(record.weightedScoreContribution) }}
        </template>
        <template v-else-if="column.key === 'updateTime'">
          {{ formatDateTime(record.updateTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            v-if="canManageOwnerWrites === true"
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
          <span v-else class="exam-goal-mapping-table__readonly-hint">仅主考可维护</span>
        </template>
      </template>
    </UiDataTable>
  </div>
</template>

<style scoped lang="scss">
.exam-goal-mapping-table {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.exam-goal-mapping-table__goal-meta {
  margin-top: 4px;
  font-size: var(--dp-font-hint);
  color: var(--dp-text-secondary);
  line-height: 1.4;
}

.exam-goal-mapping-table__select,
.exam-goal-mapping-table__weight {
  width: 100%;
}
</style>
