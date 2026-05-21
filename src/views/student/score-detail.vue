<template>
  <StageWorkbenchShell>
    <!-- 上下文区 -->
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

    <!-- D-9 错误态：成绩详情加载失败时提供重试入口（学生侧无上报入口） -->
    <UiErrorRetryPanel
      v-if="detailLoadError"
      :error="detailLoadError"
      title="成绩详情加载失败"
      :helper="`考试 ID：${examId}`"
      :show-report="false"
      @retry="loadDetail"
    />

    <!-- 主工作面 -->
    <UiEmpty
      v-else-if="!loading && !detail"
      description="未查询到该考试的成绩详情"
      class="score-detail__empty"
    />

    <template v-else-if="detail">
      <!-- 成绩未发布提醒 -->
      <UiAlertStrip
        v-if="detail.finalScoreStatus !== 'PUBLISHED'"
        tone="info"
        title="成绩尚未发布"
        description="教师在确认并发布后，您将能在此页面看到本场考试的总分与每道题的得分明细。"
      />

      <!-- 题目得分明细 -->
      <UiCard v-if="detail.finalScoreStatus === 'PUBLISHED'" class="score-detail__questions-card">
        <template #title>
          <BarChartOutlined />
          <span>题目得分明细</span>
          <UiBadge tone="blue">{{ detail.questions?.length ?? 0 }} 道题</UiBadge>
        </template>
        <template #extra>
          <a-space>
            <UiTag tone="green" size="sm">满分 {{ correctCount }} 题</UiTag>
            <UiTag tone="orange" size="sm">部分得分 {{ partialCount }} 题</UiTag>
            <UiTag tone="red" size="sm">零分 {{ zeroCount }} 题</UiTag>
          </a-space>
        </template>

        <UiEmpty
          v-if="!detail.questions || detail.questions.length === 0"
          description="暂无题目得分明细"
        />

        <UiDataTable
          v-else
          :columns="questionColumns"
          :data-source="detailQuestions"
          :show-pagination="false"
          flat
          :total="detailQuestions.length"
          row-key="questionTemplateId"
          size="middle"
          class="questions-table"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'questionNo'">
              <UiTag tone="blue" size="sm">{{ detailQuestions[index].questionNo || '-' }}</UiTag>
            </template>
            <template v-else-if="column.key === 'questionType'">
              <span>{{ detailQuestions[index].questionType || '-' }}</span>
            </template>
            <template v-else-if="column.key === 'fullScore'">
              <span class="score-cell">{{
                detailQuestions[index].fullScore?.toFixed(2) ?? '-'
              }}</span>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <span
                v-if="detailQuestions[index].finalScore != null"
                class="score-cell score-cell--strong"
                :class="getScoreToneClass(detailQuestions[index])"
              >
                {{ (detailQuestions[index].finalScore ?? 0).toFixed(2) }}
              </span>
              <span v-else class="score-detail__hint">-</span>
            </template>
            <template v-else-if="column.key === 'objectiveResult'">
              <UiTag
                v-if="detailQuestions[index].objectiveResult === 'CORRECT'"
                tone="green"
                size="sm"
              >
                正确
              </UiTag>
              <UiTag
                v-else-if="detailQuestions[index].objectiveResult === 'WRONG'"
                tone="red"
                size="sm"
              >
                错误
              </UiTag>
              <UiTag
                v-else-if="detailQuestions[index].objectiveResult === 'PARTIAL'"
                tone="orange"
                size="sm"
              >
                部分正确
              </UiTag>
              <span v-else class="score-detail__hint">-</span>
            </template>
            <template v-else-if="column.key === 'gradeStatus'">
              <UiTag :tone="getGradeStatusTone(detailQuestions[index].gradeStatus)" size="sm">
                {{ formatGradeStatus(detailQuestions[index].gradeStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                v-if="canApplyReviewOnQuestion(detailQuestions[index])"
                size="sm"
                variant="ghost"
                @click="goAppealForQuestion(detailQuestions[index])"
              >
                对此题申请复核
              </UiButton>
              <span v-else class="score-detail__hint">-</span>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <!-- AI 个性化学情画像（仅成绩已发布时展示，数据由教师在成绩统计页生成） -->
      <UiCard v-if="detail.finalScoreStatus === 'PUBLISHED'" class="score-detail__profile-card">
        <template #title>
          <BulbOutlined />
          <span>AI 个性化学情画像</span>
          <UiBadge
            v-if="profileRecord?.analysisStatus"
            :tone="AI_ANALYSIS_STATUS_COLOR[profileRecord.analysisStatus]"
          >
            {{ AI_ANALYSIS_STATUS_LABEL[profileRecord.analysisStatus] }}
          </UiBadge>
        </template>
        <template #extra>
          <UiButton size="sm" variant="outline" :loading="profileLoading" @click="loadProfile">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>

        <a-spin :spinning="profileLoading">
          <UiAlertStrip
            v-if="profileLoadError"
            tone="error"
            title="AI 学情画像加载失败"
            :description="profileLoadError"
            dense
          />
          <UiAlertStrip
            v-else-if="!profileLoading && !profileRecord"
            tone="info"
            title="尚未生成 AI 学情画像"
            description="教师可在「成绩统计 → AI 学生个体学情分析」中为本场考试生成；生成后此处会自动显示个性化诊断与学习建议。"
            dense
          />
          <UiAlertStrip
            v-else-if="profileRecord?.errorMessage"
            tone="error"
            :title="`生成失败：${profileRecord.errorMessage}`"
            description="请联系任课教师在「成绩统计」页面重新生成。"
            dense
          />
          <div v-else-if="profileRecord" class="profile-block">
            <p v-if="profileResponse?.overallSummary" class="profile-summary">
              <strong>整体表现：</strong>{{ profileResponse.overallSummary }}
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
                        <span class="diagnosis-type">{{ item.questionType ?? '未知题型' }}</span>
                        <span class="diagnosis-rate">
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
          </div>
        </a-spin>
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { StudentQuestionScoreVO, StudentScoreDetailVO } from '@/apis/mark/student-exam'
import {
  canSubmitReview,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  getMyScoreDetail,
} from '@/apis/mark/student-exam'
import type { ExamTeachingAnalysisRecordVO } from '@/apis/mark/teaching-analysis'
import {
  AI_ANALYSIS_STATUS_COLOR,
  AI_ANALYSIS_STATUS_LABEL,
  getLatestStudentLearningProfile,
} from '@/apis/mark/teaching-analysis'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
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
// D-9 错误态：学生成绩详情加载失败时 UiErrorRetryPanel 重试入口
const detailLoadError = ref<unknown>(null)
const detail = ref<StudentScoreDetailVO | null>(null)

// computed 派生强类型题目数组，模板侧用 detailQuestions[index] 取 VO，避免 a-table slot record:any。
const detailQuestions = computed<StudentQuestionScoreVO[]>(() => detail.value?.questions ?? [])

const examId = computed<string | null>(() => {
  const value = route.params.examId
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return null
})

// 题目明细列：当成绩已发布且复核窗口开放时，追加「操作」列以承载题目级复核入口（B-4）
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
    (detail.value?.questions ?? []).filter((q) => isPartial(q) && !isFullMark(q) && !isZero(q))
      .length,
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

// ─── B-4 题目级复核入口 ────────────────────────────────────
/**
 * 判定单题是否可申请复核：
 * 1. 成绩处于发布且复核窗口开放（canSubmitReview）
 * 2. 该题已批改出 finalScore 且未满分（满分题不需要复核）
 */
function canApplyReviewOnQuestion(q: StudentQuestionScoreVO): boolean {
  if (!detail.value || !canSubmitReview(detail.value)) return false
  if (q.finalScore == null || q.fullScore == null) return false
  return q.finalScore < q.fullScore
}

/**
 * 题目级复核入口：跳转 StudentAppeal 并通过 query 传递 examId + questionId，
 * 供 appeal.vue 在 onMounted 后自动打开弹窗并预填题号字段。
 */
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

// ─── B-3 AI 学情画像（仅消费教师生成的最新结果，学生侧不触发生成） ───
interface ProfileDiagnosisItem {
  questionType?: string
  masteryLevel?: string
  scoreRate?: number
  lostQuestionNos?: Array<string | number>
  causeAnalysis?: string
  suggestion?: string
}

interface ProfileAiResponse {
  overallSummary?: string
  diagnosisItems?: ProfileDiagnosisItem[]
  suggestions?: string[]
}

const profileRecord = ref<ExamTeachingAnalysisRecordVO | null>(null)
const profileLoading = ref(false)
const profileLoadError = ref('')

const profileResponse = computed<ProfileAiResponse | null>(() => {
  const raw = profileRecord.value?.aiRawResponse
  if (!raw) return null
  try {
    return JSON.parse(raw) as ProfileAiResponse
  } catch {
    return null
  }
})

const profileDiagnosisItems = computed<ProfileDiagnosisItem[]>(
  () => profileResponse.value?.diagnosisItems ?? [],
)

const profileSuggestions = computed<string[]>(() => profileResponse.value?.suggestions ?? [])

async function loadProfile(): Promise<void> {
  // 仅当成绩已发布且 detail 已加载时拉取教师生成的最新画像
  if (!detail.value || detail.value.finalScoreStatus !== 'PUBLISHED') {
    profileRecord.value = null
    profileLoadError.value = ''
    return
  }
  if (!detail.value.examId || !detail.value.studentUserId) {
    profileRecord.value = null
    profileLoadError.value = '成绩详情缺少 examId 或 studentUserId，无法读取 AI 学情画像。'
    return
  }
  profileLoading.value = true
  profileLoadError.value = ''
  try {
    profileRecord.value = await getLatestStudentLearningProfile({
      examId: detail.value.examId,
      studentUserId: detail.value.studentUserId,
    })
  } catch (error) {
    profileLoadError.value = error instanceof Error ? error.message : 'AI 学情画像加载失败'
    profileRecord.value = null
  } finally {
    profileLoading.value = false
  }
}

function formatRate(rate?: number): string {
  if (rate == null) return '-'
  return `${(rate * 100).toFixed(1)}%`
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

/** masteryLevel 映射到 BadgeTone（与 StudentLearningProfileCard 的视觉风格保持一致） */
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
// detail 变化（成绩刷新 / 切换考试）后联动重新拉取学情画像
watch(detail, () => {
  void loadProfile()
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
