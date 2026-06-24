<template>
  <div class="marking-overview-analytics">
    <UiCard title="旅程阶段分布" :description="scopeHint">
      <MarkBarSection
        title="各阶段考试数"
        :hint="scopeHint"
        :item-count="journeyStageItems.length"
        :option="journeyStageOption"
        height="220px"
        empty-description="当前筛选下暂无考试"
        class="marking-overview-analytics__section"
      />
    </UiCard>

    <UiCard title="筛选域阅卷进度" :description="scopeHint">
      <MarkBarSection
        title="阅卷进度汇总"
        :hint="scopeHint"
        :item-count="markingProgressItems.length"
        :option="markingProgressOption"
        height="220px"
        empty-description="当前筛选下暂无阅卷进度"
        class="marking-overview-analytics__section"
      />
    </UiCard>

    <UiCard title="待办类型构成" :description="scopeHint">
      <MarkBarSection
        title="待办类型分布"
        :hint="scopeHint"
        :item-count="todoTypeItems.length"
        :option="todoTypeOption"
        height="200px"
        empty-description="当前筛选下暂无待办"
        class="marking-overview-analytics__section"
      />
    </UiCard>
  </div>
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
import {
  buildJourneyStageChartItems,
  buildMarkingProgressChartItems,
  buildTodoTypeChartItems,
  filterScopeHint,
} from '@/utils/mark-dashboard-charts'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'

defineOptions({ name: 'MarkingOverviewAnalytics' })

const props = defineProps<{
  journeyStageSummary: MarkTeacherDashboardJourneyStageSummaryItemVO[]
  markingProgressSummary: MarkTeacherDashboardMarkingProgressSummaryVO
  todoTypeSummary: MarkTeacherDashboardTodoTypeSummaryItemVO[]
  filteredExamCount: number
}>()

const scopeHint = computed(() => filterScopeHint(props.filteredExamCount))

const journeyStageItems = computed(() => {
  if (props.filteredExamCount <= 0) {
    return []
  }
  return buildJourneyStageChartItems(props.journeyStageSummary)
})

const markingProgressItems = computed(() => buildMarkingProgressChartItems(props.markingProgressSummary))

const todoTypeItems = computed(() => buildTodoTypeChartItems(props.todoTypeSummary))

const journeyStageOption = computed((): EChartsCoreOption => buildCategoryBarChartOption(
  journeyStageItems.value,
  { yAxisName: '场', emptyText: '当前筛选下暂无考试' },
))

const markingProgressOption = computed((): EChartsCoreOption => buildCategoryBarChartOption(
  markingProgressItems.value,
  { yAxisName: '数量', emptyText: '当前筛选下暂无阅卷进度' },
))

const todoTypeOption = computed((): EChartsCoreOption => buildCategoryBarChartOption(
  todoTypeItems.value,
  { yAxisName: '项', emptyText: '当前筛选下暂无待办' },
))
</script>

<style scoped>
.marking-overview-analytics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.marking-overview-analytics__section :deep(.mark-bar-section__head) {
  display: none;
}
</style>
