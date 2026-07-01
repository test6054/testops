<script setup lang="ts">
import type { ScanDispatchTicketStatusCode } from '@/apis/mark/scanner-dispatch'
import {
  cancelScanDispatch,
  pageScanDispatchTickets,
  SCAN_DISPATCH_TICKET_STATUS_LABEL,
} from '@/apis/mark/scanner-dispatch'
import { message } from 'ant-design-vue'
import AQrcode from 'ant-design-vue/es/qrcode'
import { computed, ref, watch } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

export interface ScanDispatchResultPayload {
  ticketId: string
  kioskUrl: string
  traceLabelFileId?: string
  traceLabelCode?: string
  status?: ScanDispatchTicketStatusCode
}

const props = defineProps<{
  open: boolean
  volumeId: string
  payload: ScanDispatchResultPayload | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  cancelled: []
}>()

const cancelling = ref(false)
const downloading = ref(false)
const pendingTickets = ref<ScanDispatchResultPayload[]>([])

const previewUrl = computed(() =>
  props.payload?.kioskUrl ? `${props.payload.kioskUrl}?mode=preview` : '',
)
const canCancel = computed(() => props.payload?.status === 'PENDING')
const otherPendingTickets = computed(() => {
  const currentTicketId = props.payload?.ticketId
  if (!currentTicketId) {
    return pendingTickets.value
  }
  return pendingTickets.value.filter((item) => item.ticketId !== currentTicketId)
})

watch(
  () => props.open,
  (open) => {
    if (open && props.volumeId) {
      void loadPendingTickets()
    }
  },
)

async function loadPendingTickets() {
  try {
    const page = await pageScanDispatchTickets({
      pageNum: 1,
      pageSize: 10,
      volumeId: props.volumeId,
      taskKind: 'EXAM_ARCHIVE',
      statusList: ['PENDING', 'PROCESSING', 'SUSPENDED'],
    })
    const items = readPageList(page, '派单列表加载失败')
    pendingTickets.value = items
      .filter((item) => item.ticketId)
      .map((item) => ({
        ticketId: item.ticketId!,
        kioskUrl: item.kioskDispatchUrl
          ? `${window.location.origin}${item.kioskDispatchUrl}`
          : `${window.location.origin}/scanner-kiosk/dispatch/${item.ticketId}`,
        traceLabelFileId: item.traceLabelFileId,
        traceLabelCode: item.traceLabelCode,
        status: item.status,
      }))
  } catch {
    pendingTickets.value = []
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制')
  } catch {
    message.error('复制失败，请手动选择复制')
  }
}

async function downloadTraceLabel() {
  const fileId = props.payload?.traceLabelFileId
  if (!fileId) {
    return
  }
  downloading.value = true
  try {
    await downloadFile({ nodeId: fileId })
  } catch (error) {
    showUserError(error, '追溯标签下载失败')
  } finally {
    downloading.value = false
  }
}

async function handleCancel() {
  if (!props.payload?.ticketId) {
    return
  }
  cancelling.value = true
  try {
    await cancelScanDispatch({ ticketId: props.payload.ticketId })
    message.success('派单已取消')
    emit('cancelled')
    emit('update:open', false)
  } catch (error) {
    showUserError(error)
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <a-modal
    :open="open"
    title="派单已创建"
    width="560"
    :footer="null"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <div v-if="payload" class="scan-dispatch-result">
      <p class="scan-dispatch-result__hint">请将分机 URL 或二维码推送到工位一体机。</p>
      <div v-if="payload.status" class="scan-dispatch-result__status">
        <UiTag tone="blue" size="sm">{{ SCAN_DISPATCH_TICKET_STATUS_LABEL[payload.status] }}</UiTag>
        <span v-if="payload.traceLabelCode">追溯码 {{ payload.traceLabelCode }}</span>
      </div>
      <AQrcode
        v-if="payload.kioskUrl"
        :value="payload.kioskUrl"
        :size="200"
        error-level="M"
        class="scan-dispatch-result__qr"
      />
      <p class="scan-dispatch-result__url">{{ payload.kioskUrl }}</p>
      <p v-if="previewUrl" class="scan-dispatch-result__preview">预览链接：{{ previewUrl }}</p>
      <div class="scan-dispatch-result__actions">
        <UiButton size="sm" variant="primary" @click="copyText(payload.kioskUrl)"
          >复制分机 URL</UiButton
        >
        <UiButton v-if="previewUrl" size="sm" variant="outline" @click="copyText(previewUrl)"
          >复制预览链接</UiButton
        >
        <UiButton
          v-if="payload.traceLabelFileId"
          size="sm"
          variant="outline"
          :loading="downloading"
          @click="downloadTraceLabel"
        >
          下载追溯标签
        </UiButton>
        <UiButton
          v-if="canCancel"
          size="sm"
          variant="destructive"
          :loading="cancelling"
          @click="handleCancel"
        >
          取消派单
        </UiButton>
      </div>
      <section v-if="pendingTickets.length > 1" class="scan-dispatch-result__pending">
        <h3>本卷其他进行中派单</h3>
        <ul>
          <li v-for="item in otherPendingTickets" :key="item.ticketId">
            <span>{{ item.traceLabelCode || item.ticketId }}</span>
            <UiTag v-if="item.status" tone="gray" size="sm">
              {{ SCAN_DISPATCH_TICKET_STATUS_LABEL[item.status] }}
            </UiTag>
          </li>
        </ul>
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.scan-dispatch-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scan-dispatch-result__hint {
  margin: 0;
  font-size: 14px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.scan-dispatch-result__status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.scan-dispatch-result__qr {
  align-self: center;
}
.scan-dispatch-result__url,
.scan-dispatch-result__preview {
  margin: 0;
  font-size: 13px;
  word-break: break-all;
}
.scan-dispatch-result__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.scan-dispatch-result__pending h3 {
  margin: 0 0 8px;
  font-size: 14px;
}
.scan-dispatch-result__pending ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scan-dispatch-result__pending li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}
</style>
