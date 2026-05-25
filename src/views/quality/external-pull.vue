<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 外部数据拔取中心
 *
 * 后端契约（ExternalPullTaskController + ExternalDataSourceController + ExternalPullResultController + ExternalPullAuditController）：
 * 1. 维护只读数据源：jdbcUrl / username / password 以明文请求字段提交，后端 AES-256-GCM 加密保存，VO 只返回配置状态。
 * 2. 创建拔取任务：仅允许 SELECT 语句，受 SqlGuard 与 fieldWhitelist 拦截。
 * 3. 调度器执行：状态机 PENDING -> RUNNING -> SUCCEEDED / FAILED / CANCELLED。
 * 4. 结果批次 confirmationStatus PREVIEW -> CONFIRMED / REJECTED（人工确认或驳回）。
 * 5. 审计记录写 t_quality_external_pull_audit，记录 SQL 安全 / 白名单 / 脱敏预览状态。
 */
import type {
  ExternalDataSourceSavePayload,
  ExternalDataSourceVO,
  ExternalPullAuditVO,
  ExternalPullResultVO,
  ExternalPullTaskCreatePayload,
  ExternalPullTaskQueryPayload,
  ExternalPullTaskVO,
  ExternalSourceType,
} from '@/apis/quality'
import {
  EXTERNAL_PULL_TASK_STATUS_COLOR,
  EXTERNAL_PULL_TASK_STATUS_LABEL,
  EXTERNAL_SOURCE_TYPE_LABEL,
  externalDataSourceApi,
  externalPullAuditApi,
  externalPullResultApi,
  externalPullTaskApi,
  isExternalPullTaskStatus,
  isExternalSourceType,
} from '@/apis/quality'
import type { SignalMetric, TaskResultItem } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell, TaskResultPanel } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptModal } from './_helpers'

const sourceColumns: ColumnsType = [
  { title: '编码', dataIndex: 'sourceCode', key: 'sourceCode', width: 160 },
  { title: '名称', dataIndex: 'sourceName', key: 'sourceName' },
  { title: '数据库类型', dataIndex: 'sourceType', key: 'sourceType', width: 120 },
  { title: '驱动类', dataIndex: 'driverClass', key: 'driverClass', width: 200 },
  { title: '最大行数', dataIndex: 'maxRowCount', key: 'maxRowCount', width: 100 },
  { title: '超时（秒）', dataIndex: 'queryTimeoutSeconds', key: 'queryTimeoutSeconds', width: 90 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 100 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const taskColumns: ColumnsType = [
  { title: '任务编码', dataIndex: 'taskCode', key: 'taskCode', width: 160 },
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
  { title: '数据源', dataIndex: 'sourceId', key: 'sourceId', width: 160 },
  { title: '业务锚点', dataIndex: 'businessAnchor', key: 'businessAnchor', width: 180 },
  { title: '返回行数', dataIndex: 'returnRows', key: 'returnRows', width: 100 },
  { title: '耗时（ms）', dataIndex: 'elapsedMs', key: 'elapsedMs', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const detailResultColumns: ColumnsType = [
  { title: '批次 ID', dataIndex: 'id', key: 'id', width: 120 },
  { title: '业务锚点', key: 'detailAnchor' },
  { title: '预览行数', dataIndex: 'previewRows', key: 'previewRows', width: 100 },
  { title: '确认行数', dataIndex: 'confirmedRows', key: 'confirmedRows', width: 100 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 110 },
  { title: '操作', key: 'actions', width: 180 },
]

/* ========== 状态守卫 helper：禁用 as 类型断言 ========== */

function taskStatusLabel(value: unknown): string {
  if (isExternalPullTaskStatus(value)) return EXTERNAL_PULL_TASK_STATUS_LABEL[value]
  throw new Error(`外部拔取任务状态不在后端枚举内：${String(value)}`)
}

function taskStatusColor(value: unknown): string {
  if (isExternalPullTaskStatus(value)) return EXTERNAL_PULL_TASK_STATUS_COLOR[value]
  throw new Error(`外部拔取任务状态不在后端枚举内：${String(value)}`)
}

function sourceTypeLabel(value: unknown): string {
  if (isExternalSourceType(value)) return EXTERNAL_SOURCE_TYPE_LABEL[value]
  throw new Error(`外部数据源类型不在后端枚举内：${String(value)}`)
}

function confirmationStatusColor(value: unknown): string {
  if (value === 'CONFIRMED') return 'green'
  if (value === 'REJECTED') return 'red'
  if (value === 'PREVIEW') return 'orange'
  throw new Error(`结果批次确认状态不在后端枚举内：${String(value)}`)
}

function auditTone(status: unknown): string {
  if (status === 'PASSED') return 'green'
  if (status === 'REJECTED') return 'red'
  if (status === 'WARNING') return 'orange'
  if (status === null || status === undefined || status === '') return 'gray'
  throw new Error(`外部拔取审计状态不在后端枚举内：${String(status)}`)
}

const sources = ref<ExternalDataSourceVO[]>([])
const sourceTotal = ref(0)
const sourceLoading = ref(false)
const sourceQuery = reactive({ pageNum: 1, pageSize: 10 })

const tasks = ref<ExternalPullTaskVO[]>([])
const taskTotal = ref(0)
const taskLoading = ref(false)
const taskQuery = reactive<ExternalPullTaskQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  sourceId: undefined,
  status: undefined,
  businessAnchor: undefined,
})

/**
 * 临时表单状态：包含明文输入。提交时直接按后端契约发送，服务端负责加密落库。
 */
const sourceEditorVisible = ref(false)
const sourceEditing = ref(false)
const sourceEditorMode = ref<'create' | 'edit'>('create')
const sourceEditingId = ref<string | undefined>(undefined)
const sourceForm = reactive({
  sourceCode: '',
  sourceName: '',
  sourceType: 'POSTGRESQL' as ExternalSourceType,
  jdbcUrl: '',
  username: '',
  password: '',
  driverClass: 'org.postgresql.Driver',
  fieldWhitelist: '{}',
  maxRowCount: 10000,
  queryTimeoutSeconds: 30,
  enabled: true,
})

const taskCreateVisible = ref(false)
const taskCreating = ref(false)
const taskForm = reactive<ExternalPullTaskCreatePayload>({
  sourceId: '',
  taskCode: '',
  taskName: '',
  businessAnchor: '',
  businessId: '',
  sqlTemplate: '',
  sqlParameters: '',
  fieldWhitelist: '',
  maxRowCount: undefined,
  queryTimeoutSeconds: undefined,
})

const detailVisible = ref(false)
const detailRecord = ref<ExternalPullTaskVO | null>(null)
const detailResults = ref<ExternalPullResultVO[]>([])
const detailAudits = ref<ExternalPullAuditVO[]>([])
const detailLoading = ref(false)

const sourceTypeOptions = Object.entries(EXTERNAL_SOURCE_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const taskStatusOptions = Object.entries(EXTERNAL_PULL_TASK_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

/* ========== 信号指标带 ========== */

const signals = computed<SignalMetric[]>(() => {
  const enabledSources = sources.value.filter((s) => s.enabled).length
  const runningTasks = tasks.value.filter(
    (t) => isExternalPullTaskStatus(t.status) && t.status === 'RUNNING',
  ).length
  const failedTasks = tasks.value.filter(
    (t) => isExternalPullTaskStatus(t.status) && t.status === 'FAILED',
  ).length
  const succeededTasks = tasks.value.filter(
    (t) => isExternalPullTaskStatus(t.status) && t.status === 'SUCCEEDED',
  ).length
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

function sourceName(sourceId: string | undefined): string {
  if (!sourceId) throw new Error('外部拔取任务缺少数据源 ID')
  const source = sources.value.find((s) => s.id === sourceId)
  if (!source) throw new Error(`外部拔取任务引用的数据源不存在：${sourceId}`)
  return source.sourceName
}

const enabledSourceOptions = computed(() =>
  sources.value.filter((s) => s.enabled).map((s) => ({ value: s.id, label: s.sourceName })),
)

function canCancelTask(status: unknown): boolean {
  if (!isExternalPullTaskStatus(status)) {
    throw new Error(`外部拔取任务状态不在后端枚举内：${String(status)}`)
  }
  return status === 'PENDING' || status === 'RUNNING'
}

function handleTaskPageChange(payload: { current: number; pageSize: number }) {
  taskQuery.pageNum = payload.current
  taskQuery.pageSize = payload.pageSize
  loadTasks()
}

async function reloadAll() {
  await Promise.all([loadSources(), loadTasks()])
}

async function loadSources() {
  sourceLoading.value = true
  try {
    const page = await externalDataSourceApi.page(sourceQuery)
    sources.value = page.list
    sourceTotal.value = page.total
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
    tasks.value = page.list
    taskTotal.value = page.total
  } finally {
    taskLoading.value = false
  }
}

function openSourceCreate() {
  sourceEditorMode.value = 'create'
  sourceEditingId.value = undefined
  Object.assign(sourceForm, {
    sourceCode: '',
    sourceName: '',
    sourceType: 'POSTGRESQL' as ExternalSourceType,
    jdbcUrl: '',
    username: '',
    password: '',
    driverClass: 'org.postgresql.Driver',
    fieldWhitelist: '{}',
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
  Object.assign(sourceForm, {
    sourceCode: detail.sourceCode,
    sourceName: detail.sourceName,
    sourceType: detail.sourceType,
    // 后端不下行明文，编辑时必须重输
    jdbcUrl: '',
    username: '',
    password: '',
    driverClass: detail.driverClass,
    fieldWhitelist: detail.fieldWhitelist,
    maxRowCount: detail.maxRowCount,
    queryTimeoutSeconds: detail.queryTimeoutSeconds,
    enabled: detail.enabled,
  })
  sourceEditorVisible.value = true
}

async function submitSource() {
  if (
    !sourceForm.sourceCode.trim() ||
    !sourceForm.sourceName.trim() ||
    !sourceForm.jdbcUrl.trim()
  ) {
    message.error('请填写编码 / 名称 / JDBC URL')
    return
  }
  if (!sourceForm.username.trim() || !sourceForm.password) {
    message.error('账户与密码不能为空（加密保存；编辑时也必须重输）')
    return
  }
  if (!sourceForm.driverClass.trim() || !sourceForm.fieldWhitelist.trim()) {
    message.error('请填写驱动类与字段白名单 JSON')
    return
  }
  const whitelist = sourceForm.fieldWhitelist.trim()
  try {
    JSON.parse(whitelist)
  } catch {
    message.error('字段白名单必须是合法 JSON')
    return
  }
  sourceEditing.value = true
  try {
    const payload: ExternalDataSourceSavePayload = {
      id: sourceEditorMode.value === 'edit' ? sourceEditingId.value : undefined,
      sourceCode: sourceForm.sourceCode.trim(),
      sourceName: sourceForm.sourceName.trim(),
      sourceType: sourceForm.sourceType,
      jdbcUrl: sourceForm.jdbcUrl.trim(),
      username: sourceForm.username.trim(),
      password: sourceForm.password,
      driverClass: sourceForm.driverClass.trim(),
      fieldWhitelist: whitelist,
      maxRowCount: sourceForm.maxRowCount,
      queryTimeoutSeconds: sourceForm.queryTimeoutSeconds,
      enabled: sourceForm.enabled,
    }
    if (sourceEditorMode.value === 'create') {
      await externalDataSourceApi.create(payload)
      message.success('数据源已创建')
    } else {
      await externalDataSourceApi.update(payload)
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

async function cancelTask(record: ExternalPullTaskVO) {
  const reason = await promptModal({
    title: `取消拔取任务 ${record.taskCode}`,
    placeholder: '请填写取消原因',
    required: true,
    okType: 'danger',
    emptyErrorMessage: '请填写取消原因',
  })
  if (!reason) return
  await externalPullTaskApi.cancel(record.id, reason || undefined)
  message.success('已取消')
  await loadTasks()
}

function openTaskCreate() {
  Object.assign(taskForm, {
    sourceId: '',
    taskCode: '',
    taskName: '',
    businessAnchor: '',
    businessId: '',
    sqlTemplate: '',
    sqlParameters: '',
    fieldWhitelist: '',
    maxRowCount: undefined,
    queryTimeoutSeconds: undefined,
  })
  taskCreateVisible.value = true
}

async function submitTask() {
  if (
    !taskForm.taskName.trim() ||
    !taskForm.taskCode.trim() ||
    !taskForm.sourceId ||
    !taskForm.businessAnchor.trim() ||
    !taskForm.businessId ||
    !taskForm.sqlTemplate.trim()
  ) {
    message.error('请填写任务编码 / 名称 / 数据源 / 业务锚点 / SQL')
    return
  }
  if (!/^\s*select\s/i.test(taskForm.sqlTemplate)) {
    message.error('仅允许 SELECT 语句')
    return
  }
  if (taskForm.sqlParameters && taskForm.sqlParameters.trim()) {
    try {
      const sqlParameters = JSON.parse(taskForm.sqlParameters)
      if (!Array.isArray(sqlParameters)) {
        message.error('SQL 参数必须是 JSON 数组，按 ? 占位符顺序填写')
        return
      }
    } catch {
      message.error('SQL 参数必须是合法 JSON 数组')
      return
    }
  }
  taskCreating.value = true
  try {
    await externalPullTaskApi.create({
      sourceId: taskForm.sourceId,
      taskCode: taskForm.taskCode.trim(),
      taskName: taskForm.taskName.trim(),
      businessAnchor: taskForm.businessAnchor.trim(),
      businessId: taskForm.businessId,
      sqlTemplate: taskForm.sqlTemplate.trim(),
      sqlParameters: taskForm.sqlParameters?.trim() || undefined,
      fieldWhitelist: taskForm.fieldWhitelist?.trim() || undefined,
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

/**
 * 确认 / 驳回是对 **拔取结果批次** 操作而不是任务本身。
 * 任务成功后会生成一个 PREVIEW 状态的结果批次，在详情抽屉中对该批次 confirm / reject。
 */
async function confirmResult(result: ExternalPullResultVO) {
  const confirmedRows = result.previewRows
  if (confirmedRows === null || confirmedRows === undefined) {
    throw new Error(`结果批次 #${result.id} 缺少预览行数，不能确认`)
  }
  void confirmAsync({
    title: `确认拔取结果批次 #${result.id}？`,
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
    title: `驳回拔取结果批次 #${result.id}`,
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
  detailRecord.value = record
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

const pullResultItems = computed<TaskResultItem[]>(() => {
  return tasks.value
    .filter(
      (t) =>
        (isExternalPullTaskStatus(t.status) && t.status === 'FAILED') ||
        (isExternalPullTaskStatus(t.status) && t.status === 'RUNNING'),
    )
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: `${t.taskCode} - ${t.taskName}`,
      statusLabel: taskStatusLabel(t.status),
      statusTone: (isExternalPullTaskStatus(t.status) && t.status === 'FAILED' ? 'red' : 'blue') as
        | 'red'
        | 'blue',
      description:
        t.failureReason ||
        (isExternalPullTaskStatus(t.status) && t.status === 'RUNNING' ? '任务执行中…' : undefined),
      time: t.startedAt || undefined,
      actions: [{ key: 'detail', label: '详情' }],
    }))
})

function handlePullResultAction(payload: { item: TaskResultItem; action: { key: string } }) {
  const record = tasks.value.find((t) => t.id === payload.item.id)
  if (record && payload.action.key === 'detail') openDetail(record)
}

onMounted(async () => {
  await Promise.all([loadSources(), loadTasks()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="external-pull__context">
        <div class="external-pull__context-info">
          <h2 class="external-pull__title">外部数据拔取审计</h2>
        </div>
        <div class="external-pull__context-actions">
          <UiButton
            variant="ghost"
            size="sm"
            :loading="sourceLoading || taskLoading"
            @click="reloadAll"
          >
            刷新
          </UiButton>
          <UiButton variant="outline" size="sm" @click="openSourceCreate"> 新建数据源 </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!sources.some((s) => s.enabled)"
            @click="openTaskCreate"
          >
            新建拔取任务
          </UiButton>
        </div>
      </div>
    </template>

    <SignalBand :metrics="signals" compact class="external-pull__signals" />

    <TaskResultPanel
      v-if="pullResultItems.length > 0"
      title="待关注任务"
      :items="pullResultItems"
      class="external-pull__result-panel"
      @action="handlePullResultAction"
    />

    <section class="external-pull__panel">
      <header class="external-pull__panel-header">
        <h3 class="external-pull__panel-title">外部只读数据源</h3>
        <span class="external-pull__panel-meta">{{ sourceTotal }} 个</span>
      </header>
      <UiEmpty
        v-if="!sources.length && !sourceLoading"
        description="尚未配置任何外部只读数据源；请先新建数据源以便创建拔取任务"
        size="sm"
      />
      <UiDataTable
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
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'sourceType'">
            {{ sourceTypeLabel(text) }}
          </template>
          <template
            v-else-if="column.key === 'maxRowCount' || column.key === 'queryTimeoutSeconds'"
          >
            {{ text ?? '-' }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <UiButton variant="ghost" size="sm" @click="openSourceEdit(record)"> 编辑 </UiButton>
              <UiButton variant="ghost" size="sm" @click="toggleSourceEnabled(record)">
                {{ record.enabled ? '停用' : '启用' }}
              </UiButton>
              <UiButton variant="ghost" status="danger" size="sm" @click="deleteSource(record)">
                删除
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

    <section class="external-pull__panel">
      <header class="external-pull__panel-header">
        <h3 class="external-pull__panel-title">拔取任务</h3>
        <div class="external-pull__panel-actions">
          <a-select
            v-model:value="taskQuery.sourceId"
            placeholder="按数据源筛选"
            class="external-pull__filter external-pull__filter--lg"
            allow-clear
            :options="sources.map((s) => ({ value: s.id, label: s.sourceName }))"
          />
          <a-select
            v-model:value="taskQuery.status"
            placeholder="状态"
            class="external-pull__filter"
            allow-clear
            :options="taskStatusOptions"
          />
          <a-input
            v-model:value="taskQuery.businessAnchor"
            placeholder="业务锚点（如 SCORE_BATCH）"
            class="external-pull__filter external-pull__filter--lg"
            @press-enter="loadTasks"
          />
          <UiButton variant="outline" size="sm" :loading="taskLoading" @click="loadTasks">
            查询
          </UiButton>
        </div>
      </header>

      <UiEmpty
        v-if="!tasks.length && !taskLoading"
        description="当前筛选条件下无拔取任务；请新建拔取任务或调整筛选"
        size="sm"
      />
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
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'sourceId'">
            {{ sourceName(text) }}
          </template>
          <template v-else-if="column.key === 'businessAnchor'">
            <div>{{ record.businessAnchor || '-' }}</div>
            <div class="external-pull__sub-text">#{{ record.businessId || '-' }}</div>
          </template>
          <template v-else-if="column.key === 'returnRows' || column.key === 'elapsedMs'">
            {{ text ?? '-' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="taskStatusColor(text)">
              {{ taskStatusLabel(text) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <UiButton variant="ghost" size="sm" @click="openDetail(record)"> 详情 </UiButton>
              <UiButton
                v-if="canCancelTask(record.status)"
                variant="ghost"
                status="danger"
                size="sm"
                @click="cancelTask(record)"
              >
                取消
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

    <UiDrawer
      v-model:open="sourceEditorVisible"
      :title="sourceEditorMode === 'create' ? '新建数据源' : `编辑数据源 ${sourceForm.sourceCode}`"
      :width="720"
      :confirm-loading="sourceEditing"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitSource"
    >
      <a-alert
        v-if="sourceEditorMode === 'edit'"
        type="warning"
        show-icon
        message="编辑模式必须重新输入连接串 / 账号 / 密码"
        description="后端不下行明文凭证，保存时连接串 / 账号 / 密码会覆盖原有密文。其他字段默认以当前值为准。"
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
        <a-form-item label="JDBC URL" required>
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
        <a-form-item label="字段白名单 JSON" required>
          <a-textarea
            v-model:value="sourceForm.fieldWhitelist"
            :rows="3"
            placeholder='如 {"t_score":["id","score"]}'
            class="external-pull__mono"
          />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model:checked="sourceForm.enabled" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      v-model:open="taskCreateVisible"
      title="新建拔取任务"
      :width="780"
      :confirm-loading="taskCreating"
      :hide-footer="false"
      ok-text="提交任务"
      @ok="submitTask"
    >
      <a-alert
        type="info"
        show-icon
        message="SQL 安全约束"
        description="仅允许 SELECT 语句；后端 SqlGuard 会拒绝 INSERT/UPDATE/DELETE/DROP/ALTER 等；字段白名单可继承数据源默认或在任务覆盖。"
        class="external-pull__editor-alert"
      />
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
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="业务锚点" required>
              <a-input
                v-model:value="taskForm.businessAnchor"
                placeholder="SCORE_BATCH / PROCESS_NODE / ..."
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="业务锚点 ID" required>
              <a-input v-model:value="taskForm.businessId" placeholder="锚点对应业务表主键 ID" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="SELECT SQL 模板" required>
          <a-textarea
            v-model:value="taskForm.sqlTemplate"
            :rows="5"
            placeholder="只允许 SELECT，禁止 INSERT/UPDATE/DELETE/DROP/ALTER 等"
            class="external-pull__mono"
          />
        </a-form-item>
        <a-form-item label="SQL 参数 JSON 数组（可选）">
          <a-textarea
            v-model:value="taskForm.sqlParameters"
            :rows="2"
            placeholder='如 ["2025-01-01", "2025-12-31"]'
            class="external-pull__mono"
          />
        </a-form-item>
        <a-form-item label="字段白名单 JSON（可留空继承数据源白名单）">
          <a-textarea
            v-model:value="taskForm.fieldWhitelist"
            :rows="2"
            class="external-pull__mono"
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

    <UiDrawer v-model:open="detailVisible" title="拔取任务详情" :width="820" :hide-footer="true">
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
            {{ sourceName(detailRecord.sourceId) }}
          </a-descriptions-item>
          <a-descriptions-item label="业务锚点">
            {{ detailRecord.businessAnchor }} #{{ detailRecord.businessId }}
          </a-descriptions-item>
          <a-descriptions-item label="返回行数">
            {{ detailRecord.returnRows ?? '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="耗时">
            {{ detailRecord.elapsedMs ?? '-' }} ms
          </a-descriptions-item>
          <a-descriptions-item label="开始时间">
            {{ detailRecord.startedAt || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="结束时间">
            {{ detailRecord.finishedAt || '-' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.failureReason" label="失败原因" :span="2">
            <span class="external-pull__error-text">{{ detailRecord.failureReason }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="SQL 模板" :span="2">
            <pre class="external-pull__sql-pre">{{ detailRecord.sqlTemplate }}</pre>
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.sqlParameters" label="SQL 参数" :span="2">
            <pre class="external-pull__sql-pre">{{ detailRecord.sqlParameters }}</pre>
          </a-descriptions-item>
        </a-descriptions>

        <h4 class="external-pull__section-title">结果批次（可逐批确认 / 驳回）</h4>
        <UiEmpty
          v-if="!detailResults.length && !detailLoading"
          description="任务暂未生成结果批次；任务执行成功后会出现 PREVIEW 状态的批次"
          size="sm"
        />
        <UiDataTable
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
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.key === 'detailAnchor'">
              {{ record.businessAnchor }} #{{ record.businessId }}
            </template>
            <template v-else-if="column.key === 'previewRows' || column.key === 'confirmedRows'">
              {{ text ?? '-' }}
            </template>
            <template v-else-if="column.key === 'confirmationStatus'">
              <a-tag :color="confirmationStatusColor(text)">
                {{ text || '-' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton
                  v-if="record.confirmationStatus === 'PREVIEW'"
                  variant="primary"
                  size="sm"
                  @click="confirmResult(record)"
                >
                  确认
                </UiButton>
                <UiButton
                  v-if="record.confirmationStatus === 'PREVIEW'"
                  variant="ghost"
                  status="danger"
                  size="sm"
                  @click="rejectResult(record)"
                >
                  驳回
                </UiButton>
              </a-space>
            </template>
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
            :color="auditTone(audit.sqlSafetyStatus)"
          >
            <p class="external-pull__audit-event">
              <strong>{{ audit.auditEvent }}</strong>
            </p>
            <p v-if="audit.sqlSafetyStatus" class="external-pull__audit-line">
              SQL 安全：{{ audit.sqlSafetyStatus }}
              <span v-if="audit.sqlSafetyDetail"> · {{ audit.sqlSafetyDetail }}</span>
            </p>
            <p v-if="audit.fieldWhitelistStatus" class="external-pull__audit-line">
              白名单：{{ audit.fieldWhitelistStatus }}
              <span v-if="audit.fieldWhitelistDetail"> · {{ audit.fieldWhitelistDetail }}</span>
            </p>
            <p v-if="audit.maskPreviewStatus" class="external-pull__audit-line">
              脱敏预览：{{ audit.maskPreviewStatus }}
            </p>
            <p v-if="audit.auditDetail" class="external-pull__audit-detail">
              {{ audit.auditDetail }}
            </p>
            <p class="external-pull__sub-text">
              {{ audit.auditedAt || '-' }}
            </p>
          </a-timeline-item>
        </a-timeline>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.external-pull {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
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

  &__sql-pre {
    margin: 0;
    padding: 8px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    background: var(--dp-gray-50, #f8fafc);
    border-radius: 4px;
  }

  &__mono {
    :deep(textarea) {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
    }
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
