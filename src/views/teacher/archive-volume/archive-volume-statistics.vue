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

    <UiErrorRetryPanel
      v-if="grantsLoadFailed"
      description="岗位职责加载失败，无法确定院系统计范围"
      @retry="initPage"
    />

    <template v-else>
      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        search-text="查询"
        @search="loadStatistics"
        @reset="handleReset"
      />

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
    </template>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveDepartmentCompletionVO,
  ArchiveMaterialTypeCode,
  ArchiveMissingMaterialStatVO,
  ArchiveVolumeStatisticsVO,
} from '@/apis/mark/archive-volume'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_MATERIAL_TYPE_LABEL,
  getArchiveVolumeStatistics,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import { requireArrayResult } from '@/components/quality/selectors/page-contract'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiErrorRetryPanel from '@/components/ui-guide/ui/ErrorRetryPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeStatistics' })

const router = useRouter()
const {
  grantsLoadFailed,
  listScopedDepartmentIds,
  filterListDepartmentOptions,
  loadGrants,
} = useArchiveDutyAccess()

const loading = ref(false)
const statistics = ref<ArchiveVolumeStatisticsVO | null>(null)
const departmentOptions = ref<Array<{ value: string, label: string }>>([])
const filterModel = reactive({
  academicYear: '',
  semester: '',
  departmentId: undefined as string | undefined,
})

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

function applyScopedDepartmentDefault() {
  const scopeIds = listScopedDepartmentIds.value
  if (scopeIds.length === 1) {
    filterModel.departmentId = scopeIds[0]
  }
}

async function loadDepartments() {
  try {
    const departments = requireArrayResult(await departmentCatalogApi.list(), '院系')
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

function handleReset() {
  filterModel.academicYear = ''
  filterModel.semester = ''
  filterModel.departmentId = departmentFilterDisabled.value
    ? listScopedDepartmentIds.value[0]
    : undefined
  statistics.value = null
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

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
