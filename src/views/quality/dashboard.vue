<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AchievementResultVO } from '@/apis/quality/achievement-result'
import type { AiTaskVO } from '@/apis/quality/ai-task'
import type { ImprovementTaskVO } from '@/apis/quality/improvement-task'
import type {
  AchievementAuditStatusCode,
  AchievementStatusCode,
  AchievementTargetTypeCode,
  AiTaskFailurePhaseCode,
  AiTaskTypeCode,
  ImprovementTaskStatusCode,
} from '@/apis/quality/types'
import type { ObeJourneyStepVO } from '@/apis/quality/workbench'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric, WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import type { QualityChartGroup } from '@/utils/quality-workbench-charts'
import { storeToRefs } from 'pinia'
import { computed, nextTick, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { achievementResultApi } from '@/apis/quality/achievement-result'
import { aiTaskApi } from '@/apis/quality/ai-task'
import { improvementTaskApi } from '@/apis/quality/improvement-task'

import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_COLOR,
  AchievementAuditStatusDescription,
  AchievementStatusDescription,
  AchievementTargetTypeDescription,
  AI_TASK_STATUS_COLOR,
  AiTaskFailurePhaseDescription,
  AiTaskStatusCode,
  AiTaskStatusDescription,
  AiTaskTypeDescription,
  ConfirmationStatusCode,
  ConfirmationStatusDescription,
  IMPROVEMENT_TASK_STATUS_COLOR,
  ImprovementTaskStatusDescription,
} from '@/apis/quality/types'
import { workbenchApi } from '@/apis/quality/workbench'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import QualityWorkbenchCharts from '@/components/quality/QualityWorkbenchCharts.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useAccreditationCockpit } from '@/composables/useAccreditationCockpit'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useQualityStore } from '@/stores/modules/quality'
import { useQualityTaskStore } from '@/stores/modules/qualityTask'
import {
  ObeJourneyStepStatusCode,
  ObeJourneyStepStatusDescription,
} from '@/types/enums/obe-journey-step-status-enum'
import { showUserError } from '@/utils/error-handler'
import { buildStatusChartGroup } from '@/utils/quality-workbench-charts'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const recentAchievementColumns: ColumnsType = [
  { title: '目标类型', dataIndex: 'targetType', key: 'targetType' },
  { title: '目标对象', dataIndex: 'targetLabel', key: 'targetLabel', width: 220 },
  { title: '达成值', dataIndex: 'finalValue', key: 'finalValue' },
  { title: '达成结论', dataIndex: 'achievementStatus', key: 'achievementStatus' },
  { title: '审核', dataIndex: 'auditStatus', key: 'auditStatus' },
]

const recentImprovementColumns: ColumnsType = [
  { title: '编号', dataIndex: 'taskCode', key: 'taskCode' },
  { title: '标题', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '负责人', key: 'ownerRef' },
  { title: '截止', dataIndex: 'dueDate', key: 'dueDate' },
  { title: '状态', dataIndex: 'status', key: 'status' },
]

const recentAiTaskColumns: ColumnsType = [
  { title: '能力', dataIndex: 'taskType', key: 'taskType' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '失败阶段', dataIndex: 'failurePhase', key: 'failurePhase' },
  { title: '开始时间', dataIndex: 'startedTime', key: 'startedTime' },
  { title: '结束时间', dataIndex: 'finishedTime', key: 'finishedTime' },
]

const router = useRouter()
const qualityStore = useQualityStore()
const { cockpit, refresh: refreshCockpit } = useAccreditationCockpit()

const loading = reactive({
  summary: false,
  achievement: false,
  improvement: false,
  ai: false,
})

const summaryLoaded = ref(false)
const summaryLoadFailed = ref(false)
/** 是否曾成功拉取汇总；失败时可保留旧数据并标注同步失败 */
const summaryHadSuccess = ref(false)
const summaryLastSuccessAt = ref<string | null>(null)
const distributionExpanded = ref(false)
const activeSignal = ref<string | null>(null)
const todoSectionRef = ref<HTMLElement | null>(null)
const achievementListSectionRef = ref<HTMLElement | null>(null)
const improvementListSectionRef = ref<HTMLElement | null>(null)
const aiListSectionRef = ref<HTMLElement | null>(null)

const recentAchievements = ref<AchievementResultVO[]>([])
const recentImprovements = ref<ImprovementTaskVO[]>([])
const recentAiTasks = ref<AiTaskVO[]>([])
const {
  loadError: achievementLoadError,
  beginLoad: beginAchievementLoad,
  failLoad: failAchievementLoad,
  okLoad: okAchievementLoad,
} = useUiTableLoadError()
const {
  loadError: improvementLoadError,
  beginLoad: beginImprovementLoad,
  failLoad: failImprovementLoad,
  okLoad: okImprovementLoad,
} = useUiTableLoadError()
const {
  loadError: aiLoadError,
  beginLoad: beginAiLoad,
  failLoad: failAiLoad,
  okLoad: okAiLoad,
} = useUiTableLoadError()

const achievementCounts = reactive({
  total: 0,
  calculated: 0,
  submitted: 0,
  confirmed: 0,
  archived: 0,
  notAchieved: 0,
})

const improvementCounts = reactive({
  total: 0,
  open: 0,
  inProgress: 0,
  submitted: 0,
  closed: 0,
})

const aiCounts = reactive({
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
})

/** 后端 OBE 旅程步骤真源；禁止前端按计数再推断阶段 */
const journeySteps = ref<ObeJourneyStepVO[]>([])

const trainingPlanId = computed(() => qualityStore.currentTrainingPlanId)

const planConfirmationStatus = computed(() => {
  if (!qualityStore.currentPlan) return undefined
  return qualityStore.currentPlan.confirmationStatus
})

const planConfirmationLabel = computed(() => {
  const status = planConfirmationStatus.value
  return status
    ? strictEnumLabel(ConfirmationStatusDescription, status, '培养方案确认状态')
    : '未提交'
})

function mapObeStepStatus(status: ObeJourneyStepStatusCode): WorkbenchStageStatus {
  switch (status) {
    case ObeJourneyStepStatusCode.COMPLETED:
      return 'completed'
    case ObeJourneyStepStatusCode.ACTIVE:
      return 'active'
    case ObeJourneyStepStatusCode.LOCKED:
      return 'blocked'
    case ObeJourneyStepStatusCode.PENDING:
      return 'pending'
    default: {
      const _exhaustive: never = status
      throw new Error(`未知 OBE 旅程步骤状态：${String(_exhaustive)}`)
    }
  }
}

const stages = computed<WorkbenchStage[]>(() => {
  if ((!summaryLoaded.value && !summaryHadSuccess.value) || !journeySteps.value.length) {
    return []
  }
  return journeySteps.value.map((step) => ({
    key: step.stepKey,
    title: step.title,
    status: mapObeStepStatus(step.status),
    statusText: strictEnumLabel(
      ObeJourneyStepStatusDescription,
      step.status,
      'OBE 旅程步骤状态',
    ),
    metrics:
      step.primaryCount != null ? [{ label: '指标', value: step.primaryCount }] : undefined,
  }))
})

/** 汇总合同字段必须为后端正式 number；缺失视为合同错误，禁止 ?? 0 */
function requireSummaryCount(value: number | undefined, field: string): number {
  if (value == null || Number.isNaN(Number(value))) {
    throw new Error(`工作台汇总合同缺字段：${field}`)
  }
  return value
}

const qualityTaskStore = useQualityTaskStore()
const { totalAttentionCount } = storeToRefs(qualityTaskStore)

const signals = computed<SignalMetric[]>(() => {
  if (!summaryLoaded.value && !summaryHadSuccess.value) {
    return []
  }
  const activeStep = journeySteps.value.find(
    (step) => step.status === ObeJourneyStepStatusCode.ACTIVE,
  )
  const blockedCount = journeySteps.value.filter(
    (step) => step.status === ObeJourneyStepStatusCode.LOCKED,
  ).length
  const pendingReview = achievementCounts.submitted
  const openImprovement
    = improvementCounts.open + improvementCounts.inProgress + improvementCounts.submitted
  const attention = totalAttentionCount.value
  const aiFailed = aiCounts.failed
  return [
    {
      key: 'stage',
      label: '当前阶段',
      value: activeStep?.title ?? '未进入',
      tone: activeStep ? 'blue' : 'gray',
      helper: activeStep
        ? strictEnumLabel(ObeJourneyStepStatusDescription, activeStep.status, '旅程步骤状态')
        : undefined,
      clickable: Boolean(activeStep),
      active: activeSignal.value === 'stage',
    },
    {
      key: 'blocked',
      label: '阻断步骤',
      value: blockedCount,
      tone: blockedCount > 0 ? 'red' : 'gray',
      clickable: blockedCount > 0,
      active: activeSignal.value === 'blocked',
    },
    {
      key: 'a-review',
      label: '待审核',
      value: pendingReview,
      tone: pendingReview > 0 ? 'orange' : 'gray',
      clickable: pendingReview > 0,
      active: activeSignal.value === 'a-review',
    },
    {
      key: 'i-open',
      label: '未闭环',
      value: openImprovement,
      tone: openImprovement > 0 ? 'orange' : 'gray',
      clickable: openImprovement > 0,
      active: activeSignal.value === 'i-open',
    },
    {
      key: 'attention',
      label: '待关注',
      value: attention,
      tone: attention > 0 ? 'orange' : 'gray',
      helper: '含即将到期与逾期',
      clickable: attention > 0,
      active: activeSignal.value === 'attention',
    },
    {
      key: 'ai-fail',
      label: 'AI 失败',
      value: aiFailed,
      tone: aiFailed > 0 ? 'red' : 'gray',
      clickable: aiFailed > 0,
      active: activeSignal.value === 'ai-fail',
    },
  ]
})

const qualityChartGroups = computed<QualityChartGroup[]>(() => {
  const groups: QualityChartGroup[] = []
  const achievement = buildStatusChartGroup('achievement', '达成度审核状态', [
    { label: '已计算', value: achievementCounts.calculated, tone: 'blue' },
    { label: '已提交', value: achievementCounts.submitted, tone: 'orange' },
    { label: '已确认', value: achievementCounts.confirmed, tone: 'green' },
    { label: '已归档', value: achievementCounts.archived, tone: 'gray' },
    { label: '未达成', value: achievementCounts.notAchieved, tone: 'red' },
  ])
  const improvement = buildStatusChartGroup('improvement', '改进任务状态', [
    { label: '待处理', value: improvementCounts.open, tone: 'orange' },
    { label: '整改中', value: improvementCounts.inProgress, tone: 'blue' },
    { label: '已提交', value: improvementCounts.submitted, tone: 'purple' },
    { label: '已闭环', value: improvementCounts.closed, tone: 'green' },
  ])
  const ai = buildStatusChartGroup('ai', 'AI 任务状态', [
    { label: '排队中', value: aiCounts.pending, tone: 'gray' },
    { label: '运行中', value: aiCounts.processing, tone: 'blue' },
    { label: '已成功', value: aiCounts.completed, tone: 'green' },
    { label: '已失败', value: aiCounts.failed, tone: 'red' },
  ])
  if (achievement) groups.push(achievement)
  if (improvement) groups.push(improvement)
  if (ai) groups.push(ai)
  return groups
})

function targetTypeLabel(value: AchievementTargetTypeCode): string {
  return strictEnumLabel(AchievementTargetTypeDescription, value, '达成目标类型')
}

function achievementStatusLabel(value: AchievementStatusCode): string {
  return strictEnumLabel(AchievementStatusDescription, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatusCode): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

function auditStatusLabel(value: AchievementAuditStatusCode): string {
  return strictEnumLabel(AchievementAuditStatusDescription, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatusCode): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function improvementStatusLabelOf(value: ImprovementTaskStatusCode): string {
  return strictEnumLabel(ImprovementTaskStatusDescription, value, '持续改进任务状态')
}

function improvementStatusColorOf(value: ImprovementTaskStatusCode): BadgeTone {
  return strictEnumTone(IMPROVEMENT_TASK_STATUS_COLOR, value, '持续改进任务状态')
}

function aiStatusLabel(value: AiTaskStatusCode): string {
  return strictEnumLabel(AiTaskStatusDescription, value, 'AI 任务状态')
}

function aiFailurePhaseLabel(value: AiTaskFailurePhaseCode): string {
  return strictEnumLabel(AiTaskFailurePhaseDescription, value, 'AI 任务失败阶段')
}

function aiStatusColor(value: AiTaskStatusCode): BadgeTone {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, 'AI 任务状态')
}

function aiTypeLabel(value: AiTaskTypeCode): string {
  return strictEnumLabel(AiTaskTypeDescription, value, 'AI 任务类型')
}

function markSummarySuccessAt(): void {
  summaryLastSuccessAt.value = new Date().toISOString().replace('T', ' ').slice(0, 19)
}

async function loadSummary() {
  if (!trainingPlanId.value) return
  const scope = beginQualityScopeRequest()
  loading.summary = true
  summaryLoadFailed.value = false
  if (!summaryHadSuccess.value) {
    summaryLoaded.value = false
  }
  try {
    const summary = await workbenchApi.obeJourneySummary({
      trainingPlanId: trainingPlanId.value,
    })
    if (scope.isStale()) {
      return
    }
    if (!Array.isArray(summary.steps) || summary.steps.length === 0) {
      throw new Error('工作台汇总合同缺字段：steps')
    }
    achievementCounts.total = requireSummaryCount(summary.achievementTotal, 'achievementTotal')
    achievementCounts.calculated = requireSummaryCount(
      summary.achievementCalculated,
      'achievementCalculated',
    )
    achievementCounts.submitted = requireSummaryCount(
      summary.achievementSubmitted,
      'achievementSubmitted',
    )
    achievementCounts.confirmed = requireSummaryCount(
      summary.achievementConfirmed,
      'achievementConfirmed',
    )
    achievementCounts.archived = requireSummaryCount(
      summary.achievementArchived,
      'achievementArchived',
    )
    achievementCounts.notAchieved = requireSummaryCount(
      summary.achievementNotAchieved,
      'achievementNotAchieved',
    )
    improvementCounts.total = requireSummaryCount(summary.improvementTotal, 'improvementTotal')
    improvementCounts.open = requireSummaryCount(summary.improvementOpen, 'improvementOpen')
    improvementCounts.inProgress = requireSummaryCount(
      summary.improvementInProgress,
      'improvementInProgress',
    )
    improvementCounts.submitted = requireSummaryCount(
      summary.improvementSubmitted,
      'improvementSubmitted',
    )
    improvementCounts.closed = requireSummaryCount(summary.improvementClosed, 'improvementClosed')
    aiCounts.total = requireSummaryCount(summary.aiTaskTotal, 'aiTaskTotal')
    aiCounts.pending = requireSummaryCount(summary.aiTaskPending, 'aiTaskPending')
    aiCounts.processing = requireSummaryCount(summary.aiTaskProcessing, 'aiTaskProcessing')
    aiCounts.completed = requireSummaryCount(summary.aiTaskCompleted, 'aiTaskCompleted')
    aiCounts.failed = requireSummaryCount(summary.aiTaskFailed, 'aiTaskFailed')
    journeySteps.value = summary.steps
    summaryLoaded.value = true
    summaryHadSuccess.value = true
    markSummarySuccessAt()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    summaryLoadFailed.value = true
    if (!summaryHadSuccess.value) {
      journeySteps.value = []
      summaryLoaded.value = false
    }
    showUserError(error, '工作台汇总加载失败')
  } finally {
    if (!scope.isStale()) {
      loading.summary = false
    }
  }
}

async function scrollToDashboardSection(section: HTMLElement | null) {
  await nextTick()
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleSignalMetricClick(key: string) {
  activeSignal.value = key
  switch (key) {
    case 'stage':
    case 'blocked': {
      const targetStatus
        = key === 'blocked' ? ObeJourneyStepStatusCode.LOCKED : ObeJourneyStepStatusCode.ACTIVE
      const step = journeySteps.value.find((item) => item.status === targetStatus)
      if (step) {
        handleStageSelect({
          key: step.stepKey,
          title: step.title,
          status: mapObeStepStatus(step.status),
        })
      }
      return
    }
    case 'a-review':
      void scrollToDashboardSection(achievementListSectionRef.value)
      return
    case 'i-open':
      void scrollToDashboardSection(improvementListSectionRef.value)
      return
    case 'attention':
      if (dashboardTodos.value.length > 0) {
        void scrollToDashboardSection(todoSectionRef.value)
        return
      }
      goImprovement()
      return
    case 'ai-fail':
      void scrollToDashboardSection(aiListSectionRef.value)
  }
}

async function loadAchievement() {
  if (!trainingPlanId.value) return
  const scope = beginQualityScopeRequest()
  loading.achievement = true
  beginAchievementLoad()
  try {
    const page = await achievementResultApi.page({
      pageNum: 1,
      pageSize: 5,
      trainingPlanId: trainingPlanId.value,
    })
    if (scope.isStale()) {
      return
    }
    recentAchievements.value = page.list
    okAchievementLoad()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    failAchievementLoad()
    showUserError(error, '达成度数据加载失败')
  } finally {
    if (!scope.isStale()) {
      loading.achievement = false
    }
  }
}

async function loadImprovement() {
  if (!trainingPlanId.value) return
  const scope = beginQualityScopeRequest()
  loading.improvement = true
  beginImprovementLoad()
  try {
    const page = await improvementTaskApi.page({
      pageNum: 1,
      pageSize: 5,
      trainingPlanId: trainingPlanId.value,
    })
    if (scope.isStale()) {
      return
    }
    recentImprovements.value = page.list
    okImprovementLoad()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    failImprovementLoad()
    showUserError(error, '改进任务数据加载失败')
  } finally {
    if (!scope.isStale()) {
      loading.improvement = false
    }
  }
}

async function loadAiTasks() {
  if (!trainingPlanId.value) return
  const scope = beginQualityScopeRequest()
  loading.ai = true
  beginAiLoad()
  try {
    const plan = trainingPlanId.value
    const page = await aiTaskApi.page({
      pageNum: 1,
      pageSize: 5,
      trainingPlanId: plan,
    })
    if (scope.isStale()) {
      return
    }
    recentAiTasks.value = page.list
    okAiLoad()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    failAiLoad()
    showUserError(error, '智能任务数据加载失败')
  } finally {
    if (!scope.isStale()) {
      loading.ai = false
    }
  }
}

async function reload() {
  await Promise.all([
    loadSummary(),
    loadAchievement(),
    loadImprovement(),
    loadAiTasks(),
    refreshCockpit(),
    qualityTaskStore.refreshAll({
      trainingPlanId: trainingPlanId.value || undefined,
      programId: qualityStore.currentProgramId || undefined,
      qualityCourseId: qualityStore.currentQualityCourseId || undefined,
    }),
  ])
}

useQualityScopedLoader(reload, { watchScope: true, immediate: true, reloadOnActivated: true })

function goAchievement() {
  router.push({ name: 'QualityAchievement' })
}

function goImprovement() {
  router.push({ name: 'QualityImprovementWorkbench' })
}

function goAiTask() {
  router.push({ name: 'QualityAiTask' })
}

interface DashboardTodoItem {
  key: string
  label: string
  actionLabel: string
  tone: BadgeTone
}

const applicationPhase = computed(() => cockpit.value?.applicationCycle?.currentPhase)

const dashboardTodos = computed<DashboardTodoItem[]>(() => {
  if (!trainingPlanId.value) return []
  const items: DashboardTodoItem[] = []
  if (planConfirmationStatus.value !== ConfirmationStatusCode.CONFIRMED) {
    items.push({
      key: 'plan-confirm',
      label: `培养方案待确认（${planConfirmationLabel.value}）`,
      actionLabel: '去培养方案',
      tone: 'orange',
    })
  }
  if (
    planConfirmationStatus.value === ConfirmationStatusCode.CONFIRMED
    && achievementCounts.calculated === 0
  ) {
    items.push({
      key: 'ingest',
      label: '尚未产生达成度计算输入，请先完成成绩或过程数据接入',
      actionLabel: '去数据接入',
      tone: 'blue',
    })
  }
  if (achievementCounts.submitted > 0) {
    items.push({
      key: 'audit',
      label: `${achievementCounts.submitted} 条达成度待审核确认`,
      actionLabel: '去审核',
      tone: 'orange',
    })
  }
  if (improvementCounts.total - improvementCounts.closed > 0) {
    items.push({
      key: 'improve',
      label: `${improvementCounts.total - improvementCounts.closed} 项改进任务未闭环`,
      actionLabel: '去改进',
      tone: 'purple',
    })
  }
  if (aiCounts.failed > 0) {
    items.push({
      key: 'ai-fail',
      label: `${aiCounts.failed} 个 AI 任务失败待处理`,
      actionLabel: '查看 AI 任务',
      tone: 'red',
    })
  }
  if (applicationPhase.value === 'ONSITE_VISIT') {
    items.push({
      key: 'onsite',
      label: '认证周期处于现场考查阶段，请闭合考查计划与清单',
      actionLabel: '去认证驾驶舱',
      tone: 'orange',
    })
  }
  return items
})

function handleStageSelect(stage: WorkbenchStage) {
  const step = journeySteps.value.find((item) => item.stepKey === stage.key)
  if (!step) {
    return
  }
  // LOCKED：培养方案未确认，统一回到培养方案工作台
  if (step.status === ObeJourneyStepStatusCode.LOCKED) {
    void router.push({ name: 'QualityTrainingPlanWorkbench' })
    return
  }
  if (!step.routeName) {
    showUserError(null, `旅程步骤缺少路由合同：${step.stepKey}`)
    return
  }
  void router.push({ name: step.routeName })
}

function handleTodoAction(key: string) {
  switch (key) {
    case 'plan-confirm':
      void router.push({ name: 'QualityTrainingPlanWorkbench' })
      break
    case 'ingest':
      void router.push({ path: '/quality/ingest-hub/score-batch' })
      break
    case 'audit':
      goAchievement()
      break
    case 'improve':
      goImprovement()
      break
    case 'ai-fail':
      goAiTask()
      break
    case 'onsite':
      void router.push({ name: 'QualityAccreditationCockpit' })
      break
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="质量评价驾驶舱">
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :loading="loading.achievement || loading.improvement || loading.ai"
            @click="reload"
          >
            刷新
          </UiButton>
          <UiButton variant="primary" size="sm" :disabled="!trainingPlanId" @click="goAchievement">
            进入达成度
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <template
      v-if="trainingPlanId && planConfirmationStatus === ConfirmationStatusCode.CONFIRMED"
      #rail
    >
      <StageRail :stages="stages" allow-pending-select @select="handleStageSelect" />
    </template>

    <template
      v-if="trainingPlanId && planConfirmationStatus === ConfirmationStatusCode.CONFIRMED"
      #signal
    >
      <UiSkeletonState
        v-if="loading.summary && !summaryLoaded && !summaryHadSuccess && !summaryLoadFailed"
        variant="card"
        :card-count="4"
        compact
      />
      <UiAlertStrip
        v-else-if="summaryLoadFailed && !summaryHadSuccess"
        tone="error"
        title="工作台汇总加载失败"
        dense
      />
      <template v-else>
        <UiAlertStrip
          v-if="summaryLoadFailed"
          tone="error"
          title="指标同步失败"
          dense
        />
        <SignalBand
          v-if="summaryLoaded || summaryHadSuccess"
          :metrics="signals"
          variant="panel"
          compact
          class="quality-dashboard__signals"
          @metric-click="handleSignalMetricClick"
        />
      </template>
    </template>

    <QualityPlanGateStrip
      v-if="!trainingPlanId"
      mode="need-plan"
      class="quality-dashboard__empty"
    />
    <QualityPlanGateStrip
      v-else-if="planConfirmationStatus !== ConfirmationStatusCode.CONFIRMED"
      mode="need-confirm"
      class="quality-dashboard__empty"
    />

    <template v-if="trainingPlanId && planConfirmationStatus === ConfirmationStatusCode.CONFIRMED">
      <!-- 锚点包装无 margin；段间距由壳层 gap 负责，避免 margin 折叠穿透 -->
      <div v-if="dashboardTodos.length" ref="todoSectionRef">
        <WorkbenchSurfaceCard>
          <template #head>
            <span class="quality-dashboard__panel-title">待办事项</span>
          </template>
          <ul class="quality-dashboard__todo-list">
            <li v-for="item in dashboardTodos" :key="item.key" class="quality-dashboard__todo-item">
              <UiTag :tone="item.tone" size="sm">{{ item.tone === 'red' ? '紧急' : '待办' }}</UiTag>
              <span class="quality-dashboard__todo-label">{{ item.label }}</span>
              <UiButton variant="ghost" size="sm" @click="handleTodoAction(item.key)">
                {{ item.actionLabel }}
              </UiButton>
            </li>
          </ul>
        </WorkbenchSurfaceCard>
      </div>
      <div v-if="qualityChartGroups.length" class="quality-dashboard__charts-fold">
        <UiButton
          variant="ghost"
          size="sm"
          class="quality-dashboard__charts-toggle"
          @click="distributionExpanded = !distributionExpanded"
        >
          {{ distributionExpanded ? '收起状态分布' : '展开状态分布' }}
        </UiButton>
        <QualityWorkbenchCharts v-if="distributionExpanded" :groups="qualityChartGroups" />
      </div>

      <WorkbenchSurfaceCard class="quality-dashboard__lists-surface">
        <template #head>
          <span class="quality-dashboard__panel-title">最近动态</span>
        </template>
        <div class="quality-dashboard__lists">
          <section ref="achievementListSectionRef" class="quality-dashboard__list-section">
            <div class="quality-dashboard__list-head">
              <h4 class="quality-dashboard__list-title">最近达成度结果</h4>
              <UiButton variant="ghost" size="sm" @click="goAchievement">查看全部</UiButton>
            </div>
            <UiDataTable
              pagination-mode="server"
              :columns="recentAchievementColumns"
              :data-source="recentAchievements"
              :loading="loading.achievement || loading.summary"
              :load-error="achievementLoadError"
              :show-pagination="false"
              row-key="id"
              size="small"
              flat
              :total="achievementCounts.total"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'targetType'">
                  {{ targetTypeLabel(record.targetType) }}
                </template>
                <template v-else-if="column.key === 'targetLabel'">
                  {{ record.targetLabel }}
                </template>
                <template v-else-if="column.key === 'finalValue'">
                  <span
                    class="quality-dashboard__value"
                    :class="[
                      record.finalValue !== null
                        && record.thresholdValue !== null
                        && record.finalValue >= record.thresholdValue
                        ? 'quality-dashboard__value--ok'
                        : 'quality-dashboard__value--bad',
                    ]"
                  >
                    {{ record.finalValue == null ? '-' : record.finalValue.toFixed(3) }}
                    / {{ record.thresholdValue == null ? '-' : record.thresholdValue.toFixed(3) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'achievementStatus'">
                  <UiTag :tone="achievementStatusColor(record.achievementStatus)">
                    {{ achievementStatusLabel(record.achievementStatus) }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'auditStatus'">
                  <UiTag :tone="auditStatusColor(record.auditStatus)">
                    {{ auditStatusLabel(record.auditStatus) }}
                  </UiTag>
                </template>
              </template>
            </UiDataTable>
          </section>

          <section ref="improvementListSectionRef" class="quality-dashboard__list-section">
            <div class="quality-dashboard__list-head">
              <h4 class="quality-dashboard__list-title">最近改进任务</h4>
              <UiButton variant="ghost" size="sm" @click="goImprovement">查看全部</UiButton>
            </div>
            <UiDataTable
              pagination-mode="server"
              :columns="recentImprovementColumns"
              :data-source="recentImprovements"
              :loading="loading.improvement || loading.summary"
              :load-error="improvementLoadError"
              :show-pagination="false"
              row-key="id"
              size="small"
              flat
              :total="improvementCounts.total"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'ownerRef'">
                  {{ record.ownerUserName }}
                </template>
                <template v-else-if="column.key === 'dueDate'">
                  {{ record.dueDate }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <UiTag :tone="improvementStatusColorOf(record.status)">
                    {{ improvementStatusLabelOf(record.status) }}
                  </UiTag>
                </template>
              </template>
            </UiDataTable>
          </section>

          <section
            ref="aiListSectionRef"
            class="quality-dashboard__list-section quality-dashboard__list-section--wide"
          >
            <div class="quality-dashboard__list-head">
              <h4 class="quality-dashboard__list-title">最近 AI 任务</h4>
              <UiButton variant="ghost" size="sm" @click="goAiTask">查看全部</UiButton>
            </div>
            <UiDataTable
              pagination-mode="server"
              :columns="recentAiTaskColumns"
              :data-source="recentAiTasks"
              :loading="loading.ai || loading.summary"
              :load-error="aiLoadError"
              :show-pagination="false"
              row-key="id"
              size="small"
              flat
              :total="aiCounts.total"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'taskType'">
                  {{ aiTypeLabel(record.taskType) }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <UiTag :tone="aiStatusColor(record.status)">
                    {{ aiStatusLabel(record.status) }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'startedTime'">
                  {{ record.startedTime }}
                </template>
                <template v-else-if="column.key === 'finishedTime'">
                  {{ record.finishedTime }}
                </template>
                <template v-else-if="column.key === 'failurePhase'">
                  <span
                    :class="{
                      'quality-dashboard__value--error': record.status === AiTaskStatusCode.FAILED,
                    }"
                  >
                    {{
                      record.status === AiTaskStatusCode.FAILED && record.failurePhase
                        ? aiFailurePhaseLabel(record.failurePhase)
                        : '不适用'
                    }}
                  </span>
                </template>
              </template>
            </UiDataTable>
          </section>
        </div>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;
.quality-dashboard {
  &__plan-select {
    min-width: 260px;
  }

  &__plan-status {
    margin-left: 0;
  }

  &__list-section {
    min-width: 0;

    & + & {
      margin-top: var(--dp-space-block);
      padding-top: var(--dp-space-block);
      border-top: 1px solid var(--dp-border-subtle);
    }
  }

  &__list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component-tight);
  }

  &__list-title {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__todo-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--dp-space-component-tight);
  }

  &__todo-item {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component);
    flex-wrap: wrap;
    padding: var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-control);
    background: var(--dp-surface-chrome);
    transition:
      border-color var(--dp-duration-normal) var(--dp-ease-default),
      background var(--dp-duration-normal) var(--dp-ease-default),
      box-shadow var(--dp-duration-normal) var(--dp-ease-default),
      transform var(--dp-duration-fast) var(--dp-ease-default);

    &:hover {
      border-color: var(--dp-color-primary-border);
      background: var(--dp-surface);
      box-shadow: var(--dp-shadow-sm);
      transform: var(--dp-lift-sm);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &__todo-item:hover {
      transform: none;
    }
  }

  &__todo-label {
    flex: 1;
    min-width: 200px;
    color: var(--dp-text-primary);
    font-size: var(--dp-font-size-md);
    font-weight: 500;
  }

  &__charts-fold {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  &__lists {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;

    @media (min-width: bp.$shell-laptop-max) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--dp-space-block);

      .quality-dashboard__list-section {
        margin-top: 0;
        padding-top: 0;
        border-top: none;

        & + & {
          margin-top: 0;
          padding-top: 0;
          border-top: none;
        }
      }

      .quality-dashboard__list-section--wide {
        grid-column: span 2;
        margin-top: var(--dp-space-block);
        padding-top: var(--dp-space-block);
        border-top: 1px solid var(--dp-border-subtle);
      }
    }
  }

  &__value--ok {
    color: var(--dp-success);
  }

  &__value--bad {
    color: var(--dp-error);
  }

  &__value--error {
    color: var(--dp-error);
  }

  &__threshold {
    color: var(--dp-text-muted);
    margin-left: var(--dp-space-component-xs);
  }
}
</style>
