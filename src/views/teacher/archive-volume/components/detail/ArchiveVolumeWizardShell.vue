<script setup lang="ts">
import type { ArchiveVolumeWizardStepKey } from '@/apis/mark/archive-volume'
import type { UiStepItem } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiCardSteps from '@/components/ui-guide/ui/UiCardSteps.vue'
import { wizardStepNumberFromKey } from '@/composables/useArchiveSubmitTaskRouter'

defineOptions({ name: 'ArchiveVolumeWizardShell' })

const props = withDefaults(defineProps<{
  currentStep: ArchiveVolumeWizardStepKey
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{
  'update:current-step': [step: ArchiveVolumeWizardStepKey]
}>()

const WIZARD_STEPS: Array<{ key: ArchiveVolumeWizardStepKey, title: string }> = [
  { key: 'materials', title: '材料收齐' },
  { key: 'integrity', title: '自检与四性' },
  { key: 'catalog', title: '编制目录' },
  { key: 'selfCheck', title: '自查清单' },
  { key: 'submit', title: '提交移交' },
]

const currentIndex = computed(() =>
  WIZARD_STEPS.findIndex(step => step.key === props.currentStep),
)

const stepItems = computed<UiStepItem[]>(() => {
  const activeIndex = currentIndex.value >= 0 ? currentIndex.value : 0
  return WIZARD_STEPS.map((step, index) => ({
    key: step.key,
    title: step.title,
    status: index < activeIndex
      ? 'completed'
      : index === activeIndex
        ? 'running'
        : 'pending',
  }))
})

function handleStepChange(index: number) {
  if (props.readonly) return
  const step = WIZARD_STEPS[index]
  if (!step) return
  const targetNumber = wizardStepNumberFromKey(step.key)
  const currentNumber = wizardStepNumberFromKey(props.currentStep)
  if (targetNumber <= currentNumber) {
    emit('update:current-step', step.key)
  }
}
</script>

<template>
  <section class="archive-volume-wizard-shell">
    <UiCardSteps
      :steps="stepItems"
      :current="currentIndex"
      compact
      :clickable="!readonly"
      @change="handleStepChange"
    />
    <div class="archive-volume-wizard-shell__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.archive-volume-wizard-shell {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-wizard-shell__content {
  min-width: 0;
}
</style>
