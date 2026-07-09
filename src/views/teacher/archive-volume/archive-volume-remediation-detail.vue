<template>
  <StageWorkbenchShell class="archive-remediation-detail">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="taskDetail?.taskTitle || '整改任务详情'"
        :subtitle="contextSubtitle"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goRemediationList">返回整改列表</UiButton>
          <UiButton
            v-if="
              taskDetail &&
              canActOnTask &&
              taskDetail.taskStatus === ArchiveRemediationStatusCode.OPEN
            "
            variant="primary"
            size="sm"
            :loading="updating"
            @click="advanceStatus(ArchiveRemediationStatusCode.IN_PROGRESS)"
          >
            开始处理
          </UiButton>
          <UiButton
            v-if="
              taskDetail &&
              canActOnTask &&
              taskDetail.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS
            "
            variant="primary"
            size="sm"
            :loading="updating"
            @click="advanceStatus(ArchiveRemediationStatusCode.RESUBMITTED)"
          >
            提交整改
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="taskDetail" #signal>
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <UiEmpty
      v-if="loadFailed"
      description="整改任务加载失败"
      action-label="重试"
      @action="loadTask"
    />

    <UiSkeletonState v-else-if="loading" variant="card" compact />

    <template v-else-if="taskDetail">
      <WorkbenchSurfaceCard flush class="archive-remediation-detail__section">
        <template #head>
          <div class="archive-remediation-detail__diag-head">
            <span>诊断信息</span>
            <UiTag v-if="taskDetail.diagnosticCode" tone="red" size="sm">
              {{ remediationDiagnosticLabel(taskDetail.diagnosticCode) }}
            </UiTag>
          </div>
        </template>
        <p class="archive-remediation-detail__desc">
          {{ taskDetail.taskDescription || '—' }}
        </p>
        <div class="archive-remediation-detail__links">
          <span>
            关联归档任务:
            <UiTextAction
              tone="primary"
              @click="goVolumeDetail(taskDetail.volumeId, undefined, taskDetail.diagnosticCode)"
            >
              {{ volumeArchiveNo || taskDetail.volumeId }}
            </UiTextAction>
          </span>
          <span v-if="taskDetail.diagnosticCode">
            诊断编码:
            <code class="archive-remediation-detail__mono">{{ taskDetail.diagnosticCode }}</code>
          </span>
          <span v-if="campaignName">活动批次: {{ campaignName }}</span>
        </div>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard flush class="archive-remediation-detail__section">
        <template #head>
          <span>状态流转</span>
        </template>
        <template #toolbar>
          <div class="archive-remediation-detail__flow-toolbar">
            <span class="archive-remediation-detail__flow-hint"
              >OPEN → IN_PROGRESS → RESUBMITTED → CLOSED</span
            >
            <div class="archive-remediation-detail__completion">
              <span class="archive-remediation-detail__completion-label">任务进度</span>
              <ArchiveReadinessRateBar :percent="taskCompletionPercent" />
            </div>
          </div>
        </template>
        <ArchiveLifecyclePipe
          :steps="lifecycleSteps"
          embedded
          class="archive-remediation-detail__pipe"
        />
        <div v-if="taskDetail.statusHistory?.length" class="audit-timeline">
          <div
            v-for="(item, index) in taskDetail.statusHistory"
            :key="`${item.eventTime ?? 'na'}-${index}`"
            class="audit-item"
          >
            <div class="audit-time">
              {{ item.eventTime ? formatDateTime(item.eventTime) : '—' }}
            </div>
            <div class="audit-body">
              <div class="audit-title">
                <UiTag :tone="remediationStatusTone(item.taskStatus)" size="sm">
                  {{ remediationStatusLabel(item.taskStatus) }}
                </UiTag>
                <span v-if="item.operatorNickName">{{ item.operatorNickName }}</span>
              </div>
              <p v-if="item.remark" class="audit-desc">{{ item.remark }}</p>
            </div>
          </div>
        </div>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard flush class="archive-remediation-detail__section">
        <template #head>
          <div class="archive-remediation-detail__evidence-head">
            <span>整改证据</span>
            <span
              v-if="taskDetail.evidenceItems?.length"
              class="archive-remediation-detail__evidence-count"
            >
              {{ taskDetail.evidenceItems.length }} 个文件
            </span>
            <UiButton
              v-if="canUploadEvidence"
              size="sm"
              variant="outline"
              class="archive-remediation-detail__evidence-upload"
              @click="openEvidenceUploadModal"
            >
              上传文件
            </UiButton>
          </div>
        </template>
        <UiEmpty
          v-if="!taskDetail.evidenceItems?.length"
          description="尚未上传整改证据"
          :action-label="canUploadEvidence ? '上传文件' : undefined"
          @action="openEvidenceUploadModal"
        />
        <UiDataTable
          v-else
          pagination-mode="none"
          :columns="evidenceColumns"
          :data-source="taskDetail.evidenceItems"
          :show-pagination="false"
          :sticky-header="false"
          flat
          row-key="evidenceId"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'fileName'">
              {{ record.fileName }}
            </template>
            <template v-else-if="column.key === 'fileSize'">
              {{ record.fileSize != null ? formatFileSize(record.fileSize) : '—' }}
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ record.createTime ? formatDateTime(record.createTime) : '—' }}
            </template>
            <template v-else-if="column.key === 'evidenceStatus'">
              <UiTag :tone="evidenceStatusTone(record.evidenceStatus)" size="sm">
                {{ evidenceStatusLabel(record.evidenceStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[{ key: 'download', label: '下载' }]"
                split
                @action="() => downloadEvidence(record.fileId)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard
        v-if="showVerifierPanel"
        flush
        class="archive-remediation-detail__section"
      >
        <template #head>协调人验证</template>
        <div class="archive-remediation-detail__verify">
          <p class="archive-remediation-detail__verify-notes">
            {{ taskDetail.verificationComment || '—' }}
          </p>
          <p
            v-if="taskDetail.verifierNickName || taskDetail.verifiedTime"
            class="archive-remediation-detail__verify-meta"
          >
            <span v-if="taskDetail.verifierNickName"
              >验证人: {{ taskDetail.verifierNickName }}</span
            >
            <span v-if="taskDetail.verifiedTime">
              · {{ formatDateTime(taskDetail.verifiedTime) }}</span
            >
          </p>
        </div>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard
        v-if="campaignSummary"
        flush
        class="archive-remediation-detail__section"
      >
        <template #head>整改活动概览</template>
        <div class="archive-remediation-detail__campaign-grid">
          <div class="stat-card">
            <div class="stat-card__val">{{ campaignTaskStats?.totalTaskCount ?? 0 }}</div>
            <div class="stat-card__label">总任务</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__val stat-card__val--warn">
              {{ campaignTaskStats?.openTaskCount ?? 0 }}
            </div>
            <div class="stat-card__label">待处理</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__val stat-card__val--primary">
              {{ campaignTaskStats?.inProgressTaskCount ?? 0 }}
            </div>
            <div class="stat-card__label">处理中</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__val stat-card__val--ok">
              {{ campaignTaskStats?.closedTaskCount ?? 0 }}
            </div>
            <div class="stat-card__label">已关闭</div>
          </div>
        </div>
        <p v-if="campaignSummary.endTime" class="archive-remediation-detail__campaign-deadline">
          截止日: {{ formatDateTime(campaignSummary.endTime) }}
        </p>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard
        v-if="showCoordinatorActions || showAssigneeActions"
        flush
        class="archive-remediation-detail__section"
      >
        <template #head>任务操作</template>
        <div class="archive-remediation-detail__actions">
          <template v-if="showCoordinatorActions">
            <ArchiveDutyUserSelect
              v-if="taskDetail.taskStatus !== ArchiveRemediationStatusCode.CLOSED"
              v-model:value="editAssigneeUserId"
              class="archive-remediation-detail__assignee"
            />
            <UiButton
              v-if="canSaveAssigneeReassign"
              size="sm"
              variant="outline"
              :loading="reassigning"
              @click="reassignAssignee"
            >
              保存改派
            </UiButton>
            <UiButton
              v-if="taskDetail.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED"
              size="sm"
              variant="outline"
              :loading="updating"
              @click="openCloseVerifyModal"
            >
              复检关闭
            </UiButton>
            <UiButton
              v-if="taskDetail.taskStatus !== ArchiveRemediationStatusCode.CLOSED"
              size="sm"
              variant="outline"
              :loading="updating"
              @click="advanceStatus(ArchiveRemediationStatusCode.CLOSED)"
            >
              关闭任务
            </UiButton>
          </template>
          <template v-else-if="showAssigneeActions">
            <UiButton
              v-if="taskDetail.taskStatus === ArchiveRemediationStatusCode.OPEN"
              size="sm"
              :loading="updating"
              @click="advanceStatus(ArchiveRemediationStatusCode.IN_PROGRESS)"
            >
              开始处理
            </UiButton>
            <UiButton
              v-if="taskDetail.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS"
              size="sm"
              :loading="updating"
              @click="advanceStatus(ArchiveRemediationStatusCode.RESUBMITTED)"
            >
              标记已重提
            </UiButton>
          </template>
          <UiButton
            v-if="
              taskDetail.taskStatus === ArchiveRemediationStatusCode.OPEN ||
              taskDetail.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS
            "
            size="sm"
            variant="outline"
            @click="
              goVolumeDetail(taskDetail.volumeId, taskDetail.taskId, taskDetail.diagnosticCode)
            "
          >
            {{
              isSecurityRemediationDiagnostic(taskDetail.diagnosticCode)
                ? '去定密确认'
                : '去卷内整改'
            }}
          </UiButton>
        </div>
      </WorkbenchSurfaceCard>
    </template>

    <UiDrawer
      :open="evidenceUploadOpen"
      title="上传整改证据"
      :width="520"
      :confirm-loading="evidenceUploadSubmitting"
      ok-text="提交"
      :hide-footer="false"
      @update:open="(v: boolean) => (evidenceUploadOpen = v)"
      @close="evidenceUploadOpen = false"
      @confirm="submitEvidenceUpload"
    >
      <a-form layout="vertical">
        <a-form-item label="证据文件" required>
          <UiPlatformFileField
            v-model:file-node-id="evidenceUploadFileId"
            v-model:file-name="evidenceUploadFileName"
            :scene-key="FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL"
            button-text="选择文件"
          />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      :open="closeVerifyModalOpen"
      title="复检关闭"
      :width="520"
      :confirm-loading="updating"
      ok-text="确认关闭"
      :hide-footer="false"
      @update:open="(v: boolean) => (closeVerifyModalOpen = v)"
      @close="closeVerifyModalOpen = false"
      @confirm="submitCloseWithVerification"
    >
      <a-form layout="vertical">
        <a-form-item label="验证备注">
          <a-textarea
            v-model:value="closeVerifyComment"
            :rows="3"
            placeholder="填写协调人验证意见"
          />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignResponse,
  ArchiveRemediationByCampaignStatsVO,
  ArchiveRemediationEvidenceResponse,
  ArchiveRemediationEvidenceStatusCode,
  ArchiveRemediationPriorityCode,
  ArchiveRemediationTaskResponse,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_REMEDIATION_EVIDENCE_STATUS_TONE,
  ARCHIVE_REMEDIATION_STATUS_TONE,
  ArchiveRemediationEvidenceStatusDescription,
  ArchiveRemediationStatusCode,
  ArchiveRemediationStatusDescription,
  getArchiveVolumeDetail,
  getEvaluationCampaign,
  getRemediationStatsByCampaign,
  getRemediationTask,
  registerRemediationEvidence,
  updateRemediationTask,
} from '@/apis/mark/archive-volume'
import type { ArchiveRemediationDiagnosticCode } from '@/types/enums/archive-remediation-diagnostic-enum'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import ArchiveLifecyclePipe from '@/components/archive-volume/ArchiveLifecyclePipe.vue'
import ArchiveReadinessRateBar from '@/components/archive-volume/ArchiveReadinessRateBar.vue'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { useUserStore } from '@/stores/modules/user'
import {
  isSecurityRemediationDiagnostic,
  remediationDiagnosticLabel,
  remediationVolumeDetailTabKey,
} from '@/utils/archive-remediation-diagnostic'
import { remediationAssigneeLabel } from '@/utils/archive-remediation-display'
import {
  ARCHIVE_REMEDIATION_PRIORITY_TONE,
  ArchiveRemediationPriorityDescription,
} from '@/utils/archive-remediation-priority'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime, formatFileSize } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeRemediationDetail' })

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { canManageRemediationAsCoordinator, loadGrants } = useArchiveDutyAccess()

const loading = ref(false)
const loadFailed = ref(false)
const updating = ref(false)
const reassigning = ref(false)
const closeVerifyModalOpen = ref(false)
const closeVerifyComment = ref('')
const evidenceUploadOpen = ref(false)
const evidenceUploadSubmitting = ref(false)
const evidenceUploadFileId = ref<string>()
const evidenceUploadFileName = ref('')
const taskDetail = ref<ArchiveRemediationTaskResponse | null>(null)
const volumeArchiveNo = ref('')
const taskVolumeDepartmentId = ref<string>()
const editAssigneeUserId = ref<string>()
const campaignSummary = ref<ArchiveEvaluationCampaignResponse | null>(null)
const campaignTaskStats = ref<ArchiveRemediationByCampaignStatsVO | null>(null)

const taskId = computed(() => String(route.params.taskId ?? ''))

const contextSubtitle = computed(() => {
  const parts: string[] = ['整改任务']
  if (campaignName.value) {
    parts.push(campaignName.value)
  }
  if (volumeArchiveNo.value) {
    parts.push(volumeArchiveNo.value)
  }
  return parts.join(' · ')
})

const taskCompletionPercent = computed(() => {
  const status = taskDetail.value?.taskStatus
  if (!status) {
    return 0
  }
  const percentByStatus: Record<ArchiveRemediationStatusCode, number> = {
    [ArchiveRemediationStatusCode.OPEN]: 0,
    [ArchiveRemediationStatusCode.IN_PROGRESS]: 33,
    [ArchiveRemediationStatusCode.RESUBMITTED]: 66,
    [ArchiveRemediationStatusCode.CLOSED]: 100,
  }
  return percentByStatus[status]
})

const signalMetrics = computed<SignalMetric[]>(() => {
  if (!taskDetail.value) return []
  const task = taskDetail.value
  return [
    {
      key: 'status',
      label: '状态',
      value: remediationStatusLabel(task.taskStatus),
      tone: remediationStatusTone(task.taskStatus),
    },
    {
      key: 'priority',
      label: '优先级',
      value: remediationPriorityLabel(task.taskPriority),
      tone: remediationPriorityTone(task.taskPriority),
    },
    {
      key: 'assignee',
      label: '责任人',
      value: remediationAssigneeLabel(task),
    },
    {
      key: 'due',
      label: '截止日',
      value: task.dueTime ? formatDateTime(task.dueTime) : '—',
      tone: task.dueTime ? 'orange' : undefined,
    },
  ]
})

const lifecycleSteps = computed(() => {
  const status = taskDetail.value?.taskStatus
  const order: ArchiveRemediationStatusCode[] = [
    ArchiveRemediationStatusCode.OPEN,
    ArchiveRemediationStatusCode.IN_PROGRESS,
    ArchiveRemediationStatusCode.RESUBMITTED,
    ArchiveRemediationStatusCode.CLOSED,
  ]
  const labels: Record<ArchiveRemediationStatusCode, string> = {
    [ArchiveRemediationStatusCode.OPEN]: '待处理',
    [ArchiveRemediationStatusCode.IN_PROGRESS]: '处理中',
    [ArchiveRemediationStatusCode.RESUBMITTED]: '已重提',
    [ArchiveRemediationStatusCode.CLOSED]: '已关闭',
  }
  const currentIndex = status ? order.indexOf(status) : -1
  return order.map((code, index) => {
    let stepStatus: 'done' | 'active' | 'pending'
    if (status === ArchiveRemediationStatusCode.CLOSED) {
      stepStatus = 'done'
    } else if (index < currentIndex) {
      stepStatus = 'done'
    } else if (index === currentIndex) {
      stepStatus = 'active'
    } else {
      stepStatus = 'pending'
    }
    return {
      key: code,
      label: labels[code],
      status: stepStatus,
    }
  })
})

const campaignName = computed(() => campaignSummary.value?.campaignName)

const showCoordinatorActions = computed(() =>
  taskVolumeDepartmentId.value
    ? canManageRemediationAsCoordinator({ departmentId: taskVolumeDepartmentId.value })
    : false,
)

const isCurrentAssignee = computed(
  () => taskDetail.value?.assigneeUserId === userStore.userInfo.userId,
)

const showAssigneeActions = computed(() => isCurrentAssignee.value && !showCoordinatorActions.value)

const canActOnTask = computed(() => showCoordinatorActions.value || showAssigneeActions.value)

const canUploadEvidence = computed(() => {
  const task = taskDetail.value
  if (!task || task.taskStatus === ArchiveRemediationStatusCode.CLOSED) return false
  return canActOnTask.value
})

const evidenceColumns: ColumnsType<ArchiveRemediationEvidenceResponse> = [
  { title: '文件名', key: 'fileName', dataIndex: 'fileName', fixed: 'left' },
  { title: '大小', key: 'fileSize', width: 100 },
  { title: '上传时间', key: 'createTime', width: 168 },
  { title: '状态', key: 'evidenceStatus', width: 100 },
  { title: '操作', key: 'actions', width: 80 },
]

const canSaveAssigneeReassign = computed(() => {
  const task = taskDetail.value
  if (!task || task.taskStatus === ArchiveRemediationStatusCode.CLOSED) return false
  if (!editAssigneeUserId.value) return false
  return editAssigneeUserId.value !== task.assigneeUserId
})

const showVerifierPanel = computed(() => {
  const task = taskDetail.value
  if (!task) return false
  if (
    task.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED ||
    task.taskStatus === ArchiveRemediationStatusCode.CLOSED
  ) {
    return Boolean(task.verificationComment || task.verifierNickName || task.verifiedTime)
  }
  return false
})

function remediationStatusLabel(code: ArchiveRemediationStatusCode) {
  return strictEnumLabel(ArchiveRemediationStatusDescription, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationStatusCode) {
  return strictEnumTone(ARCHIVE_REMEDIATION_STATUS_TONE, code, 'taskStatus')
}

function remediationPriorityLabel(code: ArchiveRemediationPriorityCode) {
  return strictEnumLabel(ArchiveRemediationPriorityDescription, code, 'taskPriority')
}

function remediationPriorityTone(code: ArchiveRemediationPriorityCode) {
  return strictEnumTone(ARCHIVE_REMEDIATION_PRIORITY_TONE, code, 'taskPriority')
}

function evidenceStatusLabel(code: ArchiveRemediationEvidenceStatusCode) {
  return strictEnumLabel(ArchiveRemediationEvidenceStatusDescription, code, 'evidenceStatus')
}

function evidenceStatusTone(code: ArchiveRemediationEvidenceStatusCode) {
  return strictEnumTone(ARCHIVE_REMEDIATION_EVIDENCE_STATUS_TONE, code, 'evidenceStatus')
}

function openEvidenceUploadModal() {
  if (!canUploadEvidence.value) return
  evidenceUploadFileId.value = undefined
  evidenceUploadFileName.value = ''
  evidenceUploadOpen.value = true
}

async function submitEvidenceUpload() {
  if (!taskDetail.value || !evidenceUploadFileId.value) {
    message.warning('请选择证据文件')
    return
  }
  evidenceUploadSubmitting.value = true
  try {
    await registerRemediationEvidence({
      taskId: taskDetail.value.taskId,
      fileId: evidenceUploadFileId.value,
    })
    message.success('整改证据已上传')
    evidenceUploadOpen.value = false
    await loadTask()
  } catch (error) {
    showUserError(error)
  } finally {
    evidenceUploadSubmitting.value = false
  }
}

async function downloadEvidence(fileId: string) {
  try {
    await downloadFile({ nodeId: fileId })
  } catch (error) {
    showUserError(error, '证据下载失败')
  }
}

async function loadCampaignContext(campaignId?: string) {
  if (!campaignId) {
    campaignSummary.value = null
    campaignTaskStats.value = null
    return
  }
  campaignSummary.value = await getEvaluationCampaign(campaignId)
  campaignTaskStats.value = await getRemediationStatsByCampaign({ campaignId })
}

async function loadTask() {
  if (!taskId.value) return
  loading.value = true
  loadFailed.value = false
  try {
    taskDetail.value = await getRemediationTask(taskId.value)
    editAssigneeUserId.value = taskDetail.value.assigneeUserId
    const volumeDetail = await getArchiveVolumeDetail(taskDetail.value.volumeId)
    volumeArchiveNo.value = volumeDetail.volume.archiveNo ?? ''
    taskVolumeDepartmentId.value = volumeDetail.volume.departmentId
    await loadCampaignContext(taskDetail.value.campaignId)
  } catch (error) {
    taskDetail.value = null
    loadFailed.value = true
    showUserError(error, '加载整改任务失败')
  } finally {
    loading.value = false
  }
}

async function advanceStatus(status: ArchiveRemediationStatusCode) {
  if (!taskDetail.value) return
  updating.value = true
  try {
    taskDetail.value = await updateRemediationTask({
      taskId: taskDetail.value.taskId,
      taskStatus: status,
    })
    message.success('任务状态已更新')
    if (taskDetail.value.campaignId) {
      await loadCampaignContext(taskDetail.value.campaignId)
    }
  } catch (error) {
    showUserError(error)
  } finally {
    updating.value = false
  }
}

async function reassignAssignee() {
  if (!taskDetail.value || !editAssigneeUserId.value) return
  reassigning.value = true
  try {
    taskDetail.value = await updateRemediationTask({
      taskId: taskDetail.value.taskId,
      assigneeUserId: editAssigneeUserId.value,
    })
    message.success('责任人已改派')
  } catch (error) {
    showUserError(error)
  } finally {
    reassigning.value = false
  }
}

function openCloseVerifyModal() {
  closeVerifyComment.value = ''
  closeVerifyModalOpen.value = true
}

async function submitCloseWithVerification() {
  if (!taskDetail.value) return
  updating.value = true
  try {
    taskDetail.value = await updateRemediationTask({
      taskId: taskDetail.value.taskId,
      taskStatus: ArchiveRemediationStatusCode.CLOSED,
      verificationComment: closeVerifyComment.value.trim() || undefined,
    })
    message.success('整改任务已关闭')
    closeVerifyModalOpen.value = false
    if (taskDetail.value.campaignId) {
      await loadCampaignContext(taskDetail.value.campaignId)
    }
  } catch (error) {
    showUserError(error)
  } finally {
    updating.value = false
  }
}

function goRemediationList() {
  void router.push({ name: 'TeacherArchiveVolumeList', query: { tab: 'remediation' } })
}

function goVolumeDetail(
  volumeId: string,
  remediationTaskId?: string,
  diagnosticCode?: ArchiveRemediationDiagnosticCode,
) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: {
      tab: remediationVolumeDetailTabKey(diagnosticCode),
      ...(remediationTaskId ? { remediationTaskId } : {}),
    },
  })
}

onMounted(() => {
  void loadGrants().then(() => loadTask())
})
</script>

<style scoped>
.archive-remediation-detail__section {
  margin-bottom: var(--dp-space-3);
}

.archive-remediation-detail__diag-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-remediation-detail__desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--dp-text-secondary);
}

.archive-remediation-detail__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-4);
  margin-top: var(--dp-space-3);
  font-size: 13px;
  color: var(--dp-text-muted);
}

.archive-remediation-detail__pipe {
  padding: var(--dp-space-2) 0 var(--dp-space-3);
}

.archive-remediation-detail__flow-hint {
  font-size: 12px;
  color: var(--dp-text-muted);
}

.archive-remediation-detail__flow-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  width: 100%;
}

.archive-remediation-detail__completion {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-remediation-detail__completion-label {
  font-size: 12px;
  color: var(--dp-text-muted);
  white-space: nowrap;
}

.archive-remediation-detail__mono {
  font-family: var(--dp-font-mono);
  font-size: 12px;
}

.archive-remediation-detail__campaign-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--dp-space-3);
}

.archive-remediation-detail__campaign-deadline {
  margin: var(--dp-space-3) 0 0;
  font-size: 13px;
  color: var(--dp-text-muted);
}

.archive-remediation-detail__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  padding: var(--dp-space-2) 0;
}

.archive-remediation-detail__assignee {
  width: 220px;
}

.archive-remediation-detail__timeline {
  list-style: none;
  margin: 0;
  padding: var(--dp-space-2) 0;
}

.archive-remediation-detail__timeline-item {
  display: flex;
  gap: var(--dp-space-3);
  padding: var(--dp-space-2) 0;
  border-bottom: 1px solid var(--dp-border-light);
}

.archive-remediation-detail__timeline-item:last-child {
  border-bottom: none;
}

.archive-remediation-detail__timeline-time {
  flex: 0 0 148px;
  font-size: 12px;
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.archive-remediation-detail__timeline-body {
  flex: 1;
  min-width: 0;
}

.archive-remediation-detail__timeline-title {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  font-size: 14px;
  font-weight: 500;
}

.archive-remediation-detail__timeline-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--dp-text-muted);
  line-height: 1.5;
}

.archive-remediation-detail__verify {
  padding: var(--dp-space-3);
  border-radius: var(--dp-radius-sm);
  background: var(--dp-surface-sunken);
}

.archive-remediation-detail__verify-notes {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
}

.archive-remediation-detail__verify-meta {
  margin: var(--dp-space-2) 0 0;
  font-size: 12px;
  color: var(--dp-text-muted);
}

.archive-remediation-detail__evidence-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  width: 100%;
}

.archive-remediation-detail__evidence-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--dp-text-muted);
}

.archive-remediation-detail__evidence-upload {
  margin-left: var(--dp-space-2);
}
</style>
