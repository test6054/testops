<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ScannerColorModeCode, ScannerDuplexModeCode } from '@/apis/mark/exam-mark-scanner'
import { LocalScanJobStatusCode, ScannerBusinessSceneCode } from '@/apis/mark/scanner-agent-local'
import { ScanWorkOrderStatusDescription } from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { ScanWorkOrderStatusCode } from '@/types/enums/scan-work-order-status-enum'
import { showFormValidationMessage } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { strictEnumLabel } from '@/utils/strict-enum'
import DocumentKioskActivationGate from '../components/DocumentKioskActivationGate.vue'
import { useDispatchLeaseLostSessionGuard } from '../composables/useDispatchLeaseLostSessionGuard'
import { useDocumentKioskBootstrap } from '../composables/useDocumentKioskBootstrap'
import { useWorkOrderScanFlow } from '../composables/useWorkOrderScanFlow'
import { useLeaseHeartbeat } from '../core/useLeaseHeartbeat'
import { usePortfolioScanSession } from './usePortfolioScanSession'

const router = useRouter()
const session = usePortfolioScanSession()
const bootstrap = useDocumentKioskBootstrap()
const lease = useLeaseHeartbeat()
const scanFlow = useWorkOrderScanFlow({
  taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT,
  businessScene: ScannerBusinessSceneCode.TEACHER_PORTFOLIO,
  getBusinessRefId: () => session.teacherId.value,
  lifecycle: session.lifecycle,
  refreshWorkOrderLifecycle: () => session.loadContext({ silent: true }),
  getScanConfig: () => ({
    dpi: 300,
    colorMode: ScannerColorModeCode.COLOR,
    duplexMode: ScannerDuplexModeCode.SIMPLEX,
    blankPageDetectionEnabled: true,
  }),
  getScannerDeviceId: () => bootstrap.setup.value?.scannerDeviceId ?? '',
  getScannerStationId: () => bootstrap.setup.value?.scannerStationId ?? '',
  getLocalScannerId: () => bootstrap.selectedScannerId.value,
  isScanSessionBlocked: () => lease.leaseLost.value,
})

const canStart = computed(() =>
  Boolean(
    session.collectMode.value
    && session.teacherId.value
    && bootstrap.selectedScannerId.value
    && session.portfolioContext.value != null
    && session.portfolioContext.value.scanAllowed === true
    && !lease.leaseLost.value,
  ),
)
const leaseLostMessage = '派单租约已失效，扫描会话可能已被中断，请返回队列'
const scanActionsDisabled = computed(() => {
  if (!lease.leaseLost.value) return false
  return !(scanFlow.canRetryWorkOrderCommit.value || scanFlow.canDiscard.value)
})
const completedNavigated = ref(false)
const autoResumeAttempted = ref(false)
const jobMessage = computed(() => scanFlow.currentJob.value?.message ?? '')

const lifecycleStatusLabel = computed(() => {
  const status = scanFlow.lifecycle.value?.status
  if (!status) {
    return '—'
  }
  return strictEnumLabel(ScanWorkOrderStatusDescription, status, '扫描工单状态')
})
const portfolioWorkOrderBlockedMessage = computed(() => {
  const status = session.lifecycle.value?.status
  if (status === ScanWorkOrderStatusCode.FAILED) {
    return session.lifecycle.value?.diagnostic || '档案袋提交失败，可重试提交或废弃后重新开单'
  }
  if (status === ScanWorkOrderStatusCode.COMMITTING) {
    return session.lifecycle.value?.diagnostic || '档案袋提交处理中，请稍候；长时间未结束可重试提交'
  }
  return ''
})

function handleLeaseLost() {
  showFormValidationMessage(leaseLostMessage)
}

function returnToDispatchQueue(scanCommitted: boolean) {
  lease.stopHeartbeat()
  void router.replace({
    path: '/scanner-kiosk/queue',
    query: scanCommitted ? { scanCommitted: '1' } : undefined,
  })
}

useDispatchLeaseLostSessionGuard({
  leaseLost: lease.leaseLost,
  lifecycle: session.lifecycle,
  hasDispatchTicket: () => Boolean(session.dispatchTicketId.value),
  refreshWorkOrderLifecycle: () => session.loadContext({ silent: true }),
  suspendActiveScan: scanFlow.suspendActiveScan,
  returnToDispatchQueue: () => returnToDispatchQueue(false),
})

function handleScanCompleted() {
  if (completedNavigated.value) {
    return
  }
  completedNavigated.value = true
  if (session.returnTo.value) {
    lease.stopHeartbeat()
    const [path, search = ''] = session.returnTo.value.split('?')
    const params = new URLSearchParams(search)
    params.set('scanCommitted', '1')
    const fileNodeId = scanFlow.lifecycle.value?.committedFileNodeId
    if (fileNodeId) {
      params.set('scanFileNodeId', fileNodeId)
    }
    const materialId = scanFlow.lifecycle.value?.committedMaterialId
    if (materialId) {
      params.set('scanMaterialId', materialId)
    }
    const qualityAiTaskId = scanFlow.lifecycle.value?.committedQualityAiTaskId
    if (qualityAiTaskId) {
      params.set('scanQualityAiTaskId', qualityAiTaskId)
    }
    void router.replace(`${path}?${params.toString()}`)
    return
  }
  if (session.dispatchTicketId.value) {
    returnToDispatchQueue(true)
  }
}

onMounted(async () => {
  if (!session.dispatchTicketId.value) {
    void router.replace('/scanner-kiosk')
    return
  }
  if (!session.collectMode.value || !session.teacherId.value) {
    void router.replace('/scanner-kiosk')
    return
  }
  await bootstrap.initBootstrap()
  if (bootstrap.activation.isActivatedForMarkApis()) {
    void session.loadContext().then(async () => {
      await tryAutoResumeScan()
      await scanFlow.resumeWorkOrderPollingIfNeeded()
    })
  }
})

watch(
  () => bootstrap.activation.isActivatedForMarkApis(),
  (activated) => {
    if (activated) {
      void session.loadContext().then(async () => {
        await tryAutoResumeScan()
        await scanFlow.resumeWorkOrderPollingIfNeeded()
      })
    }
  },
)

watch(
  () => ({
    scanAllowed: session.portfolioContext.value?.scanAllowed,
    selectedScannerId: bootstrap.selectedScannerId.value,
    status: session.lifecycle.value?.status,
  }),
  () => {
    void tryAutoResumeScan()
  },
)

watch(
  () => ({
    deviceId: bootstrap.setup.value?.scannerDeviceId,
    stationId: bootstrap.setup.value?.scannerStationId,
    ticketId: session.dispatchTicketId.value,
  }),
  (leaseState) => {
    if (leaseState.ticketId && leaseState.deviceId && leaseState.stationId) {
      lease.startHeartbeat(leaseState.ticketId, leaseState.deviceId, leaseState.stationId, {
        onLeaseLost: handleLeaseLost,
      })
      return
    }
    lease.stopHeartbeat()
  },
  { immediate: true },
)

onUnmounted(() => {
  lease.stopHeartbeat()
})

watch(
  () => scanFlow.isWorkOrderCommitted.value,
  (committed) => {
    if (committed) {
      handleScanCompleted()
    }
  },
)

watch(
  () => scanFlow.lifecycle.value?.status,
  (status) => {
    if (status === ScanWorkOrderStatusCode.FAILED) {
      lease.releaseLease()
    }
    if (status !== ScanWorkOrderStatusCode.DISCARDED || !session.dispatchTicketId.value) {
      return
    }
    void message.info('已放弃，派单已释放')
    returnToDispatchQueue(false)
  },
)

async function tryAutoResumeScan() {
  if (autoResumeAttempted.value || lease.leaseLost.value) {
    return
  }
  if (session.lifecycle.value?.status !== ScanWorkOrderStatusCode.IN_PROGRESS) {
    return
  }
  if (scanFlow.currentJob.value) {
    return
  }
  if (!bootstrap.selectedScannerId.value) {
    return
  }
  if (session.portfolioContext.value?.scanAllowed !== true) {
    return
  }
  autoResumeAttempted.value = true
  try {
    const workOrder = await session.startSession()
    if (workOrder?.batchExternalNo && workOrder.reportId && workOrder.resolvedScanConfig) {
      await scanFlow.startLocalScanAfterWorkOrder(workOrder)
    }
  } catch {
    autoResumeAttempted.value = false
  }
}

async function handleStart() {
  if (lease.leaseLost.value) {
    showFormValidationMessage(leaseLostMessage)
    return
  }
  const workOrder = await session.startSession()
  if (workOrder) {
    await scanFlow.startLocalScanAfterWorkOrder(workOrder)
  }
}

function goBack() {
  if (session.dispatchTicketId.value) {
    returnToDispatchQueue(false)
    return
  }
  if (session.returnTo.value) {
    void router.replace(session.returnTo.value)
    return
  }
  void router.back()
}
</script>

<template>
  <div class="portfolio-scan-session">
    <DocumentKioskActivationGate
      :can-activate="bootstrap.canActivateAgent.value && !lease.leaseLost.value"
      :submit-loading="bootstrap.loading.value"
      @submit="bootstrap.activateAgent"
    />
    <header class="portfolio-scan-session__head">
      <h1 class="portfolio-scan-session__title">档案袋一体机扫描</h1>
      <UiButton variant="ghost" @click="goBack">返回</UiButton>
    </header>

    <p v-if="lease.leaseLost.value" class="portfolio-scan-session__error">{{ leaseLostMessage }}</p>

    <section v-if="session.portfolioContext.value" class="portfolio-scan-session__summary">
      <p>采集模式：{{ session.collectModeLabel.value }}</p>
      <p>
        教师：{{
          session.portfolioContext.value.teacherName
            || session.portfolioContext.value.teacherId
            || '—'
        }}
      </p>
      <p v-if="session.portfolioContext.value.categoryName">
        分类：{{ session.portfolioContext.value.categoryName }}
      </p>
      <p v-if="session.portfolioContext.value.gapTaskTitle">
        补采任务：{{ session.portfolioContext.value.gapTaskTitle }}
      </p>
      <p v-if="session.portfolioContext.value.blockReason" class="portfolio-scan-session__block">
        {{ session.portfolioContext.value.blockReason }}
      </p>
      <p v-if="scanFlow.isWorkOrderSettling.value" class="portfolio-scan-session__block">
        {{ scanFlow.successMessage.value || '扫描页已上传，正在登记材料…' }}
      </p>
      <p v-else-if="portfolioWorkOrderBlockedMessage" class="portfolio-scan-session__block">
        {{ portfolioWorkOrderBlockedMessage }}
      </p>
    </section>

    <section v-if="bootstrap.scanners.value.length" class="portfolio-scan-session__scanner">
      <label>
        扫描仪
        <select
          v-model="bootstrap.selectedScannerId.value"
          class="portfolio-scan-session__select"
          :disabled="lease.leaseLost.value"
        >
          <option
            v-for="scanner in bootstrap.scanners.value"
            :key="scanner.localScannerId"
            :value="scanner.localScannerId"
          >
            {{ scanner.displayName }}
          </option>
        </select>
      </label>
    </section>

    <section class="portfolio-scan-session__actions">
      <UiButton
        v-if="scanActionsDisabled"
        variant="primary"
        @click="returnToDispatchQueue(false)"
      >
        返回派单队列
      </UiButton>
      <UiButton
        v-if="!scanFlow.currentJob.value && !scanFlow.canRetryWorkOrderCommit.value && !scanActionsDisabled"
        variant="primary"
        :loading="session.loading.value || scanFlow.loading.value"
        :disabled="!canStart || bootstrap.needsActivationGate.value"
        @click="handleStart"
      >
        开单并开始扫描
      </UiButton>
      <template v-if="!scanActionsDisabled && !scanFlow.currentJob.value && scanFlow.canRetryWorkOrderCommit.value">
        <UiButton
          variant="outline"
          :loading="scanFlow.loading.value"
          @click="scanFlow.retryWorkOrderCommit()"
        >
          重试提交工单
        </UiButton>
        <UiButton
          v-if="scanFlow.canDiscard.value"
          variant="destructive"
          :loading="scanFlow.loading.value"
          @click="scanFlow.discardCurrentSession()"
        >
          废弃
        </UiButton>
      </template>
      <template v-else-if="!scanActionsDisabled && scanFlow.currentJob.value">
        <UiButton
          v-if="scanFlow.canEndBatch.value"
          variant="primary"
          :loading="scanFlow.loading.value"
          @click="scanFlow.endCurrentBatch()"
        >
          结束本批次
        </UiButton>
        <UiButton
          v-if="scanFlow.isScanning.value"
          variant="outline"
          @click="scanFlow.pauseCurrentJob()"
        >
          暂停
        </UiButton>
        <UiButton
          v-if="scanFlow.currentJob.value?.status === LocalScanJobStatusCode.PAUSED"
          variant="outline"
          @click="scanFlow.resumeCurrentJob()"
        >
          继续
        </UiButton>
        <UiButton
          v-if="scanFlow.canRetryUpload.value"
          variant="outline"
          @click="scanFlow.retryCurrentUpload()"
        >
          重试上传
        </UiButton>
        <UiButton
          v-if="scanFlow.canRetryCommit.value"
          variant="outline"
          @click="scanFlow.retryCurrentCommit()"
        >
          重试提交
        </UiButton>
        <UiButton
          v-if="scanFlow.canDiscard.value"
          variant="destructive"
          :loading="scanFlow.loading.value"
          @click="scanFlow.discardCurrentSession()"
        >
          废弃
        </UiButton>
      </template>
    </section>

    <p v-if="scanFlow.lifecycle.value?.batchExternalNo" class="portfolio-scan-session__hint">
      工单 {{ scanFlow.lifecycle.value.batchExternalNo }}； 状态 {{ lifecycleStatusLabel }}；
      {{ scanFlow.currentJob.value?.status ?? '等待扫描服务' }}； 已扫
      {{ scanFlow.currentJob.value?.scannedPages ?? 0 }} 页
      <span v-if="scanFlow.lifecycle.value.diagnostic">
        — {{ scanFlow.lifecycle.value.diagnostic }}</span>
      <span v-else-if="jobMessage"> — {{ jobMessage }}</span>
    </p>
    <p v-if="scanFlow.errorMessage.value" class="portfolio-scan-session__error">
      {{ scanFlow.errorMessage.value }}
    </p>
  </div>
</template>

<style scoped>
.portfolio-scan-session {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--dp-space-4, 16px) var(--dp-space-3, 12px);
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
}

.portfolio-scan-session__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.portfolio-scan-session__title {
  margin: 0;
  font-size: 20px;
}

.portfolio-scan-session__summary,
.portfolio-scan-session__scanner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.portfolio-scan-session__select {
  margin-top: 4px;
  padding: 6px 8px;
  width: 100%;
}

.portfolio-scan-session__block {
  color: var(--kiosk-danger);
}

.portfolio-scan-session__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.portfolio-scan-session__hint {
  font-size: 13px;
  color: var(--kiosk-ink-secondary);
}

.portfolio-scan-session__error {
  color: var(--kiosk-danger);
  font-size: 13px;
}
</style>
