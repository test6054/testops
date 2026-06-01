<script setup lang="ts">
/**
 * KioskStageBar - 4 阶段切换条
 *
 * 点击切换路由 + URL 同步变化；过去的 stage 用 completed 描边。
 * 阶段从 KIOSK_STAGES 静态常量读出，避免重复定义。
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'
import { KIOSK_STAGES } from '../composables/useStageMachine'

const { stage } = useKioskCtx()

const currentIndex = computed(() =>
  KIOSK_STAGES.findIndex((s) => s.id === stage.currentStage.value),
)
</script>

<template>
  <nav class="stage-bar" aria-label="扫描阶段">
    <button
      v-for="s in KIOSK_STAGES"
      :key="s.id"
      type="button"
      class="stage-step"
      :class="{
        active: s.id === stage.currentStage.value,
        completed: currentIndex > s.order,
      }"
      :title="`Alt+${s.order + 1}: ${s.label}`"
      @click="stage.gotoStage(s.id)"
    >
      <span class="stage-index">{{ s.order + 1 }}</span>
      <span class="stage-label">
        <strong>{{ s.label }}</strong>
        <small>{{ s.description }}</small>
      </span>
    </button>
  </nav>
</template>

<style scoped>
.stage-bar {
  display: flex;
  align-items: stretch;
  gap: var(--kiosk-space-2);
  padding: 0 var(--kiosk-space-6);
  height: var(--kiosk-h-stage-bar);
  background: var(--kiosk-surface);
  border-bottom: 1px solid var(--kiosk-divider);
  box-shadow: var(--kiosk-shadow-1);
  z-index: var(--kiosk-z-stage-bar);
}

.stage-step {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: 0 var(--kiosk-space-4);
  min-height: var(--kiosk-h-stage-bar);
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.stage-step:hover {
  background: var(--kiosk-surface-alt);
}

.stage-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--kiosk-neutral-soft);
  color: var(--kiosk-ink-tertiary);
  font-variant-numeric: tabular-nums;
  font-weight: var(--kiosk-fw-semibold);
  font-size: var(--kiosk-fz-h3);
  flex: 0 0 auto;
}

.stage-step.completed .stage-index {
  background: var(--kiosk-success-soft);
  color: var(--kiosk-success);
}

.stage-step.active .stage-index {
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
}

.stage-step.active {
  border-bottom-color: var(--kiosk-primary);
}

.stage-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.stage-label strong {
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.stage-label small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

@media (max-width: 1280px) {
  .stage-label small {
    display: none;
  }
}
</style>
