<template>
  <GiPageLayout>
    <div class="admin-dashboard">
      <!-- Hero -->
      <UiPageCard :show-header="false" class="admin-dashboard__hero-card">
        <a-spin :spinning="loading" class="hero-spin">
          <div class="admin-dashboard__hero">
            <div class="admin-dashboard__hero-main">
              <div class="admin-dashboard__title-row">
                <h1 class="admin-dashboard__title">阅卷概览</h1>
                <UiTag tone="blue" size="md">租户聚合视图</UiTag>
                <UiTag
                  v-if="incidentMetrics.unresolvedIncidentCount > 0"
                  tone="red"
                  size="md"
                >
                  待处理事件 {{ incidentMetrics.unresolvedIncidentCount }}
                </UiTag>
              </div>
              <div class="admin-dashboard__meta">
                <span>当前租户的阅卷规模、批改进度、异常告警与最近活动聚合视图。</span>
              </div>
            </div>
            <div class="admin-dashboard__hero-actions">
              <a-input-number
                v-model:value="recentLimit"
                :min="1"
                :max="50"
                addon-after="条"
                style="width: 140px"
              />
              <UiButton variant="outline" size="md" :loading="loading" @click="loadOverview">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新数据
              </UiButton>
              <UiButton size="md" @click="goAuditTrail">
                <template #icon>
                  <FileSearchOutlined />
                </template>
                批改审计
              </UiButton>
            </div>
          </div>

          <div class="admin-dashboard__summary-grid">
            <div class="workspace-summary workspace-summary--accent">
              <span class="workspace-summary__label">考试总数</span>
              <strong class="workspace-summary__value">{{ examMetrics.totalExamCount }}</strong>
              <span class="workspace-summary__desc">
                活跃 {{ examMetrics.activeExamCount }} · 已关闭 {{ examMetrics.closedExamCount }}
              </span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">考生总数</span>
              <strong class="workspace-summary__value">{{ examMetrics.totalCandidateCount }}</strong>
              <span class="workspace-summary__desc">参与考试的考生合计</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">已发布成绩</span>
              <strong class="workspace-summary__value">{{ gradingMetrics.publishedScoreCount }}</strong>
              <span class="workspace-summary__desc">
                已确认 {{ gradingMetrics.confirmedScoreCount }} · 已撤回 {{ gradingMetrics.withdrawnScoreCount }}
              </span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">近 30 天新增考试</span>
              <strong class="workspace-summary__value">{{ examMetrics.recentExamCount }}</strong>
              <span class="workspace-summary__desc">从近一个月窗口统计</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <!-- 批改进度 + 异常告警 -->
      <a-row :gutter="16">
        <a-col :xs="24" :lg="14">
          <UiCard class="metric-card">
            <template #title>
              <BarChartOutlined />
              <span>批改进度</span>
              <UiBadge tone="blue">活跃任务</UiBadge>
            </template>
            <div class="metric-grid metric-grid--cols-3">
              <div class="metric-cell">
                <p class="metric-cell__label">待计算 / 计算中</p>
                <p class="metric-cell__value warning">{{ gradingMetrics.pendingScoreCount }}</p>
              </div>
              <div class="metric-cell">
                <p class="metric-cell__label">已确认题目</p>
                <p class="metric-cell__value">{{ gradingMetrics.confirmedQuestionResultCount }}</p>
              </div>
              <div class="metric-cell">
                <p class="metric-cell__label">已发布成绩</p>
                <p class="metric-cell__value success">{{ gradingMetrics.publishedScoreCount }}</p>
              </div>
              <div class="metric-cell">
                <p class="metric-cell__label">已确认未发布</p>
                <p class="metric-cell__value info">{{ gradingMetrics.confirmedScoreCount }}</p>
              </div>
              <div class="metric-cell">
                <p class="metric-cell__label">待复核任务</p>
                <p class="metric-cell__value warning">{{ gradingMetrics.openReviewTaskCount }}</p>
              </div>
              <div class="metric-cell">
                <p class="metric-cell__label">未闭合处理任务</p>
                <p class="metric-cell__value warning">{{ gradingMetrics.openProcessingTaskCount }}</p>
              </div>
            </div>
          </UiCard>
        </a-col>

        <a-col :xs="24" :lg="10">
          <UiCard class="metric-card">
            <template #title>
              <ExclamationCircleOutlined />
              <span>异常告警</span>
              <UiBadge
                :tone="incidentMetrics.unresolvedIncidentCount > 0 ? 'red' : 'gray'"
              >
                {{ incidentMetrics.unresolvedIncidentCount > 0 ? '待处理' : '正常' }}
              </UiBadge>
            </template>
            <div class="metric-grid metric-grid--cols-2">
              <div class="metric-cell">
                <p class="metric-cell__label">未解决重大事件</p>
                <p
                  class="metric-cell__value"
                  :class="incidentMetrics.unresolvedIncidentCount > 0 ? 'danger' : ''"
                >
                  {{ incidentMetrics.unresolvedIncidentCount }}
                </p>
              </div>
              <div class="metric-cell">
                <p class="metric-cell__label">IQA 阻断页</p>
                <p
                  class="metric-cell__value"
                  :class="incidentMetrics.blockedPageCount > 0 ? 'warning' : ''"
                >
                  {{ incidentMetrics.blockedPageCount }}
                </p>
              </div>
              <div class="metric-cell">
                <p class="metric-cell__label">待修复影像</p>
                <p
                  class="metric-cell__value"
                  :class="incidentMetrics.pendingRepairActionCount > 0 ? 'warning' : ''"
                >
                  {{ incidentMetrics.pendingRepairActionCount }}
                </p>
              </div>
              <div class="metric-cell">
                <p class="metric-cell__label">待处置重复</p>
                <p
                  class="metric-cell__value"
                  :class="incidentMetrics.pendingDuplicateCount > 0 ? 'warning' : ''"
                >
                  {{ incidentMetrics.pendingDuplicateCount }}
                </p>
              </div>
            </div>
          </UiCard>
        </a-col>
      </a-row>

      <!-- 最近考试 + 最近事件 -->
      <a-row :gutter="16">
        <a-col :xs="24" :lg="14">
          <UiCard class="recent-exams-card">
            <template #title>
              <FileOutlined />
              <span>最近考试</span>
              <UiBadge tone="blue">{{ recentExams.length }} 场</UiBadge>
            </template>
            <template #extra>
              <UiButton size="sm" variant="ghost" @click="goAuditTrail">
                进入批改审计
              </UiButton>
            </template>

            <UiEmpty v-if="recentExams.length === 0" description="暂无考试" />

            <div v-else class="recent-exam-list">
              <article
                v-for="exam in recentExams"
                :key="exam.examId"
                class="recent-exam-item"
              >
                <div class="recent-exam-item__title-row">
                  <h3 class="recent-exam-item__title">{{ exam.examName || '未命名考试' }}</h3>
                  <UiTag
                    v-if="exam.status"
                    :tone="EXAM_STATUS_TONE[exam.status]"
                    size="sm"
                  >
                    {{ EXAM_STATUS_LABEL[exam.status] }}
                  </UiTag>
                </div>
                <div class="recent-exam-item__meta">
                  <span class="meta-item">编号：{{ exam.examNo || '-' }}</span>
                  <span class="meta-item">
                    <CalendarOutlined />
                    {{ formatTime(exam.createTime) }}
                  </span>
                </div>
                <div class="recent-exam-item__metrics">
                  <div class="exam-metric">
                    <span class="exam-metric__label">考生</span>
                    <strong class="exam-metric__value">{{ exam.candidateCount }}</strong>
                  </div>
                  <div class="exam-metric">
                    <span class="exam-metric__label">已发布</span>
                    <strong class="exam-metric__value success">{{ exam.publishedScoreCount }}</strong>
                  </div>
                  <div class="exam-metric">
                    <span class="exam-metric__label">未闭合任务</span>
                    <strong
                      class="exam-metric__value"
                      :class="exam.openProcessingTaskCount > 0 ? 'warning' : ''"
                    >
                      {{ exam.openProcessingTaskCount }}
                    </strong>
                  </div>
                </div>
              </article>
            </div>
          </UiCard>
        </a-col>

        <a-col :xs="24" :lg="10">
          <UiCard class="recent-incidents-card">
            <template #title>
              <ExclamationCircleOutlined />
              <span>最近未解决重大事件</span>
              <UiBadge
                :tone="recentIncidents.length > 0 ? 'red' : 'gray'"
              >
                {{ recentIncidents.length }} 条
              </UiBadge>
            </template>

            <UiEmpty v-if="recentIncidents.length === 0" description="无未解决事件" />

            <div v-else class="incident-list">
              <article
                v-for="incident in recentIncidents"
                :key="incident.id"
                class="incident-item"
              >
                <UiTag
                  v-if="incident.incidentLevel"
                  :tone="INCIDENT_LEVEL_TONE[incident.incidentLevel]"
                  size="sm"
                >
                  {{ INCIDENT_LEVEL_LABEL[incident.incidentLevel] }}
                </UiTag>
                <div class="incident-item__main">
                  <h4 class="incident-item__title">{{ incident.summary || '未提供摘要' }}</h4>
                  <div class="incident-item__meta">
                    <span>{{ incident.incidentType || '-' }}</span>
                    <span>考试 #{{ incident.examId }}</span>
                    <span>{{ formatTime(incident.createTime) }}</span>
                  </div>
                </div>
              </article>
            </div>
          </UiCard>
        </a-col>
      </a-row>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type {DashboardExamMetricsVO, DashboardGradingMetricsVO, DashboardIncidentMetricsVO, DashboardRecentExamItemVO, IncidentRecordVO, MarkDashboardOverviewVO} from '@/apis/mark/admin-dashboard';
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import CalendarOutlined from '@ant-design/icons-vue/CalendarOutlined'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  
  
  
  
  INCIDENT_LEVEL_LABEL,
  INCIDENT_LEVEL_TONE,
  
  
  loadDashboardOverview
} from '@/apis/mark/admin-dashboard'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from '@/apis/mark/exam'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'AdminDashboard' })

const router = useRouter()
const loading = ref(false)
const recentLimit = ref(5)
const overview = ref<MarkDashboardOverviewVO | null>(null)

const examMetrics = computed<DashboardExamMetricsVO>(() => overview.value?.examMetrics ?? {
  totalExamCount: 0,
  activeExamCount: 0,
  closedExamCount: 0,
  recentExamCount: 0,
  totalCandidateCount: 0,
})

const gradingMetrics = computed<DashboardGradingMetricsVO>(() => overview.value?.gradingMetrics ?? {
  publishedScoreCount: 0,
  pendingScoreCount: 0,
  confirmedScoreCount: 0,
  withdrawnScoreCount: 0,
  confirmedQuestionResultCount: 0,
  openReviewTaskCount: 0,
  openProcessingTaskCount: 0,
})

const incidentMetrics = computed<DashboardIncidentMetricsVO>(() => overview.value?.incidentMetrics ?? {
  unresolvedIncidentCount: 0,
  blockedPageCount: 0,
  pendingRepairActionCount: 0,
  pendingDuplicateCount: 0,
})

const recentExams = computed<DashboardRecentExamItemVO[]>(() => overview.value?.recentExams ?? [])
const recentIncidents = computed<IncidentRecordVO[]>(() => overview.value?.recentIncidents ?? [])

async function loadOverview() {
  loading.value = true
  try {
    overview.value = await loadDashboardOverview(recentLimit.value)
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载阅卷概览失败'
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

function goAuditTrail() {
  router.push({ name: 'AdminAuditTrail' })
}

watch(recentLimit, () => loadOverview())
onMounted(loadOverview)
</script>

<style lang="scss" scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.hero-spin {
  width: 100%;
}

.admin-dashboard__hero {
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
    flex-wrap: wrap;
  }
}

.admin-dashboard__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.admin-dashboard__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
  margin: 0;
}

.admin-dashboard__meta {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}

.admin-dashboard__summary-grid {
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

.metric-card {
  height: 100%;
}

.metric-grid {
  display: grid;
  gap: 12px;

  &--cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }

  &--cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}

.metric-cell {
  padding: 14px 16px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);
  text-align: center;

  &__label {
    margin: 0 0 6px;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--ant-color-text);
    font-variant-numeric: tabular-nums;

    &.success {
      color: var(--ant-color-success);
    }

    &.warning {
      color: var(--ant-color-warning);
    }

    &.info {
      color: var(--ant-color-primary);
    }

    &.danger {
      color: var(--ant-color-error);
    }
  }
}

.recent-exam-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-exam-item {
  padding: 12px 14px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);

  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 14px;
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
    margin-bottom: 8px;

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
}

.exam-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: var(--ant-color-fill-quaternary);
  border-radius: var(--dp-radius-sm, 6px);

  &__label {
    font-size: 11px;
    color: var(--ant-color-text-tertiary);
    margin-bottom: 2px;
  }

  &__value {
    font-size: 16px;
    font-weight: 700;
    color: var(--ant-color-text);

    &.success {
      color: var(--ant-color-success);
    }

    &.warning {
      color: var(--ant-color-warning);
    }
  }
}

.incident-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.incident-item {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);
  align-items: flex-start;

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ant-color-text);
    margin: 0 0 4px;
    line-height: 1.4;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}
</style>
