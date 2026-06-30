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
import type { EChartsCoreOption } from 'echarts/core'
import type { QualityChartGroup } from '@/utils/quality-workbench-charts'
import { computed } from 'vue'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'

defineOptions({ name: 'QualityWorkbenchCharts' })

const props = withDefaults(defineProps<{
  groups: QualityChartGroup[]
  defaultHeight?: string
  visible?: boolean
}>(), {
  defaultHeight: '220px',
  visible: true,
})

interface ChartSectionView {
  key: string
  title: string
  hint?: string
  height?: string
  items: QualityChartGroup['items']
  option: EChartsCoreOption
}

/** 按 group.key + items 内容生成签名，避免数据未变时重复 buildCategoryBarChartOption */
function buildGroupSignature(group: QualityChartGroup): string {
  const itemSig = group.items.map((item) => `${item.label}\0${item.value}`).join('\n')
  return `${group.key}\0${group.title}\0${group.hint ?? ''}\0${itemSig}`
}

const optionCache = new Map<string, EChartsCoreOption>()

function resolveOption(group: QualityChartGroup): EChartsCoreOption {
  const signature = buildGroupSignature(group)
  const cached = optionCache.get(signature)
  if (cached) {
    return cached
  }
  const option = buildCategoryBarChartOption(group.items, {
    orientation: 'vertical',
    yAxisName: '数量',
    emptyText: '暂无统计数据',
    dataZoom: true,
  })
  optionCache.set(signature, option)
  if (optionCache.size > 48) {
    const firstKey = optionCache.keys().next().value
    if (firstKey) {
      optionCache.delete(firstKey)
    }
  }
  return option
}

const visibleGroups = computed(() =>
  props.visible ? props.groups.filter((group) => group.items.length > 0) : [],
)

const sectionViews = computed<ChartSectionView[]>(() =>
  visibleGroups.value.map((group) => ({
    key: group.key,
    title: group.title,
    hint: mergeChartHint(group.hint, buildBarChartInsight(group.items)),
    height: group.height,
    items: group.items,
    option: resolveOption(group),
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
