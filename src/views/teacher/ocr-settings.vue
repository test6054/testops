<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ExamQuestionTemplateVO, ExamScoreSummaryItemVO } from '@/apis/mark/exam'
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
  FINAL_SCORE_STATUS_LABEL,
  getExamTemplate,
  isPaperTemplateNotConfiguredError,
  pageExamScoreSummary,
} from '@/apis/mark/exam'
import {
  checkMarkOcrHealth,
  getCurrentMarkOcrConfig,
  listPaddleOcrInstances,
  MARK_OCR_HEALTH_STATUS_COLOR,
  MARK_OCR_HEALTH_STATUS_LABEL,
  MARK_OCR_PROVIDER_LABEL,
  MARK_OCR_PROVIDER_OPTIONS,
  recognizeMarkOcr,
  registerPaddleOcrInstance,
  saveMarkOcrConfig,
} from '@/apis/mark/ocr'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherOcrSettings' })

const PAPER_CANDIDATE_FILTER_PAGE_SIZE = 50

interface ConfigFormState {
  providerType?: MarkOcrProviderTypeCode
  enabled: boolean
}

interface DebugFormState {
  examId?: string
  paperInstanceId?: string
  questionTemplateId?: string
}

const configFormRef = ref<FormInstance | null>(null)
const debugFormRef = ref<FormInstance | null>(null)
const loading = ref(false)
// D-9 错误态：OCR 配置加载失败时 UiErrorRetryPanel 重试 + 上报
const configLoadError = ref<Error | null>(null)
const saving = ref(false)
const checking = ref(false)
const recognizing = ref(false)
const currentConfig = ref<MarkOcrConfigVO | null>(null)
const recognizeResult = ref<MarkOcrRecognizeVO | null>(null)
const configForm = ref<ConfigFormState>({ enabled: false })
const debugForm = ref<DebugFormState>({})
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  init: initExamSelector,
  onExamChange,
} = useMarkExamSelector()

// 仅 PADDLE 渠道相关：展示后端已注册的 PaddleOCR 服务实例列表。
// 用 watch(currentConfig.providerType) 自动开关加载，无需手动触发。
const paddleInstances = ref<PaddleOcrInstanceVO[]>([])
const paddleInstancesLoading = ref(false)
const paddleInstancesError = ref<Error | null>(null)
const registerModalOpen = ref(false)
const registering = ref(false)
const registerForm = ref({
  instanceName: '',
  serviceUrl: '',
  deviceType: 'cpu',
  localAutoDeploy: false,
})
const questions = ref<ExamQuestionTemplateVO[]>([])
const questionsLoading = ref(false)
const questionsError = ref<Error | null>(null)
const paperCandidates = ref<ExamScoreSummaryItemVO[]>([])
const paperCandidatesLoading = ref(false)
const paperCandidatesError = ref<Error | null>(null)
const paperCandidateKeyword = ref('')

const providerOptions = MARK_OCR_PROVIDER_OPTIONS
const configRules: Record<string, Rule[]> = {
  providerType: [{ required: true, message: '请选择 OCR 渠道', trigger: 'change' }],
  enabled: [{ required: true, type: 'boolean', message: '请选择启用状态', trigger: 'change' }],
}
const debugRules: Record<string, Rule[]> = {
  examId: [{ required: true, message: '请选择当前考试', trigger: 'change' }],
  paperInstanceId: [{ required: true, message: '请选择答题卡', trigger: 'change' }],
  questionTemplateId: [{ required: true, message: '请选择题目', trigger: 'change' }],
}

const healthStatus = computed<MarkOcrHealthStatusCode | undefined>(
  () => currentConfig.value?.healthStatus,
)
const healthColor = computed(() =>
  healthStatus.value
    ? strictEnumTone(MARK_OCR_HEALTH_STATUS_COLOR, healthStatus.value, 'OCR 健康状态')
    : undefined,
)
const healthLabel = computed(() =>
  healthStatus.value
    ? strictEnumLabel(MARK_OCR_HEALTH_STATUS_LABEL, healthStatus.value, 'OCR 健康状态')
    : '',
)
const currentProviderLabel = computed(() =>
  currentConfig.value?.providerType ? providerLabel(currentConfig.value.providerType) : '未配置',
)

const canCheckHealth = computed(() => Boolean(currentConfig.value?.providerType))
const canRecognize = computed(() =>
  Boolean(currentConfig.value?.providerType && currentConfig.value.enabled),
)
const questionOptions = computed(() =>
  questions.value.map((question) => ({
    value: question.questionTemplateId,
    label: `题 ${question.questionNo} · ${question.fullScore} 分`,
  })),
)
const paperCandidateOptions = computed(() =>
  paperCandidates.value
    .filter((item) => item.paperInstanceId)
    .map((item) => ({
      value: item.paperInstanceId!,
      label: [
        `${item.studentName}（${item.studentNo}）`,
        item.studentClassName,
        item.bindingStatus,
        finalScoreStatusLabel(item.finalScoreStatus),
      ]
        .filter(Boolean)
        .join(' · '),
    })),
)

function finalScoreStatusLabel(status: ExamScoreSummaryItemVO['finalScoreStatus']): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, status, '最终成绩状态')
}

function providerLabel(providerType: MarkOcrProviderTypeCode): string {
  return strictEnumLabel(MARK_OCR_PROVIDER_LABEL, providerType, 'OCR 渠道')
}

/** 将 OCR 调试诊断转为可展示的识别处理说明，避免暴露引擎和接口调试细节。 */
function ocrDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'OCR 识别未返回可展示说明，请检查切片图像质量或稍后重试',
  )
}

function ocrHealthMessageText(messageText?: string): string {
  return getUserErrorMessage(
    { message: messageText },
    'OCR 渠道检测未返回可展示说明，请检查渠道配置或稍后重试',
  )
}

function applyConfig(config: MarkOcrConfigVO): void {
  const dataError = 'OCR 配置数据异常，请刷新后重试'
  if (config.id) {
    assertUserFacing(Boolean(config.providerType), dataError)
  }
  if (config.enabled) {
    assertUserFacing(Boolean(config.providerType), dataError)
  }
  currentConfig.value = config
  configForm.value = {
    providerType: config.providerType,
    enabled: config.enabled,
  }
}

async function loadConfig(): Promise<void> {
  loading.value = true
  configLoadError.value = null
  try {
    applyConfig(await getCurrentMarkOcrConfig())
  } catch (error) {
    configLoadError.value = toUserError(error, 'OCR 配置加载失败')
    showUserError(error, 'OCR 识别配置加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSave(): Promise<void> {
  await configFormRef.value?.validate()
  if (!configForm.value.providerType) {
    showUserError(null, '请选择 OCR 识别渠道')
    return
  }
  saving.value = true
  try {
    await saveMarkOcrConfig({
      providerType: configForm.value.providerType,
      enabled: configForm.value.enabled,
    })
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
    if (result.healthStatus === 'HEALTHY') {
      message.success('OCR 渠道检测通过')
    } else {
      message.warning(ocrHealthMessageText(result.healthMessage))
    }
    await loadConfig()
  } finally {
    checking.value = false
  }
}

async function handleRecognize(): Promise<void> {
  await debugFormRef.value?.validate()
  recognizing.value = true
  try {
    recognizeResult.value = await recognizeMarkOcr({
      examId: debugForm.value.examId!,
      paperInstanceId: debugForm.value.paperInstanceId!,
      questionTemplateId: debugForm.value.questionTemplateId!,
    })
  } finally {
    recognizing.value = false
  }
}

async function loadQuestions(examId: string): Promise<void> {
  questionsLoading.value = true
  questionsError.value = null
  try {
    questions.value = (await getExamTemplate(examId)).questions
  } catch (error) {
    questions.value = []
    questionsError.value = toUserError(error, '考试题目加载失败')
    if (error instanceof Error && isPaperTemplateNotConfiguredError(error)) {
      message.warning('当前考试还没有配置试卷题目，不能执行 OCR 调试')
    } else {
      showUserError(error, '题目列表加载失败')
    }
  } finally {
    questionsLoading.value = false
  }
}

async function loadPaperCandidates(
  examId: string,
  keyword = paperCandidateKeyword.value,
): Promise<void> {
  const normalizedKeyword = keyword.trim()
  paperCandidatesLoading.value = true
  paperCandidatesError.value = null
  try {
    const result = await pageExamScoreSummary({
      examId,
      pageNum: 1,
      pageSize: PAPER_CANDIDATE_FILTER_PAGE_SIZE,
      keyword: normalizedKeyword || undefined,
    })
    paperCandidates.value = readPageList(result, '答卷候选加载失败，请稍后重试').filter(
      (item) => item.paperInstanceId,
    )
  } catch (error) {
    paperCandidates.value = []
    paperCandidatesError.value = toUserError(error, '答卷候选列表加载失败')
    showUserError(error, '答题卡列表加载失败')
  } finally {
    paperCandidatesLoading.value = false
  }
}

function handlePaperCandidateSearch(value: string): void {
  paperCandidateKeyword.value = value
  if (debugForm.value.examId) {
    void loadPaperCandidates(debugForm.value.examId, value)
  }
}

function handlePaperCandidateDropdownVisibleChange(open: boolean): void {
  if (open && debugForm.value.examId) {
    void loadPaperCandidates(debugForm.value.examId)
  }
}

function handlePaperCandidateChange(value: SelectValue): void {
  if (!value) {
    paperCandidateKeyword.value = ''
    if (debugForm.value.examId) {
      void loadPaperCandidates(debugForm.value.examId, '')
    }
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
    paddleInstancesError.value = toUserError(error, 'PaddleOCR 实例加载失败')
    paddleInstances.value = []
  } finally {
    paddleInstancesLoading.value = false
  }
}

function openRegisterModal(): void {
  registerForm.value = {
    instanceName: '',
    serviceUrl: '',
    deviceType: 'cpu',
    localAutoDeploy: false,
  }
  registerModalOpen.value = true
}

async function handleRegisterInstance(): Promise<void> {
  const name = registerForm.value.instanceName.trim()
  const url = registerForm.value.serviceUrl.trim()
  const device = registerForm.value.deviceType.trim()
  if (!name || !url || !device) {
    message.warning('请填写实例名称、服务地址与设备类型')
    return
  }
  registering.value = true
  try {
    await registerPaddleOcrInstance({
      instanceName: name,
      serviceUrl: url,
      deviceType: device,
      localAutoDeploy: registerForm.value.localAutoDeploy,
    })
    message.success('PaddleOCR 实例已注册')
    registerModalOpen.value = false
    await loadPaddleInstances()
  } catch (error) {
    showUserError(error, 'PaddleOCR 实例注册失败')
  } finally {
    registering.value = false
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

watch(
  selectedExamId,
  (examId) => {
    debugForm.value.examId = examId
    debugForm.value.paperInstanceId = undefined
    debugForm.value.questionTemplateId = undefined
    paperCandidateKeyword.value = ''
    recognizeResult.value = null
    if (examId) {
      void Promise.all([loadQuestions(examId), loadPaperCandidates(examId)])
    } else {
      questions.value = []
      paperCandidates.value = []
      questionsError.value = null
      paperCandidatesError.value = null
    }
  },
  { immediate: true },
)

function paddleInstanceHealthTone(status: MarkOcrHealthStatusCode) {
  return strictEnumTone(MARK_OCR_HEALTH_STATUS_COLOR, status, 'PaddleOCR 实例健康状态')
}

function paddleInstanceHealthLabel(status: MarkOcrHealthStatusCode): string {
  return strictEnumLabel(MARK_OCR_HEALTH_STATUS_LABEL, status, 'PaddleOCR 实例健康状态')
}

onMounted(async () => {
  await Promise.all([loadConfig(), initExamSelector()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag :tone="currentConfig?.enabled ? 'green' : 'gray'" size="sm">
            {{ currentConfig?.enabled ? '已启用' : '未启用' }}
          </UiTag>
          <a-tag v-if="currentConfig" :color="healthColor">
            {{ healthLabel }}
          </a-tag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadConfig">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <!-- D-9 错误态：OCR 配置加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="configLoadError"
      :error="configLoadError"
      title="OCR 配置加载失败"
      @retry="loadConfig"
    />

    <div v-else-if="currentConfig" class="ocr-grid">
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
          :message="ocrHealthMessageText(currentConfig.lastHealthMessage)"
        />
      </UiCard>
    </div>

    <!-- PaddleOCR 实例列表：仅当当前渠道为 PADDLE 时展示，按健康状态排序 -->
    <UiCard v-if="currentConfig && isPaddleProvider" class="info-card paddle-card">
      <template #title>
        <ClusterOutlined />
        <span>PaddleOCR 服务实例</span>
        <UiBadge :tone="paddleHealthyCount > 0 ? 'green' : 'gray'">
          健康 {{ paddleHealthyCount }} / {{ paddleInstances.length }}
        </UiBadge>
      </template>
      <template #extra>
        <a-space>
          <UiButton size="sm" variant="outline" @click="openRegisterModal">
            注册实例
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :loading="paddleInstancesLoading"
            @click="loadPaddleInstances"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </a-space>
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
        description="当前没有可用的 OCR 识别服务，请联系管理员检查识别服务状态。"
      />
      <a-list v-else :data-source="paddleInstances" item-layout="horizontal">
        <template #renderItem="{ item }: { item: PaddleOcrInstanceVO }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <span class="paddle-instance__name">{{ item.instanceName }}</span>
                <UiTag :tone="paddleInstanceHealthTone(item.healthStatus)" size="sm">
                  {{ paddleInstanceHealthLabel(item.healthStatus) }}
                </UiTag>
                <UiTag v-if="item.localAutoDeploy" tone="blue" size="sm">本地自动部署</UiTag>
                <UiTag tone="gray" size="sm">{{ item.deviceType }}</UiTag>
              </template>
              <template #description>
                <div class="paddle-instance__meta">
                  <span class="paddle-instance__url">
                    {{ item.serviceUrl ? '识别服务地址已配置' : '识别服务地址未配置' }}
                  </span>
                  <span class="paddle-instance__sep">·</span>
                  <span>最近探活：{{ item.lastHealthCheckAt || '未探活' }}</span>
                  <template v-if="item.consecutiveFailures > 0">
                    <span class="paddle-instance__sep">·</span>
                    <span class="paddle-instance__failed">连续失败 {{ item.consecutiveFailures }} 次</span>
                  </template>
                </div>
                <div v-if="item.lastHealthMessage" class="paddle-instance__msg">
                  {{ ocrHealthMessageText(item.lastHealthMessage) }}
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </UiCard>

    <UiCard v-if="currentConfig" class="info-card">
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
            <a-form-item label="当前考试" name="examId" required>
              <a-select
                :value="selectedExamId"
                :options="examOptions"
                :loading="examLoading"
                show-search
                option-filter-prop="label"
                placeholder="请选择当前考试"
                @change="onExamChange"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="答题卡" name="paperInstanceId" required>
              <a-select
                v-model:value="debugForm.paperInstanceId"
                :options="paperCandidateOptions"
                :loading="paperCandidatesLoading"
                :disabled="!debugForm.examId"
                show-search
                :filter-option="false"
                allow-clear
                placeholder="请选择答题卡"
                @search="handlePaperCandidateSearch"
                @dropdown-visible-change="handlePaperCandidateDropdownVisibleChange"
                @change="handlePaperCandidateChange"
              />
              <div v-if="paperCandidatesError" class="debug-form__hint debug-form__hint--error">
                答题卡列表加载失败，请刷新后重试
              </div>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="题目" name="questionTemplateId" required>
              <a-select
                v-model:value="debugForm.questionTemplateId"
                :options="questionOptions"
                :loading="questionsLoading"
                :disabled="!debugForm.examId"
                show-search
                option-filter-prop="label"
                placeholder="请选择题目"
              />
              <div v-if="questionsError" class="debug-form__hint debug-form__hint--error">
                题目列表加载失败，请刷新后重试
              </div>
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
          <a-descriptions-item label="识别处理说明">
            {{ ocrDiagnosticText(recognizeResult.diagnostic) }}
          </a-descriptions-item>
        </a-descriptions>
        <div class="result-text-block">
          <div class="result-text-label">识别文本</div>
          <div class="result-text-content">{{ recognizeResult.recognizedText }}</div>
        </div>
      </template>
      <UiEmpty v-else-if="!recognizing" description="暂无识别结果" />
    </UiCard>

    <a-modal
      v-model:open="registerModalOpen"
      title="注册 PaddleOCR 实例"
      :confirm-loading="registering"
      ok-text="注册"
      cancel-text="取消"
      @ok="handleRegisterInstance"
    >
      <a-form layout="vertical">
        <a-form-item label="实例名称" required>
          <a-input v-model:value="registerForm.instanceName" placeholder="例如 paddle-gpu-01" />
        </a-form-item>
        <a-form-item label="服务根地址" required>
          <a-input
            v-model:value="registerForm.serviceUrl"
            placeholder="http://host:8095"
          />
        </a-form-item>
        <a-form-item label="设备类型" required>
          <a-input v-model:value="registerForm.deviceType" placeholder="cpu 或 gpu:0" />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="registerForm.localAutoDeploy">本地自动部署实例</a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ocr-settings {
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

  &__hint {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;

    &--error {
      color: var(--ant-color-error);
    }
  }
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

.result-text-content {
  background: var(--color-fill-2, #f5f5f5);
  border: 1px solid var(--color-border, #e5e5e5);
  border-radius: 4px;
  padding: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
