<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="复核任务中心">
        <template #actions>
          <UiButton
            v-if="canManageReviewerWrites"
            variant="outline"
            size="sm"
            @click="goBatchConfirm"
          >
            批量复核确认
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="examId" #signal>
      <SignalBand
        :metrics="hubSignalMetrics"
        variant="panel"
        compact
        @metric-click="handleHubSignalClick"
      />
    </template>

    <ExamSelectGateStrip v-if="!examId" body="缺少考试上下文，请从考试列表进入复核任务中心" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard flush>
        <template #toolbar>
          <UiFilterBar
            v-model="filterModel"
            :fields="statusFilterFields"
            variant="plain"
            show-labels
            search-text="查询"
            actions-align="end"
            @search="onFilterChange"
            @reset="resetStatusFilter"
          />
        </template>

        <UiEmpty
          size="sm"
          v-if="!loading && rows.length === 0"
          description="当前筛选下暂无复核任务"
          class="review-task-hub__empty"
        />
        <UiDataTable
          pagination-mode="server"
          row-key="reviewTaskId"
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :total="pagination.total"
          flat
          size="middle"
          @page-change="onPageChange"
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
            <template v-if="column.key === 'paper'">
              <div class="review-task-hub__paper-cell">
                <span class="review-task-hub__paper-primary">{{
                  record.paperDisplay.primaryText
                }}</span>
                <span
                  v-if="record.paperDisplay.secondaryText"
                  class="review-task-hub__paper-secondary"
                >
                  {{ record.paperDisplay.secondaryText }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'question'">
              <UiTag tone="blue" size="sm">题 {{ record.questionNo }}</UiTag>
            </template>
            <template v-else-if="column.key === 'reviewType'">
              <UiTag :tone="reviewTypeTone(record.reviewType)" size="sm">
                {{ reviewTypeLabel(record.reviewType) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'gradeSource'">
              <UiTag :tone="gradeSourceTone(record.gradeSource)" size="sm">
                {{ gradeSourceLabel(record.gradeSource) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'aiScore'">
              <span v-if="record.aiScore != null">{{ record.aiScore }}</span>
              <UiTag v-else tone="gray" size="sm">未派生</UiTag>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="reviewStatusTone(record.status)" size="sm">
                {{ reviewStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'assignedTeacherName'">
              {{ record.assignedTeacherName || '未指派' }}
            </template>
            <template v-else-if="column.key === 'updateTime'">
              {{ formatDateTime(record.updateTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildReviewTaskRowActions(record)"
                split
                @action="() => enterReview(record)"
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
import type {
  GradeSourceCode,
  ReviewTaskItemResponse,
  ReviewTaskTypeCode,
} from '@/apis/mark/exam-review-task'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import {
  GRADE_SOURCE_TONE,
  GradeSourceDescription,
  listReviewTasks,
  REVIEW_TASK_HUB_STATUS_FILTER_OPTIONS,
  REVIEW_TASK_STATUS_TONE,
  ReviewTaskStatusCode,
  ReviewTaskStatusDescription,
  ReviewTaskTypeDescription,
  ReviewTaskTypeTone,
} from '@/apis/mark/exam-review-task'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ReviewTaskHub' })

const router = useRouter()
const { examId } = useWorkspaceExamId()
const { refreshing: workbenchRefreshing, snapshot } = useMarkWorkbenchContext()

const loading = ref(false)
const rows = ref<ReviewTaskItemResponse[]>([])
// MVR-332：列表/制卷摘要下发 canManageReviewerWrites，缺声明会导致写闸 ReferenceError
const canManageReviewerWrites = ref(false)
const statusFilter = ref<ReviewTaskStatusCode>(ReviewTaskStatusCode.PENDING)

const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const statusFilterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    label: '任务状态',
    placeholder: '任务状态',
    width: 160,
    minWidth: 160,
    options: REVIEW_TASK_HUB_STATUS_FILTER_OPTIONS,
  },
]

const filterModel = computed<Record<string, unknown>>({
  get: () => ({ status: statusFilter.value }),
  set: (value) => {
    if (
      value.status === ReviewTaskStatusCode.PENDING
      || value.status === ReviewTaskStatusCode.IN_PROGRESS
      || value.status === ReviewTaskStatusCode.APPROVED
      || value.status === ReviewTaskStatusCode.REJECTED
      || value.status === ReviewTaskStatusCode.INVALIDATED
    ) {
      statusFilter.value = value.status
    }
  },
})

const hubSignalMetrics = computed((): SignalMetric[] => {
  const progress = snapshot.value?.markingProgress
  const pending = progress?.pendingReviewTaskCount ?? 0
  const inProgress = progress?.inProgressReviewTaskCount ?? 0
  return [
    {
      key: 'filtered',
      label: '筛选结果',
      value: pagination.total,
      unit: '条',
      tone: 'blue',
      helper: statusFilterLabel.value,
    },
    {
      key: 'pending',
      label: '待复核',
      value: pending,
      unit: '条',
      tone: pending > 0 ? 'orange' : 'green',
      clickable: pending > 0,
      helper: pending > 0 ? '点击切换待复核' : '暂无待复核',
    },
    {
      key: 'in-progress',
      label: '复核中',
      value: inProgress,
      unit: '条',
      tone: inProgress > 0 ? 'blue' : 'gray',
      clickable: inProgress > 0,
      helper: inProgress > 0 ? '点击切换复核中' : '暂无进行中',
    },
  ]
})

function handleHubSignalClick(key: string): void {
  if (key === 'pending' && (snapshot.value?.markingProgress?.pendingReviewTaskCount ?? 0) > 0) {
    statusFilter.value = ReviewTaskStatusCode.PENDING
    onFilterChange()
    return
  }
  if (
    key === 'in-progress'
    && (snapshot.value?.markingProgress?.inProgressReviewTaskCount ?? 0) > 0
  ) {
    statusFilter.value = ReviewTaskStatusCode.IN_PROGRESS
    onFilterChange()
  }
}

function resetStatusFilter(): void {
  statusFilter.value = ReviewTaskStatusCode.PENDING
  onFilterChange()
}

const columns: ColumnType<ReviewTaskItemResponse>[] = [
  { title: '答卷', key: 'paper', width: 220, ellipsis: true, fixed: 'left' },
  { title: '题号', key: 'question', width: 88 },
  { title: '复核类型', key: 'reviewType', width: 140 },
  { title: '来源', key: 'gradeSource', width: 100 },
  { title: 'AI 建议分', key: 'aiScore', width: 96, align: 'right' },
  { title: '状态', key: 'status', width: 96 },
  { title: '指派教师', key: 'assignedTeacherName', width: 120 },
  { title: '更新时间', key: 'updateTime', width: 160 },
  { title: '操作', key: 'actions', width: 100 },
]

const statusFilterLabel = computed(() => reviewStatusLabel(statusFilter.value))

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return REVIEW_TASK_STATUS_TONE[value]
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return strictEnumLabel(ReviewTaskStatusDescription, value, '阅卷任务状态')
}

function reviewTypeLabel(value: ReviewTaskTypeCode): string {
  return strictEnumLabel(ReviewTaskTypeDescription, value, '阅卷任务类型')
}

function reviewTypeTone(value: ReviewTaskTypeCode): BadgeTone {
  const color = ReviewTaskTypeTone[value]
  if (color === 'green') {
    return 'green'
  }
  if (color === 'purple') {
    return 'purple'
  }
  return 'blue'
}

function gradeSourceLabel(source: GradeSourceCode): string {
  return strictEnumLabel(GradeSourceDescription, source, '成绩来源')
}

function gradeSourceTone(source: GradeSourceCode): BadgeTone {
  return GRADE_SOURCE_TONE[source]
}

async function loadTasks(): Promise<void> {
  if (!examId.value) {
    return
  }
  loading.value = true
  try {
    const [result, layoutSummary] = await Promise.all([
      listReviewTasks({
        examId: examId.value,
        status: statusFilter.value,
        excludeArbitration: true,
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
      }),
      // MVR-291：空列表时 list 项无能力位，用制卷摘要 canManageReviewerWrites 补齐
      getExamLayoutQuestionSummary(examId.value).catch(() => null),
    ])
    const records = result.list
    rows.value = records
    pagination.total = result.total
    // MVR-328：列表有项时仅认行级 can===true；空列表用制卷摘要 can===true 补齐
    canManageReviewerWrites.value
      = records.length > 0
        ? records[0].canManageReviewerWrites === true
        : layoutSummary?.canManageReviewerWrites === true
  } catch (error) {
    rows.value = []
    pagination.total = 0
    canManageReviewerWrites.value = false
    showUserError(error, '复核任务列表加载失败')
  } finally {
    loading.value = false
  }
}

function onPageChange(page: { current: number, pageSize: number }): void {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  void loadTasks()
}

function onFilterChange(): void {
  pagination.current = 1
  void loadTasks()
}

function buildReviewTaskRowActions(record: ReviewTaskItemResponse): UiTableRowActionItem[] {
  return [
    {
      key: 'enter',
      label: record.status === ReviewTaskStatusCode.INVALIDATED ? '查看详情' : '进入复核',
      tone: record.status === ReviewTaskStatusCode.INVALIDATED ? 'default' : 'primary',
    },
  ]
}

function enterReview(record: ReviewTaskItemResponse): void {
  if (!examId.value) {
    return
  }
  if (record.status === ReviewTaskStatusCode.INVALIDATED) {
    void router.push({
      name: 'TeacherExamWorkspaceReviewTaskDetail',
      params: { examId: examId.value, taskId: record.reviewTaskId },
      query: { source: 'review' },
    })
    return
  }
  // MVR-394：进入复核写工作台仅认行级 canManageReviewerWrites===true（BE 评阅写∧ACTIVE）
  if (record.canManageReviewerWrites !== true) {
    void message.warning('当前账号无本场复核写权限，无法进入复核工作台')
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceReviewWorkspace',
    params: { examId: examId.value, taskId: record.reviewTaskId },
    query: { source: 'review' },
  })
}

function goBatchConfirm(): void {
  if (!examId.value) {
    return
  }
  // MVR-291/394：无写能力不得导航进批量确认页（页内虽叠闸，避免假入口）
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无批量复核写权限')
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceReviewBatchConfirm',
    params: { examId: examId.value },
  })
}

watch(
  examId,
  (next) => {
    pagination.current = 1
    if (next) {
      void loadTasks()
    } else {
      rows.value = []
      pagination.total = 0
      canManageReviewerWrites.value = false
    }
  },
  { immediate: true },
)

onActivated(() => {
  if (examId.value) {
    void loadTasks()
  }
})

watch(workbenchRefreshing, (isRefreshing, wasRefreshing) => {
  if (wasRefreshing && !isRefreshing && examId.value) {
    void loadTasks()
  }
})
</script>

<style lang="scss" scoped>
.review-task-hub__empty {
  padding: var(--dp-space-3, 12px) 0;
}

.review-task-hub__paper-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.review-task-hub__paper-primary {
  font-weight: 500;
  color: var(--dp-text);
}

.review-task-hub__paper-secondary {
  font-size: 12px;
  color: var(--dp-text-tertiary);
}
</style>
