<template>
  <div class="archive-volume-remediation-panel">
    <WorkbenchSurfaceCard flush>
      <template #head>整改活动</template>
      <template #toolbar>
        <div class="archive-volume-remediation-panel__actions">
          <a-select
            v-model:value="selectedCampaignId"
            :loading="campaignLoading"
            :options="campaignOptions"
            allow-clear
            placeholder="选择评估批次"
            style="width: 280px"
            @change="handleCampaignChange"
          />
          <div
            v-if="selectedCampaign && selectedCampaign.readinessRatePercent != null"
            class="archive-volume-remediation-panel__campaign-rate"
          >
            <span class="archive-volume-remediation-panel__campaign-rate-label">批次就绪率</span>
            <ArchiveReadinessRateBar :percent="selectedCampaign.readinessRatePercent" />
          </div>
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
            v-if="
              isTenantWideCollegeCoordinator &&
              selectedCampaign?.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE
            "
            size="sm"
            variant="outline"
            @click="openCampaignModal(selectedCampaign)"
          >
            编辑批次
          </UiButton>
          <p
            v-if="isTenantWideCollegeCoordinator && selectedCampaignId"
            class="archive-volume-remediation-panel__export-hint"
          >
            导出范围：{{ ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT }}
          </p>
          <UiButton
            v-if="isTenantWideCollegeCoordinator && selectedCampaignId"
            size="sm"
            variant="outline"
            :loading="exporting"
            @click="handleExportCampaign"
          >
            导出 manifest
          </UiButton>
          <UiButton
            v-if="isTenantWideCollegeCoordinator && selectedCampaignId"
            size="sm"
            variant="outline"
            :loading="exportingArchive"
            @click="handleExportArchiveCampaign"
          >
            导出四级目录包
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
      </template>

      <UiSkeletonState v-if="taskLoading" variant="card" compact />
      <UiEmpty v-else-if="!selectedCampaignId" description="请选择评估批次查看整改任务" />
      <UiEmpty v-else-if="tasks.length === 0" description="当前批次暂无整改任务" />
      <div v-else class="archive-remediation-card-list">
        <article
          v-for="task in tasks"
          :key="task.taskId"
          class="remediation-card"
          :class="remediationPriorityCardClass(task.taskPriority)"
        >
          <div class="remediation-card__head">
            <UiTag :tone="remediationStatusTone(task.taskStatus)" size="sm">
              {{ remediationStatusLabel(task.taskStatus) }}
            </UiTag>
            <span class="remediation-card__title">{{ task.taskTitle }}</span>
            <UiTag :tone="remediationPriorityTone(task.taskPriority)" size="sm">
              {{ remediationPriorityLabel(task.taskPriority) }}
            </UiTag>
          </div>
          <p v-if="task.taskDescription" class="remediation-card__desc">
            {{ task.taskDescription }}
          </p>
          <div class="remediation-card__meta">
            <span v-if="task.createUserId">发现人: {{ remediationCreatorLabel(task) }}</span>
            <span>负责人: {{ remediationAssigneeLabel(task) }}</span>
            <span v-if="task.dueTime">截止: {{ formatDateTime(task.dueTime) }}</span>
            <span v-if="task.createTime">创建: {{ formatDateTime(task.createTime) }}</span>
          </div>
          <div class="remediation-card__actions">
            <UiButton
              v-if="
                task.taskStatus === ArchiveRemediationStatusCode.OPEN ||
                task.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS
              "
              size="sm"
              variant="outline"
              @click="openTask(task.taskId)"
            >
              去整改
            </UiButton>
            <UiTextAction @click="openTask(task.taskId)">详情</UiTextAction>
          </div>
        </article>
      </div>
      <UiPagination
        v-if="selectedCampaignId && taskPagination.total > 0"
        v-model:current="taskPagination.pageNum"
        v-model:page-size="taskPagination.pageSize"
        class="archive-volume-remediation-panel__task-pagination"
        :total="taskPagination.total"
        @change="handleTaskPageChange"
      />
    </WorkbenchSurfaceCard>

    <UiDrawer
      :open="campaignModalOpen"
      :title="campaignForm.campaignId ? '编辑评估批次' : '新建评估批次'"
      :width="560"
      :confirm-loading="campaignSaving"
      ok-text="保存"
      :hide-footer="false"
      @update:open="(v: boolean) => (campaignModalOpen = v)"
      @close="campaignModalOpen = false"
      @confirm="submitCampaign"
    >
      <a-form layout="vertical">
        <a-form-item label="批次名称" required>
          <a-input v-model:value="campaignForm.campaignName" :maxlength="200" show-count />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="学年起始年" required>
              <a-select
                v-model:value="campaignForm.academicYearStartYear"
                :options="academicYearStartOptions"
                placeholder="请选择起始年"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学年结束年">
              <a-input :value="campaignForm.academicYearEndYear" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学期" required>
              <a-select
                v-model:value="campaignForm.semester"
                :options="SemesterOptions"
                allow-clear
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="状态" required>
          <a-select
            v-model:value="campaignForm.campaignStatus"
            :options="ARCHIVE_EVALUATION_CAMPAIGN_STATUS_OPTIONS"
            :disabled="!campaignForm.campaignId"
            style="width: 100%"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="开始时间" required>
              <a-date-picker
                v-model:value="campaignForm.startTime"
                show-time
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束时间" required>
              <a-date-picker
                v-model:value="campaignForm.endTime"
                show-time
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="说明">
          <a-textarea
            v-model:value="campaignForm.description"
            :rows="2"
            :maxlength="2000"
            show-count
          />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      :open="createTaskOpen"
      title="创建整改任务"
      :width="560"
      :confirm-loading="createTaskSubmitting"
      ok-text="创建"
      :hide-footer="false"
      @update:open="(v: boolean) => (createTaskOpen = v)"
      @close="createTaskOpen = false"
      @confirm="submitCreateTask"
    >
      <a-form layout="vertical">
        <a-form-item label="关联批次">
          <a-select
            v-model:value="createTaskForm.campaignId"
            :options="activeCampaignOptions"
            allow-clear
            placeholder="可选"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="卷 ID" required>
          <a-input v-model:value="createTaskForm.volumeId" />
        </a-form-item>
        <a-form-item label="任务标题" required>
          <a-input v-model:value="createTaskForm.taskTitle" :maxlength="200" show-count />
        </a-form-item>
        <a-form-item label="诊断码">
          <a-select
            v-model:value="createTaskForm.diagnosticCode"
            :options="ARCHIVE_REMEDIATION_DIAGNOSTIC_CODE_OPTIONS"
            allow-clear
            placeholder="选择诊断类型"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea
            v-model:value="createTaskForm.taskDescription"
            :rows="2"
            :maxlength="2000"
            show-count
          />
        </a-form-item>
        <a-form-item label="责任人" required>
          <ArchiveDutyUserSelect v-model:value="createTaskForm.assigneeUserId" />
        </a-form-item>
        <a-form-item label="截止时间">
          <a-date-picker
            v-model:value="createTaskForm.dueTime"
            show-time
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </UiDrawer>
    <ArchiveEvaluationExportTaskModal />
  </div>
</template>

<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type {
  ArchiveEvaluationCampaignResponse,
  ArchiveRemediationPriorityCode,
  ArchiveRemediationTaskResponse,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_EVALUATION_CAMPAIGN_STATUS_OPTIONS,
  ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
  ARCHIVE_REMEDIATION_DIAGNOSTIC_CODE_OPTIONS,
  ArchiveEvaluationCampaignStatusCode,
  ArchiveRemediationStatusCode,
  ArchiveRemediationStatusDescription,
  createRemediationTask,
  exportEvaluationArchivePackage,
  exportEvaluationPackage,
  getArchiveVolumeDetail,
  pageEvaluationCampaigns,
  pageRemediationTasksByCampaign,
  saveEvaluationCampaign,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ArchiveReadinessRateBar from '@/components/archive-volume/ArchiveReadinessRateBar.vue'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { runArchiveEvaluationExportFlow } from '@/composables/useArchiveEvaluationExportFlow'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { generateAcademicYearStartOptions } from '@/utils/academic-year'
import {
  applyAcademicYearStartYearChange,
  createAcademicYearSemesterTripleDefaults,
  ensureTriplePeriodPair,
  parseTripleFromAcademicYear,
  resolveAcademicYearFromTriple,
} from '@/utils/academic-year-semester-triple-filter'
import {
  remediationAssigneeLabel,
  remediationCreatorLabel,
} from '@/utils/archive-remediation-display'
import {
  ARCHIVE_REMEDIATION_PRIORITY_TONE,
  ArchiveRemediationPriorityDescription,
  remediationPriorityCardClass,
} from '@/utils/archive-remediation-priority'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveEvaluationExportTaskModal from '@/views/teacher/archive-volume/components/ArchiveEvaluationExportTaskModal.vue'

defineOptions({ name: 'ArchiveVolumeRemediationPanel' })

const router = useRouter()
const {
  isTenantWideCollegeCoordinator,
  scopedDepartmentIds,
  canManageRemediationAsCoordinator,
  loadGrants,
} = useArchiveDutyAccess()

const campaignLoading = ref(false)
const taskLoading = ref(false)
const exporting = ref(false)
const exportingArchive = ref(false)
const campaignSaving = ref(false)
const createTaskSubmitting = ref(false)
const campaignModalOpen = ref(false)
const createTaskOpen = ref(false)
const campaignSelectOptions = ref<ArchiveEvaluationCampaignResponse[]>([])
const selectedCampaign = ref<ArchiveEvaluationCampaignResponse | null>(null)
const tasks = ref<ArchiveRemediationTaskResponse[]>([])
const selectedCampaignId = ref<string>()
const taskPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

interface RemediationCampaignForm {
  campaignId: string | undefined
  campaignName: string
  academicYearStartYear: number | undefined
  academicYearEndYear: number | undefined
  semester: SemesterCode | undefined
  campaignStatus: ArchiveEvaluationCampaignStatusCode
  startTime: string | undefined
  endTime: string | undefined
  description: string
}

const academicYearStartOptions = generateAcademicYearStartOptions().map((year) => ({
  label: `${year} 年`,
  value: year,
}))

const campaignForm = reactive<RemediationCampaignForm>({
  campaignId: undefined,
  campaignName: '',
  ...createAcademicYearSemesterTripleDefaults(true),
  campaignStatus: ArchiveEvaluationCampaignStatusCode.ACTIVE,
  startTime: undefined,
  endTime: undefined,
  description: '',
})

interface ArchiveRemediationCreateTaskForm {
  campaignId: string | undefined
  volumeId: string
  taskTitle: string
  taskDescription: string
  diagnosticCode: string
  assigneeUserId: string | undefined
  dueTime: string | undefined
}

const createTaskForm = reactive<ArchiveRemediationCreateTaskForm>({
  campaignId: undefined,
  volumeId: '',
  taskTitle: '',
  taskDescription: '',
  diagnosticCode: '',
  assigneeUserId: undefined,
  dueTime: undefined,
})

const campaignOptions = computed(() =>
  campaignSelectOptions.value.map((item) => ({
    label: item.campaignName,
    value: item.campaignId,
  })),
)

const activeCampaignOptions = computed(() =>
  campaignSelectOptions.value
    .filter((item) => item.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE)
    .map((item) => ({
      label: item.campaignName,
      value: item.campaignId,
    })),
)

function syncSelectedCampaign(campaignId?: string): void {
  selectedCampaign.value =
    campaignSelectOptions.value.find((item) => item.campaignId === campaignId) ?? null
}

function handleCampaignChange(value: SelectValue): void {
  const campaignId = typeof value === 'string' ? value : undefined
  syncSelectedCampaign(campaignId)
  taskPagination.pageNum = 1
  void loadTasks()
}

const canShowCreateRemediationTask = computed(
  () =>
    (isTenantWideCollegeCoordinator.value || scopedDepartmentIds.value.length > 0) &&
    selectedCampaign.value?.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE,
)

function remediationStatusLabel(code: ArchiveRemediationStatusCode) {
  return strictEnumLabel(ArchiveRemediationStatusDescription, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationStatusCode): BadgeTone {
  if (code === ArchiveRemediationStatusCode.CLOSED) return 'gray'
  if (code === ArchiveRemediationStatusCode.RESUBMITTED) return 'green'
  if (code === ArchiveRemediationStatusCode.IN_PROGRESS) return 'blue'
  return 'orange'
}

function remediationPriorityLabel(code: ArchiveRemediationPriorityCode) {
  return strictEnumLabel(ArchiveRemediationPriorityDescription, code, 'taskPriority')
}

function remediationPriorityTone(code: ArchiveRemediationPriorityCode): BadgeTone {
  return strictEnumTone(ARCHIVE_REMEDIATION_PRIORITY_TONE, code, 'taskPriority')
}

async function loadCampaigns() {
  campaignLoading.value = true
  try {
    const page = await pageEvaluationCampaigns({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
    campaignSelectOptions.value = page.list
    if (!selectedCampaignId.value && page.list.length > 0) {
      selectedCampaignId.value = page.list[0].campaignId
      syncSelectedCampaign(selectedCampaignId.value)
      await loadTasks()
    }
  } catch (error) {
    showUserError(error)
  } finally {
    campaignLoading.value = false
  }
}

async function loadTasks() {
  if (!selectedCampaignId.value) {
    tasks.value = []
    taskPagination.total = 0
    return
  }
  taskLoading.value = true
  try {
    const page = await pageRemediationTasksByCampaign({
      campaignId: selectedCampaignId.value,
      pageNum: taskPagination.pageNum,
      pageSize: taskPagination.pageSize,
    })
    tasks.value = page.list
    taskPagination.pageNum = page.pageNum
    taskPagination.pageSize = page.pageSize
    taskPagination.total = page.total
  } catch (error) {
    showUserError(error)
    tasks.value = []
    taskPagination.total = 0
  } finally {
    taskLoading.value = false
  }
}

function handleTaskPageChange(pageNum: number, pageSize: number): void {
  taskPagination.pageNum = pageNum
  taskPagination.pageSize = pageSize
  void loadTasks()
}

function openCampaignModal(campaign?: ArchiveEvaluationCampaignResponse) {
  campaignForm.campaignId = campaign?.campaignId
  campaignForm.campaignName = campaign?.campaignName ?? ''
  const triple = parseTripleFromAcademicYear(campaign?.academicYear, campaign?.semester)
  campaignForm.academicYearStartYear = triple.academicYearStartYear
  campaignForm.academicYearEndYear = triple.academicYearEndYear
  campaignForm.semester = triple.semester
  campaignForm.campaignStatus =
    campaign?.campaignStatus ?? ArchiveEvaluationCampaignStatusCode.ACTIVE
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
  if (!ensureTriplePeriodPair(campaignForm)) {
    return
  }
  if (!campaignForm.startTime || !campaignForm.endTime) {
    message.warning('请选择批次开始时间和结束时间')
    return
  }
  if (campaignForm.startTime >= campaignForm.endTime) {
    message.warning('批次开始时间必须早于结束时间')
    return
  }
  const academicYear = resolveAcademicYearFromTriple(campaignForm)
  campaignSaving.value = true
  try {
    const saved = await saveEvaluationCampaign({
      campaignId: campaignForm.campaignId,
      campaignName: campaignForm.campaignName.trim(),
      academicYear,
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
    syncSelectedCampaign(saved.campaignId)
    taskPagination.pageNum = 1
    await loadTasks()
  } catch (error) {
    showUserError(error)
  } finally {
    campaignSaving.value = false
  }
}

async function handleExportCampaign() {
  if (!selectedCampaignId.value) return
  exporting.value = true
  try {
    await runArchiveEvaluationExportFlow({
      campaignId: selectedCampaignId.value,
      exportFn: exportEvaluationPackage,
      successMessage: '评估 manifest 已导出',
      scopeHint: ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
      campaignLabel: selectedCampaign.value?.campaignName,
    })
  } catch (error) {
    showUserError(error)
  } finally {
    exporting.value = false
  }
}

async function handleExportArchiveCampaign() {
  if (!selectedCampaignId.value) return
  exportingArchive.value = true
  try {
    await runArchiveEvaluationExportFlow({
      campaignId: selectedCampaignId.value,
      exportFn: exportEvaluationArchivePackage,
      successMessage: '四级目录包已导出',
      scopeHint: ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
      campaignLabel: selectedCampaign.value?.campaignName,
    })
  } catch (error) {
    showUserError(error)
  } finally {
    exportingArchive.value = false
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
  } catch (error) {
    showUserError(error)
  } finally {
    createTaskSubmitting.value = false
  }
}

async function openTask(taskId: string) {
  void router.push({
    name: 'TeacherArchiveVolumeRemediationDetail',
    params: { taskId },
  })
}

onMounted(() => {
  void loadGrants()
  void loadCampaigns()
})

watch(
  () => campaignForm.academicYearStartYear,
  (startYear) => {
    applyAcademicYearStartYearChange(campaignForm, startYear)
  },
)
</script>

<style scoped>
.archive-volume-remediation-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.archive-volume-remediation-panel__task-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.archive-volume-remediation-panel__export-hint {
  flex-basis: 100%;
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.archive-volume-remediation-panel__campaign-rate {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
  padding: 0 var(--dp-space-2);
}

.archive-volume-remediation-panel__campaign-rate-label {
  font-size: 12px;
  color: var(--dp-text-muted);
  white-space: nowrap;
}

.detail-desc {
  margin-bottom: 16px;
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.archive-remediation-card-list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3) 0;
}

.remediation-card {
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border-light);
  border-radius: var(--dp-radius-sm);
  background: var(--dp-surface);
}

.remediation-card--high {
  border-color: var(--dp-danger);
  background: color-mix(in srgb, var(--dp-danger) 6%, var(--dp-surface));
}

.remediation-card--medium {
  border-color: var(--dp-warning);
  background: color-mix(in srgb, var(--dp-warning) 8%, var(--dp-surface));
}

.remediation-card--low {
  border-color: var(--dp-primary);
  background: color-mix(in srgb, var(--dp-primary) 6%, var(--dp-surface));
}

.remediation-card__head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.remediation-card__title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text);
}

.remediation-card__desc {
  margin: var(--dp-space-2) 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-3);
}

.remediation-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-4);
  margin-top: var(--dp-space-2);
  font-size: 12px;
  color: var(--dp-text-4);
}

.remediation-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-top: var(--dp-space-2);
}
</style>
