<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ScannerColorModeCode, ScannerDuplexModeCode } from '@/apis/mark/exam-mark-scanner'
import { LocalScanJobStatusCode, ScannerBusinessSceneCode } from '@/apis/mark/scanner-agent-local'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { ArchiveScanBatchModeDescription } from '@/types/enums/archive-scan-batch-mode-enum'
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
import { useArchiveScanSession } from './useArchiveScanSession'

const router = useRouter()
const session = useArchiveScanSession()
const bootstrap = useDocumentKioskBootstrap()
const lease = useLeaseHeartbeat()
const scanFlow = useWorkOrderScanFlow({
  taskKind: ScanTaskKindCode.EXAM_ARCHIVE,
  businessScene: ScannerBusinessSceneCode.EXAM_ARCHIVE,
  getBusinessRefId: () => session.volumeId.value,
  getArchiveBatchMode: () => session.batchMode.value,
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
    session.volumeId.value
    && session.materialType.value
    && bootstrap.selectedScannerId.value
    && session.archiveContext.value != null
    && session.archiveContext.value.canRegisterMaterial === true
    && !lease.leaseLost.value,
  ),
)
const leaseLostMessage = '派单租约已失效，扫描会话可能已被中断，请返回队列'
const scanActionsDisabled = computed(() => {
  if (!lease.leaseLost.value) return false
  return !(scanFlow.canRetryWorkOrderCommit.value || scanFlow.canDiscard.value)
})
const batchModeLabel = computed(() =>
  strictEnumLabel(ArchiveScanBatchModeDescription, session.batchMode.value, '归档扫描批次模式'),
)
const completedNavigated = ref(false)
const jobMessage = computed(() => scanFlow.currentJob.value?.message ?? '')
const physicalStorageLocation = computed(
  () => session.dispatchSnapshot.value?.physicalStorageLocation ?? '',
)
const traceLabelCode = computed(() => session.dispatchTraceLabelCode.value)
const archiveWorkOrderBlockedMessage = computed(() => {
  const status = session.lifecycle.value?.status
  if (status === ScanWorkOrderStatusCode.FAILED) {
    return session.lifecycle.value?.diagnostic || '归档提交失败，可重试提交或废弃后重新开单'
  }
  if (status === ScanWorkOrderStatusCode.COMMITTING) {
    return session.lifecycle.value?.diagnostic || '归档提交处理中，请稍候；长时间未结束可重试提交'
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
    params.set('tab', 'materials')
    void router.replace(`${path}?${params.toString()}`)
    return
  }
  if (session.dispatchTicketId.value) {
    returnToDispatchQueue(true)
  }
}

onMounted(async () => {
  if (!session.volumeId.value) {
    void router.replace('/scanner-kiosk')
    return
  }
  await bootstrap.initBootstrap()
  if (bootstrap.activation.isActivatedForMarkApis()) {
    await session.loadContext()
    await scanFlow.recoverLocalScanJob()
    await scanFlow.resumeWorkOrderPollingIfNeeded()
  }
})

watch(
  () => bootstrap.activation.isActivatedForMarkApis(),
  async (activated) => {
    if (activated) {
      await session.loadContext()
      await scanFlow.recoverLocalScanJob()
      await scanFlow.resumeWorkOrderPollingIfNeeded()
    }
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
    message.info('已放弃，派单已释放')
    returnToDispatchQueue(false)
  },
)

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
  <div class="archive-scan-session">
    <DocumentKioskActivationGate
      :can-activate="bootstrap.canActivateAgent.value && !lease.leaseLost.value"
      :submit-loading="bootstrap.loading.value"
      @submit="bootstrap.activateAgent"
    />
    <header class="archive-scan-session__head">
      <h1 class="archive-scan-session__title">归档卷一体机扫描</h1>
      <UiButton size="sm" variant="ghost" @click="goBack">返回</UiButton>
    </header>

    <section v-if="session.archiveContext.value" class="archive-scan-session__summary">
      <p>卷号：{{ session.archiveContext.value.archiveNo }}</p>
      <p>卷名：{{ session.archiveContext.value.archiveTitle }}</p>
      <p v-if="physicalStorageLocation">柜位：{{ physicalStorageLocation }}</p>
      <p v-if="traceLabelCode">追溯码：{{ traceLabelCode }}</p>
      <p>目录编码：{{ session.catalogCode.value || '卷级收材' }}</p>
      <p>材料类型：{{ session.materialTypeLabel.value }}</p>
      <p>批次模式：{{ batchModeLabel }}</p>
      <p v-if="scanFlow.isWorkOrderSettling.value" class="archive-scan-session__block">
        {{ scanFlow.successMessage.value || '扫描页已上传，正在登记材料…' }}
      </p>
      <p v-else-if="archiveWorkOrderBlockedMessage" class="archive-scan-session__block">
        {{ archiveWorkOrderBlockedMessage }}
      </p>
    </section>

    <section v-if="bootstrap.scanners.value.length" class="archive-scan-session__scanner">
      <label>
        扫描仪
        <select
          v-model="bootstrap.selectedScannerId.value"
          class="archive-scan-session__select"
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

    <section class="archive-scan-session__actions">
      <UiButton v-if="scanActionsDisabled" variant="primary" @click="returnToDispatchQueue(false)">
        返回派单队列
      </UiButton>
      <UiButton
        v-if="
          !scanFlow.currentJob.value
            && !scanFlow.canRetryWorkOrderCommit.value
            && !scanActionsDisabled
        "
        variant="primary"
        :loading="session.loading.value || scanFlow.loading.value"
        :disabled="!canStart || bootstrap.needsActivationGate.value"
        @click="handleStart"
      >
        开单并开始扫描
      </UiButton>
      <template
        v-if="
          !scanActionsDisabled
            && !scanFlow.currentJob.value
            && scanFlow.canRetryWorkOrderCommit.value
        "
      >
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

    <p v-if="scanFlow.lifecycle.value?.batchExternalNo" class="archive-scan-session__hint">
      工单 {{ scanFlow.lifecycle.value.batchExternalNo }}； 状态
      {{ scanFlow.currentJob.value?.status ?? '等待扫描服务' }}； 已扫
      {{ scanFlow.currentJob.value?.scannedPages ?? 0 }} 页
      <span v-if="jobMessage"> — {{ jobMessage }}</span>
    </p>
    <p v-if="lease.leaseLost.value" class="archive-scan-session__error">{{ leaseLostMessage }}</p>
    <p v-if="scanFlow.errorMessage.value" class="archive-scan-session__error">
      {{ scanFlow.errorMessage.value }}
    </p>
    <p v-if="scanFlow.successMessage.value" class="archive-scan-session__success">
      {{ scanFlow.successMessage.value }}
    </p>
  </div>
</template>

<style scoped>
.archive-scan-session {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.archive-scan-session__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.archive-scan-session__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.archive-scan-session__summary,
.archive-scan-session__scanner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: 6px;
  font-size: 14px;
}

.archive-scan-session__block {
  margin: 0;
  color: var(--kiosk-danger);
  font-size: 13px;
}

.archive-scan-session__select {
  margin-top: 4px;
  padding: 6px 8px;
  width: 100%;
}

.archive-scan-session__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.archive-scan-session__hint {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-muted);
}

.archive-scan-session__error {
  margin: 0;
  color: var(--kiosk-danger);
  font-size: 13px;
}

.archive-scan-session__success {
  margin: 0;
  color: var(--kiosk-success);
  font-size: 13px;
}
</style>
