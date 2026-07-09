<script setup lang="ts">
/**
 * 一体机扫描参数只读信息带：展示考试推荐参数与 OCR 链路，不可编辑、不可点击。
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()

const contract = computed(() => workflow.kioskContext.value?.taskContract)
const scanConfig = computed(() => workflow.scanConfig.value)
const scanConfigOptions = computed(() => workflow.kioskContext.value?.scanConfigOptions)
const capabilities = computed(() => workflow.kioskContext.value?.capabilities)

const materialKindLabel = computed(() => workflow.materialKindLabel.value)

const contractTitleText = computed(() => {
  if (!contract.value) return '扫描参数'
  const kind = materialKindLabel.value
  const layout = contract.value.materialLayoutModeText?.trim()
  const paperStyle = contract.value.paperStyleText?.trim()
  if (layout) return `${kind} · ${layout}`
  if (paperStyle && paperStyle !== '未配置') return `${kind} · ${paperStyle}`
  return kind
})

const dpiRangeText = computed(() => {
  const options = scanConfigOptions.value
  if (!options) return ''
  const allowed = options.allowedDpis?.filter((item) => item > 0) ?? []
  if (allowed.length > 0) {
    const sorted = [...allowed].sort((a, b) => a - b)
    return `${sorted[0]}–${sorted[sorted.length - 1]} DPI`
  }
  if (options.minScanDpi > 0 && options.maxScanDpi > 0) {
    return `${options.minScanDpi}–${options.maxScanDpi} DPI`
  }
  return ''
})

const paramItems = computed(() => {
  const items: { label: string; value: string }[] = []
  const config = scanConfig.value
  if (config.dpi) items.push({ label: '分辨率', value: `${config.dpi} DPI` })
  const dpiRange = dpiRangeText.value
  if (dpiRange) items.push({ label: '可选 DPI', value: dpiRange })
  if (config.colorMode) {
    items.push({ label: '色彩', value: workflow.scannerColorModeLabel(config.colorMode) })
  }
  if (config.duplexMode) {
    items.push({ label: '送纸', value: workflow.scannerDuplexModeLabel(config.duplexMode) })
  }
  if (capabilities.value?.loaded) {
    items.push({
      label: '进纸器 ADF',
      value: capabilities.value.supportsAdf ? '支持' : '不支持',
    })
  }
  const chainLabel =
    workflow.tenantProviderChainLabel.value ||
    workflow.providerChainText(workflow.providerChain.value)
  if (chainLabel) items.push({ label: '识别链路', value: chainLabel })
  items.push({
    label: '空白页检测',
    value: config.blankPageDetectionEnabled ? '启用' : '关闭',
  })
  return items
})

const scanConfigHint = computed(() => scanConfigOptions.value?.scanConfigHint?.trim() || '')
const scanConfigAdvisory = computed(() => scanConfigOptions.value?.scanConfigAdvisory?.trim() || '')

const profileReady = computed(() => paramItems.value.length > 0)
</script>

<template>
  <section class="scan-profile-panel" aria-label="当前扫描参数">
    <header class="scan-profile-panel__head">
      <h3>扫描参数</h3>
      <p v-if="contract">{{ contractTitleText }}</p>
    </header>
    <p v-if="scanConfigHint" class="scan-profile-panel__hint">{{ scanConfigHint }}</p>
    <p v-if="scanConfigAdvisory" class="scan-profile-panel__advisory">{{ scanConfigAdvisory }}</p>
    <dl v-if="profileReady" class="scan-profile-panel__grid">
      <div v-for="item in paramItems" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
    <p v-else class="scan-profile-panel__empty">扫描参数加载中，请刷新设备状态</p>
  </section>
</template>

<style scoped>
.scan-profile-panel {
  padding: var(--kiosk-space-4);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
  pointer-events: none;
  user-select: none;
}

.scan-profile-panel__head h3 {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}

.scan-profile-panel__head p {
  margin: var(--kiosk-space-1) 0 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.scan-profile-panel__hint {
  margin: var(--kiosk-space-3) 0 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.scan-profile-panel__advisory {
  margin: var(--kiosk-space-2) 0 0;
  padding: var(--kiosk-space-2) var(--kiosk-space-3);
  border-radius: var(--kiosk-radius-sm);
  background: var(--kiosk-warning-soft);
  border: 1px solid var(--kiosk-warning);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.scan-profile-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--kiosk-space-3) var(--kiosk-space-5);
  margin: var(--kiosk-space-4) 0 0;
}

.scan-profile-panel__grid div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scan-profile-panel__grid dt {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.scan-profile-panel__grid dd {
  margin: 0;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-primary);
  font-variant-numeric: tabular-nums;
}

.scan-profile-panel__empty {
  margin: var(--kiosk-space-3) 0 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
}
</style>
