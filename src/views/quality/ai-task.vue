<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { TeacherUserInfoDto } from '@/apis/platform/teacher-catalog'
import type { AiResultIssueSeverityCode, AiResultVO } from '@/apis/quality/ai-result'
/**
 * 质量评价 / AI 能力 - AI 任务与结果审计台
 *
 * 后端契约（AiTaskController + AiResultController）：
 * - 列表 AiTaskQueryRequest：按能力 / 状态 / 业务类型 / 业务 ID / 操作人 / 业务锚点筛选
 * - 提交 AiTaskSubmitRequest：仅 OBE 主链能力；教学档案袋 AI 在 /portfolio 域提交
 * - 状态机 PENDING -> PROCESSING -> COMPLETED / FAILED / CANCELLED，失败任务进入人工处置，不支持自动重试
 * - 结果 updateValidation 可调 PASSED / WARN / REJECTED
 */
import type {
  AiTaskManualHandlingRequest,
  AiTaskQueryRequest,
  AiTaskVO,
  QualityStatusCountsResponse,
} from '@/apis/quality/ai-task'
import type { AiTaskSubmitRequest } from '@/apis/quality/ai-task-trigger'
import type {
  AiSensitiveCheckStatusCode,
  AiTaskFailurePhaseCode} from '@/apis/quality/types';
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { AiResultImprovementPriorityCode } from '@/types/enums/ai-result-improvement-priority-enum'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
} from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { accreditationApi } from '@/apis/quality/accreditation'
import {
  aiResultApi,
  aiResultImprovementPriorityLabel,
  aiResultIssueSeverityLabel,
} from '@/apis/quality/ai-result'
import { aiTaskApi } from '@/apis/quality/ai-task'
import { aiTaskTriggerApi } from '@/apis/quality/ai-task-trigger'
import {
  AI_OUTPUT_VALIDATION_COLOR,
  AI_SENSITIVE_CHECK_STATUS_COLOR,
  AI_TASK_STATUS_COLOR,
  AiManualHandlingStatusCode,
  AiManualHandlingStatusDescription,
  AiOutputValidationCode,
  AiOutputValidationDescription,
  AiSensitiveCheckStatusDescription,
  AiTaskBusinessTypeCode,
  AiTaskBusinessTypeDescription,
  AiTaskFailurePhaseDescription,
  AiTaskStatusCode,
  AiTaskStatusDescription,
  AiTaskTypeCode,
  AiTaskTypeDescription,
  ConfirmationStatusCode,
  ReportTypeCode,
} from '@/apis/quality/types'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import {
  AchievementResultSelector,
  CourseSelector,
  IndirectFormSelector,
  ProgramSelector,
  ReportSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSegmented from '@/components/ui-guide/ui/UiSegmented.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import AuditTimelineDrawer from '@/components/workbench/AuditTimelineDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePolling } from '@/composables/usePolling'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useAuthStore, useUserStore } from '@/stores'
import { useAiTaskStore } from '@/stores/modules/aiTask'
import { useQualityStore } from '@/stores/modules/quality'
import {
  getUserProcessFailureMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { RoleEnum } from '@/utils/permission'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const aiTaskStore = useAiTaskStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const isSuperAdmin = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)

function isTaskOwner(record: AiTaskVO | null): boolean {
  return isSuperAdmin.value || record?.operatorUserId === userStore.userInfo.userId
}

const canValidateTaskResult = computed(() => isTaskOwner(detailRecord.value))

function aiTaskTypeLabel(value: AiTaskTypeCode): string {
  return strictEnumLabel(AiTaskTypeDescription, value, '智能任务类型')
}

function aiTaskStatusLabel(value: AiTaskStatusCode): string {
  return strictEnumLabel(AiTaskStatusDescription, value, '智能任务状态')
}

function aiTaskFailurePhaseLabel(value: AiTaskFailurePhaseCode): string {
  return strictEnumLabel(AiTaskFailurePhaseDescription, value, '智能任务失败阶段')
}

function aiTaskStatusColor(value: AiTaskStatusCode): BadgeTone {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, '智能任务状态')
}

function aiTaskBusinessTypeLabel(value: AiTaskBusinessTypeCode): string {
  return strictEnumLabel(AiTaskBusinessTypeDescription, value, '智能任务业务类型')
}

function validationLabel(value: AiOutputValidationCode): string {
  return strictEnumLabel(AiOutputValidationDescription, value, '智能输出校验状态')
}

function validationColor(value: AiOutputValidationCode): BadgeTone {
  return strictEnumTone(AI_OUTPUT_VALIDATION_COLOR, value, '智能输出校验状态')
}

function sensitiveCheckStatusLabel(value: AiSensitiveCheckStatusCode | undefined): string {
  if (!value) return '—'
  return strictEnumLabel(AiSensitiveCheckStatusDescription, value, '敏感信息校验状态')
}

function sensitiveCheckStatusColor(value: AiSensitiveCheckStatusCode | undefined): BadgeTone {
  if (!value) return 'gray'
  return strictEnumTone(AI_SENSITIVE_CHECK_STATUS_COLOR, value, '敏感信息校验状态')
}

function manualHandlingStatusLabel(value: AiManualHandlingStatusCode): string {
  return strictEnumLabel(AiManualHandlingStatusDescription, value, '智能人工处理状态')
}

function aiResultSeverityLabel(value: AiResultIssueSeverityCode): string {
  return aiResultIssueSeverityLabel(value)
}

function aiResultPriorityLabel(value: AiResultImprovementPriorityCode): string {
  return aiResultImprovementPriorityLabel(value)
}

const qualityStore = useQualityStore()
const route = useRoute()
const router = useRouter()

const list = ref<AiTaskVO[]>([])
const total = ref(0)
const taskStatusCounts = ref<QualityStatusCountsResponse | null>(null)
const loading = ref(false)

const query = reactive<AiTaskQueryRequest & Record<string, unknown>>({
  pageNum: 1,
  pageSize: 10,
  taskType: undefined,
  status: undefined,
  businessType: undefined,
  businessId: '',
  operatorUserId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
})

const STATUS_SEGMENT_ALL = 'ALL'
const statusSegment = ref<string>(STATUS_SEGMENT_ALL)

const submitVisible = ref(false)
const submitting = ref(false)
const materialFileName = ref<string>()
const submitForm = reactive<AiTaskSubmitRequest>({
  taskType: AiTaskTypeCode.ACHIEVEMENT_DIAGNOSIS,
  businessType: AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT,
  businessId: '',
  programId: '',
  trainingPlanId: '',
  accreditationCycleId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
  fileNodeId: '',
  question: '',
})

const detailVisible = ref(false)
const submitCycleLoading = ref(false)
const submitCycleOptions = ref<{ label: string, value: string }[]>([])
const detailLoading = ref(false)
const detailRecord = ref<AiTaskVO | null>(null)
const detailTabActive = ref('result')
const detailTabItems = [{ key: 'result', label: '智能结果' }]
const detailResult = ref<AiResultVO | null>(null)
/** 详情抽屉打开代际：taskId + openGeneration，旧响应不得落地 */
const detailOpenGeneration = ref(0)
const detailResultLoadFailed = ref(false)
/** 本页持有的 Store 详情轮询 ownership（列表轮询不再批量 startPolling） */
const pageOwnedPollingIds = new Set<string>()
const validationUpdating = ref(false)
const manualHandleVisible = ref(false)
const manualHandleSubmitting = ref(false)
const manualHandleForm = reactive<AiTaskManualHandlingRequest>({
  id: '',
  manualHandlingStatus: AiManualHandlingStatusCode.PENDING,
  manualHandlingRemark: '',
})

const resetProcessingVisible = ref(false)
const resetProcessingSubmitting = ref(false)
const resetProcessingForm = reactive({
  id: '',
  handlingRemark: '',
})

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

const OBE_AI_TASK_TYPES: readonly AiTaskTypeCode[] = [
  AiTaskTypeCode.SYLLABUS_PARSE,
  AiTaskTypeCode.TRAINING_PLAN_PARSE,
  AiTaskTypeCode.ACHIEVEMENT_DIAGNOSIS,
  AiTaskTypeCode.COURSE_REPORT_GENERATE,
  AiTaskTypeCode.PROGRAM_REPORT_GENERATE,
  AiTaskTypeCode.IMPROVEMENT_SUGGESTION_GENERATE,
  AiTaskTypeCode.MATERIAL_QA,
  AiTaskTypeCode.INDIRECT_RESPONSE_DOC_PARSE,
]

const PORTFOLIO_AI_TASK_TYPE_SET: ReadonlySet<string> = new Set([
  AiTaskTypeCode.PORTFOLIO_CERTIFICATE_OCR,
  AiTaskTypeCode.PORTFOLIO_DOCUMENT_PARSE,
  AiTaskTypeCode.PORTFOLIO_POLICY_MATCH,
  AiTaskTypeCode.PORTFOLIO_MATERIAL_QA,
  AiTaskTypeCode.PORTFOLIO_REPORT_GENERATE,
  AiTaskTypeCode.PORTFOLIO_COCKPIT_ASK,
  AiTaskTypeCode.PORTFOLIO_TEACHER_RECOMMEND_EXPLAIN,
  AiTaskTypeCode.PORTFOLIO_CONTENT_OPTIMIZE,
  AiTaskTypeCode.PORTFOLIO_TEACHING_EFFECT_ANALYSIS,
  AiTaskTypeCode.PORTFOLIO_DEVELOPMENT_SUGGEST,
  AiTaskTypeCode.PORTFOLIO_CONTENT_GENERATE,
])

function mapTaskTypeOptions(
  types: readonly AiTaskTypeCode[],
): Array<{ value: AiTaskTypeCode, label: string }> {
  return types.map((value) => ({
    value,
    label: strictEnumLabel(AiTaskTypeDescription, value, '智能任务类型'),
  }))
}

/** OBE 主链可提交 / 审计筛选能力（本页禁止混入档案袋任务类型） */
const submitTaskTypeOptions = mapTaskTypeOptions(OBE_AI_TASK_TYPES)
const auditTaskTypeOptions = submitTaskTypeOptions
const statusOptions: Array<{ value: AiTaskStatusCode, label: string }> = [
  { value: AiTaskStatusCode.PENDING, label: AiTaskStatusDescription.PENDING },
  { value: AiTaskStatusCode.PROCESSING, label: AiTaskStatusDescription.PROCESSING },
  { value: AiTaskStatusCode.COMPLETED, label: AiTaskStatusDescription.COMPLETED },
  { value: AiTaskStatusCode.FAILED, label: AiTaskStatusDescription.FAILED },
  { value: AiTaskStatusCode.CANCELLED, label: AiTaskStatusDescription.CANCELLED },
]
const businessTypeOptions: { value: AiTaskBusinessTypeCode, label: string }[] = [
  {
    value: AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT,
    label: AiTaskBusinessTypeDescription.ACHIEVEMENT_RESULT,
  },
  {
    value: AiTaskBusinessTypeCode.QUALITY_COURSE,
    label: AiTaskBusinessTypeDescription.QUALITY_COURSE,
  },
  {
    value: AiTaskBusinessTypeCode.TRAINING_PLAN,
    label: AiTaskBusinessTypeDescription.TRAINING_PLAN,
  },
  { value: AiTaskBusinessTypeCode.REPORT, label: AiTaskBusinessTypeDescription.REPORT },
  {
    value: AiTaskBusinessTypeCode.INDIRECT_FORM,
    label: AiTaskBusinessTypeDescription.INDIRECT_FORM,
  },
]
const taskBusinessTypeMap: Record<AiTaskTypeCode, AiTaskBusinessTypeCode> = {
  [AiTaskTypeCode.ACHIEVEMENT_DIAGNOSIS]: AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT,
  [AiTaskTypeCode.COURSE_REPORT_GENERATE]: AiTaskBusinessTypeCode.REPORT,
  [AiTaskTypeCode.IMPROVEMENT_SUGGESTION_GENERATE]: AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT,
  [AiTaskTypeCode.INDIRECT_RESPONSE_DOC_PARSE]: AiTaskBusinessTypeCode.INDIRECT_FORM,
  [AiTaskTypeCode.MATERIAL_QA]: AiTaskBusinessTypeCode.QUALITY_COURSE,
  [AiTaskTypeCode.PORTFOLIO_CERTIFICATE_OCR]: AiTaskBusinessTypeCode.PORTFOLIO_MATERIAL,
  [AiTaskTypeCode.PORTFOLIO_DOCUMENT_PARSE]: AiTaskBusinessTypeCode.PORTFOLIO_MATERIAL,
  [AiTaskTypeCode.PORTFOLIO_MATERIAL_QA]: AiTaskBusinessTypeCode.PORTFOLIO_MATERIAL,
  [AiTaskTypeCode.PORTFOLIO_POLICY_MATCH]: AiTaskBusinessTypeCode.PORTFOLIO_MATERIAL,
  [AiTaskTypeCode.PORTFOLIO_CONTENT_OPTIMIZE]: AiTaskBusinessTypeCode.PORTFOLIO_MATERIAL,
  [AiTaskTypeCode.PORTFOLIO_TEACHING_EFFECT_ANALYSIS]: AiTaskBusinessTypeCode.PORTFOLIO_MATERIAL,
  [AiTaskTypeCode.PORTFOLIO_REPORT_GENERATE]: AiTaskBusinessTypeCode.PORTFOLIO_EVALUATION,
  [AiTaskTypeCode.PORTFOLIO_TEACHER_RECOMMEND_EXPLAIN]: AiTaskBusinessTypeCode.PORTFOLIO_EVALUATION,
  [AiTaskTypeCode.PORTFOLIO_COCKPIT_ASK]: AiTaskBusinessTypeCode.PORTFOLIO_EVALUATION,
  [AiTaskTypeCode.PORTFOLIO_DEVELOPMENT_SUGGEST]: AiTaskBusinessTypeCode.PORTFOLIO_EVALUATION,
  [AiTaskTypeCode.PORTFOLIO_CONTENT_GENERATE]: AiTaskBusinessTypeCode.PORTFOLIO_EVALUATION,
  [AiTaskTypeCode.PROGRAM_REPORT_GENERATE]: AiTaskBusinessTypeCode.REPORT,
  [AiTaskTypeCode.SYLLABUS_PARSE]: AiTaskBusinessTypeCode.QUALITY_COURSE,
  [AiTaskTypeCode.TRAINING_PLAN_PARSE]: AiTaskBusinessTypeCode.TRAINING_PLAN,
}
const validationOptions: { value: AiOutputValidationCode, label: string, color: string }[] = [
  { value: AiOutputValidationCode.PASSED, label: '通过（接受）', color: 'green' },
  { value: AiOutputValidationCode.WARN, label: '警告（需人工审核）', color: 'orange' },
  { value: AiOutputValidationCode.REJECTED, label: '退回（拒绝）', color: 'red' },
]
const manualHandlingOptions: { value: AiManualHandlingStatusCode, label: string }[] = [
  { value: AiManualHandlingStatusCode.NONE, label: AiManualHandlingStatusDescription.NONE },
  { value: AiManualHandlingStatusCode.PENDING, label: AiManualHandlingStatusDescription.PENDING },
  {
    value: AiManualHandlingStatusCode.IN_PROGRESS,
    label: AiManualHandlingStatusDescription.IN_PROGRESS,
  },
  { value: AiManualHandlingStatusCode.RESOLVED, label: AiManualHandlingStatusDescription.RESOLVED },
  { value: AiManualHandlingStatusCode.IGNORED, label: AiManualHandlingStatusDescription.IGNORED },
]

const filterModel = computed<Record<string, unknown>>({
  get: () => query,
  set: (value) => {
    Object.assign(query, value)
  },
})

const filterFields = computed<FilterField[]>(() => {
  const fields: FilterField[] = [
    {
      key: 'taskType',
      type: 'select',
      label: '能力',
      placeholder: '能力',
      allowClear: true,
      width: 180,
      options: auditTaskTypeOptions,
    },
    {
      key: 'businessType',
      type: 'custom',
      label: '业务类型',
      width: 140,
    },
  ]
  if (query.businessType) {
    fields.push({
      key: 'businessId',
      type: 'custom',
      label: '业务对象',
      width: 180,
    })
  }
  fields.push(
    {
      key: 'operatorUserId',
      type: 'custom',
      label: '操作人',
      width: 180,
    },
    {
      key: 'trainingPlanId',
      type: 'custom',
      label: '培养方案',
      width: 180,
    },
    {
      key: 'qualityCourseId',
      type: 'custom',
      label: '关联课程',
      width: 180,
    },
    {
      key: 'achievementResultId',
      type: 'custom',
      label: '达成结果',
      width: 180,
    },
    {
      key: 'reportId',
      type: 'custom',
      label: '质量报告',
      width: 180,
    },
  )
  return fields
})

function handleSearch() {
  loadList()
}

function handleReset() {
  resetQuery()
}

/** 对齐后端 AiTaskSubmitValidator 的前端提交门禁 */
function validateAiTaskSubmit(form: AiTaskSubmitRequest): boolean {
  if (!form.taskType || !form.businessType || !form.businessId?.trim()) {
    return false
  }
  const businessId = form.businessId.trim()
  switch (form.taskType) {
    case AiTaskTypeCode.ACHIEVEMENT_DIAGNOSIS:
    case AiTaskTypeCode.IMPROVEMENT_SUGGESTION_GENERATE:
      return (
        form.businessType === AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT
        && !!form.achievementResultId?.trim()
        && businessId === form.achievementResultId.trim()
      )
    case AiTaskTypeCode.COURSE_REPORT_GENERATE:
      return (
        form.businessType === AiTaskBusinessTypeCode.REPORT
        && !!form.qualityCourseId?.trim()
        && !!form.reportId?.trim()
        && businessId === form.reportId.trim()
      )
    case AiTaskTypeCode.PROGRAM_REPORT_GENERATE:
      return (
        form.businessType === AiTaskBusinessTypeCode.REPORT
        && !!form.programId?.trim()
        && !!form.trainingPlanId?.trim()
        && !!form.accreditationCycleId?.trim()
        && !!form.reportId?.trim()
        && businessId === form.reportId.trim()
      )
    case AiTaskTypeCode.SYLLABUS_PARSE:
      return (
        form.businessType === AiTaskBusinessTypeCode.QUALITY_COURSE
        && !!form.fileNodeId?.trim()
        && !!form.qualityCourseId?.trim()
        && businessId === form.qualityCourseId.trim()
      )
    case AiTaskTypeCode.TRAINING_PLAN_PARSE:
      return (
        form.businessType === AiTaskBusinessTypeCode.TRAINING_PLAN
        && !!form.fileNodeId?.trim()
        && !!form.programId?.trim()
        && !!form.trainingPlanId?.trim()
        && businessId === form.trainingPlanId.trim()
      )
    case AiTaskTypeCode.MATERIAL_QA:
      return (
        form.businessType === AiTaskBusinessTypeCode.QUALITY_COURSE
        && !!form.qualityCourseId?.trim()
        && businessId === form.qualityCourseId.trim()
        && !!form.fileNodeId?.trim()
        && !!form.question?.trim()
      )
    case AiTaskTypeCode.INDIRECT_RESPONSE_DOC_PARSE:
      return form.businessType === AiTaskBusinessTypeCode.INDIRECT_FORM && !!form.fileNodeId?.trim()
    default:
      return false
  }
}

const submitDisabled = computed(() => !validateAiTaskSubmit(submitForm))

/** 间接评价文档解析须用 QUALITY_INDIRECT_RESPONSE_DOC scene，其余 AI 任务用通用材料 scene。 */
const submitMaterialSceneKey = computed(() =>
  submitForm.taskType === AiTaskTypeCode.INDIRECT_RESPONSE_DOC_PARSE
    ? FileUploadSceneKey.QUALITY_INDIRECT_RESPONSE_DOC
    : FileUploadSceneKey.QUALITY_AI_TASK_MATERIAL,
)

const submitMaterialAccept = computed(() =>
  submitForm.taskType === AiTaskTypeCode.INDIRECT_RESPONSE_DOC_PARSE
    ? '.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp,.tiff'
    : '.doc,.docx,.pdf,.xls,.xlsx,.txt,.md',
)

const resultSummaryLines = computed(() => {
  return (
    detailResult.value?.summary
      ?.split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  )
})
const sensitiveCheckLines = computed(() => {
  return (
    detailResult.value?.sensitiveCheckDetail
      ?.split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  )
})
const issueItems = computed(() => detailResult.value?.issueItems ?? [])
const evidenceItems = computed(() => detailResult.value?.evidenceItems ?? [])
const improvementItems = computed(() => detailResult.value?.improvementItems ?? [])

async function loadList() {
  const scope = beginQualityScopeRequest()
  loading.value = true
  try {
    const listQuery = buildAiTaskListQuery()
    const page = await aiTaskApi.page(listQuery)
    if (scope.isStale()) {
      return
    }
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
      return
    }
    try {
      const counts = await aiTaskApi.statusCounts(listQuery)
      if (!scope.isStale()) {
        taskStatusCounts.value = counts
      }
    } catch (error) {
      if (!scope.isStale()) {
        showUserError(error, '智能任务状态统计加载失败')
      }
    }
    markListSyncOk()
    syncListPolling()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    showUserError(error, '智能任务加载失败')
  } finally {
    if (!scope.isStale()) {
      loading.value = false
    }
  }
}

const LIST_POLL_INTERVALS_MS = [3000, 6000, 12000, 30000] as const
const LIST_POLL_MAX_FAILURES = 5
const listSyncAt = ref<string | null>(null)
const listSyncFailed = ref(false)
const listPollFailCount = ref(0)
const listPollStopped = ref(false)

function markListSyncOk(): void {
  listSyncFailed.value = false
  listPollFailCount.value = 0
  listPollStopped.value = false
  listSyncAt.value = new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function markListSyncFailed(): void {
  listSyncFailed.value = true
  listPollFailCount.value += 1
  if (listPollFailCount.value >= LIST_POLL_MAX_FAILURES) {
    listPollStopped.value = true
  }
}

function currentListPollIntervalMs(): number {
  const idx = Math.min(listPollFailCount.value, LIST_POLL_INTERVALS_MS.length - 1)
  return LIST_POLL_INTERVALS_MS[idx]
}

function startPageOwnedPolling(taskId: string): void {
  if (!taskId) {
    return
  }
  pageOwnedPollingIds.add(taskId)
  aiTaskStore.startPolling(taskId)
}

function stopPageOwnedPolling(taskId: string): void {
  if (!taskId) {
    return
  }
  pageOwnedPollingIds.delete(taskId)
  aiTaskStore.stopPolling(taskId)
}

function releasePageOwnedPolling(): void {
  for (const taskId of pageOwnedPollingIds) {
    aiTaskStore.stopPolling(taskId)
  }
  pageOwnedPollingIds.clear()
}

const listPolling = usePolling(() => loadListQuietly(), {
  getOptions: () => ({
    intervalMs: currentListPollIntervalMs(),
    when:
      !listPollStopped.value
      && list.value.some(
        (record) =>
          record.status === AiTaskStatusCode.PENDING
          || record.status === AiTaskStatusCode.PROCESSING,
      ),
  }),
  pauseWhenDocumentHidden: true,
})

function syncListPolling(): void {
  listPolling.syncPolling()
}

async function loadListQuietly(): Promise<void> {
  if (loading.value) {
    return
  }
  const scope = beginQualityScopeRequest()
  try {
    const listQuery = buildAiTaskListQuery()
    const quiet = { showErrorMessage: false as const }
    const page = await aiTaskApi.page(listQuery, quiet)
    if (scope.isStale()) {
      return
    }
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    try {
      const counts = await aiTaskApi.statusCounts(listQuery, quiet)
      if (!scope.isStale()) {
        taskStatusCounts.value = counts
      }
    } catch {
      // 轮询：统计失败不覆盖列表
    }
    if (detailRecord.value?.id && detailVisible.value) {
      const updated = list.value.find((item) => item.id === detailRecord.value!.id)
      if (updated) {
        detailRecord.value = updated
      }
    }
    markListSyncOk()
    syncListPolling()
  } catch {
    if (scope.isStale()) {
      return
    }
    markListSyncFailed()
    syncListPolling()
  }
}

const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!qualityStore.currentTrainingPlanId) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
})

async function handleScopeChange(): Promise<void> {
  await loadList()
}

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: false })

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

const columns: ColumnsType = [
  { title: '能力', dataIndex: 'taskType', key: 'taskType', width: 180, fixed: 'left' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 160 },
  { title: '业务归属', key: 'businessAnchor', width: 240 },
  { title: '失败阶段', dataIndex: 'failurePhase', key: 'failurePhase', width: 160 },
  { title: '开始时间', dataIndex: 'startedTime', key: 'startedTime', width: 160 },
  { title: '操作', key: 'actions', width: 260 },
]

function resetQuery() {
  query.pageNum = 1
  query.taskType = undefined
  query.status = undefined
  statusSegment.value = STATUS_SEGMENT_ALL
  query.businessType = undefined
  query.businessId = ''
  query.operatorUserId = ''
  query.programId = ''
  query.trainingPlanId = ''
  query.qualityCourseId = ''
  query.achievementResultId = ''
  query.reportId = ''
  loadList()
}

function handleQueryBusinessTypeChange(value: SelectValue) {
  query.businessId = ''
  if (value === undefined || value === null || value === '') {
    query.businessType = undefined
    return
  }
  if (typeof value !== 'string' || Array.isArray(value)) {
    showFormValidationMessage('业务类型筛选无效，请重新选择')
    return
  }
  const selectedOption = businessTypeOptions.find((option) => option.value === value)
  if (!selectedOption) {
    showFormValidationMessage('业务类型筛选无效，请重新选择')
    return
  }
  query.businessType = selectedOption.value
}

function handleQueryBusinessObjectChange(value: string | string[] | null, _option?: unknown): void {
  if (Array.isArray(value)) {
    showFormValidationMessage('业务对象筛选只能单选，请重新选择')
    query.businessId = ''
    return
  }
  query.businessId = value ?? ''
}

function handleQueryOperatorChange(
  value: string | string[] | null,
  _option?: TeacherUserInfoDto | TeacherUserInfoDto[],
): void {
  if (Array.isArray(value)) {
    showFormValidationMessage('操作人筛选只能单选，请重新选择')
    return
  }
  query.operatorUserId = value ?? ''
}

function handleQueryTrainingPlanChange(value: string | null): void {
  query.trainingPlanId = value ?? ''
}

function handleQueryQualityCourseChange(value: string | null): void {
  query.qualityCourseId = value ?? ''
}

function handleQueryAchievementResultChange(value: string | null): void {
  query.achievementResultId = value ?? ''
}

function handleQueryReportChange(value: string | null): void {
  query.reportId = value ?? ''
}

function openSubmitPrefill(
  taskType?: AiTaskTypeCode,
  scope?: { programId?: string, trainingPlanId?: string, accreditationCycleId?: string },
) {
  const resolvedType
    = taskType && submitTaskTypeOptions.some((o) => o.value === taskType)
      ? taskType
      : AiTaskTypeCode.ACHIEVEMENT_DIAGNOSIS
  Object.assign(submitForm, {
    taskType: resolvedType,
    businessType: taskBusinessTypeMap[resolvedType],
    businessId: '',
    programId: scope?.programId || qualityStore.currentProgramId || '',
    trainingPlanId: scope?.trainingPlanId || qualityStore.currentTrainingPlanId || '',
    accreditationCycleId: scope?.accreditationCycleId || '',
    qualityCourseId: '',
    achievementResultId: '',
    reportId: '',
    fileNodeId: '',
    question: '',
  })
  materialFileName.value = undefined
  submitVisible.value = true
  if (resolvedType === AiTaskTypeCode.PROGRAM_REPORT_GENERATE) {
    void loadSubmitApplicationCycle(submitForm.trainingPlanId || '', scope?.accreditationCycleId)
  }
}

function openSubmit() {
  openSubmitPrefill()
}

function applyAccreditationRoutePrefill() {
  const taskTypeRaw = route.query.taskType
  if (typeof taskTypeRaw !== 'string') {
    return
  }
  if (PORTFOLIO_AI_TASK_TYPE_SET.has(taskTypeRaw)) {
    void router.replace({
      name: 'PortfolioAiFourAssistants',
      query: { ...route.query },
    })
    return
  }
  const routeTaskTypeOption = auditTaskTypeOptions.find((option) => option.value === taskTypeRaw)
  if (!routeTaskTypeOption) {
    return
  }
  const routeTaskType = routeTaskTypeOption.value
  const programId = typeof route.query.programId === 'string' ? route.query.programId : undefined
  const trainingPlanId
    = typeof route.query.trainingPlanId === 'string' ? route.query.trainingPlanId : undefined
  const accreditationCycleId
    = typeof route.query.accreditationCycleId === 'string'
      ? route.query.accreditationCycleId
      : undefined
  if (programId) qualityStore.setProgram(programId)
  if (trainingPlanId) qualityStore.setTrainingPlan(trainingPlanId)
  query.taskType = routeTaskType
  query.trainingPlanId = trainingPlanId || qualityStore.currentTrainingPlanId || ''
  query.programId = programId || qualityStore.currentProgramId || ''
  if (
    route.query.openSubmit === '1'
    && submitTaskTypeOptions.some((option) => option.value === routeTaskType)
  ) {
    openSubmitPrefill(routeTaskType, { programId, trainingPlanId, accreditationCycleId })
  }
}

/** 从路由 query.taskId 深链打开 AI 任务详情抽屉。 */
async function applyRouteTaskDeepLink() {
  const taskId = typeof route.query.taskId === 'string' ? route.query.taskId.trim() : ''
  if (!taskId) {
    return
  }
  try {
    const task = await aiTaskApi.detail(taskId)
    if (PORTFOLIO_AI_TASK_TYPE_SET.has(task.taskType)) {
      void router.replace({
        name: 'PortfolioAiFourAssistants',
        query: { taskId },
      })
      return
    }
    await openDetail(task)
  } catch (error) {
    showUserError(error, '智能任务详情加载失败')
  }
}

function handleTrainingPlanChange(value: string | null) {
  submitForm.trainingPlanId = value ?? ''
  submitForm.reportId = ''
  if (submitForm.businessType === AiTaskBusinessTypeCode.REPORT) {
    submitForm.businessId = ''
  }
  if (submitForm.taskType === AiTaskTypeCode.PROGRAM_REPORT_GENERATE) {
    void loadSubmitApplicationCycle(submitForm.trainingPlanId || '')
  }
}

/** 专业自评报告只允许绑定当前在办申请周期，显示并提交明确周期 ID。 */
async function loadSubmitApplicationCycle(trainingPlanId: string, preferredCycleId?: string) {
  submitCycleOptions.value = []
  submitForm.accreditationCycleId = ''
  if (!trainingPlanId.trim()) return
  submitCycleLoading.value = true
  try {
    const cockpit = await accreditationApi.cockpit({ trainingPlanId: trainingPlanId.trim() })
    const applicationCycle = cockpit.applicationCycle
    if (!applicationCycle) {
      showFormValidationMessage('当前培养方案没有在办认证申请周期，不能生成认证自评报告')
      return
    }
    submitCycleOptions.value = [{
      value: applicationCycle.id,
      label: `在办申请 · ${applicationCycle.cycleName}`,
    }]
    submitForm.accreditationCycleId
      = preferredCycleId === applicationCycle.id ? preferredCycleId : applicationCycle.id
  } catch (error) {
    showUserError(error, '在办认证申请周期加载失败')
  } finally {
    submitCycleLoading.value = false
  }
}

function handleProgramChange(value: string | null) {
  submitForm.programId = value ?? ''
  submitForm.reportId = ''
  if (submitForm.businessType === AiTaskBusinessTypeCode.REPORT) {
    submitForm.businessId = ''
  }
}

function handleQualityCourseChange(value: string | null) {
  submitForm.qualityCourseId = value ?? ''
}

function handleReportChange(value: string | null) {
  submitForm.reportId = value ?? ''
}

function handleSubmitTaskTypeChange(value: SelectValue) {
  submitForm.businessId = ''
  submitForm.programId = qualityStore.currentProgramId || ''
  submitForm.trainingPlanId = qualityStore.currentTrainingPlanId || ''
  submitForm.accreditationCycleId = ''
  submitForm.qualityCourseId = ''
  submitForm.achievementResultId = ''
  submitForm.reportId = ''
  submitForm.fileNodeId = ''
  submitForm.question = ''
  materialFileName.value = undefined
  if (typeof value !== 'string' || Array.isArray(value)) {
    showFormValidationMessage('任务类型选择无效，请重新选择')
    return
  }
  const selectedOption = submitTaskTypeOptions.find((option) => option.value === value)
  if (!selectedOption) {
    showFormValidationMessage('任务类型选择无效，请重新选择')
    return
  }
  submitForm.taskType = selectedOption.value
  submitForm.businessType = taskBusinessTypeMap[submitForm.taskType]
  if (submitForm.taskType === AiTaskTypeCode.PROGRAM_REPORT_GENERATE) {
    void loadSubmitApplicationCycle(submitForm.trainingPlanId || '')
  } else {
    submitCycleOptions.value = []
  }
}

function handleSubmitBusinessObjectChange(value: string | null): void {
  submitForm.businessId = value ?? ''
}

function handleAchievementResultChange(value: string | null): void {
  submitForm.achievementResultId = value ?? ''
  if (submitForm.businessType === AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT) {
    submitForm.businessId = value ?? ''
  }
}

function syncBusinessObjectFromTrainingPlan(value: string | null): void {
  handleTrainingPlanChange(value)
  if (submitForm.businessType === AiTaskBusinessTypeCode.TRAINING_PLAN)
    submitForm.businessId = value ?? ''
}

function syncBusinessObjectFromQualityCourse(value: string | null): void {
  handleQualityCourseChange(value)
  if (submitForm.businessType === AiTaskBusinessTypeCode.QUALITY_COURSE)
    submitForm.businessId = value ?? ''
}

function syncBusinessObjectFromAchievementResult(value: string | null): void {
  handleAchievementResultChange(value)
  if (submitForm.businessType === AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT)
    submitForm.businessId = value ?? ''
}

function syncBusinessObjectFromReport(value: string | null): void {
  handleReportChange(value)
  if (submitForm.businessType === AiTaskBusinessTypeCode.REPORT) submitForm.businessId = value ?? ''
}

async function submitTask() {
  if (submitForm.taskType === AiTaskTypeCode.PROGRAM_REPORT_GENERATE) {
    await loadSubmitApplicationCycle(
      submitForm.trainingPlanId || '',
      submitForm.accreditationCycleId,
    )
  }
  if (!validateAiTaskSubmit(submitForm)) {
    showFormValidationMessage('请按所选智能能力补齐业务锚点后再提交')
    return
  }
  submitting.value = true
  try {
    const result = await aiTaskTriggerApi.submit({
      taskType: submitForm.taskType,
      businessType: submitForm.businessType,
      businessId: submitForm.businessId.trim(),
      programId: submitForm.programId?.trim() || undefined,
      trainingPlanId:
        submitForm.trainingPlanId?.trim() || qualityStore.currentTrainingPlanId || undefined,
      accreditationCycleId: submitForm.accreditationCycleId?.trim() || undefined,
      qualityCourseId: submitForm.qualityCourseId?.trim() || undefined,
      achievementResultId: submitForm.achievementResultId?.trim() || undefined,
      reportId: submitForm.reportId?.trim() || undefined,
      fileNodeId: submitForm.fileNodeId?.trim() || undefined,
      question: submitForm.question?.trim() || undefined,
    })
    void message.success('已提交智能任务，系统将按队列执行')
    submitVisible.value = false
    // 提交后对本页 ownership 启动详情轮询；列表由单一 list polling 刷新
    if (result.taskId) startPageOwnedPolling(result.taskId)
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function runNow(record: AiTaskVO) {
  void confirmAsync({
    title: '立即抢占并异步执行当前智能任务？',
    content: '仅待处理状态可立即入执行队列，仅限任务提交人对本人任务进行业务补救；接口立即返回，模型推理在后台完成。',
    type: 'info',
    onOk: async () => {
      const result = await aiTaskTriggerApi.runNow(record.id)
      void message.success('已抢占并进入异步执行')
      startPageOwnedPolling(result.taskId || record.id)
      await loadList()
    },
  })
}

function openResetProcessing(record: AiTaskVO) {
  if (record.status !== AiTaskStatusCode.PROCESSING) {
    void message.error('仅处理中任务允许运维重置')
    return
  }
  resetProcessingForm.id = record.id
  resetProcessingForm.handlingRemark = ''
  resetProcessingVisible.value = true
}

async function submitResetProcessing() {
  if (!resetProcessingForm.handlingRemark.trim()) {
    void message.error('运维重置必须填写处置备注')
    return
  }
  resetProcessingSubmitting.value = true
  try {
    await aiTaskTriggerApi.resetProcessing({
      id: resetProcessingForm.id,
      handlingRemark: resetProcessingForm.handlingRemark.trim(),
    })
    void message.success('已将卡住任务重置为待处理')
    resetProcessingVisible.value = false
    await loadList()
  } catch (error) {
    showUserError(error, '智能任务重置失败')
  } finally {
    resetProcessingSubmitting.value = false
  }
}

async function cancelTask(record: AiTaskVO) {
  const reason = await promptInputAsync({
    title: '取消智能任务？',
    placeholder: '请填写取消原因',
    required: true,
    okType: 'danger',
    emptyErrorMessage: '请填写取消原因',
  })
  if (!reason) return
  await aiTaskStore.cancelTask(record.id, reason)
  void message.success('已取消任务')
  await loadList()
}

function openManualHandle(record: AiTaskVO) {
  if (record.manualHandlingStatus == null) {
    void message.warning('该任务暂不支持人工处置，请刷新列表后重试')
    return
  }
  Object.assign(manualHandleForm, {
    id: record.id,
    manualHandlingStatus: record.manualHandlingStatus,
    manualHandlingRemark: record.manualHandlingRemark || '',
  })
  manualHandleVisible.value = true
}

async function submitManualHandle() {
  if (!manualHandleForm.id) return
  manualHandleSubmitting.value = true
  try {
    await aiTaskApi.manualHandle({
      id: manualHandleForm.id,
      manualHandlingStatus: manualHandleForm.manualHandlingStatus,
      manualHandlingRemark: manualHandleForm.manualHandlingRemark?.trim() || undefined,
    })
    void message.success('人工处置状态已更新')
    manualHandleVisible.value = false
    await loadList()
    if (detailRecord.value?.id === manualHandleForm.id) {
      detailRecord.value = await aiTaskApi.detail(manualHandleForm.id)
    }
  } finally {
    manualHandleSubmitting.value = false
  }
}

async function openDetail(record: AiTaskVO) {
  const openGeneration = ++detailOpenGeneration.value
  const taskId = record.id
  detailVisible.value = true
  detailLoading.value = true
  detailRecord.value = record
  detailResult.value = null
  detailResultLoadFailed.value = false
  // 非终态任务启动本页 ownership 详情轮询
  if (!isTerminalAiStatus(record.status)) {
    startPageOwnedPolling(taskId)
  }
  try {
    const result = await aiResultApi.getByTask(taskId)
    if (
      openGeneration !== detailOpenGeneration.value
      || detailRecord.value?.id !== taskId
    ) {
      return
    }
    detailResult.value = result
    detailResultLoadFailed.value = false
  } catch (error) {
    if (
      openGeneration !== detailOpenGeneration.value
      || detailRecord.value?.id !== taskId
    ) {
      return
    }
    detailResultLoadFailed.value = true
    detailResult.value = null
    showUserError(error, '智能任务结果加载失败')
  } finally {
    if (openGeneration === detailOpenGeneration.value) {
      detailLoading.value = false
    }
  }
}

function buildAiTaskActions(record: AiTaskVO): UiTableRowActionItem[] {
  // 行内仅 1 个 primary：立即执行 > 重置 > 人工处置
  const actions: UiTableRowActionItem[] = [{ key: 'detail', label: '详情' }]
  let primaryAssigned = false
  if (isTaskOwner(record) && record.status === AiTaskStatusCode.PENDING) {
    actions.push({ key: 'run-now', label: '立即执行', tone: 'primary' })
    primaryAssigned = true
  }
  if (isTaskOwner(record)
    && (record.status === AiTaskStatusCode.PENDING || record.status === AiTaskStatusCode.PROCESSING)) {
    actions.push({ key: 'cancel', label: '取消', tone: 'danger' })
  }
  if (isTaskOwner(record) && record.status === AiTaskStatusCode.PROCESSING) {
    actions.push(
      primaryAssigned
        ? { key: 'reset-processing', label: '重置为待处理' }
        : { key: 'reset-processing', label: '重置为待处理', tone: 'primary' },
    )
    primaryAssigned = true
  }
  if (isTaskOwner(record)) {
    actions.push(
      primaryAssigned
        ? { key: 'manual-handle', label: '人工处置' }
        : { key: 'manual-handle', label: '人工处置', tone: 'primary' },
    )
  }
  actions.push({ key: 'audit', label: '审计' })
  return actions
}

function handleAiTaskAction(key: string, record: AiTaskVO): void {
  switch (key) {
    case 'detail':
      void openDetail(record)
      break
    case 'run-now':
      void runNow(record)
      break
    case 'cancel':
      void cancelTask(record)
      break
    case 'reset-processing':
      openResetProcessing(record)
      break
    case 'manual-handle':
      openManualHandle(record)
      break
    case 'audit':
      void openAuditDrawer(record)
      break
  }
}

/** 判断任务是否已达终态（如果已终态，抽屉不需轮询） */
function isTerminalAiStatus(status: AiTaskStatusCode | undefined): boolean {
  return (
    status === AiTaskStatusCode.COMPLETED
    || status === AiTaskStatusCode.FAILED
    || status === AiTaskStatusCode.CANCELLED
  )
}

/**
 * 详情抽屉关闭时停止当前任务轮询，避免后台僵尸轮询。
 * 同时在抽屉打开期间同步 store 缓存过来的状态到 detailRecord，UI 能看到状态跳转。
 */
watch(detailVisible, (open) => {
  if (!open) {
    detailOpenGeneration.value += 1
    if (detailRecord.value?.id) {
      stopPageOwnedPolling(detailRecord.value.id)
    }
  }
})

// 同步轮询到达的最新状态到 detailRecord，让 UI 实时反映
watch(
  () => (detailRecord.value?.id ? aiTaskStore.getCached(detailRecord.value.id) : null),
  (cached) => {
    if (!cached || !detailRecord.value) return
    if (cached.id !== detailRecord.value.id) return
    // 仅在状态变化时赋值，避免不必要的引用改变
    if (
      cached.status !== detailRecord.value.status
      || cached.failurePhase !== detailRecord.value.failurePhase
      || cached.failureReason !== detailRecord.value.failureReason
      || cached.finishedTime !== detailRecord.value.finishedTime
    ) {
      const openGeneration = detailOpenGeneration.value
      const taskId = cached.id
      detailRecord.value = { ...detailRecord.value, ...cached }
      // 达到终态后重拉一次结果 + 快照，避免抽屉中“状态已成功但 result 为空”的错误
      if (isTerminalAiStatus(cached.status) && !detailResult.value && !detailResultLoadFailed.value) {
        void aiResultApi
          .getByTask(cached.id)
          .then((vo) => {
            if (
              openGeneration !== detailOpenGeneration.value
              || !detailVisible.value
              || detailRecord.value?.id !== taskId
            ) {
              return
            }
            detailResult.value = vo
            detailResultLoadFailed.value = false
          })
          .catch((error) => {
            if (
              openGeneration !== detailOpenGeneration.value
              || !detailVisible.value
              || detailRecord.value?.id !== taskId
            ) {
              return
            }
            detailResultLoadFailed.value = true
            showUserError(error, '智能任务结果加载失败')
          })
      }
    }
  },
)

// 页面卸载 / keep-alive 失活时释放本页持有的详情轮询 ownership
onDeactivated(() => {
  releasePageOwnedPolling()
})

onActivated(() => {
  if (
    detailVisible.value
    && detailRecord.value?.id
    && !isTerminalAiStatus(detailRecord.value.status)
  ) {
    startPageOwnedPolling(detailRecord.value.id)
  }
})

onBeforeUnmount(() => {
  releasePageOwnedPolling()
})

async function updateValidation(validation: AiOutputValidationCode) {
  if (!detailResult.value) return
  validationUpdating.value = true
  try {
    await aiResultApi.updateValidation({
      id: detailResult.value.id,
      outputValidation: validation,
      sensitiveCheckStatus: detailResult.value.sensitiveCheckStatus,
      sensitiveCheckDetail: detailResult.value.sensitiveCheckDetail,
    })
    detailResult.value.outputValidation = validation
    void message.success(`已更新校验状态为 ${validationLabel(validation)}`)
  } finally {
    validationUpdating.value = false
  }
}

function gotoMaskAudit(taskId: string) {
  router.push({ name: 'QualityAiMaskMapping', query: { aiTaskId: taskId } })
}

async function openAuditDrawer(record: AiTaskVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'AI_TASK',
      category: 'QUALITY',
      bizId: record.id,
    })
    auditEvents.value = page.list.map((log) => {
      return {
        id: log.id,
        operatorName: log.userDto.nickName,
        operationType: log.type,
        operationLabel: log.detail,
        time: log.createTime,
        targetType: log.module,
        targetId: log.bizId || undefined,
        reason: log.changeDetails || log.errorStack || undefined,
      }
    })
  } finally {
    auditLoading.value = false
  }
}

const taskResultItems = computed<TaskResultItem[]>(() => {
  return list.value
    .filter((t) => t.status === AiTaskStatusCode.FAILED || t.status === AiTaskStatusCode.PROCESSING)
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: `${aiTaskTypeLabel(t.taskType)} · ${aiTaskStatusLabel(t.status)}`,
      statusLabel: aiTaskStatusLabel(t.status),
      statusTone: t.status === AiTaskStatusCode.FAILED ? 'red' : 'blue',
      description: t.failurePhase ? '任务执行阶段异常' : undefined,
      time: t.startedTime || undefined,
      actions:
        t.status === AiTaskStatusCode.FAILED
          ? [{ key: 'detail', label: '查看详情' }]
          : [{ key: 'detail', label: '详情' }],
    }))
})

function handleTaskResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = list.value.find((t) => t.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') openDetail(record)
}

/* ========== 阶段轨与信号指标 ========== */

function buildAiTaskListQuery(): AiTaskQueryRequest {
  const selectedTaskType = query.taskType || undefined
  const obeTaskTypes: AiTaskTypeCode[] = selectedTaskType
    ? [selectedTaskType]
    : [...OBE_AI_TASK_TYPES]
  return {
    ...query,
    taskType: undefined,
    taskTypes: obeTaskTypes,
    status: query.status || undefined,
    businessType: query.businessType,
    businessId: query.businessId?.trim() || undefined,
    operatorUserId: query.operatorUserId?.trim() || undefined,
    programId: query.programId?.trim() || undefined,
    trainingPlanId: query.trainingPlanId?.trim() || qualityStore.currentTrainingPlanId || undefined,
    qualityCourseId: query.qualityCourseId?.trim() || undefined,
    achievementResultId: query.achievementResultId?.trim() || undefined,
    reportId: query.reportId?.trim() || undefined,
  }
}

function buildAiTaskStatusBuckets(
  counts: QualityStatusCountsResponse | null,
): Record<AiTaskStatusCode, number> {
  const buckets: Record<AiTaskStatusCode, number> = {
    [AiTaskStatusCode.NOT_STARTED]: 0,
    [AiTaskStatusCode.PENDING]: 0,
    [AiTaskStatusCode.PROCESSING]: 0,
    [AiTaskStatusCode.COMPLETED]: 0,
    [AiTaskStatusCode.FAILED]: 0,
    [AiTaskStatusCode.CANCELLED]: 0,
  }
  if (!counts) {
    return buckets
  }
  for (const row of counts.statusCounts) {
    buckets[row.status] = row.recordCount
  }
  return buckets
}

const statusBuckets = computed(() => buildAiTaskStatusBuckets(taskStatusCounts.value))

const statusSegmentOptions = computed(() => {
  const b = statusBuckets.value
  const total = taskStatusCounts.value?.totalCount
  const options: Array<{ label: string, value: string }> = [
    {
      label: total == null ? '全部' : `全部 ${total}`,
      value: STATUS_SEGMENT_ALL,
    },
  ]
  for (const option of statusOptions) {
    options.push({
      label: `${option.label} ${b[option.value]}`,
      value: option.value,
    })
  }
  return options
})

function handleStatusSegmentChange(value: string | number): void {
  const next = String(value)
  statusSegment.value = next
  query.status = next === STATUS_SEGMENT_ALL ? undefined : (next as AiTaskStatusCode)
  query.pageNum = 1
  void loadList()
}

const signals = computed<SignalMetric[]>(() => {
  if (!taskStatusCounts.value) {
    return []
  }
  const b = statusBuckets.value
  const totalCount = taskStatusCounts.value.totalCount
  return [
    {
      key: 'failed',
      label: '失败待处置',
      value: b.FAILED,
      tone: b.FAILED > 0 ? 'red' : 'gray',
    },
    {
      key: 'processing',
      label: '运行中',
      value: b.PROCESSING,
      tone: b.PROCESSING > 0 ? 'blue' : 'gray',
    },
    {
      key: 'pending',
      label: '待处理',
      value: b.PENDING,
      tone: b.PENDING > 0 ? 'orange' : 'gray',
    },
    { key: 'total', label: '任务总数', value: totalCount, tone: 'blue' },
  ]
})

onMounted(async () => {
  applyAccreditationRoutePrefill()
  await handleScopeChange()
  await applyRouteTaskDeepLink()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="AI 任务中心">
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="handleScopeChange">
            刷新
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <QualityPlanGateStrip v-if="planGateMode" :mode="planGateMode" class="ai-task__empty" />

    <template v-else>
      <UiSegmented
        v-model="statusSegment"
        :options="statusSegmentOptions"
        size="sm"
        class="ai-task__status-segment"
        @change="handleStatusSegmentChange"
      />
      <SignalBand :metrics="signals" variant="panel" compact class="ai-task__signals" />
      <UiEmpty
        v-if="listSyncFailed"
        size="sm"
        :title="listPollStopped ? '列表同步已暂停' : '列表同步失败'"
        :description="
          listPollStopped
            ? `连续失败 ${listPollFailCount} 次已停止轮询；最近成功 ${listSyncAt || '尚无'}`
            : `最近成功 ${listSyncAt || '尚无'}；已退避重试中`
        "
        class="ai-task__sync"
      />

      <TaskResultPanel
        v-if="taskResultItems.length > 0"
        title="待关注任务"
        :items="taskResultItems"
        class="ai-task__result-panel"
        @action="handleTaskResultAction"
      />

      <UiCard class="detail-table-card ai-task__table-card">
        <template #title>任务列表</template>
        <template #extra>
          <UiButton size="sm" variant="primary" @click="openSubmit">提交任务</UiButton>
        </template>

        <UiFilterBar
          variant="plain"
          v-model="filterModel"
          :fields="filterFields"
          show-labels
          @search="handleSearch"
          @reset="handleReset"
        >
          <template #field-businessType>
            <UiSelect
              size="sm"
              :model-value="query.businessType || undefined"
              placeholder="业务类型"
              style="width: 100%"
              allow-clear
              :options="businessTypeOptions"
              @change="handleQueryBusinessTypeChange"
            />
          </template>
          <template #field-businessId>
            <AchievementResultSelector
              v-if="query.businessType === AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT"
              :value="query.businessId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
            <CourseSelector
              v-else-if="query.businessType === AiTaskBusinessTypeCode.QUALITY_COURSE"
              :value="query.businessId || null"
              :training-plan-id="query.trainingPlanId || qualityStore.currentTrainingPlanId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
            <TrainingPlanSelector
              v-else-if="query.businessType === AiTaskBusinessTypeCode.TRAINING_PLAN"
              :value="query.businessId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
            <ReportSelector
              v-else-if="query.businessType === AiTaskBusinessTypeCode.REPORT"
              :value="query.businessId || null"
              :training-plan-id="query.trainingPlanId || qualityStore.currentTrainingPlanId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
            <IndirectFormSelector
              v-else-if="query.businessType === AiTaskBusinessTypeCode.INDIRECT_FORM"
              :value="query.businessId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
          </template>
          <template #field-operatorUserId>
            <TeacherSelector
              :value="query.operatorUserId || null"
              placeholder="操作人"
              :width="180"
              @change="handleQueryOperatorChange"
            />
          </template>
          <template #field-trainingPlanId>
            <TrainingPlanSelector
              :value="query.trainingPlanId || null"
              :placeholder="qualityStore.currentTrainingPlanId ? '当前培养方案' : '培养方案'"
              :width="180"
              @change="handleQueryTrainingPlanChange"
            />
          </template>
          <template #field-qualityCourseId>
            <CourseSelector
              :value="query.qualityCourseId || null"
              :training-plan-id="query.trainingPlanId || qualityStore.currentTrainingPlanId || null"
              placeholder="关联课程"
              :width="180"
              @change="handleQueryQualityCourseChange"
            />
          </template>
          <template #field-achievementResultId>
            <AchievementResultSelector
              :value="query.achievementResultId || null"
              :training-plan-id="query.trainingPlanId || qualityStore.currentTrainingPlanId || null"
              :quality-course-id="query.qualityCourseId || null"
              placeholder="达成结果"
              :width="180"
              @change="handleQueryAchievementResultChange"
            />
          </template>
          <template #field-reportId>
            <ReportSelector
              :value="query.reportId || null"
              :training-plan-id="query.trainingPlanId || qualityStore.currentTrainingPlanId || null"
              :quality-course-id="query.qualityCourseId || null"
              placeholder="质量报告"
              :width="180"
              @change="handleQueryReportChange"
            />
          </template>
        </UiFilterBar>

        <UiDataTable
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          :columns="columns"
          :data-source="list"
          :loading="loading"
          row-key="id"
          size="middle"
          :total="total"
          flat
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'taskType'">
              {{ aiTaskTypeLabel(record.taskType) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="aiTaskStatusColor(record.status)" size="sm">
                {{ aiTaskStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'businessType'">
              {{ aiTaskBusinessTypeLabel(record.businessType) }}
            </template>
            <template v-else-if="column.key === 'businessAnchor'">
              <div class="dp-space dp-space--vertical dp-space--tight">
                <UiTag v-if="record.businessId" tone="gray" size="sm">
                  {{ record.businessLabel }}
                </UiTag>
                <UiTag v-if="record.programId" tone="gray" size="sm">
                  {{ record.programName }}
                </UiTag>
                <UiTag v-if="record.trainingPlanId" tone="gray" size="sm">
                  {{ record.trainingPlanCode }} {{ record.trainingPlanName }}
                </UiTag>
                <UiTag v-if="record.qualityCourseId" tone="gray" size="sm">
                  {{ record.qualityCourseCode }} {{ record.qualityCourseName }}
                </UiTag>
                <UiTag v-if="record.achievementResultId" tone="gray" size="sm">
                  {{ record.achievementResultLabel }}
                </UiTag>
                <UiTag v-if="record.reportId" tone="gray" size="sm">
                  {{ record.reportTitle }}
                </UiTag>
              </div>
            </template>
            <template v-else-if="column.key === 'failurePhase'">
              <span :class="{ 'ai-task__error-text': record.status === AiTaskStatusCode.FAILED }">
                {{ record.failurePhase ? aiTaskFailurePhaseLabel(record.failurePhase) : '不适用' }}
              </span>
            </template>
            <template v-else-if="column.key === 'startedTime'">
              {{ record.startedTime || '未开始' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildAiTaskActions(record)"
                split
                @action="(key) => handleAiTaskAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiDrawer
        v-model:open="submitVisible"
        title="提交智能任务"
        :width="560"
        :confirm-loading="submitting"
        :hide-footer="false"
        ok-text="提交"
        :ok-button-props="{ disabled: submitDisabled }"
        @ok="submitTask"
      >
        <UiForm layout="vertical" :model="submitForm">
          <UiFormItem label="能力" required>
            <UiSelect
              size="sm"
              :model-value="submitForm.taskType"
              :options="submitTaskTypeOptions"
              @change="handleSubmitTaskTypeChange"
            />
          </UiFormItem>
          <UiFormItem label="业务类型">
            <UiSelect
              size="sm"
              :model-value="submitForm.businessType"
              disabled
              :options="businessTypeOptions"
            />
          </UiFormItem>
          <UiFormItem label="关联业务对象">
            <AchievementResultSelector
              v-if="submitForm.businessType === AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT"
              :value="submitForm.businessId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              :quality-course-id="submitForm.qualityCourseId || null"
              placeholder="选择达成度结果"
              @change="syncBusinessObjectFromAchievementResult"
            />
            <CourseSelector
              v-else-if="submitForm.businessType === AiTaskBusinessTypeCode.QUALITY_COURSE"
              :value="submitForm.businessId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              :program-id="submitForm.programId || null"
              placeholder="选择质量评价课程"
              @change="syncBusinessObjectFromQualityCourse"
            />
            <TrainingPlanSelector
              v-else-if="submitForm.businessType === AiTaskBusinessTypeCode.TRAINING_PLAN"
              :value="submitForm.businessId || null"
              :program-id="submitForm.programId || null"
              placeholder="选择培养方案"
              @change="syncBusinessObjectFromTrainingPlan"
            />
            <ReportSelector
              v-else-if="submitForm.businessType === AiTaskBusinessTypeCode.REPORT"
              :value="submitForm.businessId || null"
              :program-id="submitForm.programId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              :quality-course-id="submitForm.qualityCourseId || null"
              placeholder="选择质量报告"
              @change="syncBusinessObjectFromReport"
            />
            <IndirectFormSelector
              v-else-if="submitForm.businessType === AiTaskBusinessTypeCode.INDIRECT_FORM"
              :value="submitForm.businessId || null"
              :program-id="submitForm.programId || null"
              placeholder="选择间接评价问卷"
              @change="handleSubmitBusinessObjectChange"
            />
            <UiAlertStrip v-else tone="info" size="sm" dense inline :show-icon="false">
              <template #default>
                <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
                  <UiTag tone="blue" size="sm">未选择</UiTag>
                  <span>请选择分析对象后查看结果</span>
                </span>
              </template>
            </UiAlertStrip>
          </UiFormItem>
          <UiFormItem label="培养方案">
            <TrainingPlanSelector
              :value="submitForm.trainingPlanId || null"
              :placeholder="
                qualityStore.currentTrainingPlanId ? '默认使用当前选中培养方案' : '选择培养方案'
              "
              @change="handleTrainingPlanChange"
            />
          </UiFormItem>
          <UiFormItem
            v-if="submitForm.taskType === AiTaskTypeCode.PROGRAM_REPORT_GENERATE"
            label="认证申请周期"
            required
          >
            <UiSelect
              v-model="submitForm.accreditationCycleId"
              :options="submitCycleOptions"
              :loading="submitCycleLoading"
              disabled
              placeholder="请选择存在在办申请的培养方案"
            />
          </UiFormItem>
          <UiFormItem label="专业">
            <ProgramSelector
              :value="submitForm.programId || null"
              placeholder="选择专业（可选）"
              @change="handleProgramChange"
            />
          </UiFormItem>
          <UiFormItem label="质量评价课程">
            <CourseSelector
              :value="submitForm.qualityCourseId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              placeholder="选择质量评价课程（可选）"
              @change="syncBusinessObjectFromQualityCourse"
            />
          </UiFormItem>
          <UiFormItem label="达成度结果">
            <AchievementResultSelector
              :value="submitForm.achievementResultId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              :quality-course-id="submitForm.qualityCourseId || null"
              placeholder="选择达成度分析结果"
              @change="syncBusinessObjectFromAchievementResult"
            />
          </UiFormItem>
          <UiFormItem label="报告">
            <ReportSelector
              :value="submitForm.reportId || null"
              :program-id="submitForm.programId || null"
              :training-plan-id="submitForm.trainingPlanId || null"
              :accreditation-cycle-id="submitForm.taskType === AiTaskTypeCode.PROGRAM_REPORT_GENERATE
                ? submitForm.accreditationCycleId || null
                : null"
              :report-type="submitForm.taskType === AiTaskTypeCode.PROGRAM_REPORT_GENERATE
                ? ReportTypeCode.PROGRAM_QUALITY
                : submitForm.taskType === AiTaskTypeCode.COURSE_REPORT_GENERATE
                  ? ReportTypeCode.COURSE_ACHIEVEMENT
                  : undefined"
              placeholder="生成质量报告时可选择"
              @change="syncBusinessObjectFromReport"
            />
          </UiFormItem>
          <UiFormItem label="材料文件">
            <UiPlatformFileField
              v-model:file-node-id="submitForm.fileNodeId"
              v-model:file-name="materialFileName"
              :scene-key="submitMaterialSceneKey"
              :accept="submitMaterialAccept"
              button-text="上传材料"
            />
          </UiFormItem>
          <UiFormItem label="用户提问">
            <UiTextarea
              size="sm"
              v-model="submitForm.question"
              :rows="3"
              placeholder="材料问答必填，最长 1000 字符"
              :maxlength="1000"
              :show-count="true"
            />
          </UiFormItem>
        </UiForm>
      </UiDrawer>

      <UiDrawer
        v-model:open="resetProcessingVisible"
        title="运维重置 PROCESSING 任务"
        :width="480"
        :confirm-loading="resetProcessingSubmitting"
        :hide-footer="false"
        ok-text="确认重置"
        @ok="submitResetProcessing"
      >
        <UiAlertStrip
          tone="warning"
          title="仅任务提交人可执行。重置后任务回到待处理队列，备注会写入审计日志。"
          class="ai-task__reset-alert"
        />
        <UiForm layout="vertical" class="ai-task__reset-form">
          <UiFormItem label="处置备注" required>
            <UiTextarea
              size="sm"
              v-model="resetProcessingForm.handlingRemark"
              :rows="4"
              :maxlength="500"
              :show-count="true"
              placeholder="说明卡住原因与重置依据"
            />
          </UiFormItem>
        </UiForm>
      </UiDrawer>

      <UiDrawer
        v-model:open="manualHandleVisible"
        title="人工处置"
        :width="480"
        :confirm-loading="manualHandleSubmitting"
        :hide-footer="false"
        ok-text="保存"
        @ok="submitManualHandle"
      >
        <UiForm layout="vertical" :model="manualHandleForm">
          <UiFormItem label="处置状态" required>
            <UiSelect
              size="sm"
              v-model="manualHandleForm.manualHandlingStatus"
              :options="manualHandlingOptions"
            />
          </UiFormItem>
          <UiFormItem label="处置备注">
            <UiTextarea
              size="sm"
              v-model="manualHandleForm.manualHandlingRemark"
              :rows="4"
              :maxlength="500"
              :show-count="true"
            />
          </UiFormItem>
        </UiForm>
      </UiDrawer>

      <UiDrawer v-model:open="detailVisible" title="智能任务详情" :width="840" :hide-footer="true">
        <UiEmpty
          v-if="!detailRecord && !detailLoading"
          description="未加载到智能任务详情"
          size="sm"
        />
        <UiDescriptions v-if="detailRecord" :column="1" size="small" bordered>
          <UiDescriptionsItem label="能力">
            {{ aiTaskTypeLabel(detailRecord.taskType) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="状态">
            <UiTag :tone="aiTaskStatusColor(detailRecord.status)" size="sm">
              {{ aiTaskStatusLabel(detailRecord.status) }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="操作人">
            {{ detailRecord.operatorUserName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="业务类型">
            {{ aiTaskBusinessTypeLabel(detailRecord.businessType) }}
            <span v-if="detailRecord.businessId"> / {{ detailRecord.businessLabel }} </span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="业务归属">
            <div v-if="isSuperAdmin" class="dp-space dp-space--wrap dp-space--tight">
              <UiTag v-if="detailRecord.businessId" tone="gray" size="sm">
                {{ detailRecord.businessLabel }}
              </UiTag>
              <UiTag v-if="detailRecord.programId" tone="gray" size="sm">
                {{ detailRecord.programName }}
              </UiTag>
              <UiTag v-if="detailRecord.trainingPlanId" tone="gray" size="sm">
                {{ detailRecord.trainingPlanCode }} {{ detailRecord.trainingPlanName }}
              </UiTag>
              <UiTag v-if="detailRecord.qualityCourseId" tone="gray" size="sm">
                {{ detailRecord.qualityCourseCode }} {{ detailRecord.qualityCourseName }}
              </UiTag>
              <UiTag v-if="detailRecord.achievementResultId" tone="gray" size="sm">
                {{ detailRecord.achievementResultLabel }}
              </UiTag>
              <UiTag v-if="detailRecord.reportId" tone="gray" size="sm">
                {{ detailRecord.reportTitle }}
              </UiTag>
            </div>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="开始 / 结束">
            {{ detailRecord.startedTime || '未开始' }} ～
            {{
              detailRecord.finishedTime
                || (detailRecord.status === AiTaskStatusCode.PROCESSING ? '执行中' : '未结束')
            }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="失败阶段">
            <span
              :class="{ 'ai-task__error-text': detailRecord.status === AiTaskStatusCode.FAILED }"
            >
              {{
                detailRecord.failurePhase
                  ? aiTaskFailurePhaseLabel(detailRecord.failurePhase)
                  : '不适用'
              }}
            </span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="未完成说明">
            <span
              :class="{
                'ai-task__error-text': detailRecord.status === AiTaskStatusCode.FAILED,
                'ai-task__error-pre': Boolean(detailRecord.failureReason),
              }"
            >
              {{
                detailRecord.failureReason
                  ? getUserProcessFailureMessage(
                    detailRecord.failureReason,
                    '智能分析未完成，请在任务列表查看处理进度',
                  )
                  : '无未完成说明'
              }}
            </span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="运维干预状态 / 备注">
            {{ manualHandlingStatusLabel(detailRecord.manualHandlingStatus) }} /
            {{ detailRecord.manualHandlingRemark || '未填写运维备注' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="脱敏映射">
            <div class="dp-space dp-space--tight">
              <span>{{ detailRecord.maskMappingId ? '已生成脱敏映射' : '未生成脱敏映射' }}</span>
              <UiTextAction
                v-if="detailRecord.maskMappingId"
                @click="gotoMaskAudit(detailRecord.id)"
              >
                查看脱敏审计
              </UiTextAction>
            </div>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="智能结果">
            {{ detailRecord.resultId ? '已生成智能结果' : '尚未生成智能结果' }}
          </UiDescriptionsItem>
        </UiDescriptions>

        <UiDivider />

        <UiSectionTabs
          v-if="detailRecord"
          v-model="detailTabActive"
          :items="detailTabItems"
          compact
          divided
        />
        <template v-if="detailRecord && detailTabActive === 'result'">
          <UiEmpty
            v-if="detailResultLoadFailed"
            title="智能结果加载失败"
            description="切换任务或关闭再打开详情后将再次拉取；失败态不展示「尚无结果」"
            size="sm"
          />
          <UiEmpty
            v-else-if="!detailResult && !detailLoading"
            description="该任务尚无可用结果输出"
            size="sm"
          />
          <template v-else-if="detailResult">
            <UiDescriptions :column="2" size="small" bordered>
              <UiDescriptionsItem label="输出校验">
                <UiTag :tone="validationColor(detailResult.outputValidation)" size="sm">
                  {{ validationLabel(detailResult.outputValidation) }}
                </UiTag>
              </UiDescriptionsItem>
              <UiDescriptionsItem label="敏感检测">
                <UiTag
                  :tone="sensitiveCheckStatusColor(detailResult.sensitiveCheckStatus)"
                  size="sm"
                >
                  {{ sensitiveCheckStatusLabel(detailResult.sensitiveCheckStatus) }}
                </UiTag>
              </UiDescriptionsItem>
              <UiDescriptionsItem label="调用模型">
                {{ detailResult.modelName }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="生成时间">
                {{ detailResult.generatedTime }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="提示词用量">
                {{ detailResult.promptTokenCount }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="生成内容用量">
                {{ detailResult.completionTokenCount }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="敏感检测明细" :span="2">
                <ul v-if="sensitiveCheckLines.length" class="ai-task__list">
                  <li
                    v-for="(line, index) in sensitiveCheckLines"
                    :key="`sensitive-${index}`"
                    class="ai-task__list-item"
                  >
                    {{ line }}
                  </li>
                </ul>
                <span v-else>未生成敏感检测明细</span>
              </UiDescriptionsItem>
            </UiDescriptions>

            <UiDivider class="ai-task__divider" />

            <div class="dp-space dp-space--wrap dp-space--tight">
              <span class="ai-task__label">校验状态：</span>
              <template v-if="canValidateTaskResult">
                <UiButton
                  v-for="opt in validationOptions"
                  :key="opt.value"
                  :variant="
                    detailResult.outputValidation === opt.value
                      ? opt.value === AiOutputValidationCode.REJECTED
                        ? 'destructive'
                        : 'primary'
                      : opt.value === AiOutputValidationCode.REJECTED
                        ? 'ghost'
                        : 'outline'
                  "
                  :status="opt.value === AiOutputValidationCode.REJECTED ? 'danger' : 'normal'"
                  size="sm"
                  :loading="validationUpdating"
                  @click="updateValidation(opt.value)"
                >
                  {{ opt.label }}
                </UiButton>
              </template>
            </div>

            <UiDivider class="ai-task__divider" />

            <h4 class="ai-task__section-title">分析摘要</h4>
            <div v-if="resultSummaryLines.length" class="ai-task__text-block">
              <p
                v-for="(line, index) in resultSummaryLines"
                :key="`summary-${index}`"
                class="ai-task__paragraph"
              >
                {{ line }}
              </p>
            </div>
            <p v-else class="ai-task__placeholder">未生成分析摘要</p>

            <h4 class="ai-task__section-title">问题清单</h4>
            <ul v-if="issueItems.length" class="ai-task__list">
              <li
                v-for="(item, index) in issueItems"
                :key="`issue-${index}`"
                class="ai-task__list-item"
              >
                <strong>{{ item.issueTitle }}</strong>
                <span v-if="item.severity"> · {{ aiResultSeverityLabel(item.severity) }}</span>
                <p v-if="item.issueDescription" class="ai-task__paragraph">
                  {{ item.issueDescription }}
                </p>
              </li>
            </ul>
            <p v-else class="ai-task__placeholder">未生成问题清单</p>

            <h4 class="ai-task__section-title">证据引用</h4>
            <ul v-if="evidenceItems.length" class="ai-task__list">
              <li
                v-for="(item, index) in evidenceItems"
                :key="`evidence-${index}`"
                class="ai-task__list-item"
              >
                <strong>{{ item.evidenceTitle }}</strong>
                <span v-if="item.evidenceSource"> · {{ item.evidenceSource }}</span>
                <p class="ai-task__paragraph">{{ item.evidenceContent }}</p>
              </li>
            </ul>
            <p v-else class="ai-task__placeholder">未生成证据引用</p>

            <h4 class="ai-task__section-title">改进内容</h4>
            <ul v-if="improvementItems.length" class="ai-task__list">
              <li
                v-for="(item, index) in improvementItems"
                :key="`suggestion-${index}`"
                class="ai-task__list-item"
              >
                <strong>{{ item.suggestionTitle }}</strong>
                <span v-if="item.priority"> · {{ aiResultPriorityLabel(item.priority) }}</span>
                <p class="ai-task__paragraph">{{ item.suggestionContent }}</p>
              </li>
            </ul>
            <p v-else class="ai-task__placeholder">未生成改进内容</p>
          </template>
        </template>
      </UiDrawer>
    </template>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="智能任务操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-task {
  &__status-segment {
    margin-bottom: var(--dp-space-block);
  }

  &__signals {
    margin-bottom: var(--dp-space-component);
  }

  &__sync {
    margin-bottom: var(--dp-space-component);
  }

  &__result-panel {
    margin-bottom: var(--dp-space-block);
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: var(--dp-type-panel-title-size);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__filter {
    width: 130px;

    &--md {
      width: 180px;
    }

    &--xs {
      width: 110px;
    }
  }

  &__error-text {
    color: var(--dp-error);
  }

  &__error-pre {
    white-space: pre-wrap;
  }

  &__divider {
    margin: var(--dp-space-component) 0;
  }

  &__label {
    color: var(--dp-text-secondary);
  }

  &__section-title {
    margin: var(--dp-space-component) 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__collapse {
    margin-top: var(--dp-space-component);
  }

  &__text-block,
  &__prompt-card,
  &__list {
    background: var(--dp-gray-50);
    border: 1px solid var(--dp-border);
    border-radius: 6px;
    padding: var(--dp-space-component);
  }

  &__text-block {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  &__paragraph,
  &__placeholder {
    margin: 0;
    color: var(--dp-text-secondary);
    line-height: 1.7;
    word-break: break-word;
  }

  &__placeholder {
    padding: var(--dp-space-component);
    background: var(--dp-surface-subtle);
    border: 1px dashed var(--dp-border);
    border-radius: 6px;
  }

  &__list {
    margin: 0;
    padding-left: var(--dp-space-page);
  }

  &__list-item {
    color: var(--dp-text-secondary);
    line-height: 1.7;
    word-break: break-word;
  }

  &__prompt-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--dp-space-component);
    margin-top: var(--dp-space-component);
  }

  &__prompt-card {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  &__prompt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
  }

  &__prompt-state {
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__prompt-metrics {
    display: flex;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
  }

  &__material-upload {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__material-file {
    display: inline-flex;
    align-items: center;
    max-width: 360px;
    padding: var(--dp-space-component-xs) var(--dp-space-component-tight);
    color: var(--dp-text-secondary);
    background: var(--dp-surface-subtle);
    border: 1px solid var(--dp-border);
    border-radius: 6px;
  }

  &__material-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
