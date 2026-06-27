<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">迎评统计</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <a-tabs v-model:active-key="statsTab" class="archive-volume-statistics__tabs">
      <a-tab-pane key="overview" tab="迎评统计">
        <UiFilterBar
          v-model="filterModel"
          :fields="filterFields"
          search-text="查询"
          @search="loadStatistics"
          @reset="handleReset"
        />

        <div v-if="statistics" class="archive-volume-statistics__export">
          <UiButton variant="outline" size="sm" :loading="exportOverviewLoading" @click="exportOverviewExcel">
            导出 Excel 台账
          </UiButton>
        </div>

        <a-spin :spinning="loading">
          <SignalBand v-if="statistics" :metrics="signalMetrics" compact />

          <div v-if="statistics" class="archive-volume-statistics__grid">
            <UiCard>
              <template #title>院系完成率</template>
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
            </UiCard>

            <UiCard>
              <template #title>缺项材料分布</template>
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
            </UiCard>
          </div>

          <UiEmpty v-else-if="!loading" description="请选择筛选条件后查询" />
        </a-spin>
      </a-tab-pane>

      <a-tab-pane key="destruction" tab="销毁清册">
        <UiFilterBar
          v-model="destructionFilterModel"
          :fields="destructionFilterFields"
          search-text="查询"
          @search="loadDestructionLedger"
          @reset="handleDestructionReset"
        />

        <div v-if="destructionRows.length" class="archive-volume-statistics__export">
          <UiButton variant="outline" size="sm" :loading="exportDestructionLoading" @click="exportDestructionExcel">
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
      </a-tab-pane>
    </a-tabs>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveDepartmentCompletionVO,
  ArchiveDestructionStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveMissingMaterialStatVO,
  ArchiveVolumeDestructionLedgerRowVO,
  ArchiveVolumeStatisticsVO,
} from '@/apis/mark/archive-volume'
import type {TenantSchoolDepartmentDto} from '@/apis/quality/user-catalog';
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_DESTRUCTION_STATUS_LABEL,
  ARCHIVE_DESTRUCTION_STATUS_TONE,
  ARCHIVE_MATERIAL_TYPE_LABEL,
  exportArchiveVolumeStatisticsExcel,
  exportDestructionLedgerExcel,
  getArchiveVolumeStatistics,
  pageDestructionLedger,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import { requireArrayResult } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { downloadArchiveExcelBase64 } from '@/utils/archive-excel-export'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeStatistics' })

const router = useRouter()
const {
  grantsLoadFailed,
  listScopedDepartmentIds,
  filterListDepartmentOptions,
  loadGrants,
} = useArchiveDutyAccess()

const statsTab = ref('overview')
const loading = ref(false)
const exportOverviewLoading = ref(false)
const exportDestructionLoading = ref(false)
const destructionLoading = ref(false)
const statistics = ref<ArchiveVolumeStatisticsVO | null>(null)
const destructionRows = ref<ArchiveVolumeDestructionLedgerRowVO[]>([])
const departmentOptions = ref<Array<{ value: string, label: string }>>([])

const filterModel = reactive({
  academicYear: '',
  semester: '',
  departmentId: undefined as string | undefined,
})

const destructionFilterModel = reactive({
  departmentId: undefined as string | undefined,
  keyword: '',
})

const destructionPagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const scopedDepartmentOptions = computed(() =>
  filterListDepartmentOptions(departmentOptions.value),
)

const departmentFilterDisabled = computed(() =>
  listScopedDepartmentIds.value.length === 1,
)

const filterFields = computed<FilterField[]>(() => [
  { key: 'academicYear', label: '学年', type: 'input', placeholder: '2024-2025' },
  { key: 'semester', label: '学期', type: 'input', placeholder: '1 / 2' },
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

const destructionColumns: ColumnsType<ArchiveVolumeDestructionLedgerRowVO> = [
  { title: '档案号', dataIndex: 'archiveNo', width: 140 },
  { title: '标题', dataIndex: 'archiveTitle' },
  { title: '院系', dataIndex: 'departmentName', width: 140 },
  { title: '销毁状态', key: 'destructionStatus', width: 120 },
  { title: '申请时间', key: 'requestTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
]

const signalMetrics = computed<SignalMetric[]>(() => {
  if (!statistics.value) return []
  return [
    { key: 'overdue', label: '逾期卷', value: statistics.value.overdueVolumeCount, tone: 'red' },
    { key: 'dept', label: '院系数', value: statistics.value.departmentCompletions.length },
    { key: 'missing', label: '缺项类型', value: statistics.value.missingMaterials.length },
  ]
})

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

function destructionStatusLabel(code: ArchiveDestructionStatusCode) {
  return strictEnumLabel(ARCHIVE_DESTRUCTION_STATUS_LABEL, code, 'destructionStatus')
}

function destructionStatusTone(code: ArchiveDestructionStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_DESTRUCTION_STATUS_TONE, code, 'destructionStatus')
}

function applyScopedDepartmentDefault() {
  const scopeIds = listScopedDepartmentIds.value
  if (scopeIds.length === 1) {
    filterModel.departmentId = scopeIds[0]
    destructionFilterModel.departmentId = scopeIds[0]
  }
}

async function loadDepartments() {
  try {
    const departments = requireArrayResult<TenantSchoolDepartmentDto>(await departmentCatalogApi.list(), '院系')
    departmentOptions.value = departments.map(item => ({
      value: item.id,
      label: item.deptName,
    }))
    applyScopedDepartmentDefault()
  }
  catch (error) {
    showUserError(error)
  }
}

async function loadStatistics() {
  loading.value = true
  try {
    statistics.value = await getArchiveVolumeStatistics({
      academicYear: filterModel.academicYear.trim() || undefined,
      semester: filterModel.semester.trim() || undefined,
      departmentId: filterModel.departmentId,
    })
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function loadDestructionLedger() {
  destructionLoading.value = true
  try {
    const result = await pageDestructionLedger({
      departmentId: destructionFilterModel.departmentId,
      keyword: destructionFilterModel.keyword.trim() || undefined,
      pageNum: destructionPagination.pageNum,
      pageSize: destructionPagination.pageSize,
    })
    destructionRows.value = readPageList(result, '销毁清册台账异常')
    destructionPagination.total = readPageTotal(result)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    destructionLoading.value = false
  }
}

function handleReset() {
  filterModel.academicYear = ''
  filterModel.semester = ''
  filterModel.departmentId = departmentFilterDisabled.value
    ? listScopedDepartmentIds.value[0]
    : undefined
  statistics.value = null
}

function handleDestructionReset() {
  destructionFilterModel.keyword = ''
  destructionFilterModel.departmentId = departmentFilterDisabled.value
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
  exportOverviewLoading.value = true
  try {
    const result = await exportArchiveVolumeStatisticsExcel({
      academicYear: filterModel.academicYear.trim() || undefined,
      semester: filterModel.semester.trim() || undefined,
      departmentId: filterModel.departmentId,
    })
    downloadArchiveExcelBase64(result.fileName, result.fileContentBase64)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    exportOverviewLoading.value = false
  }
}

async function exportDestructionExcel() {
  exportDestructionLoading.value = true
  try {
    const result = await exportDestructionLedgerExcel({
      departmentId: destructionFilterModel.departmentId,
      keyword: destructionFilterModel.keyword.trim() || undefined,
      pageNum: destructionPagination.pageNum,
      pageSize: destructionPagination.pageSize,
    })
    downloadArchiveExcelBase64(result.fileName, result.fileContentBase64)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    exportDestructionLoading.value = false
  }
}

watch(statsTab, (tab) => {
  if (tab === 'destruction' && destructionRows.value.length === 0 && !grantsLoadFailed.value) {
    void loadDestructionLedger()
  }
})

async function initPage() {
  await loadGrants()
  if (grantsLoadFailed.value) {
    return
  }
  await loadDepartments()
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
