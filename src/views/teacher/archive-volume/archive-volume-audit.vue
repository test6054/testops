<template>
  <StageWorkbenchShell class="archive-audit-page">
    <template #context>
      <ContextBar layout="workbench" show-title title="归档审计事件" subtitle="历史归档">
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <UiEmpty
      v-if="loadFailed"
      description="审计事件加载失败"
      action-label="重试"
      @action="() => loadEvents()"
    />

    <WorkbenchSurfaceCard v-else flush>
      <template #toolbar>
        <UiFilterBar
          v-model="filterModel"
          :fields="filterFields"
          variant="panel"
          show-labels
          search-text="查询"
          @search="handleSearch"
          @reset="handleReset"
        />
      </template>

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
            <UiTag :tone="archiveVolumeEventTypeTone(record.eventType)" size="sm">
              {{ archiveVolumeEventTypeLabel(record.eventType) }}
            </UiTag>
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
          <template v-else-if="column.key === 'operatorUserId'">
            {{ record.operatorNickName || record.operatorUserId || '—' }}
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveVolumeAuditEventResponse,
  ArchiveVolumeEventTypeCode,
} from '@/apis/mark/archive-volume'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_VOLUME_EVENT_TYPE_OPTIONS,
  getArchiveAuditEventStats,
  pageArchiveAuditEvents,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  archiveVolumeEventTypeLabel,
  archiveVolumeEventTypeTone,
} from '@/utils/archive-volume-event-ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'TeacherArchiveVolumeAudit' })

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const events = ref<ArchiveVolumeAuditEventResponse[]>([])
const auditEventCount = ref(0)
const pagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

const signalMetrics = computed<SignalMetric[]>(() =>
  auditEventCount.value > 0
    ? [{ key: 'events', label: '审计事件', value: auditEventCount.value }]
    : [],
)

interface ArchiveVolumeAuditFilterForm extends Record<string, unknown> {
  volumeId: string
  eventType?: ArchiveVolumeEventTypeCode
}

const filterForm = reactive<ArchiveVolumeAuditFilterForm>({
  volumeId: '',
})
const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  { key: 'volumeId', label: '任务 ID', type: 'input', placeholder: '归档任务 ID' },
  {
    key: 'eventType',
    label: '事件类型',
    type: 'select',
    options: ARCHIVE_VOLUME_EVENT_TYPE_OPTIONS,
    allowClear: true,
  },
]

const columns: ColumnsType<ArchiveVolumeAuditEventResponse> = [
  { title: '事件类型', key: 'eventType', dataIndex: 'eventType', width: 160, fixed: 'left' },
  { title: '卷ID', key: 'volumeId', dataIndex: 'volumeId', width: 120 },
  { title: '操作人', key: 'operatorUserId', width: 120 },
  { title: '说明', dataIndex: 'reason', key: 'reason', ellipsis: true, minWidth: 240 },
  { title: '前状态', dataIndex: 'beforeStatus', key: 'beforeStatus', width: 100 },
  { title: '后状态', dataIndex: 'afterStatus', key: 'afterStatus', width: 100 },
  { title: '时间', key: 'createTime', dataIndex: 'createTime', width: 168 },
]

async function loadAuditStats() {
  try {
    const stats = await getArchiveAuditEventStats({
      volumeId: filterForm.volumeId.trim() || undefined,
      eventType: filterForm.eventType,
    })
    auditEventCount.value = stats.eventCount
  } catch {
    auditEventCount.value = 0
  }
}

async function loadEvents() {
  loading.value = true
  loadFailed.value = false
  try {
    const result = await pageArchiveAuditEvents({
      volumeId: filterForm.volumeId.trim() || undefined,
      eventType: filterForm.eventType,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    events.value = result.list
    pagination.total = result.total
    pagination.pageNum = result.pageNum
    pagination.pageSize = result.pageSize
    await loadAuditStats()
  } catch (error) {
    events.value = []
    pagination.total = 0
    auditEventCount.value = 0
    loadFailed.value = true
    showUserError(error, '加载审计事件失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  void loadEvents()
}

function handleReset() {
  filterForm.volumeId = ''
  filterForm.eventType = undefined
  pagination.pageNum = 1
  void loadEvents()
}

function goVolumeDetail(volumeId: string) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
  })
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

onMounted(() => {
  void loadEvents()
})
</script>
