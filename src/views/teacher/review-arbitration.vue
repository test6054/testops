<template>
  <StageWorkbenchShell class="arbitration-page">
    <template v-if="selectedExamId" #context>
      <ContextBar layout="workbench">
        <template #status>
          <UiTag :tone="actionableCount > 0 ? 'orange' : 'green'" size="sm">
            {{ actionableCount > 0 ? `待处理 ${actionableCount}` : '暂无待办' }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand
        variant="tiles"
        compact
        :metrics="signalMetrics"
        @metric-click="handleSignalClick"
      />
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择考试" class="arbitration-page__empty" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard flush>
        <template #head>
          <UiSectionTabs
            v-model="statusTab"
            compact
            divided
            :items="statusTabItems"
            @change="handleStatusTabChange"
          />
        </template>

        <template #toolbar>
          <UiFilterBar
            v-model="filterModel"
            :fields="filterFields"
            variant="plain"
            show-labels
            actions-align="end"
          >
            <template #actions>
              <UiButton variant="ghost" size="sm" @click="resetFilters">重置</UiButton>
            </template>
          </UiFilterBar>
        </template>

        <UiDataTable
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          flat
          :columns="columns"
          :data-source="taskRows"
          :loading="loading"
          :total="pageTotal"
          row-key="reviewTaskId"
          size="middle"
          :expanded-row-keys="expandedRowKeys"
          empty-kind="first-run"
          empty-description="当前筛选下暂无仲裁任务"
          class="arbitration-table"
          @expand="handleExpandChange"
          @page-change="handlePageChange"
        >
          <template
            #bodyCell="{
              column,
              record,
            }: {
              column: ColumnType<ReviewTaskItemResponse>
              record: ReviewTaskItemResponse
            }"
          >
            <template v-if="column.key === 'questionNo'">
              <UiTag tone="blue" size="sm">第 {{ record.questionNo }} 题</UiTag>
            </template>
            <template v-else-if="column.key === 'student'">
              <div class="arbitration-table__student-cell">
                <span class="arbitration-table__student-name">{{ record.studentName }}</span>
                <span class="arbitration-table__student-no">{{ record.studentNo }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'paperDisplay'">
              <div class="arbitration-table__paper-cell">
                <span class="arbitration-table__paper-primary">{{
                  record.paperDisplay.primaryText
                }}</span>
                <span
                  v-if="record.paperDisplay.secondaryText"
                  class="arbitration-table__paper-secondary"
                >
                  {{ record.paperDisplay.secondaryText }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'fullScore'">
              <span class="arbitration-table__num">{{ record.fullScore }}</span>
            </template>
            <template v-else-if="column.key === 'aiScore'">
              <template v-if="record.aiScore != null">
                <strong class="arbitration-table__num">{{ record.aiScore }}</strong>
                <UiTag
                  v-if="getSuggestedRatio(record) !== null"
                  :tone="getSuggestedRatioTone(record)"
                  size="sm"
                  class="arbitration-table__ratio-tag"
                >
                  {{ getSuggestedRatio(record) }}%
                </UiTag>
              </template>
              <span v-else class="arbitration-table__muted">—</span>
            </template>
            <template v-else-if="column.key === 'assignedTeacher'">
              <span v-if="record.assignedTeacherUserId || record.assignedTeacherName">
                {{ formatAssignedTeacher(record) }}
              </span>
              <span v-else class="arbitration-table__muted">未指派</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="reviewStatusTone(record.status)" size="sm">
                {{ reviewStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'updateTime'">
              {{ formatDateTime(record.updateTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildArbitrationActions(record)"
                split
                @action="(key) => handleArbitrationAction(key, record)"
              />
            </template>
          </template>

          <template #expandedRowRender="{ record }: { record: ReviewTaskItemResponse }">
            <div class="workbench-score-bars">
              <div class="workbench-score-bars__title">AI 建议分占满分比</div>
              <div class="workbench-score-bar-item">
                <span class="workbench-score-bar-item__label">AI 建议</span>
                <div class="workbench-score-bar-item__track">
                  <div
                    class="workbench-score-bar-item__fill workbench-score-bar-item__fill--primary"
                    :style="{ width: `${getAiScoreBarWidth(record)}%` }"
                  >
                    {{ record.aiScore ?? '—' }}
                  </div>
                </div>
              </div>
              <div class="workbench-score-bar-item">
                <span class="workbench-score-bar-item__label">满分</span>
                <div class="workbench-score-bar-item__track">
                  <div
                    class="workbench-score-bar-item__fill workbench-score-bar-item__fill--success"
                    :style="{ width: '100%' }"
                  >
                    {{ record.fullScore }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ReviewQuestionProgressItemResponse } from '@/apis/mark/exam-progress'
import type { ReviewTaskItemResponse } from '@/apis/mark/exam-review-task'
import type {
  BadgeTone,
  FilterField,
  UiSectionTabItem,
  UiTableRowActionItem,
} from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onActivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getReviewQuestionProgressSummary } from '@/apis/mark/exam-progress'
import {
  getReviewArbitrationSummary,
  listReviewTasks,
  REVIEW_TASK_STATUS_TONE,
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription,
  ReviewTaskTypeCode,
} from '@/apis/mark/exam-review-task'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewArbitration' })

type StatusTabKey = 'all' | 'pending' | 'in-progress' | 'completed'

const router = useRouter()
const userStore = useUserStore()

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const currentUserId = computed(() => userStore.userInfo.userId || '')
const taskRows = ref<ReviewTaskItemResponse[]>([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const pageTotal = ref(0)
const summaryLoading = ref(false)
const totalCount = ref(0)
const pendingCount = ref(0)
const inProgressMineCount = ref(0)
const completedCount = ref(0)
const avgAiRatioPercent = ref<number | null>(null)
const statusTab = ref<StatusTabKey>('pending')
const filterQuestion = ref('')
const filterTeacherUserId = ref('')
const expandedRowKeys = ref<string[]>([])
const questionOptions = ref<Array<{ label: string, value: string }>>([])
const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()

const actionableCount = computed(() => pendingCount.value + inProgressMineCount.value)

const avgAiRatio = computed(() => {
  if (avgAiRatioPercent.value == null) {
    return '—'
  }
  return `${avgAiRatioPercent.value}%`
})

const signalMetrics = computed((): SignalMetric[] => [
  {
    key: 'total',
    label: '仲裁总数',
    value: totalCount.value,
    tone: 'blue',
  },
  {
    key: 'pending',
    label: '待处理',
    value: pendingCount.value,
    tone: pendingCount.value > 0 ? 'orange' : 'green',
    clickable: pendingCount.value > 0,
  },
  {
    key: 'in-progress',
    label: '我的复核中',
    value: inProgressMineCount.value,
    tone: inProgressMineCount.value > 0 ? 'blue' : 'gray',
    clickable: inProgressMineCount.value > 0,
  },
  {
    key: 'completed',
    label: '已结案',
    value: completedCount.value,
    tone: 'green',
    clickable: completedCount.value > 0,
  },
  {
    key: 'avg-ratio',
    label: '平均 AI 占比',
    value: avgAiRatio.value,
    tone: 'red',
  },
])

const statusTabItems = computed<UiSectionTabItem[]>(() => [
  { key: 'all', label: '全部', count: totalCount.value },
  { key: 'pending', label: '待处理', count: pendingCount.value, badgeTone: 'orange' },
  {
    key: 'in-progress',
    label: '复核中',
    count: inProgressMineCount.value,
    badgeTone: 'blue',
  },
  { key: 'completed', label: '已结案', count: completedCount.value, badgeTone: 'green' },
])

const filterFields = computed((): FilterField[] => [
  {
    key: 'questionNo',
    type: 'select',
    label: '题号',
    placeholder: '全部题目',
    width: 140,
    minWidth: 140,
    allowClear: true,
    options: questionOptions.value,
  },
  {
    key: 'teacherUserId',
    type: 'select',
    label: '教师',
    placeholder: '搜索教师',
    width: 180,
    minWidth: 180,
    allowClear: true,
    allowSearch: true,
    options: teacherOptions.value,
  },
])

const filterModel = computed({
  get: () => ({
    questionNo: filterQuestion.value,
    teacherUserId: filterTeacherUserId.value,
  }),
  set: (value: Record<string, unknown>) => {
    filterQuestion.value = String(value.questionNo ?? '')
    filterTeacherUserId.value = String(value.teacherUserId ?? '')
  },
})

const columns: ColumnType<ReviewTaskItemResponse>[] = [
  { title: '题号', key: 'questionNo', width: 96, align: 'center', fixed: 'left' },
  { title: '考生', key: 'student', width: 140 },
  { title: '答卷', key: 'paperDisplay', width: 160 },
  { title: '满分', key: 'fullScore', width: 72, align: 'right' },
  { title: 'AI 建议分', key: 'aiScore', width: 120, align: 'right' },
  { title: '指派教师', key: 'assignedTeacher', width: 120 },
  { title: '状态', key: 'status', width: 96, align: 'center' },
  { title: '更新时间', key: 'updateTime', width: 168 },
  { title: '操作', key: 'actions', width: 160 },
]

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return REVIEW_TASK_STATUS_TONE[value]
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return strictEnumLabel(ReviewTaskStatusDescription, value, '复核任务状态')
}

function getSuggestedRatio(record: ReviewTaskItemResponse): number | null {
  const full = record.fullScore
  const sug = record.aiScore
  if (sug == null || full <= 0) {
    return null
  }
  return Math.round((sug / full) * 100)
}

function getSuggestedRatioTone(record: ReviewTaskItemResponse): BadgeTone {
  const ratio = getSuggestedRatio(record)
  if (ratio == null) {
    return 'gray'
  }
  if (ratio < 60) {
    return 'orange'
  }
  if (ratio >= 80) {
    return 'green'
  }
  return 'blue'
}

function getAiScoreBarWidth(record: ReviewTaskItemResponse): number {
  const ratio = getSuggestedRatio(record)
  if (ratio == null) {
    return 0
  }
  return Math.min(100, Math.max(8, ratio))
}

function formatAssignedTeacher(record: ReviewTaskItemResponse): string {
  if (record.assignedTeacherUserId && record.assignedTeacherUserId === currentUserId.value) {
    return '我'
  }
  if (record.assignedTeacherName) {
    return record.assignedTeacherName
  }
  if (record.assignedTeacherUserId) {
    return record.assignedTeacherUserId
  }
  return ''
}

function buildArbitrationActions(record: ReviewTaskItemResponse): UiTableRowActionItem[] {
  return [
    { key: 'detail', label: '详情' },
    { key: 'workspace', label: '进入仲裁', tone: 'primary', hidden: !isActionableTask(record) },
  ]
}

function handleArbitrationAction(key: string, record: ReviewTaskItemResponse): void {
  switch (key) {
    case 'detail':
      goReviewDetail(record)
      break
    case 'workspace':
      goReviewWorkspace(record)
      break
  }
}

/** 待领取或当前教师进行中的任务可进入仲裁工作台。 */
function isActionableTask(record: ReviewTaskItemResponse): boolean {
  if (record.status === ReviewTaskStatusCode.PENDING) {
    return true
  }
  return (
    record.status === ReviewTaskStatusCode.IN_PROGRESS
    && record.assignedTeacherUserId === currentUserId.value
  )
}

function handleSignalClick(key: string): void {
  if (key === 'pending' && pendingCount.value > 0) {
    statusTab.value = 'pending'
    return
  }
  if (key === 'in-progress' && inProgressMineCount.value > 0) {
    statusTab.value = 'in-progress'
    return
  }
  if (key === 'completed' && completedCount.value > 0) {
    statusTab.value = 'completed'
  }
}

function handleStatusTabChange(): void {
  expandedRowKeys.value = []
  pageNum.value = 1
  void loadTasks()
}

function resetFilters(): void {
  filterQuestion.value = ''
  filterTeacherUserId.value = ''
  pageNum.value = 1
  void loadTasks()
}

function handlePageChange(event: { current: number, pageSize: number }): void {
  pageNum.value = event.current
  pageSize.value = event.pageSize
  void loadTasks()
}

function buildListQuery() {
  const examId = selectedExamId.value
  if (!examId) {
    throw new Error('examId missing')
  }
  const query = {
    examId,
    reviewType: ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    questionNo: filterQuestion.value || undefined,
  } as Parameters<typeof listReviewTasks>[0]
  if (statusTab.value !== 'in-progress' && filterTeacherUserId.value) {
    query.assignedTeacherUserId = filterTeacherUserId.value
  }
  if (statusTab.value === 'pending') {
    query.status = ReviewTaskStatusCode.PENDING
  } else if (statusTab.value === 'in-progress') {
    query.status = ReviewTaskStatusCode.IN_PROGRESS
    query.assignedTeacherUserId = currentUserId.value
  } else if (statusTab.value === 'completed') {
    query.completedOnly = true
  }
  return query
}

async function loadSummary(): Promise<void> {
  if (!selectedExamId.value) {
    totalCount.value = 0
    pendingCount.value = 0
    inProgressMineCount.value = 0
    completedCount.value = 0
    avgAiRatioPercent.value = null
    return
  }
  summaryLoading.value = true
  try {
    const summary = await getReviewArbitrationSummary({ examId: selectedExamId.value })
    totalCount.value = Number(summary.totalCount)
    pendingCount.value = Number(summary.pendingCount)
    inProgressMineCount.value = Number(summary.inProgressMineCount)
    completedCount.value = Number(summary.completedCount)
    avgAiRatioPercent.value = summary.avgAiRatioPercent ?? null
  } catch (error) {
    showUserError(error, '仲裁汇总加载失败')
  } finally {
    summaryLoading.value = false
  }
}

async function loadQuestionOptions(): Promise<void> {
  if (!selectedExamId.value) {
    questionOptions.value = []
    return
  }
  try {
    const questionSummary = await getReviewQuestionProgressSummary(selectedExamId.value)
    questionOptions.value = questionSummary.items
      .map((item: ReviewQuestionProgressItemResponse) => item.questionNo)
      .filter((questionNo): questionNo is string => questionNo.trim().length > 0)
      .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
      .map((questionNo) => ({ label: `第 ${questionNo} 题`, value: questionNo }))
  } catch (error) {
    questionOptions.value = []
    showUserError(error, '题号筛选项加载失败')
  }
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) {
    taskRows.value = []
    pageTotal.value = 0
    return
  }
  loading.value = true
  try {
    const page = await listReviewTasks(buildListQuery())
    taskRows.value = page.list
    pageTotal.value = page.total
    if (page.pageNum != null) {
      pageNum.value = page.pageNum
    }
    if (page.pageSize != null) {
      pageSize.value = page.pageSize
    }
  } catch (error) {
    taskRows.value = []
    pageTotal.value = 0
    showUserError(error, '题目复核仲裁任务加载失败')
  } finally {
    loading.value = false
  }
}

async function reloadAll(): Promise<void> {
  await Promise.all([loadSummary(), loadQuestionOptions(), loadTasks()])
}

function handleExpandChange(expanded: boolean, record: ReviewTaskItemResponse): void {
  if (expanded) {
    expandedRowKeys.value = [record.reviewTaskId]
    return
  }
  expandedRowKeys.value = []
}

watch(
  selectedExamId,
  (value) => {
    if (value) {
      pageNum.value = 1
      void reloadAll()
    } else {
      taskRows.value = []
      pageTotal.value = 0
    }
  },
  { immediate: true },
)

watch([filterQuestion, filterTeacherUserId], () => {
  if (!selectedExamId.value) {
    return
  }
  pageNum.value = 1
  void loadTasks()
})

onActivated(() => {
  if (selectedExamId.value) {
    void reloadAll()
    void refreshSnapshot()
  }
})

function goReviewWorkspace(record: ReviewTaskItemResponse): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceReviewWorkspace',
    params: { examId: selectedExamId.value, taskId: record.reviewTaskId },
    query: { source: 'arbitration' },
  })
}

function goReviewDetail(record: ReviewTaskItemResponse): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceReviewTaskDetail',
    params: { examId: selectedExamId.value, taskId: record.reviewTaskId },
    query: { source: 'arbitration' },
  })
}
</script>

<style lang="scss" scoped>
.arbitration-page {
  &__empty {
    padding: 48px 0;
  }
}

.arbitration-table {
  &__student-cell,
  &__paper-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__student-name,
  &__paper-primary {
    font-weight: var(--dp-font-weight-title);
    color: var(--dp-text-primary);
  }

  &__student-no,
  &__paper-secondary {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
    font-variant-numeric: tabular-nums;
  }

  &__num {
    font-variant-numeric: tabular-nums;
  }

  &__ratio-tag {
    margin-left: var(--dp-space-2);
  }

  &__muted {
    color: var(--ant-color-text-tertiary);
  }
}
</style>
