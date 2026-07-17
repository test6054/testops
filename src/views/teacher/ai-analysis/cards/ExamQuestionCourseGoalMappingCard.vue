<template>
  <AiAnalysisSection
    v-if="embedded"
    title="试题-课程目标映射"
    headless
    class="exam-goal-mapping-card exam-goal-mapping-card--section"
  >
    <ExamQuestionCourseGoalMappingTable
      :loading="loading"
      :course-goal-configured="workspace?.courseGoalConfigured"
      :readiness="workspace?.readiness"
      :course-goals="courseGoals"
      :rows="rows"
      :goal-options="goalOptions"
      @mapping-row-action="handleMappingRowAction"
      @goal-change="handleGoalChange"
      @weight-change="handleWeightChange"
    />
  </AiAnalysisSection>

  <article v-else class="exam-goal-mapping-card">
    <header class="exam-goal-mapping-card__header">
      <div>
        <h4 class="exam-goal-mapping-card__title">试题-课程目标映射</h4>
        <p class="exam-goal-mapping-card__desc">
          维护本场考试各题与质量评价课程目标的支撑关系，供归档卷生成课程目标达成报告。
        </p>
      </div>
    </header>

    <ExamQuestionCourseGoalMappingTable
      :loading="loading"
      :course-goal-configured="workspace?.courseGoalConfigured"
      :readiness="workspace?.readiness"
      :course-goals="courseGoals"
      :rows="rows"
      :goal-options="goalOptions"
      @mapping-row-action="handleMappingRowAction"
      @goal-change="handleGoalChange"
      @weight-change="handleWeightChange"
    />
  </article>
</template>

<script setup lang="ts">
import type { MappingEditableRow } from './ExamQuestionCourseGoalMappingTable.vue'
import type {
  ExamQuestionCourseGoalMappingWorkspaceVO,
  QualityCourseGoalForMarkVO,
} from '@/apis/mark/exam-question-course-goal-mapping'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import {
  deleteExamQuestionCourseGoalMapping,
  loadExamQuestionCourseGoalMappingWorkspace,
  saveExamQuestionCourseGoalMapping,
} from '@/apis/mark/exam-question-course-goal-mapping'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  ExamQuestionCourseGoalMappingStatusCode,
} from '@/types/enums/exam-question-course-goal-mapping-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import ExamQuestionCourseGoalMappingTable from './ExamQuestionCourseGoalMappingTable.vue'

defineOptions({ name: 'ExamQuestionCourseGoalMappingCard' })

const props = withDefaults(
  defineProps<{
    examId?: string
    reloadToken?: number
    examLabel?: string
    embedded?: boolean
  }>(),
  { embedded: false },
)

const emit = defineEmits<{ changed: [] }>()

const loading = ref(false)
const workspace = ref<ExamQuestionCourseGoalMappingWorkspaceVO | null>(null)
const rows = ref<MappingEditableRow[]>([])

const courseGoals = computed<QualityCourseGoalForMarkVO[]>(() => workspace.value?.courseGoals ?? [])

const goalOptions = computed(() =>
  courseGoals.value.map((goal) => ({
    value: goal.goalId,
    label: `${goal.goalCode} ${goal.goalName}`,
  })),
)

const goalIndex = computed(() => {
  const index = new Map<string, QualityCourseGoalForMarkVO>()
  for (const goal of courseGoals.value) {
    index.set(goal.goalId, goal)
  }
  return index
})

function toEditableRows(
  sourceRows: ExamQuestionCourseGoalMappingWorkspaceVO['rows'],
): MappingEditableRow[] {
  return sourceRows.map((row) => ({
    ...row,
    fullScore: row.questionFullScore,
    weight: row.weight ?? 1,
    saving: false,
    deleting: false,
  }))
}

function syncGoalMeta(row: MappingEditableRow): void {
  if (!row.qualityCourseGoalId) {
    row.goalCode = undefined
    row.goalName = undefined
    row.goalThresholdValue = undefined
    row.weightedScoreContribution = undefined
    return
  }
  const goal = goalIndex.value.get(row.qualityCourseGoalId)
  if (!goal) {
    return
  }
  row.goalCode = goal.goalCode
  row.goalName = goal.goalName
  row.goalThresholdValue = goal.thresholdValue
}

function syncWeightedContribution(row: MappingEditableRow): void {
  const fullScore = row.questionFullScore
  const weight = row.weight
  if (fullScore == null || weight == null || fullScore <= 0) {
    row.weightedScoreContribution = undefined
    return
  }
  row.weightedScoreContribution = Number((fullScore * weight).toFixed(4))
}

function handleGoalChange(row: MappingEditableRow): void {
  syncGoalMeta(row)
  syncWeightedContribution(row)
}

function handleWeightChange(row: MappingEditableRow): void {
  syncWeightedContribution(row)
}

async function loadData() {
  if (!props.examId) {
    workspace.value = null
    rows.value = []
    return
  }
  loading.value = true
  try {
    const result = await loadExamQuestionCourseGoalMappingWorkspace(props.examId)
    workspace.value = result
    rows.value = toEditableRows(result.rows ?? [])
  } catch (error) {
    workspace.value = null
    rows.value = []
    showUserError(error, '加载试题-课程目标映射失败')
  } finally {
    loading.value = false
  }
}

async function saveRow(row: MappingEditableRow) {
  if (row.saving || row.deleting) return
  if (!props.examId || !row.qualityCourseGoalId) {
    showFormValidationMessage('请选择课程目标')
    return
  }
  row.saving = true
  try {
    row.mappingId = await saveExamQuestionCourseGoalMapping({
      id: row.mappingId,
      examId: props.examId,
      layoutQuestionId: row.layoutQuestionId,
      qualityCourseGoalId: row.qualityCourseGoalId,
      weight: row.weight ?? 1,
    })
    row.mappingStatus = ExamQuestionCourseGoalMappingStatusCode.MAPPED
    message.success('映射已保存')
    emit('changed')
    await loadData()
  } catch (error) {
    showUserError(error, '保存映射失败')
  } finally {
    row.saving = false
  }
}

async function deleteRow(row: MappingEditableRow) {
  if (row.saving || row.deleting) return
  if (!row.mappingId) return
  const confirmed = await confirmAsync({
    title: '清除映射',
    content: `确认清除第 ${row.questionNo} 题的课程目标映射？`,
  })
  if (!confirmed) return
  row.deleting = true
  try {
    await deleteExamQuestionCourseGoalMapping({ id: row.mappingId })
    message.success('映射已清除')
    emit('changed')
    await loadData()
  } catch (error) {
    showUserError(error, '清除映射失败')
  } finally {
    row.deleting = false
  }
}

function handleMappingRowAction(key: string, row: MappingEditableRow) {
  if (key === 'save') void saveRow(row)
  else if (key === 'clear') void deleteRow(row)
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    loadData()
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.exam-goal-mapping-card {
  padding: var(--dp-space-3, 12px);
  background: var(--dp-bg-container);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
}
.exam-goal-mapping-card--section {
  padding: 0;
  border: none;
  background: transparent;
}
.exam-goal-mapping-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.exam-goal-mapping-card__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}
.exam-goal-mapping-card__desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
  line-height: 1.5;
}
</style>
