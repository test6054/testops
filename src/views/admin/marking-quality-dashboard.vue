<template>
  <GiPageLayout>
    <div class="quality-page">
      <PageHeader title="阅卷质量监控">
        <template #tags>
          <UiTag v-if="selectedExamId" tone="blue" size="md">考试 #{{ selectedExamId }}</UiTag>
          <UiTag v-if="selectedExamId && progress" tone="cyan" size="md">
            完成率 {{ progress.completionRate?.toFixed?.(2) ?? '-' }}%
          </UiTag>
          <UiTag
            v-if="selectedExamId && progress?.riskLevel"
            :tone="riskTone(progress.riskLevel)"
            size="md"
          >
            {{ PROGRESS_RISK_LEVEL_LABEL[progress.riskLevel] }}
          </UiTag>
        </template>
        <template #actions>
          <a-select
            v-model:value="selectedExamId"
            style="width: 240px"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examOptionsLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <a-input
            v-model:value="organizationIdInput"
            style="width: 160px"
            placeholder="阅卷组织ID"
            allow-clear
            @change="handleScopeChange"
          />
          <a-input
            v-model:value="groupIdInput"
            style="width: 140px"
            placeholder="题组ID（可选）"
            allow-clear
            @change="handleScopeChange"
          />
        </template>
      </PageHeader>

      <UiEmpty v-if="!selectedExamId" description="请先选择一场考试" class="empty-block" />

      <a-tabs v-else v-model:active-key="activeTab">
        <!-- ─── Tab 1: 进度监控 ─── -->
        <a-tab-pane key="progress">
          <template #tab>
            <span><LineChartOutlined /> 进度监控</span>
          </template>

          <UiCard class="info-card">
            <template #title>
              <span>进度快照</span>
              <UiBadge v-if="progress" :tone="riskTone(progress.riskLevel ?? 'NORMAL')">
                {{ PROGRESS_RISK_LEVEL_LABEL[progress.riskLevel ?? 'NORMAL'] }}
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

            <a-alert
              v-if="!scopeValid"
              type="info"
              show-icon
              message="请填写阅卷组织ID（必填）"
              description="进度监控按 (考试 + 阅卷组织 + 题组) 维度统计；题组留空表示组织级合计。"
            />
            <a-alert
              v-else-if="!progress"
              type="info"
              show-icon
              message="尚无进度快照"
              description="点击「立即快照」实时计算并保存。"
            />
            <a-descriptions v-else :column="3" bordered size="small">
              <a-descriptions-item label="总任务数">
                <b>{{ progress.totalTasks ?? 0 }}</b>
              </a-descriptions-item>
              <a-descriptions-item label="已分配">
                {{
                  progress.allocatedTasks ?? 0
                }}
              </a-descriptions-item>
              <a-descriptions-item label="进行中">
                {{
                  progress.inProgressTasks ?? 0
                }}
              </a-descriptions-item>
              <a-descriptions-item label="已提交">
                {{
                  progress.submittedTasks ?? 0
                }}
              </a-descriptions-item>
              <a-descriptions-item label="已定稿">
                <b style="color: #389e0d">{{ progress.finalizedTasks ?? 0 }}</b>
              </a-descriptions-item>
              <a-descriptions-item label="已回收">
                <b style="color: #d4380d">{{ progress.recycledTasks ?? 0 }}</b>
              </a-descriptions-item>
              <a-descriptions-item label="完成率">
                {{ progress.completionRate?.toFixed?.(2) ?? '-' }}%
              </a-descriptions-item>
              <a-descriptions-item label="预估剩余">
                {{ progress.estimatedRemainingMinutes ?? '-' }} 分钟
              </a-descriptions-item>
              <a-descriptions-item label="风险等级">
                <UiTag :tone="riskTone(progress.riskLevel ?? 'NORMAL')" size="sm">
                  {{ PROGRESS_RISK_LEVEL_LABEL[progress.riskLevel ?? 'NORMAL'] }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="快照时间" :span="2">
                {{
                  progress.snapshotTime ?? '-'
                }}
              </a-descriptions-item>
              <a-descriptions-item v-if="progress.riskDetail" label="风险详情" :span="3">
                <pre class="json-pre">{{ progress.riskDetail }}</pre>
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
                  style="width: 140px"
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

            <a-table
              :columns="reviewerColumns"
              :data-source="reviewerMetrics"
              :loading="reviewerLoading"
              :pagination="{ pageSize: 20, showSizeChanger: false }"
              row-key="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'metricStatus'">
                  <UiTag :tone="metricStatusTone(record.metricStatus)" size="sm">
                    {{
                      REVIEWER_METRIC_STATUS_LABEL[
                        record.metricStatus as ReviewerMetricStatusCode
                      ] ?? record.metricStatus
                    }}
                  </UiTag>
                </template>
                <template
                  v-else-if="
                    ['avgScore', 'scoreStddev', 'consistencyRate', 'scoreBias'].includes(
                      column.key as string,
                    )
                  "
                >
                  {{
                    formatDecimal(
                      record[column.key as keyof typeof record] as unknown as number | undefined,
                    )
                  }}
                </template>
              </template>
            </a-table>
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

            <a-alert
              type="info"
              show-icon
              message="抽检规则"
              description="按 (阅卷组织 + 题组 + 抽检比例) 创建任务。可选指定教师；不指定则全组抽检。后端将随机抽样并生成 PENDING 抽检记录，由组长在「抽检处理」入口处理结论。"
              style="margin-bottom: 12px"
            />

            <a-form layout="vertical" style="max-width: 720px">
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
                  style="width: 100%"
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

            <a-alert
              type="warning"
              show-icon
              message="重处理影响范围"
              description="ALL：清空批次内所有页的识别 / 评分结果，重新走识别流；FAILED_ONLY：仅重做识别失败页。重处理过程中阅卷工作不可用。请确认与教师协调时间窗口后再触发。"
              style="margin-bottom: 12px"
            />

            <a-form layout="vertical" style="max-width: 720px">
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
                  <UiButton variant="danger" :loading="reprocessing" :disabled="!reprocessValid">
                    <template #icon><WarningOutlined /></template>
                    触发重处理
                  </UiButton>
                </a-popconfirm>
              </a-form-item>
            </a-form>
          </UiCard>
        </a-tab-pane>
      </a-tabs>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import type {
  BatchReprocessScopeCode,
  ProgressMonitorRecordVO,
  ProgressRiskLevelCode,
  ReviewerMetricStatusCode,
  ReviewerQualityMetricVO,
} from '@/apis/mark/marking-quality'
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
import { pageExams } from '@/apis/mark/exam'
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
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'AdminMarkingQualityDashboard' })

const route = useRoute()
const router = useRouter()

const selectedExamId = ref<string | undefined>(
  route.query.examId ? String(route.query.examId) : undefined,
)
const organizationIdInput = ref<string>(
  route.query.organizationId ? String(route.query.organizationId) : '',
)
const groupIdInput = ref<string>(route.query.groupId ? String(route.query.groupId) : '')
const examOptions = ref<Array<{ label: string, value: string }>>([])
const examOptionsLoading = ref(false)

const activeTab = ref<'progress' | 'reviewer' | 'spotcheck' | 'reprocess'>('progress')

const scopeValid = computed(() => Boolean(selectedExamId.value && organizationIdInput.value.trim()))

// ─── 进度监控 ─────────────────────────────────

const progress = ref<ProgressMonitorRecordVO | null>(null)
const progressLoading = ref(false)
const snapshotting = ref(false)

async function loadProgress(): Promise<void> {
  if (!scopeValid.value) return
  progressLoading.value = true
  try {
    progress.value = await getLatestProgress({
      examId: selectedExamId.value!,
      organizationId: organizationIdInput.value.trim(),
      groupId: groupIdInput.value.trim() || undefined,
    })
  } catch (error) {
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
  try {
    reviewerMetrics.value = await listReviewerMetrics({
      examId: selectedExamId.value,
      organizationId: organizationIdInput.value.trim() || undefined,
      groupId: groupIdInput.value.trim() || undefined,
      metricStatus: metricStatusFilter.value,
    })
  } catch (error) {
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
const spotForm = reactive<{
  sampleRate: number | null
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

// ─── 共用工具 ─────────────────────────────────

function metricStatusTone(status?: ReviewerMetricStatusCode): string {
  if (!status) return 'gray'
  return REVIEWER_METRIC_STATUS_COLOR[status] ?? 'gray'
}

function riskTone(level: ProgressRiskLevelCode): string {
  return PROGRESS_RISK_LEVEL_COLOR[level] ?? 'gray'
}

function formatDecimal(value: number | undefined): string {
  if (value === null || value === undefined) return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toFixed(2)
}

async function loadExamOptions(): Promise<void> {
  examOptionsLoading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    examOptions.value = (result.list ?? []).map((item: ExamSummaryVO) => ({
      label: `${item.examName}（${item.statusMessage}）`,
      value: item.examId,
    }))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载考试列表失败')
  } finally {
    examOptionsLoading.value = false
  }
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
  selectedExamId.value = value != null ? String(value) : undefined
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

onMounted(async () => {
  await loadExamOptions()
  reloadActiveTab()
})
</script>

<style lang="scss" scoped>
.quality-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.empty-block {
  margin-top: 80px;
}

.json-pre {
  background: rgba(0, 0, 0, 0.03);
  padding: 8px;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
</style>
