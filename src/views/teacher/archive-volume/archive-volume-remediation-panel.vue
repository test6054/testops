<template>
  <div class="archive-volume-remediation-panel">
    <UiAlertStrip
      v-if="remediationStatsLoadFailed"
      class="archive-volume-remediation-panel__signals-error"
      tone="warning"
      title="整改概览加载失败"
      dense
    />
    <SignalBand
      v-else-if="remediationSignalMetrics.length > 0"
      class="archive-volume-remediation-panel__signals"
      layout="spotlight" :metrics="remediationSignalMetrics"
      variant="panel"
      @metric-click="handleSignalMetricClick"
    />
    <WorkbenchSurfaceCard flush>
      <template #head>整改活动</template>
      <template #toolbar>
        <div class="archive-volume-remediation-panel__actions">
          <UiSelect
            size="sm"
            v-model="selectedCampaignId"
            :loading="campaignLoading"
            :options="campaignOptions"
            allow-clear
            placeholder="选择迎评批次"
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
          <UiButton size="sm" :disabled="!selectedCampaignId" @click="() => loadTasks()">刷新</UiButton>
          <UiButton
            v-if="isTenantWideCollegeCoordinator === true"
            size="sm"
            variant="outline"
            @click="openCampaignModal()"
          >
            新建批次
          </UiButton>
          <UiButton
            v-if="
              isTenantWideCollegeCoordinator === true
                && selectedCampaign?.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE
            "
            size="sm"
            variant="outline"
            @click="openCampaignModal(selectedCampaign)"
          >
            编辑批次
          </UiButton>
          <p
            v-if="isTenantWideCollegeCoordinator === true && selectedCampaignId"
            class="archive-volume-remediation-panel__export-hint"
          >
            导出范围：{{ ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT }}
          </p>
          <UiButton
            v-if="isTenantWideCollegeCoordinator === true && selectedCampaignId"
            size="sm"
            variant="outline"
            :loading="exporting === true"
            @click="handleExportCampaign"
          >
            导出迎评清单
          </UiButton>
          <UiButton
            v-if="isTenantWideCollegeCoordinator === true && selectedCampaignId"
            size="sm"
            variant="outline"
            :loading="exportingArchive === true"
            @click="handleExportArchiveCampaign"
          >
            导出四级目录包
          </UiButton>
          <UiButton
            v-if="canShowCreateRemediationTask === true"
            size="sm"
            variant="primary"
            @click="openCreateTaskModal"
          >
            创建整改任务
          </UiButton>
        </div>
      </template>

      <UiSkeletonState v-if="taskLoading === true" variant="card" compact />
      <UiAlertStrip
        v-else-if="!selectedCampaignId"
        tone="info"
        size="sm"
        dense
        inline
        :show-icon="false"
      >
        <template #default>
          <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
            <UiTag tone="blue" size="sm">未选择批次</UiTag>
            <span>请选择迎评批次后查看整改任务</span>
          </span>
        </template>
      </UiAlertStrip>
      <UiEmpty size="sm" v-else-if="tasks.length === 0" description="当前批次暂无整改任务" />
      <div v-else class="archive-remediation-card-list">
        <article
          v-for="task in tasks"
          :key="task.taskId"
          class="remediation-card"
          :class="remediationPriorityCardClass(task.taskPriority)"
        >
          <div class="remediation-card__top">
            <div class="remediation-card__main">
              <div class="remediation-card__title">{{ task.taskTitle }}</div>
              <p v-if="task.taskDescription" class="remediation-card__desc">
                {{ task.taskDescription }}
              </p>
              <div class="remediation-card__tags">
                <UiTag :tone="remediationPriorityTone(task.taskPriority)" size="sm">
                  {{ remediationPriorityLabel(task.taskPriority) }}
                </UiTag>
                <UiTag :tone="remediationStatusTone(task.taskStatus)" size="sm">
                  {{ remediationStatusLabel(task.taskStatus) }}
                </UiTag>
                <UiTag v-if="task.diagnosticCode" tone="gray" size="sm">
                  {{ remediationDiagnosticLabel(task.diagnosticCode) }}
                </UiTag>
              </div>
            </div>
            <div class="remediation-card__actions">
              <UiButton
                v-if="
                  task.taskStatus === ArchiveRemediationStatusCode.OPEN
                    || task.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS
                "
                size="sm"
                variant="outline"
                @click="openTask(task.taskId)"
              >
                去整改
              </UiButton>
              <UiButton
                v-else-if="task.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED"
                size="sm"
                variant="outline"
                @click="openTask(task.taskId)"
              >
                审核
              </UiButton>
              <UiButton
                v-else-if="task.taskStatus === ArchiveRemediationStatusCode.CLOSED"
                size="sm"
                variant="outline"
                @click="openTask(task.taskId)"
              >
                查看
              </UiButton>
              <UiTextAction
                v-if="task.taskStatus !== ArchiveRemediationStatusCode.CLOSED"
                @click="openTask(task.taskId)"
              >
                详情
              </UiTextAction>
            </div>
          </div>
          <div class="remediation-card__meta">
            <span>
              负责人 <b>{{ remediationAssigneeLabel(task) }}</b>
            </span>
            <span v-if="task.createUserId">
              发现人 <b>{{ remediationCreatorLabel(task) }}</b>
            </span>
            <span v-if="task.createTime">
              创建 <b>{{ formatDateTime(task.createTime) }}</b>
            </span>
            <span v-if="task.dueTime && task.taskStatus !== ArchiveRemediationStatusCode.CLOSED">
              截止
              <b :class="remediationDeadlineClass(task.dueTime)">
                {{ formatDateTime(task.dueTime) }}{{ remediationDeadlineHint(task.dueTime) }}
              </b>
            </span>
            <span v-if="task.closedTime">
              完成 <b>{{ formatDateTime(task.closedTime) }}</b>
            </span>
            <span v-if="task.verifierNickName">
              核验人
              <b>
                {{ task.verifierNickName
                }}{{ task.verifiedTime ? ` · ${formatDateTime(task.verifiedTime)}` : '' }}
              </b>
            </span>
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
      :title="campaignForm.campaignId ? '编辑迎评批次' : '新建迎评批次'"
      :width="560"
      :confirm-loading="campaignSaving === true"
      ok-text="保存"
      :hide-footer="false"
      @update:open="(v: boolean) => (campaignModalOpen = v)"
      @close="campaignModalOpen = false"
      @confirm="submitCampaign"
    >
      <UiForm layout="vertical">
        <UiFormItem label="批次名称" required>
          <UiInput size="sm" v-model="campaignForm.campaignName" :maxlength="200" />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="学年起始年" required>
              <UiSelect
                size="sm"
                v-model="campaignForm.academicYearStartYear"
                :options="academicYearStartOptions"
                placeholder="请选择起始年"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="学年结束年">
              <UiInput size="sm" :value="campaignForm.academicYearEndYear" disabled />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="学期" required>
              <UiSelect
                size="sm"
                v-model="campaignForm.semester"
                :options="SemesterOptions"
                allow-clear
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="状态" required>
          <UiSelect
            size="sm"
            v-model="campaignForm.campaignStatus"
            :options="ARCHIVE_EVALUATION_CAMPAIGN_STATUS_OPTIONS"
            :disabled="!campaignForm.campaignId"
            style="width: 100%"
          />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="开始时间" required>
              <UiDatePicker
                size="sm"
                v-model="campaignForm.startTime"
                :show-time="true"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="结束时间" required>
              <UiDatePicker
                size="sm"
                v-model="campaignForm.endTime"
                :show-time="true"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="说明">
          <UiTextarea
            size="sm"
            v-model="campaignForm.description"
            :rows="2"
            :maxlength="2000"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="createTaskOpen"
      title="创建整改任务"
      :width="560"
      :confirm-loading="createTaskSubmitting === true"
      ok-text="创建"
      :hide-footer="false"
      @update:open="(v: boolean) => (createTaskOpen = v)"
      @close="createTaskOpen = false"
      @confirm="submitCreateTask"
    >
      <UiForm layout="vertical">
        <UiFormItem label="关联批次">
          <UiSelect
            size="sm"
            v-model="createTaskForm.campaignId"
            :options="activeCampaignOptions"
            allow-clear
            placeholder="可选"
            style="width: 100%"
          />
        </UiFormItem>
        <UiFormItem label="卷编号" required>
          <UiInput size="sm" v-model="createTaskForm.volumeId" />
        </UiFormItem>
        <UiFormItem label="任务标题" required>
          <UiInput size="sm" v-model="createTaskForm.taskTitle" :maxlength="200" />
        </UiFormItem>
        <UiFormItem label="诊断码">
          <UiSelect
            size="sm"
            v-model="createTaskForm.diagnosticCode"
            :options="ARCHIVE_REMEDIATION_DIAGNOSTIC_CODE_OPTIONS"
            allow-clear
            placeholder="选择诊断类型"
            style="width: 100%"
          />
        </UiFormItem>
        <UiFormItem label="说明">
          <UiTextarea
            size="sm"
            v-model="createTaskForm.taskDescription"
            :rows="2"
            :maxlength="2000"
            :show-count="true"
          />
        </UiFormItem>
        <UiFormItem label="责任人" required>
          <ArchiveDutyUserSelect v-model:value="createTaskForm.assigneeUserId" />
        </UiFormItem>
        <UiFormItem label="截止时间">
          <UiDatePicker
            size="sm"
            v-model="createTaskForm.dueTime"
            :show-time="true"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
    <ArchiveEvaluationExportTaskModal />
  </div>
</template>

<script setup lang="ts">
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
import type { SelectValue } from 'ant-design-vue/es/select'
import type {
  ArchiveEvaluationCampaignResponse,
  ArchiveRemediationByCampaignStatsVO,
  ArchiveRemediationTaskResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ArchiveRemediationDiagnosticCode } from '@/types/enums/archive-remediation-diagnostic-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_EVALUATION_CAMPAIGN_STATUS_OPTIONS,
  ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
  ARCHIVE_REMEDIATION_DIAGNOSTIC_CODE_OPTIONS,
  ARCHIVE_REMEDIATION_STATUS_TONE,
  ArchiveEvaluationCampaignStatusCode,
  ArchiveRemediationPriorityCode,
  ArchiveRemediationStatusCode,
  ArchiveRemediationStatusDescription,
  createRemediationTask,
  exportEvaluationArchivePackage,
  exportEvaluationPackage,
  getArchiveVolumeDetail,
  getOpenRemediationStats,
  getRemediationStatsByCampaign,
  pageEvaluationCampaigns,
  pageRemediationTasksByCampaign,
  saveEvaluationCampaign,
} from '@/apis/mark/archive-volume'
import ArchiveReadinessRateBar from '@/components/archive-volume/ArchiveReadinessRateBar.vue'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { runArchiveEvaluationExportFlow } from '@/composables/useArchiveEvaluationExportFlow'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { generateAcademicYearStartOptions } from '@/utils/academic-year'
import {
  applyAcademicYearStartYearChange,
  applyTripleSemesterChange,
  createAcademicYearSemesterTripleDefaults,
  ensureTriplePeriodPair,
  parseTripleFromAcademicYear,
  resolveAcademicYearFromTriple,
} from '@/utils/academic-year-semester-triple-filter'
import { remediationDiagnosticLabel } from '@/utils/archive-remediation-diagnostic'
import {
  remediationAssigneeLabel,
  remediationCreatorLabel,
} from '@/utils/archive-remediation-display'
import {
  ARCHIVE_REMEDIATION_PRIORITY_TONE,
  ArchiveRemediationPriorityDescription,
  remediationPriorityCardClass,
} from '@/utils/archive-remediation-priority'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveEvaluationExportTaskModal from '@/views/teacher/archive-volume/components/ArchiveEvaluationExportTaskModal.vue'

defineOptions({ name: 'ArchiveVolumeRemediationPanel' })

const router = useRouter()
const { isTenantWideCollegeCoordinator, loadGrants } = useArchiveDutyAccess()
// MVR-339：创建整改仅认 BE open-stats canCreateRemediationTask===true
const canCreateRemediationTask = ref(false)

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
const remediationStats = ref<ArchiveRemediationByCampaignStatsVO | null>(null)
const remediationStatsLoadFailed = ref(false)
/** 信号带点击筛选：状态与优先级互斥，空值表示不过滤。 */
const taskStatusFilter = ref<ArchiveRemediationStatusCode>()
const taskPriorityFilter = ref<ArchiveRemediationPriorityCode>()
/** 任务列表与概览的请求序号，快速切换批次时丢弃过期响应。 */
let taskLoadSeq = 0
let statsLoadSeq = 0

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
  diagnosticCode: ArchiveRemediationDiagnosticCode | undefined
  assigneeUserId: string | undefined
  dueTime: string | undefined
}

const createTaskForm = reactive<ArchiveRemediationCreateTaskForm>({
  campaignId: undefined,
  volumeId: '',
  taskTitle: '',
  taskDescription: '',
  diagnosticCode: undefined,
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
  selectedCampaign.value
    = campaignSelectOptions.value.find((item) => item.campaignId === campaignId) ?? null
}

function handleCampaignChange(value: SelectValue): void {
  const campaignId = typeof value === 'string' ? value : undefined
  syncSelectedCampaign(campaignId)
  taskStatusFilter.value = undefined
  taskPriorityFilter.value = undefined
  taskPagination.pageNum = 1
  void loadTasks()
}

const canShowCreateRemediationTask = computed(
  () =>
    canCreateRemediationTask.value === true
    && selectedCampaign.value?.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE,
)
const deadlineClockMs = ref(Date.now())
let deadlineClockTimer: ReturnType<typeof setInterval> | undefined

function remediationStatusLabel(code: ArchiveRemediationStatusCode) {
  return strictEnumLabel(ArchiveRemediationStatusDescription, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_REMEDIATION_STATUS_TONE, code, 'taskStatus')
}

function remediationPriorityLabel(code: ArchiveRemediationPriorityCode) {
  return strictEnumLabel(ArchiveRemediationPriorityDescription, code, 'taskPriority')
}

function remediationPriorityTone(code: ArchiveRemediationPriorityCode): BadgeTone {
  return strictEnumTone(ARCHIVE_REMEDIATION_PRIORITY_TONE, code, 'taskPriority')
}

/** 整改截止相对时限着色：已逾期=红，7 天内到期=橙，其余不着色。 */
function remediationDeadlineClass(dueTime: string): string {
  const remaining = new Date(dueTime).getTime() - deadlineClockMs.value
  if (remaining < 0) return 'remediation-deadline--overdue'
  if (remaining <= 7 * 24 * 60 * 60 * 1000) return 'remediation-deadline--soon'
  return ''
}

/** 整改截止相对时限文案：已逾期/剩余天数；距截止超过 7 天不展示。 */
function remediationDeadlineHint(dueTime: string): string {
  const remaining = new Date(dueTime).getTime() - deadlineClockMs.value
  if (remaining >= 0 && remaining > 7 * 24 * 60 * 60 * 1000) return ''
  const days = Math.max(1, Math.ceil(Math.abs(remaining) / (24 * 60 * 60 * 1000)))
  return remaining < 0 ? `（已逾期 ${days} 天）` : `（剩余 ${days} 天）`
}

/** 整改概览指标：优先级分桶 + 待核验 + 已关闭，点击切换任务列表筛选，helper 与原型一致。 */
const remediationSignalMetrics = computed<SignalMetric[]>(() => {
  const stats = remediationStats.value
  if (!stats) return []
  const verifiedDenominator = stats.closedTaskCount + stats.resubmittedTaskCount
  const passRateHint
    = verifiedDenominator > 0
      ? `核验通过率 ${Math.round((stats.closedTaskCount / verifiedDenominator) * 100)}%`
      : undefined
  const priorityMetric = (
    code: ArchiveRemediationPriorityCode,
    value: number,
    helper?: string,
  ): SignalMetric => ({
    key: `priority-${code.toLowerCase()}`,
    label: `${remediationPriorityLabel(code)}优先级`,
    value,
    unit: '项',
    tone: strictEnumTone(ARCHIVE_REMEDIATION_PRIORITY_TONE, code, 'taskPriority'),
    helper,
    clickable: true,
    active: taskPriorityFilter.value === code && !taskStatusFilter.value,
  })
  const high = priorityMetric(
    ArchiveRemediationPriorityCode.HIGH,
    stats.highPriorityTaskCount,
    stats.overdueTaskCount > 0 ? `${stats.overdueTaskCount} 项已逾期` : undefined,
  )
  const medium = priorityMetric(
    ArchiveRemediationPriorityCode.MEDIUM,
    stats.mediumPriorityTaskCount,
    stats.dueSoonTaskCount > 0 ? `本周到期 ${stats.dueSoonTaskCount}` : undefined,
  )
  const low = priorityMetric(
    ArchiveRemediationPriorityCode.LOW,
    stats.lowPriorityTaskCount,
    stats.lowPriorityTaskCount > 0 ? '均在期限内' : undefined,
  )
  const awaiting: SignalMetric = {
    key: 'awaiting-verification',
    label: '待核验',
    value: stats.resubmittedTaskCount,
    unit: '项',
    tone: remediationStatusTone(ArchiveRemediationStatusCode.RESUBMITTED),
    helper: stats.resubmittedTaskCount > 0 ? '已提交证据' : undefined,
    clickable: true,
    active: taskStatusFilter.value === ArchiveRemediationStatusCode.RESUBMITTED,
  }
  const closed: SignalMetric = {
    key: 'closed',
    label: remediationStatusLabel(ArchiveRemediationStatusCode.CLOSED),
    value: stats.closedTaskCount,
    unit: '项',
    tone: remediationStatusTone(ArchiveRemediationStatusCode.CLOSED),
    helper: passRateHint,
    clickable: true,
    active: taskStatusFilter.value === ArchiveRemediationStatusCode.CLOSED,
  }
  const pool = [high, medium, low, awaiting, closed]
  const primaryBase
    = stats.highPriorityTaskCount > 0
      ? high
      : stats.resubmittedTaskCount > 0
        ? awaiting
        : stats.mediumPriorityTaskCount > 0
          ? medium
          : high
  return [
    {
      ...primaryBase,
      emphasis: 'primary',
      actionLabel:
        primaryBase.key === 'awaiting-verification'
          ? '去核验'
          : primaryBase.key.startsWith('priority-')
            ? '处理整改'
            : '查看',
    },
    ...pool
      .filter((item) => item.key !== primaryBase.key)
      .slice(0, 3)
      .map((item) => ({ ...item, emphasis: 'secondary' as const })),
  ]
})

/** 信号带点击筛选：再次点击当前激活指标取消筛选；筛选走服务端分页，概览本身不随筛选变化。 */
function handleSignalMetricClick(key: string): void {
  if (!selectedCampaignId.value) return
  if (key === 'priority-high' || key === 'priority-medium' || key === 'priority-low') {
    const code
      = key === 'priority-high'
        ? ArchiveRemediationPriorityCode.HIGH
        : key === 'priority-medium'
          ? ArchiveRemediationPriorityCode.MEDIUM
          : ArchiveRemediationPriorityCode.LOW
    taskPriorityFilter.value = taskPriorityFilter.value === code ? undefined : code
    taskStatusFilter.value = undefined
  } else if (key === 'awaiting-verification') {
    taskStatusFilter.value
      = taskStatusFilter.value === ArchiveRemediationStatusCode.RESUBMITTED
        ? undefined
        : ArchiveRemediationStatusCode.RESUBMITTED
    taskPriorityFilter.value = undefined
  } else if (key === 'closed') {
    taskStatusFilter.value
      = taskStatusFilter.value === ArchiveRemediationStatusCode.CLOSED
        ? undefined
        : ArchiveRemediationStatusCode.CLOSED
    taskPriorityFilter.value = undefined
  } else {
    return
  }
  taskPagination.pageNum = 1
  void loadTasks(false)
}

/** 加载当前迎评批次的整改状态汇总；失败时置失败态由告警条提供重试，不阻断任务列表。 */
async function loadRemediationStats(): Promise<void> {
  if (!selectedCampaignId.value) {
    remediationStats.value = null
    remediationStatsLoadFailed.value = false
    return
  }
  const seq = ++statsLoadSeq
  try {
    const stats = await getRemediationStatsByCampaign({
      campaignId: selectedCampaignId.value,
    })
    if (seq !== statsLoadSeq) return
    remediationStats.value = stats
    remediationStatsLoadFailed.value = false
  } catch {
    if (seq !== statsLoadSeq) return
    remediationStats.value = null
    remediationStatsLoadFailed.value = true
  }
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
    showUserError(error, '迎评批次列表加载失败')
  } finally {
    campaignLoading.value = false
  }
}

async function loadTasks(reloadStats = true) {
  if (!selectedCampaignId.value) {
    tasks.value = []
    taskPagination.total = 0
    remediationStats.value = null
    remediationStatsLoadFailed.value = false
    return
  }
  if (reloadStats) {
    void loadRemediationStats()
  }
  const seq = ++taskLoadSeq
  taskLoading.value = true
  try {
    const page = await pageRemediationTasksByCampaign({
      campaignId: selectedCampaignId.value,
      pageNum: taskPagination.pageNum,
      pageSize: taskPagination.pageSize,
      taskStatus: taskStatusFilter.value,
      taskPriority: taskPriorityFilter.value,
    })
    if (seq !== taskLoadSeq) return
    tasks.value = page.list
    taskPagination.pageNum = page.pageNum
    taskPagination.pageSize = page.pageSize
    taskPagination.total = page.total
  } catch (error) {
    if (seq !== taskLoadSeq) return
    showUserError(error, '整改任务列表加载失败')
    tasks.value = []
    taskPagination.total = 0
  } finally {
    if (seq === taskLoadSeq) taskLoading.value = false
  }
}

function handleTaskPageChange(pageNum: number, pageSize: number): void {
  taskPagination.pageNum = pageNum
  taskPagination.pageSize = pageSize
  void loadTasks(false)
}

function openCampaignModal(campaign?: ArchiveEvaluationCampaignResponse) {
  // MVR-317：迎评批次维护仅租户级学院协调人
  if (isTenantWideCollegeCoordinator.value !== true) {
    void message.warning('仅租户级学院协调人可维护迎评批次')
    return
  }
  campaignForm.campaignId = campaign?.campaignId
  campaignForm.campaignName = campaign?.campaignName ?? ''
  const triple = parseTripleFromAcademicYear(campaign?.academicYear, campaign?.semester)
  campaignForm.academicYearStartYear = triple.academicYearStartYear
  campaignForm.academicYearEndYear = triple.academicYearEndYear
  campaignForm.semester = triple.semester
  campaignForm.campaignStatus
    = campaign?.campaignStatus ?? ArchiveEvaluationCampaignStatusCode.ACTIVE
  campaignForm.startTime = campaign?.startTime
  campaignForm.endTime = campaign?.endTime
  campaignForm.description = campaign?.description ?? ''
  campaignModalOpen.value = true
}

async function submitCampaign() {
  // MVR-317：与 isTenantWideCollegeCoordinator 二次拦截
  if (isTenantWideCollegeCoordinator.value !== true) {
    void message.warning('仅租户级学院协调人可维护迎评批次')
    return
  }
  if (campaignSaving.value === true) return
  if (!campaignForm.campaignName.trim()) {
    showFormValidationMessage('请填写批次名称')
    return
  }
  if (!ensureTriplePeriodPair(campaignForm)) {
    return
  }
  if (!campaignForm.startTime || !campaignForm.endTime) {
    showFormValidationMessage('请选择批次开始时间和结束时间')
    return
  }
  if (campaignForm.startTime >= campaignForm.endTime) {
    showFormValidationMessage('批次开始时间必须早于结束时间')
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
    void message.success(campaignForm.campaignId ? '迎评批次已更新' : '迎评批次已创建')
    campaignModalOpen.value = false
    await loadCampaigns()
    selectedCampaignId.value = saved.campaignId
    syncSelectedCampaign(saved.campaignId)
    taskPagination.pageNum = 1
    await loadTasks()
  } catch (error) {
    showUserError(error, '保存迎评批次失败')
  } finally {
    campaignSaving.value = false
  }
}

async function handleExportCampaign() {
  // MVR-318：与 isTenantWideCollegeCoordinator / BE 导出门禁二次拦截
  if (isTenantWideCollegeCoordinator.value !== true) {
    void message.warning('仅全校学院协调人可导出迎评材料包')
    return
  }
  if (!selectedCampaignId.value || exporting.value === true) return
  exporting.value = true
  try {
    await runArchiveEvaluationExportFlow({
      campaignId: selectedCampaignId.value,
      exportFn: exportEvaluationPackage,
      successMessage: '迎评清单已导出',
      scopeHint: ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
      campaignLabel: selectedCampaign.value?.campaignName,
    })
  } catch (error) {
    showUserError(error, '导出迎评清单失败')
  } finally {
    exporting.value = false
  }
}

async function handleExportArchiveCampaign() {
  // MVR-318：与 isTenantWideCollegeCoordinator / BE 导出门禁二次拦截
  if (isTenantWideCollegeCoordinator.value !== true) {
    void message.warning('仅全校学院协调人可导出迎评材料包')
    return
  }
  if (!selectedCampaignId.value || exportingArchive.value === true) return
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
    showUserError(error, '导出四级目录包失败')
  } finally {
    exportingArchive.value = false
  }
}

function openCreateTaskModal() {
  // MVR-339：与 canCreateRemediationTask / BE createRemediationTask 二次拦截
  if (canCreateRemediationTask.value !== true) {
    void message.warning('仅学院协调人可创建整改任务')
    return
  }

  createTaskForm.campaignId = selectedCampaignId.value
  createTaskForm.volumeId = ''
  createTaskForm.taskTitle = ''
  createTaskForm.taskDescription = ''
  createTaskForm.diagnosticCode = undefined
  createTaskForm.assigneeUserId = undefined
  createTaskForm.dueTime = undefined
  createTaskOpen.value = true
}

async function submitCreateTask() {
  // MVR-342/353：入口与 open-stats canCreateRemediationTask 二次拦截（卷级再校验 detail canCreateRemediationTask）
  if (canCreateRemediationTask.value !== true) {
    void message.warning('仅学院协调人可创建整改任务')
    return
  }
  if (createTaskSubmitting.value === true) return
  if (!createTaskForm.volumeId.trim()) {
    showFormValidationMessage('请填写归档卷编号')
    return
  }
  if (!createTaskForm.taskTitle.trim()) {
    showFormValidationMessage('请填写任务标题')
    return
  }
  if (!createTaskForm.assigneeUserId) {
    showFormValidationMessage('请选择责任人')
    return
  }
  createTaskSubmitting.value = true
  try {
    const volumeDetail = await getArchiveVolumeDetail(createTaskForm.volumeId.trim())
    // MVR-353：仅认 BE getDetail canCreateRemediationTask===true（职责+状态+移交/开放整改互斥）
    // MVR-953：仅认 BE canCreateRemediationTask===true
    if (volumeDetail.canCreateRemediationTask !== true) {
      showFormValidationMessage(
        '当前卷不可新建整改（需学院协调职责，且卷为收材/待验收/已入库、非移交待验收、无开放整改）',
      )
      return
    }
    await createRemediationTask({
      campaignId: createTaskForm.campaignId,
      volumeId: createTaskForm.volumeId.trim(),
      taskTitle: createTaskForm.taskTitle.trim(),
      taskDescription: createTaskForm.taskDescription.trim() || undefined,
      diagnosticCode: createTaskForm.diagnosticCode,
      assigneeUserId: createTaskForm.assigneeUserId,
      dueTime: createTaskForm.dueTime,
    })
    void message.success('整改任务已创建')
    createTaskOpen.value = false
    if (createTaskForm.campaignId) {
      selectedCampaignId.value = createTaskForm.campaignId
    }
    await loadTasks()
  } catch (error) {
    showUserError(error, '创建整改任务失败')
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
  deadlineClockTimer = window.setInterval(() => {
    deadlineClockMs.value = Date.now()
  }, 60_000)
  void loadGrants().then(async () => {
    try {
      const stats = await getOpenRemediationStats()
      canCreateRemediationTask.value = stats.canCreateRemediationTask === true
    } catch {
      canCreateRemediationTask.value = false
    }
  })
  void loadCampaigns()
})

onBeforeUnmount(() => {
  if (deadlineClockTimer !== undefined) {
    window.clearInterval(deadlineClockTimer)
  }
})

watch(
  () => campaignForm.academicYearStartYear,
  (startYear) => {
    applyAcademicYearStartYearChange(campaignForm, startYear)
  },
)

watch(
  () => campaignForm.semester,
  (semester) => {
    if (semester == null && campaignForm.academicYearStartYear != null) {
      applyTripleSemesterChange(campaignForm, undefined)
    }
  },
)
</script>

<style scoped>
.archive-volume-remediation-panel__signals {
  margin-bottom: var(--dp-space-component);
}

.archive-volume-remediation-panel__signals-error {
  margin-bottom: var(--dp-space-component);
}

.archive-volume-remediation-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
}

.archive-volume-remediation-panel__task-pagination {
  margin-top: var(--dp-space-block);
  display: flex;
  justify-content: flex-end;
}

.archive-volume-remediation-panel__export-hint {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.archive-volume-remediation-panel__campaign-rate {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  padding: 0 var(--dp-space-component-tight);
}

.archive-volume-remediation-panel__campaign-rate-label {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  white-space: nowrap;
}

.detail-desc {
  margin-bottom: var(--dp-space-block);
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.archive-remediation-card-list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component) 0;
}

.remediation-card {
  padding: var(--dp-space-block);
  border: 1px solid var(--dp-border-subtle);
  border-left: 3px solid var(--dp-gray-400);
  border-radius: var(--dp-radius-panel);
  box-shadow: var(--dp-shadow-xs);
  background: var(--dp-surface);
}

.remediation-card--high {
  border-left-color: var(--dp-error);
}

.remediation-card--medium {
  border-left-color: var(--dp-warning);
}

.remediation-card--low {
  border-left-color: var(--dp-gray-400);
}

.remediation-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-component);
}

.remediation-card__main {
  flex: 1;
  min-width: 0;
}

.remediation-card__title {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.remediation-card__desc {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-font-size-xs);
  line-height: 1.5;
  color: var(--dp-text-muted);
}

.remediation-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component-tight);
}

.remediation-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-block);
  margin-top: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}

.remediation-card__meta b {
  font-weight: 500;
  color: var(--dp-text-secondary);
}

.remediation-card__meta .remediation-deadline--overdue {
  color: var(--dp-error);
}

.remediation-card__meta .remediation-deadline--soon {
  color: var(--dp-warning);
}

.remediation-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
  flex-shrink: 0;
}
</style>
