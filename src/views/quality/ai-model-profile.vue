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
 * 唯一启用约束：当前租户同供应商 enabled=true 最多 1 条。切换启用时后端会在 advisory lock 下
 *   串行化并把当前租户同供应商其它配置置为停用。质量评价文本任务仅使用 DeepSeek V4，
 *   千问多模态不属于本页面的配置范围。
 */
import type {
  AiModelProfileSaveRequest,
  AiModelProfileSignalSummaryVO,
  AiModelProfileVO,
} from '@/apis/quality/ai-model-profile'
import type { AiHealthStatusCode } from '@/apis/quality/types'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { aiModelProfileApi } from '@/apis/quality/ai-model-profile'
import {
  AI_HEALTH_STATUS_COLOR,
  AiHealthStatusDescription,
  AiProviderTypeCode,
  AiProviderTypeDescription,
} from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import PasswordInput from '@/components/ui-guide/ui/PasswordInput.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
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
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const pageNum = ref(1)
const pageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const pageTotal = ref(0)

const columns: ColumnsType = [
  { title: '名称', dataIndex: 'profileName', key: 'profileName' },
  { title: '服务商', dataIndex: 'providerType', key: 'providerType', width: 140 },
  { title: '模型', dataIndex: 'modelName', key: 'modelName', width: 180, fixed: 'left' },
  { title: '温度', dataIndex: 'temperature', key: 'temperature', width: 80 },
  { title: '最大输出量', dataIndex: 'maxTokens', key: 'maxTokens', width: 110 },
  { title: '最大输入字符', dataIndex: 'maxInputChars', key: 'maxInputChars', width: 130 },
  { title: '密钥', dataIndex: 'apiKeyMasked', key: 'apiKeyMasked', width: 220 },
  { title: '健康', dataIndex: 'healthStatus', key: 'healthStatus', width: 100 },
  { title: '操作', key: 'actions', width: 380 },
]

function healthLabel(value: AiHealthStatusCode | null | undefined): string {
  if (value === null || value === undefined) return ''
  return strictEnumLabel(AiHealthStatusDescription, value, 'AI 模型健康状态')
}

function healthColor(value: AiHealthStatusCode | null | undefined): BadgeTone {
  if (value === null || value === undefined) return 'gray'
  return strictEnumTone(AI_HEALTH_STATUS_COLOR, value, 'AI 模型健康状态')
}

function providerTypeLabel(value: AiProviderTypeCode): string {
  return strictEnumLabel(AiProviderTypeDescription, value, 'AI 服务商类型')
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
  [key: string]: unknown
  enabledOnly: boolean
}

const filterForm = reactive<AiModelProfileFilterModel>({
  enabledOnly: false,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [{ key: 'enabledOnly', type: 'custom' }]

const list = ref<AiModelProfileVO[]>([])
const loading = ref(false)

/** 当前租户的启用配置，独立查询避免分页列表只展示当前页启用项。 */
const activeProfiles = ref<AiModelProfileVO[]>([])

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
  providerType: AiProviderTypeCode.DEEPSEEK,
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

function buildAiModelListQuery() {
  return {
    enabledOnly: filterForm.enabledOnly || undefined,
    pageNum: pageNum.value,
    pageSize: pageSize.value,
  }
}

const signalSummary = ref<AiModelProfileSignalSummaryVO | null>(null)

async function loadActiveProfiles() {
  try {
    const page = await aiModelProfileApi.page({
      enabledOnly: true,
      pageNum: 1,
      pageSize: 10,
    })
    activeProfiles.value = page.list
  } catch (error) {
    activeProfiles.value = []
    showUserError(error, '已启用模型配置加载失败')
  }
}

async function loadList() {
  loading.value = true
  try {
    const listQuery = buildAiModelListQuery()
    const page = await aiModelProfileApi.page(listQuery)
    list.value = page.list
    pageNum.value = page.pageNum
    pageSize.value = page.pageSize
    pageTotal.value = page.total
    try {
      signalSummary.value = await aiModelProfileApi.signalSummary(listQuery)
    } catch (error) {
      signalSummary.value = null
      showUserError(error, '模型配置状态统计加载失败')
    }
    await loadActiveProfiles()
  } catch (error) {
    list.value = []
    pageTotal.value = 0
    signalSummary.value = null
    showUserError(error, '当前租户智能模型配置列表加载失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(event: { current: number, pageSize: number }): void {
  pageNum.value = event.current
  pageSize.value = event.pageSize
  void loadList()
}

function handleSearch() {
  pageNum.value = 1
  void loadList()
}

function handleReset() {
  filterForm.enabledOnly = false
  pageNum.value = 1
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
    showFormValidationMessage('请填写配置名称 / 模型名')
    return
  }
  if (!apiHost) {
    showFormValidationMessage('请填写模型服务地址')
    return
  }
  if (editorMode.value === 'create' && !editor.apiKey?.trim()) {
    showFormValidationMessage('新建模型配置时必须填写模型访问密钥')
    return
  }
  if (!editor.maxInputChars || editor.maxInputChars <= 0) {
    showFormValidationMessage('最大输入字符数必须大于 0')
    return
  }
  if (editor.temperature != null && (editor.temperature < 0 || editor.temperature > 1)) {
    showFormValidationMessage('温度参数必须在 0 到 1 之间')
    return
  }
  if (editor.maxTokens != null && editor.maxTokens <= 0) {
    showFormValidationMessage('最大输出长度必须大于零')
    return
  }
  if (editor.connectTimeoutSecs != null && editor.connectTimeoutSecs <= 0) {
    showFormValidationMessage('连接超时秒数必须大于 0')
    return
  }
  if (editor.readTimeoutSecs != null && editor.readTimeoutSecs <= 0) {
    showFormValidationMessage('读取超时秒数必须大于 0')
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
    void message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

/**
 * 将某条配置设为同供应商唯一启用。
 *
 * 后端会在 advisory lock 下把当前租户同供应商其它配置置为停用，前端仅负责颗粒度提交
 * （携带原记录 + apiKey 留空保留原密钥）。
 */
function buildAiModelProfileActions(record: AiModelProfileVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (!record.enabled) {
    actions.push({
      key: 'activate',
      label: '设为启用',
      tone: 'primary',
      disabled: activatingId.value === record.id,
    })
  }
  actions.push({
    key: 'health-check',
    label: '健康检查',
    disabled: healthLoading.value === record.id,
  })
  actions.push({ key: 'edit', label: '编辑' })
  actions.push({ key: 'disable', label: '停用', tone: 'danger' })
  return actions
}

function handleAiModelProfileAction(key: string, record: AiModelProfileVO): void {
  switch (key) {
    case 'activate':
      void handleActivate(record)
      break
    case 'health-check':
      void handleHealthCheck(record)
      break
    case 'edit':
      openEdit(record)
      break
    case 'disable':
      void handleDisable(record)
      break
  }
}

async function handleActivate(record: AiModelProfileVO) {
  if (record.enabled) {
    return
  }
  const current = activeProfiles.value.find((item) => item.providerType === record.providerType)
  void confirmAsync({
    title: `将「${record.profileName}」设为当前启用模型？`,
    type: 'warning',
    content: current
      ? `当前启用的同供应商配置「${current.profileName}」将被自动置为停用。当前租户同供应商只保留一条启用记录。`
      : `提交后本条配置将作为当前租户 ${providerTypeLabel(record.providerType)} 的启用模型。`,
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
        void message.success('已设为当前启用模型')
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
      ? '该配置是当前启用模型。停用后当前租户对应供应商将没有可用 AI 模型，相关 AI 任务会进入阻断状态。请谨慎操作。'
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
      void message.success('已停用')
      await loadList()
    },
  })
}

async function handleHealthCheck(record: AiModelProfileVO) {
  healthLoading.value = record.id
  try {
    const result = await aiModelProfileApi.healthCheck({ profileId: record.id })
    if (result.healthStatus === 'HEALTHY') {
      void message.success('智能模型连通检测通过')
    } else {
      const healthMessage = getUserErrorMessage(
        { message: result.healthMessage },
        '智能模型连通校验失败，请检查模型地址、密钥和网络配置',
      )
      void message.error(healthMessage)
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
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const enabledCount = summary.enabledCount ?? 0
  const healthy = summary.healthyCount ?? 0
  const failed = summary.failedCount ?? 0
  const keyMissing = summary.keyMissingCount ?? 0
  return [
    { key: 'total', label: '候选总数', value: summary.totalCount ?? 0, tone: 'blue' },
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

onMounted(() => {
  void loadList()
})

onActivated(() => {
  void loadList()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="AI 模型配置" />
    </template>

    <template #signal>
      <SignalBand :metrics="signals" variant="panel" compact class="ai-model__signals" />
    </template>

    <UiCard class="detail-table-card ai-model__active-card">
      <template #title>当前启用模型</template>

      <WorkbenchContextGateStrip
        v-if="activeProfiles.length === 0"
        tag="未启用"
        body="尚未启用文本模型，请新建配置后设为启用"
        cta-label="新建模型配置"
        @cta="openCreate"
      />
      <div
        v-else
        class="ai-model__active-list dp-space dp-space--vertical dp-space--block"
        style="--dp-space-gap: 12px"
      >
        <UiDescriptions
          v-for="profile in activeProfiles"
          :key="profile.id"
          :column="3"
          size="small"
          bordered
        >
          <template #title>
            <div class="dp-space" style="--dp-space-gap: 8px">
              <span>{{ providerTypeLabel(profile.providerType) }}</span>
              <UiTag :tone="healthColor(profile.healthStatus)" size="sm">
                {{ healthLabel(profile.healthStatus) }}
              </UiTag>
            </div>
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
          <UiDescriptionsItem label="配置名称">
            {{ profile.profileName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="模型">
            {{ profile.modelName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="密钥">
            {{ apiKeyDisplayText(profile) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="模型服务地址" :span="3">
            {{ profile.apiHost }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="上次检测时间">
            {{ profile.lastHealthCheckTime || '尚未检测' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="最近检测说明" :span="2">
            {{ aiModelHealthMessageText(profile.lastHealthMessage) }}
          </UiDescriptionsItem>
        </UiDescriptions>
      </div>
    </UiCard>

    <UiCard class="detail-table-card ai-model__table-card">
      <template #title>模型候选仓库</template>
      <template #extra>
        <UiButton size="sm" variant="primary" @click="openCreate">新建配置</UiButton>
      </template>

      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #field-enabledOnly>
          <UiCheckbox v-model="filterForm.enabledOnly">仅看启用</UiCheckbox>
        </template>
      </UiFilterBar>

      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :total="pageTotal"
        row-key="id"
        size="middle"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'profileName'">
            <div class="dp-space" style="--dp-space-gap: 8px">
              <span>{{ record.profileName }}</span>
              <UiTag v-if="record.enabled" tone="green" size="sm"> 启用 </UiTag>
            </div>
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
            <UiTableActions
              :items="buildAiModelProfileActions(record)"
              split
              @action="(key) => handleAiModelProfileAction(key, record)"
            />
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
      <UiForm layout="vertical" :model="editor">
        <UiFormItem label="配置名称" required>
          <UiInput size="sm" v-model="editor.profileName" placeholder="例如：DeepSeek-V3 主跳" />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="模型服务商">
              <UiSelect
                v-model="editor.providerType"
                :disabled="editorMode === 'edit'"
                size="sm"
                :options="[
                  { value: 'DEEPSEEK', label: 'DeepSeek' },
                  { value: 'QWEN', label: '通义千问' },
                ]"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="模型名" required>
              <UiInput size="sm" v-model="editor.modelName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="模型服务地址" required>
          <UiInput size="sm" v-model="editor.apiHost" placeholder="https://api.deepseek.com" />
        </UiFormItem>
        <UiFormItem
          :label="
            editorMode === 'create' ? '模型访问密钥（必填）' : '模型访问密钥（留空表示保留原密钥）'
          "
        >
          <PasswordInput
            v-model="editor.apiKey"
            size="sm"
            :placeholder="editorMode === 'create' ? 'sk-...' : '不修改则留空'"
          />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="温度">
              <UiInputNumber
                size="sm"
                v-model="editor.temperature"
                :min="0"
                :max="1"
                :step="0.1"
                class="ai-model__number-full"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="最大输出量">
              <UiInputNumber
                size="sm"
                v-model="editor.maxTokens"
                :min="64"
                :max="32768"
                :step="64"
                class="ai-model__number-full"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="最大输入字符" required>
              <UiInputNumber
                size="sm"
                v-model="editor.maxInputChars"
                :min="1"
                :step="1000"
                class="ai-model__number-full"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="连接超时 (s)">
              <UiInputNumber
                size="sm"
                v-model="editor.connectTimeoutSecs"
                :min="1"
                :max="120"
                class="ai-model__number-full"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="读取超时 (s)">
              <UiInputNumber
                size="sm"
                v-model="editor.readTimeoutSecs"
                :min="30"
                :max="1800"
                class="ai-model__number-full"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>
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
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-3, 12px);

    & + & {
      margin-top: var(--dp-space-3, 12px);
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
