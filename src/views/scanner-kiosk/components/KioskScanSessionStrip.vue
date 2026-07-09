<script setup lang="ts">
/**
 * 扫描/复核阶段顶栏：冻结的扫描参数摘要 + 设备设置入口（替代 SideRail 配置区）。
 */
import { SettingOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'
import { ScannerKioskScanModeCode } from '@/apis/mark/scanner-kiosk'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, ui } = useKioskCtx()

const activeScanConfig = computed(() => workflow.scanConfig.value)
const capabilities = computed(() => workflow.kioskContext.value?.capabilities)

const scannerLabel = computed(() => {
  const selected = workflow.selectedScanner.value?.displayName?.trim()
  if (selected) return selected
  const capabilityName = capabilities.value?.scannerDisplayName?.trim()
  if (capabilityName) return capabilityName
  if (workflow.isLocalScannerConnected.value) return '已连接'
  return '未检测到'
})

const scanModeLabel = computed(() => workflow.scanModeText(workflow.scanMode.value, ''))
const scanModeTone = computed(() => {
  const mode = workflow.scanMode.value
  if (mode === ScannerKioskScanModeCode.SUPPLEMENT) return 'supplement'
  return 'direct'
})

const dpiLabel = computed(() => String(activeScanConfig.value.dpi ?? '—'))
const colorLabel = computed(() =>
  activeScanConfig.value.colorMode
    ? workflow.scannerColorModeLabel(activeScanConfig.value.colorMode)
    : '—',
)
const duplexLabel = computed(() =>
  activeScanConfig.value.duplexMode
    ? workflow.scannerDuplexModeLabel(activeScanConfig.value.duplexMode)
    : '—',
)
const blankPageLabel = computed(() =>
  activeScanConfig.value.blankPageDetectionEnabled ? '空白页检测开' : '空白页检测关',
)

const metrics = computed(() => workflow.kioskMetrics.value)
</script>

<template>
  <div class="session-strip">
    <div class="session-strip__params">
      <span class="session-strip__mode" :class="`session-strip__mode--${scanModeTone}`">
        {{ scanModeLabel }}
      </span>
      <span class="session-strip__chip">{{ dpiLabel }} DPI</span>
      <span class="session-strip__chip">{{ colorLabel }}</span>
      <span class="session-strip__chip">{{ duplexLabel }}</span>
      <span class="session-strip__chip session-strip__chip--muted">{{ blankPageLabel }}</span>
      <span class="session-strip__scanner">{{ scannerLabel }}</span>
    </div>
    <div class="session-strip__metrics">
      <span
        >已扫页 <strong>{{ metrics.scannedPages }}</strong></span
      >
      <span
        >试卷 <strong>{{ metrics.paperInstances }}</strong></span
      >
      <span
        >异常 <strong>{{ metrics.attentionCount }}</strong></span
      >
    </div>
    <button type="button" class="session-strip__settings" @click="ui.openSettings()">
      <SettingOutlined />
      <span>设备设置</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.session-strip {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-4);
  min-height: 40px;
  padding: var(--kiosk-space-2) var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  flex-shrink: 0;
}

.session-strip__params {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--kiosk-space-2);
  min-width: 0;
  flex: 1;
}

.session-strip__mode {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-semibold);
  line-height: 1;
}

.session-strip__mode--direct {
  background: var(--kiosk-primary-soft);
  color: var(--kiosk-primary);
}

.session-strip__mode--supplement {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}

.session-strip__chip {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.session-strip__chip--muted {
  color: var(--kiosk-ink-tertiary);
}

.session-strip__scanner {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.session-strip__metrics {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-4);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  white-space: nowrap;
}

.session-strip__metrics strong {
  font-variant-numeric: tabular-nums;
  color: var(--kiosk-ink-primary);
  font-weight: var(--kiosk-fw-semibold);
}

.session-strip__settings {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-1);
  height: 32px;
  padding: 0 var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  background: var(--kiosk-surface-alt);
  color: var(--kiosk-ink-secondary);
  font-family: inherit;
  font-size: var(--kiosk-fz-caption);
  cursor: pointer;
  flex-shrink: 0;
}

.session-strip__settings:hover {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}
</style>
