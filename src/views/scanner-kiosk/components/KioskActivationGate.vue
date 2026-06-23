<script setup lang="ts">
/**
 * 全屏设备激活向导：未激活 / rebindRequired / tokenResetRequired 时独占屏幕，不露出扫描工作台。
 */
import { ThunderboltFilled } from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()

const visible = computed(() => workflow.needsActivationGate.value)

const title = computed(() => {
  const reason = workflow.activationGateReason.value
  if (reason === 'REBIND_REQUIRED') return '设备身份已变更'
  if (reason === 'TOKEN_RESET_REQUIRED') return '浏览器会话失效'
  return workflow.health.value?.bound ? '重新激活一体机' : '激活扫描一体机'
})

function handleActivate() {
  if (!workflow.canActivateAgent.value || workflow.loading.value) return
  workflow.activateAgent()
}
</script>

<template>
  <div v-if="visible" class="gate" role="dialog" aria-modal="true">
    <div class="gate__panel">
      <h1>{{ title }}</h1>
      <p class="gate__lead">{{ workflow.deviceReadiness.value.detail }}</p>

      <div class="form">
        <label class="form-row">
          <span class="form-label">激活码</span>
          <input
            v-model="workflow.activationForm.value.activationCode"
            type="text"
            class="form-input"
            placeholder="由教务平台下发"
            :disabled="!workflow.canActivateAgent.value || workflow.loading.value"
            autofocus
          />
        </label>
        <label class="form-row">
          <span class="form-label">本机位置名称</span>
          <input
            v-model="workflow.activationForm.value.endpointName"
            type="text"
            class="form-input"
            placeholder="如：教学楼 A-501 扫描室"
            :disabled="!workflow.canActivateAgent.value || workflow.loading.value"
          />
        </label>

        <p v-if="!workflow.canActivateAgent.value" class="form-hint">
          当前扫描任务未结束，无法激活。请先结束或取消当前任务。
        </p>
        <p v-else-if="workflow.activationErrorMessage.value" class="form-error">
          {{ workflow.activationErrorMessage.value }}
        </p>

        <button
          type="button"
          class="primary-btn"
          :disabled="!workflow.canActivateAgent.value || workflow.loading.value"
          @click="handleActivate"
        >
          <ThunderboltFilled />
          <span>{{ workflow.loading.value ? '激活中…' : '完成激活' }}</span>
        </button>
      </div>
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
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-6);
  box-shadow: var(--kiosk-shadow-2);
}

.gate__panel h1 {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-h1);
  font-weight: var(--kiosk-fw-bold);
}

.gate__lead {
  margin: 0 0 var(--kiosk-space-5);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-1);
}

.form-label {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.form-input {
  height: 44px;
  padding: 0 var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
}

.form-input:focus {
  outline: none;
  border-color: var(--kiosk-primary);
}

.form-hint {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-warning);
}

.form-error {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-danger);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  height: 48px;
  margin-top: var(--kiosk-space-2);
  background: var(--kiosk-primary);
  color: #fff;
  border: none;
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}

.primary-btn:disabled {
  background: var(--kiosk-neutral);
  color: var(--kiosk-ink-disabled);
  cursor: not-allowed;
}
</style>
