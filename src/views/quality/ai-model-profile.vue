<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 / AI 能力 - 模型可靠性台
 *
 * 后端契约（AiModelProfileController）：
 * - POST /api/quality/ai/model-profiles/list         分页列表
 * - POST /api/quality/ai/model-profiles/save         保存 / 启用切换，apiKey 留空 = 保留原密钥
 * - POST /api/quality/ai/model-profiles/health-check 人工触发健康检查
 *
 * 唯一启用约束：平台同供应商 enabled=true 最多 1 条。切换启用时后端会在 advisory lock 下
 *   串行化并把平台同供应商其它配置置为停用。mark 直接扫描视觉能力使用 QWEN，
 *   quality 文本任务和 mark 其他 AI 能力使用 DEEPSEEK。
 */
import type {
  AiModelProfileSaveRequest,
  AiModelProfileVO,
} from '@/apis/quality/ai-model-profile'
import type {
  AiHealthStatus,
  AiProviderType,
} from '@/apis/quality/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { aiModelProfileApi } from '@/apis/quality/ai-model-profile'
import {
  AI_HEALTH_STATUS_COLOR,
  AI_HEALTH_STATUS_LABEL,
  AI_PROVIDER_TYPE_LABEL,
} from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { getUserErrorMessage } from '@/utils/error-handler'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const AI_MODEL_PROFILE_PAGE_SIZE = 100

const columns: ColumnsType = [
  { title: '名称', dataIndex: 'profileName', key: 'profileName' },
  { title: '服务商', dataIndex: 'providerType', key: 'providerType', width: 140 },
  { title: '模型', dataIndex: 'modelName', key: 'modelName', width: 180 },
  { title: '温度', dataIndex: 'temperature', key: 'temperature', width: 80 },
  { title: '最大输出量', dataIndex: 'maxTokens', key: 'maxTokens', width: 110 },
  { title: '最大输入字符', dataIndex: 'maxInputChars', key: 'maxInputChars', width: 130 },
  { title: '密钥', dataIndex: 'apiKeyMasked', key: 'apiKeyMasked', width: 220 },
  { title: '健康', dataIndex: 'healthStatus', key: 'healthStatus', width: 100 },
  { title: '操作', key: 'actions', width: 380, fixed: 'right' },
]

function healthLabel(value: AiHealthStatus | null | undefined): string {
  if (value === null || value === undefined) return ''
  return strictEnumLabel(AI_HEALTH_STATUS_LABEL, value, 'AI 模型健康状态')
}

function healthColor(value: AiHealthStatus | null | undefined): BadgeTone {
  if (value === null || value === undefined) return 'gray'
  return strictEnumTone(AI_HEALTH_STATUS_COLOR, value, 'AI 模型健康状态')
}

function providerTypeLabel(value: AiProviderType): string {
  return strictEnumLabel(AI_PROVIDER_TYPE_LABEL, value, 'AI 服务商类型')
}

function aiModelHealthMessageText(messageText?: string): string {
  if (!messageText?.trim()) {
    return '未返回检测说明'
  }
  return getUserErrorMessage(
    { message: messageText },
    'AI 模型连通状态已更新，请以当前健康状态为准',
  )
}

interface AiModelProfileFilterModel {
  enabledOnly: boolean
}

const filterForm = reactive<AiModelProfileFilterModel>({
  enabledOnly: false,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  { key: 'enabledOnly', type: 'custom' },
]

const list = ref<AiModelProfileVO[]>([])
const loading = ref(false)

/** 当前已启用配置集合，按供应商分流后允许 QWEN / DEEPSEEK 各一条。 */
const activeProfiles = computed<AiModelProfileVO[]>(() => list.value.filter((item) => item.enabled))

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')

/**
 * 编辑器表单状态。
 *
 * 新建默认 enabled=false，避免「一保存就默认覆盖当前启用」。
 * 启用切换走列表中独立的「设为启用」动作，仅在带提示的确认弹窗下发生。
 */
const editor = reactive<AiModelProfileSaveRequest>({
  profileName: '',
  providerType: 'DEEPSEEK',
  modelName: 'deepseek-chat',
  apiHost: 'https://api.deepseek.com',
  apiKey: '',
  temperature: 0.2,
  maxTokens: 4096,
  maxInputChars: 120000,
  connectTimeoutSecs: 30,
  readTimeoutSecs: 600,
  enabled: false,
})

const submitting = ref(false)
const healthLoading = ref<string>('')
const activatingId = ref<string>('')

async function loadList() {
  loading.value = true
  try {
    list.value = await readAllPages(
      (pageNum) => aiModelProfileApi.list({
        enabledOnly: filterForm.enabledOnly || undefined,
        pageNum,
        pageSize: AI_MODEL_PROFILE_PAGE_SIZE,
      }),
      '平台 AI 模型配置列表加载失败，请稍后重试',
    )
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  void loadList()
}

function handleReset() {
  filterForm.enabledOnly = false
  void loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    profileName: '',
    providerType: 'DEEPSEEK',
    modelName: 'deepseek-chat',
    apiHost: 'https://api.deepseek.com',
    apiKey: '',
    temperature: 0.2,
    maxTokens: 4096,
    maxInputChars: 120000,
    connectTimeoutSecs: 30,
    readTimeoutSecs: 600,
    enabled: false,
  })
  editorVisible.value = true
}

function openEdit(record: AiModelProfileVO) {
  editorMode.value = 'edit'
  Object.assign(editor, {
    id: record.id,
    profileName: record.profileName,
    providerType: record.providerType,
    modelName: record.modelName,
    apiHost: record.apiHost,
    apiKey: '',
    temperature: record.temperature,
    maxTokens: record.maxTokens,
    maxInputChars: record.maxInputChars,
    connectTimeoutSecs: record.connectTimeoutSecs,
    readTimeoutSecs: record.readTimeoutSecs,
    enabled: record.enabled,
  })
  editorVisible.value = true
}

async function submitEditor() {
  const profileName = editor.profileName.trim()
  const modelName = editor.modelName.trim()
  const apiHost = editor.apiHost.trim()
  if (!profileName || !modelName) {
    message.error('请填写配置名称 / 模型名')
    return
  }
  if (!apiHost) {
    message.error('请填写模型服务地址')
    return
  }
  if (editorMode.value === 'create' && !editor.apiKey?.trim()) {
    message.error('新建模型配置时必须填写模型访问密钥')
    return
  }
  if (!editor.maxInputChars || editor.maxInputChars <= 0) {
    message.error('最大输入字符数必须大于 0')
    return
  }
  if (editor.temperature != null && (editor.temperature < 0 || editor.temperature > 1)) {
    message.error('温度参数必须在 0 到 1 之间')
    return
  }
  if (editor.maxTokens != null && editor.maxTokens <= 0) {
    message.error('最大输出 Token 数必须大于 0')
    return
  }
  if (editor.connectTimeoutSecs != null && editor.connectTimeoutSecs <= 0) {
    message.error('连接超时秒数必须大于 0')
    return
  }
  if (editor.readTimeoutSecs != null && editor.readTimeoutSecs <= 0) {
    message.error('读取超时秒数必须大于 0')
    return
  }
  submitting.value = true
  try {
    const payload = {
      ...editor,
      profileName,
      modelName,
      apiHost,
      apiKey: editor.apiKey?.trim() || undefined,
      enabled: editorMode.value === 'create' ? false : editor.enabled,
    }
    await aiModelProfileApi.save(payload)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

/**
 * 将某条配置设为同供应商唯一启用。
 *
 * 后端会在 advisory lock 下把平台同供应商其它配置置为停用，前端仅负责颗粒度提交
 * （携带原记录 + apiKey 留空保留原密钥）。
 */
async function handleActivate(record: AiModelProfileVO) {
  if (record.enabled) {
    return
  }
  const current = activeProfiles.value.find((item) => item.providerType === record.providerType)
  void confirmAsync({
    title: `将「${record.profileName}」设为当前启用模型？`,
    type: 'warning',
    content: current
      ? `当前启用的同供应商配置「${current.profileName}」将被自动置为停用。平台同供应商只保留一条启用记录。`
      : `提交后本条配置将作为平台 ${providerTypeLabel(record.providerType)} 的启用模型。`,
    onOk: async () => {
      activatingId.value = record.id
      try {
        await aiModelProfileApi.save({
          id: record.id,
          profileName: record.profileName,
          providerType: record.providerType,
          modelName: record.modelName,
          apiHost: record.apiHost,
          apiKey: undefined,
          temperature: record.temperature,
          maxTokens: record.maxTokens,
          maxInputChars: record.maxInputChars,
          connectTimeoutSecs: record.connectTimeoutSecs,
          readTimeoutSecs: record.readTimeoutSecs,
          enabled: true,
        })
        message.success('已设为当前启用模型')
        await loadList()
      } finally {
        activatingId.value = ''
      }
    },
  })
}

async function handleDisable(record: AiModelProfileVO) {
  void confirmAsync({
    title: `停用「${record.profileName}」？`,
    type: 'error',
    content: record.enabled
      ? '该配置是当前启用模型。停用后平台对应供应商将没有可用 AI 模型，相关 AI 任务会进入阻断状态。请谨慎操作。'
      : '该配置本来就未启用，停用后仅从候选库序列中维持停用状态。',
    onOk: async () => {
      await aiModelProfileApi.save({
        id: record.id,
        profileName: record.profileName,
        providerType: record.providerType,
        modelName: record.modelName,
        apiHost: record.apiHost,
        apiKey: undefined,
        temperature: record.temperature,
        maxTokens: record.maxTokens,
        maxInputChars: record.maxInputChars,
        connectTimeoutSecs: record.connectTimeoutSecs,
        readTimeoutSecs: record.readTimeoutSecs,
        enabled: false,
      })
      message.success('已停用')
      await loadList()
    },
  })
}

async function handleHealthCheck(record: AiModelProfileVO) {
  healthLoading.value = record.id
  try {
    const result = await aiModelProfileApi.healthCheck({ profileId: record.id })
    if (result.healthStatus === 'HEALTHY') {
      message.success('AI 模型连通检测通过')
    } else {
      const healthMessage = getUserErrorMessage(
        { message: result.healthMessage },
        'AI 模型连通校验失败，请检查模型地址、密钥和网络配置',
      )
      message.error(healthMessage)
    }
    await loadList()
  } finally {
    healthLoading.value = ''
  }
}

function apiKeyDisplayText(record: AiModelProfileVO): string {
  if (!record.apiKeyConfigured) return '未配置'
  return record.apiKeyMasked?.trim() || '****'
}

/* ========== 信号指标 ========== */

const signals = computed<SignalMetric[]>(() => {
  const totalCount = list.value.length
  const enabledCount = list.value.filter((item) => item.enabled).length
  const healthy = list.value.filter((item) => item.healthStatus === 'HEALTHY').length
  const failed = list.value.filter((item) => item.healthStatus === 'FAILED').length
  const keyMissing = list.value.filter((item) => !item.apiKeyConfigured).length
  return [
    { key: 'total', label: '候选总数', value: totalCount, tone: 'blue' },
    {
      key: 'enabled',
      label: '当前启用',
      value: enabledCount,
      tone: enabledCount > 0 ? 'green' : 'red',
    },
    { key: 'healthy', label: '健康', value: healthy, tone: healthy > 0 ? 'green' : 'gray' },
    { key: 'failed', label: '异常', value: failed, tone: failed > 0 ? 'red' : 'gray' },
    {
      key: 'key-missing',
      label: '密钥未配',
      value: keyMissing,
      tone: keyMissing > 0 ? 'orange' : 'gray',
    },
  ]
})


useQualityScopedLoader(() => {
  void loadList()
}, { watchScope: true, immediate: false, reloadOnActivated: false })

onMounted(() => {
  void loadList()
})

onActivated(() => {
  void loadList()
})
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="ai-model__signals" />

    <UiCard class="detail-table-card ai-model__active-card">
      <template #title>当前启用模型</template>

      <UiEmpty
        v-if="activeProfiles.length === 0"
        description="暂无数据"
        size="sm"
      />
      <a-space v-else direction="vertical" :size="12" class="ai-model__active-list">
        <a-descriptions
          v-for="profile in activeProfiles"
          :key="profile.id"
          :column="3"
          size="small"
          bordered
        >
          <template #title>
            <a-space>
              <span>{{ providerTypeLabel(profile.providerType) }}</span>
              <UiTag :tone="healthColor(profile.healthStatus)" size="sm">
                {{ healthLabel(profile.healthStatus) }}
              </UiTag>
            </a-space>
          </template>
          <template #extra>
            <UiButton
              variant="outline"
              size="sm"
              :loading="healthLoading === profile.id"
              @click="handleHealthCheck(profile)"
            >
              重新检测
            </UiButton>
          </template>
          <a-descriptions-item label="配置名称">
            {{ profile.profileName }}
          </a-descriptions-item>
          <a-descriptions-item label="模型">
            {{ profile.modelName }}
          </a-descriptions-item>
          <a-descriptions-item label="密钥">
            {{ apiKeyDisplayText(profile) }}
          </a-descriptions-item>
          <a-descriptions-item label="模型服务地址" :span="3">
            {{ profile.apiHost }}
          </a-descriptions-item>
          <a-descriptions-item label="上次检测时间">
            {{ profile.lastHealthCheckTime || '尚未检测' }}
          </a-descriptions-item>
          <a-descriptions-item label="最近检测说明" :span="2">
            {{ aiModelHealthMessageText(profile.lastHealthMessage) }}
          </a-descriptions-item>
        </a-descriptions>
      </a-space>
    </UiCard>

    <UiCard class="detail-table-card ai-model__table-card">
      <template #title>模型候选仓库</template>
      <template #extra>
        <UiButton size="sm" @click="openCreate">新建配置</UiButton>
      </template>

      <UiFilterBar variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #field-enabledOnly>
          <a-checkbox v-model:checked="filterForm.enabledOnly">仅看启用</a-checkbox>
        </template>
      </UiFilterBar>

      <UiDataTable
        pagination-mode="none"
        class="student-detail-table__data-table"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :show-pagination="false"
        flat
        :total="list.length"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'profileName'">
            <a-space>
              <span>{{ record.profileName }}</span>
              <UiTag v-if="record.enabled" tone="green" size="sm"> 启用 </UiTag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'providerType'">
            {{ providerTypeLabel(record.providerType) }}
          </template>
          <template v-else-if="column.key === 'apiKeyMasked'">
            <div class="ai-model__api-key">
              <span class="ai-model__api-key-text">
                {{ apiKeyDisplayText(record) }}
              </span>
              <template v-if="record.apiKeyConfigured">
                <UiTag tone="green" size="sm"> 已配置 </UiTag>
              </template>
              <UiTag v-else tone="red" size="sm"> 未配置 </UiTag>
            </div>
          </template>
          <template v-else-if="column.key === 'healthStatus'">
            <UiTag :tone="healthColor(record.healthStatus)" size="sm">
              {{ healthLabel(record.healthStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction
                v-if="!record.enabled"
                tone="primary"
                :disabled="activatingId === record.id"
                @click="handleActivate(record)"
              >
                设为启用
              </UiTextAction>
              <UiTextAction
                tone="primary"
                :disabled="healthLoading === record.id"
                @click="handleHealthCheck(record)"
              >
                健康检查
              </UiTextAction>
              <UiTextAction @click="openEdit(record)">编辑</UiTextAction>
              <UiTextAction tone="danger" @click="handleDisable(record)">停用</UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建 AI 模型配置' : '编辑 AI 模型配置'"
      :width="680"
      :confirm-loading="submitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-form-item label="配置名称" required>
          <a-input v-model:value="editor.profileName" placeholder="例如：DeepSeek-V3 主跳" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="模型服务商">
              <a-select v-model:value="editor.providerType" :disabled="editorMode === 'edit'">
                <a-select-option value="DEEPSEEK"> DeepSeek </a-select-option>
                <a-select-option value="QWEN"> 通义千问 </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="模型名" required>
              <a-input v-model:value="editor.modelName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="模型服务地址" required>
          <a-input v-model:value="editor.apiHost" placeholder="https://api.deepseek.com" />
        </a-form-item>
        <a-form-item
          :label="
            editorMode === 'create' ? '模型访问密钥（必填）' : '模型访问密钥（留空表示保留原密钥）'
          "
        >
          <a-input-password
            v-model:value="editor.apiKey"
            :placeholder="editorMode === 'create' ? 'sk-...' : '不修改则留空'"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="温度">
              <a-input-number
                v-model:value="editor.temperature"
                :min="0"
                :max="1"
                :step="0.1"
                class="ai-model__number-full"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="最大输出量">
              <a-input-number
                v-model:value="editor.maxTokens"
                :min="64"
                :max="32768"
                :step="64"
                class="ai-model__number-full"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="最大输入字符" required>
              <a-input-number
                v-model:value="editor.maxInputChars"
                :min="1"
                :step="1000"
                class="ai-model__number-full"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="连接超时 (s)">
              <a-input-number
                v-model:value="editor.connectTimeoutSecs"
                :min="1"
                :max="120"
                class="ai-model__number-full"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="读取超时 (s)">
              <a-input-number
                v-model:value="editor.readTimeoutSecs"
                :min="30"
                :max="1800"
                class="ai-model__number-full"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-model {
  &__signals {
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 16px;

    & + & {
      margin-top: 16px;
    }
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
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__editor-alert {
    margin-bottom: 12px;
  }

  &__api-key {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__api-key-text {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--dp-text-primary);
  }

  &__number-full {
    width: 100%;
  }
}
</style>
