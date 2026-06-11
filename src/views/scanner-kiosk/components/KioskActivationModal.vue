<script setup lang="ts">
/**
 * KioskActivationModal - 一体机激活弹窗
 *
 * 未绑定 / 需重新激活时强制弹出；平台地址由 Agent 或页面 origin 自动获取，用户只需填写激活码与端点名称。
 */
import { ThunderboltFilled } from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()

const open = computed({
  get: () => workflow.activationModalOpen.value,
  set: (value: boolean) => {
    if (!value && workflow.activationModalForced.value) return
    workflow.activationModalOpen.value = value
  },
})

const title = computed(() =>
  workflow.health.value?.bound ? '重新激活一体机' : '激活一体机',
)

function handleActivate() {
  if (!workflow.canActivateAgent.value || workflow.loading.value) return
  workflow.activateAgent()
}
</script>

<template>
  <a-modal
    v-model:open="open"
    :title="title"
    :width="520"
    :closable="!workflow.activationModalForced.value"
    :mask-closable="!workflow.activationModalForced.value"
    :keyboard="!workflow.activationModalForced.value"
    :footer="null"
    destroy-on-close
    centered
    wrap-class-name="kiosk-activation-modal"
  >
    <p class="modal-lead">
      平台服务地址已自动识别。请输入教务平台下发的激活码与本机端点名称，完成绑定后实时推送与扫描功能才会恢复。
    </p>

    <div class="form">
      <label class="form-row">
        <span class="form-label">平台服务地址</span>
        <input
          :value="workflow.activationForm.value.gatewayBaseUrl"
          type="text"
          class="form-input form-input--readonly"
          readonly
          tabindex="-1"
        />
      </label>
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
        <span class="form-label">端点名称</span>
        <input
          v-model="workflow.activationForm.value.endpointName"
          type="text"
          class="form-input"
          placeholder="如：教学楼 A-501"
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
        <span>{{ workflow.loading.value ? '激活中…' : '激活一体机' }}</span>
      </button>
    </div>
  </a-modal>
</template>

<style scoped>
.modal-lead {
  margin: 0 0 var(--kiosk-space-4);
  font-size: var(--kiosk-fz-body);
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
  color: var(--kiosk-ink-primary);
  outline: none;
}

.form-input:focus {
  border-color: var(--kiosk-primary);
}

.form-input:disabled {
  background: var(--kiosk-neutral-soft);
  cursor: not-allowed;
}

.form-input--readonly {
  background: var(--kiosk-neutral-soft);
  color: var(--kiosk-ink-secondary);
  cursor: default;
}

.form-hint,
.form-error {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
}

.form-hint {
  color: var(--kiosk-warning);
}

.form-error {
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
  color: var(--kiosk-primary-on);
  border: none;
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}

.primary-btn:hover:not(:disabled) {
  background: var(--kiosk-primary-pressed);
}

.primary-btn:disabled {
  background: var(--kiosk-neutral);
  color: var(--kiosk-ink-disabled);
  cursor: not-allowed;
}
</style>
