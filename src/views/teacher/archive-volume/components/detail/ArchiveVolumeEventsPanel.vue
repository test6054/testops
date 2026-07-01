<template>
  <section class="archive-volume-events-panel">
    <ArchiveVolumeEventsTimeline :events="events" />
  </section>
</template>

<script setup lang="ts">
import type { ArchiveVolumeDetailVO } from '@/apis/mark/archive-volume'
import ArchiveVolumeEventsTimeline from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeEventsTimeline.vue'

defineOptions({ name: 'ArchiveVolumeEventsPanel' })

defineProps<{
  events: ArchiveVolumeDetailVO['events']
}>()
</script>

<style scoped>
.archive-volume-events-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}
</style>
