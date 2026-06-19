<template>
  <a-card title="批量更正计划" :bordered="false" size="small">
    <template #extra>
      <a-button type="primary" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>新建计划
      </a-button>
    </template>

    <UiFilterBar
      v-model="filterForm"
      :fields="filterFields"
      search-text="查询"
      @search="handleSearch"
      @reset="handleFilterReset"
    />

    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="批量更正计划加载失败"
      compact
      @retry="reload"
    />
    <UiDataTable
      class="student-detail-table__data-table"
      v-else
      v-model:current="pagination.current"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      size="small"
      :total="pagination.total"
      flat
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'correctionType'">
          {{ correctionTypeLabel(record) }}
        </template>
        <template v-else-if="column.key === 'affectedQuestionRefs'">
          {{ affectedQuestionSummary(record) }}
        </template>
        <template v-else-if="column.key === 'approvalStatus'">
          <a-tag :color="approvalStatusColor(record)">
            {{ approvalStatusLabel(record) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'approvedTime'">
          {{ formatDateTime(record.approvedTime) }}
        </template>
        <template v-else-if="column.key === 'executedTime'">
          {{ formatDateTime(record.executedTime) }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="operations-cell" @click.stop>
            <a-popconfirm
              title="确认提交审批？"
              :disabled="!canSubmit(record)"
              @confirm="handleSubmitPlan(record.id)"
            >
              <a-button
                type="link"
                size="small"
                :disabled="!canSubmit(record)"
                :loading="isOperating(record.id, 'submit')"
              >
                提交
              </a-button>
            </a-popconfirm>
            <a-popconfirm
              title="确认审批通过？"
              :disabled="record.approvalStatus !== 'PENDING_APPROVAL'"
              @confirm="handleApprove(record.id)"
            >
              <a-button
                type="link"
                size="small"
                :disabled="record.approvalStatus !== 'PENDING_APPROVAL'"
                :loading="isOperating(record.id, 'approve')"
              >
                通过
              </a-button>
            </a-popconfirm>
            <UiTextAction
              tone="danger"
              :disabled="record.approvalStatus !== 'PENDING_APPROVAL'"
              @click="openRejectModal(record.id)"
            >
              驳回
            </UiTextAction>
            <a-button
              type="link"
              size="small"
              :disabled="record.approvalStatus !== 'APPROVED'"
              :loading="isOperating(record.id, 'execute')"
              @click="openExecuteModal(record.id)"
            >
              执行
            </a-button>
          </div>
        </template>
      </template>
    </UiDataTable>

    <a-modal
      v-model:open="createOpen"
      title="新建批量更正计划"
      ok-text="保存草稿"
      cancel-text="取消"
      :confirm-loading="creating"
      :mask-closable="false"
      width="840px"
      @ok="handleCreate"
    >
      <a-form layout="vertical" :model="form">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="计划名称" required>
              <a-input v-model:value="form.planName" :maxlength="100" placeholder="必填" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="更正类型" required>
              <a-select
                v-model:value="form.correctionType"
                :options="correctionTypeOptions"
                @change="handleCorrectionTypeChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="form.correctionType === 'SINGLE_QUESTION'" label="更正题目" required>
          <a-select
            v-model:value="form.questionTemplateId"
            :loading="reviewRequestLoading"
            :options="questionOptions"
            placeholder="选择需要批量更正的题目"
            show-search
            option-filter-prop="label"
            @change="handleQuestionChange"
          />
        </a-form-item>
        <a-form-item label="更正原因" required>
          <a-textarea v-model:value="form.reason" :rows="3" :maxlength="500" show-count />
        </a-form-item>
        <div class="batch-plan-items">
          <div class="batch-plan-items__header">
            <span>更正明细</span>
            <a-button size="small" @click="addItem">
              <template #icon><PlusOutlined /></template>添加明细
            </a-button>
          </div>
          <div v-for="(item, index) in form.items" :key="item.localId" class="batch-plan-item">
            <a-row :gutter="12" align="middle">
              <a-col :span="14">
                <a-form-item label="复核申请" required>
                  <a-select
                    v-model:value="item.reviewRequestId"
                    :loading="reviewRequestLoading"
                    :options="itemReviewRequestOptions"
                    placeholder="选择已通过的复核申请"
                    show-search
                    option-filter-prop="label"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="更正后分数" required>
                  <a-input-number
                    v-model:value="item.afterScore"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="4">
                <a-button
                  danger
                  size="small"
                  :disabled="form.items.length === 1"
                  @click="removeItem(index)"
                >
                  删除
                </a-button>
              </a-col>
            </a-row>
          </div>
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="rejectModalOpen"
      title="驳回批量更正计划"
      ok-text="确认驳回"
      cancel-text="取消"
      :confirm-loading="operatingAction === 'reject'"
      @ok="handleReject"
    >
      <a-textarea
        v-model:value="rejectReason"
        :maxlength="500"
        :rows="4"
        show-count
        placeholder="请输入驳回原因"
      />
    </a-modal>

    <a-modal
      v-model:open="executeModalOpen"
      title="执行批量更正计划"
      ok-text="确认执行"
      cancel-text="取消"
      :confirm-loading="operatingAction === 'execute'"
      @ok="handleExecute"
    >
      <a-alert
        type="warning"
        show-icon
        message="执行后会写入当前成绩并刷新统计，此操作不可撤销。"
        style="margin-bottom: 12px"
      />
      <a-textarea
        v-model:value="executeReason"
        :maxlength="500"
        :rows="4"
        show-count
        placeholder="请输入执行说明（不少于 5 字，将写入审计记录）"
      />
    </a-modal>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  BatchCorrectionApprovalStatusCode,
  BatchCorrectionPlanCreateRequest,
  ExamBatchGradeCorrectionPlanVO,
  GradeCorrectionTypeCode,
  GradeReviewQuestionRefVO,
  GradeReviewRequestItemResponse,
} from '@/apis/mark/grade-review'
import type { FilterField } from '@/components/ui-guide/ui/types'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  approveBatchCorrectionPlan,
  BATCH_CORRECTION_STATUS_COLOR,
  BATCH_CORRECTION_STATUS_LABEL,
  BATCH_CORRECTION_STATUS_OPTIONS,
  createBatchCorrectionPlan,
  executeBatchCorrectionPlan,
  GRADE_CORRECTION_TYPE_LABEL,
  listBatchCorrectionPlans,
  listReviewRequests,
  submitBatchCorrectionPlan,
} from '@/apis/mark/grade-review'
import { UiDataTable, UiErrorRetryPanel, UiFilterBar } from '@/components/ui-guide/ui'
import { assertUserFacing } from '@/utils/contract-guard'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'BatchCorrectionPlansCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const APPROVED_REVIEW_REQUEST_PAGE_SIZE = 100

type OperationAction = 'submit' | 'approve' | 'reject' | 'execute' | ''

interface PlanItemForm {
  localId: number
  reviewRequestId: string
  afterScore: number | undefined
}

const rows = ref<ExamBatchGradeCorrectionPlanVO[]>([])
const loading = ref(false)
const loadError = ref<Error | null>(null)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

const filterForm = reactive<{ status?: BatchCorrectionApprovalStatusCode }>({})

const filterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: BATCH_CORRECTION_STATUS_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  },
]

const createOpen = ref(false)
const creating = ref(false)
const operatingId = ref('')
const operatingAction = ref<OperationAction>('')
const rejectModalOpen = ref(false)
const rejectPlanId = ref('')
const rejectReason = ref('')
const executeModalOpen = ref(false)
const executePlanId = ref('')
const executeReason = ref('')
const nextLocalId = ref(1)
const approvedReviewRequests = ref<GradeReviewRequestItemResponse[]>([])
const reviewRequestLoading = ref(false)

const form = reactive<{
  planName: string
  correctionType: BatchCorrectionPlanCreateRequest['correctionType']
  questionTemplateId: string
  reason: string
  items: PlanItemForm[]
}>({
  planName: '',
  correctionType: 'SINGLE_QUESTION',
  questionTemplateId: '',
  reason: '',
  items: [],
})

const correctionTypeOptions = [
  { value: 'SINGLE_QUESTION', label: GRADE_CORRECTION_TYPE_LABEL.SINGLE_QUESTION },
  { value: 'TOTAL_SCORE', label: GRADE_CORRECTION_TYPE_LABEL.TOTAL_SCORE },
]

const questionOptions = computed(() => {
  const questionMap = new Map<string, GradeReviewQuestionRefVO>()
  for (const request of approvedReviewRequests.value) {
    for (const question of request.questionRefs) {
      if (!questionMap.has(question.questionTemplateId)) {
        questionMap.set(question.questionTemplateId, question)
      }
    }
  }
  return Array.from(questionMap.values()).map((question) => ({
    value: question.questionTemplateId,
    label: `第 ${question.questionNo} 题 · ${question.questionType} · 满分 ${question.fullScore} 分`,
  }))
})

const itemReviewRequestOptions = computed(() =>
  approvedReviewRequests.value
    .filter(
      (request) =>
        form.correctionType === 'TOTAL_SCORE'
        || request.questionRefs.some(
          (question) => question.questionTemplateId === form.questionTemplateId,
        ),
    )
    .map((request) => ({
      value: request.id,
      label: `${reviewRequestStudentLabel(request)} · ${reviewRequestQuestionLabel(request)}`,
    })),
)

const columns: ColumnType<ExamBatchGradeCorrectionPlanVO>[] = [
  { title: '名称', dataIndex: 'planName', key: 'planName', ellipsis: true },
  { title: '类型', key: 'correctionType', width: 110 },
  { title: '受影响题目', key: 'affectedQuestionRefs', width: 160 },
  {
    title: '受影响学生',
    dataIndex: 'affectedStudentCount',
    key: 'affectedStudentCount',
    width: 120,
  },
  { title: '已执行', dataIndex: 'executedCount', key: 'executedCount', width: 90 },
  { title: '审批状态', key: 'approvalStatus', width: 110 },
  { title: '审批时间', key: 'approvedTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
  { title: '创建时间', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 210, fixed: 'right' },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    const result = await listBatchCorrectionPlans({
      examId: props.examId,
      approvalStatus: filterForm.status,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    const list = readPageList(result, '批量成绩更正计划加载失败')
    validateBatchCorrectionPlanDisplayContracts(list)
    rows.value = list
    pagination.total = readPageTotal(result, '批量成绩更正计划加载失败')
    pagination.current = result.pageNum ?? pagination.current
    pagination.pageSize = result.pageSize ?? pagination.pageSize
  } catch (e) {
    rows.value = []
    pagination.total = 0
    loadError.value = toUserError(e, '批量成绩更正计划加载失败')
    showUserError(e, '批量成绩更正计划加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  pagination.current = 1
  void reload()
}

function handleFilterReset(): void {
  filterForm.status = undefined
  pagination.current = 1
  void reload()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void reload()
}

async function openCreateModal(): Promise<void> {
  form.planName = ''
  form.correctionType = 'SINGLE_QUESTION'
  form.questionTemplateId = ''
  form.reason = ''
  form.items = [createEmptyItem()]
  createOpen.value = true
  await loadApprovedReviewRequests()
}

function createEmptyItem(): PlanItemForm {
  const localId = nextLocalId.value
  nextLocalId.value += 1
  return { localId, reviewRequestId: '', afterScore: 0 }
}

function addItem(): void {
  form.items.push(createEmptyItem())
}

function removeItem(index: number): void {
  if (form.items.length === 1) return
  form.items.splice(index, 1)
}

function handleCorrectionTypeChange(): void {
  form.questionTemplateId = ''
  for (const item of form.items) {
    item.reviewRequestId = ''
  }
}

function handleQuestionChange(): void {
  for (const item of form.items) {
    item.reviewRequestId = ''
  }
}

async function loadApprovedReviewRequests(): Promise<void> {
  if (!props.examId) return
  reviewRequestLoading.value = true
  try {
    const requests = await readAllPages(
      (pageNum) =>
        listReviewRequests({
          examId: props.examId,
          requestStatus: 'APPROVED',
          pageNum,
          pageSize: APPROVED_REVIEW_REQUEST_PAGE_SIZE,
        }),
      '已通过复核申请加载失败',
    )
    validateReviewRequestDisplayContracts(requests)
    approvedReviewRequests.value = requests
  } catch (e) {
    approvedReviewRequests.value = []
    showUserError(e, '已通过复核申请加载失败')
  } finally {
    reviewRequestLoading.value = false
  }
}

/** 校验批量更正计划列表所需受影响题目字段，缺失时进入组件错误态。 */
function validateBatchCorrectionPlanDisplayContracts(list: ExamBatchGradeCorrectionPlanVO[]): void {
  const dataError = '批量成绩更正计划加载失败，请刷新后重试'
  for (const row of list) {
    if (row.correctionType !== 'TOTAL_SCORE') {
      assertUserFacing(Boolean(row.affectedQuestionRefs?.length), dataError)
    }
  }
}

/** 校验可纳入批量更正的复核申请学生展示字段，缺失时中断弹窗数据源。 */
function validateReviewRequestDisplayContracts(list: GradeReviewRequestItemResponse[]): void {
  const dataError = '复核申请加载失败，请刷新后重试'
  for (const request of list) {
    assertUserFacing(
      Boolean(request.studentName?.trim()) && Boolean(request.studentNo?.trim()),
      dataError,
    )
  }
}

function buildCreateRequest(): BatchCorrectionPlanCreateRequest | null {
  if (!form.planName.trim()) {
    message.warning('计划名称必填')
    return null
  }
  if (form.correctionType === 'SINGLE_QUESTION' && !form.questionTemplateId) {
    message.warning('单题批量更正请选择题目')
    return null
  }
  if (!form.reason.trim()) {
    message.warning('更正原因必填')
    return null
  }
  if (form.items.length === 0) {
    message.warning('更正明细不能为空')
    return null
  }
  const items: BatchCorrectionPlanCreateRequest['items'] = []
  for (const item of form.items) {
    const request = approvedReviewRequests.value.find(
      (approvedRequest) => approvedRequest.id === item.reviewRequestId,
    )
    if (!request) {
      message.warning('更正明细请选择已通过的复核申请')
      return null
    }
    if (
      form.correctionType === 'SINGLE_QUESTION'
      && !request.questionRefs.some(
        (question) => question.questionTemplateId === form.questionTemplateId,
      )
    ) {
      message.warning('更正明细包含未申请该题目的学生')
      return null
    }
    if (typeof item.afterScore !== 'number') {
      message.warning('更正明细中的更正后分数必填')
      return null
    }
    items.push({
      reviewRequestId: request.id,
      afterScore: item.afterScore,
    })
  }
  const duplicateReviewRequest = new Set<string>()
  const duplicated = items.some((item) => {
    if (duplicateReviewRequest.has(item.reviewRequestId)) return true
    duplicateReviewRequest.add(item.reviewRequestId)
    return false
  })
  if (duplicated) {
    message.warning('同一计划中不能重复选择同一名学生的复核申请')
    return null
  }
  return {
    examId: props.examId,
    planName: form.planName.trim(),
    correctionType: form.correctionType,
    questionTemplateId:
      form.correctionType === 'SINGLE_QUESTION' ? form.questionTemplateId : undefined,
    items,
    reason: form.reason.trim(),
  }
}

async function handleCreate(): Promise<void> {
  const request = buildCreateRequest()
  if (!request) return
  creating.value = true
  try {
    await createBatchCorrectionPlan(request)
    message.success('批量更正计划草稿已创建')
    createOpen.value = false
    await reload()
  } catch (e) {
    showUserError(e, '批量成绩更正计划创建失败')
  } finally {
    creating.value = false
  }
}

async function handleSubmitPlan(planId: string): Promise<void> {
  operatingId.value = planId
  operatingAction.value = 'submit'
  try {
    await submitBatchCorrectionPlan({ planId })
    message.success('已提交审批')
    await reload()
  } catch (e) {
    showUserError(e, '批量成绩更正计划提交失败')
  } finally {
    resetOperating()
  }
}

async function handleApprove(planId: string): Promise<void> {
  operatingId.value = planId
  operatingAction.value = 'approve'
  try {
    await approveBatchCorrectionPlan({ planId, approved: true })
    message.success('已审批通过')
    await reload()
  } catch (e) {
    showUserError(e, '批量成绩更正计划审批失败')
  } finally {
    resetOperating()
  }
}

function openRejectModal(planId: string): void {
  const row = rows.value.find((item) => item.id === planId)
  if (!row || row.approvalStatus !== 'PENDING_APPROVAL') {
    return
  }
  rejectPlanId.value = planId
  rejectReason.value = ''
  rejectModalOpen.value = true
}

async function handleReject(): Promise<void> {
  const reason = rejectReason.value.trim()
  if (!reason) {
    message.warning('请输入驳回原因')
    return
  }
  operatingId.value = rejectPlanId.value
  operatingAction.value = 'reject'
  try {
    await approveBatchCorrectionPlan({ planId: rejectPlanId.value, approved: false, reason })
    message.success('已驳回')
    rejectModalOpen.value = false
    await reload()
  } catch (e) {
    showUserError(e, '批量成绩更正计划驳回失败')
  } finally {
    resetOperating()
    rejectPlanId.value = ''
  }
}

function openExecuteModal(planId: string): void {
  const row = rows.value.find((item) => item.id === planId)
  if (!row || row.approvalStatus !== 'APPROVED') {
    return
  }
  executePlanId.value = planId
  executeReason.value = ''
  executeModalOpen.value = true
}

async function handleExecute(): Promise<void> {
  const reason = executeReason.value.trim()
  if (reason.length < 5) {
    message.warning('请输入不少于 5 字的执行说明')
    return
  }
  const planId = executePlanId.value
  if (!planId) return
  operatingId.value = planId
  operatingAction.value = 'execute'
  try {
    await executeBatchCorrectionPlan({ planId, executeReason: reason })
    message.success('批量更正执行完成')
    executeModalOpen.value = false
    await reload()
  } catch (e) {
    showUserError(e, '批量成绩更正计划执行失败')
  } finally {
    resetOperating()
  }
}

function resetOperating(): void {
  operatingId.value = ''
  operatingAction.value = ''
}

function isOperating(planId: string, action: OperationAction): boolean {
  return operatingId.value === planId && operatingAction.value === action
}

function canSubmit(row: ExamBatchGradeCorrectionPlanVO): boolean {
  return row.approvalStatus === 'DRAFT' || row.approvalStatus === 'REJECTED'
}

function correctionTypeLabel(row: ExamBatchGradeCorrectionPlanVO): string {
  const code: GradeCorrectionTypeCode | undefined = row.correctionType
  return strictEnumLabel(GRADE_CORRECTION_TYPE_LABEL, code, '成绩更正类型')
}

function affectedQuestionSummary(row: ExamBatchGradeCorrectionPlanVO): string {
  if (row.correctionType === 'TOTAL_SCORE') {
    return '总分'
  }
  return (row.affectedQuestionRefs ?? [])
    .map((questionRef) => `${questionRef.questionNo}（${questionRef.fullScore} 分）`)
    .join('、')
}

function reviewRequestStudentLabel(request: GradeReviewRequestItemResponse): string {
  const name = request.studentName.trim()
  const no = request.studentNo.trim()
  return `${name}（${no}）`
}

function reviewRequestQuestionLabel(request: GradeReviewRequestItemResponse): string {
  if (request.questionRefs.length === 0) {
    return '总分复核'
  }
  return request.questionRefs
    .map(
      (question) =>
        `第 ${question.questionNo} 题 · ${question.questionType} · 满分 ${question.fullScore} 分`,
    )
    .join('、')
}

function approvalStatusLabel(row: ExamBatchGradeCorrectionPlanVO): string {
  return strictEnumLabel(BATCH_CORRECTION_STATUS_LABEL, row.approvalStatus, '批量更正审批状态')
}

function approvalStatusColor(row: ExamBatchGradeCorrectionPlanVO): string {
  return strictEnumTone(BATCH_CORRECTION_STATUS_COLOR, row.approvalStatus, '批量更正审批状态')
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) {
      pagination.current = 1
      void reload()
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.batch-plan-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-plan-items__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.batch-plan-item {
  padding: 12px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}
</style>
