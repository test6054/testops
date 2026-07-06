<template>
  <component :is="embedded ? AiAnalysisSection : 'article'" v-bind="shellProps">
    <template v-if="embedded" #actions>
      <UiButton size="sm" variant="outline" :loading="loading" @click="loadData">刷新</UiButton>
    </template>

    <header v-if="!embedded" class="exam-goal-mapping-card__header">
      <div>
        <h4 class="exam-goal-mapping-card__title">试题-课程目标映射</h4>
        <p class="exam-goal-mapping-card__desc">
          维护本场考试各题与质量评价课程目标的支撑关系，供归档卷生成课程目标达成报告。
        </p>
      </div>
      <UiButton size="sm" variant="outline" :loading="loading" @click="loadData">刷新</UiButton>
    </header>

    <p v-else class="exam-goal-mapping-card__desc exam-goal-mapping-card__desc--embedded">
      维护各题与质量评价课程目标的支撑关系，供归档卷生成课程目标达成报告。
    </p>

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
          <UiTextAction tone="primary" :loading="record.saving" @click="saveRow(record)">
            保存
          </UiTextAction>
          <UiTextAction
            v-if="record.mappingId"
            tone="danger"
            :loading="record.deleting"
            @click="deleteRow(record)"
          >
            清除
          </UiTextAction>
        </template>
      </template>
    </UiDataTable>
  </component>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ExamQuestionCourseGoalMappingVO,
  QualityCourseGoalForMarkVO,
} from '@/apis/mark/exam-question-course-goal-mapping'
import type { ExamQuestionAnalysisRecordVO } from '@/apis/mark/question-analysis'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import {
  deleteExamQuestionCourseGoalMapping,
  listExamCourseGoalsForMapping,
  listExamQuestionCourseGoalMappings,
  saveExamQuestionCourseGoalMapping,
} from '@/apis/mark/exam-question-course-goal-mapping'
import { fetchAllQuestionAnalysisRows } from '@/apis/mark/question-analysis'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'

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

const shellProps = computed(() =>
  props.embedded
    ? { title: '试题-课程目标映射', context: props.examLabel, class: 'exam-goal-mapping-card exam-goal-mapping-card--section' }
    : { class: 'exam-goal-mapping-card' },
)

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

const loading = ref(false)
const courseGoals = ref<QualityCourseGoalForMarkVO[]>([])
const mappings = ref<ExamQuestionCourseGoalMappingVO[]>([])
const questions = ref<ExamQuestionAnalysisRecordVO[]>([])
const rows = ref<MappingRow[]>([])

const goalOptions = computed(() =>
  courseGoals.value.map(goal => ({
    value: goal.goalId,
    label: `${goal.goalCode} ${goal.goalName}`,
  })),
)

const columns: ColumnsType<MappingRow> = [
  { title: '题号', dataIndex: 'questionNo', width: 88 },
  { title: '满分', dataIndex: 'fullScore', width: 72 },
  { title: '课程目标', key: 'goal', width: 220 },
  { title: '权重', key: 'weight', width: 120 },
  { title: '操作', key: 'actions', width: 120 },
]

function buildRows() {
  const mappingByQuestion = new Map<string, ExamQuestionCourseGoalMappingVO>()
  for (const item of mappings.value) {
    mappingByQuestion.set(item.layoutQuestionId, item)
  }
  rows.value = questions.value.map((question) => {
    const mapped = mappingByQuestion.get(question.layoutQuestionId)
    return {
      layoutQuestionId: question.layoutQuestionId,
      questionNo: question.questionNo,
      fullScore: question.fullScore,
      mappingId: mapped?.id,
      qualityCourseGoalId: mapped?.qualityCourseGoalId,
      weight: mapped?.weight ?? 1,
      saving: false,
      deleting: false,
    }
  })
}

async function loadData() {
  if (!props.examId) {
    courseGoals.value = []
    mappings.value = []
    questions.value = []
    rows.value = []
    return
  }
  loading.value = true
  try {
    const [goalList, mappingList, questionList] = await Promise.all([
      listExamCourseGoalsForMapping(props.examId),
      listExamQuestionCourseGoalMappings(props.examId),
      fetchAllQuestionAnalysisRows({ examId: props.examId }),
    ])
    courseGoals.value = goalList
    mappings.value = mappingList
    questions.value = questionList
    buildRows()
  } catch (error) {
    showUserError(error, '加载试题-课程目标映射失败')
  } finally {
    loading.value = false
  }
}

async function saveRow(row: MappingRow) {
  if (!props.examId || !row.qualityCourseGoalId) {
    message.warning('请选择课程目标')
    return
  }
  row.saving = true
  try {
    row.mappingId = await saveExamQuestionCourseGoalMapping({
      id: row.mappingId,
      examId: props.examId,
      layoutQuestionId: row.layoutQuestionId,
      qualityCourseGoalId: row.qualityCourseGoalId,
      weight: row.weight,
    })
    message.success('映射已保存')
    await loadData()
  } catch (error) {
    showUserError(error, '保存映射失败')
  } finally {
    row.saving = false
  }
}

async function deleteRow(row: MappingRow) {
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
    await loadData()
  } catch (error) {
    showUserError(error, '清除映射失败')
  } finally {
    row.deleting = false
  }
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
  padding: 16px;
  background: var(--ant-color-bg-container);
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
.exam-goal-mapping-card__desc--embedded {
  margin-top: 0;
}
.exam-goal-mapping-card__select {
  width: 100%;
}
.exam-goal-mapping-card__weight {
  width: 100%;
}
</style>
