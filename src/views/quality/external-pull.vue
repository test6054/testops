<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ExternalDataSourceSaveRequest,
  ExternalDataSourceVO,
  ExternalSourceFieldScopeRequest,
  ExternalSourceFieldScopeVO,
} from '@/apis/quality/external-data-source'
import type { ExternalPullAuditVO } from '@/apis/quality/external-pull-audit'
import type { ExternalPullResultVO } from '@/apis/quality/external-pull-result'
import type {
  ExternalPullTaskQueryRequest,
  ExternalPullTaskSaveRequest,
  ExternalPullTaskVO,
} from '@/apis/quality/external-pull-task'
import type { ExternalPullAuditEventCode } from '@/apis/quality/types'
import type { ExternalPullWorkbenchSignalSummaryVO } from '@/apis/quality/workbench'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { BusinessAnchorCode } from '@/types/enums/business-anchor-code-enum'
import type { SignalMetric, TaskResultItem } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { externalDataSourceApi } from '@/apis/quality/external-data-source'
import { externalPullAuditApi } from '@/apis/quality/external-pull-audit'
import { externalPullResultApi } from '@/apis/quality/external-pull-result'
import { externalPullTaskApi } from '@/apis/quality/external-pull-task'
import {
  EXTERNAL_PULL_CONFIRMATION_STATUS_COLOR,
  EXTERNAL_PULL_TASK_STATUS_COLOR,
  EXTERNAL_PULL_TASK_STATUS_OPTIONS,
  EXTERNAL_SOURCE_TYPE_OPTIONS,
  ExternalPullAuditCheckStatusCode,
  ExternalPullAuditCheckStatusDescription,
  ExternalPullAuditEventDescription,
  ExternalPullConfirmationStatusCode,
  ExternalPullConfirmationStatusDescription,
  ExternalPullFailurePhaseDescription,
  ExternalPullTaskStatusCode,
  ExternalPullTaskStatusDescription,
  ExternalSourceTypeCode,
  ExternalSourceTypeDescription,
} from '@/apis/quality/types'
import { workbenchApi } from '@/apis/quality/workbench'
import QualityIngestPageShell from '@/components/quality/QualityIngestPageShell.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import {
  AchievementResultSelector,
  AssessmentItemSelector,
  AuditIssueSelector,
  AuditRectificationSelector,
  CourseSelector,
  ReportSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import PasswordInput from '@/components/ui-guide/ui/PasswordInput.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTimeline from '@/components/ui-guide/ui/UiTimeline.vue'
import UiTimelineItem from '@/components/ui-guide/ui/UiTimelineItem.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePolling } from '@/composables/usePolling'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import {
  ALL_BUSINESS_ANCHOR_CODES,
  BUSINESS_ANCHOR_OPTIONS,
  BusinessAnchorCodeDescription,
} from '@/types/enums/business-anchor-code-enum'
import {
  EXTERNAL_PULL_FILTER_OPERATOR_OPTIONS,
  ExternalPullFilterOperatorCode,
} from '@/types/enums/external-pull-filter-operator-enum'
import {
  EXTERNAL_PULL_SORT_DIRECTION_OPTIONS,
  ExternalPullSortDirectionCode,
} from '@/types/enums/external-pull-sort-direction-enum'
import {
  getUserProcessFailureMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

interface SourceFieldScopeEditorRow {
  key: string
  sourceObjectName: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOrder: number
}

interface PullFilterEditorRow {
  key: string
  fieldName: string
  operator: ExternalPullFilterOperatorCode
  singleValue: string
  multipleValues: string[]
}

interface PullSortEditorRow {
  key: string
  fieldName: string
  sortDirection: ExternalPullSortDirectionCode
}

interface SelectOption {
  value: string
  label: string
}

interface ExternalDataSourceFormState {
  sourceCode: string
  sourceName: string
  sourceType: ExternalSourceTypeCode
  jdbcUrl: string
  username: string
  password: string
  driverClass: string
  maxRowCount: number
  queryTimeoutSeconds: number
  enabled: boolean
}

interface ExternalPullTaskFormState {
  sourceId: string
  taskCode: string
  taskName: string
  businessAnchor?: BusinessAnchorCode
  businessId: string
  sourceObjectName: string
  fields: ExternalPullTaskSaveRequest['fields']
  filters?: ExternalPullTaskSaveRequest['filters']
  sorts?: ExternalPullTaskSaveRequest['sorts']
  maxRowCount?: number
  queryTimeoutSeconds?: number
}

const sourceColumns: ColumnsType = [
  { title: '编码', dataIndex: 'sourceCode', key: 'sourceCode', width: 160, fixed: 'left' },
  { title: '名称', dataIndex: 'sourceName', key: 'sourceName' },
  { title: '数据库类型', dataIndex: 'sourceType', key: 'sourceType', width: 120 },
  { title: '驱动类', dataIndex: 'driverClass', key: 'driverClass', width: 200 },
  { title: '最大行数', dataIndex: 'maxRowCount', key: 'maxRowCount', width: 100 },
  { title: '超时（秒）', dataIndex: 'queryTimeoutSeconds', key: 'queryTimeoutSeconds', width: 100 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 100 },
  { title: '操作', key: 'actions', width: 220 },
]

const taskColumns: ColumnsType = [
  { title: '任务编码', dataIndex: 'taskCode', key: 'taskCode', width: 160, fixed: 'left' },
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
  { title: '数据源', dataIndex: 'sourceName', key: 'sourceRef', width: 160 },
  { title: '来源对象', dataIndex: 'sourceObjectName', key: 'sourceObjectName', width: 180 },
  { title: '业务归属', dataIndex: 'businessAnchor', key: 'businessAnchor', width: 180 },
  { title: '返回行数', dataIndex: 'returnRows', key: 'returnRows', width: 100 },
  { title: '耗时（ms）', dataIndex: 'elapsedMs', key: 'elapsedMs', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '失败阶段', key: 'failurePhase', width: 140 },
  { title: '开始 / 结束', key: 'taskTimeline', width: 200 },
  { title: '操作', key: 'actions', width: 220 },
]

const detailResultColumns: ColumnsType = [
  { title: '结果批次', key: 'resultBatch', width: 120 },
  { title: '业务归属', key: 'detailAnchor' },
  { title: '预览行数', dataIndex: 'previewRows', key: 'previewRows', width: 100 },
  { title: '确认行数', dataIndex: 'confirmedRows', key: 'confirmedRows', width: 100 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 110 },
  { title: '操作', key: 'actions', width: 180 },
]

const sources = ref<ExternalDataSourceVO[]>([])
const sourceTotal = ref(0)
const sourceLoading = ref(false)
const sourceQuery = reactive({ pageNum: 1, pageSize: 10 })
const {
  loadError: sourceLoadError,
  beginLoad: beginSourceLoad,
  failLoad: failSourceLoad,
  okLoad: okSourceLoad,
} = useUiTableLoadError()

const tasks = ref<ExternalPullTaskVO[]>([])
const taskTotal = ref(0)
const taskLoading = ref(false)
const {
  loadError: taskLoadError,
  beginLoad: beginTaskLoad,
  failLoad: failTaskLoad,
  okLoad: okTaskLoad,
} = useUiTableLoadError()
const taskQuery = reactive<ExternalPullTaskQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  sourceId: undefined,
  status: undefined,
  businessAnchor: undefined,
})

const sourceEditorVisible = ref(false)
const sourceEditing = ref(false)
const sourceEditorMode = ref<'create' | 'edit'>('create')
const sourceEditingId = ref<string | undefined>(undefined)
const sourceFieldScopes = ref<SourceFieldScopeEditorRow[]>([])
const sourceForm = reactive<ExternalDataSourceFormState>({
  sourceCode: '',
  sourceName: '',
  sourceType: ExternalSourceTypeCode.POSTGRESQL,
  jdbcUrl: '',
  username: '',
  password: '',
  driverClass: 'org.postgresql.Driver',
  maxRowCount: 10000,
  queryTimeoutSeconds: 30,
  enabled: true,
})

const taskCreateVisible = ref(false)
const taskCreating = ref(false)
const taskSelectedFields = ref<string[]>([])
const taskFilters = ref<PullFilterEditorRow[]>([])
const taskSorts = ref<PullSortEditorRow[]>([])
const taskAssessmentCourseId = ref<string>('')
const taskForm = reactive<ExternalPullTaskFormState>({
  sourceId: '',
  taskCode: '',
  taskName: '',
  businessAnchor: undefined,
  businessId: '',
  sourceObjectName: '',
  fields: [],
  filters: [],
  sorts: [],
  maxRowCount: undefined,
  queryTimeoutSeconds: undefined,
})

const detailVisible = ref(false)
const detailRecord = ref<ExternalPullTaskVO | null>(null)
const detailResults = ref<ExternalPullResultVO[]>([])
const detailAudits = ref<ExternalPullAuditVO[]>([])
const detailLoading = ref(false)
const detailResultPageNum = ref(1)
const detailResultPageSize = ref(10)
const detailResultTotal = ref(0)
const detailAuditPageNum = ref(1)
const detailAuditPageSize = ref(20)
const detailAuditTotal = ref(0)

interface ExternalPullTaskFilterModel {
  [key: string]: unknown
  sourceId?: string
  status?: ExternalPullTaskVO['status']
  businessAnchor?: BusinessAnchorCode
}

const taskFilterForm = reactive<ExternalPullTaskFilterModel>({
  sourceId: undefined,
  status: undefined,
  businessAnchor: undefined,
})

const taskFilterModel = computed<Record<string, unknown>>({
  get: () => taskFilterForm,
  set: (value) => {
    Object.assign(taskFilterForm, value)
  },
})

const taskFilterFields = computed<FilterField[]>(() => [
  {
    key: 'sourceId',
    type: 'select',
    placeholder: '按数据源筛选',
    allowClear: true,
    width: 200,
    options: sources.value.map((source) => ({ value: source.id, label: source.sourceName })),
  },
  {
    key: 'status',
    type: 'select',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: EXTERNAL_PULL_TASK_STATUS_OPTIONS,
  },
  {
    key: 'businessAnchor',
    type: 'select',
    placeholder: '业务归属',
    allowClear: true,
    width: 160,
    options: BUSINESS_ANCHOR_OPTIONS,
  },
])

const enabledSourceOptions = computed(() =>
  sources.value.filter((s) => s.enabled).map((s) => ({ value: s.id, label: s.sourceName })),
)

const selectedTaskSource = computed(() =>
  sources.value.find((source) => source.id === taskForm.sourceId),
)

const sourceObjectOptions = computed<SelectOption[]>(() => {
  const source = selectedTaskSource.value
  if (!source) return []
  const names: string[] = []
  for (const scope of source.fieldScopes || []) {
    if (scope.sourceObjectName && !names.includes(scope.sourceObjectName)) {
      names.push(scope.sourceObjectName)
    }
  }
  return names.map((name) => ({ value: name, label: name }))
})

const taskFieldOptions = computed<SelectOption[]>(() => {
  const source = selectedTaskSource.value
  if (!source || !taskForm.sourceObjectName) return []
  return (source.fieldScopes || [])
    .filter((scope) => scope.sourceObjectName === taskForm.sourceObjectName)
    .sort((a, b) => a.fieldOrder - b.fieldOrder)
    .map((scope) => ({
      value: scope.fieldName,
      label: scope.fieldLabel ? `${scope.fieldLabel}（${scope.fieldName}）` : scope.fieldName,
    }))
})

const distributionExpanded = ref(false)
const signalLastSuccessAt = ref<string | null>(null)

function markSignalSuccessAt(): void {
  signalLastSuccessAt.value = new Date().toISOString().replace('T', ' ').slice(0, 19)
}

const configStatusStrip = computed(() => {
  const summary = signalSummary.value
  if (!summary) {
    return null
  }
  const enabledSources = summary.sourceEnabledCount ?? 0
  const failedTasks = summary.taskFailedCount ?? 0
  const runningTasks = summary.taskRunningCount ?? 0
  if ((summary.sourceTotalCount ?? 0) === 0) {
    return {
      tone: 'warning' as const,
      tag: '未配置',
      description: '尚未创建外部只读数据源，请先新建并启用数据源',
    }
  }
  if (enabledSources === 0) {
    return {
      tone: 'warning' as const,
      tag: '下一动作',
      description: '已有数据源但均未启用，请启用至少一个数据源后再创建拉取任务',
    }
  }
  if (failedTasks > 0) {
    return {
      tone: 'error' as const,
      tag: '失败待处置',
      description: `有 ${failedTasks} 个拉取任务失败，请查看待关注任务与失败阶段`,
    }
  }
  if (runningTasks > 0) {
    return {
      tone: 'info' as const,
      tag: '运行中',
      description: `有 ${runningTasks} 个任务正在拉取，完成后请核对结果并确认/驳回`,
    }
  }
  return {
    tone: 'success' as const,
    tag: '配置就绪',
    description: '已启用数据源且无失败任务；可创建拉取任务或核对历史结果',
  }
})

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const enabledSources = summary.sourceEnabledCount ?? 0
  const runningTasks = summary.taskRunningCount ?? 0
  const failedTasks = summary.taskFailedCount ?? 0
  return [
    {
      key: 'src-enabled',
      label: '已启用数据源',
      value: enabledSources,
      tone: enabledSources > 0 ? 'green' : 'orange',
    },
    {
      key: 'task-failed',
      label: '失败',
      value: failedTasks,
      tone: failedTasks > 0 ? 'red' : 'gray',
    },
    {
      key: 'task-running',
      label: '运行中',
      value: runningTasks,
      tone: runningTasks > 0 ? 'orange' : 'gray',
    },
  ]
})

const distributionSignals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const succeededTasks = summary.taskSucceededCount ?? 0
  return [
    { key: 'src-total', label: '数据源总数', value: summary.sourceTotalCount ?? 0, tone: 'blue' },
    { key: 'task-total', label: '任务总数', value: summary.taskTotalCount ?? 0, tone: 'blue' },
    {
      key: 'task-success',
      label: '已成功',
      value: succeededTasks,
      tone: succeededTasks > 0 ? 'green' : 'gray',
    },
  ]
})

const taskRuleSummaryLines = computed(() => {
  const lines: string[] = []
  if (taskForm.sourceObjectName) {
    lines.push(`来源对象：${taskForm.sourceObjectName}`)
  }
  if (taskSelectedFields.value.length) {
    lines.push(`返回字段：${taskSelectedFields.value.join('、')}`)
  }
  const activeFilters = taskFilters.value.filter(
    (item) =>
      item.fieldName
      && (item.operator === ExternalPullFilterOperatorCode.IN
        ? item.multipleValues.length > 0
        : Boolean(item.singleValue.trim())),
  )
  if (activeFilters.length) {
    lines.push(
      `筛选条件：${activeFilters
        .map((item) => {
          const valueText
            = item.operator === ExternalPullFilterOperatorCode.IN
              ? item.multipleValues.join('、')
              : item.singleValue.trim()
          return `${item.fieldName}${filterOperatorText(item.operator)}${valueText}`
        })
        .join('；')}`,
    )
  }
  const activeSorts = taskSorts.value.filter((item) => item.fieldName)
  if (activeSorts.length) {
    lines.push(
      `排序规则：${activeSorts
        .map(
          (item) =>
            `${item.fieldName}${item.sortDirection === ExternalPullSortDirectionCode.ASC ? '升序' : '降序'}`,
        )
        .join('；')}`,
    )
  }
  return lines
})

const pullResultItems = computed<TaskResultItem[]>(() => {
  return tasks.value
    .filter(
      (t) =>
        t.status === ExternalPullTaskStatusCode.FAILED
        || t.status === ExternalPullTaskStatusCode.RUNNING,
    )
    .slice(0, 5)
    .map((t) => {
      const phase = failurePhaseLabel(t.failurePhase)
      const failedDesc = [
        phase ? `失败阶段：${phase}` : '',
        getUserProcessFailureMessage(
          t.failureReason,
          '外部成绩数据接入失败，请检查数据源配置、授权状态和返回字段设置',
        ) || '',
      ]
        .filter(Boolean)
        .join('；')
      return {
        id: t.id,
        title: `${t.taskCode} - ${t.taskName}`,
        statusLabel: taskStatusLabel(t.status),
        statusTone: t.status === ExternalPullTaskStatusCode.FAILED ? 'red' : 'blue',
        description:
          t.status === ExternalPullTaskStatusCode.FAILED
            ? failedDesc || undefined
            : '任务执行中',
        time: t.finishedTime || t.startedTime || undefined,
        actions: [{ key: 'detail', label: '详情' }],
      }
    })
})

function taskStatusLabel(value: ExternalPullTaskVO['status']): string {
  return strictEnumLabel(ExternalPullTaskStatusDescription, value, '外部拔取任务状态')
}

function failurePhaseLabel(value: ExternalPullTaskVO['failurePhase']): string {
  if (!value) {
    return ''
  }
  return strictEnumLabel(ExternalPullFailurePhaseDescription, value, '外部拔取失败阶段')
}

function taskStatusColor(value: ExternalPullTaskVO['status']): BadgeTone {
  return strictEnumTone(EXTERNAL_PULL_TASK_STATUS_COLOR, value, '外部拔取任务状态')
}

function sourceTypeLabel(value: ExternalSourceTypeCode): string {
  return strictEnumLabel(ExternalSourceTypeDescription, value, '外部数据源类型')
}

function confirmationStatusLabel(value: ExternalPullConfirmationStatusCode): string {
  return strictEnumLabel(ExternalPullConfirmationStatusDescription, value, '结果批次确认状态')
}

function confirmationStatusColor(value: ExternalPullConfirmationStatusCode): BadgeTone {
  return strictEnumTone(EXTERNAL_PULL_CONFIRMATION_STATUS_COLOR, value, '结果批次确认状态')
}

function auditTone(status: ExternalPullAuditCheckStatusCode): string {
  if (status === ExternalPullAuditCheckStatusCode.PASSED) return 'green'
  if (status === ExternalPullAuditCheckStatusCode.REJECTED) return 'red'
  if (status === ExternalPullAuditCheckStatusCode.WARNING) return 'orange'
  return 'gray'
}

function auditTimelineTone(audit: ExternalPullAuditVO): string {
  if (audit.queryScopeStatus) return auditTone(audit.queryScopeStatus)
  if (audit.fieldScopeStatus) return auditTone(audit.fieldScopeStatus)
  return 'gray'
}

function auditEventLabel(value: ExternalPullAuditEventCode): string {
  return strictEnumLabel(ExternalPullAuditEventDescription, value, '外部拔取审计事件')
}

function auditCheckStatusLabel(value: ExternalPullAuditCheckStatusCode): string {
  return strictEnumLabel(ExternalPullAuditCheckStatusDescription, value, '外部拔取审计状态')
}

function filterOperatorText(operator: ExternalPullFilterOperatorCode): string {
  const option = EXTERNAL_PULL_FILTER_OPERATOR_OPTIONS.find((item) => item.value === operator)
  if (!option) return ' '
  return option.label
}

function businessAnchorLabel(value: BusinessAnchorCode): string {
  return strictEnumLabel(BusinessAnchorCodeDescription, value, '外部拔取业务归属')
}

function createSourceFieldScopeRow(scope?: ExternalSourceFieldScopeVO): SourceFieldScopeEditorRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceObjectName: scope?.sourceObjectName || '',
    fieldName: scope?.fieldName || '',
    fieldLabel: scope?.fieldLabel || '',
    fieldType: scope?.fieldType || '',
    fieldOrder: scope?.fieldOrder || 1,
  }
}

function createFilterRow(): PullFilterEditorRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fieldName: '',
    operator: ExternalPullFilterOperatorCode.EQ,
    singleValue: '',
    multipleValues: [],
  }
}

function createSortRow(): PullSortEditorRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fieldName: '',
    sortDirection: ExternalPullSortDirectionCode.ASC,
  }
}

function canCancelTask(status: ExternalPullTaskVO['status']): boolean {
  return (
    status === ExternalPullTaskStatusCode.PENDING || status === ExternalPullTaskStatusCode.RUNNING
  )
}

function handleFilterOperatorChange(entry: PullFilterEditorRow) {
  entry.singleValue = ''
  entry.multipleValues = []
}

function handleTaskPageChange(page: { current: number, pageSize: number }) {
  taskQuery.pageNum = page.current
  taskQuery.pageSize = page.pageSize
  loadTasks()
}

function syncTaskFilterToQuery() {
  taskQuery.sourceId = taskFilterForm.sourceId || undefined
  taskQuery.status = taskFilterForm.status
  taskQuery.businessAnchor = taskFilterForm.businessAnchor
}

function handleTaskSearch() {
  taskQuery.pageNum = 1
  syncTaskFilterToQuery()
  void Promise.all([loadTasks(), loadSignalSummary()])
}

function handleTaskReset() {
  Object.assign(taskFilterForm, {
    sourceId: undefined,
    status: undefined,
    businessAnchor: undefined,
  })
  taskQuery.pageNum = 1
  syncTaskFilterToQuery()
  void Promise.all([loadTasks(), loadSignalSummary()])
}

function resetTaskRuleAfterSourceChange() {
  taskForm.sourceObjectName = ''
  taskSelectedFields.value = []
  taskFilters.value = [createFilterRow()]
  taskSorts.value = []
}

function resetTaskRuleAfterObjectChange() {
  taskSelectedFields.value = []
  taskFilters.value = [createFilterRow()]
  taskSorts.value = []
}

function handleTaskBusinessAnchorChange(value: SelectValue) {
  if (Array.isArray(value)) {
    void message.error('业务归属选择无效，请重新选择')
    return
  }
  taskForm.businessAnchor = ALL_BUSINESS_ANCHOR_CODES.find((code) => code === value)
  taskForm.businessId = ''
  taskAssessmentCourseId.value = ''
}

function handleTaskAssessmentCourseChange(value: string | null) {
  taskAssessmentCourseId.value = value ?? ''
  taskForm.businessId = ''
}

function handleTaskBusinessObjectChange(value: string | null) {
  taskForm.businessId = value ?? ''
}

async function reloadAll() {
  await Promise.all([loadSources(), loadTasks(), loadSignalSummary()])
}

const signalSummary = ref<ExternalPullWorkbenchSignalSummaryVO | null>(null)

function buildExternalPullSignalRequest() {
  return {
    sourceQuery: {
      pageNum: sourceQuery.pageNum,
      pageSize: sourceQuery.pageSize,
    },
    taskQuery: {
      ...taskQuery,
      sourceId: taskQuery.sourceId || undefined,
      status: taskQuery.status || undefined,
      businessAnchor: taskQuery.businessAnchor,
    },
  }
}

async function loadSignalSummary() {
  try {
    signalSummary.value = await workbenchApi.externalPullSignalSummary(
      buildExternalPullSignalRequest(),
    )
    markSignalSuccessAt()
  } catch (error) {
    signalSummary.value = null
    showUserError(error, '外部拉取指标加载失败')
  }
}

useQualityScopedLoader(reloadAll, { watchScope: true, immediate: false })

async function loadSources() {
  const scope = beginQualityScopeRequest()
  sourceLoading.value = true
  beginSourceLoad()
  try {
    const page = await externalDataSourceApi.page({
      pageNum: sourceQuery.pageNum,
      pageSize: sourceQuery.pageSize,
    })
    if (scope.isStale()) {
      return
    }
    sources.value = page.list
    sourceQuery.pageNum = page.pageNum
    sourceQuery.pageSize = page.pageSize
    sourceTotal.value = page.total
    if (sources.value.length === 0 && sourceTotal.value > 0 && sourceQuery.pageNum > 1) {
      sourceQuery.pageNum -= 1
      await loadSources()
      return
    }
    okSourceLoad()
  } catch (error) {
    if (!scope.isStale()) {
      showUserError(error, '外部数据源加载失败')
      sources.value = []
      sourceTotal.value = 0
      failSourceLoad()
    }
  } finally {
    if (!scope.isStale()) {
      sourceLoading.value = false
    }
  }
}

function handleSourcePageChange(event: { current: number, pageSize: number }): void {
  sourceQuery.pageNum = event.current
  sourceQuery.pageSize = event.pageSize
  void loadSources()
}

async function loadTasks() {
  const scope = beginQualityScopeRequest()
  taskLoading.value = true
  beginTaskLoad()
  try {
    const page = await externalPullTaskApi.page({
      ...taskQuery,
      sourceId: taskQuery.sourceId || undefined,
      status: taskQuery.status || undefined,
      businessAnchor: taskQuery.businessAnchor,
    })
    if (scope.isStale()) {
      return
    }
    tasks.value = page.list
    taskQuery.pageNum = page.pageNum
    taskQuery.pageSize = page.pageSize
    taskTotal.value = page.total
    if (tasks.value.length === 0 && taskTotal.value > 0 && taskQuery.pageNum > 1) {
      taskQuery.pageNum -= 1
      await loadTasks()
      return
    }
    markListSyncOk()
    okTaskLoad()
    taskPolling.syncPolling()
  } catch (error) {
    if (!scope.isStale()) {
      tasks.value = []
      taskTotal.value = 0
      failTaskLoad()
      showUserError(error, '外部拉取任务加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      taskLoading.value = false
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

const taskPolling = usePolling(() => loadTasksQuietly(), {
  getOptions: () => ({
    intervalMs: currentListPollIntervalMs(),
    when:
      !listPollStopped.value
      && tasks.value.some(
        (task) =>
          task.status === ExternalPullTaskStatusCode.PENDING
          || task.status === ExternalPullTaskStatusCode.RUNNING,
      ),
  }),
  pauseWhenDocumentHidden: true,
})

async function loadTasksQuietly(): Promise<void> {
  if (taskLoading.value) {
    return
  }
  const scope = beginQualityScopeRequest()
  try {
    const page = await externalPullTaskApi.page(
      {
        ...taskQuery,
        sourceId: taskQuery.sourceId || undefined,
        status: taskQuery.status || undefined,
        businessAnchor: taskQuery.businessAnchor,
      },
      { showErrorMessage: false },
    )
    if (scope.isStale()) {
      return
    }
    tasks.value = page.list
    taskQuery.pageNum = page.pageNum
    taskQuery.pageSize = page.pageSize
    taskTotal.value = page.total
    markListSyncOk()
    taskPolling.syncPolling()
  } catch {
    if (scope.isStale()) {
      return
    }
    markListSyncFailed()
    taskPolling.syncPolling()
  }
}

function openSourceCreate() {
  sourceEditorMode.value = 'create'
  sourceEditingId.value = undefined
  sourceFieldScopes.value = [createSourceFieldScopeRow()]
  Object.assign(sourceForm, {
    sourceCode: '',
    sourceName: '',
    sourceType: ExternalSourceTypeCode.POSTGRESQL,
    jdbcUrl: '',
    username: '',
    password: '',
    driverClass: 'org.postgresql.Driver',
    maxRowCount: 10000,
    queryTimeoutSeconds: 30,
    enabled: true,
  })
  sourceEditorVisible.value = true
}

async function openSourceEdit(record: ExternalDataSourceVO) {
  sourceEditorMode.value = 'edit'
  sourceEditingId.value = record.id
  const detail = await externalDataSourceApi.detail(record.id)
  sourceFieldScopes.value = detail.fieldScopes?.length
    ? detail.fieldScopes.map((scope) => createSourceFieldScopeRow(scope))
    : [createSourceFieldScopeRow()]
  Object.assign(sourceForm, {
    sourceCode: detail.sourceCode,
    sourceName: detail.sourceName,
    sourceType: detail.sourceType,
    jdbcUrl: '',
    username: '',
    password: '',
    driverClass: detail.driverClass,
    maxRowCount: detail.maxRowCount,
    queryTimeoutSeconds: detail.queryTimeoutSeconds,
    enabled: detail.enabled,
  })
  sourceEditorVisible.value = true
}

async function submitSource() {
  if (
    !sourceForm.sourceCode.trim()
    || !sourceForm.sourceName.trim()
    || !sourceForm.jdbcUrl.trim()
  ) {
    void message.error('请填写编码 / 名称 / 连接地址')
    return
  }
  if (!sourceForm.username.trim() || !sourceForm.password) {
    void message.error('账户与密码不能为空（保存时加密）')
    return
  }
  if (!sourceForm.driverClass.trim()) {
    void message.error('请填写驱动类')
    return
  }

  const seen = new Set<string>()
  const fieldScopes: ExternalSourceFieldScopeRequest[] = []
  for (let index = 0; index < sourceFieldScopes.value.length; index += 1) {
    const row = sourceFieldScopes.value[index]
    const sourceObjectName = row.sourceObjectName.trim()
    const fieldName = row.fieldName.trim()
    if (!sourceObjectName || !fieldName) {
      void message.error(`字段范围 ${index + 1} 需要填写来源对象和字段名`)
      return
    }
    const duplicateKey = `${sourceObjectName}#${fieldName}`
    if (seen.has(duplicateKey)) {
      void message.error(`字段范围重复：${sourceObjectName}.${fieldName}`)
      return
    }
    seen.add(duplicateKey)
    fieldScopes.push({
      sourceObjectName,
      fieldName,
      fieldLabel: row.fieldLabel.trim(),
      fieldType: row.fieldType.trim(),
      fieldOrder: index + 1,
    })
  }
  if (!fieldScopes.length) {
    void message.error('请至少登记一个可拔取字段')
    return
  }

  sourceEditing.value = true
  try {
    const request: ExternalDataSourceSaveRequest = {
      id: sourceEditorMode.value === 'edit' ? sourceEditingId.value : undefined,
      sourceCode: sourceForm.sourceCode.trim(),
      sourceName: sourceForm.sourceName.trim(),
      sourceType: sourceForm.sourceType,
      jdbcUrl: sourceForm.jdbcUrl.trim(),
      username: sourceForm.username.trim(),
      password: sourceForm.password,
      driverClass: sourceForm.driverClass.trim(),
      fieldScopes,
      maxRowCount: sourceForm.maxRowCount,
      queryTimeoutSeconds: sourceForm.queryTimeoutSeconds,
      enabled: sourceForm.enabled,
    }
    if (sourceEditorMode.value === 'create') {
      await externalDataSourceApi.create(request)
      void message.success('数据源已创建')
    } else {
      await externalDataSourceApi.update(request)
      void message.success('数据源已更新')
    }
    sourceEditorVisible.value = false
    await loadSources()
  } finally {
    sourceEditing.value = false
  }
}

async function toggleSourceEnabled(record: ExternalDataSourceVO) {
  await externalDataSourceApi.toggleEnabled({ id: record.id, enabled: !record.enabled })
  void message.success('已切换状态')
  await loadSources()
}

async function deleteSource(record: ExternalDataSourceVO) {
  void confirmAsync({
    title: `删除数据源 ${record.sourceCode}？`,
    type: 'error',
    onOk: async () => {
      await externalDataSourceApi.delete(record.id)
      void message.success('已删除')
      await loadSources()
    },
  })
}

function openTaskCreate() {
  Object.assign(taskForm, {
    sourceId: '',
    taskCode: '',
    taskName: '',
    businessAnchor: undefined,
    businessId: '',
    sourceObjectName: '',
    fields: [],
    filters: [],
    sorts: [],
    maxRowCount: undefined,
    queryTimeoutSeconds: undefined,
  })
  taskSelectedFields.value = []
  taskFilters.value = [createFilterRow()]
  taskSorts.value = []
  taskAssessmentCourseId.value = ''
  taskCreateVisible.value = true
}

async function submitTask() {
  if (
    !taskForm.taskName.trim()
    || !taskForm.taskCode.trim()
    || !taskForm.sourceId
    || !taskForm.businessAnchor
    || !taskForm.businessId
    || !taskForm.sourceObjectName
  ) {
    void message.error('请填写任务编码、名称，选择数据源，并补全业务归属和来源对象')
    return
  }
  if (!taskSelectedFields.value.length) {
    void message.error('请至少选择一个返回字段')
    return
  }

  const fields = taskSelectedFields.value.map((fieldName, index) => ({
    fieldName,
    fieldOrder: index + 1,
  }))
  const filters: NonNullable<ExternalPullTaskSaveRequest['filters']> = []
  for (let index = 0; index < taskFilters.value.length; index += 1) {
    const row = taskFilters.value[index]
    const hasValue
      = row.operator === ExternalPullFilterOperatorCode.IN
        ? row.multipleValues.length > 0
        : Boolean(row.singleValue.trim())
    if (!row.fieldName && !hasValue) continue
    if (!row.fieldName || !hasValue) {
      void message.error(`筛选条件 ${index + 1} 需要同时选择字段并填写取值`)
      return
    }
    if (row.operator === ExternalPullFilterOperatorCode.IN) {
      const values = row.multipleValues.map((value) => value.trim()).filter(Boolean)
      if (!values.length) {
        void message.error(`筛选条件 ${index + 1} 至少填写一个取值`)
        return
      }
      for (let valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
        filters.push({
          fieldName: row.fieldName,
          filterOperator: row.operator,
          filterValue: values[valueIndex],
          conditionOrder: index + 1,
          valueOrder: valueIndex + 1,
        })
      }
    } else {
      filters.push({
        fieldName: row.fieldName,
        filterOperator: row.operator,
        filterValue: row.singleValue.trim(),
        conditionOrder: index + 1,
        valueOrder: 1,
      })
    }
  }
  const sorts = taskSorts.value
    .filter((row) => row.fieldName)
    .map((row, index) => ({
      fieldName: row.fieldName,
      sortDirection: row.sortDirection,
      sortOrder: index + 1,
    }))

  taskCreating.value = true
  try {
    await externalPullTaskApi.create({
      sourceId: taskForm.sourceId,
      taskCode: taskForm.taskCode.trim(),
      taskName: taskForm.taskName.trim(),
      businessAnchor: taskForm.businessAnchor,
      businessId: taskForm.businessId,
      sourceObjectName: taskForm.sourceObjectName,
      fields,
      filters,
      sorts,
      maxRowCount: taskForm.maxRowCount,
      queryTimeoutSeconds: taskForm.queryTimeoutSeconds,
    })
    void message.success('任务已提交，等待调度器执行')
    taskCreateVisible.value = false
    await loadTasks()
  } finally {
    taskCreating.value = false
  }
}

async function cancelTask(record: ExternalPullTaskVO) {
  const reason = await promptInputAsync({
    title: `取消拔取任务 ${record.taskCode}`,
    placeholder: '请填写取消原因',
    required: true,
    okType: 'danger',
    emptyErrorMessage: '请填写取消原因',
  })
  if (!reason) return
  await externalPullTaskApi.cancel({ id: record.id, reason })
  void message.success('已取消')
  await loadTasks()
}

async function confirmResult(result: ExternalPullResultVO) {
  const confirmedRows = result.previewRows
  if (confirmedRows === null || confirmedRows === undefined) {
    showFormValidationMessage('结果批次尚未生成预览数据，不能确认')
    return
  }
  if (confirmedRows <= 0) {
    void message.warning('预览行数为 0，无法确认导入')
    return
  }
  void confirmAsync({
    title: '确认当前拔取结果批次？',
    content: '确认后进入达成度计算可用来源',
    type: 'info',
    onOk: async () => {
      await externalPullResultApi.confirm({
        id: result.id,
        confirmedRows,
      })
      void message.success('已确认')
      if (detailRecord.value) await reloadDetail(detailRecord.value.id)
    },
  })
}

async function rejectResult(result: ExternalPullResultVO) {
  const reason = await promptInputAsync({
    title: '驳回当前拔取结果批次',
    placeholder: '请填写驳回原因',
    required: true,
    okType: 'danger',
    emptyErrorMessage: '请填写驳回原因',
  })
  if (!reason) return
  await externalPullResultApi.reject({ id: result.id, notes: reason })
  void message.success('已驳回')
  if (detailRecord.value) await reloadDetail(detailRecord.value.id)
}

async function openDetail(record: ExternalPullTaskVO) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await externalPullTaskApi.detail(record.id)
    await reloadDetail(record.id)
  } catch (error) {
    detailRecord.value = null
    detailResults.value = []
    detailResultTotal.value = 0
    detailAudits.value = []
    detailAuditTotal.value = 0
    showUserError(error, '拉取任务详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function reloadDetail(taskId: string) {
  detailLoading.value = true
  try {
    detailResultPageNum.value = 1
    detailAuditPageNum.value = 1
    await loadDetailResults(taskId)
    await loadDetailAudits(taskId)
  } finally {
    detailLoading.value = false
  }
}

async function loadDetailAudits(taskId: string) {
  try {
    const page = await externalPullAuditApi.page({
      pullTaskId: taskId,
      pageNum: detailAuditPageNum.value,
      pageSize: detailAuditPageSize.value,
    })
    detailAudits.value = page.list
    detailAuditTotal.value = page.total
  } catch (error) {
    detailAudits.value = []
    detailAuditTotal.value = 0
    showUserError(error, '拉取任务审计记录加载失败')
  }
}

function handleDetailAuditPageChange(event: { current: number, pageSize: number }) {
  if (!detailRecord.value) return
  detailAuditPageNum.value = event.current
  detailAuditPageSize.value = event.pageSize
  detailLoading.value = true
  void loadDetailAudits(detailRecord.value.id).finally(() => {
    detailLoading.value = false
  })
}

async function loadDetailResults(taskId: string) {
  try {
    const result = await externalPullResultApi.pageByTask({
      pullTaskId: taskId,
      pageNum: detailResultPageNum.value,
      pageSize: detailResultPageSize.value,
    })
    detailResults.value = result.list
    detailResultTotal.value = result.total
  } catch (error) {
    detailResults.value = []
    detailResultTotal.value = 0
    showUserError(error, '拉取任务结果加载失败')
  }
}

function handleDetailResultPageChange(event: { current: number, pageSize: number }) {
  if (!detailRecord.value) return
  detailResultPageNum.value = event.current
  detailResultPageSize.value = event.pageSize
  detailLoading.value = true
  void loadDetailResults(detailRecord.value.id).finally(() => {
    detailLoading.value = false
  })
}

function detailResultBatchNo(index: number): number {
  return (detailResultPageNum.value - 1) * detailResultPageSize.value + index + 1
}

function handlePullResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = tasks.value.find((t) => t.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') openDetail(record)
}

function buildExternalSourceActions(_record: ExternalDataSourceVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'toggle-enabled', label: _record.enabled ? '停用' : '启用' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleExternalSourceAction(key: string, record: ExternalDataSourceVO): void {
  switch (key) {
    case 'edit':
      void openSourceEdit(record)
      break
    case 'toggle-enabled':
      void toggleSourceEnabled(record)
      break
    case 'delete':
      void deleteSource(record)
      break
  }
}

function buildExternalPullTaskActions(record: ExternalPullTaskVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [{ key: 'detail', label: '详情' }]
  if (canCancelTask(record.status)) {
    actions.push({ key: 'cancel', label: '取消', tone: 'danger' })
  }
  return actions
}

function handleExternalPullTaskAction(key: string, record: ExternalPullTaskVO): void {
  switch (key) {
    case 'detail':
      void openDetail(record)
      break
    case 'cancel':
      void cancelTask(record)
      break
  }
}

function buildExternalPullResultActions(record: ExternalPullResultVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (record.confirmationStatus === 'PREVIEW' && (record.previewRows ?? 0) > 0) {
    actions.push({ key: 'confirm', label: '确认', tone: 'primary' })
  }
  if (record.confirmationStatus === 'PREVIEW') {
    actions.push({ key: 'reject', label: '驳回', tone: 'danger' })
  }
  return actions
}

function handleExternalPullResultAction(key: string, record: ExternalPullResultVO): void {
  switch (key) {
    case 'confirm':
      void confirmResult(record)
      break
    case 'reject':
      void rejectResult(record)
      break
  }
}

onMounted(async () => {
  await reloadAll()
})
</script>

<template>
  <QualityIngestPageShell embedded>
    <template #context>
      <QualityPageContextBar show-title title="外部成绩拉取" />
    </template>

    <UiAlertStrip
      v-if="configStatusStrip"
      :tone="configStatusStrip.tone"
      dense
      inline
      :show-icon="false"
      class="external-pull__config-status"
    >
      <template #default>
        <span class="external-pull__gate-row">
          <UiTag
            :tone="
              configStatusStrip.tone === 'error'
                ? 'red'
                : configStatusStrip.tone === 'warning'
                  ? 'orange'
                  : configStatusStrip.tone === 'success'
                    ? 'green'
                    : 'blue'
            "
            size="sm"
          >
            {{ configStatusStrip.tag }}
          </UiTag>
          <span>{{ configStatusStrip.description }}</span>
        </span>
      </template>
    </UiAlertStrip>
    <SignalBand :metrics="signals" variant="panel" compact class="external-pull__signals" />
    <p v-if="signalLastSuccessAt" class="external-pull__sync-hint">
      指标最近同步：{{ signalLastSuccessAt }}
    </p>
    <div v-if="distributionSignals.length" class="external-pull__charts-fold">
      <UiButton
        variant="ghost"
        size="sm"
        class="external-pull__charts-toggle"
        @click="distributionExpanded = !distributionExpanded"
      >
        {{ distributionExpanded ? '收起接入统计' : '展开接入统计' }}
      </UiButton>
      <SignalBand
        v-if="distributionExpanded"
        :metrics="distributionSignals"
        variant="panel"
        compact
        class="external-pull__signals-secondary"
      />
    </div>

    <TaskResultPanel
      v-if="pullResultItems.length > 0"
      title="待关注任务"
      :items="pullResultItems"
      class="external-pull__result-panel"
      @action="handlePullResultAction"
    />

    <UiEmpty
      v-if="listSyncFailed"
      size="sm"
      :title="listPollStopped ? '任务列表同步已暂停' : '任务列表同步失败'"
      :description="
        listPollStopped
          ? `连续失败 ${listPollFailCount} 次已停止轮询；最近成功 ${listSyncAt || '尚无'}。使用「刷新」后将再次拉取`
          : `最近成功 ${listSyncAt || '尚无'}；已退避重试中，使用「刷新」恢复`
      "
      class="external-pull__list-sync"
    />

    <UiCard class="detail-table-card external-pull__source-card">
      <template #title>
        外部只读数据源
        <span class="external-pull__panel-meta">{{ sourceTotal }} 个</span>
      </template>
      <template #extra>
        <div class="dp-space" style="--dp-space-component: 8px">
          <UiTextAction @click="reloadAll">刷新</UiTextAction>
          <UiButton variant="outline" size="sm" @click="openSourceCreate">新建数据源</UiButton>
        </div>
      </template>

      <WorkbenchContextGateStrip
        v-if="!sourceLoadError && !sources.length && !sourceLoading"
        tag="未配置"
        body="暂无数据源，请先创建并启用外部只读数据源"
        cta-label="新建数据源"
        @cta="openSourceCreate"
      />
      <UiEmpty
        v-else-if="sourceLoadError"
        size="sm"
        title="数据源加载失败"
      />
      <UiDataTable
        v-else
        v-model:current="sourceQuery.pageNum"
        v-model:page-size="sourceQuery.pageSize"
        pagination-mode="server"
        :columns="sourceColumns"
        :data-source="sources"
        :loading="sourceLoading"
        :load-error="sourceLoadError"
        empty-title="暂无外部数据源"
        empty-description="请新建并启用数据源后再创建拉取任务"
        :total="sourceTotal"
        row-key="id"
        size="small"
        flat
        @page-change="handleSourcePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sourceType'">
            {{ sourceTypeLabel(record.sourceType) }}
          </template>
          <template
            v-else-if="column.key === 'maxRowCount' || column.key === 'queryTimeoutSeconds'"
          >
            {{ column.key === 'maxRowCount' ? record.maxRowCount : record.queryTimeoutSeconds }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'" size="sm">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildExternalSourceActions(record)"
              split
              @action="(key) => handleExternalSourceAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard class="detail-table-card external-pull__task-card">
      <template #title>拔取任务</template>
      <template #extra>
        <UiButton
          variant="primary"
          size="sm"
          :disabled="!sources.some((s) => s.enabled)"
          @click="openTaskCreate"
        >
          新建拔取任务
        </UiButton>
      </template>

      <UiFilterBar
        variant="plain"
        v-model="taskFilterModel"
        :fields="taskFilterFields"
        @search="handleTaskSearch"
        @reset="handleTaskReset"
      />

      <WorkbenchContextGateStrip
        v-if="!taskLoadError && !tasks.length && !taskLoading"
        tag="未配置"
        body="暂无外部拉取任务，请新建任务并执行接入"
        cta-label="新建拔取任务"
        @cta="openTaskCreate"
      />
      <UiEmpty
        v-else-if="taskLoadError"
        size="sm"
        title="拉取任务加载失败"
      />
      <UiDataTable
        v-else
        v-model:current="taskQuery.pageNum"
        v-model:page-size="taskQuery.pageSize"
        :columns="taskColumns"
        :data-source="tasks"
        :loading="taskLoading"
        :load-error="taskLoadError"
        empty-title="暂无外部拉取任务"
        empty-description="请新建拔取任务并执行接入"
        row-key="id"
        size="middle"
        :total="taskTotal"
        flat
        @page-change="handleTaskPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sourceRef'">
            {{ record.sourceName }}
          </template>
          <template v-else-if="column.key === 'businessAnchor'">
            <div>{{ businessAnchorLabel(record.businessAnchor) }}</div>
            <div class="external-pull__sub-text">
              {{ record.businessLabel }}
            </div>
          </template>
          <template v-else-if="column.key === 'returnRows' || column.key === 'elapsedMs'">
            <template v-if="column.key === 'returnRows'">
              {{
                Number.isFinite(record.returnRows)
                  ? record.returnRows
                  : record.status === ExternalPullTaskStatusCode.RUNNING
                    ? '执行中'
                    : record.status === ExternalPullTaskStatusCode.PENDING
                      ? '尚未执行'
                      : '未返回行数'
              }}
            </template>
            <template v-else>
              {{
                Number.isFinite(record.elapsedMs)
                  ? `${record.elapsedMs} ms`
                  : record.status === ExternalPullTaskStatusCode.RUNNING
                    ? '执行中'
                    : record.status === ExternalPullTaskStatusCode.PENDING
                      ? '尚未开始计时'
                      : '未返回耗时'
              }}
            </template>
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="taskStatusColor(record.status)" size="sm">
              {{ taskStatusLabel(record.status) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'failurePhase'">
            <template v-if="record.status === ExternalPullTaskStatusCode.FAILED">
              <div>{{ failurePhaseLabel(record.failurePhase) || '-' }}</div>
              <div v-if="record.failureReason" class="external-pull__sub-text">
                {{ record.failureReason }}
              </div>
            </template>
            <span v-else class="external-pull__sub-text">-</span>
          </template>
          <template v-else-if="column.key === 'taskTimeline'">
            <div>{{ record.startedTime || '尚未开始' }}</div>
            <div class="external-pull__sub-text">
              {{ record.finishedTime || (record.status === ExternalPullTaskStatusCode.RUNNING ? '执行中' : '-') }}
            </div>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildExternalPullTaskActions(record)"
              split
              @action="(key) => handleExternalPullTaskAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDrawer
      v-model:open="sourceEditorVisible"
      :title="sourceEditorMode === 'create' ? '新建数据源' : `编辑数据源 ${sourceForm.sourceCode}`"
      :width="860"
      :confirm-loading="sourceEditing"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitSource"
    >
      <UiForm layout="vertical" :model="sourceForm">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="数据源编码" required>
              <UiInput size="sm" v-model="sourceForm.sourceCode" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="名称" required>
              <UiInput size="sm" v-model="sourceForm.sourceName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="数据库类型" required>
              <UiSelect
                size="sm"
                v-model="sourceForm.sourceType"
                :options="EXTERNAL_SOURCE_TYPE_OPTIONS"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="驱动类全名" required>
              <UiInput
                size="sm"
                v-model="sourceForm.driverClass"
                placeholder="org.postgresql.Driver"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="连接地址" required>
          <UiInput
            size="sm"
            v-model="sourceForm.jdbcUrl"
            placeholder="jdbc:postgresql://host:5432/db"
          />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="账户" required>
              <UiInput size="sm" v-model="sourceForm.username" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="密码" required>
              <PasswordInput v-model="sourceForm.password" size="sm" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="最大行数" required>
              <UiInputNumber
                size="sm"
                v-model="sourceForm.maxRowCount"
                :min="1"
                :max="1000000"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="查询超时（秒）" required>
              <UiInputNumber
                size="sm"
                v-model="sourceForm.queryTimeoutSeconds"
                :min="1"
                :max="3600"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="可拔取字段" required>
          <div class="external-pull__entry-list">
            <div
              v-for="(entry, index) in sourceFieldScopes"
              :key="entry.key"
              class="external-pull__entry-card"
            >
              <div class="external-pull__entry-header">
                <span class="external-pull__entry-title">字段 {{ index + 1 }}</span>
                <UiTextAction
                  tone="danger"
                  :disabled="sourceFieldScopes.length !== 1"
                  @click="sourceFieldScopes.splice(index, 1)"
                >
                  删除
                </UiTextAction>
              </div>
              <UiRow :gutter="12">
                <UiCol :span="6">
                  <UiInput size="sm" v-model="entry.sourceObjectName" placeholder="来源对象" />
                </UiCol>
                <UiCol :span="6">
                  <UiInput size="sm" v-model="entry.fieldName" placeholder="字段名" />
                </UiCol>
                <UiCol :span="6">
                  <UiInput size="sm" v-model="entry.fieldLabel" placeholder="展示名称" />
                </UiCol>
                <UiCol :span="6">
                  <UiInput size="sm" v-model="entry.fieldType" placeholder="字段类型" />
                </UiCol>
              </UiRow>
            </div>
          </div>
          <UiButton
            variant="outline"
            size="sm"
            class="external-pull__inline-action"
            @click="sourceFieldScopes.push(createSourceFieldScopeRow())"
          >
            新增字段
          </UiButton>
        </UiFormItem>
        <UiFormItem label="启用">
          <UiSwitch size="sm" v-model="sourceForm.enabled" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      v-model:open="taskCreateVisible"
      title="新建拔取任务"
      :width="860"
      :confirm-loading="taskCreating"
      :hide-footer="false"
      ok-text="提交任务"
      @ok="submitTask"
    >
      <UiForm layout="vertical" :model="taskForm">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="任务编码" required>
              <UiInput size="sm" v-model="taskForm.taskCode" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="任务名称" required>
              <UiInput size="sm" v-model="taskForm.taskName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="数据源" required>
          <UiSelect
            size="sm"
            v-model="taskForm.sourceId"
            :options="enabledSourceOptions"
            placeholder="仅显示已启用的数据源"
            @change="resetTaskRuleAfterSourceChange"
          />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="业务归属" required>
              <UiSelect
                size="sm"
                v-model="taskForm.businessAnchor"
                placeholder="选择业务归属"
                :options="BUSINESS_ANCHOR_OPTIONS"
                @change="handleTaskBusinessAnchorChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="归属对象" required>
              <TrainingPlanSelector
                v-if="taskForm.businessAnchor === 'TRAINING_PLAN'"
                :value="taskForm.businessId || null"
                placeholder="选择培养方案"
                @update:value="handleTaskBusinessObjectChange"
              />
              <CourseSelector
                v-else-if="taskForm.businessAnchor === 'QUALITY_COURSE'"
                :value="taskForm.businessId || null"
                placeholder="选择质量评价课程"
                @update:value="handleTaskBusinessObjectChange"
              />
              <template v-else-if="taskForm.businessAnchor === 'ASSESSMENT_ITEM'">
                <CourseSelector
                  :value="taskAssessmentCourseId || null"
                  placeholder="先选择质量评价课程"
                  @update:value="handleTaskAssessmentCourseChange"
                />
                <AssessmentItemSelector
                  :value="taskForm.businessId || null"
                  :quality-course-id="taskAssessmentCourseId || null"
                  placeholder="选择考核环节"
                  @update:value="handleTaskBusinessObjectChange"
                />
              </template>
              <AchievementResultSelector
                v-else-if="taskForm.businessAnchor === 'ACHIEVEMENT_RESULT'"
                :value="taskForm.businessId || null"
                placeholder="选择达成度结果"
                @update:value="handleTaskBusinessObjectChange"
              />
              <ReportSelector
                v-else-if="taskForm.businessAnchor === 'REPORT'"
                :value="taskForm.businessId || null"
                placeholder="选择质量报告"
                @update:value="handleTaskBusinessObjectChange"
              />
              <AuditIssueSelector
                v-else-if="taskForm.businessAnchor === 'AUDIT_ISSUE'"
                :value="taskForm.businessId || null"
                placeholder="选择审查问题"
                @update:value="handleTaskBusinessObjectChange"
              />
              <AuditRectificationSelector
                v-else-if="taskForm.businessAnchor === 'AUDIT_RECTIFICATION'"
                :value="taskForm.businessId || null"
                placeholder="选择整改任务"
                @update:value="handleTaskBusinessObjectChange"
              />
              <UiSelect v-else disabled placeholder="先选择业务归属" :options="[]" size="sm" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="来源对象" required>
          <UiSelect
            size="sm"
            v-model="taskForm.sourceObjectName"
            :options="sourceObjectOptions"
            placeholder="先选择数据源，再选择来源对象"
            :disabled="!taskForm.sourceId"
            @change="resetTaskRuleAfterObjectChange"
          />
        </UiFormItem>
        <UiFormItem label="返回字段" required>
          <UiSelect
            size="sm"
            v-model="taskSelectedFields"
            mode="multiple"
            :options="taskFieldOptions"
            placeholder="选择需要返回的字段"
            :disabled="!taskForm.sourceObjectName"
          />
        </UiFormItem>
        <UiFormItem label="筛选条件">
          <div class="external-pull__entry-list">
            <div
              v-for="(entry, index) in taskFilters"
              :key="entry.key"
              class="external-pull__entry-card"
            >
              <div class="external-pull__entry-header">
                <span class="external-pull__entry-title">条件 {{ index + 1 }}</span>
                <UiTextAction
                  tone="danger"
                  :disabled="taskFilters.length !== 1"
                  @click="taskFilters.splice(index, 1)"
                >
                  删除
                </UiTextAction>
              </div>
              <UiRow :gutter="12">
                <UiCol :span="8">
                  <UiSelect
                    size="sm"
                    v-model="entry.fieldName"
                    :options="taskFieldOptions"
                    placeholder="选择字段"
                    :disabled="!taskForm.sourceObjectName"
                  />
                </UiCol>
                <UiCol :span="6">
                  <UiSelect
                    size="sm"
                    v-model="entry.operator"
                    :options="EXTERNAL_PULL_FILTER_OPERATOR_OPTIONS"
                    @change="handleFilterOperatorChange(entry)"
                  />
                </UiCol>
                <UiCol :span="10">
                  <UiSelect
                    v-if="entry.operator === ExternalPullFilterOperatorCode.IN"
                    v-model="entry.multipleValues"
                    mode="tags"
                    size="sm"
                    placeholder="逐项录入筛选值"
                    :options="[]"
                  />
                  <UiInput v-else v-model="entry.singleValue" size="sm" placeholder="填写筛选值" />
                </UiCol>
              </UiRow>
            </div>
          </div>
          <UiButton
            variant="outline"
            size="sm"
            class="external-pull__inline-action"
            @click="taskFilters.push(createFilterRow())"
          >
            新增筛选条件
          </UiButton>
        </UiFormItem>
        <UiFormItem label="排序规则">
          <div class="external-pull__entry-list">
            <div
              v-for="(entry, index) in taskSorts"
              :key="entry.key"
              class="external-pull__entry-card external-pull__entry-card--compact"
            >
              <UiRow :gutter="12" class="external-pull__sort-row">
                <UiCol :span="10">
                  <UiSelect
                    size="sm"
                    v-model="entry.fieldName"
                    :options="taskFieldOptions"
                    placeholder="选择字段"
                    :disabled="!taskForm.sourceObjectName"
                  />
                </UiCol>
                <UiCol :span="8">
                  <UiSelect
                    size="sm"
                    v-model="entry.sortDirection"
                    :options="EXTERNAL_PULL_SORT_DIRECTION_OPTIONS"
                  />
                </UiCol>
                <UiCol :span="6">
                  <UiTextAction tone="danger" @click="taskSorts.splice(index, 1)">
                    删除
                  </UiTextAction>
                </UiCol>
              </UiRow>
            </div>
          </div>
          <UiButton
            variant="outline"
            size="sm"
            class="external-pull__inline-action"
            @click="taskSorts.push(createSortRow())"
          >
            新增排序规则
          </UiButton>
        </UiFormItem>
        <UiFormItem label="提取规则预览">
          <div v-if="taskRuleSummaryLines.length" class="external-pull__detail-block">
            <div
              v-for="line in taskRuleSummaryLines"
              :key="line"
              class="external-pull__detail-line"
            >
              {{ line }}
            </div>
          </div>
          <UiEmpty size="sm" description="暂无任务明细" class="external-pull__empty" />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="最大行数（可选）">
              <UiInputNumber
                size="sm"
                v-model="taskForm.maxRowCount"
                :min="1"
                :max="1000000"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="查询超时（秒，可选）">
              <UiInputNumber
                size="sm"
                v-model="taskForm.queryTimeoutSeconds"
                :min="1"
                :max="3600"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>
    </UiDrawer>

    <UiDrawer v-model:open="detailVisible" title="拔取任务详情" :width="860" :hide-footer="true">
      <template v-if="detailRecord">
        <UiDescriptions :column="2" size="small" bordered class="external-pull__detail-desc">
          <UiDescriptionsItem label="任务编码">
            {{ detailRecord.taskCode }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="状态">
            <UiTag :tone="taskStatusColor(detailRecord.status)" size="sm">
              {{ taskStatusLabel(detailRecord.status) }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="数据源">
            {{ detailRecord.sourceName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="来源对象">
            {{ detailRecord.sourceObjectName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="业务归属">
            {{ businessAnchorLabel(detailRecord.businessAnchor) }}
            <span> / {{ detailRecord.businessLabel }}</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="返回行数">
            {{
              Number.isFinite(detailRecord.returnRows)
                ? detailRecord.returnRows
                : detailRecord.status === ExternalPullTaskStatusCode.RUNNING
                  ? '执行中'
                  : detailRecord.status === ExternalPullTaskStatusCode.PENDING
                    ? '尚未执行'
                    : '未返回行数'
            }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="耗时">
            {{
              Number.isFinite(detailRecord.elapsedMs)
                ? `${detailRecord.elapsedMs} ms`
                : detailRecord.status === ExternalPullTaskStatusCode.RUNNING
                  ? '执行中'
                  : detailRecord.status === ExternalPullTaskStatusCode.PENDING
                    ? '尚未开始计时'
                    : '未返回耗时'
            }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="开始时间">
            {{
              detailRecord.startedTime
                || (detailRecord.status === ExternalPullTaskStatusCode.PENDING
                  ? '尚未开始执行'
                  : '缺失开始时间')
            }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="结束时间">
            {{
              detailRecord.finishedTime
                || (detailRecord.status === ExternalPullTaskStatusCode.RUNNING
                  ? '执行中'
                  : detailRecord.status === ExternalPullTaskStatusCode.PENDING
                    ? '尚未开始执行'
                    : '缺失结束时间')
            }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="detailRecord.failurePhase" label="失败阶段">
            {{ failurePhaseLabel(detailRecord.failurePhase) || '-' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="detailRecord.failureReason" label="处理说明" :span="2">
            <span class="external-pull__error-text">
              {{
                getUserProcessFailureMessage(
                  detailRecord.failureReason,
                  '外部成绩数据接入失败，请检查数据源配置、授权状态和返回字段设置',
                )
              }}
            </span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="提取规则" :span="2">
            <div class="external-pull__detail-grid">
              <div class="external-pull__detail-line">
                <strong>返回字段</strong>
                <span>
                  {{
                    detailRecord.fields?.length
                      ? detailRecord.fields.map((field) => field.fieldName).join('、')
                      : '-'
                  }}
                </span>
              </div>
              <div class="external-pull__detail-line">
                <strong>筛选条件</strong>
                <span v-if="detailRecord.filters?.length">
                  {{
                    detailRecord.filters
                      .map(
                        (filter) =>
                          `${filter.fieldName}${filterOperatorText(filter.filterOperator)}${filter.filterValue}`,
                      )
                      .join('；')
                  }}
                </span>
                <span v-else>无</span>
              </div>
              <div class="external-pull__detail-line">
                <strong>排序规则</strong>
                <span v-if="detailRecord.sorts?.length">
                  {{
                    detailRecord.sorts
                      .map(
                        (sort) =>
                          `${sort.fieldName}${sort.sortDirection === ExternalPullSortDirectionCode.ASC ? '升序' : '降序'}`,
                      )
                      .join('；')
                  }}
                </span>
                <span v-else>无</span>
              </div>
            </div>
          </UiDescriptionsItem>
        </UiDescriptions>

        <h4 class="external-pull__section-title">结果批次（可逐批确认 / 驳回）</h4>
        <UiEmpty
          v-if="!detailResults.length && !detailLoading"
          description="暂无字段映射预览"
          size="sm"
        />
        <UiDataTable
          v-else
          v-model:current="detailResultPageNum"
          v-model:page-size="detailResultPageSize"
          pagination-mode="server"
          :columns="detailResultColumns"
          :data-source="detailResults"
          :loading="detailLoading"
          :total="detailResultTotal"
          row-key="id"
          size="small"
          flat
          @page-change="handleDetailResultPageChange"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'resultBatch'">
              第 {{ detailResultBatchNo(index) }} 批
            </template>
            <template v-else-if="column.key === 'detailAnchor'">
              {{ businessAnchorLabel(record.businessAnchor) }}
              <span> / {{ record.businessLabel }}</span>
            </template>
            <template v-else-if="column.key === 'previewRows' || column.key === 'confirmedRows'">
              <template v-if="column.key === 'previewRows'">
                {{ record.previewRows }}
              </template>
              <template v-else>
                {{
                  Number.isFinite(record.confirmedRows)
                    ? record.confirmedRows
                    : record.confirmationStatus === ExternalPullConfirmationStatusCode.REJECTED
                      ? '已驳回'
                      : '尚未确认'
                }}
              </template>
            </template>
            <template v-else-if="column.key === 'confirmationStatus'">
              <UiTag :tone="confirmationStatusColor(record.confirmationStatus)" size="sm">
                {{ confirmationStatusLabel(record.confirmationStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildExternalPullResultActions(record)"
                split
                @action="(key) => handleExternalPullResultAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>

        <h4 class="external-pull__section-title">审计流水</h4>
        <UiEmpty
          v-if="!detailAudits.length && !detailLoading"
          description="暂无同步日志"
          size="sm"
        />
        <template v-else>
          <UiTimeline>
            <UiTimelineItem
              v-for="audit in detailAudits"
              :key="audit.id"
              :color="auditTimelineTone(audit)"
            >
              <p class="external-pull__audit-event">
                <strong>{{ auditEventLabel(audit.auditEvent) }}</strong>
              </p>
              <p v-if="audit.queryScopeStatus" class="external-pull__audit-line">
                查询范围：{{ auditCheckStatusLabel(audit.queryScopeStatus) }}
                <span v-if="audit.queryScopeDetail"> · {{ audit.queryScopeDetail }}</span>
              </p>
              <p v-if="audit.fieldScopeStatus" class="external-pull__audit-line">
                字段范围：{{ auditCheckStatusLabel(audit.fieldScopeStatus) }}
                <span v-if="audit.fieldScopeDetail"> · {{ audit.fieldScopeDetail }}</span>
              </p>
              <p v-if="audit.maskPreviewStatus" class="external-pull__audit-line">
                脱敏预览：{{ auditCheckStatusLabel(audit.maskPreviewStatus) }}
              </p>
              <p v-if="audit.auditDetail" class="external-pull__audit-detail">
                {{ audit.auditDetail }}
              </p>
              <p class="external-pull__sub-text">
                {{ audit.auditedTime }}
              </p>
            </UiTimelineItem>
          </UiTimeline>
          <UiPagination
            v-if="detailAuditTotal > detailAuditPageSize"
            class="external-pull__audit-pager"
            size="small"
            v-model:current="detailAuditPageNum"
            v-model:page-size="detailAuditPageSize"
            :total="detailAuditTotal"
            @change="
              (page: number, pageSize: number) =>
                handleDetailAuditPageChange({ current: page, pageSize })
            "
          />
        </template>
      </template>
    </UiDrawer>
  </QualityIngestPageShell>
</template>

<style scoped lang="scss">
.external-pull {
  &__config-status {
    margin-bottom: var(--dp-space-component);
  }

  &__gate-row {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__signals {
    margin-bottom: var(--dp-space-component-xs);
  }

  &__signals-secondary {
    margin-top: var(--dp-space-component-tight);
  }

  &__sync-hint {
    margin: 0 0 var(--dp-space-component-tight);
    color: var(--dp-text-secondary, #666);
    font-size: var(--dp-font-size-sm, 12px);
  }

  &__charts-fold {
    margin-bottom: var(--dp-space-component-tight);
  }

  &__charts-toggle {
    padding-inline: 0;
  }

  &__result-panel {
    margin-bottom: var(--dp-space-block);
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
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
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-meta {
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__entry-list {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  &__entry-card {
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);
    background: var(--dp-surface-subtle);

    &--compact {
      padding: var(--dp-space-component);
    }
  }

  &__sort-row {
    align-items: center;
  }

  &__entry-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component);
  }

  &__entry-title {
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__inline-action {
    margin-top: var(--dp-space-component);
  }

  &__detail-desc {
    margin-bottom: var(--dp-space-block);
  }

  &__section-title {
    margin: var(--dp-space-block) 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__error-text {
    color: var(--dp-error);
  }

  &__detail-block,
  &__detail-grid {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  &__detail-line {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-xs);
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    background: var(--dp-surface-subtle);
    border-radius: 6px;
    color: var(--dp-text-primary);
    line-height: 1.6;
    word-break: break-word;
  }

  &__audit-event {
    margin: 0 0 var(--dp-space-component-xs);
    color: var(--dp-text-primary);
  }

  &__audit-line {
    margin: 0 0 2px;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__audit-detail {
    margin: var(--dp-space-component-xs) 0;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
  }

  &__sub-text {
    margin: var(--dp-space-component-xs) 0 0;
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__audit-pager {
    margin-top: var(--dp-space-component);
    text-align: right;
  }
}
</style>
