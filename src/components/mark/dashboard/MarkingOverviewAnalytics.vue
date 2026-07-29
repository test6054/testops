<template>
  <UiSpin :spinning="loading" wrapper-class-name="marking-overview-analytics-spin">
    <section class="marking-overview-analytics" aria-label="阅卷概览分析">
      <!-- A′ 默认：折叠钉条 = spark + 一行摘要 + 展开 -->
      <div class="marking-overview-analytics__pin">
        <div class="marking-overview-analytics__pin-main">
          <span class="marking-overview-analytics__pin-kicker">近 14 日进度</span>
          <span
            v-if="sparkPolyline"
            class="marking-overview-analytics__spark"
            aria-hidden="true"
          >
            <svg viewBox="0 0 80 18" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                :points="sparkPolyline"
              />
            </svg>
          </span>
          <p class="marking-overview-analytics__pin-summary">{{ trendHint }}</p>
          <span class="marking-overview-analytics__pin-scope">{{ scopeHint }}</span>
        </div>
        <UiButton
          variant="outline"
          size="sm"
          class="marking-overview-analytics__toggle"
          :aria-expanded="expanded"
          aria-controls="marking-overview-analytics-detail"
          @click="toggleExpanded"
        >
          {{ expanded ? '收起趋势' : '展开趋势' }}
        </UiButton>
      </div>

      <div
        v-if="expanded"
        id="marking-overview-analytics-detail"
        class="marking-overview-analytics__detail"
      >
        <!-- flush 全宽双折线：无厚卡壳 -->
        <div class="marking-overview-analytics__trend marking-overview-analytics__trend--flush">
          <header class="marking-overview-analytics__head">
            <div class="marking-overview-analytics__head-main">
              <h3 class="marking-overview-analytics__title">确认题量 / 发布成绩</h3>
              <p class="marking-overview-analytics__desc">
                日趋势 · 确认题 CONFIRMED · 发布成绩 PUBLISHED
              </p>
            </div>
          </header>
          <MarkTrendSection
            title=""
            :point-count="trendChartPointCount"
            :min-points="1"
            :option="dailyTrendOption"
            height="200px"
            empty-description="当前筛选下近 14 日暂无确认或发布记录"
            :aria-label="trendAriaLabel"
            class="marking-overview-analytics__trend-chart"
          />
        </div>

        <div class="marking-overview-analytics__grid">
          <div class="marking-overview-analytics__panel">
            <header class="marking-overview-analytics__head marking-overview-analytics__head--compact">
              <h3 class="marking-overview-analytics__title">旅程阶段分布</h3>
              <span class="marking-overview-analytics__hint">{{ journeyStageHint }}</span>
            </header>
            <MarkBarSection
              title="各阶段考试数"
              :item-count="journeyStageItems.length"
              :option="journeyStageOption"
              height="var(--dp-chart-height-sm)"
              empty-description="当前筛选下暂无考试"
              class="marking-overview-analytics__section"
            />
          </div>

          <div class="marking-overview-analytics__panel">
            <header class="marking-overview-analytics__head marking-overview-analytics__head--compact">
              <h3 class="marking-overview-analytics__title">待办类型构成</h3>
              <span class="marking-overview-analytics__hint">{{ todoTypeHint }}</span>
            </header>
            <MarkBarSection
              title="待办类型分布"
              :item-count="todoTypeItems.length"
              :option="todoTypeOption"
              height="var(--dp-chart-height-sm)"
              empty-description="当前筛选下暂无待办"
              class="marking-overview-analytics__section"
            />
          </div>
        </div>
      </div>
    </section>
  </UiSpin>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import type {
  MarkTeacherDashboardDailyTrendItemVO,
  MarkTeacherDashboardJourneyStageSummaryItemVO,
  MarkTeacherDashboardTodoTypeSummaryItemVO,
} from '@/apis/mark/teacher-dashboard'
import { computed, ref, watch } from 'vue'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import {
  buildJourneyStageChartItems,
  buildTodoTypeChartItems,
  filterScopeHint,
} from '@/utils/mark-dashboard-charts'
import {
  buildCategoryBarChartOption,
  buildDualTrendLineChartOption,
  MARK_ECHARTS_PALETTE,
} from '@/utils/mark-echarts-options'

defineOptions({ name: 'MarkingOverviewAnalytics' })

const props = withDefaults(
  defineProps<{
    journeyStageSummary: MarkTeacherDashboardJourneyStageSummaryItemVO[]
    todoTypeSummary: MarkTeacherDashboardTodoTypeSummaryItemVO[]
    dailyProgressTrend?: MarkTeacherDashboardDailyTrendItemVO[]
    filteredExamCount: number
    loading?: boolean
  }>(),
  {
    dailyProgressTrend: () => [],
    loading: false,
  },
)

const EXPANDED_SESSION_KEY = 'marking-overview-analytics-expanded'

function readExpandedPreference(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(EXPANDED_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

const expanded = ref(readExpandedPreference())

function toggleExpanded() {
  expanded.value = !expanded.value
}

watch(expanded, (value) => {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(EXPANDED_SESSION_KEY, value ? '1' : '0')
  } catch {
    // 会话存储不可用时忽略，展开态仅本会话内存有效
  }
})

const scopeHint = computed(() => filterScopeHint(props.filteredExamCount))

const trendPoints = computed(() => props.dailyProgressTrend ?? [])

const trendPointCount = computed(() => trendPoints.value.length)

const trendHasActivity = computed(() =>
  trendPoints.value.some(
    (point) => point.confirmedGradeCount > 0 || point.publishedScoreCount > 0,
  ),
)

/** 无确认/发布活动时按 0 点交给 MarkTrendSection 空壳，禁止用占位点撑成 ready。 */
const trendChartPointCount = computed(() =>
  trendHasActivity.value ? trendPointCount.value : 0,
)

const trendCategories = computed(() =>
  trendPoints.value.map((point) => formatDayLabel(point.day)),
)

const confirmedSeries = computed(() =>
  trendPoints.value.map((point) => point.confirmedGradeCount),
)

const publishedSeries = computed(() =>
  trendPoints.value.map((point) => point.publishedScoreCount),
)

const confirmedTotal = computed(() =>
  confirmedSeries.value.reduce((sum, value) => sum + value, 0),
)

const publishedTotal = computed(() =>
  publishedSeries.value.reduce((sum, value) => sum + value, 0),
)

const TREND_EMPTY_DESCRIPTION = '当前筛选下近 14 日暂无确认或发布记录'

const trendHint = computed(() => {
  if (!trendPointCount.value) {
    return '加载筛选域内确认题量与发布成绩的日趋势'
  }
  if (!trendHasActivity.value) {
    return '近 14 日暂无确认题或发布成绩'
  }
  return `确认 ${confirmedTotal.value.toLocaleString('zh-CN')} 题 · 发布 ${publishedTotal.value.toLocaleString('zh-CN')} 份`
})

const trendAriaLabel = computed(() => {
  if (!trendHasActivity.value || !trendPointCount.value) {
    return '近14日进度趋势，当前筛选范围无记录'
  }
  return `近14日进度趋势，确认题量 ${confirmedTotal.value}，发布成绩 ${publishedTotal.value}`
})

/** 折叠钉条 spark：仅绑真实 confirmed 序列，不编造 */
const sparkPolyline = computed(() => {
  const values = confirmedSeries.value
  if (!values.length || !trendHasActivity.value) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const n = values.length
  return values
    .map((value, index) => {
      const x = n === 1 ? 40 : (index / (n - 1)) * 80
      const y = 16 - ((value - min) / range) * 14
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const dailyTrendOption = computed((): EChartsCoreOption => {
  if (!trendHasActivity.value || !trendPointCount.value) {
    return buildDualTrendLineChartOption(
      [],
      { name: '确认题量', values: [], color: MARK_ECHARTS_PALETTE.primary },
      { name: '发布成绩', values: [], color: MARK_ECHARTS_PALETTE.success },
      {
        yAxisName: '数量',
        area: true,
        emptyText: TREND_EMPTY_DESCRIPTION,
      },
    )
  }
  return buildDualTrendLineChartOption(
    trendCategories.value,
    {
      name: '确认题量',
      values: confirmedSeries.value,
      color: MARK_ECHARTS_PALETTE.primary,
    },
    {
      name: '发布成绩',
      values: publishedSeries.value,
      color: MARK_ECHARTS_PALETTE.success,
    },
    {
      yAxisName: '数量',
      area: true,
    },
  )
})

const journeyStageItems = computed(() => {
  if (props.filteredExamCount <= 0) {
    return []
  }
  return buildJourneyStageChartItems(props.journeyStageSummary)
})

const todoTypeItems = computed(() => buildTodoTypeChartItems(props.todoTypeSummary))

const journeyStageHint = computed(() =>
  mergeChartHint(
    scopeHint.value,
    buildBarChartInsight(journeyStageItems.value, { valueUnit: ' 场' }),
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

const todoTypeOption = computed((): EChartsCoreOption =>
  buildCategoryBarChartOption(todoTypeItems.value, {
    yAxisName: '项',
    emptyText: '当前筛选下暂无待办',
  }),
)

function formatDayLabel(day: string): string {
  const raw = day.trim()
  if (!raw) {
    throw new Error('日趋势点缺少 day，不能用占位类目绘制图表')
  }
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return `${match[2]}-${match[3]}`
  }
  return raw
}
</script>

<style scoped lang="scss">
:deep(.marking-overview-analytics-spin) {
  display: block;
  width: 100%;
}

.marking-overview-analytics {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

/* Cloudscape 运营钉条：扁、边框优先、无厚阴影 */
.marking-overview-analytics__pin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  min-height: 44px;
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control-inner);
}

.marking-overview-analytics__pin-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight) var(--dp-space-component);
  min-width: 0;
  flex: 1;
}

.marking-overview-analytics__pin-kicker {
  flex-shrink: 0;
  font-size: var(--dp-type-label-size);
  font-weight: var(--dp-type-label-weight);
  line-height: var(--dp-type-label-line-height);
  color: var(--dp-text-muted);
}

.marking-overview-analytics__spark {
  display: block;
  width: 72px;
  height: 18px;
  flex-shrink: 0;
  color: var(--dp-color-primary);
}

.marking-overview-analytics__spark svg {
  display: block;
  width: 100%;
  height: 100%;
}

.marking-overview-analytics__pin-summary {
  margin: 0;
  min-width: 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.4;
  color: var(--dp-text-primary);
}

.marking-overview-analytics__pin-scope {
  flex-shrink: 0;
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
  white-space: nowrap;
}

.marking-overview-analytics__toggle {
  flex-shrink: 0;
}

.marking-overview-analytics__detail {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

/* flush 趋势：浅边框面，非装饰卡墙 */
.marking-overview-analytics__trend {
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  padding: var(--dp-space-component) var(--dp-space-block);
  box-shadow: none;
}

.marking-overview-analytics__trend--flush {
  border-radius: var(--dp-radius-control-inner);
}

.marking-overview-analytics__panel {
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control-inner);
  padding: var(--dp-space-component) var(--dp-space-block);
  box-shadow: none;
}

.marking-overview-analytics__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component-tight);
}

.marking-overview-analytics__head--compact {
  margin-bottom: var(--dp-space-component-xs);
}

.marking-overview-analytics__head-main {
  min-width: 0;
}

.marking-overview-analytics__title {
  margin: 0;
  font-size: var(--dp-type-label-size);
  font-weight: var(--dp-type-label-weight);
  line-height: var(--dp-type-label-line-height);
  color: var(--dp-text-secondary);
}

.marking-overview-analytics__desc,
.marking-overview-analytics__hint {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

.marking-overview-analytics__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-component);
}

.marking-overview-analytics__section :deep(.mark-bar-section__head) {
  display: none;
}

.marking-overview-analytics__trend-chart :deep(.mark-trend-section__head) {
  display: none;
}

@media (max-width: 960px) {
  .marking-overview-analytics__grid {
    grid-template-columns: 1fr;
  }

  .marking-overview-analytics__pin {
    align-items: flex-start;
  }

  .marking-overview-analytics__pin-scope {
    white-space: normal;
  }
}

@media (max-width: 600px) {
  .marking-overview-analytics__pin {
    flex-direction: column;
    align-items: stretch;
  }

  .marking-overview-analytics__pin-main {
    align-items: flex-start;
  }

  .marking-overview-analytics__toggle {
    align-self: flex-start;
  }
}
</style>
