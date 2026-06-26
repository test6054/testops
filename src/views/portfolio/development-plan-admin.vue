<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDevelopmentPlanCompletionVO,
  PortfolioDevelopmentPlanOrgStatVO,
  PortfolioDevelopmentPlanAchievementAttainmentItemVO,
  PortfolioDevelopmentPlanVO,
  PortfolioDevelopmentPlanYearStatVO,
} from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const loading = ref(false)
const activeTab = ref('plans')
const rows = ref<PortfolioDevelopmentPlanVO[]>([])
const yearStats = ref<PortfolioDevelopmentPlanYearStatVO[]>([])
const orgStats = ref<PortfolioDevelopmentPlanOrgStatVO[]>([])
const completion = ref<PortfolioDevelopmentPlanCompletionVO | null>(null)
const attainment = ref<PortfolioDevelopmentPlanAchievementAttainmentItemVO[]>([])
const form = reactive({ planYear: String(new Date().getFullYear()), planTitle: '', planSummary: '' })

const approvedCount = computed(() =>
  yearStats.value.find(item => item.planStatus === 'APPROVED')?.planCount ?? 0)

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'planTitle', key: 'planTitle' },
  { title: '年度', dataIndex: 'planYear', key: 'planYear', width: 88 },
  { title: '类型', dataIndex: 'planType', key: 'planType', width: 100 },
  { title: '状态', dataIndex: 'planStatus', key: 'planStatus', width: 100 },
  { title: '操作', key: 'actions', width: 88 },
]

const orgColumns: ColumnsType = [
  { title: '科室', dataIndex: 'orgName', key: 'orgName' },
  { title: '科室 ID', dataIndex: 'portfolioOrgId', key: 'portfolioOrgId', width: 120 },
  { title: '状态', dataIndex: 'planStatus', key: 'planStatus', width: 120 },
  { title: '数量', dataIndex: 'planCount', key: 'planCount', width: 80 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioDevelopmentPlanApi.page({ pageNum: 1, pageSize: 50, planYear: form.planYear })
    rows.value = readPageList(page)
    yearStats.value = await portfolioDevelopmentPlanApi.statsByYear({ planYear: form.planYear })
    orgStats.value = await portfolioDevelopmentPlanApi.statsByOrg({ planYear: form.planYear })
    completion.value = await portfolioDevelopmentPlanApi.completionAnalysis({ planYear: form.planYear })
    attainment.value = await portfolioDevelopmentPlanApi.achievementAttainment({ planYear: form.planYear })
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function createPlan() {
  if (!form.planTitle.trim()) {
    message.warning('请填写规划标题')
    return
  }
  try {
    await portfolioDevelopmentPlanApi.createTeacherPlan({
      planYear: form.planYear,
      planTitle: form.planTitle.trim(),
      planSummary: form.planSummary.trim() || undefined,
    })
    message.success('已创建教师年度规划')
    form.planTitle = ''
    form.planSummary = ''
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function submitPlan(id: string) {
  try {
    await portfolioDevelopmentPlanApi.submit({ id })
    message.success('已提交')
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="教师年度规划" subtitle="与工程认证 AnnualPlan 分域" />
    <UiCard>
      <div class="toolbar">
        <input v-model="form.planYear" class="input" placeholder="年度">
        <UiButton @click="loadPage">
          刷新
        </UiButton>
        <span class="stats">{{ form.planYear }} 年已通过 {{ approvedCount }} 项</span>
      </div>
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="plans" tab="规划管理">
          <UiCard title="新建规划">
            <div class="form-row">
              <input v-model="form.planTitle" class="input input--wide" placeholder="规划标题">
              <UiButton variant="primary" @click="createPlan">
                创建
              </UiButton>
            </div>
          </UiCard>
          <UiDataTable
            :columns="columns"
            :data-source="rows"
            :loading="loading"
            row-key="id"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <UiButton size="small" @click="submitPlan(record.id)">
                  提交
                </UiButton>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="completion" tab="完成度分析">
          <div v-if="completion" class="completion-grid">
            <span>总数 {{ completion.totalPlanCount }}</span>
            <span>已通过 {{ completion.approvedPlanCount }}</span>
            <span>待审 {{ completion.pendingPlanCount }}</span>
            <span>退回 {{ completion.returnedPlanCount }}</span>
            <span>完成率 {{ completion.completionRatePercent }}%</span>
          </div>
          <UiDataTable
            :columns="[{ title: '成果分类', dataIndex: 'categoryCode', key: 'categoryCode' }, { title: '条目数', dataIndex: 'recordCount', key: 'recordCount', width: 88 }]"
            :data-source="attainment"
            :loading="loading"
            row-key="categoryCode"
            :pagination="false"
            style="margin-top: 16px"
          />
        </a-tab-pane>
        <a-tab-pane key="org-stats" tab="科室统计">
          <UiDataTable
            :columns="orgColumns"
            :data-source="orgStats"
            :loading="loading"
            :row-key="(record, index) => `${record.portfolioOrgId ?? 'none'}-${record.planStatus}-${index}`"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'orgName'">
                {{ record.orgName || '未挂接科室' }}
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar, .form-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.input {
  width: 96px;
  padding: 6px 8px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 4px;
}
.input--wide {
  flex: 1;
  min-width: 200px;
}
.stats {
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}
.completion-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
}
</style>
