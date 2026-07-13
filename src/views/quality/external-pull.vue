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
import { message } from 'ant-design-vue'
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
  ExternalPullTaskStatusCode,
  ExternalPullTaskStatusDescription,
  ExternalSourceTypeCode,
  ExternalSourceTypeDescription,
} from '@/apis/quality/types'
import { workbenchApi } from '@/apis/quality/workbench'
import QualityIngestPageShell from '@/components/quality/QualityIngestPageShell.vue'
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
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePolling } from '@/composables/usePolling'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
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
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
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

const tasks = ref<ExternalPullTaskVO[]>([])
const taskTotal = ref(0)
const taskLoading = ref(false)
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

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const enabledSources = summary.sourceEnabledCount ?? 0
  const runningTasks = summary.taskRunningCount ?? 0
  const failedTasks = summary.taskFailedCount ?? 0
  const succeededTasks = summary.taskSucceededCount ?? 0
  return [
    { key: 'src-total', label: '数据源总数', value: summary.sourceTotalCount ?? 0, tone: 'blue' },
    {
      key: 'src-enabled',
      label: '已启用数据源',
      value: enabledSources,
      tone: enabledSources > 0 ? 'green' : 'gray',
    },
    { key: 'task-total', label: '任务总数', value: summary.taskTotalCount ?? 0, tone: 'blue' },
    {
      key: 'task-running',
      label: '运行中',
      value: runningTasks,
      tone: runningTasks > 0 ? 'orange' : 'gray',
    },
    {
      key: 'task-success',
      label: '已成功',
      value: succeededTasks,
      tone: succeededTasks > 0 ? 'green' : 'gray',
    },
    {
      key: 'task-failed',
      label: '失败',
      value: failedTasks,
      tone: failedTasks > 0 ? 'red' : 'gray',
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
    .map((t) => ({
      id: t.id,
      title: `${t.taskCode} - ${t.taskName}`,
      statusLabel: taskStatusLabel(t.status),
      statusTone: t.status === ExternalPullTaskStatusCode.FAILED ? 'red' : 'blue',
      description:
        getUserProcessFailureMessage(
          t.failureReason,
          '外部成绩数据接入失败，请检查数据源配置、授权状态和返回字段设置',
        ) || (t.status === ExternalPullTaskStatusCode.RUNNING ? '任务执行中' : undefined),
      time: t.startedTime || undefined,
      actions: [{ key: 'detail', label: '详情' }],
    }))
})

function taskStatusLabel(value: ExternalPullTaskVO['status']): string {
  return strictEnumLabel(ExternalPullTaskStatusDescription, value, '外部拔取任务状态')
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
    message.error('业务归属选择无效，请重新选择')
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
  } catch (error) {
    signalSummary.value = null
    showUserError(error, '外部拉取指标加载失败')
  }
}

useQualityScopedLoader(reloadAll, { watchScope: true, immediate: false })

async function loadSources() {
  const scope = beginQualityScopeRequest()
  sourceLoading.value = true
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
    }
  } catch (error) {
    if (!scope.isStale()) {
      showUserError(error, '外部数据源加载失败')
      sources.value = []
      sourceTotal.value = 0
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
    taskPolling.syncPolling()
  } finally {
    if (!scope.isStale()) {
      taskLoading.value = false
    }
  }
}

const taskPolling = usePolling(() => loadTasksQuietly(), {
  getOptions: () => ({
    intervalMs: 3000,
    when: tasks.value.some(
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
    taskPolling.syncPolling()
  } catch {
    // 轮询刷新失败时不打断当前页面操作
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
    message.error('请填写编码 / 名称 / 连接地址')
    return
  }
  if (!sourceForm.username.trim() || !sourceForm.password) {
    message.error('账户与密码不能为空（保存时加密）')
    return
  }
  if (!sourceForm.driverClass.trim()) {
    message.error('请填写驱动类')
    return
  }

  const seen = new Set<string>()
  const fieldScopes: ExternalSourceFieldScopeRequest[] = []
  for (let index = 0; index < sourceFieldScopes.value.length; index += 1) {
    const row = sourceFieldScopes.value[index]
    const sourceObjectName = row.sourceObjectName.trim()
    const fieldName = row.fieldName.trim()
    if (!sourceObjectName || !fieldName) {
      message.error(`字段范围 ${index + 1} 需要填写来源对象和字段名`)
      return
    }
    const duplicateKey = `${sourceObjectName}#${fieldName}`
    if (seen.has(duplicateKey)) {
      message.error(`字段范围重复：${sourceObjectName}.${fieldName}`)
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
    message.error('请至少登记一个可拔取字段')
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
      message.success('数据源已创建')
    } else {
      await externalDataSourceApi.update(request)
      message.success('数据源已更新')
    }
    sourceEditorVisible.value = false
    await loadSources()
  } finally {
    sourceEditing.value = false
  }
}

async function toggleSourceEnabled(record: ExternalDataSourceVO) {
  await externalDataSourceApi.toggleEnabled({ id: record.id, enabled: !record.enabled })
  message.success('已切换状态')
  await loadSources()
}

async function deleteSource(record: ExternalDataSourceVO) {
  void confirmAsync({
    title: `删除数据源 ${record.sourceCode}？`,
    type: 'error',
    onOk: async () => {
      await externalDataSourceApi.delete(record.id)
      message.success('已删除')
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
    message.error('请填写任务编码、名称，选择数据源，并补全业务归属和来源对象')
    return
  }
  if (!taskSelectedFields.value.length) {
    message.error('请至少选择一个返回字段')
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
      message.error(`筛选条件 ${index + 1} 需要同时选择字段并填写取值`)
      return
    }
    if (row.operator === ExternalPullFilterOperatorCode.IN) {
      const values = row.multipleValues.map((value) => value.trim()).filter(Boolean)
      if (!values.length) {
        message.error(`筛选条件 ${index + 1} 至少填写一个取值`)
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
    message.success('任务已提交，等待调度器执行')
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
  message.success('已取消')
  await loadTasks()
}

async function confirmResult(result: ExternalPullResultVO) {
  const confirmedRows = result.previewRows
  if (confirmedRows === null || confirmedRows === undefined) {
    showUserError(null, '结果批次尚未生成预览数据，不能确认')
    return
  }
  if (confirmedRows <= 0) {
    message.warning('预览行数为 0，无法确认导入')
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
      message.success('已确认')
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
  message.success('已驳回')
  if (detailRecord.value) await reloadDetail(detailRecord.value.id)
}

async function openDetail(record: ExternalPullTaskVO) {
  detailVisible.value = true
  detailRecord.value = await externalPullTaskApi.detail(record.id)
  await reloadDetail(record.id)
}

async function reloadDetail(taskId: string) {
  detailLoading.value = true
  try {
    detailResultPageNum.value = 1
    detailAuditPageNum.value = 1
    await Promise.all([loadDetailAudits(taskId), loadDetailResults(taskId)])
  } finally {
    detailLoading.value = false
  }
}

async function loadDetailAudits(taskId: string) {
  const page = await externalPullAuditApi.page({
    pullTaskId: taskId,
    pageNum: detailAuditPageNum.value,
    pageSize: detailAuditPageSize.value,
  })
  detailAudits.value = page.list
  detailAuditTotal.value = page.total
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
  const result = await externalPullResultApi.pageByTask({
    pullTaskId: taskId,
    pageNum: detailResultPageNum.value,
    pageSize: detailResultPageSize.value,
  })
  detailResults.value = result.list
  detailResultTotal.value = result.total
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
    <SignalBand :metrics="signals" compact class="external-pull__signals" />

    <TaskResultPanel
      v-if="pullResultItems.length > 0"
      title="待关注任务"
      :items="pullResultItems"
      class="external-pull__result-panel"
      @action="handlePullResultAction"
    />

    <UiCard class="detail-table-card external-pull__source-card">
      <template #title>
        外部只读数据源
        <span class="external-pull__panel-meta">{{ sourceTotal }} 个</span>
      </template>
      <template #extra>
        <a-space>
          <UiTextAction @click="reloadAll">刷新</UiTextAction>
          <UiButton variant="outline" size="sm" @click="openSourceCreate">新建数据源</UiButton>
        </a-space>
      </template>

      <UiEmpty
        v-if="!sources.length && !sourceLoading"
        description="当前没有可展示的内容"
        size="sm"
      />
      <UiDataTable
        v-model:current="sourceQuery.pageNum"
        v-model:page-size="sourceQuery.pageSize"
        pagination-mode="server"
        v-else
        :columns="sourceColumns"
        :data-source="sources"
        :loading="sourceLoading"
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
        <UiButton size="sm" :disabled="!sources.some((s) => s.enabled)" @click="openTaskCreate">
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

      <UiEmpty v-if="!tasks.length && !taskLoading" description="当前没有可展示的内容" size="sm" />
      <UiDataTable
        v-else
        v-model:current="taskQuery.pageNum"
        v-model:page-size="taskQuery.pageSize"
        :columns="taskColumns"
        :data-source="tasks"
        :loading="taskLoading"
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
      <a-form layout="vertical" :model="sourceForm">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="数据源编码" required>
              <a-input v-model:value="sourceForm.sourceCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="名称" required>
              <a-input v-model:value="sourceForm.sourceName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="数据库类型" required>
              <a-select v-model:value="sourceForm.sourceType" :options="EXTERNAL_SOURCE_TYPE_OPTIONS" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="驱动类全名" required>
              <a-input v-model:value="sourceForm.driverClass" placeholder="org.postgresql.Driver" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="连接地址" required>
          <a-input
            v-model:value="sourceForm.jdbcUrl"
            placeholder="jdbc:postgresql://host:5432/db"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="账户" required>
              <a-input v-model:value="sourceForm.username" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="密码" required>
              <a-input-password v-model:value="sourceForm.password" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="最大行数" required>
              <a-input-number
                v-model:value="sourceForm.maxRowCount"
                :min="1"
                :max="1000000"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="查询超时（秒）" required>
              <a-input-number
                v-model:value="sourceForm.queryTimeoutSeconds"
                :min="1"
                :max="3600"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="可拔取字段" required>
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
              <a-row :gutter="12">
                <a-col :span="6">
                  <a-input v-model:value="entry.sourceObjectName" placeholder="来源对象" />
                </a-col>
                <a-col :span="6">
                  <a-input v-model:value="entry.fieldName" placeholder="字段名" />
                </a-col>
                <a-col :span="6">
                  <a-input v-model:value="entry.fieldLabel" placeholder="展示名称" />
                </a-col>
                <a-col :span="6">
                  <a-input v-model:value="entry.fieldType" placeholder="字段类型" />
                </a-col>
              </a-row>
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
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model:checked="sourceForm.enabled" />
        </a-form-item>
      </a-form>
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
      <a-form layout="vertical" :model="taskForm">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="任务编码" required>
              <a-input v-model:value="taskForm.taskCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="任务名称" required>
              <a-input v-model:value="taskForm.taskName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="数据源" required>
          <a-select
            v-model:value="taskForm.sourceId"
            :options="enabledSourceOptions"
            placeholder="仅显示已启用的数据源"
            @change="resetTaskRuleAfterSourceChange"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="业务归属" required>
              <a-select
                v-model:value="taskForm.businessAnchor"
                placeholder="选择业务归属"
                :options="BUSINESS_ANCHOR_OPTIONS"
                @change="handleTaskBusinessAnchorChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归属对象" required>
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
              <a-select v-else disabled placeholder="先选择业务归属" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="来源对象" required>
          <a-select
            v-model:value="taskForm.sourceObjectName"
            :options="sourceObjectOptions"
            placeholder="先选择数据源，再选择来源对象"
            :disabled="!taskForm.sourceId"
            @change="resetTaskRuleAfterObjectChange"
          />
        </a-form-item>
        <a-form-item label="返回字段" required>
          <a-select
            v-model:value="taskSelectedFields"
            mode="multiple"
            :options="taskFieldOptions"
            placeholder="选择需要返回的字段"
            :disabled="!taskForm.sourceObjectName"
          />
        </a-form-item>
        <a-form-item label="筛选条件">
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
              <a-row :gutter="12">
                <a-col :span="8">
                  <a-select
                    v-model:value="entry.fieldName"
                    :options="taskFieldOptions"
                    placeholder="选择字段"
                    :disabled="!taskForm.sourceObjectName"
                  />
                </a-col>
                <a-col :span="6">
                  <a-select
                    v-model:value="entry.operator"
                    :options="EXTERNAL_PULL_FILTER_OPERATOR_OPTIONS"
                    @change="handleFilterOperatorChange(entry)"
                  />
                </a-col>
                <a-col :span="10">
                  <a-select
                    v-if="entry.operator === ExternalPullFilterOperatorCode.IN"
                    v-model:value="entry.multipleValues"
                    mode="tags"
                    placeholder="逐项录入筛选值"
                  />
                  <a-input v-else v-model:value="entry.singleValue" placeholder="填写筛选值" />
                </a-col>
              </a-row>
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
        </a-form-item>
        <a-form-item label="排序规则">
          <div class="external-pull__entry-list">
            <div
              v-for="(entry, index) in taskSorts"
              :key="entry.key"
              class="external-pull__entry-card external-pull__entry-card--compact"
            >
              <a-row :gutter="12" align="middle">
                <a-col :span="10">
                  <a-select
                    v-model:value="entry.fieldName"
                    :options="taskFieldOptions"
                    placeholder="选择字段"
                    :disabled="!taskForm.sourceObjectName"
                  />
                </a-col>
                <a-col :span="8">
                  <a-select v-model:value="entry.sortDirection" :options="EXTERNAL_PULL_SORT_DIRECTION_OPTIONS" />
                </a-col>
                <a-col :span="6">
                  <UiTextAction tone="danger" @click="taskSorts.splice(index, 1)">
                    删除
                  </UiTextAction>
                </a-col>
              </a-row>
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
        </a-form-item>
        <a-form-item label="提取规则预览">
          <div v-if="taskRuleSummaryLines.length" class="external-pull__detail-block">
            <div
              v-for="line in taskRuleSummaryLines"
              :key="line"
              class="external-pull__detail-line"
            >
              {{ line }}
            </div>
          </div>
          <UiEmpty description="当前没有可展示的内容" class="external-pull__empty" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="最大行数（可选）">
              <a-input-number
                v-model:value="taskForm.maxRowCount"
                :min="1"
                :max="1000000"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="查询超时（秒，可选）">
              <a-input-number
                v-model:value="taskForm.queryTimeoutSeconds"
                :min="1"
                :max="3600"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </UiDrawer>

    <UiDrawer v-model:open="detailVisible" title="拔取任务详情" :width="860" :hide-footer="true">
      <template v-if="detailRecord">
        <a-descriptions :column="2" size="small" bordered class="external-pull__detail-desc">
          <a-descriptions-item label="任务编码">
            {{ detailRecord.taskCode }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <UiTag :tone="taskStatusColor(detailRecord.status)" size="sm">
              {{ taskStatusLabel(detailRecord.status) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="数据源">
            {{ detailRecord.sourceName }}
          </a-descriptions-item>
          <a-descriptions-item label="来源对象">
            {{ detailRecord.sourceObjectName }}
          </a-descriptions-item>
          <a-descriptions-item label="业务归属">
            {{ businessAnchorLabel(detailRecord.businessAnchor) }}
            <span> / {{ detailRecord.businessLabel }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="返回行数">
            {{
              Number.isFinite(detailRecord.returnRows)
                ? detailRecord.returnRows
                : detailRecord.status === ExternalPullTaskStatusCode.RUNNING
                  ? '执行中'
                  : detailRecord.status === ExternalPullTaskStatusCode.PENDING
                    ? '尚未执行'
                    : '未返回行数'
            }}
          </a-descriptions-item>
          <a-descriptions-item label="耗时">
            {{
              Number.isFinite(detailRecord.elapsedMs)
                ? `${detailRecord.elapsedMs} ms`
                : detailRecord.status === ExternalPullTaskStatusCode.RUNNING
                  ? '执行中'
                  : detailRecord.status === ExternalPullTaskStatusCode.PENDING
                    ? '尚未开始计时'
                    : '未返回耗时'
            }}
          </a-descriptions-item>
          <a-descriptions-item label="开始时间">
            {{
              detailRecord.startedTime
                || (detailRecord.status === ExternalPullTaskStatusCode.PENDING
                  ? '尚未开始执行'
                  : '缺失开始时间')
            }}
          </a-descriptions-item>
          <a-descriptions-item label="结束时间">
            {{
              detailRecord.finishedTime
                || (detailRecord.status === ExternalPullTaskStatusCode.RUNNING
                  ? '执行中'
                  : detailRecord.status === ExternalPullTaskStatusCode.PENDING
                    ? '尚未开始执行'
                    : '缺失结束时间')
            }}
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.failureReason" label="处理说明" :span="2">
            <span class="external-pull__error-text">
              {{
                getUserProcessFailureMessage(
                  detailRecord.failureReason,
                  '外部成绩数据接入失败，请检查数据源配置、授权状态和返回字段设置',
                )
              }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="提取规则" :span="2">
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
          </a-descriptions-item>
        </a-descriptions>

        <h4 class="external-pull__section-title">结果批次（可逐批确认 / 驳回）</h4>
        <UiEmpty
          v-if="!detailResults.length && !detailLoading"
          description="当前没有可展示的内容"
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
          description="当前没有可展示的内容"
          size="sm"
        />
        <template v-else>
          <a-timeline>
            <a-timeline-item
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
            </a-timeline-item>
          </a-timeline>
          <a-pagination
            v-if="detailAuditTotal > detailAuditPageSize"
            class="external-pull__audit-pager"
            size="small"
            :current="detailAuditPageNum"
            :page-size="detailAuditPageSize"
            :total="detailAuditTotal"
            show-size-changer
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
  &__signals {
    margin-bottom: 12px;
  }

  &__result-panel {
    margin-bottom: 16px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
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
    color: var(--dp-text-primary);
  }

  &__panel-meta {
    color: var(--dp-text-muted);
    font-size: 12px;
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__entry-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__entry-card {
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 12px;
    background: var(--dp-surface-subtle);

    &--compact {
      padding: 10px 12px;
    }
  }

  &__entry-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__entry-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__inline-action {
    margin-top: 12px;
  }

  &__detail-desc {
    margin-bottom: 16px;
  }

  &__section-title {
    margin: 16px 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__error-text {
    color: var(--ant-color-error);
  }

  &__detail-block,
  &__detail-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__detail-line {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    background: var(--dp-surface-subtle);
    border-radius: 6px;
    color: var(--dp-text-primary);
    line-height: 1.6;
    word-break: break-word;
  }

  &__audit-event {
    margin: 0 0 4px;
    color: var(--dp-text-primary);
  }

  &__audit-line {
    margin: 0 0 2px;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__audit-detail {
    margin: 4px 0;
    color: var(--dp-text-secondary);
    font-size: 13px;
  }

  &__sub-text {
    margin: 4px 0 0;
    color: var(--dp-text-muted);
    font-size: 12px;
  }

  &__audit-pager {
    margin-top: 12px;
    text-align: right;
  }
}
</style>
