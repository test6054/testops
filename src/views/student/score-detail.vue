<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="score-detail__context">
        <div class="score-detail__context-left">
          <UiTag
            v-if="detail?.finalScoreStatus"
            :tone="FINAL_SCORE_STATUS_TONE[detail.finalScoreStatus]"
            size="sm"
          >
            {{ FINAL_SCORE_STATUS_LABEL[detail.finalScoreStatus] }}
          </UiTag>
          <UiTag v-else tone="gray" size="sm">未生成</UiTag>
          <UiTag v-if="detail?.reviewWindowStatus === 'ACTIVE'" tone="orange" size="sm">
            复核进行中
          </UiTag>
          <UiTag v-if="detail" tone="blue" size="sm">
            {{
              detail.finalScoreStatus === 'PUBLISHED' && detail.totalScore != null
                ? detail.totalScore.toFixed(2)
                : '--'
            }}
            / {{ detail.fullScore != null ? detail.fullScore.toFixed(2) : '--' }}
          </UiTag>
        </div>
        <div class="score-detail__context-right">
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
        </div>
      </div>
    </template>

    <UiErrorRetryPanel
      v-if="detailLoadError"
      :error="detailLoadError"
      title="成绩详情加载失败"
      :helper="`考试 ID：${examId}`"
      :show-report="false"
      @retry="loadDetail"
    />

    <UiEmpty
      v-else-if="!loading && !detail"
      description="未查询到该考试的成绩详情"
      class="score-detail__empty"
    />

    <template v-else-if="detail">
      <UiAlertStrip
        v-if="detail.finalScoreStatus !== 'PUBLISHED'"
        tone="info"
        title="成绩尚未发布"
        description="教师在确认并发布后，您将能在此页面看到本场考试的总分与每道题的得分明细。"
      />

      <UiCard v-if="detail.finalScoreStatus === 'PUBLISHED'" class="score-detail__questions-card">
        <template #title>
          <BarChartOutlined />
          <span>题目得分明细</span>
          <UiBadge tone="blue">{{ detail.questions?.length ?? 0 }} 道题</UiBadge>
          <UiBadge v-if="clusterLabelOptions.length > 0" tone="orange">
            错题聚类 {{ clusterLabelOptions.length }} 项
          </UiBadge>
        </template>
        <template #extra>
          <a-space>
            <a-select
              v-if="clusterLabelOptions.length > 0"
              v-model:value="selectedClusterLabel"
              class="score-detail__cluster-select"
              placeholder="按错题聚类筛选"
              :options="clusterLabelOptions"
              allow-clear
              size="middle"
            />
            <UiTag tone="green" size="sm">满分 {{ correctCount }} 题</UiTag>
            <UiTag tone="orange" size="sm">部分得分 {{ partialCount }} 题</UiTag>
            <UiTag tone="red" size="sm">零分 {{ zeroCount }} 题</UiTag>
          </a-space>
        </template>

        <UiEmpty
          v-if="!detail.questions || detail.questions.length === 0"
          description="暂无题目得分明细"
        />
        <UiEmpty
          v-else-if="filteredQuestions.length === 0"
          :description="`当前错题聚类筛选下无题目：${selectedClusterLabel}`"
        />

        <a-table
          v-else
          :columns="questionColumns"
          :data-source="filteredQuestions"
          :pagination="false"
          row-key="questionTemplateId"
          size="middle"
          class="questions-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'questionNo'">
              <div class="question-no-cell">
                <UiTag tone="blue" size="sm">
                  {{ asQuestionScore(record).questionNo || '-' }}
                </UiTag>
                <UiTag
                  v-if="asQuestionScore(record).mistakeClusterLabel"
                  tone="orange"
                  size="sm"
                  class="question-no-cell__cluster"
                  @click.stop="setClusterFilter(asQuestionScore(record).mistakeClusterLabel)"
                >
                  {{ asQuestionScore(record).mistakeClusterLabel }}
                </UiTag>
              </div>
            </template>
            <template v-else-if="column.key === 'questionType'">
              <span>{{ asQuestionScore(record).questionType || '-' }}</span>
            </template>
            <template v-else-if="column.key === 'fullScore'">
              <span class="score-cell">
                {{ asQuestionScore(record).fullScore?.toFixed(2) ?? '-' }}
              </span>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <span
                v-if="asQuestionScore(record).finalScore != null"
                class="score-cell score-cell--strong"
                :class="getScoreToneClass(asQuestionScore(record))"
              >
                {{ (asQuestionScore(record).finalScore ?? 0).toFixed(2) }}
              </span>
              <span v-else class="score-detail__hint">-</span>
            </template>
            <template v-else-if="column.key === 'objectiveResult'">
              <UiTag
                v-if="asQuestionScore(record).objectiveResult === 'CORRECT'"
                tone="green"
                size="sm"
              >
                正确
              </UiTag>
              <UiTag
                v-else-if="asQuestionScore(record).objectiveResult === 'WRONG'"
                tone="red"
                size="sm"
              >
                错误
              </UiTag>
              <UiTag
                v-else-if="asQuestionScore(record).objectiveResult === 'PARTIAL'"
                tone="orange"
                size="sm"
              >
                部分正确
              </UiTag>
              <span v-else class="score-detail__hint">-</span>
            </template>
            <template v-else-if="column.key === 'gradeStatus'">
              <UiTag :tone="getGradeStatusTone(asQuestionScore(record).gradeStatus)" size="sm">
                {{ formatGradeStatus(asQuestionScore(record).gradeStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                v-if="canApplyReviewOnQuestion(asQuestionScore(record))"
                size="sm"
                variant="ghost"
                @click="goAppealForQuestion(asQuestionScore(record))"
              >
                对此题申请复核
              </UiButton>
              <span v-else class="score-detail__hint">-</span>
            </template>
          </template>
          <template #expandedRowRender="{ record }">
            <div
              v-if="asQuestionScore(record).improvementSuggestion"
              class="question-ai-tip"
            >
              <UiTag tone="purple" size="sm">AI 学习建议</UiTag>
              <p class="question-ai-tip__text">
                {{ asQuestionScore(record).improvementSuggestion }}
              </p>
            </div>
            <UiEmpty v-else description="本题暂无 AI 学习建议" />
          </template>
        </a-table>
      </UiCard>

      <UiCard v-if="detail.finalScoreStatus === 'PUBLISHED'" class="score-detail__profile-card">
        <template #title>
          <BulbOutlined />
          <span>AI 学习报告</span>
          <UiBadge
            v-if="learningReport?.profileStatus"
            :tone="AI_ANALYSIS_STATUS_COLOR[learningReport.profileStatus]"
          >
            {{ AI_ANALYSIS_STATUS_LABEL[learningReport.profileStatus] }}
          </UiBadge>
        </template>
        <template #extra>
          <UiButton size="sm" variant="outline" :loading="reportLoading" @click="loadLearningReport">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>

        <a-spin :spinning="reportLoading">
          <UiAlertStrip
            v-if="reportLoadError"
            tone="error"
            title="AI 学习报告加载失败"
            :description="reportLoadError"
            dense
          />
          <UiAlertStrip
            v-else-if="!reportLoading && !learningReport"
            tone="info"
            title="尚未生成 AI 学习报告"
            description="教师生成后，此处会显示知识掌握诊断、改进建议和错题聚类。"
            dense
          />
          <UiAlertStrip
            v-else-if="learningReport && !learningReport.available"
            tone="info"
            title="暂无可展示的 AI 学习内容"
            :description="learningReport.profileMessage || learningReport.clusterMessage || '教师生成后，此处会显示结构化学习建议。'"
            dense
          />
          <div v-else-if="learningReport" class="profile-block">
            <UiAlertStrip
              v-if="learningReport.profileMessage"
              tone="warning"
              title="个体学习建议提示"
              :description="learningReport.profileMessage"
              dense
            />
            <UiAlertStrip
              v-if="learningReport.clusterMessage"
              tone="warning"
              title="错题聚类提示"
              :description="learningReport.clusterMessage"
              dense
            />
            <p v-if="learningReport.overallSummary" class="profile-summary">
              <strong>整体表现：</strong>{{ learningReport.overallSummary }}
            </p>

            <div v-if="profileDiagnosisItems.length > 0" class="profile-section">
              <strong>知识掌握诊断：</strong>
              <a-list size="small" :data-source="profileDiagnosisItems" bordered>
                <template #renderItem="{ item }">
                  <a-list-item>
                    <div class="diagnosis-item">
                      <div class="diagnosis-header">
                        <UiTag :tone="masteryTone(item.masteryLevel)" size="sm">
                          {{ masteryLabel(item.masteryLevel) }}
                        </UiTag>
                        <span v-if="item.questionType" class="diagnosis-type">{{ item.questionType }}</span>
                        <span v-if="item.scoreRate" class="diagnosis-rate">
                          得分率 {{ formatRate(item.scoreRate) }}
                        </span>
                      </div>
                      <div v-if="item.causeAnalysis" class="diagnosis-text">
                        <strong>原因分析：</strong>{{ item.causeAnalysis }}
                      </div>
                      <div v-if="item.suggestion" class="diagnosis-text">
                        <strong>改进建议：</strong>{{ item.suggestion }}
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
              <strong>个性化学习建议：</strong>
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
                        <UiTag tone="orange" size="sm">{{ item.affectedCount ?? 0 }} 人次</UiTag>
                        <span v-if="item.causeName" class="diagnosis-type">{{ item.causeName }}</span>
                        <span v-if="item.questionType" class="diagnosis-rate">{{ item.questionType }}</span>
                      </div>
                      <div v-if="item.causeDescription" class="diagnosis-text">
                        <strong>错因说明：</strong>{{ item.causeDescription }}
                      </div>
                      <div v-if="item.suggestion" class="diagnosis-text">
                        <strong>订正建议：</strong>{{ item.suggestion }}
                      </div>
                      <div
                        v-if="item.typicalExamples && item.typicalExamples.length"
                        class="diagnosis-text"
                      >
                        <strong>典型表现：</strong>{{ item.typicalExamples.join('；') }}
                      </div>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </div>
        </a-spin>
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  StudentAiDiagnosisItemVO,
  StudentAiErrorClusterVO,
  StudentQuestionScoreVO,
  StudentScoreDetailVO,
} from '@/apis/mark/student-exam'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AI_ANALYSIS_STATUS_COLOR,
  AI_ANALYSIS_STATUS_LABEL,
  canSubmitReview,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  getMyAiLearningReport,
  getMyScoreDetail,
} from '@/apis/mark/student-exam'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'

defineOptions({ name: 'StudentScoreDetail' })

type GradeStatusTone = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detailLoadError = ref<unknown>(null)
const detail = ref<StudentScoreDetailVO | null>(null)

const detailQuestions = computed<StudentQuestionScoreVO[]>(() => detail.value?.questions ?? [])

/** 当前选中的错题聚类标签，为 undefined 表示不过滤 */
const selectedClusterLabel = ref<string | undefined>(undefined)

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

/**
 * 从 a-table 泛型 record（Record<string, any>）转为 StudentQuestionScoreVO。
 * Ant Design Vue 的 bodyCell 插槽 record 类型在源码中被推断为宽类型，
 * 这里加一个在 callsite 的窄化 helper，避免在每个使用点写 as 断言。
 */
function asQuestionScore(record: unknown): StudentQuestionScoreVO {
  return record as StudentQuestionScoreVO
}

/** 从题号单元格点击标签时完成筛选下钻，重复点击取消筛选 */
function setClusterFilter(label?: string): void {
  if (!label) return
  selectedClusterLabel.value = selectedClusterLabel.value === label ? undefined : label
}

const examId = computed<string | null>(() => {
  const value = route.params.examId
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return null
})

const questionColumns = computed(() => {
  const cols: Array<Record<string, unknown>> = [
    { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 100 },
    { title: '题型', key: 'questionType', dataIndex: 'questionType', width: 140 },
    {
      title: '满分',
      key: 'fullScore',
      dataIndex: 'fullScore',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '得分',
      key: 'finalScore',
      dataIndex: 'finalScore',
      width: 110,
      align: 'right' as const,
    },
    { title: '客观判定', key: 'objectiveResult', dataIndex: 'objectiveResult', width: 130 },
    { title: '批改状态', key: 'gradeStatus', dataIndex: 'gradeStatus' },
  ]
  if (detail.value && canSubmitReview(detail.value)) {
    cols.push({
      title: '操作',
      key: 'actions',
      fixed: 'right' as const,
      width: 160,
    })
  }
  return cols
})

const correctCount = computed(() => (detail.value?.questions ?? []).filter(isFullMark).length)
const partialCount = computed(
  () =>
    (detail.value?.questions ?? []).filter((q) => isPartial(q) && !isFullMark(q) && !isZero(q)).length,
)
const zeroCount = computed(() => (detail.value?.questions ?? []).filter(isZero).length)

function isFullMark(q: StudentQuestionScoreVO) {
  return q.finalScore != null && q.fullScore != null && q.finalScore >= q.fullScore
}
function isZero(q: StudentQuestionScoreVO) {
  return q.finalScore != null && q.finalScore <= 0
}
function isPartial(q: StudentQuestionScoreVO) {
  return q.finalScore != null && q.fullScore != null
}

function getScoreToneClass(record: StudentQuestionScoreVO): string {
  if (isFullMark(record)) return 'score-cell--full'
  if (isZero(record)) return 'score-cell--zero'
  return 'score-cell--partial'
}

function formatGradeStatus(status?: string): string {
  switch (status) {
    case 'CONFIRMED':
      return '已确认'
    case 'PENDING':
      return '待批改'
    case 'AI_GRADED':
      return 'AI 批改'
    case 'REVIEW_PENDING':
      return '待复核'
    case 'CORRECTED':
      return '已更正'
    default:
      return status || '-'
  }
}

function getGradeStatusTone(status?: string): GradeStatusTone {
  switch (status) {
    case 'CONFIRMED':
      return 'green'
    case 'CORRECTED':
      return 'purple'
    case 'AI_GRADED':
      return 'blue'
    case 'PENDING':
      return 'gray'
    case 'REVIEW_PENDING':
      return 'orange'
    default:
      return 'gray'
  }
}

async function loadDetail() {
  if (!examId.value) {
    message.warning('考试ID缺失')
    return
  }
  loading.value = true
  detailLoadError.value = null
  try {
    detail.value = await getMyScoreDetail(examId.value)
  } catch (error) {
    detailLoadError.value = error
    const msg = error instanceof Error ? error.message : '加载成绩详情失败'
    message.error(msg)
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
  if (q.finalScore == null || q.fullScore == null) return false
  return q.finalScore < q.fullScore
}

function goAppealForQuestion(q: StudentQuestionScoreVO): void {
  if (!detail.value?.examId || !q.questionTemplateId) return
  router.push({
    name: 'StudentAppeal',
    query: {
      examId: detail.value.examId,
      questionId: q.questionTemplateId,
    },
  })
}

const learningReport = ref<Awaited<ReturnType<typeof getMyAiLearningReport>> | null>(null)
const reportLoading = ref(false)
const reportLoadError = ref('')

const profileDiagnosisItems = computed<StudentAiDiagnosisItemVO[]>(
  () => learningReport.value?.diagnosisItems ?? [],
)
const profileSuggestions = computed<string[]>(() => learningReport.value?.improvementSuggestions ?? [])
const errorClusters = computed<StudentAiErrorClusterVO[]>(() => learningReport.value?.errorClusters ?? [])

async function loadLearningReport(): Promise<void> {
  if (!detail.value || detail.value.finalScoreStatus !== 'PUBLISHED') {
    learningReport.value = null
    reportLoadError.value = ''
    return
  }
  if (!detail.value.examId) {
    learningReport.value = null
    reportLoadError.value = '成绩详情缺少 examId，无法读取 AI 学习报告。'
    return
  }
  reportLoading.value = true
  reportLoadError.value = ''
  try {
    learningReport.value = await getMyAiLearningReport(detail.value.examId)
  } catch (error) {
    reportLoadError.value = error instanceof Error ? error.message : 'AI 学习报告加载失败'
    learningReport.value = null
  } finally {
    reportLoading.value = false
  }
}

function formatRate(rate?: string): string {
  return rate || '-'
}

function masteryLabel(level?: string): string {
  switch (level) {
    case 'EXCELLENT':
      return '优秀'
    case 'GOOD':
      return '良好'
    case 'MEDIUM':
      return '中等'
    case 'WEAK':
      return '薄弱'
    case 'CRITICAL':
      return '危急'
    default:
      return level ?? '-'
  }
}

function masteryTone(level?: string): 'gray' | 'blue' | 'green' | 'orange' | 'red' {
  switch (level) {
    case 'EXCELLENT':
      return 'green'
    case 'GOOD':
      return 'blue'
    case 'MEDIUM':
      return 'blue'
    case 'WEAK':
      return 'orange'
    case 'CRITICAL':
      return 'red'
    default:
      return 'gray'
  }
}

watch(examId, () => loadDetail())
watch(detail, () => {
  void loadLearningReport()
})
onMounted(loadDetail)
</script>

<style lang="scss" scoped>
.score-detail {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__questions-card {
    margin-top: 8px;
  }

  &__empty {
    padding: 48px 0;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
  }
}

.questions-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--dp-surface-soft, #f8fafc);
    font-weight: 600;
  }
}

.score-cell {
  font-variant-numeric: tabular-nums;

  &--strong {
    font-weight: 700;
  }

  &--full {
    color: var(--ant-color-success, #16a34a);
  }

  &--partial {
    color: var(--ant-color-warning, #ea580c);
  }

  &--zero {
    color: var(--ant-color-error, #dc2626);
  }
}

.score-detail__cluster-select {
  min-width: 200px;
}

.question-no-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.question-no-cell__cluster {
  cursor: pointer;
}

.question-ai-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 4px;
}

.question-ai-tip__text {
  margin: 0;
  line-height: 1.7;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}

.score-detail__profile-card {
  margin-top: 16px;
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
