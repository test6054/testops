<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioReportingPreviewVO,
  PortfolioReportingShareFieldCodeValue,
  PortfolioReportingTaskVO,
} from '@/apis/portfolio/reporting'
import {
  ALL_PORTFOLIO_REPORTING_SHARE_FIELD_CODES,
  portfolioReportingApi,
  PortfolioReportingShareFieldCode,
  PortfolioReportingShareFieldDescription,
} from '@/apis/portfolio/reporting'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
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

interface ReportingCreateForm {
  taskTitle: string
  reportPurpose: string
  shareFields: PortfolioReportingShareFieldCodeValue[]
  scopeType: PortfolioReportingScopeTypeCode
  departmentId: string
  maskMode: boolean
}

const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const operationKey = ref('')
const operating = computed(() => Boolean(operationKey.value))
const createLoading = computed(() => operationKey.value === 'task:create')
const actionLoading = computed(() => Boolean(operationKey.value))
const requestToken = ref(0)
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
    options: ALL_PORTFOLIO_REPORTING_TASK_STATUS_CODES.map((code) => ({
      value: code,
      label: PortfolioReportingTaskStatusDescription[code],
    })),
  },
])

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const createForm = reactive<ReportingCreateForm>({
  taskTitle: '',
  reportPurpose: '',
  shareFields: [
    PortfolioReportingShareFieldCode.TEACHER_LABEL,
    PortfolioReportingShareFieldCode.OFFICIAL_ARCHIVE_COUNT,
  ],
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
  {
    title: '产物',
    dataIndex: 'artifactFileName',
    key: 'artifactFileName',
    width: 160,
    ellipsis: true,
  },
  { title: '操作', key: 'actions', width: 240 },
]

/** 报送任务状态写必须串行，避免预览、审批和驳回跨任务推进。 */
function beginOperation(key: string): boolean {
  if (operating.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

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
  return (
    row.taskStatus === PortfolioReportingTaskStatusCode.DRAFT ||
    row.taskStatus === PortfolioReportingTaskStatusCode.REJECTED
  )
}

function canRequestApproval(row: PortfolioReportingTaskVO): boolean {
  return canPreview(row) && Boolean(row.previewJson)
}

function canApprove(row: PortfolioReportingTaskVO): boolean {
  return row.taskStatus === PortfolioReportingTaskStatusCode.PENDING_APPROVAL
}

function canDownload(row: PortfolioReportingTaskVO): boolean {
  return (
    row.taskStatus === PortfolioReportingTaskStatusCode.SUBMITTED && Boolean(row.artifactFileNodeId)
  )
}

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    taskStatus: filterForm.taskStatus,
  }
  beginLoad()
  loading.value = true
  try {
    const result = await portfolioReportingApi.page(request)
    if (requestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0

    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) return
    failLoad()
    rows.value = []
    total.value = 0
    showUserError(error, '加载报送任务失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function onPageChange(page: { current: number; pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

function openCreateModal() {
  if (operating.value) return
  createForm.taskTitle = ''
  createForm.reportPurpose = ''
  createForm.shareFields = [
    PortfolioReportingShareFieldCode.TEACHER_LABEL,
    PortfolioReportingShareFieldCode.OFFICIAL_ARCHIVE_COUNT,
  ]
  createForm.scopeType = PortfolioReportingScopeTypeCode.SCHOOL
  createForm.departmentId = ''
  createForm.maskMode = true
  createOpen.value = true
}

async function submitCreate() {
  const shareFields = [...createForm.shareFields]
  if (
    !createForm.taskTitle.trim() ||
    !createForm.reportPurpose.trim() ||
    shareFields.length === 0
  ) {
    message.warning('请填写标题、用途与共享字段')
    return
  }
  if (
    createForm.maskMode &&
    shareFields.some(
      (code) =>
        code === PortfolioReportingShareFieldCode.TEACHER_USER_ID ||
        code === PortfolioReportingShareFieldCode.TEACHER_NUMBER,
    )
  ) {
    message.warning('脱敏报送不能共享教师用户 ID 或工号')
    return
  }
  if (
    createForm.scopeType === PortfolioReportingScopeTypeCode.DEPARTMENT &&
    !createForm.departmentId.trim()
  ) {
    message.warning('院系报送须填写院系 ID')
    return
  }
  const operation = 'task:create'
  if (!beginOperation(operation)) return
  const request = {
    taskTitle: createForm.taskTitle.trim(),
    reportPurpose: createForm.reportPurpose.trim(),
    shareFields,
    scopeType: createForm.scopeType,
    departmentId:
      createForm.scopeType === PortfolioReportingScopeTypeCode.DEPARTMENT
        ? createForm.departmentId.trim()
        : undefined,
    maskMode: createForm.maskMode,
  }
  try {
    await portfolioReportingApi.create(request)
    message.success('已创建报送任务')
    createOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '创建报送任务失败')
  } finally {
    endOperation(operation)
  }
}

async function runPreview(row: PortfolioReportingTaskVO) {
  const taskId = row.id
  const operation = `task:preview:${taskId}`
  if (!beginOperation(operation)) return
  preview.value = null
  previewTaskId.value = ''
  try {
    const result = await portfolioReportingApi.preview({ id: taskId })
    preview.value = result
    previewTaskId.value = taskId
    previewOpen.value = true
    await loadPage()
  } catch (error) {
    showUserError(error, '报送预览失败')
  } finally {
    endOperation(operation)
  }
}

async function runRequestApproval(row: PortfolioReportingTaskVO) {
  const taskId = row.id
  const operation = `task:request:${taskId}`
  if (!beginOperation(operation)) return
  try {
    await portfolioReportingApi.requestApproval({ id: taskId })
    message.success('已提交审批')
    await loadPage()
  } catch (error) {
    showUserError(error, '提交审批失败')
  } finally {
    endOperation(operation)
  }
}

async function runApprove(row: PortfolioReportingTaskVO) {
  const taskId = row.id
  const operation = `task:approve:${taskId}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认审批通过并生成报送产物？',
    content: `将按预览口径批准「${row.taskTitle}」并生成正式共享清单，请确认范围与脱敏设置。`,
    type: 'warning',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    await portfolioReportingApi.approve({ id: taskId })
    message.success('已审批并生成报送清单')
    await loadPage()
  } catch (error) {
    showUserError(error, '审批失败')
  } finally {
    endOperation(operation)
  }
}

function openReject(row: PortfolioReportingTaskVO) {
  if (operating.value) return
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
  const taskId = pendingRejectRow.value.id
  const operation = `task:reject:${taskId}`
  if (!beginOperation(operation)) return
  try {
    await portfolioReportingApi.reject({
      id: taskId,
      rejectReason: reason,
    })
    message.success('已驳回')
    rejectOpen.value = false
    pendingRejectRow.value = null
    await loadPage()
  } catch (error) {
    showUserError(error, '驳回失败')
  } finally {
    endOperation(operation)
  }
}

async function runDownload(row: PortfolioReportingTaskVO) {
  const taskId = row.id
  const operation = `task:download:${taskId}`
  if (!beginOperation(operation)) return
  try {
    const result = await portfolioReportingApi.download({ id: taskId })
    await downloadPortfolioExcelExport(result)
    message.success('已开始下载')
  } catch (error) {
    showUserError(error, '下载失败')
  } finally {
    endOperation(operation)
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
          <UiButton variant="primary" :disabled="operating" @click="openCreateModal">
            新建报送
          </UiButton>
        </template>
      </ContextBar>
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
        pagination-mode="server"
        :total="total"
        @page-change="onPageChange"
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
                ...(canPreview(record)
                  ? [{ key: 'preview', label: '预览', disabled: operating }]
                  : []),
                ...(canRequestApproval(record)
                  ? [{ key: 'request', label: '提交审批', disabled: operating }]
                  : []),
                ...(canApprove(record)
                  ? [{ key: 'approve', label: '审批通过', disabled: operating }]
                  : []),
                ...(canApprove(record)
                  ? [{ key: 'reject', label: '驳回', tone: 'danger' as const, disabled: operating }]
                  : []),
                ...(canDownload(record)
                  ? [{ key: 'download', label: '下载', disabled: operating }]
                  : []),
              ]"
              @action="
                (key) => {
                  if (key === 'preview') runPreview(record)
                  else if (key === 'request') runRequestApproval(record)
                  else if (key === 'approve') runApprove(record)
                  else if (key === 'reject') openReject(record)
                  else if (key === 'download') runDownload(record)
                }
              "
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
      :closable="!operating"
      :mask-closable="!operating"
      :keyboard="!operating"
      :cancel-button-props="{ disabled: operating }"
      @ok="submitCreate"
    >
      <a-form layout="vertical">
        <a-form-item label="任务标题" required>
          <a-input v-model:value="createForm.taskTitle" :disabled="operating" />
        </a-form-item>
        <a-form-item label="报送用途" required>
          <a-textarea v-model:value="createForm.reportPurpose" :rows="3" :disabled="operating" />
        </a-form-item>
        <a-form-item label="共享字段" required>
          <a-select
            v-model:value="createForm.shareFields"
            mode="multiple"
            placeholder="选择获批共享字段"
            :disabled="operating"
          >
            <a-select-option
              v-for="code in ALL_PORTFOLIO_REPORTING_SHARE_FIELD_CODES"
              :key="code"
              :value="code"
              :disabled="
                createForm.maskMode &&
                (code === PortfolioReportingShareFieldCode.TEACHER_USER_ID ||
                  code === PortfolioReportingShareFieldCode.TEACHER_NUMBER)
              "
            >
              {{ PortfolioReportingShareFieldDescription[code] }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="范围" required>
          <a-select v-model:value="createForm.scopeType" style="width: 100%" :disabled="operating">
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
          <a-input v-model:value="createForm.departmentId" :disabled="operating" />
        </a-form-item>
        <a-form-item label="脱敏">
          <a-switch v-model:checked="createForm.maskMode" :disabled="operating" />
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
      :closable="!operating"
      :mask-closable="!operating"
      :keyboard="!operating"
      :cancel-button-props="{ disabled: operating }"
      @ok="submitReject"
    >
      <a-textarea
        v-model:value="rejectReason"
        placeholder="请填写驳回原因"
        :rows="4"
        :disabled="operating"
      />
    </a-modal>
  </StageWorkbenchShell>
</template>
