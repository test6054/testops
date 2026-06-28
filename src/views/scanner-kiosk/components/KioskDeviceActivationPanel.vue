<script setup lang="ts">
import { ThunderboltFilled } from '@ant-design/icons-vue'
import { computed } from 'vue'
import type { useKioskDeviceActivation } from '../composables/useKioskDeviceActivation'

const props = withDefaults(
  defineProps<{
    activation: ReturnType<typeof useKioskDeviceActivation>
    compact?: boolean
    canActivate?: boolean
    submitLoading?: boolean
    showManualCancel?: boolean
  }>(),
  {
    canActivate: true,
    submitLoading: false,
    showManualCancel: false,
  },
)

const emit = defineEmits<{
  submit: []
}>()

const formDisabled = computed(
  () => props.submitLoading
    || !props.canActivate
    || !props.activation.localAgentReachable.value,
)

const agentOfflineHint = computed(() =>
  !props.activation.localAgentReachable.value
    ? '请先启动本机扫描服务后再完成激活；激活码可先填写，服务就绪后提交。'
    : '',
)

function handleActivate() {
  if (formDisabled.value) return
  emit('submit')
}
</script>

<template>
  <section class="activation-panel" :class="{ 'activation-panel--compact': compact }">
    <h2 class="activation-panel__title">{{ activation.activationTitle.value }}</h2>
    <p class="activation-panel__lead">{{ activation.deviceReadiness.value.detail }}</p>

    <div class="activation-panel__form">
      <label class="activation-panel__row">
        <span>激活码</span>
        <input
          v-model="activation.activationForm.value.activationCode"
          type="text"
          inputmode="numeric"
          maxlength="8"
          class="activation-panel__input"
          placeholder="8 位数字激活码"
          :disabled="formDisabled"
        />
      </label>
      <label class="activation-panel__row">
        <span>本机位置名称</span>
        <input
          v-model="activation.activationForm.value.endpointName"
          type="text"
          class="activation-panel__input"
          placeholder="如：教学楼 A-501 扫描室"
          :disabled="formDisabled"
        />
      </label>
      <p v-if="agentOfflineHint" class="activation-panel__hint">
        {{ agentOfflineHint }}
      </p>
      <p v-else-if="!canActivate" class="activation-panel__hint">
        当前扫描任务未结束，无法激活。请先结束或取消当前任务。
      </p>
      <p v-else-if="activation.activationErrorMessage.value" class="activation-panel__error">
        {{ activation.activationErrorMessage.value }}
      </p>
      <button
        type="button"
        class="activation-panel__submit"
        :disabled="formDisabled"
        @click="handleActivate"
      >
        <ThunderboltFilled />
        <span>{{ submitLoading ? '激活中…' : '完成设备激活' }}</span>
      </button>
      <button
        v-if="showManualCancel && activation.manualActivationGateOpen.value"
        type="button"
        class="activation-panel__cancel"
        :disabled="submitLoading"
        @click="activation.closeManualActivation()"
      >
        取消
      </button>
    </div>
  </section>
</template>

<style scoped>
.activation-panel {
  margin-top: 24px;
  padding: 20px 16px;
  border: 1px solid var(--kiosk-border, #e5e7eb);
  border-radius: 6px;
  background: var(--kiosk-surface, #fff);
}

.activation-panel--compact {
  margin-top: 0;
  border: none;
  padding: 12px 8px;
}

.activation-panel__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.activation-panel__lead {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--kiosk-text-secondary, #64748b);
}

.activation-panel__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activation-panel__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.activation-panel__input {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
}

.activation-panel__hint {
  margin: 0;
  font-size: 13px;
  color: var(--kiosk-warning, #d97706);
}

.activation-panel__error {
  margin: 0;
  font-size: 13px;
  color: var(--kiosk-danger, #dc2626);
}

.activation-panel__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  background: var(--kiosk-accent, #2563eb);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.activation-panel__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.activation-panel__cancel {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: transparent;
  color: var(--kiosk-text-secondary, #64748b);
  font-size: 14px;
  cursor: pointer;
}

.activation-panel__cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
