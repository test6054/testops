<script setup lang="ts">
/**
 * 教学质量评价工作台首页
 *
 * 汇集主链关键指标：
 * - 当前培养方案的毕业要求 / 观测点支撑健康度
 * - 达成度审核漏斗（已计算 / 已提交 / 已确认 / 已归档）
 * - 改进任务台账（未启动 / 整改中 / 已提交待复评 / 已闭环）
 * - AI 任务（待处理 / 处理中 / 成功 / 失败）
 * - 最近 5 条达成度 + 最近 5 条改进任务
 */
import type {
  AchievementResultVO,
  AiTaskVO,
  ImprovementTaskVO,
} from '@/apis/quality'
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
  IMPROVEMENT_TASK_STATUS_COLOR,
  IMPROVEMENT_TASK_STATUS_LABEL,
  improvementTaskApi,
} from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'

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

async function loadTrainingPlan() {
  loading.plan = true
  try {
    const list = await qualityStore.loadTrainingPlanOptions()
    if (!qualityStore.currentTrainingPlanId && list.length) {
      qualityStore.setCurrent({ trainingPlanId: list[0].id })
    }
  }
  finally {
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
    recentAchievements.value = page.list
    achievementCounts.total = page.total

    const [calculated, submitted, confirmed, archived, notAchieved] = await Promise.all([
      achievementApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, auditStatus: 'CALCULATED' }),
      achievementApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, auditStatus: 'SUBMITTED' }),
      achievementApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, auditStatus: 'CONFIRMED' }),
      achievementApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, auditStatus: 'ARCHIVED' }),
      achievementApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, achievementStatus: 'NOT_ACHIEVED' }),
    ])
    achievementCounts.calculated = calculated.total
    achievementCounts.submitted = submitted.total
    achievementCounts.confirmed = confirmed.total
    achievementCounts.archived = archived.total
    achievementCounts.notAchieved = notAchieved.total
  }
  finally {
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
    recentImprovements.value = page.list
    improvementCounts.total = page.total

    const [open, inProgress, submitted, closed] = await Promise.all([
      improvementTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, status: 'OPEN' }),
      improvementTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, status: 'IN_PROGRESS' }),
      improvementTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, status: 'SUBMITTED' }),
      improvementTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: trainingPlanId.value, status: 'CLOSED' }),
    ])
    improvementCounts.open = open.total
    improvementCounts.inProgress = inProgress.total
    improvementCounts.submitted = submitted.total
    improvementCounts.closed = closed.total
  }
  finally {
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
    recentAiTasks.value = page.list
    aiCounts.total = page.total

    const [pending, processing, succeeded, failed] = await Promise.all([
      aiTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: plan, status: 'PENDING' }),
      aiTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: plan, status: 'PROCESSING' }),
      aiTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: plan, status: 'SUCCEEDED' }),
      aiTaskApi.page({ pageNum: 1, pageSize: 1, trainingPlanId: plan, status: 'FAILED' }),
    ])
    aiCounts.pending = pending.total
    aiCounts.processing = processing.total
    aiCounts.succeeded = succeeded.total
    aiCounts.failed = failed.total
  }
  finally {
    loading.ai = false
  }
}

async function reload() {
  await Promise.all([loadAchievement(), loadImprovement(), loadAiTasks()])
}

function handlePlanChange(value: string) {
  qualityStore.setCurrent({ trainingPlanId: value })
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
  router.push({ name: 'QualityImprovementTask' })
}

function goAiTask() {
  router.push({ name: 'QualityAiTask' })
}
</script>

<template>
  <div class="quality-dashboard">
    <header class="page-header">
      <div>
        <h2>教学质量评价工作台</h2>
        <p class="subtitle">
          当前培养方案：<strong>{{ trainingPlanLabel }}</strong>
        </p>
      </div>
      <a-space>
        <a-select
          :value="trainingPlanId || undefined"
          placeholder="选择培养方案"
          style="min-width: 240px"
          :loading="loading.plan"
          :options="qualityStore.trainingPlanOptions.map(item => ({
            value: item.id,
            label: `${item.planCode} · ${item.planName}`,
          }))"
          @change="(val) => handlePlanChange(val as string)"
        />
        <a-button :loading="loading.achievement || loading.improvement || loading.ai" @click="reload">
          刷新
        </a-button>
      </a-space>
    </header>

    <a-row :gutter="16" class="metric-row">
      <a-col :xs="24" :md="8">
        <a-card title="达成度概览" :bordered="false" hoverable @click="goAchievement">
          <a-row :gutter="8" class="metrics">
            <a-col :span="8">
              <a-statistic title="总计" :value="achievementCounts.total" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="已确认" :value="achievementCounts.confirmed" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="已归档" :value="achievementCounts.archived" />
            </a-col>
          </a-row>
          <a-divider style="margin: 12px 0" />
          <a-space wrap>
            <a-tag color="cyan">
              计算完成 {{ achievementCounts.calculated }}
            </a-tag>
            <a-tag color="blue">
              已提交 {{ achievementCounts.submitted }}
            </a-tag>
            <a-tag color="red">
              未达成 {{ achievementCounts.notAchieved }}
            </a-tag>
          </a-space>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="8">
        <a-card title="持续改进任务" :bordered="false" hoverable @click="goImprovement">
          <a-row :gutter="8" class="metrics">
            <a-col :span="8">
              <a-statistic title="总计" :value="improvementCounts.total" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="整改中" :value="improvementCounts.inProgress" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="已闭环" :value="improvementCounts.closed" />
            </a-col>
          </a-row>
          <a-divider style="margin: 12px 0" />
          <a-space wrap>
            <a-tag color="orange">
              待启动 {{ improvementCounts.open }}
            </a-tag>
            <a-tag color="cyan">
              待复评 {{ improvementCounts.submitted }}
            </a-tag>
          </a-space>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="8">
        <a-card title="AI 任务" :bordered="false" hoverable @click="goAiTask">
          <a-row :gutter="8" class="metrics">
            <a-col :span="8">
              <a-statistic title="总计" :value="aiCounts.total" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="成功" :value="aiCounts.succeeded" :value-style="{ color: '#52c41a' }" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="失败" :value="aiCounts.failed" :value-style="{ color: '#ff4d4f' }" />
            </a-col>
          </a-row>
          <a-divider style="margin: 12px 0" />
          <a-space wrap>
            <a-tag color="default">
              待处理 {{ aiCounts.pending }}
            </a-tag>
            <a-tag color="blue">
              处理中 {{ aiCounts.processing }}
            </a-tag>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="list-row">
      <a-col :xs="24" :lg="12">
        <a-card title="最近达成度结果" :bordered="false">
          <a-table
            :data-source="recentAchievements"
            :pagination="false"
            row-key="id"
            size="small"
            :loading="loading.achievement"
          >
            <a-table-column title="目标类型" data-index="targetType">
              <template #default="{ text }">
                {{ ACHIEVEMENT_TARGET_TYPE_LABEL[text as keyof typeof ACHIEVEMENT_TARGET_TYPE_LABEL] || text }}
              </template>
            </a-table-column>
            <a-table-column title="目标 ID" data-index="targetId" width="120">
              <template #default="{ text }">{{ text || '-' }}</template>
            </a-table-column>
            <a-table-column title="达成值" data-index="finalValue">
              <template #default="{ text, record }">
                <span :style="{ color: record.thresholdValue && Number(text) < Number(record.thresholdValue) ? '#ff4d4f' : '#52c41a' }">
                  {{ text ?? '-' }}
                </span>
                <span style="color: #999; margin-left: 4px"> / {{ record.thresholdValue ?? '-' }}</span>
              </template>
            </a-table-column>
            <a-table-column title="达成结论" data-index="achievementStatus">
              <template #default="{ text }">
                <a-tag v-if="text" :color="ACHIEVEMENT_STATUS_COLOR[text as keyof typeof ACHIEVEMENT_STATUS_COLOR]">
                  {{ ACHIEVEMENT_STATUS_LABEL[text as keyof typeof ACHIEVEMENT_STATUS_LABEL] }}
                </a-tag>
                <span v-else>-</span>
              </template>
            </a-table-column>
            <a-table-column title="审核" data-index="auditStatus">
              <template #default="{ text }">
                <a-tag :color="ACHIEVEMENT_AUDIT_STATUS_COLOR[text as keyof typeof ACHIEVEMENT_AUDIT_STATUS_COLOR]">
                  {{ ACHIEVEMENT_AUDIT_STATUS_LABEL[text as keyof typeof ACHIEVEMENT_AUDIT_STATUS_LABEL] }}
                </a-tag>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="12">
        <a-card title="最近改进任务" :bordered="false">
          <a-table
            :data-source="recentImprovements"
            :pagination="false"
            row-key="id"
            size="small"
            :loading="loading.improvement"
          >
            <a-table-column title="编号" data-index="taskCode" />
            <a-table-column title="标题" data-index="taskTitle" />
            <a-table-column title="负责人 ID" data-index="ownerUserId">
              <template #default="{ text }">
                {{ text || '-' }}
              </template>
            </a-table-column>
            <a-table-column title="截止" data-index="dueDate">
              <template #default="{ text }">
                {{ text || '-' }}
              </template>
            </a-table-column>
            <a-table-column title="状态" data-index="status">
              <template #default="{ text }">
                <a-tag :color="IMPROVEMENT_TASK_STATUS_COLOR[text as keyof typeof IMPROVEMENT_TASK_STATUS_COLOR]">
                  {{ IMPROVEMENT_TASK_STATUS_LABEL[text as keyof typeof IMPROVEMENT_TASK_STATUS_LABEL] }}
                </a-tag>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="list-row">
      <a-col :span="24">
        <a-card title="最近 AI 任务" :bordered="false">
          <a-table
            :data-source="recentAiTasks"
            :pagination="false"
            row-key="id"
            size="small"
            :loading="loading.ai"
          >
            <a-table-column title="能力" data-index="taskType">
              <template #default="{ text }">
                {{ AI_TASK_TYPE_LABEL[text as keyof typeof AI_TASK_TYPE_LABEL] || text }}
              </template>
            </a-table-column>
            <a-table-column title="状态" data-index="status">
              <template #default="{ text }">
                <a-tag :color="AI_TASK_STATUS_COLOR[text as keyof typeof AI_TASK_STATUS_COLOR]">
                  {{ AI_TASK_STATUS_LABEL[text as keyof typeof AI_TASK_STATUS_LABEL] }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="模型" data-index="modelName">
              <template #default="{ text }">
                {{ text || '-' }}
              </template>
            </a-table-column>
            <a-table-column title="失败阶段" data-index="failurePhase">
              <template #default="{ text }">
                <span v-if="text" style="color: #ff4d4f">{{ text }}</span>
                <span v-else>-</span>
              </template>
            </a-table-column>
            <a-table-column title="开始时间" data-index="startedAt">
              <template #default="{ text }">
                {{ text || '-' }}
              </template>
            </a-table-column>
            <a-table-column title="结束时间" data-index="finishedAt">
              <template #default="{ text }">
                {{ text || '-' }}
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped lang="scss">
.quality-dashboard {
  padding: 16px;

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;

    h2 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      color: var(--ant-color-text-secondary);
      font-size: 13px;
    }
  }

  .metric-row,
  .list-row {
    margin-bottom: 16px;
  }

  .metrics {
    margin-bottom: 4px;
  }
}
</style>
