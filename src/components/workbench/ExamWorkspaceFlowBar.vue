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
          @click="emit('step-change', prevStep.menuKey)"
        >
          {{ prevStep.label }}
        </UiButton>
        <span v-if="currentStep" class="exam-flow-ctx-bar__current">{{ currentStep.label }}</span>
        <UiButton
          v-if="nextStep"
          variant="ghost"
          size="sm"
          @click="emit('step-change', nextStep.menuKey)"
        >
          {{ nextStep.label }}
        </UiButton>
      </div>
    </div>
    <div class="exam-flow-ctx-bar__pipeline">
      <button
        v-for="step in chainSteps"
        :key="step.menuKey"
        type="button"
        class="exam-flow-ctx-bar__pipe-step"
        :class="`exam-flow-ctx-bar__pipe-step--${step.chainStatus}`"
        @click="emit('step-change', step.menuKey)"
      >
        {{ step.label }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ExamWorkspaceFlowStep } from '@/composables/useExamWorkspaceFlowContext'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'

defineOptions({ name: 'ExamWorkspaceFlowBar' })

const props = defineProps<{
  chainSteps: ExamWorkspaceFlowStep[]
  activeMenuKey: string
  title: string
  subtitle: string
}>()

const emit = defineEmits<{
  'step-change': [menuKey: string]
}>()

const currentIndex = computed(() =>
  props.chainSteps.findIndex((step) => step.menuKey === props.activeMenuKey),
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
</script>
