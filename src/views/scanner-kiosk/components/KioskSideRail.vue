<script setup lang="ts">
/**
 * KioskSideRail - 右侧持久 360px 栏
 *
 * 紧凑卡片：一体机就绪 / 本机能力 / 扫描参数 / 当前考试概览（含本机最近批次）
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, stage, ui } = useKioskCtx()

const showExamOverview = computed(
  () => stage.currentStage.value !== 'setup',
)

const capabilities = computed(() => workflow.kioskContext.value?.capabilities)
const device = computed(() => workflow.kioskContext.value?.device)
const latestBatch = computed(() => workflow.kioskContext.value?.latestBatch)
const activeScanConfig = computed(() => workflow.scanConfig.value)

const boundBatchKpiCount = computed(() => {
  const batchId = workflow.boundPaperScanBatchId.value
  if (!batchId) return '—'
  const batch = workflow.kioskContext.value?.latestBatch
  if (batch && batch.scanBatchId === batchId && batch.boundStudentCount != null) {
    return batch.boundStudentCount
  }
  return workflow.boundPaperSummary.value.studentCount
})

const railDeviceLed = computed(() => {
  if (!workflow.health.value?.bound) return 'danger'
  if (!workflow.health.value?.scannerConnected) return 'warning'
  return 'success'
})

const railAgentText = computed(() => {
  const h = workflow.health.value
  if (!h) return '一体机未连接'
  return `${workflow.agentHealthStatusLabel(h.status)} · ${h.agentVersion}`
})

const railScannerText = computed(() => workflow.selectedScanner.value?.displayName || '未检测到')

const railDeviceStatusText = computed(() => {
  const d = device.value
  if (!d) return '未定位'
  return workflow.endpointOnlineStatusLabel(d.onlineStatus)
})

const railCapabilityDpi = computed(() =>
  capabilities.value?.loaded && capabilities.value.maxScanDpi
    ? String(capabilities.value.maxScanDpi)
    : '未加载',
)
const railCapabilityDuplex = computed(() => {
  if (!capabilities.value?.loaded) return '未加载'
  return capabilities.value.supportsDuplex ? '支持双面' : '仅单面'
})
const railCapabilityName = computed(() =>
  capabilities.value?.scannerDisplayName || '未加载',
)

const railScanDpi = computed(() => String(activeScanConfig.value.dpi ?? '—'))
const railScanColor = computed(() =>
  activeScanConfig.value.colorMode
    ? workflow.scannerColorModeLabel(activeScanConfig.value.colorMode)
    : '—',
)
const railScanDuplex = computed(() =>
  activeScanConfig.value.duplexMode
    ? workflow.scannerDuplexModeLabel(activeScanConfig.value.duplexMode)
    : '—',
)
const railScanBlankPage = computed(() =>
  activeScanConfig.value.blankPageDetectionEnabled ? '启用' : '关闭',
)

const railBatchEmptyText = computed(() => {
  const count = workflow.kioskContext.value?.scanBatchCount ?? 0
  if (count > 0) return `本机已有 ${count} 个批次，刷新后可见`
  return '暂无批次'
})

function handleOpenSettings() {
  ui.openSettings()
}
</script>

<template>
  <aside class="side-rail">
    <article class="rail-card">
      <header class="rail-card-head">
        <h4>一体机就绪</h4>
        <span class="rail-led" :class="`led-${railDeviceLed}`" />
      </header>
      <dl class="rail-kv">
        <div>
          <dt>扫描组件</dt>
          <dd>{{ railAgentText }}</dd>
        </div>
        <div>
          <dt>扫描仪</dt>
          <dd>{{ railScannerText }}</dd>
        </div>
        <div>
          <dt>设备</dt>
          <dd>{{ railDeviceStatusText }}</dd>
        </div>
        <div>
          <dt>待处理</dt>
          <dd>{{ workflow.pendingUploadJobsText.value }}</dd>
        </div>
      </dl>
      <button type="button" class="rail-link" @click="handleOpenSettings">打开设备设置 →</button>
    </article>

    <article class="rail-card">
      <header class="rail-card-head">
        <h4>本机扫描仪能力</h4>
      </header>
      <dl class="rail-kv">
        <div>
          <dt>设备</dt>
          <dd>{{ railCapabilityName }}</dd>
        </div>
        <div>
          <dt>最大 DPI</dt>
          <dd>{{ railCapabilityDpi }}</dd>
        </div>
        <div>
          <dt>双面</dt>
          <dd>{{ railCapabilityDuplex }}</dd>
        </div>
      </dl>
    </article>

    <article class="rail-card">
      <header class="rail-card-head">
        <h4>当前扫描参数</h4>
      </header>
      <dl class="rail-kv">
        <div>
          <dt>DPI</dt>
          <dd>{{ railScanDpi }}</dd>
        </div>
        <div>
          <dt>色彩</dt>
          <dd>{{ railScanColor }}</dd>
        </div>
        <div>
          <dt>单双面</dt>
          <dd>{{ railScanDuplex }}</dd>
        </div>
        <div>
          <dt>空白页检测</dt>
          <dd>{{ railScanBlankPage }}</dd>
        </div>
      </dl>
    </article>

    <article v-if="showExamOverview" class="rail-card rail-card--exam">
      <header class="rail-card-head">
        <h4>当前考试概览</h4>
      </header>
      <ul class="rail-kpi">
        <li>
          <span>已扫页</span><strong>{{ workflow.kioskMetrics.value.scannedPages }}</strong>
        </li>
        <li>
          <span>试卷份数</span><strong>{{ workflow.kioskMetrics.value.paperInstances }}</strong>
        </li>
        <li>
          <span>已绑定</span><strong>{{ boundBatchKpiCount }}</strong>
        </li>
        <li>
          <span>异常</span><strong>{{ workflow.kioskMetrics.value.attentionCount }}</strong>
        </li>
      </ul>

      <div class="rail-batch-block">
        <p class="rail-batch-label">本机最近批次</p>
        <template v-if="latestBatch">
          <p class="rail-batch-title">{{ workflow.latestBatchText.value }}</p>
          <p class="rail-batch-period">{{ workflow.latestBatchPeriodText.value }}</p>
        </template>
        <p v-else class="rail-batch-empty">{{ railBatchEmptyText }}</p>
      </div>

      <button type="button" class="rail-link" @click="stage.gotoStage('history')">
        查看本机历史 →
      </button>
    </article>
  </aside>
</template>

<style scoped>
.side-rail {
  background: var(--kiosk-rail);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  overflow-y: auto;
  height: 100%;
  min-height: 0;
}

.rail-card {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  padding: var(--kiosk-space-4);
}

.rail-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--kiosk-space-3);
}
.rail-card-head h4 {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-secondary);
  letter-spacing: 0.04em;
}

.rail-led {
  width: var(--kiosk-led-size);
  height: var(--kiosk-led-size);
  border-radius: 50%;
  background: var(--kiosk-neutral);
  flex: 0 0 auto;
}
.rail-led.led-success {
  background: var(--kiosk-success);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-success-soft);
}
.rail-led.led-warning {
  background: var(--kiosk-warning);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-warning-soft);
}
.rail-led.led-danger {
  background: var(--kiosk-danger);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-danger-soft);
}

.rail-kv {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  margin: 0;
}
.rail-kv > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--kiosk-space-3);
}
.rail-kv dt {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.rail-kv dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
  text-align: right;
  word-break: break-all;
}

.rail-link {
  margin-top: var(--kiosk-space-3);
  width: 100%;
  height: 36px;
  background: var(--kiosk-primary-soft);
  color: var(--kiosk-primary);
  border: none;
  border-radius: var(--kiosk-radius-sm);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
}
.rail-link:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.rail-kpi {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--kiosk-space-3);
}
.rail-kpi li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rail-kpi span {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.rail-kpi strong {
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}

.rail-card--exam {
  margin-bottom: var(--kiosk-space-2);
}

.rail-batch-block {
  margin-top: var(--kiosk-space-4);
  padding-top: var(--kiosk-space-3);
  border-top: 1px solid var(--kiosk-divider);
}

.rail-batch-label {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.rail-batch-title {
  margin: 0 0 var(--kiosk-space-1);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
  word-break: break-all;
}

.rail-batch-period {
  margin: 0;
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.rail-batch-empty {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
</style>
