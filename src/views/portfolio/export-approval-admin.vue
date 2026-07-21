<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExportApprovalVO } from '@/apis/portfolio/governance'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import type { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { PortfolioExportTypeDescription } from '@/types/enums/portfolio-export-type-enum'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_EXPORT_APPROVAL_STATUS_CODES,
  PortfolioExportApprovalStatusCode,
  PortfolioExportApprovalStatusDescription,
} from '@/types/enums/portfolio-export-approval-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

interface ExportFilterModel extends Record<string, unknown> {
  approvalStatus?: PortfolioExportApprovalStatusCode
  applicantUserId?: string
}

const route = useRoute()
const loading = ref(false)
const loadError = ref(false)
const requestToken = ref(0)
const rows = ref<PortfolioExportApprovalVO[]>([])
const total = ref(0)
const operationKey = ref('')
/** 站内信深链聚焦的导出审批主键。 */
const focusedApprovalId = ref('')
const writing = computed(() => Boolean(operationKey.value))
const approveLoading = computed(() => Boolean(operationKey.value))
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
    label: '申请人编号',
    width: 160,
    placeholder: '用户编号',
  },
])

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const columns: ColumnsType = [
  { title: '申请时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '申请人', dataIndex: 'applicantUserId', key: 'applicantUserId', width: 120 },
  { title: '标的教师', dataIndex: 'subjectTeacherUserId', key: 'subjectTeacherUserId', width: 120 },
  { title: '导出类型', key: 'exportType', width: 140 },
  { title: '用途说明', dataIndex: 'exportPurpose', key: 'exportPurpose', ellipsis: true },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 180 },
  { title: '状态', key: 'approvalStatus', width: 100 },
  { title: '审批人', dataIndex: 'approverUserId', key: 'approverUserId', width: 120 },
  { title: '审批时间', dataIndex: 'approvedTime', key: 'approvedTime', width: 170 },
  { title: '操作', key: 'actions', width: 140 },
]

/** 导出审批状态写必须串行，避免同一待办被批准和驳回两次推进。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

function exportTypeLabel(code?: PortfolioExportTypeCode): string {
  if (!code) return '—'
  return strictEnumLabel(PortfolioExportTypeDescription, code, '导出类型')
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

function readRouteStringParam(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}

function exportApprovalRowClassName(record: PortfolioExportApprovalVO): string {
  if (focusedApprovalId.value && String(record.id) === focusedApprovalId.value) {
    return 'export-approval-admin__row--focus'
  }
  return ''
}

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    id: focusedApprovalId.value || undefined,
    approvalStatus: focusedApprovalId.value ? undefined : filterForm.approvalStatus,
    applicantUserId: filterForm.applicantUserId?.trim() || undefined,
  }
  loading.value = true
  loadError.value = false
  try {
    const result = await portfolioSecurityApi.pageExport(request)
    if (requestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0
    if (focusedApprovalId.value) {
      const hit = rows.value.some((row) => String(row.id) === focusedApprovalId.value)
      if (!hit) {
        void message.warning(
          `深链审批 approvalId=${focusedApprovalId.value} 不在当前结果中，请调整筛选`,
        )
      }
    }
  } catch (error) {
    if (requestToken.value !== currentToken) return
    rows.value = []
    total.value = 0
    loadError.value = true
    showUserError(error, '加载导出审批失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

/**
 * PF-P0-399：站内信 jumpUrl `/portfolio/admin/export-approval?approvalId=`
 * 打开时精确命中审批行，便于管理员立刻批准/驳回。
 */
async function applyExportApprovalDeepLink() {
  const approvalId = readRouteStringParam(route.query.approvalId)
  focusedApprovalId.value = approvalId
  if (approvalId) {
    query.pageNum = 1
    // 深链优先精确 id；清空状态筛选避免 PENDING 默认滤掉已决单
    filterForm.approvalStatus = undefined
  }
  await loadPage()
}

function onSearch() {
  query.pageNum = 1
  focusedApprovalId.value = ''
  void loadPage()
}

function onPageChange(page: { current: number; pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

async function approveRow(row: PortfolioExportApprovalVO) {
  const approvalId = row.id
  const operation = `approve:${approvalId}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认批准敏感数据导出？',
    content: `批准后申请人可按「${exportTypeLabel(row.exportType)}」用途下载数据，操作将写入审计日志。`,
    type: 'warning',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    await portfolioSecurityApi.approveExport({ id: approvalId, approved: true })
    void message.success('已批准导出申请')
    await loadPage()
  } catch (error) {
    showUserError(error, '批准失败')
  } finally {
    endOperation(operation)
  }
}

function openRejectModal(row: PortfolioExportApprovalVO) {
  if (writing.value) return
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
    showFormValidationMessage('请填写驳回原因')
    return
  }
  const approvalId = pendingRow.value.id
  const operation = `reject:${approvalId}`
  if (!beginOperation(operation)) return
  try {
    await portfolioSecurityApi.approveExport({
      id: approvalId,
      approved: false,
      rejectReason: reason,
    })
    void message.success('已驳回导出申请')
    rejectModalOpen.value = false
    pendingRow.value = null
    await loadPage()
  } catch (error) {
    showUserError(error, '驳回失败')
  } finally {
    endOperation(operation)
  }
}

onMounted(() => {
  void applyExportApprovalDeepLink()
})

watch(
  () => route.query.approvalId,
  (next, prev) => {
    if (next === prev) {
      return
    }
    void applyExportApprovalDeepLink()
  },
)
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
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        :row-class-name="exportApprovalRowClassName"
        pagination-mode="server"
        :total="total"
        @page-change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'subjectTeacherUserId'">
            <template v-if="record.subjectTeacherUserId">
              {{
                formatPortfolioTeacherDisplay(
                  record.subjectTeacherName,
                  record.subjectTeacherNumber,
                )
              }}
            </template>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'exportType'">
            {{ exportTypeLabel(record.exportType) }}
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" tone="gray">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              v-if="record.ownerIdentityLayers?.length"
              :layers="record.ownerIdentityLayers"
            />
            <span v-else>—</span>
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
                { key: 'approve', label: '批准', disabled: writing },
                { key: 'reject', label: '驳回', tone: 'danger', disabled: writing },
              ]"
              @action="(key) => (key === 'approve' ? approveRow(record) : openRejectModal(record))"
            />
            <span v-else-if="record.rejectReason" class="export-approval-admin__reject-reason">
              {{ record.rejectReason }}
            </span>
          </template>
        </template>
        <template #emptyText>
          <UiEmpty size="sm" description="暂无导出审批记录" />
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="rejectModalOpen"
      title="驳回导出申请"
      :confirm-loading="approveLoading"
      :closable="!writing"
      :mask-closable="!writing"
      @ok="submitReject"
    >
      <UiTextarea
        size="sm"
        v-model="rejectReason"
        placeholder="请填写驳回原因"
        :rows="4"
        :disabled="writing"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.export-approval-admin__reject-reason {
  color: var(--dp-text-secondary);
  font-size: 12px;
}
</style>
