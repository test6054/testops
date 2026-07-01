<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDevelopmentPlanItemStatus,
  PortfolioDevelopmentPlanStatus,
  PortfolioDevelopmentPlanType,
} from '@/apis/portfolio/enums'
import type { PortfolioTenantIndicatorConfigVO } from '@/apis/portfolio/indicator-types'
import type {
  PortfolioDevelopmentPlanItemSaveRequest,
  PortfolioDevelopmentPlanItemVO,
  PortfolioDevelopmentPlanVO,
} from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_LABEL,
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_LABEL,
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
} from '@/apis/portfolio/enums'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const { loadTree, portfolioOrgOptions } = usePortfolioOrgTree()
const loading = ref(false)
const activeTab = ref('plans')
const rows = ref<PortfolioDevelopmentPlanVO[]>([])
const selectedPlanId = ref('')
const itemLoading = ref(false)
const itemSaving = ref(false)
const planItems = ref<PortfolioDevelopmentPlanItemSaveRequest[]>([])

function planItemRowKey(record: unknown): string {
  const idx = planItems.value.indexOf(record as PortfolioDevelopmentPlanItemSaveRequest)
  return idx >= 0 ? String(idx) : '0'
}

const form = reactive({
  planYear: String(new Date().getFullYear()),
  planTitle: '',
  planSummary: '',
  portfolioOrgId: '' as string,
})

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'planTitle', key: 'planTitle' },
  { title: '年度', dataIndex: 'planYear', key: 'planYear', width: 88 },
  { title: '科室', dataIndex: 'portfolioOrgId', key: 'portfolioOrgId', width: 120 },
  { title: '状态', dataIndex: 'planStatus', key: 'planStatus', width: 100 },
  { title: '操作', key: 'actions', width: 140 },
]

const itemStatusOptions = (
  Object.keys(PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_LABEL) as PortfolioDevelopmentPlanItemStatus[]
).map((value) => ({ value, label: PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_LABEL[value] }))

const itemColumns: ColumnsType = [
  { title: '标题', dataIndex: 'itemTitle', key: 'itemTitle', width: 160 },
  { title: '目标', dataIndex: 'itemGoal', key: 'itemGoal', width: 160 },
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 100 },
  { title: '里程碑', dataIndex: 'milestoneText', key: 'milestoneText', width: 160 },
  { title: '完成率', dataIndex: 'completionPercent', key: 'completionPercent', width: 88 },
  { title: '状态', dataIndex: 'itemStatus', key: 'itemStatus', width: 100 },
  { title: '操作', key: 'itemActions', width: 72 },
]

const indicatorConfigs = ref<PortfolioTenantIndicatorConfigVO[]>([])
const indicatorOptions = computed(() =>
  indicatorConfigs.value
    .filter((item) => item.enabled)
    .map((item) => ({
      value: item.indicatorCode,
      label: `${item.indicatorName} (${item.indicatorCode})`,
    })),
)

async function loadIndicatorConfigs() {
  try {
    indicatorConfigs.value = await portfolioIndicatorTenantApi.listConfig()
  } catch (error) {
    showUserError(error)
  }
}

const selectedPlan = computed(
  () => rows.value.find((item) => item.id === selectedPlanId.value) ?? null,
)

const planItemEditable = computed(() => {
  const status = selectedPlan.value?.planStatus
  return status === 'DRAFT' || status === 'DEPARTMENT_RETURNED'
})

const planOptions = computed(() =>
  rows.value.map((item) => ({
    value: item.id,
    label: `${item.planTitle} (${item.planYear})`,
  })),
)

function planStatusLabel(status: PortfolioDevelopmentPlanStatus): string {
  return strictEnumLabel(PORTFOLIO_DEVELOPMENT_PLAN_STATUS_LABEL, status, '发展规划状态')
}

function planStatusTone(status: PortfolioDevelopmentPlanStatus) {
  return strictEnumTone(PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE, status, '发展规划状态')
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioDevelopmentPlanApi.page({
      pageNum: 1,
      pageSize: 50,
      planYear: form.planYear,
      planType: 'DEPARTMENT' as PortfolioDevelopmentPlanType,
    })
    rows.value = readPageList(page, '加载部门年度规划失败')
    if (!rows.value.some((item) => item.id === selectedPlanId.value)) {
      selectedPlanId.value = rows.value[0]?.id ?? ''
      planItems.value = []
    }
    if (selectedPlanId.value && activeTab.value === 'items') {
      await loadPlanItems()
    }
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function createPlan() {
  if (!form.planTitle.trim()) {
    message.warning('请填写规划标题')
    return
  }
  if (!form.portfolioOrgId) {
    message.warning('请选择归属科室')
    return
  }
  try {
    await portfolioDevelopmentPlanApi.createDepartmentPlan({
      planYear: form.planYear,
      planTitle: form.planTitle.trim(),
      planSummary: form.planSummary.trim() || undefined,
      portfolioOrgId: form.portfolioOrgId,
    })
    message.success('已创建部门年度规划')
    form.planTitle = ''
    form.planSummary = ''
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function submitPlan(id: string) {
  try {
    await portfolioDevelopmentPlanApi.submit({ id })
    message.success('已提交')
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function exportPlans() {
  try {
    const result = await portfolioDevelopmentPlanApi.exportExcel({
      planYear: form.planYear,
      planType: 'DEPARTMENT',
    })
    await downloadPortfolioExcelExport(result)
    message.success('规划已导出')
  } catch (error) {
    showUserError(error)
  }
}

function openPlanItems(planId: string) {
  selectedPlanId.value = planId
  activeTab.value = 'items'
  void loadPlanItems()
}

function createEmptyPlanItem(): PortfolioDevelopmentPlanItemSaveRequest {
  return {
    itemTitle: '',
    itemGoal: '',
    indicatorCode: '',
    milestoneText: '',
    completionPercent: '0',
    itemStatus: 'NOT_STARTED',
  }
}

function toEditableItem(
  item: PortfolioDevelopmentPlanItemVO,
): PortfolioDevelopmentPlanItemSaveRequest {
  return {
    itemTitle: item.itemTitle,
    itemGoal: item.itemGoal,
    indicatorCode: item.indicatorCode,
    milestoneText: item.milestoneText,
    completionPercent: item.completionPercent ?? '0',
    itemStatus: item.itemStatus,
    sortOrder: item.sortOrder,
  }
}

async function loadPlanItems() {
  if (!selectedPlanId.value) {
    planItems.value = []
    return
  }
  itemLoading.value = true
  try {
    const items = await portfolioDevelopmentPlanApi.listItems({ planId: selectedPlanId.value })
    planItems.value = items.length ? items.map(toEditableItem) : [createEmptyPlanItem()]
  } catch (error) {
    showUserError(error)
  } finally {
    itemLoading.value = false
  }
}

function addPlanItemRow() {
  planItems.value.push(createEmptyPlanItem())
}

function removePlanItemRow(index: number) {
  planItems.value.splice(index, 1)
  if (planItems.value.length === 0) {
    planItems.value.push(createEmptyPlanItem())
  }
}

async function savePlanItems() {
  if (!selectedPlanId.value) {
    message.warning('请选择规划')
    return
  }
  const items = planItems.value
    .map((item, index) => ({
      ...item,
      itemTitle: item.itemTitle.trim(),
      itemGoal: item.itemGoal?.trim() || undefined,
      indicatorCode: item.indicatorCode?.trim() || undefined,
      milestoneText: item.milestoneText?.trim() || undefined,
      sortOrder: index,
    }))
    .filter((item) => item.itemTitle)
  if (items.length === 0) {
    message.warning('请至少填写一条明细标题')
    return
  }
  itemSaving.value = true
  try {
    await portfolioDevelopmentPlanApi.batchSaveItems({ planId: selectedPlanId.value, items })
    message.success('规划明细已保存')
    await loadPlanItems()
  } catch (error) {
    showUserError(error)
  } finally {
    itemSaving.value = false
  }
}

onMounted(async () => {
  await loadTree()
  await loadIndicatorConfigs()
  await loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="部门年度规划" subtitle="科室编制 · 提交审核 · 年度唯一">
      <template #actions>
        <UiButton @click="exportPlans"> 导出 Excel </UiButton>
      </template>
    </ContextBar>
    <UiCard>
      <div class="toolbar">
        <input v-model="form.planYear" class="input" placeholder="年度" />
        <UiButton @click="loadPage"> 刷新 </UiButton>
      </div>
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="plans" tab="规划管理">
          <UiCard title="新建部门规划">
            <div class="form-row">
              <input v-model="form.planTitle" class="input input--wide" placeholder="规划标题" />
              <a-select
                v-model:value="form.portfolioOrgId"
                placeholder="归属科室"
                style="width: 220px"
                :options="portfolioOrgOptions()"
              />
              <UiButton variant="primary" @click="createPlan"> 创建 </UiButton>
            </div>
          </UiCard>
          <UiEmpty v-if="!loading && rows.length === 0" description="当前年度暂无部门规划" />
          <UiDataTable
            :columns="columns"
            :data-source="rows"
            :loading="loading"
            row-key="id"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'planStatus'">
                <UiTag :tone="planStatusTone(record.planStatus)">
                  {{ planStatusLabel(record.planStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiButton
                  v-if="
                    record.planStatus === 'DRAFT' || record.planStatus === 'DEPARTMENT_RETURNED'
                  "
                  size="sm"
                  @click="submitPlan(record.id)"
                >
                  提交
                </UiButton>
                <UiButton size="sm" @click="openPlanItems(record.id)"> 明细 </UiButton>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="items" tab="规划明细">
          <div class="toolbar">
            <a-select
              v-model:value="selectedPlanId"
              placeholder="选择规划"
              style="width: 320px"
              :options="planOptions"
              @change="loadPlanItems"
            />
            <UiButton :disabled="!selectedPlanId" @click="loadPlanItems"> 刷新明细 </UiButton>
            <UiButton v-if="planItemEditable" @click="addPlanItemRow"> 新增行 </UiButton>
            <UiButton
              v-if="planItemEditable"
              variant="primary"
              :disabled="!selectedPlanId || itemSaving"
              @click="savePlanItems"
            >
              保存明细
            </UiButton>
          </div>
          <UiEmpty v-if="!selectedPlanId" description="请选择规划后编辑明细项" />
          <UiDataTable
            v-else
            :columns="itemColumns"
            :data-source="planItems"
            :loading="itemLoading"
            :row-key="planItemRowKey"
            :pagination="false"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'itemTitle'">
                <input
                  v-if="planItemEditable"
                  v-model="record.itemTitle"
                  class="input input--cell"
                />
                <span v-else>{{ record.itemTitle }}</span>
              </template>
              <template v-else-if="column.key === 'itemGoal'">
                <input
                  v-if="planItemEditable"
                  v-model="record.itemGoal"
                  class="input input--cell"
                />
                <span v-else>{{ record.itemGoal || '—' }}</span>
              </template>
              <template v-else-if="column.key === 'indicatorCode'">
                <a-select
                  v-if="planItemEditable"
                  v-model:value="record.indicatorCode"
                  style="width: 100%"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  :options="indicatorOptions"
                  placeholder="选择指标"
                />
                <span v-else>{{ record.indicatorCode || '—' }}</span>
              </template>
              <template v-else-if="column.key === 'milestoneText'">
                <input
                  v-if="planItemEditable"
                  v-model="record.milestoneText"
                  class="input input--cell"
                />
                <span v-else>{{ record.milestoneText || '—' }}</span>
              </template>
              <template v-else-if="column.key === 'completionPercent'">
                <input
                  v-if="planItemEditable"
                  v-model="record.completionPercent"
                  class="input input--cell input--short"
                />
                <span v-else>{{ record.completionPercent ?? '0' }}%</span>
              </template>
              <template v-else-if="column.key === 'itemStatus'">
                <a-select
                  v-if="planItemEditable"
                  v-model:value="record.itemStatus"
                  style="width: 100%"
                  :options="itemStatusOptions"
                />
                <UiTag v-else tone="blue">
                  {{
                    strictEnumLabel(
                      PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_LABEL,
                      record.itemStatus,
                      '规划明细状态',
                    )
                  }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'itemActions'">
                <UiButton v-if="planItemEditable" size="sm" @click="removePlanItemRow(index)">
                  删除
                </UiButton>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.input {
  width: 100px;
  padding: 4px 8px;
  border: 1px solid var(--dp-border-default);
  border-radius: var(--dp-radius-control);
}
.input--wide {
  width: 240px;
}
.input--cell {
  width: 100%;
  min-width: 80px;
}
.input--short {
  width: 72px;
}
</style>
