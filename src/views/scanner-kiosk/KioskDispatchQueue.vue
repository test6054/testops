<script setup lang="ts">
import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import type { DispatchQueueStatusFilterCode } from '@/types/enums/dispatch-queue-status-filter-enum'
import type { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ALL_SCAN_DISPATCH_TICKET_STATUS_CODES,
  ScanDispatchTicketStatusDescription,
} from '@/apis/mark/scanner-dispatch'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import {
  ALL_DISPATCH_QUEUE_STATUS_FILTER_CODES,
  DispatchQueueStatusFilterDescription,
} from '@/types/enums/dispatch-queue-status-filter-enum'
import { PortfolioCollectModeDescription } from '@/types/enums/portfolio-collect-mode-enum'
import {
  ALL_KIOSK_DISPATCH_SCAN_TASK_KIND_CODES,
  KioskDispatchScanTaskKindDescription,
  ScanTaskKindCode,
} from '@/types/enums/scan-task-kind-enum'
import { strictEnumLabel } from '@/utils/strict-enum'
import DocumentKioskActivationGate from './components/DocumentKioskActivationGate.vue'
import { useDocumentKioskBootstrap } from './composables/useDocumentKioskBootstrap'
import { useDispatchQueue } from './core/useDispatchQueue'

function portfolioCollectModeLabel(value: PortfolioCollectModeCode | undefined): string {
  if (!value) {
    return '档案袋派单'
  }
  return strictEnumLabel(PortfolioCollectModeDescription, value, '档案袋采集模式')
}

function ticketStatusLabel(item: { status?: string, failureReason?: string }) {
  if (item.failureReason) {
    return '失败待办'
  }
  const status = ALL_SCAN_DISPATCH_TICKET_STATUS_CODES.find((code) => code === item.status)
  if (!status) {
    return '—'
  }
  return strictEnumLabel(ScanDispatchTicketStatusDescription, status, '派单票据状态')
}

const router = useRouter()
const route = useRoute()
const queue = useDispatchQueue()
const bootstrap = useDocumentKioskBootstrap()

const statusTabs = ALL_DISPATCH_QUEUE_STATUS_FILTER_CODES.map((key) => ({
  key,
  label: strictEnumLabel(DispatchQueueStatusFilterDescription, key, '派单队列状态筛选'),
}))

function resolveTaskKindFilter(value: unknown) {
  return ALL_KIOSK_DISPATCH_SCAN_TASK_KIND_CODES.find((code) => code === value)
}

function resolveStatusFilter(value: unknown): DispatchQueueStatusFilterCode | undefined {
  return ALL_DISPATCH_QUEUE_STATUS_FILTER_CODES.find((code) => code === value)
}

const queueScopeLabel = computed(() => {
  const kind = queue.taskKind.value
  if (kind) {
    return strictEnumLabel(KioskDispatchScanTaskKindDescription, kind, '派单任务类型')
  }
  return '归档卷 / 档案袋'
})

onMounted(async () => {
  await bootstrap.initBootstrap()
  if (bootstrap.setup.value?.scannerDeviceId && bootstrap.setup.value.scannerStationId) {
    queue.setStationFilter(
      bootstrap.setup.value.scannerDeviceId,
      bootstrap.setup.value.scannerStationId,
    )
  }
  const tab = resolveStatusFilter(route.query.tab)
  if (tab) {
    queue.setStatusFilter(tab)
  }
  queue.setTaskKindFilter(resolveTaskKindFilter(route.query.taskKind))
  if (bootstrap.activation.isActivatedForMarkApis()) {
    await queue.loadQueue()
  }
  if (route.query.scanCommitted === '1') {
    void message.success('扫描已提交，可继续处理下一单')
    const nextQuery: Record<string, string> = {}
    const tab = resolveStatusFilter(route.query.tab)
    if (tab) {
      nextQuery.tab = tab
    }
    const taskKind = resolveTaskKindFilter(route.query.taskKind)
    if (taskKind) {
      nextQuery.taskKind = taskKind
    }
    void router.replace({ path: '/scanner-kiosk/queue', query: nextQuery })
  }
})

watch(
  () => bootstrap.activation.isActivatedForMarkApis(),
  (activated) => {
    if (activated) {
      void queue.loadQueue()
    }
  },
)

function openTicket(ticket?: ScanDispatchTicketVO, preview = false) {
  if (!ticket?.ticketId) {
    return
  }
  const path = ticket.kioskDispatchUrl || `/scanner-kiosk/dispatch/${ticket.ticketId}`
  void router.push({
    path,
    query: preview ? { mode: 'preview' } : undefined,
  })
}

function goHub() {
  void router.push('/scanner-kiosk')
}

async function changeStatusFilter(filter: DispatchQueueStatusFilterCode) {
  queue.setStatusFilter(filter)
  const query: Record<string, string> = { tab: filter }
  const taskKind = queue.taskKind.value
  if (taskKind) {
    query.taskKind = taskKind
  }
  void router.replace({ path: '/scanner-kiosk/queue', query })
  await queue.loadQueue()
}

async function changePage(page: number) {
  queue.pageNum.value = page
  await queue.loadQueue()
}
</script>

<template>
  <div class="dispatch-queue">
    <DocumentKioskActivationGate
      :can-activate="bootstrap.canActivateAgent.value"
      :submit-loading="bootstrap.loading.value"
      @submit="bootstrap.activateAgent"
    />
    <header class="dispatch-queue__head">
      <div>
        <h1>待办队列</h1>
        <p>手动选单 · {{ queueScopeLabel }}</p>
      </div>
      <div class="dispatch-queue__head-actions">
        <UiButton variant="ghost" @click="goHub">回扫描台首页</UiButton>
        <UiButton
          variant="outline"
          :disabled="queue.loading.value"
          @click="queue.loadQueue"
        >
          刷新
        </UiButton>
      </div>
    </header>
    <div class="dispatch-queue__tabs">
      <UiButton
        v-for="tab in statusTabs"
        :key="tab.key"
        :variant="queue.statusFilter.value === tab.key ? 'primary' : 'outline'"
        @click="changeStatusFilter(tab.key)"
      >
        {{ tab.label }}
      </UiButton>
    </div>
    <p v-if="queue.errorMessage.value" class="dispatch-queue__error">
      {{ queue.errorMessage.value }}
    </p>
    <UiSkeletonState v-if="queue.loading.value" :rows="6" compact />
    <ul v-else class="dispatch-queue__list">
      <li v-for="item in queue.tickets.value" :key="item.ticketId">
        <button type="button" class="dispatch-queue__item" @click="openTicket(item)">
          <div class="dispatch-queue__item-top">
            <strong v-if="item.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT">
              {{
                item.portfolioSnapshot?.gapTaskTitle
                  || item.portfolioSnapshot?.teacherName
                  || '档案袋派单'
              }}
            </strong>
            <strong v-else>{{ item.archiveSnapshot?.archiveTitle || '归档卷派单' }}</strong>
            <UiTag v-if="item.status || item.failureReason" tone="blue" size="sm">
              {{ ticketStatusLabel(item) }}
            </UiTag>
          </div>
          <p v-if="item.failureReason" class="dispatch-queue__failure">
            {{ item.failureReason }}
          </p>
          <p v-if="item.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT">
            {{ portfolioCollectModeLabel(item.portfolioSnapshot?.collectMode) }}
            <span v-if="item.portfolioSnapshot?.categoryName">
              · {{ item.portfolioSnapshot.categoryName }}</span>
          </p>
          <p v-else>柜位 {{ item.archiveSnapshot?.physicalStorageLocation || '—' }}</p>
          <p class="dispatch-queue__meta">{{ item.traceLabelCode }}</p>
        </button>
      </li>
    </ul>
    <p
      v-if="!queue.loading.value && !queue.errorMessage.value && queue.tickets.value.length === 0"
      class="dispatch-queue__empty"
    >
      暂无待办派单
    </p>
    <div
      v-if="!queue.loading.value && queue.total.value > queue.pageSize.value"
      class="dispatch-queue__pager"
    >
      <UiButton
        variant="outline"
        :disabled="queue.pageNum.value <= 1 || queue.loading.value"
        @click="changePage(queue.pageNum.value - 1)"
      >
        上一页
      </UiButton>
      <span>{{ queue.pageNum.value }} / {{ Math.ceil(queue.total.value / queue.pageSize.value) }}</span>
      <UiButton
        variant="outline"
        :disabled="
          queue.pageNum.value >= Math.ceil(queue.total.value / queue.pageSize.value)
            || queue.loading.value
        "
        @click="changePage(queue.pageNum.value + 1)"
      >
        下一页
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.dispatch-queue {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--dp-space-block) var(--dp-space-component);
}
.dispatch-queue__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component);
}
.dispatch-queue__head h1 {
  margin: 0;
  font-size: 22px;
}
.dispatch-queue__head p {
  margin: var(--dp-space-component-xs) 0 0;
  color: var(--kiosk-ink-tertiary);
}
.dispatch-queue__head-actions {
  display: flex;
  gap: var(--dp-space-component-tight);
}
.dispatch-queue__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
}
.dispatch-queue__error {
  color: var(--kiosk-danger);
  margin-bottom: var(--dp-space-component);
}
.dispatch-queue__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--dp-space-component-tight);
}
.dispatch-queue__item {
  width: 100%;
  text-align: left;
  border: 1px solid var(--kiosk-divider);
  border-radius: 6px;
  padding: var(--dp-space-component) var(--dp-space-block);
  background: var(--kiosk-surface);
  cursor: pointer;
}
.dispatch-queue__item-top {
  display: flex;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
  align-items: center;
}
.dispatch-queue__meta {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-font-size-xs);
  color: var(--kiosk-ink-tertiary);
}
.dispatch-queue__failure {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-font-size-sm);
  color: var(--kiosk-danger);
}
.dispatch-queue__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--dp-space-component);
  margin-top: var(--dp-space-block);
}
.dispatch-queue__empty {
  color: var(--kiosk-ink-tertiary);
}
</style>
