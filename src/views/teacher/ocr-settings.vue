<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamDetailVO } from '@/apis/mark/exam'
import { getExamDetail } from '@/apis/mark/exam'
import type { ExamScoreSummaryItemVO } from '@/apis/mark/exam-score'
import { pageExamScoreSummary } from '@/apis/mark/exam-score'
import type { MarkOcrConfigVO } from '@/apis/mark/ocr-config'
import { checkMarkOcrHealth, getCurrentMarkOcrConfig } from '@/apis/mark/ocr-config'
import type { PaddleOcrInstanceVO } from '@/apis/mark/ocr-paddle-instance'
import { listPaddleOcrInstances } from '@/apis/mark/ocr-paddle-instance'
import type { MarkOcrPaperSliceVO, MarkOcrRecognizeVO } from '@/apis/mark/ocr-recognition'
import { listMarkOcrPaperSlices, recognizeMarkOcr } from '@/apis/mark/ocr-recognition'
import type { MarkOcrHealthStatusCode, MarkOcrProviderTypeCode } from '@/apis/mark/ocr-types'
import {
  MARK_OCR_HEALTH_STATUS_LABEL,
  MARK_OCR_HEALTH_STATUS_TONE,
  MARK_OCR_PAPER_CUT_CAPABILITY,
  MARK_OCR_PROVIDER_DESCRIPTION,
  MARK_OCR_PROVIDER_LABEL,
} from '@/apis/mark/ocr-types'
import ApiOutlined from '@ant-design/icons-vue/ApiOutlined'
import ClusterOutlined from '@ant-design/icons-vue/ClusterOutlined'
import ExperimentOutlined from '@ant-design/icons-vue/ExperimentOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BINDING_STATUS_LABEL } from '@/apis/mark/exam-binding'
import { FINAL_SCORE_STATUS_LABEL } from '@/apis/mark/final-score-status'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/question-type'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useUserStore } from '@/stores/modules/user'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherOcrSettings' })

const PAPER_CANDIDATE_FILTER_PAGE_SIZE = 50

interface DebugFormState {
  examId?: string
  paperInstanceId?: string
  responseSliceId?: string
}

const debugFormRef = ref<FormInstance | null>(null)
const loading = ref(false)
const healthChecking = ref(false)
const recognizing = ref(false)
const currentConfig = ref<MarkOcrConfigVO | null>(null)
// 加载失败：toast 提示，主区保持空态/列表壳
const recognizeResult = ref<MarkOcrRecognizeVO | null>(null)
const debugForm = ref<DebugFormState>({})
const { selectedExamId } = useMarkExamContext()
const userStore = useUserStore()

// 仅 PADDLE 渠道相关：展示后端已注册的 PaddleOCR 服务实例列表。
// 用 watch(currentConfig.providerType) 自动开关加载，无需手动触发。
const paddleInstances = ref<PaddleOcrInstanceVO[]>([])
const paddleInstancesLoading = ref(false)
const paperSlices = ref<MarkOcrPaperSliceVO[]>([])
const paperSlicesLoading = ref(false)
const paperCandidates = ref<ExamScoreSummaryItemVO[]>([])
const paperCandidatesLoading = ref(false)
const paperCandidateKeyword = ref('')
const examDetail = ref<ExamDetailVO | null>(null)
const examDetailLoading = ref(false)

const examMaterialLayoutMode = computed(() => examDetail.value?.materialLayoutMode)

const paperInstanceFieldLabel = computed(() => {
  const mode = examMaterialLayoutMode.value
  if (mode === 'ANSWER_SHEET') {
    return '扫描答卷'
  }
  if (mode === 'FULL_PAPER') {
    return '扫描试卷'
  }
  return '试卷实例'
})

const ocrDebugReady = computed(() => Boolean(examMaterialLayoutMode.value))

const debugRules = computed<Record<string, Rule[]>>(() => ({
  paperInstanceId: [
    { required: true, message: `请选择${paperInstanceFieldLabel.value}`, trigger: 'change' },
  ],
  responseSliceId: [{ required: true, message: '请选择当前卷面的正式作答切片', trigger: 'change' }],
}))

const healthStatus = computed<MarkOcrHealthStatusCode | undefined>(
  () => currentConfig.value?.healthStatus,
)
const healthColor = computed(() =>
  healthStatus.value
    ? strictEnumTone(MARK_OCR_HEALTH_STATUS_TONE, healthStatus.value, 'OCR 健康状态')
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
const providerDescription = computed(() => {
  const providerType = currentConfig.value?.providerType
  if (!providerType) {
    return '当前租户尚未选择 OCR 渠道，请联系平台管理员完成租户渠道配置。'
  }
  return strictEnumLabel(MARK_OCR_PROVIDER_DESCRIPTION, providerType, 'OCR 渠道说明')
})
const paperCutCapability = computed(() => {
  const providerType = currentConfig.value?.providerType
  if (!providerType) {
    return ''
  }
  return strictEnumLabel(MARK_OCR_PAPER_CUT_CAPABILITY, providerType, 'OCR 切题能力')
})

const canRecognize = computed(() =>
  Boolean(
    ocrDebugReady.value &&
    currentConfig.value?.providerType &&
    currentConfig.value.enabled &&
    debugForm.value.paperInstanceId &&
    debugForm.value.responseSliceId,
  ),
)
const currentPaperSlice = computed(() =>
  paperSlices.value.find((item) => item.responseSliceId === debugForm.value.responseSliceId),
)
const paperSliceOptions = computed(() =>
  paperSlices.value.map((slice) => ({
    value: slice.responseSliceId,
    label: [
      `题 ${slice.questionNo}`,
      strictEnumLabel(QUESTION_TYPE_LABEL, slice.questionType, '题型'),
      `${slice.fullScore} 分`,
    ].join(' · '),
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
        bindingStatusLabel(item.bindingStatus),
        finalScoreStatusLabel(item.finalScoreStatus),
      ]
        .filter(Boolean)
        .join(' · '),
    })),
)

function finalScoreStatusLabel(status: ExamScoreSummaryItemVO['finalScoreStatus']): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, status, '最终成绩状态')
}

function bindingStatusLabel(status: ExamScoreSummaryItemVO['bindingStatus']): string | undefined {
  if (!status) return undefined
  return strictEnumLabel(BINDING_STATUS_LABEL, status, '试卷绑定状态')
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
}

async function loadConfig(): Promise<void> {
  loading.value = true
  try {
    const tenantId = userStore.userInfo.tenantId
    applyConfig(await getCurrentMarkOcrConfig(tenantId))
  } catch (error) {
    currentConfig.value = null
    showUserError(error, 'OCR 识别配置加载失败')
  } finally {
    loading.value = false
  }
}

/** 触发当前租户 OCR 渠道健康探活，并刷新只读配置展示。 */
async function handleHealthCheck(): Promise<void> {
  const tenantId = userStore.userInfo.tenantId
  if (!tenantId) {
    message.error('当前会话缺少租户信息，不能执行 OCR 健康检查')
    return
  }
  healthChecking.value = true
  try {
    const result = await checkMarkOcrHealth(tenantId)
    message.success(
      `OCR 健康检查完成：${strictEnumLabel(MARK_OCR_HEALTH_STATUS_LABEL, result.healthStatus, 'OCR 健康状态')}`,
    )
    await loadConfig()
  } catch (error) {
    showUserError(error, 'OCR 健康检查失败')
  } finally {
    healthChecking.value = false
  }
}

async function handleRecognize(): Promise<void> {
  await debugFormRef.value?.validate()
  if (!currentPaperSlice.value) {
    message.error('当前卷面的正式作答切片不存在，请重新选择')
    return
  }
  recognizing.value = true
  try {
    recognizeResult.value = await recognizeMarkOcr({
      examId: debugForm.value.examId!,
      paperInstanceId: debugForm.value.paperInstanceId!,
      responseSliceId: currentPaperSlice.value.responseSliceId,
      questionTemplateId: currentPaperSlice.value.questionTemplateId,
    })
  } finally {
    recognizing.value = false
  }
}

async function loadExamDetail(examId: string): Promise<void> {
  examDetailLoading.value = true
  try {
    examDetail.value = await getExamDetail(examId)
  } catch (error) {
    examDetail.value = null
    showUserError(error, '考试详情加载失败')
  } finally {
    examDetailLoading.value = false
  }
}

async function loadPaperSlices(examId: string, paperInstanceId: string): Promise<void> {
  paperSlicesLoading.value = true
  try {
    paperSlices.value = await listMarkOcrPaperSlices({ examId, paperInstanceId })
  } catch (error) {
    paperSlices.value = []
    showUserError(error, '正式作答切片列表加载失败')
  } finally {
    paperSlicesLoading.value = false
  }
}

async function loadPaperCandidates(
  examId: string,
  keyword = paperCandidateKeyword.value,
): Promise<void> {
  const normalizedKeyword = keyword.trim()
  paperCandidatesLoading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId,
      pageNum: 1,
      pageSize: PAPER_CANDIDATE_FILTER_PAGE_SIZE,
      keyword: normalizedKeyword || undefined,
    })
    paperCandidates.value = readPageList(result, '卷面候选加载失败，请稍后重试').filter(
      (item) => item.paperInstanceId && item.bindingStatus === 'BOUND',
    )
  } catch (error) {
    paperCandidates.value = []
    showUserError(error, '卷面候选列表加载失败')
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
  debugForm.value.responseSliceId = undefined
  recognizeResult.value = null
  if (!value) {
    paperSlices.value = []
    paperCandidateKeyword.value = ''
    if (debugForm.value.examId) {
      void loadPaperCandidates(debugForm.value.examId, '')
    }
    return
  }
  if (debugForm.value.examId && typeof value === 'string') {
    void loadPaperSlices(debugForm.value.examId, value)
  }
}

// PADDLE 实例列表：当当前渠道为 PADDLE 时显示，跟随 currentConfig.providerType 变化自动加载
const isPaddleProvider = computed(() => currentConfig.value?.providerType === 'PADDLE')

const paddleHealthyCount = computed(
  () => paddleInstances.value.filter((it) => it.healthStatus === 'HEALTHY').length,
)

const paddleInstanceColumns: ColumnType<PaddleOcrInstanceVO>[] = [
  { title: '实例', key: 'instanceName', width: 180, ellipsis: true },
  { title: '健康', key: 'healthStatus', width: 100 },
  { title: '设备类型', dataIndex: 'deviceType', key: 'deviceType', width: 100 },
  { title: '服务地址', key: 'serviceUrl', width: 140 },
  { title: '最近探活', key: 'lastHealthCheckTime', width: 170 },
  { title: '诊断', key: 'lastHealthMessage', ellipsis: true },
]

async function loadPaddleInstances(): Promise<void> {
  paddleInstancesLoading.value = true
  try {
    paddleInstances.value = await listPaddleOcrInstances()
  } catch (error) {
    paddleInstances.value = []
    showUserError(error, 'PaddleOCR 实例加载失败')
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
    }
  },
  { immediate: false },
)

watch(
  selectedExamId,
  (examId) => {
    debugForm.value.examId = examId
    debugForm.value.paperInstanceId = undefined
    debugForm.value.responseSliceId = undefined
    paperCandidateKeyword.value = ''
    recognizeResult.value = null
    if (examId) {
      void Promise.all([loadExamDetail(examId), loadPaperCandidates(examId)])
    } else {
      examDetail.value = null
      paperSlices.value = []
      paperCandidates.value = []
    }
  },
  { immediate: true },
)

function paddleInstanceHealthTone(status: MarkOcrHealthStatusCode) {
  return strictEnumTone(MARK_OCR_HEALTH_STATUS_TONE, status, 'PaddleOCR 实例健康状态')
}

function paddleInstanceHealthLabel(status: MarkOcrHealthStatusCode): string {
  return strictEnumLabel(MARK_OCR_HEALTH_STATUS_LABEL, status, 'PaddleOCR 实例健康状态')
}

async function reloadOcrWorkbench(): Promise<void> {
  await loadConfig()
  const examId = selectedExamId.value
  if (!examId) {
    return
  }
  await Promise.all([loadExamDetail(examId), loadPaperCandidates(examId)])
  if (debugForm.value.paperInstanceId) {
    await loadPaperSlices(examId, debugForm.value.paperInstanceId)
  }
}

onMounted(async () => {
  await loadConfig()
  mittBus.on('scan-workbench:refresh', reloadOcrWorkbench)
})

onBeforeUnmount(() => {
  mittBus.off('scan-workbench:refresh', reloadOcrWorkbench)
})
</script>

<template>
  <div class="ocr-settings">
    <UiEmpty v-if="!selectedExamId" description="未进入考试工作台" />

    <a-spin v-else-if="loading && !currentConfig" />

    <template v-else-if="currentConfig">
      <div class="ocr-settings__toolbar">
        <div class="ocr-settings__status">
          <UiTag :tone="currentConfig.enabled ? 'green' : 'gray'" size="sm">
            {{ currentConfig.enabled ? '已启用' : '未启用' }}
          </UiTag>
          <UiTag :tone="healthColor">
            {{ healthLabel }}
          </UiTag>
        </div>
      </div>

      <div class="ocr-grid">
        <UiCard class="info-card">
          <template #title>
            <ApiOutlined />
            <span>当前 OCR 渠道</span>
          </template>
          <UiEmpty v-if="!currentConfig.providerType" description="租户尚未配置 OCR 渠道" />
          <template v-else>
            <div class="ocr-channel__hero">
              <span class="ocr-channel__name">{{ currentProviderLabel }}</span>
              <UiTag :tone="healthColor" size="sm">{{ healthLabel }}</UiTag>
            </div>
            <p class="ocr-channel__desc">{{ providerDescription }}</p>
            <p class="ocr-channel__capability">{{ paperCutCapability }}</p>
            <a-descriptions :column="1" size="small" bordered class="ocr-channel__meta">
              <a-descriptions-item label="渠道编码">
                {{ currentConfig.providerType }}
              </a-descriptions-item>
              <a-descriptions-item v-if="currentConfig.lastHealthMessage" label="最近诊断">
                {{ ocrHealthMessageText(currentConfig.lastHealthMessage) }}
              </a-descriptions-item>
            </a-descriptions>
          </template>
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
              <div class="ocr-health-row">
                <UiTag :tone="healthColor">{{ healthLabel }}</UiTag>
                <UiButton
                  variant="outline"
                  size="sm"
                  :loading="healthChecking"
                  @click="handleHealthCheck"
                >
                  健康检查
                </UiButton>
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="最近检查">
              {{ currentConfig?.lastHealthCheckTime || '未检查' }}
            </a-descriptions-item>
          </a-descriptions>
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

        <UiDataTable
          pagination-mode="none"
          class="student-detail-table__data-table"
          :columns="paddleInstanceColumns"
          :data-source="paddleInstances"
          :loading="paddleInstancesLoading"
          :show-pagination="false"
          flat
          :total="paddleInstances.length"
          row-key="id"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'instanceName'">
              <span class="paddle-instance__name">{{ record.instanceName }}</span>
              <UiTag v-if="record.localAutoDeploy" tone="blue" size="sm">本地自动部署</UiTag>
            </template>
            <template v-else-if="column.key === 'healthStatus'">
              <UiTag :tone="paddleInstanceHealthTone(record.healthStatus)" size="sm">
                {{ paddleInstanceHealthLabel(record.healthStatus) }}
              </UiTag>
              <span v-if="record.consecutiveFailures > 0" class="paddle-instance__failed">
                连续失败 {{ record.consecutiveFailures }} 次
              </span>
            </template>
            <template v-else-if="column.key === 'serviceUrl'">
              {{ record.serviceUrl ? '识别服务地址已配置' : '识别服务地址未配置' }}
            </template>
            <template v-else-if="column.key === 'lastHealthCheckTime'">
              {{ record.lastHealthCheckTime || '未探活' }}
            </template>
            <template v-else-if="column.key === 'lastHealthMessage'">
              <span v-if="record.lastHealthMessage">{{
                ocrHealthMessageText(record.lastHealthMessage)
              }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard class="info-card">
        <template #title>
          <ExperimentOutlined />
          <span>同步调试</span>
        </template>
        <a-form
          ref="debugFormRef"
          :model="debugForm"
          :rules="debugRules"
          layout="vertical"
          class="debug-form"
        >
          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-form-item :label="paperInstanceFieldLabel" name="paperInstanceId" required>
                <a-select
                  v-model:value="debugForm.paperInstanceId"
                  :options="paperCandidateOptions"
                  :loading="paperCandidatesLoading || examDetailLoading"
                  :disabled="!debugForm.examId || !ocrDebugReady"
                  show-search
                  :filter-option="false"
                  allow-clear
                  :placeholder="`请选择${paperInstanceFieldLabel}`"
                  :not-found-content="paperCandidatesLoading ? undefined : '暂无已扫描并绑定的卷面'"
                  @search="handlePaperCandidateSearch"
                  @dropdown-visible-change="handlePaperCandidateDropdownVisibleChange"
                  @change="handlePaperCandidateChange"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="题目" name="responseSliceId" required>
                <a-select
                  v-model:value="debugForm.responseSliceId"
                  :options="paperSliceOptions"
                  :loading="paperSlicesLoading || examDetailLoading"
                  :disabled="!debugForm.examId || !debugForm.paperInstanceId || !ocrDebugReady"
                  show-search
                  option-filter-prop="label"
                  placeholder="请选择当前卷面的正式作答切片"
                  :not-found-content="paperSlicesLoading ? undefined : '当前卷面暂无正式作答切片'"
                />
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
        <UiEmpty v-else-if="!recognizing" description="暂无数据" />
      </UiCard>
    </template>
  </div>
</template>

<style scoped lang="scss">
.ocr-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__status {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.ocr-health-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ocr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 767px) {
  .ocr-grid {
    grid-template-columns: 1fr;
  }
}

.info-card {
  margin-bottom: 0;
}

.ocr-channel {
  &__hero {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__name {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--dp-text-primary, #0f172a);
  }

  &__desc,
  &__capability {
    margin: 0 0 8px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dp-text-secondary, #475569);
  }

  &__capability {
    margin-bottom: 12px;
    color: var(--dp-text-primary, #0f172a);
  }

  &__meta {
    margin-top: 4px;
  }
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
  margin-top: 0;
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
