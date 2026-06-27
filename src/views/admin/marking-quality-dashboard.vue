<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <MarkExamSelect
            :selected-exam-id="selectedExamId"
            :exam-options="examOptions"
            :loading="examLoading"
            :searching="searching"
            :resolving-pinned="resolvingPinned"
            select-class="quality-dashboard__exam-select"
            placeholder="选择考试"
            @change="handleExamChange"
            @search="onExamSearch"
          />
          <a-select
            :value="selectedOrganizationId"
            class="quality-dashboard__org-select"
            placeholder="选择阅卷组织"
            :options="organizationOptions"
            :loading="organizationLoading"
            allow-clear
            @change="handleOrganizationChange"
          />
          <a-select
            :value="selectedGroupId"
            class="quality-dashboard__group-select"
            placeholder="选择题组"
            :options="groupOptions"
            allow-clear
            @change="handleGroupChange"
          />
          <UiTag
            v-if="selectedExamId && progress?.riskLevel"
            :tone="riskTone(progress.riskLevel)"
            size="sm"
          >
            {{ riskLabel(progress.riskLevel) }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择考试"
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
                {{ riskLabel(progress.riskLevel) }}
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


            <UiEmpty
              v-if="!scopeValid"
              description="请选择阅卷组织与题组"
              class="quality-dashboard__alert"
            />
            <a-skeleton v-else-if="progressLoading" active :paragraph="{ rows: 3 }" />
            <a-descriptions v-else-if="progress" :column="3" bordered size="small">
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
                {{ estimatedRemainingText(progress.estimatedRemainingMinutes) }}
              </a-descriptions-item>
              <a-descriptions-item label="风险等级">
                <UiTag :tone="riskTone(progress.riskLevel)" size="sm">
                  {{ riskLabel(progress.riskLevel) }}
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
                      {{ riskLabel(riskItem.riskLevel) }}
                    </UiTag>
                    <span class="quality-dashboard__risk-title">{{ riskItem.riskLabel }}</span>
                    <span class="quality-dashboard__risk-desc">{{ riskItem.riskDescription }}</span>
                  </li>
                </ul>
              </a-descriptions-item>
            </a-descriptions>
            <UiEmpty
              v-else
              description="暂无进度快照，请点击「立即快照」生成"
              class="quality-dashboard__alert"
            />

            <div v-if="progress" class="quality-dashboard__charts">
              <MarkTrendSection
                title="完成率走势"
                hint="基于历史进度快照，悬停查看各时点完成率"
                :point-count="progressTrendPoints.length"
                :option="progressTrendOption"
                height="260px"
                value-unit="%"
                :last-value="progressTrendLastValue"
                :aria-label="progressTrendAriaLabel"
              />
              <MarkBarSection
                title="当前任务状态分布"
                hint="最新快照各状态任务量"
                :item-count="progressTaskBarItems.length"
                :option="progressTaskBarOption"
                height="260px"
                :aria-label="progressTaskBarAriaLabel"
              />
            </div>
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
            </template>
            <template #extra>
              <UiButton
                size="sm"
                :disabled="!scopeValid"
                :loading="refreshing"
                @click="handleRefreshMetrics"
              >
                <template #icon><SyncOutlined /></template>
                立即重算
              </UiButton>
            </template>

            <UiFilterBar
              v-model="reviewerFilterForm"
              :fields="reviewerFilterFields"
              search-text="查询"
              @search="loadReviewerMetrics"
              @reset="handleReviewerFilterReset"
            />

            <UiDataTable
              pagination-mode="client"
              class="student-detail-table__data-table"
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
                <template v-if="column.key === 'reviewer'">
                  {{ reviewerMetrics[index].reviewerUserName }} ·
                  {{ reviewerMetrics[index].reviewerTeacherNo }}
                </template>
                <template v-else-if="column.key === 'organization'">
                  {{ reviewerMetrics[index].organizationStatusMessage }}
                </template>
                <template v-else-if="column.key === 'group'">
                  {{
                    reviewerMetrics[index].groupName
                      ? `${reviewerMetrics[index].groupName} · ${reviewerMetrics[index].groupStatusMessage}`
                      : '组织级'
                  }}
                </template>
                <template v-else-if="column.key === 'metricStatus'">
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

            <a-form layout="vertical" class="quality-dashboard__form">
              <a-form-item label="阅卷组织" required>
                <a-select :value="selectedOrganizationId" :options="organizationOptions" disabled />
              </a-form-item>
              <a-form-item label="题组（可选）">
                <a-select
                  :value="selectedGroupId"
                  :options="groupOptions"
                  disabled
                  placeholder="组织级抽检"
                />
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
              <a-form-item label="目标教师（可选）">
                <a-select
                  v-model:value="spotForm.targetReviewerUserId"
                  :options="reviewerOptions"
                  placeholder="选择目标教师；留空对全组抽检"
                  allow-clear
                  show-search
                  option-filter-prop="label"
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



            <a-form layout="vertical" class="quality-dashboard__form">
              <a-form-item label="扫描批次" required>
                <a-select
                  v-model:value="reprocessForm.scanBatchId"
                  :options="scannerBatchOptions"
                  :loading="scannerBatchLoading"
                  placeholder="选择扫描批次"
                  show-search
                  option-filter-prop="label"
                />
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
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamScannerBatchVO } from '@/apis/mark/exam-scan'
import type {
  MarkingOrganizationVO,
  QuestionGroupReviewerVO,
  QuestionMarkingGroupVO,
} from '@/apis/mark/marking-organization'
import type {
  BatchReprocessScopeCode,
  ProgressMonitorRecordVO,
  ProgressRiskItemVO,
  ProgressRiskLevelCode,
  ReviewerMetricStatusCode,
  ReviewerQualityMetricResponse,
} from '@/apis/mark/marking-quality'
import type { BadgeTone, FilterField, UiBarChartItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import AimOutlined from '@ant-design/icons-vue/AimOutlined'
import LineChartOutlined from '@ant-design/icons-vue/LineChartOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import WarningOutlined from '@ant-design/icons-vue/WarningOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pageScannerBatches } from '@/apis/mark/exam-scan'
import {
  getOrganization,
  MARKING_ORGANIZATION_STATUS_LABEL,
  QUESTION_GROUP_STATUS_LABEL,
} from '@/apis/mark/marking-organization'
import {
  createSpotCheckTasks,
  getLatestProgress,
  listProgressSnapshots,
  listReviewerMetrics,
  PROGRESS_RISK_LEVEL_LABEL,
  PROGRESS_RISK_LEVEL_TONE,
  refreshReviewerMetrics,
  reprocessBatch,
  REVIEWER_METRIC_STATUS_LABEL,
  REVIEWER_METRIC_STATUS_TONE,
  takeProgressSnapshot,
} from '@/apis/mark/marking-quality'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError } from '@/utils/error-handler'
import { buildCategoryBarChartOption, buildTrendLineChartOption } from '@/utils/mark-echarts-options'
import { progressSnapshotsToTrendPoints } from '@/utils/mark-statistics-chart'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminMarkingQualityDashboard' })

const REVIEWER_METRIC_PAGE_SIZE = 100
const SCANNER_BATCH_OPTION_PAGE_SIZE = 100

const route = useRoute()
const router = useRouter()

// B-8 统一考试选择器
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  onExamSearch,
  searching,
  resolvingPinned,
  init: initExamSelector,
} = useMarkExamSelector()

const activeTab = ref<'progress' | 'reviewer' | 'spotcheck' | 'reprocess'>('progress')

const selectedOrganizationId = ref<string | undefined>(
  route.query.organizationId ? String(route.query.organizationId) : undefined,
)
const selectedGroupId = ref<string | undefined>(
  route.query.groupId ? String(route.query.groupId) : undefined,
)
const organizationDetail = ref<MarkingOrganizationVO | null>(null)
const organizationLoading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const scannerBatches = ref<ExamScannerBatchVO[]>([])
const scannerBatchLoading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳

const scopeValid = computed(() => Boolean(selectedExamId.value && selectedOrganizationId.value))

const organizationOptions = computed<DefaultOptionType[]>(() => {
  if (!organizationDetail.value) {
    return []
  }
  return [
    {
      value: organizationDetail.value.id,
      label: `阅卷组织 · ${strictEnumLabel(MARKING_ORGANIZATION_STATUS_LABEL, organizationDetail.value.organizationStatus, '阅卷组织状态')} · 负责人 ${organizationDetail.value.leaderUserName}`,
    },
  ]
})

const groupOptions = computed<DefaultOptionType[]>(() =>
  (organizationDetail.value?.groups ?? []).map((group) => ({
    value: group.id,
    label: `${group.groupName} · ${strictEnumLabel(QUESTION_GROUP_STATUS_LABEL, group.groupStatus, '题组状态')} · 组长 ${group.leaderUserName}`,
  })),
)

const selectedGroup = computed<QuestionMarkingGroupVO | undefined>(() =>
  organizationDetail.value?.groups.find((group) => group.id === selectedGroupId.value),
)

const reviewerOptions = computed<DefaultOptionType[]>(() => {
  const reviewersByUserId = new Map<string, QuestionGroupReviewerVO>()
  const groups = selectedGroup.value
    ? [selectedGroup.value]
    : (organizationDetail.value?.groups ?? [])
  groups.forEach((group) => {
    group.reviewers.forEach((reviewer) => {
      reviewersByUserId.set(reviewer.reviewerUserId, reviewer)
    })
  })
  return Array.from(reviewersByUserId.values()).map((reviewer) => ({
    value: reviewer.reviewerUserId,
    label: `${reviewer.reviewerUserName} · ${reviewer.reviewerTeacherNo}`,
  }))
})

const scannerBatchOptions = computed<DefaultOptionType[]>(() =>
  scannerBatches.value.map((batch) => ({
    value: batch.scanBatchId,
    label: [
      batch.batchNo,
      batch.batchExternalNo,
      batch.statusMessage,
      typeof batch.pageCount === 'number' ? `${batch.pageCount} 页` : undefined,
      batch.scanStartTime,
    ]
      .filter(Boolean)
      .join(' · '),
  })),
)

const selectedScopeLabel = computed(() => {
  const examOption = examOptions.value.find((option) => option.value === selectedExamId.value)
  const organizationOption = organizationOptions.value.find(
    (option) => option.value === selectedOrganizationId.value,
  )
  const groupOption = groupOptions.value.find((option) => option.value === selectedGroupId.value)
  return [examOption?.label, organizationOption?.label, groupOption?.label ?? '组织级']
    .filter(Boolean)
    .join(' / ')
})

// ─── 进度监控 ─────────────────────────────────

const progress = ref<ProgressMonitorRecordVO | null>(null)
const progressHistory = ref<ProgressMonitorRecordVO[]>([])
const progressLoading = ref(false)
const snapshotting = ref(false)
const progressRiskItems = computed<ProgressRiskItemVO[]>(() => progress.value?.riskItems ?? [])

const progressTrendPoints = computed(() => progressSnapshotsToTrendPoints(progressHistory.value))

const progressTrendLastValue = computed(() => {
  const points = progressTrendPoints.value
  if (points.length === 0) return null
  return points[points.length - 1]?.value ?? null
})

const { chartOption: progressTrendOption } = useChartOption(() =>
  buildTrendLineChartOption(progressTrendPoints.value, {
    yAxisName: '完成率 %',
    yMax: 100,
    area: true,
    emptyText: '暂无历史快照，请先立即快照',
  }),
)

const progressTrendAriaLabel = computed(() => {
  const count = progressTrendPoints.value.length
  if (count < 2) {
    return '完成率走势，至少需要两次快照'
  }
  return `完成率走势，共 ${count} 个快照点`
})

const progressTaskBarItems = computed((): UiBarChartItem[] => {
  if (!progress.value) return []
  const snapshot = progress.value
  const items: UiBarChartItem[] = [
    { key: 'allocated', label: '已分配', value: snapshot.allocatedTasks, tone: 'blue' },
    { key: 'inProgress', label: '进行中', value: snapshot.inProgressTasks, tone: 'orange' },
    { key: 'submitted', label: '已提交', value: snapshot.submittedTasks, tone: 'blue' },
    { key: 'finalized', label: '已定稿', value: snapshot.finalizedTasks, tone: 'green' },
    { key: 'recycled', label: '已回收', value: snapshot.recycledTasks, tone: 'red' },
  ]
  return items.filter((item) => item.value > 0)
})

const { chartOption: progressTaskBarOption } = useChartOption(() =>
  buildCategoryBarChartOption(progressTaskBarItems.value, {
    orientation: 'vertical',
    yAxisName: '任务数',
    emptyText: '暂无任务状态数据',
  }),
)

const progressTaskBarAriaLabel = computed(() => {
  const count = progressTaskBarItems.value.length
  if (count <= 0) {
    return '当前任务状态分布，暂无数据'
  }
  return `当前任务状态分布，共 ${count} 种状态`
})

async function loadProgressHistory(): Promise<void> {
  if (!scopeValid.value) {
    progressHistory.value = []
    return
  }
  try {
    progressHistory.value = await listProgressSnapshots({
      examId: selectedExamId.value!,
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
      limit: 30,
    })
  } catch (error) {
    progressHistory.value = []
    showUserError(error, '阅卷进度历史加载失败')
  }
}

async function loadProgress(): Promise<void> {
  if (!scopeValid.value) return
  progressLoading.value = true
  try {
    progress.value = await getLatestProgress({
      examId: selectedExamId.value!,
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
    })
    await loadProgressHistory()
  } catch (error) {
    showUserError(error, '阅卷进度快照加载失败')
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
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
    })
    await loadProgressHistory()
    message.success('已生成进度快照')
  } catch (error) {
    showUserError(error, '阅卷进度快照生成失败')
  } finally {
    snapshotting.value = false
  }
}

// ─── 教师质量 ─────────────────────────────────

const reviewerMetrics = ref<ReviewerQualityMetricResponse[]>([])
const reviewerLoading = ref(false)
const refreshing = ref(false)

const reviewerFilterForm = reactive<{ metricStatus?: ReviewerMetricStatusCode }>({})

const reviewerFilterFields: FilterField[] = [
  {
    key: 'metricStatus',
    type: 'select',
    placeholder: '状态过滤',
    allowClear: true,
    width: 160,
    options: Object.entries(REVIEWER_METRIC_STATUS_LABEL).map(([value, label]) => ({
      value,
      label,
    })),
  },
]


const reviewerColumns: ColumnType<ReviewerQualityMetricResponse>[] = [
  { title: '教师', key: 'reviewer', width: 180 },
  { title: '阅卷组织', key: 'organization', width: 140 },
  { title: '题组', key: 'group', width: 180 },
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
    reviewerMetrics.value = await readAllPages(
      (pageNum) => listReviewerMetrics({
        examId: selectedExamId.value!,
        organizationId: selectedOrganizationId.value,
        groupId: selectedGroupId.value,
        metricStatus: reviewerFilterForm.metricStatus,
        pageNum,
        pageSize: REVIEWER_METRIC_PAGE_SIZE,
      }),
      '阅卷教师质量指标加载失败',
    )
  } catch (error) {
    showUserError(error, '阅卷教师质量指标加载失败')
  } finally {
    reviewerLoading.value = false
  }
}

function handleReviewerFilterReset(): void {
  reviewerFilterForm.metricStatus = undefined
  void loadReviewerMetrics()
}

async function handleRefreshMetrics(): Promise<void> {
  if (!scopeValid.value) return
  refreshing.value = true
  try {
    await refreshReviewerMetrics({
      examId: selectedExamId.value!,
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
    })
    message.success('已重算教师质量指标')
    await loadReviewerMetrics()
  } catch (error) {
    showUserError(error, '阅卷教师质量指标重算失败')
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
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
      sampleRate: spotForm.sampleRate,
      targetReviewerUserId: spotForm.targetReviewerUserId || undefined,
    })
    message.success(`已创建 ${created} 条抽检任务`)
  } catch (error) {
    showUserError(error, '阅卷质量抽检任务创建失败')
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
  Boolean(selectedExamId.value && reprocessForm.scanBatchId && reprocessForm.reason.trim()),
)

async function handleReprocess(): Promise<void> {
  if (!reprocessValid.value) return
  reprocessing.value = true
  try {
    await reprocessBatch({
      examId: selectedExamId.value!,
      scanBatchId: reprocessForm.scanBatchId,
      reason: reprocessForm.reason.trim(),
      scope: reprocessForm.scope,
    })
    message.success('已触发异常批次重处理')
    reprocessForm.scanBatchId = ''
    reprocessForm.reason = ''
  } catch (error) {
    showUserError(error, '异常扫描批次重处理提交失败')
  } finally {
    reprocessing.value = false
  }
}

// ─── 共用工具 ─────────────────────────────
function metricStatusTone(status: ReviewerMetricStatusCode): BadgeTone {
  return strictEnumTone(REVIEWER_METRIC_STATUS_TONE, status, '阅卷员指标状态')
}

function metricStatusLabel(status: ReviewerMetricStatusCode): string {
  return strictEnumLabel(REVIEWER_METRIC_STATUS_LABEL, status, '阅卷员指标状态')
}

function riskTone(level: ProgressRiskLevelCode): BadgeTone {
  return strictEnumTone(PROGRESS_RISK_LEVEL_TONE, level, '进度风险等级')
}

function riskLabel(level: ProgressRiskLevelCode): string {
  return strictEnumLabel(PROGRESS_RISK_LEVEL_LABEL, level, '进度风险等级')
}

function estimatedRemainingText(minutes?: number): string {
  if (minutes == null) return '暂未形成预估'
  return `${minutes} 分钟`
}

/* ========== 信号指标：阅卷质量全局风险面板 ========== */

const signalMetrics = computed<SignalMetric[]>(() => {
  const p = progress.value
  const reviewerWarning = reviewerMetrics.value.filter((r) => r.metricStatus === 'WARNING').length
  const reviewerSuspended = reviewerMetrics.value.filter(
    (r) => r.metricStatus === 'SUSPENDED',
  ).length

  const completionRate
    = typeof p?.completionRate === 'number' ? `${p.completionRate.toFixed(1)}%` : '-'
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
      ...(selectedOrganizationId.value ? { organizationId: selectedOrganizationId.value } : {}),
      ...(selectedGroupId.value ? { groupId: selectedGroupId.value } : {}),
    },
  })
}

async function loadOrganizationDetail(): Promise<void> {
  organizationDetail.value = null
  selectedOrganizationId.value = undefined
  selectedGroupId.value = undefined
  spotForm.targetReviewerUserId = ''
  if (!selectedExamId.value) {
    return
  }
  organizationLoading.value = true
  try {
    const detail = await getOrganization({ examId: selectedExamId.value })
    organizationDetail.value = detail
    selectedOrganizationId.value = detail.id
    const queryGroupId = route.query.groupId ? String(route.query.groupId) : undefined
    selectedGroupId.value = detail.groups.some((group) => group.id === queryGroupId)
      ? queryGroupId
      : undefined
  } catch (error) {
    organizationDetail.value = null
    selectedOrganizationId.value = undefined
    selectedGroupId.value = undefined
    showUserError(error, '阅卷组织加载失败')
  } finally {
    organizationLoading.value = false
  }
}

async function loadScannerBatches(): Promise<void> {
  scannerBatches.value = []
  reprocessForm.scanBatchId = ''
  if (!selectedExamId.value) {
    return
  }
  scannerBatchLoading.value = true
  try {
    scannerBatches.value = await readAllPages(
      (pageNum) => pageScannerBatches({
        examId: selectedExamId.value!,
        pageNum,
        pageSize: SCANNER_BATCH_OPTION_PAGE_SIZE,
        includeDiscarded: true,
      }),
      '扫描批次加载失败',
    )
  } catch (error) {
    scannerBatches.value = []
    reprocessForm.scanBatchId = ''
    showUserError(error, '扫描批次加载失败')
  } finally {
    scannerBatchLoading.value = false
  }
}

function handleExamChange(value: SelectValue): void {
  onExamChange(value)
}

function handleOrganizationChange(value: SelectValue): void {
  selectedOrganizationId.value = value != null ? String(value) : undefined
  if (!selectedOrganizationId.value) {
    selectedGroupId.value = undefined
  }
  spotForm.targetReviewerUserId = ''
  syncRouteQuery()
  reloadActiveTab()
}

function handleGroupChange(value: SelectValue): void {
  selectedGroupId.value = value != null ? String(value) : undefined
  spotForm.targetReviewerUserId = ''
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

watch(selectedExamId, async () => {
  await Promise.all([loadOrganizationDetail(), loadScannerBatches()])
  syncRouteQuery()
  reloadActiveTab()
}, { immediate: true })

onMounted(async () => {
  await initExamSelector()
})

onActivated(() => {
  if (selectedExamId.value) {
    reloadActiveTab()
  }
})
</script>

<style lang="scss" scoped>
.quality-dashboard {
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

  &__charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }

  &__exam-select {
    width: 240px;
  }

  &__org-select {
    width: 280px;
  }

  &__group-select {
    width: 240px;
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
