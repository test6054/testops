<script setup lang="ts">
import { message } from 'ant-design-vue'
import AQrcode from 'ant-design-vue/es/qrcode'
import { computed, ref, watch } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  appendUrlQueryParam,
  buildScanDispatchKioskUrl,
  cancelScanDispatch,
  pageScanDispatchTickets,
  ScanDispatchTicketStatusCode,
  ScanDispatchTicketStatusDescription,
} from '@/apis/mark/scanner-dispatch'
import { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { showUserError } from '@/utils/error-handler'

export interface ScanDispatchResultPayload {
  ticketId: string
  kioskUrl: string
  traceLabelFileId?: string
  traceLabelCode?: string
  status?: ScanDispatchTicketStatusCode
  taskKind?: ScanTaskKindCode
  contextLabel?: string
  gapTaskId?: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    payload: ScanDispatchResultPayload | null
    volumeId?: string
    taskKind?: ScanTaskKindCode
  }>(),
  {
    taskKind: ScanTaskKindCode.EXAM_ARCHIVE,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  "cancelled": []
}>()

const cancelling = ref(false)
const downloading = ref(false)
const pendingTickets = ref<ScanDispatchResultPayload[]>([])
let pendingTicketsLoadGeneration = 0

const previewUrl = computed(() =>
  props.payload?.kioskUrl ? appendUrlQueryParam(props.payload.kioskUrl, 'mode', 'preview') : '',
)
const canCancel = computed(() => props.payload?.status === ScanDispatchTicketStatusCode.PENDING)
const isPortfolioDispatch = computed(
  () => (props.payload?.taskKind ?? props.taskKind) === ScanTaskKindCode.PORTFOLIO_COLLECT,
)
const drawerTitle = computed(() => (isPortfolioDispatch.value ? '档案袋派单已创建' : '派单已创建'))
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
    if (open) {
      void loadPendingTickets()
    }
  },
)

async function loadPendingTickets() {
  const generation = ++pendingTicketsLoadGeneration
  try {
    const page = await pageScanDispatchTickets({
      pageNum: 1,
      pageSize: 10,
      volumeId: props.taskKind === ScanTaskKindCode.EXAM_ARCHIVE ? props.volumeId : undefined,
      taskKind: props.taskKind,
      statusList: [
        ScanDispatchTicketStatusCode.PENDING,
        ScanDispatchTicketStatusCode.PROCESSING,
        ScanDispatchTicketStatusCode.SUSPENDED,
      ],
    })
    if (generation !== pendingTicketsLoadGeneration) {
      return
    }
    const items = page.list
    pendingTickets.value = items
      .filter((item) => item.ticketId)
      .filter((item) => {
        if (props.taskKind !== ScanTaskKindCode.PORTFOLIO_COLLECT) {
          return true
        }
        const gapTaskId = props.payload?.gapTaskId
        if (!gapTaskId) {
          return true
        }
        return item.portfolioSnapshot?.gapTaskId === gapTaskId
      })
      .map((item) => ({
        ticketId: item.ticketId!,
        kioskUrl: buildScanDispatchKioskUrl({
          ticketId: item.ticketId!,
          kioskDispatchUrl: item.kioskDispatchUrl,
        }),
        traceLabelFileId: item.traceLabelFileId,
        traceLabelCode: item.traceLabelCode,
        status: item.status,
        taskKind: item.taskKind,
        contextLabel:
          item.portfolioSnapshot?.gapTaskTitle
          ?? item.portfolioSnapshot?.categoryName
          ?? item.archiveSnapshot?.archiveTitle,
        gapTaskId: item.portfolioSnapshot?.gapTaskId,
      }))
  } catch (error) {
    if (generation !== pendingTicketsLoadGeneration) {
      return
    }
    pendingTickets.value = []
    showUserError(error, '进行中派单列表加载失败')
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
  <UiDrawer
    :open="open"
    :title="drawerTitle"
    :width="560"
    hide-footer
    @update:open="emit('update:open', $event)"
    @close="emit('update:open', false)"
  >
    <div v-if="payload" class="scan-dispatch-result">
      <p class="scan-dispatch-result__hint">
        {{
          isPortfolioDispatch
            ? '请将分机 URL 或二维码推送到档案袋采集工位。'
            : '请将分机 URL 或二维码推送到工位一体机。'
        }}
      </p>
      <p v-if="payload.contextLabel" class="scan-dispatch-result__context">
        {{ isPortfolioDispatch ? '采集任务' : '归档任务' }}：{{ payload.contextLabel }}
      </p>
      <div v-if="payload.status" class="scan-dispatch-result__status">
        <UiTag tone="blue" size="sm">
          {{
            ScanDispatchTicketStatusDescription[payload.status]
          }}
        </UiTag>
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
        <UiButton size="sm" variant="primary" @click="copyText(payload.kioskUrl)">
          复制分机 URL
        </UiButton>
        <UiButton v-if="previewUrl" size="sm" variant="outline" @click="copyText(previewUrl)">
          复制预览链接
        </UiButton>
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
      <section v-if="otherPendingTickets.length > 0" class="scan-dispatch-result__pending">
        <h3>{{ isPortfolioDispatch ? '同任务其他进行中派单' : '本卷其他进行中派单' }}</h3>
        <ul>
          <li v-for="item in otherPendingTickets" :key="item.ticketId">
            <span>{{ item.contextLabel || item.traceLabelCode || item.ticketId }}</span>
            <UiTag v-if="item.status" tone="gray" size="sm">
              {{ ScanDispatchTicketStatusDescription[item.status] }}
            </UiTag>
          </li>
        </ul>
      </section>
    </div>
  </UiDrawer>
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
.scan-dispatch-result__context {
  margin: 0;
  font-size: 14px;
  color: var(--nybc-text-primary, #262626);
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
