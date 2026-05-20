<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="marking-task-pool-page__context">
        <div class="marking-task-pool-page__context-left">
          <a-select
            :value="selectedExamId"
            class="marking-task-pool-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag tone="blue" size="sm">我的任务 {{ tasks.length }}</UiTag>
          <UiTag v-if="inProgressCount > 0" tone="orange" size="sm">阅卷中 {{ inProgressCount }}</UiTag>
        </div>
        <div class="marking-task-pool-page__context-right">
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
      description="请选择考试以查看 / 领取阅卷任务"
      class="marking-task-pool-page__empty"
    />

    <template v-else>
      <UiCard class="claim-card">
        <template #title>
          <ThunderboltOutlined />
          <span>领取任务</span>
          <UiBadge tone="green"> {{ claimContext?.groups.length ?? 0 }} 个可领取题组 </UiBadge>
        </template>

        <a-spin :spinning="claimContextLoading">
          <UiEmpty
            v-if="!claimContextLoading && (claimContext?.groups.length ?? 0) === 0"
            description="您当前未被分配到任何活跃题组，请联系阅卷组织管理员"
          />
          <a-form v-else layout="inline" :model="claimForm" @submit.prevent="submitClaim">
            <a-form-item label="题组" required>
              <a-select
                v-model:value="claimForm.groupId"
                :options="claimGroupOptions"
                :loading="claimContextLoading"
                placeholder="选择题组"
                style="width: 240px"
                show-search
                option-filter-prop="label"
                @change="onClaimGroupChange"
              />
            </a-form-item>
            <a-form-item label="正评会话" required>
              <a-select
                v-model:value="claimForm.sessionId"
                :options="claimSessionOptions"
                :disabled="!claimForm.groupId"
                placeholder="选择该题组下的活跃会话"
                style="width: 280px"
                allow-clear
              />
            </a-form-item>
            <a-form-item>
              <a-space>
                <UiButton :disabled="!canClaim" :loading="claiming" @click="submitClaim">
                  <template #icon><PlusOutlined /></template>
                  批量领取一批
                </UiButton>
                <UiButton
                  variant="outline"
                  size="sm"
                  :loading="claimContextLoading"
                  @click="loadClaimContext"
                >
                  <template #icon><ReloadOutlined /></template>
                  刷新可领取题组
                </UiButton>
              </a-space>
            </a-form-item>
          </a-form>
        </a-spin>
      </UiCard>

      <UiCard class="filter-card">
        <template #title>
          <FilterOutlined />
          <span>筛选条件</span>
        </template>

        <a-form layout="inline" :model="filterForm">
          <a-form-item label="任务状态">
            <a-select
              v-model:value="filterForm.taskStatus"
              style="width: 160px"
              placeholder="全部状态"
              :options="statusOptions"
              allow-clear
              @change="loadTasks"
            />
          </a-form-item>
          <a-form-item label="题组ID">
            <a-input
              v-model:value="filterForm.groupId"
              placeholder="精确匹配"
              allow-clear
              style="width: 180px"
              @press-enter="loadTasks"
            />
          </a-form-item>
          <a-form-item label="正评会话ID">
            <a-input
              v-model:value="filterForm.sessionId"
              placeholder="精确匹配"
              allow-clear
              style="width: 180px"
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

      <UiCard class="table-card">
        <template #title>
          <TableOutlined />
          <span>任务列表</span>
          <UiBadge tone="blue">{{ tasks.length }} 条</UiBadge>
        </template>

        <UiEmpty v-if="!loading && tasks.length === 0" description="暂无任务" />
        <UiDataTable
          v-else
          :columns="columns"
          :data-source="tasks"
          :loading="loading"
          :page-size="20"
          :total="tasks.length"
          row-key="id"
          size="middle"
          flat
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'id'">
              <a-typography-text strong>#{{ tasks[index].id }}</a-typography-text>
            </template>
            <template v-else-if="column.key === 'taskStatus'">
              <UiTag :tone="taskStatusTone(tasks[index].taskStatus)" size="sm">
                {{ taskStatusLabel(tasks[index].taskStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'reviewRound'">
              <UiTag tone="blue" size="sm">第 {{ tasks[index].reviewRound || 1 }} 轮</UiTag>
            </template>
            <template v-else-if="column.key === 'allocatedAt'">
              {{ formatTime(tasks[index].allocatedAt) }}
            </template>
            <template v-else-if="column.key === 'submittedAt'">
              {{ formatTime(tasks[index].submittedAt) }}
            </template>
            <template v-else-if="column.key === 'score'">
              <span v-if="tasks[index].score !== undefined && tasks[index].score !== null">{{
                tasks[index].score
              }}</span>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                v-if="['ALLOCATED', 'IN_PROGRESS'].includes(tasks[index].taskStatus ?? '')"
                size="sm"
                @click="goDetail(tasks[index])"
              >
                进入批阅
              </UiButton>
              <span v-else class="muted">已结束</span>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  MarkingTaskClaimPayload,
  MarkingTaskQueryPayload,
  MarkingTaskStatusCode,
  MarkingTaskVO,
  TeacherClaimContextVO,
} from '@/apis/mark/marking-organization'
import FilterOutlined from '@ant-design/icons-vue/FilterOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  MARKING_TASK_STATUS_LABEL as STATUS_LABEL,
  MARKING_TASK_STATUS_TONE as STATUS_TONE,
} from '@/apis/mark/marking-organization'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { storeToRefs } from 'pinia'
import { UiBadge, UiButton, UiCard, UiDataTable, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useUserStore } from '@/stores/modules/user'

defineOptions({ name: 'TeacherMarkingTaskPool' })

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
const { tasks, tasksLoading: loading, claimContextLoading } = storeToRefs(markTaskStore)

const filterForm = reactive<{
  taskStatus?: MarkingTaskStatusCode
  groupId?: string
  sessionId?: string
}>({
  taskStatus: undefined,
  groupId: '',
  sessionId: '',
})

// 直接从后端真实枚举 LABEL 对象派生 select options，零 as 断言。
const statusOptions = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))

const inProgressCount = computed(
  () =>
    tasks.value.filter(
      (task) => task.taskStatus === 'IN_PROGRESS' || task.taskStatus === 'ALLOCATED',
    ).length,
)

const columns: ColumnType<MarkingTaskVO>[] = [
  { title: '任务ID', key: 'id', width: 120 },
  { title: '题组', key: 'groupId', dataIndex: 'groupId', width: 140 },
  { title: '会话', key: 'sessionId', dataIndex: 'sessionId', width: 140 },
  { title: '试卷', key: 'paperInstanceId', dataIndex: 'paperInstanceId', width: 140 },
  { title: '轮次', key: 'reviewRound', width: 80 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '给分', key: 'score', width: 80 },
  { title: '分配时间', key: 'allocatedAt', width: 170 },
  { title: '提交时间', key: 'submittedAt', width: 170 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) {
    tasks.value = []
    return
  }
  loading.value = true
  try {
    const payload: MarkingTaskQueryPayload = {
      examId: selectedExamId.value,
      reviewerUserId: currentUserId.value || undefined,
      groupId: filterForm.groupId?.trim() || undefined,
      sessionId: filterForm.sessionId?.trim() || undefined,
      taskStatus: filterForm.taskStatus,
    }
    await markTaskStore.loadTasks(payload)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '任务列表加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function resetFilter(): void {
  filterForm.taskStatus = undefined
  filterForm.groupId = ''
  filterForm.sessionId = ''
  void loadTasks()
}

const claimForm = reactive<MarkingTaskClaimPayload>({
  sessionId: '',
  groupId: '',
})

const canClaim = computed(() => !!claimForm.sessionId.trim() && !!claimForm.groupId.trim())

const claimContext = computed<TeacherClaimContextVO | null>(
  () => (selectedExamId.value ? markTaskStore.getClaimContext(selectedExamId.value) : null),
)

const claimGroupOptions = computed(() =>
  (claimContext.value?.groups ?? []).map((g) => ({
    value: g.groupId,
    label: g.groupName ? `${g.groupName} (#${g.groupId})` : `题组 #${g.groupId}`,
  })),
)

const claimSessionOptions = computed(() => {
  if (!claimForm.groupId) return []
  const matched = claimContext.value?.groups.find((g) => g.groupId === claimForm.groupId)
  return (matched?.activeSessions ?? []).map((s) => ({
    value: s.id,
    label: `会话 #${s.id}${s.startTime ? ` · 启动于 ${formatTime(s.startTime)}` : ''}`,
  }))
})

async function loadClaimContext(): Promise<void> {
  if (!selectedExamId.value) return
  try {
    await markTaskStore.loadClaimContext({ examId: selectedExamId.value })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '领取上下文加载失败'
    message.error(errMsg)
  }
}

function onClaimGroupChange(): void {
  // 题组变更后会话选择需重置，避免会话 id 与题组 id 不一致
  claimForm.sessionId = ''
}

const claiming = ref(false)

async function submitClaim(): Promise<void> {
  if (!canClaim.value) {
    message.warning('请填写正评会话ID 和题组ID')
    return
  }
  claiming.value = true
  try {
    const claimed = await markTaskStore.claimTasks({
      sessionId: claimForm.sessionId.trim(),
      groupId: claimForm.groupId.trim(),
    })
    if (claimed.length === 0) {
      message.info('当前会话 / 题组没有可领取的任务')
    } else {
      message.success(`成功领取 ${claimed.length} 个任务`)
      await loadTasks()
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '领取任务失败'
    message.error(errMsg)
  } finally {
    claiming.value = false
  }
}

function goDetail(task: MarkingTaskVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherMarkingTaskDetail',
    params: { taskId: task.id },
    query: { examId: selectedExamId.value },
  })
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

/**
 * 把 record.taskStatus（slot 中类型被擦除为 unknown）渲染成中文标签。
 * - 严格对齐后端 MarkingTaskStatus enum：ALLOCATED / IN_PROGRESS / SUBMITTED / FINALIZED / RECYCLED
 * - 通过字面值比较让 TS 自动缩窄类型，避免使用 as 断言
 */
function taskStatusLabel(value: unknown): string {
  if (typeof value !== 'string') return '-'
  if (
    value === 'ALLOCATED'
    || value === 'IN_PROGRESS'
    || value === 'SUBMITTED'
    || value === 'FINALIZED'
    || value === 'RECYCLED'
  ) {
    return STATUS_LABEL[value]
  }
  return value || '-'
}

/**
 * 把 record.taskStatus 渲染成 UiTag 色调。
 * - 字面值比较 + 类型缩窄，零 as 断言
 * - 非枚举值或非字符串统一回退到 gray
 */
function taskStatusTone(value: unknown): 'gray' | 'blue' | 'orange' | 'green' | 'red' {
  if (typeof value !== 'string') return 'gray'
  if (
    value === 'ALLOCATED'
    || value === 'IN_PROGRESS'
    || value === 'SUBMITTED'
    || value === 'FINALIZED'
    || value === 'RECYCLED'
  ) {
    return STATUS_TONE[value]
  }
  return 'gray'
}

watch(selectedExamId, () => {
  claimForm.groupId = ''
  claimForm.sessionId = ''
  void loadTasks()
  void loadClaimContext()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadTasks()
  }
})
</script>

<style lang="scss" scoped>
.marking-task-pool-page {
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
}

.empty-block {
  margin-top: 48px;
}

.claim-card,
.filter-card,
.table-card {
  margin-bottom: 0;
}

.muted {
  color: #bfbfbf;
}
</style>
