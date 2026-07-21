<script setup lang="ts">
import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import { forceReleaseScanDispatch } from '@/apis/mark/scanner-dispatch'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  ticket?: ScanDispatchTicketVO | null
  /** MVR-317：父层已按 canForceReleaseTicket 过滤；handler 二次拦截 */
  canForceRelease?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "released": []
}>()

const submitting = ref(false)
const form = reactive({
  releaseReason: '',
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.releaseReason = ''
    }
  },
)

async function handleSubmit() {
  // MVR-317：与 BE/父层 canForceReleaseTicket 二次拦截
  if (props.canForceRelease !== true) {
    showFormValidationMessage('当前账号无权强制解锁该派单')
    return
  }
  if (submitting.value) {
    return
  }
  const reason = form.releaseReason.trim()
  if (!reason) {
    showFormValidationMessage('请填写强制解锁原因')
    return
  }
  const ticketId = props.ticket?.ticketId
  if (!ticketId) {
    showFormValidationMessage('缺少派单编号，请重新选择派单后再解锁')
    return
  }
  submitting.value = true
  try {
    await forceReleaseScanDispatch({
      ticketId,
      releaseReason: reason,
    })
    void message.success('派单已强制解锁')
    emit('released')
    emit('update:open', false)
  } catch (error) {
    showUserError(error, '强制解锁派单失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiDrawer
    :open="open"
    title="强制解锁派单"
    :width="520"
    :confirm-loading="submitting"
    ok-text="确认解锁"
    :hide-footer="false"
    @update:open="emit('update:open', $event)"
    @close="emit('update:open', false)"
    @confirm="handleSubmit"
  >
    <p v-if="ticket?.archiveSnapshot?.archiveTitle" class="scan-dispatch-force-release__hint">
      卷：{{ ticket.archiveSnapshot.archiveTitle }}
    </p>
    <p class="scan-dispatch-force-release__warn">
      将释放设备锁并把派单退回待处理；若已绑定进行中扫描工单，将同步废弃该工单并清除未提交页，操作写入审计日志。
    </p>
    <UiForm layout="vertical">
      <UiFormItem label="解锁原因" required>
        <UiTextarea
          size="sm"
          v-model="form.releaseReason"
          :rows="3"
          placeholder="说明强制解锁原因"
        />
      </UiFormItem>
    </UiForm>
  </UiDrawer>
</template>

<style scoped>
.scan-dispatch-force-release__hint {
  margin: 0 0 8px;
  color: var(--dp-text-secondary);
}
.scan-dispatch-force-release__warn {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-warning);
}
</style>
