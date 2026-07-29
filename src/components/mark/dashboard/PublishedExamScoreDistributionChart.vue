<template>
  <section class="published-score-distribution-chart">
    <header class="published-score-distribution-chart__head">
      <strong class="published-score-distribution-chart__title">五级成绩分布</strong>
      <span class="published-score-distribution-chart__hint">已展示考试</span>
    </header>
    <UiEmpty
      v-if="!scoreLevels.some((item) => item.value > 0)"
      size="sm"
      description="暂无已发布成绩分布"
      class="published-score-distribution-chart__empty"
    />
    <MarkChart
      v-else
      :option="chartOption"
      height="var(--dp-chart-height-md)"
      aria-label="已发布考试五级成绩分布"
      class="published-score-distribution-chart__canvas"
    />
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import type { MarkTeacherDashboardPublishedExamInsightItemVO } from '@/apis/mark/teacher-dashboard'
import { computed, defineAsyncComponent } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { buildPublishedInsightScoreLevels } from '@/utils/mark-dashboard-charts'
import { buildDashboardFiveGradeDistributionChartOption } from '@/utils/mark-echarts-options'

defineOptions({ name: 'PublishedExamScoreDistributionChart' })

const props = defineProps<{ insights: MarkTeacherDashboardPublishedExamInsightItemVO[] }>()
const MarkChart = defineAsyncComponent(() => import('@/components/chart/MarkChart.vue'))
const scoreLevels = computed(() => buildPublishedInsightScoreLevels(props.insights))
const chartOption = computed((): EChartsCoreOption =>
  buildDashboardFiveGradeDistributionChartOption(scoreLevels.value),
)
</script>

<style scoped>
.published-score-distribution-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: var(--dp-chart-height-md);
}

.published-score-distribution-chart__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component);
}

.published-score-distribution-chart__title {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.published-score-distribution-chart__hint {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}

.published-score-distribution-chart__empty {
  flex: 1;
  min-height: var(--dp-chart-empty-min-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dp-surface);
}

.published-score-distribution-chart__canvas {
  width: 100%;
}
</style>
