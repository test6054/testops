<script setup lang="ts">
/**
 * AI 模型配置工作台
 *
 * 用途：
 * - 维护本租户 7 类能力 (ability_code) 的 AI 模型默认启用配置
 * - 每个能力同一租户必须有至少一条 default_profile=true AND enabled=true 的记录，否则对应 AI 主链调用会直接失败（设计：禁止 yml 兜底）
 * - 支持健康检查，验证连通性
 */
import type {
  AiModelProfileQueryPayload,
  AiModelProfileSavePayload,
  AiModelProfileVO,
  AiTaskType,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { AI_TASK_TYPE_LABEL, aiModelProfileApi } from '@/apis/quality'

const list = ref<AiModelProfileVO[]>([])
const loading = ref(false)
const query = reactive<AiModelProfileQueryPayload>({
  abilityCode: undefined,
  enabled: undefined,
  defaultProfile: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<AiModelProfileSavePayload>({
  profileName: '',
  abilityCode: 'ACHIEVEMENT_DIAGNOSIS',
  providerType: 'OPENAI_COMPATIBLE',
  modelName: 'gpt-4o-mini',
  apiHost: 'https://api.openai.com/v1',
  apiKey: '',
  temperature: 0.2,
  maxTokens: 4096,
  connectTimeoutSecs: 30,
  readTimeoutSecs: 600,
  defaultProfile: true,
  enabled: true,
  remark: '',
})
const submitting = ref(false)
const healthLoading = ref<string>('')

const abilityOptions = Object.entries(AI_TASK_TYPE_LABEL).map(([value, label]) => ({ value, label }))

async function loadList() {
  loading.value = true
  try {
    list.value = await aiModelProfileApi.list({
      abilityCode: query.abilityCode || undefined,
      enabled: query.enabled,
      defaultProfile: query.defaultProfile,
      keyword: query.keyword?.trim() || undefined,
    })
  }
  finally {
    loading.value = false
  }
}

function resetQuery() {
  query.abilityCode = undefined
  query.enabled = undefined
  query.defaultProfile = undefined
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    profileName: '',
    abilityCode: 'ACHIEVEMENT_DIAGNOSIS',
    providerType: 'OPENAI_COMPATIBLE',
    modelName: 'gpt-4o-mini',
    apiHost: 'https://api.openai.com/v1',
    apiKey: '',
    temperature: 0.2,
    maxTokens: 4096,
    connectTimeoutSecs: 30,
    readTimeoutSecs: 600,
    defaultProfile: true,
    enabled: true,
    remark: '',
  })
  editorVisible.value = true
}

function openEdit(record: AiModelProfileVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record, { apiKey: '' })
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.profileName.trim() || !editor.modelName.trim()) {
    message.error('请填写名称 / 模型名')
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
  }
  finally {
    submitting.value = false
  }
}

async function handleDisable(record: AiModelProfileVO) {
  Modal.confirm({
    title: `停用模型配置 ${record.profileName}？`,
    okType: 'danger',
    content: '后端不提供硬删除；停用后本能力需其它 default profile 提供服务。',
    onOk: async () => {
      await aiModelProfileApi.save({
        ...record,
        apiKey: undefined,
        enabled: false,
        defaultProfile: false,
      })
      message.success('已停用')
      await loadList()
    },
  })
}

async function handleHealthCheck(record: AiModelProfileVO) {
  healthLoading.value = record.id
  try {
    const result = await aiModelProfileApi.healthCheck({ id: record.id })
    if (result.ok) {
      message.success(`连通 OK，延迟 ${result.latencyMs ?? '-'} ms`)
    }
    else {
      message.error(`连通失败：${result.errorMessage || '未知原因'}`)
    }
  }
  finally {
    healthLoading.value = ''
  }
}

onMounted(loadList)
</script>

<template>
  <div class="page">
    <a-alert
      type="warning"
      show-icon
      message="AI 主链调用前必须为本租户每个能力配置至少 1 条 default + enabled 的模型记录；否则任务会立即进入 FAILED 状态（设计：禁止 yml 兜底）。"
      style="margin-bottom: 12px"
    />

    <a-card title="AI 模型配置" :bordered="false">
      <template #extra>
        <a-space>
          <a-select v-model:value="query.abilityCode" placeholder="能力" style="width: 200px" allow-clear :options="abilityOptions" />
          <a-select v-model:value="query.enabled" placeholder="启用" style="width: 100px" allow-clear>
            <a-select-option :value="true">
              启用
            </a-select-option>
            <a-select-option :value="false">
              停用
            </a-select-option>
          </a-select>
          <a-select v-model:value="query.defaultProfile" placeholder="默认" style="width: 100px" allow-clear>
            <a-select-option :value="true">
              默认
            </a-select-option>
            <a-select-option :value="false">
              非默认
            </a-select-option>
          </a-select>
          <a-input v-model:value="query.keyword" placeholder="关键字" style="width: 160px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">
            查询
          </a-button>
          <a-button @click="resetQuery">
            重置
          </a-button>
          <a-button type="primary" @click="openCreate">
            新建配置
          </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="false"
      >
        <a-table-column title="名称" data-index="profileName" />
        <a-table-column title="能力" data-index="abilityCode" width="160">
          <template #default="{ text }">
            {{ AI_TASK_TYPE_LABEL[text as AiTaskType] || text }}
          </template>
        </a-table-column>
        <a-table-column title="Provider" data-index="providerType" width="160" />
        <a-table-column title="模型" data-index="modelName" width="160" />
        <a-table-column title="温度" data-index="temperature" width="80" />
        <a-table-column title="最大 Token" data-index="maxTokens" width="100" />
        <a-table-column title="默认" data-index="defaultProfile" width="80">
          <template #default="{ text }">
            <a-tag :color="text ? 'gold' : 'default'">
              {{ text ? '默认' : '-' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="enabled" width="80">
          <template #default="{ text }">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="240" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" :loading="healthLoading === record.id" @click="handleHealthCheck(record)">
                健康检查
              </a-button>
              <a-button type="link" size="small" @click="openEdit(record)">
                编辑
              </a-button>
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
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="配置名称" required>
              <a-input v-model:value="editor.profileName" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="能力" required>
              <a-select v-model:value="editor.abilityCode" :options="abilityOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Provider 类型">
              <a-select v-model:value="editor.providerType">
                <a-select-option value="OPENAI_COMPATIBLE">
                  OpenAI 兼容
                </a-select-option>
                <a-select-option value="DEEPSEEK">
                  DeepSeek
                </a-select-option>
                <a-select-option value="QWEN">
                  Qwen
                </a-select-option>
                <a-select-option value="DOUBAO">
                  Doubao
                </a-select-option>
                <a-select-option value="MOONSHOT">
                  Moonshot
                </a-select-option>
                <a-select-option value="ANTHROPIC">
                  Anthropic
                </a-select-option>
                <a-select-option value="LOCAL_OLLAMA">
                  Local Ollama
                </a-select-option>
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
        <a-form-item :label="editorMode === 'create' ? 'API Key (必填，加密保存)' : 'API Key (留空不修改)'">
          <a-input-password v-model:value="editor.apiKey" :placeholder="editorMode === 'create' ? 'sk-...' : '不更新则留空'" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="温度">
              <a-input-number v-model:value="editor.temperature" :min="0" :max="2" :step="0.1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="最大 Token">
              <a-input-number v-model:value="editor.maxTokens" :min="64" :max="32768" :step="64" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="连接超时 (s)">
              <a-input-number v-model:value="editor.connectTimeoutSecs" :min="1" :max="120" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="读取超时 (s)">
              <a-input-number v-model:value="editor.readTimeoutSecs" :min="30" :max="1800" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="设为默认">
              <a-switch v-model:checked="editor.defaultProfile" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="启用">
              <a-switch v-model:checked="editor.enabled" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
</style>
