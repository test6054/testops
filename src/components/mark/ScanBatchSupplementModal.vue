<template>
  <UiConfirmModal
    :open="open"
    type="info"
    title="指定页补扫"
    ok-text="提交补扫"
    cancel-text="取消"
    :width="640"
    :confirm-loading="submitting"
    @update:open="emit('update:open', $event)"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="扫描批次">
            <a-input :value="batchLabel" disabled />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="扫描设备">
            <a-input :value="deviceLabel" disabled />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="补扫试卷" name="paperInstanceId" required>
            <a-select
              v-model:value="form.paperInstanceId"
              placeholder="选择本设备已绑定试卷"
              :options="boundPaperOptions"
              :loading="prepareLoading"
              :disabled="prepareLoading"
              show-search
              option-filter-prop="label"
              allow-clear
            />
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
              placeholder="说明补扫原因"
              :maxlength="255"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item name="replaceTargetPage">
        <a-checkbox v-model:checked="form.replaceTargetPage">
          替换目标页（勾选后旧页标记为 SUPERSEDED）
        </a-checkbox>
      </a-form-item>

      <a-form-item label="补扫文件（单张图片）" name="sourceFileId" required>
        <UiPlatformFileField
          v-model:file-node-id="form.sourceFileId"
          v-model:file-name="form.sourceFileName"
          :scene-key="FileUploadSceneKey.MARK_EXAM_SCAN_SOURCE"
          accept=".png,.jpg,.jpeg,.tif,.tiff"
          button-text="选择文件"
        />
      </a-form-item>

      <p v-if="prepareBlockDescription" class="scan-batch-supplement-modal__warn muted">
        {{ prepareBlockDescription }}
      </p>
      <p v-if="declaredClassIds.length === 0" class="scan-batch-supplement-modal__warn muted">
        请先在考生名册维护考试班级范围
      </p>
    </a-form>
  </UiConfirmModal>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ExamScannerBatchResponse } from '@/apis/mark/exam-scan'
import type { ExamTeacherScanSupplementPrepareResponse } from '@/apis/mark/scan-source'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { getExamDetail } from '@/apis/mark/exam'
import { ScannerColorModeCode, ScannerDuplexModeCode } from '@/apis/mark/exam-mark-scanner'
import {
  prepareTeacherScanSupplement,
  teacherSupplementScanSource,
} from '@/apis/mark/scan-source'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'
import { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'ScanBatchSupplementModal' })

const props = defineProps<{
  open: boolean
  examId: string
  batch: ExamScannerBatchResponse | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
}>()

const DEFAULT_SCAN_CONFIG: ExamScannerScanConfigVO = {
  dpi: 300,
  colorMode: ScannerColorModeCode.COLOR,
  duplexMode: ScannerDuplexModeCode.SIMPLEX,
  blankPageDetectionEnabled: true,
}

const formRef = ref<FormInstance>()
const submitting = ref(false)
const prepareLoading = ref(false)
const prepareContext = ref<ExamTeacherScanSupplementPrepareResponse | null>(null)
const declaredClassIds = ref<string[]>([])

interface ScanBatchSupplementForm {
  paperInstanceId: string | undefined
  targetPageNo: number | undefined
  supplementReason: string
  replaceTargetPage: boolean
  sourceFileId: string | undefined
  sourceFileName: string | undefined
}

const form = reactive<ScanBatchSupplementForm>({
  paperInstanceId: undefined,
  targetPageNo: undefined,
  supplementReason: '',
  replaceTargetPage: false,
  sourceFileId: undefined,
  sourceFileName: undefined,
})

const batchLabel = computed(() => {
  const batch = props.batch
  if (!batch) {
    return '—'
  }
  return batch.batchExternalNo ? `${batch.batchNo} · ${batch.batchExternalNo}` : batch.batchNo
})

const deviceLabel = computed(() => {
  const batch = props.batch
  if (!batch?.scannerDeviceId) {
    return '—'
  }
  return `${batch.scannerDeviceId} · ${batch.scannerStationId || '—'}`
})

const boundPaperOptions = computed(() =>
  (prepareContext.value?.boundPapers ?? []).map((item) => ({
    value: item.paperInstanceId,
    label: `${item.studentNo} · ${item.studentName} · ${item.scanBatchDisplayName}`,
  })),
)

const prepareBlockDescription = computed(() => {
  const context = prepareContext.value
  if (!context || context.canSubmitManualSupplement) {
    return ''
  }
  if (context.hasActiveScanSession) {
    const batchLabelText = context.activeBatchExternalNo ? `（${context.activeBatchExternalNo}）` : ''
    return `${context.activeScanSessionReason ?? context.blockReason ?? '当前设备存在未结束扫描进程'}${batchLabelText}。请先在一体机或扫描监控结束该批次后再提交 Web 补扫。`
  }
  return context.blockReason ?? context.supplementBlockReason ?? '当前设备或考试状态不允许提交补扫'
})

const submitDisabled = computed(() =>
  declaredClassIds.value.length === 0
  || prepareLoading.value
  || prepareContext.value?.canSubmitManualSupplement === false,
)

const formRules: Record<string, Rule[]> = {
  paperInstanceId: [{ required: true, message: '请选择已绑定试卷' }],
  targetPageNo: [{ required: true, type: 'number', min: 1, message: '请填写补扫目标页号' }],
  supplementReason: [{ required: true, message: '请填写补扫原因' }],
  sourceFileId: [{
    validator: async () => {
      if (!form.sourceFileId) {
        return Promise.reject(new Error('请选择补扫文件'))
      }
    },
  }],
}

function resetForm(): void {
  form.paperInstanceId = undefined
  form.targetPageNo = undefined
  form.supplementReason = ''
  form.replaceTargetPage = false
  form.sourceFileId = undefined
  form.sourceFileName = undefined
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
  const batch = props.batch
  if (!batch?.scanBatchId || !batch.scannerDeviceId || !batch.scannerStationId || !props.examId) {
    return
  }
  prepareLoading.value = true
  try {
    prepareContext.value = await prepareTeacherScanSupplement({
      examId: props.examId,
      scannerDeviceId: batch.scannerDeviceId,
      scannerStationId: batch.scannerStationId,
      scanMode: ScannerKioskScanModeCode.SUPPLEMENT,
      scanBatchId: batch.scanBatchId,
    })
  } catch (error) {
    prepareContext.value = null
    showUserError(error, '补扫预检加载失败')
  } finally {
    prepareLoading.value = false
  }
}

function handleCancel(): void {
  emit('update:open', false)
}

async function handleSubmit(): Promise<void> {
  if (submitDisabled.value) {
    message.warning(prepareBlockDescription.value || '当前不可提交补扫')
    return
  }
  await formRef.value?.validate()
  const batch = props.batch
  if (!batch?.scanBatchId || !batch.scannerDeviceId || !batch.scannerStationId || !form.sourceFileId) {
    return
  }
  submitting.value = true
  try {
    const response = await teacherSupplementScanSource({
      examId: props.examId,
      scannerDeviceId: batch.scannerDeviceId,
      scannerStationId: batch.scannerStationId,
      declaredClassIds: declaredClassIds.value,
      scanMode: ScannerKioskScanModeCode.SUPPLEMENT,
      scanBatchId: batch.scanBatchId,
      targetPageNo: form.targetPageNo,
      supplementReason: form.supplementReason.trim(),
      replaceTargetPage: form.replaceTargetPage,
      scanConfig: DEFAULT_SCAN_CONFIG,
      sourceFileId: form.sourceFileId,
      paperInstanceId: form.paperInstanceId,
    })
    message.success(`补扫成功，已登记 ${response.registeredPageCount} 页`)
    resetForm()
    emit('update:open', false)
    emit('success')
  } catch (error) {
    showUserError(error, '指定页补扫失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => [props.open, props.batch?.scanBatchId, props.examId],
  ([open]) => {
    if (open) {
      resetForm()
      void loadExamDetail()
      void loadPrepareContext()
    }
  },
)
</script>

<style lang="scss" scoped>
.scan-batch-supplement-modal__warn {
  margin-top: 8px;
}

.muted {
  color: var(--ant-color-text-tertiary);
  font-size: 13px;
}
</style>
