<template>
  <GiPageLayout>
    <div class="student-score-page">
      <!-- Hero 概览卡片 -->
      <UiPageCard :show-header="false" class="student-score-page__hero-card">
        <a-spin :spinning="loading" class="hero-spin">
          <div class="student-score-page__hero">
            <div class="student-score-page__hero-main">
              <div class="student-score-page__title-row">
                <h1 class="student-score-page__title">我的成绩</h1>
                <UiTag tone="blue" size="md">{{ exams.length }} 场考试</UiTag>
                <UiTag v-if="publishedCount > 0" tone="green" size="md">已发布 {{ publishedCount }}</UiTag>
              </div>
              <div class="student-score-page__meta">
                <span>查看你已参加的考试与已发布成绩；满足窗口条件可发起复核。</span>
              </div>
            </div>
            <div class="student-score-page__hero-actions">
              <UiButton variant="outline" size="md" :loading="loading" @click="loadExams">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新数据
              </UiButton>
            </div>
          </div>

          <div class="student-score-page__summary-grid">
            <div class="workspace-summary workspace-summary--accent">
              <span class="workspace-summary__label">最近一场已发布</span>
              <strong class="workspace-summary__value">
                {{ latestPublished?.finalScore != null ? latestPublished.finalScore.toFixed(2) : '暂无' }}
              </strong>
              <span class="workspace-summary__desc">
                {{ latestPublished?.examName || '尚未有已发布成绩' }}
              </span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">已确认未发布</span>
              <strong class="workspace-summary__value">{{ confirmedCount }}</strong>
              <span class="workspace-summary__desc">已确认但尚未公开发布</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">可发起复核</span>
              <strong class="workspace-summary__value">{{ reviewableCount }}</strong>
              <span class="workspace-summary__desc">在复核窗口期内的考试</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <!-- 最近一场已发布详情卡 -->
      <UiCard v-if="latestPublished" class="student-score-page__latest-card">
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
              <strong>{{ latestPublished.finalScore?.toFixed(2) ?? '-' }}</strong>
            </p>
            <p class="score-helper">满分明细请进入详情页</p>
          </div>
          <div class="latest-grid__info">
            <div class="info-row">
              <span class="info-label">考试名称</span>
              <span class="info-value">{{ latestPublished.examName || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">考试编号</span>
              <span class="info-value">{{ latestPublished.examNo || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">开始时间</span>
              <span class="info-value">{{ formatTime(latestPublished.examStartTime) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">发布时间</span>
              <span class="info-value">{{ formatTime(latestPublished.publishedTime) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">复核窗口</span>
              <span class="info-value">
                <template v-if="latestPublished.reviewWindowStatus === 'ACTIVE'">
                  {{ formatTime(latestPublished.reviewWindowOpenTime) }}
                  <span class="muted"> 至 </span>
                  {{ formatTime(latestPublished.reviewWindowCloseTime) }}
                </template>
                <span v-else class="muted">未开放</span>
              </span>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 全部考试列表 -->
      <UiCard class="student-score-page__list-card">
        <template #title>
          <FileOutlined />
          <span>全部考试</span>
          <UiBadge tone="blue">{{ exams.length }} 场</UiBadge>
        </template>

        <a-spin :spinning="loading">
          <UiEmpty v-if="!loading && exams.length === 0" description="您当前没有任何考试记录" />

          <div v-else class="exam-card-list">
            <article
              v-for="item in exams"
              :key="item.examId"
              class="exam-card"
              :class="{ 'exam-card--published': item.finalScoreStatus === 'PUBLISHED' }"
            >
              <div class="exam-card__header">
                <div class="exam-card__title-row">
                  <h3 class="exam-card__title">{{ item.examName || '未命名考试' }}</h3>
                  <UiTag
                    v-if="item.finalScoreStatus"
                    :tone="FINAL_SCORE_STATUS_TONE[item.finalScoreStatus]"
                    size="sm"
                  >
                    {{ FINAL_SCORE_STATUS_LABEL[item.finalScoreStatus] }}
                  </UiTag>
                  <UiTag v-else tone="gray" size="sm">未生成</UiTag>
                  <UiTag
                    v-if="item.reviewWindowStatus === 'ACTIVE'"
                    tone="orange"
                    size="sm"
                  >
                    复核中
                  </UiTag>
                </div>
                <div class="exam-card__meta">
                  <span class="meta-item">
                    <CalendarOutlined />
                    {{ formatTime(item.examStartTime) }}
                  </span>
                  <span class="meta-item">编号：{{ item.examNo || '-' }}</span>
                </div>
              </div>

              <div class="exam-card__score-grid">
                <div class="score-item">
                  <p class="score-item__label">本次得分</p>
                  <p class="score-item__value" :class="{ 'is-empty': item.finalScoreStatus !== 'PUBLISHED' }">
                    <template v-if="item.finalScoreStatus === 'PUBLISHED' && item.finalScore != null">
                      {{ item.finalScore.toFixed(2) }}
                    </template>
                    <template v-else>--</template>
                  </p>
                </div>
                <div class="score-item">
                  <p class="score-item__label">考试编号</p>
                  <p class="score-item__value" :class="{ 'is-empty': !item.examNo }">
                    {{ item.examNo || '--' }}
                  </p>
                </div>
                <div class="score-item">
                  <p class="score-item__label">发布时间</p>
                  <p class="score-item__value">{{ formatTime(item.publishedTime) }}</p>
                </div>
                <div class="score-item">
                  <p class="score-item__label">复核窗口</p>
                  <p class="score-item__value">
                    <template v-if="item.reviewWindowStatus === 'ACTIVE'">
                      <UiTag tone="orange" size="sm">开放中</UiTag>
                    </template>
                    <template v-else-if="item.reviewWindowStatus === 'CLOSED'">
                      <UiTag tone="gray" size="sm">已关闭</UiTag>
                    </template>
                    <template v-else>
                      <span class="muted">未开放</span>
                    </template>
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
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type {StudentExamItemVO} from '@/apis/mark/student-exam';
import CalendarOutlined from '@ant-design/icons-vue/CalendarOutlined'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import EyeOutlined from '@ant-design/icons-vue/EyeOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
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

defineOptions({ name: 'StudentScore' })

const router = useRouter()
const loading = ref(false)
const exams = ref<StudentExamItemVO[]>([])

const latestPublished = computed<StudentExamItemVO | null>(() => {
  return exams.value.find(e => e.finalScoreStatus === 'PUBLISHED') ?? null
})

const publishedCount = computed(
  () => exams.value.filter(e => e.finalScoreStatus === 'PUBLISHED').length,
)
const confirmedCount = computed(
  () => exams.value.filter(e => e.finalScoreStatus === 'CONFIRMED').length,
)
const reviewableCount = computed(() => exams.value.filter(canSubmitReview).length)

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
.student-score-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.student-score-page__hero {
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

.student-score-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.student-score-page__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
  margin: 0;
}

.student-score-page__meta {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}

.student-score-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.08) 0%, rgba(82, 196, 26, 0.02) 100%);
    border: 1px solid rgba(82, 196, 26, 0.18);
    border-radius: var(--dp-radius-md, 8px);

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
  border-radius: var(--dp-radius-md, 8px);
  background: #fff;
  padding: 16px 20px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

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

.muted {
  color: var(--ant-color-text-tertiary);
}

.hero-spin {
  width: 100%;
}
</style>
