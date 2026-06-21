<script setup lang="ts">
import type { AccreditationCockpitVO, AccreditationCyclePhase } from '@/apis/quality/accreditation'
import { computed } from 'vue'
import { ACCREDITATION_CYCLE_PHASE_LABEL } from '@/apis/quality/accreditation'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'AccreditationPhaseBanner' })

const props = defineProps<{
  cockpit?: AccreditationCockpitVO
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const activePhase = computed(() => props.cockpit?.activeCycle?.currentPhase)

const phaseLabel = computed(() => {
  const phase = activePhase.value
  if (!phase) return ''
  return strictEnumLabel(ACCREDITATION_CYCLE_PHASE_LABEL, phase as AccreditationCyclePhase, '认证周期阶段')
})

const deadlineHints = computed(() => {
  const c = props.cockpit
  if (!c) return [] as string[]
  const hints: string[] = []
  if (c.conditionalDueDaysRemaining != null) {
    hints.push(`有条件改进剩余 ${c.conditionalDueDaysRemaining} 天`)
  }
  if (c.onsiteReportDueDaysRemaining != null) {
    hints.push(`考查报告剩余 ${c.onsiteReportDueDaysRemaining} 天`)
  }
  return hints
})

const showBanner = computed(() => !!props.cockpit?.activeCycle || props.loading)
</script>

<template>
  <div v-if="showBanner" class="accreditation-phase-banner">
    <div class="accreditation-phase-banner__main">
      <span class="accreditation-phase-banner__label">认证阶段</span>
      <UiTag v-if="phaseLabel" tone="blue" size="sm">{{ phaseLabel }}</UiTag>
      <span v-if="cockpit?.activeCycle?.cycleName" class="accreditation-phase-banner__cycle">
        {{ cockpit.activeCycle.cycleName }}
      </span>
      <span
        v-for="hint in deadlineHints"
        :key="hint"
        class="accreditation-phase-banner__hint"
      >
        {{ hint }}
      </span>
    </div>
    <UiButton variant="ghost" size="sm" :loading="loading" @click="emit('refresh')">
      刷新阶段
    </UiButton>
  </div>
</template>

<style lang="scss" scoped>
.accreditation-phase-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--ant-color-fill-quaternary);
}

.accreditation-phase-banner__main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  min-width: 0;
}

.accreditation-phase-banner__label {
  font-size: var(--dp-font-size-sm, 13px);
  font-weight: var(--dp-font-weight-title, 600);
  color: var(--dp-text-secondary, #64748b);
}

.accreditation-phase-banner__cycle {
  font-size: var(--dp-font-size-sm, 13px);
  color: var(--dp-text-primary, #0f172a);
}

.accreditation-phase-banner__hint {
  font-size: var(--dp-font-size-xs, 12px);
  color: var(--ant-color-warning);
}
</style>
