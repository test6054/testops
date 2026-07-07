<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ScanOperationActionCode,
  ScanOperationLogItemVO,
} from '@/apis/mark/scanner-dispatch'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  pageScanOperationLogs,
  SCAN_OPERATION_ACTION_OPTIONS,
  ScanOperationActionDescription,
} from '@/apis/mark/scanner-dispatch'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ScannerOperationLogPanel' })

const props = defineProps<{
  ticketId?: string
  volumeId?: string
  returnDispatchLabel?: string
}>()

const emit = defineEmits<{
  'return-dispatch': []
}>()
const loading = ref(false)
const logs = ref<ScanOperationLogItemVO[]>([])
const pagination = reactive({ current: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

const logSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'logs',
    label: '日志总数',
    value: pagination.total,
    unit: '条',
    tone: 'blue',
  },
])

interface OperationLogFilters {
  ticketId: string
  volumeId: string
  action?: ScanOperationActionCode
}

const filters = reactive<OperationLogFilters>({
  ticketId: props.ticketId ?? '',
  volumeId: props.volumeId ?? '',
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'ticketId', label: '派单 ID', type: 'input', placeholder: 'ticketId' },
  { key: 'volumeId', label: '归档卷 ID', type: 'input', placeholder: 'volumeId' },
  {
    key: 'action',
    label: '操作类型',
    type: 'select',
    placeholder: '全部',
    allowClear: true,
    options: SCAN_OPERATION_ACTION_OPTIONS,
  },
])

const columns: ColumnsType<ScanOperationLogItemVO> = [
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 168 },
  { title: '操作类型', dataIndex: 'action', key: 'operationAction', width: 120 },
  { title: '派单', dataIndex: 'ticketId', key: 'ticketId', width: 120 },
  { title: '工单', dataIndex: 'workOrderId', key: 'workOrderId', width: 120 },
  { title: '工位', dataIndex: 'scannerStationId', key: 'scannerStationId', width: 120 },
  { title: '操作人', dataIndex: 'operatorUserId', key: 'operatorUserId', width: 100 },
  { title: '详情', dataIndex: 'detailJson', key: 'detailJson', ellipsis: true },
]

function actionLabel(action?: ScanOperationActionCode) {
  if (!action) {
    return '—'
  }
  return strictEnumLabel(ScanOperationActionDescription, action, 'scanOperationAction')
}

async function loadLogs() {
  loading.value = true
  try {
    const result = await pageScanOperationLogs({
      ticketId: filters.ticketId.trim() || undefined,
      volumeId: filters.volumeId.trim() || undefined,
      action: filters.action,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    logs.value = result.list
    pagination.total = result.total
  }
  catch (error) {
    logs.value = []
    pagination.total = 0
    showUserError(error, '扫描操作日志加载失败')
  }
  finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  void loadLogs()
}

function handleResetSearch() {
  filters.ticketId = ''
  filters.volumeId = ''
  filters.action = undefined
  pagination.current = 1
  void loadLogs()
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pagination.current = pageEvent.current
  pagination.pageSize = pageEvent.pageSize
  void loadLogs()
}

watch(
  () => [props.ticketId, props.volumeId],
  ([ticketId, volumeId]) => {
    if (ticketId !== undefined) {
      filters.ticketId = ticketId
    }
    if (volumeId !== undefined) {
      filters.volumeId = volumeId
    }
    pagination.current = 1
    void loadLogs()
  },
)

onMounted(() => {
  void loadLogs()
})
</script>

<template>
  <div class="scanner-operation-log-panel">
    <UiAlertStrip
      v-if="returnDispatchLabel"
      tone="info"
      dense
      :title="`来自 ${returnDispatchLabel}`"
      description="查看日志后可直接返回原派单筛选视图，无需重新设定条件。"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" @click="emit('return-dispatch')">
          返回派单调度
        </UiButton>
      </template>
    </UiAlertStrip>

    <SignalBand variant="tiles" compact :metrics="logSignalMetrics" class="scanner-operation-log-panel__signal" />

    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <div class="scanner-operation-log-panel__toolbar">
          <UiFilterBar
            variant="plain"
            :model-value="filters"
            :fields="filterFields"
            search-text="查询"
            @update:model-value="Object.assign(filters, $event)"
            @search="handleSearch"
            @reset="handleResetSearch"
          />
          <UiButton size="sm" variant="outline" :loading="loading" @click="() => loadLogs()">
            刷新
          </UiButton>
        </div>
      </template>

      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="logs"
        :loading="loading"
        :total="pagination.total"
        row-key="logId"
        flat
        empty-description="暂无操作日志"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'createTime'">
            {{ record.createTime ? formatDateTime(record.createTime) : '—' }}
          </template>
          <template v-else-if="column.key === 'operationAction'">
            {{ actionLabel(record.action) }}
          </template>
          <template v-else-if="column.key === 'ticketId'">
            {{ record.ticketId ?? '—' }}
          </template>
          <template v-else-if="column.key === 'workOrderId'">
            {{ record.workOrderId ?? '—' }}
          </template>
          <template v-else-if="column.key === 'scannerStationId'">
            {{ record.scannerStationId ?? '—' }}
          </template>
          <template v-else-if="column.key === 'operatorUserId'">
            {{ record.operatorUserId ?? '—' }}
          </template>
          <template v-else-if="column.key === 'detailJson'">
            {{ record.detailJson ?? '—' }}
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
  </div>
</template>

<style scoped>
.scanner-operation-log-panel__signal {
  margin-top: 12px;
  margin-bottom: 12px;
}

.scanner-operation-log-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
</style>
