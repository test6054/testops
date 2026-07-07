<script setup lang="ts">
import { ThunderboltFilled } from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useKioskDeviceActivation } from '../composables/useKioskDeviceActivation'

const props = withDefaults(
  defineProps<{
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

const activation = useKioskDeviceActivation()

const formDisabled = computed(() => props.submitLoading || !props.canActivate)

const submitDisabled = computed(() => formDisabled.value || !activation.localAgentReachable.value)

const agentOfflineHint = computed(() =>
  !activation.localAgentReachable.value
    ? '请先启动本机扫描服务后再完成激活；激活码可先填写，服务就绪后提交。'
    : '',
)

function handleActivate() {
  if (submitDisabled.value) return
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
        <span>扫描员用户 ID</span>
        <input
          v-model="activation.activationForm.value.boundOperatorUserId"
          type="text"
          inputmode="numeric"
          class="activation-panel__input"
          placeholder="专职扫描员用户 ID（可选）"
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
        :disabled="submitDisabled"
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
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--kiosk-space-5);
  border: 1px dashed var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
}

.activation-panel--compact {
  border: none;
  padding: var(--kiosk-space-3);
}

.activation-panel__title {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}

.activation-panel__lead {
  margin: 0 0 var(--kiosk-space-4);
  font-size: var(--kiosk-fz-body);
  line-height: var(--kiosk-lh-base);
  color: var(--kiosk-ink-secondary);
}

.activation-panel__form {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  max-width: 480px;
}

.activation-panel__row {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-1);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
}

.activation-panel__input {
  height: var(--kiosk-h-input-sm);
  padding: 0 var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-sm);
  background: var(--kiosk-surface);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-primary);
}

.activation-panel__input:focus-visible {
  outline: 3px solid var(--kiosk-primary-soft);
  border-color: var(--kiosk-primary);
}

.activation-panel__hint {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-warning);
}

.activation-panel__error {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-danger);
}

.activation-panel__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-5);
  border: none;
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
}

.activation-panel__submit:hover:not(:disabled) {
  background: var(--kiosk-primary-pressed);
}

.activation-panel__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.activation-panel__cancel {
  height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-4);
  border: 1px solid var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface);
  color: var(--kiosk-ink-secondary);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  cursor: pointer;
}

.activation-panel__cancel:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
