<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import DocumentKioskActivationGate from '../components/DocumentKioskActivationGate.vue'
import { useDocumentKioskBootstrap } from '../composables/useDocumentKioskBootstrap'
import { useWorkOrderScanFlow } from '../composables/useWorkOrderScanFlow'
import { useLeaseHeartbeat } from '../core/useLeaseHeartbeat'
import { useArchiveScanSession } from './useArchiveScanSession'

const router = useRouter()
const session = useArchiveScanSession()
const bootstrap = useDocumentKioskBootstrap()
const lease = useLeaseHeartbeat()
const scanFlow = useWorkOrderScanFlow({
  taskKind: 'EXAM_ARCHIVE',
  businessScene: 'EXAM_ARCHIVE',
  getBusinessRefId: () => session.volumeId.value,
  getArchiveBatchMode: () => session.batchMode.value,
  getScanConfig: () => ({
    dpi: 300,
    colorMode: 'COLOR',
    duplexMode: 'SIMPLEX',
    blankPageDetectionEnabled: true,
  }),
  getScannerDeviceId: () => bootstrap.setup.value?.scannerDeviceId ?? '',
  getScannerStationId: () => bootstrap.setup.value?.scannerStationId ?? '',
  getLocalScannerId: () => bootstrap.selectedScannerId.value,
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
const jobMessage = computed(() => scanFlow.currentJob.value?.message ?? '')
const physicalStorageLocation = computed(
  () => session.dispatchSnapshot.value?.physicalStorageLocation ?? '',
)
const traceLabelCode = computed(() => session.dispatchTraceLabelCode.value)

function handleLeaseLost() {
  message.warning(leaseLostMessage)
}

function returnToDispatchQueue(scanCommitted: boolean) {
  lease.stopHeartbeat()
  void router.replace({
    path: '/scanner-kiosk/queue',
    query: scanCommitted ? { scanCommitted: '1' } : undefined,
  })
}

onMounted(async () => {
  if (!session.volumeId.value) {
    void router.replace('/scanner-kiosk')
    return
  }
  await bootstrap.initBootstrap()
  if (bootstrap.activation.isActivatedForMarkApis()) {
    void session.loadContext()
  }
})

watch(
  () => bootstrap.activation.isActivatedForMarkApis(),
  (activated) => {
    if (activated) {
      void session.loadContext()
    }
  },
)

watch(
  () =>
    [
      session.dispatchTicketId.value,
      bootstrap.setup.value?.scannerDeviceId,
      bootstrap.setup.value?.scannerStationId,
    ] as const,
  ([ticketId, deviceId, stationId]) => {
    if (ticketId && deviceId && stationId) {
      lease.startHeartbeat(ticketId, deviceId, stationId, { onLeaseLost: handleLeaseLost })
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
  () => scanFlow.isReported.value,
  (reported) => {
    if (!reported) {
      return
    }
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
  },
)

watch(
  () => scanFlow.lifecycle.value?.status,
  (status) => {
    if (status !== 'DISCARDED' || !session.dispatchTicketId.value) {
      return
    }
    message.info('已放弃，派单已释放')
    returnToDispatchQueue(false)
  },
)

async function handleStart() {
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
      :can-activate="bootstrap.canActivateAgent.value"
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
      <p>批次模式：{{ session.batchMode.value === 'PER_PAGE' ? '逐页登记' : '合并 PDF' }}</p>
    </section>

    <section v-if="bootstrap.scanners.value.length" class="archive-scan-session__scanner">
      <label>
        扫描仪
        <select v-model="bootstrap.selectedScannerId.value" class="archive-scan-session__select">
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
      <UiButton
        v-if="!scanFlow.currentJob.value"
        variant="primary"
        :loading="session.loading.value || scanFlow.loading.value"
        :disabled="!canStart || bootstrap.needsActivationGate.value"
        @click="handleStart"
      >
        开单并开始扫描
      </UiButton>
      <template v-else>
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
          v-if="scanFlow.currentJob.value?.status === 'PAUSED'"
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
      {{ scanFlow.currentJob.value?.status ?? '等待 Agent' }}； 已扫
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
  border: 1px solid var(--dp-border-subtle, #e5e7eb);
  border-radius: 6px;
  font-size: 14px;
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
  color: var(--dp-text-muted, #6b7280);
}

.archive-scan-session__error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
}

.archive-scan-session__success {
  margin: 0;
  color: #059669;
  font-size: 13px;
}
</style>
