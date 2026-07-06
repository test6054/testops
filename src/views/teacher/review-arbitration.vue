<template>
  <StageWorkbenchShell class="arbitration-page">
    <template v-if="selectedExamId" #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="contextBarSubtitle"
      >
        <template #status>
          <UiTag :tone="actionableCount > 0 ? 'orange' : 'green'" size="sm">
            {{ actionableCount > 0 ? `待处理 ${actionableCount}` : '暂无待办' }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadTasks">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
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
          pagination-mode="client"
          flat
          :columns="columns"
          :data-source="filteredTasks"
          :loading="loading"
          :page-size="20"
          :total="filteredTasks.length"
          row-key="reviewTaskId"
          size="middle"
          :expanded-row-keys="expandedRowKeys"
          empty-kind="first-run"
          empty-description="当前筛选下暂无仲裁任务"
          class="arbitration-table student-detail-table__data-table"
          @expand="handleExpandChange"
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
                <span class="arbitration-table__paper-primary">{{ record.paperDisplay.primaryText }}</span>
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
              <div class="operations-cell" @click.stop>
                <UiTextAction @click="goReviewDetail(record)">详情</UiTextAction>
                <UiTextAction
                  v-if="isActionableTask(record)"
                  tone="primary"
                  @click="goReviewWorkspace(record)"
                >
                  进入仲裁
                </UiTextAction>
              </div>
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
import type {
  ReviewTaskItemResponse,
} from '@/apis/mark/exam-review-task'
import type { BadgeTone, FilterField, UiSectionTabItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, onActivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
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
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages } from '@/utils/page-result'

defineOptions({ name: 'TeacherReviewArbitration' })

type StatusTabKey = 'all' | 'pending' | 'in-progress' | 'completed'

const router = useRouter()
const userStore = useUserStore()

const { selectedExamId } = useMarkExamContext()
const { contextBarTitle, contextBarSubtitle } = useExamJourneyContextBar('仲裁裁定')
const { refreshSnapshot } = useWorkspaceExamId()

const currentUserId = computed(() => userStore.userInfo.userId || '')
const allTasks = ref<ReviewTaskItemResponse[]>([])
const loading = ref(false)
const statusTab = ref<StatusTabKey>('pending')
const filterQuestion = ref('')
const filterTeacher = ref('')
const expandedRowKeys = ref<string[]>([])

const actionableCount = computed(() => {
  return allTasks.value.filter((item) => isActionableTask(item)).length
})

const pendingCount = computed(() => allTasks.value.filter((item) => item.status === 'PENDING').length)

const inProgressMineCount = computed(() => {
  return allTasks.value.filter(
    (item) => item.status === 'IN_PROGRESS' && item.assignedTeacherUserId === currentUserId.value,
  ).length
})

const completedCount = computed(() => {
  return allTasks.value.filter(
    (item) => item.status === 'APPROVED' || item.status === 'REJECTED',
  ).length
})

const avgAiRatio = computed(() => {
  const ratios = allTasks.value
    .map((item) => getSuggestedRatio(item))
    .filter((value): value is number => value !== null)
  if (ratios.length === 0) {
    return '—'
  }
  const sum = ratios.reduce((acc, value) => acc + value, 0)
  return `${Math.round(sum / ratios.length)}%`
})

const signalMetrics = computed((): SignalMetric[] => [
  {
    key: 'total',
    label: '仲裁总数',
    value: allTasks.value.length,
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
  { key: 'all', label: '全部', count: allTasks.value.length },
  { key: 'pending', label: '待处理', count: pendingCount.value, badgeTone: 'orange' },
  {
    key: 'in-progress',
    label: '复核中',
    count: inProgressMineCount.value,
    badgeTone: 'blue',
  },
  { key: 'completed', label: '已结案', count: completedCount.value, badgeTone: 'green' },
])

const questionOptions = computed(() => {
  const values = new Set<string>()
  allTasks.value.forEach((item) => values.add(item.questionNo))
  return Array.from(values)
    .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
    .map((value) => ({ label: `第 ${value} 题`, value }))
})

const teacherOptions = computed(() => {
  const names = new Set<string>()
  allTasks.value.forEach((item) => {
    const label = formatAssignedTeacher(item)
    if (label) {
      names.add(label)
    }
  })
  return Array.from(names).map((value) => ({ label: value, value }))
})

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
    key: 'teacher',
    type: 'select',
    label: '教师',
    placeholder: '全部教师',
    width: 160,
    minWidth: 160,
    allowClear: true,
    options: teacherOptions.value,
  },
])

const filterModel = computed({
  get: () => ({
    questionNo: filterQuestion.value,
    teacher: filterTeacher.value,
  }),
  set: (value: Record<string, unknown>) => {
    filterQuestion.value = String(value.questionNo ?? '')
    filterTeacher.value = String(value.teacher ?? '')
  },
})

const filteredTasks = computed(() => {
  let rows = allTasks.value
  if (statusTab.value === 'pending') {
    rows = rows.filter((item) => item.status === 'PENDING')
  } else if (statusTab.value === 'in-progress') {
    rows = rows.filter(
      (item) =>
        item.status === 'IN_PROGRESS' && item.assignedTeacherUserId === currentUserId.value,
    )
  } else if (statusTab.value === 'completed') {
    rows = rows.filter((item) => item.status === 'APPROVED' || item.status === 'REJECTED')
  }
  if (filterQuestion.value) {
    rows = rows.filter((item) => item.questionNo === filterQuestion.value)
  }
  if (filterTeacher.value) {
    rows = rows.filter((item) => formatAssignedTeacher(item) === filterTeacher.value)
  }
  return rows
})

const columns: ColumnType<ReviewTaskItemResponse>[] = [
  { title: '题号', key: 'questionNo', width: 96, align: 'center' },
  { title: '考生', key: 'student', width: 140 },
  { title: '答卷', key: 'paperDisplay', width: 160 },
  { title: '满分', key: 'fullScore', width: 72, align: 'right' },
  { title: 'AI 建议分', key: 'aiScore', width: 120, align: 'right' },
  { title: '指派教师', key: 'assignedTeacher', width: 120 },
  { title: '状态', key: 'status', width: 96, align: 'center' },
  { title: '更新时间', key: 'updateTime', width: 168 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return REVIEW_TASK_STATUS_TONE[value]
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return ReviewTaskStatusDescription[value]
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

/** 待领取或当前教师进行中的任务可进入仲裁工作台。 */
function isActionableTask(record: ReviewTaskItemResponse): boolean {
  if (record.status === 'PENDING') {
    return true
  }
  return (
    record.status === 'IN_PROGRESS' && record.assignedTeacherUserId === currentUserId.value
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
}

function resetFilters(): void {
  filterQuestion.value = ''
  filterTeacher.value = ''
}

function handleExpandChange(expanded: boolean, record: ReviewTaskItemResponse): void {
  if (expanded) {
    expandedRowKeys.value = [record.reviewTaskId]
    return
  }
  expandedRowKeys.value = []
}

/**
 * 拉取题目复核仲裁全量任务：保留 PENDING 全量 + IN_PROGRESS 仅当前教师可见的业务规则，
 * 并补充已结案任务供 Tab 筛选。
 */
async function loadQuestionArbitrationTasks(): Promise<void> {
  if (!selectedExamId.value) {
    allTasks.value = []
    return
  }
  const examId = selectedExamId.value
  const [pendingItems, inProgressItems, approvedItems, rejectedItems] = await Promise.all([
    readAllPages(
      (pageNum) =>
        listReviewTasks({
          examId,
          reviewType: ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
          status: ReviewTaskStatusCode.PENDING,
          pageNum,
          pageSize: 100,
        }),
      '题目复核仲裁任务加载失败',
    ),
    readAllPages(
      (pageNum) =>
        listReviewTasks({
          examId,
          reviewType: ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
          status: ReviewTaskStatusCode.IN_PROGRESS,
          pageNum,
          pageSize: 100,
        }),
      '题目复核仲裁任务加载失败',
    ),
    readAllPages(
      (pageNum) =>
        listReviewTasks({
          examId,
          reviewType: ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
          status: ReviewTaskStatusCode.APPROVED,
          pageNum,
          pageSize: 100,
        }),
      '题目复核仲裁任务加载失败',
    ),
    readAllPages(
      (pageNum) =>
        listReviewTasks({
          examId,
          reviewType: ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
          status: ReviewTaskStatusCode.REJECTED,
          pageNum,
          pageSize: 100,
        }),
      '题目复核仲裁任务加载失败',
    ),
  ])
  const merged = new Map<string, ReviewTaskItemResponse>()
  pendingItems.forEach((item) => {
    merged.set(item.reviewTaskId, item)
  })
  inProgressItems.forEach((item) => {
    if (item.assignedTeacherUserId === currentUserId.value) {
      merged.set(item.reviewTaskId, item)
    }
  })
  approvedItems.forEach((item) => {
    merged.set(item.reviewTaskId, item)
  })
  rejectedItems.forEach((item) => {
    merged.set(item.reviewTaskId, item)
  })
  allTasks.value = Array.from(merged.values())
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  loading.value = true
  try {
    await loadQuestionArbitrationTasks()
  } catch (error) {
    showUserError(error, '题目复核仲裁任务加载失败')
  } finally {
    loading.value = false
  }
}

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

watch(
  selectedExamId,
  (value) => {
    if (value) {
      void loadTasks()
    } else {
      allTasks.value = []
    }
  },
  { immediate: true },
)

onActivated(() => {
  if (selectedExamId.value) {
    void loadTasks()
    void refreshSnapshot()
  }
})
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
