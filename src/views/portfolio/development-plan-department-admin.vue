<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTenantIndicatorConfigVO } from '@/apis/portfolio/indicator-types'
import type {
  PortfolioDevelopmentPlanItemSaveRequest,
  PortfolioDevelopmentPlanItemVO,
} from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_OPTIONS,
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
  PortfolioDevelopmentPlanItemStatusCode,
  PortfolioDevelopmentPlanItemStatusDescription,
  PortfolioDevelopmentPlanStatusCode,
  PortfolioDevelopmentPlanStatusDescription,
  PortfolioDevelopmentPlanTypeCode,
} from '@/apis/portfolio/enums'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { useQueryTable } from '@/composables/useQueryTable'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const { loadTree, portfolioOrgOptions } = usePortfolioOrgTree()
const activeTab = ref('plans')
const exporting = ref(false)
const submitting = ref(false)
const planTabItems = [
  { key: 'plans', label: '规划管理' },
  { key: 'items', label: '规划明细' },
]
const selectedPlanId = ref('')
const itemLoading = ref(false)
const itemSaving = ref(false)
const planItemsRequestToken = ref(0)

interface DevelopmentPlanItemEditorRow extends PortfolioDevelopmentPlanItemSaveRequest {
  rowKey: string
}

const planItems = ref<DevelopmentPlanItemEditorRow[]>([])

interface DevelopmentPlanDepartmentForm {
  planYear: string
  planTitle: string
  planSummary: string
  portfolioOrgId: string
}

const form = reactive<DevelopmentPlanDepartmentForm>({
  planYear: String(new Date().getFullYear()),
  planTitle: '',
  planSummary: '',
  portfolioOrgId: '',
})
const minimumPlanYear = 2000
const maximumPlanYear = new Date().getFullYear() + 2
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  loadPage: loadPlansPage,
  handlePageChange,
} = useQueryTable(
  (params) =>
    portfolioDevelopmentPlanApi.page({
      ...params,
      planYear: form.planYear,
      planType: PortfolioDevelopmentPlanTypeCode.DEPARTMENT,
    }),
  { immediate: false },
)

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'planTitle', key: 'planTitle' },
  { title: '年度', dataIndex: 'planYear', key: 'planYear', width: 88 },
  { title: '科室', dataIndex: 'portfolioOrgId', key: 'portfolioOrgId', width: 120 },
  { title: '状态', dataIndex: 'planStatus', key: 'planStatus', width: 100 },
  { title: '操作', key: 'actions', width: 140 },
]

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
    showUserError(error, '加载指标配置失败')
  }
}

const selectedPlan = computed(
  () => rows.value.find((item) => item.id === selectedPlanId.value) ?? null,
)

const planItemEditable = computed(() => {
  const status = selectedPlan.value?.planStatus
  return (
    status === PortfolioDevelopmentPlanStatusCode.DRAFT
    || status === PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED
  )
})

const planOptions = computed(() =>
  rows.value.map((item) => ({
    value: item.id,
    label: `${item.planTitle} (${item.planYear})`,
  })),
)

function planStatusLabel(status: PortfolioDevelopmentPlanStatusCode): string {
  return strictEnumLabel(PortfolioDevelopmentPlanStatusDescription, status, '发展规划状态')
}

function planStatusTone(status: PortfolioDevelopmentPlanStatusCode) {
  return strictEnumTone(PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE, status, '发展规划状态')
}

async function loadPage() {
  await loadPlansPage()
  if (!rows.value.some((item) => item.id === selectedPlanId.value)) {
    selectedPlanId.value = ''
    planItems.value = []
  }
  if (selectedPlanId.value && activeTab.value === 'items') {
    await loadPlanItems()
  }
}

async function createPlan() {
  const planYear = Number(form.planYear)
  if (!/^\d{4}$/.test(form.planYear) || planYear < minimumPlanYear || planYear > maximumPlanYear) {
    showFormValidationMessage(`规划年度须在 ${minimumPlanYear} 年至 ${maximumPlanYear} 年之间`)
    return
  }
  if (!form.planTitle.trim()) {
    showFormValidationMessage('请填写规划标题')
    return
  }
  if (!form.portfolioOrgId) {
    showFormValidationMessage('请选择归属科室')
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
    showUserError(error, '创建部门规划失败')
  }
}

async function submitPlan(id: string) {
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    await portfolioDevelopmentPlanApi.submit({ id })
    message.success('已提交')
    await loadPage()
  } catch (error) {
    showUserError(error, '提交规划失败')
  } finally {
    submitting.value = false
  }
}

async function exportPlans() {
  if (exporting.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioDevelopmentPlanApi.exportExcel({
      planYear: form.planYear,
      planType: PortfolioDevelopmentPlanTypeCode.DEPARTMENT,
    })
    await downloadPortfolioExcelExport(result)
    message.success('规划已导出')
  } catch (error) {
    showUserError(error, '导出规划失败')
  } finally {
    exporting.value = false
  }
}

function openPlanItems(planId: string) {
  selectedPlanId.value = planId
  activeTab.value = 'items'
  void loadPlanItems()
}

function handleDepartmentPlanRowAction(key: string, planId: string) {
  if (key === 'submit') void submitPlan(planId)
  else if (key === 'items') openPlanItems(planId)
}

function createEmptyPlanItem(): DevelopmentPlanItemEditorRow {
  return {
    rowKey: `new-${Date.now()}-${planItems.value.length}`,
    itemTitle: '',
    itemGoal: '',
    indicatorCode: '',
    milestoneText: '',
    completionPercent: 0,
    itemStatus: PortfolioDevelopmentPlanItemStatusCode.NOT_STARTED,
  }
}

function toEditableItem(item: PortfolioDevelopmentPlanItemVO): DevelopmentPlanItemEditorRow {
  return {
    rowKey: item.id ?? `item-${item.sortOrder ?? 0}-${item.itemTitle}`,
    itemTitle: item.itemTitle,
    itemGoal: item.itemGoal,
    indicatorCode: item.indicatorCode,
    milestoneText: item.milestoneText,
    completionPercent: item.completionPercent ?? 0,
    itemStatus: item.itemStatus,
    sortOrder: item.sortOrder,
  }
}

async function loadPlanItems() {
  if (!selectedPlanId.value) {
    planItems.value = []
    return
  }
  const planId = selectedPlanId.value
  const currentToken = ++planItemsRequestToken.value
  itemLoading.value = true
  try {
    const items = await portfolioDevelopmentPlanApi.listItems({ planId })
    if (currentToken !== planItemsRequestToken.value || selectedPlanId.value !== planId) {
      return
    }
    planItems.value = items.length ? items.map(toEditableItem) : [createEmptyPlanItem()]
  } catch (error) {
    if (currentToken !== planItemsRequestToken.value || selectedPlanId.value !== planId) {
      return
    }
    showUserError(error, '加载规划明细失败')
  } finally {
    if (currentToken === planItemsRequestToken.value && selectedPlanId.value === planId) {
      itemLoading.value = false
    }
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
  if (itemSaving.value) {
    return
  }
  if (!selectedPlanId.value) {
    showFormValidationMessage('请选择规划')
    return
  }
  const items: PortfolioDevelopmentPlanItemSaveRequest[] = []
  planItems.value.forEach((item, index) => {
    const itemTitle = item.itemTitle.trim()
    if (!itemTitle) {
      return
    }
    items.push({
      itemTitle,
      itemGoal: item.itemGoal?.trim() || undefined,
      indicatorCode: item.indicatorCode?.trim() || undefined,
      milestoneText: item.milestoneText?.trim() || undefined,
      completionPercent: item.completionPercent,
      itemStatus: item.itemStatus,
      sortOrder: index,
    })
  })
  if (items.length === 0) {
    showFormValidationMessage('请至少填写一条明细标题')
    return
  }
  itemSaving.value = true
  try {
    await portfolioDevelopmentPlanApi.batchSaveItems({ planId: selectedPlanId.value, items })
    message.success('规划明细已保存')
    await loadPlanItems()
  } catch (error) {
    showUserError(error, '保存规划明细失败')
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
        <UiButton size="sm" :loading="exporting" :disabled="exporting" @click="exportPlans"> 导出表格文件 </UiButton>
      </template>
    </ContextBar>
    <UiCard>
      <div class="toolbar">
        <input
          v-model="form.planYear"
          class="input"
          type="number"
          :min="minimumPlanYear"
          :max="maximumPlanYear"
          step="1"
          placeholder="年度"
        />
        <UiButton size="sm" @click="loadPage"> 刷新 </UiButton>
      </div>
      <UiSectionTabs
        v-model="activeTab"
        :items="planTabItems"
        compact
        divided
      />
      <template v-if="activeTab === 'plans'">
        <UiCard title="新建部门规划">
          <div class="form-row">
            <input v-model="form.planTitle" class="input input--wide" placeholder="规划标题" />
            <UiSelect
              size="sm"
              v-model="form.portfolioOrgId"
              placeholder="归属科室"
              style="width: 220px"
              :options="portfolioOrgOptions()"
            />
            <UiButton size="sm" variant="primary" @click="createPlan"> 创建 </UiButton>
          </div>
        </UiCard>
        <UiEmpty size="sm" v-if="!loading && rows.length === 0" description="当前年度暂无部门规划" />
        <UiDataTable
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          :total="pageTotal"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          row-key="id"
          style="margin-top: 16px"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'planStatus'">
              <UiTag :tone="planStatusTone(record.planStatus)">
                {{ planStatusLabel(record.planStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[
                  {
                    key: 'submit',
                    label: '提交',
                    hidden:
                      record.planStatus !== PortfolioDevelopmentPlanStatusCode.DRAFT
                      && record.planStatus
                        !== PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED,
                  },
                  { key: 'items', label: '明细' },
                ]"
                split
                @action="(key) => handleDepartmentPlanRowAction(key, record.id)"
              />
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else-if="activeTab === 'items'">
        <div class="toolbar">
          <UiSelect
            size="sm"
            v-model="selectedPlanId"
            placeholder="选择规划"
            style="width: 320px"
            :options="planOptions"
            @change="loadPlanItems"
          />
          <UiButton size="sm" :disabled="!selectedPlanId" @click="loadPlanItems"> 刷新明细 </UiButton>
          <UiButton size="sm" v-if="planItemEditable" @click="addPlanItemRow"> 新增行 </UiButton>
          <UiButton
            size="sm"
            v-if="planItemEditable"
            variant="primary"
            :disabled="!selectedPlanId || itemSaving"
            @click="savePlanItems"
          >
            保存明细
          </UiButton>
        </div>
        <UiAlertStrip
          v-if="!selectedPlanId"
          tone="info"
          size="sm"
          dense
          inline
          :show-icon="false"
        >
          <template #default>
            <span style="display:inline-flex;align-items:center;gap:8px">
              <UiTag tone="blue" size="sm">未选择规划</UiTag>
              <span>请选择发展规划后再编辑明细项</span>
            </span>
          </template>
        </UiAlertStrip>
        <UiDataTable
          v-else
          pagination-mode="none"
          :columns="itemColumns"
          :data-source="planItems"
          :loading="itemLoading"
          row-key="rowKey"
          :show-pagination="false"
          :sticky-header="false"
          flat
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
              <UiSelect
                size="sm"
                v-if="planItemEditable"
                v-model="record.indicatorCode"
                style="width: 100%"
                allow-clear
                allow-search
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
                v-model.number="record.completionPercent"
                type="number"
                class="input input--cell input--short"
              />
              <span v-else>{{ record.completionPercent ?? '0' }}%</span>
            </template>
            <template v-else-if="column.key === 'itemStatus'">
              <UiSelect
                size="sm"
                v-if="planItemEditable"
                v-model="record.itemStatus"
                style="width: 100%"
                :options="PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_OPTIONS"
              />
              <UiTag v-else tone="blue">
                {{
                  strictEnumLabel(
                    PortfolioDevelopmentPlanItemStatusDescription,
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
      </template>
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
