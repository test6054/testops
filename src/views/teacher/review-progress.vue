<template>
  <StageWorkbenchShell class="progress-page">
    <template v-if="selectedExamId" #context>
      <ContextBar layout="workbench" show-title title="复核进度">
        <template #status>
          <UiTag :tone="confirmedPercent >= 100 ? 'green' : 'blue'" size="sm">
            已确认 {{ confirmedPercent }}%
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && progress" #signal>
      <SignalBand compact variant="panel" :metrics="pageSignalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" class="progress-page__empty" />

    <UiEmpty size="sm" v-else-if="loadFailed" title="加载失败" class="progress-page__empty" />

    <UiSkeletonState v-else-if="loading && !progress" variant="card" compact />

    <UiEmpty
      size="sm"
      v-else-if="!progress"
      description="暂无复核进度数据"
      class="progress-page__empty"
    />

    <template v-else-if="progress">
      <ExamWorkspaceJourneySubNav />

      <UiRow :gutter="16" class="overview-row">
        <UiCol :xs="24" :md="8">
          <WorkbenchSurfaceCard class="overview-card">
            <template #head>
              <div class="overview-card__title">
                <DashboardOutlined />
                <span>教师复核进度</span>
              </div>
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
          </WorkbenchSurfaceCard>
        </UiCol>
        <UiCol :xs="24" :md="16">
          <WorkbenchSurfaceCard class="status-card">
            <template #head>
              <div class="status-card__title">
                <PieChartOutlined />
                <span>复核任务状态分布</span>
              </div>
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
          </WorkbenchSurfaceCard>
        </UiCol>
      </UiRow>

      <WorkbenchSurfaceCard flush class="question-card">
        <template #head>
          <div class="question-card__title">
            <TableOutlined />
            <span>按题目维度的复核进度</span>
          </div>
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
          v-model:current="questionPageNum"
          v-model:page-size="questionPageSize"
          pagination-mode="server"
          :columns="questionColumns"
          :data-source="questionTableRows"
          :loading="questionTableLoading || loading"
          :load-error="questionTableLoadError"
          :total="questionPageTotal"
          :sticky-header="false"
          flat
          row-key="layoutQuestionId"
          size="middle"
          @page-change="handleQuestionPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'questionNo'">
              <div
                class="question-cell"
                :class="{
                  'question-cell--highlight': highlightedQuestionId === record.layoutQuestionId,
                }"
              >
                <UiTag tone="blue" size="sm">题{{ record.questionNo }}</UiTag>
                <span class="question-type">{{ questionTypeLabel(record.questionType) }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'progress'">
              <UiProgressBar
                :percent="
                  record.totalTaskCount === 0
                    ? 0
                    : Math.round((record.approvedTaskCount * 100) / record.totalTaskCount)
                "
                size="sm"
                :color="
                  record.totalTaskCount > 0 && record.approvedTaskCount >= record.totalTaskCount
                    ? successColor
                    : primaryColor
                "
                :show-label="false"
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
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard flush class="processing-card">
        <template #head>
          <div class="processing-card__title">
            <RobotOutlined />
            <span>批改处理任务</span>
          </div>
        </template>
        <template #toolbar>
          <UiSelect
            v-model="processingTaskTypeFilter"
            allow-clear
            placeholder="任务类型"
            size="small"
            style="width: 160px"
            :options="PROCESSING_TASK_TYPE_OPTIONS"
            @change="reloadProcessingTasks"
          />
        </template>
        <UiDataTable
          v-model:current="processingTaskPageNum"
          v-model:page-size="processingTaskPageSize"
          pagination-mode="server"
          :columns="processingTaskColumns"
          :data-source="processingTasks"
          :loading="processingTasksLoading"
          :total="processingTaskTotal"
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
              <UiTableActions
                v-if="canRetryPaperGrade(record)"
                :items="[
                  {
                    key: 'retry',
                    label: '重试整卷 AI',
                    disabled: retryingPaperInstanceId === record.paperInstanceId,
                  },
                ]"
                split
                @action="() => retryPaperGradeForTask(record)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamProcessingTaskItemResponse } from '@/apis/mark/exam-processing-task'
import type {
  MarkingProgressResponse,
  ReviewQuestionProgressItemResponse,
} from '@/apis/mark/exam-progress'
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import PieChartOutlined from '@ant-design/icons-vue/PieChartOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, onActivated, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  pageExamProcessingTasks,
  retryPaperGradeSuggestion,
} from '@/apis/mark/exam-processing-task'
import {
  getMarkingProgress,
  getReviewQuestionProgressSummary,
  pageReviewQuestionProgress,
} from '@/apis/mark/exam-progress'
import {
  REVIEW_TASK_STATUS_TONE,
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription,
} from '@/apis/mark/exam-review-task'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import { TASK_STATUS_TONE, TaskStatusCode, TaskStatusDescription } from '@/apis/mark/task-status'
import {
  ALL_PROCESSING_TASK_TYPE_CODES,
  PROCESSING_TASK_TYPE_OPTIONS,
  PROCESSING_TASK_TYPE_TONE,
  ProcessingTaskTypeCode,
  ProcessingTaskTypeDescription,
} from '@/apis/mark/task-type'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkDistributionSection from '@/components/chart/MarkDistributionSection.vue'
import MarkGaugeBlock from '@/components/chart/MarkGaugeBlock.vue'
import MarkHeatmapSection from '@/components/chart/MarkHeatmapSection.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { useQueryTable } from '@/composables/useQueryTable'
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
import { toneToColor } from '@/utils/score-tone'
import {
  toDistributionSegments,
  toShareSignalMetrics,
  toSignalMetrics,
} from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewProgress' })

const route = useRoute()
const { selectedExamId, selectedExam } = useMarkExamContext()
/** MVR-289：默认拒绝假可写；与 BE requireExamReviewerPermission 对齐 */
const canManageReviewerWrites = computed(() => selectedExam.value?.canManageReviewerWrites === true)
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)

const successColor = toneToColor('green')
const primaryColor = toneToColor('blue')

const progress = ref<MarkingProgressResponse | null>(null)
const questionSummaryItems = ref<ReviewQuestionProgressItemResponse[]>([])
const loading = ref(false)
const loadFailed = ref(false)

const {
  rows: questionTableRows,
  loading: questionTableLoading,
  pageNum: questionPageNum,
  pageSize: questionPageSize,
  pageTotal: questionPageTotal,
  filters: questionTableFilters,
  loadError: questionTableLoadError,
  loadPage: loadQuestionTablePage,
  search: searchQuestionTable,
  handlePageChange: handleQuestionPageChange,
} = useQueryTable<ReviewQuestionProgressItemResponse, { examId: string }>(
  (params) => pageReviewQuestionProgress(params),
  {
    defaultFilters: () => ({ examId: selectedExamId.value ?? '' }),
    immediate: false,
    errorMessage: '题目复核进度加载失败',
  },
)

const processingTasks = ref<ExamProcessingTaskItemResponse[]>([])
const processingTasksLoading = ref(false)
const processingTaskTotal = ref(0)
const processingTaskPageNum = ref(1)
const processingTaskPageSize = ref(10)
const processingTaskTypeFilter = ref<ProcessingTaskTypeCode | undefined>(undefined)
const retryingPaperInstanceId = ref<string | null>(null)
/** 丢弃过期的批改处理任务分页请求，避免 watch 与 onActivated 并发覆盖。 */
let processingTasksLoadGeneration = 0
/** 丢弃过期的整页刷新，避免 keep-alive 激活时重复 loadAll 覆盖。 */
let pageLoadGeneration = 0

function processingTaskTypeLabel(value: ProcessingTaskTypeCode): string {
  return strictEnumLabel(ProcessingTaskTypeDescription, value, '处理任务类型')
}

function processingTaskTypeTone(value: ProcessingTaskTypeCode) {
  return strictEnumTone(PROCESSING_TASK_TYPE_TONE, value, '处理任务类型')
}

function processingTaskStatusLabel(value: TaskStatusCode): string {
  return strictEnumLabel(TaskStatusDescription, value, '处理任务状态')
}

function processingTaskStatusTone(value: TaskStatusCode) {
  return strictEnumTone(TASK_STATUS_TONE, value, '处理任务状态')
}

function canRetryPaperGrade(record: ExamProcessingTaskItemResponse): boolean {
  if (!canManageReviewerWrites.value) return false
  if (!record.paperInstanceId) return false
  if (
    record.taskType !== ProcessingTaskTypeCode.SUBJECTIVE_AI_REVIEW
    && record.taskType !== ProcessingTaskTypeCode.OBJECTIVE_AI_REVIEW
  ) {
    return false
  }
  return (
    record.status === TaskStatusCode.FAILED
    || record.status === TaskStatusCode.BLOCKED
    || record.status === TaskStatusCode.PROCESSING
  )
}

async function loadProcessingTasks(): Promise<void> {
  if (!selectedExamId.value) return
  const generation = ++processingTasksLoadGeneration
  processingTasksLoading.value = true
  try {
    const result = await pageExamProcessingTasks({
      examId: selectedExamId.value,
      taskType: processingTaskTypeFilter.value,
      pageNum: processingTaskPageNum.value,
      pageSize: processingTaskPageSize.value,
    })
    if (generation !== processingTasksLoadGeneration) {
      return
    }
    processingTasks.value = result.list ?? []
    processingTaskTotal.value = result.total
  } catch (error) {
    if (generation !== processingTasksLoadGeneration) {
      return
    }
    showUserError(error, '批改处理任务加载失败')
  } finally {
    if (generation === processingTasksLoadGeneration) {
      processingTasksLoading.value = false
    }
  }
}

function reloadProcessingTasks(): void {
  processingTaskPageNum.value = 1
  void loadProcessingTasks()
}

/** 从路由 query 同步处理任务类型筛选，须在每次拉取任务列表前调用。 */
function syncProcessingTaskFilterFromRoute(): void {
  const taskType = route.query.taskType
  if (typeof taskType !== 'string') {
    processingTaskTypeFilter.value = undefined
    return
  }
  for (const code of ALL_PROCESSING_TASK_TYPE_CODES) {
    if (code === taskType) {
      processingTaskTypeFilter.value = code
      return
    }
  }
  processingTaskTypeFilter.value = undefined
}

async function reloadProcessingTasksFromRoute(resetPage = true): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  syncProcessingTaskFilterFromRoute()
  if (resetPage) {
    processingTaskPageNum.value = 1
  }
  await loadProcessingTasks()
}

function handleProcessingTaskPageChange(pageEvent: { current: number, pageSize: number }): void {
  processingTaskPageNum.value = pageEvent.current
  processingTaskPageSize.value = pageEvent.pageSize
  void loadProcessingTasks()
}

async function retryPaperGradeForTask(record: ExamProcessingTaskItemResponse): Promise<void> {
  if (retryingPaperInstanceId.value || !selectedExamId.value || !record.paperInstanceId) return
  // MVR-420：与 canRetryPaperGrade / 行内显隐同源二次闸（写权∧AI 任务类型∧FAILED/BLOCKED/PROCESSING）
  if (!canRetryPaperGrade(record)) {
    void message.warning(
      canManageReviewerWrites.value
        ? '当前处理任务不可重试整卷智能复评（类型或状态不允许）'
        : '仅本场阅卷组织成员、主考或管理员可重试整卷 AI 批阅',
    )
    return
  }
  retryingPaperInstanceId.value = record.paperInstanceId
  try {
    await retryPaperGradeSuggestion({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    void message.success('整卷智能复评重试已受理')
    await loadProcessingTasks()
  } catch (error) {
    showUserError(error, '整卷智能复评重试失败')
  } finally {
    retryingPaperInstanceId.value = null
  }
}

const processingTaskColumns: ColumnType<ExamProcessingTaskItemResponse>[] = [
  { title: '类型', dataIndex: 'taskType', key: 'taskType', width: 140, fixed: 'left' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '试卷实例', dataIndex: 'paperInstanceId', key: 'paperInstanceId', width: 120 },
  { title: '制卷题目', dataIndex: 'layoutQuestionId', key: 'layoutQuestionId', width: 120 },
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
    const examId = selectedExamId.value
    if (!examId) {
      progress.value = null
      return
    }
    const contextExamId
      = workbenchContext?.examId?.value ?? workbenchContext?.snapshot.value?.examId
    if (contextExamId && String(contextExamId) !== String(examId)) {
      return
    }
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
    ReviewTaskStatusCode.PENDING,
    ReviewTaskStatusCode.IN_PROGRESS,
    ReviewTaskStatusCode.APPROVED,
    ReviewTaskStatusCode.REJECTED,
    ReviewTaskStatusCode.INVALIDATED,
  ]
  return codes.map((code) => ({
    code,
    label: strictEnumLabel(ReviewTaskStatusDescription, code, '复核任务状态'),
    tone: strictEnumTone(REVIEW_TASK_STATUS_TONE, code, '复核任务状态'),
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

const confirmedGaugeBlockProps = computed(
  (): {
    option: typeof confirmedGaugeOption.value
    ariaLabel: string
    layout: 'stacked'
  } => ({
    option: confirmedGaugeOption.value,
    ariaLabel: confirmedGaugeAriaLabel.value,
    layout: 'stacked',
  }),
)

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

const pageSignalMetrics = computed((): SignalMetric[] => {
  if (!progress.value) {
    return []
  }
  return [
    {
      key: 'confirmed',
      label: '已确认率',
      value: confirmedPercent.value,
      unit: '%',
      tone: confirmedPercent.value >= 100 ? 'green' : 'blue',
    },
    ...toSignalMetrics(overviewStatItems.value),
  ]
})

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

const questionRows = computed<ReviewQuestionProgressItemResponse[]>(
  () => questionSummaryItems.value,
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
    return '题号确认率热力图暂无数据'
  }
  return `题号确认率热力图，共 ${count} 道题`
})

const highlightedQuestionId = ref<string | null>(null)

function handleHeatmapCellClick(index: number): void {
  const row = questionRows.value[index]
  highlightedQuestionId.value = row?.layoutQuestionId ?? null
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
    return '按题目维度的复核进度暂无数据'
  }
  return `按题目维度的复核进度，共 ${count} 道题`
})

function questionTypeLabel(
  questionType: ReviewQuestionProgressItemResponse['questionType'],
): string {
  return strictEnumLabel(QuestionTypeDescription, questionType, '题型')
}

const questionColumns: ColumnType<ReviewQuestionProgressItemResponse>[] = [
  { title: '题目', dataIndex: 'questionNo', key: 'questionNo', width: 180, fixed: 'left' },
  { title: '复核进度', dataIndex: 'approvedTaskCount', key: 'progress', width: 240 },
  { title: '待领取', dataIndex: 'pendingTaskCount', key: 'pending', width: 100 },
  { title: '复核中', dataIndex: 'inProgressTaskCount', key: 'inProgress', width: 100 },
  { title: '已驳回', dataIndex: 'rejectedTaskCount', key: 'rejected', width: 100 },
]

async function loadQuestionSummary(): Promise<void> {
  if (!selectedExamId.value) {
    questionSummaryItems.value = []
    return
  }
  try {
    const summary = await getReviewQuestionProgressSummary(selectedExamId.value)
    questionSummaryItems.value = summary.items
  } catch (error) {
    questionSummaryItems.value = []
    showUserError(error, '题目进度摘要加载失败')
  }
}

async function reloadQuestionTable(): Promise<void> {
  if (!selectedExamId.value) return
  questionTableFilters.value = { examId: selectedExamId.value }
  searchQuestionTable()
}

async function loadAll(): Promise<void> {
  if (!selectedExamId.value) return
  const generation = ++pageLoadGeneration
  loading.value = true
  loadFailed.value = false
  syncProcessingTaskFilterFromRoute()
  try {
    if (workbenchContext?.refreshChrome) {
      await workbenchContext.refreshChrome()
    } else {
      progress.value = await getMarkingProgress(selectedExamId.value)
    }
    if (generation !== pageLoadGeneration) {
      return
    }
    await Promise.all([loadQuestionSummary(), reloadQuestionTable()])
    processingTaskPageNum.value = 1
    await loadProcessingTasks()
  } catch (error) {
    if (generation !== pageLoadGeneration) {
      return
    }
    loadFailed.value = true
    showUserError(error, '复核进度加载失败')
  } finally {
    if (generation === pageLoadGeneration) {
      loading.value = false
    }
  }
}

watch([selectedExamId, () => route.query.taskType], ([examId], [prevExamId]) => {
  if (!examId) {
    pageLoadGeneration++
    processingTasksLoadGeneration++
    progress.value = null
    questionSummaryItems.value = []
    processingTasks.value = []
    processingTaskTotal.value = 0
    processingTaskTypeFilter.value = undefined
    return
  }
  if (examId !== prevExamId) {
    void loadAll()
    return
  }
  void reloadProcessingTasksFromRoute()
})

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
  gap: var(--dp-space-4);
  min-width: 0;
  padding: 0;
  /* 滚动页：surface 随内容增高，避免 flex 吃满视口产生底部空白 */
  :deep(.stage-workbench-shell__surface) {
    flex: 0 0 auto;
  }

  &__empty {
    padding: var(--dp-space-4) 0;
  }
}

.overview-row {
  row-gap: var(--dp-space-4);
}

.status-card {
  height: 100%;

  &__title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
    letter-spacing: -0.01em;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-3, 12px);
  }

  &__aux {
    padding-top: var(--dp-space-3, 12px);
    border-top: 1px solid var(--dp-border-subtle);
  }
}

.overview-card {
  height: 100%;

  &__title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
    letter-spacing: -0.01em;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-3, 12px);
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
    color: var(--dp-text);
    text-align: center;
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    color: var(--dp-text-tertiary);
    text-align: center;
  }
}

.question-card {
  &__title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
    letter-spacing: -0.01em;
  }
}

.processing-card {
  &__title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
    letter-spacing: -0.01em;
  }
}

.processing-card__diagnostic {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.progress-page__chart,
.progress-page__heatmap {
  margin-bottom: 16px;
}

.question-cell--highlight {
  outline: 2px solid var(--dp-color-primary);
  outline-offset: 2px;
  border-radius: var(--dp-radius-control-inner);
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
  color: var(--dp-text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.progress-detail {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-tertiary);
}

.muted {
  color: var(--dp-text-tertiary);
}

.empty-block {
  padding: var(--dp-space-3, 12px) 0;
}
</style>
