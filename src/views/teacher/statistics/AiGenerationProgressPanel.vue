<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

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
const cursorVisible = ref(true)
const visibleLength = ref(0)
let timer: number | undefined

const typedText = computed(() => props.waitingText.slice(0, visibleLength.value))

function stopTimer(): void {
  if (timer != null) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function startTimer(): void {
  stopTimer()
  elapsedSeconds.value = 0
  visibleLength.value = 0
  cursorVisible.value = true
  timer = window.setInterval(() => {
    elapsedSeconds.value += 1
    cursorVisible.value = !cursorVisible.value
    if (visibleLength.value < props.waitingText.length) {
      visibleLength.value += 1
    }
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

watch(
  () => props.waitingText,
  () => {
    if (props.active) startTimer()
  },
)

onBeforeUnmount(stopTimer)
</script>

<template>
  <div class="ai-generation-progress" role="status" aria-live="polite">
    <div class="ai-generation-progress__header">
      <span class="ai-generation-progress__pulse" aria-hidden="true" />
      <div class="ai-generation-progress__copy">
        <strong>{{ props.title }}</strong>
        <span>已等待 {{ elapsedSeconds }} 秒</span>
      </div>
    </div>
    <div class="ai-generation-progress__steps">
      <div class="ai-generation-progress__step ai-generation-progress__step--done">
        已提交生成请求
      </div>
      <div class="ai-generation-progress__step ai-generation-progress__step--active">
        {{ typedText }}<span v-if="cursorVisible" class="ai-generation-progress__cursor">|</span>
      </div>
      <div class="ai-generation-progress__step">返回后校验结果并刷新展示</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-generation-progress {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
  margin-bottom: var(--dp-space-3, 12px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.ai-generation-progress__header {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3, 12px);
}

.ai-generation-progress__pulse {
  width: 10px;
  height: 10px;
  border-radius: var(--dp-radius-full, 999px);
  background: var(--ant-color-primary, #1677ff);
  animation: ai-generation-pulse 1.4s ease-out infinite;
}

.ai-generation-progress__copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  width: 100%;
  color: var(--dp-text-primary, rgba(0, 0, 0, 0.88));
}

.ai-generation-progress__copy span {
  color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
  font-size: var(--dp-font-size-xs, 12px);
}

.ai-generation-progress__steps {
  display: grid;
  grid-template-columns: minmax(120px, 0.75fr) minmax(220px, 1.6fr) minmax(150px, 1fr);
  gap: var(--dp-space-2, 8px);
}

.ai-generation-progress__step {
  min-height: 34px;
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-control, 8px);
  background: var(--dp-surface, #fff);
  color: var(--dp-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: var(--dp-font-size-sm, 13px);
  line-height: 1.4;
}

.ai-generation-progress__step--done {
  border-color: rgba(82, 196, 26, 0.32);
  color: var(--ant-color-success, #52c41a);
}

.ai-generation-progress__step--active {
  border-color: rgba(22, 119, 255, 0.28);
  color: var(--dp-text-primary, rgba(0, 0, 0, 0.88));
  box-shadow: var(--dp-focus-ring, 0 0 0 2px rgba(22, 119, 255, 0.18));
}

.ai-generation-progress__cursor {
  color: var(--ant-color-primary, #1677ff);
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

@media (max-width: 768px) {
  .ai-generation-progress__copy,
  .ai-generation-progress__steps {
    display: flex;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-generation-progress__pulse {
    animation: none;
  }
}
</style>
