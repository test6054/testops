<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherPkCompareVO,
  PortfolioTeacherRecommendExplainStatusVO,
  PortfolioTeacherRecommendRuleVO,
  PortfolioTeacherRecommendRunVO,
} from '@/apis/portfolio/teacher-platform'
import type { AiTaskStatusCode } from '@/apis/quality/types'
import message from 'ant-design-vue/es/message'
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
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const activeTab = ref('execute')
const recTabItems = [
  { key: 'execute', label: '执行推荐' },
  { key: 'runs', label: '执行历史' },
]
const rules = ref<PortfolioTeacherRecommendRuleVO[]>([])
const pkResult = ref<PortfolioTeacherPkCompareVO | null>(null)
const selectedRuleId = ref('')
const lastRunId = ref('')
const loading = ref(false)
const saving = ref(false)
const routeRequestToken = ref(0)

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
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '评分', dataIndex: 'ruleScore', key: 'ruleScore', width: 80 },
  { title: '推荐理由', dataIndex: 'reasonText', key: 'reasonText' },
]

function lifecycleTagTone(record: { lifecycleStatus?: string }): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

const runColumns: ColumnsType = [
  { title: '运行编号', dataIndex: 'id', key: 'id', width: 100 },
  { title: '规则编号', dataIndex: 'ruleId', key: 'ruleId', width: 100 },
  { title: '模式', key: 'runMode', width: 80 },
  { title: '状态', key: 'runStatus', width: 88 },
  { title: '运行时间', dataIndex: 'runTime', key: 'runTime', width: 160 },
  { title: '操作人', dataIndex: 'operatorUserId', key: 'operatorUserId', width: 100 },
  { title: '候选数', dataIndex: 'candidateCount', key: 'candidateCount', width: 72 },
  { title: '智能解释', key: 'explainStatus', width: 100 },
  { title: '操作', key: 'actions', width: 120 },
]

const explainDrawerOpen = ref(false)
const explainLoading = ref(false)
const explainStatus = ref<PortfolioTeacherRecommendExplainStatusVO | null>(null)
const explainRunId = ref('')
const route = useRoute()
const router = useRouter()
const {
  loading: runsLoading,
  rows: runs,
  pageNum: runsPageNum,
  pageSize: runsPageSize,
  pageTotal: runsPageTotal,
  loadError: runsLoadError,
  loadPage: loadRuns,
  search: searchRuns,
  handlePageChange: handleRunsPageChange,
} = useQueryTable(
  (params) =>
    portfolioTeacherRecommendationApi.pageRuns({
      ...params,
      ruleId: selectedRuleId.value || undefined,
    }),
  { immediate: false },
)
const {
  loading: candidatesLoading,
  rows: candidates,
  pageNum,
  pageSize,
  pageTotal,
  loadError: candidatesLoadError,
  loadPage: loadCandidatesPage,
  handlePageChange,
} = useQueryTable(
  (params) =>
    portfolioTeacherRecommendationApi.pageCandidates({
      ...params,
      runId: lastRunId.value,
    }),
  { immediate: false },
)

async function loadCandidates() {
  if (!lastRunId.value) {
    return
  }
  await loadCandidatesPage()
}

function resetRouteDrivenContext() {
  explainDrawerOpen.value = false
  explainLoading.value = false
  explainStatus.value = null
  explainRunId.value = ''
  lastRunId.value = ''
  candidates.value = []
  pageTotal.value = 0
  pageNum.value = 1
}

function aiTaskStatusLabel(status?: AiTaskStatusCode): string {
  if (!status) {
    return '未提交'
  }
  return strictEnumLabel(AiTaskStatusDescription, status, '智能任务状态')
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
  const currentToken = ++routeRequestToken.value
  const runId = readRouteStringParam(route.query.runId)
  if (runId) {
    viewRunCandidates(runId)
    await loadExplainStatus(runId, currentToken)
    return
  }
  const taskId = readRouteStringParam(route.query.taskId)
  if (!taskId) {
    resetRouteDrivenContext()
    return
  }
  try {
    const task = await aiTaskApi.detail(taskId)
    if (currentToken !== routeRequestToken.value) {
      return
    }
    if (!task.businessId) {
      resetRouteDrivenContext()
      showUserError(null, '推荐解释任务缺少运行编号')
      return
    }
    viewRunCandidates(task.businessId)
    await loadExplainStatus(task.businessId, currentToken)
  } catch (error) {
    if (currentToken !== routeRequestToken.value) {
      return
    }
    resetRouteDrivenContext()
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
    if (selectedRuleId.value && !rules.value.some((item) => item.id === selectedRuleId.value)) {
      selectedRuleId.value = ''
    }
  } catch (error) {
    showUserError(error, '加载推荐规则失败')
  }
}

async function saveRule() {
  if (saving.value) {
    return
  }
  if (!ruleForm.ruleName.trim()) {
    showFormValidationMessage('请填写规则名称')
    return
  }
  saving.value = true
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
    showUserError(error, '保存推荐规则失败')
  } finally {
    saving.value = false
  }
}

async function executeRuleRun() {
  if (!selectedRuleId.value) {
    showFormValidationMessage('请先选择规则')
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
    showUserError(error, '执行规则推荐失败')
  } finally {
    loading.value = false
  }
}

async function executeAiExplain() {
  if (!selectedRuleId.value) {
    showFormValidationMessage('请先选择规则')
    return
  }
  loading.value = true
  try {
    lastRunId.value = await portfolioTeacherRecommendationApi.executeRun({
      ruleId: selectedRuleId.value,
    })
    await portfolioTeacherRecommendationApi.explainSubmit({ runId: lastRunId.value })
    message.success('规则执行完成，智能解释任务已提交')
    await loadCandidates()
  } catch (error) {
    showUserError(error, '提交智能解释任务失败')
  } finally {
    loading.value = false
  }
}

function viewRunCandidates(runId: string) {
  lastRunId.value = runId
  activeTab.value = 'execute'
  void loadCandidates()
}

async function loadExplainStatus(runId: string, requestToken = routeRequestToken.value) {
  explainRunId.value = runId
  explainDrawerOpen.value = true
  explainLoading.value = true
  explainStatus.value = null
  try {
    const nextStatus = await portfolioTeacherRecommendationApi.explainStatus({ runId })
    if (requestToken !== routeRequestToken.value || explainRunId.value !== runId) {
      return
    }
    explainStatus.value = nextStatus
  } catch (error) {
    if (requestToken !== routeRequestToken.value || explainRunId.value !== runId) {
      return
    }
    showUserError(error, '加载智能解释状态失败')
  } finally {
    if (requestToken === routeRequestToken.value && explainRunId.value === runId) {
      explainLoading.value = false
    }
  }
}

async function runPkCompare() {
  const ids = pkForm.teacherUserIds
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (ids.length < 2 || ids.length > 5) {
    showFormValidationMessage('请选择二至五名教师用户编号')
    return
  }
  try {
    pkResult.value = await portfolioTeacherRecommendationApi.pkCompare({
      teacherUserIds: ids,
      dimensionCodes: PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS,
    })
  } catch (error) {
    showUserError(error, '教师对比分析失败')
  }
}

watch(selectedRuleId, () => {
  if (activeTab.value === 'runs') {
    void searchRuns()
  }
})

onMounted(async () => {
  await loadRules()
  await loadRuns()
  await applyRouteDeepLink()
})

watch(
  () => [route.query.runId, route.query.taskId],
  ([runId, taskId], [previousRunId, previousTaskId]) => {
    if (runId === previousRunId && taskId === previousTaskId) {
      return
    }
    void applyRouteDeepLink()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="优秀教师推荐" />
    </template>
    <UiCard title="规则配置">
      <div class="form-row">
        <UiInput
          size="sm" v-model="ruleForm.ruleName" placeholder="规则名称" style="width: 160px"
        />
        <UiInputNumber
          size="sm" v-model="ruleForm.minHonorCount" :min="0" placeholder="最低荣誉数"
        />
        <UiCheckbox v-model="ruleForm.requireDualTeacher"> 要求双师 </UiCheckbox>
        <UiInputNumber
          size="sm"
          v-model="ruleForm.topLimit"
          :min="1"
          :max="50"
          placeholder="候选上限"
        />
        <UiButton size="sm" variant="primary" :loading="saving" :disabled="saving" @click="saveRule">
          保存规则
        </UiButton>
      </div>
      <UiSelect
        v-model="selectedRuleId"
        placeholder="选择规则"
        style="width: 240px; margin-top: 8px"
        size="sm"
        :options="rules.map((rule) => ({ value: rule.id, label: `${rule.ruleName}（${sceneLabel(rule.recommendScene)}）` }))"
      />
    </UiCard>
    <UiSectionTabs
      v-model="activeTab"
      :items="recTabItems"
      compact
      divided
      style="margin-top: 16px"
    />
    <template v-if="activeTab === 'execute'">
      <UiCard>
        <div class="form-row">
          <UiButton size="sm" :loading="loading" @click="executeRuleRun"> 规则推荐 </UiButton>
          <UiButton size="sm" variant="primary" :loading="loading" @click="executeAiExplain">
            规则执行 → 智能解释
          </UiButton>
          <UiButton size="sm" @click="loadCandidates"> 刷新候选 </UiButton>
        </div>
        <UiEmpty
          size="sm"
          v-if="!candidatesLoadError && !candidatesLoading && candidates.length === 0"
          description="当前筛选无推荐记录"
        />
        <UiDataTable
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          :total="pageTotal"
          :columns="candidateColumns"
          :data-source="candidates"
          :loading="candidatesLoading"
          :load-error="candidatesLoadError"
          row-key="id"
          style="margin-top: 16px"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'identityLayers'">
              <div v-if="record.ownerIdentityLayers?.length" class="flex flex-wrap gap-1">
                <UiTag
                  v-for="(layer, i) in record.ownerIdentityLayers"
                  :key="`${record.teacherUserId}-${layer.identityType}-${i}`"
                  size="sm"
                  :tone="layer.externalIdentity ? 'orange' : 'blue'"
                >
                  {{ layer.identityTypeLabel || layer.displayName || layer.identityType }}
                </UiTag>
              </div>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
                {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
              </UiTag>
              <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!record.lifecycleStatus">—</span>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
    <template v-else-if="activeTab === 'runs'">
      <UiCard>
        <UiButton size="sm" :loading="runsLoading" @click="loadRuns"> 刷新历史 </UiButton>
        <UiEmpty
          size="sm"
          v-if="!runsLoadError && !runsLoading && runs.length === 0"
          description="当前筛选无推荐记录"
        />
        <UiDataTable
          v-model:current="runsPageNum"
          v-model:page-size="runsPageSize"
          pagination-mode="server"
          :total="runsPageTotal"
          :columns="runColumns"
          :data-source="runs"
          :loading="runsLoading"
          :load-error="runsLoadError"
          row-key="id"
          style="margin-top: 16px"
          @page-change="handleRunsPageChange"
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
              <UiTableActions
                :items="[{ key: 'candidates', label: '查看候选' }]"
                split
                @action="() => viewRunCandidates(record.id)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
    <UiCard title="教师多维对比" style="margin-top: 16px">
      <div class="form-row">
        <UiInput
          size="sm"
          v-model="pkForm.teacherUserIds"
          placeholder="教师编号，逗号分隔（2至5人）"
          style="width: 360px"
        />
        <UiButton size="sm" @click="runPkCompare"> 对比 </UiButton>
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
    <UiDrawer v-model:open="explainDrawerOpen" title="智能解释状态" width="560">
      <UiSpin :spinning="explainLoading">
        <template v-if="explainStatus">
          <p>运行编号 {{ explainStatus.runId }}</p>
          <p v-if="explainStatus.explainTaskId">
            任务编号 {{ explainStatus.explainTaskId }}
            <UiButton size="sm" style="margin-left: 8px" @click="openExplainAiTask">
              打开智能任务中心
            </UiButton>
          </p>
          <p v-else>尚未提交智能解释任务</p>
          <p v-if="explainStatus.status">状态 {{ aiTaskStatusLabel(explainStatus.status) }}</p>
          <ul v-if="explainStatus.candidateItems?.length" class="explain-list">
            <li v-for="item in explainStatus.candidateItems" :key="item.teacherUserId">
              <strong>教师 {{ item.teacherUserId }}</strong>
              <pre class="explain-text">{{ item.reasonText }}</pre>
            </li>
          </ul>
        </template>
      </UiSpin>
    </UiDrawer>
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
  background: var(--dp-fill-quaternary);
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
  gap: var(--dp-space-3, 12px);
  margin-top: var(--dp-space-3, 12px);
}
.pk-col {
  min-width: 200px;
  padding: 8px;
  border: 1px solid var(--dp-border);
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
