<template>
  <AiAnalysisCardShell :embedded="embedded" title="AI 错因聚类分析" card-class="stats-card">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">AI 错因聚类分析</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <div class="ai-analysis-card-toolbar">
        <UiButton
          v-if="canManageReviewerWrites === true" variant="outline" size="sm" :loading="generating === true" @click="handleGenerate"
        >
          重新生成
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </UiButton>
      </div>
    </template>

    <template v-if="embedded" #actions>
      <div class="ai-analysis-card-toolbar">
        <UiButton
          v-if="canManageReviewerWrites === true" variant="outline" size="sm" :loading="generating === true" @click="handleGenerate"
        >
          重新生成
        </UiButton>
      </div>
    </template>

    <AiAnalysisCardBody
      :loading="loading"
      :generating="generating"
      :has-content="record != null || !loadFailed"
      :load-failed="loadFailed"
      empty-description="暂无错因聚类，可点击重新生成"
      error-description="错因聚类分析加载失败"
      progress-title="AI 错因聚类分析生成中"
      :progress-waiting-text="
        props.classId
          ? '正在等待后端返回当前班级的真实错因聚类结果。'
          : '正在等待后端返回本场考试的真实错因聚类结果。'
      "
    >
      <div class="ai-analysis-section__body ai-analysis-section__body--flush">
        <p v-if="record?.overallSummary" class="ai-analysis-summary">{{ record.overallSummary }}</p>

        <MarkBarSection
          title="错因占比分布"
          :hint="clusterChartHint"
          :item-count="clusterBarItems.length"
          :option="clusterChartOption"
          height="280px"
          orientation="horizontal"
          empty-description="选定考试并生成分析后展示错因占比"
        />

        <div v-if="(record?.clusterItems?.length ?? 0) > 0" class="ai-cluster-grid">
          <AiClusterTile
            v-for="(item, index) in record?.clusterItems ?? []"
            :key="`${item.causeName ?? 'cluster'}-${index}`"
            :label="clusterItemTitle(item)"
            :proportion-text="item.proportion != null ? formatPercent(item.proportion) : '—'"
            :description="item.causeDescription"
            :question-nos="formatExamples(item.typicalExamples)"
            :suggestion="item.suggestion"
          />
        </div>

        <AiAnalysisMetaCollapse
          v-if="record"
          :record="record"
          failure-fallback="AI 错因聚类分析未完成，可重新生成"
          :extra-items="[{ label: '聚类数', value: clusterCountText(record) }]"
        />
      </div>
    </AiAnalysisCardBody>
  </AiAnalysisCardShell>
</template>

<script lang="ts" setup>
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type {
  ErrorCauseClusterItemVO,
  ErrorCauseClusterResponse,
} from '@/apis/mark/error-cause-cluster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, inject, ref, watch } from 'vue'
import { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import {
  generateErrorCauseCluster,
  getLatestErrorCauseCluster,
} from '@/apis/mark/error-cause-cluster'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import AiAnalysisCardBody from '@/components/mark/analysis/AiAnalysisCardBody.vue'
import AiAnalysisCardShell from '@/components/mark/analysis/AiAnalysisCardShell.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiClusterTile from '@/components/mark/analysis/AiClusterTile.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { useAiAnalysisGenerationFeedback } from '@/composables/useAiAnalysisGenerationFeedback'
import { AI_ANALYSIS_CAN_MANAGE_REVIEWER_WRITES_KEY } from '@/composables/useAiAnalysisScope'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError } from '@/utils/error-handler'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import { errorCauseToBarItems } from '@/utils/mark-statistics-chart'
import { strictEnumLabel } from '@/utils/strict-enum'

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

const emit = defineEmits<{ changed: [] }>()

const record = ref<ErrorCauseClusterResponse | null>(null)
const loading = ref(false)
const loadFailed = ref(false)
let loadGeneration = 0
const { generating, runGeneration } = useAiAnalysisGenerationFeedback()

/** MVR-285：默认拒绝假可写；依赖 AI 分析中心 overview 或页面 provide 的能力位 */
const injectedCanManageReviewerWrites = inject(
  AI_ANALYSIS_CAN_MANAGE_REVIEWER_WRITES_KEY,
  null,
)
const canManageReviewerWrites = computed(
  () => injectedCanManageReviewerWrites?.value === true,
)


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
  if (item.questionType)
    return strictEnumLabel(QuestionTypeDescription, item.questionType, '题目类型')
  return '错因聚类'
}

function formatExamples(examples?: string[]): string | undefined {
  if (!examples?.length) return undefined
  return examples.join('、')
}

function clusterCountText(value: ErrorCauseClusterResponse): string {
  if (typeof value.clusterCount === 'number') return String(value.clusterCount)
  if (value.analysisStatus === AiAnalysisStatusCode.PENDING) return '待分析'
  return '—'
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

async function reload(): Promise<void> {
  const examId = props.examId
  if (!examId) return
  const classId = props.classId || undefined
  const generation = ++loadGeneration
  loading.value = true
  loadFailed.value = false
  try {
    const next = await getLatestErrorCauseCluster({
      examId,
      classId,
    })
    if (
      generation !== loadGeneration
      || props.examId !== examId
      || (props.classId || undefined) !== classId
    ) {
      return
    }
    record.value = next
  } catch (e) {
    if (generation !== loadGeneration || props.examId !== examId) {
      return
    }
    loadFailed.value = true
    showUserError(e, '错因聚类分析加载失败')
  } finally {
    if (generation === loadGeneration) {
      loading.value = false
    }
  }
}

async function handleGenerate(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    showUserError(null, '仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  const examId = props.examId
  const classId = props.classId || undefined
  await runGeneration(
    () =>
      generateErrorCauseCluster({
        examId,
        classId,
      }),
    {
      successMessage: '已生成最新错因聚类',
      onSuccess: (generated) => {
        if (props.examId !== examId || (props.classId || undefined) !== classId) {
          return
        }
        record.value = generated
        loadFailed.value = false
        emit('changed')
      },
    },
  )
}

watch(
  () => [props.examId, props.reloadToken, props.classId] as const,
  () => {
    loadGeneration += 1
    record.value = null
    loadFailed.value = false
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
