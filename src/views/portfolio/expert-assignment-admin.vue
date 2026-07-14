<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExpertAssignmentVO } from '@/apis/portfolio/expert-assignment'
import type { PortfolioEvaluationTaskVO } from '@/apis/portfolio/teacher-platform'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioExpertAssignmentApi } from '@/apis/portfolio/expert-assignment'
import { portfolioEvaluationTaskApi } from '@/apis/portfolio/teacher-platform'
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
import { useUserStore } from '@/stores/modules/user'
import {
  ALL_PORTFOLIO_EXPERT_ASSIGNMENT_STATUS_CODES,
  PortfolioExpertAssignmentStatusCode,
  PortfolioExpertAssignmentStatusDescription,
} from '@/types/enums/portfolio-expert-assignment-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const router = useRouter()
const userStore = useUserStore()

interface AssignmentFilterModel extends Record<string, unknown> {
  evaluationTaskId?: string
  expertUserId?: string
  assignmentStatus?: PortfolioExpertAssignmentStatusCode
}

const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const createLoading = ref(false)
const revokeLoading = ref(false)
const rows = ref<PortfolioExpertAssignmentVO[]>([])
const total = ref(0)
const tasks = ref<PortfolioEvaluationTaskVO[]>([])
const createOpen = ref(false)

const filterForm = reactive<AssignmentFilterModel>({
  assignmentStatus: PortfolioExpertAssignmentStatusCode.ACTIVE,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed(() => [
  {
    key: 'evaluationTaskId',
    type: 'select' as const,
    label: '评价任务',
    allowClear: true,
    width: 220,
    options: tasks.value.map(task => ({
      value: task.id,
      label: task.taskName,
    })),
  },
  {
    key: 'expertUserId',
    type: 'input' as const,
    label: '专家用户 ID',
    width: 160,
    placeholder: '用户 ID',
  },
  {
    key: 'assignmentStatus',
    type: 'select' as const,
    label: '授权状态',
    allowClear: true,
    width: 140,
    options: ALL_PORTFOLIO_EXPERT_ASSIGNMENT_STATUS_CODES.map(code => ({
      value: code,
      label: PortfolioExpertAssignmentStatusDescription[code],
    })),
  },
])

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const createForm = reactive({
  evaluationTaskId: '',
  expertUserId: '',
  subjectTeacherIdsText: '',
  materialScopeJson: '{"categories":["TEACHING","RESEARCH"]}',
  expireDays: 30,
  maskRequired: true,
})

const columns: ColumnsType = [
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '评价任务', dataIndex: 'evaluationTaskId', key: 'evaluationTaskId', width: 120 },
  { title: '专家用户', dataIndex: 'expertUserId', key: 'expertUserId', width: 120 },
  { title: '被评教师', key: 'subjectTeacherIdsJson', width: 180, ellipsis: true },
  { title: '脱敏', key: 'maskRequired', width: 80 },
  { title: '状态', key: 'assignmentStatus', width: 100 },
  { title: '过期时间', dataIndex: 'expireTime', key: 'expireTime', width: 170 },
  { title: '访问令牌', dataIndex: 'accessToken', key: 'accessToken', width: 200, ellipsis: true },
  { title: '操作', key: 'actions', width: 120 },
]

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: total.value,
  showSizeChanger: true,
}))

function statusLabel(code: string): string {
  return strictEnumLabel(
    PortfolioExpertAssignmentStatusDescription,
    code as PortfolioExpertAssignmentStatusCode,
    '授权状态',
  )
}

function statusTone(code: string): 'green' | 'red' | 'gray' {
  switch (code) {
    case PortfolioExpertAssignmentStatusCode.ACTIVE:
      return 'green'
    case PortfolioExpertAssignmentStatusCode.REVOKED:
      return 'red'
    case PortfolioExpertAssignmentStatusCode.EXPIRED:
    default:
      return 'gray'
  }
}

function canRevoke(row: PortfolioExpertAssignmentVO): boolean {
  return row.assignmentStatus === PortfolioExpertAssignmentStatusCode.ACTIVE
}

function buildRowActions(row: PortfolioExpertAssignmentVO) {
  return [
    {
      key: 'review',
      label: '打开审阅',
    },
    {
      key: 'copyPublicLink',
      label: '复制免登链接',
    },
    {
      key: 'revoke',
      label: '吊销',
      tone: 'danger' as const,
      hidden: !canRevoke(row),
      disabled: revokeLoading.value,
    },
  ]
}

function buildPublicReviewUrl(accessToken: string): string {
  const tenantId = userStore.userInfo.tenantId
  if (!tenantId) {
    throw new Error('当前会话缺少 tenantId，无法生成免登链接')
  }
  const params = new URLSearchParams({
    tenantId: String(tenantId),
    accessToken,
  })
  return `${window.location.origin}/portfolio/public/expert-review?${params.toString()}`
}

async function copyPublicLink(row: PortfolioExpertAssignmentVO) {
  try {
    const url = buildPublicReviewUrl(row.accessToken)
    await navigator.clipboard.writeText(url)
    message.success('免登审阅链接已复制')
  } catch (error) {
    showUserError(error, '复制免登链接失败')
  }
}

function onRowAction(key: string, row: PortfolioExpertAssignmentVO) {
  if (key === 'review') {
    void router.push({
      path: '/portfolio/expert/review',
      query: { accessToken: row.accessToken },
    })
    return
  }
  if (key === 'copyPublicLink') {
    void copyPublicLink(row)
    return
  }
  if (key === 'revoke') {
    void revokeRow(row)
  }
}

function parseSubjectTeacherIds(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

async function loadTasks() {
  beginLoad()
  try {
    const result = await portfolioEvaluationTaskApi.page({
      pageNum: 1,
      pageSize: 200,
    })
    tasks.value = result.list ?? []
  
    okLoad()
  } catch (error) {
    failLoad()
    tasks.value = []
    showUserError(error, '加载评价任务失败')
  }
}

async function loadPage() {
  beginLoad()
  loading.value = true
  try {
    const result = await portfolioExpertAssignmentApi.page({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      evaluationTaskId: filterForm.evaluationTaskId || undefined,
      expertUserId: filterForm.expertUserId?.trim() || undefined,
      assignmentStatus: filterForm.assignmentStatus,
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
  createForm.evaluationTaskId = filterForm.evaluationTaskId ?? ''
  createForm.expertUserId = ''
  createForm.subjectTeacherIdsText = ''
  createForm.materialScopeJson = '{"categoryCodes":[]}'
  createForm.expireDays = 30
  createForm.maskRequired = true
  createOpen.value = true
}

async function submitCreate() {
  const subjectTeacherIds = parseSubjectTeacherIds(createForm.subjectTeacherIdsText)
  if (!createForm.evaluationTaskId || !createForm.expertUserId || subjectTeacherIds.length === 0) {
    message.warning('请填写评价任务、专家用户')
    return
  }
  createLoading.value = true
  try {
    await portfolioExpertAssignmentApi.create({
      evaluationTaskId: createForm.evaluationTaskId,
      expertUserId: createForm.expertUserId,
      subjectTeacherIds,
      materialScopeJson: createForm.materialScopeJson.trim(),
      expireDays: createForm.expireDays,
      maskRequired: createForm.maskRequired,
    })
    message.success('已创建外部专家授权')
    createOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '创建授权失败')
  } finally {
    createLoading.value = false
  }
}

async function revokeRow(row: PortfolioExpertAssignmentVO) {
  revokeLoading.value = true
  try {
    await portfolioExpertAssignmentApi.revoke({ id: row.id })
    message.success('已吊销授权')
    await loadPage()
  } catch (error) {
    showUserError(error, '吊销失败')
  } finally {
    revokeLoading.value = false
  }
}

onMounted(async () => {
  await loadTasks()
  await loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="外部专家授权" subtitle="为多元评价任务配置脱敏审阅授权" />
    <UiCard>
      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        @search="onSearch"
      >
        <template #actions>
          <UiButton variant="primary" @click="openCreateModal">
            新建授权
          </UiButton>
        </template>
      </UiFilterBar>
      <UiDataTable
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        :pagination="pagination"
        row-key="id"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'subjectTeacherIdsJson'">
            {{ record.subjectTeacherIdsJson }}
          </template>
          <template v-else-if="column.key === 'maskRequired'">
            <UiTag :tone="record.maskRequired ? 'blue' : 'gray'">
              {{ record.maskRequired ? '是' : '否' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'assignmentStatus'">
            <UiTag :tone="statusTone(record.assignmentStatus)">
              {{ statusLabel(record.assignmentStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildRowActions(record)"
              @action="(key) => onRowAction(key, record)"
            />
          </template>
        </template>
        <template #empty>
          <UiEmpty description="暂无外部专家授权" />
        </template>
      </UiDataTable>
    </UiCard>
    <a-modal
      v-model:open="createOpen"
      title="新建外部专家授权"
      :confirm-loading="createLoading"
      ok-text="创建"
      @ok="submitCreate"
    >
      <a-form layout="vertical">
        <a-form-item label="评价任务" required>
          <a-select
            v-model:value="createForm.evaluationTaskId"
            placeholder="选择评价任务"
            :options="tasks.map(t => ({ value: t.id, label: t.taskName }))"
          />
        </a-form-item>
        <a-form-item label="专家用户 ID" required>
          <a-input v-model:value="createForm.expertUserId" placeholder="外部专家平台用户 ID" />
        </a-form-item>
        <a-form-item label="被评教师 ID" required>
          <a-textarea
            v-model:value="createForm.subjectTeacherIdsText"
            placeholder="多个 ID 用逗号或空格分隔"
            :rows="3"
          />
        </a-form-item>
        <a-form-item label="材料范围 JSON" required>
          <a-textarea
            v-model:value="createForm.materialScopeJson"
            placeholder="JSON，例如分类编码列表"
            :rows="3"
          />
        </a-form-item>
        <a-form-item label="有效天数" required>
          <a-input-number v-model:value="createForm.expireDays" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="强制脱敏">
          <a-switch v-model:checked="createForm.maskRequired" />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>
