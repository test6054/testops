<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="混扫复核待办"
        subtitle="院系范围内仍待复核的疑似混扫批次"
      >
        <template #actions>
          <UiButton variant="outline" size="sm" @click="goList">返回归档工作台</UiButton>
        </template>
      </ContextBar>
    </template>

    <WorkbenchSurfaceCard flush>
      <UiSkeletonState v-if="grantsLoading" variant="card" compact />
      <WorkbenchContextGateStrip
        v-else-if="!canViewArchiveDepartmentQueue"
        tag="无权限"
        body="当前账号缺少院系归档职责，无法查看混扫复核待办"
        cta-label="返回归档工作台"
        list-route-name="TeacherArchiveVolumeList"
        tone="warning"
      />
      <template v-else>
        <div v-if="showDepartmentFilter" class="archive-suspected-mixed-scan__filter">
          <span class="archive-suspected-mixed-scan__filter-label">院系</span>
          <UiSelect
            size="sm"
            v-model="filterDepartmentId"
            allow-clear
            placeholder="全部可见院系"
            style="width: 220px"
            :options="departmentOptions"
            @change="handleFilterChange"
          />
        </div>
        <UiDataTable
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          pagination-mode="server"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          flat
          row-key="rowKey"
          size="middle"
          :total="pagination.total"
          empty-description="暂无疑似混扫批次待办"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'volume'">
              <UiTextAction tone="primary" @click="goVolumeScanReview(record.volumeId)">
                {{ record.archiveNo || record.volumeId }}
              </UiTextAction>
              <div v-if="record.departmentName" class="archive-suspected-mixed-scan__sub">
                {{ record.departmentName }}
              </div>
            </template>
            <template v-else-if="column.key === 'batch'">
              <span>{{ record.batchExternalNo || record.sourceBatchId || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'counts'">
              {{ formatMaterialPageCounts(record.materialCount, record.pageCount) }}
            </template>
            <template v-else-if="column.key === 'scanEndTime'">
              {{ formatDateTime(record.scanEndTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton size="sm" variant="outline" @click="goVolumeScanReview(record.volumeId)">
                进入卷复核
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </template>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveSuspectedMixedScanBatchItemVO } from '@/apis/mark/archive-volume'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { pageSuspectedMixedScanBatches } from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { buildArchiveVolumeScanReviewRoute } from '@/utils/archive-suspected-mixed-navigation'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'TeacherArchiveVolumeSuspectedMixedScan' })

interface SuspectedMixedScanRow extends ArchiveSuspectedMixedScanBatchItemVO {
  rowKey: string
}

const router = useRouter()
const {
  loading: grantsLoading,
  loadGrants,
  filterListDepartmentOptions,
  canViewArchiveDepartmentQueue,
  listScopedDepartmentIds,
} = useArchiveDutyAccess()

const loading = ref(false)
const rows = ref<SuspectedMixedScanRow[]>([])
const filterDepartmentId = ref<string>()
const allDepartmentOptions = ref<Array<{ value: string, label: string }>>([])
const pagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

const showDepartmentFilter = computed(() => listScopedDepartmentIds.value.length > 0)

const departmentOptions = computed(() => filterListDepartmentOptions(allDepartmentOptions.value))

const columns: ColumnsType<SuspectedMixedScanRow> = [
  { title: '归档卷', key: 'volume', width: 200 },
  { title: '扫描批次', key: 'batch', width: 160 },
  { title: '登记/页数', key: 'counts', width: 120 },
  { title: '扫描结束', key: 'scanEndTime', width: 160 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

function formatMaterialPageCounts(materialCount?: number, pageCount?: number): string {
  const materialText = materialCount == null ? '—' : String(materialCount)
  const pageText = pageCount == null ? '—' : String(pageCount)
  return `${materialText} 份 · ${pageText} 页`
}

async function loadDepartments(): Promise<void> {
  try {
    const list = await departmentCatalogApi.list()
    allDepartmentOptions.value = list.map((item) => ({
      value: item.id,
      label: item.deptName,
    }))
  } catch (error) {
    allDepartmentOptions.value = []
    showUserError(error, '院系列表加载失败')
  }
}

async function loadRows(): Promise<void> {
  if (!canViewArchiveDepartmentQueue.value) {
    rows.value = []
    pagination.total = 0
    return
  }
  loading.value = true
  try {
    const page = await pageSuspectedMixedScanBatches({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      departmentId: filterDepartmentId.value,
    })
    rows.value = page.list.map((item) => ({
      ...item,
      rowKey: `${item.volumeId}-${item.sourceBatchId ?? item.batchExternalNo ?? ''}`,
    }))
    pagination.total = page.total
    pagination.pageNum = page.pageNum
    pagination.pageSize = page.pageSize
  } catch (error) {
    showUserError(error, '混扫待办加载失败')
  } finally {
    loading.value = false
  }
}

function handleFilterChange(): void {
  pagination.pageNum = 1
  void loadRows()
}

function handlePageChange(page: { current: number, pageSize: number }): void {
  pagination.pageNum = page.current
  pagination.pageSize = page.pageSize
  void loadRows()
}

function goList(): void {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goVolumeScanReview(volumeId: string): void {
  void router.push(buildArchiveVolumeScanReviewRoute(volumeId))
}

onMounted(async () => {
  await loadGrants()
  await loadDepartments()
  void loadRows()
})
</script>

<style scoped lang="scss">
.archive-suspected-mixed-scan__filter {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component) 0;
}

.archive-suspected-mixed-scan__filter-label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.archive-suspected-mixed-scan__sub {
  margin-top: 2px;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
</style>
