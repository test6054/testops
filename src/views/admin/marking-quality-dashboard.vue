<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="quality-dashboard__context">
        <div class="quality-dashboard__context-info">
          <h2 class="quality-dashboard__title">阅卷交付 - 阅卷质量控制台</h2>
          <a-select
            :value="selectedExamId"
            class="quality-dashboard__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <a-input
            v-model:value="organizationIdInput"
            class="quality-dashboard__org-input"
            placeholder="阅卷组织 ID"
            allow-clear
            @change="handleScopeChange"
          />
          <a-input
            v-model:value="groupIdInput"
            class="quality-dashboard__group-input"
            placeholder="题组 ID（可选）"
            allow-clear
            @change="handleScopeChange"
          />
        </div>
        <div class="quality-dashboard__context-actions">
          <UiTag
            v-if="selectedExamId && progress?.riskLevel"
            :tone="riskTone(progress.riskLevel)"
            size="sm"
          >
            {{ PROGRESS_RISK_LEVEL_LABEL[progress.riskLevel] }}
          </UiTag>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请先选择一场考试"
      class="quality-dashboard__empty"
    />

    <template v-else>
      <SignalBand :metrics="signalMetrics" compact class="quality-dashboard__signals" />

      <a-tabs v-model:active-key="activeTab" class="quality-dashboard__tabs">
        <!-- ─── Tab 1: 进度监控 ─── -->
        <a-tab-pane key="progress">
          <template #tab>
            <span><LineChartOutlined /> 进度监控</span>
          </template>

          <UiCard class="info-card">
            <template #title>
              <span>进度快照</span>
              <UiBadge v-if="progress" :tone="riskTone(progress.riskLevel)">
                {{ PROGRESS_RISK_LEVEL_LABEL[progress.riskLevel] }}
              </UiBadge>
            </template>
            <template #extra>
              <a-space>
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="!scopeValid"
                  :loading="progressLoading"
                  @click="loadProgress"
                >
                  <template #icon><ReloadOutlined /></template>
                  查询最新
                </UiButton>
                <UiButton
                  size="sm"
                  :disabled="!scopeValid"
                  :loading="snapshotting"
                  @click="handleSnapshot"
                >
                  <template #icon><SyncOutlined /></template>
                  立即快照
                </UiButton>
              </a-space>
            </template>

            <UiAlertStrip
              v-if="!scopeValid"
              tone="info"
              title="请填写阅卷组织ID（必填）"
              description="进度监控按 (考试 + 阅卷组织 + 题组) 维度统计；题组留空表示组织级合计。"
              dense
              class="quality-dashboard__alert"
            />
            <!-- D-9 错误态：进度快照加载失败时给出可恢复 + 可上报路径 -->
            <UiErrorRetryPanel
              v-else-if="progressLoadError"
              :error="progressLoadError"
              title="进度快照加载失败"
              :helper="`考试 ${selectedExamId} · 组织 ${organizationIdInput || '-'}`"
              compact
              @retry="loadProgress"
            />
            <UiAlertStrip
              v-else-if="!progress"
              tone="info"
              title="尚无进度快照"
              description="点击「立即快照」实时计算并保存。"
              dense
              class="quality-dashboard__alert"
            />
            <a-descriptions v-else :column="3" bordered size="small">
              <a-descriptions-item label="总任务数">
                <b>{{ progress.totalTasks }}</b>
              </a-descriptions-item>
              <a-descriptions-item label="已分配">
                {{ progress.allocatedTasks }}
              </a-descriptions-item>
              <a-descriptions-item label="进行中">
                {{ progress.inProgressTasks }}
              </a-descriptions-item>
              <a-descriptions-item label="已提交">
                {{ progress.submittedTasks }}
              </a-descriptions-item>
              <a-descriptions-item label="已定稿">
                <b class="quality-dashboard__num-success">{{ progress.finalizedTasks }}</b>
              </a-descriptions-item>
              <a-descriptions-item label="已回收">
                <b class="quality-dashboard__num-warning">{{ progress.recycledTasks }}</b>
              </a-descriptions-item>
              <a-descriptions-item label="完成率">
                {{ progress.completionRate.toFixed(2) }}%
              </a-descriptions-item>
              <a-descriptions-item label="预估剩余">
                {{ progress.estimatedRemainingMinutes ?? '-' }} 分钟
              </a-descriptions-item>
              <a-descriptions-item label="风险等级">
                <UiTag :tone="riskTone(progress.riskLevel)" size="sm">
                  {{ PROGRESS_RISK_LEVEL_LABEL[progress.riskLevel] }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="快照时间" :span="2">
                {{ progress.snapshotTime }}
              </a-descriptions-item>
              <a-descriptions-item v-if="progressRiskItems.length > 0" label="风险详情" :span="3">
                <ul class="quality-dashboard__risk-list">
                  <li
                    v-for="(riskItem, riskIndex) in progressRiskItems"
                    :key="`${riskItem.riskCode}-${riskIndex}`"
                    class="quality-dashboard__risk-item"
                  >
                    <UiTag :tone="riskTone(riskItem.riskLevel)" size="sm">
                      {{ PROGRESS_RISK_LEVEL_LABEL[riskItem.riskLevel] }}
                    </UiTag>
                    <span class="quality-dashboard__risk-title">{{ riskItem.riskLabel }}</span>
                    <span class="quality-dashboard__risk-desc">{{ riskItem.riskDescription }}</span>
                  </li>
                </ul>
              </a-descriptions-item>
            </a-descriptions>
          </UiCard>
        </a-tab-pane>

        <!-- ─── Tab 2: 教师质量 ─── -->
        <a-tab-pane key="reviewer">
          <template #tab>
            <span><UserOutlined /> 教师质量</span>
          </template>

          <UiCard class="info-card">
            <template #title>
              <span>教师质量指标</span>
              <UiBadge tone="blue">{{ reviewerMetrics.length }}</UiBadge>
            </template>
            <template #extra>
              <a-space>
                <a-select
                  v-model:value="metricStatusFilter"
                  placeholder="状态过滤"
                  class="quality-dashboard__metric-filter"
                  allow-clear
                  @change="loadReviewerMetrics"
                >
                  <a-select-option
                    v-for="(label, code) in REVIEWER_METRIC_STATUS_LABEL"
                    :key="code"
                    :value="code"
                  >
                    {{ label }}
                  </a-select-option>
                </a-select>
                <UiButton
                  size="sm"
                  variant="outline"
                  :loading="reviewerLoading"
                  @click="loadReviewerMetrics"
                >
                  <template #icon><ReloadOutlined /></template>
                  刷新查询
                </UiButton>
                <UiButton
                  size="sm"
                  :disabled="!scopeValid"
                  :loading="refreshing"
                  @click="handleRefreshMetrics"
                >
                  <template #icon><SyncOutlined /></template>
                  立即重算
                </UiButton>
              </a-space>
            </template>

            <!-- D-9 错误态：教师质量指标加载失败时给出可恢复 + 可上报路径 -->
            <UiErrorRetryPanel
              v-if="reviewerMetricsLoadError"
              :error="reviewerMetricsLoadError"
              title="教师质量指标加载失败"
              :helper="`考试 ${selectedExamId} · 组织 ${organizationIdInput || '-'}`"
              compact
              @retry="loadReviewerMetrics"
            />
            <UiDataTable
              v-else
              :columns="reviewerColumns"
              :data-source="reviewerMetrics"
              :loading="reviewerLoading"
              :page-size="20"
              :total="reviewerMetrics.length"
              flat
              row-key="id"
              size="middle"
            >
              <template #bodyCell="{ column, index }">
                <template v-if="column.key === 'metricStatus'">
                  <UiTag :tone="metricStatusTone(reviewerMetrics[index].metricStatus)" size="sm">
                    {{ metricStatusLabel(reviewerMetrics[index].metricStatus) }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'avgScore'">
                  {{ formatDecimal(reviewerMetrics[index].avgScore) }}
                </template>
                <template v-else-if="column.key === 'scoreStddev'">
                  {{ formatDecimal(reviewerMetrics[index].scoreStddev) }}
                </template>
                <template v-else-if="column.key === 'consistencyRate'">
                  {{ formatDecimal(reviewerMetrics[index].consistencyRate) }}
                </template>
                <template v-else-if="column.key === 'scoreBias'">
                  {{ formatDecimal(reviewerMetrics[index].scoreBias) }}
                </template>
              </template>
            </UiDataTable>
          </UiCard>
        </a-tab-pane>

        <!-- ─── Tab 3: 抽检 ─── -->
        <a-tab-pane key="spotcheck">
          <template #tab>
            <span><AimOutlined /> 抽检</span>
          </template>

          <UiCard class="info-card">
            <template #title>
              <span>创建抽检任务</span>
            </template>

            <UiAlertStrip
              tone="info"
              title="抽检规则"
              description="按阅卷组织、题组和抽检比例创建任务。可选指定教师；不指定则全组抽检。后端将随机抽样并生成待处理抽检记录，由组长在「抽检处理」入口处理结论。"
              dense
              class="quality-dashboard__alert"
            />

            <a-form layout="vertical" class="quality-dashboard__form">
              <a-form-item label="阅卷组织ID" required>
                <a-input :value="organizationIdInput" disabled />
              </a-form-item>
              <a-form-item label="题组ID（可选）">
                <a-input :value="groupIdInput || ''" disabled />
              </a-form-item>
              <a-form-item label="抽检比例（%）" required>
                <a-input-number
                  v-model:value="spotForm.sampleRate"
                  :min="1"
                  :max="100"
                  class="quality-dashboard__field-full"
                  placeholder="请输入 1~100 之间的抽检比例"
                />
              </a-form-item>
              <a-form-item label="目标教师用户ID（可选）">
                <a-input
                  v-model:value="spotForm.targetReviewerUserId"
                  placeholder="留空对全组抽检"
                />
              </a-form-item>
              <a-form-item>
                <UiButton
                  :loading="creatingSpot"
                  :disabled="!scopeValid || !spotForm.sampleRate"
                  @click="handleCreateSpotCheck"
                >
                  <template #icon><PlusOutlined /></template>
                  创建抽检任务
                </UiButton>
              </a-form-item>
            </a-form>
          </UiCard>
        </a-tab-pane>

        <!-- ─── Tab 4: 异常批次重处理 ─── -->
        <a-tab-pane key="reprocess">
          <template #tab>
            <span><ReloadOutlined /> 异常批次重处理</span>
          </template>

          <UiCard class="info-card">
            <template #title>
              <span>触发异常批次重处理</span>
            </template>

            <UiAlertStrip
              tone="warning"
              title="重处理影响范围"
              description="全部重处理会清空批次内所有页的识别和评分结果并重新走识别流；仅失败页重处理只重做识别失败页。重处理过程中阅卷工作不可用。请确认与教师协调时间窗口后再触发。"
              dense
              class="quality-dashboard__alert"
            />

            <a-form layout="vertical" class="quality-dashboard__form">
              <a-form-item label="扫描批次ID" required>
                <a-input v-model:value="reprocessForm.scanBatchId" placeholder="输入扫描批次ID" />
              </a-form-item>
              <a-form-item label="重处理范围" required>
                <a-radio-group v-model:value="reprocessForm.scope">
                  <a-radio-button value="FAILED_ONLY">仅失败页</a-radio-button>
                  <a-radio-button value="ALL">整批次</a-radio-button>
                </a-radio-group>
              </a-form-item>
              <a-form-item label="重处理原因" required>
                <a-textarea
                  v-model:value="reprocessForm.reason"
                  :rows="3"
                  placeholder="请描述重处理原因（必填，会进入审计日志）"
                />
              </a-form-item>
              <a-form-item>
                <a-popconfirm
                  title="确认触发异常批次重处理？"
                  ok-text="确认"
                  cancel-text="取消"
                  @confirm="handleReprocess"
                >
                  <UiButton
                    variant="destructive"
                    :loading="reprocessing"
                    :disabled="!reprocessValid"
                  >
                    <template #icon><WarningOutlined /></template>
                    触发重处理
                  </UiButton>
                </a-popconfirm>
              </a-form-item>
            </a-form>
          </UiCard>
        </a-tab-pane>
      </a-tabs>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  BatchReprocessScopeCode,
  ProgressMonitorRecordVO,
  ProgressRiskItemVO,
  ProgressRiskLevelCode,
  ReviewerMetricStatusCode,
  ReviewerQualityMetricVO,
} from '@/apis/mark/marking-quality'
import {
  createSpotCheckTasks,
  getLatestProgress,
  listReviewerMetrics,
  PROGRESS_RISK_LEVEL_COLOR,
  PROGRESS_RISK_LEVEL_LABEL,
  refreshReviewerMetrics,
  reprocessBatch,
  REVIEWER_METRIC_STATUS_COLOR,
  REVIEWER_METRIC_STATUS_LABEL,
  takeProgressSnapshot,
} from '@/apis/mark/marking-quality'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import AimOutlined from '@ant-design/icons-vue/AimOutlined'
import LineChartOutlined from '@ant-design/icons-vue/LineChartOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import WarningOutlined from '@ant-design/icons-vue/WarningOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminMarkingQualityDashboard' })

const route = useRoute()
const router = useRouter()

// B-8 统一考试选择器
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()
const organizationIdInput = ref<string>(
  route.query.organizationId ? String(route.query.organizationId) : '',
)
const groupIdInput = ref<string>(route.query.groupId ? String(route.query.groupId) : '')

const activeTab = ref<'progress' | 'reviewer' | 'spotcheck' | 'reprocess'>('progress')

const scopeValid = computed(() => Boolean(selectedExamId.value && organizationIdInput.value.trim()))

// ─── 进度监控 ─────────────────────────────────

const progress = ref<ProgressMonitorRecordVO | null>(null)
const progressLoading = ref(false)
const snapshotting = ref(false)
// D-9 错误态：进度快照加载失败时，UiErrorRetryPanel 上报 + 重试
const progressLoadError = ref<unknown>(null)
const progressRiskItems = computed<ProgressRiskItemVO[]>(() => progress.value?.riskItems ?? [])

async function loadProgress(): Promise<void> {
  if (!scopeValid.value) return
  progressLoading.value = true
  progressLoadError.value = null
  try {
    progress.value = await getLatestProgress({
      examId: selectedExamId.value!,
      organizationId: organizationIdInput.value.trim(),
      groupId: groupIdInput.value.trim() || undefined,
    })
  } catch (error) {
    progressLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载进度快照失败')
  } finally {
    progressLoading.value = false
  }
}

async function handleSnapshot(): Promise<void> {
  if (!scopeValid.value) return
  snapshotting.value = true
  try {
    progress.value = await takeProgressSnapshot({
      examId: selectedExamId.value!,
      organizationId: organizationIdInput.value.trim(),
      groupId: groupIdInput.value.trim() || undefined,
    })
    message.success('已生成进度快照')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '生成快照失败')
  } finally {
    snapshotting.value = false
  }
}

// ─── 教师质量 ─────────────────────────────────

const reviewerMetrics = ref<ReviewerQualityMetricVO[]>([])
const reviewerLoading = ref(false)
const refreshing = ref(false)
const metricStatusFilter = ref<ReviewerMetricStatusCode | undefined>(undefined)
// D-9 错误态：教师质量指标加载失败时，UiErrorRetryPanel 上报 + 重试
const reviewerMetricsLoadError = ref<unknown>(null)

const reviewerColumns: ColumnType<ReviewerQualityMetricVO>[] = [
  { title: '教师用户ID', key: 'reviewerUserId', dataIndex: 'reviewerUserId', width: 130 },
  { title: '组织ID', key: 'organizationId', dataIndex: 'organizationId', width: 100 },
  { title: '题组ID', key: 'groupId', dataIndex: 'groupId', width: 100 },
  { title: '总任务', key: 'totalTasks', dataIndex: 'totalTasks', width: 90 },
  { title: '已提交', key: 'submittedTasks', dataIndex: 'submittedTasks', width: 90 },
  { title: '平均分', key: 'avgScore', width: 90 },
  { title: '标准差', key: 'scoreStddev', width: 90 },
  { title: '一致率(%)', key: 'consistencyRate', width: 100 },
  { title: '偏差', key: 'scoreBias', width: 80 },
  { title: '回收次数', key: 'returnCount', dataIndex: 'returnCount', width: 90 },
  { title: '状态', key: 'metricStatus', width: 100 },
  { title: '快照时间', key: 'snapshotTime', dataIndex: 'snapshotTime', width: 160 },
]

async function loadReviewerMetrics(): Promise<void> {
  if (!selectedExamId.value) return
  reviewerLoading.value = true
  reviewerMetricsLoadError.value = null
  try {
    const page = await listReviewerMetrics({
      examId: selectedExamId.value,
      organizationId: organizationIdInput.value.trim() || undefined,
      groupId: groupIdInput.value.trim() || undefined,
      metricStatus: metricStatusFilter.value,
      pageNum: 1,
      pageSize: 200,
    })
    reviewerMetrics.value = page.list
  } catch (error) {
    reviewerMetricsLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载教师质量指标失败')
  } finally {
    reviewerLoading.value = false
  }
}

async function handleRefreshMetrics(): Promise<void> {
  if (!scopeValid.value) return
  refreshing.value = true
  try {
    await refreshReviewerMetrics({
      examId: selectedExamId.value!,
      organizationId: organizationIdInput.value.trim(),
      groupId: groupIdInput.value.trim() || undefined,
    })
    message.success('已重算教师质量指标')
    await loadReviewerMetrics()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重算失败')
  } finally {
    refreshing.value = false
  }
}

// ─── 抽检 ─────────────────────────────────────

const creatingSpot = ref(false)
// a-input-number v-model:value 不接受 null，使用 number | undefined 描述未填状态。
const spotForm = reactive<{
  sampleRate: number | undefined
  targetReviewerUserId: string
}>({
  sampleRate: 10,
  targetReviewerUserId: '',
})

async function handleCreateSpotCheck(): Promise<void> {
  if (!scopeValid.value || !spotForm.sampleRate) return
  creatingSpot.value = true
  try {
    const created = await createSpotCheckTasks({
      examId: selectedExamId.value!,
      organizationId: organizationIdInput.value.trim(),
      groupId: groupIdInput.value.trim() || undefined,
      sampleRate: spotForm.sampleRate,
      targetReviewerUserId: spotForm.targetReviewerUserId.trim() || undefined,
    })
    message.success(`已创建 ${created} 条抽检任务`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建抽检任务失败')
  } finally {
    creatingSpot.value = false
  }
}

// ─── 异常批次重处理 ─────────────────────────────

const reprocessing = ref(false)
const reprocessForm = reactive<{
  scanBatchId: string
  reason: string
  scope: BatchReprocessScopeCode
}>({
  scanBatchId: '',
  reason: '',
  scope: 'FAILED_ONLY',
})

const reprocessValid = computed(() =>
  Boolean(selectedExamId.value && reprocessForm.scanBatchId.trim() && reprocessForm.reason.trim()),
)

async function handleReprocess(): Promise<void> {
  if (!reprocessValid.value) return
  reprocessing.value = true
  try {
    await reprocessBatch({
      examId: selectedExamId.value!,
      scanBatchId: reprocessForm.scanBatchId.trim(),
      reason: reprocessForm.reason.trim(),
      scope: reprocessForm.scope,
    })
    message.success('已触发异常批次重处理')
    reprocessForm.scanBatchId = ''
    reprocessForm.reason = ''
  } catch (error) {
    message.error(error instanceof Error ? error.message : '触发重处理失败')
  } finally {
    reprocessing.value = false
  }
}

// ─── 共用工具 ─────────────────────────────
function metricStatusTone(status: ReviewerMetricStatusCode): BadgeTone {
  return strictEnumTone(REVIEWER_METRIC_STATUS_COLOR, status, '阅卷员指标状态')
}

function metricStatusLabel(status: ReviewerMetricStatusCode): string {
  return strictEnumLabel(REVIEWER_METRIC_STATUS_LABEL, status, '阅卷员指标状态')
}

function riskTone(level: ProgressRiskLevelCode): BadgeTone {
  return strictEnumTone(PROGRESS_RISK_LEVEL_COLOR, level, '进度风险等级')
}

/* ========== 信号指标：阅卷质量全局风险面板 ========== */

const signalMetrics = computed<SignalMetric[]>(() => {
  const p = progress.value
  const reviewerWarning = reviewerMetrics.value.filter((r) => r.metricStatus === 'WARNING').length
  const reviewerSuspended = reviewerMetrics.value.filter(
    (r) => r.metricStatus === 'SUSPENDED',
  ).length

  const completionRate =
    typeof p?.completionRate === 'number' ? `${p.completionRate.toFixed(1)}%` : '-'
  const recycledCount = p?.recycledTasks ?? 0
  const inProgressCount = p?.inProgressTasks ?? 0
  const finalizedCount = p?.finalizedTasks ?? 0

  return [
    {
      key: 'completion',
      label: '完成率',
      value: completionRate,
      tone: p?.riskLevel ? riskTone(p.riskLevel) : 'gray',
    },
    {
      key: 'inProgress',
      label: '进行中',
      value: inProgressCount,
      tone: inProgressCount > 0 ? 'blue' : 'gray',
    },
    {
      key: 'finalized',
      label: '已定稿',
      value: finalizedCount,
      tone: finalizedCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'recycled',
      label: '已回收',
      value: recycledCount,
      tone: recycledCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'warning',
      label: '教师预警',
      value: reviewerWarning,
      tone: reviewerWarning > 0 ? 'orange' : 'gray',
    },
    {
      key: 'suspended',
      label: '教师暂停',
      value: reviewerSuspended,
      tone: reviewerSuspended > 0 ? 'red' : 'gray',
    },
  ]
})

function formatDecimal(value: number | undefined): string {
  if (value === null || value === undefined) return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toFixed(2)
}

function syncRouteQuery(): void {
  void router.replace({
    query: {
      ...(selectedExamId.value ? { examId: selectedExamId.value } : {}),
      ...(organizationIdInput.value ? { organizationId: organizationIdInput.value } : {}),
      ...(groupIdInput.value ? { groupId: groupIdInput.value } : {}),
    },
  })
}

function handleExamChange(value: unknown): void {
  onExamChange(value as string | number | undefined, [])
  // composable 会自动同步 examId 到 URL；此处补充写回以保证 organizationId/groupId 不丢失
  syncRouteQuery()
  reloadActiveTab()
}

function handleScopeChange(): void {
  syncRouteQuery()
  reloadActiveTab()
}

function reloadActiveTab(): void {
  if (!selectedExamId.value) return
  if (activeTab.value === 'progress') void loadProgress()
  else if (activeTab.value === 'reviewer') void loadReviewerMetrics()
}

watch(activeTab, () => {
  reloadActiveTab()
})

// B-8: selectedExamId 由 useMarkExamSelector 与 URL 双向同步
watch(selectedExamId, () => {
  reloadActiveTab()
})

onMounted(async () => {
  await initExamSelector()
  reloadActiveTab()
})
</script>

<style lang="scss" scoped>
.quality-dashboard {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__signals {
    margin-bottom: 12px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__tabs {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 0 16px;
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__exam-select {
    width: 240px;
  }

  &__org-input {
    width: 160px;
  }

  &__group-input {
    width: 140px;
  }

  &__metric-filter {
    width: 140px;
  }

  &__form {
    max-width: 720px;
  }

  &__field-full {
    width: 100%;
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__empty {
    margin-top: 80px;
  }

  &__num-success {
    color: var(--ant-color-success, #16a34a);
  }

  &__num-warning {
    color: var(--ant-color-warning, #ea580c);
  }

  &__risk-list {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 8px;
  }

  &__risk-item {
    color: var(--dp-text-primary, #0f172a);
    line-height: 1.6;
  }
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
