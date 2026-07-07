<template>
  <StageWorkbenchShell>
    <template #signal>
      <SignalBand :metrics="summaryMetrics" compact @metric-click="handleMetricClick" />
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择考试" />

    <template v-else>
      <UiAlertStrip
        v-if="prepBlockReason"
        tone="warning"
        :message="prepBlockReason"
        class="scan-manual-entry__alert"
      />

      <UiSectionTabs
        v-model="activeTab"
        :items="tabItems"
        compact
        class="scan-manual-entry__tabs"
      />

      <!-- 首次文件导入 -->
      <a-form
        v-if="activeTab === 'direct'"
        ref="directFormRef"
        :model="directForm"
        :rules="directRules"
        layout="vertical"
        class="scan-manual-entry__form"
      >
        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="扫描设备" name="deviceKey" required>
              <a-select
                v-model:value="directForm.deviceKey"
                placeholder="选择启用中的扫描设备"
                :options="deviceOptions"
                :loading="devicesLoading"
                show-search
                option-filter-prop="label"
                @change="handleDirectDeviceChange"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="起始模板页号" name="startTemplatePageNo">
              <a-input-number
                v-model:value="directForm.startTemplatePageNo"
                :min="1"
                placeholder="默认从第 1 页起"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="扫描来源文件（PDF 或多页图片）" name="sourceFileId" required>
          <UiPlatformFileField
            v-model:file-node-id="directForm.sourceFileId"
            v-model:file-name="directForm.sourceFileName"
            :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
            accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
            button-text="选择文件"
          />
        </a-form-item>
        <p v-if="directPrepareHint" class="scan-manual-entry__hint">{{ directPrepareHint }}</p>
        <UiButton
          variant="primary"
          :loading="directSubmitting"
          :disabled="directSubmitDisabled"
          @click="submitDirect"
        >
          提交首次导入
        </UiButton>
      </a-form>

      <!-- 指定页补扫 -->
      <a-form
        v-else-if="activeTab === 'supplement'"
        ref="supplementFormRef"
        :model="supplementForm"
        :rules="supplementRules"
        layout="vertical"
        class="scan-manual-entry__form"
      >
        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="目标批次" name="scanBatchId" required>
              <a-select
                v-model:value="supplementForm.scanBatchId"
                placeholder="选择已 commit 的批次"
                :options="supplementBatchOptions"
                :loading="batchesLoading"
                show-search
                option-filter-prop="label"
                @change="handleSupplementBatchChange"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="补扫试卷" name="paperInstanceId" required>
              <a-select
                v-model:value="supplementForm.paperInstanceId"
                placeholder="选择本设备已绑定试卷"
                :options="boundPaperOptions"
                :loading="supplementPrepareLoading"
                show-search
                option-filter-prop="label"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="补扫目标页" name="targetPageNo" required>
              <a-input-number
                v-model:value="supplementForm.targetPageNo"
                :min="1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="16">
            <a-form-item label="补扫原因" name="supplementReason" required>
              <a-input v-model:value="supplementForm.supplementReason" :maxlength="255" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item name="replaceTargetPage">
          <a-checkbox v-model:checked="supplementForm.replaceTargetPage">
            替换目标页（勾选后旧页标记为 SUPERSEDED）
          </a-checkbox>
        </a-form-item>
        <a-form-item label="补扫文件（单张图片）" name="sourceFileId" required>
          <UiPlatformFileField
            v-model:file-node-id="supplementForm.sourceFileId"
            v-model:file-name="supplementForm.sourceFileName"
            :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
            accept=".png,.jpg,.jpeg,.tif,.tiff"
            button-text="选择文件"
          />
        </a-form-item>
        <p v-if="supplementPrepareHint" class="scan-manual-entry__hint">
          {{ supplementPrepareHint }}
        </p>
        <UiButton
          variant="primary"
          :loading="supplementSubmitting"
          :disabled="supplementSubmitDisabled"
          @click="submitSupplement"
        >
          提交指定页补扫
        </UiButton>
      </a-form>

      <!-- 批次页维护 -->
      <a-form
        v-else-if="activeTab === 'maintenance'"
        ref="maintenanceFormRef"
        :model="maintenanceForm"
        :rules="maintenanceRules"
        layout="vertical"
        class="scan-manual-entry__form"
      >
        <a-form-item label="目标批次（须 RECEIVED）" name="scanBatchId" required>
          <a-select
            v-model:value="maintenanceForm.scanBatchId"
            placeholder="选择已接收状态的批次"
            :options="receivedBatchOptions"
            :loading="batchesLoading"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-radio-group v-model:value="maintenanceForm.mode" class="scan-manual-entry__mode">
          <a-radio value="register">单页登记</a-radio>
          <a-radio value="import">来源文件导入</a-radio>
        </a-radio-group>
        <template v-if="maintenanceForm.mode === 'register'">
          <a-row :gutter="16">
            <a-col :xs="24" :md="8">
              <a-form-item label="扫描页序号" name="pageSeq" required>
                <a-input-number
                  v-model:value="maintenanceForm.pageSeq"
                  :min="1"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="模板页号" name="templatePageNo" required>
                <a-input-number
                  v-model:value="maintenanceForm.templatePageNo"
                  :min="1"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="已有试卷实例 ID">
                <a-input
                  v-model:value="maintenanceForm.paperInstanceId"
                  placeholder="可选，续扫时填写"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="扫描页文件" name="fileId" required>
            <UiPlatformFileField
              v-model:file-node-id="maintenanceForm.fileId"
              v-model:file-name="maintenanceForm.fileName"
              :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
              accept=".png,.jpg,.jpeg,.tif,.tiff"
              button-text="选择单页图片"
            />
          </a-form-item>
          <UiButton variant="primary" :loading="maintenanceSubmitting" @click="submitRegister">
            登记扫描页
          </UiButton>
        </template>
        <template v-else>
          <a-row :gutter="16">
            <a-col :xs="24" :md="8">
              <a-form-item label="起始扫描页序号" name="startPageSeq">
                <a-input-number
                  v-model:value="maintenanceForm.startPageSeq"
                  :min="1"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="起始模板页号" name="startTemplatePageNo">
                <a-input-number
                  v-model:value="maintenanceForm.startTemplatePageNo"
                  :min="1"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="已有试卷实例 ID">
                <a-input v-model:value="maintenanceForm.paperInstanceId" placeholder="可选" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="来源文件（PDF 或图片）" name="sourceFileId" required>
            <UiPlatformFileField
              v-model:file-node-id="maintenanceForm.sourceFileId"
              v-model:file-name="maintenanceForm.sourceFileName"
              :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
              accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
              button-text="选择文件"
            />
          </a-form-item>
          <UiButton variant="primary" :loading="maintenanceSubmitting" @click="submitImport">
            导入并登记
          </UiButton>
        </template>
      </a-form>

      <!-- 识别提交 -->
      <template v-else>
        <UiFilterBar
          v-model="recognitionFilter"
          :fields="recognitionFilterFields"
          variant="plain"
          search-text="加载切片"
          @search="loadPaperSlices"
        />
        <UiDataTable
          :columns="sliceColumns"
          :data-source="paperSlices"
          :loading="slicesLoading"
          row-key="responseSliceId"
          size="small"
          flat
          :pagination="false"
          empty-kind="first-run"
        >
          <template #empty>
            <UiEmpty description="请选择已绑定卷面后加载作答切片" />
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'questionType'">
              {{ strictEnumLabel(QuestionTypeDescription, record.questionType, '题型') }}
            </template>
            <template v-else-if="column.key === 'ocrScene'">
              {{ strictEnumLabel(MARK_OCR_SCENE_LABEL, record.ocrScene, 'OCR 识别场景') }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildSliceRowActions(record)"
                split
                @action="(key) => handleSliceRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
        <UiCard
          v-if="lastRecognizePreview"
          title="最近识别结果"
          class="scan-manual-entry__recognize-card"
        >
          <p class="scan-manual-entry__recognize-text">
            {{ lastRecognizePreview.recognizedText || '（空作答）' }}
          </p>
          <p v-if="lastRecognizePreview.diagnostic" class="scan-manual-entry__hint">
            {{ lastRecognizePreview.diagnostic }}
          </p>
        </UiCard>
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamScannerDeviceResponse } from '@/apis/mark/exam-mark-scanner'
import { listActiveScannerDevices } from '@/apis/mark/exam-mark-scanner'
import type { ExamScannerBatchResponse } from '@/apis/mark/exam-scan'
import { pageScannerBatches, QualityDecisionCode } from '@/apis/mark/exam-scan'
import type { MarkOcrPaperSliceVO, MarkOcrRecognizeResponse } from '@/apis/mark/ocr-recognition'
import {
  listMarkOcrPaperSlices,
  recognizeMarkOcr,
  submitRecognition,
} from '@/apis/mark/ocr-recognition'
import type { ExamTeacherScanSupplementPrepareResponse } from '@/apis/mark/scan-source'
import {
  importScanSource,
  prepareTeacherScanSupplement,
  registerScannedPage,
  teacherSupplementScanSource,
} from '@/apis/mark/scan-source'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type { SignalMetric } from '@/types/workbench'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getExamDetail } from '@/apis/mark/exam'
import { pageExamScoreSummary } from '@/apis/mark/exam-score'
import { MARK_OCR_SCENE_LABEL } from '@/apis/mark/ocr-scene'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { ScannerColorModeCode } from '@/types/enums/scanner-color-mode-enum'
import { ScannerDuplexModeCode } from '@/types/enums/scanner-duplex-mode-enum'
import { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScanManualEntry' })

type ManualEntryTab = 'direct' | 'supplement' | 'maintenance' | 'recognition'
type MaintenanceMode = 'register' | 'import'

const DEFAULT_SCAN_CONFIG: ExamScannerScanConfigVO = {
  dpi: 300,
  colorMode: ScannerColorModeCode.COLOR,
  duplexMode: ScannerDuplexModeCode.SIMPLEX,
  blankPageDetectionEnabled: true,
}

const router = useRouter()
const { selectedExamId } = useMarkExamContext()

const activeTab = ref<ManualEntryTab>('direct')
const tabItems = [
  { key: 'direct', label: '首次文件导入' },
  { key: 'supplement', label: '指定页补扫' },
  { key: 'maintenance', label: '批次页维护' },
  { key: 'recognition', label: '识别提交' },
]

const declaredClassIds = ref<string[]>([])
const prepBlockReason = ref('')
const devices = ref<ExamScannerDeviceResponse[]>([])
const devicesLoading = ref(false)
const batches = ref<ExamScannerBatchResponse[]>([])
const batchesLoading = ref(false)

const directFormRef = ref<FormInstance>()
const supplementFormRef = ref<FormInstance>()
const maintenanceFormRef = ref<FormInstance>()

const directForm = reactive({
  deviceKey: undefined as string | undefined,
  startTemplatePageNo: 1 as number | undefined,
  sourceFileId: undefined as string | undefined,
  sourceFileName: undefined as string | undefined,
})
const directPrepare = ref<ExamTeacherScanSupplementPrepareResponse | null>(null)
const directPrepareLoading = ref(false)
const directSubmitting = ref(false)

const supplementForm = reactive({
  scanBatchId: undefined as string | undefined,
  paperInstanceId: undefined as string | undefined,
  targetPageNo: undefined as number | undefined,
  supplementReason: '',
  replaceTargetPage: false,
  sourceFileId: undefined as string | undefined,
  sourceFileName: undefined as string | undefined,
})
const supplementPrepare = ref<ExamTeacherScanSupplementPrepareResponse | null>(null)
const supplementPrepareLoading = ref(false)
const supplementSubmitting = ref(false)

const maintenanceForm = reactive({
  scanBatchId: undefined as string | undefined,
  mode: 'register' as MaintenanceMode,
  pageSeq: 1 as number | undefined,
  templatePageNo: 1 as number | undefined,
  paperInstanceId: undefined as string | undefined,
  fileId: undefined as string | undefined,
  fileName: undefined as string | undefined,
  startPageSeq: 1 as number | undefined,
  startTemplatePageNo: 1 as number | undefined,
  sourceFileId: undefined as string | undefined,
  sourceFileName: undefined as string | undefined,
})
const maintenanceSubmitting = ref(false)

const recognitionFilter = reactive({ paperInstanceId: undefined as string | undefined })
const paperCandidateOptions = ref<Array<{ value: string; label: string }>>([])
const paperSlices = ref<MarkOcrPaperSliceVO[]>([])
const slicesLoading = ref(false)
const recognizingSliceId = ref<string | null>(null)
const submittingSliceId = ref<string | null>(null)
const sliceRecognizeMap = reactive<Record<string, MarkOcrRecognizeResponse>>({})
const lastRecognizePreview = ref<MarkOcrRecognizeResponse | null>(null)

const deviceOptions = computed(() =>
  devices.value.map((item) => ({
    value: `${item.scannerDeviceId}::${item.scannerStationId}`,
    label: `${item.scannerDeviceId} · ${item.scannerStationId}${item.deviceName ? ` · ${item.deviceName}` : ''}`,
    device: item,
  })),
)

const supplementBatchOptions = computed(() =>
  batches.value
    .filter((item) => item.status !== 'DISCARDED' && item.status !== 'IN_PROGRESS')
    .map((item) => ({
      value: item.scanBatchId,
      label: `${item.batchNo}${item.batchExternalNo ? ` · ${item.batchExternalNo}` : ''} · ${item.scannerDeviceId}`,
      batch: item,
    })),
)

const receivedBatchOptions = computed(() =>
  batches.value
    .filter((item) => item.status === 'RECEIVED')
    .map((item) => ({
      value: item.scanBatchId,
      label: `${item.batchNo}${item.batchExternalNo ? ` · ${item.batchExternalNo}` : ''}`,
    })),
)

const boundPaperOptions = computed(() =>
  (supplementPrepare.value?.boundPapers ?? []).map((item) => ({
    value: item.paperInstanceId,
    label: `${item.studentNo} · ${item.studentName} · ${item.scanBatchDisplayName}`,
  })),
)

function resolveDeviceFromKey(
  deviceKey?: string,
): { scannerDeviceId: string; scannerStationId: string } | null {
  if (!deviceKey) return null
  const [scannerDeviceId, scannerStationId] = deviceKey.split('::')
  if (!scannerDeviceId || !scannerStationId) return null
  return { scannerDeviceId, scannerStationId }
}

function resolveBatch(scanBatchId?: string): ExamScannerBatchResponse | null {
  if (!scanBatchId) return null
  return batches.value.find((item) => item.scanBatchId === scanBatchId) ?? null
}

function buildPrepareHint(context: ExamTeacherScanSupplementPrepareResponse | null): string {
  if (!context || context.canSubmitManualSupplement) return ''
  if (context.hasActiveScanSession) {
    const batchText = context.activeBatchExternalNo ? `（${context.activeBatchExternalNo}）` : ''
    return `${context.activeScanSessionReason ?? context.blockReason ?? '当前设备存在未结束扫描进程'}${batchText}。请先在扫描监控结束该批次后再提交。`
  }
  return context.blockReason ?? context.supplementBlockReason ?? '当前设备或考试状态不允许提交'
}

const directPrepareHint = computed(() => buildPrepareHint(directPrepare.value))
const supplementPrepareHint = computed(() => buildPrepareHint(supplementPrepare.value))

const directSubmitDisabled = computed(
  () =>
    declaredClassIds.value.length === 0 ||
    directPrepareLoading.value ||
    directPrepare.value?.canSubmitManualSupplement === false,
)

const supplementSubmitDisabled = computed(
  () =>
    declaredClassIds.value.length === 0 ||
    supplementPrepareLoading.value ||
    supplementPrepare.value?.canSubmitManualSupplement === false,
)

const summaryMetrics = computed<SignalMetric[]>(() => [
  {
    key: 'devices',
    label: '可用设备',
    value: String(devices.value.length),
    tone: devices.value.length > 0 ? 'blue' : 'orange',
    clickable: true,
  },
  {
    key: 'received-batches',
    label: 'RECEIVED 批次',
    value: String(receivedBatchOptions.value.length),
    tone: receivedBatchOptions.value.length > 0 ? 'green' : 'gray',
    clickable: true,
  },
  {
    key: 'batches',
    label: '全部批次',
    value: String(batches.value.length),
    tone: 'blue',
    clickable: true,
  },
])

const recognitionFilterFields = computed(() => [
  {
    key: 'paperInstanceId',
    label: '已绑定卷面',
    type: 'select' as const,
    options: paperCandidateOptions.value,
    allowSearch: true,
    placeholder: '选择已绑定卷面',
  },
])

const sliceColumns: ColumnType<MarkOcrPaperSliceVO>[] = [
  { title: '题号', dataIndex: 'questionNo', key: 'questionNo', width: 80 },
  { title: '题型', key: 'questionType', width: 100 },
  { title: 'OCR 场景', key: 'ocrScene', width: 120 },
  { title: '页号', dataIndex: 'pageNo', key: 'pageNo', width: 72, align: 'right' },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 72, align: 'right' },
  { title: '操作', key: 'actions', width: 180 },
]

const directRules: Record<string, Rule[]> = {
  deviceKey: [{ required: true, message: '请选择扫描设备' }],
  sourceFileId: [
    {
      validator: async () => {
        if (!directForm.sourceFileId) {
          return Promise.reject(new Error('请选择扫描来源文件'))
        }
      },
    },
  ],
}

const supplementRules: Record<string, Rule[]> = {
  scanBatchId: [{ required: true, message: '请选择目标批次' }],
  paperInstanceId: [{ required: true, message: '请选择已绑定试卷' }],
  targetPageNo: [{ required: true, type: 'number', min: 1, message: '请填写补扫目标页号' }],
  supplementReason: [{ required: true, message: '请填写补扫原因' }],
  sourceFileId: [
    {
      validator: async () => {
        if (!supplementForm.sourceFileId) {
          return Promise.reject(new Error('请选择补扫文件'))
        }
      },
    },
  ],
}

const maintenanceRules: Record<string, Rule[]> = {
  scanBatchId: [{ required: true, message: '请选择 RECEIVED 批次' }],
}

function handleMetricClick(key: string): void {
  if (key === 'batches' || key === 'received-batches') {
    void router.push({
      name: 'TeacherExamWorkspaceScanBatches',
      params: { examId: selectedExamId.value },
    })
  }
}

async function loadExamContext(): Promise<void> {
  if (!selectedExamId.value) {
    declaredClassIds.value = []
    prepBlockReason.value = ''
    return
  }
  try {
    const detail = await getExamDetail(selectedExamId.value)
    declaredClassIds.value = (detail.classRefs ?? []).map((item) => item.classId)
    prepBlockReason.value =
      declaredClassIds.value.length === 0 ? '请先在考生名册维护考试班级范围' : ''
  } catch (error) {
    declaredClassIds.value = []
    showUserError(error, '考试详情加载失败')
  }
}

async function loadDevices(): Promise<void> {
  devicesLoading.value = true
  try {
    devices.value = await listActiveScannerDevices()
  } catch (error) {
    devices.value = []
    showUserError(error, '扫描设备加载失败')
  } finally {
    devicesLoading.value = false
  }
}

async function loadBatches(): Promise<void> {
  if (!selectedExamId.value) {
    batches.value = []
    return
  }
  batchesLoading.value = true
  try {
    const result = await pageScannerBatches({
      examId: selectedExamId.value,
      pageNum: 1,
      pageSize: 200,
    })
    batches.value = result.list
  } catch (error) {
    batches.value = []
    showUserError(error, '扫描批次加载失败')
  } finally {
    batchesLoading.value = false
  }
}

async function loadPaperCandidates(): Promise<void> {
  if (!selectedExamId.value) {
    paperCandidateOptions.value = []
    return
  }
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      pageNum: 1,
      pageSize: 100,
    })
    paperCandidateOptions.value = result.list
      .filter((item) => item.paperInstanceId && item.bindingStatus === 'BOUND')
      .map((item) => ({
        value: item.paperInstanceId!,
        label: `${item.studentNo} · ${item.studentName}`,
      }))
  } catch (error) {
    paperCandidateOptions.value = []
    showUserError(error, '卷面候选加载失败')
  }
}

async function loadDirectPrepare(): Promise<void> {
  directPrepare.value = null
  const examId = selectedExamId.value
  const device = resolveDeviceFromKey(directForm.deviceKey)
  if (!examId || !device) return
  directPrepareLoading.value = true
  try {
    directPrepare.value = await prepareTeacherScanSupplement({
      examId,
      scannerDeviceId: device.scannerDeviceId,
      scannerStationId: device.scannerStationId,
      scanMode: ScannerKioskScanModeCode.DIRECT,
    })
  } catch (error) {
    directPrepare.value = null
    showUserError(error, '首次导入预检失败')
  } finally {
    directPrepareLoading.value = false
  }
}

async function loadSupplementPrepare(): Promise<void> {
  supplementPrepare.value = null
  const examId = selectedExamId.value
  const batch = resolveBatch(supplementForm.scanBatchId)
  if (!examId || !batch?.scannerDeviceId || !batch.scannerStationId || !batch.scanBatchId) return
  supplementPrepareLoading.value = true
  try {
    supplementPrepare.value = await prepareTeacherScanSupplement({
      examId,
      scannerDeviceId: batch.scannerDeviceId,
      scannerStationId: batch.scannerStationId,
      scanMode: ScannerKioskScanModeCode.SUPPLEMENT,
      scanBatchId: batch.scanBatchId,
    })
  } catch (error) {
    supplementPrepare.value = null
    showUserError(error, '补扫预检失败')
  } finally {
    supplementPrepareLoading.value = false
  }
}

function handleDirectDeviceChange(): void {
  void loadDirectPrepare()
}

function handleSupplementBatchChange(): void {
  supplementForm.paperInstanceId = undefined
  void loadSupplementPrepare()
}

async function submitDirect(): Promise<void> {
  if (directSubmitDisabled.value) {
    message.warning(directPrepareHint.value || '当前不可提交首次导入')
    return
  }
  await directFormRef.value?.validate()
  const examId = selectedExamId.value
  const device = resolveDeviceFromKey(directForm.deviceKey)
  if (!examId || !device || !directForm.sourceFileId) return
  directSubmitting.value = true
  try {
    const response = await teacherSupplementScanSource({
      examId,
      scannerDeviceId: device.scannerDeviceId,
      scannerStationId: device.scannerStationId,
      declaredClassIds: declaredClassIds.value,
      scanMode: ScannerKioskScanModeCode.DIRECT,
      replaceTargetPage: false,
      scanConfig: DEFAULT_SCAN_CONFIG,
      sourceFileId: directForm.sourceFileId,
      startTemplatePageNo: directForm.startTemplatePageNo,
    })
    message.success(
      `首次导入成功，批次 ${response.batchExternalNo}，登记 ${response.registeredPageCount} 页`,
    )
    directForm.sourceFileId = undefined
    directForm.sourceFileName = undefined
    void loadBatches()
  } catch (error) {
    showUserError(error, '首次文件导入失败')
  } finally {
    directSubmitting.value = false
  }
}

async function submitSupplement(): Promise<void> {
  if (supplementSubmitDisabled.value) {
    message.warning(supplementPrepareHint.value || '当前不可提交补扫')
    return
  }
  await supplementFormRef.value?.validate()
  const examId = selectedExamId.value
  const batch = resolveBatch(supplementForm.scanBatchId)
  if (
    !examId ||
    !batch?.scanBatchId ||
    !batch.scannerDeviceId ||
    !batch.scannerStationId ||
    !supplementForm.sourceFileId
  ) {
    return
  }
  supplementSubmitting.value = true
  try {
    const response = await teacherSupplementScanSource({
      examId,
      scannerDeviceId: batch.scannerDeviceId,
      scannerStationId: batch.scannerStationId,
      declaredClassIds: declaredClassIds.value,
      scanMode: ScannerKioskScanModeCode.SUPPLEMENT,
      scanBatchId: batch.scanBatchId,
      targetPageNo: supplementForm.targetPageNo,
      supplementReason: supplementForm.supplementReason.trim(),
      replaceTargetPage: supplementForm.replaceTargetPage,
      scanConfig: DEFAULT_SCAN_CONFIG,
      sourceFileId: supplementForm.sourceFileId,
      paperInstanceId: supplementForm.paperInstanceId,
    })
    message.success(`补扫成功，登记 ${response.registeredPageCount} 页`)
    supplementForm.sourceFileId = undefined
    supplementForm.sourceFileName = undefined
    void loadBatches()
  } catch (error) {
    showUserError(error, '指定页补扫失败')
  } finally {
    supplementSubmitting.value = false
  }
}

async function submitRegister(): Promise<void> {
  await maintenanceFormRef.value?.validate()
  const examId = selectedExamId.value
  if (!examId || !maintenanceForm.scanBatchId || !maintenanceForm.fileId) return
  maintenanceSubmitting.value = true
  try {
    const response = await registerScannedPage({
      examId,
      scanBatchId: maintenanceForm.scanBatchId,
      paperInstanceId: maintenanceForm.paperInstanceId || undefined,
      pageSeq: maintenanceForm.pageSeq ?? 1,
      templatePageNo: maintenanceForm.templatePageNo ?? 1,
      fileId: maintenanceForm.fileId,
      qualityStatus: QualityDecisionCode.PASS,
    })
    message.success(`登记成功，页 ID ${response.pageId}，试卷 ${response.paperInstanceId}`)
    maintenanceForm.fileId = undefined
    maintenanceForm.fileName = undefined
    if (!maintenanceForm.paperInstanceId) {
      maintenanceForm.paperInstanceId = response.paperInstanceId
    }
  } catch (error) {
    showUserError(error, '单页登记失败')
  } finally {
    maintenanceSubmitting.value = false
  }
}

async function submitImport(): Promise<void> {
  await maintenanceFormRef.value?.validate()
  const examId = selectedExamId.value
  if (!examId || !maintenanceForm.scanBatchId || !maintenanceForm.sourceFileId) return
  maintenanceSubmitting.value = true
  try {
    const response = await importScanSource({
      examId,
      scanBatchId: maintenanceForm.scanBatchId,
      sourceFileId: maintenanceForm.sourceFileId,
      paperInstanceId: maintenanceForm.paperInstanceId || undefined,
      startPageSeq: maintenanceForm.startPageSeq,
      startTemplatePageNo: maintenanceForm.startTemplatePageNo,
    })
    message.success(`导入成功，登记 ${response.registeredPageCount} 页`)
    maintenanceForm.sourceFileId = undefined
    maintenanceForm.sourceFileName = undefined
    if (response.paperInstanceId) {
      maintenanceForm.paperInstanceId = response.paperInstanceId
    }
  } catch (error) {
    showUserError(error, '来源文件导入失败')
  } finally {
    maintenanceSubmitting.value = false
  }
}

async function loadPaperSlices(): Promise<void> {
  const examId = selectedExamId.value
  const paperInstanceId = recognitionFilter.paperInstanceId
  if (!examId || !paperInstanceId) {
    message.warning('请选择已绑定卷面')
    return
  }
  slicesLoading.value = true
  try {
    paperSlices.value = await listMarkOcrPaperSlices({ examId, paperInstanceId })
  } catch (error) {
    paperSlices.value = []
    showUserError(error, '作答切片加载失败')
  } finally {
    slicesLoading.value = false
  }
}

function buildSliceRowActions(slice: MarkOcrPaperSliceVO): UiTableRowActionItem[] {
  return [
    {
      key: 'recognize',
      label: 'OCR 识别',
      disabled: recognizingSliceId.value === slice.responseSliceId,
    },
    {
      key: 'submit',
      label: '提交识别',
      disabled:
        submittingSliceId.value === slice.responseSliceId ||
        !sliceRecognizeMap[slice.responseSliceId],
    },
  ]
}

function handleSliceRowAction(key: string, slice: MarkOcrPaperSliceVO): void {
  if (key === 'recognize') {
    void handleRecognizeSlice(slice)
    return
  }
  if (key === 'submit') {
    void handleSubmitRecognition(slice)
  }
}

async function handleRecognizeSlice(slice: MarkOcrPaperSliceVO): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) return
  recognizingSliceId.value = slice.responseSliceId
  try {
    const result = await recognizeMarkOcr({
      examId,
      paperInstanceId: slice.paperInstanceId,
      responseSliceId: slice.responseSliceId,
      layoutQuestionId: slice.layoutQuestionId,
    })
    sliceRecognizeMap[slice.responseSliceId] = result
    lastRecognizePreview.value = result
    message.success(`题 ${slice.questionNo} OCR 识别完成`)
  } catch (error) {
    showUserError(error, 'OCR 识别失败')
  } finally {
    recognizingSliceId.value = null
  }
}

async function handleSubmitRecognition(slice: MarkOcrPaperSliceVO): Promise<void> {
  const examId = selectedExamId.value
  const recognizeResult = sliceRecognizeMap[slice.responseSliceId]
  if (!examId || !recognizeResult) return
  const ocrScene = recognizeResult.ocrScene ?? slice.ocrScene
  if (!ocrScene) {
    message.error('OCR 识别结果缺少识别场景，请重新识别')
    return
  }
  if (recognizeResult.manualReviewRequired == null || recognizeResult.emptyAnswer == null) {
    message.error('OCR 识别结果缺少提交所需字段，请重新识别')
    return
  }
  submittingSliceId.value = slice.responseSliceId
  try {
    await submitRecognition({
      examId,
      paperInstanceId: slice.paperInstanceId,
      layoutQuestionId: slice.layoutQuestionId,
      responseSliceId: slice.responseSliceId,
      recognizedAnswer: recognizeResult.recognizedText,
      engineTraceId: recognizeResult.engineTraceId,
      diagnostic: recognizeResult.diagnostic,
      diagnosticCode: recognizeResult.diagnosticCode,
      diagnosticMessage: recognizeResult.diagnosticMessage,
      preprocessSummary: recognizeResult.preprocessSummary,
      ocrScene,
      manualReviewRequired: recognizeResult.manualReviewRequired,
      emptyAnswer: recognizeResult.emptyAnswer,
    })
    message.success(`题 ${slice.questionNo} 识别结果已提交`)
  } catch (error) {
    showUserError(error, '识别结果提交失败')
  } finally {
    submittingSliceId.value = null
  }
}

watch(
  selectedExamId,
  () => {
    void loadExamContext()
    void loadBatches()
    void loadPaperCandidates()
  },
  { immediate: true },
)

onMounted(() => {
  void loadDevices()
})
</script>

<style lang="scss" scoped>
.scan-manual-entry__alert {
  margin-bottom: var(--dp-space-4);
}

.scan-manual-entry__tabs {
  margin-bottom: var(--dp-space-4);
}

.scan-manual-entry__form {
  max-width: 880px;
}

.scan-manual-entry__hint {
  margin: 0 0 var(--dp-space-4);
  color: var(--ant-color-text-tertiary);
  font-size: 13px;
}

.scan-manual-entry__mode {
  margin-bottom: var(--dp-space-4);
}

.scan-manual-entry__recognize-card {
  margin-top: var(--dp-space-4);
}

.scan-manual-entry__recognize-text {
  margin: 0;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
}
</style>
