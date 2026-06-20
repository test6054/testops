<template>
  <StageWorkbenchShell>
    <!-- 上下文区 -->
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">租户聚合视图</UiTag>
          <UiTag
            v-if="incidentMetrics && incidentMetrics.unresolvedIncidentCount > 0"
            tone="red"
            size="sm"
          >
            待处理事件 {{ incidentMetrics.unresolvedIncidentCount }}
          </UiTag>
        </template>
        <template #actions>
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
        </template>
      </ContextBar>
    </template>

    <a-spin v-if="loading && !overview" :spinning="true" class="admin-dashboard__loading" />

    <!-- 考试规模 + 批改进度 + 异常告警 -->
    <a-row v-else-if="gradingMetrics && incidentMetrics" :gutter="16">
      <a-col v-if="examMetrics && examScaleBarItems.length" :xs="24" :lg="6">
        <UiCard class="metric-card">
          <template #title>
            <PieChartOutlined />
            <span>考试规模</span>
          </template>
          <UiStatPanel
            :items="examScaleMetrics"
            :columns="2"
            variant="strip"
            compact
            class="exam-scale-metrics"
          />
          <MarkBarSection
            title="考试规模对比"
            hint="按考试生命周期统计"
            :item-count="examScaleBarItems.length"
            :option="examScaleChartOption"
            height="220px"
            :aria-label="examScaleChartAriaLabel"
            class="exam-scale-chart"
          />
        </UiCard>
      </a-col>
      <a-col :xs="24" :lg="examMetrics && examScaleBarItems.length ? 10 : 14">
        <UiCard class="metric-card">
          <template #title>
            <BarChartOutlined />
            <span>批改进度</span>
            <UiBadge tone="blue">活跃任务</UiBadge>
          </template>
          <UiStatPanel
            :items="gradingStatMetrics"
            :columns="3"
            variant="grid"
            compact
          />
          <MarkBarSection
            title="批改进度分布"
            hint="租户内成绩与任务处理量"
            :item-count="gradingBarItems.length"
            :option="gradingChartOption"
            height="220px"
            :aria-label="gradingChartAriaLabel"
            class="grading-progress-chart"
          />
        </UiCard>
      </a-col>

      <a-col :xs="24" :lg="examMetrics && examScaleBarItems.length ? 8 : 10">
        <UiCard class="metric-card">
          <template #title>
            <ExclamationCircleOutlined />
            <span>异常告警</span>
            <UiBadge :tone="incidentMetrics.unresolvedIncidentCount > 0 ? 'red' : 'gray'">
              {{ incidentMetrics.unresolvedIncidentCount > 0 ? '待处理' : '正常' }}
            </UiBadge>
          </template>
          <UiStatPanel
            :items="incidentStatMetrics"
            :columns="2"
            variant="grid"
            compact
          />
        </UiCard>
      </a-col>
    </a-row>

    <!-- 最近考试 + 最近事件 -->
    <a-row v-if="overview" :gutter="16" class="admin-dashboard__recent-row">
      <a-col :xs="24" :lg="14">
        <UiCard class="recent-exams-card">
          <template #title>
            <FileOutlined />
            <span>最近考试</span>
          </template>
          <template #extra>
            <UiButton size="sm" variant="ghost" @click="goAuditTrail"> 进入批改审计 </UiButton>
          </template>

          <UiEmpty v-if="recentExams.length === 0" description="暂无数据" />

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
            <button
              v-for="incident in recentIncidents"
              :key="incident.id"
              type="button"
              class="incident-item incident-item--actionable"
              @click="goIncidentDetail(incident)"
            >
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
              <span class="incident-item__drill">查看详情 →</span>
            </button>
          </div>
        </UiCard>
      </a-col>
    </a-row>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  DashboardExamMetricsVO,
  DashboardGradingMetricsVO,
  DashboardIncidentMetricsVO,
  DashboardIncidentRecordVO,
  DashboardRecentExamItemVO,
  IncidentLevelCode,
  IncidentTypeCode,
  MarkDashboardOverviewVO,
} from '@/apis/mark/admin-dashboard'
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { BadgeTone, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import CalendarOutlined from '@ant-design/icons-vue/CalendarOutlined'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import PieChartOutlined from '@ant-design/icons-vue/PieChartOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  INCIDENT_LEVEL_LABEL,
  INCIDENT_LEVEL_TONE,
  INCIDENT_TYPE_LABEL,
  loadDashboardOverview,
} from '@/apis/mark/admin-dashboard'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from '@/apis/mark/exam'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import { examScaleMetricsToBarItems, gradingMetricsToBarItems } from '@/utils/mark-statistics-chart'
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
 * 字段完整性由 API 层 validateDashboardOverview 在 loadDashboardOverview 内强校验，
 * 缺失会直接抛 TypeError 并落到 overviewLoadError；
 * 模板已通过 `v-if="overview && !overviewLoadError"` 守护渲染，因此 computed
 * 只在 overview 为空时返回 null（未加载态），不再承担"验证响应完整性"职责。
 *
 * Vue 文档明确要求 computed 是纯函数，禁止抛错。
 */
const gradingMetrics = computed<DashboardGradingMetricsVO | null>(
  () => overview.value?.gradingMetrics ?? null,
)
const examMetrics = computed<DashboardExamMetricsVO | null>(
  () => overview.value?.examMetrics ?? null,
)
const examScaleBarItems = computed(() => {
  if (!examMetrics.value) return []
  return examScaleMetricsToBarItems(examMetrics.value)
})

const { chartOption: examScaleChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(examScaleBarItems.value, {
    orientation: 'horizontal',
    xAxisName: '数量',
    emptyText: '暂无考试规模数据',
  }),
)

const gradingBarItems = computed(() => {
  if (!gradingMetrics.value) return []
  return gradingMetricsToBarItems(gradingMetrics.value)
})

const { chartOption: gradingChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(gradingBarItems.value, {
    orientation: 'horizontal',
    xAxisName: '数量',
    emptyText: '暂无批改进度数据',
  }),
)

const gradingChartAriaLabel = computed(() => {
  const count = gradingBarItems.value.length
  if (count <= 0) {
    return '批改进度分布，暂无数据'
  }
  return `批改进度分布，共 ${count} 项指标`
})

const examScaleChartAriaLabel = computed(() => {
  const count = examScaleBarItems.value.length
  if (count <= 0) {
    return '考试规模对比，暂无数据'
  }
  return `考试规模对比，共 ${count} 项指标`
})

const examScaleMetrics = computed((): UiStatPanelItem[] => {
  if (!examMetrics.value) return []
  return [
    {
      key: 'totalExamCount',
      label: '考试总数',
      value: examMetrics.value.totalExamCount,
      unit: '场',
      tone: 'blue',
    },
    {
      key: 'totalCandidateCount',
      label: '考生总数',
      value: examMetrics.value.totalCandidateCount,
      unit: '人',
      tone: 'blue',
    },
  ]
})

const gradingStatMetrics = computed((): UiStatPanelItem[] => {
  if (!gradingMetrics.value) return []
  const metrics = gradingMetrics.value
  return [
    {
      key: 'pendingScoreCount',
      label: '待计算 / 计算中',
      value: metrics.pendingScoreCount,
      tone: metrics.pendingScoreCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'confirmedQuestionResultCount',
      label: '已确认题目',
      value: metrics.confirmedQuestionResultCount,
    },
    {
      key: 'publishedScoreCount',
      label: '已发布成绩',
      value: metrics.publishedScoreCount,
      tone: 'green',
    },
    {
      key: 'confirmedScoreCount',
      label: '已确认未发布',
      value: metrics.confirmedScoreCount,
      tone: 'blue',
    },
    {
      key: 'openReviewTaskCount',
      label: '待复核任务',
      value: metrics.openReviewTaskCount,
      tone: metrics.openReviewTaskCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'openProcessingTaskCount',
      label: '未闭合处理任务',
      value: metrics.openProcessingTaskCount,
      tone: metrics.openProcessingTaskCount > 0 ? 'orange' : 'gray',
    },
  ]
})

const incidentStatMetrics = computed((): UiStatPanelItem[] => {
  if (!incidentMetrics.value) return []
  const metrics = incidentMetrics.value
  return [
    {
      key: 'unresolvedIncidentCount',
      label: '未解决重大事件',
      value: metrics.unresolvedIncidentCount,
      tone: metrics.unresolvedIncidentCount > 0 ? 'red' : 'gray',
    },
    {
      key: 'pendingDuplicateCount',
      label: '待处置重复',
      value: metrics.pendingDuplicateCount,
      tone: metrics.pendingDuplicateCount > 0 ? 'orange' : 'gray',
    },
  ]
})

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

function goIncidentDetail(incident: DashboardIncidentRecordVO) {
  router.push({
    name: 'AdminAuditTrail',
    query: {
      examId: incident.examId,
      tab: 'incidents',
      unresolvedOnly: '1',
    },
  })
}

watch(recentLimit, () => loadOverview())
onMounted(loadOverview)
</script>

<style lang="scss" scoped>
.admin-dashboard {
  &__limit-input {
    width: 140px;
  }
}

.metric-card {
  height: 100%;
}

.exam-scale-metrics {
  margin-bottom: 12px;
}

.exam-scale-chart {
  width: 100%;
  height: 220px;
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
    font-weight: 600;
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
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 6px);
  align-items: flex-start;
  text-align: left;
  background: var(--ant-color-bg-container);

  &--actionable {
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;

    &:hover {
      border-color: var(--ant-color-primary-border);
      background: var(--ant-color-primary-bg);
    }
  }

  &__drill {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--ant-color-primary);
    align-self: center;
  }

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
