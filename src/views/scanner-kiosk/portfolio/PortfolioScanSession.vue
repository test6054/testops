<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { SCAN_WORK_ORDER_STATUS_LABEL } from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { strictEnumLabel } from '@/utils/strict-enum'
import DocumentKioskActivationGate from '../components/DocumentKioskActivationGate.vue'
import { useDocumentKioskBootstrap } from '../composables/useDocumentKioskBootstrap'
import { useWorkOrderScanFlow } from '../composables/useWorkOrderScanFlow'
import { usePortfolioScanSession } from './usePortfolioScanSession'

const router = useRouter()
const session = usePortfolioScanSession()
const bootstrap = useDocumentKioskBootstrap()
const scanFlow = useWorkOrderScanFlow({
  taskKind: 'PORTFOLIO_COLLECT',
  businessScene: 'TEACHER_PORTFOLIO',
  getBusinessRefId: () => session.teacherId.value,
  lifecycle: session.lifecycle,
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
    session.collectMode.value
    && session.teacherId.value
    && bootstrap.selectedScannerId.value
    && session.portfolioContext.value != null
    && session.portfolioContext.value.scanAllowed === true,
  ),
)
const jobMessage = computed(() => scanFlow.currentJob.value?.message ?? '')

const lifecycleStatusLabel = computed(() => {
  const status = scanFlow.lifecycle.value?.status
  if (!status) {
    return '—'
  }
  return strictEnumLabel(SCAN_WORK_ORDER_STATUS_LABEL, status, '扫描工单状态')
})

onMounted(async () => {
  if (!session.collectMode.value || !session.teacherId.value) {
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
  activated => {
    if (activated) {
      void session.loadContext()
    }
  },
)

watch(
  () => scanFlow.isReported.value,
  reported => {
    if (!reported || !session.returnTo.value) return
    const [path, search = ''] = session.returnTo.value.split('?')
    const params = new URLSearchParams(search)
    params.set('scanCommitted', '1')
    const fileNodeId = scanFlow.lifecycle.value?.committedFileNodeId
    if (fileNodeId) {
      params.set('scanFileNodeId', fileNodeId)
    }
    void router.replace(`${path}?${params.toString()}`)
  },
)

async function handleStart() {
  const workOrder = await session.startSession()
  if (workOrder) {
    await scanFlow.startLocalScanAfterWorkOrder(workOrder)
  }
}

function goBack() {
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
      :can-activate="bootstrap.canActivateAgent.value"
      :submit-loading="bootstrap.loading.value"
      @submit="bootstrap.activateAgent"
    />
    <header class="portfolio-scan-session__head">
      <h1 class="portfolio-scan-session__title">档案袋一体机扫描</h1>
      <UiButton size="sm" variant="ghost" @click="goBack">返回</UiButton>
    </header>

    <section v-if="session.portfolioContext.value" class="portfolio-scan-session__summary">
      <p>采集模式：{{ session.collectModeLabel.value }}</p>
      <p>教师 ID：{{ session.teacherId.value }}</p>
      <p v-if="session.portfolioContext.value.categoryName">
        分类：{{ session.portfolioContext.value.categoryName }}
      </p>
      <p v-if="session.portfolioContext.value.gapTaskTitle">
        补采任务：{{ session.portfolioContext.value.gapTaskTitle }}
      </p>
      <p v-if="session.portfolioContext.value.blockReason" class="portfolio-scan-session__block">
        {{ session.portfolioContext.value.blockReason }}
      </p>
    </section>

    <section v-if="bootstrap.scanners.value.length" class="portfolio-scan-session__scanner">
      <label>
        扫描仪
        <select v-model="bootstrap.selectedScannerId.value" class="portfolio-scan-session__select">
          <option v-for="scanner in bootstrap.scanners.value" :key="scanner.localScannerId" :value="scanner.localScannerId">
            {{ scanner.displayName }}
          </option>
        </select>
      </label>
    </section>

    <section class="portfolio-scan-session__actions">
      <UiButton
        v-if="!scanFlow.currentJob.value && !scanFlow.canRetryWorkOrderCommit.value"
        variant="primary"
        :loading="session.loading.value || scanFlow.loading.value"
        :disabled="!canStart || bootstrap.needsActivationGate.value"
        @click="handleStart"
      >
        开单并开始扫描
      </UiButton>
      <template v-if="!scanFlow.currentJob.value && scanFlow.canRetryWorkOrderCommit.value">
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
      <template v-else-if="scanFlow.currentJob.value">
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

    <p v-if="scanFlow.lifecycle.value?.batchExternalNo" class="portfolio-scan-session__hint">
      工单 {{ scanFlow.lifecycle.value.batchExternalNo }}；
      状态 {{ lifecycleStatusLabel }}；
      {{ scanFlow.currentJob.value?.status ?? '等待 Agent' }}；
      已扫 {{ scanFlow.currentJob.value?.scannedPages ?? 0 }} 页
      <span v-if="scanFlow.lifecycle.value.diagnostic"> — {{ scanFlow.lifecycle.value.diagnostic }}</span>
      <span v-else-if="jobMessage"> — {{ jobMessage }}</span>
    </p>
    <p v-if="scanFlow.errorMessage.value" class="portfolio-scan-session__error">{{ scanFlow.errorMessage.value }}</p>
  </div>
</template>

<style scoped>
.portfolio-scan-session {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  color: var(--nybc-color-danger, #cf1322);
}

.portfolio-scan-session__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.portfolio-scan-session__hint {
  font-size: 13px;
  color: var(--nybc-color-text-secondary, #666);
}

.portfolio-scan-session__error {
  color: #dc2626;
  font-size: 13px;
}
</style>
