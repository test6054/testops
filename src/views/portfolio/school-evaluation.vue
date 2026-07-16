<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioEvaluationTaskVO,
  PortfolioEvaluationWorkgroupOptionVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { Input, message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PORTFOLIO_EVALUATION_MODE_OPTIONS,
  PORTFOLIO_EVALUATION_TASK_STATUS_TONE,
  PortfolioEvaluationModeCode,
  PortfolioEvaluationTaskAdvanceActionCode,
  PortfolioEvaluationTaskAdvanceActionDescription,
  PortfolioEvaluationTaskStatusCode,
  PortfolioEvaluationTaskStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationPublicityApi } from '@/apis/portfolio/evaluation-publicity'
import {
  portfolioEvaluationTaskApi,
  portfolioEvaluationWorkgroupApi,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const ADVANCE_ACTIONS: Partial<
  Record<PortfolioEvaluationTaskStatusCode, PortfolioEvaluationTaskAdvanceActionCode>
> = {
  [PortfolioEvaluationTaskStatusCode.PUBLISHED]:
    PortfolioEvaluationTaskAdvanceActionCode.START_PRELIMINARY_REVIEW,
  [PortfolioEvaluationTaskStatusCode.PRELIMINARY_REVIEW]:
    PortfolioEvaluationTaskAdvanceActionCode.START_SCHOOL_REVIEW,
  [PortfolioEvaluationTaskStatusCode.SCHOOL_REVIEW]:
    PortfolioEvaluationTaskAdvanceActionCode.START_EXPERT_REVIEW,
  [PortfolioEvaluationTaskStatusCode.EXPERT_REVIEW]:
    PortfolioEvaluationTaskAdvanceActionCode.START_RESULT_SUMMARY,
}

function canArchiveTask(task: PortfolioEvaluationTaskVO): boolean {
  return (
    (task.taskStatus === PortfolioEvaluationTaskStatusCode.PUBLICITY
      || task.taskStatus === PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING)
    && task.publicityExpiredAwaitingArchive === true
  )
}

function canSuspendTask(task: PortfolioEvaluationTaskVO): boolean {
  return [
    PortfolioEvaluationTaskStatusCode.PUBLISHED,
    PortfolioEvaluationTaskStatusCode.PRELIMINARY_REVIEW,
    PortfolioEvaluationTaskStatusCode.SCHOOL_REVIEW,
    PortfolioEvaluationTaskStatusCode.EXPERT_REVIEW,
    PortfolioEvaluationTaskStatusCode.RESULT_SUMMARY,
    PortfolioEvaluationTaskStatusCode.PUBLICITY,
    PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING,
  ].includes(task.taskStatus)
}

function advanceActionLabel(action: PortfolioEvaluationTaskAdvanceActionCode): string {
  return strictEnumLabel(
    PortfolioEvaluationTaskAdvanceActionDescription,
    action,
    '评价任务推进动作',
  )
}

function taskStatusLabel(status: PortfolioEvaluationTaskStatusCode): string {
  return strictEnumLabel(PortfolioEvaluationTaskStatusDescription, status, '多元评价任务状态')
}

function taskStatusTone(status: PortfolioEvaluationTaskStatusCode) {
  return strictEnumTone(PORTFOLIO_EVALUATION_TASK_STATUS_TONE, status, '多元评价任务状态')
}

const loading = ref(false)
const advancingId = ref('')
const archivingId = ref('')
const publishing = ref(false)
const requestToken = ref(0)
const router = useRouter()
const rows = ref<PortfolioEvaluationTaskVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const publishModalOpen = ref(false)
const publishTarget = ref<PortfolioEvaluationTaskVO | null>(null)
const createModalOpen = ref(false)
const creating = ref(false)
const workgroupsLoading = ref(false)
const workgroups = ref<PortfolioEvaluationWorkgroupOptionVO[]>([])
const writing = computed(
  () =>
    creating.value || Boolean(advancingId.value) || Boolean(archivingId.value) || publishing.value,
)
const publishForm = reactive({
  publicityTitle: '',
  startTime: '',
  endTime: '',
})
const createForm = reactive({
  taskName: '',
  evaluationMode: PortfolioEvaluationModeCode.BY_INDICATOR,
  targetIndicatorCode: '',
  workgroupId: '',
  startTime: '',
  endTime: '',
})

const columns: ColumnsType<PortfolioEvaluationTaskVO> = [
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName', fixed: 'left' },
  { title: '模式', dataIndex: 'evaluationMode', key: 'evaluationMode', width: 100 },
  { title: '时间窗', key: 'timeWindow', width: 200 },
  { title: '状态', key: 'taskStatus', width: 120 },
  { title: '操作', key: 'actions', width: 200 },
]

const expiredAwaitingArchiveTasks = computed(() =>
  rows.value.filter((row) => row.publicityExpiredAwaitingArchive === true),
)

const archiveReminderText = computed(() => {
  const tasks = expiredAwaitingArchiveTasks.value
  if (tasks.length === 0) {
    return ''
  }
  const names = tasks.map((task) => task.taskName).join('、')
  return tasks.length === 1
    ? `「${names}」公示已结束且无待复核异议，请执行归档。`
    : `${tasks.length} 个评价任务（${names}）公示已结束且无待复核异议，请逐条执行归档。`
})

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = { pageNum: pageNum.value, pageSize: pageSize.value }
  loading.value = true
  try {
    const page = await portfolioEvaluationTaskApi.page(request)
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = []
    pageTotal.value = 0
    showUserError(error, '加载评价任务失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

async function openCreateModal() {
  if (writing.value) {
    return
  }
  createModalOpen.value = true
  workgroupsLoading.value = true
  try {
    const page = await portfolioEvaluationWorkgroupApi.page({
      pageNum: 1,
      pageSize: 200,
      enabled: true,
    })
    workgroups.value = page.list.filter((item) => item.enabled)
  } catch (error) {
    showUserError(error, '加载评价工作组失败')
  } finally {
    workgroupsLoading.value = false
  }
}

async function submitCreateTask() {
  if (writing.value) {
    return
  }
  if (
    !createForm.taskName.trim()
    || !createForm.workgroupId
    || !createForm.startTime
    || !createForm.endTime
  ) {
    showFormValidationMessage('请填写任务名称、工作组和评价时间窗')
    return
  }
  if (
    createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON
    && !createForm.targetIndicatorCode.trim()
  ) {
    showFormValidationMessage('按人评价须填写画像回流目标指标编码')
    return
  }
  creating.value = true
  try {
    await portfolioEvaluationTaskApi.create({
      taskName: createForm.taskName.trim(),
      evaluationMode: createForm.evaluationMode,
      ...(createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON
        ? { targetIndicatorCode: createForm.targetIndicatorCode.trim() }
        : {}),
      workgroupId: createForm.workgroupId,
      startTime: createForm.startTime,
      endTime: createForm.endTime,
    })
    message.success('评价任务已创建，请核对后发布')
    createModalOpen.value = false
    createForm.taskName = ''
    createForm.evaluationMode = PortfolioEvaluationModeCode.BY_INDICATOR
    createForm.targetIndicatorCode = ''
    createForm.workgroupId = ''
    createForm.startTime = ''
    createForm.endTime = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '创建评价任务失败')
  } finally {
    creating.value = false
  }
}

function nextAction(
  status: PortfolioEvaluationTaskStatusCode,
): PortfolioEvaluationTaskAdvanceActionCode | undefined {
  return ADVANCE_ACTIONS[status]
}

async function advanceTask(
  row: PortfolioEvaluationTaskVO,
  action: PortfolioEvaluationTaskAdvanceActionCode | undefined = nextAction(row.taskStatus),
) {
  if (!action) {
    return
  }
  if (writing.value) {
    return
  }
  advancingId.value = row.id
  try {
    await portfolioEvaluationPublicityApi.advanceTask({ taskId: row.id, action })
    message.success('任务状态已推进')
    await loadPage()
  } catch (error) {
    showUserError(error, '推进任务失败')
  } finally {
    advancingId.value = ''
  }
}

async function archiveTask(row: PortfolioEvaluationTaskVO) {
  if (writing.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '确认归档评价任务',
    content: `确认归档「${row.taskName}」？归档后任务不再接受新的评价与异议。`,
    type: 'warning',
    okText: '确认归档',
  })
  if (!confirmed || writing.value) {
    return
  }
  archivingId.value = row.id
  try {
    await portfolioEvaluationPublicityApi.archiveTask(row.id)
    message.success('任务已归档')
    await loadPage()
  } catch (error) {
    showUserError(error, '归档任务失败')
  } finally {
    archivingId.value = ''
  }
}

function goObjectionHandling(row: PortfolioEvaluationTaskVO) {
  void router.push({
    path: '/portfolio/department/objection',
    query: { evaluationTaskId: row.id },
  })
}

function openPublishModal(row: PortfolioEvaluationTaskVO) {
  if (writing.value) {
    return
  }
  publishTarget.value = row
  publishForm.publicityTitle = `${row.taskName} 结果公示`
  publishForm.startTime = ''
  publishForm.endTime = ''
  publishModalOpen.value = true
}

async function submitPublish() {
  if (!publishTarget.value) {
    return
  }
  if (!publishForm.publicityTitle.trim()) {
    showFormValidationMessage('请填写公示标题')
    return
  }
  if (!publishForm.startTime || !publishForm.endTime) {
    showFormValidationMessage('请填写公示起止时间')
    return
  }
  if (writing.value) {
    return
  }
  const evaluationTaskId = publishTarget.value.id
  const publicityTitle = publishForm.publicityTitle.trim()
  const startTime = publishForm.startTime
  const endTime = publishForm.endTime
  publishing.value = true
  try {
    await portfolioEvaluationPublicityApi.publishPublicity({
      evaluationTaskId,
      publicityTitle,
      startTime,
      endTime,
    })
    message.success('公示已发布')
    publishModalOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '发布公示失败')
  } finally {
    publishing.value = false
  }
}

/** 组装学校评价任务行内操作。 */
function buildTaskRowActions(row: PortfolioEvaluationTaskVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  const advance = nextAction(row.taskStatus)
  if (advance) {
    actions.push({
      key: 'advance',
      label: advanceActionLabel(advance),
      tone: 'primary',
      disabled: writing.value,
    })
  }
  if (row.taskStatus === PortfolioEvaluationTaskStatusCode.SUSPENDED) {
    actions.push({ key: 'resume', label: '恢复任务', tone: 'primary', disabled: writing.value })
  } else if (canSuspendTask(row)) {
    actions.push({ key: 'suspend', label: '暂停任务', tone: 'danger', disabled: writing.value })
  }
  if (row.taskStatus === PortfolioEvaluationTaskStatusCode.RESULT_SUMMARY) {
    actions.push({ key: 'publish', label: '发布公示', tone: 'primary', disabled: writing.value })
  }
  if (row.taskStatus === PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING) {
    actions.push({ key: 'objection', label: '处理异议', tone: 'primary' })
  }
  if (canArchiveTask(row)) {
    actions.push({
      key: 'archive',
      label: '归档',
      tone: 'primary',
      disabled: writing.value,
    })
  }
  return actions
}

function handleTaskRowAction(key: string, row: PortfolioEvaluationTaskVO): void {
  switch (key) {
    case 'advance':
      void advanceTask(row)
      break
    case 'suspend':
      void advanceTask(row, PortfolioEvaluationTaskAdvanceActionCode.SUSPEND)
      break
    case 'resume':
      void advanceTask(row, PortfolioEvaluationTaskAdvanceActionCode.RESUME)
      break
    case 'publish':
      openPublishModal(row)
      break
    case 'objection':
      goObjectionHandling(row)
      break
    case 'archive':
      void archiveTask(row)
      break
  }
}

void loadPage()
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="学校评价" description="评价任务状态推进、公示发布与归档">
      <template #actions>
        <UiButton variant="primary" @click="() => void openCreateModal()"> 新建任务 </UiButton>
        <UiButton :loading="loading" @click="() => void loadPage()"> 刷新 </UiButton>
      </template>
    </ContextBar>

    <UiAlertStrip
      v-if="archiveReminderText"
      tone="warning"
      :closable="false"
      :title="archiveReminderText"
    />

    <UiCard title="评价任务">
      <UiDataTable
        v-if="rows.length || loading"
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        row-key="id"
        @page-change="() => void loadPage()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'timeWindow'">
            {{ record.startTime }} — {{ record.endTime }}
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag :tone="taskStatusTone(record.taskStatus)">
              {{ taskStatusLabel(record.taskStatus) }}
            </UiTag>
            <span v-if="record.suspendedFromStatus" class="school-evaluation__suspended-from">
              恢复至 {{ taskStatusLabel(record.suspendedFromStatus) }}
            </span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildTaskRowActions(record)"
              @action="(key) => handleTaskRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
      <UiEmpty v-else description="暂无评价任务" />
    </UiCard>

    <a-modal
      v-model:open="publishModalOpen"
      title="发布评价公示"
      ok-text="发布"
      cancel-text="取消"
      @ok="() => void submitPublish()"
    >
      <Input
        v-model:value="publishForm.publicityTitle"
        class="school-evaluation__field"
        placeholder="公示标题"
      />
      <a-date-picker
        v-model:value="publishForm.startTime"
        show-time
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="开始时间"
        class="school-evaluation__field"
        style="width: 100%"
      />
      <a-date-picker
        v-model:value="publishForm.endTime"
        show-time
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="结束时间"
        style="width: 100%"
      />
    </a-modal>

    <a-modal
      v-model:open="createModalOpen"
      title="新建评价任务"
      ok-text="创建"
      cancel-text="取消"
      :confirm-loading="creating"
      @ok="() => void submitCreateTask()"
    >
      <Input
        v-model:value="createForm.taskName"
        class="school-evaluation__field"
        placeholder="任务名称"
      />
      <a-select
        v-model:value="createForm.workgroupId"
        :loading="workgroupsLoading"
        :options="
          workgroups.map((item) => ({
            value: item.id,
            label: `${item.workgroupName}（${item.workgroupCode}）`,
          }))
        "
        placeholder="选择启用的评价工作组"
        class="school-evaluation__field"
      />
      <a-select
        v-model:value="createForm.evaluationMode"
        :options="PORTFOLIO_EVALUATION_MODE_OPTIONS"
        placeholder="评价模式"
        class="school-evaluation__field"
      />
      <Input
        v-if="createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON"
        v-model:value="createForm.targetIndicatorCode"
        class="school-evaluation__field"
        placeholder="画像回流目标指标编码"
      />
      <a-date-picker
        v-model:value="createForm.startTime"
        show-time
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="评价开始时间"
        class="school-evaluation__field"
        style="width: 100%"
      />
      <a-date-picker
        v-model:value="createForm.endTime"
        show-time
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="评价结束时间"
        style="width: 100%"
      />
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.school-evaluation__field {
  display: block;
  width: 100%;
  margin-bottom: var(--dp-space-3);
}

.school-evaluation__suspended-from {
  display: block;
  margin-top: var(--dp-space-1);
  color: var(--dp-text-secondary);
  font-size: 12px;
}
</style>
