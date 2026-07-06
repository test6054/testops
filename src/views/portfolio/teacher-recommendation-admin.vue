<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherPkCompareVO,
  PortfolioTeacherRecommendCandidateVO,
  PortfolioTeacherRecommendExplainStatusVO,
  PortfolioTeacherRecommendRuleVO,
  PortfolioTeacherRecommendRunVO,
} from '@/apis/portfolio/teacher-platform'
import type { AiTaskStatusCode } from '@/apis/quality/types'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS,
  PortfolioTeacherRecommendRunModeDescription,
  PortfolioTeacherRecommendRunStatusDescription,
  PortfolioTeacherRecommendSceneCode,
  PortfolioTeacherRecommendSceneDescription,
} from '@/apis/portfolio/enums'
import { portfolioTeacherRecommendationApi } from '@/apis/portfolio/teacher-platform'
import { aiTaskApi } from '@/apis/quality/ai-task'
import { AiTaskStatusDescription } from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const activeTab = ref('execute')
const rules = ref<PortfolioTeacherRecommendRuleVO[]>([])
const candidates = ref<PortfolioTeacherRecommendCandidateVO[]>([])
const runs = ref<PortfolioTeacherRecommendRunVO[]>([])
const pkResult = ref<PortfolioTeacherPkCompareVO | null>(null)
const selectedRuleId = ref('')
const lastRunId = ref('')
const loading = ref(false)
const runsLoading = ref(false)

const ruleForm = reactive({
  ruleName: '',
  minHonorCount: 1,
  requireDualTeacher: false,
  topLimit: 10,
})

const pkForm = reactive({
  teacherUserIds: '',
})

const candidateColumns: ColumnsType = [
  { title: '排名', dataIndex: 'rankOrder', key: 'rankOrder', width: 64 },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 100 },
  { title: '评分', dataIndex: 'ruleScore', key: 'ruleScore', width: 80 },
  { title: '推荐理由', dataIndex: 'reasonText', key: 'reasonText' },
]

const runColumns: ColumnsType = [
  { title: '运行 ID', dataIndex: 'id', key: 'id', width: 100 },
  { title: '规则 ID', dataIndex: 'ruleId', key: 'ruleId', width: 100 },
  { title: '模式', key: 'runMode', width: 80 },
  { title: '状态', key: 'runStatus', width: 88 },
  { title: '运行时间', dataIndex: 'runTime', key: 'runTime', width: 160 },
  { title: '操作人', dataIndex: 'operatorUserId', key: 'operatorUserId', width: 100 },
  { title: '候选数', dataIndex: 'candidateCount', key: 'candidateCount', width: 72 },
  { title: 'AI 解释', key: 'explainStatus', width: 100 },
  { title: '操作', key: 'actions', width: 120 },
]

const explainDrawerOpen = ref(false)
const explainLoading = ref(false)
const explainStatus = ref<PortfolioTeacherRecommendExplainStatusVO | null>(null)
const explainRunId = ref('')
const route = useRoute()
const router = useRouter()

function aiTaskStatusLabel(status?: AiTaskStatusCode): string {
  if (!status) {
    return '未提交'
  }
  return strictEnumLabel(AiTaskStatusDescription, status, 'AI 任务状态')
}

function openExplainAiTask() {
  if (!explainStatus.value?.explainTaskId) {
    return
  }
  void router.push({
    path: '/portfolio/admin/teacher-recommendation',
    query: {
      ...(explainRunId.value ? { runId: explainRunId.value } : {}),
      taskId: explainStatus.value.explainTaskId,
    },
  })
  explainDrawerOpen.value = true
}

/** 消费通知深链 runId / taskId，定位推荐运行并打开 AI 解释抽屉。 */
async function applyRouteDeepLink() {
  const runId = readRouteStringParam(route.query.runId)
  if (runId) {
    viewRunCandidates(runId)
    await loadExplainStatus(runId)
    return
  }
  const taskId = readRouteStringParam(route.query.taskId)
  if (!taskId) {
    return
  }
  try {
    const task = await aiTaskApi.detail(taskId)
    if (!task.businessId) {
      showUserError(null, '推荐解释任务缺少运行 ID')
      return
    }
    viewRunCandidates(task.businessId)
    await loadExplainStatus(task.businessId)
  } catch (error) {
    showUserError(error, '推荐解释深链加载失败')
  }
}

function runModeLabel(mode: PortfolioTeacherRecommendRunVO['runMode']) {
  return strictEnumLabel(PortfolioTeacherRecommendRunModeDescription, mode, '推荐运行模式')
}

function runStatusLabel(status: PortfolioTeacherRecommendRunVO['runStatus']) {
  return strictEnumLabel(PortfolioTeacherRecommendRunStatusDescription, status, '推荐运行状态')
}

function sceneLabel(scene: PortfolioTeacherRecommendSceneCode): string {
  return strictEnumLabel(PortfolioTeacherRecommendSceneDescription, scene, '推荐场景')
}

async function loadRules() {
  try {
    rules.value = await portfolioTeacherRecommendationApi.listRules()
    if (!selectedRuleId.value && rules.value.length > 0) {
      selectedRuleId.value = rules.value[0].id
    }
  } catch (error) {
    showUserError(error)
  }
}

async function saveRule() {
  if (!ruleForm.ruleName.trim()) {
    message.warning('请填写规则名称')
    return
  }
  try {
    await portfolioTeacherRecommendationApi.saveRule({
      ruleName: ruleForm.ruleName.trim(),
      recommendScene: PortfolioTeacherRecommendSceneCode.EXCELLENT_TEACHER,
      filterSnapshot: {
        minHonorCount: ruleForm.minHonorCount,
        requireDualTeacher: ruleForm.requireDualTeacher,
        topLimit: ruleForm.topLimit,
      },
    })
    message.success('规则已保存')
    ruleForm.ruleName = ''
    await loadRules()
  } catch (error) {
    showUserError(error)
  }
}

async function executeRuleRun() {
  if (!selectedRuleId.value) {
    message.warning('请先选择规则')
    return
  }
  loading.value = true
  try {
    lastRunId.value = await portfolioTeacherRecommendationApi.executeRun({
      ruleId: selectedRuleId.value,
    })
    message.success('规则推荐已完成')
    await loadCandidates()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function executeAiExplain() {
  if (!selectedRuleId.value) {
    message.warning('请先选择规则')
    return
  }
  loading.value = true
  try {
    lastRunId.value = await portfolioTeacherRecommendationApi.executeRun({
      ruleId: selectedRuleId.value,
    })
    await portfolioTeacherRecommendationApi.explainSubmit({ runId: lastRunId.value })
    message.success('规则执行完成，AI 解释任务已提交')
    await loadCandidates()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadRuns() {
  runsLoading.value = true
  try {
    const page = await portfolioTeacherRecommendationApi.pageRuns({
      ruleId: selectedRuleId.value || undefined,
      pageNum: 1,
      pageSize: 50,
    })
    runs.value = readPageList(page, '加载执行历史失败')
  } catch (error) {
    showUserError(error)
  } finally {
    runsLoading.value = false
  }
}

function viewRunCandidates(runId: string) {
  lastRunId.value = runId
  activeTab.value = 'execute'
  void loadCandidates()
}

async function loadExplainStatus(runId: string) {
  explainRunId.value = runId
  explainDrawerOpen.value = true
  explainLoading.value = true
  explainStatus.value = null
  try {
    explainStatus.value = await portfolioTeacherRecommendationApi.explainStatus({ runId })
  } catch (error) {
    showUserError(error)
  } finally {
    explainLoading.value = false
  }
}

async function loadCandidates() {
  if (!lastRunId.value) {
    return
  }
  try {
    const page = await portfolioTeacherRecommendationApi.pageCandidates({
      runId: lastRunId.value,
      pageNum: 1,
      pageSize: 50,
    })
    candidates.value = readPageList(page, '加载推荐候选失败')
  } catch (error) {
    showUserError(error)
  }
}

async function runPkCompare() {
  const ids = pkForm.teacherUserIds
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (ids.length < 2 || ids.length > 5) {
    message.warning('请选择 2–5 名教师用户 ID')
    return
  }
  try {
    pkResult.value = await portfolioTeacherRecommendationApi.pkCompare({
      teacherUserIds: ids,
      dimensionCodes: PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS,
    })
  } catch (error) {
    showUserError(error)
  }
}

watch(selectedRuleId, () => {
  if (activeTab.value === 'runs') {
    void loadRuns()
  }
})

onMounted(async () => {
  await loadRules()
  await loadRuns()
  await applyRouteDeepLink()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="优秀教师推荐" />
    </template>
    <UiCard title="规则配置">
      <div class="form-row">
        <a-input v-model:value="ruleForm.ruleName" placeholder="规则名称" style="width: 160px" />
        <a-input-number v-model:value="ruleForm.minHonorCount" :min="0" placeholder="最低荣誉数" />
        <a-checkbox v-model:checked="ruleForm.requireDualTeacher"> 要求双师 </a-checkbox>
        <a-input-number
          v-model:value="ruleForm.topLimit"
          :min="1"
          :max="50"
          placeholder="候选上限"
        />
        <UiButton variant="primary" @click="saveRule"> 保存规则 </UiButton>
      </div>
      <a-select
        v-model:value="selectedRuleId"
        placeholder="选择规则"
        style="width: 240px; margin-top: 8px"
      >
        <a-select-option v-for="rule in rules" :key="rule.id" :value="rule.id">
          {{ rule.ruleName }}（{{ sceneLabel(rule.recommendScene) }}）
        </a-select-option>
      </a-select>
    </UiCard>
    <a-tabs v-model:active-key="activeTab" style="margin-top: 16px">
      <a-tab-pane key="execute" tab="执行推荐">
        <UiCard>
          <div class="form-row">
            <UiButton :loading="loading" @click="executeRuleRun"> 规则推荐 </UiButton>
            <UiButton variant="primary" :loading="loading" @click="executeAiExplain">
              规则执行 → AI 解释
            </UiButton>
            <UiButton @click="loadCandidates"> 刷新候选 </UiButton>
          </div>
          <UiEmpty v-if="!loading && candidates.length === 0" description="当前筛选无推荐记录" />
          <UiDataTable
            :columns="candidateColumns"
            :data-source="candidates"
            :loading="loading"
            row-key="id"
            style="margin-top: 16px"
          />
        </UiCard>
      </a-tab-pane>
      <a-tab-pane key="runs" tab="执行历史">
        <UiCard>
          <UiButton :loading="runsLoading" @click="loadRuns"> 刷新历史 </UiButton>
          <UiEmpty v-if="!runsLoading && runs.length === 0" description="当前筛选无推荐记录" />
          <UiDataTable
            :columns="runColumns"
            :data-source="runs"
            :loading="runsLoading"
            row-key="id"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'runMode'">
                {{ runModeLabel(record.runMode) }}
              </template>
              <template v-else-if="column.key === 'runStatus'">
                {{ runStatusLabel(record.runStatus) }}
              </template>
              <template v-else-if="column.key === 'explainStatus'">
                <a @click="loadExplainStatus(record.id)">查看</a>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a @click="viewRunCandidates(record.id)">查看候选</a>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>
    </a-tabs>
    <UiCard title="PK 多维对比" style="margin-top: 16px">
      <div class="form-row">
        <a-input
          v-model:value="pkForm.teacherUserIds"
          placeholder="教师 ID，逗号分隔（2–5人）"
          style="width: 360px"
        />
        <UiButton @click="runPkCompare"> 对比 </UiButton>
      </div>
      <div v-if="pkResult" class="pk-grid">
        <div v-for="teacher in pkResult.teachers" :key="teacher.teacherUserId" class="pk-col">
          <div class="pk-title">教师 {{ teacher.teacherUserId }}</div>
          <div v-for="row in teacher.dimensionRows" :key="row.dimensionCode" class="pk-row">
            {{ row.dimensionLabel }}：{{ row.dimensionScore }}
          </div>
        </div>
      </div>
    </UiCard>
    <a-drawer v-model:open="explainDrawerOpen" title="AI 解释状态" width="560">
      <a-spin :spinning="explainLoading">
        <template v-if="explainStatus">
          <p>运行 ID {{ explainStatus.runId }}</p>
          <p v-if="explainStatus.explainTaskId">
            任务 ID {{ explainStatus.explainTaskId }}
            <UiButton size="sm" style="margin-left: 8px" @click="openExplainAiTask">
              打开 AI 任务中心
            </UiButton>
          </p>
          <p v-else>尚未提交 AI 解释任务</p>
          <p v-if="explainStatus.status">状态 {{ aiTaskStatusLabel(explainStatus.status) }}</p>
          <ul v-if="explainStatus.candidateItems?.length" class="explain-list">
            <li v-for="item in explainStatus.candidateItems" :key="item.teacherUserId">
              <strong>教师 {{ item.teacherUserId }}</strong>
              <pre class="explain-text">{{ item.reasonText }}</pre>
            </li>
          </ul>
        </template>
      </a-spin>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.explain-text {
  margin-top: 8px;
  padding: 8px;
  font-size: 13px;
  white-space: pre-wrap;
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
}
.explain-list {
  margin: 12px 0 0;
  padding-left: 16px;
}
.explain-list li {
  margin-bottom: 12px;
}
.pk-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}
.pk-col {
  min-width: 200px;
  padding: 8px;
  border: 1px solid var(--ant-color-border);
  border-radius: 4px;
}
.pk-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.pk-row {
  font-size: 13px;
  line-height: 1.6;
}
</style>
