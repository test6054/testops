<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamScoreSummaryItemResponse } from '@/apis/mark/exam-score'
import type { MarkOcrConfigResponse } from '@/apis/mark/ocr-config'
import type { PaddleOcrInstanceResponse } from '@/apis/mark/ocr-paddle-instance'
import type {
  MarkOcrPlatformProviderResponse,
  MarkOcrPlatformProviderSaveRequest,
} from '@/apis/mark/ocr-platform-provider'
import type { MarkOcrPaperSliceVO, MarkOcrRecognizeResponse } from '@/apis/mark/ocr-recognition'
import type { SignalMetric } from '@/types/workbench'
import ApiOutlined from '@ant-design/icons-vue/ApiOutlined'
import ClusterOutlined from '@ant-design/icons-vue/ClusterOutlined'
import ExperimentOutlined from '@ant-design/icons-vue/ExperimentOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { getExamDetail } from '@/apis/mark/exam'
import { BindingStatusCode, BindingStatusDescription } from '@/apis/mark/exam-binding'
import { pageExamScoreSummary } from '@/apis/mark/exam-score'
import { FinalScoreStatusDescription } from '@/apis/mark/final-score-status'
import { checkMarkOcrHealth, getCurrentMarkOcrConfig } from '@/apis/mark/ocr-config'
import { pagePaddleOcrInstances } from '@/apis/mark/ocr-paddle-instance'
import {
  checkMarkOcrPlatformProviderHealth,
  listMarkOcrPlatformProviders,
  saveMarkOcrPlatformProvider,
} from '@/apis/mark/ocr-platform-provider'
import { listMarkOcrPaperSlices, recognizeMarkOcr } from '@/apis/mark/ocr-recognition'
import {
  MARK_OCR_HEALTH_STATUS_TONE,
  MARK_OCR_PAPER_CUT_CAPABILITY,
  MARK_OCR_PROVIDER_DESCRIPTION,
  MarkOcrHealthStatusDescription,
  MarkOcrProviderTypeCode,
  MarkOcrProviderTypeDescription,
} from '@/apis/mark/ocr-types'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useAuthStore } from '@/stores/modules/auth'
import { RoleEnum } from '@/types/enums'
import { ExamMaterialLayoutModeCode } from '@/types/enums/exam-material-layout-mode-enum'
import { MarkOcrHealthStatusCode } from '@/types/enums/mark-ocr-health-status-enum'
import { PaddleOcrDeviceKindCode } from '@/types/enums/paddle-ocr-device-kind-enum'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
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
const loadFailed = ref(false)
const healthChecking = ref(false)
const recognizing = ref(false)
const currentConfig = ref<MarkOcrConfigResponse | null>(null)
// 加载失败：toast 提示，主区保持空态/列表壳
const recognizeResult = ref<MarkOcrRecognizeResponse | null>(null)
const debugForm = ref<DebugFormState>({})
const { selectedExamId } = useMarkExamContext()
const { examStatusLabel, examStatusTone } = useExamJourneyContextBar('文字识别配置')
const authStore = useAuthStore()

/** 同步调试仅平台管理员可用，教师工作台路径不暴露识别试跑入口。 */
const ocrDebugAllowed = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)

/** OCR 渠道健康检查会写入租户配置状态，仅超级管理员可执行。 */
const ocrHealthCheckAllowed = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)
const ocrPlatformProviderManageAllowed = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)

// 仅 PADDLE 渠道相关：展示后端已注册的 PaddleOCR 服务实例列表。
// 用 watch(currentConfig.providerType) 自动开关加载，无需手动触发。
const paddleInstances = ref<PaddleOcrInstanceResponse[]>([])
const paddleInstancesLoading = ref(false)
const paddlePagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const paperSlices = ref<MarkOcrPaperSliceVO[]>([])
const paperSlicesLoading = ref(false)
const paperCandidates = ref<ExamScoreSummaryItemResponse[]>([])
const paperCandidatesLoading = ref(false)
const paperCandidateKeyword = ref('')
const examDetail = ref<ExamDetailResponse | null>(null)
const examDetailLoading = ref(false)
const platformProviders = ref<MarkOcrPlatformProviderResponse[]>([])
const platformProvidersLoading = ref(false)
const platformProviderHealthLoading = ref<string>('')
const platformProviderEditorVisible = ref(false)
const platformProviderSubmitting = ref(false)
const platformProviderEditor = reactive<MarkOcrPlatformProviderSaveRequest>({
  providerType: MarkOcrProviderTypeCode.BAIDU,
  enabled: false,
  appId: '',
  apiKey: '',
  secretKey: '',
  region: '',
  tokenEndpoint: '',
  ocrEndpoint: '',
  handwritingEndpoint: '',
  docAnalysisEndpoint: '',
  handwritingCompositionCreateTaskEndpoint: '',
  handwritingCompositionGetResultEndpoint: '',
})
const platformProviderEditorIsBaidu = computed(
  () => platformProviderEditor.providerType === MarkOcrProviderTypeCode.BAIDU,
)
const platformProviderEditorIsPaddle = computed(
  () => platformProviderEditor.providerType === MarkOcrProviderTypeCode.PADDLE,
)

const examMaterialLayoutMode = computed(() => examDetail.value?.materialLayoutMode)

const paperInstanceFieldLabel = computed(() => {
  const mode = examMaterialLayoutMode.value
  if (mode === ExamMaterialLayoutModeCode.ANSWER_SHEET) {
    return '扫描答卷'
  }
  if (mode === ExamMaterialLayoutModeCode.FULL_PAPER) {
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
    ? strictEnumTone(MARK_OCR_HEALTH_STATUS_TONE, healthStatus.value, '文字识别健康状态')
    : undefined,
)
const healthLabel = computed(() =>
  healthStatus.value
    ? strictEnumLabel(MarkOcrHealthStatusDescription, healthStatus.value, '文字识别健康状态')
    : '',
)

const ocrSignalMetrics = computed((): SignalMetric[] => {
  if (!currentConfig.value) {
    return []
  }
  return [
    {
      key: 'provider',
      label: '文字识别渠道',
      value: currentProviderLabel.value,
      tone: 'blue',
    },
    {
      key: 'health',
      label: '健康状态',
      value: healthLabel.value || '未检查',
      tone: healthColor.value ?? 'gray',
    },
    {
      key: 'enabled',
      label: '启用状态',
      value: currentConfig.value.enabled ? '已启用' : '未启用',
      tone: currentConfig.value.enabled ? 'green' : 'gray',
    },
  ]
})

const currentProviderLabel = computed(() =>
  currentConfig.value?.providerType ? providerLabel(currentConfig.value.providerType) : '未配置',
)
const providerDescription = computed(() => {
  const providerType = currentConfig.value?.providerType
  if (!providerType) {
    return '当前租户尚未选择文字识别渠道，请联系平台管理员完成租户渠道配置。'
  }
  return strictEnumLabel(MARK_OCR_PROVIDER_DESCRIPTION, providerType, '文字识别渠道说明')
})
const paperCutCapability = computed(() => {
  const providerType = currentConfig.value?.providerType
  if (!providerType) {
    return ''
  }
  return strictEnumLabel(MARK_OCR_PAPER_CUT_CAPABILITY, providerType, '文字识别切题能力')
})

const canRecognize = computed(() =>
  Boolean(
    ocrDebugReady.value
    && currentConfig.value?.providerType
    && currentConfig.value.enabled
    && debugForm.value.paperInstanceId
    && debugForm.value.responseSliceId,
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
      strictEnumLabel(QuestionTypeDescription, slice.questionType, '题型'),
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

function finalScoreStatusLabel(status: ExamScoreSummaryItemResponse['finalScoreStatus']): string {
  return strictEnumLabel(FinalScoreStatusDescription, status, '最终成绩状态')
}

function bindingStatusLabel(
  status: ExamScoreSummaryItemResponse['bindingStatus'],
): string | undefined {
  if (!status) return undefined
  return strictEnumLabel(BindingStatusDescription, status, '试卷绑定状态')
}

function providerLabel(providerType: MarkOcrProviderTypeCode): string {
  return strictEnumLabel(MarkOcrProviderTypeDescription, providerType, '文字识别渠道')
}

const platformProviderColumns: ColumnType<MarkOcrPlatformProviderResponse>[] = [
  { title: '供应商', key: 'providerType', dataIndex: 'providerType', width: 120 },
  { title: '启用', key: 'enabled', dataIndex: 'enabled', width: 90 },
  { title: '凭证 / 接口摘要', key: 'credentials', dataIndex: 'credentials', align: 'left' },
  { title: '更新时间', key: 'updateTime', dataIndex: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

function isPaddleProviderType(providerType: MarkOcrProviderTypeCode): boolean {
  return providerType === MarkOcrProviderTypeCode.PADDLE
}

function platformProviderCredentialText(configured?: boolean, masked?: string): string {
  if (!configured) {
    return '未配置'
  }
  return masked || '已配置'
}

/** 平台 OCR 供应商摘要按真实厂商差异展示，避免把百度专属字段错误映射到 Paddle。 */
function platformProviderSummary(record: MarkOcrPlatformProviderResponse): string[] {
  if (isPaddleProviderType(record.providerType)) {
    return [
      '本地集群接入型供应商',
      record.enabled
        ? '允许租户选择本地文字识别集群'
        : '当前不允许租户选择本地文字识别集群',
    ]
  }
  return [
    `应用编号：${platformProviderCredentialText(record.appIdConfigured, record.appIdMasked)}`,
    `接口密钥：${platformProviderCredentialText(record.apiKeyConfigured, record.apiKeyMasked)}`,
    `密钥：${platformProviderCredentialText(record.secretKeyConfigured, record.secretKeyMasked)}`,
  ]
}

/** 按供应商类型归一化保存请求，禁止把百度专属配置误写入 Paddle 平台配置。 */
function buildPlatformProviderSavePayload(): MarkOcrPlatformProviderSaveRequest {
  const request: MarkOcrPlatformProviderSaveRequest = { ...platformProviderEditor }
  if (isPaddleProviderType(request.providerType)) {
    request.appId = ''
    request.apiKey = ''
    request.secretKey = ''
    request.region = ''
    request.tokenEndpoint = ''
    request.ocrEndpoint = ''
    request.handwritingEndpoint = ''
    request.docAnalysisEndpoint = ''
    request.handwritingCompositionCreateTaskEndpoint = ''
    request.handwritingCompositionGetResultEndpoint = ''
  }
  return request
}

/** 将 OCR 调试诊断转为可展示的识别处理说明，避免暴露引擎和接口调试细节。 */
function ocrDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    '文字识别未返回可展示说明，请检查切片图像质量或稍后重试',
  )
}

function ocrHealthMessageText(messageText?: string): string {
  return getUserErrorMessage(
    { message: messageText },
    '文字识别渠道检测未返回可展示说明，请检查渠道配置或稍后重试',
  )
}

function applyConfig(config: MarkOcrConfigResponse): void {
  currentConfig.value = config
}

async function loadConfig(): Promise<void> {
  loading.value = true
  loadFailed.value = false
  try {
    applyConfig(await getCurrentMarkOcrConfig())
  } catch (error) {
    currentConfig.value = null
    loadFailed.value = true
    showUserError(error, '文字识别配置加载失败')
  } finally {
    loading.value = false
  }
}

async function loadPlatformProviders(): Promise<void> {
  if (!ocrPlatformProviderManageAllowed.value) {
    platformProviders.value = []
    return
  }
  platformProvidersLoading.value = true
  try {
    platformProviders.value = await listMarkOcrPlatformProviders()
  } catch (error) {
    platformProviders.value = []
    showUserError(error, '平台文字识别供应商配置加载失败')
  } finally {
    platformProvidersLoading.value = false
  }
}

function openPlatformProviderEditor(record: MarkOcrPlatformProviderResponse): void {
  platformProviderEditor.id = record.id
  platformProviderEditor.providerType = record.providerType
  platformProviderEditor.enabled = record.enabled
  platformProviderEditor.appId = ''
  platformProviderEditor.apiKey = ''
  platformProviderEditor.secretKey = ''
  platformProviderEditor.region = record.region || ''
  platformProviderEditor.tokenEndpoint = record.tokenEndpoint || ''
  platformProviderEditor.ocrEndpoint = record.ocrEndpoint || ''
  platformProviderEditor.handwritingEndpoint = record.handwritingEndpoint || ''
  platformProviderEditor.docAnalysisEndpoint = record.docAnalysisEndpoint || ''
  platformProviderEditor.handwritingCompositionCreateTaskEndpoint
    = record.handwritingCompositionCreateTaskEndpoint || ''
  platformProviderEditor.handwritingCompositionGetResultEndpoint
    = record.handwritingCompositionGetResultEndpoint || ''
  platformProviderEditorVisible.value = true
}

async function handlePlatformProviderSave(): Promise<void> {
  platformProviderSubmitting.value = true
  try {
    await saveMarkOcrPlatformProvider(buildPlatformProviderSavePayload())
    platformProviderEditorVisible.value = false
    message.success('平台文字识别供应商配置已保存')
    await Promise.all([loadPlatformProviders(), loadConfig()])
  } catch (error) {
    showUserError(error, '平台文字识别供应商配置保存失败')
  } finally {
    platformProviderSubmitting.value = false
  }
}

async function handlePlatformProviderHealthCheck(
  providerType: MarkOcrProviderTypeCode,
): Promise<void> {
  platformProviderHealthLoading.value = providerType
  try {
    await checkMarkOcrPlatformProviderHealth({ providerType })
    message.success(`${providerLabel(providerType)} 平台健康检查完成`)
    await Promise.all([loadPlatformProviders(), loadConfig()])
  } catch (error) {
    showUserError(error, `${providerLabel(providerType)} 平台健康检查失败`)
  } finally {
    platformProviderHealthLoading.value = ''
  }
}

/** 触发当前租户 OCR 渠道健康探活，并刷新只读配置展示。 */
async function handleHealthCheck(): Promise<void> {
  const tenantId = currentConfig.value?.tenantId
  if (!tenantId) {
    message.error('当前文字识别配置缺少租户信息，不能执行健康检查')
    return
  }
  healthChecking.value = true
  try {
    const result = await checkMarkOcrHealth(tenantId)
    message.success(
      `文字识别健康检查完成：${strictEnumLabel(MarkOcrHealthStatusDescription, result.healthStatus, '文字识别健康状态')}`,
    )
    await loadConfig()
  } catch (error) {
    showUserError(error, '文字识别健康检查失败')
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
      layoutQuestionId: currentPaperSlice.value.layoutQuestionId,
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
    paperCandidates.value = result.list.filter(
      (item) => item.paperInstanceId && item.bindingStatus === BindingStatusCode.BOUND,
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
const isPaddleProvider = computed(
  () => currentConfig.value?.providerType === MarkOcrProviderTypeCode.PADDLE,
)

const paddleHealthyCount = computed(
  () =>
    paddleInstances.value.filter((it) => it.healthStatus === MarkOcrHealthStatusCode.HEALTHY)
      .length,
)

const paddleInstanceColumns: ColumnType<PaddleOcrInstanceResponse>[] = [
  { title: '实例', key: 'instanceName', width: 180, ellipsis: true, fixed: 'left' },
  { title: '健康', key: 'healthStatus', width: 100 },
  { title: '设备类型', key: 'deviceKind', width: 100 },
  { title: '服务地址', key: 'serviceUrl', width: 140 },
  { title: '最近探活', key: 'lastHealthCheckTime', width: 170 },
  { title: '诊断', key: 'lastHealthMessage', ellipsis: true },
]

function paddleInstanceDeviceLabel(record: PaddleOcrInstanceResponse): string {
  if (record.deviceKind === PaddleOcrDeviceKindCode.GPU) {
    return `GPU:${record.deviceIndex ?? 0}`
  }
  return 'CPU'
}

async function loadPaddleInstances(): Promise<void> {
  paddleInstancesLoading.value = true
  try {
    const page = await pagePaddleOcrInstances({
      pageNum: paddlePagination.pageNum,
      pageSize: paddlePagination.pageSize,
    })
    paddleInstances.value = page.list
    paddlePagination.total = page.total
    paddlePagination.pageNum = page.pageNum
    paddlePagination.pageSize = page.pageSize
  } catch (error) {
    paddleInstances.value = []
    paddlePagination.total = 0
    showUserError(error, '本地文字识别实例加载失败')
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
      paddlePagination.total = 0
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
  return strictEnumTone(MARK_OCR_HEALTH_STATUS_TONE, status, '本地文字识别实例健康状态')
}

function paddleInstanceHealthLabel(status: MarkOcrHealthStatusCode): string {
  return strictEnumLabel(MarkOcrHealthStatusDescription, status, '本地文字识别实例健康状态')
}

async function reloadOcrWorkbench(): Promise<void> {
  await loadConfig()
  await loadPlatformProviders()
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
  await loadPlatformProviders()
  mittBus.on('scan-workbench:refresh', reloadOcrWorkbench)
})

onBeforeUnmount(() => {
  mittBus.off('scan-workbench:refresh', reloadOcrWorkbench)
})
</script>

<template>
  <StageWorkbenchShell class="ocr-settings">
    <template v-if="selectedExamId && currentConfig" #context>
      <ContextBar layout="workbench">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <UiTag :tone="currentConfig.enabled ? 'green' : 'gray'" size="sm">
            {{ currentConfig.enabled ? '已启用' : '未启用' }}
          </UiTag>
          <UiTag :tone="healthColor" size="sm">
            {{ healthLabel }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="ocrHealthCheckAllowed"
            variant="outline"
            size="sm"
            :loading="healthChecking"
            @click="handleHealthCheck"
          >
            <template #icon><ReloadOutlined /></template>
            健康检查
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && currentConfig" #signal>
      <SignalBand variant="tiles" compact :metrics="ocrSignalMetrics" />
    </template>

    <UiEmpty v-if="!selectedExamId" description="未进入考试工作台" />

    <UiEmpty
      v-else-if="loadFailed"
      description="文字识别配置加载失败"
      action-label="重试"
      @action="loadConfig"
    />

    <UiSkeletonState v-else-if="loading && !currentConfig" variant="card" compact />

    <template v-else-if="currentConfig">
      <ExamWorkspaceJourneySubNav />

      <div class="ocr-grid">
        <WorkbenchSurfaceCard class="ocr-settings__panel">
          <template #head>
            <h3 class="ocr-settings__panel-title">
              <ApiOutlined />
              <span>当前文字识别渠道</span>
            </h3>
          </template>
          <UiEmpty v-if="!currentConfig.providerType" description="租户尚未配置文字识别渠道" />
          <template v-else>
            <div class="ocr-channel__hero">
              <span class="ocr-channel__name">{{ currentProviderLabel }}</span>
              <UiTag :tone="healthColor" size="sm">{{ healthLabel }}</UiTag>
            </div>
            <p class="ocr-channel__desc">{{ providerDescription }}</p>
            <p class="ocr-channel__capability">{{ paperCutCapability }}</p>
            <a-descriptions :column="1" size="small" bordered class="ocr-channel__meta">
              <a-descriptions-item label="当前渠道">
                {{ currentProviderLabel }}
              </a-descriptions-item>
              <a-descriptions-item v-if="currentConfig.lastHealthMessage" label="最近诊断">
                {{ ocrHealthMessageText(currentConfig.lastHealthMessage) }}
              </a-descriptions-item>
            </a-descriptions>
          </template>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard class="ocr-settings__panel">
          <template #head>
            <h3 class="ocr-settings__panel-title">
              <ExperimentOutlined />
              <span>运行状态</span>
            </h3>
          </template>
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="已保存渠道">{{ currentProviderLabel }}</a-descriptions-item>
            <a-descriptions-item label="启用状态">
              {{ currentConfig?.enabled ? '启用' : '关闭' }}
            </a-descriptions-item>
            <a-descriptions-item label="健康状态">
              <UiTag :tone="healthColor">{{ healthLabel }}</UiTag>
            </a-descriptions-item>
            <a-descriptions-item label="最近检查">
              {{ currentConfig?.lastHealthCheckTime || '未检查' }}
            </a-descriptions-item>
          </a-descriptions>
        </WorkbenchSurfaceCard>
      </div>

      <WorkbenchSurfaceCard
        v-if="isPaddleProvider"
        flush
        class="ocr-settings__panel ocr-settings__panel--paddle"
      >
        <template #head>
          <div class="ocr-settings__panel-head">
            <h3 class="ocr-settings__panel-title">
              <ClusterOutlined />
              <span>本地文字识别服务实例</span>
            </h3>
            <span class="ocr-settings__panel-desc">
              共 {{ paddlePagination.total }} 个实例 · 本页健康 {{ paddleHealthyCount }}
            </span>
          </div>
        </template>
        <template #toolbar>
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
          v-model:current="paddlePagination.pageNum"
          v-model:page-size="paddlePagination.pageSize"
          pagination-mode="server"
          :columns="paddleInstanceColumns"
          :data-source="paddleInstances"
          :loading="paddleInstancesLoading"
          :total="paddlePagination.total"
          :sticky-header="false"
          flat
          row-key="id"
          size="middle"
          @page-change="loadPaddleInstances"
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
            <template v-else-if="column.key === 'deviceKind'">
              {{ paddleInstanceDeviceLabel(record) }}
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
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard
        v-if="ocrPlatformProviderManageAllowed"
        class="ocr-settings__panel ocr-settings__panel--provider-admin"
      >
        <template #head>
          <div class="ocr-settings__panel-head">
            <h3 class="ocr-settings__panel-title">
              <ClusterOutlined />
              <span>平台文字识别供应商配置</span>
            </h3>
            <span class="ocr-settings__panel-desc">仅超级管理员可维护百度 / 本地集群平台配置</span>
          </div>
        </template>
        <template #toolbar>
          <UiButton
            variant="outline"
            size="sm"
            :loading="platformProvidersLoading"
            @click="loadPlatformProviders"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>

        <UiDataTable
          pagination-mode="none"
          :columns="platformProviderColumns"
          :data-source="platformProviders"
          :loading="platformProvidersLoading"
          :show-pagination="false"
          :total="platformProviders.length"
          row-key="providerType"
          size="small"
          flat
          empty-kind="first-run"
          empty-description="尚未配置平台文字识别供应商；超级管理员须先维护后再做健康检查。"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'providerType'">
              {{ providerLabel(record.providerType) }}
            </template>
            <template v-else-if="column.key === 'enabled'">
              <UiTag :tone="record.enabled ? 'green' : 'gray'" size="sm">
                {{ record.enabled ? '已启用' : '未启用' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'credentials'">
              <div class="provider-admin__credential">
                <div
                  v-for="summary in platformProviderSummary(record)"
                  :key="`${record.providerType}-${summary}`"
                >
                  {{ summary }}
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'updateTime'">
              {{ record.updateTime || '未配置' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space size="small">
                <UiButton size="sm" variant="outline" @click="openPlatformProviderEditor(record)">
                  编辑
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  :loading="platformProviderHealthLoading === record.providerType"
                  @click="handlePlatformProviderHealthCheck(record.providerType)"
                >
                  健康检查
                </UiButton>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard v-if="ocrDebugAllowed" class="ocr-settings__panel">
        <template #head>
          <h3 class="ocr-settings__panel-title">
            <ExperimentOutlined />
            <span>同步调试</span>
          </h3>
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
        <UiEmpty v-else-if="!recognizing" description="当前没有可展示的内容" />
      </WorkbenchSurfaceCard>

      <a-modal
        v-model:open="platformProviderEditorVisible"
        :title="`编辑 ${providerLabel(platformProviderEditor.providerType)} 平台配置`"
        width="720px"
        :confirm-loading="platformProviderSubmitting"
        @ok="handlePlatformProviderSave"
      >
        <a-form layout="vertical">
          <a-form-item label="供应商类型">
            <a-input :value="providerLabel(platformProviderEditor.providerType)" disabled />
          </a-form-item>
          <a-form-item label="启用状态">
            <a-switch v-model:checked="platformProviderEditor.enabled" />
          </a-form-item>
          <template v-if="platformProviderEditorIsBaidu">
            <a-form-item label="应用编号">
              <a-input
                v-model:value="platformProviderEditor.appId"
                placeholder="留空表示不修改 / 不配置"
              />
            </a-form-item>
            <a-form-item label="接口密钥">
              <a-input-password
                v-model:value="platformProviderEditor.apiKey"
                placeholder="留空表示保留原值"
              />
            </a-form-item>
            <a-form-item label="密钥">
              <a-input-password
                v-model:value="platformProviderEditor.secretKey"
                placeholder="留空表示保留原值"
              />
            </a-form-item>
            <a-form-item label="令牌接口地址">
              <a-input v-model:value="platformProviderEditor.tokenEndpoint" />
            </a-form-item>
            <a-form-item label="高精度文字识别接口地址">
              <a-input v-model:value="platformProviderEditor.ocrEndpoint" />
            </a-form-item>
            <a-form-item label="手写文字识别接口地址">
              <a-input v-model:value="platformProviderEditor.handwritingEndpoint" />
            </a-form-item>
            <a-form-item label="文档分析接口地址">
              <a-input v-model:value="platformProviderEditor.docAnalysisEndpoint" />
            </a-form-item>
            <a-form-item label="手写作文提交接口地址">
              <a-input
                v-model:value="platformProviderEditor.handwritingCompositionCreateTaskEndpoint"
              />
            </a-form-item>
            <a-form-item label="手写作文结果查询接口地址">
              <a-input
                v-model:value="platformProviderEditor.handwritingCompositionGetResultEndpoint"
              />
            </a-form-item>
          </template>
          <UiAlertStrip
            v-else-if="platformProviderEditorIsPaddle"
            tone="info"
            title="本地集群为本地接入型文字识别供应商"
            description="该平台配置页只控制是否允许租户选择本地集群通道。实例地址、设备规格与运行健康由本地文字识别实例注册链单独维护，不在这里录入百度类凭证与接口地址。"
            :inline="false"
          />
        </a-form>
      </a-modal>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;
.ocr-settings {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);

  &__panel {
    margin-bottom: 0;
  }

  &__panel--paddle {
    margin-top: var(--dp-space-3);
  }

  &__panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    width: 100%;
  }

  &__panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 16px;
    font-weight: var(--dp-font-weight-title);
    line-height: 1.5;
    color: var(--dp-text-primary);
  }

  &__panel-desc {
    font-size: 13px;
    color: var(--dp-text-secondary);
  }
}

.ocr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: bp.$layout-mobile-max) {
  .ocr-grid {
    grid-template-columns: 1fr;
  }
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
    color: var(--dp-text-primary);
  }

  &__desc,
  &__capability {
    margin: 0 0 8px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dp-text-secondary);
  }

  &__capability {
    margin-bottom: 12px;
    color: var(--dp-text-primary);
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
  color: var(--ant-color-error);
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
