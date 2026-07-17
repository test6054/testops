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
  gap: var(--dp-space-2);
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}

.ai-generation-progress__header {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
}

.ai-generation-progress__pulse {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: var(--dp-radius-full);
  background: var(--dp-color-primary);
  animation: ai-generation-pulse 1.4s ease-out infinite;
}

.ai-generation-progress__title {
  flex: 1;
  min-width: 0;
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.ai-generation-progress__elapsed {
  flex-shrink: 0;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}

.ai-generation-progress__text {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  color: var(--dp-text-secondary);
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
