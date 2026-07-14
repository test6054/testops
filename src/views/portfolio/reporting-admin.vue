<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioReportingPreviewVO,
  PortfolioReportingTaskVO,
} from '@/apis/portfolio/reporting'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioReportingApi } from '@/apis/portfolio/reporting'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_REPORTING_SCOPE_TYPE_CODES,
  PortfolioReportingScopeTypeCode,
  PortfolioReportingScopeTypeDescription,
} from '@/types/enums/portfolio-reporting-scope-type-enum'
import {
  ALL_PORTFOLIO_REPORTING_TASK_STATUS_CODES,
  PortfolioReportingTaskStatusCode,
  PortfolioReportingTaskStatusDescription,
} from '@/types/enums/portfolio-reporting-task-status-enum'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

interface ReportingFilterModel extends Record<string, unknown> {
  taskStatus?: PortfolioReportingTaskStatusCode
}

const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const createLoading = ref(false)
const actionLoading = ref(false)
const rows = ref<PortfolioReportingTaskVO[]>([])
const total = ref(0)
const createOpen = ref(false)
const previewOpen = ref(false)
const rejectOpen = ref(false)
const rejectReason = ref('')
const pendingRejectRow = ref<PortfolioReportingTaskVO | null>(null)
const preview = ref<PortfolioReportingPreviewVO | null>(null)
const previewTaskId = ref('')

const filterForm = reactive<ReportingFilterModel>({})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed(() => [
  {
    key: 'taskStatus',
    type: 'select' as const,
    label: '任务状态',
    allowClear: true,
    width: 160,
    options: ALL_PORTFOLIO_REPORTING_TASK_STATUS_CODES.map(code => ({
      value: code,
      label: PortfolioReportingTaskStatusDescription[code],
    })),
  },
])

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const createForm = reactive({
  taskTitle: '',
  reportPurpose: '',
  shareFieldsText: 'teacherLabel,officialArchiveCount',
  scopeType: PortfolioReportingScopeTypeCode.SCHOOL as PortfolioReportingScopeTypeCode,
  departmentId: '',
  maskMode: true,
})

const columns: ColumnsType = [
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '标题', dataIndex: 'taskTitle', key: 'taskTitle', width: 180, ellipsis: true },
  { title: '用途', dataIndex: 'reportPurpose', key: 'reportPurpose', ellipsis: true },
  { title: '范围', key: 'scopeType', width: 100 },
  { title: '脱敏', key: 'maskMode', width: 80 },
  { title: '状态', key: 'taskStatus', width: 110 },
  { title: '报送时间', dataIndex: 'submitTime', key: 'submitTime', width: 170 },
  { title: '产物', dataIndex: 'artifactFileName', key: 'artifactFileName', width: 160, ellipsis: true },
  { title: '操作', key: 'actions', width: 240 },
]

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: total.value,
  showSizeChanger: true,
}))

function statusLabel(code: string): string {
  return strictEnumLabel(
    PortfolioReportingTaskStatusDescription,
    code as PortfolioReportingTaskStatusCode,
    '报送状态',
  )
}

function scopeLabel(code: string): string {
  return strictEnumLabel(
    PortfolioReportingScopeTypeDescription,
    code as PortfolioReportingScopeTypeCode,
    '报送范围',
  )
}

function statusTone(code: string): 'blue' | 'green' | 'red' | 'gray' {
  switch (code) {
    case PortfolioReportingTaskStatusCode.DRAFT:
    case PortfolioReportingTaskStatusCode.PENDING_APPROVAL:
      return 'blue'
    case PortfolioReportingTaskStatusCode.APPROVED:
    case PortfolioReportingTaskStatusCode.SUBMITTED:
      return 'green'
    case PortfolioReportingTaskStatusCode.REJECTED:
      return 'red'
    default:
      return 'gray'
  }
}

function canPreview(row: PortfolioReportingTaskVO): boolean {
  return row.taskStatus === PortfolioReportingTaskStatusCode.DRAFT
    || row.taskStatus === PortfolioReportingTaskStatusCode.REJECTED
}

function canRequestApproval(row: PortfolioReportingTaskVO): boolean {
  return canPreview(row) && Boolean(row.previewJson)
}

function canApprove(row: PortfolioReportingTaskVO): boolean {
  return row.taskStatus === PortfolioReportingTaskStatusCode.PENDING_APPROVAL
}

function canDownload(row: PortfolioReportingTaskVO): boolean {
  return row.taskStatus === PortfolioReportingTaskStatusCode.SUBMITTED
    && Boolean(row.artifactFileNodeId)
}

function parseShareFields(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

async function loadPage() {
  beginLoad()
  loading.value = true
  try {
    const result = await portfolioReportingApi.page({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      taskStatus: filterForm.taskStatus,
    })
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  
    okLoad()
  } catch (error) {
    failLoad()
    rows.value = []
    total.value = 0
    showUserError(error, '加载报送任务失败')
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

function openCreateModal() {
  createForm.taskTitle = ''
  createForm.reportPurpose = ''
  createForm.shareFieldsText = 'teacherLabel,officialArchiveCount'
  createForm.scopeType = PortfolioReportingScopeTypeCode.SCHOOL
  createForm.departmentId = ''
  createForm.maskMode = true
  createOpen.value = true
}

async function submitCreate() {
  const shareFields = parseShareFields(createForm.shareFieldsText)
  if (!createForm.taskTitle.trim() || !createForm.reportPurpose.trim() || shareFields.length === 0) {
    message.warning('请填写标题、用途与共享字段')
    return
  }
  if (
    createForm.scopeType === PortfolioReportingScopeTypeCode.DEPARTMENT
    && !createForm.departmentId.trim()
  ) {
    message.warning('院系报送须填写院系 ID')
    return
  }
  createLoading.value = true
  try {
    await portfolioReportingApi.create({
      taskTitle: createForm.taskTitle.trim(),
      reportPurpose: createForm.reportPurpose.trim(),
      shareFields,
      scopeType: createForm.scopeType,
      departmentId: createForm.scopeType === PortfolioReportingScopeTypeCode.DEPARTMENT
        ? createForm.departmentId.trim()
        : undefined,
      maskMode: createForm.maskMode,
    })
    message.success('已创建报送任务')
    createOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '创建报送任务失败')
  } finally {
    createLoading.value = false
  }
}

async function runPreview(row: PortfolioReportingTaskVO) {
  actionLoading.value = true
  try {
    const result = await portfolioReportingApi.preview({ id: row.id })
    preview.value = result
    previewTaskId.value = row.id
    previewOpen.value = true
    await loadPage()
  } catch (error) {
    showUserError(error, '报送预览失败')
  } finally {
    actionLoading.value = false
  }
}

async function runRequestApproval(row: PortfolioReportingTaskVO) {
  actionLoading.value = true
  try {
    await portfolioReportingApi.requestApproval({ id: row.id })
    message.success('已提交审批')
    await loadPage()
  } catch (error) {
    showUserError(error, '提交审批失败')
  } finally {
    actionLoading.value = false
  }
}

async function runApprove(row: PortfolioReportingTaskVO) {
  actionLoading.value = true
  try {
    await portfolioReportingApi.approve({ id: row.id })
    message.success('已审批并生成报送清单')
    await loadPage()
  } catch (error) {
    showUserError(error, '审批失败')
  } finally {
    actionLoading.value = false
  }
}

function openReject(row: PortfolioReportingTaskVO) {
  pendingRejectRow.value = row
  rejectReason.value = ''
  rejectOpen.value = true
}

async function submitReject() {
  if (!pendingRejectRow.value) {
    return
  }
  const reason = rejectReason.value.trim()
  if (!reason) {
    message.warning('请填写驳回原因')
    return
  }
  actionLoading.value = true
  try {
    await portfolioReportingApi.reject({
      id: pendingRejectRow.value.id,
      rejectReason: reason,
    })
    message.success('已驳回')
    rejectOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '驳回失败')
  } finally {
    actionLoading.value = false
  }
}

async function runDownload(row: PortfolioReportingTaskVO) {
  actionLoading.value = true
  try {
    const result = await portfolioReportingApi.download({ id: row.id })
    await downloadPortfolioExcelExport(result)
    message.success('已开始下载')
  } catch (error) {
    showUserError(error, '下载失败')
  } finally {
    actionLoading.value = false
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
        title="上级报送共享"
        subtitle="正式档案口径清单预览、审批与生成"
      >
        <template #extra>
          <UiButton variant="primary" @click="openCreateModal">
            新建报送
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <UiFilterBar v-model="filterModel" :fields="filterFields" @search="onSearch" />
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
          <template v-if="column.key === 'scopeType'">
            {{ scopeLabel(record.scopeType) }}
          </template>
          <template v-else-if="column.key === 'maskMode'">
            {{ record.maskMode ? '是' : '否' }}
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag :tone="statusTone(record.taskStatus)">
              {{ statusLabel(record.taskStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                ...(canPreview(record) ? [{ key: 'preview', label: '预览' }] : []),
                ...(canRequestApproval(record) ? [{ key: 'request', label: '提交审批' }] : []),
                ...(canApprove(record) ? [{ key: 'approve', label: '审批通过' }] : []),
                ...(canApprove(record) ? [{ key: 'reject', label: '驳回', tone: 'danger' as const }] : []),
                ...(canDownload(record) ? [{ key: 'download', label: '下载' }] : []),
              ]"
              @action="(key) => {
                if (key === 'preview') runPreview(record)
                else if (key === 'request') runRequestApproval(record)
                else if (key === 'approve') runApprove(record)
                else if (key === 'reject') openReject(record)
                else if (key === 'download') runDownload(record)
              }"
            />
          </template>
        </template>
        <template #emptyText>
          <UiEmpty description="暂无报送任务" />
        </template>
      </UiDataTable>
    </UiCard>
    <a-modal
      v-model:open="createOpen"
      title="新建上级报送任务"
      :confirm-loading="createLoading"
      @ok="submitCreate"
    >
      <a-form layout="vertical">
        <a-form-item label="任务标题" required>
          <a-input v-model:value="createForm.taskTitle" />
        </a-form-item>
        <a-form-item label="报送用途" required>
          <a-textarea v-model:value="createForm.reportPurpose" :rows="3" />
        </a-form-item>
        <a-form-item label="共享字段" required>
          <a-input
            v-model:value="createForm.shareFieldsText"
            placeholder="逗号分隔，如 teacherLabel,officialArchiveCount"
          />
        </a-form-item>
        <a-form-item label="范围" required>
          <a-select v-model:value="createForm.scopeType" style="width: 100%">
            <a-select-option
              v-for="code in ALL_PORTFOLIO_REPORTING_SCOPE_TYPE_CODES"
              :key="code"
              :value="code"
            >
              {{ PortfolioReportingScopeTypeDescription[code] }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="createForm.scopeType === PortfolioReportingScopeTypeCode.DEPARTMENT"
          label="院系 ID"
          required
        >
          <a-input v-model:value="createForm.departmentId" />
        </a-form-item>
        <a-form-item label="脱敏">
          <a-switch v-model:checked="createForm.maskMode" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal v-model:open="previewOpen" title="报送预览" :footer="null">
      <template v-if="preview">
        <p>任务 ID：{{ previewTaskId }}</p>
        <p>教师人数：{{ preview.teacherCount }}</p>
        <p>正式档案条数：{{ preview.officialArchiveCount }}</p>
        <p>脱敏：{{ preview.maskMode ? '是' : '否' }}</p>
        <p>口径：{{ preview.dataScopeNote }}</p>
        <p>共享字段：{{ preview.shareFields.join('、') }}</p>
      </template>
    </a-modal>
    <a-modal
      v-model:open="rejectOpen"
      title="驳回报送"
      :confirm-loading="actionLoading"
      @ok="submitReject"
    >
      <a-textarea v-model:value="rejectReason" placeholder="请填写驳回原因" :rows="4" />
    </a-modal>
  </StageWorkbenchShell>
</template>
