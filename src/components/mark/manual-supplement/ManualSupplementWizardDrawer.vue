<template>
  <UiDrawer
    :open="open"
    :title="drawerTitle"
    width="720"
    placement="right"
    destroy-on-close
    :footer-style="{ textAlign: 'right' }"
    @update:open="emit('update:open', $event)"
  >
    <UiSteps :current="currentStep" size="small" class="manual-supplement-wizard__steps">
      <UiStep title="确认目标" />
      <UiStep title="上传影像" />
      <UiStep title="完成" />
    </UiSteps>

    <div v-if="currentStep === 0" class="manual-supplement-wizard__panel">
      <template v-if="scenario === 'file-import'">
        <UiAlertStrip
          v-if="webDevices.length === 0"
          tone="warning"
          title="未登记网页补录工位"
          description="请先在扫描设备管理页为补录工位开启「网页补录」开关。"
          dense
        />
        <p v-else class="manual-supplement-wizard__hint">
          文件补入将创建新的网页直扫批次，仅适用于已启用的网页补录工位。
        </p>
      </template>
      <template v-else>
        <UiDescriptions bordered :column="1" size="small">
          <UiDescriptionsItem label="考生">
            {{ activeContext?.studentName }}（{{ activeContext?.studentNo }}）
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="activeContext?.className" label="班级">
            {{ activeContext.className }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="补扫场景">
            {{ scenarioLabel }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="activeContext?.targetPageNo" label="目标页">
            模板第 {{ activeContext.targetPageNo }} 页
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="activeContext?.missingTemplatePageNos?.length" label="缺口页">
            {{ activeContext.missingTemplatePageNos.join('、') }}
          </UiDescriptionsItem>
        </UiDescriptions>
        <p v-if="scenarioBlockReason" class="manual-supplement-wizard__warn muted">
          {{ scenarioBlockReason }}
        </p>
      </template>
    </div>

    <div v-else-if="currentStep === 1" class="manual-supplement-wizard__panel">
      <ManualSupplementFormCore
        ref="formCoreRef"
        :mode="scenario === 'file-import' ? 'direct' : 'supplement'"
        :model="activeForm"
        :device-options="deviceOptions"
        :device-loading="deviceLoading"
        :bound-paper-options="boundPaperOptions"
        :prepare-loading="prepareLoading"
        :prepare-block-description="prepareBlockDescription"
        :class-scope-warning="classScopeWarning"
        :show-paper-select="scenario !== 'file-import'"
        :paper-select-disabled="!!activeContext?.paperInstanceId"
        :target-page-options="targetPageOptions"
        :target-page-disabled="!!activeContext?.targetPageNo && scenario !== 'file-import'"
        :show-replace-checkbox="scenario === 'replace'"
        :replace-forced="scenario === 'replace'"
        @device-change="handleDeviceChange"
      />
    </div>

    <div v-else class="manual-supplement-wizard__panel">
      <UiEmpty size="sm" v-if="submitResult" description="补录提交成功" :image="false">
        <template #description>
          <p class="manual-supplement-wizard__success">
            {{ successMessage }}
          </p>
        </template>
      </UiEmpty>
    </div>

    <template #footer>
      <UiButton size="sm" v-if="currentStep > 0 && currentStep < 2" variant="outline" @click="goPrev">
        上一步
      </UiButton>
      <UiButton size="sm" v-if="currentStep < 2" variant="primary" :loading="submitting" @click="goNext">
        {{ currentStep === 1 ? '提交补录' : '下一步' }}
      </UiButton>
      <template v-if="currentStep === 2">
        <UiButton size="sm" variant="outline" @click="emit('continue-next')"> 继续补下一页 </UiButton>
        <UiButton size="sm" variant="primary" @click="handleViewImages"> 查看该卷影像 </UiButton>
      </template>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type {
  ExamManualSupplementDeviceItemResponse,
  ExamManualSupplementPaperPageStatusResponse,
} from '@/apis/mark/manual-supplement'
import type {
  ExamTeacherScanSupplementPrepareResponse,
  ExamTeacherScanSupplementResponse,
} from '@/apis/mark/scan-source'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type {
  ManualSupplementDirectFormModel,
  ManualSupplementSupplementFormModel,
} from '@/components/mark/manual-supplement/ManualSupplementFormCore.vue'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getExamDetail } from '@/apis/mark/exam'
import { getScannerBatchDetail } from '@/apis/mark/exam-scan'
import {
  getManualSupplementPaperPageStatus,
  listManualSupplementDevices,
} from '@/apis/mark/manual-supplement'
import { prepareTeacherScanSupplement, teacherSupplementScanSource } from '@/apis/mark/scan-source'
import ManualSupplementFormCore from '@/components/mark/manual-supplement/ManualSupplementFormCore.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiStep from '@/components/ui-guide/ui/UiStep.vue'
import UiSteps from '@/components/ui-guide/ui/UiSteps.vue'
import { ScannerColorModeCode } from '@/types/enums/scanner-color-mode-enum'
import { ScannerDuplexModeCode } from '@/types/enums/scanner-duplex-mode-enum'
import { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

export type ManualSupplementScenario = 'missing-page' | 'replace' | 'file-import'

export interface ManualSupplementWizardContext {
  scenario: ManualSupplementScenario
  examId: string
  paperInstanceId?: string
  scanBatchId?: string
  targetPageNo?: number
  candidateRosterId?: string
  studentNo?: string
  studentName?: string
  className?: string
  scannerDeviceId?: string
  scannerStationId?: string
  missingTemplatePageNos?: number[]
  blockReason?: string
  replaceBlockReason?: string
  supplementEligible?: boolean
  replaceEligible?: boolean
}

defineOptions({ name: 'ManualSupplementWizardDrawer' })

const props = defineProps<{
  open: boolean
  context: ManualSupplementWizardContext | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
  'continue-next': []
}>()
const resolvedContext = ref<ManualSupplementWizardContext | null>(null)
const paperPageStatus = ref<ExamManualSupplementPaperPageStatusResponse | null>(null)

const router = useRouter()
const currentStep = ref(0)
const submitting = ref(false)
const prepareLoading = ref(false)
const deviceLoading = ref(false)
const prepareContext = ref<ExamTeacherScanSupplementPrepareResponse | null>(null)
const submitResult = ref<ExamTeacherScanSupplementResponse | null>(null)
const declaredClassIds = ref<string[]>([])
const webDevices = ref<ExamManualSupplementDeviceItemResponse[]>([])
const formCoreRef = ref<InstanceType<typeof ManualSupplementFormCore> | null>(null)

const DEFAULT_SCAN_CONFIG: ExamScannerScanConfigVO = {
  dpi: 300,
  colorMode: ScannerColorModeCode.COLOR,
  duplexMode: ScannerDuplexModeCode.SIMPLEX,
  blankPageDetectionEnabled: true,
}

const supplementForm = reactive<ManualSupplementSupplementFormModel>({
  paperInstanceId: undefined,
  targetPageNo: undefined,
  supplementReason: '',
  replaceTargetPage: false,
  sourceFileId: undefined,
  sourceFileName: undefined,
})

const directForm = reactive<ManualSupplementDirectFormModel>({
  deviceKey: undefined,
  startTemplatePageNo: 1,
  sourceFileId: undefined,
  sourceFileName: undefined,
})

const scenario = computed(
  () => resolvedContext.value?.scenario ?? props.context?.scenario ?? 'missing-page',
)

const activeContext = computed(() => resolvedContext.value ?? props.context)

const drawerTitle = computed(() => {
  if (scenario.value === 'file-import') return '文件补入'
  if (scenario.value === 'replace') return '污损页替换'
  return '缺页补扫'
})

const scenarioLabel = computed(() => {
  if (scenario.value === 'replace') return '污损页替换'
  return '缺页补卷'
})

const activeForm = computed(() => (scenario.value === 'file-import' ? directForm : supplementForm))

const deviceOptions = computed(() =>
  webDevices.value.map((item) => ({
    value: `${item.scannerDeviceId}::${item.scannerStationId}`,
    label: `${item.deviceName || item.scannerDeviceId} · ${item.scannerStationId}`,
  })),
)

const targetPageOptions = computed(() => {
  if (scenario.value === 'replace') {
    return (paperPageStatus.value?.occupiedPages ?? []).map((page) => ({
      value: page.templatePageNo,
      label: `模板第 ${page.templatePageNo} 页`,
    }))
  }
  if (scenario.value === 'missing-page') {
    const pageNos
      = activeContext.value?.missingTemplatePageNos
        ?? paperPageStatus.value?.missingTemplatePageNos
        ?? []
    return pageNos.map((pageNo) => ({
      value: pageNo,
      label: `缺第 ${pageNo} 页`,
    }))
  }
  return []
})

const scenarioBlockReason = computed(() => {
  const ctx = activeContext.value
  if (!ctx || scenario.value === 'file-import') {
    return ''
  }
  if (scenario.value === 'replace') {
    return ctx.replaceEligible === false ? (ctx.replaceBlockReason ?? '当前不可执行污损页替换') : ''
  }
  return ctx.supplementEligible === false ? (ctx.blockReason ?? '当前不可执行缺页补扫') : ''
})

const boundPaperOptions = computed(() =>
  (prepareContext.value?.boundPapers ?? []).map((item) => ({
    value: item.paperInstanceId,
    label: `${item.studentNo} · ${item.studentName} · ${item.scanBatchDisplayName}`,
  })),
)

const prepareBlockDescription = computed(() => {
  const context = prepareContext.value
  if (!context || context.canSubmitManualSupplement) return ''
  if (context.hasActiveScanSession) {
    const batchText = context.activeBatchExternalNo ? `（${context.activeBatchExternalNo}）` : ''
    return `${context.activeScanSessionReason ?? context.blockReason ?? '当前设备存在未结束扫描进程'}${batchText}。请先在一体机或扫描监控结束该批次后再提交网页补扫。`
  }
  return context.blockReason ?? context.supplementBlockReason ?? '当前设备或考试状态不允许提交补扫'
})

const classScopeWarning = computed(() =>
  declaredClassIds.value.length === 0 ? '请先在考生名册维护考试班级范围' : '',
)

const submitDisabled = computed(
  () =>
    declaredClassIds.value.length === 0
    || prepareLoading.value
    || prepareContext.value?.canSubmitManualSupplement === false
    || (scenario.value === 'file-import' && webDevices.value.length === 0),
)

const successMessage = computed(() => {
  const result = submitResult.value
  if (!result) return '补录成功'
  if (scenario.value === 'file-import') {
    return `文件补入成功，批次 ${result.batchExternalNo}，登记 ${result.registeredPageCount} 页`
  }
  return `补扫成功，登记 ${result.registeredPageCount} 页`
})

function resolveDeviceFromKey(
  deviceKey?: string,
): { scannerDeviceId: string, scannerStationId: string } | null {
  if (!deviceKey) return null
  const [scannerDeviceId, scannerStationId] = deviceKey.split('::')
  if (!scannerDeviceId || !scannerStationId) return null
  return { scannerDeviceId, scannerStationId }
}

function resetWizardState(): void {
  currentStep.value = 0
  resolvedContext.value = null
  paperPageStatus.value = null
  prepareContext.value = null
  submitResult.value = null
  supplementForm.paperInstanceId = undefined
  supplementForm.targetPageNo = undefined
  supplementForm.supplementReason = ''
  supplementForm.replaceTargetPage = false
  supplementForm.sourceFileId = undefined
  supplementForm.sourceFileName = undefined
  directForm.deviceKey = undefined
  directForm.startTemplatePageNo = 1
  directForm.sourceFileId = undefined
  directForm.sourceFileName = undefined
}

async function enrichContextFromPaperStatus(
  baseContext: ManualSupplementWizardContext,
): Promise<ManualSupplementWizardContext> {
  if (!baseContext.paperInstanceId) {
    resolvedContext.value = { ...baseContext }
    return resolvedContext.value
  }
  try {
    const status = await getManualSupplementPaperPageStatus({
      examId: baseContext.examId,
      paperInstanceId: baseContext.paperInstanceId,
    })
    paperPageStatus.value = status
    resolvedContext.value = {
      ...baseContext,
      scanBatchId: baseContext.scanBatchId ?? status.scanBatchId,
      candidateRosterId: baseContext.candidateRosterId ?? status.candidateRosterId,
      studentNo: baseContext.studentNo ?? status.studentNo,
      studentName: baseContext.studentName ?? status.studentName,
      className: baseContext.className ?? status.className,
      missingTemplatePageNos: baseContext.missingTemplatePageNos ?? status.missingTemplatePageNos,
      supplementEligible: status.supplementEligible,
      blockReason: status.supplementBlockReason,
      replaceEligible: status.replaceEligible,
      replaceBlockReason: status.replaceBlockReason,
    }
  } catch (error) {
    paperPageStatus.value = null
    resolvedContext.value = { ...baseContext }
    showUserError(error, '卷面页状态加载失败')
  }
  return resolvedContext.value
}

async function loadExamDetail(): Promise<void> {
  const examId = activeContext.value?.examId
  if (!examId) {
    declaredClassIds.value = []
    return
  }
  try {
    const detail = await getExamDetail(examId)
    declaredClassIds.value = (detail.classRefs ?? []).map((item) => item.classId)
  } catch (error) {
    declaredClassIds.value = []
    showUserError(error, '考试详情加载失败')
  }
}

async function loadWebDevices(): Promise<void> {
  const examId = activeContext.value?.examId
  if (!examId) {
    webDevices.value = []
    return
  }
  deviceLoading.value = true
  try {
    const response = await listManualSupplementDevices({ examId, directOnly: true })
    webDevices.value = response.items.filter((item) => item.webSupplementEnabled)
  } catch (error) {
    webDevices.value = []
    showUserError(error, '网页补录工位加载失败')
  } finally {
    deviceLoading.value = false
  }
}

async function resolveBatchDeviceIds(): Promise<{
  scannerDeviceId: string
  scannerStationId: string
} | null> {
  const ctx = activeContext.value
  if (ctx?.scannerDeviceId && ctx.scannerStationId) {
    return {
      scannerDeviceId: ctx.scannerDeviceId,
      scannerStationId: ctx.scannerStationId,
    }
  }
  if (!ctx?.scanBatchId || !ctx.examId) return null
  try {
    const batch = await getScannerBatchDetail({
      examId: ctx.examId,
      scanBatchId: ctx.scanBatchId,
    })
    if (!batch.scannerDeviceId || !batch.scannerStationId) return null
    return {
      scannerDeviceId: batch.scannerDeviceId,
      scannerStationId: batch.scannerStationId,
    }
  } catch (error) {
    showUserError(error, '扫描批次加载失败')
    return null
  }
}

async function loadPrepareContext(): Promise<void> {
  prepareContext.value = null
  const ctx = activeContext.value
  if (!ctx?.examId) return

  if (scenario.value === 'file-import') {
    const device = resolveDeviceFromKey(directForm.deviceKey)
    if (!device) return
    prepareLoading.value = true
    try {
      prepareContext.value = await prepareTeacherScanSupplement({
        examId: ctx.examId,
        scannerDeviceId: device.scannerDeviceId,
        scannerStationId: device.scannerStationId,
        scanMode: ScannerKioskScanModeCode.DIRECT,
      })
    } catch (error) {
      prepareContext.value = null
      showUserError(error, '文件补入预检失败')
    } finally {
      prepareLoading.value = false
    }
    return
  }

  const device = await resolveBatchDeviceIds()
  if (!device || !ctx.scanBatchId) return
  prepareLoading.value = true
  try {
    prepareContext.value = await prepareTeacherScanSupplement({
      examId: ctx.examId,
      scannerDeviceId: device.scannerDeviceId,
      scannerStationId: device.scannerStationId,
      scanMode: ScannerKioskScanModeCode.SUPPLEMENT,
      scanBatchId: ctx.scanBatchId,
    })
  } catch (error) {
    prepareContext.value = null
    showUserError(error, '补扫预检失败')
  } finally {
    prepareLoading.value = false
  }
}

function applyContextDefaults(): void {
  const ctx = activeContext.value
  if (!ctx) return
  if (scenario.value === 'file-import') {
    if (webDevices.value.length === 1) {
      const device = webDevices.value[0]
      directForm.deviceKey = `${device.scannerDeviceId}::${device.scannerStationId}`
    }
    return
  }
  supplementForm.paperInstanceId = ctx.paperInstanceId
  supplementForm.targetPageNo
    = ctx.targetPageNo
      ?? (scenario.value === 'missing-page'
      ? (ctx.missingTemplatePageNos?.[0] ?? targetPageOptions.value[0]?.value)
      : targetPageOptions.value[0]?.value)
  supplementForm.replaceTargetPage = scenario.value === 'replace'
  if (scenario.value === 'missing-page') {
    supplementForm.supplementReason = '缺页补扫'
  } else if (scenario.value === 'replace') {
    supplementForm.supplementReason = '污损页替换'
  }
}

function handleDeviceChange(): void {
  void loadPrepareContext()
}

function goPrev(): void {
  if (currentStep.value > 0) {
    currentStep.value -= 1
  }
}

async function goNext(): Promise<void> {
  if (currentStep.value === 0) {
    if (scenario.value === 'file-import' && webDevices.value.length === 0) {
      showFormValidationMessage('请先登记网页补录工位')
      return
    }
    if (scenarioBlockReason.value) {
      message.warning(scenarioBlockReason.value)
      return
    }
    currentStep.value = 1
    if (scenario.value === 'file-import' && directForm.deviceKey) {
      await loadPrepareContext()
    } else {
      await loadPrepareContext()
    }
    return
  }

  if (submitDisabled.value) {
    message.warning(prepareBlockDescription.value || classScopeWarning.value || '当前不可提交补录')
    return
  }
  if (submitting.value) {
    return
  }

  await formCoreRef.value?.validate()
  const ctx = activeContext.value
  if (!ctx?.examId) return

  submitting.value = true
  try {
    if (scenario.value === 'file-import') {
      const device = resolveDeviceFromKey(directForm.deviceKey)
      if (!device || !directForm.sourceFileId) return
      submitResult.value = await teacherSupplementScanSource({
        examId: ctx.examId,
        scannerDeviceId: device.scannerDeviceId,
        scannerStationId: device.scannerStationId,
        declaredClassIds: declaredClassIds.value,
        scanMode: ScannerKioskScanModeCode.DIRECT,
        replaceTargetPage: false,
        scanConfig: DEFAULT_SCAN_CONFIG,
        sourceFileId: directForm.sourceFileId,
        startTemplatePageNo: directForm.startTemplatePageNo,
      })
    } else {
      const device = await resolveBatchDeviceIds()
      if (!device || !ctx.scanBatchId || !supplementForm.sourceFileId) return
      submitResult.value = await teacherSupplementScanSource({
        examId: ctx.examId,
        scannerDeviceId: device.scannerDeviceId,
        scannerStationId: device.scannerStationId,
        declaredClassIds: declaredClassIds.value,
        scanMode: ScannerKioskScanModeCode.SUPPLEMENT,
        scanBatchId: ctx.scanBatchId,
        targetPageNo: supplementForm.targetPageNo,
        supplementReason: supplementForm.supplementReason.trim(),
        replaceTargetPage: supplementForm.replaceTargetPage,
        scanConfig: DEFAULT_SCAN_CONFIG,
        sourceFileId: supplementForm.sourceFileId,
        paperInstanceId: supplementForm.paperInstanceId,
      })
    }
    currentStep.value = 2
    emit('success')
  } catch (error) {
    showUserError(error, '补录提交失败')
  } finally {
    submitting.value = false
  }
}

function handleViewImages(): void {
  const ctx = activeContext.value
  const paperInstanceId = submitResult.value?.paperInstanceId ?? ctx?.paperInstanceId
  if (!ctx?.examId || !paperInstanceId) {
    emit('update:open', false)
    return
  }
  emit('update:open', false)
  void router.push({
    name: 'TeacherExamWorkspaceCandidateRoster',
    params: { examId: ctx.examId },
    query: { paperInstanceId },
  })
}

watch(
  () => ({ open: props.open, context: props.context }),
  async ({ open, context }) => {
    if (!open || !context) return
    resetWizardState()
    await enrichContextFromPaperStatus(context)
    await loadExamDetail()
    await loadWebDevices()
    applyContextDefaults()
  },
  { deep: true },
)
</script>

<style lang="scss" scoped>
.manual-supplement-wizard__steps {
  margin-bottom: 16px;
}

.manual-supplement-wizard__panel {
  min-height: 120px;
}

.manual-supplement-wizard__hint,
.manual-supplement-wizard__warn,
.manual-supplement-wizard__success {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.manual-supplement-wizard__warn,
.muted {
  color: var(--dp-text-tertiary);
}
</style>
