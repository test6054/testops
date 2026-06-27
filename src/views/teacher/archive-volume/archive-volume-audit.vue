<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="归档审计事件" subtitle="租户级归档卷操作流水查询" />
    </template>

    <UiFilterBar
      v-model="filterModel"
      :fields="filterFields"
      search-text="查询"
      @search="handleSearch"
      @reset="handleReset"
    />

    <UiDataTable
      v-model:current="pagination.pageNum"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data-source="events"
      :loading="loading"
      :total="pagination.total"
      flat
      row-key="eventId"
      size="middle"
      empty-description="暂无审计事件"
      @page-change="loadEvents"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'eventType'">
          {{ eventTypeLabel(record.eventType) }}
        </template>
        <template v-else-if="column.key === 'volumeId'">
          <button
            v-if="record.volumeId"
            type="button"
            class="link-cell"
            @click="goVolumeDetail(record.volumeId)"
          >
            {{ record.volumeId }}
          </button>
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) }}
        </template>
      </template>
    </UiDataTable>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveVolumeAuditEventVO,
  ArchiveVolumeEventTypeCode,
} from '@/apis/mark/archive-volume'
import type { FilterField } from '@/components/ui-guide/ui/types'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_VOLUME_EVENT_TYPE_LABEL,
  pageArchiveAuditEvents,
} from '@/apis/mark/archive-volume'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeAudit' })

const router = useRouter()
const loading = ref(false)
const events = ref<ArchiveVolumeAuditEventVO[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })
const filterModel = reactive({
  volumeId: '',
  eventType: undefined as ArchiveVolumeEventTypeCode | undefined,
})

const eventTypeOptions = Object.entries(ARCHIVE_VOLUME_EVENT_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const filterFields: FilterField[] = [
  { key: 'volumeId', label: '卷ID', type: 'input', placeholder: '归档卷 ID' },
  { key: 'eventType', label: '事件类型', type: 'select', options: eventTypeOptions, allowClear: true },
]

const columns: ColumnsType<ArchiveVolumeAuditEventVO> = [
  { title: '事件类型', key: 'eventType', dataIndex: 'eventType', width: 160 },
  { title: '卷ID', key: 'volumeId', dataIndex: 'volumeId', width: 120 },
  { title: '操作人', dataIndex: 'operatorUserId', key: 'operatorUserId', width: 100 },
  { title: '说明', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '前状态', dataIndex: 'beforeStatus', key: 'beforeStatus', width: 100 },
  { title: '后状态', dataIndex: 'afterStatus', key: 'afterStatus', width: 100 },
  { title: '时间', key: 'createTime', dataIndex: 'createTime', width: 168 },
]

function eventTypeLabel(code: ArchiveVolumeEventTypeCode | undefined) {
  if (!code) return '—'
  return strictEnumLabel(ARCHIVE_VOLUME_EVENT_TYPE_LABEL, code, 'eventType')
}

async function loadEvents() {
  loading.value = true
  try {
    const result = await pageArchiveAuditEvents({
      volumeId: filterModel.volumeId.trim() || undefined,
      eventType: filterModel.eventType,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    events.value = readPageList(result, '审计事件列表异常')
    pagination.total = readPageTotal(result)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  void loadEvents()
}

function handleReset() {
  filterModel.volumeId = ''
  filterModel.eventType = undefined
  pagination.pageNum = 1
  void loadEvents()
}

function goVolumeDetail(volumeId: string) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
  })
}

onMounted(() => {
  void loadEvents()
})
</script>

<style scoped>
.link-cell {
  color: var(--ant-color-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
</style>
