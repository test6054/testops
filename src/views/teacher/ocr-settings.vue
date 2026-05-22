<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  MarkOcrConfigVO,
  MarkOcrHealthStatusCode,
  MarkOcrProviderTypeCode,
  MarkOcrRecognizeVO,
  PaddleOcrInstanceVO,
} from '@/apis/mark/ocr'
import ApiOutlined from '@ant-design/icons-vue/ApiOutlined'
import ClusterOutlined from '@ant-design/icons-vue/ClusterOutlined'
import ExperimentOutlined from '@ant-design/icons-vue/ExperimentOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import {
  checkMarkOcrHealth,
  getCurrentMarkOcrConfig,
  listPaddleOcrInstances,
  MARK_OCR_HEALTH_STATUS_COLOR,
  MARK_OCR_HEALTH_STATUS_LABEL,
  MARK_OCR_PROVIDER_DESCRIPTION,
  MARK_OCR_PROVIDER_LABEL,
  recognizeMarkOcr,
  saveMarkOcrConfig,
} from '@/apis/mark/ocr'
import { UiBadge, UiButton, UiCard, UiEmpty, UiErrorRetryPanel, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'

defineOptions({ name: 'TeacherOcrSettings' })

interface ConfigFormState {
  providerType: MarkOcrProviderTypeCode
  enabled: boolean
}

interface DebugFormState {
  examId?: string
  paperInstanceId?: string
  questionTemplateId?: string
  responseSliceId?: string
  fileId?: string
}

const configFormRef = ref<FormInstance | null>(null)
const debugFormRef = ref<FormInstance | null>(null)
const loading = ref(false)
// D-9 错误态：OCR 配置加载失败时 UiErrorRetryPanel 重试 + 上报
const configLoadError = ref<unknown>(null)
const saving = ref(false)
const checking = ref(false)
const recognizing = ref(false)
const currentConfig = ref<MarkOcrConfigVO | null>(null)
const recognizeResult = ref<MarkOcrRecognizeVO | null>(null)
const configForm = ref<ConfigFormState>({ providerType: 'PADDLE', enabled: false })
const debugForm = ref<DebugFormState>({})

// 仅 PADDLE 渠道相关：展示后端已注册的 PaddleOCR 服务实例列表。
// 用 watch(currentConfig.providerType) 自动开关加载，无需手动触发。
const paddleInstances = ref<PaddleOcrInstanceVO[]>([])
const paddleInstancesLoading = ref(false)
const paddleInstancesError = ref<unknown>(null)

// 直接从后端真实枚举 LABEL 对象派生 select options，零 as 断言。
const providerOptions = Object.entries(MARK_OCR_PROVIDER_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const configRules: Record<string, Rule[]> = {
  providerType: [{ required: true, message: '请选择 OCR 渠道', trigger: 'change' }],
  enabled: [{ required: true, type: 'boolean', message: '请选择启用状态', trigger: 'change' }],
}
const debugRules: Record<string, Rule[]> = {
  examId: [{ required: true, message: '请输入考试ID', trigger: 'blur' }],
}

const healthStatus = computed<MarkOcrHealthStatusCode>(
  () => currentConfig.value?.healthStatus || 'UNKNOWN',
)
const healthColor = computed(() => MARK_OCR_HEALTH_STATUS_COLOR[healthStatus.value] || 'default')
const healthLabel = computed(
  () => MARK_OCR_HEALTH_STATUS_LABEL[healthStatus.value] || healthStatus.value,
)
const currentProviderLabel = computed(() => providerLabel(currentConfig.value?.providerType))
const providerIntro = computed(() => MARK_OCR_PROVIDER_DESCRIPTION[configForm.value.providerType])
const canCheckHealth = computed(() => Boolean(currentConfig.value?.providerType))
const canRecognize = computed(() =>
  Boolean(currentConfig.value?.providerType && currentConfig.value.enabled),
)

function providerLabel(providerType?: MarkOcrProviderTypeCode): string {
  return providerType ? MARK_OCR_PROVIDER_LABEL[providerType] : '未配置'
}

function applyConfig(config: MarkOcrConfigVO): void {
  currentConfig.value = config
  configForm.value = {
    providerType: config.providerType || 'PADDLE',
    enabled: Boolean(config.enabled),
  }
}

async function loadConfig(): Promise<void> {
  loading.value = true
  configLoadError.value = null
  try {
    applyConfig(await getCurrentMarkOcrConfig())
  } catch (error) {
    configLoadError.value = error
    const errMsg = error instanceof Error ? error.message : 'OCR 配置加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

async function handleSave(): Promise<void> {
  await configFormRef.value?.validate()
  saving.value = true
  try {
    await saveMarkOcrConfig(configForm.value)
    message.success('OCR 渠道配置已保存')
    recognizeResult.value = null
    await loadConfig()
  } finally {
    saving.value = false
  }
}

async function handleHealthCheck(): Promise<void> {
  checking.value = true
  try {
    const result = await checkMarkOcrHealth()
    message[result.healthStatus === 'HEALTHY' ? 'success' : 'warning'](
      result.healthMessage || '健康检查已完成',
    )
    await loadConfig()
  } finally {
    checking.value = false
  }
}

async function handleRecognize(): Promise<void> {
  await debugFormRef.value?.validate()
  if (!debugForm.value.fileId && !debugForm.value.responseSliceId) {
    message.warning('文件ID和作答切片ID至少填写一项')
    return
  }
  recognizing.value = true
  try {
    recognizeResult.value = await recognizeMarkOcr({
      examId: debugForm.value.examId!,
      paperInstanceId: debugForm.value.paperInstanceId,
      questionTemplateId: debugForm.value.questionTemplateId,
      responseSliceId: debugForm.value.responseSliceId,
      fileId: debugForm.value.fileId,
    })
  } finally {
    recognizing.value = false
  }
}

// PADDLE 实例列表：当当前渠道为 PADDLE 时显示，跟随 currentConfig.providerType 变化自动加载
const isPaddleProvider = computed(() => currentConfig.value?.providerType === 'PADDLE')

const paddleHealthyCount = computed(
  () => paddleInstances.value.filter((it) => it.healthStatus === 'HEALTHY').length,
)

async function loadPaddleInstances(): Promise<void> {
  paddleInstancesLoading.value = true
  paddleInstancesError.value = null
  try {
    paddleInstances.value = await listPaddleOcrInstances()
  } catch (error) {
    paddleInstancesError.value = error
    paddleInstances.value = []
  } finally {
    paddleInstancesLoading.value = false
  }
}

watch(
  isPaddleProvider,
  (paddle) => {
    if (paddle) {
      void loadPaddleInstances()
    } else {
      paddleInstances.value = []
      paddleInstancesError.value = null
    }
  },
  { immediate: false },
)

function paddleInstanceHealthTone(status?: MarkOcrHealthStatusCode) {
  return MARK_OCR_HEALTH_STATUS_COLOR[status ?? 'UNKNOWN']
}

function paddleInstanceHealthLabel(status?: MarkOcrHealthStatusCode): string {
  return MARK_OCR_HEALTH_STATUS_LABEL[status ?? 'UNKNOWN']
}

onMounted(loadConfig)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="ocr-settings__context">
        <div class="ocr-settings__context-info">
          <h2 class="ocr-settings__title">阅卷交付 - OCR 设置与调用检测</h2>
          <UiTag :tone="currentConfig?.enabled ? 'green' : 'gray'" size="sm">
            {{ currentConfig?.enabled ? '已启用' : '未启用' }}
          </UiTag>
          <a-tag :color="healthColor">
            {{ healthLabel }}
          </a-tag>
        </div>
        <div class="ocr-settings__context-actions">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadConfig">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <!-- D-9 错误态：OCR 配置加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="configLoadError"
      :error="configLoadError"
      title="OCR 配置加载失败"
      @retry="loadConfig"
    />

    <div v-else class="ocr-grid">
      <UiCard class="info-card">
        <template #title>
          <ApiOutlined />
          <span>租户 OCR 渠道</span>
        </template>
        <a-form ref="configFormRef" :model="configForm" :rules="configRules" layout="vertical">
          <a-form-item label="当前渠道" name="providerType" required>
            <a-radio-group v-model:value="configForm.providerType" class="provider-group">
              <a-radio-button v-for="item in providerOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-radio-button>
            </a-radio-group>
          </a-form-item>
          <a-alert type="info" show-icon :message="providerIntro" />
          <a-form-item label="启用状态" name="enabled" required class="switch-row">
            <a-switch
              v-model:checked="configForm.enabled"
              checked-children="启用"
              un-checked-children="关闭"
            />
          </a-form-item>
          <a-space>
            <UiButton :loading="saving" @click="handleSave">
              <template #icon><SaveOutlined /></template>
              保存配置
            </UiButton>
            <UiButton
              variant="outline"
              :disabled="!canCheckHealth"
              :loading="checking"
              @click="handleHealthCheck"
            >
              健康检查
            </UiButton>
          </a-space>
        </a-form>
      </UiCard>

      <UiCard class="info-card">
        <template #title>
          <ExperimentOutlined />
          <span>运行状态</span>
        </template>
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="已保存渠道">{{ currentProviderLabel }}</a-descriptions-item>
          <a-descriptions-item label="启用状态">
            {{ currentConfig?.enabled ? '启用' : '关闭' }}
          </a-descriptions-item>
          <a-descriptions-item label="健康状态">
            <a-tag :color="healthColor">{{ healthLabel }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="最近检查">
            {{ currentConfig?.lastHealthCheckAt || '未检查' }}
          </a-descriptions-item>
        </a-descriptions>
        <a-alert
          v-if="currentConfig?.lastHealthMessage"
          class="state-message"
          :type="healthStatus === 'FAILED' ? 'error' : 'success'"
          show-icon
          :message="currentConfig.lastHealthMessage"
        />
      </UiCard>
    </div>

    <!-- PaddleOCR 实例列表：仅当当前渠道为 PADDLE 时展示，按健康状态排序 -->
    <UiCard v-if="isPaddleProvider" class="info-card paddle-card">
      <template #title>
        <ClusterOutlined />
        <span>PaddleOCR 服务实例</span>
        <UiBadge :tone="paddleHealthyCount > 0 ? 'green' : 'gray'">
          健康 {{ paddleHealthyCount }} / {{ paddleInstances.length }}
        </UiBadge>
      </template>
      <template #extra>
        <UiButton
          variant="outline"
          size="sm"
          :loading="paddleInstancesLoading"
          @click="loadPaddleInstances"
        >
          <template #icon><ReloadOutlined /></template>
          刷新
        </UiButton>
      </template>

      <UiErrorRetryPanel
        v-if="paddleInstancesError"
        :error="paddleInstancesError"
        title="PaddleOCR 实例加载失败"
        compact
        @retry="loadPaddleInstances"
      />
      <a-skeleton v-else-if="paddleInstancesLoading && paddleInstances.length === 0" active />
      <UiEmpty
        v-else-if="paddleInstances.length === 0"
        description="后端尚未注册任何 PaddleOCR 服务实例。请检查 mark-ocr-paddle 容器是否正常启动并完成自注册。"
      />
      <a-list v-else :data-source="paddleInstances" item-layout="horizontal">
        <template #renderItem="{ item }: { item: PaddleOcrInstanceVO }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <span class="paddle-instance__name">{{ item.instanceName || `instance-${item.id}` }}</span>
                <UiTag :tone="paddleInstanceHealthTone(item.healthStatus)" size="sm">
                  {{ paddleInstanceHealthLabel(item.healthStatus) }}
                </UiTag>
                <UiTag v-if="item.localAutoDeploy" tone="blue" size="sm">本地自动部署</UiTag>
                <UiTag v-if="item.deviceType" tone="gray" size="sm">{{ item.deviceType }}</UiTag>
              </template>
              <template #description>
                <div class="paddle-instance__meta">
                  <span class="paddle-instance__url">{{ item.serviceUrl || '-' }}</span>
                  <span class="paddle-instance__sep">·</span>
                  <span>最近探活：{{ item.lastHealthCheckAt || '未探活' }}</span>
                  <template v-if="(item.consecutiveFailures ?? 0) > 0">
                    <span class="paddle-instance__sep">·</span>
                    <span class="paddle-instance__failed">连续失败 {{ item.consecutiveFailures }} 次</span>
                  </template>
                </div>
                <div v-if="item.lastHealthMessage" class="paddle-instance__msg">
                  {{ item.lastHealthMessage }}
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </UiCard>

    <UiCard class="info-card">
      <template #title>
        <ExperimentOutlined />
        <span>同步调试</span>
      </template>
      <a-alert
        type="warning"
        show-icon
        message="同步调试使用当前租户已保存渠道，不支持临时指定供应商。"
      />
      <a-form
        ref="debugFormRef"
        :model="debugForm"
        :rules="debugRules"
        layout="vertical"
        class="debug-form"
      >
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="考试ID" name="examId" required>
              <a-input v-model:value="debugForm.examId" placeholder="examId" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="试卷实例ID">
              <a-input v-model:value="debugForm.paperInstanceId" placeholder="paperInstanceId" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="题目模板ID">
              <a-input
                v-model:value="debugForm.questionTemplateId"
                placeholder="questionTemplateId"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="作答切片ID">
              <a-input v-model:value="debugForm.responseSliceId" placeholder="responseSliceId" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="文件ID">
              <a-input v-model:value="debugForm.fileId" placeholder="fileId" />
            </a-form-item>
          </a-col>
        </a-row>
        <UiButton :disabled="!canRecognize" :loading="recognizing" @click="handleRecognize">
          <template #icon><ExperimentOutlined /></template>
          执行识别
        </UiButton>
      </a-form>

      <template v-if="recognizeResult">
        <a-divider />
        <a-descriptions title="识别结果" :column="1" size="small" bordered>
          <a-descriptions-item label="使用渠道">
            {{ providerLabel(recognizeResult.providerType) }}
          </a-descriptions-item>
          <a-descriptions-item label="追踪ID">
            {{ recognizeResult.engineTraceId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="诊断信息">
            {{ recognizeResult.diagnostic || '-' }}
          </a-descriptions-item>
        </a-descriptions>
        <div class="result-text-block">
          <div class="result-text-label">识别文本</div>
          <pre class="result-text-pre">{{ recognizeResult.recognizedText || '（空）' }}</pre>
        </div>
      </template>
      <UiEmpty v-else-if="!recognizing" description="暂无识别结果" />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ocr-settings {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.ocr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .ocr-grid {
    grid-template-columns: 1fr;
  }
}

.info-card {
  margin-bottom: 0;
}

.provider-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.switch-row {
  margin-top: 12px;
}

.debug-form {
  margin-top: 12px;
}

.state-message {
  margin-top: 12px;
}

.result-text-block {
  margin-top: 12px;
}

.result-text-label {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--color-text-2);
}

.result-text-pre {
  background: var(--color-fill-2, #f5f5f5);
  border: 1px solid var(--color-border, #e5e5e5);
  border-radius: 4px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
}

.paddle-card {
  margin-top: 12px;
}

.paddle-instance__name {
  font-weight: 600;
  margin-right: 8px;
}

.paddle-instance__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.paddle-instance__url {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.paddle-instance__sep {
  color: rgba(0, 0, 0, 0.25);
}

.paddle-instance__failed {
  color: #d4380d;
  font-weight: 600;
}

.paddle-instance__msg {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
