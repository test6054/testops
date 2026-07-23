<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ExcelImportRowDiagnostic } from '@/apis/platform/types'
import type { PortfolioTenantIndicatorConfigVO } from '@/apis/portfolio/indicator-types'
import type {
  PortfolioAchievementGapAnalysisVO,
  PortfolioNationalAchievementCatalogVO,
} from '@/apis/portfolio/national-achievement'
import type {
  PortfolioDevelopmentPlanAchievementAttainmentItemVO,
  PortfolioDevelopmentPlanCompletionVO,
  PortfolioDevelopmentPlanHistoryImportBatchVO,
  PortfolioDevelopmentPlanItemSaveRequest,
  PortfolioDevelopmentPlanItemVO,
  PortfolioDevelopmentPlanOrgStatVO,
  PortfolioDevelopmentPlanVO,
  PortfolioDevelopmentPlanYearStatVO,
  PortfolioPlanningSyncConfigSaveRequest,
  PortfolioPlanningSyncConfigVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { ReloadOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons-vue'
import message from 'ant-design-vue/es/message'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_OPTIONS,
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode,
  PortfolioDevelopmentPlanHistoryImportBatchStatusDescription,
  PortfolioDevelopmentPlanItemStatusCode,
  PortfolioDevelopmentPlanItemStatusDescription,
  PortfolioDevelopmentPlanStatusCode,
  PortfolioDevelopmentPlanStatusDescription,
  PortfolioDevelopmentPlanTypeCode,
  PortfolioDevelopmentPlanTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { portfolioNationalAchievementApi } from '@/apis/portfolio/national-achievement'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { useQueryTable } from '@/composables/useQueryTable'
import { PortfolioImportQualityGradeDescription } from '@/types/enums/portfolio-import-quality-grade-enum'
import {
  ALL_PORTFOLIO_PLANNING_SYNC_CONFLICT_STRATEGY_CODES,
  PortfolioPlanningSyncConflictStrategyCode,
  PortfolioPlanningSyncConflictStrategyDescription,
} from '@/types/enums/portfolio-planning-sync-conflict-strategy-enum'
import {
  ALL_PORTFOLIO_PLANNING_SYNC_ORG_SCOPE_CODES,
  PortfolioPlanningSyncOrgScopeCode,
  PortfolioPlanningSyncOrgScopeDescription,
} from '@/types/enums/portfolio-planning-sync-org-scope-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()

const historyImportModalOpen = ref(false)
const historyBatchDetailOpen = ref(false)
const historyBatchDetail = ref<PortfolioDevelopmentPlanHistoryImportBatchVO | null>(null)
const historyBatchDetailLoading = ref(false)
const historyBatchDetailRequestToken = ref(0)
const historyConfigLoading = ref(false)
const historyConfigSaving = ref(false)
const historyRollbackBatchId = ref('')
const historySyncConfig = ref<PortfolioPlanningSyncConfigVO | null>(null)
const currentYear = new Date().getFullYear()
const minimumHistoryYear = 1900
const maximumHistoryYear = currentYear

const historySyncForm = reactive<PortfolioPlanningSyncConfigSaveRequest>({
  yearFrom: currentYear - 9,
  yearTo: currentYear,
  orgScopeType: PortfolioPlanningSyncOrgScopeCode.SCHOOL,
  planType: PortfolioDevelopmentPlanTypeCode.TEACHER,
  conflictStrategy: PortfolioPlanningSyncConflictStrategyCode.SKIP,
  fieldMapping: {
    ownerUserIdColumn: '负责人用户编号',
    planYearColumn: '规划年度',
    itemTitleColumn: '明细标题',
    itemGoalColumn: '明细目标',
    completionPercentColumn: '完成百分比',
    itemStatusColumn: '明细状态',
  },
  enabled: true,
})

const historyOrgScopeOptions = ALL_PORTFOLIO_PLANNING_SYNC_ORG_SCOPE_CODES.map((value) => ({
  value,
  label: PortfolioPlanningSyncOrgScopeDescription[value],
}))
const historyConflictStrategyOptions = ALL_PORTFOLIO_PLANNING_SYNC_CONFLICT_STRATEGY_CODES.map(
  (value) => ({
    value,
    label: PortfolioPlanningSyncConflictStrategyDescription[value],
  }),
)
const historyPlanTypeOptions = [
  { value: PortfolioDevelopmentPlanTypeCode.TEACHER, label: '教师年度规划' },
]

const historyWriteBusy = computed(
  () =>
    historyConfigLoading.value
    || historyConfigSaving.value
    || Boolean(historyRollbackBatchId.value)
    || historyImportModalOpen.value,
)
const historyImportAvailable = computed(
  () => Boolean(historySyncConfig.value?.enabled) && !historyConfigLoading.value,
)
const historyImportContext = computed(() => ({
  expectedConfigUpdateToken: historySyncConfig.value?.updateToken,
  confirmManualConflicts:
    historySyncConfig.value?.conflictStrategy
    === PortfolioPlanningSyncConflictStrategyCode.MANUAL_CONFIRM,
}))
const {
  loading: historyBatchLoading,
  rows: historyBatchRows,
  pageNum: historyBatchPageNum,
  pageSize: historyBatchPageSize,
  pageTotal: historyBatchPageTotal,
  loadError: historyBatchLoadError,
  loadPage: loadHistoryImportBatches,
  handlePageChange: handleHistoryBatchPageChange,
} = useQueryTable(portfolioDevelopmentPlanApi.historyImportBatchPage, { immediate: false })

const historyBatchColumns: ColumnsType = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140 },
  { title: '文件', dataIndex: 'fileName', key: 'fileName' },
  { title: '成功', dataIndex: 'successRows', key: 'successRows', width: 72 },
  { title: '失败', dataIndex: 'failedRows', key: 'failedRows', width: 72 },
  { title: '状态', dataIndex: 'batchStatus', key: 'batchStatus', width: 96 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '操作', key: 'actions', width: 128 },
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

function historyBatchStatusTone(status: PortfolioDevelopmentPlanHistoryImportBatchStatusCode) {
  switch (status) {
    case PortfolioDevelopmentPlanHistoryImportBatchStatusCode.COMPLETED:
      return 'green' as const
    case PortfolioDevelopmentPlanHistoryImportBatchStatusCode.STAGED:
      return 'orange' as const
    case PortfolioDevelopmentPlanHistoryImportBatchStatusCode.FAILED:
      return 'red' as const
    case PortfolioDevelopmentPlanHistoryImportBatchStatusCode.ROLLED_BACK:
      return 'gray' as const
    default:
      return 'blue' as const
  }
}

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

async function openHistoryBatchDetail(id: string) {
  const requestToken = ++historyBatchDetailRequestToken.value
  historyBatchDetailOpen.value = true
  historyBatchDetail.value = null
  historyBatchDetailLoading.value = true
  try {
    const detail = await portfolioDevelopmentPlanApi.historyImportBatchGet({ id })
    if (requestToken === historyBatchDetailRequestToken.value) {
      historyBatchDetail.value = detail
    }
  } catch (error) {
    if (requestToken === historyBatchDetailRequestToken.value) {
      showUserError(error, '加载历史导入批次详情失败')
    }
  } finally {
    if (requestToken === historyBatchDetailRequestToken.value) {
      historyBatchDetailLoading.value = false
    }
  }
}

async function handleHistoryImportSuccess() {
  await Promise.all([loadHistoryImportBatches(), loadPage()])
}

function applyHistorySyncConfig(config: PortfolioPlanningSyncConfigVO | null) {
  historySyncConfig.value = config
  if (!config) {
    return
  }
  historySyncForm.id = config.id
  historySyncForm.yearFrom = config.yearFrom
  historySyncForm.yearTo = config.yearTo
  historySyncForm.orgScopeType = config.orgScopeType
  historySyncForm.portfolioOrgId = config.portfolioOrgId
  historySyncForm.planType = config.planType
  historySyncForm.conflictStrategy = config.conflictStrategy
  historySyncForm.enabled = config.enabled
  Object.assign(historySyncForm.fieldMapping, config.fieldMapping)
}

async function loadHistorySyncConfig() {
  historyConfigLoading.value = true
  try {
    applyHistorySyncConfig(await portfolioDevelopmentPlanApi.getHistorySyncConfig())
  } catch (error) {
    showUserError(error, '加载历史规划同步设置失败')
  }
}

async function saveHistorySyncConfig() {
  if (historyConfigSaving.value) {
    return
  }
  if (
    historySyncForm.yearFrom < minimumHistoryYear
    || historySyncForm.yearTo > maximumHistoryYear
  ) {
    showFormValidationMessage(
      `历史规划年度须在 ${minimumHistoryYear} 年至 ${maximumHistoryYear} 年之间`,
    )
    return
  }
  if (historySyncForm.yearFrom > historySyncForm.yearTo) {
    showFormValidationMessage('起始年度不能晚于结束年度')
    return
  }
  if (historySyncForm.yearTo - historySyncForm.yearFrom + 1 > 10) {
    showFormValidationMessage('同步年度区间最多 10 年')
    return
  }
  if (
    historySyncForm.orgScopeType === PortfolioPlanningSyncOrgScopeCode.ORG_UNIT
    && !historySyncForm.portfolioOrgId
  ) {
    showFormValidationMessage('请选择同步组织范围')
    return
  }
  const fieldMapping: PortfolioPlanningSyncConfigSaveRequest['fieldMapping'] = {
    ownerUserIdColumn: historySyncForm.fieldMapping.ownerUserIdColumn.trim(),
    planYearColumn: historySyncForm.fieldMapping.planYearColumn.trim(),
    itemTitleColumn: historySyncForm.fieldMapping.itemTitleColumn.trim(),
    itemGoalColumn: historySyncForm.fieldMapping.itemGoalColumn.trim(),
    completionPercentColumn: historySyncForm.fieldMapping.completionPercentColumn.trim(),
    itemStatusColumn: historySyncForm.fieldMapping.itemStatusColumn.trim(),
  }
  if (Object.values(fieldMapping).some((value) => !value)) {
    showFormValidationMessage('字段映射列名不能为空')
    return
  }
  historyConfigSaving.value = true
  try {
    const saved = await portfolioDevelopmentPlanApi.saveHistorySyncConfig({
      ...historySyncForm,
      portfolioOrgId:
        historySyncForm.orgScopeType === PortfolioPlanningSyncOrgScopeCode.ORG_UNIT
          ? historySyncForm.portfolioOrgId
          : undefined,
      fieldMapping,
    })
    applyHistorySyncConfig(saved)
    void message.success('历史规划同步设置已保存')
  } catch (error) {
    showUserError(error, '保存历史规划同步设置失败')
  } finally {
    historyConfigSaving.value = false
  }
}

function openHistoryImport() {
  if (!historySyncConfig.value) {
    showFormValidationMessage('请先保存历史规划同步设置')
    return
  }
  if (!historySyncConfig.value.enabled) {
    showFormValidationMessage('请先启用历史规划同步设置')
    return
  }
  historyImportModalOpen.value = true
}

function canRollbackHistoryBatch(status: PortfolioDevelopmentPlanHistoryImportBatchStatusCode) {
  return (
    status === PortfolioDevelopmentPlanHistoryImportBatchStatusCode.COMPLETED
    || status === PortfolioDevelopmentPlanHistoryImportBatchStatusCode.STAGED
  )
}

function buildHistoryBatchActions(
  record: PortfolioDevelopmentPlanHistoryImportBatchVO,
): UiTableRowActionItem[] {
  return [
    { key: 'detail', label: '详情' },
    {
      key: 'rollback',
      label: '回滚',
      tone: 'danger',
      hidden: !canRollbackHistoryBatch(record.batchStatus),
      disabled: historyWriteBusy.value,
    },
  ]
}

function handleHistoryBatchAction(
  key: string,
  record: PortfolioDevelopmentPlanHistoryImportBatchVO,
) {
  if (key === 'detail') {
    void openHistoryBatchDetail(record.id)
    return
  }
  if (key !== 'rollback' || !canRollbackHistoryBatch(record.batchStatus)) {
    return
  }
  void confirmAsync({
    title: '回滚历史规划导入批次',
    content: `确认回滚批次「${record.batchNo}」？本批次导入的历史规划及明细将被删除。`,
    okText: '确认回滚',
    cancelText: '取消',
    type: 'error',
    async onOk() {
      historyRollbackBatchId.value = record.id
      try {
        await portfolioDevelopmentPlanApi.rollbackHistoryImportBatch({ id: record.id })
        void message.success('历史规划导入批次已回滚')
        if (historyBatchDetail.value?.id === record.id) {
          historyBatchDetailOpen.value = false
          historyBatchDetail.value = null
        }
        await Promise.all([loadHistoryImportBatches(), loadPage()])
      } catch (error) {
        showUserError(error, '回滚历史规划导入批次失败')
      } finally {
        historyRollbackBatchId.value = ''
      }
    },
  })
}

const historyBatchDiagnosticColumns: ColumnsType<ExcelImportRowDiagnostic> = [
  {
    title: '行号',
    dataIndex: 'rowIndex',
    key: 'rowIndex',
    width: 72,
    customRender: ({ text }) => (Number(text) > 0 ? String(text) : '批次'),
  },
  { title: '处理说明', dataIndex: 'invalidReason', key: 'invalidReason' },
]

const historyBatchDetailDiagnostics = computed<ExcelImportRowDiagnostic[]>(() => {
  const report = historyBatchDetail.value?.errorReport
  if (!report?.length) {
    return []
  }
  const diagnostics: ExcelImportRowDiagnostic[] = []
  report.forEach((item, index) => {
    const message = item.message?.trim() || '导入失败'
    const errorCode = item.conflictAction
    if (item.rowIndexes?.length) {
      item.rowIndexes.forEach((rowIndex) => {
        diagnostics.push({ rowIndex, valid: false, invalidReason: message, errorCode })
      })
      return
    }
    const rowIndex = typeof item.rowIndex === 'number' ? item.rowIndex : -(index + 1)
    diagnostics.push({ rowIndex, valid: false, invalidReason: message, errorCode })
  })
  return diagnostics
})

const { loadTree, portfolioOrgOptions } = usePortfolioOrgTree()
const { canPickTeachers } = usePortfolioTeacherAccess()
const route = useRoute()

const showAdminStats = computed(() => canPickTeachers.value)

const planTabItems = computed(() => {
  const items: Array<{ key: string, label: string }> = [
    { key: 'plans', label: '规划管理' },
    { key: 'items', label: '规划明细' },
  ]
  if (showAdminStats.value) {
    items.push(
      { key: 'completion', label: '完成度分析' },
      { key: 'org-stats', label: '科室统计' },
      { key: 'history-import', label: '历史规划导入' },
    )
  }
  return items
})

const activeTab = ref('plans')
const exporting = ref(false)
const submitting = ref(false)
const pageRequestToken = ref(0)
const yearStats = ref<PortfolioDevelopmentPlanYearStatVO[]>([])
const orgStats = ref<PortfolioDevelopmentPlanOrgStatVO[]>([])
const completion = ref<PortfolioDevelopmentPlanCompletionVO | null>(null)
const attainment = ref<PortfolioDevelopmentPlanAchievementAttainmentItemVO[]>([])
const highlightedPlanId = ref('')
const pendingLocatePlanId = ref('')
const selectedPlanId = ref('')
const itemLoading = ref(false)
const itemSaving = ref(false)
const achievementCatalogLoading = ref(false)
const achievementCatalogs = ref<PortfolioNationalAchievementCatalogVO[]>([])
const achievementOperationItemId = ref('')
const gapOpen = ref(false)
const gapLoading = ref(false)
const gap = ref<PortfolioAchievementGapAnalysisVO | null>(null)
const planItemsRequestToken = ref(0)

interface DevelopmentPlanItemEditorRow extends PortfolioDevelopmentPlanItemSaveRequest {
  rowKey: string
  catalogName?: string
  achievementLinkStatus?: string
  achievementCompletionRate?: string
  achievementMissingCount?: number
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
const minimumPlanYear = 2000
const maximumPlanYear = new Date().getFullYear() + 2
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  loadError,
  loadPage: loadPlansPage,
  handlePageChange,
} = useQueryTable(
  (params) =>
    portfolioDevelopmentPlanApi.page({
      ...params,
      planYear: form.planYear,
      planType: PortfolioDevelopmentPlanTypeCode.TEACHER,
      locatePlanId: pendingLocatePlanId.value || undefined,
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
  { title: '科室编号', dataIndex: 'portfolioOrgId', key: 'portfolioOrgId', width: 120 },
  { title: '状态', dataIndex: 'planStatus', key: 'planStatus', width: 120 },
  { title: '数量', dataIndex: 'planCount', key: 'planCount', width: 80 },
]

const itemColumns: ColumnsType = [
  { title: '标题', dataIndex: 'itemTitle', key: 'itemTitle', width: 160 },
  { title: '目标', dataIndex: 'itemGoal', key: 'itemGoal', width: 160 },
  { title: '成果目标', key: 'achievementCatalog', width: 200 },
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 100 },
  { title: '里程碑', dataIndex: 'milestoneText', key: 'milestoneText', width: 160 },
  { title: '完成率', dataIndex: 'completionPercent', key: 'completionPercent', width: 88 },
  { title: '状态', dataIndex: 'itemStatus', key: 'itemStatus', width: 100 },
  { title: '操作', key: 'itemActions', width: 140 },
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
const achievementCatalogOptions = computed(() =>
  achievementCatalogs.value.map((item) => ({
    value: item.id,
    label: `${item.catalogName} · ${item.levelCode}`,
  })),
)

async function loadIndicatorConfigs() {
  try {
    indicatorConfigs.value = await portfolioIndicatorTenantApi.listConfig()
  } catch (error) {
    showUserError(error, '加载指标配置失败')
  }
}

async function loadAchievementCatalogs() {
  achievementCatalogLoading.value = true
  try {
    const firstPage = await portfolioNationalAchievementApi.pageCatalog({
      pageNum: 1,
      pageSize: 200,
      enabled: true,
    })
    const catalogs = firstPage.list ?? []
    if ((firstPage.total ?? 0) > catalogs.length) {
      achievementCatalogs.value = []
      showUserError(null, '启用的成果目录超过 200 条，请先在成果治理页收敛目录或增加精确检索')
    } else {
      achievementCatalogs.value = catalogs
    }
  } catch (error) {
    achievementCatalogs.value = []
    showUserError(error, '加载成果目录失败')
  } finally {
    achievementCatalogLoading.value = false
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

async function loadPage() {
  const currentToken = ++pageRequestToken.value
  const requestPlanYear = form.planYear
  await loadPlansPage()
  if (currentToken !== pageRequestToken.value) {
    return
  }
  pendingLocatePlanId.value = ''
  if (!rows.value.some((item) => item.id === selectedPlanId.value)) {
    selectedPlanId.value = ''
    planItems.value = []
  }
  if (selectedPlanId.value && activeTab.value === 'items') {
    await loadPlanItems()
    if (currentToken !== pageRequestToken.value) {
      return
    }
  }
  if (showAdminStats.value) {
    try {
      yearStats.value = await portfolioDevelopmentPlanApi.statsByYear({ planYear: requestPlanYear })
    } catch (error) {
      if (currentToken !== pageRequestToken.value) {
        return
      }
      yearStats.value = []
      showUserError(error, '规划年度统计加载失败')
    }
    if (currentToken !== pageRequestToken.value) {
      return
    }
    try {
      orgStats.value = await portfolioDevelopmentPlanApi.statsByOrg({ planYear: requestPlanYear })
    } catch (error) {
      if (currentToken !== pageRequestToken.value) {
        return
      }
      orgStats.value = []
      showUserError(error, '规划组织统计加载失败')
    }
    if (currentToken !== pageRequestToken.value) {
      return
    }
    try {
      completion.value = await portfolioDevelopmentPlanApi.completionAnalysis({
        planYear: requestPlanYear,
      })
    } catch (error) {
      if (currentToken !== pageRequestToken.value) {
        return
      }
      completion.value = null
      showUserError(error, '规划完成度分析加载失败')
    }
    if (currentToken !== pageRequestToken.value) {
      return
    }
    try {
      attainment.value = await portfolioDevelopmentPlanApi.achievementAttainment({
        planYear: requestPlanYear,
      })
    } catch (error) {
      if (currentToken !== pageRequestToken.value) {
        return
      }
      attainment.value = []
      showUserError(error, '规划成果达成分析加载失败')
    }
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

/**
 * PF-P0-288：消费 planId 深链；若 BE 已按目标规划对齐年度，同步表单 planYear，避免 UI 仍停在默认当年。
 */
async function openPlanFromQuery() {
  const planId = typeof route.query.planId === 'string' ? route.query.planId : ''
  if (!planId) {
    highlightedPlanId.value = ''
    return
  }
  highlightedPlanId.value = planId
  const target = rows.value.find((item) => item.id === planId)
  if (target) {
    selectedPlanId.value = planId
    if (target.planYear && target.planYear !== form.planYear) {
      form.planYear = target.planYear
    }
    if (activeTab.value === 'items') {
      await loadPlanItems()
    }
  }
  if (
    target?.planStatus === PortfolioDevelopmentPlanStatusCode.DRAFT
    || target?.planStatus === PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED
  ) {
    activeTab.value = 'plans'
  }
}

async function createPlan() {
  if (!assertArchiveWritable()) {
    return
  }
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
    await portfolioDevelopmentPlanApi.createTeacherPlan({
      planYear: form.planYear,
      planTitle: form.planTitle.trim(),
      planSummary: form.planSummary.trim() || undefined,
      portfolioOrgId: form.portfolioOrgId,
    })
    void message.success('已创建教师年度规划')
    form.planTitle = ''
    form.planSummary = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '创建教师年度规划失败')
  }
}

function buildDevelopmentPlanRowActions(
  record: PortfolioDevelopmentPlanVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (
    record.planStatus === PortfolioDevelopmentPlanStatusCode.DRAFT
    || record.planStatus === PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED
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
  if (!assertArchiveWritable()) {
    return
  }
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    const items = await portfolioDevelopmentPlanApi.listItems({ planId: id })
    if (!items.length) {
      showFormValidationMessage('请先保存至少一条规划目标明细')
      return
    }
    await portfolioDevelopmentPlanApi.submit({ id })
    void message.success('已提交')
    await loadPage()
  } catch (error) {
    showUserError(error, '提交规划失败')
  } finally {
    submitting.value = false
  }
}

function orgStatRowKey(record: unknown): string {
  const row = record as PortfolioDevelopmentPlanOrgStatVO
  return `${row.portfolioOrgId ?? 'none'}-${row.planStatus}`
}

async function exportPlans() {
  if (exporting.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioDevelopmentPlanApi.exportExcel({
      planYear: form.planYear,
      planType: PortfolioDevelopmentPlanTypeCode.TEACHER,
    })
    await downloadPortfolioExcelExport(result)
    void message.success('规划已导出')
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

function createEmptyPlanItem(): DevelopmentPlanItemEditorRow {
  return {
    rowKey: `new-${Date.now()}-${planItems.value.length}`,
    id: undefined,
    catalogId: undefined,
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
    id: item.id,
    catalogId: item.catalogId,
    catalogName: item.catalogName,
    achievementLinkStatus: item.achievementLinkStatus,
    achievementCompletionRate: item.achievementCompletionRate,
    achievementMissingCount: item.achievementMissingCount,
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
  if (!assertArchiveWritable()) {
    return
  }
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
      id: item.id,
      catalogId: item.catalogId,
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
    void message.success('规划明细已保存')
    await loadPlanItems()
  } catch (error) {
    showUserError(error, '保存规划明细失败')
  } finally {
    itemSaving.value = false
  }
}

async function linkAchievement(item: DevelopmentPlanItemEditorRow) {
  if (!assertArchiveWritable()) {
    return
  }
  if (!item.id) {
    showFormValidationMessage('请先保存规划明细，再建立成果关联')
    return
  }
  if (!item.catalogId) {
    showFormValidationMessage('请选择成果目标')
    return
  }
  const itemId = item.id
  achievementOperationItemId.value = itemId
  try {
    await portfolioNationalAchievementApi.link({ planItemId: itemId, catalogId: item.catalogId })
    void message.success('成果目标已关联')
    await loadPlanItems()
  } catch (error) {
    showUserError(error, '关联成果目标失败')
  } finally {
    achievementOperationItemId.value = ''
  }
}

async function openAchievementGap(item: DevelopmentPlanItemEditorRow) {
  if (!item.id || !item.catalogId) {
    showFormValidationMessage('当前规划明细尚未关联成果目标')
    return
  }
  gapOpen.value = true
  gap.value = null
  gapLoading.value = true
  try {
    gap.value = await portfolioNationalAchievementApi.gapAnalysis({ planItemId: item.id })
    await loadPlanItems()
  } catch (error) {
    gapOpen.value = false
    showUserError(error, '加载成果差距失败')
  } finally {
    gapLoading.value = false
  }
}

onMounted(async () => {
  await loadTree()
  await Promise.all([loadIndicatorConfigs(), loadAchievementCatalogs()])
  pendingLocatePlanId.value = typeof route.query.planId === 'string' ? route.query.planId : ''
  await loadPage()
  if (showAdminStats.value) {
    await Promise.all([loadHistoryImportBatches(), loadHistorySyncConfig()])
  }
  await openPlanFromQuery()
  scrollToHighlightedPlan()
})

watch(historyBatchDetailOpen, (open) => {
  if (!open) {
    historyBatchDetailRequestToken.value += 1
    historyBatchDetailLoading.value = false
  }
})

watch(
  () => route.query.planId,
  async (planId, previousPlanId) => {
    if (planId === previousPlanId) {
      return
    }
    pageNum.value = 1
    pendingLocatePlanId.value = typeof planId === 'string' ? planId : ''
    await loadPage()
    await openPlanFromQuery()
    scrollToHighlightedPlan()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        layout="workbench"
        title="教师年度规划"
        subtitle="教师编制 · 科室审核 · 完成度回流 · 历史规划导入"
      >
        <template v-if="showAdminStats" #actions>
          <UiButton
            size="sm"
            variant="ghost"
            :loading="exporting"
            :disabled="exporting"
            @click="exportPlans"
          >
            导出表格文件
          </UiButton>
        </template>
        <UiAlertStrip
          v-if="archiveWriteForbidden"
          tone="warning"
          title="档案已封存写禁"
          :description="archiveWriteBlockMessage"
          class="mb-3"
        />
      </ContextBar>
    </template>
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
        <UiButton size="sm" variant="outline" @click="loadPage"> 刷新 </UiButton>
        <span v-if="showAdminStats" class="stats">{{ form.planYear }} 年已通过 {{ approvedCount }} 项</span>
      </div>
      <UiSectionTabs v-model="activeTab" :items="planTabItems" compact divided />
      <template v-if="activeTab === 'plans'">
        <UiCard title="新建规划">
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
        <WorkbenchContextGateStrip
          v-if="!loadError && !loading && rows.length === 0"
          tag="无规划"
          body="当前筛选无发展规划；可在上方新建规划，或调整筛选"
          hide-cta
        />
        <UiDataTable
          v-else
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          :total="pageTotal"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :load-error="loadError"
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
            <template v-else-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
                {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
              </UiTag>

              <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else class="text-neutral-400">—</span>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
              />
            </template>
            <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
              <span>
                {{
                  record.countsInCurrentFacultyStructure === true
                    ? '是'
                    : record.countsInCurrentFacultyStructure === false
                      ? '否'
                      : '—'
                }}
              </span>
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
          <UiButton size="sm" variant="outline" :disabled="!selectedPlanId" @click="loadPlanItems">
            刷新明细
          </UiButton>
          <UiButton v-if="planItemEditable" size="sm" variant="outline" @click="addPlanItemRow">
            新增行
          </UiButton>
          <UiButton
            v-if="planItemEditable"
            size="sm"
            variant="primary"
            :disabled="!selectedPlanId || itemSaving"
            @click="savePlanItems"
          >
            保存明细
          </UiButton>
        </div>
        <UiAlertStrip v-if="!selectedPlanId" tone="info" size="sm" dense inline :show-icon="false">
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: 8px">
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
              <input v-if="planItemEditable" v-model="record.itemTitle" class="input input--cell" />
              <span v-else>{{ record.itemTitle }}</span>
            </template>
            <template v-else-if="column.key === 'itemGoal'">
              <input v-if="planItemEditable" v-model="record.itemGoal" class="input input--cell" />
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
            <template v-else-if="column.key === 'achievementCatalog'">
              <UiSelect
                size="sm"
                v-if="planItemEditable"
                v-model="record.catalogId"
                style="width: 100%"
                allow-clear
                allow-search
                option-filter-prop="label"
                :loading="achievementCatalogLoading"
                :options="achievementCatalogOptions"
                placeholder="选择成果模板"
              />
              <div v-else class="development-plan-admin__achievement-cell">
                <span>{{ record.catalogName || '未关联' }}</span>
                <UiTag
                  v-if="record.achievementLinkStatus"
                  :tone="record.achievementLinkStatus === 'LOCKED' ? 'green' : 'blue'"
                >
                  {{ record.achievementLinkStatus === 'LOCKED' ? '已锁定' : '草稿关联' }}
                </UiTag>
                <span v-if="record.achievementCompletionRate != null">完成度 {{ record.achievementCompletionRate }}%</span>
              </div>
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
              <div class="development-plan-admin__item-actions">
                <UiButton
                  v-if="planItemEditable && record.id && record.catalogId"
                  size="sm"
                  :loading="achievementOperationItemId === record.id"
                  @click="linkAchievement(record)"
                >
                  关联
                </UiButton>
                <UiButton
                  v-if="record.id && record.catalogId"
                  size="sm"
                  @click="openAchievementGap(record)"
                >
                  差距
                </UiButton>
                <UiButton v-if="planItemEditable" size="sm" @click="removePlanItemRow(index)">
                  删除
                </UiButton>
              </div>
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else-if="showAdminStats && activeTab === 'completion'">
        <div v-if="completion" class="completion-grid">
          <span>规划总数 {{ completion.totalPlanCount }}</span>
          <span>已通过 {{ completion.approvedPlanCount }}</span>
          <span>待审 {{ completion.pendingPlanCount }}</span>
          <span>退回 {{ completion.returnedPlanCount }}</span>
          <span>审批完成率 {{ completion.completionRatePercent }}%</span>
          <span>明细项 {{ completion.completedPlanItemCount }}/{{
            completion.totalPlanItemCount
          }}</span>
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
      </template>
      <template v-else-if="showAdminStats && activeTab === 'org-stats'">
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
      </template>
      <template v-else-if="showAdminStats && activeTab === 'history-import'">
        <section class="history-settings" aria-labelledby="history-settings-title">
          <div class="history-section-heading">
            <div>
              <h3 id="history-settings-title">同步设置</h3>
              <p v-if="historySyncConfig?.updateTime">
                最近更新 {{ historySyncConfig.updateTime }}
              </p>
            </div>
            <UiSwitch
              size="sm"
              v-model="historySyncForm.enabled"
              checked-children="启用"
              un-checked-children="停用"
              :disabled="historyWriteBusy"
            />
          </div>
          <UiForm layout="vertical" class="history-settings-grid">
            <UiFormItem label="起始年度" required>
              <UiInputNumber
                size="sm"
                v-model="historySyncForm.yearFrom"
                :min="minimumHistoryYear"
                :max="maximumHistoryYear"
                :disabled="historyWriteBusy"
                style="width: 100%"
              />
            </UiFormItem>
            <UiFormItem label="结束年度" required>
              <UiInputNumber
                size="sm"
                v-model="historySyncForm.yearTo"
                :min="minimumHistoryYear"
                :max="maximumHistoryYear"
                :disabled="historyWriteBusy"
                style="width: 100%"
              />
            </UiFormItem>
            <UiFormItem label="组织范围" required>
              <UiSelect
                size="sm"
                v-model="historySyncForm.orgScopeType"
                :options="historyOrgScopeOptions"
                :disabled="historyWriteBusy"
              />
            </UiFormItem>
            <UiFormItem
              v-if="historySyncForm.orgScopeType === PortfolioPlanningSyncOrgScopeCode.ORG_UNIT"
              label="指定组织"
              required
            >
              <UiSelect
                size="sm"
                v-model="historySyncForm.portfolioOrgId"
                allow-search
                option-filter-prop="label"
                :options="portfolioOrgOptions()"
                :disabled="historyWriteBusy"
                placeholder="选择档案组织"
              />
            </UiFormItem>
            <UiFormItem label="规划类型" required>
              <UiSelect
                size="sm"
                v-model="historySyncForm.planType"
                :options="historyPlanTypeOptions"
                disabled
              />
            </UiFormItem>
            <UiFormItem label="冲突策略" required>
              <UiSelect
                size="sm"
                v-model="historySyncForm.conflictStrategy"
                :options="historyConflictStrategyOptions"
                :disabled="historyWriteBusy"
              />
            </UiFormItem>
          </UiForm>
          <h4>表格文件字段映射</h4>
          <div class="history-field-grid">
            <div class="development-plan-admin__addon-field">
              <span class="development-plan-admin__addon-label">负责人标识</span>
              <UiInput
                v-model="historySyncForm.fieldMapping.ownerUserIdColumn"
                size="sm"
                :disabled="historyWriteBusy"
              />
            </div>
            <div class="development-plan-admin__addon-field">
              <span class="development-plan-admin__addon-label">规划年度</span>
              <UiInput
                v-model="historySyncForm.fieldMapping.planYearColumn"
                size="sm"
                :disabled="historyWriteBusy"
              />
            </div>
            <div class="development-plan-admin__addon-field">
              <span class="development-plan-admin__addon-label">明细标题</span>
              <UiInput
                v-model="historySyncForm.fieldMapping.itemTitleColumn"
                size="sm"
                :disabled="historyWriteBusy"
              />
            </div>
            <div class="development-plan-admin__addon-field">
              <span class="development-plan-admin__addon-label">明细目标</span>
              <UiInput
                v-model="historySyncForm.fieldMapping.itemGoalColumn"
                size="sm"
                :disabled="historyWriteBusy"
              />
            </div>
            <div class="development-plan-admin__addon-field">
              <span class="development-plan-admin__addon-label">完成百分比</span>
              <UiInput
                v-model="historySyncForm.fieldMapping.completionPercentColumn"
                size="sm"
                :disabled="historyWriteBusy"
              />
            </div>
            <div class="development-plan-admin__addon-field">
              <span class="development-plan-admin__addon-label">明细状态</span>
              <UiInput
                v-model="historySyncForm.fieldMapping.itemStatusColumn"
                size="sm"
                :disabled="historyWriteBusy"
              />
            </div>
          </div>
          <div class="history-section-actions">
            <UiButton
              size="sm"
              variant="primary"
              :loading="historyConfigSaving"
              :disabled="historyWriteBusy && !historyConfigSaving"
              @click="saveHistorySyncConfig"
            >
              <SaveOutlined />
              保存设置
            </UiButton>
          </div>
        </section>
        <section class="history-batches" aria-labelledby="history-batches-title">
          <div class="history-section-heading">
            <div>
              <h3 id="history-batches-title">导入批次</h3>
              <p>历史规划仅以 HISTORICAL 状态写入档案袋。</p>
            </div>
            <div class="history-section-actions">
              <UiButton
                size="sm"
                variant="primary"
                :disabled="historyWriteBusy || !historyImportAvailable"
                @click="openHistoryImport"
              >
                <UploadOutlined />
                导入表格文件
              </UiButton>
              <UiButton
                size="sm"
                :loading="historyBatchLoading"
                :disabled="historyWriteBusy"
                @click="loadHistoryImportBatches"
              >
                <ReloadOutlined />
                刷新
              </UiButton>
            </div>
          </div>
          <UiDataTable
            v-model:current="historyBatchPageNum"
            v-model:page-size="historyBatchPageSize"
            pagination-mode="server"
            :total="historyBatchPageTotal"
            :columns="historyBatchColumns"
            :data-source="historyBatchRows"
            :loading="historyBatchLoading"
            :load-error="historyBatchLoadError"
            row-key="id"
            style="margin-top: 16px"
            @page-change="handleHistoryBatchPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'batchStatus'">
                <UiTag :tone="historyBatchStatusTone(record.batchStatus)">
                  {{ historyBatchStatusLabel(record.batchStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildHistoryBatchActions(record)"
                  split
                  @action="(key) => handleHistoryBatchAction(key, record)"
                />
              </template>
            </template>
          </UiDataTable>
        </section>
      </template>
    </UiCard>
    <UiDrawer v-model:open="gapOpen" title="成果目标差距" :width="560">
      <UiSpin :spinning="gapLoading">
        <template v-if="gap">
          <p class="development-plan-admin__gap-target">
            {{ gap.catalogName }} · 完成度 {{ gap.completionRate }}%
          </p>
          <p>{{ gap.targetSummary }}</p>
          <UiCard title="当前缺口">
            <UiEmpty
              size="sm"
              v-if="gap.missingItems.length === 0"
              description="当前标准要求均已满足"
            />
            <div
              v-for="item in gap.missingItems"
              :key="item.requirementCode"
              class="development-plan-admin__gap-item"
            >
              <strong>{{ item.requirementTitle }}</strong>
              <span>{{ item.suggestCollectHint }}</span>
            </div>
          </UiCard>
          <UiCard title="已满足证据">
            <UiEmpty size="sm" v-if="gap.satisfiedItems.length === 0" description="尚无满足项" />
            <div
              v-for="item in gap.satisfiedItems"
              :key="item.requirementCode"
              class="development-plan-admin__gap-item"
            >
              <strong>{{ item.requirementTitle }}</strong>
              <span>{{ item.evidenceType }} · {{ item.evidenceMatchValue }}</span>
            </div>
          </UiCard>
        </template>
      </UiSpin>
    </UiDrawer>
    <UiPlatformExcelImportModal
      v-model:open="historyImportModalOpen"
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DEVELOPMENT_PLAN_HISTORY"
      entity-label="历史发展规划"
      :context="historyImportContext"
      preview-before-commit
      allow-partial-commit
      allow-manual-conflict-commit
      @success="handleHistoryImportSuccess"
    />
    <UiDrawer v-model:open="historyBatchDetailOpen" title="导入批次详情" :width="480">
      <UiSpin :spinning="historyBatchDetailLoading">
        <template v-if="historyBatchDetail">
          <p>批次号 {{ historyBatchDetail.batchNo }}</p>
          <p>文件 {{ historyBatchDetail.fileName ?? '—' }}</p>
          <p>
            总行 {{ historyBatchDetail.totalRows ?? 0 }} · 成功
            {{ historyBatchDetail.successRows ?? 0 }} · 失败
            {{ historyBatchDetail.failedRows ?? 0 }}
          </p>
          <p>状态 {{ historyBatchStatusLabel(historyBatchDetail.batchStatus) }}</p>
          <p v-if="historyBatchDetail.qualityGrade">
            质量等级 {{ PortfolioImportQualityGradeDescription[historyBatchDetail.qualityGrade] }} ·
            通过率 {{ historyBatchDetail.passRate ?? 0 }}% · 教师匹配率
            {{ historyBatchDetail.teacherMatchRate ?? 0 }}% · 字段可用率
            {{ historyBatchDetail.fieldUsableRate ?? 0 }}%
          </p>
          <UiDataTable
            v-if="historyBatchDetailDiagnostics.length"
            pagination-mode="client"
            :columns="historyBatchDiagnosticColumns"
            :data-source="historyBatchDetailDiagnostics"
            :show-pagination="false"
            row-key="rowIndex"
            size="sm"
            flat
          />
        </template>
      </UiSpin>
    </UiDrawer>
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
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs);
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
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.completion-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3, 12px);
  font-size: var(--dp-font-size-md);
}
.history-settings,
.history-batches {
  padding-block: 8px 24px;
}
.history-batches {
  border-top: 1px solid var(--dp-border-subtle);
  padding-top: 24px;
}
.history-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  margin-bottom: var(--dp-space-3, 12px);
}
.history-section-heading h3,
.history-settings h4 {
  margin: 0;
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
}
.history-settings h4 {
  margin-bottom: 12px;
  font-size: var(--dp-font-size-md);
}
.history-section-heading p {
  margin: 4px 0 0;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}
.history-settings-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 16px;
}
.history-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}
.history-section-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}
@media (max-width: 960px) {
  .history-settings-grid,
  .history-field-grid {
    grid-template-columns: 1fr;
  }
  .history-section-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .history-section-actions {
    justify-content: flex-start;
  }
}
:deep(.development-plan-admin__row-active) {
  background: var(--dp-color-primary-bg);
}
</style>
