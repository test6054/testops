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
          <UiTag v-if="inProgressCount > 0" tone="orange" size="sm">
            阅卷中 {{ inProgressCount }}
          </UiTag>
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
          <a-form-item label="题组">
            <a-select
              v-model:value="filterForm.groupId"
              :options="claimGroupOptions"
              :loading="claimContextLoading"
              placeholder="选择题组"
              allow-clear
              style="width: 180px"
              show-search
              option-filter-prop="label"
              @change="onFilterGroupChange"
            />
          </a-form-item>
          <a-form-item label="正评会话">
            <a-select
              v-model:value="filterForm.sessionId"
              :options="filterSessionOptions"
              :disabled="!filterForm.groupId"
              placeholder="选择正评会话"
              allow-clear
              style="width: 180px"
              @change="loadTasks"
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

        <!-- D-9 错误态：任务列表加载失败时提供重试 + 上报入口 -->
        <UiErrorRetryPanel
          v-if="tasksLoadError"
          :error="tasksLoadError"
          title="任务列表加载失败"
          :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
          compact
          @retry="loadTasks"
        />
        <UiEmpty v-else-if="!loading && tasks.length === 0" description="暂无任务" />
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
            <template v-if="column.key === 'question'">
              <a-space direction="vertical" :size="2">
                <a-typography-text v-if="tasks[index].taskUnit === 'WHOLE_PAPER'" strong>
                  整卷批阅
                </a-typography-text>
                <a-typography-text v-else strong>
                  第 {{ tasks[index].questionNo }} 题 · {{ tasks[index].questionTypeMessage }}
                </a-typography-text>
              </a-space>
            </template>
            <template v-else-if="column.key === 'anonymityMode'">
              <UiTag
                :tone="tasks[index].anonymityMode === 'ANONYMOUS' ? 'purple' : 'gray'"
                size="sm"
              >
                {{ anonymityModeLabel(tasks[index].anonymityMode) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'paperDisplay'">
              <a-space direction="vertical" :size="2">
                <a-typography-text strong>
                  {{ tasks[index].paperDisplay.primaryText }}
                </a-typography-text>
                <span v-if="tasks[index].paperDisplay.secondaryText" class="muted">
                  {{ tasks[index].paperDisplay.secondaryText }}
                </span>
              </a-space>
            </template>
            <template v-else-if="column.key === 'groupName'">
              <span>{{ tasks[index].groupName }}</span>
            </template>
            <template v-else-if="column.key === 'reviewerName'">
              <span>{{ tasks[index].reviewerName }}</span>
            </template>
            <template v-else-if="column.key === 'session'">
              <a-space direction="vertical" :size="2">
                <UiTag tone="green" size="sm">{{ tasks[index].sessionStatusMessage }}</UiTag>
                <span class="muted">{{ formatDateTime(tasks[index].sessionStartTime) }}</span>
              </a-space>
            </template>
            <template v-else-if="column.key === 'taskStatus'">
              <UiTag :tone="taskStatusTone(tasks[index].taskStatus)" size="sm">
                {{ taskStatusLabel(tasks[index].taskStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'reviewRound'">
              <UiTag tone="blue" size="sm">第 {{ tasks[index].reviewRound }} 轮</UiTag>
            </template>
            <template v-else-if="column.key === 'allocatedAt'">
              {{ formatDateTime(tasks[index].allocatedAt) }}
            </template>
            <template v-else-if="column.key === 'submittedAt'">
              {{ formatDateTime(tasks[index].submittedAt) }}
            </template>
            <template v-else-if="column.key === 'score'">
              <span v-if="tasks[index].score !== undefined && tasks[index].score !== null">{{
                tasks[index].score
              }}</span>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                v-if="['ALLOCATED', 'IN_PROGRESS'].includes(tasks[index].taskStatus)"
                size="sm"
                variant="primary"
                @click="goDetail(tasks[index])"
              >
                进入批阅
              </UiButton>
              <UiButton
                v-else-if="tasks[index].taskStatus === 'FINALIZED'"
                size="sm"
                variant="outline"
                @click="goDetail(tasks[index])"
              >
                查看阅卷
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
  AnonymityModeCode,
  MarkingTaskClaimRequest,
  MarkingTaskQueryRequest,
  MarkingTaskStatusCode,
  MarkingTaskVO,
  TeacherClaimContextVO,
} from '@/apis/mark/marking-organization'
import {
  ANONYMITY_MODE_LABEL,
  FORMAL_SESSION_STATUS_LABEL,
  MARKING_TASK_STATUS_LABEL,
  MARKING_TASK_STATUS_OPTIONS,
  MARKING_TASK_STATUS_TONE,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import FilterOutlined from '@ant-design/icons-vue/FilterOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'
import { captureLoadFailure, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingTaskPool' })

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

/**
 * 当前登录教师 ID 参与查询条件组装。
 *
 * 渲染期允许为空，真正发起查询时再显式校验，避免用户态恢复瞬间在模板链路抛错。
 */
const currentUserId = computed(() => userStore.userInfo.userId || '')

const markTaskStore = useMarkTaskStore()
// 注意：tasks / tasksLoading 仅用于读取，写入必须经 markTaskStore.loadTasks /
// clearTasks 等 action，避免组件直接修改 storeToRefs 解开后的 ref。
const { tasks, tasksLoading: loading, claimContextLoading } = storeToRefs(markTaskStore)
// D-9 错误态：任务列表加载失败时 UiErrorRetryPanel 重试 + 上报
const tasksLoadError = ref<Error | null>(null)

const filterForm = reactive<{
  taskStatus?: MarkingTaskStatusCode
  groupId?: string
  sessionId?: string
}>({
  taskStatus: undefined,
  groupId: '',
  sessionId: '',
})

const statusOptions = MARKING_TASK_STATUS_OPTIONS

const inProgressCount = computed(
  () =>
    tasks.value.filter(
      (task) => task.taskStatus === 'IN_PROGRESS' || task.taskStatus === 'ALLOCATED',
    ).length,
)

const columns: ColumnType<MarkingTaskVO>[] = [
  { title: '题目', key: 'question', width: 190 },
  { title: '匿名', key: 'anonymityMode', width: 72 },
  { title: '答卷', key: 'paperDisplay', width: 220 },
  { title: '题组', key: 'groupName', width: 150 },
  { title: '阅卷教师', key: 'reviewerName', width: 120 },
  { title: '正评会话', key: 'session', width: 150 },
  { title: '轮次', key: 'reviewRound', width: 80 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '给分', key: 'score', width: 80 },
  { title: '分配时间', key: 'allocatedAt', width: 170 },
  { title: '提交时间', key: 'submittedAt', width: 170 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) {
    // 通过 store action 清空，保持 Pinia 单向数据流
    markTaskStore.clearTasks()
    return
  }
  if (!currentUserId.value) {
    tasksLoadError.value = new Error('当前登录用户缺少 userId，无法加载阅卷任务')
    message.error('登录状态异常，请重新登录后再加载阅卷任务')
    return
  }
  // tasksLoading 由 markTaskStore.loadTasks 内部 try/finally 维护，
  // 组件不再直接写 loading.value，防止与 store 状态机交叉
  tasksLoadError.value = null
  try {
    const request: MarkingTaskQueryRequest = {
      examId: selectedExamId.value,
      reviewerUserId: currentUserId.value,
      groupId: filterForm.groupId?.trim() || undefined,
      sessionId: filterForm.sessionId?.trim() || undefined,
      taskStatus: filterForm.taskStatus,
    }
    await markTaskStore.loadTasks(request)
  } catch (error) {
    tasksLoadError.value = captureLoadFailure(error, '阅卷任务列表加载失败')
    showUserError(error, '阅卷任务列表加载失败')
  }
}

function resetFilter(): void {
  filterForm.taskStatus = undefined
  filterForm.groupId = ''
  filterForm.sessionId = ''
  void loadTasks()
}

const claimForm = reactive<MarkingTaskClaimRequest>({
  sessionId: '',
  groupId: '',
})

const canClaim = computed(() => !!claimForm.sessionId.trim() && !!claimForm.groupId.trim())

const claimContext = computed<TeacherClaimContextVO | null>(() =>
  selectedExamId.value ? markTaskStore.getClaimContext(selectedExamId.value) : null,
)

const claimGroupOptions = computed(() =>
  (claimContext.value?.groups ?? []).map((g) => ({
    value: g.groupId,
    label: g.groupName,
  })),
)

const claimSessionOptions = computed(() => {
  if (!claimForm.groupId) return []
  const matched = claimContext.value?.groups.find((g) => g.groupId === claimForm.groupId)
  return (matched?.activeSessions ?? []).map((s) => ({
    value: s.id,
    label: `${strictEnumLabel(FORMAL_SESSION_STATUS_LABEL, s.sessionStatus, '正评会话状态')}${s.startTime ? ` · ${formatDateTime(s.startTime)}` : ''}`,
  }))
})

const filterSessionOptions = computed(() => {
  if (!filterForm.groupId) return []
  const matched = claimContext.value?.groups.find((g) => g.groupId === filterForm.groupId)
  return (matched?.activeSessions ?? []).map((s) => ({
    value: s.id,
    label: `${strictEnumLabel(FORMAL_SESSION_STATUS_LABEL, s.sessionStatus, '正评会话状态')}${s.startTime ? ` · ${formatDateTime(s.startTime)}` : ''}`,
  }))
})

async function loadClaimContext(): Promise<void> {
  if (!selectedExamId.value) return
  try {
    await markTaskStore.loadClaimContext({ examId: selectedExamId.value })
  } catch (error) {
    showUserError(error, '领取条件加载失败')
  }
}

function onClaimGroupChange(): void {
  // 题组变更后会话选择需重置，避免会话 id 与题组 id 不一致
  claimForm.sessionId = ''
}

function onFilterGroupChange(): void {
  filterForm.sessionId = ''
  void loadTasks()
}

const claiming = ref(false)

async function submitClaim(): Promise<void> {
  if (!canClaim.value) {
    message.warning('请选择题组和正评会话')
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
    showUserError(error, '领取阅卷任务失败')
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

/**
 * 把 record.taskStatus 渲染成中文标签，未知枚举直接暴露契约错误。
 */
function taskStatusLabel(value: MarkingTaskStatusCode): string {
  return strictEnumLabel(MARKING_TASK_STATUS_LABEL, value, '阅卷任务状态')
}

function anonymityModeLabel(mode: AnonymityModeCode): string {
  return strictEnumLabel(ANONYMITY_MODE_LABEL, mode, '匿名模式')
}

/**
 * 把 record.taskStatus 渲染成 UiTag 色调，未知枚举直接暴露契约错误。
 */
function taskStatusTone(value: MarkingTaskStatusCode): BadgeTone {
  return strictEnumTone(MARKING_TASK_STATUS_TONE, value, '阅卷任务状态')
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
