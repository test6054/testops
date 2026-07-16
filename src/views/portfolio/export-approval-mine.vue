<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExportApprovalVO } from '@/apis/portfolio/governance'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import UiButton from '@/components/ui-guide/ui/Button.vue'
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
import {
  PortfolioExportTypeCode,
  PortfolioExportTypeDescription,
} from '@/types/enums/portfolio-export-type-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const userStore = useUserStore()
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const downloadLoading = ref(false)
const applyOpen = ref(false)
const applying = ref(false)
const revokeOpen = ref(false)
const revokeLoading = ref(false)
const revokeReason = ref('')
const revokeTarget = ref<PortfolioExportApprovalVO | null>(null)
const rows = ref<PortfolioExportApprovalVO[]>([])
const total = ref(0)
const applyForm = reactive<{
  academicYear: string
  semester?: SemesterCode
  exportPurpose: string
}>({
  academicYear: '',
  semester: undefined,
  exportPurpose: '',
})

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

function canRevoke(row: PortfolioExportApprovalVO): boolean {
  return (
    row.approvalStatus === PortfolioExportApprovalStatusCode.APPROVED
    || row.approvalStatus === PortfolioExportApprovalStatusCode.DOWNLOADED
  )
}

function openRevoke(row: PortfolioExportApprovalVO) {
  revokeTarget.value = row
  revokeReason.value = ''
  revokeOpen.value = true
}

async function submitRevoke() {
  const target = revokeTarget.value
  const reason = revokeReason.value.trim()
  if (!target || !reason) {
    showFormValidationMessage('请填写撤销原因')
    return
  }
  revokeLoading.value = true
  try {
    await portfolioSecurityApi.revokeExport({ id: target.id, revokeReason: reason })
    message.success('导出产物已撤销')
    revokeOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '撤销导出产物失败')
  } finally {
    revokeLoading.value = false
  }
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
    showFormValidationMessage('审批产物尚未生成')
    return
  }
  downloadLoading.value = true
  try {
    const result = await portfolioSecurityApi.downloadExport({ id: row.id })
    if (!result.fileNodeId) {
      showFormValidationMessage('审批产物尚未生成')
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

function openApply() {
  applyForm.academicYear = ''
  applyForm.semester = undefined
  applyForm.exportPurpose = ''
  applyOpen.value = true
}

async function submitApply() {
  const applicantUserId = userStore.userInfo.userId
  const academicYear = applyForm.academicYear.trim()
  const exportPurpose = applyForm.exportPurpose.trim()
  if (!applicantUserId) {
    showFormValidationMessage('当前登录用户信息尚未就绪')
    return
  }
  if (academicYear && !/^\d{4}-\d{4}$/.test(academicYear)) {
    showFormValidationMessage('学年格式应为四位年起止年，中间用短横线连接')
    return
  }
  if (!exportPurpose) {
    showFormValidationMessage('请填写导出用途')
    return
  }
  applying.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.TEACHER_ARCHIVE,
      businessRefJson: JSON.stringify({
        teacherId: applicantUserId,
        academicYear: academicYear || undefined,
        semester: applyForm.semester,
      }),
      exportPurpose,
    })
    message.success('档案包导出申请已提交')
    applyOpen.value = false
    query.pageNum = 1
    await loadPage()
  } catch (error) {
    showUserError(error, '提交导出申请失败')
  } finally {
    applying.value = false
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
      >
        <template #actions>
          <UiButton variant="primary" :disabled="downloadLoading || applying" @click="openApply">
            申请导出档案包
          </UiButton>
        </template>
      </ContextBar>
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
              v-if="canDownload(record) || canRevoke(record)"
              :items="[
                { key: 'download', label: '下载', hidden: !canDownload(record) },
                { key: 'revoke', label: '撤销', tone: 'danger', hidden: !canRevoke(record) },
              ]"
              @action="(key) => (key === 'download' ? downloadRow(record) : openRevoke(record))"
            />
            <span
              v-else-if="record.revokeReason || record.rejectReason"
              class="export-approval-mine__reject-reason"
            >
              {{ record.revokeReason || record.rejectReason }}
            </span>
          </template>
        </template>
        <template #emptyText>
          <UiEmpty description="暂无导出申请" />
        </template>
      </UiDataTable>
    </UiCard>
    <a-modal
      v-model:open="applyOpen"
      title="申请导出本人教学档案包"
      :confirm-loading="applying"
      :closable="!applying"
      :mask-closable="!applying"
      :cancel-button-props="{ disabled: applying }"
      @ok="submitApply"
    >
      <a-form layout="vertical">
        <a-form-item label="学年筛选">
          <a-input
            v-model:value="applyForm.academicYear"
            placeholder="例如 2025-2026；留空导出全部学年"
            :disabled="applying"
          />
        </a-form-item>
        <a-form-item label="学期筛选">
          <a-select
            v-model:value="applyForm.semester"
            allow-clear
            placeholder="全部学期"
            :options="SemesterOptions"
            :disabled="applying"
          />
        </a-form-item>
        <a-form-item label="导出用途" required>
          <a-textarea
            v-model:value="applyForm.exportPurpose"
            :rows="3"
            placeholder="说明材料使用场景，审批通过后产物将带审批水印"
            :disabled="applying"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:open="revokeOpen"
      title="撤销导出产物"
      :confirm-loading="revokeLoading"
      :closable="!revokeLoading"
      :mask-closable="!revokeLoading"
      :cancel-button-props="{ disabled: revokeLoading }"
      @ok="submitRevoke"
    >
      <a-textarea
        v-model:value="revokeReason"
        :maxlength="500"
        :rows="4"
        placeholder="填写撤销原因，撤销后文件将不可继续下载"
        :disabled="revokeLoading"
      />
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped>
.export-approval-mine__reject-reason {
  color: var(--nybc-text-secondary, #666);
  font-size: 12px;
}
</style>
