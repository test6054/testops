<script setup lang="ts">
/**
 * 全屏设备激活向导：未激活 / rebindRequired / tokenResetRequired / 主动重新激活时独占屏幕。
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'
import KioskDeviceActivationPanel from './KioskDeviceActivationPanel.vue'

const { workflow } = useKioskCtx()
const activation = workflow.deviceActivation

const visible = computed(() => workflow.needsActivationGate.value)
const canActivate = computed(() => workflow.canActivateAgent.value)
const loading = computed(() => workflow.loading.value || activation.loading.value)

function handleActivated() {
  void workflow.activateAgent()
}
</script>

<template>
  <div v-if="visible" class="gate" role="dialog" aria-modal="true">
    <div class="gate__panel">
      <KioskDeviceActivationPanel
        compact
        :can-activate="canActivate"
        :submit-loading="loading"
        show-manual-cancel
        @submit="handleActivated"
      />
    </div>
  </div>
</template>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  z-index: var(--kiosk-z-modal, 1200);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--kiosk-page-bg);
  padding: var(--kiosk-space-6);
}

.gate__panel {
  width: min(480px, 100%);
  padding: 8px;
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  box-shadow: var(--kiosk-shadow-2);
}
</style>
