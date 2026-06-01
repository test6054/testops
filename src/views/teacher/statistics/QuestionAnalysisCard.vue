<template>
  <a-card title="题目质量分析" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-select
          v-model:value="selectedQuestionTemplateId"
          placeholder="选择题目"
          style="width: 280px"
          :options="questionOptions"
          :loading="questionLoading"
          show-search
          option-filter-prop="label"
          allow-clear
          @change="reload"
        />
        <a-button type="primary" :loading="generatingAll" @click="handleGenerateAll">
          全量生成
        </a-button>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>

    <!-- D-5 难度-区分度散点图：仅在有分析数据时显示 -->
    <div v-if="scatterSeriesGroups.length > 0" class="question-analysis-card__chart-wrap">
      <div class="question-analysis-card__chart-meta">
        <strong>难度-区分度分布</strong>
        <span class="question-analysis-card__chart-hint">
          理想区间：难度 0.3-0.8 且 区分度 ≥ 0.4；点击图例可隐藏对应区段。
        </span>
      </div>
      <VChart
        class="question-analysis-card__chart"
        :option="chartOption"
        autoresize
        :init-options="{ renderer: 'canvas' }"
      />
    </div>

    <!-- D-9 错误态：题目质量分析加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="题目质量分析加载失败"
      compact
      @retry="reload"
    />
    <UiDataTable
      v-else
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      size="small"
      :page-size="20"
      :total="rows.length"
      flat
    >
      <template #bodyCell="{ column, index }">
        <template v-if="column.key === 'question'">
          <div class="question-analysis-card__question-cell">
            <div class="question-analysis-card__question-title">
              题{{ rows[index].questionNo }} · {{ rows[index].questionType }} ·
              {{ fmtNum(rows[index].fullScore) }} 分
            </div>
            <div v-if="rows[index].questionStem" class="question-analysis-card__question-stem">
              {{
                rows[index].questionStem.length > 36
                  ? `${rows[index].questionStem.slice(0, 36)}...`
                  : rows[index].questionStem
              }}
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'difficultyIndex'">
          {{ fmtNum(rows[index].difficultyIndex) }}
        </template>
        <template v-else-if="column.key === 'discriminationIndex'">
          {{ fmtNum(rows[index].discriminationIndex) }}
        </template>
        <template v-else-if="column.key === 'avgScore'">
          {{ fmtNum(rows[index].avgScore) }} / {{ fmtNum(rows[index].fullScore) }}
        </template>
        <template v-else-if="column.key === 'correctRatio'">
          <a-typography-text :type="getCorrectRatioType(rows[index])">
            {{ correctRatio(rows[index]) }}
          </a-typography-text>
        </template>
        <template v-else-if="column.key === 'snapshotTime'">
          {{ formatDateTime(rows[index].snapshotTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button
            type="link"
            size="small"
            :loading="generatingId === rows[index].questionTemplateId"
            @click="handleGenerateOne(rows[index].questionTemplateId)"
          >
            重新生成
          </a-button>
        </template>
      </template>
    </UiDataTable>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamQuestionTemplateVO } from '@/apis/mark/exam'
import type { ExamQuestionAnalysisRecordVO } from '@/apis/mark/question-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { getExamTemplate } from '@/apis/mark/exam'
import {
  generateAllQuestionAnalysis,
  generateQuestionAnalysis,
  listQuestionAnalysis,
} from '@/apis/mark/question-analysis'
import { UiDataTable, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'QuestionAnalysisCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const emit = defineEmits<{ (e: 'generated'): void }>()

// 按需注册 ECharts 模块（散点图 + tooltip + grid + legend + title）
use([
  CanvasRenderer,
  ScatterChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
])

const rows = ref<ExamQuestionAnalysisRecordVO[]>([])
const loading = ref(false)
// D-9 错误态：题目质量分析加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
const generatingAll = ref(false)
const generatingId = ref<string>('')
const selectedQuestionTemplateId = ref<string>()
const questionLoading = ref(false)
const questionOptions = ref<{ value: string, label: string }[]>([])

const columns: ColumnType<ExamQuestionAnalysisRecordVO>[] = [
  { title: '题目', key: 'question', width: 260 },
  { title: '总人数', dataIndex: 'totalCount', key: 'totalCount', width: 90 },
  { title: '正确率', key: 'correctRatio', width: 110 },
  { title: '需复核', dataIndex: 'needReviewCount', key: 'needReviewCount', width: 90 },
  { title: '难度系数', key: 'difficultyIndex', width: 110 },
  { title: '区分度', key: 'discriminationIndex', width: 100 },
  { title: '平均分/满分', key: 'avgScore', width: 140 },
  { title: '快照时间', key: 'snapshotTime', width: 160 },
  { title: '操作', key: 'actions', width: 110, fixed: 'right' },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    rows.value = await listQuestionAnalysis({
      examId: props.examId,
      questionTemplateId: selectedQuestionTemplateId.value,
    })
  } catch (e) {
    rows.value = []
    loadError.value = toUserError(e, '题目质量分析加载失败')
    showUserError(e, '题目质量分析加载失败')
  } finally {
    loading.value = false
  }
}

async function loadQuestionOptions(): Promise<void> {
  if (!props.examId) {
    questionOptions.value = []
    return
  }
  questionLoading.value = true
  try {
    const template = await getExamTemplate(props.examId)
    questionOptions.value = template.questions.map((question: ExamQuestionTemplateVO) => ({
      value: question.questionTemplateId,
      label: `题${question.questionNo} · ${question.questionType} · ${question.fullScore}分${
        question.questionStem
          ? ` · ${
              question.questionStem.length > 24
                ? `${question.questionStem.slice(0, 24)}...`
                : question.questionStem
            }`
          : ''
      }`,
    }))
  } catch (e) {
    questionOptions.value = []
    showUserError(e, '题目列表加载失败')
  } finally {
    questionLoading.value = false
  }
}

async function handleGenerateAll(): Promise<void> {
  generatingAll.value = true
  try {
    rows.value = await generateAllQuestionAnalysis(props.examId)
    message.success('已生成全部题目质量分析')
    emit('generated')
  } catch (e) {
    showUserError(e, '全部题目质量分析生成失败')
  } finally {
    generatingAll.value = false
  }
}

async function handleGenerateOne(questionTemplateId: string): Promise<void> {
  generatingId.value = questionTemplateId
  try {
    await generateQuestionAnalysis({ examId: props.examId, questionTemplateId })
    message.success('已重新生成')
    await reload()
    emit('generated')
  } catch (e) {
    showUserError(e, '题目质量分析重新生成失败')
  } finally {
    generatingId.value = ''
  }
}

function fmtNum(v?: number): string {
  if (v == null) return '-'
  return Number(v).toFixed(2)
}

function correctRatio(r: ExamQuestionAnalysisRecordVO): string {
  const total = r.totalCount
  if (total <= 0) return '-'
  const ratio = (r.correctCount / total) * 100
  return `${ratio.toFixed(1)}%`
}

function getCorrectRatioType(r: ExamQuestionAnalysisRecordVO): 'danger' | 'warning' | undefined {
  const total = r.totalCount
  if (total <= 0) return undefined
  const ratio = r.correctCount / total
  if (ratio < 0.4) return 'danger'
  if (ratio < 0.6) return 'warning'
  return undefined
}

// ─── D-5 难度-区分度散点图派生 ──────────────────────────────
/** 单个散点：[难度系数, 区分度, 已批人数, 题号, 题型] */
interface ScatterPointValue {
  value: [number, number, number, string, string]
}

/** 散点图按 4 个质量区段分组（理想 / 偏难 / 偏易 / 区分度不足） */
interface ScatterSeriesGroup {
  name: string
  color: string
  data: ScatterPointValue[]
}

/**
 * 该计算属性返回的是「以质量区段为单位的散点序列分组」，不是单个点；
 * 原名 scatterPoints 与类型 ScatterSeriesGroup[] 不一致，重命名以避免维护者误读。
 */
const scatterSeriesGroups = computed<ScatterSeriesGroup[]>(() => {
  const ideal: ScatterPointValue[] = []
  const tooHard: ScatterPointValue[] = []
  const tooEasy: ScatterPointValue[] = []
  const lowDiscrim: ScatterPointValue[] = []
  for (const r of rows.value) {
    if (r.difficultyIndex == null || r.discriminationIndex == null) continue
    const d = Number(r.difficultyIndex)
    const dis = Number(r.discriminationIndex)
    const total = r.totalCount
    const point: ScatterPointValue = { value: [d, dis, total, r.questionNo, r.questionType] }
    if (d < 0.3) {
      tooHard.push(point)
    } else if (d > 0.8) {
      tooEasy.push(point)
    } else if (dis < 0.4) {
      lowDiscrim.push(point)
    } else {
      ideal.push(point)
    }
  }
  return (
    [
      { name: '理想（难度 0.3-0.8 且 区分度 ≥ 0.4）', color: '#16a34a', data: ideal },
      { name: '偏难（难度 < 0.3）', color: '#dc2626', data: tooHard },
      { name: '偏易（难度 > 0.8）', color: '#ea580c', data: tooEasy },
      { name: '区分度不足（< 0.4）', color: '#a855f7', data: lowDiscrim },
    ] as ScatterSeriesGroup[]
  ).filter((g) => g.data.length > 0)
})

/** ECharts 配置：4 分组 scatter，symbolSize 反映已批人数；hover 显示完整指标 */
const chartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (params: { value: [number, number, number, string, string] }) => {
      const [d, dis, total, questionNo, questionType] = params.value
      return [
        `题${questionNo} · ${questionType}`,
        `难度系数 ${d.toFixed(2)} · 区分度 ${dis.toFixed(2)}`,
        `已批 ${total} 人`,
      ].join('<br/>')
    },
  },
  legend: {
    top: 0,
    type: 'scroll',
    textStyle: { fontSize: 12 },
  },
  grid: { left: 56, right: 16, top: 40, bottom: 44 },
  xAxis: {
    name: '难度系数',
    nameLocation: 'middle',
    nameGap: 28,
    min: 0,
    max: 1,
    splitNumber: 5,
    axisLine: { lineStyle: { color: '#94a3b8' } },
    splitLine: { lineStyle: { color: '#e2e8f0' } },
  },
  yAxis: {
    name: '区分度',
    nameLocation: 'middle',
    nameGap: 40,
    min: -0.2,
    max: 1,
    axisLine: { lineStyle: { color: '#94a3b8' } },
    splitLine: { lineStyle: { color: '#e2e8f0' } },
  },
  series: scatterSeriesGroups.value.map((g) => ({
    type: 'scatter',
    name: g.name,
    // 点大小随已批人数线性放大但不超过 40px，避免大题挤占小题视觉
    symbolSize: (val: [number, number, number, string, string]) => {
      const total = val[2]
      return Math.min(40, 10 + Math.sqrt(total) * 1.5)
    },
    itemStyle: { color: g.color, opacity: 0.85, borderColor: '#fff', borderWidth: 1 },
    data: g.data,
  })),
}))

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) {
      void loadQuestionOptions()
      void reload()
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.question-analysis-card {
  &__chart-wrap {
    margin-bottom: 12px;
    padding: 12px 16px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: var(--dp-radius-md, 6px);
    background: var(--dp-surface, #fff);
  }

  &__chart-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  &__chart-hint {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__chart {
    width: 100%;
    height: 320px;
  }
}
</style>
