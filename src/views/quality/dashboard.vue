<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
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
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
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
  CONFIRMATION_STATUS_COLOR,
  CONFIRMATION_STATUS_LABEL,
  IMPROVEMENT_TASK_STATUS_COLOR,
  IMPROVEMENT_TASK_STATUS_LABEL,
  improvementTaskApi,
} from '@/apis/quality'
import { UiButton, UiCard, UiDataTable, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { ContextBar, SignalBand, StageRail, StageWorkbenchShell } from '@/components/workbench'
import { useQualityStore } from '@/stores/modules/quality'
import { useQualityTaskStore } from '@/stores/modules/qualityTask'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
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
  plan: false,
  achievement: false,
  improvement: false,
  ai: false,
})

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
const trainingPlanLabel = computed(() => qualityStore.currentPlan?.planName || '未选择')

const planConfirmationStatus = computed(() => {
  if (!qualityStore.currentPlan) return undefined
  return qualityStore.currentPlan.confirmationStatus
})

const planConfirmationLabel = computed(() => {
  const status = planConfirmationStatus.value
  return status ? strictEnumLabel(CONFIRMATION_STATUS_LABEL, status, '培养方案确认状态') : '未提交'
})

const planConfirmationColor = computed(() => {
  const status = planConfirmationStatus.value
  return status ? strictEnumTone(CONFIRMATION_STATUS_COLOR, status, '培养方案确认状态') : 'default'
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

function targetTypeLabel(value: AchievementTargetType): string {
  return strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, value, '达成目标类型')
}

function achievementStatusLabel(value: AchievementStatus): string {
  return strictEnumLabel(ACHIEVEMENT_STATUS_LABEL, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatus): string {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

function auditStatusLabel(value: AchievementAuditStatus): string {
  return strictEnumLabel(ACHIEVEMENT_AUDIT_STATUS_LABEL, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatus): string {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function improvementStatusLabelOf(value: ImprovementTaskStatus): string {
  return strictEnumLabel(IMPROVEMENT_TASK_STATUS_LABEL, value, '持续改进任务状态')
}

function improvementStatusColorOf(value: ImprovementTaskStatus): string {
  return strictEnumTone(IMPROVEMENT_TASK_STATUS_COLOR, value, '持续改进任务状态')
}

function aiStatusLabel(value: AiTaskStatus): string {
  return strictEnumLabel(AI_TASK_STATUS_LABEL, value, 'AI 任务状态')
}

function aiStatusColor(value: AiTaskStatus): string {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, 'AI 任务状态')
}

function aiTypeLabel(value: AiTaskType): string {
  return strictEnumLabel(AI_TASK_TYPE_LABEL, value, 'AI 任务类型')
}

async function loadTrainingPlan() {
  loading.plan = true
  try {
    const list = await qualityStore.loadTrainingPlanOptions()
    if (!qualityStore.currentTrainingPlanId && list.length) {
      qualityStore.setTrainingPlan(list[0].id)
    }
  } finally {
    loading.plan = false
  }
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
  } finally {
    loading.ai = false
  }
}

async function reload() {
  await Promise.all([
    loadAchievement(),
    loadImprovement(),
    loadAiTasks(),
    qualityTaskStore.refreshAll({
      trainingPlanId: trainingPlanId.value || undefined,
      programId: qualityStore.currentProgramId || undefined,
      qualityCourseId: qualityStore.currentQualityCourseId || undefined,
    }),
  ])
}

function handlePlanChange(value: SelectValue) {
  if (value === null || value === undefined) {
    qualityStore.setTrainingPlan('')
    reload()
    return
  }
  if (typeof value !== 'string') {
    showUserError(null, '培养方案选择无效，请重新选择')
    return
  }
  qualityStore.setTrainingPlan(value)
  reload()
}

onMounted(async () => {
  await loadTrainingPlan()
  await reload()
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

function goExternalPull() {
  router.push({ name: 'QualityExternalPull' })
}

function goScoreBatch() {
  router.push({ name: 'QualityScoreBatch' })
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="trainingPlanId || undefined"
            placeholder="选择培养方案"
            class="quality-dashboard__plan-select"
            :loading="loading.plan"
            :options="
              qualityStore.trainingPlanOptions.map((item) => ({
                value: item.id,
                label: `${item.planCode} · ${item.planName}`,
              }))
            "
            @change="handlePlanChange"
          />
          <UiTag v-if="trainingPlanLabel !== '未选择'" tone="blue" size="sm">
            {{ trainingPlanLabel }}
          </UiTag>
          <a-tag :color="planConfirmationColor" class="quality-dashboard__plan-status">
            {{ planConfirmationLabel }}
          </a-tag>
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :loading="loading.achievement || loading.improvement || loading.ai"
            @click="reload"
          >
            刷新
          </UiButton>
          <UiButton size="sm" :disabled="!trainingPlanId" @click="goAchievement">
            进入达成度
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!trainingPlanId"
      description="请先选择培养方案，工作台将基于其生成阶段化指标"
      class="quality-dashboard__empty"
    />

    <template v-else>
      <StageRail :stages="stages" class="quality-dashboard__stages" />
      <SignalBand :metrics="signals" compact class="quality-dashboard__signals" />

      <div class="quality-dashboard__lists">
        <UiCard class="quality-dashboard__list-card" title="最近达成度结果">
          <template #extra>
            <UiButton variant="ghost" size="sm" @click="goAchievement"> 查看全部 </UiButton>
          </template>
          <UiDataTable class="student-detail-table__data-table"
                       :columns="recentAchievementColumns"
            :data-source="recentAchievements"
            :show-pagination="false"
            row-key="id"
            size="small"
            :loading="loading.achievement"
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
                <a-tag :color="achievementStatusColor(record.achievementStatus)">
                  {{ achievementStatusLabel(record.achievementStatus) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'auditStatus'">
                <a-tag :color="auditStatusColor(record.auditStatus)">
                  {{ auditStatusLabel(record.auditStatus) }}
                </a-tag>
              </template>
            </template>
          </UiDataTable>
        </UiCard>

        <UiCard class="quality-dashboard__list-card" title="最近改进任务">
          <template #extra>
            <UiButton variant="ghost" size="sm" @click="goImprovement"> 查看全部 </UiButton>
          </template>
          <UiDataTable class="student-detail-table__data-table"
            :columns="recentImprovementColumns"
            :data-source="recentImprovements"
            :show-pagination="false"
            row-key="id"
            size="small"
            :loading="loading.improvement"
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
                <a-tag :color="improvementStatusColorOf(record.status)">
                  {{ improvementStatusLabelOf(record.status) }}
                </a-tag>
              </template>
            </template>
          </UiDataTable>
        </UiCard>

        <UiCard class="quality-dashboard__list-card" title="最近 AI 任务">
          <template #extra>
            <UiButton variant="ghost" size="sm" @click="goAiTask"> 查看全部 </UiButton>
          </template>
          <UiDataTable class="student-detail-table__data-table"
            :columns="recentAiTaskColumns"
            :data-source="recentAiTasks"
            :show-pagination="false"
            row-key="id"
            size="small"
            :loading="loading.ai"
            flat
            :total="recentAiTasks.length"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'taskType'">
                {{ aiTypeLabel(record.taskType) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="aiStatusColor(record.status)">
                  {{ aiStatusLabel(record.status) }}
                </a-tag>
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

      <div class="quality-dashboard__shortcuts">
        <UiButton variant="outline" size="sm" @click="goScoreBatch"> 成绩批次 </UiButton>
        <UiButton variant="outline" size="sm" @click="goExternalPull"> 外部数据拔取 </UiButton>
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

  &__signals {
    margin-bottom: 24px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border-radius: 8px;
    border: 1px solid var(--dp-border, #e2e8f0);
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

  &__shortcuts {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 4px;
  }

  &__value--success {
    color: var(--ant-color-success, #16a34a);
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
