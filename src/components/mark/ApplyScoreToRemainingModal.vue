<template>
  <div v-if="open" class="apply-score-modal" role="dialog" aria-live="polite">
    <div class="apply-score-modal__panel">
      <div class="apply-score-modal__title">已提交 · 给分 {{ scoreText }}</div>
      <p class="apply-score-modal__desc">是否将相同分数用于剩余 {{ remainingCount }} 份同类卷？</p>
      <p v-if="countdown > 0" class="apply-score-modal__countdown">
        {{ countdown }} 秒后自动仅提交并继续下一份
      </p>
      <div class="apply-score-modal__actions">
        <UiButton variant="primary" size="sm" @click="emit('apply')"> 应用并继续 (Y) </UiButton>
        <UiButton variant="outline" size="sm" @click="emit('dismiss')"> 仅提交 (N) </UiButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'

defineOptions({ name: 'ApplyScoreToRemainingModal' })

const countdown = defineModel<number>('countdown', { default: 0 })

const props = withDefaults(
  defineProps<{
    open: boolean
    score?: number
    remainingCount: number
    countdownSeconds?: number
  }>(),
  {
    score: undefined,
    countdownSeconds: 3,
  },
)

const emit = defineEmits<{
  (e: 'apply'): void
  (e: 'dismiss'): void
}>()

const scoreText = computed(() => (props.score === undefined ? '-' : String(props.score)))

let timer: ReturnType<typeof setInterval> | null = null

function clearTimer(): void {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function startCountdown(): void {
  clearTimer()
  countdown.value = props.countdownSeconds
  timer = setInterval(() => {
    if (countdown.value <= 1) {
      clearTimer()
      emit('dismiss')
      return
    }
    countdown.value -= 1
  }, 1000)
}

watch(
  () => props.open,
  (visible) => {
    if (visible) {
      startCountdown()
      return
    }
    clearTimer()
    countdown.value = 0
  },
  { immediate: true },
)

onBeforeUnmount(clearTimer)
</script>

<style lang="scss" scoped>
.apply-score-modal {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  max-width: 360px;

  &__panel {
    padding: 16px;
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-panel);
    background: var(--ant-color-bg-container);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__desc {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__countdown {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
}
</style>
