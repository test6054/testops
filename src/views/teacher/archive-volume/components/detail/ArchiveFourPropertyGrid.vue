<template>
  <div class="integrity-grid">
    <article
      v-for="item in dimensionViews"
      :key="item.key"
      class="integrity-item"
      :class="item.passed ? 'integrity-item--pass' : 'integrity-item--fail'"
    >
      <div class="integrity-icon">{{ item.passed ? '✓' : '✗' }}</div>
      <div class="integrity-label">{{ item.label }}</div>
      <div class="integrity-desc">{{ item.description }}</div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { ArchiveFourPropertyCheckResponse } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import { buildFourPropertyDimensionViews } from '@/utils/archive-four-property-diagnostic'

defineOptions({ name: 'ArchiveFourPropertyGrid' })

const props = defineProps<{
  check: ArchiveFourPropertyCheckResponse | null | undefined
}>()

const dimensionViews = computed(() => buildFourPropertyDimensionViews(props.check))
</script>
