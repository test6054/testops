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
          <UiTag :tone="tasks.length > 0 ? 'red' : 'green'" size="sm">
            {{ tasks.length > 0 ? `${tasks.length} 条待仲裁` : '暂无驳回' }}
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
      description="请选择一场考试以查看驳回任务"
      class="arbitration-page__empty"
    />

    <template v-else>
      <UiStatPanel
        :items="kpiItems"
        :columns="4"
        variant="grid"
        compact
        class="arbitration-page__kpi"
      />

      <UiCard class="arbitration-page__list-card">
        <template #title>
          <ExclamationCircleOutlined />
          <span>已驳回任务</span>
          <UiBadge :tone="tasks.length > 0 ? 'red' : 'green'">
            {{ tasks.length }}
          </UiBadge>
        </template>

        <!-- D-9 错误态：驳回任务加载失败时提供重试 + 上报入口 -->
        <UiErrorRetryPanel
          v-if="tasksLoadError"
          :error="tasksLoadError"
          title="驳回任务加载失败"
          :helper="`考试 ID：${selectedExamId}`"
          compact
          @retry="loadTasks"
        />
        <UiEmpty v-else-if="!loading && tasks.length === 0" description="当前无驳回任务" />

        <UiDataTable
          v-else
          :columns="columns"
          :data-source="tasks"
          :loading="loading"
          :page-size="20"
          :total="tasks.length"
          row-key="reviewTaskId"
          size="middle"
          flat
          class="arbitration-table"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'anonymousNo'">
              <a-typography-text strong :content="tasks[index].anonymousNo || '-'" />
            </template>
            <template v-else-if="column.key === 'questionNo'">
              <UiTag tone="blue" size="sm">{{ tasks[index].questionNo || '-' }}</UiTag>
            </template>
            <template v-else-if="column.key === 'fullScore'">
              {{ tasks[index].fullScore ?? '-' }}
            </template>
            <template v-else-if="column.key === 'suggestedScore'">
              <template v-if="tasks[index].suggestedScore != null">
                <strong>{{ tasks[index].suggestedScore }}</strong>
                <UiTag
                  v-if="getSuggestedRatio(tasks[index]) !== null"
                  :tone="getSuggestedRatioTone(tasks[index])"
                  size="sm"
                  class="suggested-ratio-tag"
                >
                  {{ getSuggestedRatio(tasks[index]) }}%
                </UiTag>
              </template>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'assignedTeacherUserId'">
              <span v-if="tasks[index].assignedTeacherUserId">
                <UserOutlined class="mini-icon" />
                {{
                  tasks[index].assignedTeacherUserId === currentUserId
                    ? '我'
                    : tasks[index].assignedTeacherUserId
                }}
              </span>
              <span v-else class="muted">未指派</span>
            </template>
            <template v-else-if="column.key === 'updateTime'">
              {{ formatTime(tasks[index].updateTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton size="sm" @click="goWorkspace(tasks[index])">仲裁批阅</UiButton>
                <UiButton size="sm" variant="ghost" @click="goDetail(tasks[index])">
                  详情
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
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'

defineOptions({ name: 'TeacherReviewArbitration' })

const router = useRouter()
const userStore = useUserStore()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const currentUserId = computed(() => userStore.userInfo.userId || '')

const markTaskStore = useMarkTaskStore()
const { reviewTasks: tasks, reviewTasksLoading: loading } = storeToRefs(markTaskStore)
// D-9 错误态：驳回任务加载失败时 UiErrorRetryPanel 重试 + 上报
const tasksLoadError = ref<unknown>(null)

const columns: ColumnType<ReviewTaskItemVO>[] = [
  { title: '匿名号', key: 'anonymousNo', width: 140 },
  { title: '题号', key: 'questionNo', width: 100 },
  { title: '满分', key: 'fullScore', width: 80 },
  { title: 'AI 建议分', key: 'suggestedScore', width: 140 },
  { title: '指派教师', key: 'assignedTeacherUserId', width: 160 },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

/** 仲裁概览 KPI（待仲裁总数 / 涉及题目数 / 指派给我 / 未指派） */
const kpiItems = computed(() => {
  const total = tasks.value.length
  const distinctQuestions = new Set(
    tasks.value.map((t) => t.questionNo || t.questionTemplateId).filter(Boolean),
  ).size
  const assignedToMe = currentUserId.value
    ? tasks.value.filter((t) => t.assignedTeacherUserId === currentUserId.value).length
    : 0
  const unassigned = tasks.value.filter((t) => !t.assignedTeacherUserId).length
  return [
    {
      key: 'total',
      label: '待仲裁总数',
      value: total,
      unit: '条',
      tone: (total > 0 ? 'red' : 'green') as BadgeTone,
      helper: total > 0 ? '请尽快处置驳回任务' : '已全部清空',
    },
    {
      key: 'questions',
      label: '涉及题目',
      value: distinctQuestions,
      unit: '题',
      tone: 'blue' as BadgeTone,
      helper: distinctQuestions > 0 ? '请按题目集中处理' : '-',
    },
    {
      key: 'assignedToMe',
      label: '指派给我',
      value: assignedToMe,
      unit: '条',
      tone: (assignedToMe > 0 ? 'orange' : 'gray') as BadgeTone,
      helper: assignedToMe > 0 ? '点击「仲裁批阅」直接进入' : '当前无我的待办',
    },
    {
      key: 'unassigned',
      label: '未指派',
      value: unassigned,
      unit: '条',
      tone: (unassigned > 0 ? 'purple' : 'gray') as BadgeTone,
      helper: unassigned > 0 ? '需要管理员分派' : '-',
    },
  ]
})

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

/** 建议分占满分百分比（保留 0 位整数）。当满分不存在或为 0 时返回 null。 */
function getSuggestedRatio(record: ReviewTaskItemVO): number | null {
  const full = record.fullScore
  const sug = record.suggestedScore
  if (full == null || sug == null || full <= 0) return null
  return Math.round((sug / full) * 100)
}

/** 占比着色：< 60% 紫色（建议偏低，需仲裁人复核）；≥ 80% 绿色；其余蓝色 */
function getSuggestedRatioTone(record: ReviewTaskItemVO): BadgeTone {
  const ratio = getSuggestedRatio(record)
  if (ratio == null) return 'gray'
  if (ratio < 60) return 'purple'
  if (ratio >= 80) return 'green'
  return 'blue'
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) return
  tasksLoadError.value = null
  try {
    await markTaskStore.loadReviewTasks({
      examId: selectedExamId.value,
      status: 'REJECTED',
    })
  } catch (error) {
    tasksLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '驳回任务加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function goWorkspace(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherReviewWorkspace',
    query: { examId: selectedExamId.value, taskId: record.reviewTaskId },
  })
}

function goDetail(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherReviewTaskDetail',
    params: { taskId: record.reviewTaskId },
    query: { examId: selectedExamId.value },
  })
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadTasks()
  } else {
    tasks.value = []
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

.suggested-ratio-tag {
  margin-left: 6px;
}

.muted {
  color: var(--dp-text-muted, #94a3b8);
}
</style>
