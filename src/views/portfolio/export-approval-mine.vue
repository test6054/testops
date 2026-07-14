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
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import {
  PortfolioExportApprovalStatusCode,
  PortfolioExportApprovalStatusDescription,
} from '@/types/enums/portfolio-export-approval-status-enum'
import { PortfolioExportTypeDescription } from '@/types/enums/portfolio-export-type-enum'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const userStore = useUserStore()
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const downloadLoading = ref(false)
const rows = ref<PortfolioExportApprovalVO[]>([])
const total = ref(0)

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const columns: ColumnsType = [
  { title: '申请时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '导出类型', key: 'exportType', width: 140 },
  { title: '用途说明', dataIndex: 'exportPurpose', key: 'exportPurpose', ellipsis: true },
  { title: '状态', key: 'approvalStatus', width: 100 },
  { title: '审批时间', dataIndex: 'approvedTime', key: 'approvedTime', width: 170 },
  { title: '过期时间', dataIndex: 'expireTime', key: 'expireTime', width: 170 },
  { title: '文件', key: 'fileName', width: 140, ellipsis: true },
  { title: '操作', key: 'actions', width: 100 },
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
    case PortfolioExportApprovalStatusCode.REVOKED:
      return 'red'
    case PortfolioExportApprovalStatusCode.EXPIRED:
    default:
      return 'gray'
  }
}

function canDownload(row: PortfolioExportApprovalVO): boolean {
  return (
    (row.approvalStatus === PortfolioExportApprovalStatusCode.APPROVED
      || row.approvalStatus === PortfolioExportApprovalStatusCode.DOWNLOADED)
    && Boolean(row.fileNodeId)
  )
}

async function loadPage() {
  beginLoad()
  const applicantUserId = userStore.userInfo.userId
  if (!applicantUserId) {
    rows.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const result = await portfolioSecurityApi.pageExport({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      applicantUserId,
    })
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  
    okLoad()
  } catch (error) {
    failLoad()
    rows.value = []
    total.value = 0
    showUserError(error, '加载失败')
  } finally {
    loading.value = false
  }
}

function onTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  query.pageNum = pageNum
  query.pageSize = pageSize
  void loadPage()
}

async function downloadRow(row: PortfolioExportApprovalVO) {
  if (!row.fileNodeId) {
    message.warning('审批产物尚未生成')
    return
  }
  downloadLoading.value = true
  try {
    const result = await portfolioSecurityApi.downloadExport({ id: row.id })
    if (!result.fileNodeId) {
      message.warning('审批产物尚未生成')
      return
    }
    await downloadPortfolioExcelExport({
      fileNodeId: result.fileNodeId,
      fileName: result.fileName ?? `档案袋导出-${row.id}.xlsx`,
    })
    message.success('已开始下载')
    await loadPage()
  } catch (error) {
    showUserError(error, '下载失败')
  } finally {
    downloadLoading.value = false
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
        title="我的导出申请"
        subtitle="审批通过后可在此下载导出文件"
      />
    </template>
    <UiCard>
      <UiDataTable
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
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
          <template v-else-if="column.key === 'fileName'">
            {{ record.fileName || '—' }}
          </template>
          <template v-else-if="column.key === 'expireTime'">
            {{ record.expireTime || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="canDownload(record)"
              :items="[{ key: 'download', label: '下载' }]"
              @action="() => downloadRow(record)"
            />
            <span v-else-if="record.revokeReason || record.rejectReason" class="export-approval-mine__reject-reason">
              {{ record.revokeReason || record.rejectReason }}
            </span>
          </template>
        </template>
        <template #emptyText>
          <UiEmpty description="暂无导出申请" />
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.export-approval-mine__reject-reason {
  color: var(--nybc-text-secondary, #666);
  font-size: 12px;
}
</style>
