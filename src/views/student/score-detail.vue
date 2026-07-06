<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar :title="detail?.examName || '成绩明细'">
        <template #status>
          <UiTag v-if="detail?.finalScoreStatus" :tone="finalScoreStatusTone(detail)" size="sm">
            {{ finalScoreStatusLabel(detail) }}
          </UiTag>
          <UiTag v-else tone="gray" size="sm">未生成</UiTag>
          <UiTag v-if="detail?.reviewWindowStatus === 'ACTIVE'" tone="orange" size="sm">
            复核进行中
          </UiTag>
          <UiTag v-if="detail" tone="blue" size="sm">
            {{ formatPublishedScoreSummary(detail) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" variant="outline" :loading="loading" @click="loadDetail">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton
            v-if="detail && canSubmitReview(detail)"
            size="sm"
            @click="goAppeal(detail.examId)"
          >
            <template #icon><FormOutlined /></template>
            提交复核申请
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 6 }" />

    <UiEmpty v-else-if="!detail" description="暂无数据" class="score-detail__empty" />

    <template v-else-if="detail">
      <UiAlertStrip
        v-if="isExamConfidential"
        tone="error"
        title="涉密资料，禁止传播"
        description="涉密页面，请勿截屏外传"
        :closable="false"
        dense
        class="score-detail__confidential-strip"
      />

      <div v-if="detail.finalScoreStatus === 'PUBLISHED'" class="score-detail__layout">
        <WorkbenchSurfaceCard class="score-detail__sheet-card">
          <template #head>
            <div class="score-detail__card-head">
              <div class="score-detail__card-title">
                <BarChartOutlined />
                <span>答题卡</span>
              </div>
              <a-select
                v-if="clusterLabelOptions.length > 0"
                v-model:value="selectedClusterLabel"
                class="score-detail__cluster-select"
                placeholder="错题聚类"
                :options="clusterLabelOptions"
                allow-clear
                size="small"
              />
            </div>
          </template>

          <div class="score-detail__stats">
            <UiTag tone="green" size="sm">满分 {{ correctCount }} 题</UiTag>
            <UiTag tone="orange" size="sm">部分 {{ partialCount }} 题</UiTag>
            <UiTag tone="red" size="sm">零分 {{ zeroCount }} 题</UiTag>
          </div>

          <UiEmpty v-if="detail.questions.length === 0" description="暂无数据" />
          <UiEmpty v-else-if="filteredQuestions.length === 0" description="暂无数据" />
          <MarkHeatmapSection
            v-else
            title="得分率热力图"
            :hint="scoreHeatmapHint"
            :cell-count="scoreHeatmapCells.length"
            :option="scoreHeatmapOption"
            :height="scoreHeatmapHeight"
            :aria-label="scoreHeatmapAriaLabel"
            class="score-detail__heatmap"
            @cell-click="handleScoreHeatmapClick"
          />
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard class="score-detail__panel-card">
          <template #head>
            <div class="score-detail__card-title">
              <ProfileOutlined />
              <span>题目详情</span>
            </div>
          </template>
          <UiEmpty v-if="!selectedQuestion" description="请选择" />
          <a-spin v-else :spinning="panelLoading">
            <UiEmpty v-if="panelError" :description="panelError" />
            <UiEmpty v-else-if="!panelLoading && !currentDetail" description="未加载到答题明细" />
            <div v-else-if="currentDetail && selectedQuestion" class="answer-panel">
              <div class="answer-panel__summary">
                <UiTag tone="blue" size="sm">第 {{ currentDetail.questionNo }} 题</UiTag>
                <UiTag tone="gray" size="sm">{{ currentDetail.questionType }}</UiTag>
                <UiTag tone="gray" size="sm">满分 {{ currentDetail.fullScore.toFixed(2) }}</UiTag>
                <UiTag :tone="getScoreTagTone(currentDetail)" size="sm">
                  得分 {{ currentDetail.teacherReviewScore.toFixed(2) }}
                </UiTag>
                <UiTag
                  v-if="currentDetail.objectiveResult"
                  :tone="
                    strictEnumTone(OBJECTIVE_RESULT_TONE, currentDetail.objectiveResult, '客观判定')
                  "
                  size="sm"
                >
                  {{
                    strictEnumLabel(
                      ObjectiveResultDescription,
                      currentDetail.objectiveResult,
                      '客观判定',
                    )
                  }}
                </UiTag>
                <UiTag :tone="getGradeStatusTone(currentDetail.gradeStatus)" size="sm">
                  {{ formatGradeStatus(currentDetail.gradeStatus) }}
                </UiTag>
              </div>

              <section class="answer-panel__section">
                <header class="answer-panel__section-title">
                  <FileImageOutlined />
                  <span>作答切片</span>
                </header>
                <UiEmpty v-if="!currentDetail.sliceFileId" description="暂无数据" />
                <a-spin :spinning="sliceLoading" tip="加载切片中...">
                  <ScanImageStage
                    v-if="sliceImageUrl"
                    :src="sliceImageUrl"
                    :confidential="isExamConfidential"
                    :watermark-lines="sliceWatermarkLines"
                    :min-height="320"
                    empty-text="暂无数据"
                  />
                  <UiEmpty v-else-if="!sliceLoading" description="暂无数据" />
                </a-spin>
              </section>

              <section class="answer-panel__section">
                <header class="answer-panel__section-title">
                  <ProfileOutlined />
                  <span>OCR 识别作答</span>
                </header>
                <UiEmpty v-if="!currentDetail.recognizedAnswer" description="暂无数据" />
                <div v-else class="answer-panel__text">{{ currentDetail.recognizedAnswer }}</div>
              </section>

              <section class="answer-panel__section">
                <header class="answer-panel__section-title">
                  <FormOutlined />
                  <span>教师评语</span>
                </header>
                <UiEmpty v-if="!currentDetail.commentText" description="教师未填写评语" />
                <div v-else class="answer-panel__text">{{ currentDetail.commentText }}</div>
              </section>

              <section
                v-if="
                  currentDetail.improvementSuggestion
                    || currentDetail.mistakeClusterLabel
                    || currentDetail.aiDiagnostic
                "
                class="answer-panel__section"
              >
                <header class="answer-panel__section-title">
                  <BulbOutlined />
                  <span>AI 学习内容</span>
                </header>
                <div class="answer-panel__ai">
                  <p v-if="currentDetail.improvementSuggestion" class="answer-panel__ai-line">
                    <strong>改进内容：</strong>{{ currentDetail.improvementSuggestion }}
                  </p>
                  <p v-if="currentDetail.mistakeClusterLabel" class="answer-panel__ai-line">
                    <strong>错题聚类：</strong>
                    <UiTag tone="orange" size="sm">{{ currentDetail.mistakeClusterLabel }}</UiTag>
                  </p>
                  <p v-if="currentDetail.aiDiagnostic" class="answer-panel__ai-line">
                    <strong>AI 处理说明：</strong>{{ aiLearningDiagnosticText(currentDetail.aiDiagnostic) }}
                  </p>
                </div>
              </section>

              <div
                v-if="selectedQuestion && canApplyReviewOnQuestion(selectedQuestion)"
                class="answer-panel__actions"
              >
                <UiButton size="sm" @click="goAppealForQuestion(selectedQuestion)">
                  <template #icon><FormOutlined /></template>
                  对此题申请复核
                </UiButton>
              </div>
            </div>
          </a-spin>
        </WorkbenchSurfaceCard>
      </div>

      <WorkbenchSurfaceCard
        v-if="detail.finalScoreStatus === 'PUBLISHED'"
        flush
        class="score-detail__wrong-book-card"
      >
        <template #head>
          <div class="score-detail__card-head">
            <div class="score-detail__card-title">
              <ProfileOutlined />
              <span>错题本</span>
              <UiTag tone="red" size="sm">{{ wrongBookTotal }} 条</UiTag>
            </div>
            <UiButton
              size="sm"
              variant="outline"
              :loading="wrongBookLoading"
              @click="loadWrongBook"
            >
              刷新
            </UiButton>
          </div>
        </template>
        <UiEmpty v-if="!wrongBookLoading && wrongBookRows.length === 0" description="暂无数据" />
        <UiDataTable
          v-model:current="wrongBookPagination.current"
          v-model:page-size="wrongBookPagination.pageSize"
          :columns="wrongBookColumns"
          :data-source="wrongBookRows"
          :loading="wrongBookLoading"
          :total="wrongBookPagination.total"
          :show-size-changer="wrongBookPagination.showSizeChanger"
          row-key="gradeResultId"
          size="middle"
          flat
          @page-change="handleWrongBookPageChange"
        >
          <template #bodyCell="{ column, record: item }">
            <template v-if="column.key === 'score'">
              {{
                item.teacherReviewScore != null ? Number(item.teacherReviewScore).toFixed(2) : '--'
              }}
              / {{ Number(item.fullScore).toFixed(2) }}
            </template>
            <template v-else-if="column.key === 'gradeStatus'">
              <UiTag :tone="getGradeStatusTone(item.gradeStatus)" size="sm">
                {{ formatGradeStatus(item.gradeStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'objectiveResult'">
              <UiTag
                v-if="item.objectiveResult"
                :tone="strictEnumTone(OBJECTIVE_RESULT_TONE, item.objectiveResult, '客观判定')"
                size="sm"
              >
                {{ strictEnumLabel(ObjectiveResultDescription, item.objectiveResult, '客观判定') }}
              </UiTag>
              <span v-else class="score-detail__hint">-</span>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard
        v-if="detail.finalScoreStatus === 'PUBLISHED'"
        class="score-detail__profile-card"
      >
        <template #head>
          <div class="score-detail__card-head">
            <div class="score-detail__card-title">
              <BulbOutlined />
              <span>AI 学习报告</span>
              <UiTag
                v-if="learningReport?.profileStatus"
                :tone="aiAnalysisStatusColor(learningReport.profileStatus)"
                size="sm"
              >
                {{ aiAnalysisStatusLabel(learningReport.profileStatus) }}
              </UiTag>
            </div>
            <UiButton
              size="sm"
              variant="outline"
              :loading="reportLoading"
              @click="loadLearningReport"
            >
              <template #icon><ReloadOutlined /></template>
              刷新
            </UiButton>
          </div>
        </template>

        <a-spin :spinning="reportLoading">
          <UiEmpty v-if="!reportLoading && !learningReport" description="暂无数据" />
          <UiEmpty
            v-else-if="learningReport && !learningReport.available"
            :description="unavailableLearningReportMessage(learningReport)"
          />
          <div v-else-if="learningReport" class="profile-block">
            <p v-if="learningReport.overallSummary" class="profile-summary">
              <strong>整体表现：</strong>{{ learningReport.overallSummary }}
            </p>

            <div v-if="profileDiagnosisItems.length > 0" class="profile-section">
              <strong>知识掌握分析：</strong>
              <a-list size="small" :data-source="profileDiagnosisItems" bordered>
                <template #renderItem="{ item }">
                  <a-list-item>
                    <div class="diagnosis-item">
                      <div class="diagnosis-header">
                        <UiTag :tone="masteryTone(item.masteryLevel)" size="sm">
                          {{ masteryLabel(item.masteryLevel) }}
                        </UiTag>
                        <span class="diagnosis-type">{{ item.questionType }}</span>
                        <span class="diagnosis-rate">
                          得分率 {{ formatRate(item.scoreRate) }}
                        </span>
                      </div>
                      <div v-if="item.causeAnalysis" class="diagnosis-text">
                        <strong>原因分析：</strong>{{ item.causeAnalysis }}
                      </div>
                      <div v-if="item.suggestion" class="diagnosis-text">
                        <strong>改进内容：</strong>{{ item.suggestion }}
                      </div>
                      <div
                        v-if="item.lostQuestionNos && item.lostQuestionNos.length"
                        class="diagnosis-text"
                      >
                        <strong>失分题号：</strong>{{ item.lostQuestionNos.join(', ') }}
                      </div>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </div>

            <div v-if="profileSuggestions.length > 0" class="profile-section">
              <strong>个性化学习内容：</strong>
              <ol class="suggestion-list">
                <li v-for="(s, i) in profileSuggestions" :key="i">{{ s }}</li>
              </ol>
            </div>

            <div v-if="learningReport.errorClusterSummary" class="profile-section">
              <strong>错题聚类摘要：</strong>
              <p class="profile-summary">{{ learningReport.errorClusterSummary }}</p>
            </div>

            <div v-if="errorClusters.length > 0" class="profile-section">
              <strong>错题聚类：</strong>
              <a-list size="small" :data-source="errorClusters" bordered>
                <template #renderItem="{ item }">
                  <a-list-item>
                    <div class="diagnosis-item">
                      <div class="diagnosis-header">
                        <UiTag tone="orange" size="sm">{{ item.affectedCount }} 人次</UiTag>
                        <span class="diagnosis-type">{{ item.causeName }}</span>
                        <span class="diagnosis-rate">{{ item.questionType }}</span>
                      </div>
                      <div class="diagnosis-text">
                        <strong>错因说明：</strong>{{ item.causeDescription }}
                      </div>
                      <div class="diagnosis-text">
                        <strong>订正内容：</strong>{{ item.suggestion }}
                      </div>
                      <div v-if="item.typicalExamples.length" class="diagnosis-text">
                        <strong>典型表现：</strong>{{ item.typicalExamples.join('；') }}
                      </div>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </div>
        </a-spin>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { StudentWrongBookItemResponse } from '@/apis/mark/question-analysis'
import type {
  StudentAiDiagnosisItemResponse,
  StudentAiErrorClusterResponse,
  StudentAiLearningReportResponse,
  StudentQuestionAnswerDetailResponse,
  StudentQuestionScoreVO,
  StudentScoreDetailResponse,
} from '@/apis/mark/student-exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/ai-analysis-status'
import {
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import { GRADE_STATUS_TONE, GradeStatusDescription } from '@/apis/mark/grade-status'
import { OBJECTIVE_RESULT_TONE, ObjectiveResultDescription } from '@/apis/mark/objective-result'
import { pageStudentWrongBook } from '@/apis/mark/question-analysis'
import {
  canSubmitReview,
  getMyAiLearningReport,
  getMyQuestionAnswerDetail,
  getMyScoreDetail,
} from '@/apis/mark/student-exam'
import { MASTERY_LEVEL_TONE, MasteryLevelDescription } from '@/apis/mark/student-mastery-level'
import MarkHeatmapSection from '@/components/chart/MarkHeatmapSection.vue'
import ScanImageStage from '@/components/mark/ScanImageStage.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  buildConfidentialWatermarkLines,
  isExamConfidentialFlag,
} from '@/composables/useConfidentialWatermark'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatScore } from '@/utils/format'
import { buildHeatmapChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildHeatmapChartOption } from '@/utils/mark-echarts-options'
import { scoreSheetToHeatmapCells } from '@/utils/mark-statistics-chart'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentScoreDetail' })

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detail = ref<StudentScoreDetailResponse | null>(null)
const isExamConfidential = computed(() => isExamConfidentialFlag(detail.value?.confidential))
const sliceWatermarkLines = computed(() => {
  if (!detail.value || !sliceImageUrl.value) {
    return []
  }
  return buildConfidentialWatermarkLines({
    examLabel: `${detail.value.examName}（${detail.value.examNo}）`,
    viewer: {
      displayName: detail.value.studentName,
      identifierLabel: '学号',
      identifierValue: detail.value.studentNo,
    },
  })
})

const detailQuestions = computed<StudentQuestionScoreVO[]>(() => detail.value?.questions ?? [])

const wrongBookLoading = ref(false)
const wrongBookRows = ref<StudentWrongBookItemResponse[]>([])
const wrongBookTotal = ref(0)
const wrongBookPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
})

const wrongBookColumns: ColumnType<StudentWrongBookItemResponse>[] = [
  { title: '题目', dataIndex: 'layoutQuestionId', key: 'layoutQuestionId', width: 140 },
  { title: '得分', key: 'score', width: 120 },
  { title: '批改状态', key: 'gradeStatus', width: 110 },
  { title: '客观判定', key: 'objectiveResult', width: 110 },
  { title: '评语', dataIndex: 'commentText', key: 'commentText', ellipsis: true },
]

/** 当前选中的错题聚类标签，为 undefined 表示不过滤 */
const selectedClusterLabel = ref<string | undefined>(undefined)
const selectedQuestionId = ref<string | null>(null)
const panelLoading = ref(false)
const panelError = ref<string | null>(null)
const currentDetail = ref<StudentQuestionAnswerDetailResponse | null>(null)
const sliceImageUrl = ref<string | null>(null)
const sliceLoading = ref(false)

/**
 * 从题目明细中提取所有出现过的 mistakeClusterLabel，供顶部下拉选择。
 * 学生可以按错题聚类快速查看同一类型的错题。
 */
const clusterLabelOptions = computed<Array<{ value: string, label: string }>>(() => {
  const labels = new Set<string>()
  for (const question of detailQuestions.value) {
    if (question.mistakeClusterLabel) {
      labels.add(question.mistakeClusterLabel)
    }
  }
  return Array.from(labels).map((label) => ({ value: label, label }))
})

/** 当前筛选后展示的题目集合，未选中聚类时返回全部 */
const filteredQuestions = computed<StudentQuestionScoreVO[]>(() => {
  if (!selectedClusterLabel.value) return detailQuestions.value
  return detailQuestions.value.filter(
    (question) => question.mistakeClusterLabel === selectedClusterLabel.value,
  )
})

const scoreHeatmapCells = computed(() =>
  scoreSheetToHeatmapCells(
    filteredQuestions.value.map((question) => ({
      layoutQuestionId: question.layoutQuestionId,
      questionNo: question.questionNo,
      finalScore: question.teacherReviewScore,
      fullScore: question.fullScore,
    })),
  ),
)

const scoreHeatmapHint = computed(() =>
  mergeChartHint(
    '颜色表示得分率，点击题格查看详情',
    buildHeatmapChartInsight(scoreHeatmapCells.value),
  ),
)

const scoreHeatmapHeight = computed(() => {
  const count = scoreHeatmapCells.value.length
  if (count <= 0) return '120px'
  return count > 20 ? '160px' : '120px'
})

const { chartOption: scoreHeatmapOption } = useChartOption(() =>
  buildHeatmapChartOption(scoreHeatmapCells.value, {
    rowLabel: '得分率',
    valueSuffix: '%',
    emptyText: '暂无答题卡数据',
    highlightKey: selectedQuestionId.value ?? undefined,
  }),
)

const scoreHeatmapAriaLabel = computed(() => {
  const count = scoreHeatmapCells.value.length
  if (count <= 0) return '得分率热力图，暂无数据'
  return `得分率热力图，共 ${count} 道题`
})

function handleScoreHeatmapClick(index: number): void {
  const question = filteredQuestions.value[index]
  if (question) {
    void selectQuestion(question)
  }
}

const selectedQuestion = computed<StudentQuestionScoreVO | null>(() => {
  if (!selectedQuestionId.value) {
    return null
  }
  return (
    filteredQuestions.value.find((item) => item.layoutQuestionId === selectedQuestionId.value)
    ?? null
  )
})

const examId = computed<string | null>(() => {
  const value = route.params.examId
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return null
})

const correctCount = computed(() => detailQuestions.value.filter(isFullMark).length)
const partialCount = computed(
  () => detailQuestions.value.filter((q) => isPartial(q) && !isFullMark(q) && !isZero(q)).length,
)
const zeroCount = computed(() => detailQuestions.value.filter(isZero).length)

function isFullMark(q: StudentQuestionScoreVO) {
  return q.teacherReviewScore != null && q.teacherReviewScore >= q.fullScore
}
function isZero(q: StudentQuestionScoreVO) {
  return q.teacherReviewScore != null && q.teacherReviewScore <= 0
}
function isPartial(q: StudentQuestionScoreVO) {
  return q.teacherReviewScore != null
}

function finalScoreStatusTone(item: StudentScoreDetailResponse): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, item.finalScoreStatus, '最终成绩状态')
}

function finalScoreStatusLabel(item: StudentScoreDetailResponse): string {
  return strictEnumLabel(FinalScoreStatusDescription, item.finalScoreStatus, '最终成绩状态')
}

function formatGradeStatus(status: StudentQuestionScoreVO['gradeStatus']): string {
  return strictEnumLabel(GradeStatusDescription, status, '题目批改状态')
}

function getGradeStatusTone(status: StudentQuestionScoreVO['gradeStatus']): BadgeTone {
  return strictEnumTone(GRADE_STATUS_TONE, status, '题目批改状态')
}

function formatQuestionFinalScore(question: StudentQuestionScoreVO): string {
  return question.teacherReviewScore.toFixed(2)
}

function formatPublishedTotalScore(item: StudentScoreDetailResponse): string {
  return formatScore(item.totalScore, 'score')
}

function formatPublishedScoreSummary(item: StudentScoreDetailResponse): string {
  if (item.finalScoreStatus !== 'PUBLISHED') {
    return '--'
  }
  if (item.dailyScoreFull != null) {
    return `考试 ${formatScore(item.examScore, 'score')} + 日常 ${formatScore(item.dailyScore, 'score')} = 总 ${formatPublishedTotalScore(item)} / ${formatPublishedFullScore(item)}`
  }
  return `${formatPublishedTotalScore(item)} / ${formatPublishedFullScore(item)}`
}

function formatPublishedFullScore(item: StudentScoreDetailResponse): string {
  return formatScore(item.fullScore, 'score')
}

async function loadWrongBook(): Promise<void> {
  if (!examId.value || detail.value?.finalScoreStatus !== 'PUBLISHED') {
    wrongBookRows.value = []
    wrongBookTotal.value = 0
    return
  }
  wrongBookLoading.value = true
  try {
    const result = await pageStudentWrongBook({
      examId: examId.value,
      wrongOnly: true,
      pageNum: wrongBookPagination.current,
      pageSize: wrongBookPagination.pageSize,
    })
    wrongBookRows.value = result.list
    wrongBookPagination.current = result.pageNum
    wrongBookPagination.pageSize = result.pageSize
    wrongBookTotal.value = Number(result.total)
    wrongBookPagination.total = wrongBookTotal.value
  } catch (error) {
    showUserError(error, '错题本加载失败')
  } finally {
    wrongBookLoading.value = false
  }
}

function handleWrongBookPageChange(pageEvent: { current: number, pageSize: number }): void {
  wrongBookPagination.current = pageEvent.current
  wrongBookPagination.pageSize = pageEvent.pageSize
  void loadWrongBook()
}

async function loadDetail() {
  if (!examId.value) {
    message.warning('考试信息缺失，无法加载成绩详情')
    return
  }
  loading.value = true
  try {
    const loadedDetail = await getMyScoreDetail(examId.value)
    detail.value = loadedDetail
    if (loadedDetail.finalScoreStatus === 'PUBLISHED') {
      wrongBookPagination.current = 1
      await loadWrongBook()
    }
  } catch (error) {
    showUserError(error, '成绩详情加载失败')
    detail.value = null
  } finally {
    loading.value = false
  }
}

function goAppeal(id: string) {
  router.push({ name: 'StudentAppeal', query: { examId: id } })
}

function canApplyReviewOnQuestion(q: StudentQuestionScoreVO): boolean {
  if (!detail.value || !canSubmitReview(detail.value)) return false
  return q.teacherReviewScore < q.fullScore
}

function goAppealForQuestion(q: StudentQuestionScoreVO): void {
  if (!detail.value?.examId || !q.layoutQuestionId) return
  router.push({
    name: 'StudentAppeal',
    query: {
      examId: detail.value.examId,
      questionId: q.layoutQuestionId,
    },
  })
}

const learningReport = ref<Awaited<ReturnType<typeof getMyAiLearningReport>> | null>(null)
const reportLoading = ref(false)

const profileDiagnosisItems = computed<StudentAiDiagnosisItemResponse[]>(
  () => learningReport.value?.diagnosisItems ?? [],
)
const profileSuggestions = computed<string[]>(
  () => learningReport.value?.improvementSuggestions ?? [],
)
const errorClusters = computed<StudentAiErrorClusterResponse[]>(
  () => learningReport.value?.errorClusters ?? [],
)

async function loadLearningReport(): Promise<void> {
  if (!detail.value || detail.value.finalScoreStatus !== 'PUBLISHED') {
    learningReport.value = null
    return
  }
  if (!detail.value.examId) {
    learningReport.value = null
    showUserError(null, '成绩信息不完整，暂无法加载学习报告')
    return
  }
  reportLoading.value = true
  try {
    learningReport.value = await getMyAiLearningReport(detail.value.examId)
  } catch (error) {
    showUserError(error, 'AI 学习报告加载失败')
    learningReport.value = null
  } finally {
    reportLoading.value = false
  }
}

function unavailableLearningReportMessage(report: StudentAiLearningReportResponse): string {
  return report.profileMessage || report.clusterMessage || 'AI 学习报告暂不可用，请稍后重试'
}

/** 将 AI 明细诊断转为学生侧学习提示，不暴露模型或接口内部细节。 */
function aiLearningDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'AI 学习内容暂未形成可展示说明，请以教师评语和题目得分为准',
  )
}

function formatRate(rate: string): string {
  const value = Number(rate)
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

function masteryLabel(level: StudentAiDiagnosisItemResponse['masteryLevel']): string {
  return strictEnumLabel(MasteryLevelDescription, level, '知识掌握等级')
}

function masteryTone(level: StudentAiDiagnosisItemResponse['masteryLevel']): BadgeTone {
  return strictEnumTone(MASTERY_LEVEL_TONE, level, '知识掌握等级')
}

/**
 * 答题卡选题后加载题目作答明细；成绩未发布时后端会 CONFLICT，入口已在 selectQuestion 拦截。
 */
async function selectQuestion(question: StudentQuestionScoreVO): Promise<void> {
  if (!detail.value || detail.value.finalScoreStatus !== 'PUBLISHED') {
    message.warning('成绩尚未发布，暂不能查看答题明细')
    return
  }
  if (!detail.value.examId) {
    panelError.value = '已发布成绩详情缺少考试信息。'
    return
  }
  selectedQuestionId.value = question.layoutQuestionId
  panelLoading.value = true
  panelError.value = null
  currentDetail.value = null
  releaseSliceImage()

  try {
    const result = await getMyQuestionAnswerDetail(detail.value.examId, question.layoutQuestionId)
    currentDetail.value = result
    if (result.sliceFileId) {
      void loadSliceImage(result.sliceFileId)
    }
  } catch (error) {
    panelError.value = getUserErrorMessage(error, '答题明细加载失败')
  } finally {
    panelLoading.value = false
  }
}

async function loadSliceImage(fileId: string): Promise<void> {
  releaseSliceImage()
  sliceLoading.value = true
  try {
    sliceImageUrl.value = await getImageBlobUrl(fileId)
  } catch (error) {
    showUserError(error, '答题切片加载失败')
  } finally {
    sliceLoading.value = false
  }
}

function releaseSliceImage(): void {
  if (sliceImageUrl.value) {
    URL.revokeObjectURL(sliceImageUrl.value)
    sliceImageUrl.value = null
  }
}

/** 抽屉内得分标签的着色：满分绿，零分红，部分得分橙 */
function getScoreTagTone(answer: StudentQuestionAnswerDetailResponse): BadgeTone {
  if (answer.teacherReviewScore >= answer.fullScore) return 'green'
  if (answer.teacherReviewScore <= 0) return 'red'
  return 'orange'
}

watch(examId, () => loadDetail(), { immediate: true })
watch(detail, () => {
  selectedQuestionId.value = null
  currentDetail.value = null
  panelError.value = null
  releaseSliceImage()
  void loadLearningReport()
})
watch(filteredQuestions, (list) => {
  if (list.length === 0) {
    selectedQuestionId.value = null
    currentDetail.value = null
    releaseSliceImage()
    return
  }
  if (
    !selectedQuestionId.value
    || !list.some((item) => item.layoutQuestionId === selectedQuestionId.value)
  ) {
    void selectQuestion(list[0])
  }
})
onBeforeUnmount(() => {
  releaseSliceImage()
})
</script>

<style lang="scss" scoped>
.score-detail {
  &__layout {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
    margin-top: 8px;

    @media (max-width: 991px) {
      grid-template-columns: 1fr;
    }
  }

  &__sheet-card,
  &__panel-card {
    min-width: 0;
  }

  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__empty {
    padding: 48px 0;
  }

  &__confidential-strip {
    margin-bottom: 16px;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
  }
}

.score-detail__cluster-select {
  min-width: 160px;
}

.score-detail__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.score-detail__card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: var(--dp-font-weight-title, 600);
}

.score-detail__wrong-book-card,
.score-detail__profile-card {
  margin-top: 16px;
}

.answer-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__summary {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    border-bottom: 1px dashed var(--ant-color-border-secondary, #e5e7eb);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  }

  &__slice {
    position: relative;
    border: 1px solid var(--ant-color-border-secondary, #e5e7eb);
    border-radius: 6px;
    padding: 8px;
    background: var(--dp-surface-soft, #f8fafc);
    text-align: center;
    min-height: 120px;
  }

  &__slice-img {
    max-width: 100%;
    max-height: 420px;
    object-fit: contain;
  }

  &__text {
    margin: 0;
    padding: 12px;
    background: var(--dp-surface-soft, #f8fafc);
    border-radius: 6px;
    border: 1px solid var(--ant-color-border-secondary, #e5e7eb);
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.7;
    font-size: 13px;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  }

  &__ai {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: var(--dp-surface-soft, #f8fafc);
    border-radius: 6px;
    border: 1px solid var(--ant-color-border-secondary, #e5e7eb);
  }

  &__ai-line {
    margin: 0;
    line-height: 1.7;
    font-size: 13px;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
  }
}

.confidential-shield--active {
  user-select: none;
}

.profile-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-summary {
  margin: 0;
  line-height: 1.7;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diagnosis-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.diagnosis-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diagnosis-type {
  font-weight: 600;
}

.diagnosis-rate {
  margin-left: auto;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
}

.diagnosis-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.75));
}

.suggestion-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.7;
}
</style>
