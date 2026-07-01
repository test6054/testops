<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="复核任务">
        <template #toolbar>
          <UiFilterBar
            v-if="examId"
            v-model="filterModel"
            :fields="statusFilterFields"
            variant="panel"
            show-labels
            search-text="查询"
            actions-align="end"
            @search="onFilterChange"
            @reset="resetStatusFilter"
          >
            <template #actions>
              <UiButton variant="outline" size="sm" @click="goBatchConfirm">
                批量复核确认
              </UiButton>
              <UiButton variant="outline" size="sm" :loading="loading" @click="loadTasks">
                <template #icon><ReloadOutlined /></template>
                刷新
              </UiButton>
            </template>
          </UiFilterBar>
        </template>
      </ContextBar>
    </template>

    <template v-if="examId" #signal>
      <SignalBand :metrics="hubSignalMetrics" compact @metric-click="handleHubSignalClick" />
    </template>

    <UiEmpty v-if="!examId" description="缺少考试上下文，请从考试列表进入" />

    <UiCard v-else bordered>
      <UiEmpty
        v-if="!loading && rows.length === 0"
        description="当前筛选下暂无复核任务"
        class="review-task-hub__empty"
      />
      <UiDataTable
        pagination-mode="server"
        row-key="reviewTaskId"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pagination.total"
        :page-num="pagination.current"
        :page-size="pagination.pageSize"
        flat
        size="middle"
        @page-change="onPageChange"
      >
        <template
          #bodyCell="{
            column,
            record,
          }: {
            column: ColumnType<ReviewTaskItemVO>
            record: ReviewTaskItemVO
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
            <UiTextAction
              :tone="record.status === 'INVALIDATED' ? 'default' : 'primary'"
              @click="enterReview(record)"
            >
              {{ record.status === 'INVALIDATED' ? '查看详情' : '进入复核' }}
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  GradeSourceCode,
  ReviewTaskItemVO,
  ReviewTaskStatusCode,
  ReviewTaskTypeCode,
} from '@/apis/mark/exam-review-task'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  GRADE_SOURCE_LABEL,
  GRADE_SOURCE_TONE,
  listReviewTasks,
  REVIEW_TASK_STATUS_LABEL,
  REVIEW_TASK_STATUS_TONE,
  REVIEW_TASK_TYPE_META,
  validateReviewTaskItemContract,
} from '@/apis/mark/exam-review-task'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ReviewTaskHub' })

const router = useRouter()
const { examId } = useWorkspaceExamId()
const { refreshing: workbenchRefreshing, snapshot } = useMarkWorkbenchContext()

const loading = ref(false)
const rows = ref<ReviewTaskItemVO[]>([])
const statusFilter = ref<ReviewTaskStatusCode>('PENDING')

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

const statusFilterOptions = [
  { label: '待复核', value: 'PENDING' as ReviewTaskStatusCode },
  { label: '复核中', value: 'IN_PROGRESS' as ReviewTaskStatusCode },
  { label: '已失效', value: 'INVALIDATED' as ReviewTaskStatusCode },
]

const statusFilterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    label: '任务状态',
    placeholder: '任务状态',
    width: 160,
    minWidth: 160,
    options: statusFilterOptions,
  },
]

const filterModel = computed<Record<string, unknown>>({
  get: () => ({ status: statusFilter.value }),
  set: (value) => {
    statusFilter.value = value.status as ReviewTaskStatusCode
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
    statusFilter.value = 'PENDING'
    onFilterChange()
    return
  }
  if (
    key === 'in-progress'
    && (snapshot.value?.markingProgress?.inProgressReviewTaskCount ?? 0) > 0
  ) {
    statusFilter.value = 'IN_PROGRESS'
    onFilterChange()
  }
}

function resetStatusFilter(): void {
  statusFilter.value = 'PENDING'
  onFilterChange()
}

const columns: ColumnType<ReviewTaskItemVO>[] = [
  { title: '答卷', key: 'paper', width: 200 },
  { title: '题号', key: 'question', width: 88 },
  { title: '复核类型', key: 'reviewType', width: 140 },
  { title: '来源', key: 'gradeSource', width: 100 },
  { title: 'AI 建议分', key: 'aiScore', width: 96 },
  { title: '状态', key: 'status', width: 96 },
  { title: '指派教师', key: 'assignedTeacherName', width: 120 },
  { title: '更新时间', key: 'updateTime', width: 160 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

const statusFilterLabel = computed(() => reviewStatusLabel(statusFilter.value))

function reviewStatusTone(value: ReviewTaskStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_TASK_STATUS_TONE, value, '复核任务状态')
}

function reviewStatusLabel(value: ReviewTaskStatusCode): string {
  return strictEnumLabel(REVIEW_TASK_STATUS_LABEL, value, '复核任务状态')
}

function reviewTypeLabel(value: ReviewTaskTypeCode): string {
  return REVIEW_TASK_TYPE_META[value].label
}

function reviewTypeTone(value: ReviewTaskTypeCode): BadgeTone {
  const color = REVIEW_TASK_TYPE_META[value].color
  if (color === 'green') {
    return 'green'
  }
  if (color === 'purple') {
    return 'purple'
  }
  return 'blue'
}

function gradeSourceLabel(source: GradeSourceCode): string {
  return strictEnumLabel(GRADE_SOURCE_LABEL, source, '批改来源')
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
    const result = await listReviewTasks({
      examId: examId.value,
      status: statusFilter.value,
      excludeArbitration: true,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    const records = readPageList(result, '复核任务列表加载失败')
    records.forEach(validateReviewTaskItemContract)
    rows.value = records
    pagination.total = readPageTotal(result)
  } catch (error) {
    rows.value = []
    pagination.total = 0
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

function enterReview(record: ReviewTaskItemVO): void {
  if (!examId.value) {
    return
  }
  if (record.status === 'INVALIDATED') {
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
  padding: 40px 0;
}

.review-task-hub__paper-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.review-task-hub__paper-primary {
  font-weight: 500;
  color: var(--ant-color-text);
}

.review-task-hub__paper-secondary {
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}
</style>
