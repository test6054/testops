<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExpertAssignmentVO } from '@/apis/portfolio/expert-assignment'
import type { PortfolioEvaluationTaskVO } from '@/apis/portfolio/teacher-platform'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioExpertAssignmentApi } from '@/apis/portfolio/expert-assignment'
import { portfolioEvaluationTaskApi } from '@/apis/portfolio/teacher-platform'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import {
  ALL_PORTFOLIO_EXPERT_ASSIGNMENT_STATUS_CODES,
  PortfolioExpertAssignmentStatusCode,
  PortfolioExpertAssignmentStatusDescription,
} from '@/types/enums/portfolio-expert-assignment-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
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
const operationKey = ref('')
const operating = computed(() => Boolean(operationKey.value))
const createLoading = computed(() => operationKey.value === 'assignment:create')
const pageRequestToken = ref(0)
const taskRequestToken = ref(0)
const taskLoading = ref(false)
const taskLoadError = ref(false)
const rows = ref<PortfolioExpertAssignmentVO[]>([])
const total = ref(0)
const tasks = ref<PortfolioEvaluationTaskVO[]>([])
const createOpen = ref(false)
const createdLinkOpen = ref(false)
const createdPublicLink = ref('')

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
    options: tasks.value.map((task) => ({
      value: task.id,
      label: task.taskName,
    })),
  },
  {
    key: 'expertUserId',
    type: 'input' as const,
    label: '专家用户编号',
    width: 160,
    placeholder: '用户编号',
  },
  {
    key: 'assignmentStatus',
    type: 'select' as const,
    label: '授权状态',
    allowClear: true,
    width: 140,
    options: ALL_PORTFOLIO_EXPERT_ASSIGNMENT_STATUS_CODES.map((code) => ({
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
  categoryCodesText: '',
  expireDays: 30,
  maskRequired: true,
})

const columns: ColumnsType = [
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '评价任务', dataIndex: 'evaluationTaskId', key: 'evaluationTaskId', width: 120 },
  { title: '专家用户', dataIndex: 'expertUserId', key: 'expertUserId', width: 120 },
  { title: '被评教师', key: 'subjectTeacherIds', width: 180, ellipsis: true },
  { title: '脱敏', key: 'maskRequired', width: 80 },
  { title: '状态', key: 'assignmentStatus', width: 100 },
  { title: '过期时间', dataIndex: 'expireTime', key: 'expireTime', width: 170 },
  { title: '操作', key: 'actions', width: 120 },
]

/** 外部专家授权创建与吊销必须串行，避免同一专家访问边界被并发改写。 */
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
      hidden: !canRevoke(row),
      disabled: operating.value,
    },
    {
      key: 'revoke',
      label: '吊销',
      tone: 'danger' as const,
      hidden: !canRevoke(row),
      disabled: operating.value,
    },
  ]
}

function buildPublicReviewUrl(accessToken: string): string | null {
  const tenantId = userStore.userInfo.tenantId
  if (!tenantId) {
    showUserError(null, '当前登录会话缺少学校信息，无法生成免登链接，请重新登录后再试')
    return null
  }
  const params = new URLSearchParams({
    tenantId: String(tenantId),
    accessToken,
  })
  return `${window.location.origin}/portfolio/public/expert-review#${params.toString()}`
}

function parseCategoryCodes(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function copyCreatedPublicLink() {
  try {
    await navigator.clipboard.writeText(createdPublicLink.value)
    message.success('免登审阅链接已复制')
  } catch (error) {
    showUserError(error, '复制免登链接失败')
  }
}

function clearCreatedPublicLink() {
  createdPublicLink.value = ''
}

function onRowAction(key: string, row: PortfolioExpertAssignmentVO) {
  if (key === 'review') {
    void router.push({
      path: '/portfolio/expert/review',
      query: { assignmentId: row.id },
    })
    return
  }
  if (key === 'revoke') {
    void revokeRow(row)
  }
}

function parseSubjectTeacherIds(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function loadTasks() {
  const currentToken = taskRequestToken.value + 1
  taskRequestToken.value = currentToken
  taskLoading.value = true
  taskLoadError.value = false
  try {
    const result = await portfolioEvaluationTaskApi.page({
      pageNum: 1,
      pageSize: 200,
    })
    if (taskRequestToken.value !== currentToken) return
    tasks.value = result.list ?? []
  } catch (error) {
    if (taskRequestToken.value !== currentToken) return
    tasks.value = []
    taskLoadError.value = true
    showUserError(error, '加载评价任务失败')
  } finally {
    if (taskRequestToken.value === currentToken) taskLoading.value = false
  }
}

async function loadPage() {
  const currentToken = pageRequestToken.value + 1
  pageRequestToken.value = currentToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    evaluationTaskId: filterForm.evaluationTaskId || undefined,
    expertUserId: filterForm.expertUserId?.trim() || undefined,
    assignmentStatus: filterForm.assignmentStatus,
  }
  beginLoad()
  loading.value = true
  try {
    const result = await portfolioExpertAssignmentApi.page(request)
    if (pageRequestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0

    okLoad()
  } catch (error) {
    if (pageRequestToken.value !== currentToken) return
    failLoad()
    rows.value = []
    total.value = 0
    showUserError(error, '加载外部专家授权列表失败')
  } finally {
    if (pageRequestToken.value === currentToken) loading.value = false
  }
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function onPageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

function openCreateModal() {
  if (operating.value) return
  createForm.evaluationTaskId = filterForm.evaluationTaskId ?? ''
  createForm.expertUserId = ''
  createForm.subjectTeacherIdsText = ''
  createForm.categoryCodesText = ''
  createForm.expireDays = 30
  createForm.maskRequired = true
  createOpen.value = true
}

async function submitCreate() {
  const subjectTeacherIds = [...new Set(parseSubjectTeacherIds(createForm.subjectTeacherIdsText))]
  if (!createForm.evaluationTaskId || !createForm.expertUserId.trim() || subjectTeacherIds.length === 0) {
    showFormValidationMessage('请填写评价任务、专家用户和至少一名被评教师')
    return
  }
  const categoryCodes = [...new Set(parseCategoryCodes(createForm.categoryCodesText))]
  if (categoryCodes.length === 0) {
    showFormValidationMessage('请至少填写一个材料分类编码')
    return
  }
  const operation = 'assignment:create'
  if (!beginOperation(operation)) return
  const request = {
    evaluationTaskId: createForm.evaluationTaskId,
    expertUserId: createForm.expertUserId.trim(),
    subjectTeacherIds,
    materialScope: { categoryCodes },
    expireDays: createForm.expireDays,
    maskRequired: createForm.maskRequired,
  }
  try {
    const created = await portfolioExpertAssignmentApi.create(request)
    if (!created.accessToken) {
      showUserError(null, '授权已创建，但未返回一次性访问令牌，请刷新列表后重试或联系管理员')
      await loadPage()
      return
    }
    const publicLink = buildPublicReviewUrl(created.accessToken)
    if (!publicLink) {
      await loadPage()
      return
    }
    createdPublicLink.value = publicLink
    createdLinkOpen.value = true
    message.success('已创建外部专家授权，请立即保存免登链接')
    createOpen.value = false
    await loadPage()
  }
  catch (error) {
    showUserError(error, '创建外部专家授权失败')
  }
  finally {
    endOperation(operation)
  }
}

async function revokeRow(row: PortfolioExpertAssignmentVO) {
  const assignmentId = row.id
  const operation = `assignment:revoke:${assignmentId}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认吊销外部专家授权？',
    content: '吊销后现有免登链接将立即失效，专家不能继续查看脱敏材料或提交审阅。',
    type: 'error',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    await portfolioExpertAssignmentApi.revoke({ id: assignmentId })
    message.success('已吊销授权')
    await loadPage()
  } catch (error) {
    showUserError(error, '吊销失败')
  } finally {
    endOperation(operation)
  }
}

onMounted(async () => {
  await loadTasks()
  await loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="外部专家授权"
        subtitle="为多元评价任务配置脱敏审阅授权"
      />
    </template>
    <UiCard>
      <UiFilterBar v-model="filterModel" :fields="filterFields" @search="onSearch">
        <template #actions>
          <UiButton
            size="sm"
            variant="primary"
            :disabled="operating || taskLoadError"
            @click="openCreateModal"
          >
            新建授权
          </UiButton>
        </template>
      </UiFilterBar>
      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        pagination-mode="server"
        :total="total"
        row-key="id"
        @page-change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'subjectTeacherIds'">
            {{ record.subjectTeacherIds?.join('、') }}
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
          <WorkbenchContextGateStrip
            tag="未配置"
            body="暂无外部专家授权，请先新建授权"
            cta-label="新建授权"
            @cta="openCreateModal"
          />
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="createOpen"
      title="新建外部专家授权"
      :confirm-loading="createLoading"
      :closable="!operating"
      :mask-closable="!operating"
      ok-text="创建"
      @ok="submitCreate"
    >
      <UiForm layout="vertical">
        <UiFormItem label="评价任务" required>
          <UiSelect
            size="sm"
            v-model="createForm.evaluationTaskId"
            placeholder="选择评价任务"
            :options="tasks.map((t) => ({ value: t.id, label: t.taskName }))"
            :loading="taskLoading"
            :disabled="operating || taskLoadError"
          />
        </UiFormItem>
        <UiFormItem label="专家用户编号" required>
          <UiInput
            size="sm"
            v-model="createForm.expertUserId"
            placeholder="外部专家平台用户编号"
            :disabled="operating"
          />
        </UiFormItem>
        <UiFormItem label="被评教师编号" required>
          <UiTextarea
            size="sm"
            v-model="createForm.subjectTeacherIdsText"
            placeholder="多个编号用逗号或空格分隔"
            :rows="3"
            :disabled="operating"
          />
          <p class="mt-1 text-xs text-[var(--dp-color-text-tertiary)]">
            封存 / 暂挂 / 迁出链路教师处于评价参评 hold，不可授权；后端会硬拦，禁止假成功。
          </p>
        </UiFormItem>
        <UiFormItem label="材料分类编码" required>
          <UiTextarea
            size="sm"
            v-model="createForm.categoryCodesText"
            placeholder="多个分类编码用逗号或空格分隔"
            :rows="3"
            :disabled="operating"
          />
        </UiFormItem>
        <UiFormItem label="有效天数" required>
          <UiInputNumber
            size="sm"
            v-model="createForm.expireDays"
            :min="1"
            style="width: 100%"
            :disabled="operating"
          />
        </UiFormItem>
        <UiFormItem label="强制脱敏">
          <UiSwitch size="sm" v-model="createForm.maskRequired" :disabled="operating" />
        </UiFormItem>
      </UiForm>
    </UiDialog>
    <UiDialog
      v-model:open="createdLinkOpen"
      title="一次性免登链接"
      hide-footer
      :mask-closable="false"
      @after-close="clearCreatedPublicLink"
    >
      <UiAlertStrip
        tone="warning"
        dense
        :inline="false"
        title="一次性链接提示"
        description="该链接仅在本次创建后显示，关闭后无法再次获取；如遗失请重新创建授权。"
        style="margin-bottom: 16px"
      />
      <UiInput
        size="sm" :value="createdPublicLink" readonly
      />
      <div class="expert-assignment__link-actions">
        <UiButton size="sm" variant="primary" @click="copyCreatedPublicLink"> 复制免登链接 </UiButton>
      </div>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.expert-assignment__link-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
