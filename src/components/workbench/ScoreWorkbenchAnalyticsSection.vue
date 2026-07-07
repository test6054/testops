<template>
  <section v-if="visible" class="score-workbench-analytics">
    <div v-if="hasDistribution" class="score-workbench-analytics__grid">
      <WorkbenchSurfaceCard class="score-workbench-analytics__card">
        <template #head>
          <h3 class="score-workbench-analytics__title">成绩分布</h3>
        </template>
        <template v-if="participantLabel" #toolbar>
          <span class="score-workbench-analytics__hint">{{ participantLabel }}</span>
        </template>
        <a-skeleton v-if="loading" active :paragraph="{ rows: 4 }" />
        <MarkBarSection
          v-else
          title=""
          :hint="chartHint"
          :item-count="histogramBarItems.length"
          :option="histogramChartOption"
          height="280px"
          :aria-label="histogramChartAriaLabel"
          class="score-workbench-analytics__chart"
        />
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard class="score-workbench-analytics__card">
        <template #head>
          <h3 class="score-workbench-analytics__title">{{ overviewTitle }}</h3>
        </template>
        <a-skeleton v-if="loading" active :paragraph="{ rows: 4 }" />
        <template v-else>
          <div class="score-workbench-analytics__stat-grid">
            <div v-for="item in statItems" :key="item.key" class="stat-card">
              <div class="stat-card__val" :class="item.valClass">{{ item.value }}</div>
              <div class="stat-card__label">{{ item.label }}</div>
            </div>
          </div>
          <ScoreAnalyticsStatusFlow :steps="flowSteps" />
        </template>
      </WorkbenchSurfaceCard>
    </div>

    <WorkbenchSurfaceCard v-else flush class="score-workbench-analytics__workflow">
      <template #head>
        <h3 class="score-workbench-analytics__title">{{ overviewTitle }}</h3>
      </template>
      <a-skeleton v-if="loading" active :paragraph="{ rows: 2 }" />
      <ScoreAnalyticsStatusFlow
        v-else-if="overview && flowSteps.length > 0"
        :steps="flowSteps"
        standalone
      />
    </WorkbenchSurfaceCard>
  </section>
</template>

<script lang="ts" setup>
import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type { ScoreWorkbenchAnalyticsMode } from '@/utils/score-workbench-analytics'
import { computed } from 'vue'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import ScoreAnalyticsStatusFlow from '@/components/workbench/ScoreAnalyticsStatusFlow.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import { scoreHistogramToBarItems } from '@/utils/mark-statistics-chart'
import {
  buildScoreAnalyticsFlowSteps,
  buildScoreDistributionStatItems,
  resolveScoreAnalyticsOverviewTitle,
} from '@/utils/score-workbench-analytics'

defineOptions({ name: 'ScoreWorkbenchAnalyticsSection' })

const props = withDefaults(
  defineProps<{
    panel: ExamWorkbenchScorePanelResponse | null
    loading?: boolean
    mode?: ScoreWorkbenchAnalyticsMode
    publishableCount?: number
  }>(),
  {
    loading: false,
    mode: 'confirm',
    publishableCount: 0,
  },
)

const visible = computed(() => props.panel != null)
const overview = computed(() => props.panel?.riskOverview ?? null)
const hasDistribution = computed(() => Boolean(props.panel?.distributionAvailable))

const overviewTitle = computed(() =>
  resolveScoreAnalyticsOverviewTitle(hasDistribution.value, props.mode),
)

const statItems = computed(() => {
  const panel = props.panel
  const riskOverview = overview.value
  if (!panel || !riskOverview || !hasDistribution.value) {
    return []
  }
  return buildScoreDistributionStatItems(panel, props.mode, props.publishableCount)
})

const flowSteps = computed(() => {
  const riskOverview = overview.value
  if (!riskOverview) {
    return []
  }
  return buildScoreAnalyticsFlowSteps(riskOverview, props.mode, props.publishableCount)
})

const histogramBarItems = computed(() => {
  const panel = props.panel
  if (!panel?.ranges?.length || !panel.counts?.length) {
    return []
  }
  return scoreHistogramToBarItems(
    { ranges: panel.ranges, counts: panel.counts },
    { includeZeroBuckets: true },
  )
})

const chartHint = computed(() => {
  const panel = props.panel
  if (!panel?.participantCount) {
    return mergeChartHint(
      undefined,
      buildBarChartInsight(histogramBarItems.value, { valueUnit: ' 人' }),
    )
  }
  const passRate = panel.passRate != null ? `${panel.passRate}%` : '—'
  return `${panel.participantCount} 人参考，及格率 ${passRate}`
})

const { chartOption: histogramChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(histogramBarItems.value, {
    orientation: 'vertical',
    yAxisName: '人数',
    emptyText: '暂无分数段数据',
    innerCountLabel: true,
  }),
)

const histogramChartAriaLabel = computed(() => {
  const count = histogramBarItems.value.length
  if (count <= 0) {
    return '成绩分布，暂无数据'
  }
  return `成绩分布，共 ${count} 个分数段`
})

const participantLabel = computed(() => {
  const count = props.panel?.participantCount
  return count != null && count > 0 ? `${count} 人参考` : ''
})
</script>

<style lang="scss" scoped>
.score-workbench-analytics {
  margin-top: var(--dp-space-3, 12px);

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dp-space-4, 16px);

    @media (min-width: 992px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__title {
    margin: 0;
    font-size: var(--dp-type-body-size, 14px);
    font-weight: var(--dp-font-weight-title, 600);
    color: var(--dp-text-primary, #0f172a);
  }

  &__hint {
    font-size: var(--dp-type-hint-size, 12px);
    color: var(--dp-text-muted, #64748b);
  }

  &__chart {
    width: 100%;
  }

  &__stat-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--dp-space-3, 12px);
  }
}
</style>
