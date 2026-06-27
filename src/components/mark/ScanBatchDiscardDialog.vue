<template>
  <UiConfirmModal
    :open="open"
    type="error"
    title="废弃扫描批次"
    ok-text="废弃"
    cancel-text="取消"
    :width="480"
    :confirm-loading="confirmLoading"
    @update:open="emit('update:open', $event)"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="scan-batch-discard-dialog__form">
      <a-form-item
        label="废弃原因"
        required
        :validate-status="reasonError ? 'error' : undefined"
        :help="reasonError"
      >
        <a-textarea
          v-model:value="reason"
          placeholder="请输入废弃原因（必填，1-255 字）"
          :maxlength="255"
          show-count
          :rows="4"
        />
      </a-form-item>
    </a-form>
  </UiConfirmModal>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'

defineOptions({ name: 'ScanBatchDiscardDialog' })

const props = defineProps<{
  open: boolean
  confirmLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', reason: string): void
  (e: 'cancel'): void
}>()

const reason = ref('')
const reasonError = ref('')

watch(
  () => props.open,
  (next) => {
    if (!next) {
      reason.value = ''
      reasonError.value = ''
    }
  },
)

function handleCancel(): void {
  if (props.confirmLoading) return
  emit('update:open', false)
  emit('cancel')
}

function handleOk(): void {
  if (props.confirmLoading) return
  const trimmed = reason.value.trim()
  if (!trimmed) {
    reasonError.value = '废弃原因不能为空'
    return
  }
  if (trimmed.length > 255) {
    reasonError.value = '废弃原因长度不能超过 255 字'
    return
  }
  reasonError.value = ''
  emit('confirm', trimmed)
}
</script>

<style scoped lang="scss">
.scan-batch-discard-dialog__form {
  margin-top: 4px;
}
</style>
