<template>
  <GiPageLayout>
    <div class="score-detail-page">
      <PageHeader :title="detail?.examName || '成绩详情'" back-route="/student/score">
        <template #tags>
          <UiTag
            v-if="detail?.finalScoreStatus"
            :tone="FINAL_SCORE_STATUS_TONE[detail.finalScoreStatus]"
            size="md"
          >
            {{ FINAL_SCORE_STATUS_LABEL[detail.finalScoreStatus] }}
          </UiTag>
          <UiTag v-else tone="gray" size="md">未生成</UiTag>
          <UiTag v-if="detail?.reviewWindowStatus === 'ACTIVE'" tone="orange" size="md">
            复核进行中
          </UiTag>
          <UiTag v-if="detail" tone="blue" size="md">
            {{
              detail.finalScoreStatus === 'PUBLISHED' && detail.totalScore != null
                ? detail.totalScore.toFixed(2)
                : '--'
            }}
            / {{ detail.fullScore != null ? detail.fullScore.toFixed(2) : '--' }}
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
      </PageHeader>

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
        <UiCard
          v-if="detail.finalScoreStatus === 'PUBLISHED'"
          class="score-detail-page__questions-card"
        >
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
                <UiTag tone="blue" size="sm">{{ asQuestion(record).questionNo || '-' }}</UiTag>
              </template>
              <template v-else-if="column.key === 'questionType'">
                <span>{{ asQuestion(record).questionType || '-' }}</span>
              </template>
              <template v-else-if="column.key === 'fullScore'">
                <span class="score-cell">{{
                  asQuestion(record).fullScore?.toFixed(2) ?? '-'
                }}</span>
              </template>
              <template v-else-if="column.key === 'finalScore'">
                <span
                  v-if="asQuestion(record).finalScore != null"
                  class="score-cell score-cell--strong"
                  :class="getScoreToneClass(asQuestion(record))"
                >
                  {{ asQuestion(record).finalScore!.toFixed(2) }}
                </span>
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'objectiveResult'">
                <UiTag
                  v-if="asQuestion(record).objectiveResult === 'CORRECT'"
                  tone="green"
                  size="sm"
                >
                  正确
                </UiTag>
                <UiTag
                  v-else-if="asQuestion(record).objectiveResult === 'WRONG'"
                  tone="red"
                  size="sm"
                >
                  错误
                </UiTag>
                <UiTag
                  v-else-if="asQuestion(record).objectiveResult === 'PARTIAL'"
                  tone="orange"
                  size="sm"
                >
                  部分正确
                </UiTag>
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'gradeStatus'">
                <UiTag :tone="getGradeStatusTone(asQuestion(record).gradeStatus)" size="sm">
                  {{ formatGradeStatus(asQuestion(record).gradeStatus) }}
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
import type { StudentQuestionScoreVO, StudentScoreDetailVO } from '@/apis/mark/student-exam'
import {
  canSubmitReview,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  getMyScoreDetail,
} from '@/apis/mark/student-exam'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiAlertStrip, UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

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

/** 模板类型桥接：将 a-table slot 的 Record<string, any> 转为真实 VO */
function asQuestion(record: Record<string, unknown>): StudentQuestionScoreVO {
  return record as unknown as StudentQuestionScoreVO
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
  try {
    detail.value = await getMyScoreDetail(examId.value)
  } catch (error) {
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
