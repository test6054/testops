<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 年度工作台
 *
 * 阶段：专业配置 -> 培养方案 -> 数据接入 -> 计算 -> 审核 -> 改进 -> 归档
 */
import type {
  AchievementAuditStatus,
  AchievementResultVO,
  AchievementStatus,
  AchievementTargetType,
  AiTaskStatus,
  AiTaskType,
  AiTaskVO,
  ImprovementTaskStatus,
  ImprovementTaskVO,
} from '@/apis/quality'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import type { QualityChartGroup } from '@/utils/quality-workbench-charts'
import { storeToRefs } from 'pinia'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  accreditationApi,
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_AUDIT_STATUS_LABEL,
  ACHIEVEMENT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_LABEL,
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  achievementApi,
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
  aiTaskApi,
  CONFIRMATION_STATUS_LABEL,
  IMPROVEMENT_TASK_STATUS_COLOR,
  IMPROVEMENT_TASK_STATUS_LABEL,
  improvementTaskApi,
} from '@/apis/quality'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityWorkbenchCharts from '@/components/quality/QualityWorkbenchCharts.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { SignalBand, StageRail, StageWorkbenchShell } from '@/components/workbench'
import { useQualityScopeReload } from '@/composables/useQualityPageScope'
import { useQualityTaskStore } from '@/stores/modules/qualityTask'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
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
  { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt' },
  { title: '结束时间', dataIndex: 'finishedAt', key: 'finishedAt' },
]

const router = useRouter()
const qualityStore = useQualityStore()

const loading = reactive({
  achievement: false,
  improvement: false,
  ai: false,
})

const dashboardLoadError = ref<Error | null>(null)

const recentAchievements = ref<AchievementResultVO[]>([])
const recentImprovements = ref<ImprovementTaskVO[]>([])
const recentAiTasks = ref<AiTaskVO[]>([])

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
  succeeded: 0,
  failed: 0,
})

const trainingPlanId = computed(() => qualityStore.currentTrainingPlanId)

const planConfirmationStatus = computed(() => {
  if (!qualityStore.currentPlan) return undefined
  return qualityStore.currentPlan.confirmationStatus
})

const planConfirmationLabel = computed(() => {
  const status = planConfirmationStatus.value
  return status ? strictEnumLabel(CONFIRMATION_STATUS_LABEL, status, '培养方案确认状态') : '未提交'
})

// 年度评价阶段推断：依据培养方案确认状态与各能力块计数
const stages = computed<WorkbenchStage[]>(() => {
  const planSelected = !!trainingPlanId.value
  const planConfirmed = planConfirmationStatus.value === 'CONFIRMED'
  const dataReached
    = achievementCounts.calculated > 0
      || achievementCounts.submitted > 0
      || achievementCounts.confirmed > 0
      || achievementCounts.archived > 0
  const calcDone = dataReached
  const auditDone = achievementCounts.confirmed > 0 || achievementCounts.archived > 0
  const improvementActive = improvementCounts.total > 0
  const improvementClosed = improvementCounts.closed > 0
  const archived = achievementCounts.archived > 0

  return [
    {
      key: 'config',
      title: '专业配置',
      status: planSelected ? 'completed' : 'active',
      statusText: planSelected ? '已选培养方案' : '请选择培养方案',
    },
    {
      key: 'plan',
      title: '培养方案',
      status: planConfirmed ? 'completed' : planSelected ? 'active' : 'pending',
      statusText: planConfirmationLabel.value,
    },
    {
      key: 'data',
      title: '数据接入',
      status: dataReached ? 'completed' : planConfirmed ? 'active' : 'pending',
      statusText: dataReached ? '已产生评价输入' : '待导入成绩 / 拔取数据',
    },
    {
      key: 'calc',
      title: '达成度计算',
      status: calcDone ? 'completed' : planConfirmed ? 'active' : 'pending',
      metrics: [{ label: '已计算', value: achievementCounts.calculated }],
    },
    {
      key: 'audit',
      title: '审核确认',
      status: auditDone ? 'completed' : achievementCounts.submitted > 0 ? 'active' : 'pending',
      metrics: [
        { label: '已提交', value: achievementCounts.submitted },
        { label: '已确认', value: achievementCounts.confirmed },
      ],
    },
    {
      key: 'improve',
      title: '持续改进',
      status: improvementClosed ? 'completed' : improvementActive ? 'active' : 'pending',
      metrics: [
        { label: '未闭环', value: improvementCounts.total - improvementCounts.closed },
        { label: '已闭环', value: improvementCounts.closed },
      ],
    },
    {
      key: 'archive',
      title: '材料归档',
      status: archived ? 'completed' : 'pending',
      metrics: [{ label: '已归档', value: achievementCounts.archived }],
    },
  ]
})

const qualityTaskStore = useQualityTaskStore()
const { totalAttentionCount } = storeToRefs(qualityTaskStore)

const signals = computed<SignalMetric[]>(() => [
  {
    key: 'attention',
    label: '待关注任务',
    value: totalAttentionCount.value,
    tone: totalAttentionCount.value > 0 ? 'orange' : 'gray',
  },
  { key: 'a-total', label: '达成度总数', value: achievementCounts.total, tone: 'blue' },
  { key: 'a-conf', label: '已确认', value: achievementCounts.confirmed, tone: 'green' },
  { key: 'a-fail', label: '未达成', value: achievementCounts.notAchieved, tone: 'red' },
  { key: 'i-total', label: '改进任务', value: improvementCounts.total, tone: 'blue' },
  { key: 'i-prog', label: '整改中', value: improvementCounts.inProgress, tone: 'orange' },
  { key: 'i-closed', label: '已闭环', value: improvementCounts.closed, tone: 'green' },
  { key: 'ai-total', label: 'AI 任务', value: aiCounts.total, tone: 'blue' },
  { key: 'ai-fail', label: 'AI 失败', value: aiCounts.failed, tone: 'red' },
])

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
    { label: '已成功', value: aiCounts.succeeded, tone: 'green' },
    { label: '已失败', value: aiCounts.failed, tone: 'red' },
  ])
  if (achievement) groups.push(achievement)
  if (improvement) groups.push(improvement)
  if (ai) groups.push(ai)
  return groups
})

function targetTypeLabel(value: AchievementTargetType): string {
  return strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, value, '达成目标类型')
}

function achievementStatusLabel(value: AchievementStatus): string {
  return strictEnumLabel(ACHIEVEMENT_STATUS_LABEL, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatus): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

function auditStatusLabel(value: AchievementAuditStatus): string {
  return strictEnumLabel(ACHIEVEMENT_AUDIT_STATUS_LABEL, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatus): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function improvementStatusLabelOf(value: ImprovementTaskStatus): string {
  return strictEnumLabel(IMPROVEMENT_TASK_STATUS_LABEL, value, '持续改进任务状态')
}

function improvementStatusColorOf(value: ImprovementTaskStatus): BadgeTone {
  return strictEnumTone(IMPROVEMENT_TASK_STATUS_COLOR, value, '持续改进任务状态')
}

function aiStatusLabel(value: AiTaskStatus): string {
  return strictEnumLabel(AI_TASK_STATUS_LABEL, value, 'AI 任务状态')
}

function aiStatusColor(value: AiTaskStatus): BadgeTone {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, 'AI 任务状态')
}

function aiTypeLabel(value: AiTaskType): string {
  return strictEnumLabel(AI_TASK_TYPE_LABEL, value, 'AI 任务类型')
}

async function loadAchievement() {
  if (!trainingPlanId.value) return
  loading.achievement = true
  try {
    const page = await achievementApi.page({
      pageNum: 1,
      pageSize: 5,
      trainingPlanId: trainingPlanId.value,
    })
    recentAchievements.value = readPageList(page, '达成度结果加载失败，请稍后重试')
    achievementCounts.total = readPageTotal(page)

    const [calculated, submitted, confirmed, archived, notAchieved] = await Promise.all([
      achievementApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        auditStatus: 'CALCULATED',
      }),
      achievementApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        auditStatus: 'SUBMITTED',
      }),
      achievementApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        auditStatus: 'CONFIRMED',
      }),
      achievementApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        auditStatus: 'ARCHIVED',
      }),
      achievementApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        achievementStatus: 'NOT_ACHIEVED',
      }),
    ])
    achievementCounts.calculated = readPageTotal(calculated, '达成度状态统计加载失败，请稍后重试')
    achievementCounts.submitted = readPageTotal(submitted, '达成度状态统计加载失败，请稍后重试')
    achievementCounts.confirmed = readPageTotal(confirmed, '达成度状态统计加载失败，请稍后重试')
    achievementCounts.archived = readPageTotal(archived, '达成度状态统计加载失败，请稍后重试')
    achievementCounts.notAchieved = readPageTotal(notAchieved, '达成度状态统计加载失败，请稍后重试')
  } catch (error) {
    dashboardLoadError.value = toUserError(error, '达成度数据加载失败')
    showUserError(error, '达成度数据加载失败')
  } finally {
    loading.achievement = false
  }
}

async function loadImprovement() {
  if (!trainingPlanId.value) return
  loading.improvement = true
  try {
    const page = await improvementTaskApi.page({
      pageNum: 1,
      pageSize: 5,
      trainingPlanId: trainingPlanId.value,
    })
    recentImprovements.value = readPageList(page, '改进任务加载失败，请稍后重试')
    improvementCounts.total = readPageTotal(page)

    const [open, inProgress, submitted, closed] = await Promise.all([
      improvementTaskApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        status: 'OPEN',
      }),
      improvementTaskApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        status: 'IN_PROGRESS',
      }),
      improvementTaskApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        status: 'SUBMITTED',
      }),
      improvementTaskApi.page({
        pageNum: 1,
        pageSize: 1,
        trainingPlanId: trainingPlanId.value,
        status: 'CLOSED',
      }),
    ])
    improvementCounts.open = readPageTotal(open, '改进任务状态统计加载失败，请稍后重试')
    improvementCounts.inProgress = readPageTotal(inProgress, '改进任务状态统计加载失败，请稍后重试')
    improvementCounts.submitted = readPageTotal(submitted, '改进任务状态统计加载失败，请稍后重试')
    improvementCounts.closed = readPageTotal(closed, '改进任务状态统计加载失败，请稍后重试')
  } catch (error) {
    dashboardLoadError.value = toUserError(error, '改进任务数据加载失败')
    showUserError(error, '改进任务数据加载失败')
  } finally {
    loading.improvement = false
  }
}

async function loadAiTasks() {
  if (!trainingPlanId.value) return
  loading.ai = true
  try {
    const plan = trainingPlanId.value
    const page = await aiTaskApi.page({
      pageNum: 1,
      pageSize: 5,
      trainingPlanId: plan,
    })
    recentAiTasks.value = readPageList(page, 'AI 任务加载失败，请稍后重试')
    aiCounts.total = readPageTotal(page)

    const [pending, processing, succeeded, failed] = await Promise.all([
      aiTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: plan, status: 'PENDING' }),
      aiTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: plan, status: 'PROCESSING' }),
      aiTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: plan, status: 'SUCCEEDED' }),
      aiTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: plan, status: 'FAILED' }),
    ])
    aiCounts.pending = readPageTotal(pending, 'AI 任务状态统计加载失败，请稍后重试')
    aiCounts.processing = readPageTotal(processing, 'AI 任务状态统计加载失败，请稍后重试')
    aiCounts.succeeded = readPageTotal(succeeded, 'AI 任务状态统计加载失败，请稍后重试')
    aiCounts.failed = readPageTotal(failed, 'AI 任务状态统计加载失败，请稍后重试')
  } catch (error) {
    dashboardLoadError.value = toUserError(error, 'AI 任务数据加载失败')
    showUserError(error, 'AI 任务数据加载失败')
  } finally {
    loading.ai = false
  }
}

async function reload() {
  dashboardLoadError.value = null
  await Promise.all([
    loadAchievement(),
    loadImprovement(),
    loadAiTasks(),
    loadCockpitPhase(),
    qualityTaskStore.refreshAll({
      trainingPlanId: trainingPlanId.value || undefined,
      programId: qualityStore.currentProgramId || undefined,
      qualityCourseId: qualityStore.currentQualityCourseId || undefined,
    }),
  ])
}

useQualityScopeReload(reload)

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setTrainingPlan(qualityStore.trainingPlanOptions[0].id)
    }
  }
  await reload()
})

onActivated(() => {
  if (trainingPlanId.value) {
    void reload()
  }
})

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

const cockpitPhase = ref<string>()

const dashboardTodos = computed<DashboardTodoItem[]>(() => {
  if (!trainingPlanId.value) return []
  const items: DashboardTodoItem[] = []
  if (planConfirmationStatus.value !== 'CONFIRMED') {
    items.push({
      key: 'plan-confirm',
      label: `培养方案待确认（${planConfirmationLabel.value}）`,
      actionLabel: '去培养方案',
      tone: 'orange',
    })
  }
  if (planConfirmationStatus.value === 'CONFIRMED' && achievementCounts.calculated === 0) {
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
  if (cockpitPhase.value === 'ONSITE_VISIT') {
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
  switch (stage.key) {
    case 'config':
      void router.push({ name: 'QualityAccreditationCockpit' })
      break
    case 'plan':
      void router.push({ name: 'QualityTrainingPlanWorkbench' })
      break
    case 'data':
      void router.push({ path: '/quality/ingest-hub/score-batch' })
      break
    case 'calc':
    case 'audit':
      goAchievement()
      break
    case 'improve':
      goImprovement()
      break
    case 'archive':
      void router.push({ name: 'QualityArchive' })
      break
  }
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

async function loadCockpitPhase() {
  if (!trainingPlanId.value) {
    cockpitPhase.value = undefined
    return
  }
  try {
    const cockpit = await accreditationApi.cockpit(trainingPlanId.value)
    cockpitPhase.value = cockpit.activeCycle?.currentPhase
  } catch {
    cockpitPhase.value = undefined
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :loading="loading.achievement || loading.improvement || loading.ai"
            @click="reload"
          >
            刷新
          </UiButton>
          <UiButton
            variant="ghost"
            size="sm"
            :disabled="!trainingPlanId"
            @click="goAchievement"
          >
            进入达成度
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <UiEmpty
      v-if="!trainingPlanId"
      description="请选择培养方案"
      class="quality-dashboard__empty"
    />

    <template v-else>
      <StageRail :stages="stages" class="quality-dashboard__stages" @select="handleStageSelect" />
      <UiCard v-if="dashboardTodos.length" class="quality-dashboard__todo-card" title="待办事项">
        <ul class="quality-dashboard__todo-list">
          <li v-for="item in dashboardTodos" :key="item.key" class="quality-dashboard__todo-item">
            <UiTag :tone="item.tone" size="sm">{{ item.tone === 'red' ? '紧急' : '待办' }}</UiTag>
            <span class="quality-dashboard__todo-label">{{ item.label }}</span>
            <UiButton variant="ghost" size="sm" @click="handleTodoAction(item.key)">
              {{ item.actionLabel }}
            </UiButton>
          </li>
        </ul>
      </UiCard>
      <SignalBand :metrics="signals" compact class="quality-dashboard__signals" />
      <QualityWorkbenchCharts :groups="qualityChartGroups" />

      <div class="quality-dashboard__lists">
        <UiCard class="quality-dashboard__list-card" title="最近达成度结果">
          <template #extra>
            <UiButton variant="ghost" size="sm" @click="goAchievement"> 查看全部 </UiButton>
          </template>
          <UiDataTable
            pagination-mode="none"
            class="student-detail-table__data-table"
            :columns="recentAchievementColumns"
            :data-source="recentAchievements"
            :loading="loading.achievement"
            :show-pagination="false"
            row-key="id"
            size="small"
            flat
            :total="recentAchievements.length"
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
        </UiCard>

        <UiCard class="quality-dashboard__list-card" title="最近改进任务">
          <template #extra>
            <UiButton variant="ghost" size="sm" @click="goImprovement"> 查看全部 </UiButton>
          </template>
          <UiDataTable
            pagination-mode="none"
            class="student-detail-table__data-table"
            :columns="recentImprovementColumns"
            :data-source="recentImprovements"
            :loading="loading.improvement"
            :show-pagination="false"
            row-key="id"
            size="small"
            flat
            :total="recentImprovements.length"
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
        </UiCard>

        <UiCard class="quality-dashboard__list-card" title="最近 AI 任务">
          <template #extra>
            <UiButton variant="ghost" size="sm" @click="goAiTask"> 查看全部 </UiButton>
          </template>
          <UiDataTable
            pagination-mode="none"
            class="student-detail-table__data-table"
            :columns="recentAiTaskColumns"
            :data-source="recentAiTasks"
            :loading="loading.ai"
            :show-pagination="false"
            row-key="id"
            size="small"
            flat
            :total="recentAiTasks.length"
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
              <template v-else-if="column.key === 'startedAt'">
                {{ record.startedAt }}
              </template>
              <template v-else-if="column.key === 'finishedAt'">
                {{ record.finishedAt }}
              </template>
              <template v-else-if="column.key === 'failurePhase'">
                <span
                  :class="{
                    'quality-dashboard__value--error': record.status === 'FAILED',
                  }"
                >
                  {{ record.status === 'FAILED' ? record.failurePhase : '不适用' }}
                </span>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </div>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.quality-dashboard {
  &__plan-select {
    min-width: 260px;
  }

  &__plan-status {
    margin-left: 0;
  }

  &__empty {
    margin-top: 32px;
  }

  &__stages {
    margin-bottom: 16px;
  }

  &__todo-card {
    margin-bottom: 16px;
  }

  &__todo-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }

  &__todo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__todo-label {
    flex: 1;
    min-width: 200px;
    color: var(--dp-text-primary, #0f172a);
    font-size: 14px;
  }

  &__signals {
    margin-bottom: 24px;
  }

  &__lists {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 16px;

    @media (min-width: 1280px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));

      .quality-dashboard__list-card:last-child {
        grid-column: span 2;
      }
    }
  }

  &__value--ok {
    color: var(--ant-color-success, #16a34a);
  }

  &__value--bad {
    color: var(--ant-color-error, #dc2626);
  }

  &__value--error {
    color: var(--ant-color-error, #dc2626);
  }

  &__threshold {
    color: var(--dp-text-muted, #64748b);
    margin-left: 4px;
  }
}
</style>
