<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExportApprovalVO } from '@/apis/portfolio/governance'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
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
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)
/** 列表请求隔离，防翻页/刷新旧响应串写 */
const pageRequestToken = ref(0)
/** 站内信深链聚焦的导出审批主键。 */
const focusedApprovalId = ref('')
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
  { title: '标的身份层', key: 'identityLayers', width: 180 },
  { title: '用途说明', dataIndex: 'exportPurpose', key: 'exportPurpose', ellipsis: true },
  { title: '状态', key: 'approvalStatus', width: 100 },
  { title: '审批时间', dataIndex: 'approvedTime', key: 'approvedTime', width: 170 },
  { title: '过期时间', dataIndex: 'expireTime', key: 'expireTime', width: 170 },
  { title: '文件', key: 'fileName', width: 140, ellipsis: true },
  { title: '主行动', key: 'actions', width: 112 },
]

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: total.value,
  showSizeChanger: true,
}))

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

const pagePendingExportCount = computed(() =>
  rows.value.filter((row) => row.approvalStatus === PortfolioExportApprovalStatusCode.PENDING).length,
)

const pageDownloadableCount = computed(() => rows.value.filter((row) => canDownload(row)).length)

const exportSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadError.value && total.value === 0) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'total',
      label: '导出申请',
      value: total.value,
      clickable: true,
    },
  ]
  if (rows.value.length > 0) {
    metrics.push({
      key: 'page-pending',
      label: '本页待审',
      value: pagePendingExportCount.value,
      tone: pagePendingExportCount.value > 0 ? 'orange' : undefined,
      helper: '仅当前页',
    })
    metrics.push({
      key: 'page-ready',
      label: '本页可下载',
      value: pageDownloadableCount.value,
      helper: '仅当前页',
    })
  }
  return applySpotlightEmphasis(metrics, {
    primaryKey:
      pagePendingExportCount.value > 0
        ? 'page-pending'
        : pageDownloadableCount.value > 0
          ? 'page-ready'
          : 'total',
    actionLabel: '刷新',
  })
})

const exportWorkbenchSubtitle = computed(() => {
  if (loadError.value) {
    return '列表加载失败'
  }
  const parts = [`${total.value} 条`]
  if (pagePendingExportCount.value > 0) {
    parts.push(`本页待审 ${pagePendingExportCount.value}`)
  }
  if (pageDownloadableCount.value > 0) {
    parts.push(`可下载 ${pageDownloadableCount.value}`)
  }
  return parts.join(' · ')
})

function onExportSignalClick(_key: string) {
  void loadPage()
}

function openRevoke(row: PortfolioExportApprovalVO) {
  revokeTarget.value = row
  revokeReason.value = ''
  revokeOpen.value = true
}

async function submitRevoke() {
  if (revokeLoading.value) {
    return
  }
  const target = revokeTarget.value
  const reason = revokeReason.value.trim()
  if (!target || !reason) {
    showFormValidationMessage('请填写撤销原因')
    return
  }
  revokeLoading.value = true
  try {
    await portfolioSecurityApi.revokeExport({ id: target.id, revokeReason: reason })
    void message.success('导出产物已撤销')
    revokeOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '撤销导出产物失败')
  } finally {
    revokeLoading.value = false
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
    return 'export-approval-mine__row--focus'
  }
  return ''
}

async function loadPage() {
  beginLoad()
  const applicantUserId = userStore.userInfo.userId
  const currentToken = ++pageRequestToken.value
  if (!applicantUserId) {
    rows.value = []
    total.value = 0
    loading.value = false
    okLoad()
    return
  }
  loading.value = true
  try {
    const result = await portfolioSecurityApi.pageExport({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      id: focusedApprovalId.value || undefined,
      applicantUserId,
    })
    if (currentToken !== pageRequestToken.value) {
      return
    }
    rows.value = result.list ?? []
    total.value = result.total ?? 0
    if (focusedApprovalId.value) {
      const hit = rows.value.some((row) => String(row.id) === focusedApprovalId.value)
      if (!hit) {
        void message.warning(`深链审批 approvalId=${focusedApprovalId.value} 不在当前结果中`)
      }
    }
    okLoad()
  } catch (error) {
    if (currentToken !== pageRequestToken.value) {
      return
    }
    failLoad()
    showUserError(error, '加载失败')
  } finally {
    if (currentToken === pageRequestToken.value) {
      loading.value = false
    }
  }
}

/**
 * PF-P0-399：站内信 jumpUrl `/portfolio/teacher/export-approval?approvalId=`
 * 打开时精确命中本人申请，便于下载或查看驳回原因。
 */
async function applyExportApprovalDeepLink() {
  const approvalId = readRouteStringParam(route.query.approvalId)
  focusedApprovalId.value = approvalId
  if (approvalId) {
    query.pageNum = 1
  }
  await loadPage()
}

function onTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  query.pageNum = pageNum
  query.pageSize = pageSize
  void loadPage()
}

async function downloadRow(row: PortfolioExportApprovalVO) {
  if (downloadLoading.value) {
    return
  }
  if (!row.fileNodeId) {
    showFormValidationMessage('审批产物尚未生成')
    return
  }
  downloadLoading.value = true
  try {
    const authorized = await portfolioSecurityApi.downloadExport({ id: row.id })
    if (!authorized.fileNodeId) {
      showFormValidationMessage('审批产物尚未生成')
      return
    }
    await downloadPortfolioExcelExport({
      fileNodeId: authorized.fileNodeId,
      fileName: authorized.fileName ?? `档案袋导出-${row.id}.xlsx`,
    })
    // 文件已落到客户端后再确认 DOWNLOADED；确认失败保留授权态并可见
    try {
      const confirmed = await portfolioSecurityApi.confirmDownloadExport({ id: row.id })
      const idx = rows.value.findIndex((item) => item.id === row.id)
      if (idx >= 0) {
        rows.value[idx] = confirmed
      }
      void message.success('下载完成')
    } catch (error) {
      showUserError(error, '文件已下载，下载状态确认失败')
    }
    try {
      await loadPage()
    } catch (error) {
      showUserError(error, '列表同步失败')
    }
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
  if (applying.value) {
    return
  }
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
      businessRef: {
        teacherId: applicantUserId,
        academicYear: academicYear || undefined,
        semester: applyForm.semester,
      },
      exportPurpose,
    })
    void message.success('档案包导出申请已提交')
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
        title="我的导出申请"
        :subtitle="exportWorkbenchSubtitle"
      >
        <template #actions>
          <UiButton
            size="sm"
            variant="primary"
            :disabled="downloadLoading || applying"
            @click="openApply"
          >
            申请导出档案包
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="exportSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="exportSignalMetrics"
        @metric-click="onExportSignalClick"
      />
    </template>

    <UiCard>
      <UiDataTable
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        :row-class-name="exportApprovalRowClassName"
        :pagination="pagination"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'exportType'">
            {{ exportTypeLabel(record.exportType) }}
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
          <template v-else-if="column.key === 'fileName'">
            {{ record.fileName || '—' }}
          </template>
          <template v-else-if="column.key === 'expireTime'">
            {{ record.expireTime || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="canDownload(record) || canRevoke(record)"
              :max-visible="2"
              :items="[
                { key: 'download', label: '下载', tone: 'primary', hidden: !canDownload(record) },
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
          <UiEmpty size="sm" description="暂无导出申请" />
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="applyOpen"
      title="申请导出本人教学档案包"
      :confirm-loading="applying"
      :closable="!applying"
      :mask-closable="!applying"
      ok-text="提交申请"
      @ok="submitApply"
    >
      <UiForm layout="vertical">
        <UiFormItem label="学年筛选">
          <UiInput
            size="sm"
            v-model="applyForm.academicYear"
            placeholder="例如 2025-2026；留空导出全部学年"
            :disabled="applying"
          />
        </UiFormItem>
        <UiFormItem label="学期筛选">
          <UiSelect
            size="sm"
            v-model="applyForm.semester"
            allow-clear
            placeholder="全部学期"
            :options="SemesterOptions"
            :disabled="applying"
          />
        </UiFormItem>
        <UiFormItem label="导出用途" required>
          <UiTextarea
            size="sm"
            v-model="applyForm.exportPurpose"
            :rows="3"
            placeholder="说明材料使用场景，审批通过后产物将带审批水印"
            :disabled="applying"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>
    <UiDialog
      v-model:open="revokeOpen"
      title="撤销导出产物"
      :confirm-loading="revokeLoading"
      :closable="!revokeLoading"
      :mask-closable="!revokeLoading"
      ok-text="确认撤销"
      @ok="submitRevoke"
    >
      <UiTextarea
        size="sm"
        v-model="revokeReason"
        :maxlength="500"
        :rows="4"
        placeholder="填写撤销原因，撤销后文件将不可继续下载"
        :disabled="revokeLoading"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.export-approval-mine__reject-reason {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
}
</style>
