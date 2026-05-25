<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 / AI 能力 - 模型可靠性台
 *
 * 后端契约（AiModelProfileController）：
 * - GET  /quality/ai-model-profile/list?enabledOnly  列表
 * - POST /quality/ai-model-profile/save              保存 / 启用切换，apiKey 留空 = 保留原密钥
 * - POST /quality/ai-model-profile/health-check      人工触发健康检查
 *
 * 唯一启用约束：同租户 enabled=true 最多 1 条。切换启用时后端会在 advisory lock 下
 *   串行化并把同租户其它配置置为停用。abilityCode 仅作为 AI 任务与脱敏证据快照的审计
 *   语义存在，不参与模型选择。
 */
import type { AiModelProfileSavePayload, AiModelProfileVO } from '@/apis/quality'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  AI_HEALTH_STATUS_COLOR,
  AI_HEALTH_STATUS_LABEL,
  aiModelProfileApi,
  isAiHealthStatus,
} from '@/apis/quality'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'

const columns: ColumnsType = [
  { title: '名称', dataIndex: 'profileName', key: 'profileName' },
  { title: 'Provider', dataIndex: 'providerType', key: 'providerType', width: 140 },
  { title: '模型', dataIndex: 'modelName', key: 'modelName', width: 180 },
  { title: '温度', dataIndex: 'temperature', key: 'temperature', width: 80 },
  { title: '最大 Token', dataIndex: 'maxTokens', key: 'maxTokens', width: 100 },
  { title: '密钥', dataIndex: 'apiKeyConfigured', key: 'apiKeyConfigured', width: 90 },
  { title: '健康', dataIndex: 'healthStatus', key: 'healthStatus', width: 100 },
  { title: '操作', key: 'actions', width: 360, fixed: 'right' },
]

function healthLabel(value: unknown): string {
  if (isAiHealthStatus(value)) return AI_HEALTH_STATUS_LABEL[value]
  throw new Error('AI 模型健康状态不符合前后端契约')
}

function healthColor(value: unknown): string {
  if (isAiHealthStatus(value)) return AI_HEALTH_STATUS_COLOR[value]
  throw new Error('AI 模型健康状态不符合前后端契约')
}

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
  void confirmAsync({
    title: `将「${record.profileName}」设为当前启用模型？`,
    type: 'warning',
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
  void confirmAsync({
    title: `停用「${record.profileName}」？`,
    type: 'error',
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

onMounted(loadList)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="ai-model__context">
        <div class="ai-model__context-info">
          <h2 class="ai-model__title">质量评价 - AI 模型可靠性台</h2>
        </div>
        <div class="ai-model__context-actions">
          <a-checkbox v-model:checked="enabledOnly" @change="loadList"> 仅看启用 </a-checkbox>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            刷新
          </UiButton>
          <UiButton variant="primary" size="sm" @click="openCreate"> 新建配置 </UiButton>
        </div>
      </div>
    </template>

    <a-alert
      type="warning"
      show-icon
      message="同一租户全局只能启用 1 条 AI 模型配置，被 edu-quality 与 edu-mark 的所有 AI 主链共用。未启用任何配置时 AI 任务会立即进入阻断状态（设计：禁止 yml 兜底）。"
      class="ai-model__alert"
    />

    <SignalBand :metrics="signals" compact class="ai-model__signals" />

    <section class="ai-model__panel">
      <header class="ai-model__panel-header">
        <h3 class="ai-model__panel-title">当前启用模型</h3>
        <div v-if="activeProfile" class="ai-model__panel-meta">
          <a-tag :color="healthColor(activeProfile.healthStatus)">
            {{ healthLabel(activeProfile.healthStatus) }}
          </a-tag>
          <UiButton
            variant="outline"
            size="sm"
            :loading="healthLoading === activeProfile.id"
            @click="handleHealthCheck(activeProfile)"
          >
            重新检测
          </UiButton>
        </div>
      </header>
      <UiEmpty
        v-if="!activeProfile"
        description="当前租户尚未启用任何 AI 模型，请从候选仓库中选择一条设为启用"
        size="sm"
      />
      <a-descriptions v-else :column="3" size="small" bordered>
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
        <a-descriptions-item label="上次检测时间">
          {{ activeProfile.lastHealthCheckAt || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="最近诊断" :span="2">
          {{ activeProfile.lastHealthMessage || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </section>

    <section class="ai-model__panel">
      <header class="ai-model__panel-header">
        <h3 class="ai-model__panel-title">模型候选仓库</h3>
      </header>

      <UiDataTable
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :show-pagination="false"
        flat
        :total="list.length"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'profileName'">
            <a-space>
              <span>{{ record.profileName }}</span>
              <a-tag v-if="record.enabled" color="green"> 启用 </a-tag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'apiKeyConfigured'">
            <a-tag :color="text ? 'blue' : 'red'">
              {{ text ? '已配置' : '未配置' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'healthStatus'">
            <a-tag :color="healthColor(text)">
              {{ healthLabel(text) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <UiButton
                v-if="!record.enabled"
                variant="primary"
                size="sm"
                :loading="activatingId === record.id"
                @click="handleActivate(record)"
              >
                设为启用
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                :loading="healthLoading === record.id"
                @click="handleHealthCheck(record)"
              >
                健康检查
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="openEdit(record)"> 编辑 </UiButton>
              <UiButton
                variant="ghost"
                status="danger"
                size="sm"
                :disabled="!record.enabled"
                @click="handleDisable(record)"
              >
                停用
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建 AI 模型配置' : '编辑 AI 模型配置'"
      :width="680"
      :confirm-loading="submitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-alert
        v-if="editor.enabled"
        type="info"
        show-icon
        message="提交后本条配置将成为当前租户唯一启用模型，同租户其它配置会被后端自动置为停用。"
        class="ai-model__editor-alert"
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
                class="ai-model__number-full"
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
        <a-form-item label="启用为当前租户唯一 AI 模型">
          <a-switch v-model:checked="editor.enabled" />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-model {
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

  &__alert {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
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
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__editor-alert {
    margin-bottom: 12px;
  }

  &__number-full {
    width: 100%;
  }
}
</style>
