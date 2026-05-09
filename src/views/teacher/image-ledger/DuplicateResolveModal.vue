<template>
  <a-modal
    :open="open" title="处置重复" :confirm-loading="submitting" :mask-closable="false"
    width="600px" @update:open="$emit('update:open', $event)" @ok="handleOk"
  >
    <a-form layout="vertical">
      <a-alert
        type="info" show-icon style="margin-bottom: 12px"
        message="处置会保留有效试卷实例并把作废目标置为 VOIDED，原因会落入审计。"
      />
      <a-form-item label="重复类型">
        <a-input :value="resolution?.duplicateType ?? '-'" disabled />
      </a-form-item>
      <a-form-item label="候选组">
        <a-input :value="resolution?.duplicateGroupId ?? ''" disabled />
      </a-form-item>
      <a-form-item label="重复证据">
        <a-textarea :value="resolution?.evidencePayload || ''" :rows="3" disabled />
      </a-form-item>
      <a-form-item label="保留试卷实例 ID">
        <a-input v-model:value="form.selectedPaperInstanceId" placeholder="可选" />
      </a-form-item>
      <a-form-item label="作废目标 IDs（逗号分隔）">
        <a-textarea v-model:value="voidedRaw" :rows="2" placeholder="如 1001,1002" />
      </a-form-item>
      <a-form-item label="处置原因" required>
        <a-textarea v-model:value="form.resolutionReason" :rows="3" :max-length="200" show-count />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type { ExamPaperDuplicateResolutionVO } from '@/apis/mark/image-ledger'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import { resolveDuplicate } from '@/apis/mark/image-ledger'

defineOptions({ name: 'DuplicateResolveModal' })

const props = defineProps<{
  open: boolean
  examId: string
  resolution: ExamPaperDuplicateResolutionVO | null
}>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void
}>()

const submitting = ref(false)
const voidedRaw = ref('')
const form = reactive<{ selectedPaperInstanceId: string, resolutionReason: string }>({
  selectedPaperInstanceId: '',
  resolutionReason: '',
})

watch(() => props.open, (v) => {
  if (v) {
    form.selectedPaperInstanceId = ''
    form.resolutionReason = ''
    voidedRaw.value = ''
  }
})

function parseVoided(): string[] {
  return voidedRaw.value
    .split(/[,，\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

async function handleOk(): Promise<void> {
  const reason = form.resolutionReason.trim()
  if (!reason) {
    message.warning('请填写处置原因')
    return
  }
  if (!props.examId || !props.resolution?.id) {
    message.warning('考试或重复记录信息缺失')
    return
  }
  const voided = parseVoided()
  submitting.value = true
  try {
    await resolveDuplicate({
      examId: props.examId,
      resolutionId: props.resolution.id,
      selectedPaperInstanceId: form.selectedPaperInstanceId.trim() || undefined,
      voidedTargetIds: voided.length > 0 ? voided : undefined,
      resolutionReason: reason,
    })
    message.success('重复处置已提交')
    emit('update:open', false)
    emit('submitted')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '处置提交失败')
  } finally {
    submitting.value = false
  }
}
</script>
