<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="迎评统计"
        subtitle="历史归档迎评驾驶舱 · 院系完成率与缺项分布"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand
        variant="tiles"
        :metrics="signalMetrics"
        compact
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

        <div v-if="statistics" class="archive-volume-statistics__export">
          <UiButton
            variant="outline"
            size="sm"
            :loading="exportOverviewLoading"
            @click="exportOverviewExcel"
          >
            导出 Excel 台账
          </UiButton>
        </div>

        <UiSkeletonState v-if="loading" variant="card" compact />

        <div v-else-if="statistics" class="archive-volume-statistics__grid">
          <WorkbenchSurfaceCard flush>
            <template #head>院系完成率</template>
            <UiDataTable
              pagination-mode="none"
              :columns="deptColumns"
              :data-source="statistics.departmentCompletions"
              :show-pagination="false"
              flat
              row-key="departmentId"
              size="middle"
              empty-description="暂无院系统计数据"
            />
          </WorkbenchSurfaceCard>

          <WorkbenchSurfaceCard flush>
            <template #head>缺项材料分布</template>
            <UiDataTable
              pagination-mode="none"
              :columns="missingColumns"
              :data-source="statistics.missingMaterials"
              :show-pagination="false"
              flat
              row-key="materialType"
              size="middle"
              empty-description="暂无缺项统计"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'materialType'">
                  {{ materialTypeLabel(record.materialType) }}
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>
        </div>

        <UiEmpty v-else description="请选择筛选条件后查询" />
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
            导出 Excel 清册
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

    <ArchiveVolumeListNextStepsPanel variant="statistics" />
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
  ArchiveVolumeStatisticsResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_DESTRUCTION_STATUS_TONE,
  ArchiveDestructionStatusDescription,
  ArchiveMaterialTypeDescription,
  exportArchiveVolumeStatisticsExcel,
  exportDestructionLedgerExcel,
  getArchiveVolumeStatistics,
  pageDestructionLedger,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { downloadArchiveExcelBase64 } from '@/utils/archive-excel-export'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeListNextStepsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeListNextStepsPanel.vue'

defineOptions({ name: 'TeacherArchiveVolumeStatistics' })

const router = useRouter()
const { grantsLoadFailed, listScopedDepartmentIds, filterListDepartmentOptions, loadGrants }
  = useArchiveDutyAccess()

const statsTab = ref('overview')
const defaultYearSemester = getDefaultAcademicYearAndSemester()
const statsTabs = [
  { key: 'overview', label: '迎评统计' },
  { key: 'destruction', label: '销毁清册' },
]
const loading = ref(false)
const exportOverviewLoading = ref(false)
const exportDestructionLoading = ref(false)
const destructionLoading = ref(false)
const statistics = ref<ArchiveVolumeStatisticsResponse | null>(null)
const destructionRows = ref<ArchiveVolumeDestructionLedgerRowResponse[]>([])
const departmentOptions = ref<Array<{ value: string, label: string }>>([])

interface ArchiveVolumeStatisticsFilterForm extends Record<string, unknown> {
  academicYear: string | undefined
  semester: SemesterCode | undefined
  departmentId: string | undefined
}

const filterForm = reactive<ArchiveVolumeStatisticsFilterForm>({
  academicYear: defaultYearSemester.academicYear,
  semester: defaultYearSemester.semester,
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

const destructionPagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const scopedDepartmentOptions = computed(() => filterListDepartmentOptions(departmentOptions.value))

const departmentFilterDisabled = computed(() => listScopedDepartmentIds.value.length === 1)

const filterFields = computed<FilterField[]>(() => [
  { key: 'academicYear', label: '学年', type: 'input', placeholder: '2024-2025' },
  {
    key: 'semester',
    label: '学期',
    type: 'select',
    placeholder: '全部学期',
    allowClear: true,
    options: SemesterOptions.map((item) => ({ label: item.label, value: item.value })),
  },
  {
    key: 'departmentId',
    label: '学院',
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
    options: scopedDepartmentOptions.value,
    allowClear: !departmentFilterDisabled.value,
    disabled: departmentFilterDisabled.value,
  },
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '档案号 / 标题' },
])

const deptColumns: ColumnsType<ArchiveDepartmentCompletionVO> = [
  { title: '院系', dataIndex: 'departmentName' },
  { title: '总数', dataIndex: 'totalCount', width: 80 },
  { title: '已入库', dataIndex: 'storedCount', width: 80 },
  { title: '完成率', dataIndex: 'completionRate', width: 100 },
]

const missingColumns: ColumnsType<ArchiveMissingMaterialStatVO> = [
  { title: '材料类型', key: 'materialType' },
  { title: '缺项卷数', dataIndex: 'missingVolumeCount', width: 120 },
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
  if (!statistics.value) {
    return []
  }
  const depts = statistics.value.departmentCompletions
  const totalCount = depts.reduce((sum, item) => sum + item.totalCount, 0)
  const storedCount = depts.reduce((sum, item) => sum + item.storedCount, 0)
  const avgCompletionRate = depts.length
    ? Math.round(depts.reduce((sum, item) => sum + Number(item.completionRate), 0) / depts.length)
    : 0
  return [
    {
      key: 'total',
      label: '归档卷总数',
      displayValue: totalCount,
      signalValue: totalCount,
      unit: '卷',
      badgeTone: 'blue',
      clickable: totalCount > 0,
    },
    {
      key: 'stored',
      label: '已入库',
      displayValue: storedCount,
      signalValue: storedCount,
      unit: '卷',
      badgeTone: 'green',
      clickable: storedCount > 0,
    },
    {
      key: 'overdue',
      label: '逾期卷',
      displayValue: statistics.value.overdueVolumeCount,
      signalValue: statistics.value.overdueVolumeCount,
      unit: '卷',
      badgeTone: statistics.value.overdueVolumeCount > 0 ? 'red' : 'gray',
      clickable: statistics.value.overdueVolumeCount > 0,
    },
    {
      key: 'dept',
      label: '院系',
      displayValue: depts.length,
      signalValue: depts.length,
      unit: '个',
      badgeTone: 'blue',
      clickable: false,
    },
    {
      key: 'missing',
      label: '缺项类型',
      displayValue: statistics.value.missingMaterials.length,
      signalValue: statistics.value.missingMaterials.length,
      unit: '项',
      badgeTone: statistics.value.missingMaterials.length > 0 ? 'orange' : 'gray',
      clickable: statistics.value.missingMaterials.length > 0,
    },
    {
      key: 'rate',
      label: '平均完成率',
      displayValue: `${avgCompletionRate}%`,
      signalValue: `${avgCompletionRate}%`,
      badgeTone: avgCompletionRate >= 90 ? 'green' : avgCompletionRate < 70 ? 'orange' : 'blue',
      clickable: false,
    },
  ]
})

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
  const scopeIds = listScopedDepartmentIds.value
  if (scopeIds.length === 1) {
    filterForm.departmentId = scopeIds[0]
    destructionFilterForm.departmentId = scopeIds[0]
  }
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
    showUserError(error)
  }
}

function buildStatisticsRequest() {
  const query = buildOptionalAcademicYearSemesterQuery(
    filterForm.academicYear,
    filterForm.semester,
  )
  if (query === null) {
    return null
  }
  return {
    ...query,
    departmentId: filterForm.departmentId,
  }
}

async function loadStatistics() {
  if (!ensureAcademicYearSemesterPair(filterForm.academicYear, filterForm.semester)) {
    return
  }
  const request = buildStatisticsRequest()
  if (!request) {
    return
  }
  loading.value = true
  try {
    statistics.value = await getArchiveVolumeStatistics(request)
  } catch (error) {
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
    destructionPagination.total = Number(result.total)
    destructionPagination.pageNum = result.pageNum
    destructionPagination.pageSize = result.pageSize
  } catch (error) {
    showUserError(error)
  } finally {
    destructionLoading.value = false
  }
}

function handleReset() {
  filterForm.academicYear = defaultYearSemester.academicYear
  filterForm.semester = defaultYearSemester.semester
  filterForm.departmentId = departmentFilterDisabled.value
    ? listScopedDepartmentIds.value[0]
    : undefined
  statistics.value = null
}

function handleDestructionReset() {
  destructionFilterForm.keyword = ''
  destructionFilterForm.departmentId = departmentFilterDisabled.value
    ? listScopedDepartmentIds.value[0]
    : undefined
  destructionPagination.pageNum = 1
  destructionRows.value = []
  destructionPagination.total = 0
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

async function exportOverviewExcel() {
  if (!ensureAcademicYearSemesterPair(filterForm.academicYear, filterForm.semester)) {
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
    showUserError(error)
  } finally {
    exportOverviewLoading.value = false
  }
}

async function exportDestructionExcel() {
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
    showUserError(error)
  } finally {
    exportDestructionLoading.value = false
  }
}

watch(statsTab, (tab) => {
  if (tab === 'destruction' && destructionRows.value.length === 0 && !grantsLoadFailed.value) {
    void loadDestructionLedger()
  }
})

watch(
  () => filterForm.academicYear,
  (academicYear) => {
    if (!academicYear?.trim()) {
      filterForm.semester = undefined
    }
  },
)

async function initPage() {
  await loadGrants()
  if (grantsLoadFailed.value) {
    return
  }
  await loadDepartments()
  if (filterForm.academicYear && filterForm.semester) {
    await loadStatistics()
  }
}

onMounted(() => {
  void initPage()
})
</script>

<style scoped>
.archive-volume-statistics__tabs {
  margin-top: var(--dp-space-2, 8px);
}

.archive-volume-statistics__export {
  margin-top: var(--dp-space-2, 8px);
}

.archive-volume-statistics__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4, 16px);
  margin-top: var(--dp-space-4, 16px);
}

@media (max-width: 1024px) {
  .archive-volume-statistics__grid {
    grid-template-columns: 1fr;
  }
}
</style>
