<template>
  <section v-if="visibleGroups.length" class="quality-workbench-charts">
    <MarkBarSection
      v-for="group in sectionViews"
      :key="group.key"
      :title="group.title"
      :hint="group.hint"
      :item-count="group.items.length"
      :option="group.option"
      :height="group.height || defaultHeight"
      :aria-label="`${group.title}，共 ${group.items.length} 项`"
      class="quality-workbench-charts__section"
    />
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { MarkBarSection } from '@/components/chart'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import type { QualityChartGroup } from '@/utils/quality-workbench-charts'

defineOptions({ name: 'QualityWorkbenchCharts' })

const props = withDefaults(defineProps<{
  groups: QualityChartGroup[]
  defaultHeight?: string
  visible?: boolean
}>(), {
  defaultHeight: '220px',
  visible: true,
})

const visibleGroups = computed(() =>
  props.visible ? props.groups.filter((group) => group.items.length > 0) : [],
)

const sectionViews = computed(() =>
  visibleGroups.value.map((group) => ({
    ...group,
    option: buildCategoryBarChartOption(group.items, {
      orientation: 'vertical',
      yAxisName: '数量',
      emptyText: '暂无统计数据',
    }),
  })),
)
</script>

<style lang="scss" scoped>
.quality-workbench-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--dp-space-4, 16px);
  margin-bottom: var(--dp-space-4, 16px);
}

.quality-workbench-charts__section {
  min-width: 0;
}
</style>
