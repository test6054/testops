<script setup lang="ts">
import type { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ScanDispatchTicketStatusDescription } from '@/apis/mark/scanner-dispatch'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { PortfolioCollectModeDescription } from '@/types/enums/portfolio-collect-mode-enum'
import { ScanDispatchTicketStatusCode } from '@/types/enums/scan-dispatch-ticket-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'
import CognitiveConfirmModal from './components/CognitiveConfirmModal.vue'
import DocumentKioskActivationGate from './components/DocumentKioskActivationGate.vue'
import { useDispatchSession } from './core/useDispatchSession'

function portfolioCollectModeLabel(value: PortfolioCollectModeCode | undefined): string {
  if (!value) {
    throw new Error(`档案袋采集模式缺少展示映射：${String(value)}`)
  }
  return strictEnumLabel(PortfolioCollectModeDescription, value, '档案袋采集模式')
}

function ticketStatusLabel(status: string): string {
  return strictEnumLabel(
    ScanDispatchTicketStatusDescription,
    status as keyof typeof ScanDispatchTicketStatusDescription,
    '派单票据状态',
  )
}

const router = useRouter()
const session = useDispatchSession()

const ticketStatus = computed(() => session.ticket.value?.status)
const isTerminalStatus = computed(
  () =>
    ticketStatus.value === ScanDispatchTicketStatusCode.DONE
    || ticketStatus.value === ScanDispatchTicketStatusCode.EXPIRED
    || ticketStatus.value === ScanDispatchTicketStatusCode.CANCELLED,
)
const terminalHint = computed(() => {
  if (ticketStatus.value === ScanDispatchTicketStatusCode.DONE) {
    return '本派单已完成，无需再次扫描。'
  }
  if (ticketStatus.value === ScanDispatchTicketStatusCode.EXPIRED) {
    return '派单已过期，请返回队列处理其他任务。'
  }
  if (ticketStatus.value === ScanDispatchTicketStatusCode.CANCELLED) {
    return '派单已取消，请返回队列。'
  }
  return ''
})
const canContinueScan = computed(
  () =>
    ticketStatus.value === ScanDispatchTicketStatusCode.PROCESSING
    && Boolean(session.ticket.value?.workOrderId),
)
const isFailedPending = computed(
  () =>
    ticketStatus.value === ScanDispatchTicketStatusCode.PENDING
    && Boolean(session.ticket.value?.failureReason?.trim()),
)
const failedPendingReason = computed(() => session.ticket.value?.failureReason?.trim() ?? '')
const leaseBlocked = computed(() => session.lease.leaseLost.value)

onMounted(async () => {
  await session.bootstrap.initBootstrap()
  if (session.bootstrap.activation.isActivatedForMarkApis()) {
    await session.loadTicket()
    if (session.ticket.value?.status === ScanDispatchTicketStatusCode.PROCESSING) {
      session.startProcessingHeartbeat()
    }
  }
})

watch(
  () => session.bootstrap.activation.isActivatedForMarkApis(),
  (activated) => {
    if (activated) {
      void session.loadTicket()
    }
  },
)

watch(
  () => session.ticketId.value,
  (nextId, previousId) => {
    if (!nextId || nextId === previousId) {
      return
    }
    if (!session.bootstrap.activation.isActivatedForMarkApis()) {
      return
    }
    void session.loadTicket()
  },
)

function goQueue() {
  void router.push('/scanner-kiosk/queue')
}

function goHub() {
  void router.push('/scanner-kiosk')
}
</script>

<template>
  <div class="dispatch-landing">
    <DocumentKioskActivationGate
      :can-activate="session.bootstrap.canActivateAgent.value"
      :submit-loading="session.bootstrap.loading.value"
      @submit="session.bootstrap.activateAgent"
    />
    <header class="dispatch-landing__head">
      <div>
        <h1>派单任务</h1>
        <UiTag v-if="ticketStatus" tone="blue" size="sm">
          {{ ticketStatusLabel(ticketStatus) }}
        </UiTag>
      </div>
      <div class="dispatch-landing__head-actions">
        <UiButton variant="ghost" @click="goHub">回扫描台首页</UiButton>
        <UiButton variant="ghost" @click="goQueue">返回队列</UiButton>
      </div>
    </header>
    <p v-if="session.errorMessage.value" class="dispatch-landing__error">
      {{ session.errorMessage.value }}
    </p>
    <p v-if="session.lease.leaseLost.value" class="dispatch-landing__error">
      派单租约已失效，请返回队列重新领取。
    </p>
    <UiSkeletonState v-if="session.loading.value" :rows="5" compact />
    <section v-else-if="session.ticket.value?.portfolioSnapshot" class="dispatch-landing__panel">
      <h2>
        教师档案袋 ·
        {{ portfolioCollectModeLabel(session.ticket.value.portfolioSnapshot.collectMode) }}
      </h2>
      <p v-if="session.ticket.value.portfolioSnapshot.teacherName">
        教师 {{ session.ticket.value.portfolioSnapshot.teacherName }}
      </p>
      <p v-else-if="session.ticket.value.portfolioSnapshot.teacherId">
        教师编号 {{ session.ticket.value.portfolioSnapshot.teacherId }}
      </p>
      <p v-if="session.ticket.value.portfolioSnapshot.gapTaskTitle">
        补采任务 {{ session.ticket.value.portfolioSnapshot.gapTaskTitle }}
      </p>
      <p v-if="session.ticket.value.portfolioSnapshot.categoryName">
        分类 {{ session.ticket.value.portfolioSnapshot.categoryName }}
      </p>
      <p v-if="session.ticket.value.traceLabelCode">
        追溯码 {{ session.ticket.value.traceLabelCode }}
      </p>
      <p v-if="session.isPreviewMode">预览模式 · 不占设备锁</p>
      <p v-else-if="isFailedPending" class="dispatch-landing__hint dispatch-landing__hint--danger">
        提交失败：{{ failedPendingReason }}。请在本工位重试；其他工位不可领取。
      </p>
      <p v-else-if="isTerminalStatus" class="dispatch-landing__hint">{{ terminalHint }}</p>
      <div v-if="isTerminalStatus" class="dispatch-landing__actions">
        <UiButton variant="primary" @click="goQueue">返回队列</UiButton>
        <UiButton variant="outline" @click="goHub">回扫描台首页</UiButton>
      </div>
      <div
        v-else-if="ticketStatus === ScanDispatchTicketStatusCode.SUSPENDED"
        class="dispatch-landing__actions"
      >
        <UiButton variant="primary" @click="goQueue">返回队列</UiButton>
        <UiButton
          variant="primary"
          :disabled="session.actionLoading.value || leaseBlocked"
          @click="session.resumeTicket()"
        >
          恢复任务
        </UiButton>
      </div>
      <div v-else-if="!session.isPreviewMode" class="dispatch-landing__actions">
        <UiButton
          variant="primary"
          v-if="ticketStatus === ScanDispatchTicketStatusCode.PENDING"
          :disabled="session.actionLoading.value || leaseBlocked || !session.canClaimTicket.value"
          @click="session.claimTicket()"
        >
          {{ isFailedPending ? '重试任务' : '领取任务' }}
        </UiButton>
        <UiButton
          v-if="canContinueScan"
          variant="primary"
          :disabled="session.actionLoading.value || leaseBlocked"
          @click="session.continueScanSession()"
        >
          继续扫描
        </UiButton>
        <UiButton
          v-if="ticketStatus === ScanDispatchTicketStatusCode.PROCESSING"
          variant="outline"
          :disabled="session.actionLoading.value || leaseBlocked"
          @click="session.suspendTicket()"
        >
          挂起
        </UiButton>
        <UiButton
          v-if="ticketStatus === ScanDispatchTicketStatusCode.PROCESSING && !canContinueScan"
          variant="primary"
          :disabled="session.actionLoading.value || leaseBlocked || !session.canConfirmFeed.value"
          @click="session.cognitive.requestConfirm(session.ticket.value!)"
        >
          认知确认
        </UiButton>
      </div>
    </section>
    <section v-else-if="session.ticket.value?.archiveSnapshot" class="dispatch-landing__panel">
      <h2>{{ session.ticket.value.archiveSnapshot.archiveTitle }}</h2>
      <p>柜位 {{ session.ticket.value.archiveSnapshot.physicalStorageLocation }}</p>
      <p v-if="session.ticket.value.traceLabelCode">
        追溯码 {{ session.ticket.value.traceLabelCode }}
      </p>
      <p v-if="session.isPreviewMode">预览模式 · 不占设备锁</p>
      <p v-else-if="isFailedPending" class="dispatch-landing__hint dispatch-landing__hint--danger">
        提交失败：{{ failedPendingReason }}。请在本工位重试；其他工位不可领取。
      </p>
      <p v-else-if="isTerminalStatus" class="dispatch-landing__hint">{{ terminalHint }}</p>
      <div v-if="isTerminalStatus" class="dispatch-landing__actions">
        <UiButton variant="primary" @click="goQueue">返回队列</UiButton>
        <UiButton variant="outline" @click="goHub">回扫描台首页</UiButton>
      </div>
      <div
        v-else-if="ticketStatus === ScanDispatchTicketStatusCode.SUSPENDED"
        class="dispatch-landing__actions"
      >
        <UiButton variant="primary" @click="goQueue">返回队列</UiButton>
        <UiButton
          variant="primary"
          :disabled="session.actionLoading.value || leaseBlocked"
          @click="session.resumeTicket()"
        >
          恢复任务
        </UiButton>
      </div>
      <div v-else-if="!session.isPreviewMode" class="dispatch-landing__actions">
        <UiButton
          variant="primary"
          v-if="ticketStatus === ScanDispatchTicketStatusCode.PENDING"
          :disabled="session.actionLoading.value || leaseBlocked || !session.canClaimTicket.value"
          @click="session.claimTicket()"
        >
          {{ isFailedPending ? '重试任务' : '领取任务' }}
        </UiButton>
        <UiButton
          v-if="canContinueScan"
          variant="primary"
          :disabled="session.actionLoading.value || leaseBlocked"
          @click="session.continueScanSession()"
        >
          继续扫描
        </UiButton>
        <UiButton
          v-if="ticketStatus === ScanDispatchTicketStatusCode.PROCESSING"
          variant="outline"
          :disabled="session.actionLoading.value || leaseBlocked"
          @click="session.suspendTicket()"
        >
          挂起
        </UiButton>
        <UiButton
          v-if="ticketStatus === ScanDispatchTicketStatusCode.PROCESSING && !canContinueScan"
          variant="primary"
          :disabled="session.actionLoading.value || leaseBlocked || !session.canConfirmFeed.value"
          @click="session.cognitive.requestConfirm(session.ticket.value!)"
        >
          认知确认
        </UiButton>
      </div>
    </section>
    <CognitiveConfirmModal
      v-model:open="session.cognitive.confirmOpen.value"
      :ticket="session.cognitive.pendingTicket.value"
      :loading="session.actionLoading.value"
      @confirm="session.confirmOpen()"
      @cancel="session.cognitive.clearConfirm()"
    />
  </div>
</template>

<style scoped>
.dispatch-landing {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--dp-space-block) var(--dp-space-component);
}
.dispatch-landing__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component);
}
.dispatch-landing__head h1 {
  margin: 0 var(--dp-space-component) 0 0;
  display: inline;
  font-size: 22px;
}
.dispatch-landing__head-actions {
  display: flex;
  gap: var(--dp-space-component-tight);
}
.dispatch-landing__error {
  color: var(--kiosk-danger);
}
.dispatch-landing__hint {
  margin: var(--dp-space-component) 0 0;
  color: var(--kiosk-ink-tertiary);
}
.dispatch-landing__hint--danger {
  color: var(--kiosk-danger);
}
.dispatch-landing__panel {
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--dp-radius-panel);
  padding: var(--dp-space-component);
}
.dispatch-landing__panel h2 {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-xl);
}
.dispatch-landing__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-block);
}
</style>
