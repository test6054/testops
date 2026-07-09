<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="我的成绩">
        <template #status>
          <UiTag v-if="reviewOpenCount > 0" tone="orange" size="sm">
            复核开放 {{ reviewOpenCount }} 场
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadExams">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand v-if="!loading" :metrics="summarySignalMetrics" compact />
    </template>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 4 }" />

    <template v-else>
      <!-- 最近一场已发布详情卡 -->
      <WorkbenchSurfaceCard v-if="latestPublished" class="student-score__latest-card">
        <template #head>
          <div class="student-score__latest-head">
            <div class="student-score__latest-title">
              <CheckCircleOutlined />
              <span>最近一场已发布成绩</span>
              <UiTag tone="green" size="sm">已发布</UiTag>
            </div>
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
          </div>
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
      </WorkbenchSurfaceCard>

      <!-- D-6 个性化洞察（基于 exams 已加载数据派生，零额外 RPC） -->
      <SignalBand
        v-if="insightItems.length > 0"
        :metrics="insightSignalMetrics"
        compact
        class="student-score__insights"
      />

      <!-- 全部考试列表 -->
      <WorkbenchSurfaceCard flush class="student-score__list-card">
        <template #head>
          <div class="student-score__list-head">
            <FileOutlined />
            <span>全部考试</span>
          </div>
        </template>

        <UiDataTable
          pagination-mode="none"
          class="student-detail-table__data-table"
          :columns="examColumns"
          :data-source="exams"
          :loading="loading"
          :show-pagination="false"
          flat
          :total="exams.length"
          row-key="examId"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'examName'">
              <div>{{ record.examName }}</div>
              <div v-if="record.examNo" class="student-score__exam-no">
                编号：{{ record.examNo }}
              </div>
            </template>
            <template v-else-if="column.key === 'examStartTime'">
              {{ formatDateTime(record.examStartTime) }}
            </template>
            <template v-else-if="column.key === 'finalScoreStatus'">
              <UiTag :tone="finalScoreStatusTone(record)" size="sm">
                {{ finalScoreStatusLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <template v-if="record.finalScoreStatus === 'PUBLISHED'">
                {{ formatPublishedScore(record) }}
              </template>
              <span v-else class="student-score__muted">—</span>
            </template>
            <template v-else-if="column.key === 'publishedTime'">
              <template v-if="record.finalScoreStatus === 'PUBLISHED'">
                {{ requirePublishedTime(record) }}
              </template>
              <span v-else class="student-score__muted">—</span>
            </template>
            <template v-else-if="column.key === 'reviewWindowStatus'">
              <UiTag :tone="reviewWindowStatusTone(record)" size="sm">
                {{ reviewWindowStatusLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildExamScoreActions(record)"
                split
                @action="(key) => handleExamScoreAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { StudentExamItemVO } from '@/apis/mark/student-exam'
import type { BadgeTone, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import {
  canSubmitReview,
  listMyExams,
  ReviewWindowPolicyStatusDescription,
  STUDENT_REVIEW_WINDOW_STATUS_TONE,
} from '@/apis/mark/student-exam'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime, formatScore } from '@/utils/format'
import { toSignalMetrics } from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentScore' })

const router = useRouter()
const loading = ref(false)
const exams = ref<StudentExamItemVO[]>([])

const examColumns: ColumnType<StudentExamItemVO>[] = [
  { title: '考试', key: 'examName', width: 260 },
  { title: '开始时间', key: 'examStartTime', width: 170 },
  { title: '成绩状态', key: 'finalScoreStatus', width: 140 },
  { title: '得分', key: 'finalScore', width: 100, align: 'right' },
  { title: '发布时间', key: 'publishedTime', width: 170 },
  { title: '复核窗口', key: 'reviewWindowStatus', width: 120 },
  { title: '操作', key: 'actions', fixed: 'right', width: 200 },
]

function finalScoreStatusTone(item: StudentExamItemVO): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, item.finalScoreStatus, '最终成绩状态')
}

function finalScoreStatusLabel(item: StudentExamItemVO): string {
  return strictEnumLabel(FinalScoreStatusDescription, item.finalScoreStatus, '最终成绩状态')
}

function reviewWindowStatusTone(item: StudentExamItemVO): BadgeTone {
  return strictEnumTone(STUDENT_REVIEW_WINDOW_STATUS_TONE, item.reviewWindowStatus, '复核窗口状态')
}

function reviewWindowStatusLabel(item: StudentExamItemVO): string {
  return strictEnumLabel(
    ReviewWindowPolicyStatusDescription,
    item.reviewWindowStatus,
    '复核窗口状态',
  )
}

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
      const ta = a.publishedTime ? new Date(a.publishedTime).getTime() : 0
      const tb = b.publishedTime ? new Date(b.publishedTime).getTime() : 0
      return tb - ta
    })
})

const latestPublished = computed<StudentExamItemVO | null>(() => {
  return publishedExamsSorted.value[0] ?? null
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
  const latest = Number(list[0].finalScore)
  const previous = Number(list[1].finalScore)
  return { diff: latest - previous, latest, previous }
})

/** 个性化洞察 KPI 列表（含趋势 / 复核窗口 / 待发布等待） */
const insightItems = computed(() => {
  const items: Array<{
    key: string
    label: string
    value: string | number
    unit?: string
    tone?: BadgeTone
  }> = []

  // 趋势卡：仅在至少 2 次发布后展示
  if (scoreTrend.value) {
    const diff = scoreTrend.value.diff
    const absDiff = formatScore(Math.abs(diff), 'score')
    if (diff > 0) {
      items.push({
        key: 'trend',
        label: '较上次趋势',
        value: `+${absDiff}`,
        unit: '分',
        tone: 'green',
      })
    } else if (diff < 0) {
      items.push({
        key: 'trend',
        label: '较上次趋势',
        value: `-${absDiff}`,
        unit: '分',
        tone: 'orange',
      })
    } else {
      items.push({
        key: 'trend',
        label: '较上次趋势',
        value: '持平',
        tone: 'blue',
      })
    }
  } else if (publishedExamsSorted.value.length === 1) {
    items.push({
      key: 'trend',
      label: '首次发布',
      value: formatPublishedScore(publishedExamsSorted.value[0]),
      unit: '分',
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
      tone: 'orange',
    })
  } else if (publishedCount.value > 0) {
    items.push({
      key: 'review-window',
      label: '复核窗口',
      value: '已关闭',
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
      tone: 'purple',
    })
  }

  return items
})

const summarySignalMetrics = computed(() =>
  toSignalMetrics([
    {
      key: 'total',
      label: '考试总数',
      value: exams.value.length,
      unit: '场',
      tone: 'blue',
    },
    {
      key: 'published',
      label: '已发布',
      value: publishedCount.value,
      unit: '场',
      tone: publishedCount.value > 0 ? 'green' : 'gray',
    },
    {
      key: 'review-open',
      label: '复核开放',
      value: reviewOpenCount.value,
      unit: '场',
      tone: reviewOpenCount.value > 0 ? 'orange' : 'gray',
    },
  ]),
)

const insightSignalMetrics = computed(() => toSignalMetrics(insightItems.value))

async function loadExams() {
  loading.value = true
  try {
    const loadedExams = await listMyExams()
    exams.value = loadedExams
  } catch (error) {
    exams.value = []
    showUserError(error, '考试成绩列表加载失败')
  } finally {
    loading.value = false
  }
}

function formatPublishedScore(item: StudentExamItemVO): string {
  return formatScore(item.finalScore, 'score')
}

function requirePublishedTime(item: StudentExamItemVO): string {
  return formatDateTime(item.publishedTime)
}

function buildExamScoreActions(record: StudentExamItemVO): UiTableRowActionItem[] {
  return [
    {
      key: 'detail',
      label: '查看详情',
      disabled: record.finalScoreStatus !== 'PUBLISHED',
    },
    {
      key: 'appeal',
      label: '提交复核',
      tone: canSubmitReview(record) ? 'primary' : 'default',
      disabled: !canSubmitReview(record),
    },
  ]
}

function handleExamScoreAction(key: string, record: StudentExamItemVO): void {
  if (key === 'detail') {
    goDetail(record.examId)
  } else if (key === 'appeal') {
    goAppeal(record.examId)
  }
}

function goDetail(examId: string) {
  router.push({ name: 'StudentScoreDetail', params: { examId } })
}

function goAppeal(examId: string) {
  router.push({ name: 'StudentAppeal', query: { examId } })
}

onMounted(loadExams)

onActivated(loadExams)
</script>

<style lang="scss" scoped>
.student-score {
  &__latest-card {
    margin-bottom: 16px;
  }

  &__latest-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
  }

  &__latest-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: var(--dp-font-weight-title);
  }

  &__list-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: var(--dp-font-weight-title);
  }

  &__insights {
    margin-bottom: 16px;
  }

  &__list-card {
    margin-top: 8px;
  }

  &__hint {
    color: var(--dp-text-muted);
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
    background: var(--dp-green-50);
    border: 1px solid var(--dp-green-200);
    border-radius: var(--dp-radius-panel);

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
        font-weight: 600;
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

.student-score__exam-no {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.student-score__muted {
  color: var(--ant-color-text-tertiary);
}
</style>
