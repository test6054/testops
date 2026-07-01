<template>
  <div class="progress-page">
    <div class="progress-page__toolbar">
      <UiTag :tone="confirmedPercent >= 100 ? 'green' : 'blue'" size="sm">
        已确认 {{ confirmedPercent }}%
      </UiTag>
      <UiButton variant="outline" size="sm" :loading="loading" @click="loadAll">
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </div>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 4 }" />

    <UiEmpty v-else-if="!progress" description="暂无数据" class="progress-page__empty" />

    <template v-else-if="progress">
      <a-row :gutter="16" class="overview-row">
        <a-col :xs="24" :md="8">
          <UiCard class="overview-card">
            <template #title>
              <DashboardOutlined />
              <span>教师复核进度</span>
            </template>
            <div class="overview-card__body">
              <div class="overview-card__ring-block">
                <MarkGaugeBlock v-bind="confirmedGaugeBlockProps">
                  <div class="mark-gauge-block__formula">
                    <strong>{{ progress.confirmedQuestionGradeCount }}</strong>
                    <span class="muted"> / {{ progress.totalQuestionGradeCount }} 题次 </span>
                  </div>
                  <p v-if="progress.totalQuestionGradeCount <= 0" class="mark-gauge-block__hint">
                    暂无应复核题次
                  </p>
                </MarkGaugeBlock>
              </div>
              <SignalBand :metrics="overviewSignalMetrics" compact variant="inline" />
            </div>
          </UiCard>
        </a-col>
        <a-col :xs="24" :md="16">
          <UiCard class="status-card">
            <template #title>
              <PieChartOutlined />
              <span>复核任务状态分布</span>
            </template>
            <div class="status-card__body">
              <MarkDistributionSection
                title="复核任务状态分布"
                :hint="statusDistributionHint"
                :total="totalTaskCount"
                :option="statusDistributionOption"
                :aria-label="statusDistributionAriaLabel"
              />
              <SignalBand :metrics="statusSignalMetrics" compact variant="inline" />
              <SignalBand
                :metrics="auxSignalMetrics"
                compact
                variant="inline"
                class="status-card__aux"
              />
            </div>
          </UiCard>
        </a-col>
      </a-row>

      <UiCard class="question-card">
        <template #title>
          <TableOutlined />
          <span>按题目维度的复核进度</span>
        </template>

        <MarkHeatmapSection
          v-if="questionHeatmapCells.length"
          title="题号确认率热力图"
          :hint="questionHeatmapHint"
          :cell-count="questionHeatmapCells.length"
          :option="questionHeatmapOption"
          :height="questionHeatmapHeight"
          :aria-label="questionHeatmapAriaLabel"
          class="progress-page__heatmap"
          @cell-click="handleHeatmapCellClick"
        />

        <MarkBarSection
          title="按题号已通过任务数"
          :hint="reviewProgressBarHint"
          :item-count="reviewProgressBarItems.length"
          :option="reviewProgressChartOption"
          height="300px"
          :aria-label="reviewProgressChartAriaLabel"
          class="progress-page__chart"
        />

        <UiDataTable
          pagination-mode="none"
          :columns="questionColumns"
          :data-source="questionRows"
          :loading="loading"
          :show-pagination="false"
          flat
          :total="questionRows.length"
          row-key="questionTemplateId"
          size="middle"
          class="question-table student-detail-table__data-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'questionNo'">
              <div
                class="question-cell"
                :class="{
                  'question-cell--highlight': highlightedQuestionId === record.questionTemplateId,
                }"
              >
                <UiTag tone="blue" size="sm">题{{ record.questionNo }}</UiTag>
                <span class="question-type">{{ questionTypeLabel(record.questionType) }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'progress'">
              <a-progress
                :percent="
                  record.totalTaskCount === 0
                    ? 0
                    : Math.round((record.approvedTaskCount * 100) / record.totalTaskCount)
                "
                size="small"
                :stroke-color="
                  record.totalTaskCount > 0 && record.approvedTaskCount >= record.totalTaskCount
                    ? successColor
                    : primaryColor
                "
              />
              <div class="progress-detail">
                {{ record.approvedTaskCount }} / {{ record.totalTaskCount }} 已通过
              </div>
            </template>
            <template v-else-if="column.key === 'pending'">
              <UiTag v-if="record.pendingTaskCount > 0" tone="orange" size="sm">
                {{ record.pendingTaskCount }}
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
            <template v-else-if="column.key === 'inProgress'">
              <UiTag v-if="record.inProgressTaskCount > 0" tone="blue" size="sm">
                {{ record.inProgressTaskCount }}
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
            <template v-else-if="column.key === 'rejected'">
              <UiTag v-if="record.rejectedTaskCount > 0" tone="red" size="sm">
                {{ record.rejectedTaskCount }}
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard class="processing-card">
        <template #title>
          <RobotOutlined />
          <span>批改处理任务</span>
        </template>
        <template #extra>
          <a-select
            v-model:value="processingTaskTypeFilter"
            allow-clear
            placeholder="任务类型"
            size="small"
            style="width: 160px"
            :options="processingTaskTypeOptions"
            @change="reloadProcessingTasks"
          />
        </template>
        <UiDataTable
          pagination-mode="server"
          :columns="processingTaskColumns"
          :data-source="processingTasks"
          :loading="processingTasksLoading"
          :total="processingTaskTotal"
          :page-num="processingTaskPageNum"
          :page-size="processingTaskPageSize"
          row-key="id"
          size="middle"
          flat
          @page-change="handleProcessingTaskPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'taskType'">
              <UiTag :tone="processingTaskTypeTone(record.taskType)" size="sm">
                {{ processingTaskTypeLabel(record.taskType) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="processingTaskStatusTone(record.status)" size="sm">
                {{ processingTaskStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'diagnostic'">
              <span v-if="record.diagnostic" class="processing-card__diagnostic">{{
                record.diagnostic
              }}</span>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                v-if="canRetryPaperGrade(record)"
                size="sm"
                variant="outline"
                :loading="retryingPaperInstanceId === record.paperInstanceId"
                @click="retryPaperGradeForTask(record)"
              >
                重试整卷 AI
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
    <a-spin v-else :spinning="loading" tip="正在加载复核进度...">
      <UiEmpty description="暂无数据" class="progress-page__empty" />
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamProcessingTaskItemVO } from '@/apis/mark/exam-processing-task'
import type { MarkingProgressVO, ReviewQuestionProgressItemVO } from '@/apis/mark/exam-progress'
import type { ReviewTaskStatusCode } from '@/apis/mark/exam-review-task'
import type { TaskStatusCode } from '@/apis/mark/task-status'
import type { ProcessingTaskTypeCode } from '@/apis/mark/task-type'
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import PieChartOutlined from '@ant-design/icons-vue/PieChartOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, onActivated, ref, watch } from 'vue'
import {
  pageExamProcessingTasks,
  retryPaperGradeSuggestion,
} from '@/apis/mark/exam-processing-task'
import { getMarkingProgress } from '@/apis/mark/exam-progress'
import {
  REVIEW_TASK_STATUS_LABEL as STATUS_LABEL,
  REVIEW_TASK_STATUS_TONE as STATUS_TONE,
} from '@/apis/mark/exam-review-task'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/question-type'
import { TASK_STATUS_LABEL, TASK_STATUS_TONE } from '@/apis/mark/task-status'
import { PROCESSING_TASK_TYPE_LABEL, PROCESSING_TASK_TYPE_TONE } from '@/apis/mark/task-type'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkDistributionSection from '@/components/chart/MarkDistributionSection.vue'
import MarkGaugeBlock from '@/components/chart/MarkGaugeBlock.vue'
import MarkHeatmapSection from '@/components/chart/MarkHeatmapSection.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError } from '@/utils/error-handler'
import { formatGaugeAriaLabel } from '@/utils/mark-chart-accessibility'
import {
  buildBarChartInsight,
  buildDistributionChartInsight,
  buildHeatmapChartInsight,
  mergeChartHint,
} from '@/utils/mark-chart-insights'
import {
  buildCategoryBarChartOption,
  buildDistributionBarChartOption,
  buildGaugeChartOption,
  buildHeatmapChartOption,
} from '@/utils/mark-echarts-options'
import {
  reviewProgressToBarItems,
  reviewProgressToHeatmapCells,
} from '@/utils/mark-statistics-chart'
import { readPageTotal } from '@/utils/page-result'
import { toneToColor } from '@/utils/score-tone'
import {
  toDistributionSegments,
  toShareSignalMetrics,
  toSignalMetrics,
} from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewProgress' })

const { selectedExamId } = useMarkExamContext()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)

const successColor = toneToColor('green')
const primaryColor = toneToColor('blue')

const progress = ref<MarkingProgressVO | null>(null)
const loading = ref(false)

const processingTasks = ref<ExamProcessingTaskItemVO[]>([])
const processingTasksLoading = ref(false)
const processingTaskTotal = ref(0)
const processingTaskPageNum = ref(1)
const processingTaskPageSize = ref(10)
const processingTaskTypeFilter = ref<ProcessingTaskTypeCode | undefined>(undefined)
const retryingPaperInstanceId = ref<string | null>(null)

const processingTaskTypeOptions = computed(() =>
  (Object.keys(PROCESSING_TASK_TYPE_LABEL) as ProcessingTaskTypeCode[]).map((value) => ({
    value,
    label: PROCESSING_TASK_TYPE_LABEL[value],
  })),
)

function processingTaskTypeLabel(value: ProcessingTaskTypeCode): string {
  return strictEnumLabel(PROCESSING_TASK_TYPE_LABEL, value, '处理任务类型')
}

function processingTaskTypeTone(value: ProcessingTaskTypeCode) {
  return strictEnumTone(PROCESSING_TASK_TYPE_TONE, value, '处理任务类型')
}

function processingTaskStatusLabel(value: TaskStatusCode): string {
  return strictEnumLabel(TASK_STATUS_LABEL, value, '处理任务状态')
}

function processingTaskStatusTone(value: TaskStatusCode) {
  return strictEnumTone(TASK_STATUS_TONE, value, '处理任务状态')
}

function canRetryPaperGrade(record: ExamProcessingTaskItemVO): boolean {
  if (!record.paperInstanceId) return false
  if (record.taskType !== 'SUBJECTIVE_AI_REVIEW') return false
  return record.status === 'FAILED' || record.status === 'BLOCKED' || record.status === 'PROCESSING'
}

async function loadProcessingTasks(): Promise<void> {
  if (!selectedExamId.value) return
  processingTasksLoading.value = true
  try {
    const result = await pageExamProcessingTasks({
      examId: selectedExamId.value,
      taskType: processingTaskTypeFilter.value,
      pageNum: processingTaskPageNum.value,
      pageSize: processingTaskPageSize.value,
    })
    processingTasks.value = result.list ?? []
    processingTaskTotal.value = readPageTotal(result, '批改处理任务总数加载失败')
  } catch (error) {
    showUserError(error, '批改处理任务加载失败')
  } finally {
    processingTasksLoading.value = false
  }
}

function reloadProcessingTasks(): void {
  processingTaskPageNum.value = 1
  void loadProcessingTasks()
}

function handleProcessingTaskPageChange(pageEvent: { current: number, pageSize: number }): void {
  processingTaskPageNum.value = pageEvent.current
  processingTaskPageSize.value = pageEvent.pageSize
  void loadProcessingTasks()
}

async function retryPaperGradeForTask(record: ExamProcessingTaskItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  retryingPaperInstanceId.value = record.paperInstanceId
  try {
    await retryPaperGradeSuggestion({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    message.success('整卷 AI 重试已受理')
    await loadProcessingTasks()
  } catch (error) {
    showUserError(error, '整卷 AI 重试失败')
  } finally {
    retryingPaperInstanceId.value = null
  }
}

const processingTaskColumns: ColumnType<ExamProcessingTaskItemVO>[] = [
  { title: '类型', dataIndex: 'taskType', key: 'taskType', width: 140 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '试卷实例', dataIndex: 'paperInstanceId', key: 'paperInstanceId', width: 120 },
  { title: '题目模板', dataIndex: 'questionTemplateId', key: 'questionTemplateId', width: 120 },
  { title: '诊断', dataIndex: 'diagnostic', key: 'diagnostic' },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 160 },
  { title: '操作', key: 'actions', width: 120 },
]

const contextProgress = computed(
  () =>
    workbenchContext?.markingProgress?.value
    ?? workbenchContext?.snapshot.value?.markingProgress
    ?? null,
)

watch(
  contextProgress,
  (value) => {
    progress.value = value
  },
  { immediate: true },
)

const confirmedPercent = computed(() => {
  if (!progress.value) return 0
  const total = progress.value.totalQuestionGradeCount
  const confirmed = progress.value.confirmedQuestionGradeCount
  if (total <= 0) return 0
  return Math.min(100, Math.round((confirmed * 100) / total))
})

const confirmedRingColor = computed(() =>
  toneToColor(confirmedPercent.value >= 100 ? 'green' : 'blue'),
)

const overviewStatItems = computed((): UiStatPanelItem[] => {
  if (!progress.value) return []
  const data = progress.value
  return [
    {
      key: 'questionCount',
      label: '题目',
      value: data.questionCount,
      unit: '道',
    },
    {
      key: 'paperCount',
      label: '已扫描试卷',
      value: data.paperCount,
      unit: '份',
    },
    {
      key: 'gradablePaperCount',
      label: '可进入复核',
      value: data.gradablePaperCount,
      unit: '份',
      helper: '已完成身份绑定',
      tone: data.gradablePaperCount > 0 ? 'blue' : 'gray',
    },
  ]
})

const totalTaskCount = computed(
  () =>
    progress.value?.reviewTaskStatusSummaryList.reduce((sum, item) => sum + item.taskCount, 0) ?? 0,
)

const statusBreakdown = computed(() => {
  const taskCountMap = new Map<ReviewTaskStatusCode, number>()
  progress.value?.reviewTaskStatusSummaryList.forEach((item) => {
    taskCountMap.set(item.statusCode, item.taskCount)
  })
  // 显式列出全部枚举值，避免 Object.keys + as 推断。
  const codes: ReviewTaskStatusCode[] = [
    'PENDING',
    'IN_PROGRESS',
    'APPROVED',
    'REJECTED',
    'INVALIDATED',
  ]
  return codes.map((code) => ({
    code,
    label: strictEnumLabel(STATUS_LABEL, code, '复核任务状态'),
    tone: strictEnumTone(STATUS_TONE, code, '复核任务状态'),
    count: taskCountMap.get(code) ?? 0,
  }))
})

const statusDistributionSegments = computed(() => toDistributionSegments(statusBreakdown.value))

const statusDistributionHint = computed(() =>
  buildDistributionChartInsight(statusDistributionSegments.value),
)

const { chartOption: confirmedGaugeOption } = useChartOption(() =>
  buildGaugeChartOption(confirmedPercent.value, {
    label: '已确认率',
    color: confirmedRingColor.value,
    size: 'md',
  }),
)

const confirmedGaugeAriaLabel = computed(() => {
  const data = progress.value
  const detail = data
    ? `已确认 ${data.confirmedQuestionGradeCount} / ${data.totalQuestionGradeCount} 题次`
    : undefined
  return formatGaugeAriaLabel('已确认率', confirmedPercent.value, detail)
})

const confirmedGaugeBlockProps = computed(() => ({
  option: confirmedGaugeOption.value,
  ariaLabel: confirmedGaugeAriaLabel.value,
  layout: 'stacked' as const,
}))

const { chartOption: statusDistributionOption } = useChartOption(() =>
  buildDistributionBarChartOption(statusDistributionSegments.value, {
    emptyText: '暂无复核任务',
  }),
)

const statusDistributionAriaLabel = computed(() => {
  if (totalTaskCount.value <= 0) {
    return '复核任务状态分布，暂无复核任务'
  }
  const parts = statusBreakdown.value
    .filter((item) => item.count > 0)
    .map((item) => `${item.label} ${item.count} 项`)
  return `复核任务状态分布，共 ${totalTaskCount.value} 项，${parts.join('，')}`
})

const overviewSignalMetrics = computed(() => toSignalMetrics(overviewStatItems.value))

const statusSignalMetrics = computed(() =>
  toShareSignalMetrics(statusBreakdown.value, totalTaskCount.value, '暂无复核任务'),
)

const auxSignalMetrics = computed(() => toSignalMetrics(auxStatItems.value))

const auxStatItems = computed((): UiStatPanelItem[] => {
  if (!progress.value) return []
  return [
    {
      key: 'scanAttention',
      label: '扫描异常待办',
      value: progress.value.scanAttentionCount,
      unit: '条',
      tone: progress.value.scanAttentionCount > 0 ? 'red' : 'gray',
    },
    {
      key: 'openProcessing',
      label: '复核中未完成任务',
      value: progress.value.openProcessingTaskCount,
      unit: '项',
      tone: progress.value.openProcessingTaskCount > 0 ? 'orange' : 'gray',
    },
  ]
})

const questionRows = computed<ReviewQuestionProgressItemVO[]>(
  () => progress.value?.reviewQuestionProgressList ?? [],
)
const reviewProgressBarItems = computed(() => reviewProgressToBarItems(questionRows.value))

const reviewProgressBarHint = computed(() =>
  mergeChartHint(
    '柱高表示已通过复核任务数',
    buildBarChartInsight(reviewProgressBarItems.value, { valueUnit: ' 项' }),
  ),
)
const questionHeatmapCells = computed(() => reviewProgressToHeatmapCells(questionRows.value))

const questionHeatmapHint = computed(() =>
  mergeChartHint(
    '颜色越深表示该题复核确认率越高，点击题格可定位表格行',
    buildHeatmapChartInsight(questionHeatmapCells.value),
  ),
)

const questionHeatmapHeight = computed(() => {
  const count = questionHeatmapCells.value.length
  if (count <= 0) return '120px'
  return count > 20 ? '160px' : '120px'
})

const { chartOption: questionHeatmapOption } = useChartOption(() =>
  buildHeatmapChartOption(questionHeatmapCells.value, {
    rowLabel: '确认率',
    emptyText: '暂无题号进度数据',
  }),
)

const questionHeatmapAriaLabel = computed(() => {
  const count = questionHeatmapCells.value.length
  if (count <= 0) {
    return '题号确认率热力图，暂无数据'
  }
  return `题号确认率热力图，共 ${count} 道题`
})

const highlightedQuestionId = ref<string | null>(null)

function handleHeatmapCellClick(index: number): void {
  const row = questionRows.value[index]
  highlightedQuestionId.value = row?.questionTemplateId ?? null
}

const { chartOption: reviewProgressChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(reviewProgressBarItems.value, {
    orientation: 'vertical',
    yAxisName: '已通过',
    dataZoom: true,
    emptyText: '暂无题目复核进度',
  }),
)

const reviewProgressChartAriaLabel = computed(() => {
  const count = reviewProgressBarItems.value.length
  if (count <= 0) {
    return '按题目维度的复核进度，暂无数据'
  }
  return `按题目维度的复核进度，共 ${count} 道题`
})

function questionTypeLabel(questionType: ReviewQuestionProgressItemVO['questionType']): string {
  return strictEnumLabel(QUESTION_TYPE_LABEL, questionType, '题型')
}

const questionColumns: ColumnType<ReviewQuestionProgressItemVO>[] = [
  { title: '题目', dataIndex: 'questionNo', key: 'questionNo', width: 180 },
  { title: '复核进度', dataIndex: 'approvedTaskCount', key: 'progress', width: 240 },
  { title: '待领取', dataIndex: 'pendingTaskCount', key: 'pending', width: 100 },
  { title: '复核中', dataIndex: 'inProgressTaskCount', key: 'inProgress', width: 100 },
  { title: '已驳回', dataIndex: 'rejectedTaskCount', key: 'rejected', width: 100 },
]

async function loadAll(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    if (workbenchContext?.refreshChrome) {
      await workbenchContext.refreshChrome()
    } else {
      progress.value = await getMarkingProgress(selectedExamId.value)
    }
    await loadProcessingTasks()
  } catch (error) {
    showUserError(error, '复核进度加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  selectedExamId,
  (value) => {
    if (!value) {
      progress.value = null
      processingTasks.value = []
      processingTaskTotal.value = 0
      return
    }
    processingTaskPageNum.value = 1
    void loadProcessingTasks()
  },
  { immediate: true },
)

onActivated(() => {
  if (selectedExamId.value) {
    void loadAll()
  }
})
</script>

<style lang="scss" scoped>
.progress-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 8px 10px;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__empty {
    padding: 60px 0;
  }
}

.overview-row {
  row-gap: 16px;
}

.status-card {
  height: 100%;

  &__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__aux {
    padding-top: 16px;
    border-top: 1px solid var(--ant-color-border-secondary);
  }
}

.overview-card {
  height: 100%;

  &__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__ring-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 4px 0 8px;
  }

  &__gauge {
    margin: 0 auto;
  }

  &__formula {
    font-size: 16px;
    color: var(--ant-color-text);
    text-align: center;
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
    text-align: center;
  }
}

.question-card {
  height: 100%;
}

.processing-card__diagnostic {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.question-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.progress-page__chart,
.progress-page__heatmap {
  margin-bottom: 16px;
}

.question-cell--highlight {
  outline: 2px solid var(--ant-color-primary);
  outline-offset: 2px;
  border-radius: var(--dp-radius-control-inner, 4px);
}

.progress-page__chart-canvas {
  width: 100%;
  height: 300px;
}

.question-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.question-type {
  color: var(--ant-color-text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.progress-detail {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 60px 0;
}
</style>
