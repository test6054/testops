<script setup lang="ts">
/**
 * KioskSideRail - 右侧持久 360px 栏
 *
 * 4 张紧凑卡片：
 *   1. 一体机就绪（Agent / 扫描仪 / 设备 / 待处理 + 设置入口）
 *   2. 服务端扫描策略（DPI / 色彩 / 单双面 / 空白页检测）
 *   3. 当前考试 KPI（已扫页 / 试卷实例 / 已绑定 / 异常）
 *   4. 最近批次（标题 + 时段 + 跳到 finalize）
 *
 * 自取 ctx，无 prop。响应式：≤1280 → 300px；≤1024 → 整列隐藏（在 KioskLayout 处理）。
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, stage, ui } = useKioskCtx()

const policy = computed(() => workflow.kioskContext.value?.policy)
const device = computed(() => workflow.kioskContext.value?.device)
const latestBatch = computed(() => workflow.kioskContext.value?.latestBatch)

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

const railPolicyDpi = computed(() => (policy.value ? String(policy.value.dpi) : '未加载'))
const railPolicyColor = computed(() =>
  policy.value ? workflow.scannerColorModeLabel(policy.value.colorMode) : '未加载',
)
const railPolicyDuplex = computed(() =>
  policy.value ? workflow.scannerDuplexModeLabel(policy.value.duplexMode) : '未加载',
)
const railPolicyBlankPage = computed(() => {
  if (!policy.value) return '未加载'
  return policy.value.blankPageDetectionEnabled ? '启用' : '关闭'
})

function handleOpenSettings() {
  ui.openSettings()
}
</script>

<template>
  <aside class="side-rail">
    <!-- 一体机就绪 -->
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

    <!-- 考试扫描策略 -->
    <article class="rail-card">
      <header class="rail-card-head">
        <h4>考试扫描策略</h4>
      </header>
      <dl class="rail-kv">
        <div>
          <dt>DPI</dt>
          <dd>{{ railPolicyDpi }}</dd>
        </div>
        <div>
          <dt>色彩</dt>
          <dd>{{ railPolicyColor }}</dd>
        </div>
        <div>
          <dt>单双面</dt>
          <dd>{{ railPolicyDuplex }}</dd>
        </div>
        <div>
          <dt>空白页检测</dt>
          <dd>{{ railPolicyBlankPage }}</dd>
        </div>
      </dl>
    </article>

    <!-- 当前考试 KPI -->
    <article class="rail-card">
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
          <span>已绑定</span><strong>{{ workflow.kioskMetrics.value.boundPaperInstances }}</strong>
        </li>
        <li>
          <span>异常</span><strong>{{ workflow.kioskMetrics.value.attentionCount }}</strong>
        </li>
      </ul>
    </article>

    <!-- 最近批次 -->
    <article class="rail-card rail-card--last">
      <header class="rail-card-head">
        <h4>最近批次</h4>
      </header>
      <template v-if="latestBatch">
        <p class="rail-batch-title">{{ workflow.latestBatchText.value }}</p>
        <p class="rail-batch-period">{{ workflow.latestBatchPeriodText.value }}</p>
        <button type="button" class="rail-link" @click="stage.gotoStage('finalize')">
          查看历史批次 →
        </button>
      </template>
      <p v-else class="rail-empty">暂无批次</p>
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
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--kiosk-neutral);
  flex: 0 0 auto;
}
.rail-led.led-success {
  background: var(--kiosk-success);
  box-shadow: 0 0 0 2px var(--kiosk-success-soft);
}
.rail-led.led-warning {
  background: var(--kiosk-warning);
  box-shadow: 0 0 0 2px var(--kiosk-warning-soft);
}
.rail-led.led-danger {
  background: var(--kiosk-danger);
  box-shadow: 0 0 0 2px var(--kiosk-danger-soft);
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

.rail-empty {
  margin: 0;
  text-align: center;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  padding: var(--kiosk-space-4) 0;
}

.rail-batch-title {
  margin: 0 0 var(--kiosk-space-2);
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

.rail-card--last {
  margin-bottom: var(--kiosk-space-2);
}
</style>
