<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="查阅台账" subtitle="历史归档">
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <WorkbenchSurfaceCard flush class="archive-volume-ledger__surface">
      <template #head>
        <UiSectionTabs v-model="ledgerTab" :items="ledgerTabs" compact />
      </template>

      <div v-if="ledgerTab === 'volume'" class="archive-volume-ledger__pane">
        <UiFilterBar
          v-model="volumeFilterModel"
          :fields="volumeFilterFields"
          variant="panel"
          show-labels
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

          <UiEmpty v-if="!volumeLoading && accessRecords.length === 0" description="该卷暂无查阅记录" />
          <div v-else class="archive-volume-ledger__cards">
            <article
              v-for="record in accessRecords"
              :key="record.accessRecordId"
              class="approval-card"
              :class="archiveAccessApprovalCardClass(record.accessStatus)"
            >
              <div class="approval-card__head">
                <span class="approval-card__applicant">
                  {{ archiveAccessApplicantLabel(
                    record.applicantNickName,
                    record.applicantIdentifier,
                    record.applicantUserId,
                  ) }}
                </span>
                <UiTag :tone="archiveAccessStatusTone(record.accessStatus)" size="sm">
                  {{ archiveAccessStatusLabel(record.accessStatus) }}
                </UiTag>
                <span class="approval-card__time">{{ formatDateTime(record.createTime) }}</span>
              </div>
              <p v-if="record.accessReason" class="approval-card__reason">{{ record.accessReason }}</p>
              <p class="approval-card__meta">
                <span v-if="record.departmentName">{{ record.departmentName }}</span>
                <span v-if="record.approverNickName"> · 审批: {{ record.approverNickName }}</span>
                <span v-if="record.expireTime"> · 到期: {{ formatDateTime(record.expireTime) }}</span>
              </p>
              <p
                v-if="record.decisionComment && record.accessStatus === 'REJECTED'"
                class="approval-card__reject"
              >
                拒绝原因: {{ record.decisionComment }}
              </p>
              <p
                v-if="record.accessStatus === 'ACTIVE' && record.lastReadPage != null"
                class="approval-card__meta"
              >
                最后阅读: 第 {{ record.lastReadPage }} 页
                <span v-if="record.downloadCount != null"> · 下载次数: {{ record.downloadCount }}</span>
              </p>
            </article>
          </div>
        </template>
      </div>

      <div v-else class="archive-volume-ledger__pane">
        <UiFilterBar
          v-model="tenantFilterModel"
          :fields="tenantFilterFields"
          variant="panel"
          show-labels
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
              <UiTag :tone="archiveAccessStatusTone(record.accessStatus)" size="sm">
                {{ archiveAccessStatusLabel(record.accessStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'applicant'">
              {{ archiveAccessApplicantLabel(
                record.applicantNickName,
                record.applicantIdentifier,
                record.applicantUserId,
              ) }}
            </template>
            <template v-else-if="column.key === 'approver'">
              {{ record.approverNickName || record.approverUserId || '—' }}
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatDateTime(record.createTime) }}
            </template>
          </template>
        </UiDataTable>
      </div>
    </WorkbenchSurfaceCard>

    <ArchiveVolumeListNextStepsPanel variant="ledger" />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveAccessStatusCode,
  ArchiveVolumeAccessLedgerRowResponse,
  ArchiveVolumeAccessRecordResponse,
  ArchiveVolumeResponse,
} from '@/apis/mark/archive-volume'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_ACCESS_STATUS_OPTIONS,
  listArchiveVolumeAccessRecords,
  pageAccessLedger,
  pageArchiveVolumes,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import {
  archiveAccessApplicantLabel,
  archiveAccessApprovalCardClass,
  archiveAccessStatusLabel,
  archiveAccessStatusTone,
} from '@/utils/archive-access-record-ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import ArchiveVolumeListNextStepsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeListNextStepsPanel.vue'

defineOptions({ name: 'TeacherArchiveVolumeLedger' })

const router = useRouter()
const { grantsLoadFailed, listScopedDepartmentIds, filterListDepartmentOptions, loadGrants }
  = useArchiveDutyAccess()

const ledgerTab = ref('volume')
const ledgerTabs = [
  { key: 'volume', label: '单卷台账' },
  { key: 'tenant', label: '租户台账' },
]
const volumeLoading = ref(false)
const tenantLoading = ref(false)
const selectedVolumeId = ref('')
const selectedArchiveNo = ref('')
const accessRecords = ref<ArchiveVolumeAccessRecordResponse[]>([])
const tenantRows = ref<ArchiveVolumeAccessLedgerRowResponse[]>([])
const departmentOptions = ref<Array<{ value: string, label: string }>>([])

interface ArchiveVolumeAccessLedgerVolumeFilterForm extends Record<string, unknown> {
  keyword: string
}

const volumeFilterForm = reactive<ArchiveVolumeAccessLedgerVolumeFilterForm>({ keyword: '' })
const volumeFilterModel = computed<Record<string, unknown>>({
  get: () => volumeFilterForm,
  set: (value) => {
    Object.assign(volumeFilterForm, value)
  },
})
interface TenantFilterForm extends Record<string, unknown> {
  departmentId: string | undefined
  accessStatus?: ArchiveAccessStatusCode
}

const tenantFilterForm = reactive<TenantFilterForm>({
  departmentId: undefined,
})
const tenantFilterModel = computed<Record<string, unknown>>({
  get: () => tenantFilterForm,
  set: (value) => {
    Object.assign(tenantFilterForm, value)
  },
})
const tenantPagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const signalMetrics = computed<SignalMetric[]>(() => {
  if (ledgerTab.value === 'volume') {
    if (!selectedVolumeId.value) return []
    return [{ key: 'records', label: '查阅记录', value: accessRecords.value.length }]
  }
  return tenantPagination.total > 0
    ? [{ key: 'records', label: '租户记录', value: tenantPagination.total }]
    : []
})

const volumeFilterFields: FilterField[] = [
  { key: 'keyword', label: '档案号 / 标题', type: 'input', placeholder: '关键词' },
]

const scopedDepartmentOptions = computed(() => filterListDepartmentOptions(departmentOptions.value))

const tenantDepartmentDisabled = computed(() => listScopedDepartmentIds.value.length === 1)

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
    options: ARCHIVE_ACCESS_STATUS_OPTIONS,
    allowClear: true,
  },
])

const tenantAccessColumns: ColumnsType<ArchiveVolumeAccessLedgerRowResponse> = [
  { title: '档案号', dataIndex: 'archiveNo', width: 140 },
  { title: '院系', dataIndex: 'departmentName', width: 140 },
  { title: '申请人', key: 'applicant', width: 120 },
  { title: '审批人', key: 'approver', width: 120 },
  { title: '最近阅读页', dataIndex: 'lastReadPage', width: 100 },
  { title: '状态', key: 'accessStatus', width: 100 },
  { title: '查阅原因', dataIndex: 'accessReason' },
  { title: '审批意见', dataIndex: 'decisionComment', ellipsis: true },
  { title: '申请时间', key: 'createTime', width: 160 },
]

function applyScopedDepartmentDefault() {
  const scopeIds = listScopedDepartmentIds.value
  if (scopeIds.length === 1) {
    tenantFilterForm.departmentId = scopeIds[0]
  }
}

async function loadDepartments() {
  const departments = await departmentCatalogApi.list()
  departmentOptions.value = departments.map((item) => ({
    value: item.id,
    label: item.deptName,
  }))
  applyScopedDepartmentDefault()
}

async function locateVolume() {
  const keyword = volumeFilterForm.keyword.trim()
  if (!keyword) {
    message.warning('请输入关键词')
    return
  }
  volumeLoading.value = true
  try {
    const page = await pageArchiveVolumes({ keyword, pageNum: 1, pageSize: 1 })
    const list = readPageList(page, '归档卷查询异常')
    const volume: ArchiveVolumeResponse | undefined = list[0]
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
  } catch (error) {
    showUserError(error)
  } finally {
    volumeLoading.value = false
  }
}

async function loadTenantLedger() {
  tenantLoading.value = true
  try {
    const result = await pageAccessLedger({
      departmentId: tenantFilterForm.departmentId,
      accessStatus: tenantFilterForm.accessStatus,
      pageNum: tenantPagination.pageNum,
      pageSize: tenantPagination.pageSize,
    })
    tenantRows.value = readPageList(result, '查阅利用台账异常')
    tenantPagination.total = readPageTotal(result)
  } catch (error) {
    showUserError(error, '加载查阅台账失败')
  } finally {
    tenantLoading.value = false
  }
}

function handleVolumeReset() {
  volumeFilterForm.keyword = ''
  selectedVolumeId.value = ''
  selectedArchiveNo.value = ''
  accessRecords.value = []
}

function handleTenantReset() {
  tenantFilterForm.accessStatus = undefined
  tenantFilterForm.departmentId = tenantDepartmentDisabled.value
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
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId: selectedVolumeId.value },
  })
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

.archive-volume-ledger__cards {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
}
</style>
