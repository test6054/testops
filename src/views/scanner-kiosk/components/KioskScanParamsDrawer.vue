<script setup lang="ts">
/**
 * 扫描参数与模式抽屉：从就绪页分离，对标讯飞「就绪页只有开始扫描」。
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, ui } = useKioskCtx()

const open = computed({
  get: () => ui.scanParamsDrawerOpen.value,
  set: (v: boolean) => { ui.scanParamsDrawerOpen.value = v },
})

const scanConfigOptions = computed(() => workflow.kioskContext.value?.scanConfigOptions)
const dpiOptions = computed(() =>
  (scanConfigOptions.value?.allowedDpis ?? [300]).map((dpi) => ({ value: dpi, label: `${dpi} DPI` })),
)
const colorModeOptions = computed(() =>
  (scanConfigOptions.value?.colorModes ?? ['COLOR', 'GRAY', 'LINEART']).map((mode) => ({
    value: mode,
    label: workflow.scannerColorModeLabel(mode),
  })),
)
const duplexModeOptions = computed(() =>
  (scanConfigOptions.value?.duplexModes ?? ['SIMPLEX']).map((mode) => ({
    value: mode,
    label: workflow.scannerDuplexModeLabel(mode),
  })),
)
const paramsDisabled = computed(() => !workflow.canSwitchScanMode.value || !scanConfigOptions.value)
const isSupplement = computed(() => workflow.scanMode.value === 'SUPPLEMENT')

const SCAN_MODES = [
  { id: 'DIRECT' as const, label: '首次扫描' },
  { id: 'SUPPLEMENT' as const, label: '补扫' },
  { id: 'ARCHIVE' as const, label: '历史存档' },
]

function selectMode(mode: 'DIRECT' | 'SUPPLEMENT' | 'ARCHIVE') {
  if (mode !== workflow.scanMode.value) workflow.changeScanMode(mode)
}
</script>

<template>
  <a-drawer
    v-model:open="open"
    title="扫描参数"
    placement="right"
    :width="420"
    destroy-on-close
  >
    <div class="drawer-body">
      <div class="field">
        <span class="field__label">扫描模式</span>
        <div class="seg">
          <button
            v-for="mode in SCAN_MODES"
            :key="mode.id"
            type="button"
            class="seg__btn"
            :class="{ 'seg__btn--active': workflow.scanMode.value === mode.id }"
            :disabled="!workflow.canSwitchScanMode.value"
            @click="selectMode(mode.id)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <div class="field">
        <span class="field__label">分辨率</span>
        <a-select
          v-model:value="workflow.scanConfig.value.dpi"
          :options="dpiOptions"
          :disabled="paramsDisabled"
          class="full"
        />
      </div>
      <div class="field">
        <span class="field__label">色彩</span>
        <a-select
          v-model:value="workflow.scanConfig.value.colorMode"
          :options="colorModeOptions"
          :disabled="paramsDisabled"
          class="full"
        />
      </div>
      <div class="field">
        <span class="field__label">单双面</span>
        <a-select
          v-model:value="workflow.scanConfig.value.duplexMode"
          :options="duplexModeOptions"
          :disabled="paramsDisabled"
          class="full"
        />
      </div>
      <label class="check">
        <input
          v-model="workflow.scanConfig.value.blankPageDetectionEnabled"
          type="checkbox"
          :disabled="!workflow.canSwitchScanMode.value"
        />
        <span>启用空白页检测</span>
      </label>

      <div v-if="isSupplement" class="supp">
        <div class="field">
          <span class="field__label">目标页号</span>
          <input
            v-model.number="workflow.supplementTargetPageNo.value"
            type="number"
            min="1"
            class="input"
            :disabled="!workflow.canSwitchScanMode.value"
          />
        </div>
        <div class="field">
          <span class="field__label">补扫原因</span>
          <input
            v-model="workflow.supplementReason.value"
            type="text"
            maxlength="120"
            class="input"
            :disabled="!workflow.canSwitchScanMode.value"
          />
        </div>
        <label class="check">
          <input
            v-model="workflow.supplementReplaceTargetPage.value"
            type="checkbox"
            :disabled="!workflow.canSwitchScanMode.value"
          />
          <span>替换目标页（否则为追加补扫）</span>
        </label>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
}

.field__label {
  display: block;
  margin-bottom: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
}

.seg {
  display: flex;
  gap: var(--kiosk-space-1);
  padding: 3px;
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}

.seg__btn {
  flex: 1;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: calc(var(--kiosk-radius-md) - 2px);
  cursor: pointer;
  font-family: inherit;
}

.seg__btn--active {
  background: var(--kiosk-surface);
  color: var(--kiosk-primary);
  box-shadow: var(--kiosk-shadow-1);
}

.full {
  width: 100%;
}

.check {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-body);
}

.supp {
  padding: var(--kiosk-space-3);
  background: var(--kiosk-warning-soft);
  border-radius: var(--kiosk-radius-md);
}

.input {
  width: 100%;
  height: 36px;
  padding: 0 var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}
</style>
