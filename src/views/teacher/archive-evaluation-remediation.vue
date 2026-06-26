<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">迎评整改</UiTag>
        </template>
        <template #actions>
          <a-select
            v-model:value="selectedCampaignId"
            :loading="campaignLoading"
            :options="campaignOptions"
            allow-clear
            placeholder="选择评估批次"
            style="width: 280px"
            @change="loadTasks"
          />
          <UiButton size="sm" :disabled="!selectedCampaignId" @click="loadTasks">刷新</UiButton>
        </template>
      </ContextBar>
    </template>

    <UiDataTable
      pagination-mode="none"
      :columns="taskColumns"
      :data-source="tasks"
      :loading="taskLoading"
      :show-pagination="false"
      flat
      row-key="taskId"
      size="middle"
      class="student-detail-table__data-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'taskStatus'">
          <UiTag :tone="remediationStatusTone(record.taskStatus)" size="sm">
            {{ remediationStatusLabel(record.taskStatus) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTextAction @click="openTask(record.taskId)">详情</UiTextAction>
        </template>
      </template>
    </UiDataTable>

    <a-drawer
      v-model:open="detailOpen"
      title="整改任务"
      width="560"
      :destroy-on-close="true"
      @close="selectedTaskId = ''"
    >
      <a-spin :spinning="detailLoading">
        <template v-if="taskDetail">
          <a-descriptions bordered size="small" :column="1" class="detail-desc">
            <a-descriptions-item label="标题">{{ taskDetail.taskTitle }}</a-descriptions-item>
            <a-descriptions-item label="卷 ID">{{ taskDetail.volumeId }}</a-descriptions-item>
            <a-descriptions-item label="状态">
              {{ remediationStatusLabel(taskDetail.taskStatus) }}
            </a-descriptions-item>
            <a-descriptions-item label="责任人">{{ taskDetail.assigneeUserId || '—' }}</a-descriptions-item>
            <a-descriptions-item label="诊断码">{{ taskDetail.diagnosticCode || '—' }}</a-descriptions-item>
            <a-descriptions-item label="说明">{{ taskDetail.taskDescription || '—' }}</a-descriptions-item>
            <a-descriptions-item label="截止">{{ taskDetail.dueTime || '—' }}</a-descriptions-item>
            <a-descriptions-item label="关闭">{{ taskDetail.closedTime || '—' }}</a-descriptions-item>
          </a-descriptions>
          <div v-if="taskDetail.taskStatus !== 'CLOSED'" class="task-actions">
            <template v-if="taskDetail.taskStatus === 'OPEN'">
              <UiButton size="sm" :loading="updating" @click="advanceStatus('IN_PROGRESS')">开始处理</UiButton>
              <UiButton size="sm" status="danger" :loading="updating" @click="advanceStatus('CLOSED')">关闭</UiButton>
            </template>
            <template v-else-if="taskDetail.taskStatus === 'IN_PROGRESS'">
              <UiButton size="sm" :loading="updating" @click="advanceStatus('RESUBMITTED')">标记已重提</UiButton>
              <UiButton size="sm" status="danger" :loading="updating" @click="advanceStatus('CLOSED')">关闭</UiButton>
            </template>
            <template v-else-if="taskDetail.taskStatus === 'RESUBMITTED'">
              <UiButton size="sm" status="danger" :loading="updating" @click="advanceStatus('CLOSED')">复检关闭</UiButton>
            </template>
          </div>
        </template>
      </a-spin>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignVO,
  ArchiveRemediationStatusCode,
  ArchiveRemediationTaskVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  ARCHIVE_REMEDIATION_STATUS_LABEL,
  getRemediationTask,
  listEvaluationCampaigns,
  listRemediationTasksByCampaign,
  updateRemediationTask,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveEvaluationRemediation' })

const campaignLoading = ref(false)
const taskLoading = ref(false)
const detailLoading = ref(false)
const updating = ref(false)
const detailOpen = ref(false)
const campaigns = ref<ArchiveEvaluationCampaignVO[]>([])
const tasks = ref<ArchiveRemediationTaskVO[]>([])
const taskDetail = ref<ArchiveRemediationTaskVO | null>(null)
const selectedCampaignId = ref<string>()
const selectedTaskId = ref('')

const campaignOptions = computed(() =>
  campaigns.value.map(item => ({
    label: item.campaignName,
    value: item.campaignId,
  })),
)

const taskColumns: ColumnsType<ArchiveRemediationTaskVO> = [
  { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '卷 ID', dataIndex: 'volumeId', key: 'volumeId', width: 100 },
  { title: '状态', key: 'taskStatus', dataIndex: 'taskStatus', width: 110 },
  { title: '责任人', dataIndex: 'assigneeUserId', key: 'assigneeUserId', width: 100 },
  { title: '操作', key: 'actions', width: 80 },
]

function remediationStatusLabel(code: ArchiveRemediationStatusCode) {
  return strictEnumLabel(ARCHIVE_REMEDIATION_STATUS_LABEL, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationStatusCode): BadgeTone {
  if (code === 'CLOSED') return 'gray'
  if (code === 'RESUBMITTED') return 'green'
  if (code === 'IN_PROGRESS') return 'blue'
  return 'orange'
}

async function loadCampaigns() {
  campaignLoading.value = true
  try {
    campaigns.value = await listEvaluationCampaigns()
    if (!selectedCampaignId.value && campaigns.value.length > 0) {
      selectedCampaignId.value = campaigns.value[0].campaignId
      await loadTasks()
    }
  } catch (error) {
    showUserError(error, '加载评估批次失败')
  } finally {
    campaignLoading.value = false
  }
}

async function loadTasks() {
  if (!selectedCampaignId.value) {
    tasks.value = []
    return
  }
  taskLoading.value = true
  try {
    tasks.value = await listRemediationTasksByCampaign(selectedCampaignId.value)
  } catch (error) {
    showUserError(error, '加载整改任务失败')
  } finally {
    taskLoading.value = false
  }
}

async function openTask(taskId: string) {
  selectedTaskId.value = taskId
  detailOpen.value = true
  detailLoading.value = true
  try {
    taskDetail.value = await getRemediationTask(taskId)
  } catch (error) {
    showUserError(error, '加载整改任务详情失败')
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

async function advanceStatus(taskStatus: ArchiveRemediationStatusCode) {
  if (!selectedTaskId.value) return
  updating.value = true
  try {
    taskDetail.value = await updateRemediationTask({
      taskId: selectedTaskId.value,
      taskStatus,
    })
    message.success('整改任务已更新')
    await loadTasks()
  } catch (error) {
    showUserError(error, '更新整改任务失败')
  } finally {
    updating.value = false
  }
}

onMounted(loadCampaigns)
</script>

<style scoped lang="scss">
.detail-desc {
  margin-bottom: 16px;
}

.task-actions {
  display: flex;
  gap: 8px;
}
</style>
