<template>
  <div class="archive-readiness-rate">
    <div class="archive-readiness-rate__track">
      <div
        class="archive-readiness-rate__fill"
        :class="{ 'archive-readiness-rate__fill--done': normalizedPercent >= 100 }"
        :style="{ width: `${normalizedPercent}%` }"
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
  gap: 6px;
}

.archive-readiness-rate__track {
  width: 60px;
  height: 4px;
  border-radius: 2px;
  background: var(--dp-border-subtle, #e2e8f0);
  overflow: hidden;
}

.archive-readiness-rate__fill {
  height: 100%;
  border-radius: 2px;
  background: var(--dp-warning, #f59e0b);
  transition: width 200ms ease;
}

.archive-readiness-rate__fill--done {
  background: var(--dp-success, #16a34a);
}

.archive-readiness-rate__pct {
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dp-warning, #f59e0b);
}

.archive-readiness-rate__pct--done {
  color: var(--dp-success, #16a34a);
}
</style>
