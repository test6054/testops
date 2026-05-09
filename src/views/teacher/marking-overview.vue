<template>
  <GiPageLayout>
    <div class="overview-page">
      <!-- Hero -->
      <UiPageCard :show-header="false" class="overview-page__hero-card">
        <a-spin :spinning="loading" class="hero-spin">
          <div class="overview-page__hero">
            <div class="overview-page__hero-main">
              <div class="overview-page__title-row">
                <h1 class="overview-page__title">阅卷总览</h1>
                <UiTag tone="blue" size="md">{{ exams.length }} 场考试</UiTag>
                <UiTag v-if="filteredExams.length !== exams.length" tone="purple" size="md">
                  筛选后 {{ filteredExams.length }} 场
                </UiTag>
              </div>
            </div>
            <div class="overview-page__hero-actions">
              <UiButton variant="outline" size="md" :loading="loading" @click="loadExams">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </UiButton>
            </div>
          </div>

          <div class="overview-page__summary-grid">
            <div class="workspace-summary workspace-summary--accent">
              <span class="workspace-summary__label">考试总数</span>
              <strong class="workspace-summary__value">{{ exams.length }}</strong>
              <span class="workspace-summary__desc">本租户最近 200 场</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">进行中</span>
              <strong class="workspace-summary__value">{{ activeCount }}</strong>
              <span class="workspace-summary__desc">ACTIVE 状态</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">已关闭</span>
              <strong class="workspace-summary__value">{{ closedCount }}</strong>
              <span class="workspace-summary__desc">CLOSED 状态</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">近 7 天考试</span>
              <strong class="workspace-summary__value">{{ recentCount }}</strong>
              <span class="workspace-summary__desc">考试时间在近 7 天内</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <!-- 筛选 -->
      <UiCard class="overview-page__filter-card">
        <template #title>
          <SearchOutlined />
          <span>筛选条件</span>
        </template>

        <a-space wrap>
          <a-input
            v-model:value="keyword"
            placeholder="按考试名称搜索"
            allow-clear
            style="width: 240px"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
          <a-select
            v-model:value="statusFilter"
            placeholder="按状态过滤"
            allow-clear
            style="width: 160px"
            :options="statusOptions"
          />
          <a-typography-text type="secondary">
            符合条件 {{ filteredExams.length }} 场
          </a-typography-text>
        </a-space>
      </UiCard>

      <!-- 列表 -->
      <a-spin :spinning="loading" tip="正在加载考试...">
        <UiEmpty
          v-if="filteredExams.length === 0 && !loading"
          description="暂无可参与批阅的考试"
          class="empty-block"
        />

        <a-row v-else :gutter="[16, 16]" class="exam-grid">
          <a-col v-for="exam in filteredExams" :key="exam.examId" :xs="24" :sm="12" :md="8" :xl="6">
            <UiCard class="exam-card" hoverable>
              <template #title>
                <div class="card-header">
                  <a-typography-text
                    strong
                    :content="exam.examName"
                    :ellipsis="{ tooltip: true }"
                    class="exam-title"
                  />
                  <UiTag :tone="EXAM_STATUS_TONE[exam.status] || 'gray'" size="sm">
                    {{ exam.statusMessage || EXAM_STATUS_LABEL[exam.status] || '-' }}
                  </UiTag>
                </div>
              </template>

              <div class="exam-meta">
                <div class="exam-meta__row">
                  <span class="exam-meta__label">开始</span>
                  <span class="exam-meta__value">{{ formatTime(exam.examStartTime) || '-' }}</span>
                </div>
                <div class="exam-meta__row">
                  <span class="exam-meta__label">结束</span>
                  <span class="exam-meta__value">{{ formatTime(exam.examEndTime) || '-' }}</span>
                </div>
                <div v-if="exam.examNo" class="exam-meta__row">
                  <span class="exam-meta__label">编号</span>
                  <span class="exam-meta__value">{{ exam.examNo }}</span>
                </div>
              </div>

              <a-divider class="divider" />

              <div class="quick-actions">
                <UiButton size="sm" variant="ghost" @click="goScanMonitor(exam.examId)">扫描监控</UiButton>
                <UiButton size="sm" variant="ghost" @click="goScanAttention(exam.examId)">扫描异常</UiButton>
                <UiButton size="sm" variant="ghost" @click="goReviewProgress(exam.examId)">复核进度</UiButton>
                <UiButton size="sm" variant="ghost" @click="goReviewAssignment(exam.examId)">复核任务池</UiButton>
                <UiButton size="sm" variant="ghost" @click="goArbitration(exam.examId)">仲裁复核</UiButton>
                <UiButton size="sm" variant="ghost" @click="goScoreFinalize(exam.examId)">成绩确认</UiButton>
              </div>
            </UiCard>
          </a-col>
        </a-row>
      </a-spin>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ExamStatusCode, ExamSummaryVO } from '@/apis/mark/exam'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  pageExams,
} from '@/apis/mark/exam'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiButton, UiCard, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherMarkingOverview' })

const statusOptions: Array<{ label: string, value: ExamStatusCode }> = [
  { label: EXAM_STATUS_LABEL.ACTIVE, value: 'ACTIVE' },
  { label: EXAM_STATUS_LABEL.CLOSED, value: 'CLOSED' },
]

const router = useRouter()

const exams = ref<ExamSummaryVO[]>([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<ExamStatusCode | undefined>(undefined)

const filteredExams = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return exams.value.filter((exam) => {
    if (kw && !(exam.examName || '').toLowerCase().includes(kw)) return false
    if (statusFilter.value && exam.status !== statusFilter.value) return false
    return true
  })
})

const activeCount = computed(() => exams.value.filter(e => e.status === 'ACTIVE').length)
const closedCount = computed(() => exams.value.filter(e => e.status === 'CLOSED').length)
const recentCount = computed(() => {
  const now = dayjs()
  const weekStart = now.subtract(7, 'day')
  return exams.value.filter((e) => {
    const startTime = e.examStartTime ? dayjs(e.examStartTime) : null
    return Boolean(startTime && startTime.isAfter(weekStart) && startTime.isBefore(now.add(7, 'day')))
  }).length
})

function formatTime(value?: string): string {
  if (!value) return ''
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function loadExams(): Promise<void> {
  loading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    exams.value = result.list ?? []
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : '考试列表加载失败'
    message.error(errMsg)
  }
  finally {
    loading.value = false
  }
}

function goScanMonitor(examId: string): void {
  void router.push({ name: 'TeacherScanUpload', query: { examId } })
}

function goScanAttention(examId: string): void {
  void router.push({ name: 'TeacherScanAttention', query: { examId } })
}

function goReviewProgress(examId: string): void {
  void router.push({ name: 'TeacherReviewProgress', query: { examId } })
}

function goReviewAssignment(examId: string): void {
  void router.push({ name: 'TeacherReviewAssignment', query: { examId } })
}

function goArbitration(examId: string): void {
  void router.push({ name: 'TeacherReviewArbitration', query: { examId } })
}

function goScoreFinalize(examId: string): void {
  void router.push({ name: 'TeacherScoreFinalize', query: { examId } })
}

onMounted(() => {
  void loadExams()
})
</script>

<style lang="scss" scoped>
.overview-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.hero-spin {
  width: 100%;
}

.overview-page__hero {
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
    gap: 8px;
    flex-shrink: 0;
  }
}

.overview-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.overview-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
}


.overview-page__summary-grid {
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
  }

  &__desc {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}

.exam-grid {
  margin: 0;
}

.exam-card {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.exam-title {
  flex: 1;
  min-width: 0;
}

.exam-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;

  &__row {
    display: flex;
    gap: 8px;
  }

  &__label {
    width: 40px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    color: var(--ant-color-text);
  }
}

.divider {
  margin: 12px 0 8px 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.empty-block {
  padding: 60px 0;
}
</style>
