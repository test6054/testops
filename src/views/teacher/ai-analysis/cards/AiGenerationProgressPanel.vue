<script lang="ts" setup>
import { onBeforeUnmount, ref, watch } from 'vue'

defineOptions({ name: 'AiGenerationProgressPanel' })

const props = withDefaults(
  defineProps<{
    title: string
    active?: boolean
    waitingText?: string
  }>(),
  {
    active: true,
    waitingText: '正在等待后端返回真实分析结果，完成后会自动刷新当前卡片。',
  },
)

const elapsedSeconds = ref(0)
let timer: number | undefined

function stopTimer(): void {
  if (timer != null) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function startTimer(): void {
  stopTimer()
  elapsedSeconds.value = 0
  timer = window.setInterval(() => {
    elapsedSeconds.value += 1
  }, 1000)
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      startTimer()
    } else {
      stopTimer()
    }
  },
  { immediate: true },
)

onBeforeUnmount(stopTimer)
</script>

<template>
  <div class="ai-generation-progress" role="status" aria-live="polite">
    <div class="ai-generation-progress__header">
      <span class="ai-generation-progress__pulse" aria-hidden="true" />
      <strong class="ai-generation-progress__title">{{ title }}</strong>
      <span class="ai-generation-progress__elapsed">已等待 {{ elapsedSeconds }} 秒</span>
    </div>
    <p class="ai-generation-progress__text">{{ waitingText }}</p>
  </div>
</template>

<style lang="scss" scoped>
.ai-generation-progress {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.ai-generation-progress__header {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  min-width: 0;
}

.ai-generation-progress__pulse {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: var(--dp-radius-full, 999px);
  background: var(--ant-color-primary, #1677ff);
  animation: ai-generation-pulse 1.4s ease-out infinite;
}

.ai-generation-progress__title {
  flex: 1;
  min-width: 0;
  font-size: var(--dp-font-size-sm, 13px);
  font-weight: 600;
  color: var(--dp-text-primary, rgba(0, 0, 0, 0.88));
}

.ai-generation-progress__elapsed {
  flex-shrink: 0;
  font-size: var(--dp-font-size-xs, 12px);
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
}

.ai-generation-progress__text {
  margin: 0;
  font-size: var(--dp-font-size-sm, 13px);
  line-height: 1.5;
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
}

@keyframes ai-generation-pulse {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  70% {
    transform: scale(1.9);
    opacity: 0;
  }
  100% {
    transform: scale(1.9);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-generation-progress__pulse {
    animation: none;
  }
}
</style>
