<template>
  <component :is="embedded ? AiAnalysisSection : WorkbenchSurfaceCard" v-bind="shellProps">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">AI 错因聚类分析</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <div class="ai-analysis-card-toolbar">
        <UiButton variant="outline" size="sm" :loading="generating" @click="handleGenerate">
          重新生成
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </UiButton>
      </div>
    </template>

    <template v-if="embedded" #actions>
      <div class="ai-analysis-card-toolbar">
        <UiButton variant="outline" size="sm" :loading="generating" @click="handleGenerate">
          重新生成
        </UiButton>
      </div>
    </template>

    <UiSkeletonState v-if="loading && !generating" variant="card" compact />
    <AiGenerationProgressPanel
      v-else-if="generating"
      title="AI 错因聚类分析生成中"
      :waiting-text="
        props.classId
          ? '正在等待后端返回当前班级的真实错因聚类结果。'
          : '正在等待后端返回本场考试的真实错因聚类结果。'
      "
    />

    <UiEmpty v-else-if="!record" description="暂无数据" />
    <div v-else-if="record" class="ai-analysis-section__body ai-analysis-section__body--flush">
      <p v-if="record.overallSummary" class="ai-analysis-summary">{{ record.overallSummary }}</p>

      <MarkBarSection
        title="错因占比分布"
        :hint="clusterChartHint"
        :item-count="clusterBarItems.length"
        :option="clusterChartOption"
        height="280px"
      />

      <div v-if="clusterItems.length > 0" class="ai-cluster-grid">
        <AiClusterTile
          v-for="(item, index) in clusterItems"
          :key="`${item.causeName ?? 'cluster'}-${index}`"
          :label="clusterItemTitle(item)"
          :proportion-text="item.proportion != null ? formatPercent(item.proportion) : '—'"
          :description="item.causeDescription"
          :question-nos="formatExamples(item.typicalExamples)"
          :suggestion="item.suggestion"
        />
      </div>

      <AiAnalysisMetaCollapse
        :record="record"
        failure-fallback="AI 错因聚类分析未完成，请稍后重新生成"
        :extra-items="[{ label: '聚类数', value: clusterCountText(record) }]"
      />
    </div>
  </component>
</template>

<script lang="ts" setup>
import type {
  ErrorCauseClusterItemVO,
  ErrorCauseClusterResponse,
} from '@/apis/mark/error-cause-cluster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  generateErrorCauseCluster,
  getLatestErrorCauseCluster,
} from '@/apis/mark/error-cause-cluster'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AiClusterTile from '@/components/mark/analysis/AiClusterTile.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError } from '@/utils/error-handler'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import { errorCauseToBarItems } from '@/utils/mark-statistics-chart'
import { strictEnumLabel } from '@/utils/strict-enum'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'

defineOptions({ name: 'ErrorCauseClusterCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    reloadToken: number
    classId?: string
    examLabel?: string
    embedded?: boolean
  }>(),
  { embedded: false },
)

const record = ref<ErrorCauseClusterResponse | null>(null)
const loading = ref(false)
const generating = ref(false)

const shellProps = computed(() =>
  props.embedded
    ? { title: 'AI 错因聚类分析', context: props.examLabel }
    : { class: 'stats-card' },
)

const clusterItems = computed(() => record.value?.clusterItems ?? [])
const clusterBarItems = computed(() => errorCauseToBarItems(record.value?.clusterItems ?? []))

const clusterChartHint = computed(() =>
  mergeChartHint('悬停查看各错因占比', buildBarChartInsight(clusterBarItems.value)),
)

const { chartOption: clusterChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(clusterBarItems.value, {
    orientation: 'horizontal',
    maxValue: 100,
    xAxisName: '占比 %',
    unit: '%',
    emptyText: '暂无错因占比数据',
  }),
)

function clusterItemTitle(item: ErrorCauseClusterItemVO): string {
  if (item.causeName?.trim()) return item.causeName
  if (item.questionType) return strictEnumLabel(QuestionTypeDescription, item.questionType, '题目类型')
  return '错因聚类'
}

function formatExamples(examples?: string[]): string | undefined {
  if (!examples?.length) return undefined
  return examples.join('、')
}

function acceptErrorCauseClusterRecord(value: ErrorCauseClusterResponse | null): ErrorCauseClusterResponse | null {
  if (!value) return null
  return value
}

function clusterCountText(value: ErrorCauseClusterResponse): string {
  if (typeof value.clusterCount === 'number') return String(value.clusterCount)
  if (value.analysisStatus === 'PENDING') return '待分析'
  return '—'
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    const latest = await getLatestErrorCauseCluster({
      examId: props.examId,
      classId: props.classId || undefined,
    })
    record.value = acceptErrorCauseClusterRecord(latest)
  } catch (e) {
    record.value = null
    showUserError(e, '错因聚类分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  generating.value = true
  try {
    const generated = await generateErrorCauseCluster({
      examId: props.examId,
      classId: props.classId || undefined,
    })
    record.value = acceptErrorCauseClusterRecord(generated)
    message.success('已生成最新错因聚类')
  } catch (e) {
    record.value = null
    showUserError(e, '错因聚类分析生成失败')
  } finally {
    generating.value = false
  }
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.ai-analysis-section__body--flush {
  padding-top: 0;
}
</style>
