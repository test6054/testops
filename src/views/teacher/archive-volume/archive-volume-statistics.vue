<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="归档统计与清册"
        subtitle="迎评统计与销毁治理按岗位职责分别授权"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand
        :metrics="signalMetrics"
        variant="panel"
        @metric-click="handleSignalMetricClick"
      />
    </template>

    <WorkbenchSurfaceCard flush class="archive-volume-statistics__surface">
      <template #head>
        <UiSectionTabs v-model="statsTab" :items="statsTabs" compact />
      </template>

      <div v-if="statsTab === 'overview'" class="archive-volume-statistics__pane">
        <UiFilterBar
          v-model="filterModel"
          :fields="filterFields"
          variant="panel"
          show-labels
          search-text="查询"
          @search="loadStatistics"
          @reset="handleReset"
        />
        <UiAlertStrip
          v-if="statisticsSummaryLoadFailed"
          tone="error"
          title="统计摘要加载失败"
          description="已保留上次成功结果，请重试当前筛选条件。"
          class="archive-volume-statistics__error"
        >
          <template #actions>
            <UiButton size="sm" variant="outline" @click="loadStatistics">重新加载</UiButton>
          </template>
        </UiAlertStrip>

        <div v-if="statisticsSummary" class="archive-volume-statistics__export">
          <UiButton
            variant="outline"
            size="sm"
            :loading="exportOverviewLoading"
            @click="exportOverviewExcel"
          >
            导出表格文件台账
          </UiButton>
        </div>

        <UiSkeletonState v-if="loading" variant="card" compact />

        <div v-else-if="statisticsSummary" class="archive-volume-statistics__grid">
          <WorkbenchSurfaceCard flush>
            <template #head>院系完成率</template>
            <UiAlertStrip v-if="departmentLoadFailed" tone="error" title="院系完成率加载失败">
              <template #actions>
                <UiButton size="sm" variant="outline" @click="loadDepartmentCompletions">
                  重新加载
                </UiButton>
              </template>
            </UiAlertStrip>
            <UiDataTable
              v-model:current="deptPagination.pageNum"
              v-model:page-size="deptPagination.pageSize"
              pagination-mode="server"
              :columns="deptColumns"
              :data-source="departmentRows"
              :loading="deptLoading"
              :total="deptPagination.total"
              flat
              row-key="departmentId"
              size="middle"
              empty-description="暂无院系统计数据"
              @page-change="loadDepartmentCompletions"
            >
              <template #bodyCell="{ column, record }">
                <div v-if="column.key === 'completionRate'" class="archive-volume-statistics__rate">
                  <span class="archive-volume-statistics__rate-track">
                    <span
                      class="archive-volume-statistics__rate-fill"
                      :style="{
                        width: `${completionRateView(record.completionRate).pct}%`,
                        background: completionRateView(record.completionRate).color,
                      }"
                    />
                  </span>
                  <span class="archive-volume-statistics__rate-text">
                    {{ completionRateView(record.completionRate).pct }}%
                  </span>
                </div>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>

          <WorkbenchSurfaceCard flush>
            <template #head>缺项材料分布</template>
            <UiAlertStrip v-if="missingLoadFailed" tone="error" title="缺项材料分布加载失败">
              <template #actions>
                <UiButton size="sm" variant="outline" @click="loadMissingMaterials">
                  重新加载
                </UiButton>
              </template>
            </UiAlertStrip>
            <UiDataTable
              v-model:current="missingPagination.pageNum"
              v-model:page-size="missingPagination.pageSize"
              pagination-mode="server"
              :columns="missingColumns"
              :data-source="missingRows"
              :loading="missingLoading"
              :total="missingPagination.total"
              flat
              row-key="materialType"
              size="middle"
              empty-description="暂无缺项统计"
              @page-change="loadMissingMaterials"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'materialType'">
                  {{ materialTypeLabel(record.materialType) }}
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>
        </div>

        <UiAlertStrip v-else tone="info" size="sm" dense inline :show-icon="false">
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: 8px">
              <UiTag tone="blue" size="sm">未筛选</UiTag>
              <span>请选择筛选条件后查询统计结果</span>
            </span>
          </template>
        </UiAlertStrip>
      </div>

      <div v-else class="archive-volume-statistics__pane">
        <UiFilterBar
          v-model="destructionFilterModel"
          :fields="destructionFilterFields"
          variant="panel"
          show-labels
          search-text="查询"
          @search="loadDestructionLedger"
          @reset="handleDestructionReset"
        />

        <div v-if="destructionRows.length" class="archive-volume-statistics__export">
          <UiButton
            variant="outline"
            size="sm"
            :loading="exportDestructionLoading"
            @click="exportDestructionExcel"
          >
            导出表格文件清册
          </UiButton>
        </div>

        <UiDataTable
          v-model:current="destructionPagination.pageNum"
          v-model:page-size="destructionPagination.pageSize"
          :columns="destructionColumns"
          :data-source="destructionRows"
          :loading="destructionLoading"
          :total="destructionPagination.total"
          flat
          row-key="volumeId"
          size="middle"
          empty-description="暂无销毁清册记录"
          @page-change="loadDestructionLedger"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'destructionStatus'">
              <UiTag :tone="destructionStatusTone(record.destructionStatus)" size="sm">
                {{ destructionStatusLabel(record.destructionStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'requestTime'">
              {{ formatDateTime(record.requestTime) }}
            </template>
            <template v-else-if="column.key === 'executedTime'">
              {{ formatDateTime(record.executedTime) }}
            </template>
          </template>
        </UiDataTable>
      </div>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveDepartmentCompletionVO,
  ArchiveDestructionStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveMissingMaterialStatVO,
  ArchiveVolumeDestructionLedgerRowResponse,
  ArchiveVolumeStatisticsSummaryVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_DESTRUCTION_STATUS_TONE,
  ArchiveDestructionStatusDescription,
  ArchiveMaterialTypeDescription,
  exportArchiveVolumeStatisticsExcel,
  exportDestructionLedgerExcel,
  getArchiveVolumeStatisticsSummary,
  pageDestructionLedger,
  pageStatisticsDepartmentCompletions,
  pageStatisticsMissingMaterials,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  applyAcademicYearStartYearChange,
  buildAcademicYearSemesterTripleFilterFields,
  buildTriplePeriodQuery,
  createAcademicYearSemesterTripleDefaults,
  ensureTriplePeriodPair,
  resetAcademicYearSemesterTriple,
} from '@/utils/academic-year-semester-triple-filter'
import { downloadArchiveExcelBase64 } from '@/utils/archive-excel-export'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeStatistics' })

const router = useRouter()
const {
  grantsLoadFailed,
  statisticsScopedDepartmentIds,
  destructionLedgerScopedDepartmentIds,
  filterStatisticsDepartmentOptions,
  filterDestructionLedgerDepartmentOptions,
  canViewStatisticsKpi,
  canViewDestructionLedger,
  loadGrants,
} = useArchiveDutyAccess()

const statsTab = ref('overview')
const statsTabs = computed(() => {
  const items: Array<{ key: string, label: string }> = []
  if (canViewStatisticsKpi.value) items.push({ key: 'overview', label: '迎评统计' })
  if (canViewDestructionLedger.value) items.push({ key: 'destruction', label: '销毁清册' })
  return items
})
const loading = ref(false)
const deptLoading = ref(false)
const missingLoading = ref(false)
const exportOverviewLoading = ref(false)
const exportDestructionLoading = ref(false)
const destructionLoading = ref(false)
const pageInitialized = ref(false)
const statisticsSummaryLoadFailed = ref(false)
const departmentLoadFailed = ref(false)
const missingLoadFailed = ref(false)
const statisticsSummary = ref<ArchiveVolumeStatisticsSummaryVO | null>(null)
const departmentRows = ref<ArchiveDepartmentCompletionVO[]>([])
const missingRows = ref<ArchiveMissingMaterialStatVO[]>([])
const destructionRows = ref<ArchiveVolumeDestructionLedgerRowResponse[]>([])
const departmentOptions = ref<Array<{ value: string, label: string }>>([])

interface ArchiveVolumeStatisticsFilterForm extends Record<string, unknown> {
  academicYearStartYear: number | undefined
  academicYearEndYear: number | undefined
  semester: SemesterCode | undefined
  departmentId: string | undefined
}

const filterForm = reactive<ArchiveVolumeStatisticsFilterForm>({
  ...createAcademicYearSemesterTripleDefaults(true),
  departmentId: undefined,
})
const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

interface ArchiveVolumeDestructionFilterForm extends Record<string, unknown> {
  departmentId: string | undefined
  keyword: string
}

const destructionFilterForm = reactive<ArchiveVolumeDestructionFilterForm>({
  departmentId: undefined,
  keyword: '',
})
const destructionFilterModel = computed<Record<string, unknown>>({
  get: () => destructionFilterForm,
  set: (value) => {
    Object.assign(destructionFilterForm, value)
  },
})

const destructionPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const deptPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const missingPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

const scopedDepartmentOptions = computed(() =>
  filterStatisticsDepartmentOptions(departmentOptions.value),
)
const destructionDepartmentOptions = computed(() =>
  filterDestructionLedgerDepartmentOptions(departmentOptions.value),
)

const departmentFilterDisabled = computed(() => statisticsScopedDepartmentIds.value.length === 1)
const destructionDepartmentFilterDisabled = computed(
  () => destructionLedgerScopedDepartmentIds.value.length === 1,
)

const filterFields = computed<FilterField[]>(() => [
  ...buildAcademicYearSemesterTripleFilterFields(),
  {
    key: 'departmentId',
    label: '院系',
    type: 'select',
    options: scopedDepartmentOptions.value,
    allowClear: !departmentFilterDisabled.value,
    disabled: departmentFilterDisabled.value,
  },
])

const destructionFilterFields = computed<FilterField[]>(() => [
  {
    key: 'departmentId',
    label: '学院',
    type: 'select',
    options: destructionDepartmentOptions.value,
    allowClear: !destructionDepartmentFilterDisabled.value,
    disabled: destructionDepartmentFilterDisabled.value,
  },
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '档案号 / 标题' },
])

const deptColumns: ColumnsType<ArchiveDepartmentCompletionVO> = [
  { title: '院系', dataIndex: 'departmentName' },
  { title: '归档卷数', dataIndex: 'totalCount', width: 90 },
  { title: '已入库', dataIndex: 'storedCount', width: 80 },
  { title: '完成率', key: 'completionRate', dataIndex: 'completionRate', width: 140 },
]

const missingColumns: ColumnsType<ArchiveMissingMaterialStatVO> = [
  { title: '材料类型', key: 'materialType' },
  { title: '缺交卷数', dataIndex: 'missingVolumeCount', width: 120 },
]

const destructionColumns: ColumnsType<ArchiveVolumeDestructionLedgerRowResponse> = [
  { title: '档案号', dataIndex: 'archiveNo', width: 140 },
  { title: '标题', dataIndex: 'archiveTitle' },
  { title: '院系', dataIndex: 'departmentName', width: 140 },
  { title: '销毁状态', key: 'destructionStatus', width: 120 },
  { title: '申请时间', key: 'requestTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
]

const signalMetrics = computed<SignalMetric[]>(() => {
  if (statsTab.value === 'destruction') {
    return destructionPagination.total > 0
      ? [{ key: 'rows', label: '清册记录', value: destructionPagination.total, unit: '条' }]
      : []
  }
  return overviewAnalyticsCards.value.map((card) => ({
    key: card.key,
    label: card.label,
    value: card.signalValue,
    unit: card.unit,
    tone: card.badgeTone,
    clickable: card.clickable,
  }))
})

interface OverviewAnalyticsCard {
  key: string
  label: string
  displayValue: string | number
  signalValue: number | string
  unit?: string
  badgeTone?: BadgeTone
  clickable?: boolean
}

const overviewAnalyticsCards = computed<OverviewAnalyticsCard[]>(() => {
  if (!statisticsSummary.value) {
    return []
  }
  const summary = statisticsSummary.value
  const avgCompletionRate = Math.round(summary.avgCompletionRate * 100)
  return [
    {
      key: 'total',
      label: '归档卷总数',
      displayValue: summary.totalVolumeCount,
      signalValue: summary.totalVolumeCount,
      unit: '卷',
      badgeTone: 'blue',
      clickable: summary.totalVolumeCount > 0,
    },
    {
      key: 'stored',
      label: '已入库',
      displayValue: summary.storedVolumeCount,
      signalValue: summary.storedVolumeCount,
      unit: '卷',
      badgeTone: 'green',
      clickable: summary.storedVolumeCount > 0,
    },
    {
      key: 'rate',
      label: '平均完成率',
      displayValue: `${avgCompletionRate}%`,
      signalValue: `${avgCompletionRate}%`,
      badgeTone: avgCompletionRate >= 90 ? 'green' : avgCompletionRate < 70 ? 'orange' : 'blue',
      clickable: false,
    },
    {
      key: 'overdue',
      label: '逾期未完成',
      displayValue: summary.overdueVolumeCount,
      signalValue: summary.overdueVolumeCount,
      unit: '卷',
      badgeTone: summary.overdueVolumeCount > 0 ? 'red' : 'gray',
      clickable: summary.overdueVolumeCount > 0,
    },
    {
      key: 'dept',
      label: '覆盖院系',
      displayValue: summary.departmentRowCount,
      signalValue: summary.departmentRowCount,
      unit: '个',
      badgeTone: 'blue',
      clickable: false,
    },
    {
      key: 'missing',
      label: '缺交材料种类',
      displayValue: summary.missingMaterialKindCount,
      signalValue: summary.missingMaterialKindCount,
      unit: '种',
      badgeTone: summary.missingMaterialKindCount > 0 ? 'orange' : 'gray',
      clickable: summary.missingMaterialKindCount > 0,
    },
  ]
})

/** 完成率单元格视图模型：百分比与按阈值着色的进度条颜色，供模板插槽渲染。 */
function completionRateView(rate: number): { pct: number, color: string } {
  const pct = Math.round(rate * 100)
  const color
    = pct >= 90
      ? 'var(--dp-success)'
      : pct >= 70
        ? 'var(--dp-primary)'
        : pct >= 50
          ? 'var(--dp-warning)'
          : 'var(--dp-error)'
  return { pct, color }
}

function handleSignalMetricClick(key: string) {
  if (key === 'overdue') {
    void router.push({ name: 'TeacherArchiveVolumeList', query: { tab: 'archive' } })
    return
  }
  if (key === 'missing') {
    void router.push({ name: 'TeacherArchiveVolumeList', query: { tab: 'college' } })
    return
  }
  if (key === 'stored') {
    void router.push({ name: 'TeacherArchiveVolumeList', query: { tab: 'mine' } })
    return
  }
  if (key === 'total') {
    goList()
  }
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function destructionStatusLabel(code: ArchiveDestructionStatusCode) {
  return strictEnumLabel(ArchiveDestructionStatusDescription, code, 'destructionStatus')
}

function destructionStatusTone(code: ArchiveDestructionStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_DESTRUCTION_STATUS_TONE, code, 'destructionStatus')
}

function applyScopedDepartmentDefault() {
  const scopeIds = statisticsScopedDepartmentIds.value
  if (scopeIds.length === 1) {
    filterForm.departmentId = scopeIds[0]
  }
  const destructionScopeIds = destructionLedgerScopedDepartmentIds.value
  destructionFilterForm.departmentId
    = destructionScopeIds.length === 1 ? destructionScopeIds[0] : undefined
}

async function loadDepartments() {
  try {
    const departments = await departmentCatalogApi.list()
    departmentOptions.value = departments.map((item) => ({
      value: item.id,
      label: item.deptName,
    }))
    applyScopedDepartmentDefault()
  } catch (error) {
    showUserError(error, '院系列表加载失败')
  }
}

function buildStatisticsRequest() {
  const query = buildTriplePeriodQuery(filterForm)
  if (query === null) {
    return null
  }
  return {
    ...query,
    departmentId: filterForm.departmentId,
  }
}

async function loadDepartmentCompletions() {
  const request = buildStatisticsRequest()
  if (!request) {
    return
  }
  deptLoading.value = true
  departmentLoadFailed.value = false
  try {
    const result = await pageStatisticsDepartmentCompletions({
      ...request,
      pageNum: deptPagination.pageNum,
      pageSize: deptPagination.pageSize,
    })
    departmentRows.value = result.list
    deptPagination.total = result.total
    deptPagination.pageNum = result.pageNum
    deptPagination.pageSize = result.pageSize
  } catch (error) {
    departmentLoadFailed.value = true
    showUserError(error, '加载院系完成率失败')
  } finally {
    deptLoading.value = false
  }
}

async function loadMissingMaterials() {
  const request = buildStatisticsRequest()
  if (!request) {
    return
  }
  missingLoading.value = true
  missingLoadFailed.value = false
  try {
    const result = await pageStatisticsMissingMaterials({
      ...request,
      pageNum: missingPagination.pageNum,
      pageSize: missingPagination.pageSize,
    })
    missingRows.value = result.list
    missingPagination.total = result.total
    missingPagination.pageNum = result.pageNum
    missingPagination.pageSize = result.pageSize
  } catch (error) {
    missingLoadFailed.value = true
    showUserError(error, '加载缺项材料分布失败')
  } finally {
    missingLoading.value = false
  }
}

async function loadStatistics() {
  if (!ensureTriplePeriodPair(filterForm)) {
    return
  }
  const request = buildStatisticsRequest()
  if (!request) {
    return
  }
  loading.value = true
  statisticsSummaryLoadFailed.value = false
  deptPagination.pageNum = 1
  missingPagination.pageNum = 1
  try {
    statisticsSummary.value = await getArchiveVolumeStatisticsSummary(request)
    await Promise.all([loadDepartmentCompletions(), loadMissingMaterials()])
  } catch (error) {
    statisticsSummaryLoadFailed.value = true
    showUserError(error, '加载迎评统计失败')
  } finally {
    loading.value = false
  }
}

async function loadDestructionLedger() {
  destructionLoading.value = true
  try {
    const result = await pageDestructionLedger({
      departmentId: destructionFilterForm.departmentId,
      keyword: destructionFilterForm.keyword.trim() || undefined,
      pageNum: destructionPagination.pageNum,
      pageSize: destructionPagination.pageSize,
    })
    destructionRows.value = result.list
    destructionPagination.total = result.total
    destructionPagination.pageNum = result.pageNum
    destructionPagination.pageSize = result.pageSize
  } catch (error) {
    showUserError(error, '加载销毁台账失败')
  } finally {
    destructionLoading.value = false
  }
}

function handleReset() {
  resetAcademicYearSemesterTriple(filterForm, true)
  filterForm.departmentId = departmentFilterDisabled.value
    ? statisticsScopedDepartmentIds.value[0]
    : undefined
  statisticsSummaryLoadFailed.value = false
  departmentLoadFailed.value = false
  missingLoadFailed.value = false
  statisticsSummary.value = null
  departmentRows.value = []
  missingRows.value = []
  deptPagination.pageNum = 1
  missingPagination.pageNum = 1
  deptPagination.total = 0
  missingPagination.total = 0
}

function handleDestructionReset() {
  destructionFilterForm.keyword = ''
  destructionFilterForm.departmentId
    = destructionLedgerScopedDepartmentIds.value.length === 1
      ? destructionLedgerScopedDepartmentIds.value[0]
      : undefined
  destructionPagination.pageNum = 1
  destructionRows.value = []
  destructionPagination.total = 0
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

async function exportOverviewExcel() {
  // MVR-340：与 canViewStatisticsKpi / BE requireStatisticsViewer 二次拦截
  if (!canViewStatisticsKpi.value) {
    void message.warning('当前账号无导出迎评统计权限')
    return
  }
  if (!ensureTriplePeriodPair(filterForm)) {
    return
  }
  const request = buildStatisticsRequest()
  if (!request) {
    return
  }
  exportOverviewLoading.value = true
  try {
    const result = await exportArchiveVolumeStatisticsExcel(request)
    downloadArchiveExcelBase64(result.fileName, result.fileContentBase64)
  } catch (error) {
    showUserError(error, '导出统计报表失败')
  } finally {
    exportOverviewLoading.value = false
  }
}

async function exportDestructionExcel() {
  // MVR-340：与 canViewDestructionLedger / BE requireDestructionLedgerViewer 二次拦截
  if (!canViewDestructionLedger.value) {
    void message.warning('当前账号无导出销毁清册权限')
    return
  }
  if (exportDestructionLoading.value) return
  exportDestructionLoading.value = true
  try {
    const result = await exportDestructionLedgerExcel({
      departmentId: destructionFilterForm.departmentId,
      keyword: destructionFilterForm.keyword.trim() || undefined,
      pageNum: destructionPagination.pageNum,
      pageSize: destructionPagination.pageSize,
    })
    downloadArchiveExcelBase64(result.fileName, result.fileContentBase64)
  } catch (error) {
    showUserError(error, '导出销毁台账报表失败')
  } finally {
    exportDestructionLoading.value = false
  }
}

watch(statsTab, (tab) => {
  if (
    pageInitialized.value
    && tab === 'destruction'
    && destructionRows.value.length === 0
    && !grantsLoadFailed.value
  ) {
    void loadDestructionLedger()
  }
})

watch(
  () => filterForm.academicYearStartYear,
  (startYear) => {
    applyAcademicYearStartYearChange(filterForm, startYear)
  },
)

async function initPage() {
  await loadGrants()
  if (grantsLoadFailed.value) {
    return
  }
  if (!canViewStatisticsKpi.value && !canViewDestructionLedger.value) {
    showUserError(new Error('缺少归档统计或销毁清册职责'))
    void router.replace({ name: 'TeacherArchiveVolumeList' })
    return
  }
  statsTab.value = canViewStatisticsKpi.value ? 'overview' : 'destruction'
  await loadDepartments()
  if (
    canViewStatisticsKpi.value
    && filterForm.academicYearStartYear != null
    && filterForm.semester
  ) {
    await loadStatistics()
  }
  if (statsTab.value === 'destruction') {
    await loadDestructionLedger()
  }
  pageInitialized.value = true
}

onMounted(() => {
  void initPage()
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.archive-volume-statistics__tabs {
  margin-top: var(--dp-space-2);
}

.archive-volume-statistics__export {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--dp-space-2);
}

.archive-volume-statistics__rate {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-volume-statistics__rate-track {
  flex: 1;
  height: 6px;
  border-radius: var(--dp-radius-full);
  background: var(--dp-surface-sunken);
  overflow: hidden;
}

.archive-volume-statistics__rate-fill {
  display: block;
  height: 100%;
  border-radius: var(--dp-radius-full);
}

.archive-volume-statistics__rate-text {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-secondary);
}

.archive-volume-statistics__error {
  margin-top: var(--dp-space-2);
}

.archive-volume-statistics__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4);
  margin-top: var(--dp-space-4);
}

@media (max-width: bp.$shell-tablet-max) {
  .archive-volume-statistics__grid {
    grid-template-columns: 1fr;
  }
}
</style>
