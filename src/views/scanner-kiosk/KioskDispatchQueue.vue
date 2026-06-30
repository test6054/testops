<script setup lang="ts">
import type { DispatchQueueStatusFilter } from './core/useDispatchQueue'
import type { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import { message } from 'ant-design-vue'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SCAN_DISPATCH_TICKET_STATUS_LABEL } from '@/apis/mark/scanner-dispatch'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import DocumentKioskActivationGate from './components/DocumentKioskActivationGate.vue'
import { useDocumentKioskBootstrap } from './composables/useDocumentKioskBootstrap'
import { useDispatchQueue } from './core/useDispatchQueue'

const router = useRouter()
const route = useRoute()
const queue = useDispatchQueue()
const bootstrap = useDocumentKioskBootstrap()

const statusTabs: { key: DispatchQueueStatusFilter, label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '待处理' },
  { key: 'PROCESSING', label: '处理中' },
  { key: 'SUSPENDED', label: '已挂起' },
  { key: 'FAILED', label: '失败' },
]

const TASK_KIND_LABEL: Record<Extract<ScanTaskKindCode, 'EXAM_ARCHIVE' | 'PORTFOLIO_COLLECT'>, string> = {
  EXAM_ARCHIVE: '考后归档',
  PORTFOLIO_COLLECT: '教师档案袋',
}

function resolveTaskKindFilter(value: unknown): ScanTaskKindCode | undefined {
  if (value === 'EXAM_ARCHIVE' || value === 'PORTFOLIO_COLLECT') {
    return value
  }
  return undefined
}

const queueScopeLabel = computed(() => {
  const kind = queue.taskKind.value
  if (kind === 'EXAM_ARCHIVE' || kind === 'PORTFOLIO_COLLECT') {
    return TASK_KIND_LABEL[kind]
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
  const tab = route.query.tab
  if (tab === 'FAILED' || tab === 'SUSPENDED' || tab === 'PROCESSING' || tab === 'PENDING' || tab === 'ALL') {
    queue.setStatusFilter(tab)
  }
  queue.setTaskKindFilter(resolveTaskKindFilter(route.query.taskKind))
  if (bootstrap.activation.isActivatedForMarkApis()) {
    await queue.loadQueue()
  }
  if (route.query.scanCommitted === '1') {
    message.success('扫描已提交，可继续处理下一单')
    void router.replace({ path: '/scanner-kiosk/queue' })
  }
})

watch(
  () => bootstrap.activation.isActivatedForMarkApis(),
  activated => {
    if (activated) {
      void queue.loadQueue()
    }
  },
)

function openTicket(ticketId?: string, preview = false) {
  if (!ticketId) {
    return
  }
  void router.push({
    path: `/scanner-kiosk/dispatch/${ticketId}`,
    query: preview ? { mode: 'preview' } : undefined,
  })
}

function goHub() {
  void router.push('/scanner-kiosk')
}

async function changeStatusFilter(filter: DispatchQueueStatusFilter) {
  queue.setStatusFilter(filter)
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
        <UiButton size="sm" variant="ghost" @click="goHub">回 Hub</UiButton>
        <UiButton size="sm" variant="outline" :disabled="queue.loading.value" @click="queue.loadQueue">
          刷新
        </UiButton>
      </div>
    </header>
    <div class="dispatch-queue__tabs">
      <UiButton
        v-for="tab in statusTabs"
        :key="tab.key"
        size="sm"
        :variant="queue.statusFilter.value === tab.key ? 'primary' : 'outline'"
        @click="changeStatusFilter(tab.key)"
      >
        {{ tab.label }}
      </UiButton>
    </div>
    <p v-if="queue.errorMessage.value" class="dispatch-queue__error">{{ queue.errorMessage.value }}</p>
    <a-skeleton v-if="queue.loading.value" active :paragraph="{ rows: 6 }" />
    <ul v-else class="dispatch-queue__list">
      <li v-for="item in queue.tickets.value" :key="item.ticketId">
        <button type="button" class="dispatch-queue__item" @click="openTicket(item.ticketId)">
          <div class="dispatch-queue__item-top">
            <strong v-if="item.taskKind === 'PORTFOLIO_COLLECT'">
              {{ item.portfolioSnapshot?.gapTaskTitle || item.portfolioSnapshot?.teacherName || '档案袋派单' }}
            </strong>
            <strong v-else>{{ item.archiveSnapshot?.archiveTitle || '归档卷派单' }}</strong>
            <UiTag v-if="item.status" tone="blue" size="sm">
              {{ SCAN_DISPATCH_TICKET_STATUS_LABEL[item.status] }}
            </UiTag>
          </div>
          <p v-if="item.taskKind === 'PORTFOLIO_COLLECT'">
            {{ item.portfolioSnapshot?.collectMode === 'GAP_ATTACHMENT' ? '补采附件' : 'AI 候选提交' }}
            <span v-if="item.portfolioSnapshot?.categoryName"> · {{ item.portfolioSnapshot.categoryName }}</span>
          </p>
          <p v-else>柜位 {{ item.archiveSnapshot?.physicalStorageLocation || '—' }}</p>
          <p class="dispatch-queue__meta">{{ item.traceLabelCode }}</p>
        </button>
      </li>
    </ul>
    <p v-if="!queue.loading.value && queue.tickets.value.length === 0" class="dispatch-queue__empty">
      暂无待办派单
    </p>
  </div>
</template>

<style scoped>
.dispatch-queue {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}
.dispatch-queue__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}
.dispatch-queue__head h1 {
  margin: 0;
  font-size: 22px;
}
.dispatch-queue__head p {
  margin: 4px 0 0;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.dispatch-queue__head-actions {
  display: flex;
  gap: 8px;
}
.dispatch-queue__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.dispatch-queue__error {
  color: #cf1322;
  margin-bottom: 12px;
}
.dispatch-queue__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.dispatch-queue__item {
  width: 100%;
  text-align: left;
  border: 1px solid var(--nybc-border, #e8e8e8);
  border-radius: 6px;
  padding: 12px 16px;
  background: #fff;
  cursor: pointer;
}
.dispatch-queue__item-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.dispatch-queue__meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.dispatch-queue__empty {
  color: var(--nybc-text-secondary, #8c8c8c);
}
</style>
