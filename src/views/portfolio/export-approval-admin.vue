<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExportApprovalVO } from '@/apis/portfolio/governance'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import type { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_EXPORT_APPROVAL_STATUS_CODES,
  PortfolioExportApprovalStatusCode,
  PortfolioExportApprovalStatusDescription,
} from '@/types/enums/portfolio-export-approval-status-enum'
import { PortfolioExportTypeDescription } from '@/types/enums/portfolio-export-type-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

interface ExportFilterModel extends Record<string, unknown> {
  approvalStatus?: PortfolioExportApprovalStatusCode
  applicantUserId?: string
}

const loading = ref(false)
const rows = ref<PortfolioExportApprovalVO[]>([])
const total = ref(0)
const approveLoading = ref(false)
const rejectModalOpen = ref(false)
const rejectReason = ref('')
const pendingRow = ref<PortfolioExportApprovalVO | null>(null)

const filterForm = reactive<ExportFilterModel>({
  approvalStatus: PortfolioExportApprovalStatusCode.PENDING,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed(() => [
  {
    key: 'approvalStatus',
    type: 'select' as const,
    label: '审批状态',
    allowClear: true,
    width: 160,
    options: ALL_PORTFOLIO_EXPORT_APPROVAL_STATUS_CODES.map((code) => ({
      value: code,
      label: PortfolioExportApprovalStatusDescription[code],
    })),
  },
  {
    key: 'applicantUserId',
    type: 'input' as const,
    label: '申请人 ID',
    width: 160,
    placeholder: '用户 ID',
  },
])

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const columns: ColumnsType = [
  { title: '申请时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '申请人', dataIndex: 'applicantUserId', key: 'applicantUserId', width: 120 },
  { title: '导出类型', key: 'exportType', width: 140 },
  { title: '用途说明', dataIndex: 'exportPurpose', key: 'exportPurpose', ellipsis: true },
  { title: '状态', key: 'approvalStatus', width: 100 },
  { title: '审批人', dataIndex: 'approverUserId', key: 'approverUserId', width: 120 },
  { title: '审批时间', dataIndex: 'approvedTime', key: 'approvedTime', width: 170 },
  { title: '操作', key: 'actions', width: 140 },
]

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: total.value,
  showSizeChanger: true,
}))

function exportTypeLabel(code: string): string {
  return strictEnumLabel(
    PortfolioExportTypeDescription,
    code as PortfolioExportTypeCode,
    '导出类型',
  )
}

function approvalStatusLabel(code: string): string {
  return strictEnumLabel(
    PortfolioExportApprovalStatusDescription,
    code as PortfolioExportApprovalStatusCode,
    '审批状态',
  )
}

function approvalStatusTone(code: string): 'blue' | 'green' | 'red' | 'gray' {
  switch (code) {
    case PortfolioExportApprovalStatusCode.PENDING:
      return 'blue'
    case PortfolioExportApprovalStatusCode.APPROVED:
    case PortfolioExportApprovalStatusCode.DOWNLOADED:
      return 'green'
    case PortfolioExportApprovalStatusCode.REJECTED:
      return 'red'
    default:
      return 'gray'
  }
}

async function loadPage() {
  loading.value = true
  try {
    const result = await portfolioSecurityApi.pageExport({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      approvalStatus: filterForm.approvalStatus,
      applicantUserId: filterForm.applicantUserId?.trim() || undefined,
    })
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    rows.value = []
    total.value = 0
    showUserError(error, '加载导出审批失败')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function onTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  query.pageNum = pageNum
  query.pageSize = pageSize
  void loadPage()
}

async function approveRow(row: PortfolioExportApprovalVO) {
  approveLoading.value = true
  try {
    await portfolioSecurityApi.approveExport({ id: row.id, approved: true })
    message.success('已批准导出申请')
    await loadPage()
  } catch (error) {
    showUserError(error, '批准失败')
  } finally {
    approveLoading.value = false
  }
}

function openRejectModal(row: PortfolioExportApprovalVO) {
  pendingRow.value = row
  rejectReason.value = ''
  rejectModalOpen.value = true
}

async function submitReject() {
  if (!pendingRow.value) {
    return
  }
  const reason = rejectReason.value.trim()
  if (!reason) {
    message.warning('请填写驳回原因')
    return
  }
  approveLoading.value = true
  try {
    await portfolioSecurityApi.approveExport({
      id: pendingRow.value.id,
      approved: false,
      rejectReason: reason,
    })
    message.success('已驳回导出申请')
    rejectModalOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '驳回失败')
  } finally {
    approveLoading.value = false
  }
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="导出审批"
        subtitle="档案袋敏感数据导出须审批后下载"
      />
    </template>
    <UiCard>
      <UiFilterBar v-model="filterModel" :fields="filterFields" @search="onSearch" />
      <UiDataTable
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'exportType'">
            {{ exportTypeLabel(record.exportType) }}
          </template>
          <template v-else-if="column.key === 'approvalStatus'">
            <UiTag :tone="approvalStatusTone(record.approvalStatus)">
              {{ approvalStatusLabel(record.approvalStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="record.approvalStatus === PortfolioExportApprovalStatusCode.PENDING"
              :items="[
                { key: 'approve', label: '批准' },
                { key: 'reject', label: '驳回', tone: 'danger' },
              ]"
              @action="(key) => (key === 'approve' ? approveRow(record) : openRejectModal(record))"
            />
            <span v-else-if="record.rejectReason" class="export-approval-admin__reject-reason">
              {{ record.rejectReason }}
            </span>
          </template>
        </template>
        <template #emptyText>
          <UiEmpty description="暂无导出审批记录" />
        </template>
      </UiDataTable>
    </UiCard>
    <a-modal
      v-model:open="rejectModalOpen"
      title="驳回导出申请"
      :confirm-loading="approveLoading"
      @ok="submitReject"
    >
      <a-textarea v-model:value="rejectReason" placeholder="请填写驳回原因" :rows="4" />
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped>
.export-approval-admin__reject-reason {
  color: var(--nybc-text-secondary, #666);
  font-size: 12px;
}
</style>
