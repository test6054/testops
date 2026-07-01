<template>
  <UiStatisticChartCard
    class="mark-chart-card"
    :title="title"
    :description="description"
    :loading="loading"
    :chart-min-height="chartMinHeight"
    compact
  >
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>

    <template #chart>
      <slot />
    </template>
  </UiStatisticChartCard>
</template>

<script lang="ts" setup>
import UiStatisticChartCard from '@/components/ui-guide/ui/UiStatisticChartCard.vue'

defineOptions({ name: 'MarkChartCard' })

withDefaults(
  defineProps<{
    title?: string
    description?: string
    loading?: boolean
    chartMinHeight?: string | number
  }>(),
  {
    title: '',
    description: '',
    loading: false,
    chartMinHeight: 300,
  },
)
</script>

<style scoped>
.mark-chart-card {
  height: 100%;
  border-color: var(--dp-border, #e5e7eb);
  box-shadow: none;
}

.mark-chart-card :deep(.ui-statistic-chart-card__main) {
  display: flex;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  overflow: hidden;
  background: var(--dp-surface, #fff);
}
</style>
