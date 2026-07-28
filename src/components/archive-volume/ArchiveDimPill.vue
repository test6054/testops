<script setup lang="ts">
import type { ArchiveDimPillTone } from '@/utils/archive-dimension-pill'

defineOptions({ name: 'ArchiveDimPill' })

defineProps<{
  tone: ArchiveDimPillTone
  label: string
}>()
</script>

<template>
  <span class="dim-pill" :class="`dim-pill--${tone}`">{{ label }}</span>
</template>

<style scoped>
.dim-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px var(--dp-space-component-tight);
  border-radius: var(--dp-radius-xs);
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  line-height: var(--dp-type-label-line-height);
  white-space: nowrap;
}

.dim-pill--ok {
  background: var(--dp-green-50);
  color: var(--dp-green-700);
}

.dim-pill--warn {
  background: var(--dp-orange-50);
  color: var(--dp-orange-700);
}

.dim-pill--info {
  background: var(--dp-blue-50);
  color: var(--dp-blue-700);
}

.dim-pill--pending {
  color: var(--dp-text-muted);
  background: var(--dp-bg-muted);
  border: 1px solid var(--dp-border);
}

.dim-pill--error {
  background: var(--dp-red-50);
  color: var(--dp-red-700);
}
</style>
