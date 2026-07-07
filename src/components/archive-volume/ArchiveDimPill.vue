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
