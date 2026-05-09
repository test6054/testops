<template>
  <GiPageLayout>
    <div class="score-detail-page">
      <!-- 顶部 Hero 卡 -->
      <UiPageCard :show-header="false" class="score-detail-page__hero-card">
        <a-spin :spinning="loading" class="hero-spin">
          <div class="score-detail-page__hero">
            <div class="score-detail-page__hero-main">
              <button type="button" class="score-detail-page__back-link" @click="goBack">
                <LeftOutlined />
                返回成绩列表
              </button>

              <div class="score-detail-page__title-row">
                <h1 class="score-detail-page__title">{{ detail?.examName || '成绩详情' }}</h1>
                <UiTag v-if="detail?.finalScoreStatus" :tone="FINAL_SCORE_STATUS_TONE[detail.finalScoreStatus]" size="md">
                  {{ FINAL_SCORE_STATUS_LABEL[detail.finalScoreStatus] }}
                </UiTag>
                <UiTag v-else tone="gray" size="md">未生成</UiTag>
                <UiTag v-if="detail?.reviewWindowStatus === 'ACTIVE'" tone="orange" size="md">复核进行中</UiTag>
              </div>

              <div class="score-detail-page__meta">
                <span v-if="detail?.examNo">考试编号：{{ detail.examNo }}</span>
                <span v-if="detail?.examStartTime">考试时间：{{ formatTime(detail.examStartTime) }}</span>
                <span v-if="detail?.publishedTime">发布时间：{{ formatTime(detail.publishedTime) }}</span>
              </div>
            </div>

            <div class="score-detail-page__hero-actions">
              <UiButton size="sm" variant="outline" :loading="loading" @click="loadDetail">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </UiButton>
              <UiButton
                v-if="detail && canSubmitReview(detail)"
                size="sm"
                @click="goAppeal(detail.examId)"
              >
                <template #icon>
                  <FormOutlined />
                </template>
                提交复核申请
              </UiButton>
            </div>
          </div>

          <div v-if="detail" class="score-detail-page__summary-grid">
            <div class="workspace-summary workspace-summary--accent">
              <span class="workspace-summary__label">本次总分</span>
              <strong class="workspace-summary__value">
                {{ detail.finalScoreStatus === 'PUBLISHED' && detail.totalScore != null
                  ? detail.totalScore.toFixed(2)
                  : '--' }}
              </strong>
              <span class="workspace-summary__desc">
                {{ detail.finalScoreStatus === 'PUBLISHED' ? '已发布得分' : '成绩尚未公开发布' }}
              </span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">满分</span>
              <strong class="workspace-summary__value">
                {{ detail.fullScore != null ? detail.fullScore.toFixed(2) : '--' }}
              </strong>
              <span class="workspace-summary__desc">题目得分总和上限</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">得分率</span>
              <strong class="workspace-summary__value">
                {{ scoreRateText }}
              </strong>
              <span class="workspace-summary__desc">总分 ÷ 满分</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">复核窗口</span>
              <strong class="workspace-summary__value">{{ reviewWindowText }}</strong>
              <span class="workspace-summary__desc">{{ reviewWindowDesc }}</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <UiEmpty
        v-if="!loading && !detail"
        description="未查询到该考试的成绩详情"
        class="empty-block"
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
        <UiCard v-if="detail.finalScoreStatus === 'PUBLISHED'" class="score-detail-page__questions-card">
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

          <UiEmpty v-if="!detail.questions || detail.questions.length === 0" description="暂无题目得分明细" />

          <a-table
            v-else
            :columns="questionColumns"
            :data-source="detail.questions"
            :pagination="false"
            row-key="questionTemplateId"
            size="middle"
            class="questions-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'questionNo'">
                <UiTag tone="blue" size="sm">{{ record.questionNo || '-' }}</UiTag>
              </template>
              <template v-else-if="column.key === 'questionType'">
                <span>{{ record.questionType || '-' }}</span>
              </template>
              <template v-else-if="column.key === 'fullScore'">
                <span class="score-cell">{{ record.fullScore?.toFixed(2) ?? '-' }}</span>
              </template>
              <template v-else-if="column.key === 'finalScore'">
                <span
                  v-if="record.finalScore != null"
                  class="score-cell score-cell--strong"
                  :class="getScoreToneClass(record)"
                >
                  {{ record.finalScore.toFixed(2) }}
                </span>
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'objectiveResult'">
                <UiTag v-if="record.objectiveResult === 'CORRECT'" tone="green" size="sm">正确</UiTag>
                <UiTag v-else-if="record.objectiveResult === 'WRONG'" tone="red" size="sm">错误</UiTag>
                <UiTag v-else-if="record.objectiveResult === 'PARTIAL'" tone="orange" size="sm">部分正确</UiTag>
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'gradeStatus'">
                <UiTag :tone="getGradeStatusTone(record.gradeStatus)" size="sm">
                  {{ formatGradeStatus(record.gradeStatus) }}
                </UiTag>
              </template>
            </template>
          </a-table>
        </UiCard>
      </template>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type {StudentQuestionScoreVO, StudentScoreDetailVO} from '@/apis/mark/student-exam';
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import LeftOutlined from '@ant-design/icons-vue/LeftOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  canSubmitReview,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  getMyScoreDetail
  
  
} from '@/apis/mark/student-exam'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiPageCard,
  UiTag,
} from '@/components/ui-guide/ui'

defineOptions({ name: 'StudentScoreDetail' })

type GradeStatusTone = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detail = ref<StudentScoreDetailVO | null>(null)

const examId = computed<string | null>(() => {
  const value = route.params.examId
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return null
})

const questionColumns = [
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 100 },
  { title: '题型', key: 'questionType', dataIndex: 'questionType', width: 140 },
  { title: '满分', key: 'fullScore', dataIndex: 'fullScore', width: 100, align: 'right' as const },
  { title: '得分', key: 'finalScore', dataIndex: 'finalScore', width: 110, align: 'right' as const },
  { title: '客观判定', key: 'objectiveResult', dataIndex: 'objectiveResult', width: 130 },
  { title: '批改状态', key: 'gradeStatus', dataIndex: 'gradeStatus' },
]

const scoreRateText = computed(() => {
  const total = detail.value?.totalScore
  const full = detail.value?.fullScore
  if (detail.value?.finalScoreStatus !== 'PUBLISHED' || total == null || full == null || full <= 0) {
    return '--'
  }
  return `${((total / full) * 100).toFixed(1)}%`
})

const reviewWindowText = computed(() => {
  const status = detail.value?.reviewWindowStatus
  if (status === 'ACTIVE') return '开放中'
  if (status === 'CLOSED') return '已关闭'
  if (status === 'DRAFT') return '未启用'
  return '未开放'
})

const reviewWindowDesc = computed(() => {
  const d = detail.value
  if (!d || d.reviewWindowStatus !== 'ACTIVE') return '暂不接受复核申请'
  return `${formatTime(d.reviewWindowOpenTime)} 至 ${formatTime(d.reviewWindowCloseTime)}`
})

const correctCount = computed(() =>
  (detail.value?.questions ?? []).filter(isFullMark).length,
)
const partialCount = computed(() =>
  (detail.value?.questions ?? []).filter(q => isPartial(q) && !isFullMark(q) && !isZero(q)).length,
)
const zeroCount = computed(() =>
  (detail.value?.questions ?? []).filter(isZero).length,
)

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
    case 'CONFIRMED': return '已确认'
    case 'PENDING': return '待批改'
    case 'AI_GRADED': return 'AI 批改'
    case 'REVIEW_PENDING': return '待复核'
    case 'CORRECTED': return '已更正'
    default: return status || '-'
  }
}

function getGradeStatusTone(status?: string): GradeStatusTone {
  switch (status) {
    case 'CONFIRMED': return 'green'
    case 'CORRECTED': return 'purple'
    case 'AI_GRADED': return 'blue'
    case 'PENDING': return 'gray'
    case 'REVIEW_PENDING': return 'orange'
    default: return 'gray'
  }
}

async function loadDetail() {
  if (!examId.value) {
    message.warning('考试ID缺失')
    return
  }
  loading.value = true
  try {
    detail.value = await getMyScoreDetail(examId.value)
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载成绩详情失败'
    message.error(msg)
    detail.value = null
  }
  finally {
    loading.value = false
  }
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

function goBack() {
  router.push({ name: 'StudentScore' })
}

function goAppeal(id: string) {
  router.push({ name: 'StudentAppeal', query: { examId: id } })
}

watch(examId, () => loadDetail())
onMounted(loadDetail)
</script>

<style lang="scss" scoped>
.score-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.hero-spin {
  width: 100%;
}

.score-detail-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;

  &-main {
    flex: 1;
    min-width: 0;
  }

  &-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.score-detail-page__back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  margin-bottom: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--ant-color-primary);
  font-size: 13px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}

.score-detail-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.score-detail-page__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
  margin: 0;
}

.score-detail-page__meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
  flex-wrap: wrap;
}

.score-detail-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ant-color-border-secondary);
}

.workspace-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);

  &--accent {
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.06) 0%, rgba(82, 196, 26, 0.02) 100%);
    border-color: rgba(82, 196, 26, 0.18);
  }

  &__label {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ant-color-text);
  }

  &__desc {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}

.questions-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.score-cell {
  font-variant-numeric: tabular-nums;

  &--strong {
    font-weight: 700;
  }

  &--full {
    color: var(--ant-color-success);
  }

  &--partial {
    color: var(--ant-color-warning);
  }

  &--zero {
    color: var(--ant-color-error);
  }
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 48px 0;
}
</style>
