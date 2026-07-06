<template>
  <WorkbenchSurfaceCard class="stats-card">
    <template #head>
      <h3 class="stats-card__title">成绩分数分布</h3>
    </template>
    <template #toolbar>
      <a-space>
        <a-select
          :value="props.classId"
          placeholder="全场考生"
          allow-clear
          class="stats-card__select stats-card__select--class"
          :options="props.classOptions"
          :loading="props.rosterLoading"
          @change="handleClassChange"
        />
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>
          刷新
        </UiButton>
      </a-space>
    </template>

    <UiSkeletonState v-if="loading" variant="card" compact />

    <UiEmpty v-else-if="!distribution" description="暂无数据" />
    <div v-else-if="distribution" class="score-dist">
      <SignalBand :metrics="distributionMetrics" compact class="score-dist__metrics" />

      <MarkBarSection
        title="五级分数分布"
        :hint="histogramChartHint"
        :item-count="histogramBarItems.length"
        :option="histogramChartOption"
        height="300px"
        :aria-label="histogramChartAriaLabel"
        class="score-dist__chart"
      />
    </div>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ExamScoreDistributionResponse } from '@/apis/mark/exam-score'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import type { SignalMetric } from '@/types/workbench'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, ref, watch } from 'vue'
import { getExamScoreDistribution } from '@/apis/mark/exam-score'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError } from '@/utils/error-handler'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import { scoreHistogramToBarItems } from '@/utils/mark-statistics-chart'

defineOptions({ name: 'ScoreDistributionCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  classId?: string
  classOptions: MarkClassOption[]
  rosterLoading: boolean
}>()

const emit = defineEmits<{ (e: 'class-change', classId?: string): void }>()

const distribution = ref<ExamScoreDistributionResponse | null>(null)
const loading = ref(false)

const histogramBarItems = computed(() => {
  if (!distribution.value) return []
  return scoreHistogramToBarItems({
    ranges: distribution.value.ranges,
    counts: distribution.value.counts,
  })
})

const histogramChartHint = computed(() => {
  const dist = distribution.value
  const staticHint = dist
    ? `按百分制换算分段（满分 ${dist.fullScore}，及格线 ${dist.passScore}）`
    : undefined
  if (dist && dist.participantCount > 0) {
    const passRate = Math.round((dist.passCount * 100) / dist.participantCount)
    return `${dist.participantCount} 人中 ${dist.passCount} 人及格（${passRate}%）`
  }
  return mergeChartHint(
    staticHint,
    buildBarChartInsight(histogramBarItems.value, { valueUnit: ' 人' }),
  )
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
    return '五级分数分布，暂无数据'
  }
  return `五级分数分布，共 ${count} 个分数段`
})

const distributionMetrics = computed((): SignalMetric[] => {
  if (!distribution.value) return []
  const data = distribution.value
  return [
    {
      key: 'participantCount',
      label: '统计人数',
      value: data.participantCount,
      unit: '人',
    },
    {
      key: 'passCount',
      label: '及格人数',
      value: data.passCount,
      unit: '人',
      tone: 'green',
    },
    {
      key: 'avgScore',
      label: '平均分',
      value: data.avgScore.toFixed(1),
      unit: `/ ${data.fullScore}`,
    },
    {
      key: 'stdDev',
      label: '标准差',
      value: data.stdDev.toFixed(2),
    },
    ...(data.medianScore != null
      ? [{ key: 'medianScore', label: '中位数', value: data.medianScore.toFixed(2) } satisfies SignalMetric]
      : []),
    ...(data.excellentRate != null
      ? [{ key: 'excellentRate', label: '优秀率', value: `${data.excellentRate}%`, tone: 'blue' } satisfies SignalMetric]
      : []),
  ]
})

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    distribution.value = await getExamScoreDistribution({
      examId: props.examId,
      classId: props.classId || undefined,
    })
  } catch (e) {
    distribution.value = null
    showUserError(e, '分数分布加载失败')
  } finally {
    loading.value = false
  }
}

function handleClassChange(value?: SelectValue): void {
  emit('class-change', typeof value === 'string' ? value : undefined)
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    if (props.examId) {
      void reload()
    } else {
      distribution.value = null
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.score-dist__chart {
  width: 100%;
}
</style>
