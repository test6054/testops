<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="复核任务中心"
        :subtitle="examId && !listLoadFailed ? `${pagination.total} 条` : undefined"
      >
        <template #actions>
          <UiButton
            v-if="canManageReviewerWrites === true"
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
        layout="spotlight"
        variant="panel"
        compact
        @metric-click="handleHubSignalClick"
      />
    </template>

    <ExamSelectGateStrip v-if="!examId" body="缺少考试上下文，请从考试列表进入复核任务中心" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard flush>
        <UiAlertStrip
          v-if="listLoadFailed"
          tone="error"
          title="复核任务列表加载失败"
          description="当前列表快照已撤销。请切换筛选、考试范围或离开后重新进入本页。"
          dense
        />
        <UiAlertStrip
          v-else-if="writeCapabilityLoadFailed"
          tone="error"
          title="复核写权限状态加载失败"
          description="当前筛选没有任务，但服务端写能力位不可用；批量确认入口已关闭。"
          dense
        />
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
          v-if="!listLoadFailed && !loading && rows.length === 0"
          description="当前筛选下暂无复核任务"
          class="review-task-hub__empty"
        />
        <UiDataTable
          v-if="!listLoadFailed"
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
              <UiTag :tone="ReviewTaskTypeTone[record.reviewType]" size="sm">
                {{ strictEnumLabel(ReviewTaskTypeDescription, record.reviewType, '阅卷任务类型') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'gradeSource'">
              <UiTag :tone="GRADE_SOURCE_TONE[record.gradeSource]" size="sm">
                {{ strictEnumLabel(GradeSourceDescription, record.gradeSource, '成绩来源') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'aiScore'">
              <span v-if="record.aiScore != null">{{ record.aiScore }}</span>
              <UiTag v-else tone="gray" size="sm">未派生</UiTag>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="REVIEW_TASK_STATUS_TONE[record.status]" size="sm">
                {{ strictEnumLabel(ReviewTaskStatusDescription, record.status, '阅卷任务状态') }}
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
                :max-visible="2"
                align="end"
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
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ReviewTaskItemResponse } from '@/apis/mark/exam-review-task'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
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
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
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
const listLoadFailed = ref(false)
const writeCapabilityLoadFailed = ref(false)
let tasksLoadGeneration = 0
const rows = ref<ReviewTaskItemResponse[]>([])
// MVR-332：列表/制卷摘要下发 canManageReviewerWrites，缺声明会导致写闸 ReferenceError
const canManageReviewerWrites = ref(false)
const statusFilter = ref<ReviewTaskStatusCode>(ReviewTaskStatusCode.PENDING)
const statusFilterDraft = ref<ReviewTaskStatusCode>(ReviewTaskStatusCode.PENDING)

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
  get: () => ({ status: statusFilterDraft.value }),
  set: (value) => {
    if (
      value.status === ReviewTaskStatusCode.PENDING
      || value.status === ReviewTaskStatusCode.IN_PROGRESS
      || value.status === ReviewTaskStatusCode.APPROVED
      || value.status === ReviewTaskStatusCode.REJECTED
      || value.status === ReviewTaskStatusCode.INVALIDATED
    ) {
      statusFilterDraft.value = value.status
    }
  },
})

const hubSignalMetrics = computed((): SignalMetric[] => {
  const progress = snapshot.value?.markingProgress
  const pending = progress?.pendingReviewTaskCount
  const inProgress = progress?.inProgressReviewTaskCount
  return [
    {
      key: 'pending',
      label: '待复核',
      value: pending == null ? '—' : pending,
      unit: pending == null ? undefined : '条',
      tone: pending == null ? 'gray' : pending > 0 ? 'orange' : 'green',
      emphasis: 'primary',
      actionLabel: pending != null && pending > 0 ? '处理待复核' : undefined,
      clickable: pending != null && pending > 0,
      helper: pending == null ? '工作台快照不可用' : pending > 0 ? '点击切换待复核' : '暂无待复核',
    },
    {
      key: 'in-progress',
      label: '复核中',
      value: inProgress == null ? '—' : inProgress,
      unit: inProgress == null ? undefined : '条',
      tone: inProgress != null && inProgress > 0 ? 'blue' : 'gray',
      emphasis: 'secondary',
      clickable: inProgress != null && inProgress > 0,
      helper: inProgress == null ? '工作台快照不可用' : inProgress > 0 ? '点击切换复核中' : '暂无进行中',
    },
    {
      key: 'filtered',
      label: '筛选结果',
      value: listLoadFailed.value ? '—' : pagination.total,
      unit: listLoadFailed.value ? undefined : '条',
      tone: listLoadFailed.value ? 'red' : 'blue',
      emphasis: 'secondary',
      helper: listLoadFailed.value ? '列表加载失败' : statusFilterLabel.value,
    },
  ]
})

function handleHubSignalClick(key: string): void {
  const pendingCount = snapshot.value?.markingProgress?.pendingReviewTaskCount
  const inProgressCount = snapshot.value?.markingProgress?.inProgressReviewTaskCount
  if (key === 'pending' && pendingCount != null && pendingCount > 0) {
    statusFilterDraft.value = ReviewTaskStatusCode.PENDING
    statusFilter.value = ReviewTaskStatusCode.PENDING
    onFilterChange()
    return
  }
  if (
    key === 'in-progress'
    && inProgressCount != null
    && inProgressCount > 0
  ) {
    statusFilterDraft.value = ReviewTaskStatusCode.IN_PROGRESS
    statusFilter.value = ReviewTaskStatusCode.IN_PROGRESS
    onFilterChange()
  }
}

function resetStatusFilter(): void {
  statusFilterDraft.value = ReviewTaskStatusCode.PENDING
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
  { title: '主行动', key: 'actions', width: 120, align: 'right' },
]

const statusFilterLabel = computed(() =>
  strictEnumLabel(ReviewTaskStatusDescription, statusFilter.value, '阅卷任务状态'),
)

/** 按考试、筛选与分页代际读取复核队列，并同步服务端写能力位。 */
async function loadTasks(): Promise<void> {
  if (!examId.value) {
    return
  }
  const currentExamId = examId.value
  const generation = ++tasksLoadGeneration
  loading.value = true
  try {
    // MVR-980：先拉列表；空列表再用制卷摘要补齐 canManageReviewerWrites（禁止静默 catch 与损坏赋值）
    const result = await listReviewTasks({
      examId: currentExamId,
      status: statusFilter.value,
      excludeArbitration: true,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    if (generation !== tasksLoadGeneration || examId.value !== currentExamId) {
      return
    }
    const records = result.list
    rows.value = records
    pagination.total = result.total
    listLoadFailed.value = false
    writeCapabilityLoadFailed.value = false
    // MVR-328：列表有项时仅认行级 can===true；空列表用制卷摘要 can===true 补齐
    if (records.length > 0) {
      canManageReviewerWrites.value = records[0].canManageReviewerWrites === true
    } else {
      try {
        const layoutSummary = await getExamLayoutQuestionSummary(currentExamId)
        if (generation !== tasksLoadGeneration || examId.value !== currentExamId) {
          return
        }
        canManageReviewerWrites.value = layoutSummary.canManageReviewerWrites === true
      } catch (layoutError) {
        if (generation !== tasksLoadGeneration || examId.value !== currentExamId) {
          return
        }
        canManageReviewerWrites.value = false
        writeCapabilityLoadFailed.value = true
        showUserError(layoutError, '复核写权限能力位加载失败，写入口暂不可用')
      }
    }
  } catch (error) {
    if (generation !== tasksLoadGeneration || examId.value !== currentExamId) {
      return
    }
    rows.value = []
    pagination.total = 0
    listLoadFailed.value = true
    writeCapabilityLoadFailed.value = false
    canManageReviewerWrites.value = false
    showUserError(error, '复核任务列表加载失败')
  } finally {
    if (generation === tasksLoadGeneration) {
      loading.value = false
    }
  }
}

function onPageChange(page: { current: number, pageSize: number }): void {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  void loadTasks()
}

function onFilterChange(): void {
  statusFilter.value = statusFilterDraft.value
  pagination.current = 1
  void loadTasks()
}

function buildReviewTaskRowActions(record: ReviewTaskItemResponse): UiTableRowActionItem[] {
  const readOnlyTask
    = record.status === ReviewTaskStatusCode.INVALIDATED
      || record.status === ReviewTaskStatusCode.APPROVED
      || record.status === ReviewTaskStatusCode.REJECTED
      || record.canManageReviewerWrites !== true
  return [
    {
      key: 'enter',
      label: readOnlyTask ? '查看详情' : '进入复核',
      tone: readOnlyTask ? 'default' : 'primary',
    },
  ]
}

function enterReview(record: ReviewTaskItemResponse): void {
  if (!examId.value) {
    return
  }
  if (
    record.status === ReviewTaskStatusCode.INVALIDATED
    || record.status === ReviewTaskStatusCode.APPROVED
    || record.status === ReviewTaskStatusCode.REJECTED
    || record.canManageReviewerWrites !== true
  ) {
    void router.push({
      name: 'TeacherExamWorkspaceReviewTaskDetail',
      params: { examId: examId.value, taskId: record.reviewTaskId },
      query: { source: 'review' },
    })
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
    tasksLoadGeneration += 1
    pagination.current = 1
    listLoadFailed.value = false
    writeCapabilityLoadFailed.value = false
    if (next) {
      void loadTasks()
    } else {
      rows.value = []
      pagination.total = 0
      canManageReviewerWrites.value = false
      loading.value = false
    }
  },
  { immediate: true },
)

const skipFirstActivatedLoad = ref(true)

onActivated(() => {
  if (skipFirstActivatedLoad.value) {
    skipFirstActivatedLoad.value = false
    return
  }
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
  padding: var(--dp-space-component) 0;
}

.review-task-hub__paper-cell {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  min-width: 0;
}

.review-task-hub__paper-primary {
  font-weight: 500;
  color: var(--dp-text-primary);
}

.review-task-hub__paper-secondary {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
</style>
