<script setup lang="ts">
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { LayoutDesignPhaseCode, LayoutDesignPhaseDescription } from '@/types/enums/layout-design-phase-enum'

const props = defineProps<{
  phase: LayoutDesignPhaseCode
  isPhaseAccessible: (phase: LayoutDesignPhaseCode) => boolean
  phaseLockReason: (phase: LayoutDesignPhaseCode) => string | undefined
}>()

const emit = defineEmits<{
  select: [phase: LayoutDesignPhaseCode]
}>()

const phaseItems = [
  LayoutDesignPhaseCode.SOURCE,
  LayoutDesignPhaseCode.QUESTIONS,
  LayoutDesignPhaseCode.LAYOUT,
  LayoutDesignPhaseCode.REVIEW,
] as const

function handleSelect(nextPhase: LayoutDesignPhaseCode): void {
  if (!props.isPhaseAccessible(nextPhase)) {
    return
  }
  emit('select', nextPhase)
}
</script>

<template>
  <nav class="layout-design-phase-rail" aria-label="制卷设计阶段">
    <UiButton
      v-for="item in phaseItems"
      :key="item"
      size="sm"
      :variant="phase === item ? 'primary' : 'outline'"
      :disabled="!isPhaseAccessible(item)"
      :title="phaseLockReason(item)"
      @click="handleSelect(item)"
    >
      {{ LayoutDesignPhaseDescription[item] }}
    </UiButton>
  </nav>
</template>

<style scoped lang="scss">
.layout-design-phase-rail {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
