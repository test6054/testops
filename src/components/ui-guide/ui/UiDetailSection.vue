<template>
  <UiCard class="ui-detail-section" bordered :hoverable="false" :compact="props.compact">
    <div class="ui-detail-section__header">
      <div class="ui-detail-section__meta">
        <div class="ui-detail-section__title">{{ props.title }}</div>
        <div v-if="props.subtitle" class="ui-detail-section__subtitle">{{ props.subtitle }}</div>
      </div>
      <div v-if="$slots.extra" class="ui-detail-section__extra">
        <slot name="extra" />
      </div>
    </div>
    <div class="ui-detail-section__body">
      <slot />
    </div>
  </UiCard>
</template>

<script lang="ts" setup>
import UiCard from './Card.vue'

defineOptions({
  name: 'UiDetailSection',
})

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    compact?: boolean
  }>(),
  {
    subtitle: '',
    compact: false,
  },
)
</script>

<style scoped>
.ui-detail-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.ui-detail-section__meta {
  min-width: 0;
  flex: 1;
}

.ui-detail-section__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary);
}

.ui-detail-section__subtitle {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted);
}

.ui-detail-section__extra {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.ui-detail-section__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
