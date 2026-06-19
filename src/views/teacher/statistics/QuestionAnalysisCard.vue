<template>
  <UiCard class="stats-card" compact>
    <template #title>题目质量分析</template>
    <template #extra>
      <a-space>
        <a-select
          v-model:value="selectedQuestionTemplateId"
          placeholder="选择题目"
          class="stats-card__select stats-card__select--question"
          :options="questionOptions"
          :loading="questionLoading"
          show-search
          option-filter-prop="label"
          allow-clear
          @change="reload"
        />
        <UiButton variant="outline" size="sm" :loading="generatingAll" @click="handleGenerateAll">
          全量生成
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </UiButton>
      </a-space>
    </template>

    <div class="question-analysis-card">
      <!-- D-5 难度-区分度散点图：仅在有分析数据时显示 -->
      <div v-if="questionQualityScatterSeries.length > 0" class="question-analysis-card__chart-wrap">
        <div class="question-analysis-card__chart-meta">
          <strong>难度-区分度分布</strong>
          <span class="question-analysis-card__chart-hint">
            理想区间：难度 0.3-0.8 且 区分度 ≥ 0.4；点击图例可隐藏对应区段。
          </span>
        </div>
        <UiScatterChart
          class="question-analysis-card__chart"
          :series="questionQualityScatterSeries"
          x-label="难度系数"
          y-label="区分度"
          show-ideal-zone
          aria-label="题目难度区分度散点图"
        />
      </div>

      <div v-if="correctRatioBarItems.length" class="question-analysis-card__chart-wrap">
        <div class="question-analysis-card__chart-meta">
          <strong>各题正确率</strong>
          <span class="question-analysis-card__chart-hint">按题号展示已批阅学生的正确率</span>
        </div>
        <UiBarChart
          class="question-analysis-card__chart"
          :items="correctRatioBarItems"
          orientation="vertical"
          :max-value="100"
        />
      </div>

      <AiGenerationProgressPanel
        v-if="generatingAll || generatingId"
        title="题目质量分析生成中"
        :waiting-text="generatingAll ? '正在等待后端返回全部题目的真实质量分析。' : '正在等待后端返回当前题目的真实质量分析。'"
      />

      <a-typography-paragraph v-if="generationSummary" class="question-analysis-card__generation-summary">
        {{ generationSummary }}
      </a-typography-paragraph>

      <!-- D-9 错误态：题目质量分析加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="题目质量分析加载失败"
        compact
        @retry="reload"
      />
      <UiDataTable
        class="student-detail-table__data-table"
        v-else
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="id"
        size="small"
        :page-size="20"
        :total="rows.length"
        flat
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'question'">
            <div class="question-analysis-card__question-cell">
              <div class="question-analysis-card__question-title">
                题{{ rows[index].questionNo }} · {{ questionTypeLabel(rows[index].questionType) }} ·
                {{ fmtNum(rows[index].fullScore) }} 分
              </div>
              <div v-if="rows[index].questionStem" class="question-analysis-card__question-stem">
                {{
                  rows[index].questionStem.length > 36
                    ? `${rows[index].questionStem.slice(0, 36)}...`
                    : rows[index].questionStem
                }}
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'difficultyIndex'">
            {{ fmtNum(rows[index].difficultyIndex) }}
          </template>
          <template v-else-if="column.key === 'discriminationIndex'">
            {{ fmtNum(rows[index].discriminationIndex) }}
          </template>
          <template v-else-if="column.key === 'avgScore'">
            {{ fmtNum(rows[index].avgScore) }} / {{ fmtNum(rows[index].fullScore) }}
          </template>
          <template v-else-if="column.key === 'correctRatio'">
            <a-typography-text :type="getCorrectRatioType(rows[index])">
              {{ correctRatio(rows[index]) }}
            </a-typography-text>
          </template>
          <template v-else-if="column.key === 'snapshotTime'">
            {{ formatDateTime(rows[index].snapshotTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction @click="handleGenerateOne(rows[index].questionTemplateId)">重新生成</UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </div>
  </UiCard>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamQuestionTemplateVO } from '@/apis/mark/exam'
import type { ExamQuestionAnalysisRecordVO } from '@/apis/mark/question-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { getExamTemplate } from '@/apis/mark/exam'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/grading-experience'
import {
  generateAllQuestionAnalysis,
  generateQuestionAnalysis,
  listQuestionAnalysis,
} from '@/apis/mark/question-analysis'
import { UiBarChart, UiButton, UiCard, UiDataTable, UiErrorRetryPanel, UiScatterChart, UiTextAction } from '@/components/ui-guide/ui'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  buildQuestionQualityScatterSeries,
  correctRatioToBarItems,
} from '@/utils/mark-statistics-chart'
import { strictEnumLabel } from '@/utils/strict-enum'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'

defineOptions({ name: 'QuestionAnalysisCard' })

const props = defineProps<{ examId: string, reloadToken: number, classId?: string }>()

const emit = defineEmits<{ (e: 'generated'): void }>()

const rows = ref<ExamQuestionAnalysisRecordVO[]>([])
const loading = ref(false)
// D-9 错误态：题目质量分析加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
const generatingAll = ref(false)
const generatingId = ref<string>('')
const selectedQuestionTemplateId = ref<string>()
const questionLoading = ref(false)
const questionOptions = ref<{ value: string, label: string }[]>([])
const generationSummary = ref('')

const columns: ColumnType<ExamQuestionAnalysisRecordVO>[] = [
  { title: '题目', key: 'question', width: 260 },
  { title: '总人数', dataIndex: 'totalCount', key: 'totalCount', width: 90 },
  { title: '正确率', key: 'correctRatio', width: 110 },
  { title: '需复核', dataIndex: 'needReviewCount', key: 'needReviewCount', width: 90 },
  { title: '难度系数', key: 'difficultyIndex', width: 110 },
  { title: '区分度', key: 'discriminationIndex', width: 100 },
  { title: '平均分/满分', key: 'avgScore', width: 140 },
  { title: '快照时间', key: 'snapshotTime', width: 160 },
  { title: '操作', key: 'actions', width: 110, fixed: 'right' },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    const records = await listQuestionAnalysis({
      examId: props.examId,
      questionTemplateId: selectedQuestionTemplateId.value,
      classId: props.classId || undefined,
    })
    rows.value = acceptQuestionAnalysisRows(records)
  } catch (e) {
    rows.value = []
    loadError.value = toUserError(e, '题目质量分析加载失败')
    showUserError(e, '题目质量分析加载失败')
  } finally {
    loading.value = false
  }
}

async function loadQuestionOptions(): Promise<void> {
  if (!props.examId) {
    questionOptions.value = []
    return
  }
  questionLoading.value = true
  try {
    const template = await getExamTemplate(props.examId)
    questionOptions.value = template.questions.map((question: ExamQuestionTemplateVO) => ({
      value: question.questionTemplateId,
      label: `题${question.questionNo} · ${question.questionType} · ${question.fullScore}分${
        question.questionStem
          ? ` · ${
              question.questionStem.length > 24
                ? `${question.questionStem.slice(0, 24)}...`
                : question.questionStem
            }`
          : ''
      }`,
    }))
  } catch (e) {
    questionOptions.value = []
    showUserError(e, '题目列表加载失败')
  } finally {
    questionLoading.value = false
  }
}

async function handleGenerateAll(): Promise<void> {
  generationSummary.value = ''
  generatingAll.value = true
  try {
    const records = await generateAllQuestionAnalysis(props.examId, props.classId || undefined)
    rows.value = acceptQuestionAnalysisRows(records)
    generationSummary.value = `已生成 ${rows.value.length} 道题目质量分析，可查看难度、区分度与正确率。`
    message.success('已生成全部题目质量分析')
    emit('generated')
  } catch (e) {
    showUserError(e, '全部题目质量分析生成失败')
  } finally {
    generatingAll.value = false
  }
}

async function handleGenerateOne(questionTemplateId: string): Promise<void> {
  generationSummary.value = ''
  generatingId.value = questionTemplateId
  try {
    await generateQuestionAnalysis({
      examId: props.examId,
      questionTemplateId,
      classId: props.classId || undefined,
    })
    message.success('已重新生成')
    await reload()
    const matched = rows.value.find((item) => item.questionTemplateId === questionTemplateId)
    generationSummary.value = matched
      ? `已生成题 ${matched.questionNo} 的质量分析，可查看难度、区分度与正确率。`
      : '已生成该题质量分析，可查看难度、区分度与正确率。'
    emit('generated')
  } catch (e) {
    showUserError(e, '题目质量分析重新生成失败')
  } finally {
    generatingId.value = ''
  }
}

function acceptQuestionAnalysisRows(
  records: ExamQuestionAnalysisRecordVO[],
): ExamQuestionAnalysisRecordVO[] {
  const expectedScopeType = props.classId ? 'CLASS' : 'EXAM'
  const invalidRecord = records.find((record) => {
    if (record.scopeType !== expectedScopeType) return true
    if (expectedScopeType === 'CLASS') return record.scopeId !== props.classId
    return record.scopeId != null
  })
  if (invalidRecord) {
    throw new Error('题目质量分析范围与当前筛选不一致')
  }
  return records
}

function fmtNum(v?: number): string {
  if (v == null) return '-'
  return Number(v).toFixed(2)
}

function correctRatio(r: ExamQuestionAnalysisRecordVO): string {
  const total = r.totalCount
  if (total <= 0) return '-'
  const ratio = (r.correctCount / total) * 100
  return `${ratio.toFixed(1)}%`
}

function getCorrectRatioType(r: ExamQuestionAnalysisRecordVO): 'danger' | 'warning' | undefined {
  const total = r.totalCount
  if (total <= 0) return undefined
  const ratio = r.correctCount / total
  if (ratio < 0.4) return 'danger'
  if (ratio < 0.6) return 'warning'
  return undefined
}

function questionTypeLabel(questionType: ExamQuestionAnalysisRecordVO['questionType']): string {
  return strictEnumLabel(QUESTION_TYPE_LABEL, questionType, '题型')
}

const questionQualityScatterSeries = computed(() => buildQuestionQualityScatterSeries(rows.value))
const correctRatioBarItems = computed(() => correctRatioToBarItems(rows.value))

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    if (props.examId) {
      void loadQuestionOptions()
      void reload()
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.question-analysis-card {
  &__question-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }

  &__question-title {
    font-weight: var(--dp-font-weight-emphasis, 500);
  }

  &__question-stem {
    font-size: 12px;
    color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
  }

  &__generation-summary {
    margin: 0;
    color: var(--dp-text-secondary, rgba(0, 0, 0, 0.75));
  }
}
</style>
