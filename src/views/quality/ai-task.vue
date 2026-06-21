<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import type { FileSystemNodeResponseDTO } from '@/apis/edu/file-management'
import type {
  AiResultPriority,
  AiResultSeverity,
  AiResultVO,
} from '@/apis/quality/ai-result'
/**
 * 质量评价 / AI 能力 - AI 任务与结果审计台
 *
 * 后端契约（AiTaskController + AiResultController）：
 * - 列表 AiTaskQueryRequest：按能力 / 状态 / 业务类型 / 业务 ID / 操作人 / 业务锚点筛选
 * - 提交 AiTaskSubmitRequest：按能力填必填项（ACHIEVEMENT_DIAGNOSIS -> achievementResultId；SYLLABUS_PARSE / TRAINING_PLAN_PARSE / MATERIAL_QA -> fileNodeId）
 * - 状态机 PENDING -> PROCESSING -> SUCCEEDED / FAILED / CANCELLED，失败可 /run-now重跑
 * - 结果 updateValidation 可调 PASSED / WARN / REJECTED
 */
import type {
  AiTaskManualHandleRequest,
  AiTaskQueryRequest,
  AiTaskVO,
} from '@/apis/quality/ai-task'
import type { AiTaskSubmitRequest } from '@/apis/quality/ai-task-trigger'
import type {
  AiManualHandlingStatus,
  AiOutputValidation,
  AiTaskBusinessType,
  AiTaskStatus,
  AiTaskType,
} from '@/apis/quality/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
  WorkbenchStageStatus,
} from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { uploadFile } from '@/apis/edu/file-management'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import { aiResultApi } from '@/apis/quality/ai-result'
import { aiTaskApi } from '@/apis/quality/ai-task'
import { aiTaskTriggerApi } from '@/apis/quality/ai-task-trigger'
import {
  AI_MANUAL_HANDLING_STATUS_LABEL,
  AI_OUTPUT_VALIDATION_COLOR,
  AI_OUTPUT_VALIDATION_LABEL,
  AI_TASK_BUSINESS_TYPE_LABEL,
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
} from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import {
  AchievementResultSelector,
  CourseSelector,
  IndirectFormSelector,
  ProgramSelector,
  ReportSelector,
  TeacherSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import {
  AuditTimelineDrawer,
  SignalBand,
  StageRail,
  StageWorkbenchShell,
  TaskResultPanel,
} from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopeReload } from '@/composables/useQualityPageScope'
import { useAuthStore } from '@/stores'
import { useAiTaskStore } from '@/stores/modules/aiTask'
import { useQualityStore } from '@/stores/modules/quality'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { RoleEnum } from '@/utils/permission'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const aiTaskStore = useAiTaskStore()
const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)

function aiTaskTypeLabel(value: AiTaskType): string {
  return strictEnumLabel(AI_TASK_TYPE_LABEL, value, 'AI 任务类型')
}

function aiTaskStatusLabel(value: AiTaskStatus): string {
  return strictEnumLabel(AI_TASK_STATUS_LABEL, value, 'AI 任务状态')
}

function aiTaskStatusColor(value: AiTaskStatus): BadgeTone {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, 'AI 任务状态')
}

function aiTaskBusinessTypeLabel(value: AiTaskBusinessType): string {
  return strictEnumLabel(AI_TASK_BUSINESS_TYPE_LABEL, value, 'AI 任务业务类型')
}

function validationLabel(value: AiOutputValidation): string {
  return strictEnumLabel(AI_OUTPUT_VALIDATION_LABEL, value, 'AI 输出校验状态')
}

function validationColor(value: AiOutputValidation): BadgeTone {
  return strictEnumTone(AI_OUTPUT_VALIDATION_COLOR, value, 'AI 输出校验状态')
}

function sensitiveCheckStatusLabel(value: string | undefined): string {
  if (!value) return '—'
  if (value === 'CLEAN') return '未发现敏感信息'
  return '需要人工复核'
}

function sensitiveCheckStatusColor(value: string | undefined): BadgeTone {
  if (!value) return 'gray'
  return value === 'CLEAN' ? 'green' : 'red'
}

function manualHandlingStatusLabel(value: AiManualHandlingStatus): string {
  return strictEnumLabel(AI_MANUAL_HANDLING_STATUS_LABEL, value, 'AI 人工处理状态')
}

function aiResultSeverityLabel(value: AiResultSeverity): string {
  if (value === 'HIGH') return '高影响'
  if (value === 'MEDIUM') return '中影响'
  if (value === 'LOW') return '低影响'
  return '—'
}

function aiResultPriorityLabel(value: AiResultPriority): string {
  if (value === 'HIGH') return '高优先级'
  if (value === 'MEDIUM') return '中优先级'
  if (value === 'LOW') return '低优先级'
  return '—'
}

const qualityStore = useQualityStore()
const listLoadError = ref<Error | null>(null)
const route = useRoute()
const router = useRouter()

const list = ref<AiTaskVO[]>([])
const total = ref(0)
const loading = ref(false)

const query = reactive<AiTaskQueryRequest>({
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

const submitVisible = ref(false)
const submitting = ref(false)
const uploadingMaterial = ref(false)
const uploadedMaterial = ref<FileSystemNodeResponseDTO | null>(null)
const submitForm = reactive<AiTaskSubmitRequest>({
  taskType: 'ACHIEVEMENT_DIAGNOSIS',
  businessType: 'ACHIEVEMENT_RESULT',
  businessId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
  fileNodeId: '',
  question: '',
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailLoadError = ref<Error | null>(null)
const detailRecord = ref<AiTaskVO | null>(null)
const detailResult = ref<AiResultVO | null>(null)
const validationUpdating = ref(false)
const manualHandleVisible = ref(false)
const manualHandleSubmitting = ref(false)
const manualHandleForm = reactive<AiTaskManualHandleRequest>({
  id: '',
  manualHandlingStatus: 'PENDING',
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

const taskTypeOptions: Array<{ value: AiTaskType, label: string }> = [
  { value: 'SYLLABUS_PARSE', label: AI_TASK_TYPE_LABEL.SYLLABUS_PARSE },
  { value: 'TRAINING_PLAN_PARSE', label: AI_TASK_TYPE_LABEL.TRAINING_PLAN_PARSE },
  { value: 'ACHIEVEMENT_DIAGNOSIS', label: AI_TASK_TYPE_LABEL.ACHIEVEMENT_DIAGNOSIS },
  { value: 'COURSE_REPORT_GENERATE', label: AI_TASK_TYPE_LABEL.COURSE_REPORT_GENERATE },
  { value: 'PROGRAM_REPORT_GENERATE', label: AI_TASK_TYPE_LABEL.PROGRAM_REPORT_GENERATE },
  {
    value: 'IMPROVEMENT_SUGGESTION_GENERATE',
    label: AI_TASK_TYPE_LABEL.IMPROVEMENT_SUGGESTION_GENERATE,
  },
  { value: 'MATERIAL_QA', label: AI_TASK_TYPE_LABEL.MATERIAL_QA },
  {
    value: 'INDIRECT_RESPONSE_DOC_PARSE',
    label: AI_TASK_TYPE_LABEL.INDIRECT_RESPONSE_DOC_PARSE,
  },
]
const statusOptions: Array<{ value: AiTaskStatus, label: string }> = [
  { value: 'PENDING', label: AI_TASK_STATUS_LABEL.PENDING },
  { value: 'PROCESSING', label: AI_TASK_STATUS_LABEL.PROCESSING },
  { value: 'SUCCEEDED', label: AI_TASK_STATUS_LABEL.SUCCEEDED },
  { value: 'FAILED', label: AI_TASK_STATUS_LABEL.FAILED },
  { value: 'CANCELLED', label: AI_TASK_STATUS_LABEL.CANCELLED },
]
const businessTypeOptions: { value: AiTaskBusinessType, label: string }[] = [
  { value: 'ACHIEVEMENT_RESULT', label: AI_TASK_BUSINESS_TYPE_LABEL.ACHIEVEMENT_RESULT },
  { value: 'QUALITY_COURSE', label: AI_TASK_BUSINESS_TYPE_LABEL.QUALITY_COURSE },
  { value: 'TRAINING_PLAN', label: AI_TASK_BUSINESS_TYPE_LABEL.TRAINING_PLAN },
  { value: 'REPORT', label: AI_TASK_BUSINESS_TYPE_LABEL.REPORT },
  { value: 'INDIRECT_FORM', label: AI_TASK_BUSINESS_TYPE_LABEL.INDIRECT_FORM },
]
const taskBusinessTypeMap: Record<AiTaskType, AiTaskBusinessType> = {
  ACHIEVEMENT_DIAGNOSIS: 'ACHIEVEMENT_RESULT',
  COURSE_REPORT_GENERATE: 'REPORT',
  IMPROVEMENT_SUGGESTION_GENERATE: 'ACHIEVEMENT_RESULT',
  INDIRECT_RESPONSE_DOC_PARSE: 'INDIRECT_FORM',
  MATERIAL_QA: 'QUALITY_COURSE',
  PROGRAM_REPORT_GENERATE: 'REPORT',
  SYLLABUS_PARSE: 'QUALITY_COURSE',
  TRAINING_PLAN_PARSE: 'TRAINING_PLAN',
}
const validationOptions: { value: AiOutputValidation, label: string, color: string }[] = [
  { value: 'PASSED', label: '通过（接受）', color: 'green' },
  { value: 'WARN', label: '警告（需人工审核）', color: 'orange' },
  { value: 'REJECTED', label: '退回（拒绝）', color: 'red' },
]
const manualHandlingOptions: { value: AiManualHandlingStatus, label: string }[] = [
  { value: 'NONE', label: AI_MANUAL_HANDLING_STATUS_LABEL.NONE },
  { value: 'PENDING', label: AI_MANUAL_HANDLING_STATUS_LABEL.PENDING },
  { value: 'IN_PROGRESS', label: AI_MANUAL_HANDLING_STATUS_LABEL.IN_PROGRESS },
  { value: 'RESOLVED', label: AI_MANUAL_HANDLING_STATUS_LABEL.RESOLVED },
  { value: 'IGNORED', label: AI_MANUAL_HANDLING_STATUS_LABEL.IGNORED },
]

const filterModel = computed<Record<string, unknown>>({
  get: () => query as Record<string, unknown>,
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
      options: taskTypeOptions,
    },
    {
      key: 'status',
      type: 'select',
      label: '状态',
      placeholder: '状态',
      allowClear: true,
      width: 130,
      options: statusOptions,
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
    case 'ACHIEVEMENT_DIAGNOSIS':
    case 'IMPROVEMENT_SUGGESTION_GENERATE':
      return (
        form.businessType === 'ACHIEVEMENT_RESULT'
        && !!form.achievementResultId?.trim()
        && businessId === form.achievementResultId.trim()
      )
    case 'COURSE_REPORT_GENERATE':
      return (
        form.businessType === 'REPORT'
        && !!form.qualityCourseId?.trim()
        && !!form.reportId?.trim()
        && businessId === form.reportId.trim()
      )
    case 'PROGRAM_REPORT_GENERATE':
      return (
        form.businessType === 'REPORT'
        && !!form.programId?.trim()
        && !!form.trainingPlanId?.trim()
        && !!form.reportId?.trim()
        && businessId === form.reportId.trim()
      )
    case 'SYLLABUS_PARSE':
      return (
        form.businessType === 'QUALITY_COURSE'
        && !!form.fileNodeId?.trim()
        && !!form.qualityCourseId?.trim()
        && businessId === form.qualityCourseId.trim()
      )
    case 'TRAINING_PLAN_PARSE':
      return (
        form.businessType === 'TRAINING_PLAN'
        && !!form.fileNodeId?.trim()
        && !!form.programId?.trim()
        && !!form.trainingPlanId?.trim()
        && businessId === form.trainingPlanId.trim()
      )
    case 'MATERIAL_QA':
      return (
        form.businessType === 'QUALITY_COURSE'
        && !!form.qualityCourseId?.trim()
        && businessId === form.qualityCourseId.trim()
        && !!form.fileNodeId?.trim()
        && !!form.question?.trim()
      )
    case 'INDIRECT_RESPONSE_DOC_PARSE':
      return form.businessType === 'INDIRECT_FORM' && !!form.fileNodeId?.trim()
    default:
      return false
  }
}

const submitDisabled = computed(() => !validateAiTaskSubmit(submitForm))

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
  loading.value = true
  listLoadError.value = null
  try {
    const page = await aiTaskApi.page({
      ...query,
      taskType: query.taskType || undefined,
      status: query.status || undefined,
      businessType: query.businessType,
      businessId: query.businessId?.trim() || undefined,
      operatorUserId: query.operatorUserId?.trim() || undefined,
      programId: query.programId?.trim() || undefined,
      trainingPlanId:
        query.trainingPlanId?.trim() || qualityStore.currentTrainingPlanId || undefined,
      qualityCourseId: query.qualityCourseId?.trim() || undefined,
      achievementResultId: query.achievementResultId?.trim() || undefined,
      reportId: query.reportId?.trim() || undefined,
    })
    list.value = readPageList(page, 'AI 任务加载失败，请稍后重试')
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = readPageTotal(page, 'AI 任务加载失败，请稍后重试')
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
      return
    }
    syncListPolling()
  } catch (error) {
    listLoadError.value = toUserError(error, 'AI 任务加载失败')
    showUserError(error, 'AI 任务加载失败')
  } finally {
    loading.value = false
  }
}

let listPollTimer: ReturnType<typeof setInterval> | null = null

function syncListPolling(): void {
  for (const record of list.value) {
    if (record.status === 'PENDING' || record.status === 'PROCESSING') {
      aiTaskStore.startPolling(record.id)
    }
  }
  const shouldPoll = list.value.some(
    (record) => record.status === 'PENDING' || record.status === 'PROCESSING',
  )
  if (shouldPoll && !listPollTimer) {
    listPollTimer = setInterval(() => {
      void loadListQuietly()
    }, 3000)
  } else if (!shouldPoll && listPollTimer) {
    clearInterval(listPollTimer)
    listPollTimer = null
  }
}

async function loadListQuietly(): Promise<void> {
  if (loading.value) {
    return
  }
  try {
    const page = await aiTaskApi.page({
      ...query,
      taskType: query.taskType || undefined,
      status: query.status || undefined,
      businessType: query.businessType,
      businessId: query.businessId?.trim() || undefined,
      operatorUserId: query.operatorUserId?.trim() || undefined,
      programId: query.programId?.trim() || undefined,
      trainingPlanId:
        query.trainingPlanId?.trim() || qualityStore.currentTrainingPlanId || undefined,
      qualityCourseId: query.qualityCourseId?.trim() || undefined,
      achievementResultId: query.achievementResultId?.trim() || undefined,
      reportId: query.reportId?.trim() || undefined,
    })
    list.value = readPageList(page, 'AI 任务加载失败，请稍后重试')
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = readPageTotal(page, 'AI 任务加载失败，请稍后重试')
    if (detailRecord.value?.id && detailVisible.value) {
      const updated = list.value.find((item) => item.id === detailRecord.value!.id)
      if (updated) {
        detailRecord.value = updated
      }
    }
    syncListPolling()
  } catch {
    // 轮询刷新失败时不打断当前页面操作
  }
}

async function handleScopeChange(): Promise<void> {
  listLoadError.value = null
  await loadList()
}

useQualityScopeReload(handleScopeChange)

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

const columns: ColumnsType = [
  { title: '能力', dataIndex: 'taskType', key: 'taskType', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 160 },
  { title: '业务归属', key: 'businessAnchor', width: 240 },
  { title: '失败阶段', dataIndex: 'failurePhase', key: 'failurePhase', width: 160 },
  { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', width: 160 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

function resetQuery() {
  query.pageNum = 1
  query.taskType = undefined
  query.status = undefined
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
    showUserError(null, '业务类型筛选无效，请重新选择')
    return
  }
  if (!businessTypeOptions.some((option) => option.value === value)) {
    showUserError(null, '业务类型筛选无效，请重新选择')
    return
  }
  query.businessType = value as AiTaskBusinessType
}

function handleQueryBusinessObjectChange(value: string | null): void {
  query.businessId = value ?? ''
}

function handleQueryOperatorChange(value: string | string[] | null): void {
  if (Array.isArray(value)) {
    showUserError(null, '操作人筛选只能单选，请重新选择')
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
  taskType?: AiTaskType,
  scope?: { programId?: string, trainingPlanId?: string },
) {
  const resolvedType
    = taskType && taskTypeOptions.some((o) => o.value === taskType)
      ? taskType
      : 'ACHIEVEMENT_DIAGNOSIS'
  Object.assign(submitForm, {
    taskType: resolvedType,
    businessType: taskBusinessTypeMap[resolvedType],
    businessId: '',
    programId: scope?.programId || qualityStore.currentProgramId || '',
    trainingPlanId: scope?.trainingPlanId || qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    achievementResultId: '',
    reportId: '',
    fileNodeId: '',
    question: '',
  })
  uploadedMaterial.value = null
  submitVisible.value = true
}

function openSubmit() {
  openSubmitPrefill()
}

function applyAccreditationRoutePrefill() {
  const taskTypeRaw = route.query.taskType
  if (typeof taskTypeRaw !== 'string' || !taskTypeOptions.some((o) => o.value === taskTypeRaw)) {
    return
  }
  const programId = typeof route.query.programId === 'string' ? route.query.programId : undefined
  const trainingPlanId
    = typeof route.query.trainingPlanId === 'string' ? route.query.trainingPlanId : undefined
  if (programId) qualityStore.setProgram(programId)
  if (trainingPlanId) qualityStore.setTrainingPlan(trainingPlanId)
  query.taskType = taskTypeRaw as AiTaskType
  query.trainingPlanId = trainingPlanId || qualityStore.currentTrainingPlanId || ''
  query.programId = programId || qualityStore.currentProgramId || ''
  if (route.query.openSubmit === '1') {
    openSubmitPrefill(taskTypeRaw as AiTaskType, { programId, trainingPlanId })
  }
}

function handleTrainingPlanChange(value: string | null) {
  submitForm.trainingPlanId = value ?? ''
}

function handleProgramChange(value: string | null) {
  submitForm.programId = value ?? ''
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
  submitForm.qualityCourseId = ''
  submitForm.achievementResultId = ''
  submitForm.reportId = ''
  submitForm.fileNodeId = ''
  submitForm.question = ''
  uploadedMaterial.value = null
  if (typeof value !== 'string' || Array.isArray(value)) {
    showUserError(null, '任务类型选择无效，请重新选择')
    return
  }
  if (!taskTypeOptions.some((option) => option.value === value)) {
    showUserError(null, '任务类型选择无效，请重新选择')
    return
  }
  submitForm.taskType = value as AiTaskType
  submitForm.businessType = taskBusinessTypeMap[submitForm.taskType]
}

function handleSubmitBusinessObjectChange(value: string | null): void {
  submitForm.businessId = value ?? ''
}

function handleAchievementResultChange(value: string | null): void {
  submitForm.achievementResultId = value ?? ''
  if (submitForm.businessType === 'ACHIEVEMENT_RESULT') {
    submitForm.businessId = value ?? ''
  }
}

function syncBusinessObjectFromTrainingPlan(value: string | null): void {
  handleTrainingPlanChange(value)
  if (submitForm.businessType === 'TRAINING_PLAN') submitForm.businessId = value ?? ''
}

function syncBusinessObjectFromQualityCourse(value: string | null): void {
  handleQualityCourseChange(value)
  if (submitForm.businessType === 'QUALITY_COURSE') submitForm.businessId = value ?? ''
}

function syncBusinessObjectFromAchievementResult(value: string | null): void {
  handleAchievementResultChange(value)
  if (submitForm.businessType === 'ACHIEVEMENT_RESULT') submitForm.businessId = value ?? ''
}

function syncBusinessObjectFromReport(value: string | null): void {
  handleReportChange(value)
  if (submitForm.businessType === 'REPORT') submitForm.businessId = value ?? ''
}

async function handleMaterialUpload(options: UploadRequestOption): Promise<void> {
  uploadingMaterial.value = true
  try {
    const { file } = options
    if (!(file instanceof File)) {
      message.error('无效的材料文件')
      options.onError?.(new Error('无效的材料文件'))
      return
    }
    const uploaded = await uploadFile(file, { businessType: 'QUALITY_AI_TASK_MATERIAL' })
    uploadedMaterial.value = uploaded
    submitForm.fileNodeId = uploaded.id
    message.success(`已上传材料：${uploaded.nodeName}`)
    options.onSuccess?.({})
  } catch (err) {
    options.onError?.(err instanceof Error ? err : new Error(String(err)))
  } finally {
    uploadingMaterial.value = false
  }
}

async function submitTask() {
  if (!validateAiTaskSubmit(submitForm)) {
    message.error('请按所选 AI 能力补齐业务锚点后再提交')
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
      qualityCourseId: submitForm.qualityCourseId?.trim() || undefined,
      achievementResultId: submitForm.achievementResultId?.trim() || undefined,
      reportId: submitForm.reportId?.trim() || undefined,
      fileNodeId: submitForm.fileNodeId?.trim() || undefined,
      question: submitForm.question?.trim() || undefined,
    })
    message.success('已提交 AI 任务，系统将按队列执行')
    submitVisible.value = false
    // 提交后启动轮询：任务达到终态后自动停止，其他页面能同步看到状态跳转
    if (result.taskId) aiTaskStore.startPolling(result.taskId)
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function runNow(record: AiTaskVO) {
  void confirmAsync({
    title: '立即同步执行当前 AI 任务？',
    content: '仅待处理状态可立即执行，常用于演示 / 运维场景。',
    type: 'info',
    onOk: async () => {
      await aiTaskTriggerApi.runNow(record.id)
      message.success('已触发同步执行')
      aiTaskStore.startPolling(record.id)
      await loadList()
    },
  })
}

function openResetProcessing(record: AiTaskVO) {
  if (record.status !== 'PROCESSING') {
    message.error('仅处理中任务允许运维重置')
    return
  }
  resetProcessingForm.id = record.id
  resetProcessingForm.handlingRemark = ''
  resetProcessingVisible.value = true
}

async function submitResetProcessing() {
  if (!resetProcessingForm.handlingRemark.trim()) {
    message.error('运维重置必须填写处置备注')
    return
  }
  resetProcessingSubmitting.value = true
  try {
    await aiTaskTriggerApi.resetProcessing({
      id: resetProcessingForm.id,
      handlingRemark: resetProcessingForm.handlingRemark.trim(),
    })
    message.success('已将卡住任务重置为待处理')
    resetProcessingVisible.value = false
    await loadList()
  } catch (error) {
    showUserError(error)
  } finally {
    resetProcessingSubmitting.value = false
  }
}

async function cancelTask(record: AiTaskVO) {
  void confirmAsync({
    title: '取消当前 AI 任务？',
    content: '只有待处理或处理中状态可取消，已成功或已失败的任务不可取消。',
    type: 'warning',
    onOk: async () => {
      await aiTaskStore.cancelTask(record.id)
      message.success('已取消任务')
      await loadList()
    },
  })
}

function openManualHandle(record: AiTaskVO) {
  if (record.manualHandlingStatus == null) {
    message.warning('该任务暂不支持人工处置，请刷新列表后重试')
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
    message.success('人工处置状态已更新')
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
  detailVisible.value = true
  detailLoading.value = true
  detailLoadError.value = null
  detailRecord.value = record
  detailResult.value = null
  // 非终态任务启动轮询，让抽屉实时反映 PROCESSING/SUCCEEDED/FAILED 状态变化
  if (!isTerminalAiStatus(record.status)) {
    aiTaskStore.startPolling(record.id)
  }
  try {
    detailResult.value = await aiResultApi.getByTask(record.id)
  } catch (error) {
    detailLoadError.value = toUserError(error, 'AI 任务详情加载失败')
    showUserError(error, 'AI 任务详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

/** 判断任务是否已达终态（如果已终态，抽屉不需轮询） */
function isTerminalAiStatus(status: AiTaskStatus | undefined): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED'
}

/**
 * 详情抽屉关闭时停止当前任务轮询，避免后台僵尸轮询。
 * 同时在抽屉打开期间同步 store 缓存过来的状态到 detailRecord，UI 能看到状态跳转。
 */
watch(detailVisible, (open) => {
  if (!open && detailRecord.value?.id) {
    aiTaskStore.stopPolling(detailRecord.value.id)
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
      || cached.finishedAt !== detailRecord.value.finishedAt
    ) {
      detailRecord.value = { ...detailRecord.value, ...cached }
      // 达到终态后重拉一次结果 + 快照，避免抽屉中“状态已成功但 result 为空”的错误
      if (isTerminalAiStatus(cached.status) && !detailResult.value) {
        void aiResultApi
          .getByTask(cached.id)
          .then((vo) => {
            if (detailVisible.value && detailRecord.value?.id === cached.id) {
              detailResult.value = vo
            }
          })
          .catch((error) => {
            detailLoadError.value = toUserError(error, 'AI 任务详情加载失败')
            showUserError(error, 'AI 任务详情加载失败')
          })
      }
    }
  },
)

// 页面卸载时保险地停掉详情轮询与列表轮询
onBeforeUnmount(() => {
  if (detailRecord.value?.id) {
    aiTaskStore.stopPolling(detailRecord.value.id)
  }
  if (listPollTimer) {
    clearInterval(listPollTimer)
    listPollTimer = null
  }
})

async function updateValidation(validation: AiOutputValidation) {
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
    message.success(`已更新校验状态为 ${validationLabel(validation)}`)
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
    auditEvents.value = readPageList(page, 'AI 任务审计记录加载失败，请稍后重试').map((log) => {
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
    .filter((t) => t.status === 'FAILED' || t.status === 'PROCESSING')
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: `${aiTaskTypeLabel(t.taskType)} · ${aiTaskStatusLabel(t.status)}`,
      statusLabel: aiTaskStatusLabel(t.status),
      statusTone: t.status === 'FAILED' ? 'red' : 'blue',
      description: t.failurePhase ? '任务执行阶段异常' : undefined,
      time: t.startedAt || undefined,
      actions:
        t.status === 'FAILED'
          ? [{ key: 'detail', label: '查看详情' }]
          : [{ key: 'detail', label: '详情' }],
    }))
})

function handleTaskResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = list.value.find((t) => t.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') openDetail(record)
}

/* ========== 阶段轨与信号指标 ========== */

const statusBuckets = computed(() => {
  const buckets: Record<AiTaskStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
    CANCELLED: 0,
  }
  for (const item of list.value) {
    buckets[item.status] += 1
  }
  return buckets
})

const stages = computed<WorkbenchStage[]>(() => {
  const b = statusBuckets.value
  const order: Array<{ key: AiTaskStatus, title: string, completed?: boolean }> = [
    { key: 'PENDING', title: '待处理' },
    { key: 'PROCESSING', title: '运行中' },
    { key: 'SUCCEEDED', title: '成功', completed: true },
    { key: 'FAILED', title: '失败' },
    { key: 'CANCELLED', title: '取消' },
  ]
  return order.map((stage) => {
    const count = b[stage.key]
    let status: WorkbenchStageStatus = 'pending'
    if (stage.key === 'FAILED' && count > 0) status = 'error'
    else if (stage.completed && count > 0) status = 'completed'
    else if (count > 0) status = 'active'
    return {
      key: stage.key,
      title: stage.title,
      status,
      statusText: `${count} 条`,
    }
  })
})

const signals = computed<SignalMetric[]>(() => {
  const b = statusBuckets.value
  return [
    { key: 'total', label: '本页任务', value: list.value.length, tone: 'blue' },
    { key: 'pending', label: '待处理', value: b.PENDING, tone: b.PENDING > 0 ? 'orange' : 'gray' },
    {
      key: 'processing',
      label: '运行中',
      value: b.PROCESSING,
      tone: b.PROCESSING > 0 ? 'blue' : 'gray',
    },
    {
      key: 'succeeded',
      label: '成功',
      value: b.SUCCEEDED,
      tone: b.SUCCEEDED > 0 ? 'green' : 'gray',
    },
    { key: 'failed', label: '失败', value: b.FAILED, tone: b.FAILED > 0 ? 'red' : 'gray' },
    { key: 'canceled', label: '取消', value: b.CANCELLED, tone: b.CANCELLED > 0 ? 'gray' : 'gray' },
    { key: 'overall', label: '总任务', value: total.value, tone: 'gray' },
  ]
})


watch(
  () => qualityStore.currentTrainingPlanId,
  () => loadList(),
)

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length)
      qualityStore.setTrainingPlan(qualityStore.trainingPlanOptions[0].id)
  }
  applyAccreditationRoutePrefill()
  await loadList()
})

onActivated(async () => {
  if (qualityStore.currentTrainingPlanId) {
    await loadList()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="handleScopeChange">
            刷新
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <UiEmpty
      v-if="!qualityStore.currentTrainingPlanId"
      description="请选择培养方案"
      class="ai-task__empty"
    />

    <template v-else>
      <StageRail :stages="stages" compact class="ai-task__stages" />
      <SignalBand :metrics="signals" compact class="ai-task__signals" />

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
          <UiButton size="sm" @click="openSubmit">提交任务</UiButton>
        </template>

        <UiFilterBar
          v-model="filterModel"
          :fields="filterFields"
          show-labels
          @search="handleSearch"
          @reset="handleReset"
        >
          <template #field-businessType>
            <a-select
              :value="query.businessType || undefined"
              placeholder="业务类型"
              style="width: 100%"
              allow-clear
              :options="businessTypeOptions"
              @change="handleQueryBusinessTypeChange"
            />
          </template>
          <template #field-businessId>
            <AchievementResultSelector
              v-if="query.businessType === 'ACHIEVEMENT_RESULT'"
              :value="query.businessId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
            <CourseSelector
              v-else-if="query.businessType === 'QUALITY_COURSE'"
              :value="query.businessId || null"
              :training-plan-id="query.trainingPlanId || qualityStore.currentTrainingPlanId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
            <TrainingPlanSelector
              v-else-if="query.businessType === 'TRAINING_PLAN'"
              :value="query.businessId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
            <ReportSelector
              v-else-if="query.businessType === 'REPORT'"
              :value="query.businessId || null"
              :training-plan-id="query.trainingPlanId || qualityStore.currentTrainingPlanId || null"
              placeholder="业务对象"
              :width="180"
              @change="handleQueryBusinessObjectChange"
            />
            <IndirectFormSelector
              v-else-if="query.businessType === 'INDIRECT_FORM'"
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
          class="student-detail-table__data-table"
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
              <a-space direction="vertical" size="small">
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
              </a-space>
            </template>
            <template v-else-if="column.key === 'failurePhase'">
              <span :class="{ 'ai-task__error-text': record.status === 'FAILED' }">
                {{ record.failurePhase || '不适用' }}
              </span>
            </template>
            <template v-else-if="column.key === 'startedAt'">
              {{ record.startedAt || '未开始' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <UiTextAction @click="openDetail(record)">详情</UiTextAction>
                <UiTextAction
                  v-if="record.status === 'PENDING'"
                  tone="primary"
                  @click="runNow(record)"
                >
                  立即执行
                </UiTextAction>
                <UiTextAction
                  v-if="record.status === 'PENDING' || record.status === 'PROCESSING'"
                  tone="danger"
                  @click="cancelTask(record)"
                >
                  取消
                </UiTextAction>
                <UiTextAction
                  v-if="isSuperAdmin && record.status === 'PROCESSING'"
                  tone="primary"
                  @click="openResetProcessing(record)"
                >
                  重置为待处理
                </UiTextAction>
                <UiTextAction tone="primary" @click="openManualHandle(record)">
                  人工处置
                </UiTextAction>
                <UiTextAction @click="openAuditDrawer(record)">审计</UiTextAction>
              </div>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiDrawer
        v-model:open="submitVisible"
        title="提交 AI 任务"
        :width="560"
        :confirm-loading="submitting"
        :hide-footer="false"
        ok-text="提交"
        :ok-button-props="{ disabled: submitDisabled }"
        @ok="submitTask"
      >
        <a-form layout="vertical" :model="submitForm">
          <a-form-item label="能力" required>
            <a-select
              :value="submitForm.taskType"
              :options="taskTypeOptions"
              @change="handleSubmitTaskTypeChange"
            />
          </a-form-item>
          <a-form-item label="业务类型">
            <a-select :value="submitForm.businessType" disabled :options="businessTypeOptions" />
          </a-form-item>
          <a-form-item label="关联业务对象">
            <AchievementResultSelector
              v-if="submitForm.businessType === 'ACHIEVEMENT_RESULT'"
              :value="submitForm.businessId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              :quality-course-id="submitForm.qualityCourseId || null"
              placeholder="选择达成度结果"
              @change="syncBusinessObjectFromAchievementResult"
            />
            <CourseSelector
              v-else-if="submitForm.businessType === 'QUALITY_COURSE'"
              :value="submitForm.businessId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              :program-id="submitForm.programId || null"
              placeholder="选择质量评价课程"
              @change="syncBusinessObjectFromQualityCourse"
            />
            <TrainingPlanSelector
              v-else-if="submitForm.businessType === 'TRAINING_PLAN'"
              :value="submitForm.businessId || null"
              :program-id="submitForm.programId || null"
              placeholder="选择培养方案"
              @change="syncBusinessObjectFromTrainingPlan"
            />
            <ReportSelector
              v-else-if="submitForm.businessType === 'REPORT'"
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
              v-else-if="submitForm.businessType === 'INDIRECT_FORM'"
              :value="submitForm.businessId || null"
              :program-id="submitForm.programId || null"
              placeholder="选择间接评价问卷"
              @change="handleSubmitBusinessObjectChange"
            />
            <UiEmpty v-else description="请选择" size="sm" />
          </a-form-item>
          <a-form-item label="培养方案">
            <TrainingPlanSelector
              :value="submitForm.trainingPlanId || null"
              :placeholder="
                qualityStore.currentTrainingPlanId ? '默认使用当前选中培养方案' : '选择培养方案'
              "
              @change="handleTrainingPlanChange"
            />
          </a-form-item>
          <a-form-item label="专业">
            <ProgramSelector
              :value="submitForm.programId || null"
              placeholder="选择专业（可选）"
              @change="handleProgramChange"
            />
          </a-form-item>
          <a-form-item label="质量评价课程">
            <CourseSelector
              :value="submitForm.qualityCourseId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              placeholder="选择质量评价课程（可选）"
              @change="syncBusinessObjectFromQualityCourse"
            />
          </a-form-item>
          <a-form-item label="达成度结果">
            <AchievementResultSelector
              :value="submitForm.achievementResultId || null"
              :training-plan-id="
                submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
              "
              :quality-course-id="submitForm.qualityCourseId || null"
              placeholder="选择达成度分析结果"
              @change="syncBusinessObjectFromAchievementResult"
            />
          </a-form-item>
          <a-form-item label="报告">
            <ReportSelector
              :value="submitForm.reportId || null"
              placeholder="生成质量报告时可选择"
              @change="syncBusinessObjectFromReport"
            />
          </a-form-item>
          <a-form-item label="材料文件">
            <div class="ai-task__material-upload">
              <a-upload
                :custom-request="handleMaterialUpload"
                :show-upload-list="false"
                accept=".doc,.docx,.pdf,.xls,.xlsx,.txt,.md"
              >
                <UiButton variant="outline" size="sm" :loading="uploadingMaterial">
                  {{ uploadedMaterial ? '重新上传材料' : '上传材料' }}
                </UiButton>
              </a-upload>
              <div v-if="uploadedMaterial" class="ai-task__material-file">
                <span class="ai-task__material-name">{{ uploadedMaterial.nodeName }}</span>
              </div>
            </div>
          </a-form-item>
          <a-form-item label="用户提问">
            <a-textarea
              v-model:value="submitForm.question"
              :rows="3"
              placeholder="材料问答必填，最长 1000 字符"
              :maxlength="1000"
              show-count
            />
          </a-form-item>
        </a-form>
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
        <a-alert
          type="warning"
          show-icon
          message="仅平台超级管理员可执行。重置后任务回到待处理队列，备注会写入审计日志。"
          class="ai-task__reset-alert"
        />
        <a-form layout="vertical" class="ai-task__reset-form">
          <a-form-item label="处置备注" required>
            <a-textarea
              v-model:value="resetProcessingForm.handlingRemark"
              :rows="4"
              :maxlength="500"
              show-count
              placeholder="说明卡住原因与重置依据"
            />
          </a-form-item>
        </a-form>
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
        <a-form layout="vertical" :model="manualHandleForm">
          <a-form-item label="处置状态" required>
            <a-select
              v-model:value="manualHandleForm.manualHandlingStatus"
              :options="manualHandlingOptions"
            />
          </a-form-item>
          <a-form-item label="处置备注">
            <a-textarea
              v-model:value="manualHandleForm.manualHandlingRemark"
              :rows="4"
              :maxlength="500"
              show-count
            />
          </a-form-item>
        </a-form>
      </UiDrawer>

      <UiDrawer v-model:open="detailVisible" title="AI 任务详情" :width="840" :hide-footer="true">
        <UiEmpty v-if="!detailRecord && !detailLoading" description="暂无数据" size="sm" />
        <a-alert
          v-if="detailLoadError"
          type="error"
          show-icon
          :message="detailLoadError.message"
          class="ai-task__detail-error"
        />
        <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
          <a-descriptions-item label="能力">
            {{ aiTaskTypeLabel(detailRecord.taskType) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <UiTag :tone="aiTaskStatusColor(detailRecord.status)" size="sm">
              {{ aiTaskStatusLabel(detailRecord.status) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="操作人">
            {{ detailRecord.operatorUserName }}
          </a-descriptions-item>
          <a-descriptions-item label="业务类型">
            {{ aiTaskBusinessTypeLabel(detailRecord.businessType) }}
            <span v-if="detailRecord.businessId"> / {{ detailRecord.businessLabel }} </span>
          </a-descriptions-item>
          <a-descriptions-item label="业务归属">
            <a-space wrap>
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
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="开始 / 结束">
            {{ detailRecord.startedAt || '未开始' }} ～
            {{
              detailRecord.finishedAt || (detailRecord.status === 'PROCESSING' ? '执行中' : '未结束')
            }}
          </a-descriptions-item>
          <a-descriptions-item label="失败阶段">
            <span :class="{ 'ai-task__error-text': detailRecord.status === 'FAILED' }">
              {{ detailRecord.failurePhase || '不适用' }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="未完成说明">
            <span
              :class="{
                'ai-task__error-text': detailRecord.status === 'FAILED',
                'ai-task__error-pre': Boolean(detailRecord.failureReason),
              }"
            >
              {{
                detailRecord.failureReason
                  ? getUserProcessFailureMessage(
                    detailRecord.failureReason,
                    'AI 分析未完成，请稍后重试或联系管理员查看任务处理情况',
                  )
                  : '无未完成说明'
              }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="运维干预状态 / 备注">
            {{ manualHandlingStatusLabel(detailRecord.manualHandlingStatus) }} /
            {{ detailRecord.manualHandlingRemark || '未填写运维备注' }}
          </a-descriptions-item>
          <a-descriptions-item label="脱敏映射">
            <a-space>
              <span>{{ detailRecord.maskMappingId ? '已生成脱敏映射' : '未生成脱敏映射' }}</span>
              <UiTextAction v-if="detailRecord.maskMappingId" @click="gotoMaskAudit(detailRecord.id)">
                查看脱敏审计
              </UiTextAction>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="AI 结果">
            {{ detailRecord.resultId ? '已生成 AI 结果' : '尚未生成 AI 结果' }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <a-tabs v-if="detailRecord" default-active-key="result">
          <a-tab-pane key="result" tab="AI 结果">
            <UiEmpty v-if="!detailResult" description="暂无数据" size="sm" />
            <template v-else>
              <a-descriptions :column="2" size="small" bordered>
                <a-descriptions-item label="输出校验">
                  <UiTag :tone="validationColor(detailResult.outputValidation)" size="sm">
                    {{ validationLabel(detailResult.outputValidation) }}
                  </UiTag>
                </a-descriptions-item>
                <a-descriptions-item label="敏感检测">
                  <UiTag :tone="sensitiveCheckStatusColor(detailResult.sensitiveCheckStatus)" size="sm">
                    {{ sensitiveCheckStatusLabel(detailResult.sensitiveCheckStatus) }}
                  </UiTag>
                </a-descriptions-item>
                <a-descriptions-item label="调用模型">
                  {{ detailResult.modelName }}
                </a-descriptions-item>
                <a-descriptions-item label="生成时间">
                  {{ detailResult.generatedAt }}
                </a-descriptions-item>
                <a-descriptions-item label="提示词用量">
                  {{ detailResult.promptTokenCount }}
                </a-descriptions-item>
                <a-descriptions-item label="生成内容用量">
                  {{ detailResult.completionTokenCount }}
                </a-descriptions-item>
                <a-descriptions-item label="敏感检测明细" :span="2">
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
                </a-descriptions-item>
              </a-descriptions>

              <a-divider class="ai-task__divider" />

              <a-space wrap>
                <span class="ai-task__label">校验状态：</span>
                <UiButton
                  v-for="opt in validationOptions"
                  :key="opt.value"
                  :variant="
                    detailResult.outputValidation === opt.value
                      ? opt.value === 'REJECTED'
                        ? 'destructive'
                        : 'primary'
                      : opt.value === 'REJECTED'
                        ? 'ghost'
                        : 'outline'
                  "
                  :status="opt.value === 'REJECTED' ? 'danger' : 'normal'"
                  size="sm"
                  :loading="validationUpdating"
                  @click="updateValidation(opt.value)"
                >
                  {{ opt.label }}
                </UiButton>
              </a-space>

              <a-divider class="ai-task__divider" />

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
          </a-tab-pane>
        </a-tabs>
      </UiDrawer>
    </template>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="AI 任务操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-task {
  &__stages {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__result-panel {
    margin-bottom: 16px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
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
    color: var(--ant-color-error, #dc2626);
  }

  &__error-pre {
    white-space: pre-wrap;
  }

  &__divider {
    margin: 12px 0;
  }

  &__label {
    color: var(--dp-text-secondary, #475569);
  }

  &__section-title {
    margin: 12px 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__collapse {
    margin-top: 12px;
  }

  &__text-block,
  &__prompt-card,
  &__list {
    background: var(--dp-gray-50, #f6f8fa);
    border: 1px solid var(--dp-border, #e1e4e8);
    border-radius: 6px;
    padding: 10px 12px;
  }

  &__text-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__paragraph,
  &__placeholder {
    margin: 0;
    color: var(--dp-text-secondary, #475569);
    line-height: 1.7;
    word-break: break-word;
  }

  &__placeholder {
    padding: 10px 12px;
    background: var(--dp-surface-subtle, #f8fafc);
    border: 1px dashed var(--dp-border, #e2e8f0);
    border-radius: 6px;
  }

  &__list {
    margin: 0;
    padding-left: 28px;
  }

  &__list-item {
    color: var(--dp-text-secondary, #475569);
    line-height: 1.7;
    word-break: break-word;
  }

  &__prompt-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  &__prompt-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__prompt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__prompt-state {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__prompt-metrics {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
  }

  &__material-upload {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__material-file {
    display: inline-flex;
    align-items: center;
    max-width: 360px;
    padding: 4px 8px;
    color: var(--dp-text-secondary, #475569);
    background: var(--dp-surface-subtle, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 6px;
  }

  &__material-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
