<script setup lang="ts">
/**
 * KioskNoticeBand - 全局通知带
 *
 * 显示 errorMessage / successMessage 两类常驻 banner，可点关闭按钮或按 Esc 清空。
 * 自动占据 KioskLayout grid 第 3 行 auto 高度，无消息时整个组件渲染为空（不占空间）。
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()

const visible = computed(
  () => Boolean(workflow.errorMessage.value) || Boolean(workflow.successMessage.value),
)

function clearError() {
  workflow.errorMessage.value = ''
}
function clearSuccess() {
  workflow.successMessage.value = ''
}
</script>

<template>
  <div v-if="visible" class="notice-band">
    <div v-if="workflow.errorMessage.value" class="notice notice-danger" role="alert">
      <span>{{ workflow.errorMessage.value }}</span>
      <button type="button" class="notice-dismiss" title="按 Esc 关闭" @click="clearError">
        关闭
      </button>
    </div>
    <div v-if="workflow.successMessage.value" class="notice notice-success">
      <span>{{ workflow.successMessage.value }}</span>
      <button type="button" class="notice-dismiss" title="按 Esc 关闭" @click="clearSuccess">
        关闭
      </button>
    </div>
  </div>
</template>

<style scoped>
.notice-band {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-2) var(--kiosk-space-4);
  background: var(--kiosk-page-bg);
  border-bottom: 1px solid var(--kiosk-divider);
  z-index: var(--kiosk-z-base);
}

.notice {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  border-radius: var(--kiosk-radius-md);
  font-size: var(--kiosk-fz-body);
  border: 1px solid transparent;
}
.notice span {
  flex: 1;
  min-width: 0;
}

.notice-danger {
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
  border-color: rgba(197, 38, 62, 0.3);
}

.notice-success {
  background: var(--kiosk-success-soft);
  color: var(--kiosk-success);
  border-color: rgba(31, 157, 85, 0.3);
}

.notice-dismiss {
  height: 32px;
  padding: 0 var(--kiosk-space-3);
  background: transparent;
  border: 1px solid currentColor;
  border-radius: var(--kiosk-radius-sm);
  color: inherit;
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  cursor: pointer;
  opacity: 0.75;
  transition: opacity var(--kiosk-dur-fast) var(--kiosk-easing);
}
.notice-dismiss:hover {
  opacity: 1;
}
</style>
