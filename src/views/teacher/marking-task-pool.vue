<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar v-if="isTrialTaskPool" layout="workbench">
        <template #status>
          <UiTag tone="orange" size="sm">试评阶段</UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && pageSignalMetrics.length > 0" #signal>
      <SignalBand :metrics="pageSignalMetrics" compact />
    </template>

    <ExamSelectGateStrip
      v-if="!selectedExamId"
      body="请从考试列表进入工作台后再领取与办理阅卷任务"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="selectedClaimSessionPaused"
        tone="warning"
        title="当前正评会话已暂停"
        description="所选举会话暂停期间无法领取新任务；其它进行中的会话仍可正常领取。"
        dense
      />

      <div class="marking-task-pool-page">
        <WorkbenchSurfaceCard class="marking-task-pool-page__claim">
          <template #head>
            <div class="marking-task-pool-page__claim-title">
              <ThunderboltOutlined />
              <span>领取任务</span>
            </div>
          </template>

          <UiSkeletonState v-if="claimContextLoading" variant="card" compact />

          <UiEmpty
            size="sm"
            v-else-if="(claimContext?.groups.length ?? 0) === 0"
            :description="claimEmptyDescription"
          >
            <template #action>
              <UiButton size="sm" variant="primary" @click="goMarkingOrg"> 前往阅卷安排 </UiButton>
            </template>
          </UiEmpty>
          <UiForm v-else layout="inline" :model="claimForm" @submit.prevent="submitClaim">
            <UiFormItem label="题组" required>
              <UiSelect
                size="sm"
                v-model="claimForm.groupId"
                :options="claimGroupOptions"
                :loading="claimContextLoading"
                placeholder="选择题组"
                style="width: 240px"
                allow-search
                option-filter-prop="label"
                @change="onClaimGroupChange"
              />
            </UiFormItem>
            <UiFormItem :label="sessionSelectLabel" required>
              <UiSelect
                size="sm"
                v-model="claimForm.sessionId"
                :options="claimSessionOptions"
                :disabled="!claimForm.groupId"
                placeholder="选择该题组下的活跃会话"
                style="width: 280px"
                allow-clear
              />
            </UiFormItem>
            <UiFormItem>
              <div class="dp-space" style="--dp-space-gap: 8px">
                <UiButton size="sm" :disabled="!canClaim" :loading="claiming" @click="submitClaim">
                  <template #icon><PlusOutlined /></template>
                  批量领取一批
                </UiButton>
              </div>
            </UiFormItem>
          </UiForm>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard flush class="marking-task-pool-page__tasks">
          <template #head>
            <header class="marking-task-pool-page__task-header">
              <h3 class="marking-task-pool-page__task-title">
                <TableOutlined />
                任务列表
              </h3>
              <UiButton variant="outline" size="sm" @click="toggleBatchMode">
                {{ batchMode ? '退出批量' : '批量模式' }}
              </UiButton>
            </header>
          </template>

          <template #toolbar>
            <UiAlertStrip
              v-if="tasksLoadError"
              tone="error"
              title="任务列表加载失败"
              :description="tasksLoadError"
              dense
            />

            <UiBatchActionBar
              v-if="batchMode && selectedRowKeys.length > 0"
              :selected-count="selectedRowKeys.length"
              selection-label="份已选"
              description="须同题组 · 同题目 · 待批阅状态"
            >
              <UiButton variant="primary" size="sm" @click="openBatchDrawer"> 批量给分 </UiButton>
              <UiButton variant="outline" size="sm" @click="clearBatchSelection"> 清空 </UiButton>
            </UiBatchActionBar>

            <UiFilterBar
              v-model="filterModel"
              :fields="taskFilterFields"
              variant="panel"
              show-labels
              search-text="查询"
              @search="() => loadTasks({ resetPage: true })"
              @reset="resetFilter"
            />
          </template>

          <UiDataTable
            v-model:current="taskPageNum"
            v-model:page-size="taskPageSize"
            pagination-mode="server"
            :columns="columns"
            :data-source="tasks"
            :loading="loading"
            :total="taskPageTotal"
            row-key="id"
            size="middle"
            flat
            empty-kind="first-run"
            :empty-description="taskTableEmptyDescription"
            :custom-row="customTableRow"
            :enable-selection="batchMode"
            :selected-row-keys="selectedRowKeys"
            @selection-change="handleSelectionChange"
            @page-change="handleTaskPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'question'">
                <div class="dp-space dp-space--vertical" style="--dp-space-gap: 2px">
                  <UiTypographyText v-if="record.taskUnit === AllocationUnitCode.WHOLE_PAPER" strong>
                    整卷批阅
                  </UiTypographyText>
                  <UiTypographyText v-else strong>
                    第 {{ record.questionNo }} 题 · {{ record.questionTypeMessage }}
                  </UiTypographyText>
                </div>
              </template>
              <template v-else-if="column.key === 'anonymityMode'">
                <UiTag
                  :tone="record.anonymityMode === AnonymityModeCode.ANONYMOUS ? 'blue' : 'gray'"
                  size="sm"
                >
                  {{ anonymityModeLabel(record.anonymityMode) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'paperDisplay'">
                <div class="dp-space dp-space--vertical" style="--dp-space-gap: 2px">
                  <UiTypographyText strong>
                    {{ record.paperDisplay.primaryText }}
                  </UiTypographyText>
                  <span v-if="record.paperDisplay.secondaryText" class="muted">
                    {{ record.paperDisplay.secondaryText }}
                  </span>
                </div>
              </template>
              <template v-else-if="column.key === 'groupName'">
                <span>{{ record.groupName }}</span>
              </template>
              <template v-else-if="column.key === 'reviewerName'">
                <span>{{ record.reviewerName }}</span>
              </template>
              <template v-else-if="column.key === 'session'">
                <div class="dp-space dp-space--vertical" style="--dp-space-gap: 2px">
                  <UiTag
                    :tone="record.markingPhase === MarkingSessionPhaseCode.TRIAL ? 'orange' : 'green'"
                    size="sm"
                  >
                    {{ record.sessionStatusMessage }}
                  </UiTag>
                  <span class="muted">{{ formatDateTime(record.sessionStartTime) }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'taskStatus'">
                <UiTag :tone="taskStatusTone(record.taskStatus)" size="sm">
                  {{ taskStatusLabel(record.taskStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'allocatedTime'">
                {{ formatDateTime(record.allocatedTime) }}
              </template>
              <template v-else-if="column.key === 'submittedTime'">
                {{ formatDateTime(record.submittedTime) }}
              </template>
              <template v-else-if="column.key === 'score'">
                <span v-if="record.score !== undefined && record.score !== null">{{
                  record.score
                }}</span>
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  v-if="buildMarkingTaskRowActions(record).length"
                  :items="buildMarkingTaskRowActions(record)"
                  split
                  @action="() => goDetail(record)"
                />
                <span v-else class="muted">已结束</span>
              </template>
            </template>
          </UiDataTable>
        </WorkbenchSurfaceCard>
      </div>

      <MarkingBatchScoreDrawer
        v-model:open="batchDrawerOpen"
        :exam-id="selectedExamId ?? ''"
        :group-id="batchGroupId"
        :layout-question-id="batchLayoutQuestionId"
        :full-score="batchFullScore"
        :selected-tasks="selectedTasks"
        @submitted="handleBatchSubmitted"
      />
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  FormalSessionResponse,
  MarkingTaskClaimRequest,
  MarkingTaskQueryRequest,
  MarkingTaskResponse,
  TeacherClaimContextResponse,
  TrialSessionResponse,
} from '@/apis/mark/marking-organization'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AnonymityModeDescription } from '@/apis/mark/anonymity-mode'
import {
  AllocationUnitCode,
  FormalSessionStatusDescription,
  getMarkingQuestionView,
  getOrganization,
  MARKING_TASK_STATUS_OPTIONS,
  MARKING_TASK_STATUS_TONE,
  MarkingTaskStatusDescription,
  TrialSessionStatusDescription,
} from '@/apis/mark/marking-organization'
import {
  MarkingTaskStreamEventTypeCode,
  MarkingTaskStreamSubscribeScopeCode,
} from '@/apis/mark/marking-task-stream'
import MarkingBatchScoreDrawer from '@/components/mark/MarkingBatchScoreDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiBatchActionBar from '@/components/ui-guide/ui/UiBatchActionBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkingTaskStream } from '@/composables/useMarkingTaskStream'
import {
  MARK_WORKBENCH_CONTEXT_KEY,
  useWorkspaceExamId,
} from '@/composables/useMarkWorkbenchContext'
import { usePolling } from '@/composables/usePolling'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useUserStore } from '@/stores/modules/user'
import { AnonymityModeCode } from '@/types/enums/anonymity-mode-enum'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import { MarkingSessionPhaseCode } from '@/types/enums/marking-session-phase-enum'
import { MarkingTaskStatusCode } from '@/types/enums/marking-task-status-enum'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime, formatSessionOptionTime } from '@/utils/format'
import { navigateToJourneyStep } from '@/utils/mark-stage-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingTaskPool' })

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)

const isTrialTaskPool = computed(() => route.meta.workspacePhase === 'trial')

const markingPhase = computed(() =>
  isTrialTaskPool.value ? MarkingSessionPhaseCode.TRIAL : MarkingSessionPhaseCode.FORMAL,
)

const sessionSelectLabel = computed(() => (isTrialTaskPool.value ? '试评会话' : '正评会话'))

const claimEmptyDescription = computed(() =>
  isTrialTaskPool.value
    ? '当前暂无可领取的试评任务。请先在「阅卷安排」步骤中创建试评会话。'
    : '当前暂无可领取的阅卷任务。请先在「阅卷安排」步骤中创建批阅会话。',
)

const taskTableEmptyDescription = computed(() =>
  isTrialTaskPool.value
    ? '暂无待处理试评任务，领取后将在此展示'
    : '当前无待处理任务，所有试卷可能已完成评阅',
)

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

/**
 * 当前登录教师 ID 参与查询条件组装。
 *
 * 渲染期允许为空，真正发起查询时再显式校验，避免用户态恢复瞬间在模板链路抛错。
 */
const currentUserId = computed(() => userStore.userInfo.userId || '')

const markTaskStore = useMarkTaskStore()
// 注意：tasks / tasksLoading 仅用于读取，写入必须经 markTaskStore.loadTasks /
// clearTasks 等 action，避免组件直接修改 storeToRefs 解开后的 ref。
const {
  tasks,
  tasksLoading: loading,
  claimContextLoading,
  tasksPageNum: taskPageNum,
  tasksPageSize: taskPageSize,
  tasksPageTotal: taskPageTotal,
} = storeToRefs(markTaskStore)

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

const taskPoolSummary = computed(() => claimContext.value?.taskSummary ?? null)

const completedTaskCount = computed(() => {
  const summary = taskPoolSummary.value
  if (!summary) return 0
  return summary.submittedTaskCount + summary.finalizedTaskCount
})

const highlightedTaskIds = ref<Set<string>>(new Set())
const highlightTimers = new Map<string, ReturnType<typeof setTimeout>>()

const batchMode = ref(false)
const selectedRowKeys = ref<string[]>([])
const batchSelectionAnchor = ref<MarkingTaskResponse | null>(null)
const batchDrawerOpen = ref(false)
const batchLayoutQuestionId = ref('')
const batchFullScore = ref(0)
const batchGroupId = ref('')
const tasksLoadError = ref('')
/** 考试内已暂停的正评会话 ID；告警 / 领取门禁仅绑定当前选中的领取会话 */
const pausedSessionIds = ref<Set<string>>(new Set())
const isGroupLeader = ref(false)

function markSessionPaused(sessionId: string | undefined): void {
  if (!sessionId) {
    return
  }
  const next = new Set(pausedSessionIds.value)
  next.add(sessionId)
  pausedSessionIds.value = next
}

function markSessionResumed(sessionId: string | undefined): void {
  if (!sessionId) {
    return
  }
  const next = new Set(pausedSessionIds.value)
  next.delete(sessionId)
  pausedSessionIds.value = next
}

const selectedTasks = computed(() =>
  tasks.value.filter((task) => selectedRowKeys.value.includes(task.id)),
)

function isBatchSelectable(task: MarkingTaskResponse): boolean {
  return (
    task.taskStatus === MarkingTaskStatusCode.ALLOCATED
    || task.taskStatus === MarkingTaskStatusCode.IN_PROGRESS
  )
}

function isSameBatchGroup(task: MarkingTaskResponse, anchor: MarkingTaskResponse): boolean {
  if (
    task.taskUnit === AllocationUnitCode.WHOLE_PAPER
    || anchor.taskUnit === AllocationUnitCode.WHOLE_PAPER
  ) {
    return false
  }
  return task.groupId === anchor.groupId && task.questionNo === anchor.questionNo
}

function handleSelectionChange(keys: (string | number)[]): void {
  const typedKeys = keys.map(String)
  if (typedKeys.length === 0) {
    clearBatchSelection()
    return
  }
  const anchor
    = batchSelectionAnchor.value ?? tasks.value.find((task) => task.id === typedKeys[0]) ?? null
  if (!anchor || !isBatchSelectable(anchor)) {
    clearBatchSelection()
    return
  }
  batchSelectionAnchor.value = anchor
  selectedRowKeys.value = typedKeys.filter((id) => {
    const task = tasks.value.find((item) => item.id === id)
    return !!task && isBatchSelectable(task) && isSameBatchGroup(task, anchor)
  })
}

function toggleBatchMode(): void {
  batchMode.value = !batchMode.value
  clearBatchSelection()
}

function clearBatchSelection(): void {
  selectedRowKeys.value = []
  batchSelectionAnchor.value = null
}

async function openBatchDrawer(): Promise<void> {
  const first = selectedTasks.value[0]
  if (!first || !selectedExamId.value) return
  try {
    const view = await getMarkingQuestionView({
      examId: selectedExamId.value,
      taskId: first.id,
    })
    batchLayoutQuestionId.value = view.layoutQuestionId
    batchFullScore.value = view.fullScore
    batchGroupId.value = first.groupId ?? ''
    batchDrawerOpen.value = true
  } catch (error) {
    showUserError(error, '批量给分题目信息加载失败')
  }
}

async function handleBatchSubmitted(): Promise<void> {
  clearBatchSelection()
  await Promise.all([loadTasks(), loadClaimContext()])
}

async function loadGroupLeaderFlag(): Promise<void> {
  if (!selectedExamId.value || !currentUserId.value) {
    isGroupLeader.value = false
    return
  }
  try {
    const org = await getOrganization({ examId: selectedExamId.value })
    isGroupLeader.value = org.groups.some((group) => group.leaderUserId === currentUserId.value)
  } catch (error) {
    isGroupLeader.value = false
    showUserError(error, '阅卷组织信息加载失败')
  }
}

const teacherTaskStream = useMarkingTaskStream({
  filter: () => ({
    examId: selectedExamId.value ?? '',
    sessionId: filterForm.sessionId?.trim() || undefined,
    scope: MarkingTaskStreamSubscribeScopeCode.TEACHER,
  }),
  when: () => Boolean(selectedExamId.value && currentUserId.value),
  onEvent: (event) => {
    if (event.eventType === MarkingTaskStreamEventTypeCode.SESSION_PAUSED) {
      markSessionPaused(event.sessionId)
      void loadTasks({ silent: true })
      taskListPolling.syncPolling()
      return
    }
    if (event.eventType === MarkingTaskStreamEventTypeCode.SESSION_RESUMED) {
      markSessionResumed(event.sessionId)
      void loadTasks({ silent: true })
      taskListPolling.syncPolling()
      return
    }
    const action = markTaskStore.applyStreamEvent(event)
    if (action === 'reload') {
      void loadTasks({ silent: true })
      return
    }
    if (event.eventType === MarkingTaskStreamEventTypeCode.TASK_ALLOCATED && event.taskId) {
      highlightTaskRow(event.taskId)
    }
  },
})

const groupLeaderStream = useMarkingTaskStream({
  filter: () => ({
    examId: selectedExamId.value ?? '',
    scope: MarkingTaskStreamSubscribeScopeCode.GROUP_LEADER,
  }),
  when: () => Boolean(selectedExamId.value && isGroupLeader.value),
  onEvent: (event) => {
    if (event.eventType === MarkingTaskStreamEventTypeCode.SESSION_PAUSED) {
      markSessionPaused(event.sessionId)
    }
    if (event.eventType === MarkingTaskStreamEventTypeCode.SESSION_RESUMED) {
      markSessionResumed(event.sessionId)
    }
    // exam Topic 事件携带单 session 计数，须回源 claimContext 做 exam 级聚合
    if (
      event.eventType === MarkingTaskStreamEventTypeCode.SESSION_PROGRESS
      || event.eventType === MarkingTaskStreamEventTypeCode.SESSION_PAUSED
      || event.eventType === MarkingTaskStreamEventTypeCode.SESSION_RESUMED
    ) {
      void loadClaimContext()
    }
  },
})

function allRequiredTaskStreamsReady(): boolean {
  if (!teacherTaskStream.ready.value) {
    return false
  }
  return !(isGroupLeader.value && !groupLeaderStream.ready.value)
}

function getPollingIntervalMs(): number {
  if (allRequiredTaskStreamsReady()) {
    return 0
  }
  const summary = taskPoolSummary.value
  const hasPending = summary ? summary.allocatedTaskCount + summary.inProgressTaskCount > 0 : false
  if (hasPending) {
    return 5000
  }
  if (
    teacherTaskStream.connectionPhase.value === 'failed'
    || (isGroupLeader.value && groupLeaderStream.connectionPhase.value === 'failed')
  ) {
    return 30000
  }
  return 15000
}

/** 任务池 KPI 真源：claim-context.taskSummary，非当前筛选列表 client 聚合 */
const pageSignalMetrics = computed((): SignalMetric[] => {
  const summary = taskPoolSummary.value
  if (!summary) {
    return []
  }
  return [
    { key: 'total', label: '我的任务', value: summary.totalTaskCount, tone: 'blue' },
    { key: 'allocated', label: '待领取', value: summary.allocatedTaskCount, tone: 'gray' },
    { key: 'inProgress', label: '批阅中', value: summary.inProgressTaskCount, tone: 'blue' },
    { key: 'done', label: '已完成', value: completedTaskCount.value, tone: 'green' },
  ]
})

const columns = computed<ColumnType<MarkingTaskResponse>[]>(() => [
  { title: '题目', key: 'question', width: 190, fixed: 'left' },
  { title: '匿名', key: 'anonymityMode', width: 72 },
  { title: '答卷', key: 'paperDisplay', width: 220 },
  { title: '题组', key: 'groupName', width: 150 },
  { title: '阅卷教师', key: 'reviewerName', width: 120 },
  { title: isTrialTaskPool.value ? '试评会话' : '正评会话', key: 'session', width: 150 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '给分', key: 'score', width: 80 },
  { title: '分配时间', key: 'allocatedTime', width: 170 },
  { title: '提交时间', key: 'submittedTime', width: 170 },
  { title: '操作', key: 'actions', width: 140 },
])

async function loadTasks(options?: { silent?: boolean, resetPage?: boolean }): Promise<void> {
  if (!selectedExamId.value) {
    markTaskStore.clearTasks()
    tasksLoadError.value = ''
    return
  }
  if (!currentUserId.value) {
    markTaskStore.clearTasks()
    if (!options?.silent) {
      tasksLoadError.value = '当前登录用户缺少 userId，无法加载阅卷任务'
      showUserError(
        new Error('当前登录用户缺少 userId，无法加载阅卷任务'),
        '当前登录用户缺少 userId，无法加载阅卷任务',
      )
      message.error('登录状态异常，请重新登录后再加载阅卷任务')
    }
    return
  }
  if (options?.silent && loading.value) {
    return
  }
  if (options?.resetPage) {
    taskPageNum.value = 1
  }
  const previousIds = new Set(tasks.value.map((task) => task.id))
  try {
    const request: MarkingTaskQueryRequest = {
      examId: selectedExamId.value,
      groupId: filterForm.groupId?.trim() || undefined,
      sessionId: filterForm.sessionId?.trim() || undefined,
      taskStatus: filterForm.taskStatus,
    }
    await markTaskStore.loadTasksPage(request, taskPageNum.value, taskPageSize.value, {
      silent: options?.silent,
    })
    tasksLoadError.value = ''
    if (options?.silent && isGroupLeader.value) {
      void loadClaimContext()
    }
    if (options?.silent) {
      applyNewTaskHighlights(previousIds)
    }
    taskListPolling.syncPolling()
  } catch (error) {
    markTaskStore.clearTasks()
    const errorMessage = getUserErrorMessage(error, '阅卷任务列表加载失败')
    if (!options?.silent) {
      tasksLoadError.value = errorMessage
      showUserError(error, '阅卷任务列表加载失败')
    }
  }
}

function handleTaskPageChange(): void {
  void loadTasks()
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

function customTableRow(record: MarkingTaskResponse) {
  return {
    class: highlightedTaskIds.value.has(record.id) ? 'marking-task-pool-row--highlight' : '',
  }
}

const taskListPolling = usePolling(() => loadTasks({ silent: true }), {
  getOptions: () => ({
    intervalMs: getPollingIntervalMs(),
    when: Boolean(selectedExamId.value && currentUserId.value && getPollingIntervalMs() > 0),
  }),
  pauseWhenDocumentHidden: true,
})

onMounted(() => {
  void teacherTaskStream.start()
  void groupLeaderStream.start()
})

onBeforeUnmount(() => {
  teacherTaskStream.stop()
  groupLeaderStream.stop()
  for (const timer of highlightTimers.values()) {
    clearTimeout(timer)
  }
  highlightTimers.clear()
})

function resetFilter(): void {
  void loadTasks({ resetPage: true })
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
  markingPhase: MarkingSessionPhaseCode.FORMAL,
})

/** 仅当「领取区」当前选中的会话被暂停时禁领 / 提示，不波及其它 ACTIVE 会话 */
const selectedClaimSessionPaused = computed(() => {
  const sessionId = claimForm.sessionId.trim()
  return !!sessionId && pausedSessionIds.value.has(sessionId)
})

const canClaim = computed(
  () =>
    !selectedClaimSessionPaused.value && !!claimForm.sessionId.trim() && !!claimForm.groupId.trim(),
)

const claimContext = computed<TeacherClaimContextResponse | null>(() =>
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

function buildTrialSessionSelectOptions(sessions: TrialSessionResponse[]) {
  return sessions.map((session) => ({
    value: session.id,
    label: formatSessionSelectLabel(
      strictEnumLabel(TrialSessionStatusDescription, session.sessionStatus, '试评会话状态'),
      session.createTime,
    ),
  }))
}

function buildFormalSessionSelectOptions(sessions: FormalSessionResponse[]) {
  return sessions.map((session) => ({
    value: session.id,
    label: formatSessionSelectLabel(
      strictEnumLabel(FormalSessionStatusDescription, session.sessionStatus, '正评会话状态'),
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
    options: MARKING_TASK_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
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
  if (claiming.value) {
    return
  }
  if (selectedClaimSessionPaused.value) {
    message.warning('当前正评会话已暂停，暂停期间无法领取新任务')
    return
  }
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
      await Promise.all([loadTasks(), loadClaimContext()])
      try {
        await refreshSnapshot()
      } catch (error) {
        showUserError(error, '考试工作台状态刷新失败')
      }
    }
  } catch (error) {
    showUserError(error, '领取阅卷任务失败')
  } finally {
    claiming.value = false
  }
}

function buildMarkingTaskRowActions(task: MarkingTaskResponse): UiTableRowActionItem[] {
  if (
    [MarkingTaskStatusCode.ALLOCATED, MarkingTaskStatusCode.IN_PROGRESS].includes(task.taskStatus)
  ) {
    return [{ key: 'enter', label: '进入批阅', tone: 'primary' }]
  }
  if (task.taskStatus === MarkingTaskStatusCode.FINALIZED) {
    return [{ key: 'view', label: '查看阅卷' }]
  }
  return []
}

function goDetail(task: MarkingTaskResponse): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceMarkingTaskDetail',
    params: { examId: selectedExamId.value, taskId: task.id },
  })
}

function goMarkingOrg(): void {
  if (!selectedExamId.value) return
  navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.ASSIGN, selectedExamId.value)
}

/**
 * 把 record.taskStatus 渲染成中文标签，未知枚举直接暴露契约错误。
 */
function taskStatusLabel(value: MarkingTaskStatusCode): string {
  return strictEnumLabel(MarkingTaskStatusDescription, value, '阅卷任务状态')
}

function anonymityModeLabel(mode: AnonymityModeCode): string {
  return strictEnumLabel(AnonymityModeDescription, mode, '匿名模式')
}

/**
 * 把 record.taskStatus 渲染成 UiTag 色调，未知枚举直接暴露契约错误。
 */
function taskStatusTone(value: MarkingTaskStatusCode): BadgeTone {
  return strictEnumTone(MARKING_TASK_STATUS_TONE, value, '阅卷任务状态')
}

watch(
  selectedExamId,
  () => {
    claimForm.groupId = ''
    claimForm.sessionId = ''
    claimForm.markingPhase = markingPhase.value
    pausedSessionIds.value = new Set()
    tasksLoadError.value = ''
    clearBatchSelection()
    batchMode.value = false
    void loadTasks()
    void loadClaimContext()
    void loadGroupLeaderFlag()
    void teacherTaskStream.refresh()
    void groupLeaderStream.refresh()
  },
  { immediate: true },
)

watch(isGroupLeader, () => {
  void groupLeaderStream.refresh()
  taskListPolling.syncPolling()
})

watch(
  () => [teacherTaskStream.ready.value, groupLeaderStream.ready.value],
  () => {
    taskListPolling.syncPolling()
  },
)

watch(markingPhase, () => {
  claimForm.markingPhase = markingPhase.value
  void loadClaimContext()
})
</script>

<style lang="scss" scoped>
.marking-task-pool-page {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
  min-width: 0;

  &__claim-title,
  &__task-title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    margin: 0;
    font-size: 16px;
    font-weight: var(--dp-font-weight-title);
    line-height: 1.5;
    color: var(--dp-text-primary);
  }

  &__task-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-3);
    flex-wrap: wrap;
    width: 100%;
  }
}

.muted {
  color: var(--dp-text-quaternary);
}

:deep(.marking-task-pool-row--highlight > td) {
  background-color: var(--dp-primary-50);
  transition: background-color 2s ease;
}
</style>
