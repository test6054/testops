<script setup lang="ts">
/**
 * AI 模型配置工作台
 *
 * 业务规则（与后端完全对齐）：
 * - 同一租户全局只能有 1 条 enabled=true 的 AI 模型配置，被 edu-quality 的 7 类能力
 *   与 edu-mark 的所有 AI 主链共享读取；
 * - 模型选择不再依据 abilityCode，abilityCode 仅在 AI 任务与脱敏证据快照中作为
 *   路由与审计语义存在；
 * - 交互：维护多条候选配置，但任意时刻仅有一条「启用」；切换启用 = 将另一条提交
 *   enabled=true，后端会按 tenantId advisory lock 串行化并把同租户其它配置全部
 *   置为停用。
 */
import type { AiModelProfileSavePayload, AiModelProfileVO } from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { aiModelProfileApi } from '@/apis/quality'

const list = ref<AiModelProfileVO[]>([])
const loading = ref(false)
const enabledOnly = ref<boolean>(false)

/** 当前唯一启用配置（list 中 enabled=true 的那一条） */
const activeProfile = computed<AiModelProfileVO | null>(
  () => list.value.find((item) => item.enabled) ?? null,
)

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')

/**
 * 编辑器表单状态。
 *
 * 新建默认 enabled=false，避免「一保存就默认覆盖当前启用」。
 * 启用切换走列表中独立的「设为启用」动作，仅在带提示的确认弹窗下发生。
 */
const editor = reactive<AiModelProfileSavePayload>({
  profileName: '',
  providerType: 'OPENAI',
  modelName: 'gpt-4o-mini',
  apiHost: 'https://api.openai.com/v1',
  apiKey: '',
  temperature: 0.2,
  maxTokens: 4096,
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
    list.value = await aiModelProfileApi.list({
      enabledOnly: enabledOnly.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    profileName: '',
    providerType: 'OPENAI',
    modelName: 'gpt-4o-mini',
    apiHost: 'https://api.openai.com/v1',
    apiKey: '',
    temperature: 0.2,
    maxTokens: 4096,
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
    connectTimeoutSecs: record.connectTimeoutSecs,
    readTimeoutSecs: record.readTimeoutSecs,
    enabled: record.enabled,
  })
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.profileName.trim() || !editor.modelName.trim()) {
    message.error('请填写配置名称 / 模型名')
    return
  }
  if (editorMode.value === 'create' && !editor.apiKey?.trim()) {
    message.error('新建必须填写 API Key')
    return
  }
  submitting.value = true
  try {
    await aiModelProfileApi.save({
      ...editor,
      profileName: editor.profileName.trim(),
      modelName: editor.modelName.trim(),
      apiHost: editor.apiHost?.trim() || undefined,
      apiKey: editor.apiKey?.trim() || undefined,
    })
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

/**
 * 将某条配置设为全局唯一启用。
 *
 * 后端会在 advisory lock 下把同租户其它配置都置为停用，前端仅负责颗粒度提交
 * （携带原记录 + apiKey 留空保留原密钥）。
 */
async function handleActivate(record: AiModelProfileVO) {
  if (record.enabled) {
    return
  }
  const current = activeProfile.value
  Modal.confirm({
    title: `将「${record.profileName}」设为当前启用模型？`,
    content: current
      ? `当前启用的「${current.profileName}」将被自动置为停用。同一租户下只会保留一条启用记录。`
      : '提交后本条配置将作为当前租户唯一启用的 AI 模型。',
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
  Modal.confirm({
    title: `停用「${record.profileName}」？`,
    okType: 'danger',
    content: record.enabled
      ? '该配置是当前启用模型。停用后本租户将没有可用 AI 模型，AI 任务会进入阻断状态。请谨慎操作。'
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
      message.success(`连通 OK：${result.healthMessage || 'AI 健康检查通过'}`)
    } else {
      message.error(`连通失败：${result.healthMessage || '未知原因'}`)
    }
    await loadList()
  } finally {
    healthLoading.value = ''
  }
}

function renderHealth(status?: string): { color: string; label: string } {
  switch (status) {
    case 'HEALTHY':
      return { color: 'green', label: '健康' }
    case 'FAILED':
      return { color: 'red', label: '异常' }
    default:
      return { color: 'default', label: '未检测' }
  }
}

onMounted(loadList)
</script>

<template>
  <div class="page">
    <a-alert
      type="warning"
      show-icon
      message="同一租户全局只能启用 1 条 AI 模型配置，被 edu-quality 与 edu-mark 的所有 AI 主链共用。未启用任何配置时 AI 任务会立即进入阻断状态（设计：禁止 yml 兜底）。"
      style="margin-bottom: 12px"
    />

    <a-card title="当前启用模型" :bordered="false">
      <a-empty v-if="!activeProfile" description="当前租户尚未启用任何 AI 模型" />
      <a-descriptions v-else :column="3" size="small">
        <a-descriptions-item label="配置名称">
          {{ activeProfile.profileName }}
        </a-descriptions-item>
        <a-descriptions-item label="Provider">
          {{ activeProfile.providerType }}
        </a-descriptions-item>
        <a-descriptions-item label="模型">
          {{ activeProfile.modelName }}
        </a-descriptions-item>
        <a-descriptions-item label="API Host" :span="3">
          {{ activeProfile.apiHost || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="健康状态">
          <a-tag :color="renderHealth(activeProfile.healthStatus).color">
            {{ renderHealth(activeProfile.healthStatus).label }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="上次检测时间">
          {{ activeProfile.lastHealthCheckAt || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="最近诊断">
          {{ activeProfile.lastHealthMessage || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-card title="模型候选库" :bordered="false" style="margin-top: 12px">
      <template #extra>
        <a-space>
          <a-checkbox v-model:checked="enabledOnly" @change="loadList"> 仅看启用 </a-checkbox>
          <a-button @click="loadList"> 刷新 </a-button>
          <a-button type="primary" @click="openCreate"> 新建配置 </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="false"
      >
        <a-table-column title="名称" data-index="profileName">
          <template #default="{ record }">
            <a-space>
              <span>{{ record.profileName }}</span>
              <a-tag v-if="record.enabled" color="green"> 当前启用 </a-tag>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="Provider" data-index="providerType" width="140" />
        <a-table-column title="模型" data-index="modelName" width="180" />
        <a-table-column title="温度" data-index="temperature" width="80" />
        <a-table-column title="最大 Token" data-index="maxTokens" width="100" />
        <a-table-column title="密钥" data-index="apiKeyConfigured" width="90">
          <template #default="{ text }">
            <a-tag :color="text ? 'blue' : 'red'">
              {{ text ? '已配置' : '未配置' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="健康" data-index="healthStatus" width="100">
          <template #default="{ text }">
            <a-tag :color="renderHealth(text).color">
              {{ renderHealth(text).label }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="320" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button
                v-if="!record.enabled"
                type="link"
                size="small"
                :loading="activatingId === record.id"
                @click="handleActivate(record)"
              >
                设为启用
              </a-button>
              <a-button
                type="link"
                size="small"
                :loading="healthLoading === record.id"
                @click="handleHealthCheck(record)"
              >
                健康检查
              </a-button>
              <a-button type="link" size="small" @click="openEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" danger @click="handleDisable(record)">
                停用
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建 AI 模型配置' : '编辑 AI 模型配置'"
      :confirm-loading="submitting"
      width="640px"
      @ok="submitEditor"
    >
      <a-alert
        v-if="editor.enabled"
        type="info"
        show-icon
        message="提交后本条配置将成为当前租户唯一启用模型，同租户其它配置会被后端自动置为停用。"
        style="margin-bottom: 12px"
      />
      <a-form layout="vertical" :model="editor">
        <a-form-item label="配置名称" required>
          <a-input v-model:value="editor.profileName" placeholder="例如：DeepSeek-V3 主跳" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Provider 类型">
              <a-select v-model:value="editor.providerType">
                <a-select-option value="OPENAI"> OpenAI </a-select-option>
                <a-select-option value="DEEPSEEK"> DeepSeek </a-select-option>
                <a-select-option value="QWEN"> Qwen </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="模型名" required>
              <a-input v-model:value="editor.modelName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="API Host">
          <a-input v-model:value="editor.apiHost" placeholder="https://api.openai.com/v1" />
        </a-form-item>
        <a-form-item
          :label="editorMode === 'create' ? 'API Key（必填）' : 'API Key（留空表示保留原密钥）'"
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
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="最大 Token">
              <a-input-number
                v-model:value="editor.maxTokens"
                :min="64"
                :max="32768"
                :step="64"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="连接超时 (s)">
              <a-input-number
                v-model:value="editor.connectTimeoutSecs"
                :min="1"
                :max="120"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="读取超时 (s)">
              <a-input-number
                v-model:value="editor.readTimeoutSecs"
                :min="30"
                :max="1800"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="启用为当前租户唯一 AI 模型">
          <a-switch v-model:checked="editor.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page {
  padding: 16px;
}
</style>
