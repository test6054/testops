<template>
  <StageWorkbenchShell>
    <!-- 上下文区 -->
    <template #context>
      <div class="admin-dashboard__context">
        <div class="admin-dashboard__context-left">
          <UiTag tone="blue" size="sm">租户聚合视图</UiTag>
          <UiTag
            v-if="incidentMetrics && incidentMetrics.unresolvedIncidentCount > 0"
            tone="red"
            size="sm"
          >
            待处理事件 {{ incidentMetrics.unresolvedIncidentCount }}
          </UiTag>
        </div>
        <div class="admin-dashboard__context-right">
          <a-input-number
            v-model:value="recentLimit"
            :min="1"
            :max="50"
            addon-after="条"
            class="admin-dashboard__limit-input"
          />
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadOverview">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" @click="goAuditTrail">
            <template #icon><FileSearchOutlined /></template>
            批改审计
          </UiButton>
        </div>
      </div>
    </template>

    <!-- D-9 错误态：阅卷概览加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="overviewLoadError"
      :error="overviewLoadError"
      title="阅卷概览加载失败"
      @retry="loadOverview"
    />

    <!-- 批改进度 + 异常告警 -->
    <a-row v-if="gradingMetrics && incidentMetrics && !overviewLoadError" :gutter="16">
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
              <p class="metric-cell__value warning">
                {{ gradingMetrics.openProcessingTaskCount }}
              </p>
            </div>
          </div>
        </UiCard>
      </a-col>

      <a-col :xs="24" :lg="10">
        <UiCard class="metric-card">
          <template #title>
            <ExclamationCircleOutlined />
            <span>异常告警</span>
            <UiBadge :tone="incidentMetrics.unresolvedIncidentCount > 0 ? 'red' : 'gray'">
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
    <a-row v-if="overview && !overviewLoadError" :gutter="16" class="admin-dashboard__recent-row">
      <a-col :xs="24" :lg="14">
        <UiCard class="recent-exams-card">
          <template #title>
            <FileOutlined />
            <span>最近考试</span>
            <UiBadge tone="blue">{{ recentExams.length }} 场</UiBadge>
          </template>
          <template #extra>
            <UiButton size="sm" variant="ghost" @click="goAuditTrail"> 进入批改审计 </UiButton>
          </template>

          <UiEmpty v-if="recentExams.length === 0" description="暂无考试" />

          <div v-else class="recent-exam-list">
            <article v-for="exam in recentExams" :key="exam.examId" class="recent-exam-item">
              <div class="recent-exam-item__title-row">
                <h3 class="recent-exam-item__title">{{ exam.examName }}</h3>
                <UiTag v-if="exam.status" :tone="examStatusTone(exam.status)" size="sm">
                  {{ examStatusLabel(exam.status) }}
                </UiTag>
              </div>
              <div class="recent-exam-item__meta">
                <span class="meta-item">编号：{{ exam.examNo }}</span>
                <span class="meta-item">
                  <CalendarOutlined />
                  {{ formatDateTime(exam.createTime) }}
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
            <UiBadge :tone="recentIncidents.length > 0 ? 'red' : 'gray'">
              {{ recentIncidents.length }} 条
            </UiBadge>
          </template>

          <UiEmpty v-if="recentIncidents.length === 0" description="无未解决事件" />

          <div v-else class="incident-list">
            <article v-for="incident in recentIncidents" :key="incident.id" class="incident-item">
              <UiTag
                v-if="incident.incidentLevel"
                :tone="incidentLevelTone(incident.incidentLevel)"
                size="sm"
              >
                {{ incidentLevelLabel(incident.incidentLevel) }}
              </UiTag>
              <div class="incident-item__main">
                <h4 class="incident-item__title">{{ incident.summary }}</h4>
                <div class="incident-item__meta">
                  <span>{{ incidentTypeLabel(incident.incidentType) }}</span>
                  <span>{{ incident.examName }} · {{ incident.examNo }}</span>
                  <span>{{ formatDateTime(incident.createTime) }}</span>
                </div>
              </div>
            </article>
          </div>
        </UiCard>
      </a-col>
    </a-row>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  DashboardGradingMetricsVO,
  DashboardIncidentMetricsVO,
  DashboardIncidentRecordVO,
  DashboardRecentExamItemVO,
  IncidentLevelCode,
  IncidentTypeCode,
  MarkDashboardOverviewVO,
} from '@/apis/mark/admin-dashboard'
import {
  INCIDENT_LEVEL_LABEL,
  INCIDENT_LEVEL_TONE,
  INCIDENT_TYPE_LABEL,
  loadDashboardOverview,
} from '@/apis/mark/admin-dashboard'
import type { ExamStatusCode } from '@/apis/mark/exam'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import CalendarOutlined from '@ant-design/icons-vue/CalendarOutlined'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminDashboard' })

const router = useRouter()
const loading = ref(false)
// D-9 错误态：阅卷概览加载失败时 UiErrorRetryPanel 重试 + 上报
const overviewLoadError = ref<Error | null>(null)
const recentLimit = ref(5)
const overview = ref<MarkDashboardOverviewVO | null>(null)

/**
 * 概览字段访问：
 *
 * 字段完整性由 API 层 validateDashboardOverview 在 loadOverview 内强校验，
 * 缺失会直接抛 TypeError 并落到 overviewLoadError；
 * 模板已通过 `v-if="overview && !overviewLoadError"` 守护渲染，因此 computed
 * 只在 overview 为空时返回 null（未加载态），不再承担"验证响应完整性"职责。
 *
 * Vue 文档明确要求 computed 是纯函数，禁止抛错。
 */
const gradingMetrics = computed<DashboardGradingMetricsVO | null>(
  () => overview.value?.gradingMetrics ?? null,
)
const incidentMetrics = computed<DashboardIncidentMetricsVO | null>(
  () => overview.value?.incidentMetrics ?? null,
)
const recentExams = computed<DashboardRecentExamItemVO[]>(() => overview.value?.recentExams ?? [])
const recentIncidents = computed<DashboardIncidentRecordVO[]>(
  () => overview.value?.recentIncidents ?? [],
)

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
}

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

function incidentLevelTone(level: IncidentLevelCode): BadgeTone {
  return strictEnumTone(INCIDENT_LEVEL_TONE, level, '事件级别')
}

function incidentLevelLabel(level: IncidentLevelCode): string {
  return strictEnumLabel(INCIDENT_LEVEL_LABEL, level, '事件级别')
}

function incidentTypeLabel(type: IncidentTypeCode): string {
  return strictEnumLabel(INCIDENT_TYPE_LABEL, type, '事件类型')
}

async function loadOverview() {
  loading.value = true
  overviewLoadError.value = null
  try {
    overview.value = await loadDashboardOverview(recentLimit.value)
  } catch (error) {
    overviewLoadError.value = toUserError(error, '阅卷运营概览加载失败')
    showUserError(error, '阅卷运营概览加载失败')
  } finally {
    loading.value = false
  }
}

function goAuditTrail() {
  router.push({ name: 'AdminAuditTrail' })
}

watch(recentLimit, () => loadOverview())
onMounted(loadOverview)
</script>

<style lang="scss" scoped>
.admin-dashboard {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__limit-input {
    width: 140px;
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
  border-radius: var(--dp-radius-md, 6px);
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

    /* 数字大字状态色：使用深色版 dp-*-700 而非高饱和原色，多卡同屏不刺眼 */
    &.success {
      color: var(--dp-green-700, #15803d);
    }

    &.warning {
      color: var(--dp-orange-700, #c2410c);
    }

    &.info {
      color: var(--dp-blue-700, #1d4ed8);
    }

    &.danger {
      color: var(--dp-red-700, #b91c1c);
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
  border-radius: var(--dp-radius-md, 6px);

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

    /* exam 子卡片同步使用深色版 */
    &.success {
      color: var(--dp-green-700, #15803d);
    }

    &.warning {
      color: var(--dp-orange-700, #c2410c);
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
  border-radius: var(--dp-radius-md, 6px);
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
