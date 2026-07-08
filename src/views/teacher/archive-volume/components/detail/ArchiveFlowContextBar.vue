<template>
  <div class="exam-flow-ctx-bar">
    <div class="exam-flow-ctx-bar__head">
      <div class="exam-flow-ctx-bar__titles">
        <p class="exam-flow-ctx-bar__subtitle">{{ subtitle }}</p>
        <h2 class="exam-flow-ctx-bar__title">{{ title }}</h2>
      </div>
      <div class="exam-flow-ctx-bar__nav">
        <UiButton
          v-if="prevStep"
          variant="ghost"
          size="sm"
          @click="emit('tab-change', prevStep.tabKey)"
        >
          {{ prevStep.label }}
        </UiButton>
        <UiButton v-else variant="ghost" size="sm" @click="emit('back-to-list')">
          返回列表
        </UiButton>
        <span v-if="currentStep" class="exam-flow-ctx-bar__current">{{ currentStep.label }}</span>
        <UiButton
          v-if="nextStep"
          variant="ghost"
          size="sm"
          @click="emit('tab-change', nextStep.tabKey)"
        >
          {{ nextStep.label }}
        </UiButton>
      </div>
    </div>
    <div v-if="$slots.actions" class="exam-flow-ctx-bar__actions">
      <slot name="actions" />
    </div>
    <div v-if="showPipeline !== false && chainSteps.length > 0" class="exam-flow-ctx-bar__pipeline">
      <button
        v-for="step in chainSteps"
        :key="step.tabKey"
        type="button"
        class="exam-flow-ctx-bar__pipe-step"
        :class="pipeStepClass(step)"
        @click="emit('tab-change', step.tabKey)"
      >
        <span class="exam-flow-ctx-bar__pipe-bar" :class="pipeBarClass(step)" />
        <span class="exam-flow-ctx-bar__pipe-label">{{ step.label }}</span>
        <span v-if="step.badgeCount && step.badgeCount > 0" class="exam-flow-ctx-bar__pipe-badge">
          {{ step.badgeCount }}
        </span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ArchiveVolumeNavChainStepVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'

defineOptions({ name: 'ArchiveFlowContextBar' })

const props = defineProps<{
  chainSteps: ArchiveVolumeNavChainStepVO[]
  activeTab: string
  title: string
  subtitle: string
  /** 收材期 false：仅标题与操作，不渲染顶栏 Flow 管道（对标竞品：SubmitProgressBand 承担主进度） */
  showPipeline?: boolean
}>()

const emit = defineEmits<{
  'tab-change': [tabKey: string]
  'back-to-list': []
}>()

const currentIndex = computed(() =>
  props.chainSteps.findIndex((step) => step.tabKey === props.activeTab),
)

const currentStep = computed(() => {
  const index = currentIndex.value
  return index >= 0 ? props.chainSteps[index] : null
})

const prevStep = computed(() => {
  const index = currentIndex.value
  return index > 0 ? props.chainSteps[index - 1] : null
})

const nextStep = computed(() => {
  const index = currentIndex.value
  return index >= 0 && index < props.chainSteps.length - 1 ? props.chainSteps[index + 1] : null
})

function pipeStepClass(step: ArchiveVolumeNavChainStepVO): string {
  if (step.tabKey === props.activeTab) {
    return step.chainStatus === 'warn'
      ? 'exam-flow-ctx-bar__pipe-step--warn'
      : 'exam-flow-ctx-bar__pipe-step--current'
  }
  return `exam-flow-ctx-bar__pipe-step--${step.chainStatus}`
}

function pipeBarClass(step: ArchiveVolumeNavChainStepVO): string {
  if (step.tabKey === props.activeTab) {
    return step.chainStatus === 'warn'
      ? 'exam-flow-ctx-bar__pipe-bar--warn'
      : 'exam-flow-ctx-bar__pipe-bar--current'
  }
  if (step.chainStatus === 'done') {
    return 'exam-flow-ctx-bar__pipe-bar--done'
  }
  if (step.chainStatus === 'warn') {
    return 'exam-flow-ctx-bar__pipe-bar--warn'
  }
  return 'exam-flow-ctx-bar__pipe-bar--pending'
}
</script>
