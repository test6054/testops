<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts/core'
import type {
  PfSceneCode,
  PortfolioIndicatorCollegeCompareVO,
  PortfolioIndicatorDashboardSummaryVO,
  PortfolioIndicatorTeacherTypeCompareVO,
  PortfolioIndicatorTrendVO,
  PortfolioIndicatorUsageFrequencyVO,
} from '@/apis/portfolio/indicator-types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioIndicatorDashboardApi } from '@/apis/portfolio/indicator'
import { PF_SCENE_CODE_OPTIONS, PfSceneCodeDescription } from '@/apis/portfolio/indicator-types'
import MarkChart from '@/components/chart/MarkChart.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import {
  buildCategoryBarChartOption,
  buildTrendLineChartOption,
} from '@/utils/mark-echarts-options'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const sceneCode = ref<PfSceneCode | undefined>(undefined)
const dashboardRequestToken = ref(0)
const summary = ref<PortfolioIndicatorDashboardSummaryVO | null>(null)
const usageFrequency = ref<PortfolioIndicatorUsageFrequencyVO | null>(null)
const trend = ref<PortfolioIndicatorTrendVO | null>(null)
const collegeCompare = ref<PortfolioIndicatorCollegeCompareVO | null>(null)
const teacherTypeCompare = ref<PortfolioIndicatorTeacherTypeCompareVO | null>(null)

interface DashboardQuery {
  sceneCode?: PfSceneCode
  topLimit: number
}

const query = reactive<DashboardQuery>({
  topLimit: 15,
})

const signals = computed<SignalMetric[]>(() => {
  if (!summary.value) {
    return []
  }
  return [
    {
      key: 'platform',
      label: '平台指标',
      value: summary.value.platformIndicatorCount,
      tone: 'blue',
    },
    { key: 'enabled', label: '租户启用', value: summary.value.tenantEnabledCount, tone: 'green' },
    {
      key: 'disabled',
      label: '租户停用',
      value: summary.value.tenantDisabledCount,
      tone: 'orange',
    },
    {
      key: 'snapshot',
      label: '发布快照',
      value: summary.value.publishedSnapshotCount,
      tone: 'purple',
    },
    { key: 'compute', label: '计分日志', value: summary.value.computeLogCount, tone: 'gray' },
  ]
})

const dimensionChartOption = computed<EChartsCoreOption>(() =>
  buildCategoryBarChartOption(
    (summary.value?.dimensionStats ?? []).map((item) => ({
      key: item.dimensionL1Code,
      label: item.dimensionL1Name,
      value: item.totalCount,
      tone: 'blue',
    })),
    { yAxisName: '指标数', emptyText: '暂无维度分布' },
  ),
)

const enabledDimensionChartOption = computed<EChartsCoreOption>(() =>
  buildCategoryBarChartOption(
    (summary.value?.dimensionStats ?? []).map((item) => ({
      key: `${item.dimensionL1Code}-enabled`,
      label: item.dimensionL1Name,
      value: item.enabledCount,
      tone: 'green',
    })),
    { yAxisName: '启用数', emptyText: '暂无启用分布' },
  ),
)

const usageChartOption = computed<EChartsCoreOption>(() => {
  const grouped = new Map<string, number>()
  for (const item of usageFrequency.value?.items ?? []) {
    const label = `${item.indicatorCode} (${item.statYear})`
    grouped.set(label, (grouped.get(label) ?? 0) + item.usageCount)
  }
  return buildCategoryBarChartOption(
    [...grouped.entries()].map(([label, value], index) => ({
      key: `usage-${index}`,
      label,
      value,
      tone: 'blue',
    })),
    { orientation: 'horizontal', xAxisName: '使用次数', emptyText: '暂无近三年使用频次' },
  )
})

const trendChartOption = computed<EChartsCoreOption>(() =>
  buildTrendLineChartOption(
    (trend.value?.items ?? []).map((item) => ({
      key: String(item.statYear),
      label: String(item.statYear),
      value: item.computeLogCount,
    })),
    { yAxisName: '计分次数', area: true, emptyText: '暂无近五年趋势' },
  ),
)

const snapshotTrendChartOption = computed<EChartsCoreOption>(() =>
  buildTrendLineChartOption(
    (trend.value?.items ?? []).map((item) => ({
      key: `snapshot-${item.statYear}`,
      label: String(item.statYear),
      value: item.snapshotPublishCount,
    })),
    { yAxisName: '发布快照', emptyText: '暂无快照发布趋势' },
  ),
)

const collegeChartOption = computed<EChartsCoreOption>(() =>
  buildCategoryBarChartOption(
    (collegeCompare.value?.items ?? []).map((item) => ({
      key: item.collegeId,
      label: item.collegeName,
      value: item.usageCount,
      tone: 'purple',
    })),
    { yAxisName: '使用次数', emptyText: '暂无学院对比数据' },
  ),
)

const teacherTypeChartOption = computed<EChartsCoreOption>(() =>
  buildCategoryBarChartOption(
    (teacherTypeCompare.value?.items ?? []).map((item) => ({
      key: item.teacherTypeCode,
      label: item.teacherTypeLabel,
      value: item.usageCount,
      tone: 'orange',
    })),
    { yAxisName: '使用次数', emptyText: '暂无教师类型对比数据' },
  ),
)

async function loadDashboard() {
  const currentToken = ++dashboardRequestToken.value
  loading.value = true
  const requestQuery: DashboardQuery = {
    sceneCode: sceneCode.value,
    topLimit: query.topLimit,
  }
  try {
    try {
      summary.value = await portfolioIndicatorDashboardApi.summary(requestQuery)
    } catch (error) {
      if (currentToken !== dashboardRequestToken.value) {
        return
      }
      summary.value = null
      showUserError(error, '指标汇总加载失败')
    }
    if (currentToken !== dashboardRequestToken.value) {
      return
    }
    try {
      usageFrequency.value = await portfolioIndicatorDashboardApi.usageFrequency(requestQuery)
    } catch (error) {
      if (currentToken !== dashboardRequestToken.value) {
        return
      }
      usageFrequency.value = null
      showUserError(error, '指标使用频次加载失败')
    }
    if (currentToken !== dashboardRequestToken.value) {
      return
    }
    try {
      trend.value = await portfolioIndicatorDashboardApi.trend(requestQuery)
    } catch (error) {
      if (currentToken !== dashboardRequestToken.value) {
        return
      }
      trend.value = null
      showUserError(error, '指标趋势加载失败')
    }
    if (currentToken !== dashboardRequestToken.value) {
      return
    }
    try {
      collegeCompare.value = await portfolioIndicatorDashboardApi.collegeCompare(requestQuery)
    } catch (error) {
      if (currentToken !== dashboardRequestToken.value) {
        return
      }
      collegeCompare.value = null
      showUserError(error, '学院对比加载失败')
    }
    if (currentToken !== dashboardRequestToken.value) {
      return
    }
    try {
      teacherTypeCompare.value = await portfolioIndicatorDashboardApi.teacherTypeCompare(requestQuery)
    } catch (error) {
      if (currentToken !== dashboardRequestToken.value) {
        return
      }
      teacherTypeCompare.value = null
      showUserError(error, '教师类型对比加载失败')
    }
  } finally {
    if (currentToken === dashboardRequestToken.value) {
      loading.value = false
    }
  }
}

onMounted(loadDashboard)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="指标看板"
        :subtitle="
          sceneCode
            ? `${strictEnumLabel(PfSceneCodeDescription, sceneCode, '指标场景编码')} 统计`
            : ''
        "
      />
    </template>
    <div class="toolbar">
      <a-select
        v-model:value="sceneCode"
        allow-clear
        placeholder="全部场景"
        :options="PF_SCENE_CODE_OPTIONS"
        style="width: 140px"
      />
      <a-input-number v-model:value="query.topLimit" :min="5" :max="100" style="width: 120px" />
      <a-button type="primary" :loading="loading" @click="loadDashboard"> 刷新 </a-button>
    </div>
    <template #signal>
      <SignalBand v-if="summary" :metrics="signals" compact />
    </template>
    <a-spin :spinning="loading">
      <UiEmpty v-if="!loading && !summary" description="当前范围无指标看板数据" />
      <div v-else-if="summary" class="chart-grid">
        <UiCard title="一级维度分布">
          <MarkChart
            :option="dimensionChartOption"
            height="280px"
            aria-label="一级维度指标数量分布"
          />
        </UiCard>
        <UiCard title="维度启用分布">
          <MarkChart
            :option="enabledDimensionChartOption"
            height="280px"
            aria-label="一级维度启用指标分布"
          />
        </UiCard>
        <UiCard title="近三年使用频次">
          <MarkChart :option="usageChartOption" height="320px" aria-label="近三年指标使用频次" />
        </UiCard>
        <UiCard title="近五年计分趋势">
          <MarkChart :option="trendChartOption" height="280px" aria-label="近五年指标计分趋势" />
        </UiCard>
        <UiCard title="近五年快照发布">
          <MarkChart
            :option="snapshotTrendChartOption"
            height="280px"
            aria-label="近五年规则快照发布趋势"
          />
        </UiCard>
        <UiCard title="学院使用对比">
          <MarkChart :option="collegeChartOption" height="280px" aria-label="各学院指标使用对比" />
        </UiCard>
        <UiCard title="教师类型对比">
          <MarkChart
            :option="teacherTypeChartOption"
            height="280px"
            aria-label="各教师类型指标使用对比"
          />
        </UiCard>
      </div>
    </a-spin>
  </StageWorkbenchShell>
</template>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.dashboard__signals {
  margin-bottom: 16px;
}
.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
