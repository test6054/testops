<template>
  <UiCard class="scan-manual-supplement">
    <template #title>
      <UploadOutlined />
      <span>人工补录</span>
    </template>
    <template #extra>
      <UiTextAction @click="goScanDevices">管理扫描设备</UiTextAction>
    </template>

    <UiAlertStrip
      tone="info"
      title="浏览器直传补录"
      description="先选扫描设备与补录模式，上传 PDF/图片后由服务端开启批次锚点、commit 并登记扫描页。补扫须在已有首次扫描或已登记页后执行。"
      dense
      class="scan-manual-supplement__hint"
    />





    <UiAlertStrip
      v-if="prepareContext && !prepareContext.canSubmitManualSupplement"
      tone="warning"
      :title="prepareContext.hasActiveScanSession ? '扫描进程未结束' : '当前不可提交补录'"
      :description="prepareBlockDescription"
      dense
      class="scan-manual-supplement__block"
    >
      <template v-if="prepareContext.hasActiveScanSession" #actions>
        <UiTextAction @click="goScanMonitor">前往扫描监控</UiTextAction>
      </template>
    </UiAlertStrip>

    <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="扫描设备（含工位）" name="deviceKey" required>
            <a-select
              v-model:value="form.deviceKey"
              placeholder="选择补录归属的扫描设备"
              :options="deviceOptions"
              :loading="devicesLoading"
              show-search
              option-filter-prop="label"
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="补录模式" name="scanMode" required>
            <a-radio-group v-model:value="form.scanMode">
              <a-radio value="DIRECT">首次补录</a-radio>
              <a-radio value="SUPPLEMENT">指定页补扫</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row v-if="form.scanMode === 'SUPPLEMENT'" :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="补扫试卷" name="paperInstanceId" required>
            <a-select
              v-model:value="form.paperInstanceId"
              placeholder="选择本设备已绑定试卷"
              :options="boundPaperOptions"
              :loading="prepareLoading"
              :disabled="!form.deviceKey || prepareLoading"
              show-search
              option-filter-prop="label"
              allow-clear
            />
            <p
              v-if="form.deviceKey && !prepareLoading && boundPaperOptions.length === 0 && prepareContext?.canSubmitManualSupplement"
              class="scan-manual-supplement__warn muted"
            >
              本设备暂无已绑定试卷，请先在扫描监控完成身份绑定。
              <UiTextAction @click="goScanMonitor">前往扫描监控</UiTextAction>
            </p>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="6">
          <a-form-item label="补扫目标页" name="targetPageNo" required>
            <a-input-number
              v-model:value="form.targetPageNo"
              :min="1"
              placeholder="模板页号"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="6">
          <a-form-item label="补扫原因" name="supplementReason" required>
            <a-input
              v-model:value="form.supplementReason"
              placeholder="说明补扫原因，供审计追溯"
              :maxlength="255"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24">
          <a-form-item name="replaceTargetPage">
            <a-checkbox v-model:checked="form.replaceTargetPage">
              替换目标页（勾选后旧页标记为 SUPERSEDED）
            </a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item
            :label="form.scanMode === 'SUPPLEMENT' ? '补扫文件（单张图片）' : '扫描文件（PDF 或图片）'"
            name="file"
            required
          >
            <a-upload
              :before-upload="onBeforeUpload"
              :file-list="uploadFileList"
              :max-count="1"
              :accept="uploadAccept"
              @remove="onRemoveUpload"
            >
              <UiButton variant="outline" size="sm">选择文件</UiButton>
            </a-upload>
          </a-form-item>
        </a-col>
        <a-col v-if="form.scanMode === 'DIRECT'" :xs="24" :md="12">
          <a-form-item label="起始模板页号（可选）" name="startTemplatePageNo">
            <a-input-number
              v-model:value="form.startTemplatePageNo"
              :min="1"
              placeholder="默认从第 1 页顺序映射"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item>
        <UiButton
          :loading="submitting"
          :disabled="submitDisabled"
          @click="handleSubmit"
        >
          提交人工补录
        </UiButton>
        <span v-if="declaredClassIds.length === 0" class="scan-manual-supplement__warn muted">
          请先在考生名册维护考试班级范围
        </span>
      </a-form-item>
    </a-form>
  </UiCard>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { UploadFile } from 'ant-design-vue/es/upload'
import type { ExamScannerDeviceVO } from '@/apis/mark/exam-mark-scanner'
import type { ExamTeacherScanSupplementPrepareResponse } from '@/apis/mark/scan-source'
import type { ExamScannerScanConfigVO, ScannerKioskScanMode } from '@/apis/mark/scanner-kiosk'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { uploadFile } from '@/apis/edu/file-management'
import { getExamDetail } from '@/apis/mark/exam'
import { prepareTeacherScanSupplement, teacherSupplementScanSource } from '@/apis/mark/scan-source'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'ScanManualSupplementPanel' })

const props = defineProps<{
  examId: string
  devices: ExamScannerDeviceVO[]
  devicesLoading: boolean
}>()

const emit = defineEmits<{
  success: []
}>()

const router = useRouter()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const prepareLoading = ref(false)
const prepareContext = ref<ExamTeacherScanSupplementPrepareResponse | null>(null)
const declaredClassIds = ref<string[]>([])

const DEFAULT_SCAN_CONFIG: ExamScannerScanConfigVO = {
  dpi: 300,
  colorMode: 'COLOR',
  duplexMode: 'SIMPLEX',
  blankPageDetectionEnabled: true,
}

const form = reactive<{
  deviceKey: string | undefined
  scanMode: ScannerKioskScanMode
  targetPageNo: number | undefined
  supplementReason: string
  replaceTargetPage: boolean
  file: File | null
  startTemplatePageNo: number | undefined
  paperInstanceId: string | undefined
}>({
  deviceKey: undefined,
  scanMode: 'DIRECT',
  targetPageNo: undefined,
  supplementReason: '',
  replaceTargetPage: false,
  file: null,
  startTemplatePageNo: undefined,
  paperInstanceId: undefined,
})

const uploadAccept = computed(() =>
  form.scanMode === 'SUPPLEMENT'
    ? '.png,.jpg,.jpeg,.tif,.tiff'
    : '.pdf,.png,.jpg,.jpeg,.tif,.tiff',
)

const deviceOptions = computed(() =>
  props.devices
    .filter((device) => device.status === 'ACTIVE')
    .map((device) => ({
      value: `${device.scannerDeviceId}::${device.scannerStationId}`,
      label: `${device.deviceName || device.scannerDeviceId} · ${device.scannerStationId}`,
    })),
)

const boundPaperOptions = computed(() =>
  (prepareContext.value?.boundPapers ?? []).map((item) => ({
    value: item.paperInstanceId,
    label: `${item.studentNo} · ${item.studentName} · ${item.scanBatchDisplayName}`,
  })),
)

const prepareBlockDescription = computed(() => {
  const context = prepareContext.value
  if (!context) {
    return ''
  }
  if (context.hasActiveScanSession) {
    const batchLabel = context.activeBatchExternalNo ? `（${context.activeBatchExternalNo}）` : ''
    return `${context.activeScanSessionReason ?? context.blockReason ?? '当前设备存在未结束扫描进程'}${batchLabel}。请先在一体机或扫描监控结束该批次后再提交 Web 补录。`
  }
  return context.blockReason ?? context.supplementBlockReason ?? '当前设备或考试状态不允许提交补录'
})

const submitDisabled = computed(() =>
  declaredClassIds.value.length === 0
  || prepareLoading.value
  || prepareContext.value?.canSubmitManualSupplement === false,
)

const formRules: Record<string, Rule[]> = {
  deviceKey: [{ required: true, message: '请选择扫描设备' }],
  scanMode: [{ required: true, message: '请选择补录模式' }],
  paperInstanceId: [{
    validator: async (_rule, value: string | undefined) => {
      if (form.scanMode !== 'SUPPLEMENT') {
        return
      }
      if (!value) {
        throw new Error('补扫必须选择已绑定试卷')
      }
    },
  }],
  targetPageNo: [{
    validator: async (_rule, value: number | undefined) => {
      if (form.scanMode !== 'SUPPLEMENT') {
        return
      }
      if (value == null || value < 1) {
        throw new Error('补扫必须指定目标页号')
      }
    },
  }],
  supplementReason: [{
    validator: async (_rule, value: string) => {
      if (form.scanMode !== 'SUPPLEMENT') {
        return
      }
      if (!value?.trim()) {
        throw new Error('补扫必须填写原因')
      }
    },
  }],
  file: [{
    validator: async () => {
      if (!form.file) {
        throw new Error('请选择扫描文件')
      }
    },
  }],
}

const uploadFileList = computed<UploadFile[]>(() => {
  if (!form.file) {
    return []
  }
  return [{
    uid: '-1',
    name: form.file.name,
    status: 'done',
  }]
})

function parseDeviceKey(deviceKey: string | undefined): { scannerDeviceId: string, scannerStationId: string } | null {
  if (!deviceKey) {
    return null
  }
  const separatorIndex = deviceKey.indexOf('::')
  if (separatorIndex <= 0) {
    return null
  }
  return {
    scannerDeviceId: deviceKey.slice(0, separatorIndex),
    scannerStationId: deviceKey.slice(separatorIndex + 2),
  }
}

async function loadExamDetail(): Promise<void> {
  if (!props.examId) {
    declaredClassIds.value = []
    return
  }
  try {
    const detail = await getExamDetail(props.examId)
    declaredClassIds.value = (detail.classRefs ?? []).map((item) => item.classId)
  } catch (error) {
    declaredClassIds.value = []
    showUserError(error, '考试详情加载失败')
  }
}

async function loadPrepareContext(): Promise<void> {
  prepareContext.value = null
  const device = parseDeviceKey(form.deviceKey)
  if (!device || !props.examId) {
    return
  }
  prepareLoading.value = true
  try {
    prepareContext.value = await prepareTeacherScanSupplement({
      examId: props.examId,
      scannerDeviceId: device.scannerDeviceId,
      scannerStationId: device.scannerStationId,
      scanMode: form.scanMode,
    })
  } catch (error) {
    prepareContext.value = null
    showUserError(error, '补录预检加载失败')
  } finally {
    prepareLoading.value = false
  }
}

function onBeforeUpload(file: File): boolean {
  form.file = file
  return false
}

function onRemoveUpload(): boolean {
  form.file = null
  return true
}

function goScanDevices(): void {
  if (!props.examId) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScanDevices',
    params: { examId: props.examId },
  })
}

function goScanMonitor(): void {
  if (!props.examId) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScanMonitor',
    params: { examId: props.examId },
  })
}

async function handleSubmit(): Promise<void> {
  if (prepareContext.value?.canSubmitManualSupplement === false) {
    message.warning(prepareBlockDescription.value || '当前不可提交补录')
    return
  }
  await formRef.value?.validate()
  const device = parseDeviceKey(form.deviceKey)
  if (!device || !form.file || !props.examId) {
    return
  }
  if (declaredClassIds.value.length === 0) {
    message.warning('考试班级范围为空，请先在考生名册维护')
    return
  }
  submitting.value = true
  try {
    const node = await uploadFile(form.file, { businessType: 'exam-scan-source' })
    if (!node?.id) {
      message.error('扫描文件上传后未完成登记，请重新上传')
      return
    }
    const response = await teacherSupplementScanSource({
      examId: props.examId,
      scannerDeviceId: device.scannerDeviceId,
      scannerStationId: device.scannerStationId,
      declaredClassIds: declaredClassIds.value,
      scanMode: form.scanMode,
      targetPageNo: form.scanMode === 'SUPPLEMENT' ? form.targetPageNo : undefined,
      supplementReason: form.scanMode === 'SUPPLEMENT' ? form.supplementReason.trim() : undefined,
      replaceTargetPage: form.replaceTargetPage,
      scanConfig: DEFAULT_SCAN_CONFIG,
      sourceFileId: String(node.id),
      startTemplatePageNo: form.scanMode === 'DIRECT' ? form.startTemplatePageNo ?? undefined : undefined,
      paperInstanceId: form.scanMode === 'SUPPLEMENT' ? form.paperInstanceId : undefined,
    })
    message.success(`人工补录成功，已登记 ${response.registeredPageCount} 页`)
    form.file = null
    if (form.scanMode === 'SUPPLEMENT') {
      form.paperInstanceId = undefined
    }
    emit('success')
    await loadPrepareContext()
  } catch (error) {
    showUserError(error, '人工补录失败')
  } finally {
    submitting.value = false
  }
}

watch(() => form.scanMode, (mode) => {
  if (mode === 'SUPPLEMENT' && form.file?.name.toLowerCase().endsWith('.pdf')) {
    form.file = null
  }
  form.paperInstanceId = undefined
})

watch([() => form.deviceKey, () => form.scanMode, () => props.examId], () => {
  form.paperInstanceId = undefined
  void loadPrepareContext()
})

watch(() => props.examId, () => {
  void loadExamDetail()
}, { immediate: true })
</script>

<style lang="scss" scoped>
.scan-manual-supplement {
  &__hint,
  &__block {
    margin-bottom: 12px;
  }

  &__warn {
    margin-top: 8px;
  }
}

.muted {
  color: var(--ant-color-text-tertiary);
  font-size: 13px;
}
</style>
