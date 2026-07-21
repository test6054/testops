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
    <UiForm layout="vertical">
      <UiRow :gutter="16">
        <UiCol :xs="24" :md="12">
          <UiFormItem label="扫描批次">
            <UiInput size="sm" :value="batchLabel" disabled />
          </UiFormItem>
        </UiCol>
        <UiCol :xs="24" :md="12">
          <UiFormItem label="扫描设备">
            <UiInput size="sm" :value="deviceLabel" disabled />
          </UiFormItem>
        </UiCol>
      </UiRow>
    </UiForm>

    <ManualSupplementFormCore
      ref="formCoreRef"
      mode="supplement"
      :model="form"
      :bound-paper-options="boundPaperOptions"
      :prepare-loading="prepareLoading"
      :prepare-block-description="prepareBlockDescription"
      :class-scope-warning="declaredClassIds.length === 0 ? '请先在考生名册维护考试班级范围' : ''"
    />
  </UiConfirmModal>
</template>

<script lang="ts" setup>
import type { ExamScannerBatchResponse } from '@/apis/mark/exam-scan'
import type { ExamTeacherScanSupplementPrepareResponse } from '@/apis/mark/scan-source'
import { prepareTeacherScanSupplement, teacherSupplementScanSource } from '@/apis/mark/scan-source'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { getExamDetail } from '@/apis/mark/exam'
import ManualSupplementFormCore from '@/components/mark/manual-supplement/ManualSupplementFormCore.vue'
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import { ScannerColorModeCode } from '@/types/enums/scanner-color-mode-enum'
import { ScannerDuplexModeCode } from '@/types/enums/scanner-duplex-mode-enum'
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
  success: []
}>()

const DEFAULT_SCAN_CONFIG: ExamScannerScanConfigVO = {
  dpi: 300,
  colorMode: ScannerColorModeCode.COLOR,
  duplexMode: ScannerDuplexModeCode.SIMPLEX,
  blankPageDetectionEnabled: true,
}

const formCoreRef = ref<InstanceType<typeof ManualSupplementFormCore> | null>(null)
const submitting = ref(false)
const prepareLoading = ref(false)
const prepareContext = ref<ExamTeacherScanSupplementPrepareResponse | null>(null)
const declaredClassIds = ref<string[]>([])

const form = reactive({
  paperInstanceId: undefined as string | undefined,
  targetPageNo: undefined as number | undefined,
  supplementReason: '',
  replaceTargetPage: false,
  sourceFileId: undefined as string | undefined,
  sourceFileName: undefined as string | undefined,
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
  // MVR-321：仅 canSubmitManualSupplement===true 视为可提交；null/false 均展示阻断说明
  if (!context || context.canSubmitManualSupplement === true) {
    return ''
  }
  if (context.hasActiveScanSession) {
    const batchLabelText = context.activeBatchExternalNo
      ? `（${context.activeBatchExternalNo}）`
      : ''
    return `${context.activeScanSessionReason ?? context.blockReason ?? '当前设备存在未结束扫描进程'}${batchLabelText}。请先在一体机或扫描监控结束该批次后再提交网页补扫。`
  }
  return context.blockReason ?? context.supplementBlockReason ?? '当前设备或考试状态不允许提交补扫'
})

const submitDisabled = computed(
  () =>
    declaredClassIds.value.length === 0 ||
    prepareLoading.value ||
    prepareContext.value?.canSubmitManualSupplement !== true,
)

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
    void message.warning(prepareBlockDescription.value || '当前不可提交补扫')
    return
  }
  if (submitting.value) {
    return
  }
  await formCoreRef.value?.validate()
  const batch = props.batch
  if (
    !batch?.scanBatchId ||
    !batch.scannerDeviceId ||
    !batch.scannerStationId ||
    !form.sourceFileId
  ) {
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
    void message.success(`补扫成功，已登记 ${response.registeredPageCount} 页`)
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
