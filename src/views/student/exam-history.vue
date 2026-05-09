<template>
  <GiPageLayout>
    <div class="exam-history-page">
      <!-- 顶部 Hero 卡 -->
      <UiPageCard :show-header="false" class="exam-history-page__hero-card">
        <a-spin :spinning="loading" class="hero-spin">
          <div class="exam-history-page__hero">
            <div class="exam-history-page__hero-main">
              <div class="exam-history-page__title-row">
                <h1 class="exam-history-page__title">历次考试</h1>
                <UiTag tone="blue" size="md">{{ exams.length }} 场</UiTag>
                <UiTag v-if="publishedCount > 0" tone="green" size="md">已发布 {{ publishedCount }}</UiTag>
              </div>
              <div class="exam-history-page__meta">
                <span>按时间倒序展示个人参与过的所有考试，可下钻到题目维度的成绩详情。</span>
              </div>
            </div>

            <div class="exam-history-page__hero-actions">
              <UiButton variant="outline" size="md" :loading="loading" @click="loadExams">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </UiButton>
            </div>
          </div>

          <div class="exam-history-page__summary-grid">
            <div class="workspace-summary workspace-summary--accent">
              <span class="workspace-summary__label">已发布</span>
              <strong class="workspace-summary__value">{{ publishedCount }}</strong>
              <span class="workspace-summary__desc">已可查看题目得分</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">已确认未发布</span>
              <strong class="workspace-summary__value">{{ confirmedCount }}</strong>
              <span class="workspace-summary__desc">教师已确认评分</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">待计算 / 计算中</span>
              <strong class="workspace-summary__value">{{ pendingCount }}</strong>
              <span class="workspace-summary__desc">尚未推进到最终成绩</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">最新一场考试</span>
              <strong class="workspace-summary__value">{{ latestExamName }}</strong>
              <span class="workspace-summary__desc">{{ latestExamTimeText }}</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <!-- 筛选 + 列表 -->
      <UiCard class="exam-history-page__list-card">
        <template #title>
          <FileSearchOutlined />
          <span>考试列表</span>
          <UiBadge tone="blue">{{ filteredExams.length }} 条</UiBadge>
        </template>
        <template #extra>
          <a-space wrap>
            <a-input
              v-model:value="keyword"
              placeholder="按考试名称或编号筛选"
              allow-clear
              style="width: 240px"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </a-input>
            <a-select
              v-model:value="statusFilter"
              placeholder="成绩状态"
              allow-clear
              style="width: 160px"
              :options="statusOptions"
            />
          </a-space>
        </template>

        <UiEmpty v-if="!loading && filteredExams.length === 0" description="没有符合条件的考试" />

        <a-table
          v-else
          :columns="columns"
          :data-source="filteredExams"
          :loading="loading"
          :pagination="{ pageSize: 10, showSizeChanger: true }"
          row-key="examId"
          size="middle"
          class="history-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'examName'">
              <button type="button" class="link-cell" @click="goDetail(record.examId)">
                {{ record.examName || '未命名考试' }}
              </button>
              <div v-if="record.examNo" class="link-cell__sub">编号：{{ record.examNo }}</div>
            </template>
            <template v-else-if="column.key === 'finalScoreStatus'">
              <UiTag
                v-if="record.finalScoreStatus"
                :tone="FINAL_SCORE_STATUS_TONE[record.finalScoreStatus]"
                size="sm"
              >
                {{ FINAL_SCORE_STATUS_LABEL[record.finalScoreStatus] }}
              </UiTag>
              <UiTag v-else tone="gray" size="sm">未生成</UiTag>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <span
                v-if="record.finalScoreStatus === 'PUBLISHED' && record.finalScore != null"
                class="score-cell"
              >
                {{ record.finalScore.toFixed(2) }}
              </span>
              <span v-else class="muted">--</span>
            </template>
            <template v-else-if="column.key === 'examStartTime'">
              {{ formatTime(record.examStartTime) }}
            </template>
            <template v-else-if="column.key === 'publishedTime'">
              {{ formatTime(record.publishedTime) }}
            </template>
            <template v-else-if="column.key === 'reviewWindowStatus'">
              <UiTag v-if="record.reviewWindowStatus === 'ACTIVE'" tone="orange" size="sm">开放中</UiTag>
              <UiTag v-else-if="record.reviewWindowStatus === 'CLOSED'" tone="gray" size="sm">已关闭</UiTag>
              <span v-else class="muted">未开放</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton
                  size="sm"
                  variant="ghost"
                  :disabled="record.finalScoreStatus !== 'PUBLISHED'"
                  @click="goDetail(record.examId)"
                >
                  查看详情
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  :disabled="!canSubmitReview(record)"
                  @click="goAppeal(record.examId)"
                >
                  提交复核
                </UiButton>
              </a-space>
            </template>
          </template>
        </a-table>
      </UiCard>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type {FinalScoreStatusCode, StudentExamItemVO} from '@/apis/mark/student-exam';
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  canSubmitReview,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  
  listMyExams
  
} from '@/apis/mark/student-exam'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'StudentExamHistory' })

const router = useRouter()
const loading = ref(false)
const exams = ref<StudentExamItemVO[]>([])
const keyword = ref('')
const statusFilter = ref<FinalScoreStatusCode | undefined>(undefined)

const statusOptions: Array<{ value: FinalScoreStatusCode, label: string }> = [
  { value: 'PENDING', label: '待计算' },
  { value: 'CALCULATED', label: '已计算' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'CORRECTED', label: '已更正' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'WITHDRAWN', label: '已撤回' },
]

const columns = [
  { title: '考试', key: 'examName', dataIndex: 'examName', width: 260 },
  { title: '开始时间', key: 'examStartTime', dataIndex: 'examStartTime', width: 170 },
  { title: '成绩状态', key: 'finalScoreStatus', dataIndex: 'finalScoreStatus', width: 110 },
  { title: '得分', key: 'finalScore', dataIndex: 'finalScore', width: 100, align: 'right' as const },
  { title: '发布时间', key: 'publishedTime', dataIndex: 'publishedTime', width: 170 },
  { title: '复核窗口', key: 'reviewWindowStatus', dataIndex: 'reviewWindowStatus', width: 120 },
  { title: '操作', key: 'actions', fixed: 'right' as const, width: 200 },
]

const filteredExams = computed<StudentExamItemVO[]>(() => {
  return exams.value.filter((item) => {
    if (statusFilter.value && item.finalScoreStatus !== statusFilter.value) {
      return false
    }
    if (keyword.value.trim()) {
      const kw = keyword.value.trim().toLowerCase()
      const name = (item.examName || '').toLowerCase()
      const no = (item.examNo || '').toLowerCase()
      if (!name.includes(kw) && !no.includes(kw)) {
        return false
      }
    }
    return true
  })
})

const publishedCount = computed(
  () => exams.value.filter(e => e.finalScoreStatus === 'PUBLISHED').length,
)
const confirmedCount = computed(
  () => exams.value.filter(e => e.finalScoreStatus === 'CONFIRMED').length,
)
const pendingCount = computed(
  () => exams.value.filter(e => e.finalScoreStatus === 'PENDING' || e.finalScoreStatus === 'CALCULATED').length,
)
const latestExam = computed<StudentExamItemVO | null>(() => exams.value[0] ?? null)
const latestExamName = computed(() => latestExam.value?.examName || '暂无')
const latestExamTimeText = computed(() => formatTime(latestExam.value?.examStartTime))

async function loadExams() {
  loading.value = true
  try {
    exams.value = await listMyExams()
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载考试失败'
    message.error(msg)
  }
  finally {
    loading.value = false
  }
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
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
.exam-history-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.hero-spin {
  width: 100%;
}

.exam-history-page__hero {
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
    flex-shrink: 0;
  }
}

.exam-history-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.exam-history-page__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
  margin: 0;
}

.exam-history-page__meta {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}

.exam-history-page__summary-grid {
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
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.06) 0%, rgba(22, 119, 255, 0.02) 100%);
    border-color: rgba(22, 119, 255, 0.18);
  }

  &__label {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ant-color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__desc {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.history-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.link-cell {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--ant-color-primary);
  font-weight: 500;
  font-size: 14px;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }

  &__sub {
    margin-top: 2px;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }
}

.score-cell {
  font-weight: 700;
  color: var(--ant-color-success);
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--ant-color-text-tertiary);
}
</style>
