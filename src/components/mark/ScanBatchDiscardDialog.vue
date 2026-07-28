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
    <UiForm layout="vertical" class="scan-batch-discard-dialog__form">
      <UiFormItem
        label="废弃原因"
        required
        :validate-status="reasonError ? 'error' : undefined"
        :help="reasonError"
      >
        <UiTextarea
          size="sm"
          v-model="reason"
          placeholder="请输入废弃原因（必填，1-255 字）"
          :maxlength="255"
          :show-count="true"
          :rows="4"
        />
      </UiFormItem>
    </UiForm>
  </UiConfirmModal>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import { showFormValidationMessage } from '@/utils/error-handler'

defineOptions({ name: 'ScanBatchDiscardDialog' })

const props = withDefaults(
  defineProps<{
  open: boolean
  confirmLoading?: boolean
  /** MVR-376：与 BE canManageOwnerBatchActions / requireExamOwnerPermission 同源 */
  canManageOwnerBatchActions?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
}>(),
  {
  canManageOwnerBatchActions: false,
  confirmLoading: false,
  },
)

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
  if (props.confirmLoading === true) return
  emit('update:open', false)
  emit('cancel')
}

function handleOk(): void {
  // MVR-376：弹窗二次闸，禁止仅靠父层隐藏入口
  if (props.canManageOwnerBatchActions !== true) {
    showFormValidationMessage('当前账号无主考扫描写权限，无法废弃批次')
    return
  }
  if (props.confirmLoading === true) return
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
  margin-top: var(--dp-space-component-xs);
}
</style>
