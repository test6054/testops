<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ExternalDataSourceSaveRequest,
  ExternalDataSourceVO,
  ExternalPullAuditCheckStatus,
  ExternalPullAuditEvent,
  ExternalPullAuditVO,
  ExternalPullConfirmationStatus,
  ExternalPullFilterOperator,
  ExternalPullResultVO,
  ExternalPullSortDirection,
  ExternalPullTaskQueryRequest,
  ExternalPullTaskSaveRequest,
  ExternalPullTaskVO,
  ExternalSourceFieldScope,
  ExternalSourceType,
} from '@/apis/quality'
import type { SignalMetric, TaskResultItem } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  EXTERNAL_PULL_AUDIT_CHECK_STATUS_LABEL,
  EXTERNAL_PULL_AUDIT_EVENT_LABEL,
  EXTERNAL_PULL_CONFIRMATION_STATUS_COLOR,
  EXTERNAL_PULL_CONFIRMATION_STATUS_LABEL,
  EXTERNAL_PULL_TASK_STATUS_COLOR,
  EXTERNAL_PULL_TASK_STATUS_LABEL,
  EXTERNAL_PULL_TASK_STATUS_OPTIONS,
  EXTERNAL_SOURCE_TYPE_LABEL,
  EXTERNAL_SOURCE_TYPE_OPTIONS,
  externalDataSourceApi,
  externalPullAuditApi,
  externalPullResultApi,
  externalPullTaskApi,
} from '@/apis/quality'
import {
  AchievementResultSelector,
  AssessmentItemSelector,
  AuditIssueSelector,
  AuditRectificationSelector,
  CourseSelector,
  ReportSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell, TaskResultPanel } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { getUserProcessFailureMessage } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import { promptModal } from './_helpers'

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
  operator: ExternalPullFilterOperator
  singleValue: string
  multipleValues: string[]
}

interface PullSortEditorRow {
  key: string
  fieldName: string
  sortDirection: ExternalPullSortDirection
}

interface SelectOption {
  value: string
  label: string
}

interface ExternalDataSourceFormState {
  sourceCode: string
  sourceName: string
  sourceType: ExternalSourceType
  jdbcUrl: string
  username: string
  password: string
  driverClass: string
  maxRowCount: number
  queryTimeoutSeconds: number
  enabled: boolean
}

const sourceColumns: ColumnsType = [
  { title: '编码', dataIndex: 'sourceCode', key: 'sourceCode', width: 160 },
  { title: '名称', dataIndex: 'sourceName', key: 'sourceName' },
  { title: '数据库类型', dataIndex: 'sourceType', key: 'sourceType', width: 120 },
  { title: '驱动类', dataIndex: 'driverClass', key: 'driverClass', width: 200 },
  { title: '最大行数', dataIndex: 'maxRowCount', key: 'maxRowCount', width: 100 },
  { title: '超时（秒）', dataIndex: 'queryTimeoutSeconds', key: 'queryTimeoutSeconds', width: 100 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 100 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const taskColumns: ColumnsType = [
  { title: '任务编码', dataIndex: 'taskCode', key: 'taskCode', width: 160 },
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
  { title: '数据源', dataIndex: 'sourceName', key: 'sourceRef', width: 160 },
  { title: '来源对象', dataIndex: 'sourceObjectName', key: 'sourceObjectName', width: 180 },
  { title: '业务归属', dataIndex: 'businessAnchor', key: 'businessAnchor', width: 180 },
  { title: '返回行数', dataIndex: 'returnRows', key: 'returnRows', width: 100 },
  { title: '耗时（ms）', dataIndex: 'elapsedMs', key: 'elapsedMs', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const detailResultColumns: ColumnsType = [
  { title: '结果批次', key: 'resultBatch', width: 120 },
  { title: '业务归属', key: 'detailAnchor' },
  { title: '预览行数', dataIndex: 'previewRows', key: 'previewRows', width: 100 },
  { title: '确认行数', dataIndex: 'confirmedRows', key: 'confirmedRows', width: 100 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 110 },
  { title: '操作', key: 'actions', width: 180 },
]

const filterOperatorOptions: Array<{ value: ExternalPullFilterOperator, label: string }> = [
  { value: 'EQ', label: '等于' },
  { value: 'NE', label: '不等于' },
  { value: 'GT', label: '大于' },
  { value: 'GTE', label: '大于等于' },
  { value: 'LT', label: '小于' },
  { value: 'LTE', label: '小于等于' },
  { value: 'LIKE', label: '包含' },
  { value: 'IN', label: '属于多个值' },
]

const sortDirectionOptions: Array<{ value: ExternalPullSortDirection, label: string }> = [
  { value: 'ASC', label: '升序' },
  { value: 'DESC', label: '降序' },
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
  sourceType: 'POSTGRESQL',
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
const taskForm = reactive<ExternalPullTaskSaveRequest>({
  sourceId: '',
  taskCode: '',
  taskName: '',
  businessAnchor: '',
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

const sourceTypeOptions = EXTERNAL_SOURCE_TYPE_OPTIONS
const taskStatusOptions = EXTERNAL_PULL_TASK_STATUS_OPTIONS
const BUSINESS_ANCHOR_LABEL = {
  TRAINING_PLAN: '培养方案',
  QUALITY_COURSE: '质量评价课程',
  ASSESSMENT_ITEM: '考核环节',
  ACHIEVEMENT_RESULT: '达成度结果',
  REPORT: '质量报告',
  AUDIT_ISSUE: '审查问题',
  AUDIT_RECTIFICATION: '整改任务',
} as const

type BusinessAnchorCode = keyof typeof BUSINESS_ANCHOR_LABEL

const businessAnchorOptions = Object.entries(BUSINESS_ANCHOR_LABEL).map(([value, label]) => ({
  value,
  label,
}))

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
  const enabledSources = sources.value.filter((s) => s.enabled).length
  const runningTasks = tasks.value.filter((t) => t.status === 'RUNNING').length
  const failedTasks = tasks.value.filter((t) => t.status === 'FAILED').length
  const succeededTasks = tasks.value.filter((t) => t.status === 'SUCCEEDED').length
  return [
    { key: 'src-total', label: '数据源总数', value: sourceTotal.value, tone: 'blue' },
    {
      key: 'src-enabled',
      label: '已启用数据源',
      value: enabledSources,
      tone: enabledSources > 0 ? 'green' : 'gray',
    },
    { key: 'task-total', label: '本页任务', value: tasks.value.length, tone: 'blue' },
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
      && (item.operator === 'IN' ? item.multipleValues.length > 0 : Boolean(item.singleValue.trim())),
  )
  if (activeFilters.length) {
    lines.push(
      `筛选条件：${activeFilters
        .map((item) => {
          const valueText
            = item.operator === 'IN' ? item.multipleValues.join('、') : item.singleValue.trim()
          return `${item.fieldName}${filterOperatorText(item.operator)}${valueText}`
        })
        .join('；')}`,
    )
  }
  const activeSorts = taskSorts.value.filter((item) => item.fieldName)
  if (activeSorts.length) {
    lines.push(
      `排序规则：${activeSorts
        .map((item) => `${item.fieldName}${item.sortDirection === 'ASC' ? '升序' : '降序'}`)
        .join('；')}`,
    )
  }
  return lines
})

const pullResultItems = computed<TaskResultItem[]>(() => {
  return tasks.value
    .filter((t) => t.status === 'FAILED' || t.status === 'RUNNING')
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: `${t.taskCode} - ${t.taskName}`,
      statusLabel: taskStatusLabel(t.status),
      statusTone: t.status === 'FAILED' ? 'red' : 'blue',
      description:
        getUserProcessFailureMessage(
          t.failureReason,
          '外部成绩数据接入失败，请检查数据源配置、授权状态和返回字段设置',
        ) || (t.status === 'RUNNING' ? '任务执行中' : undefined),
      time: t.startedAt || undefined,
      actions: [{ key: 'detail', label: '详情' }],
    }))
})

function taskStatusLabel(value: ExternalPullTaskVO['status']): string {
  return strictEnumLabel(EXTERNAL_PULL_TASK_STATUS_LABEL, value, '外部拔取任务状态')
}

function taskStatusColor(value: ExternalPullTaskVO['status']): string {
  return strictEnumTone(EXTERNAL_PULL_TASK_STATUS_COLOR, value, '外部拔取任务状态')
}

function sourceTypeLabel(value: ExternalSourceType): string {
  return strictEnumLabel(EXTERNAL_SOURCE_TYPE_LABEL, value, '外部数据源类型')
}

function confirmationStatusLabel(value: ExternalPullConfirmationStatus): string {
  return strictEnumLabel(EXTERNAL_PULL_CONFIRMATION_STATUS_LABEL, value, '结果批次确认状态')
}

function confirmationStatusColor(value: ExternalPullConfirmationStatus): string {
  return strictEnumTone(EXTERNAL_PULL_CONFIRMATION_STATUS_COLOR, value, '结果批次确认状态')
}

function auditTone(status: ExternalPullAuditCheckStatus): string {
  if (status === 'PASSED') return 'green'
  if (status === 'REJECTED') return 'red'
  if (status === 'WARNING') return 'orange'
  return 'gray'
}

function auditTimelineTone(audit: ExternalPullAuditVO): string {
  if (audit.queryScopeStatus) return auditTone(audit.queryScopeStatus)
  if (audit.fieldScopeStatus) return auditTone(audit.fieldScopeStatus)
  return 'gray'
}

function auditEventLabel(value: ExternalPullAuditEvent): string {
  return strictEnumLabel(EXTERNAL_PULL_AUDIT_EVENT_LABEL, value, '外部拔取审计事件')
}

function auditCheckStatusLabel(value: ExternalPullAuditCheckStatus): string {
  return strictEnumLabel(EXTERNAL_PULL_AUDIT_CHECK_STATUS_LABEL, value, '外部拔取审计状态')
}

function filterOperatorText(operator: ExternalPullFilterOperator): string {
  const option = filterOperatorOptions.find((item) => item.value === operator)
  if (!option) return ' '
  return option.label
}

function businessAnchorLabel(value: string): string {
  return strictEnumLabel(BUSINESS_ANCHOR_LABEL, value as BusinessAnchorCode, '外部拔取业务归属')
}

function createSourceFieldScopeRow(scope?: ExternalSourceFieldScope): SourceFieldScopeEditorRow {
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
    operator: 'EQ',
    singleValue: '',
    multipleValues: [],
  }
}

function createSortRow(): PullSortEditorRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fieldName: '',
    sortDirection: 'ASC',
  }
}

function canCancelTask(status: ExternalPullTaskVO['status']): boolean {
  return status === 'PENDING' || status === 'RUNNING'
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
  taskForm.businessAnchor = typeof value === 'string' ? value : ''
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
  await Promise.all([loadSources(), loadTasks()])
}

async function loadSources() {
  sourceLoading.value = true
  try {
    const page = await externalDataSourceApi.page(sourceQuery)
    sources.value = readPageList(page, '外部数据源加载失败，请稍后重试')
    sourceTotal.value = readPageTotal(page, '外部数据源加载失败，请稍后重试')
  } finally {
    sourceLoading.value = false
  }
}

async function loadTasks() {
  taskLoading.value = true
  try {
    const page = await externalPullTaskApi.page({
      ...taskQuery,
      sourceId: taskQuery.sourceId || undefined,
      status: taskQuery.status || undefined,
      businessAnchor: taskQuery.businessAnchor?.trim() || undefined,
    })
    tasks.value = readPageList(page, '外部拉取任务加载失败，请稍后重试')
    taskTotal.value = readPageTotal(page, '外部拉取任务加载失败，请稍后重试')
  } finally {
    taskLoading.value = false
  }
}

function openSourceCreate() {
  sourceEditorMode.value = 'create'
  sourceEditingId.value = undefined
  sourceFieldScopes.value = [createSourceFieldScopeRow()]
  Object.assign(sourceForm, {
    sourceCode: '',
    sourceName: '',
    sourceType: 'POSTGRESQL',
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
  const fieldScopes: ExternalSourceFieldScope[] = []
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
  await externalDataSourceApi.toggleEnabled(record.id, !record.enabled)
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
    businessAnchor: '',
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
    || !taskForm.businessAnchor.trim()
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
      = row.operator === 'IN' ? row.multipleValues.length > 0 : Boolean(row.singleValue.trim())
    if (!row.fieldName && !hasValue) continue
    if (!row.fieldName || !hasValue) {
      message.error(`筛选条件 ${index + 1} 需要同时选择字段并填写取值`)
      return
    }
    if (row.operator === 'IN') {
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
      businessAnchor: taskForm.businessAnchor.trim(),
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
  const reason = await promptModal({
    title: `取消拔取任务 ${record.taskCode}`,
    placeholder: '请填写取消原因',
    required: true,
    okType: 'danger',
    emptyErrorMessage: '请填写取消原因',
  })
  if (!reason) return
  await externalPullTaskApi.cancel(record.id, reason)
  message.success('已取消')
  await loadTasks()
}

async function confirmResult(result: ExternalPullResultVO) {
  const confirmedRows = result.previewRows
  if (confirmedRows === null || confirmedRows === undefined) {
    throw new Error('结果批次尚未生成预览数据，不能确认')
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
  const reason = await promptModal({
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
    const [results, audits] = await Promise.all([
      externalPullResultApi.listByTask(taskId),
      externalPullAuditApi.listByTask(taskId),
    ])
    detailResults.value = results
    detailAudits.value = audits
  } finally {
    detailLoading.value = false
  }
}

function handlePullResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = tasks.value.find((t) => t.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') openDetail(record)
}

onMounted(async () => {
  await Promise.all([loadSources(), loadTasks()])
})
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="external-pull__signals" />

    <TaskResultPanel
      v-if="pullResultItems.length > 0"
      title="待关注任务"
      :items="pullResultItems"
      class="external-pull__result-panel"
      @action="handlePullResultAction"
    />

    <a-card :bordered="false" class="detail-table-card external-pull__source-card">
      <template #title>
        外部只读数据源
        <span class="external-pull__panel-meta">{{ sourceTotal }} 个</span>
      </template>

      <div class="filter-card">
        <a-form layout="inline" class="filter-form filter-form--toolbar">
          <a-form-item class="filter-form__actions">
            <a-space class="filter-form__action-group">
              <span class="op-link" role="button" @click="reloadAll">刷新</span>
              <UiButton variant="outline" size="sm" @click="openSourceCreate">新建数据源</UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <UiEmpty
        v-if="!sources.length && !sourceLoading"
        description="尚未配置任何外部只读数据源；请先新建数据源以便创建拔取任务"
        size="sm"
      />
      <UiDataTable class="student-detail-table__data-table"
                   v-else
        :columns="sourceColumns"
        :data-source="sources"
        :loading="sourceLoading"
        row-key="id"
        size="small"
        :show-pagination="false"
        flat
        :total="sources.length"
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
            <a-tag :color="record.enabled ? 'green' : 'default'">
              {{ record.enabled ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'"><div class="operations-cell" @click.stop>
<span class="op-link" role="button" @click="openSourceEdit(record)">编辑</span>
              <span class="op-link" role="button" @click="toggleSourceEnabled(record)">{{ record.enabled ? '停用' : '启用' }}</span>
              <span class="op-link danger" role="button" @click="deleteSource(record)">删除</span>
            </div></template>
        </template>
      </UiDataTable>
    </a-card>

    <a-card :bordered="false" class="detail-table-card external-pull__task-card">
      <template #title>拔取任务</template>

      <div class="filter-card">
        <a-form layout="inline" class="filter-form filter-form--toolbar" @submit.prevent="loadTasks">
          <a-form-item label="数据源">
            <a-select
              v-model:value="taskQuery.sourceId"
              placeholder="按数据源筛选"
              style="width: 200px"
              allow-clear
              :options="sources.map((s) => ({ value: s.id, label: s.sourceName }))"
            />
          </a-form-item>
          <a-form-item label="状态">
            <a-select
              v-model:value="taskQuery.status"
              placeholder="状态"
              style="width: 120px"
              allow-clear
              :options="taskStatusOptions"
            />
          </a-form-item>
          <a-form-item label="业务归属">
            <a-select
              v-model:value="taskQuery.businessAnchor"
              placeholder="业务归属"
              style="width: 160px"
              allow-clear
              :options="businessAnchorOptions"
            />
          </a-form-item>
          <a-form-item class="filter-form__actions">
            <a-space class="filter-form__action-group">
              <UiButton size="sm" :loading="taskLoading" @click="loadTasks">查询</UiButton>
              <UiButton
                size="sm"
                :disabled="!sources.some((s) => s.enabled)"
                @click="openTaskCreate"
              >
                新建拔取任务
              </UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <UiEmpty
        v-if="!tasks.length && !taskLoading"
        description="当前筛选条件下无拔取任务；请新建拔取任务或调整筛选"
        size="sm"
      />
      <UiDataTable class="student-detail-table__data-table"
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
                  : record.status === 'RUNNING'
                    ? '执行中'
                    : record.status === 'PENDING'
                      ? '尚未执行'
                      : '未返回行数'
              }}
            </template>
            <template v-else>
              {{
                Number.isFinite(record.elapsedMs)
                  ? `${record.elapsedMs} ms`
                  : record.status === 'RUNNING'
                    ? '执行中'
                    : record.status === 'PENDING'
                      ? '尚未开始计时'
                      : '未返回耗时'
              }}
            </template>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="taskStatusColor(record.status)">
              {{ taskStatusLabel(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'"><div class="operations-cell" @click.stop>
<span class="op-link" role="button" @click="openDetail(record)">详情</span>
              <span class="op-link danger" role="button" v-if="canCancelTask(record.status)" @click="cancelTask(record)">取消</span>
            </div></template>
        </template>
      </UiDataTable>
    </a-card>

    <UiDrawer
      v-model:open="sourceEditorVisible"
      :title="sourceEditorMode === 'create' ? '新建数据源' : `编辑数据源 ${sourceForm.sourceCode}`"
      :width="860"
      :confirm-loading="sourceEditing"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitSource"
    >
      <a-alert
        v-if="sourceEditorMode === 'edit'"
        type="warning"
        show-icon
        message="编辑模式必须重新输入连接地址 / 账号 / 密码"
        description="服务端不下行明文凭证，保存时连接地址 / 账号 / 密码会覆盖原有密文。其他字段默认以当前值为准。"
        class="external-pull__editor-alert"
      />
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
              <a-select v-model:value="sourceForm.sourceType" :options="sourceTypeOptions" />
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
                <span class="op-link danger" role="button" :class="{ 'is-disabled': !(sourceFieldScopes.length === 1) }" @click="sourceFieldScopes.length === 1 && (sourceFieldScopes.splice(index, 1))">删除</span>
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
                :options="businessAnchorOptions"
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
                <span class="op-link danger" role="button" :class="{ 'is-disabled': !(taskFilters.length === 1) }" @click="taskFilters.length === 1 && (taskFilters.splice(index, 1))">删除</span>
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
                    :options="filterOperatorOptions"
                    @change="handleFilterOperatorChange(entry)"
                  />
                </a-col>
                <a-col :span="10">
                  <a-select
                    v-if="entry.operator === 'IN'"
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
                  <a-select v-model:value="entry.sortDirection" :options="sortDirectionOptions" />
                </a-col>
                <a-col :span="6">
                  <span class="op-link danger" role="button" @click="taskSorts.splice(index, 1)">删除</span>
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
          <UiEmpty
            v-else
            description="选择来源对象和返回字段后展示提取规则预览"
            class="external-pull__empty"
          />
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
            <a-tag :color="taskStatusColor(detailRecord.status)">
              {{ taskStatusLabel(detailRecord.status) }}
            </a-tag>
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
                : detailRecord.status === 'RUNNING'
                  ? '执行中'
                  : detailRecord.status === 'PENDING'
                    ? '尚未执行'
                    : '未返回行数'
            }}
          </a-descriptions-item>
          <a-descriptions-item label="耗时">
            {{
              Number.isFinite(detailRecord.elapsedMs)
                ? `${detailRecord.elapsedMs} ms`
                : detailRecord.status === 'RUNNING'
                  ? '执行中'
                  : detailRecord.status === 'PENDING'
                    ? '尚未开始计时'
                    : '未返回耗时'
            }}
          </a-descriptions-item>
          <a-descriptions-item label="开始时间">
            {{
              detailRecord.startedAt
                || (detailRecord.status === 'PENDING' ? '尚未开始执行' : '缺失开始时间')
            }}
          </a-descriptions-item>
          <a-descriptions-item label="结束时间">
            {{
              detailRecord.finishedAt
                || (detailRecord.status === 'RUNNING'
                  ? '执行中'
                  : detailRecord.status === 'PENDING'
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
                <span>{{ detailRecord.fields.map((field) => field.fieldName).join('、') }}</span>
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
                          `${sort.fieldName}${sort.sortDirection === 'ASC' ? '升序' : '降序'}`,
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
          description="任务暂未生成结果批次；任务执行成功后会出现预览状态的批次"
          size="sm"
        />
        <UiDataTable class="student-detail-table__data-table"
          v-else
          :columns="detailResultColumns"
          :data-source="detailResults"
          :loading="detailLoading"
          :show-pagination="false"
          row-key="id"
          size="small"
          flat
          :total="detailResults.length"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'resultBatch'"> 第 {{ index + 1 }} 批 </template>
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
                    : record.confirmationStatus === 'REJECTED'
                      ? '已驳回'
                      : '尚未确认'
                }}
              </template>
            </template>
            <template v-else-if="column.key === 'confirmationStatus'">
              <a-tag :color="confirmationStatusColor(record.confirmationStatus)">
                {{ confirmationStatusLabel(record.confirmationStatus) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'"><div class="operations-cell" @click.stop>
<span
                  v-if="record.confirmationStatus === 'PREVIEW'"
                  class="op-link primary"
                  role="button"
                  @click="confirmResult(record)"
                >
                  确认
                </span>
                <span class="op-link danger" role="button" v-if="record.confirmationStatus === 'PREVIEW'" @click="rejectResult(record)">驳回</span>
            </div></template>
          </template>
        </UiDataTable>

        <h4 class="external-pull__section-title">审计流水</h4>
        <UiEmpty
          v-if="!detailAudits.length && !detailLoading"
          description="任务暂无审计流水"
          size="sm"
        />
        <a-timeline v-else>
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
              {{ audit.auditedAt }}
            </p>
          </a-timeline-item>
        </a-timeline>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.external-pull {
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
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-meta {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 160px;

    &--lg {
      width: 220px;
    }
  }

  &__editor-alert {
    margin-bottom: 12px;
  }

  &__entry-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__entry-card {
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 12px;
    background: var(--dp-surface-subtle, #f8fafc);

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
    color: var(--dp-text-primary, #0f172a);
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
    color: var(--dp-text-primary, #0f172a);
  }

  &__error-text {
    color: var(--ant-color-error, #dc2626);
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
    background: var(--dp-surface-subtle, #f8fafc);
    border-radius: 6px;
    color: var(--dp-text-primary, #0f172a);
    line-height: 1.6;
    word-break: break-word;
  }

  &__audit-event {
    margin: 0 0 4px;
    color: var(--dp-text-primary, #0f172a);
  }

  &__audit-line {
    margin: 0 0 2px;
    font-size: 13px;
    color: var(--dp-text-secondary, #475569);
  }

  &__audit-detail {
    margin: 4px 0;
    color: var(--dp-text-secondary, #475569);
    font-size: 13px;
  }

  &__sub-text {
    margin: 4px 0 0;
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }
}
</style>
