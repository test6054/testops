<script setup lang="ts">
import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import { message } from 'ant-design-vue'
import { reactive, ref, watch } from 'vue'
import { forceReleaseScanDispatch } from '@/apis/mark/scanner-dispatch'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  ticket?: ScanDispatchTicketVO | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  released: []
}>()

const submitting = ref(false)
const form = reactive({
  releaseReason: '',
})

watch(
  () => props.open,
  open => {
    if (open) {
      form.releaseReason = ''
    }
  },
)

async function handleSubmit() {
  const reason = form.releaseReason.trim()
  if (!reason) {
    message.warning('请填写强制解锁原因')
    return
  }
  const ticketId = props.ticket?.ticketId
  if (!ticketId) {
    message.error('缺少派单 ticketId')
    return
  }
  submitting.value = true
  try {
    await forceReleaseScanDispatch({
      ticketId,
      releaseReason: reason,
    })
    message.success('派单已强制解锁')
    emit('released')
    emit('update:open', false)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <a-modal
    :open="open"
    title="强制解锁派单"
    width="520"
    :confirm-loading="submitting"
    ok-text="确认解锁"
    cancel-text="取消"
    @update:open="emit('update:open', $event)"
    @ok="handleSubmit"
  >
    <p v-if="ticket?.archiveSnapshot?.archiveTitle" class="scan-dispatch-force-release__hint">
      卷：{{ ticket.archiveSnapshot.archiveTitle }}
    </p>
    <p class="scan-dispatch-force-release__warn">
      将释放设备锁并把派单退回待处理，操作写入审计日志。
    </p>
    <a-form layout="vertical">
      <a-form-item label="解锁原因" required>
        <a-textarea v-model:value="form.releaseReason" :rows="3" placeholder="说明强制解锁原因" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped>
.scan-dispatch-force-release__hint {
  margin: 0 0 8px;
  color: var(--nybc-text-secondary, #595959);
}
.scan-dispatch-force-release__warn {
  margin: 0 0 12px;
  font-size: 13px;
  color: #d48806;
}
</style>
