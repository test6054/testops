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
import {
  checkMarkOcrHealth,
  getCurrentMarkOcrConfig,
  saveMarkOcrConfig,
} from '@/apis/mark/ocr-config'
import { pagePaddleOcrInstances } from '@/apis/mark/ocr-paddle-instance'
import {
  checkMarkOcrPlatformProviderHealth,
  listMarkOcrPlatformProviders,
  saveMarkOcrPlatformProvider,
} from '@/apis/mark/ocr-platform-provider'
import { listMarkOcrPaperSlices, recognizeMarkOcr } from '@/apis/mark/ocr-recognition'
import {
  AiHealthStatusDescription,
  MARK_OCR_HEALTH_STATUS_TONE,
  MARK_OCR_PAPER_CUT_CAPABILITY,
  MARK_OCR_PROVIDER_DESCRIPTION,
  MARK_OCR_PROVIDER_OPTIONS,
  MarkOcrProviderTypeCode,
  MarkOcrProviderTypeDescription,
} from '@/apis/mark/ocr-types'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import PasswordInput from '@/components/ui-guide/ui/PasswordInput.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useAuthStore } from '@/stores/modules/auth'
import { useTenantStore } from '@/stores/modules/tenant'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { AiHealthStatusCode } from '@/types/enums/ai-health-status-enum'
import { ExamMaterialLayoutModeCode } from '@/types/enums/exam-material-layout-mode-enum'
import { PaddleOcrDeviceKindCode } from '@/types/enums/paddle-ocr-device-kind-enum'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherOcrSettings' })

/** OCR 调试卷面候选：服务端按 BOUND 过滤后分页，禁止前端截前 N 条再猜。 */
const PAPER_CANDIDATE_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE
const PAPER_CANDIDATE_SEARCH_DEBOUNCE_MS = 300

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
const userStore = useUserStore()
const tenantStore = useTenantStore()

/** 同步调试仅平台管理员可用，教师工作台路径不暴露识别试跑入口。 */
const ocrDebugAllowed = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)

/**
 * MVR-371：租户 OCR 渠道写 / 健康检查写状态 / 平台供应商维护均仅超级管理员。
 * 与 BE requireOcrConfigWritePermission / requireSuperAdminPermission 同源；禁止租户侧假可写。
 */
const canManageOcrTenantChannel = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)
const ocrHealthCheckAllowed = canManageOcrTenantChannel
const ocrPlatformProviderManageAllowed = canManageOcrTenantChannel

/** 考试工作台标题：教师看识别状态；超管看含平台配置的完整面。 */
const ocrWorkbenchTitle = computed(() =>
  canManageOcrTenantChannel.value ? '文字识别配置' : '文字识别状态',
)

/**
 * 目标租户只来自当前会话（用户 / 租户 store），禁止用已加载配置的 tenantId 反向决定下一请求。
 */
function resolveOcrSessionTenantId(): string | undefined {
  const fromUser = userStore.userInfo.tenantId?.trim()
  if (fromUser) {
    return fromUser
  }
  const fromTenant = tenantStore.tenantId?.trim()
  if (fromTenant) {
    return fromTenant
  }
  return undefined
}

let configLoadGeneration = 0
let platformProviderLoadGeneration = 0
let examDetailLoadGeneration = 0
let paperSliceLoadGeneration = 0
let paperCandidateLoadGeneration = 0
let paddleInstanceLoadGeneration = 0
let recognizeGeneration = 0
let paperCandidateSearchTimer: number | undefined

function clearOcrConfigSurfaces(): void {
  configLoadGeneration += 1
  platformProviderLoadGeneration += 1
  paddleInstanceLoadGeneration += 1
  currentConfig.value = null
  platformProviders.value = []
  paddleInstances.value = []
  paddlePagination.total = 0
  syncChannelFormFromConfig()
}

function clearOcrExamDebugSurfaces(): void {
  examDetailLoadGeneration += 1
  paperSliceLoadGeneration += 1
  paperCandidateLoadGeneration += 1
  recognizeGeneration += 1
  if (paperCandidateSearchTimer !== undefined) {
    window.clearTimeout(paperCandidateSearchTimer)
    paperCandidateSearchTimer = undefined
  }
  examDetail.value = null
  paperSlices.value = []
  paperCandidates.value = []
  paperCandidatesTotal.value = 0
  paperCandidatesLoadFailed.value = false
  paperCandidateKeyword.value = ''
  recognizeResult.value = null
  debugForm.value.paperInstanceId = undefined
  debugForm.value.responseSliceId = undefined
}

const channelSaving = ref(false)
const channelForm = reactive<{
  providerType: MarkOcrProviderTypeCode
  enabled: boolean
}>({
  providerType: MarkOcrProviderTypeCode.BAIDU,
  enabled: true,
})

function syncChannelFormFromConfig(): void {
  channelForm.providerType = currentConfig.value?.providerType ?? MarkOcrProviderTypeCode.BAIDU
  channelForm.enabled = currentConfig.value?.enabled === true
}

const ocrChannelEmptyBody = computed(() => {
  if (canManageOcrTenantChannel.value) {
    return '租户尚未配置文字识别渠道；请在下方选择渠道并保存（仅超级管理员可写）。'
  }
  return '租户尚未配置文字识别渠道，请联系平台超级管理员完成配置。'
})

// 仅 PADDLE 渠道相关：展示后端已注册的 PaddleOCR 服务实例列表。
// 用 watch(currentConfig.providerType) 自动开关加载，无需手动触发。
const paddleInstances = ref<PaddleOcrInstanceResponse[]>([])
const paddleInstancesLoading = ref(false)
const paddlePagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const paperSlices = ref<MarkOcrPaperSliceVO[]>([])
const paperSlicesLoading = ref(false)
const paperCandidates = ref<ExamScoreSummaryItemResponse[]>([])
const paperCandidatesLoading = ref(false)
const paperCandidatesTotal = ref(0)
const paperCandidatesLoadFailed = ref(false)
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

const healthStatus = computed<AiHealthStatusCode | undefined>(
  () => currentConfig.value?.healthStatus,
)
const healthColor = computed(() =>
  healthStatus.value
    ? strictEnumTone(MARK_OCR_HEALTH_STATUS_TONE, healthStatus.value, '文字识别健康状态')
    : undefined,
)
const healthLabel = computed(() =>
  healthStatus.value
    ? strictEnumLabel(AiHealthStatusDescription, healthStatus.value, '文字识别健康状态')
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
      record.enabled ? '允许租户选择本地文字识别集群' : '当前不允许租户选择本地文字识别集群',
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

function applyConfig(config: MarkOcrConfigResponse, requestedTenantId?: string): void {
  if (requestedTenantId && config.tenantId && config.tenantId !== requestedTenantId) {
    throw toUserError(
      null,
      `文字识别配置租户不一致：请求 ${requestedTenantId}，返回 ${config.tenantId}`,
    )
  }
  currentConfig.value = config
  syncChannelFormFromConfig()
}

async function loadConfig(): Promise<boolean> {
  const generation = ++configLoadGeneration
  loading.value = true
  loadFailed.value = false
  try {
    // MVR-371：超管查询必须显式 tenantId，与 BE resolveOcrConfigTenantId 同源
    const tenantId = resolveOcrSessionTenantId()
    if (canManageOcrTenantChannel.value && !tenantId) {
      if (generation !== configLoadGeneration) {
        return false
      }
      currentConfig.value = null
      loadFailed.value = true
      void message.error('超级管理员查询 OCR 配置须先具备租户上下文（用户/租户会话）')
      return false
    }
    const config = await getCurrentMarkOcrConfig(tenantId)
    if (generation !== configLoadGeneration) {
      return false
    }
    applyConfig(config, tenantId)
    return true
  } catch (error) {
    if (generation !== configLoadGeneration) {
      return false
    }
    currentConfig.value = null
    loadFailed.value = true
    showUserError(error, '文字识别配置加载失败')
    return false
  } finally {
    if (generation === configLoadGeneration) {
      loading.value = false
    }
  }
}

/** MVR-371：超管保存租户 OCR 渠道；与 BE saveConfig / requireOcrConfigWritePermission 二次拦截。 */
async function handleSaveTenantChannel(): Promise<void> {
  // MVR-430：仅认 canManageOcrTenantChannel === true，与 BE 超管写闸同源
  if (!canManageOcrTenantChannel.value) {
    void message.warning('仅平台超级管理员可配置租户文字识别渠道')
    return
  }
  if (channelSaving.value) {
    return
  }
  const tenantId = resolveOcrSessionTenantId()
  if (!tenantId) {
    void message.error('缺少目标租户 ID，无法保存文字识别渠道')
    return
  }
  if (!channelForm.providerType) {
    void message.warning('请选择文字识别渠道')
    return
  }
  channelSaving.value = true
  try {
    await saveMarkOcrConfig({
      tenantId,
      providerType: channelForm.providerType,
      enabled: channelForm.enabled,
    })
    void message.success('租户文字识别渠道已保存')
  } catch (error) {
    showUserError(error, '租户文字识别渠道保存失败')
    return
  } finally {
    channelSaving.value = false
  }
  const refreshed = await loadConfig()
  if (!refreshed) {
    void message.warning('渠道已保存，状态刷新失败')
  }
}

async function loadPlatformProviders(): Promise<boolean> {
  if (!ocrPlatformProviderManageAllowed.value) {
    platformProviders.value = []
    return true
  }
  const generation = ++platformProviderLoadGeneration
  platformProvidersLoading.value = true
  try {
    const list = await listMarkOcrPlatformProviders()
    if (generation !== platformProviderLoadGeneration) {
      return false
    }
    platformProviders.value = list
    return true
  } catch (error) {
    if (generation !== platformProviderLoadGeneration) {
      return false
    }
    showUserError(error, '平台文字识别供应商配置加载失败')
    return false
  } finally {
    if (generation === platformProviderLoadGeneration) {
      platformProvidersLoading.value = false
    }
  }
}

function openPlatformProviderEditor(record: MarkOcrPlatformProviderResponse): void {
  // MVR-316：平台供应商编辑仅超级管理员
  if (!ocrPlatformProviderManageAllowed.value) {
    void message.warning('仅平台超级管理员可维护平台文字识别供应商配置')
    return
  }
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
  // MVR-316：与 ocrPlatformProviderManageAllowed / BE 超管门禁二次拦截
  if (!ocrPlatformProviderManageAllowed.value) {
    void message.warning('仅平台超级管理员可维护平台文字识别供应商配置')
    return
  }
  if (platformProviderSubmitting.value) {
    return
  }
  platformProviderSubmitting.value = true
  try {
    await saveMarkOcrPlatformProvider(buildPlatformProviderSavePayload())
    platformProviderEditorVisible.value = false
    void message.success('平台文字识别供应商配置已保存')
  } catch (error) {
    showUserError(error, '平台文字识别供应商配置保存失败')
    return
  } finally {
    platformProviderSubmitting.value = false
  }
  const refreshFailures: string[] = []
  if (!(await loadPlatformProviders())) {
    refreshFailures.push('供应商列表')
  }
  if (!(await loadConfig())) {
    refreshFailures.push('渠道状态')
  }
  if (refreshFailures.length > 0) {
    void message.warning(`供应商已保存，${refreshFailures.join('、')}刷新失败`)
  }
}

async function handlePlatformProviderHealthCheck(
  providerType: MarkOcrProviderTypeCode,
): Promise<void> {
  // MVR-316：平台健康检查仅超级管理员
  if (!ocrPlatformProviderManageAllowed.value) {
    void message.warning('仅平台超级管理员可执行平台文字识别健康检查')
    return
  }
  platformProviderHealthLoading.value = providerType
  try {
    await checkMarkOcrPlatformProviderHealth({ providerType })
    void message.success(`${providerLabel(providerType)} 平台健康检查完成`)
  } catch (error) {
    showUserError(error, `${providerLabel(providerType)} 平台健康检查失败`)
    return
  } finally {
    platformProviderHealthLoading.value = ''
  }
  const refreshFailures: string[] = []
  if (!(await loadPlatformProviders())) {
    refreshFailures.push('供应商列表')
  }
  if (!(await loadConfig())) {
    refreshFailures.push('渠道状态')
  }
  if (refreshFailures.length > 0) {
    void message.warning(`健康检查已完成，${refreshFailures.join('、')}刷新失败`)
  }
}

/** 触发当前租户 OCR 渠道健康探活，并刷新只读配置展示。 */
async function handleHealthCheck(): Promise<void> {
  // MVR-371：健康检查写状态仅超管；与 ocrHealthCheckAllowed / BE 同源
  if (!ocrHealthCheckAllowed.value) {
    void message.warning('仅平台超级管理员可执行文字识别渠道健康检查')
    return
  }
  const tenantId = resolveOcrSessionTenantId()
  if (!tenantId) {
    void message.error('当前文字识别配置缺少租户信息，不能执行健康检查')
    return
  }
  healthChecking.value = true
  try {
    const result = await checkMarkOcrHealth(tenantId)
    void message.success(
      `文字识别健康检查完成：${strictEnumLabel(AiHealthStatusDescription, result.healthStatus, '文字识别健康状态')}`,
    )
  } catch (error) {
    showUserError(error, '文字识别健康检查失败')
    return
  } finally {
    healthChecking.value = false
  }
  const refreshed = await loadConfig()
  if (!refreshed) {
    void message.warning('健康检查已完成，渠道状态刷新失败')
  }
}

async function handleRecognize(): Promise<void> {
  // MVR-423：与 canRecognize / 按钮 disabled 同源二次闸（配置就绪∧启用∧已选试卷/切片）
  if (!canRecognize.value) {
    void message.warning('当前不可发起调试识别（配置未就绪、渠道未启用或未选试卷/切片）')
    return
  }
  await debugFormRef.value?.validate()
  if (!currentPaperSlice.value) {
    void message.error('当前卷面的正式作答切片不存在，请重新选择')
    return
  }
  const examId = debugForm.value.examId!
  const paperInstanceId = debugForm.value.paperInstanceId!
  const responseSliceId = currentPaperSlice.value.responseSliceId
  const layoutQuestionId = currentPaperSlice.value.layoutQuestionId
  const generation = ++recognizeGeneration
  recognizing.value = true
  try {
    const result = await recognizeMarkOcr({
      examId,
      paperInstanceId,
      responseSliceId,
      layoutQuestionId,
    })
    if (
      generation !== recognizeGeneration
      || debugForm.value.examId !== examId
      || debugForm.value.paperInstanceId !== paperInstanceId
      || debugForm.value.responseSliceId !== responseSliceId
    ) {
      return
    }
    recognizeResult.value = result
  } catch (error) {
    if (generation !== recognizeGeneration) {
      return
    }
    showUserError(error, '调试识别失败')
  } finally {
    if (generation === recognizeGeneration) {
      recognizing.value = false
    }
  }
}

async function loadExamDetail(examId: string): Promise<void> {
  const generation = ++examDetailLoadGeneration
  examDetailLoading.value = true
  try {
    const detail = await getExamDetail(examId)
    if (generation !== examDetailLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    examDetail.value = detail
  } catch (error) {
    if (generation !== examDetailLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    examDetail.value = null
    showUserError(error, '考试详情加载失败')
  } finally {
    if (generation === examDetailLoadGeneration) {
      examDetailLoading.value = false
    }
  }
}

async function loadPaperSlices(examId: string, paperInstanceId: string): Promise<void> {
  const generation = ++paperSliceLoadGeneration
  paperSlicesLoading.value = true
  try {
    const slices = await listMarkOcrPaperSlices({ examId, paperInstanceId })
    if (
      generation !== paperSliceLoadGeneration
      || selectedExamId.value !== examId
      || debugForm.value.paperInstanceId !== paperInstanceId
    ) {
      return
    }
    paperSlices.value = slices
  } catch (error) {
    if (generation !== paperSliceLoadGeneration) {
      return
    }
    paperSlices.value = []
    showUserError(error, '正式作答切片列表加载失败')
  } finally {
    if (generation === paperSliceLoadGeneration) {
      paperSlicesLoading.value = false
    }
  }
}

async function loadPaperCandidates(
  examId: string,
  keyword = paperCandidateKeyword.value,
): Promise<void> {
  const normalizedKeyword = keyword.trim()
  const generation = ++paperCandidateLoadGeneration
  paperCandidatesLoading.value = true
  paperCandidatesLoadFailed.value = false
  try {
    const result = await pageExamScoreSummary({
      examId,
      pageNum: 1,
      pageSize: PAPER_CANDIDATE_PAGE_SIZE,
      keyword: normalizedKeyword || undefined,
      bindingStatus: BindingStatusCode.BOUND,
    })
    if (
      generation !== paperCandidateLoadGeneration
      || selectedExamId.value !== examId
      || paperCandidateKeyword.value.trim() !== normalizedKeyword
    ) {
      return
    }
    paperCandidates.value = result.list.filter((item) => Boolean(item.paperInstanceId))
    paperCandidatesTotal.value = result.total
  } catch (error) {
    if (generation !== paperCandidateLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    paperCandidatesLoadFailed.value = true
    showUserError(error, '卷面候选列表加载失败')
  } finally {
    if (generation === paperCandidateLoadGeneration) {
      paperCandidatesLoading.value = false
    }
  }
}

function handlePaperCandidateSearch(value: string): void {
  paperCandidateKeyword.value = value
  if (!debugForm.value.examId) {
    return
  }
  if (paperCandidateSearchTimer !== undefined) {
    window.clearTimeout(paperCandidateSearchTimer)
  }
  paperCandidateSearchTimer = window.setTimeout(() => {
    paperCandidateSearchTimer = undefined
    if (debugForm.value.examId) {
      void loadPaperCandidates(debugForm.value.examId, paperCandidateKeyword.value)
    }
  }, PAPER_CANDIDATE_SEARCH_DEBOUNCE_MS)
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
    paddleInstances.value.filter((it) => it.healthStatus === AiHealthStatusCode.HEALTHY)
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
  if (!canManageOcrTenantChannel.value) {
    paddleInstances.value = []
    paddlePagination.total = 0
    return
  }
  const generation = ++paddleInstanceLoadGeneration
  paddleInstancesLoading.value = true
  try {
    const page = await pagePaddleOcrInstances({
      pageNum: paddlePagination.pageNum,
      pageSize: paddlePagination.pageSize,
    })
    if (generation !== paddleInstanceLoadGeneration) {
      return
    }
    paddleInstances.value = page.list
    paddlePagination.total = page.total
    paddlePagination.pageNum = page.pageNum
    paddlePagination.pageSize = page.pageSize
  } catch (error) {
    if (generation !== paddleInstanceLoadGeneration) {
      return
    }
    showUserError(error, '本地文字识别实例加载失败')
  } finally {
    if (generation === paddleInstanceLoadGeneration) {
      paddleInstancesLoading.value = false
    }
  }
}

watch(
  isPaddleProvider,
  (paddle) => {
    if (paddle && canManageOcrTenantChannel.value) {
      void loadPaddleInstances()
    } else {
      paddleInstanceLoadGeneration += 1
      paddleInstances.value = []
      paddlePagination.total = 0
    }
  },
  { immediate: false },
)

watch(
  selectedExamId,
  (examId) => {
    clearOcrExamDebugSurfaces()
    debugForm.value.examId = examId
    if (examId) {
      void Promise.all([loadExamDetail(examId), loadPaperCandidates(examId)])
    }
  },
  { immediate: true },
)

watch(
  () => resolveOcrSessionTenantId(),
  (tenantId, previousTenantId) => {
    if (tenantId === previousTenantId) {
      return
    }
    clearOcrConfigSurfaces()
    clearOcrExamDebugSurfaces()
    void loadConfig()
    void loadPlatformProviders()
    const examId = selectedExamId.value
    if (examId) {
      debugForm.value.examId = examId
      void Promise.all([loadExamDetail(examId), loadPaperCandidates(examId)])
    }
  },
)

function paddleInstanceHealthTone(status: AiHealthStatusCode) {
  return strictEnumTone(MARK_OCR_HEALTH_STATUS_TONE, status, '本地文字识别实例健康状态')
}

function paddleInstanceHealthLabel(status: AiHealthStatusCode): string {
  return strictEnumLabel(AiHealthStatusDescription, status, '本地文字识别实例健康状态')
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
  if (paperCandidateSearchTimer !== undefined) {
    window.clearTimeout(paperCandidateSearchTimer)
    paperCandidateSearchTimer = undefined
  }
  mittBus.off('scan-workbench:refresh', reloadOcrWorkbench)
})
</script>

<template>
  <StageWorkbenchShell class="ocr-settings">
    <template v-if="selectedExamId && currentConfig" #context>
      <ContextBar layout="workbench" show-title :title="ocrWorkbenchTitle">
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
      <SignalBand compact variant="panel" :metrics="ocrSignalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" body="请先选择考试后再配置 OCR 与识别策略" />

    <UiEmpty
      size="sm"
      v-else-if="loadFailed"
      description="文字识别配置加载失败"
    />

    <UiSkeletonState v-else-if="loading && !currentConfig" variant="card" compact />

    <template v-else-if="currentConfig">
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="canManageOcrTenantChannel"
        tone="info"
        dense
        inline
        title="本页含考试识别状态与平台配置"
        description="上方为当前租户考试侧只读状态；下方渠道保存、Paddle 实例、平台供应商与同步调试仅超级管理员可写。"
        class="ocr-settings__scope-alert"
      />
      <UiAlertStrip
        v-else
        tone="info"
        dense
        inline
        title="考试识别状态（只读）"
        description="本页展示当前考试可用的文字识别渠道与健康状态；渠道与平台供应商由超级管理员配置。"
        class="ocr-settings__scope-alert"
      />

      <div class="ocr-grid">
        <WorkbenchSurfaceCard class="ocr-settings__panel">
          <template #head>
            <h3 class="ocr-settings__panel-title">
              <ApiOutlined />
              <span>当前文字识别渠道</span>
            </h3>
          </template>
          <WorkbenchContextGateStrip
            v-if="!currentConfig.providerType"
            tag="未配置"
            :body="ocrChannelEmptyBody"
            hide-cta
          />
          <template v-else>
            <div class="ocr-channel__hero">
              <span class="ocr-channel__name">{{ currentProviderLabel }}</span>
              <UiTag :tone="healthColor" size="sm">{{ healthLabel }}</UiTag>
            </div>
            <p class="ocr-channel__desc">{{ providerDescription }}</p>
            <p class="ocr-channel__capability">{{ paperCutCapability }}</p>
            <UiDescriptions :column="1" size="small" bordered class="ocr-channel__meta">
              <UiDescriptionsItem label="当前渠道">
                {{ currentProviderLabel }}
              </UiDescriptionsItem>
              <UiDescriptionsItem v-if="currentConfig.lastHealthMessage" label="最近诊断">
                {{ ocrHealthMessageText(currentConfig.lastHealthMessage) }}
              </UiDescriptionsItem>
            </UiDescriptions>
          </template>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard class="ocr-settings__panel">
          <template #head>
            <h3 class="ocr-settings__panel-title">
              <ExperimentOutlined />
              <span>运行状态</span>
            </h3>
          </template>
          <UiDescriptions :column="1" size="small" bordered>
            <UiDescriptionsItem label="已保存渠道">{{ currentProviderLabel }}</UiDescriptionsItem>
            <UiDescriptionsItem label="启用状态">
              {{ currentConfig?.enabled ? '启用' : '关闭' }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="健康状态">
              <UiTag :tone="healthColor">{{ healthLabel }}</UiTag>
            </UiDescriptionsItem>
            <UiDescriptionsItem label="最近检查">
              {{ currentConfig?.lastHealthCheckTime || '未检查' }}
            </UiDescriptionsItem>
          </UiDescriptions>
        </WorkbenchSurfaceCard>
      </div>

      <WorkbenchSurfaceCard v-if="canManageOcrTenantChannel" class="ocr-settings__panel">
        <template #head>
          <h3 class="ocr-settings__panel-title">
            <ApiOutlined />
            <span>配置本租户文字识别渠道</span>
          </h3>
        </template>
        <UiAlertStrip
          tone="info"
          dense
          inline
          title="仅平台超级管理员可写"
          description="渠道在百度 OCR 与 PaddleOCR 之间互斥；保存后请执行健康检查确认平台供应商已就绪。"
          class="ocr-settings__channel-alert"
        />
        <UiForm layout="vertical" class="ocr-settings__channel-form">
          <UiFormItem label="识别渠道" required>
            <UiSelect
              size="sm"
              v-model="channelForm.providerType"
              :options="MARK_OCR_PROVIDER_OPTIONS"
              placeholder="选择租户 OCR 渠道"
            />
          </UiFormItem>
          <UiFormItem label="启用渠道">
            <UiSwitch size="sm" v-model="channelForm.enabled" />
          </UiFormItem>
          <UiFormItem>
            <UiButton
              variant="primary"
              size="sm"
              :loading="channelSaving"
              @click="handleSaveTenantChannel"
            >
              保存渠道
            </UiButton>
          </UiFormItem>
        </UiForm>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard
        v-if="isPaddleProvider && canManageOcrTenantChannel"
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
              <div class="dp-space" style="--dp-space-component: 8px">
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
              </div>
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
        <UiForm
          ref="debugFormRef"
          :model="debugForm"
          :rules="debugRules"
          layout="vertical"
          class="debug-form"
        >
          <UiRow :gutter="16">
            <UiCol :xs="24" :md="12">
              <UiFormItem :label="paperInstanceFieldLabel" name="paperInstanceId" required>
                <UiSelect
                  size="sm"
                  v-model="debugForm.paperInstanceId"
                  :options="paperCandidateOptions"
                  :loading="paperCandidatesLoading || examDetailLoading"
                  :disabled="!debugForm.examId || !ocrDebugReady"
                  allow-search
                  :filter-option="false"
                  allow-clear
                  :placeholder="`请选择${paperInstanceFieldLabel}`"
                  :not-found-content="
                    paperCandidatesLoading
                      ? undefined
                      : paperCandidatesLoadFailed
                        ? '卷面候选加载失败，请重试'
                        : paperCandidatesTotal > PAPER_CANDIDATE_PAGE_SIZE
                          ? `本页展示已绑定卷面 ${paperCandidates.length} / ${paperCandidatesTotal}，请输入学号或姓名继续搜索`
                          : '暂无已扫描并绑定的卷面'
                  "
                  @search="handlePaperCandidateSearch"
                  @dropdown-visible-change="handlePaperCandidateDropdownVisibleChange"
                  @change="handlePaperCandidateChange"
                />
              </UiFormItem>
            </UiCol>
            <UiCol :xs="24" :md="12">
              <UiFormItem label="题目" name="responseSliceId" required>
                <UiSelect
                  size="sm"
                  v-model="debugForm.responseSliceId"
                  :options="paperSliceOptions"
                  :loading="paperSlicesLoading || examDetailLoading"
                  :disabled="!debugForm.examId || !debugForm.paperInstanceId || !ocrDebugReady"
                  allow-search
                  option-filter-prop="label"
                  placeholder="请选择当前卷面的正式作答切片"
                  :not-found-content="paperSlicesLoading ? undefined : '当前卷面暂无正式作答切片'"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!canRecognize"
            :loading="recognizing"
            @click="handleRecognize"
          >
            <template #icon><ExperimentOutlined /></template>
            执行识别
          </UiButton>
        </UiForm>

        <template v-if="recognizeResult">
          <UiDivider />
          <UiDescriptions title="识别结果" :column="1" size="small" bordered>
            <UiDescriptionsItem label="使用渠道">
              {{ providerLabel(recognizeResult.providerType) }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="识别处理说明">
              {{ ocrDiagnosticText(recognizeResult.diagnostic) }}
            </UiDescriptionsItem>
          </UiDescriptions>
          <div class="result-text-block">
            <div class="result-text-label">识别文本</div>
            <div class="result-text-content">{{ recognizeResult.recognizedText }}</div>
          </div>
        </template>
        <UiEmpty
          size="sm"
          v-else-if="!recognizing"
          description="上传样张并识别后，将在此展示识别文本"
        />
      </WorkbenchSurfaceCard>

      <UiDialog
        v-model:open="platformProviderEditorVisible"
        :title="`编辑 ${providerLabel(platformProviderEditor.providerType)} 平台配置`"
        :width="720"
        :confirm-loading="platformProviderSubmitting"
        @ok="handlePlatformProviderSave"
      >
        <UiForm layout="vertical">
          <UiFormItem label="供应商类型">
            <UiInput
              size="sm"
              :value="providerLabel(platformProviderEditor.providerType)"
              disabled
            />
          </UiFormItem>
          <UiFormItem label="启用状态">
            <UiSwitch size="sm" v-model="platformProviderEditor.enabled" />
          </UiFormItem>
          <template v-if="platformProviderEditorIsBaidu">
            <UiFormItem label="应用编号">
              <UiInput
                size="sm"
                v-model="platformProviderEditor.appId"
                placeholder="留空表示不修改 / 不配置"
              />
            </UiFormItem>
            <UiFormItem label="接口密钥">
              <PasswordInput
                v-model="platformProviderEditor.apiKey"
                size="sm"
                placeholder="留空表示保留原值"
              />
            </UiFormItem>
            <UiFormItem label="密钥">
              <PasswordInput
                v-model="platformProviderEditor.secretKey"
                size="sm"
                placeholder="留空表示保留原值"
              />
            </UiFormItem>
            <UiFormItem label="令牌接口地址">
              <UiInput size="sm" v-model="platformProviderEditor.tokenEndpoint" />
            </UiFormItem>
            <UiFormItem label="高精度文字识别接口地址">
              <UiInput size="sm" v-model="platformProviderEditor.ocrEndpoint" />
            </UiFormItem>
            <UiFormItem label="手写文字识别接口地址">
              <UiInput size="sm" v-model="platformProviderEditor.handwritingEndpoint" />
            </UiFormItem>
            <UiFormItem label="文档分析接口地址">
              <UiInput size="sm" v-model="platformProviderEditor.docAnalysisEndpoint" />
            </UiFormItem>
            <UiFormItem label="手写作文提交接口地址">
              <UiInput
                size="sm"
                v-model="platformProviderEditor.handwritingCompositionCreateTaskEndpoint"
              />
            </UiFormItem>
            <UiFormItem label="手写作文结果查询接口地址">
              <UiInput
                size="sm"
                v-model="platformProviderEditor.handwritingCompositionGetResultEndpoint"
              />
            </UiFormItem>
          </template>
          <UiAlertStrip
            v-else-if="platformProviderEditorIsPaddle"
            tone="info"
            title="本地集群为本地接入型文字识别供应商"
            description="该平台配置页只控制是否允许租户选择本地集群通道。实例地址、设备规格与运行健康由本地文字识别实例注册链单独维护，不在这里录入百度类凭证与接口地址。"
            :inline="false"
          />
        </UiForm>
      </UiDialog>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;
.ocr-settings {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);

  &__panel {
    margin-bottom: 0;
  }

  &__panel--paddle {
    margin-top: var(--dp-space-component);
  }

  &__panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--dp-space-component-tight);
    width: 100%;
  }

  &__panel-title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    margin: 0;
    font-size: var(--dp-font-size-lg);
    font-weight: var(--dp-font-weight-title);
    line-height: 1.5;
    color: var(--dp-text-primary);
  }

  &__panel-desc {
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }
}

.ocr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-space-component);
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
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component);
  }

  &__name {
    font-size: var(--dp-font-size-2xl);
    font-weight: 600;
    line-height: 1.4;
    color: var(--dp-text-primary);
  }

  &__desc,
  &__capability {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-sm);
    line-height: 1.6;
    color: var(--dp-text-secondary);
  }

  &__capability {
    margin-bottom: var(--dp-space-component);
    color: var(--dp-text-primary);
  }

  &__meta {
    margin-top: var(--dp-space-component-xs);
  }
}

.provider-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.switch-row {
  margin-top: var(--dp-space-component);
}

.debug-form {
  margin-top: 0;
}

.result-text-block {
  margin-top: var(--dp-space-component);
}

.result-text-label {
  font-weight: 600;
  margin-bottom: var(--dp-space-component-xs);
  color: var(--dp-text-secondary);
}

.result-text-content {
  background: var(--color-fill-2);
  border: 1px solid var(--color-border);
  border-radius: var(--dp-radius-xs);
  padding: var(--dp-space-component);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 300px;
  overflow-y: auto;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
}

.paddle-instance__name {
  font-weight: 600;
  margin-right: var(--dp-space-component-tight);
}

.paddle-instance__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-xs);
  align-items: center;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}

.paddle-instance__sep {
  color: var(--dp-text-muted);
}

.paddle-instance__failed {
  color: var(--dp-error);
  font-weight: 600;
}

.paddle-instance__msg {
  margin-top: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.ocr-settings__scope-alert {
  margin-bottom: var(--dp-space-component);
}

.ocr-settings__channel-alert {
  margin-bottom: var(--dp-space-component);
}

.ocr-settings__channel-form {
  max-width: 420px;
}
</style>
