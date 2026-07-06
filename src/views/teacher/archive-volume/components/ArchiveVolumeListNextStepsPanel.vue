<template>
  <section class="archive-list-next-steps">
    <header class="archive-list-next-steps__head">
      <span class="archive-list-next-steps__head-icon" aria-hidden="true">⏱</span>
      <h3 class="archive-list-next-steps__title">下一步行动</h3>
    </header>
    <div class="archive-list-next-steps__grid">
      <button
        v-for="step in steps"
        :key="step.key"
        type="button"
        class="archive-list-next-steps__item"
        @click="navigate(step)"
      >
        <div class="archive-list-next-steps__item-head">
          <span class="archive-list-next-steps__item-icon">{{ step.icon }}</span>
          <span class="archive-list-next-steps__item-label">{{ step.label }}</span>
        </div>
        <p class="archive-list-next-steps__item-desc">{{ step.description }}</p>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  ArchiveSatelliteNextStep,
  ArchiveSatelliteNextStepsVariant,
} from '@/views/teacher/archive-volume/constants/archiveSatelliteNextSteps'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ARCHIVE_SATELLITE_NEXT_STEPS } from '@/views/teacher/archive-volume/constants/archiveSatelliteNextSteps'

defineOptions({ name: 'ArchiveVolumeListNextStepsPanel' })

const props = withDefaults(defineProps<{
  variant?: ArchiveSatelliteNextStepsVariant
}>(), {
  variant: 'list',
})

const router = useRouter()

const steps = computed<ArchiveSatelliteNextStep[]>(() => ARCHIVE_SATELLITE_NEXT_STEPS[props.variant])

function navigate(step: ArchiveSatelliteNextStep): void {
  void router.push({
    name: step.routeName,
    query: step.routeQuery,
  })
}
</script>

<style scoped>
.archive-list-next-steps {
  margin-top: var(--dp-space-3, 12px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  border: 1px solid var(--dp-border-light, #eef0f3);
  border-radius: var(--dp-radius-md, 6px);
  background: var(--dp-surface, #fff);
}

.archive-list-next-steps__head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-list-next-steps__head-icon {
  font-size: 14px;
  line-height: 1;
  color: var(--dp-primary, #2d7ff9);
}

.archive-list-next-steps__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text, #1a1d21);
}

.archive-list-next-steps__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3, 12px);
}

.archive-list-next-steps__item {
  flex: 1 1 160px;
  min-width: 0;
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border-light, #eef0f3);
  border-radius: var(--dp-radius-sm, 4px);
  background: var(--dp-surface, #fff);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.archive-list-next-steps__item:hover {
  border-color: var(--dp-primary, #2d7ff9);
  box-shadow: 0 2px 8px rgba(45, 127, 249, 0.08);
}

.archive-list-next-steps__item-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  margin-bottom: 4px;
}

.archive-list-next-steps__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--dp-radius-xs, 2px);
  background: color-mix(in srgb, var(--dp-primary, #2d7ff9) 10%, transparent);
  color: var(--dp-primary, #2d7ff9);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.archive-list-next-steps__item-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text, #1a1d21);
}

.archive-list-next-steps__item-desc {
  margin: 0;
  padding-left: 30px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-4, #8b919a);
}
</style>
