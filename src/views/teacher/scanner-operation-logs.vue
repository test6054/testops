<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ScanOperationActionCode,
  ScanOperationLogItemVO,
} from '@/apis/mark/scanner-dispatch'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  pageScanOperationLogs,
  SCAN_OPERATION_ACTION_LABEL,
} from '@/apis/mark/scanner-dispatch'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ScannerOperationLogsPage' })

const route = useRoute()
const loading = ref(false)
const logs = ref<ScanOperationLogItemVO[]>([])
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })
const filters = reactive({
  ticketId: String(route.query.ticketId ?? ''),
  volumeId: String(route.query.volumeId ?? ''),
  action: undefined as ScanOperationActionCode | undefined,
})

const filterFields = computed(() => [
  { key: 'ticketId', label: '派单 ID', type: 'input' as const, placeholder: 'ticketId' },
  { key: 'volumeId', label: '归档卷 ID', type: 'input' as const, placeholder: 'volumeId' },
  {
    key: 'action',
    label: '操作类型',
    type: 'select' as const,
    placeholder: '全部',
    allowClear: true,
    options: Object.entries(SCAN_OPERATION_ACTION_LABEL).map(([value, label]) => ({ value, label })),
  },
])

const columns: ColumnsType<ScanOperationLogItemVO> = [
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 168 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 120 },
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
  return strictEnumLabel(SCAN_OPERATION_ACTION_LABEL, action, 'scanOperationAction')
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
    logs.value = readPageList(result, '扫描操作日志加载失败')
    pagination.total = readPageTotal(result)
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
  () => route.query,
  () => {
    filters.ticketId = String(route.query.ticketId ?? filters.ticketId)
    filters.volumeId = String(route.query.volumeId ?? filters.volumeId)
    pagination.current = 1
    void loadLogs()
  },
)

onMounted(() => {
  void loadLogs()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        title="扫描工位操作日志"
        subtitle="柜位维护、派单领取/挂起/释放等工位审计记录"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" :loading="loading" @click="() => loadLogs()">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiFilterBar
        variant="plain"
        :model-value="filters"
        :fields="filterFields"
        search-text="查询"
        @update:model-value="Object.assign(filters, $event)"
        @search="handleSearch"
        @reset="handleResetSearch"
      />

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
          <template v-else-if="column.key === 'action'">
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
  </StageWorkbenchShell>
</template>
