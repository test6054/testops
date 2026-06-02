<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="arbitration-page__context">
        <div class="arbitration-page__context-left">
          <a-select
            :value="selectedExamId"
            class="arbitration-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag :tone="pendingTotal > 0 ? 'red' : 'green'" size="sm">
            {{ pendingTotal > 0 ? `${pendingTotal} 条待仲裁` : '暂无待办' }}
          </UiTag>
        </div>
        <div class="arbitration-page__context-right">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadTasks"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看仲裁任务"
      class="arbitration-page__empty"
    />

    <template v-else>
      <UiStatPanel
        :items="kpiItems"
        :columns="5"
        variant="grid"
        compact
        class="arbitration-page__kpi"
      />

      <UiCard class="arbitration-page__list-card">
        <template #title>
          <ExclamationCircleOutlined />
          <span>复核驳回任务</span>
          <UiBadge :tone="reviewTasks.length > 0 ? 'red' : 'green'">
            {{ reviewTasks.length }}
          </UiBadge>
        </template>
        <UiErrorRetryPanel
          v-if="tasksLoadError"
          :error="tasksLoadError"
          title="驳回任务加载失败"
          :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
          compact
          @retry="loadTasks"
        />
        <UiEmpty v-else-if="!loading && reviewTasks.length === 0" description="当前无驳回任务" />
        <UiDataTable
          v-else
          :columns="reviewColumns"
          :data-source="reviewTasks"
          :loading="loading"
          :page-size="20"
          :total="reviewTasks.length"
          row-key="reviewTaskId"
          size="middle"
          flat
          class="arbitration-table"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'paperDisplay'">
              <div class="arbitration-table__paper-cell">
                <a-typography-text strong :content="reviewTasks[index].paperDisplay.primaryText" />
                <span
                  v-if="reviewTasks[index].paperDisplay.secondaryText"
                  class="arbitration-table__hint"
                >
                  {{ reviewTasks[index].paperDisplay.secondaryText }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'questionNo'">
              <UiTag tone="blue" size="sm">{{ reviewTasks[index].questionNo }}</UiTag>
            </template>
            <template v-else-if="column.key === 'fullScore'">
              {{ reviewTasks[index].fullScore }}
            </template>
            <template v-else-if="column.key === 'aiScore'">
              <template v-if="reviewTasks[index].aiScore != null">
                <strong>{{ reviewTasks[index].aiScore }}</strong>
                <UiTag
                  v-if="getSuggestedRatio(reviewTasks[index]) !== null"
                  :tone="getSuggestedRatioTone(reviewTasks[index])"
                  size="sm"
                  class="ai-score-ratio-tag"
                >
                  {{ getSuggestedRatio(reviewTasks[index]) }}%
                </UiTag>
              </template>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'assignedTeacherUserId'">
              <span v-if="reviewTasks[index].assignedTeacherUserId">
                <UserOutlined class="mini-icon" />
                {{
                  reviewTasks[index].assignedTeacherUserId === currentUserId
                    ? '我'
                    : reviewTasks[index].assignedTeacherUserId
                }}
              </span>
              <span v-else class="muted">未指派</span>
            </template>
            <template v-else-if="column.key === 'updateTime'">
              {{ formatDateTime(reviewTasks[index].updateTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton size="sm" @click="goReviewWorkspace(reviewTasks[index])">仲裁批阅</UiButton>
                <UiButton size="sm" variant="ghost" @click="goReviewDetail(reviewTasks[index])">
                  详情
                </UiButton>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard class="arbitration-page__list-card">
        <template #title>
          <ExclamationCircleOutlined />
          <span>整卷双评仲裁</span>
          <UiBadge :tone="arbitrationTasks.length > 0 ? 'red' : 'green'">
            {{ arbitrationTasks.length }}
          </UiBadge>
        </template>
        <UiErrorRetryPanel
          v-if="markingTasksLoadError"
          :error="markingTasksLoadError"
          title="双评仲裁任务加载失败"
          :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
          compact
          @retry="loadTasks"
        />
        <UiEmpty
          v-else-if="!loading && arbitrationTasks.length === 0"
          description="当前无双评仲裁任务"
        />
        <UiDataTable
          v-else
          :columns="markingColumns"
          :data-source="arbitrationTasks"
          :loading="loading"
          :page-size="20"
          :total="arbitrationTasks.length"
          row-key="id"
          size="middle"
          flat
          class="arbitration-table"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'paperDisplay'">
              <div class="arbitration-table__paper-cell">
                <a-typography-text strong :content="arbitrationTasks[index].paperDisplay.primaryText" />
                <span
                  v-if="arbitrationTasks[index].paperDisplay.secondaryText"
                  class="arbitration-table__hint"
                >
                  {{ arbitrationTasks[index].paperDisplay.secondaryText }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'reviewRound'">
              <UiTag tone="purple" size="sm">第 {{ arbitrationTasks[index].reviewRound }} 轮</UiTag>
            </template>
            <template v-else-if="column.key === 'taskStatus'">
              <UiTag
                :tone="MARKING_TASK_STATUS_TONE[arbitrationTasks[index].taskStatus]"
                size="sm"
              >
                {{ MARKING_TASK_STATUS_LABEL[arbitrationTasks[index].taskStatus] }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'reviewerUserId'">
              <span v-if="arbitrationTasks[index].reviewerUserId">
                <UserOutlined class="mini-icon" />
                {{
                  arbitrationTasks[index].reviewerUserId === currentUserId
                    ? '我'
                    : arbitrationTasks[index].reviewerName || arbitrationTasks[index].reviewerUserId
                }}
              </span>
              <span v-else class="muted">未指派</span>
            </template>
            <template v-else-if="column.key === 'allocatedAt'">
              {{ formatDateTime(arbitrationTasks[index].allocatedAt) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton size="sm" @click="goMarkingWorkspace(arbitrationTasks[index])">
                  整卷仲裁
                </UiButton>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ReviewTaskItemVO } from '@/apis/mark/exam'
import type { MarkingTaskVO } from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult } from '@/types'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  MARKING_TASK_STATUS_LABEL,
  MARKING_TASK_STATUS_TONE,
} from '@/apis/mark/marking-organization'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import http from '@/config/axios'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList } from '@/utils/page-result'

defineOptions({ name: 'TeacherReviewArbitration' })

const ARBITRATION_MARKING_PAGE_SIZE = 200

const router = useRouter()
const userStore = useUserStore()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const currentUserId = computed(() => userStore.userInfo.userId || '')

const markTaskStore = useMarkTaskStore()
const { reviewTasks, reviewTasksLoading: loading } = storeToRefs(markTaskStore)
const tasksLoadError = ref<Error | null>(null)
const markingTasksLoadError = ref<Error | null>(null)
const arbitrationTasks = ref<MarkingTaskVO[]>([])

const pendingTotal = computed(() => reviewTasks.value.length + arbitrationTasks.value.length)

const reviewColumns: ColumnType<ReviewTaskItemVO>[] = [
  { title: '答卷', key: 'paperDisplay', width: 180 },
  { title: '题号', key: 'questionNo', width: 100 },
  { title: '满分', key: 'fullScore', width: 80 },
  { title: 'AI 评分', key: 'aiScore', width: 140 },
  { title: '指派教师', key: 'assignedTeacherUserId', width: 160 },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const markingColumns: ColumnType<MarkingTaskVO>[] = [
  { title: '答卷', key: 'paperDisplay', width: 180 },
  { title: '轮次', key: 'reviewRound', width: 100 },
  { title: '状态', key: 'taskStatus', width: 120 },
  { title: '仲裁教师', key: 'reviewerUserId', width: 160 },
  { title: '分配时间', key: 'allocatedAt', width: 170 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

const kpiItems = computed(() => {
  const rejectedTotal = reviewTasks.value.length
  const dualReviewTotal = arbitrationTasks.value.length
  const total = rejectedTotal + dualReviewTotal
  const assignedToMe = currentUserId.value
    ? arbitrationTasks.value.filter((t) => t.reviewerUserId === currentUserId.value).length
    : 0
  const unassignedReview = reviewTasks.value.filter((t) => !t.assignedTeacherUserId).length
  return [
    {
      key: 'total',
      label: '待仲裁总数',
      value: total,
      unit: '条',
      tone: (total > 0 ? 'red' : 'green') as BadgeTone,
      helper: total > 0 ? '含复核驳回与整卷双评' : '已全部清空',
    },
    {
      key: 'rejected',
      label: '复核驳回',
      value: rejectedTotal,
      unit: '条',
      tone: (rejectedTotal > 0 ? 'orange' : 'gray') as BadgeTone,
      helper: rejectedTotal > 0 ? 'AI/客观题复核驳回' : '-',
    },
    {
      key: 'dualReview',
      label: '整卷双评',
      value: dualReviewTotal,
      unit: '条',
      tone: (dualReviewTotal > 0 ? 'purple' : 'gray') as BadgeTone,
      helper: dualReviewTotal > 0 ? 'round-3 仲裁任务' : '-',
    },
    {
      key: 'assignedToMe',
      label: '指派给我',
      value: assignedToMe,
      unit: '条',
      tone: (assignedToMe > 0 ? 'blue' : 'gray') as BadgeTone,
      helper: assignedToMe > 0 ? '整卷双评仲裁待办' : '当前无双评待办',
    },
    {
      key: 'unassigned',
      label: '驳回未指派',
      value: unassignedReview,
      unit: '条',
      tone: (unassignedReview > 0 ? 'purple' : 'gray') as BadgeTone,
      helper: unassignedReview > 0 ? '需要管理员分派' : '-',
    },
  ]
})

function getSuggestedRatio(record: ReviewTaskItemVO): number | null {
  const full = record.fullScore
  const sug = record.aiScore
  if (sug == null || full <= 0) return null
  return Math.round((sug / full) * 100)
}

function getSuggestedRatioTone(record: ReviewTaskItemVO): BadgeTone {
  const ratio = getSuggestedRatio(record)
  if (ratio == null) return 'gray'
  if (ratio < 60) return 'purple'
  if (ratio >= 80) return 'green'
  return 'blue'
}

async function loadArbitrationMarkingTasks(): Promise<void> {
  if (!selectedExamId.value) {
    arbitrationTasks.value = []
    return
  }
  markingTasksLoadError.value = null
  const result = await http.post<PageResult<MarkingTaskVO>>('/api/mark/organization/task/list', {
    examId: selectedExamId.value,
    reviewRound: 3,
    pageNum: 1,
    pageSize: ARBITRATION_MARKING_PAGE_SIZE,
  })
  arbitrationTasks.value = readPageList(result, '双评仲裁任务加载失败').filter(
    (task) => task.taskStatus === 'ALLOCATED' || task.taskStatus === 'IN_PROGRESS',
  )
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) return
  tasksLoadError.value = null
  markingTasksLoadError.value = null
  try {
    await markTaskStore.loadReviewTasks({
      examId: selectedExamId.value,
      status: 'REJECTED',
    })
  } catch (error) {
    tasksLoadError.value = toUserError(error, '复核仲裁任务加载失败')
    showUserError(error, '驳回任务加载失败')
    return
  }
  try {
    await loadArbitrationMarkingTasks()
  } catch (error) {
    markingTasksLoadError.value = toUserError(error, '双评仲裁任务加载失败')
    showUserError(error, '双评仲裁任务加载失败')
  }
}

function goReviewWorkspace(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherReviewWorkspace',
    query: { examId: selectedExamId.value, taskId: record.reviewTaskId },
  })
}

function goReviewDetail(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherReviewTaskDetail',
    params: { taskId: record.reviewTaskId },
    query: { examId: selectedExamId.value },
  })
}

function goMarkingWorkspace(record: MarkingTaskVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherMarkingTaskDetail',
    params: { taskId: record.id },
    query: { examId: selectedExamId.value },
  })
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadTasks()
  } else {
    markTaskStore.clearReviewTasks()
    arbitrationTasks.value = []
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadTasks()
  }
})
</script>

<style lang="scss" scoped>
.arbitration-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__context-right {
    flex-shrink: 0;
  }

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }
}

.arbitration-page__kpi {
  margin-bottom: 16px;
}

.arbitration-page__list-card + .arbitration-page__list-card {
  margin-top: 16px;
}

.arbitration-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--dp-surface-soft, #f8fafc);
    font-weight: 600;
  }
}

.mini-icon {
  margin-right: 4px;
  color: var(--dp-text-muted, #64748b);
}

.ai-score-ratio-tag {
  margin-left: 6px;
}

.muted {
  color: var(--dp-text-muted, #94a3b8);
}
</style>
