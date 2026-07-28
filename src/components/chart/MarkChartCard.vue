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
      <UiEmpty
        v-if="errorText"
        size="sm"
        title="图表加载失败"
        :description="errorText"
      >
        <template #action>
          <UiButton size="sm" variant="outline" @click="emit('retry')">重新加载</UiButton>
        </template>
      </UiEmpty>
      <slot v-else />
    </template>
  </UiStatisticChartCard>
</template>

<script lang="ts" setup>
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiStatisticChartCard from '@/components/ui-guide/ui/UiStatisticChartCard.vue'

defineOptions({ name: 'MarkChartCard' })

withDefaults(
  defineProps<{
    title?: string
    description?: string
    loading?: boolean
    chartMinHeight?: string | number
    errorText?: string
  }>(),
  {
    title: '',
    description: '',
    loading: false,
    chartMinHeight: 300,
    errorText: '',
  },
)

const emit = defineEmits<{
  retry: []
}>()
</script>

<style scoped>
.mark-chart-card {
  height: 100%;
  border-color: var(--dp-border);
  box-shadow: none;
}

.mark-chart-card :deep(.ui-statistic-chart-card__main) {
  display: flex;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  overflow: hidden;
  background: var(--dp-surface);
}
</style>
