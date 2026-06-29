<template>
  <div class="archive-volume-remediation-panel">
    <div class="archive-volume-remediation-panel__toolbar">
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
      <UiButton
        v-if="isTenantWideCollegeCoordinator"
        size="sm"
        variant="outline"
        @click="openCampaignModal()"
      >
        新建批次
      </UiButton>
      <UiButton
        v-if="isTenantWideCollegeCoordinator && selectedCampaign"
        size="sm"
        variant="outline"
        @click="openCampaignModal(selectedCampaign)"
      >
        编辑批次
      </UiButton>
      <UiButton
        v-if="isTenantWideCollegeCoordinator && selectedCampaignId"
        size="sm"
        variant="outline"
        :loading="exporting"
        @click="handleExportCampaign"
      >
        导出材料包
      </UiButton>
      <UiButton
        v-if="canShowCreateRemediationTask"
        size="sm"
        variant="primary"
        @click="openCreateTaskModal"
      >
        创建整改任务
      </UiButton>
    </div>

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
      empty-description="请选择评估批次查看整改任务"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'taskStatus'">
          <UiTag :tone="remediationStatusTone(record.taskStatus)" size="sm">
            {{ remediationStatusLabel(record.taskStatus) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'assigneeNickName'">
          {{ remediationAssigneeLabel(record) }}
        </template>
        <template v-else-if="column.key === 'volumeId'">
          <UiTextAction @click="goVolumeDetail(record.volumeId, record.taskId)">{{ record.volumeId }}</UiTextAction>
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
            <a-descriptions-item label="卷 ID">
              <UiTextAction @click="goVolumeDetail(taskDetail.volumeId, taskDetail.taskId)">
                {{ taskDetail.volumeId }}
              </UiTextAction>
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              {{ remediationStatusLabel(taskDetail.taskStatus) }}
            </a-descriptions-item>
            <a-descriptions-item label="责任人">{{ remediationAssigneeLabel(taskDetail) }}</a-descriptions-item>
            <a-descriptions-item v-if="canManageTaskAsCoordinator && taskDetail.taskStatus !== 'CLOSED'" label="改派责任人">
              <ArchiveDutyUserSelect v-model:value="editAssigneeUserId" />
            </a-descriptions-item>
            <a-descriptions-item label="诊断码">{{ taskDetail.diagnosticCode || '—' }}</a-descriptions-item>
            <a-descriptions-item label="说明">{{ taskDetail.taskDescription || '—' }}</a-descriptions-item>
            <a-descriptions-item label="截止">{{ taskDetail.dueTime || '—' }}</a-descriptions-item>
            <a-descriptions-item label="关闭">{{ taskDetail.closedTime || '—' }}</a-descriptions-item>
          </a-descriptions>
          <div v-if="taskDetail.taskStatus !== 'CLOSED'" class="task-actions">
            <template v-if="canManageTaskAsCoordinator">
              <UiButton
                v-if="canSaveAssigneeReassign"
                size="sm"
                variant="outline"
                :loading="reassigning"
                @click="reassignAssignee"
              >
                保存改派
              </UiButton>
              <template v-if="taskDetail.taskStatus === 'OPEN'">
                <UiButton size="sm" :loading="updating" @click="advanceStatus('IN_PROGRESS')">开始处理</UiButton>
                <UiButton size="sm" variant="outline" :loading="updating" @click="advanceStatus('CLOSED')">关闭</UiButton>
              </template>
              <template v-else-if="taskDetail.taskStatus === 'IN_PROGRESS'">
                <UiButton size="sm" :loading="updating" @click="advanceStatus('RESUBMITTED')">标记已重提</UiButton>
                <UiButton size="sm" variant="outline" :loading="updating" @click="advanceStatus('CLOSED')">关闭</UiButton>
              </template>
              <template v-else-if="taskDetail.taskStatus === 'RESUBMITTED'">
                <UiButton size="sm" variant="outline" :loading="updating" @click="advanceStatus('CLOSED')">复检关闭</UiButton>
              </template>
            </template>
            <template v-else-if="isCurrentAssignee">
              <UiButton
                v-if="taskDetail.taskStatus === 'OPEN'"
                size="sm"
                :loading="updating"
                @click="advanceStatus('IN_PROGRESS')"
              >
                开始处理
              </UiButton>
              <UiButton
                v-if="taskDetail.taskStatus === 'IN_PROGRESS'"
                size="sm"
                :loading="updating"
                @click="advanceStatus('RESUBMITTED')"
              >
                标记已重提
              </UiButton>
            </template>
          </div>
        </template>
      </a-spin>
    </a-drawer>

    <a-modal
      v-model:open="campaignModalOpen"
      :title="campaignForm.campaignId ? '编辑评估批次' : '新建评估批次'"
      :confirm-loading="campaignSaving"
      ok-text="保存"
      cancel-text="取消"
      @ok="submitCampaign"
    >
      <a-form layout="vertical">
        <a-form-item label="批次名称" required>
          <a-input v-model:value="campaignForm.campaignName" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="学年">
              <a-input v-model:value="campaignForm.academicYear" placeholder="2024-2025" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学期">
              <a-select v-model:value="campaignForm.semester" :options="semesterOptions" allow-clear style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="状态" required>
          <a-select v-model:value="campaignForm.campaignStatus" :options="campaignStatusOptions" style="width: 100%" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="开始时间">
              <a-date-picker v-model:value="campaignForm.startTime" show-time value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束时间">
              <a-date-picker v-model:value="campaignForm.endTime" show-time value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="说明">
          <a-textarea v-model:value="campaignForm.description" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="createTaskOpen"
      title="创建整改任务"
      :confirm-loading="createTaskSubmitting"
      ok-text="创建"
      cancel-text="取消"
      @ok="submitCreateTask"
    >
      <a-form layout="vertical">
        <a-form-item label="关联批次">
          <a-select
            v-model:value="createTaskForm.campaignId"
            :options="campaignOptions"
            allow-clear
            placeholder="可选"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="卷 ID" required>
          <a-input v-model:value="createTaskForm.volumeId" />
        </a-form-item>
        <a-form-item label="任务标题" required>
          <a-input v-model:value="createTaskForm.taskTitle" />
        </a-form-item>
        <a-form-item label="诊断码">
          <a-input v-model:value="createTaskForm.diagnosticCode" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="createTaskForm.taskDescription" :rows="2" />
        </a-form-item>
        <a-form-item label="责任人" required>
          <ArchiveDutyUserSelect v-model:value="createTaskForm.assigneeUserId" />
        </a-form-item>
        <a-form-item label="截止时间">
          <a-date-picker v-model:value="createTaskForm.dueTime" show-time value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignStatusCode,
  ArchiveEvaluationCampaignVO,
  ArchiveRemediationStatusCode,
  ArchiveRemediationTaskVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_EVALUATION_CAMPAIGN_STATUS_LABEL,
  ARCHIVE_REMEDIATION_STATUS_LABEL,
  createRemediationTask,
  exportEvaluationPackage,
  getArchiveVolumeDetail,
  getRemediationTask,
  listEvaluationCampaigns,
  listRemediationTasksByCampaign,
  saveEvaluationCampaign,
  updateRemediationTask,
} from '@/apis/mark/archive-volume'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { useUserStore } from '@/stores/modules/user'
import { remediationAssigneeLabel } from '@/utils/archive-remediation-display'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeRemediationPanel' })

const router = useRouter()
const userStore = useUserStore()
const {
  isTenantWideCollegeCoordinator,
  scopedDepartmentIds,
  canManageRemediationAsCoordinator,
  loadGrants,
} = useArchiveDutyAccess()

const campaignLoading = ref(false)
const taskLoading = ref(false)
const detailLoading = ref(false)
const updating = ref(false)
const reassigning = ref(false)
const editAssigneeUserId = ref<string | undefined>(undefined)
const exporting = ref(false)
const campaignSaving = ref(false)
const createTaskSubmitting = ref(false)
const detailOpen = ref(false)
const campaignModalOpen = ref(false)
const createTaskOpen = ref(false)
const campaigns = ref<ArchiveEvaluationCampaignVO[]>([])
const tasks = ref<ArchiveRemediationTaskVO[]>([])
const taskDetail = ref<ArchiveRemediationTaskVO | null>(null)
const taskVolumeDepartmentId = ref<string>()
const selectedCampaignId = ref<string>()
const selectedTaskId = ref('')

const semesterOptions = [
  { value: '1', label: '第 1 学期' },
  { value: '2', label: '第 2 学期' },
]

const campaignStatusOptions = Object.entries(ARCHIVE_EVALUATION_CAMPAIGN_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const campaignForm = reactive({
  campaignId: undefined as string | undefined,
  campaignName: '',
  academicYear: '',
  semester: undefined as string | undefined,
  campaignStatus: 'ACTIVE' as ArchiveEvaluationCampaignStatusCode,
  startTime: undefined as string | undefined,
  endTime: undefined as string | undefined,
  description: '',
})

const createTaskForm = reactive({
  campaignId: undefined as string | undefined,
  volumeId: '',
  taskTitle: '',
  taskDescription: '',
  diagnosticCode: '',
  assigneeUserId: undefined as string | undefined,
  dueTime: undefined as string | undefined,
})

const selectedCampaign = computed(() =>
  campaigns.value.find(item => item.campaignId === selectedCampaignId.value),
)

const campaignOptions = computed(() =>
  campaigns.value.map(item => ({
    label: item.campaignName,
    value: item.campaignId,
  })),
)

const canShowCreateRemediationTask = computed(() =>
  isTenantWideCollegeCoordinator.value || scopedDepartmentIds.value.length > 0,
)

const canManageTaskAsCoordinator = computed(() =>
  taskVolumeDepartmentId.value
    ? canManageRemediationAsCoordinator({ departmentId: taskVolumeDepartmentId.value })
    : false,
)

const isCurrentAssignee = computed(() =>
  taskDetail.value?.assigneeUserId === userStore.userInfo.userId,
)

const canSaveAssigneeReassign = computed(() => {
  const task = taskDetail.value
  if (!task || task.taskStatus === 'CLOSED') return false
  if (!editAssigneeUserId.value) return false
  return editAssigneeUserId.value !== task.assigneeUserId
})

const taskColumns: ColumnsType<ArchiveRemediationTaskVO> = [
  { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '卷 ID', dataIndex: 'volumeId', key: 'volumeId', width: 100 },
  { title: '状态', key: 'taskStatus', dataIndex: 'taskStatus', width: 110 },
  { title: '责任人', key: 'assigneeNickName', dataIndex: 'assigneeNickName', width: 120 },
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

function goVolumeDetail(volumeId: string, remediationTaskId?: string) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: {
      tab: 'materials',
      ...(remediationTaskId ? { remediationTaskId } : {}),
    },
  })
}

async function loadCampaigns() {
  campaignLoading.value = true
  try {
    campaigns.value = await listEvaluationCampaigns()
    if (!selectedCampaignId.value && campaigns.value.length > 0) {
      selectedCampaignId.value = campaigns.value[0].campaignId
      await loadTasks()
    }
  }
  catch (error) {
    showUserError(error)
  }
  finally {
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
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    taskLoading.value = false
  }
}

function openCampaignModal(campaign?: ArchiveEvaluationCampaignVO) {
  campaignForm.campaignId = campaign?.campaignId
  campaignForm.campaignName = campaign?.campaignName ?? ''
  campaignForm.academicYear = campaign?.academicYear ?? ''
  campaignForm.semester = campaign?.semester
  campaignForm.campaignStatus = campaign?.campaignStatus ?? 'ACTIVE'
  campaignForm.startTime = campaign?.startTime
  campaignForm.endTime = campaign?.endTime
  campaignForm.description = campaign?.description ?? ''
  campaignModalOpen.value = true
}

async function submitCampaign() {
  if (!campaignForm.campaignName.trim()) {
    message.warning('请填写批次名称')
    return
  }
  campaignSaving.value = true
  try {
    const saved = await saveEvaluationCampaign({
      campaignId: campaignForm.campaignId,
      campaignName: campaignForm.campaignName.trim(),
      academicYear: campaignForm.academicYear.trim() || undefined,
      semester: campaignForm.semester,
      campaignStatus: campaignForm.campaignStatus,
      startTime: campaignForm.startTime,
      endTime: campaignForm.endTime,
      description: campaignForm.description.trim() || undefined,
    })
    message.success(campaignForm.campaignId ? '评估批次已更新' : '评估批次已创建')
    campaignModalOpen.value = false
    await loadCampaigns()
    selectedCampaignId.value = saved.campaignId
    await loadTasks()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    campaignSaving.value = false
  }
}

async function handleExportCampaign() {
  if (!selectedCampaignId.value) return
  exporting.value = true
  try {
    const result = await exportEvaluationPackage(selectedCampaignId.value)
    if (!result.exportFileId) {
      message.error('导出未返回文件 ID')
      return
    }
    await downloadFile({ nodeId: result.exportFileId })
    message.success(`评估材料包已导出，共 ${result.volumeCount ?? 0} 卷`)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    exporting.value = false
  }
}

function openCreateTaskModal() {
  createTaskForm.campaignId = selectedCampaignId.value
  createTaskForm.volumeId = ''
  createTaskForm.taskTitle = ''
  createTaskForm.taskDescription = ''
  createTaskForm.diagnosticCode = ''
  createTaskForm.assigneeUserId = undefined
  createTaskForm.dueTime = undefined
  createTaskOpen.value = true
}

async function submitCreateTask() {
  if (!createTaskForm.volumeId.trim()) {
    message.warning('请填写卷 ID')
    return
  }
  if (!createTaskForm.taskTitle.trim()) {
    message.warning('请填写任务标题')
    return
  }
  if (!createTaskForm.assigneeUserId) {
    message.warning('请选择责任人')
    return
  }
  createTaskSubmitting.value = true
  try {
    const volumeDetail = await getArchiveVolumeDetail(createTaskForm.volumeId.trim())
    if (!canManageRemediationAsCoordinator(volumeDetail.volume)) {
      message.error('缺少该卷所属院系的 COLLEGE_COORDINATOR 职责，无法创建整改任务')
      return
    }
    await createRemediationTask({
      campaignId: createTaskForm.campaignId,
      volumeId: createTaskForm.volumeId.trim(),
      taskTitle: createTaskForm.taskTitle.trim(),
      taskDescription: createTaskForm.taskDescription.trim() || undefined,
      diagnosticCode: createTaskForm.diagnosticCode.trim() || undefined,
      assigneeUserId: createTaskForm.assigneeUserId,
      dueTime: createTaskForm.dueTime,
    })
    message.success('整改任务已创建')
    createTaskOpen.value = false
    if (createTaskForm.campaignId) {
      selectedCampaignId.value = createTaskForm.campaignId
    }
    await loadTasks()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    createTaskSubmitting.value = false
  }
}

async function openTask(taskId: string) {
  selectedTaskId.value = taskId
  detailOpen.value = true
  detailLoading.value = true
  taskVolumeDepartmentId.value = undefined
  try {
    taskDetail.value = await getRemediationTask(taskId)
    editAssigneeUserId.value = taskDetail.value.assigneeUserId
    const volumeDetail = await getArchiveVolumeDetail(taskDetail.value.volumeId)
    taskVolumeDepartmentId.value = volumeDetail.volume.departmentId
  }
  catch (error) {
    showUserError(error)
    detailOpen.value = false
  }
  finally {
    detailLoading.value = false
  }
}

async function reassignAssignee() {
  if (!selectedTaskId.value || !editAssigneeUserId.value) return
  reassigning.value = true
  try {
    taskDetail.value = await updateRemediationTask({
      taskId: selectedTaskId.value,
      assigneeUserId: editAssigneeUserId.value,
    })
    editAssigneeUserId.value = taskDetail.value.assigneeUserId
    message.success('责任人已改派')
    await loadTasks()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    reassigning.value = false
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
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    updating.value = false
  }
}

onMounted(() => {
  void loadGrants()
  void loadCampaigns()
})
</script>

<style scoped>
.archive-volume-remediation-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-desc {
  margin-bottom: 16px;
}

.task-actions {
  display: flex;
  gap: 8px;
}
</style>
