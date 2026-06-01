<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="student-score__context">
        <div class="student-score__context-info">
          <h2 class="student-score__title">成绩查询</h2>
          <UiTag tone="blue" size="sm"> {{ exams.length }} 场考试 </UiTag>
          <UiTag v-if="publishedCount > 0" tone="green" size="sm">
            已发布 {{ publishedCount }}
          </UiTag>
        </div>
        <div class="student-score__context-actions">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadExams">
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <!-- 最近一场已发布详情卡 -->
    <UiCard v-if="latestPublished" class="student-score__latest-card">
      <template #title>
        <CheckCircleOutlined />
        <span>最近一场已发布成绩</span>
        <UiBadge tone="green">已发布</UiBadge>
      </template>
      <template #extra>
        <a-space>
          <UiButton size="sm" @click="goDetail(latestPublished.examId)">查看明细</UiButton>
          <UiButton
            v-if="canSubmitReview(latestPublished)"
            variant="outline"
            size="sm"
            @click="goAppeal(latestPublished.examId)"
          >
            提交复核
          </UiButton>
        </a-space>
      </template>

      <div class="latest-grid">
        <div class="latest-grid__score">
          <p class="score-label">本次得分</p>
          <p class="score-value">
            <strong>{{ formatPublishedScore(latestPublished) }}</strong>
          </p>
          <p class="score-helper">满分明细请进入详情页</p>
        </div>
        <div class="latest-grid__info">
          <div class="info-row">
            <span class="info-label">考试名称</span>
            <span class="info-value">{{ latestPublished.examName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">考务编号</span>
            <span class="info-value">{{ latestPublished.examNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">开始时间</span>
            <span class="info-value">{{ formatDateTime(latestPublished.examStartTime) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">发布时间</span>
            <span class="info-value">{{ requirePublishedTime(latestPublished) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">复核窗口</span>
            <span class="info-value">
              <template v-if="latestPublished.reviewWindowStatus === 'ACTIVE'">
                {{ formatDateTime(latestPublished.reviewWindowOpenTime) }}
                <span class="student-score__hint"> 至 </span>
                {{ formatDateTime(latestPublished.reviewWindowCloseTime) }}
              </template>
              <UiTag v-else :tone="reviewWindowStatusTone(latestPublished)" size="sm">
                {{ reviewWindowStatusLabel(latestPublished) }}
              </UiTag>
            </span>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- D-6 个性化洞察（基于 exams 已加载数据派生，零额外 RPC） -->
    <UiStatPanel
      v-if="insightItems.length > 0"
      :items="insightItems"
      :columns="3"
      variant="grid"
      compact
      class="student-score__insights"
    />

    <!-- 全部考试列表 -->
    <UiCard class="student-score__list-card">
      <template #title>
        <FileOutlined />
        <span>全部考试</span>
        <UiBadge tone="blue">{{ exams.length }} 场</UiBadge>
      </template>

      <a-spin :spinning="loading">
        <!-- D-9 错误态：考试列表加载失败时提供重试入口（学生侧无上报入口） -->
        <UiErrorRetryPanel
          v-if="examsLoadError"
          :error="examsLoadError"
          title="考试列表加载失败"
          :show-report="false"
          compact
          @retry="loadExams"
        />
        <UiEmpty v-else-if="!loading && exams.length === 0" description="您当前没有任何考试记录" />

        <div v-else class="exam-card-list">
          <article
            v-for="item in exams"
            :key="item.examId"
            class="exam-card"
            :class="{ 'exam-card--published': item.finalScoreStatus === 'PUBLISHED' }"
          >
            <div class="exam-card__header">
              <div class="exam-card__title-row">
                <h3 class="exam-card__title">{{ item.examName }}</h3>
                <UiTag :tone="finalScoreStatusTone(item)" size="sm">
                  {{ finalScoreStatusLabel(item) }}
                </UiTag>
                <UiTag v-if="item.reviewWindowStatus === 'ACTIVE'" tone="orange" size="sm">
                  复核中
                </UiTag>
              </div>
              <div class="exam-card__meta">
                <span class="meta-item">
                  <CalendarOutlined />
                  {{ formatDateTime(item.examStartTime) }}
                </span>
                <span class="meta-item">编号：{{ item.examNo }}</span>
              </div>
            </div>

            <div class="exam-card__score-grid">
              <div class="score-item">
                <p class="score-item__label">本次得分</p>
                <p
                  class="score-item__value"
                  :class="{ 'is-empty': item.finalScoreStatus !== 'PUBLISHED' }"
                >
                  <template v-if="item.finalScoreStatus === 'PUBLISHED'">
                    {{ formatPublishedScore(item) }}
                  </template>
                  <template v-else>--</template>
                </p>
              </div>
              <div class="score-item">
                <p class="score-item__label">考务编号</p>
                <p class="score-item__value">
                  {{ item.examNo }}
                </p>
              </div>
              <div class="score-item">
                <p class="score-item__label">发布时间</p>
                <p class="score-item__value">
                  <template v-if="item.finalScoreStatus === 'PUBLISHED'">
                    {{ requirePublishedTime(item) }}
                  </template>
                  <template v-else>--</template>
                </p>
              </div>
              <div class="score-item">
                <p class="score-item__label">复核窗口</p>
                <p class="score-item__value">
                  <UiTag :tone="reviewWindowStatusTone(item)" size="sm">
                    {{ reviewWindowStatusLabel(item) }}
                  </UiTag>
                </p>
              </div>
            </div>

            <div class="exam-card__actions">
              <UiButton
                size="sm"
                variant="outline"
                :disabled="item.finalScoreStatus !== 'PUBLISHED'"
                @click="goDetail(item.examId)"
              >
                <template #icon>
                  <EyeOutlined />
                </template>
                查看详情
              </UiButton>
              <UiButton
                size="sm"
                :variant="canSubmitReview(item) ? 'primary' : 'ghost'"
                :disabled="!canSubmitReview(item)"
                @click="goAppeal(item.examId)"
              >
                <template #icon>
                  <FormOutlined />
                </template>
                提交复核
              </UiButton>
            </div>
          </article>
        </div>
      </a-spin>
    </UiCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { StudentExamItemVO } from '@/apis/mark/student-exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CalendarOutlined from '@ant-design/icons-vue/CalendarOutlined'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import EyeOutlined from '@ant-design/icons-vue/EyeOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  canSubmitReview,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  listMyExams,
  STUDENT_REVIEW_WINDOW_STATUS_LABEL,
  STUDENT_REVIEW_WINDOW_STATUS_TONE,
} from '@/apis/mark/student-exam'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentScore' })

const router = useRouter()
const loading = ref(false)
// D-9 错误态：学生考试列表加载失败时 UiErrorRetryPanel 重试（学生侧不提供上报入口）
const examsLoadError = ref<Error | null>(null)
const exams = ref<StudentExamItemVO[]>([])

function finalScoreStatusTone(item: StudentExamItemVO): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, item.finalScoreStatus, '最终成绩状态')
}

function finalScoreStatusLabel(item: StudentExamItemVO): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, item.finalScoreStatus, '最终成绩状态')
}

function reviewWindowStatusTone(item: StudentExamItemVO): BadgeTone {
  return strictEnumTone(STUDENT_REVIEW_WINDOW_STATUS_TONE, item.reviewWindowStatus, '复核窗口状态')
}

function reviewWindowStatusLabel(item: StudentExamItemVO): string {
  return strictEnumLabel(
    STUDENT_REVIEW_WINDOW_STATUS_LABEL,
    item.reviewWindowStatus,
    '复核窗口状态',
  )
}

const latestPublished = computed<StudentExamItemVO | null>(() => {
  return exams.value.find((e) => e.finalScoreStatus === 'PUBLISHED') ?? null
})

const publishedCount = computed(
  () => exams.value.filter((e) => e.finalScoreStatus === 'PUBLISHED').length,
)

// ─── D-6 个性化洞察派生 ────────────────────────────────
/** 按发布时间倒序的已发布考试 */
const publishedExamsSorted = computed<StudentExamItemVO[]>(() => {
  return exams.value
    .filter((e) => e.finalScoreStatus === 'PUBLISHED')
    .slice()
    .sort((a, b) => {
      const ta = requirePublishedTimestamp(a)
      const tb = requirePublishedTimestamp(b)
      return tb - ta
    })
})

/** 复核窗口当前开放中的考试数 */
const reviewOpenCount = computed<number>(() => {
  return exams.value.filter((e) => e.reviewWindowStatus === 'ACTIVE').length
})

/** 成绩尚未发布的考试数（PENDING / CALCULATED / CONFIRMED / CORRECTED / WITHDRAWN 都算"未在学生侧可见") */
const unpublishedCount = computed<number>(() => {
  return exams.value.filter((e) => {
    const s = e.finalScoreStatus
    return s !== 'PUBLISHED'
  }).length
})

/** 最近两次发布的分数差（最新 - 上一次），无足够数据返回 null */
const scoreTrend = computed<{ diff: number, latest: number, previous: number } | null>(() => {
  const list = publishedExamsSorted.value
  if (list.length < 2) return null
  const latest = requirePublishedScore(list[0])
  const previous = requirePublishedScore(list[1])
  return { diff: latest - previous, latest, previous }
})

/** 个性化洞察 KPI 列表（含趋势 / 复核窗口 / 待发布等待） */
const insightItems = computed(() => {
  const items: Array<{
    key: string
    label: string
    value: string | number
    unit?: string
    helper?: string
    tone?: BadgeTone
  }> = []

  // 趋势卡：仅在至少 2 次发布后展示
  if (scoreTrend.value) {
    const diff = scoreTrend.value.diff
    const absDiff = Math.abs(diff).toFixed(2)
    if (diff > 0) {
      items.push({
        key: 'trend',
        label: '较上次趋势',
        value: `+${absDiff}`,
        unit: '分',
        helper: `本次 ${scoreTrend.value.latest.toFixed(2)} · 上次 ${scoreTrend.value.previous.toFixed(2)}`,
        tone: 'green',
      })
    } else if (diff < 0) {
      items.push({
        key: 'trend',
        label: '较上次趋势',
        value: `-${absDiff}`,
        unit: '分',
        helper: `本次 ${scoreTrend.value.latest.toFixed(2)} · 上次 ${scoreTrend.value.previous.toFixed(2)}`,
        tone: 'orange',
      })
    } else {
      items.push({
        key: 'trend',
        label: '较上次趋势',
        value: '持平',
        helper: `本次与上次同为 ${scoreTrend.value.latest.toFixed(2)}`,
        tone: 'blue',
      })
    }
  } else if (publishedExamsSorted.value.length === 1) {
    items.push({
      key: 'trend',
      label: '首次发布',
      value: formatPublishedScore(publishedExamsSorted.value[0]),
      unit: '分',
      helper: '后续考试发布后此处会显示趋势对比',
      tone: 'blue',
    })
  }

  // 复核窗口提示
  if (reviewOpenCount.value > 0) {
    items.push({
      key: 'review-window',
      label: '复核窗口开放',
      value: reviewOpenCount.value,
      unit: '场',
      helper: '可立即提交复核申请',
      tone: 'orange',
    })
  } else if (publishedCount.value > 0) {
    items.push({
      key: 'review-window',
      label: '复核窗口',
      value: '已关闭',
      helper: '当前无可申诉的考试',
      tone: 'gray',
    })
  }

  // 待发布等待
  if (unpublishedCount.value > 0) {
    items.push({
      key: 'unpublished',
      label: '待发布等待',
      value: unpublishedCount.value,
      unit: '场',
      helper: '等待教师确认成绩',
      tone: 'purple',
    })
  }

  return items
})

async function loadExams() {
  loading.value = true
  examsLoadError.value = null
  try {
    const loadedExams = await listMyExams()
    validatePublishedExamContracts(loadedExams)
    exams.value = loadedExams
  } catch (error) {
    examsLoadError.value = toUserError(error, '考试列表加载失败')
    showUserError(error, '考试成绩列表加载失败')
  } finally {
    loading.value = false
  }
}

/** 校验学生成绩列表的发布态合同，避免模板渲染阶段才暴露缺失字段。 */
function validatePublishedExamContracts(list: StudentExamItemVO[]): void {
  for (const item of list) {
    if (item.finalScoreStatus === 'PUBLISHED' && item.finalScore == null) {
      throw new Error(`已发布成绩缺少发布成绩：examId=${item.examId}`)
    }
    if (item.finalScoreStatus === 'PUBLISHED' && !item.publishedTime) {
      throw new Error(`已发布成绩缺少发布时间：examId=${item.examId}`)
    }
  }
}

function requirePublishedScore(item: StudentExamItemVO): number {
  return item.finalScore as number
}

function formatPublishedScore(item: StudentExamItemVO): string {
  return requirePublishedScore(item).toFixed(2)
}

function requirePublishedTime(item: StudentExamItemVO): string {
  return formatDateTime(requirePublishedTimestamp(item))
}

function requirePublishedTimestamp(item: StudentExamItemVO): number {
  return new Date(item.publishedTime as string).getTime()
}

function goDetail(examId: string) {
  router.push({ name: 'StudentScoreDetail', params: { examId } })
}

function goAppeal(examId: string) {
  router.push({ name: 'StudentAppeal', query: { examId } })
}

onMounted(loadExams)
</script>

<style lang="scss" scoped>
.student-score {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-info {
    flex: 1;
    min-width: 240px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__latest-card {
    margin-bottom: 16px;
  }

  &__insights {
    margin-bottom: 16px;
  }

  &__list-card {
    margin-top: 8px;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
  }
}

.latest-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  align-items: stretch;

  &__score {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    /* 与全站其他卡片视觉对齐：用纯色浅绿底 + 1px 边框，去除 135deg 渐变 */
    background: var(--dp-green-50, #f0fdf4);
    border: 1px solid var(--dp-green-200, #bbf7d0);
    border-radius: var(--dp-radius-md, 6px);

    .score-label {
      font-size: 12px;
      color: var(--ant-color-text-tertiary);
      margin: 0 0 8px;
    }

    .score-value {
      margin: 0;
      font-size: 14px;
      color: var(--ant-color-text-secondary);

      strong {
        font-size: 36px;
        font-weight: 700;
        color: var(--ant-color-success);
        line-height: 1.2;
      }

      .score-unit {
        margin-left: 4px;
      }
    }

    .score-helper {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--ant-color-text-tertiary);
    }
  }

  &__info {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    align-content: center;

    .info-row {
      display: grid;
      grid-template-columns: 96px 1fr;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px dashed var(--ant-color-border-secondary);

      &:last-child {
        border-bottom: none;
      }

      .info-label {
        color: var(--ant-color-text-tertiary);
      }

      .info-value {
        color: var(--ant-color-text);
        font-weight: 500;
      }
    }
  }
}

.exam-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exam-card {
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 6px);
  background: #fff;
  padding: 16px 20px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: rgba(22, 119, 255, 0.3);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  }

  &--published {
    border-left: 3px solid var(--ant-color-success);
  }

  &__header {
    margin-bottom: 12px;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ant-color-text);
    margin: 0;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
    color: var(--ant-color-text-secondary);
    flex-wrap: wrap;

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }

  &__score-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 12px;
  }

  &__actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
}

.score-item {
  text-align: center;
  padding: 10px 12px;
  background: var(--ant-color-fill-quaternary);
  border-radius: var(--dp-radius-sm, 6px);

  &__label {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--ant-color-text);

    &.is-empty {
      color: var(--ant-color-text-tertiary);
      font-weight: 400;
    }
  }
}
</style>
