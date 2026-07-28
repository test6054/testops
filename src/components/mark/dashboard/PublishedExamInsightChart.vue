<template>
  <section class="published-insight-chart">
    <header class="published-insight-chart__head">
      <strong class="published-insight-chart__title">均分 / 及格率</strong>
    </header>
    <UiEmpty
      v-if="!chartExams.length"
      size="sm"
      description="暂无已发布学情可对比"
      class="published-insight-chart__empty"
    />
    <MarkChart
      v-else
      :option="chartOption"
      height="var(--dp-chart-height-md)"
      :aria-label="chartAriaLabel"
      class="published-insight-chart__canvas"
    />
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import type { MarkTeacherDashboardPublishedExamInsightItemVO } from '@/apis/mark/teacher-dashboard'
import { computed, defineAsyncComponent } from 'vue'

defineOptions({ name: 'PublishedExamInsightChart' })
const props = defineProps<{
  insights: MarkTeacherDashboardPublishedExamInsightItemVO[]
}>()
const MarkChart = defineAsyncComponent(() => import('@/components/chart/MarkChart.vue'))
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { buildPublishedInsightChartExams } from '@/utils/mark-dashboard-charts'
import { buildDashboardPublishedInsightChartOption } from '@/utils/mark-echarts-options'

const chartExams = computed(() => buildPublishedInsightChartExams(props.insights))

const chartOption = computed((): EChartsCoreOption =>
  buildDashboardPublishedInsightChartOption(chartExams.value),
)

const chartAriaLabel = computed(() => {
  const count = chartExams.value.length
  return count > 0 ? `已发布学情对比，共 ${count} 场考试` : '暂无已发布学情'
})
</script>

<style scoped>
.published-insight-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: var(--dp-chart-height-md);
}

.published-insight-chart__head {
  margin-bottom: var(--dp-space-component);
}

.published-insight-chart__title {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.published-insight-chart__empty {
  flex: 1;
  min-height: var(--dp-chart-empty-min-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dp-surface);
}

.published-insight-chart__canvas {
  width: 100%;
}
</style>
