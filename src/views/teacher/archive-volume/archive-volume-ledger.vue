<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">查阅台账</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <a-tabs v-model:active-key="ledgerTab" class="archive-volume-ledger__tabs">
      <a-tab-pane key="volume" tab="单卷台账">
        <UiFilterBar
          v-model="volumeFilterModel"
          :fields="volumeFilterFields"
          search-text="定位归档卷"
          @search="locateVolume"
          @reset="handleVolumeReset"
        />

        <UiEmpty
          v-if="!selectedVolumeId"
          description="输入档案号或关键词定位归档卷，再查看查阅台账"
        />

        <template v-else>
          <div class="archive-volume-ledger__head">
            <span class="archive-volume-ledger__title">{{ selectedArchiveNo }}</span>
            <UiButton variant="outline" size="sm" @click="goDetail">打开卷详情</UiButton>
          </div>

          <UiDataTable
            pagination-mode="none"
            :columns="volumeAccessColumns"
            :data-source="accessRecords"
            :loading="volumeLoading"
            :show-pagination="false"
            flat
            row-key="accessRecordId"
            size="middle"
            empty-description="该卷暂无查阅记录"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'accessStatus'">
                <UiTag :tone="accessStatusTone(record.accessStatus)" size="sm">
                  {{ accessStatusLabel(record.accessStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'approvedTime'">
                {{ formatDateTime(record.approvedTime) }}
              </template>
              <template v-else-if="column.key === 'expireTime'">
                {{ formatDateTime(record.expireTime) }}
              </template>
            </template>
          </UiDataTable>
        </template>
      </a-tab-pane>

      <a-tab-pane key="tenant" tab="租户台账">
        <UiFilterBar
          v-model="tenantFilterModel"
          :fields="tenantFilterFields"
          search-text="查询"
          @search="loadTenantLedger"
          @reset="handleTenantReset"
        />

        <UiDataTable
          v-model:current="tenantPagination.pageNum"
          v-model:page-size="tenantPagination.pageSize"
          :columns="tenantAccessColumns"
          :data-source="tenantRows"
          :loading="tenantLoading"
          :total="tenantPagination.total"
          flat
          row-key="accessRecordId"
          size="middle"
          empty-description="暂无查阅利用记录"
          @page-change="loadTenantLedger"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'accessStatus'">
              <UiTag :tone="accessStatusTone(record.accessStatus)" size="sm">
                {{ accessStatusLabel(record.accessStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatDateTime(record.createTime) }}
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
  ArchiveAccessStatusCode,
  ArchiveVolumeAccessLedgerRowVO,
  ArchiveVolumeAccessRecordVO,
  ArchiveVolumeVO,
} from '@/apis/mark/archive-volume'
import type {TenantSchoolDepartmentDto} from '@/apis/quality/user-catalog';
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_ACCESS_STATUS_LABEL,
  ARCHIVE_ACCESS_STATUS_TONE,
  listArchiveVolumeAccessRecords,
  pageAccessLedger,
  pageArchiveVolumes,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import { requireArrayResult } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeLedger' })

const router = useRouter()
const {
  grantsLoadFailed,
  listScopedDepartmentIds,
  filterListDepartmentOptions,
  loadGrants,
} = useArchiveDutyAccess()

const ledgerTab = ref('volume')
const volumeLoading = ref(false)
const tenantLoading = ref(false)
const selectedVolumeId = ref('')
const selectedArchiveNo = ref('')
const accessRecords = ref<ArchiveVolumeAccessRecordVO[]>([])
const tenantRows = ref<ArchiveVolumeAccessLedgerRowVO[]>([])
const departmentOptions = ref<Array<{ value: string, label: string }>>([])

const volumeFilterModel = reactive({ keyword: '' })
const tenantFilterModel = reactive({
  departmentId: undefined as string | undefined,
  accessStatus: undefined as ArchiveAccessStatusCode | undefined,
})
const tenantPagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const volumeFilterFields: FilterField[] = [
  { key: 'keyword', label: '档案号 / 标题', type: 'input', placeholder: '关键词' },
]

const scopedDepartmentOptions = computed(() =>
  filterListDepartmentOptions(departmentOptions.value),
)

const tenantDepartmentDisabled = computed(() =>
  listScopedDepartmentIds.value.length === 1,
)

const tenantFilterFields = computed<FilterField[]>(() => [
  {
    key: 'departmentId',
    label: '学院',
    type: 'select',
    options: scopedDepartmentOptions.value,
    allowClear: !tenantDepartmentDisabled.value,
    disabled: tenantDepartmentDisabled.value,
  },
  {
    key: 'accessStatus',
    label: '查阅状态',
    type: 'select',
    options: Object.entries(ARCHIVE_ACCESS_STATUS_LABEL).map(([value, label]) => ({ value, label })),
    allowClear: true,
  },
])

const volumeAccessColumns: ColumnsType<ArchiveVolumeAccessRecordVO> = [
  { title: '状态', key: 'accessStatus', width: 100 },
  { title: '查阅原因', dataIndex: 'accessReason' },
  { title: '最近阅读页', dataIndex: 'lastReadPage', width: 100 },
  { title: '批准时间', key: 'approvedTime', width: 160 },
  { title: '过期时间', key: 'expireTime', width: 160 },
]

const tenantAccessColumns: ColumnsType<ArchiveVolumeAccessLedgerRowVO> = [
  { title: '档案号', dataIndex: 'archiveNo', width: 140 },
  { title: '院系', dataIndex: 'departmentName', width: 140 },
  { title: '最近阅读页', dataIndex: 'lastReadPage', width: 100 },
  { title: '状态', key: 'accessStatus', width: 100 },
  { title: '查阅原因', dataIndex: 'accessReason' },
  { title: '申请时间', key: 'createTime', width: 160 },
]

function accessStatusLabel(code: ArchiveAccessStatusCode) {
  return strictEnumLabel(ARCHIVE_ACCESS_STATUS_LABEL, code, 'accessStatus')
}

function accessStatusTone(code: ArchiveAccessStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_ACCESS_STATUS_TONE, code, 'accessStatus')
}

function applyScopedDepartmentDefault() {
  const scopeIds = listScopedDepartmentIds.value
  if (scopeIds.length === 1) {
    tenantFilterModel.departmentId = scopeIds[0]
  }
}

async function loadDepartments() {
  const departments = requireArrayResult<TenantSchoolDepartmentDto>(
    await departmentCatalogApi.list(),
    '院系',
  )
  departmentOptions.value = departments.map(item => ({
    value: item.id,
    label: item.deptName,
  }))
  applyScopedDepartmentDefault()
}

async function locateVolume() {
  const keyword = volumeFilterModel.keyword.trim()
  if (!keyword) {
    message.warning('请输入关键词')
    return
  }
  volumeLoading.value = true
  try {
    const page = await pageArchiveVolumes({ keyword, pageNum: 1, pageSize: 1 })
    const list = readPageList(page, '归档卷查询异常')
    const volume: ArchiveVolumeVO | undefined = list[0]
    if (!volume) {
      message.warning('未找到匹配的归档卷')
      selectedVolumeId.value = ''
      selectedArchiveNo.value = ''
      accessRecords.value = []
      return
    }
    selectedVolumeId.value = volume.volumeId
    selectedArchiveNo.value = volume.archiveNo
    accessRecords.value = await listArchiveVolumeAccessRecords(volume.volumeId)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    volumeLoading.value = false
  }
}

async function loadTenantLedger() {
  tenantLoading.value = true
  try {
    const result = await pageAccessLedger({
      departmentId: tenantFilterModel.departmentId,
      accessStatus: tenantFilterModel.accessStatus,
      pageNum: tenantPagination.pageNum,
      pageSize: tenantPagination.pageSize,
    })
    tenantRows.value = readPageList(result, '查阅利用台账异常')
    tenantPagination.total = readPageTotal(result)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    tenantLoading.value = false
  }
}

function handleVolumeReset() {
  volumeFilterModel.keyword = ''
  selectedVolumeId.value = ''
  selectedArchiveNo.value = ''
  accessRecords.value = []
}

function handleTenantReset() {
  tenantFilterModel.accessStatus = undefined
  tenantFilterModel.departmentId = tenantDepartmentDisabled.value
    ? listScopedDepartmentIds.value[0]
    : undefined
  tenantPagination.pageNum = 1
  tenantRows.value = []
  tenantPagination.total = 0
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goDetail() {
  if (!selectedVolumeId.value) return
  void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId: selectedVolumeId.value } })
}

watch(ledgerTab, (tab) => {
  if (tab === 'tenant' && tenantRows.value.length === 0 && !grantsLoadFailed.value) {
    void loadTenantLedger()
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
.archive-volume-ledger__tabs {
  margin-top: var(--dp-space-2, 8px);
}

.archive-volume-ledger__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--dp-space-4, 16px) 0;
}

.archive-volume-ledger__title {
  font-weight: 600;
  font-size: 16px;
}
</style>
