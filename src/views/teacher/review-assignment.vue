<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="review-assignment-page__context">
        <div class="review-assignment-page__context-left">
          <a-select
            :value="selectedExamId"
            class="review-assignment-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag tone="blue" size="sm">{{ tasks.length }} 条任务</UiTag>
        </div>
        <div class="review-assignment-page__context-right">
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
      description="请选择一场考试以查看复核任务"
      class="review-assignment-page__empty"
    />

    <template v-else>
      <UiCard class="review-assignment-page__filter-card">
        <template #title>
          <SearchOutlined />
          <span>筛选条件</span>
        </template>

        <a-form layout="inline" :model="filterForm" @submit.prevent="loadTasks">
          <a-form-item label="状态">
            <a-select
              v-model:value="filterForm.status"
              style="width: 160px"
              placeholder="全部状态"
              allow-clear
              :options="statusOptions"
              @change="loadTasks"
            />
          </a-form-item>
          <a-form-item label="题目模板ID">
            <a-input
              v-model:value="filterForm.questionTemplateId"
              placeholder="精确匹配"
              allow-clear
              style="width: 220px"
              @press-enter="loadTasks"
            />
          </a-form-item>
          <a-form-item>
            <a-space>
              <UiButton size="sm" :loading="loading" @click="loadTasks">查询</UiButton>
              <UiButton size="sm" variant="outline" @click="resetFilter">重置</UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </UiCard>

      <UiCard class="review-assignment-page__table-card">
        <template #title>
          <TableOutlined />
          <span>任务列表</span>
          <UiBadge tone="blue">{{ tasks.length }} 条</UiBadge>
        </template>

        <UiEmpty v-if="!loading && tasks.length === 0" description="暂无符合条件的任务" />

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
          class="review-table"
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
              <span
                v-if="
                  tasks[index].suggestedScore !== undefined
                    && tasks[index].suggestedScore !== null
                "
              >
                {{ tasks[index].suggestedScore }}
              </span>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="reviewStatusTone(tasks[index].status)" size="sm">
                {{ reviewStatusLabel(tasks[index].status) }}
              </UiTag>
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
                <a-popconfirm
                  v-if="tasks[index].status === 'PENDING'"
                  title="确认领取该任务？领取后将由你负责该题目的批改。"
                  ok-text="领取"
                  cancel-text="取消"
                  :disabled="claiming"
                  @confirm="handleClaim(tasks[index])"
                >
                  <UiButton
                    size="sm"
                    :loading="claiming && claimingTaskId === tasks[index].reviewTaskId"
                  >
                    领取
                  </UiButton>
                </a-popconfirm>
                <UiButton
                  v-if="tasks[index].status === 'IN_PROGRESS'"
                  size="sm"
                  @click="goWorkspace(tasks[index])"
                >
                  进入批阅
                </UiButton>
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
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { UiBadge, UiButton, UiCard, UiDataTable, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useUserStore } from '@/stores/modules/user'

defineOptions({ name: 'TeacherReviewAssignment' })

/** ReviewTaskStatus 与后端 ReviewTaskStatus 枚举对齐 */
type ReviewTaskStatusCode = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'
type ToneCode = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

const STATUS_LABEL: Record<ReviewTaskStatusCode, string> = {
  PENDING: '待复核',
  IN_PROGRESS: '复核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

const STATUS_TONE: Record<ReviewTaskStatusCode, ToneCode> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
}

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

// ─── 列表筛选 + 数据 ─────────────────────────────
const filterForm = reactive<{
  status?: ReviewTaskStatusCode
  questionTemplateId?: string
}>({
  status: undefined,
  questionTemplateId: '',
})

// 从后端枚举 LABEL 对象直接派生 select options。
const statusOptions = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))

/**
 * 后端 ReviewTaskItemVO.status 是宽类型 string，前端需狭化为 ReviewTaskStatusCode 才能查 LABEL/TONE。
 * 通过字面值 === 比较让 TS 自动缩窄类型，全程零 as 断言。
 */
function reviewStatusTone(value: unknown): ToneCode {
  if (typeof value !== 'string') return 'gray'
  if (
    value === 'PENDING'
    || value === 'IN_PROGRESS'
    || value === 'APPROVED'
    || value === 'REJECTED'
  ) {
    return STATUS_TONE[value]
  }
  return 'gray'
}

function reviewStatusLabel(value: unknown): string {
  if (typeof value !== 'string') return '-'
  if (
    value === 'PENDING'
    || value === 'IN_PROGRESS'
    || value === 'APPROVED'
    || value === 'REJECTED'
  ) {
    return STATUS_LABEL[value]
  }
  return value
}

const markTaskStore = useMarkTaskStore()
const { reviewTasks: tasks, reviewTasksLoading: loading } = storeToRefs(markTaskStore)
computed(() => {
  const counter: Record<ReviewTaskStatusCode, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    APPROVED: 0,
    REJECTED: 0,
  }
  tasks.value.forEach((task) => {
    // 后端 ReviewTaskItemVO.status 是宽类型 string，用字面值 === 比较让 TS 自动缩窄。
    const status = task.status
    if (
      status === 'PENDING'
      || status === 'IN_PROGRESS'
      || status === 'APPROVED'
      || status === 'REJECTED'
    ) {
      counter[status]++
    }
  })
  const codes: ReviewTaskStatusCode[] = ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED']
  return codes.map((code) => ({
    code,
    label: STATUS_LABEL[code],
    count: counter[code],
  }))
})
const columns: ColumnType<ReviewTaskItemVO>[] = [
  { title: '匿名号', key: 'anonymousNo', width: 140 },
  { title: '题号', key: 'questionNo', width: 100 },
  { title: '满分', key: 'fullScore', width: 80 },
  { title: 'AI 建议分', key: 'suggestedScore', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '指派教师', key: 'assignedTeacherUserId', width: 160 },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) return
  try {
    await markTaskStore.loadReviewTasks({
      examId: selectedExamId.value,
      status: filterForm.status,
      questionTemplateId: filterForm.questionTemplateId?.trim() || undefined,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '复核任务加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function resetFilter(): void {
  filterForm.status = undefined
  filterForm.questionTemplateId = ''
  void loadTasks()
}

// ─── 领取任务 ─────────────────────────────
const claiming = ref(false)
const claimingTaskId = ref<string | null>(null)

async function handleClaim(record: ReviewTaskItemVO): Promise<void> {
  if (!selectedExamId.value) return
  claiming.value = true
  claimingTaskId.value = record.reviewTaskId
  try {
    await markTaskStore.claimReviewTaskAction(selectedExamId.value, record.reviewTaskId)
    message.success('任务领取成功，已进入复核中')
    await loadTasks()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '任务领取失败'
    message.error(errMsg)
  } finally {
    claiming.value = false
    claimingTaskId.value = null
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

// ─── 初始化 ─────────────────────────────────────
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
.review-assignment-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
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

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.review-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.mini-icon {
  margin-right: 4px;
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 60px 0;
}
</style>
