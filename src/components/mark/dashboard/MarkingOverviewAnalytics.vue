<template>
  <a-spin :spinning="loading" wrapper-class-name="marking-overview-analytics-spin">
    <div class="marking-overview-analytics">
      <UiCard title="旅程阶段分布" :description="scopeHint" bordered compact>
        <MarkBarSection
          title="各阶段考试数"
          :hint="journeyStageHint"
          :item-count="journeyStageItems.length"
          :option="journeyStageOption"
          height="var(--dp-chart-height-md)"
          empty-description="当前筛选下暂无考试"
          class="marking-overview-analytics__section"
        />
      </UiCard>

      <UiCard title="筛选域阅卷进度" :description="scopeHint" bordered compact>
        <MarkBarSection
          title="阅卷进度汇总"
          :hint="markingProgressHint"
          :item-count="markingProgressItems.length"
          :option="markingProgressOption"
          height="var(--dp-chart-height-md)"
          empty-description="当前筛选下暂无阅卷进度"
          class="marking-overview-analytics__section"
        />
      </UiCard>

      <UiCard title="待办类型构成" :description="scopeHint" bordered compact>
        <MarkBarSection
          title="待办类型分布"
          :hint="todoTypeHint"
          :item-count="todoTypeItems.length"
          :option="todoTypeOption"
          height="var(--dp-chart-height-sm)"
          empty-description="当前筛选下暂无待办"
          class="marking-overview-analytics__section"
        />
      </UiCard>
    </div>
  </a-spin>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import type {
  MarkTeacherDashboardJourneyStageSummaryItemVO,
  MarkTeacherDashboardMarkingProgressSummaryVO,
  MarkTeacherDashboardTodoTypeSummaryItemVO,
} from '@/apis/mark/teacher-dashboard'
import { computed } from 'vue'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import {
  buildJourneyStageChartItems,
  buildMarkingProgressChartItems,
  buildTodoTypeChartItems,
  filterScopeHint,
} from '@/utils/mark-dashboard-charts'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'

defineOptions({ name: 'MarkingOverviewAnalytics' })

const props = withDefaults(
  defineProps<{
    journeyStageSummary: MarkTeacherDashboardJourneyStageSummaryItemVO[]
    markingProgressSummary: MarkTeacherDashboardMarkingProgressSummaryVO
    todoTypeSummary: MarkTeacherDashboardTodoTypeSummaryItemVO[]
    filteredExamCount: number
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const scopeHint = computed(() => filterScopeHint(props.filteredExamCount))

const journeyStageItems = computed(() => {
  if (props.filteredExamCount <= 0) {
    return []
  }
  return buildJourneyStageChartItems(props.journeyStageSummary)
})

const markingProgressItems = computed(() =>
  buildMarkingProgressChartItems(props.markingProgressSummary),
)

const todoTypeItems = computed(() => buildTodoTypeChartItems(props.todoTypeSummary))

const journeyStageHint = computed(() =>
  mergeChartHint(
    scopeHint.value,
    buildBarChartInsight(journeyStageItems.value, { valueUnit: ' 场' }),
  ),
)

const markingProgressHint = computed(() =>
  mergeChartHint(
    scopeHint.value,
    buildBarChartInsight(markingProgressItems.value, { valueUnit: ' 项' }),
  ),
)

const todoTypeHint = computed(() =>
  mergeChartHint(scopeHint.value, buildBarChartInsight(todoTypeItems.value, { valueUnit: ' 项' })),
)

const journeyStageOption = computed((): EChartsCoreOption =>
  buildCategoryBarChartOption(journeyStageItems.value, {
    yAxisName: '场',
    emptyText: '当前筛选下暂无考试',
  }),
)

const markingProgressOption = computed((): EChartsCoreOption =>
  buildCategoryBarChartOption(markingProgressItems.value, {
    yAxisName: '数量',
    emptyText: '当前筛选下暂无阅卷进度',
  }),
)

const todoTypeOption = computed((): EChartsCoreOption =>
  buildCategoryBarChartOption(todoTypeItems.value, {
    yAxisName: '项',
    emptyText: '当前筛选下暂无待办',
  }),
)
</script>

<style scoped>
:deep(.marking-overview-analytics-spin) {
  display: block;
  width: 100%;
}

.marking-overview-analytics {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.marking-overview-analytics__section :deep(.mark-bar-section__head) {
  display: none;
}
</style>
