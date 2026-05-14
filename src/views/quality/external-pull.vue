<script setup lang="ts">
/**
 * 外部数据源 + 拔取任务工作台
 *
 * 主链：
 * 1. 维护只读数据源：连接串 / 账号 / 密码 一律传 cipher 密文，后端 AES-256 保存。
 * 2. 创建拔取任务（仅允许 SELECT，受 SqlGuard 拦截）。
 * 3. 调度器自动执行，状态 PENDING → RUNNING → SUCCEEDED → 生成结果批次 PREVIEW。
 * 4. PREVIEW 后由人工确认或驳回（CONFIRMED / REJECTED）。
 * 5. 审计记录写 t_quality_external_pull_audit。
 */
import type {
  ExternalDataSourceSavePayload,
  ExternalDataSourceVO,
  ExternalPullAuditVO,
  ExternalPullResultVO,
  ExternalPullTaskCreatePayload,
  ExternalPullTaskQueryPayload,
  ExternalPullTaskStatus,
  ExternalPullTaskVO,
  ExternalSourceType,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  EXTERNAL_PULL_TASK_STATUS_COLOR,
  EXTERNAL_PULL_TASK_STATUS_LABEL,
  EXTERNAL_SOURCE_TYPE_LABEL,
  externalDataSourceApi,
  externalPullAuditApi,
  externalPullResultApi,
  externalPullTaskApi,
} from '@/apis/quality'
import { promptModal } from './_helpers'

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
 * 临时表单状态：包含明文输入。提交前才以 AES-256 封装为 *Cipher 字段。
 * 本项目运行在企业内网，传输面上还是 HTTPS；后端负责同一账号体系的密钥解密。
 * 详细密钥交接及加密实现需与 edu-quality 后端安全小组联调，本页面这里仅作为 UI 占位。
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

const sourceTypeOptions = Object.entries(EXTERNAL_SOURCE_TYPE_LABEL).map(([value, label]) => ({ value, label }))
const taskStatusOptions = Object.entries(EXTERNAL_PULL_TASK_STATUS_LABEL).map(([value, label]) => ({ value, label }))

function sourceName(sourceId: string | undefined): string {
  if (!sourceId) return '-'
  return sources.value.find(s => s.id === sourceId)?.sourceName || sourceId
}

async function loadSources() {
  sourceLoading.value = true
  try {
    const page = await externalDataSourceApi.page(sourceQuery)
    sources.value = page.list
    sourceTotal.value = page.total
  }
  finally {
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
  }
  finally {
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

/**
 * 前端负责将 jdbcUrl / username / password 明文加密为 *Cipher 字段后提交。
 * 加密实现由运行环境提供的同一密钥加密器负责（企业内罗萰 KMS / 密管系统）。
 * 这里后端必须能用同一账号体系的私钥反向解密；本项目默认 AES-256-GCM。
 */
function toCipher(plain: string): string {
  // 占位实现：仅 base64。生产环境必须接入真实加密。
  if (!plain) return ''
  try {
    return globalThis.btoa(unescape(encodeURIComponent(plain)))
  }
  catch {
    return plain
  }
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
  if (!sourceForm.sourceCode.trim() || !sourceForm.sourceName.trim() || !sourceForm.jdbcUrl.trim()) {
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
  }
  catch {
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
      jdbcUrlCipher: toCipher(sourceForm.jdbcUrl.trim()),
      usernameCipher: toCipher(sourceForm.username.trim()),
      passwordCipher: toCipher(sourceForm.password),
      driverClass: sourceForm.driverClass.trim(),
      fieldWhitelist: whitelist,
      maxRowCount: sourceForm.maxRowCount,
      queryTimeoutSeconds: sourceForm.queryTimeoutSeconds,
      enabled: sourceForm.enabled,
    }
    if (sourceEditorMode.value === 'create') {
      await externalDataSourceApi.create(payload)
      message.success('数据源已创建')
    }
    else {
      await externalDataSourceApi.update(payload)
      message.success('数据源已更新')
    }
    sourceEditorVisible.value = false
    await loadSources()
  }
  finally {
    sourceEditing.value = false
  }
}

async function toggleSourceEnabled(record: ExternalDataSourceVO) {
  await externalDataSourceApi.toggleEnabled(record.id, !record.enabled)
  message.success('已切换状态')
  await loadSources()
}

async function deleteSource(record: ExternalDataSourceVO) {
  Modal.confirm({
    title: `删除数据源 ${record.sourceCode}？`,
    okType: 'danger',
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
    placeholder: '可选：填写取消原因',
    required: false,
    okType: 'danger',
  })
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
  if (!taskForm.taskName.trim() || !taskForm.taskCode.trim() || !taskForm.sourceId
    || !taskForm.businessAnchor.trim() || !taskForm.businessId
    || !taskForm.sqlTemplate.trim()) {
    message.error('请填写任务编码 / 名称 / 数据源 / 业务错点 / SQL')
    return
  }
  if (!/^\s*select\s/i.test(taskForm.sqlTemplate)) {
    message.error('仅允许 SELECT 语句')
    return
  }
  if (taskForm.sqlParameters && taskForm.sqlParameters.trim()) {
    try {
      JSON.parse(taskForm.sqlParameters)
    }
    catch {
      message.error('SQL 参数必须是合法 JSON')
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
  }
  finally {
    taskCreating.value = false
  }
}

/**
 * 确认 / 驳回是对 **拔取结果批次** 操作而不是任务本身。
 * 任务成功后会生成一个 PREVIEW_READY 状态的结果批次，在详情抽屉中对该批次 confirm / reject。
 */
async function confirmResult(result: ExternalPullResultVO) {
  Modal.confirm({
    title: `确认拔取结果批次 #${result.id}？`,
    content: '确认后进入达成度计算可用来源',
    onOk: async () => {
      await externalPullResultApi.confirm({ id: result.id })
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
  await externalPullResultApi.reject({ id: result.id, rejectReason: reason })
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
  }
  finally {
    detailLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSources(), loadTasks()])
})
</script>

<template>
  <div class="page">
    <a-card title="外部只读数据源" :bordered="false" style="margin-bottom: 16px">
      <template #extra>
        <a-space>
          <a-button @click="loadSources">
            刷新
          </a-button>
          <a-button type="primary" @click="openSourceCreate">
            新建数据源
          </a-button>
        </a-space>
      </template>
      <a-table
        :data-source="sources"
        :loading="sourceLoading"
        row-key="id"
        size="small"
        :pagination="false"
      >
        <a-table-column title="编码" data-index="sourceCode" />
        <a-table-column title="名称" data-index="sourceName" />
        <a-table-column title="数据库类型" data-index="sourceType" width="120">
          <template #default="{ text }">
            {{ EXTERNAL_SOURCE_TYPE_LABEL[text as ExternalSourceType] || text }}
          </template>
        </a-table-column>
        <a-table-column title="驱动类" data-index="driverClass" width="180" />
        <a-table-column title="最大行数" data-index="maxRowCount" width="100" />
        <a-table-column title="超时秒" data-index="queryTimeoutSeconds" width="80" />
        <a-table-column title="状态" data-index="enabled" width="100">
          <template #default="{ text }">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="180" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openSourceEdit(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" @click="toggleSourceEnabled(record)">
                {{ record.enabled ? '停用' : '启用' }}
              </a-button>
              <a-button type="link" size="small" danger @click="deleteSource(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-card title="拔取任务" :bordered="false">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="taskQuery.sourceId"
            placeholder="按数据源筛选"
            style="width: 180px"
            allow-clear
            :options="sources.map(s => ({ value: s.id, label: s.sourceName }))"
          />
          <a-select
            v-model:value="taskQuery.status"
            placeholder="状态"
            style="width: 130px"
            allow-clear
            :options="taskStatusOptions"
          />
          <a-input v-model:value="taskQuery.businessAnchor" placeholder="业务错点（如 SCORE_BATCH）" style="width: 200px" @press-enter="loadTasks" />
          <a-button type="primary" @click="loadTasks">
            查询
          </a-button>
          <a-button type="primary" @click="openTaskCreate">
            新建拔取任务
          </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="tasks"
        :loading="taskLoading"
        row-key="id"
        size="middle"
        :pagination="{
          current: taskQuery.pageNum,
          pageSize: taskQuery.pageSize,
          total: taskTotal,
          showSizeChanger: true,
          onChange: (page: number, size: number) => { taskQuery.pageNum = page; taskQuery.pageSize = size; loadTasks() },
        }"
      >
        <a-table-column title="任务编码" data-index="taskCode" width="160" />
        <a-table-column title="任务名称" data-index="taskName" />
        <a-table-column title="数据源" data-index="sourceId" width="160">
          <template #default="{ text }">
            {{ sourceName(text) }}
          </template>
        </a-table-column>
        <a-table-column title="业务错点" data-index="businessAnchor" width="140" />
        <a-table-column title="返回行数" data-index="returnRows" width="100">
          <template #default="{ text }">
            {{ text ?? '-' }}
          </template>
        </a-table-column>
        <a-table-column title="耗时 (ms)" data-index="elapsedMs" width="100">
          <template #default="{ text }">
            {{ text ?? '-' }}
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" width="120">
          <template #default="{ text }">
            <a-tag :color="EXTERNAL_PULL_TASK_STATUS_COLOR[text as ExternalPullTaskStatus]">
              {{ EXTERNAL_PULL_TASK_STATUS_LABEL[text as ExternalPullTaskStatus] || text }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="220" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openDetail(record)">
                详情（确认 / 驳回）
              </a-button>
              <a-button
                v-if="record.status === 'PENDING' || record.status === 'RUNNING'"
                type="link"
                size="small"
                danger
                @click="cancelTask(record)"
              >
                取消
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="sourceEditorVisible"
      :title="sourceEditorMode === 'create' ? '新建数据源' : `编辑数据源 ${sourceForm.sourceCode}`"
      :confirm-loading="sourceEditing"
      @ok="submitSource"
    >
      <a-alert
        v-if="sourceEditorMode === 'edit'"
        type="warning"
        show-icon
        message="编辑模式必须重新输入连接串 / 账号 / 密码"
        description="后端不下行明文凭证，保存时连接串 / 账号 / 密码会覆盖原有密文。其他字段默认以当前值为准。"
        style="margin-bottom: 12px"
      />
      <a-form layout="vertical" :model="sourceForm">
        <a-form-item label="数据源编码" required>
          <a-input v-model:value="sourceForm.sourceCode" />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model:value="sourceForm.sourceName" />
        </a-form-item>
        <a-form-item label="数据库类型" required>
          <a-select v-model:value="sourceForm.sourceType" :options="sourceTypeOptions" />
        </a-form-item>
        <a-form-item label="驱动类全名" required>
          <a-input v-model:value="sourceForm.driverClass" placeholder="org.postgresql.Driver" />
        </a-form-item>
        <a-form-item label="JDBC URL" required>
          <a-input v-model:value="sourceForm.jdbcUrl" placeholder="jdbc:postgresql://host:5432/db" />
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
              <a-input-number v-model:value="sourceForm.maxRowCount" :min="1" :max="1000000" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="查询超时（秒）" required>
              <a-input-number v-model:value="sourceForm.queryTimeoutSeconds" :min="1" :max="3600" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="字段白名单 JSON" required>
          <a-textarea v-model:value="sourceForm.fieldWhitelist" :rows="3" placeholder="如 {&quot;t_score&quot;:[&quot;id&quot;,&quot;score&quot;]}" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model:checked="sourceForm.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="taskCreateVisible" title="新建拔取任务" :confirm-loading="taskCreating" width="720" @ok="submitTask">
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
          <a-select v-model:value="taskForm.sourceId" :options="sources.filter(s => s.enabled).map(s => ({ value: s.id, label: s.sourceName }))" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="业务错点" required>
              <a-input v-model:value="taskForm.businessAnchor" placeholder="SCORE_BATCH / PROCESS_NODE / ..." />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="业务错点 ID" required>
              <a-input v-model:value="taskForm.businessId" placeholder="错点对应业务表主键 ID" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="SELECT SQL模板" required>
          <a-textarea v-model:value="taskForm.sqlTemplate" :rows="5" placeholder="只允许 SELECT，禁止 INSERT/UPDATE/DELETE/DROP/ALTER 等" />
        </a-form-item>
        <a-form-item label="SQL 参数 JSON（可选）">
          <a-textarea v-model:value="taskForm.sqlParameters" :rows="2" placeholder="如 {&quot;startDate&quot;:&quot;2025-01-01&quot;}" />
        </a-form-item>
        <a-form-item label="字段白名单 JSON（可留空继承数据源白名单）">
          <a-textarea v-model:value="taskForm.fieldWhitelist" :rows="2" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="最大行数（可选）">
              <a-input-number v-model:value="taskForm.maxRowCount" :min="1" :max="1000000" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="查询超时（秒）可选">
              <a-input-number v-model:value="taskForm.queryTimeoutSeconds" :min="1" :max="3600" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="detailVisible" title="拔取任务详情" width="720" :loading="detailLoading">
      <template v-if="detailRecord">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="任务编码">
            {{ detailRecord.taskCode }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="EXTERNAL_PULL_TASK_STATUS_COLOR[detailRecord.status]">
              {{ EXTERNAL_PULL_TASK_STATUS_LABEL[detailRecord.status] || detailRecord.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="数据源">
            {{ sourceName(detailRecord.sourceId) }}
          </a-descriptions-item>
          <a-descriptions-item label="业务错点">
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
            <span style="color: #ff4d4f">{{ detailRecord.failureReason }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="SQL 模板" :span="2">
            <pre style="white-space: pre-wrap; word-break: break-word">{{ detailRecord.sqlTemplate }}</pre>
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.sqlParameters" label="SQL 参数" :span="2">
            <pre style="white-space: pre-wrap; word-break: break-word">{{ detailRecord.sqlParameters }}</pre>
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>结果批次（可逐批确认 / 驳回）</a-divider>
        <a-table :data-source="detailResults" :pagination="false" row-key="id" size="small">
          <a-table-column title="批次 ID" data-index="id" width="100" />
          <a-table-column title="业务错点">
            <template #default="{ record }">
              {{ record.businessAnchor }} #{{ record.businessId }}
            </template>
          </a-table-column>
          <a-table-column title="预览行数" data-index="previewRows" width="100">
            <template #default="{ text }">{{ text ?? '-' }}</template>
          </a-table-column>
          <a-table-column title="确认行数" data-index="confirmedRows" width="100">
            <template #default="{ text }">{{ text ?? '-' }}</template>
          </a-table-column>
          <a-table-column title="状态" data-index="confirmationStatus" width="110">
            <template #default="{ text }">
              <a-tag :color="text === 'CONFIRMED' ? 'green' : text === 'REJECTED' ? 'red' : 'orange'">
                {{ text || '-' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" width="160">
            <template #default="{ record }">
              <a-space>
                <a-button v-if="record.confirmationStatus === 'PREVIEW'" type="link" size="small" @click="confirmResult(record)">
                  确认
                </a-button>
                <a-button v-if="record.confirmationStatus === 'PREVIEW'" type="link" size="small" danger @click="rejectResult(record)">
                  驳回
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </a-table>

        <a-divider>审计流水</a-divider>
        <a-timeline>
          <a-timeline-item v-for="audit in detailAudits" :key="audit.id" :color="audit.sqlSafetyStatus === 'PASSED' ? 'green' : audit.sqlSafetyStatus === 'REJECTED' ? 'red' : 'orange'">
            <p><strong>{{ audit.auditEvent }}</strong></p>
            <p v-if="audit.sqlSafetyStatus">SQL 安全：{{ audit.sqlSafetyStatus }}<span v-if="audit.sqlSafetyDetail"> · {{ audit.sqlSafetyDetail }}</span></p>
            <p v-if="audit.fieldWhitelistStatus">白名单：{{ audit.fieldWhitelistStatus }}<span v-if="audit.fieldWhitelistDetail"> · {{ audit.fieldWhitelistDetail }}</span></p>
            <p v-if="audit.maskPreviewStatus">脱敏预览：{{ audit.maskPreviewStatus }}</p>
            <p v-if="audit.auditDetail" style="color: #555">
              {{ audit.auditDetail }}
            </p>
            <p style="color: #999; font-size: 12px">
              {{ audit.auditedAt }}
            </p>
          </a-timeline-item>
        </a-timeline>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
</style>
