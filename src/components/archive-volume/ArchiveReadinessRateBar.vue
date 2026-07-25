<template>
  <div class="archive-readiness-rate">
    <div class="archive-readiness-rate__track">
      <div
        class="archive-readiness-rate__fill"
        :class="{ 'archive-readiness-rate__fill--done': normalizedPercent >= 100 }"
        :style="{
          transform: `scaleX(${Math.max(0, Math.min(1, normalizedPercent / 100))})`,
        }"
      />
    </div>
    <span
      class="archive-readiness-rate__pct"
      :class="{ 'archive-readiness-rate__pct--done': normalizedPercent >= 100 }"
    >
      {{ displayPercent }}%
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'ArchiveReadinessRateBar' })

const props = defineProps<{
  percent?: number | null
}>()

const normalizedPercent = computed(() => {
  const value = props.percent ?? 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
})

const displayPercent = computed(() => {
  const raw = props.percent ?? 0
  return Number.isInteger(raw) ? raw : Math.round(raw * 10) / 10
})
</script>

<style scoped>
.archive-readiness-rate {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}

.archive-readiness-rate__track {
  width: 60px;
  height: 4px;
  border-radius: 2px;
  background: var(--dp-border-subtle);
  overflow: hidden;
}

.archive-readiness-rate__fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  border-radius: 2px;
  background: var(--dp-warning);
  transition: transform var(--dp-duration-normal) var(--dp-ease-default);
}

.archive-readiness-rate__fill--done {
  background: var(--dp-success);
}

.archive-readiness-rate__pct {
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dp-warning);
}

.archive-readiness-rate__pct--done {
  color: var(--dp-success);
}
</style>
