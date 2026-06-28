<script setup lang="ts">
import type { useKioskDeviceActivation } from '../composables/useKioskDeviceActivation'
import KioskDeviceActivationPanel from './KioskDeviceActivationPanel.vue'

defineProps<{
  activation: ReturnType<typeof useKioskDeviceActivation>
  submitLoading?: boolean
  canActivate?: boolean
}>()

const emit = defineEmits<{
  submit: []
}>()
</script>

<template>
  <div v-if="activation.needsActivationGate.value" class="gate" role="dialog" aria-modal="true">
    <div class="gate__panel">
      <KioskDeviceActivationPanel
        :activation="activation"
        compact
        :can-activate="canActivate ?? true"
        :submit-loading="submitLoading"
        show-manual-cancel
        @submit="emit('submit')"
      />
    </div>
  </div>
</template>

<style scoped>
@import '../styles/tokens.css';

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
