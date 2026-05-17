<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  MarkOcrConfigVO,
  MarkOcrHealthStatusCode,
  MarkOcrProviderTypeCode,
  MarkOcrRecognizeVO,
} from '@/apis/mark/ocr'
import {
  checkMarkOcrHealth,
  getCurrentMarkOcrConfig,
  MARK_OCR_HEALTH_STATUS_COLOR,
  MARK_OCR_HEALTH_STATUS_LABEL,
  MARK_OCR_PROVIDER_DESCRIPTION,
  MARK_OCR_PROVIDER_LABEL,
  recognizeMarkOcr,
  saveMarkOcrConfig,
} from '@/apis/mark/ocr'
import ApiOutlined from '@ant-design/icons-vue/ApiOutlined'
import ExperimentOutlined from '@ant-design/icons-vue/ExperimentOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

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
const saving = ref(false)
const checking = ref(false)
const recognizing = ref(false)
const currentConfig = ref<MarkOcrConfigVO | null>(null)
const recognizeResult = ref<MarkOcrRecognizeVO | null>(null)
const configForm = ref<ConfigFormState>({ providerType: 'PADDLE', enabled: false })
const debugForm = ref<DebugFormState>({})

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
  try {
    applyConfig(await getCurrentMarkOcrConfig())
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

onMounted(loadConfig)
</script>

<template>
  <GiPageLayout>
    <div class="ocr-settings-page">
      <PageHeader title="OCR 配置">
        <template #tags>
          <UiTag :tone="currentConfig?.enabled ? 'green' : 'gray'" size="md">
            {{ currentConfig?.enabled ? '已启用' : '未启用' }}
          </UiTag>
          <a-tag :color="healthColor">{{ healthLabel }}</a-tag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadConfig">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <div class="ocr-grid">
        <UiCard class="info-card">
          <template #title>
            <ApiOutlined />
            <span>租户 OCR 渠道</span>
          </template>
          <a-form ref="configFormRef" :model="configForm" :rules="configRules" layout="vertical">
            <a-form-item label="当前渠道" name="providerType" required>
              <a-radio-group v-model:value="configForm.providerType" class="provider-group">
                <a-radio-button
                  v-for="item in providerOptions"
                  :key="item.value"
                  :value="item.value"
                >
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
    </div>
  </GiPageLayout>
</template>

<style scoped>
.ocr-settings-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
</style>
