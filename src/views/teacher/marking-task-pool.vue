<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title :title="pageTitle" :subtitle="pageSubtitle">
        <template #status>
          <UiTag
            v-if="examDetail?.status"
            :tone="examStatusTone(examDetail.status)"
            size="sm"
          >
            {{ examStatusLabel(examDetail.status) }}
          </UiTag>
          <UiTag v-if="isTrialTaskPool" tone="purple" size="sm">
            试评阶段
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="() => loadTasks()">
            <template #icon><ReloadOutlined /></template>
            刷新任务
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="pageSignalMetrics.length > 0" #signal>
      <SignalBand :metrics="pageSignalMetrics" compact />
    </template>

    <UiLoadFailure
      v-if="loadError"
      title="阅卷任务列表加载失败"
      :description="loadError"
    />

    <div v-else class="marking-task-pool-page">
      <UiCard class="claim-card">
        <template #title>
          <ThunderboltOutlined />
          <span>领取任务</span>
        </template>

        <a-spin :spinning="claimContextLoading">
          <UiEmpty
            v-if="!claimContextLoading && (claimContext?.groups.length ?? 0) === 0"
            :description="claimEmptyDescription"
          >
            <template #action>
              <UiButton variant="primary" @click="goMarkingOrg">
                前往阅卷安排
              </UiButton>
            </template>
          </UiEmpty>
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
            <a-form-item :label="sessionSelectLabel" required>
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

      <a-card :bordered="false" class="detail-table-card table-card">
        <template #title>
          <TableOutlined />
          <span class="section-title">任务列表</span>
        </template>

        <UiFilterBar
          v-model="filterModel"
          :fields="taskFilterFields"
          variant="panel"
          show-labels
          search-text="查询"
          @search="loadTasks"
          @reset="resetFilter"
        />



        <UiDataTable
          pagination-mode="client"
          :columns="columns"
          :data-source="tasks"
          :loading="loading"
          :page-size="20"
          :total="tasks.length"
          row-key="id"
          size="middle"
          flat
          empty-kind="first-run"
          :empty-description="taskTableEmptyDescription"
          :custom-row="customTableRow"
          class="student-detail-table__data-table"
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
            <template v-else-if="column.key === 'allocatedTime'">
              {{ formatDateTime(tasks[index].allocatedTime) }}
            </template>
            <template v-else-if="column.key === 'submittedTime'">
              {{ formatDateTime(tasks[index].submittedTime) }}
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
      </a-card>
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { AnonymityModeCode } from '@/apis/mark/anonymity-mode'
import type {ExamStatusCode} from '@/apis/mark/exam';
import type {
  FormalSessionVO,
  MarkingSessionPhaseCode,
  MarkingTaskClaimRequest,
  MarkingTaskQueryRequest,
  MarkingTaskStatusCode,
  MarkingTaskVO,
  TeacherClaimContextVO,
  TrialSessionVO,
} from '@/apis/mark/marking-organization'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, inject, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ANONYMITY_MODE_LABEL } from '@/apis/mark/anonymity-mode'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from '@/apis/mark/exam'
import {
  FORMAL_SESSION_STATUS_LABEL,
  MARKING_TASK_STATUS_LABEL,
  MARKING_TASK_STATUS_OPTIONS,
  MARKING_TASK_STATUS_TONE,
  TRIAL_SESSION_STATUS_LABEL,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiLoadFailure from '@/components/ui-guide/ui/UiLoadFailure.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { usePageLoadFailure } from '@/composables/usePageLoadFailure'
import { usePolling } from '@/composables/usePolling'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime, formatSessionOptionTime } from '@/utils/format'
import { navigateToJourneyStep } from '@/utils/mark-stage-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingTaskPool' })

const { loadError, captureLoadFailure, clearLoadFailure } = usePageLoadFailure()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)

const isTrialTaskPool = computed(() => route.meta.workspacePhase === 'trial')

const markingPhase = computed(() => (isTrialTaskPool.value ? 'TRIAL' : 'FORMAL') as MarkingSessionPhaseCode)

const sessionSelectLabel = computed(() => (isTrialTaskPool.value ? '试评会话' : '正评会话'))

const claimEmptyDescription = computed(() => (
  isTrialTaskPool.value
    ? '当前暂无可领取的试评任务。请先在「阅卷安排」步骤中创建试评会话。'
    : '当前暂无可领取的阅卷任务。请先在「阅卷安排」步骤中创建批阅会话。'
))

const taskTableEmptyDescription = computed(() => (
  isTrialTaskPool.value
    ? '暂无待处理试评任务，领取后将在此展示'
    : '当前无待处理任务，所有试卷可能已完成评阅'
))

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const examDetail = computed(() => workbenchContext?.examDetail?.value ?? null)
const pageTitle = computed(() => String(route.meta.title ?? '阅卷任务池'))
const pageSubtitle = computed(() => examDetail.value?.examName ?? '')

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

const filterForm = reactive<{
  taskStatus?: MarkingTaskStatusCode
  groupId?: string
  sessionId?: string
}>({
  taskStatus: undefined,
  groupId: '',
  sessionId: '',
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const statusOptions = MARKING_TASK_STATUS_OPTIONS

const inProgressCount = computed(
  () => tasks.value.filter((task) => task.taskStatus === 'IN_PROGRESS').length,
)

const highlightedTaskIds = ref<Set<string>>(new Set())
const highlightTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** 任务完成度 KPI：ALLOCATED 计入待领取，不与阅卷中重复 */
const pageSignalMetrics = computed((): SignalMetric[] => {
  if (!selectedExamId.value) {
    return []
  }
  const allocatedCount = tasks.value.filter((task) => task.taskStatus === 'ALLOCATED').length
  const doneCount = tasks.value.filter(
    (task) => task.taskStatus === 'SUBMITTED' || task.taskStatus === 'FINALIZED',
  ).length
  return [
    { key: 'total', label: '总数', value: String(tasks.value.length), tone: 'blue' },
    { key: 'allocated', label: '待领取', value: String(allocatedCount), tone: 'gray' },
    { key: 'inProgress', label: '进行中', value: String(inProgressCount.value), tone: 'blue' },
    { key: 'done', label: '已完成', value: String(doneCount), tone: 'green' },
  ]
})

const columns = computed<ColumnType<MarkingTaskVO>[]>(() => [
  { title: '题目', key: 'question', width: 190 },
  { title: '匿名', key: 'anonymityMode', width: 72 },
  { title: '答卷', key: 'paperDisplay', width: 220 },
  { title: '题组', key: 'groupName', width: 150 },
  { title: '阅卷教师', key: 'reviewerName', width: 120 },
  { title: isTrialTaskPool.value ? '试评会话' : '正评会话', key: 'session', width: 150 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '给分', key: 'score', width: 80 },
  { title: '分配时间', key: 'allocatedTime', width: 170 },
  { title: '提交时间', key: 'submittedTime', width: 170 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
])

async function loadTasks(options?: { silent?: boolean }): Promise<void> {
  if (!selectedExamId.value) {
    markTaskStore.clearTasks()
    return
  }
  if (!currentUserId.value) {
    if (!options?.silent) {
      showUserError(new Error('当前登录用户缺少 userId，无法加载阅卷任务'), '当前登录用户缺少 userId，无法加载阅卷任务')
      message.error('登录状态异常，请重新登录后再加载阅卷任务')
    }
    return
  }
  if (options?.silent && loading.value) {
    return
  }
  const previousIds = new Set(tasks.value.map((task) => task.id))
  try {
    const request: MarkingTaskQueryRequest = {
      examId: selectedExamId.value,
      reviewerUserId: currentUserId.value,
      groupId: filterForm.groupId?.trim() || undefined,
      sessionId: filterForm.sessionId?.trim() || undefined,
      taskStatus: filterForm.taskStatus,
    }
    await markTaskStore.loadTasks(request, { silent: options?.silent })
    if (options?.silent) {
      applyNewTaskHighlights(previousIds)
    }
    else {
      clearLoadFailure()
    }
    taskListPolling.syncPolling()
  }
  catch (error) {
    if (!options?.silent) {
      captureLoadFailure(error, '阅卷任务列表加载失败')
    }
  }
}

function applyNewTaskHighlights(previousIds: Set<string>): void {
  for (const task of tasks.value) {
    if (previousIds.has(task.id)) {
      continue
    }
    highlightTaskRow(task.id)
  }
}

function highlightTaskRow(taskId: string): void {
  const next = new Set(highlightedTaskIds.value)
  next.add(taskId)
  highlightedTaskIds.value = next

  const existingTimer = highlightTimers.get(taskId)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }
  const timer = setTimeout(() => {
    const cleared = new Set(highlightedTaskIds.value)
    cleared.delete(taskId)
    highlightedTaskIds.value = cleared
    highlightTimers.delete(taskId)
  }, 2000)
  highlightTimers.set(taskId, timer)
}

function customTableRow(record: MarkingTaskVO) {
  return {
    class: highlightedTaskIds.value.has(record.id) ? 'marking-task-pool-row--highlight' : '',
  }
}

const taskListPolling = usePolling(
  () => loadTasks({ silent: true }),
  {
    getOptions: () => ({
      intervalMs: 15000,
      when: Boolean(selectedExamId.value && currentUserId.value),
    }),
    pauseWhenDocumentHidden: true,
  },
)

onBeforeUnmount(() => {
  for (const timer of highlightTimers.values()) {
    clearTimeout(timer)
  }
  highlightTimers.clear()
})

function resetFilter(): void {
  void loadTasks()
}

watch(
  () => filterForm.groupId,
  (groupId, previousGroupId) => {
    if (groupId === previousGroupId) {
      return
    }
    filterForm.sessionId = ''
  },
)

const claimForm = reactive<MarkingTaskClaimRequest>({
  sessionId: '',
  groupId: '',
  markingPhase: 'FORMAL',
})

const canClaim = computed(() => !!claimForm.sessionId.trim() && !!claimForm.groupId.trim())

const claimContext = computed<TeacherClaimContextVO | null>(() =>
  selectedExamId.value
    ? markTaskStore.getClaimContext(selectedExamId.value, markingPhase.value)
    : null,
)

const claimGroupOptions = computed(() =>
  (claimContext.value?.groups ?? []).map((g) => ({
    value: g.groupId,
    label: g.groupName,
  })),
)

function formatSessionSelectLabel(
  statusLabel: string,
  time: string | undefined,
  pendingTaskCount?: number,
): string {
  const segments = [statusLabel]
  if (time) {
    segments.push(formatSessionOptionTime(time))
  }
  let label = segments.join(' · ')
  if (pendingTaskCount !== undefined) {
    label += `（${pendingTaskCount} 份）`
  }
  return label
}

function buildTrialSessionSelectOptions(sessions: TrialSessionVO[]) {
  return sessions.map((session) => ({
    value: session.id,
    label: formatSessionSelectLabel(
      strictEnumLabel(TRIAL_SESSION_STATUS_LABEL, session.sessionStatus, '试评会话状态'),
      session.createTime,
    ),
  }))
}

function buildFormalSessionSelectOptions(sessions: FormalSessionVO[]) {
  return sessions.map((session) => ({
    value: session.id,
    label: formatSessionSelectLabel(
      strictEnumLabel(FORMAL_SESSION_STATUS_LABEL, session.sessionStatus, '正评会话状态'),
      session.startTime ?? session.createTime,
      session.pendingTaskCount,
    ),
  }))
}

const claimSessionOptions = computed(() => {
  if (!claimForm.groupId) return []
  const matched = claimContext.value?.groups.find((g) => g.groupId === claimForm.groupId)
  if (isTrialTaskPool.value) {
    return buildTrialSessionSelectOptions(matched?.activeTrialSessions ?? [])
  }
  return buildFormalSessionSelectOptions(matched?.activeSessions ?? [])
})

const filterSessionOptions = computed(() => {
  if (!filterForm.groupId) return []
  const matched = claimContext.value?.groups.find((g) => g.groupId === filterForm.groupId)
  if (isTrialTaskPool.value) {
    return buildTrialSessionSelectOptions(matched?.activeTrialSessions ?? [])
  }
  return buildFormalSessionSelectOptions(matched?.activeSessions ?? [])
})

const taskFilterFields = computed<FilterField[]>(() => [
  {
    key: 'taskStatus',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
  },
  {
    key: 'groupId',
    type: 'select',
    placeholder: '选择题组',
    allowClear: true,
    allowSearch: true,
    width: 180,
    disabled: claimContextLoading.value,
    options: claimGroupOptions.value.map((item) => ({ label: item.label, value: item.value })),
  },
  {
    key: 'sessionId',
    type: 'select',
    placeholder: isTrialTaskPool.value ? '选择试评会话' : '选择正评会话',
    allowClear: true,
    width: 180,
    disabled: !filterForm.groupId?.trim(),
    options: filterSessionOptions.value.map((item) => ({ label: item.label, value: item.value })),
  },
])

async function loadClaimContext(): Promise<void> {
  if (!selectedExamId.value) return
  try {
    await markTaskStore.loadClaimContext({
      examId: selectedExamId.value,
      markingPhase: markingPhase.value,
    })
  } catch (error) {
    showUserError(error, '领取条件加载失败')
  }
}

function onClaimGroupChange(): void {
  claimForm.sessionId = ''
}

const claiming = ref(false)

async function submitClaim(): Promise<void> {
  if (!canClaim.value) {
    message.warning(isTrialTaskPool.value ? '请选择题组和试评会话' : '请选择题组和正评会话')
    return
  }
  claiming.value = true
  try {
    const claimed = await markTaskStore.claimTasks({
      sessionId: claimForm.sessionId.trim(),
      groupId: claimForm.groupId.trim(),
      markingPhase: markingPhase.value,
    })
    if (claimed.length === 0) {
      message.info('当前会话 / 题组没有可领取的任务')
    } else {
      message.success(`成功领取 ${claimed.length} 个任务`)
      await loadTasks()
      try {
        await refreshSnapshot()
      } catch {
        // 非工作台上下文时忽略
      }
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
    name: 'TeacherExamWorkspaceMarkingTaskDetail',
    params: { examId: selectedExamId.value, taskId: task.id },
  })
}

function goMarkingOrg(): void {
  if (!selectedExamId.value) return
  navigateToJourneyStep(router, 'assign', selectedExamId.value)
}

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
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
  claimForm.markingPhase = markingPhase.value
  void loadTasks()
  void loadClaimContext()
}, { immediate: true })

watch(markingPhase, () => {
  claimForm.markingPhase = markingPhase.value
  void loadClaimContext()
})
</script>

<style lang="scss" scoped>
.marking-task-pool-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
}

.empty-block {
  margin-top: 48px;
}

.claim-card,
.table-card {
  margin-bottom: 0;
}

.muted {
  color: #bfbfbf;
}

:deep(.marking-task-pool-row--highlight > td) {
  background-color: rgba(22, 119, 255, 0.12);
  transition: background-color 2s ease;
}
</style>
