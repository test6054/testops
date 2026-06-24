<template>
  <section class="published-insight-chart">
    <header class="published-insight-chart__head">
      <strong class="published-insight-chart__title">均分 / 及格率</strong>
      <span class="published-insight-chart__hint">已发布成绩考试</span>
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
      height="220px"
      :aria-label="chartAriaLabel"
      class="published-insight-chart__canvas"
    />
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import type { MarkTeacherDashboardPublishedExamInsightItemVO } from '@/apis/mark/teacher-dashboard'
import { computed } from 'vue'
import MarkChart from '@/components/chart/MarkChart.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { buildPublishedInsightChartExams } from '@/utils/mark-dashboard-charts'
import { buildDashboardPublishedInsightChartOption } from '@/utils/mark-echarts-options'

defineOptions({ name: 'PublishedExamInsightChart' })

const props = defineProps<{
  insights: MarkTeacherDashboardPublishedExamInsightItemVO[]
}>()

const chartExams = computed(() => buildPublishedInsightChartExams(props.insights))

const chartOption = computed((): EChartsCoreOption => buildDashboardPublishedInsightChartOption(chartExams.value))

const chartAriaLabel = computed(() => {
  const count = chartExams.value.length
  return count > 0 ? `已发布学情对比，共 ${count} 场考试` : '暂无已发布学情'
})
</script>

<style scoped>
.published-insight-chart__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.published-insight-chart__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.published-insight-chart__hint {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}

.published-insight-chart__empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.published-insight-chart__canvas {
  width: 100%;
}
</style>
