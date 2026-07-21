<template>
  <AiAnalysisCardShell :embedded="embedded" title="题目质量分析" card-class="stats-card">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">题目质量分析</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <div class="dp-space" style="--dp-space-gap: 8px">
        <UiSelect
          size="sm"
          v-model="selectedLayoutQuestionId"
          placeholder="选择题目"
          class="stats-card__select stats-card__select--question"
          :options="questionOptions"
          :loading="questionLoading"
          allow-search
          option-filter-prop="label"
          allow-clear
          @change="reload"
        />
        <UiButton
          v-if="canManageReviewerWrites === true"
          variant="outline"
          size="sm"
          :disabled="!selectedQuestionForCorrection"
          @click="handleOpenSelectedQuestionCorrection"
        >
          修正答案并生效
        </UiButton>
        <UiButton
          v-if="canManageReviewerWrites === true"
          variant="outline"
          size="sm"
          :loading="generating && !generatingAllMode"
          :disabled="!selectedLayoutQuestionId"
          @click="handleGenerateSelected"
        >
          生成当前题
        </UiButton>
        <UiButton
          v-if="canManageReviewerWrites === true"
          variant="outline"
          size="sm"
          :loading="generating"
          @click="handleGenerateAll"
        >
          全量生成
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </UiButton>
      </div>
    </template>

    <template v-if="embedded" #actions>
      <span class="question-analysis-card__ideal-hint">理想区间：难度 0.3–0.8 · 区分度 ≥ 0.4</span>
    </template>

    <div class="question-analysis-card" :class="{ 'question-analysis-card--embedded': embedded }">
      <div v-if="embedded" class="question-analysis-card__toolbar">
        <UiSelect
          size="sm"
          v-model="selectedLayoutQuestionId"
          placeholder="选择题目"
          class="stats-card__select stats-card__select--question"
          :options="questionOptions"
          :loading="questionLoading"
          allow-search
          option-filter-prop="label"
          allow-clear
          @change="reload"
        />
        <UiButton
          v-if="canManageReviewerWrites === true"
          variant="outline"
          size="sm"
          :disabled="!selectedQuestionForCorrection"
          @click="handleOpenSelectedQuestionCorrection"
        >
          修正答案并生效
        </UiButton>
        <UiButton
          v-if="canManageReviewerWrites === true"
          variant="outline"
          size="sm"
          :loading="generating && !generatingAllMode"
          :disabled="!selectedLayoutQuestionId"
          @click="handleGenerateSelected"
        >
          生成当前题
        </UiButton>
        <UiButton
          v-if="canManageReviewerWrites === true"
          variant="primary"
          size="sm"
          :loading="generating"
          @click="handleGenerateAll"
        >
          全量生成
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload"> 刷新 </UiButton>
      </div>
      <UiAlertStrip
        v-if="layoutRoiGap > 0 && !generating"
        tone="warning"
        class="question-analysis-card__roi-gap-strip"
        :title="`制卷识别区域未就绪（${layoutRoiGap} 道题）`"
        description="未配置 ROI 的题目无法生成按题质量分析，请先在制卷工作台补全识别区域。"
        dense
      />

      <AiGenerationProgressPanel
        v-if="generating"
        title="题目质量分析生成中"
        :waiting-text="
          generatingAllMode
            ? '正在等待后端返回全部题目的真实质量分析。'
            : '正在等待后端返回当前题目的真实质量分析。'
        "
      />

      <template v-else>
        <div class="question-analysis-card__chart-grid">
          <MarkScatterSection
            ref="scatterSectionRef"
            title="难度-区分度分布"
            :hint="scatterChartHint"
            :point-count="scatterPointCount"
            :option="scatterChartOption"
            height="300px"
            :aria-label="scatterChartAriaLabel"
            :visible="!chartLoading"
            class="question-analysis-card__chart"
            @brush-selected="handleScatterBrushSelected"
          />

          <MarkBarSection
            title="各题正确率"
            :hint="correctRatioChartHint"
            :item-count="correctRatioBarItems.length"
            :option="correctRatioChartOption"
            height="300px"
            :aria-label="correctRatioChartAriaLabel"
            :visible="!chartLoading"
            class="question-analysis-card__chart"
          />
        </div>

        <section v-if="brushSelectedRows.length > 0" class="question-analysis-card__brush-list">
          <header class="question-analysis-card__brush-head">
            <strong>框选区域题目（{{ brushSelectedRows.length }}）</strong>
            <UiTextAction @click="clearBrushSelection">清除选区</UiTextAction>
          </header>
          <ul class="question-analysis-card__brush-items">
            <li
              v-for="item in brushSelectedRows"
              :key="item.layoutQuestionId"
              class="question-analysis-card__brush-item"
            >
              <span>题{{ item.questionNo }} · {{ questionTypeLabel(item.questionType) }}</span>
              <span class="question-analysis-card__brush-meta">
                难度 {{ fmtNum(item.difficultyIndex) }} · 区分度
                {{ fmtNum(item.discriminationIndex) }}
              </span>
            </li>
          </ul>
        </section>

        <UiTypographyParagraph
          v-if="generationSummary"
          class="question-analysis-card__generation-summary"
        >
          {{ generationSummary }}
        </UiTypographyParagraph>

        <UiDataTable
          :columns="columns"
          :data-source="tableRows"
          :loading="tableLoading"
          row-key="id"
          size="small"
          pagination-mode="server"
          v-model:current="tablePageNum"
          v-model:page-size="tablePageSize"
          :total="tableTotal"
          :empty-kind="tableEmptyKind"
          :empty-description="tableEmptyDescription"
          flat
          @page-change="handleTablePageChange"
        >
          <template #empty-action>
            <div class="dp-space" v-if="tableEmptyKind === 'first-run'" style="--dp-space-gap: 8px">
              <UiButton
                v-if="canManageReviewerWrites === true"
                variant="outline"
                size="sm"
                :loading="generating"
                @click="handleGenerateAll"
              >
                全量生成
              </UiButton>
            </div>
            <div
              class="dp-space"
              v-else-if="tableEmptyKind === 'no-result'"
              style="--dp-space-gap: 8px"
            >
              <UiButton
                v-if="canManageReviewerWrites === true"
                variant="outline"
                size="sm"
                :loading="generating && !generatingAllMode"
                :disabled="!selectedLayoutQuestionId"
                @click="handleGenerateSelected"
              >
                生成当前题
              </UiButton>
              <UiButton variant="outline" size="sm" @click="clearQuestionFilter">
                清除题目筛选
              </UiButton>
            </div>
          </template>
          <template #bodyCell="{ column, record: item }">
            <ExamQuestionIdentityCells
              v-if="
                column.key === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionType
                  || column.key === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionStem
                  || column.key === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.fullScore
              "
              :column-key="String(column.key)"
              :record="item"
            />
            <template v-else-if="column.key === 'difficultyIndex'">
              {{ fmtNum(item.difficultyIndex) }}
            </template>
            <template v-else-if="column.key === 'discriminationIndex'">
              {{ fmtNum(item.discriminationIndex) }}
            </template>
            <template v-else-if="column.key === 'avgScore'">
              {{ fmtNum(item.avgScore) }} / {{ fmtNum(item.fullScore) }}
            </template>
            <template v-else-if="column.key === 'correctRatio'">
              <UiTypographyText :type="getCorrectRatioType(item)">
                {{ correctRatio(item) }}
              </UiTypographyText>
            </template>
            <template v-else-if="column.key === 'snapshotTime'">
              {{ formatDateTime(item.snapshotTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[
                  // MVR-387：模板须 === true；ComputedRef 对象 truthy 会导致无写权仍展示行操作
                  ...(canManageReviewerWrites === true
                    ? [
                      { key: 'correct-answer', label: '修正答案并生效' },
                      { key: 'regenerate', label: '重新生成' },
                    ]
                    : []),
                ]"
                split
                @action="(key) => handleRowAction(key, item)"
              />
            </template>
          </template>
        </UiDataTable>
      </template>
    </div>

    <QuestionAnswerCorrectionDialog
      :open="correctionDialogOpen"
      :exam-id="props.examId"
      :question="editingQuestion"
      :can-manage-reviewer-writes="canManageReviewerWrites"
      @close="closeCorrectionDialog"
      @corrected="handleAnswerCorrected"
    />
  </AiAnalysisCardShell>
</template>

<script lang="ts" setup>
import type {
  ExamLayoutQuestionViewResponse,
  ExamTemplateResponse,
} from '@/apis/mark/exam-layout-question'
import type {
  ExamQuestionAnalysisRecordResponse,
  QuestionAnalysisListQueryRequest,
} from '@/apis/mark/question-analysis'
import type { UiDataTableColumn } from '@/components/ui-guide/ui/data-table'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import {
  generateAllQuestionAnalysis,
  generateQuestionAnalysis,
  loadQuestionAnalysisChartRows,
  pageQuestionAnalysis,
} from '@/apis/mark/question-analysis'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkScatterSection from '@/components/chart/MarkScatterSection.vue'
import AiAnalysisCardShell from '@/components/mark/analysis/AiAnalysisCardShell.vue'
import ExamQuestionIdentityCells from '@/components/mark/analysis/ExamQuestionIdentityCells.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { buildNumericColumn } from '@/components/ui-guide/ui/data-table'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import { useAiAnalysisGenerationFeedback } from '@/composables/useAiAnalysisGenerationFeedback'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildExamLayoutQuestionOptions } from '@/utils/format-exam-layout-question-summary'
import {
  buildBarChartInsight,
  buildScatterChartInsight,
  mergeChartHint,
} from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption, buildScatterChartOption } from '@/utils/mark-echarts-options'
import {
  buildExamQuestionIdentityColumns,
  EXAM_QUESTION_IDENTITY_COLUMN_KEYS,
} from '@/utils/mark-exam-question-table-columns'
import {
  buildQuestionQualityScatterSeries,
  correctRatioToBarItems,
} from '@/utils/mark-statistics-chart'
import { strictEnumLabel } from '@/utils/strict-enum'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'
import QuestionAnswerCorrectionDialog from './QuestionAnswerCorrectionDialog.vue'

defineOptions({ name: 'QuestionAnalysisCard' })

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

const emit = defineEmits<{ (e: 'generated'): void }>()

const chartRows = ref<ExamQuestionAnalysisRecordResponse[]>([])
const tableRows = ref<ExamQuestionAnalysisRecordResponse[]>([])
const chartLoading = ref(false)
const tableLoading = ref(false)
const loading = computed(() => chartLoading.value || tableLoading.value)
const { generating, runGeneration } = useAiAnalysisGenerationFeedback()
const generatingAllMode = ref(false)
const generatingId = ref<string>('')
const selectedLayoutQuestionId = ref<string>()
const questionLoading = ref(false)
const questionOptions = ref<
  Array<{ value: string, label: string, disabled?: boolean, title?: string }>
>([])
const layoutSummary = ref<ExamTemplateResponse | null>(null)
/** MVR-277：修正答案等写动作；与 BE requireExamReviewerPermission 对齐 */
const canManageReviewerWrites = computed(
  () => layoutSummary.value?.canManageReviewerWrites === true,
)
const layoutRoiGap = computed(() => {
  if (!layoutSummary.value?.configured) {
    return 0
  }
  const total = layoutSummary.value.totalQuestionCount ?? 0
  const ready = layoutSummary.value.roiReadyQuestionCount ?? 0
  return Math.max(0, total - ready)
})
const generationSummary = ref('')
const tablePageNum = ref(1)
const tablePageSize = ref(20)
const tableTotal = ref(0)
const brushSelectedRows = ref<ExamQuestionAnalysisRecordResponse[]>([])
const scatterSectionRef = ref<InstanceType<typeof MarkScatterSection> | null>(null)
const correctionDialogOpen = ref(false)
let chartLoadSequence = 0
let tableLoadSequence = 0
let questionOptionsLoadSequence = 0
type CorrectionQuestion = Pick<
  ExamQuestionAnalysisRecordResponse,
  'layoutQuestionId' | 'questionNo' | 'questionType' | 'questionStem' | 'fullScore'
>
const editingQuestion = ref<CorrectionQuestion | null>(null)
const selectedQuestionForCorrection = computed<CorrectionQuestion | null>(() => {
  const layoutQuestionId = selectedLayoutQuestionId.value
  if (!layoutQuestionId) {
    return null
  }
  const question = layoutSummary.value?.questions.find(
    (item) => item.layoutQuestionId === layoutQuestionId,
  )
  return question ? toCorrectionQuestion(question) : null
})

interface ScatterBrushSelectedBatch {
  selected?: Array<{
    seriesIndex?: number
    dataIndex?: number[]
  }>
}

interface ScatterBrushSelectedEvent {
  batch?: ScatterBrushSelectedBatch[]
}

const tableEmptyKind = computed(() => {
  return selectedLayoutQuestionId.value ? 'no-result' : 'first-run'
})

const tableEmptyDescription = computed(() => {
  if (selectedLayoutQuestionId.value) {
    return '当前筛选题目暂无质量分析记录，可清除筛选或重新生成。'
  }
  return '尚未生成题目质量分析时，可一键产出全卷难度、区分度与正确率。'
})

function clearQuestionFilter(): void {
  selectedLayoutQuestionId.value = undefined
  void reload()
}

const columns: UiDataTableColumn<ExamQuestionAnalysisRecordResponse>[] = [
  ...buildExamQuestionIdentityColumns<ExamQuestionAnalysisRecordResponse>(),
  buildNumericColumn({ title: '总人数', dataIndex: 'totalCount', key: 'totalCount', width: 90 }),
  { title: '正确率', key: 'correctRatio', width: 110, align: 'right' },
  buildNumericColumn({
    title: '需复核',
    dataIndex: 'needReviewCount',
    key: 'needReviewCount',
    width: 90,
    meta: { hideBelow: 'md' },
  }),
  buildNumericColumn({
    title: '难度系数',
    key: 'difficultyIndex',
    width: 110,
    meta: { hideBelow: 'md' },
  }),
  buildNumericColumn({
    title: '区分度',
    key: 'discriminationIndex',
    width: 100,
    meta: { hideBelow: 'md' },
  }),
  { title: '平均分/满分', key: 'avgScore', width: 140, align: 'right', meta: { hideBelow: 'lg' } },
  { title: '快照时间', key: 'snapshotTime', width: 160, meta: { hideBelow: 'lg' } },
  { title: '操作', key: 'actions', width: 190 },
]

function buildListQueryBase(): Omit<QuestionAnalysisListQueryRequest, 'pageNum' | 'pageSize'> {
  return {
    examId: props.examId,
    layoutQuestionId: selectedLayoutQuestionId.value,
    classId: props.classId || undefined,
  }
}

async function loadChartRows(): Promise<void> {
  const currentLoad = ++chartLoadSequence
  if (!props.examId) {
    chartRows.value = []
    brushSelectedRows.value = []
    return
  }
  chartLoading.value = true
  try {
    const records = await loadQuestionAnalysisChartRows(buildListQueryBase())
    if (currentLoad !== chartLoadSequence) {
      return
    }
    chartRows.value = acceptQuestionAnalysisRows(records)
  } catch (e) {
    if (currentLoad !== chartLoadSequence) {
      return
    }
    chartRows.value = []
    brushSelectedRows.value = []
    showUserError(e, '题目质量分析图表加载失败')
  } finally {
    if (currentLoad === chartLoadSequence) {
      chartLoading.value = false
    }
  }
}

async function loadTablePage(
  pageNum = tablePageNum.value,
  pageSize = tablePageSize.value,
): Promise<void> {
  const currentLoad = ++tableLoadSequence
  if (!props.examId) {
    tableRows.value = []
    tableTotal.value = 0
    return
  }
  tableLoading.value = true
  try {
    const page = await pageQuestionAnalysis({
      ...buildListQueryBase(),
      pageNum,
      pageSize,
    })
    if (currentLoad !== tableLoadSequence) {
      return
    }
    tableRows.value = acceptQuestionAnalysisRows(page.list)
    tableTotal.value = page.total
    tablePageNum.value = page.pageNum
    tablePageSize.value = page.pageSize
  } catch (e) {
    if (currentLoad !== tableLoadSequence) {
      return
    }
    tableRows.value = []
    tableTotal.value = 0
    showUserError(e, '题目质量分析列表加载失败')
  } finally {
    if (currentLoad === tableLoadSequence) {
      tableLoading.value = false
    }
  }
}

async function reload(): Promise<void> {
  if (!props.examId) return
  tablePageNum.value = 1
  await Promise.all([loadChartRows(), loadTablePage(1, tablePageSize.value)])
}

function handleTablePageChange(event: { current: number, pageSize: number }): void {
  void loadTablePage(event.current, event.pageSize)
}

async function loadQuestionOptions(): Promise<void> {
  const currentLoad = ++questionOptionsLoadSequence
  if (!props.examId) {
    questionOptions.value = []
    layoutSummary.value = null
    selectedLayoutQuestionId.value = undefined
    return
  }
  questionLoading.value = true
  try {
    const template = await getExamLayoutQuestionSummary(props.examId)
    if (currentLoad !== questionOptionsLoadSequence) {
      return
    }
    layoutSummary.value = template
    if (!template.configured) {
      questionOptions.value = []
      selectedLayoutQuestionId.value = undefined
      return
    }
    questionOptions.value = buildExamLayoutQuestionOptions(template.questions)
    if (
      selectedLayoutQuestionId.value
      && !template.questions.some(
        (q) => q.layoutQuestionId === selectedLayoutQuestionId.value && q.roiReady,
      )
    ) {
      selectedLayoutQuestionId.value = undefined
    }
  } catch (e) {
    if (currentLoad !== questionOptionsLoadSequence) {
      return
    }
    layoutSummary.value = null
    questionOptions.value = []
    selectedLayoutQuestionId.value = undefined
    showUserError(e, '题目列表加载失败')
  } finally {
    if (currentLoad === questionOptionsLoadSequence) {
      questionLoading.value = false
    }
  }
}

/** 切换考试/联动范围后先校正题目筛选，再按最新筛选重新加载图表与列表，避免沿用旧考试题目 ID 查空数据。 */
async function reloadCurrentScope(): Promise<void> {
  await loadQuestionOptions()
  await reload()
}

async function handleGenerateAll(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  if (generating.value) return
  generationSummary.value = ''
  generatingAllMode.value = true
  await runGeneration(
    () =>
      generateAllQuestionAnalysis({
        examId: props.examId,
        classId: props.classId || undefined,
      }),
    {
      successMessage: '已生成全部题目质量分析',
      onSuccess: async () => {
        await reload()
        generationSummary.value = `已生成 ${chartRows.value.length} 道题目质量分析，可查看难度、区分度与正确率。`
        emit('generated')
      },
    },
  )
  generatingAllMode.value = false
}

async function handleGenerateOne(layoutQuestionId: string): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  if (!layoutQuestionId || generating.value) return
  generationSummary.value = ''
  generatingAllMode.value = false
  generatingId.value = layoutQuestionId
  await runGeneration(
    () =>
      generateQuestionAnalysis({
        examId: props.examId,
        layoutQuestionId,
        classId: props.classId || undefined,
      }),
    {
      successMessage: '已重新生成',
      onSuccess: async () => {
        await reload()
        const matched
          = tableRows.value.find((item) => item.layoutQuestionId === layoutQuestionId)
            ?? chartRows.value.find((item) => item.layoutQuestionId === layoutQuestionId)
        generationSummary.value = matched
          ? `已生成题 ${matched.questionNo} 的质量分析，可查看难度、区分度与正确率。`
          : '已生成该题质量分析，可查看难度、区分度与正确率。'
        emit('generated')
      },
    },
  )
  generatingId.value = ''
}

async function handleGenerateSelected(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  if (!selectedLayoutQuestionId.value) {
    showUserError(null, '请先选择需要生成分析的题目')
    return
  }
  await handleGenerateOne(selectedLayoutQuestionId.value)
}

function handleRowAction(actionKey: string, item: ExamQuestionAnalysisRecordResponse): void {
  // MVR-387：写动作统一 !== true，禁止 truthy/本地身份放行
  if (actionKey === 'correct-answer' && canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可修正答案并生效')
    return
  }
  if (actionKey === 'regenerate') {
    if (canManageReviewerWrites.value !== true) {
      void message.warning('仅本场阅卷组织成员、主考或管理员可生成分析')
      return
    }
    void handleGenerateOne(item.layoutQuestionId)
    return
  }
  if (actionKey === 'correct-answer') {
    openCorrectionDialog(item)
  }
}

function handleOpenSelectedQuestionCorrection(): void {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可修正答案并生效')
    return
  }
  if (!selectedQuestionForCorrection.value) {
    showUserError(null, '请先选择需要修正答案的题目')
    return
  }
  openCorrectionDialog(selectedQuestionForCorrection.value)
}

function openCorrectionDialog(question: CorrectionQuestion): void {
  editingQuestion.value = question
  correctionDialogOpen.value = true
}

function closeCorrectionDialog(): void {
  correctionDialogOpen.value = false
  editingQuestion.value = null
}

async function handleAnswerCorrected(): Promise<void> {
  await reload()
  emit('generated')
}

function acceptQuestionAnalysisRows(
  records: ExamQuestionAnalysisRecordResponse[],
): ExamQuestionAnalysisRecordResponse[] {
  return records
}

function fmtNum(v?: number): string {
  if (v == null) return '-'
  return Number(v).toFixed(2)
}

function correctRatio(r: ExamQuestionAnalysisRecordResponse): string {
  const total = r.totalCount
  if (total <= 0) return '-'
  const ratio = (r.correctCount / total) * 100
  return `${ratio.toFixed(1)}%`
}

function getCorrectRatioType(
  r: ExamQuestionAnalysisRecordResponse,
): 'danger' | 'warning' | undefined {
  const total = r.totalCount
  if (total <= 0) return undefined
  const ratio = r.correctCount / total
  if (ratio < 0.4) return 'danger'
  if (ratio < 0.6) return 'warning'
  return undefined
}

function questionTypeLabel(
  questionType: ExamQuestionAnalysisRecordResponse['questionType'],
): string {
  return strictEnumLabel(QuestionTypeDescription, questionType, '题型')
}

/** 将制卷题目摘要映射为修正答案弹窗所需的最小题目上下文。 */
function toCorrectionQuestion(question: ExamLayoutQuestionViewResponse): CorrectionQuestion {
  return {
    layoutQuestionId: question.layoutQuestionId,
    questionNo: question.questionNo,
    questionType: question.questionType,
    questionStem: question.questionStem,
    fullScore: question.fullScore,
  }
}

const questionQualityScatterSeries = computed(() =>
  buildQuestionQualityScatterSeries(chartRows.value),
)
const scatterPointCount = computed(() =>
  questionQualityScatterSeries.value.reduce((sum, series) => sum + series.points.length, 0),
)
const correctRatioBarItems = computed(() => correctRatioToBarItems(chartRows.value))

const scatterChartHint = computed(() =>
  mergeChartHint(
    '理想区间：难度 0.3-0.8 且 区分度 ≥ 0.4；可使用右上角工具框选题目查看清单。',
    buildScatterChartInsight(questionQualityScatterSeries.value),
  ),
)

const correctRatioChartHint = computed(() =>
  mergeChartHint(
    '按题号展示已批阅学生的正确率',
    buildBarChartInsight(correctRatioBarItems.value, { passLine: 60, passLineLabel: '及格线' }),
  ),
)

const { chartOption: scatterChartOption } = useChartOption(() =>
  buildScatterChartOption(questionQualityScatterSeries.value, {
    xLabel: '难度系数',
    yLabel: '区分度',
    showIdealZone: true,
    brush: true,
    emptyText: '暂无难度-区分度数据',
  }),
)

function handleScatterBrushSelected(params: unknown): void {
  const payload = params as ScatterBrushSelectedEvent
  const selected = payload.batch?.[0]?.selected ?? []
  const hasSelection = selected.some((item) => (item.dataIndex?.length ?? 0) > 0)
  if (!hasSelection) {
    brushSelectedRows.value = []
    return
  }
  const visibleSeries = questionQualityScatterSeries.value.filter(
    (series) => series.points.length > 0,
  )
  const selectedQuestionIds = new Set<string>()
  for (const item of selected) {
    const series = visibleSeries[item.seriesIndex ?? -1]
    if (!series) continue
    for (const dataIndex of item.dataIndex ?? []) {
      const point = series.points[dataIndex]
      if (point?.key) {
        selectedQuestionIds.add(point.key)
      }
    }
  }
  brushSelectedRows.value = chartRows.value.filter((row) =>
    selectedQuestionIds.has(row.layoutQuestionId),
  )
}

function clearBrushSelection(): void {
  brushSelectedRows.value = []
  scatterSectionRef.value?.clearBrush()
}

const { chartOption: correctRatioChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(correctRatioBarItems.value, {
    orientation: 'vertical',
    maxValue: 100,
    yAxisName: '正确率 %',
    unit: '%',
    dataZoom: true,
    emptyText: '暂无各题正确率数据',
  }),
)

const scatterChartAriaLabel = computed(() => {
  const totalPoints = questionQualityScatterSeries.value.reduce(
    (sum, series) => sum + series.points.length,
    0,
  )
  if (totalPoints <= 0) {
    return '难度区分度分布暂无数据'
  }
  return `难度区分度分布，共 ${totalPoints} 道题目`
})

const correctRatioChartAriaLabel = computed(() => {
  const count = correctRatioBarItems.value.length
  if (count <= 0) {
    return '各题正确率暂无数据'
  }
  return `各题正确率，共 ${count} 道题`
})

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    void reloadCurrentScope()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.question-analysis-card {
  &__question-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }

  &__question-title {
    font-weight: var(--dp-font-weight-emphasis);
  }

  &__question-stem {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__generation-summary {
    margin: 0;
    color: var(--dp-text-secondary);
  }

  &__brush-list {
    margin-top: var(--dp-space-3);
    padding: var(--dp-space-3) var(--dp-space-4);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-subtle);
  }

  &__brush-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-3);
    margin-bottom: var(--dp-space-2);
    font-size: 14px;
  }

  &__brush-items {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-2);
  }

  &__brush-item {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--dp-space-3);
    font-size: 13px;
  }

  &__brush-meta {
    color: var(--dp-text-secondary);
    white-space: nowrap;
  }
}
</style>
