<script lang="ts" setup>
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'
import {
  handlePromptInputCancel,
  handlePromptInputOk,
  usePromptInputDialogState,
} from '@/composables/usePromptInputDialog'

defineOptions({ name: 'GlobalPromptInputDialog' })

const { state } = usePromptInputDialogState()

function mapOkType(type?: 'primary' | 'danger') {
  return type === 'danger' ? 'error' : 'warning'
}
</script>

<template>
  <UiConfirmModal
    :open="state.open"
    :type="state.options.type ?? mapOkType(state.options.okType)"
    :title="state.options.title"
    :ok-text="state.options.okText ?? '确认'"
    :cancel-text="state.options.cancelText ?? '取消'"
    :width="480"
    :confirm-loading="state.loading"
    @update:open="
      (open: boolean) => {
        if (!open) handlePromptInputCancel()
      }
    "
    @ok="handlePromptInputOk"
    @cancel="handlePromptInputCancel"
  >
    <a-form layout="vertical">
      <a-form-item
        :validate-status="state.error ? 'error' : undefined"
        :help="state.error || undefined"
      >
        <a-textarea
          v-model:value="state.value"
          :placeholder="state.options.placeholder || ''"
          :auto-size="{ minRows: state.options.rows ?? 3, maxRows: (state.options.rows ?? 3) + 2 }"
        />
      </a-form-item>
    </a-form>
  </UiConfirmModal>
</template>
