<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ExcelImportRowDiagnostic } from '@/apis/platform/types'
import type { PortfolioDevelopmentPlanHistoryImportBatchStatusCode } from '@/apis/portfolio/enums'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_OPTIONS,
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
  PortfolioDevelopmentPlanHistoryImportBatchStatusDescription,
  PortfolioDevelopmentPlanItemStatusCode,
  PortfolioDevelopmentPlanItemStatusDescription,
  PortfolioDevelopmentPlanStatusCode,
  PortfolioDevelopmentPlanStatusDescription,
  PortfolioDevelopmentPlanTypeCode,
  PortfolioDevelopmentPlanTypeDescription,
} from '@/apis/portfolio/enums'
import type { PortfolioTenantIndicatorConfigVO } from '@/apis/portfolio/indicator-types'
import type {
  PortfolioDevelopmentPlanAchievementAttainmentItemVO,
  PortfolioDevelopmentPlanCompletionVO,
  PortfolioDevelopmentPlanHistoryImportBatchVO,
  PortfolioDevelopmentPlanItemSaveRequest,
  PortfolioDevelopmentPlanItemVO,
  PortfolioDevelopmentPlanOrgStatVO,
  PortfolioDevelopmentPlanVO,
  PortfolioDevelopmentPlanYearStatVO,
} from '@/apis/portfolio/teacher-platform'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { useQueryTable } from '@/composables/useQueryTable'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const historyImportModalOpen = ref(false)
const historyBatchDetailOpen = ref(false)
const historyBatchDetail = ref<PortfolioDevelopmentPlanHistoryImportBatchVO | null>(null)
const {
  loading: historyBatchLoading,
  rows: historyBatchRows,
  pageNum: historyBatchPageNum,
  pageSize: historyBatchPageSize,
  pageTotal: historyBatchPageTotal,
  loadPage: loadHistoryImportBatches,
  handlePageChange: handleHistoryBatchPageChange,
} = useQueryTable(portfolioDevelopmentPlanApi.historyImportBatchPage, { immediate: false })

const historyBatchColumns: ColumnsType = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140 },
  { title: '文件', dataIndex: 'fileName', key: 'fileName' },
  { title: '成功', dataIndex: 'successRows', key: 'successRows', width: 72 },
  { title: '失败', dataIndex: 'failedRows', key: 'failedRows', width: 72 },
  { title: '状态', dataIndex: 'batchStatus', key: 'batchStatus', width: 96 },
  { title: '操作', key: 'actions', width: 72 },
]

function historyBatchStatusLabel(
  status: PortfolioDevelopmentPlanHistoryImportBatchStatusCode,
): string {
  return strictEnumLabel(
    PortfolioDevelopmentPlanHistoryImportBatchStatusDescription,
    status,
    '历史规划导入批次状态',
  )
}

async function openHistoryBatchDetail(id: string) {
  historyBatchDetailOpen.value = true
  historyBatchDetail.value = null
  try {
    historyBatchDetail.value = await portfolioDevelopmentPlanApi.historyImportBatchGet({ id })
  } catch (error) {
    showUserError(error)
  }
}

async function handleHistoryImportSuccess() {
  historyImportModalOpen.value = false
  await Promise.all([loadHistoryImportBatches(), loadPage()])
}

const historyBatchDiagnosticColumns: ColumnsType<ExcelImportRowDiagnostic> = [
  { title: '行号', dataIndex: 'rowIndex', key: 'rowIndex', width: 72 },
  { title: '处理说明', dataIndex: 'invalidReason', key: 'invalidReason' },
]

const historyBatchDetailDiagnostics = computed<ExcelImportRowDiagnostic[]>(() => {
  const raw = historyBatchDetail.value?.errorReportJson
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [{ rowIndex: 1, valid: false, invalidReason: '导入错误报告格式异常' }]
    }
    return parsed.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        return {
          rowIndex: index + 1,
          valid: false,
          invalidReason: '导入错误报告明细格式异常',
        }
      }
      const rowIndex =
        'rowIndex' in item && typeof item.rowIndex === 'number' ? item.rowIndex : index + 1
      const message =
        'message' in item && typeof item.message === 'string' ? item.message : '导入失败'
      return {
        rowIndex,
        valid: false,
        invalidReason: message,
      }
    })
  } catch {
    return [{ rowIndex: 1, valid: false, invalidReason: '导入错误报告不是合法 JSON' }]
  }
})

const { loadTree, portfolioOrgOptions } = usePortfolioOrgTree()
const { canPickTeachers } = usePortfolioTeacherAccess()
const route = useRoute()

const showAdminStats = computed(() => canPickTeachers.value)

const activeTab = ref('plans')
const yearStats = ref<PortfolioDevelopmentPlanYearStatVO[]>([])
const orgStats = ref<PortfolioDevelopmentPlanOrgStatVO[]>([])
const completion = ref<PortfolioDevelopmentPlanCompletionVO | null>(null)
const attainment = ref<PortfolioDevelopmentPlanAchievementAttainmentItemVO[]>([])
const highlightedPlanId = ref('')
const selectedPlanId = ref('')
const itemLoading = ref(false)
const itemSaving = ref(false)

interface DevelopmentPlanItemEditorRow extends PortfolioDevelopmentPlanItemSaveRequest {
  rowKey: string
}

const planItems = ref<DevelopmentPlanItemEditorRow[]>([])

interface DevelopmentPlanForm {
  planYear: string
  planTitle: string
  planSummary: string
  portfolioOrgId: string
}

const form = reactive<DevelopmentPlanForm>({
  planYear: String(new Date().getFullYear()),
  planTitle: '',
  planSummary: '',
  portfolioOrgId: '',
})
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
      planType: PortfolioDevelopmentPlanTypeCode.TEACHER,
    }),
  { immediate: false },
)

function planStatusLabel(status: PortfolioDevelopmentPlanStatusCode): string {
  return strictEnumLabel(PortfolioDevelopmentPlanStatusDescription, status, '发展规划状态')
}

function planStatusTone(status: PortfolioDevelopmentPlanStatusCode) {
  return strictEnumTone(PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE, status, '发展规划状态')
}

function planTypeLabel(type: PortfolioDevelopmentPlanTypeCode): string {
  return strictEnumLabel(PortfolioDevelopmentPlanTypeDescription, type, '发展规划类型')
}

const approvedCount = computed(
  () =>
    yearStats.value.find((item) => item.planStatus === PortfolioDevelopmentPlanStatusCode.APPROVED)
      ?.planCount ?? 0,
)

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'planTitle', key: 'planTitle' },
  { title: '年度', dataIndex: 'planYear', key: 'planYear', width: 88 },
  { title: '类型', dataIndex: 'planType', key: 'planType', width: 100 },
  { title: '状态', dataIndex: 'planStatus', key: 'planStatus', width: 100 },
  { title: '操作', key: 'actions', width: 140 },
]

const orgColumns: ColumnsType = [
  { title: '科室', dataIndex: 'orgName', key: 'orgName' },
  { title: '科室 ID', dataIndex: 'portfolioOrgId', key: 'portfolioOrgId', width: 120 },
  { title: '状态', dataIndex: 'planStatus', key: 'planStatus', width: 120 },
  { title: '数量', dataIndex: 'planCount', key: 'planCount', width: 80 },
]

const itemStatusOptions = PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_OPTIONS

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
  return (
    status === PortfolioDevelopmentPlanStatusCode.DRAFT ||
    status === PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED
  )
})

const planOptions = computed(() =>
  rows.value.map((item) => ({
    value: item.id,
    label: `${item.planTitle} (${item.planYear})`,
  })),
)

async function loadPage() {
  await loadPlansPage()
  if (!rows.value.some((item) => item.id === selectedPlanId.value)) {
    selectedPlanId.value = rows.value[0]?.id ?? ''
    planItems.value = []
  }
  if (selectedPlanId.value && activeTab.value === 'items') {
    await loadPlanItems()
  }
  if (showAdminStats.value) {
    yearStats.value = await portfolioDevelopmentPlanApi.statsByYear({ planYear: form.planYear })
    orgStats.value = await portfolioDevelopmentPlanApi.statsByOrg({ planYear: form.planYear })
    completion.value = await portfolioDevelopmentPlanApi.completionAnalysis({
      planYear: form.planYear,
    })
    attainment.value = await portfolioDevelopmentPlanApi.achievementAttainment({
      planYear: form.planYear,
    })
  } else {
    yearStats.value = []
    orgStats.value = []
    completion.value = null
    attainment.value = []
  }
}

function planRowClassName(record: PortfolioDevelopmentPlanVO) {
  return record.id === highlightedPlanId.value ? 'development-plan-admin__row-active' : ''
}

function scrollToHighlightedPlan() {
  if (!highlightedPlanId.value) {
    return
  }
  void nextTick(() => {
    document.querySelector('.development-plan-admin__row-active')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  })
}

function openPlanFromQuery() {
  const planId = typeof route.query.planId === 'string' ? route.query.planId : ''
  if (!planId) {
    return
  }
  highlightedPlanId.value = planId
  const target = rows.value.find((item) => item.id === planId)
  if (
    target?.planStatus === PortfolioDevelopmentPlanStatusCode.DRAFT ||
    target?.planStatus === PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED
  ) {
    activeTab.value = 'plans'
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
    await portfolioDevelopmentPlanApi.createTeacherPlan({
      planYear: form.planYear,
      planTitle: form.planTitle.trim(),
      planSummary: form.planSummary.trim() || undefined,
      portfolioOrgId: form.portfolioOrgId,
    })
    message.success('已创建教师年度规划')
    form.planTitle = ''
    form.planSummary = ''
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

function buildDevelopmentPlanRowActions(
  record: PortfolioDevelopmentPlanVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (
    record.planStatus === PortfolioDevelopmentPlanStatusCode.DRAFT ||
    record.planStatus === PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED
  ) {
    actions.push({ key: 'submit', label: '提交', tone: 'primary' })
  }
  actions.push({ key: 'items', label: '明细' })
  return actions
}

function handleDevelopmentPlanAction(key: string, record: PortfolioDevelopmentPlanVO): void {
  if (key === 'submit') {
    void submitPlan(record.id)
    return
  }
  if (key === 'items') {
    openPlanItems(record.id)
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

function orgStatRowKey(record: unknown): string {
  const row = record as PortfolioDevelopmentPlanOrgStatVO
  return `${row.portfolioOrgId ?? 'none'}-${row.planStatus}`
}

async function exportPlans() {
  try {
    const result = await portfolioDevelopmentPlanApi.exportExcel({
      planYear: form.planYear,
      planType: PortfolioDevelopmentPlanTypeCode.TEACHER,
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
  if (showAdminStats.value) {
    void loadHistoryImportBatches()
  }
  openPlanFromQuery()
  scrollToHighlightedPlan()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="教师年度规划">
        <template v-if="showAdminStats" #actions>
          <UiButton @click="exportPlans"> 导出 Excel </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <div class="toolbar">
        <input v-model="form.planYear" class="input" placeholder="年度" />
        <UiButton @click="loadPage"> 刷新 </UiButton>
        <span v-if="showAdminStats" class="stats"
          >{{ form.planYear }} 年已通过 {{ approvedCount }} 项</span
        >
      </div>
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="plans" tab="规划管理">
          <UiCard title="新建规划">
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
          <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无发展规划" />
          <UiDataTable
            v-model:current="pageNum"
            v-model:page-size="pageSize"
            pagination-mode="server"
            :total="pageTotal"
            :columns="columns"
            :data-source="rows"
            :loading="loading"
            row-key="id"
            :row-class-name="planRowClassName"
            style="margin-top: 16px"
            @page-change="handlePageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'planType'">
                {{ planTypeLabel(record.planType) }}
              </template>
              <template v-else-if="column.key === 'planStatus'">
                <UiTag :tone="planStatusTone(record.planStatus)">
                  {{ planStatusLabel(record.planStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildDevelopmentPlanRowActions(record)"
                  split
                  @action="(key) => handleDevelopmentPlanAction(key, record)"
                />
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
                  v-model.number="record.completionPercent"
                  type="number"
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
        </a-tab-pane>
        <a-tab-pane v-if="showAdminStats" key="completion" tab="完成度分析">
          <div v-if="completion" class="completion-grid">
            <span>规划总数 {{ completion.totalPlanCount }}</span>
            <span>已通过 {{ completion.approvedPlanCount }}</span>
            <span>待审 {{ completion.pendingPlanCount }}</span>
            <span>退回 {{ completion.returnedPlanCount }}</span>
            <span>审批完成率 {{ completion.completionRatePercent }}%</span>
            <span
              >明细项 {{ completion.completedPlanItemCount }}/{{
                completion.totalPlanItemCount
              }}</span
            >
            <span>明细完成率 {{ completion.planItemCompletionRatePercent }}%</span>
            <span>平均完成度 {{ completion.averageItemCompletionPercent }}%</span>
          </div>
          <UiDataTable
            pagination-mode="none"
            :columns="[
              { title: '成果分类', dataIndex: 'categoryCode', key: 'categoryCode' },
              { title: '条目数', dataIndex: 'recordCount', key: 'recordCount', width: 88 },
            ]"
            :data-source="attainment"
            :loading="loading"
            row-key="categoryCode"
            :show-pagination="false"
            :sticky-header="false"
            flat
            style="margin-top: 16px"
          />
        </a-tab-pane>
        <a-tab-pane v-if="showAdminStats" key="org-stats" tab="科室统计">
          <UiDataTable
            pagination-mode="none"
            :columns="orgColumns"
            :data-source="orgStats"
            :loading="loading"
            :row-key="orgStatRowKey"
            :show-pagination="false"
            :sticky-header="false"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'orgName'">
                {{ record.orgName || '未挂接科室' }}
              </template>
              <template v-else-if="column.key === 'planStatus'">
                <UiTag :tone="planStatusTone(record.planStatus)">
                  {{ planStatusLabel(record.planStatus) }}
                </UiTag>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane v-if="showAdminStats" key="history-import" tab="历史规划导入">
          <UiCard title="Excel 批量导入">
            <p class="history-import-hint">
              下载模板后批量补录 HISTORICAL 只读规划；列含规划标题、规划年度、负责人用户
              ID、所属组织 ID。
            </p>
            <UiButton variant="primary" @click="historyImportModalOpen = true">
              打开导入向导
            </UiButton>
            <UiButton :loading="historyBatchLoading" @click="loadHistoryImportBatches">
              刷新批次
            </UiButton>
          </UiCard>
          <UiDataTable
            v-model:current="historyBatchPageNum"
            v-model:page-size="historyBatchPageSize"
            pagination-mode="server"
            :total="historyBatchPageTotal"
            :columns="historyBatchColumns"
            :data-source="historyBatchRows"
            :loading="historyBatchLoading"
            row-key="id"
            style="margin-top: 16px"
            @page-change="handleHistoryBatchPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'batchStatus'">
                {{ historyBatchStatusLabel(record.batchStatus) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="[{ key: 'detail', label: '详情' }]"
                  split
                  @action="() => openHistoryBatchDetail(record.id)"
                />
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
    <UiPlatformExcelImportModal
      v-model:open="historyImportModalOpen"
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DEVELOPMENT_PLAN_HISTORY"
      entity-label="历史发展规划"
      @success="handleHistoryImportSuccess"
    />
    <a-drawer v-model:open="historyBatchDetailOpen" title="导入批次详情" width="480">
      <template v-if="historyBatchDetail">
        <p>批次号 {{ historyBatchDetail.batchNo }}</p>
        <p>文件 {{ historyBatchDetail.fileName ?? '—' }}</p>
        <p>
          总行 {{ historyBatchDetail.totalRows ?? 0 }} · 成功
          {{ historyBatchDetail.successRows ?? 0 }} · 失败 {{ historyBatchDetail.failedRows ?? 0 }}
        </p>
        <p>状态 {{ historyBatchStatusLabel(historyBatchDetail.batchStatus) }}</p>
        <UiDataTable
          v-if="historyBatchDetailDiagnostics.length"
          pagination-mode="client"
          :columns="historyBatchDiagnosticColumns"
          :data-source="historyBatchDetailDiagnostics"
          :show-pagination="false"
          row-key="rowIndex"
          size="small"
          flat
        />
      </template>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar,
.form-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.input {
  width: 96px;
  padding: 6px 8px;
  border: 1px solid var(--ant-color-border);
  border-radius: 4px;
}
.input--wide {
  flex: 1;
  min-width: 200px;
}
.input--cell {
  width: 100%;
  min-width: 80px;
}
.input--short {
  width: 72px;
}
.stats {
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.completion-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
}
.history-import-hint {
  margin: 0 0 12px;
  color: var(--dp-text-secondary);
  font-size: 14px;
}
:deep(.development-plan-admin__row-active) {
  background: var(--ant-color-primary-bg);
}
</style>
