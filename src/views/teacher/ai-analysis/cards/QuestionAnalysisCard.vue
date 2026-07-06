<template>
  <component :is="embedded ? AiAnalysisSection : WorkbenchSurfaceCard" v-bind="shellProps">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">题目质量分析</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <a-space>
        <a-select
          v-model:value="selectedLayoutQuestionId"
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

    <template v-if="embedded" #actions>
      <a-select
        v-model:value="selectedLayoutQuestionId"
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
        刷新
      </UiButton>
    </template>

    <div class="question-analysis-card" :class="{ 'question-analysis-card--embedded': embedded }">
      <MarkScatterSection
        ref="scatterSectionRef"
        title="难度-区分度分布"
        :hint="scatterChartHint"
        :point-count="scatterPointCount"
        :option="scatterChartOption"
        height="300px"
        :aria-label="scatterChartAriaLabel"
        :visible="!chartLoading"
        class="question-analysis-card__chart"
        @brush-selected="handleScatterBrushSelected"
      />

      <section
        v-if="brushSelectedRows.length > 0"
        class="question-analysis-card__brush-list"
      >
        <header class="question-analysis-card__brush-head">
          <strong>框选区域题目（{{ brushSelectedRows.length }}）</strong>
          <UiTextAction @click="clearBrushSelection">清除选区</UiTextAction>
        </header>
        <ul class="question-analysis-card__brush-items">
          <li
            v-for="item in brushSelectedRows"
            :key="item.layoutQuestionId"
            class="question-analysis-card__brush-item"
          >
            <span>题{{ item.questionNo }} · {{ questionTypeLabel(item.questionType) }}</span>
            <span class="question-analysis-card__brush-meta">
              难度 {{ fmtNum(item.difficultyIndex) }} · 区分度 {{ fmtNum(item.discriminationIndex) }}
            </span>
          </li>
        </ul>
      </section>

      <MarkBarSection
        title="各题正确率"
        :hint="correctRatioChartHint"
        :item-count="correctRatioBarItems.length"
        :option="correctRatioChartOption"
        height="300px"
        :aria-label="correctRatioChartAriaLabel"
        :visible="!chartLoading"
        class="question-analysis-card__chart"
      />

      <AiGenerationProgressPanel
        v-if="generatingAll || generatingId"
        title="题目质量分析生成中"
        :waiting-text="generatingAll ? '正在等待后端返回全部题目的真实质量分析。' : '正在等待后端返回当前题目的真实质量分析。'"
      />

      <a-typography-paragraph v-if="generationSummary" class="question-analysis-card__generation-summary">
        {{ generationSummary }}
      </a-typography-paragraph>

      <UiDataTable
        class="student-detail-table__data-table"
        :columns="columns"
        :data-source="tableRows"
        :loading="tableLoading"
        row-key="id"
        size="small"
        pagination-mode="server"
        v-model:current="tablePageNum"
        v-model:page-size="tablePageSize"
        :total="tableTotal"
        :empty-kind="tableEmptyKind"
        :empty-description="tableEmptyDescription"
        flat
        @page-change="handleTablePageChange"
      >
        <template #empty-action>
          <UiButton
            v-if="tableEmptyKind === 'first-run'"
            variant="outline"
            size="sm"
            :loading="generatingAll"
            @click="handleGenerateAll"
          >
            全量生成
          </UiButton>
          <UiButton
            v-else-if="tableEmptyKind === 'no-result'"
            variant="outline"
            size="sm"
            @click="clearQuestionFilter"
          >
            清除题目筛选
          </UiButton>
        </template>
        <template #bodyCell="{ column, record: item }">
          <template v-if="column.key === 'question'">
            <div class="question-analysis-card__question-cell">
              <div class="question-analysis-card__question-title">
                题{{ item.questionNo }} · {{ questionTypeLabel(item.questionType) }} ·
                {{ fmtNum(item.fullScore) }} 分
              </div>
              <div v-if="item.questionStem" class="question-analysis-card__question-stem">
                {{ formatQuestionStemPreview(item.questionStem) }}
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'difficultyIndex'">
            {{ fmtNum(item.difficultyIndex) }}
          </template>
          <template v-else-if="column.key === 'discriminationIndex'">
            {{ fmtNum(item.discriminationIndex) }}
          </template>
          <template v-else-if="column.key === 'avgScore'">
            {{ fmtNum(item.avgScore) }} / {{ fmtNum(item.fullScore) }}
          </template>
          <template v-else-if="column.key === 'correctRatio'">
            <a-typography-text :type="getCorrectRatioType(item)">
              {{ correctRatio(item) }}
            </a-typography-text>
          </template>
          <template v-else-if="column.key === 'snapshotTime'">
            {{ formatDateTime(item.snapshotTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction @click="handleGenerateOne(item.layoutQuestionId)">重新生成</UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </div>
  </component>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamLayoutQuestionViewResponse } from '@/apis/mark/exam-layout-question'
import type { ExamQuestionAnalysisRecordVO, QuestionAnalysisListQueryRequest } from '@/apis/mark/question-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import { fetchAllQuestionAnalysisRows, generateAllQuestionAnalysis, generateQuestionAnalysis, pageQuestionAnalysis } from '@/apis/mark/question-analysis'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkScatterSection from '@/components/chart/MarkScatterSection.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { buildNumericColumn } from '@/components/ui-guide/ui/data-table'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  buildBarChartInsight,
  buildScatterChartInsight,
  mergeChartHint,
} from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption, buildScatterChartOption } from '@/utils/mark-echarts-options'
import {
  buildQuestionQualityScatterSeries,
  correctRatioToBarItems,
} from '@/utils/mark-statistics-chart'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'

defineOptions({ name: 'QuestionAnalysisCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    reloadToken: number
    classId?: string
    examLabel?: string
    embedded?: boolean
  }>(),
  { embedded: false },
)

const emit = defineEmits<{ (e: 'generated'): void }>()

const shellProps = computed(() =>
  props.embedded
    ? { title: '题目质量分析', context: props.examLabel }
    : { class: 'stats-card' },
)

const chartRows = ref<ExamQuestionAnalysisRecordVO[]>([])
const tableRows = ref<ExamQuestionAnalysisRecordVO[]>([])
const chartLoading = ref(false)
const tableLoading = ref(false)
const loading = computed(() => chartLoading.value || tableLoading.value)
const generatingAll = ref(false)
const generatingId = ref<string>('')
const selectedLayoutQuestionId = ref<string>()
const questionLoading = ref(false)
const questionOptions = ref<{ value: string, label: string }[]>([])
const generationSummary = ref('')
const tablePageNum = ref(1)
const tablePageSize = ref(20)
const tableTotal = ref(0)
const brushSelectedRows = ref<ExamQuestionAnalysisRecordVO[]>([])
const scatterSectionRef = ref<InstanceType<typeof MarkScatterSection> | null>(null)

interface ScatterBrushSelectedBatch {
  selected?: Array<{
    seriesIndex?: number
    dataIndex?: number[]
  }>
}

interface ScatterBrushSelectedEvent {
  batch?: ScatterBrushSelectedBatch[]
}

const tableEmptyKind = computed(() => {
  return selectedLayoutQuestionId.value ? 'no-result' : 'first-run'
})

const tableEmptyDescription = computed(() => {
  if (selectedLayoutQuestionId.value) {
    return '当前筛选题目暂无质量分析记录，可清除筛选或重新生成。'
  }
  return '尚未生成题目质量分析时，可一键产出全卷难度、区分度与正确率。'
})

function clearQuestionFilter(): void {
  selectedLayoutQuestionId.value = undefined
  void reload()
}

const columns: ColumnType<ExamQuestionAnalysisRecordVO>[] = [
  { title: '题目', key: 'question', width: 260 },
  buildNumericColumn({ title: '总人数', dataIndex: 'totalCount', key: 'totalCount', width: 90 }),
  { title: '正确率', key: 'correctRatio', width: 110, align: 'right' },
  buildNumericColumn({ title: '需复核', dataIndex: 'needReviewCount', key: 'needReviewCount', width: 90 }),
  buildNumericColumn({ title: '难度系数', key: 'difficultyIndex', width: 110 }),
  buildNumericColumn({ title: '区分度', key: 'discriminationIndex', width: 100 }),
  { title: '平均分/满分', key: 'avgScore', width: 140, align: 'right' },
  { title: '快照时间', key: 'snapshotTime', width: 160 },
  { title: '操作', key: 'actions', width: 110, fixed: 'right' },
]

function buildListQueryBase(): Omit<QuestionAnalysisListQueryRequest, 'pageNum' | 'pageSize'> {
  return {
    examId: props.examId,
    layoutQuestionId: selectedLayoutQuestionId.value,
    classId: props.classId || undefined,
  }
}

async function loadChartRows(): Promise<void> {
  if (!props.examId) {
    chartRows.value = []
    brushSelectedRows.value = []
    return
  }
  chartLoading.value = true
  try {
    const records = await fetchAllQuestionAnalysisRows(buildListQueryBase())
    chartRows.value = acceptQuestionAnalysisRows(records)
  } catch (e) {
    chartRows.value = []
    brushSelectedRows.value = []
    showUserError(e, '题目质量分析图表加载失败')
  } finally {
    chartLoading.value = false
  }
}

async function loadTablePage(pageNum = tablePageNum.value, pageSize = tablePageSize.value): Promise<void> {
  if (!props.examId) {
    tableRows.value = []
    tableTotal.value = 0
    return
  }
  tableLoading.value = true
  try {
    const page = await pageQuestionAnalysis({
      ...buildListQueryBase(),
      pageNum,
      pageSize,
    })
    tableRows.value = acceptQuestionAnalysisRows(
      readPageList(page, '题目质量分析列表加载失败'),
    )
    tableTotal.value = readPageTotal(page, '题目质量分析列表加载失败')
    tablePageNum.value = page.pageNum
    tablePageSize.value = page.pageSize
  } catch (e) {
    tableRows.value = []
    tableTotal.value = 0
    showUserError(e, '题目质量分析列表加载失败')
  } finally {
    tableLoading.value = false
  }
}

async function reload(): Promise<void> {
  if (!props.examId) return
  tablePageNum.value = 1
  await Promise.all([loadChartRows(), loadTablePage(1, tablePageSize.value)])
}

function handleTablePageChange(event: { current: number, pageSize: number }): void {
  void loadTablePage(event.current, event.pageSize)
}

async function loadQuestionOptions(): Promise<void> {
  if (!props.examId) {
    questionOptions.value = []
    return
  }
  questionLoading.value = true
  try {
    const template = await getExamLayoutQuestionSummary(props.examId)
    if (!template.configured) {
      questionOptions.value = []
      return
    }
    questionOptions.value = template.questions.map((question: ExamLayoutQuestionViewResponse) => ({
      value: question.layoutQuestionId,
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
    await generateAllQuestionAnalysis({
      examId: props.examId,
      classId: props.classId || undefined,
    })
    await reload()
    generationSummary.value = `已生成 ${chartRows.value.length} 道题目质量分析，可查看难度、区分度与正确率。`
    message.success('已生成全部题目质量分析')
    emit('generated')
  } catch (e) {
    showUserError(e, '全部题目质量分析生成失败')
  } finally {
    generatingAll.value = false
  }
}

async function handleGenerateOne(layoutQuestionId: string): Promise<void> {
  generationSummary.value = ''
  generatingId.value = layoutQuestionId
  try {
    await generateQuestionAnalysis({
      examId: props.examId,
      layoutQuestionId,
      classId: props.classId || undefined,
    })
    message.success('已重新生成')
    await reload()
    const matched = tableRows.value.find((item) => item.layoutQuestionId === layoutQuestionId)
      ?? chartRows.value.find((item) => item.layoutQuestionId === layoutQuestionId)
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
    throw toUserError(null, '题目质量分析范围与当前筛选不一致')
  }
  return records
}

function fmtNum(v?: number): string {
  if (v == null) return '-'
  return Number(v).toFixed(2)
}

/** 表格题干预览：超长截断，空值由调用方 v-if 控制不展示。 */
function formatQuestionStemPreview(stem: string): string {
  return stem.length > 36 ? `${stem.slice(0, 36)}...` : stem
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
  return strictEnumLabel(QuestionTypeDescription, questionType, '题型')
}

const questionQualityScatterSeries = computed(() => buildQuestionQualityScatterSeries(chartRows.value))
const scatterPointCount = computed(() =>
  questionQualityScatterSeries.value.reduce((sum, series) => sum + series.points.length, 0),
)
const correctRatioBarItems = computed(() => correctRatioToBarItems(chartRows.value))

const scatterChartHint = computed(() => mergeChartHint(
  '理想区间：难度 0.3-0.8 且 区分度 ≥ 0.4；可使用右上角工具框选题目查看清单。',
  buildScatterChartInsight(questionQualityScatterSeries.value),
))

const correctRatioChartHint = computed(() => mergeChartHint(
  '按题号展示已批阅学生的正确率',
  buildBarChartInsight(correctRatioBarItems.value, { passLine: 60, passLineLabel: '及格线' }),
))

const { chartOption: scatterChartOption } = useChartOption(() =>
  buildScatterChartOption(questionQualityScatterSeries.value, {
    xLabel: '难度系数',
    yLabel: '区分度',
    showIdealZone: true,
    brush: true,
    emptyText: '暂无难度-区分度数据',
  }),
)

function handleScatterBrushSelected(params: unknown): void {
  const payload = params as ScatterBrushSelectedEvent
  const selected = payload.batch?.[0]?.selected ?? []
  const hasSelection = selected.some(item => (item.dataIndex?.length ?? 0) > 0)
  if (!hasSelection) {
    brushSelectedRows.value = []
    return
  }
  const visibleSeries = questionQualityScatterSeries.value.filter(series => series.points.length > 0)
  const selectedQuestionIds = new Set<string>()
  for (const item of selected) {
    const series = visibleSeries[item.seriesIndex ?? -1]
    if (!series) continue
    for (const dataIndex of item.dataIndex ?? []) {
      const point = series.points[dataIndex]
      if (point?.key) {
        selectedQuestionIds.add(point.key)
      }
    }
  }
  brushSelectedRows.value = chartRows.value.filter(row => selectedQuestionIds.has(row.layoutQuestionId))
}

function clearBrushSelection(): void {
  brushSelectedRows.value = []
  scatterSectionRef.value?.clearBrush()
}

const { chartOption: correctRatioChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(correctRatioBarItems.value, {
    orientation: 'vertical',
    maxValue: 100,
    yAxisName: '正确率 %',
    unit: '%',
    dataZoom: true,
    emptyText: '暂无各题正确率数据',
  }),
)

const scatterChartAriaLabel = computed(() => {
  const totalPoints = questionQualityScatterSeries.value.reduce(
    (sum, series) => sum + series.points.length,
    0,
  )
  if (totalPoints <= 0) {
    return '难度区分度分布，暂无数据'
  }
  return `难度区分度分布，共 ${totalPoints} 道题目`
})

const correctRatioChartAriaLabel = computed(() => {
  const count = correctRatioBarItems.value.length
  if (count <= 0) {
    return '各题正确率，暂无数据'
  }
  return `各题正确率，共 ${count} 道题`
})

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

  &__brush-list {
    margin-top: var(--dp-space-3, 12px);
    padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--dp-surface-subtle, #f8fafc);
  }

  &__brush-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-3, 12px);
    margin-bottom: var(--dp-space-2, 8px);
    font-size: 14px;
  }

  &__brush-items {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-2, 8px);
  }

  &__brush-item {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--dp-space-3, 12px);
    font-size: 13px;
  }

  &__brush-meta {
    color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
    white-space: nowrap;
  }
}
</style>
