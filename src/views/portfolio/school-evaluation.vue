<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationTaskVO } from '@/apis/portfolio/teacher-platform'
import { portfolioEvaluationTaskApi } from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { Input, message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PORTFOLIO_EVALUATION_TASK_STATUS_TONE,
  PortfolioEvaluationTaskAdvanceActionCode,
  PortfolioEvaluationTaskAdvanceActionDescription,
  PortfolioEvaluationTaskStatusCode,
  PortfolioEvaluationTaskStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationPublicityApi } from '@/apis/portfolio/evaluation-publicity'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
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

function canArchiveTask(status: PortfolioEvaluationTaskStatusCode): boolean {
  return (
    status === PortfolioEvaluationTaskStatusCode.PUBLICITY ||
    status === PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING
  )
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
const router = useRouter()
const rows = ref<PortfolioEvaluationTaskVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const publishModalOpen = ref(false)
const publishTarget = ref<PortfolioEvaluationTaskVO | null>(null)
const publishForm = reactive({
  publicityTitle: '',
  startTime: '',
  endTime: '',
})

const columns: ColumnsType<PortfolioEvaluationTaskVO> = [
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
  { title: '模式', dataIndex: 'evaluationMode', key: 'evaluationMode', width: 100 },
  { title: '时间窗', key: 'timeWindow', width: 200 },
  { title: '状态', key: 'taskStatus', width: 120 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
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
  loading.value = true
  try {
    const page = await portfolioEvaluationTaskApi.page({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    showUserError(error, '加载评价任务失败')
  } finally {
    loading.value = false
  }
}

function nextAction(
  status: PortfolioEvaluationTaskStatusCode,
): PortfolioEvaluationTaskAdvanceActionCode | undefined {
  return ADVANCE_ACTIONS[status]
}

async function advanceTask(row: PortfolioEvaluationTaskVO) {
  const action = nextAction(row.taskStatus)
  if (!action) {
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
    message.warning('请填写公示标题')
    return
  }
  if (!publishForm.startTime || !publishForm.endTime) {
    message.warning('请填写公示起止时间')
    return
  }
  try {
    await portfolioEvaluationPublicityApi.publishPublicity({
      evaluationTaskId: publishTarget.value.id,
      publicityTitle: publishForm.publicityTitle.trim(),
      startTime: publishForm.startTime,
      endTime: publishForm.endTime,
    })
    message.success('公示已发布')
    publishModalOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '发布公示失败')
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
      disabled: advancingId.value === row.id,
    })
  }
  if (row.taskStatus === PortfolioEvaluationTaskStatusCode.RESULT_SUMMARY) {
    actions.push({ key: 'publish', label: '发布公示', tone: 'primary' })
  }
  if (row.taskStatus === PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING) {
    actions.push({ key: 'objection', label: '处理异议', tone: 'primary' })
  }
  if (canArchiveTask(row.taskStatus)) {
    actions.push({
      key: 'archive',
      label: '归档',
      tone: 'primary',
      disabled: archivingId.value === row.id,
    })
  }
  return actions
}

function handleTaskRowAction(key: string, row: PortfolioEvaluationTaskVO): void {
  switch (key) {
    case 'advance':
      void advanceTask(row)
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
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.school-evaluation__field {
  display: block;
  width: 100%;
  margin-bottom: var(--dp-space-3);
}
</style>
