<template>
  <WorkbenchSurfaceCard flush class="appeal-section">
    <template #head>
      <div class="appeal-section__header">
        <span class="appeal-section__flow-hint">{{ BATCH_CORRECTION_FLOW_HINT }}</span>
        <UiButton
          v-if="canManageReviewerWrites"
          size="sm"
          variant="primary"
          @click="openCreateModal"
        >
          新建计划
        </UiButton>
      </div>
    </template>

    <template #toolbar>
      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        search-text="查询"
        @search="handleSearch"
        @reset="handleFilterReset"
      />

      <UiAlertStrip
        v-if="listLoadFailed"
        tone="error"
        title="批量更正计划加载失败"
        dense
      />

      <UiDataTable
        v-if="!listLoadFailed || rows.length > 0"
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
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
            <UiTag :tone="approvalStatusColor(record)">
              {{ approvalStatusLabel(record) }}
            </UiTag>
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
            <UiTableActions
              :items="buildBatchCorrectionPlanActions(record)"
              split
              @action="(key) => handleBatchCorrectionPlanAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>

      <UiDrawer
        v-model:open="createOpen"
        title="新建批量更正计划"
        :width="840"
        :confirm-loading="creating"
        :mask-closable="false"
        :hide-footer="false"
        ok-text="保存草稿"
        cancel-text="取消"
        @confirm="handleCreate"
      >
        <UiForm layout="vertical" :model="form">
          <UiRow :gutter="12">
            <UiCol :span="12">
              <UiFormItem label="计划名称" required>
                <UiInput size="sm" v-model="form.planName" :maxlength="100" placeholder="必填" />
              </UiFormItem>
            </UiCol>
            <UiCol :span="12">
              <UiFormItem label="更正类型" required>
                <UiSelect
                  size="sm"
                  v-model="form.correctionType"
                  :options="correctionTypeOptions"
                  @change="handleCorrectionTypeChange"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiFormItem
            v-if="form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION"
            label="更正题目"
            required
          >
            <UiSelect
              size="sm"
              v-model="form.layoutQuestionId"
              :loading="questionOptionsLoading"
              :options="questionOptions"
              placeholder="选择需要批量更正的题目"
              allow-search
              option-filter-prop="label"
              @change="handleQuestionChange"
            />
          </UiFormItem>
          <UiAlertStrip
            v-if="makeupCap60Hint"
            tone="info"
            :title="makeupCap60AlertMessage"
            style="margin-bottom: var(--dp-space-component)"
          />
          <UiFormItem label="更正原因" required>
            <UiTextarea
              size="sm"
              v-model="form.reason"
              :rows="3"
              :maxlength="500"
              :show-count="true"
            />
          </UiFormItem>
          <div class="batch-plan-items">
            <div class="batch-plan-items__header">
              <span>更正明细</span>
              <UiButton size="sm" variant="outline" @click="addItem">
                <template #icon><PlusOutlined /></template>
                添加明细
              </UiButton>
            </div>
            <div v-for="(item, index) in form.items" :key="item.localId" class="batch-plan-item">
              <UiRow :gutter="12">
                <UiCol :span="14">
                  <UiFormItem label="复核申请" required>
                    <UiSelect
                      size="sm"
                      v-model="item.reviewRequestId"
                      :loading="reviewRequestLoading"
                      :options="itemReviewRequestOptions"
                      placeholder="选择已通过的复核申请"
                      allow-search
                      :filter-option="false"
                      @search="onReviewRequestSearch"
                      @change="(value: unknown) => handleItemReviewRequestChange(value, item)"
                    />
                  </UiFormItem>
                </UiCol>
                <UiCol :span="6">
                  <UiFormItem label="更正后分数" required>
                    <UiInputNumber
                      size="sm"
                      v-model="item.afterScore"
                      :min="0"
                      :max="batchTotalScoreMax"
                      :precision="2"
                      style="width: 100%"
                    />
                  </UiFormItem>
                </UiCol>
                <UiCol :span="4">
                  <UiButton
                    size="sm"
                    status="danger"
                    variant="ghost"
                    :disabled="form.items.length === 1"
                    @click="removeItem(index)"
                  >
                    删除
                  </UiButton>
                </UiCol>
              </UiRow>
              <div v-if="batchItemProjectionHint(item)" class="batch-plan-item__hint">
                {{ batchItemProjectionHint(item) }}
              </div>
            </div>
          </div>
        </UiForm>
      </UiDrawer>

      <UiDrawer
        v-model:open="rejectModalOpen"
        title="驳回批量更正计划"
        :width="520"
        :confirm-loading="operatingAction === 'reject'"
        :hide-footer="false"
        ok-text="确认驳回"
        cancel-text="取消"
        @confirm="handleReject"
      >
        <UiTextarea
          size="sm"
          v-model="rejectReason"
          :maxlength="500"
          :rows="4"
          :show-count="true"
          placeholder="请输入驳回原因"
        />
      </UiDrawer>

      <UiDrawer
        v-model:open="executeModalOpen"
        title="执行批量更正计划"
        :width="520"
        :confirm-loading="operatingAction === 'execute'"
        :hide-footer="false"
        ok-text="确认执行"
        cancel-text="取消"
        @confirm="handleExecute"
      >
        <UiAlertStrip
          tone="warning"
          title="执行后会写入当前成绩并刷新统计，此操作不可撤销。"
          style="margin-bottom: var(--dp-space-component)"
        />
        <UiTextarea
          size="sm"
          v-model="executeReason"
          :maxlength="500"
          :rows="4"
          :show-count="true"
          placeholder="请输入执行说明（不少于 5 字，将写入审计记录）"
        />
      </UiDrawer>

      <UiDrawer
        v-model:open="detailOpen"
        title="批量更正计划详情"
        :width="640"
        hide-footer
        @close="closePlanDetail"
      >
        <template v-if="detailPlan">
          <UiForm layout="vertical">
            <UiFormItem label="计划 ID">
              <UiInput size="sm" :value="detailPlan.id" disabled />
            </UiFormItem>
            <UiFormItem label="计划名称">
              <UiInput size="sm" :value="detailPlan.planName" disabled />
            </UiFormItem>
            <UiRow :gutter="12">
              <UiCol :span="12">
                <UiFormItem label="更正类型">
                  <UiInput size="sm" :value="correctionTypeLabel(detailPlan)" disabled />
                </UiFormItem>
              </UiCol>
              <UiCol :span="12">
                <UiFormItem label="审批状态">
                  <UiInput size="sm" :value="approvalStatusLabel(detailPlan)" disabled />
                </UiFormItem>
              </UiCol>
            </UiRow>
            <UiFormItem label="影响范围">
              <UiTextarea
                size="sm"
                :value="`${affectedQuestionSummary(detailPlan)} · ${detailPlan.affectedStudentCount} 名考生`"
                :rows="2"
                disabled
              />
            </UiFormItem>
            <UiFormItem label="更正原因">
              <UiTextarea size="sm" :value="detailPlan.reason || '—'" :rows="2" disabled />
            </UiFormItem>
            <UiFormItem label="审批意见 / 驳回原因">
              <UiTextarea size="sm" :value="detailPlan.decisionReason || '—'" :rows="2" disabled />
            </UiFormItem>
            <UiFormItem label="执行说明">
              <UiTextarea size="sm" :value="detailPlan.executeReason || '—'" :rows="2" disabled />
            </UiFormItem>
            <UiFormItem label="执行失败原因">
              <UiTextarea size="sm" :value="detailPlan.failureReason || '—'" :rows="2" disabled />
            </UiFormItem>
            <UiRow :gutter="12">
              <UiCol :span="12">
                <UiFormItem label="创建人">
                  <UiInput size="sm" :value="detailPlan.createUser || '—'" disabled />
                </UiFormItem>
              </UiCol>
              <UiCol :span="12">
                <UiFormItem label="提交/更新人">
                  <UiInput size="sm" :value="detailPlan.updateUser || '—'" disabled />
                </UiFormItem>
              </UiCol>
            </UiRow>
            <UiFormItem label="审批人">
              <UiInput size="sm" :value="detailPlan.approvedUserId || '—'" disabled />
            </UiFormItem>
            <UiAlertStrip
              tone="info"
              dense
              title="学生可见性"
              description="执行成功后成绩仍须在成绩确认与发布页重新发布，学生端才会看到更正结果。"
            />
          </UiForm>
        </template>
      </UiDrawer>
    </template>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  BatchCorrectionPlanCreateRequest,
  ExamBatchGradeCorrectionPlan,
  GradeReviewQuestionRefVO,
  GradeReviewRequestItemResponse,
} from '@/apis/mark/grade-review'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import {
  approveBatchCorrectionPlan,
  BATCH_CORRECTION_FLOW_HINT,
  BATCH_CORRECTION_STATUS_OPTIONS,
  BATCH_CORRECTION_STATUS_TONE,
  BatchCorrectionApprovalStatusCode,
  BatchCorrectionApprovalStatusDescription,
  computeSingleQuestionCorrectionCompositeTotal,
  createBatchCorrectionPlan,
  executeBatchCorrectionPlan,
  GradeCorrectionTypeCode,
  GradeCorrectionTypeDescription,
  GradeReviewRequestStatusCode,
  isMakeupCap60SingleQuestionCorrectionExceeded,
  listApprovedReviewQuestionOptions,
  listBatchCorrectionPlans,
  listReviewRequests,
  submitBatchCorrectionPlan,
} from '@/apis/mark/grade-review'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { ExamScorePolicyCode } from '@/types/enums/exam-score-policy-enum'
import { FinalScoreStatusCode } from '@/types/enums/final-score-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'BatchCorrectionPlansCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  scorePolicy?: ExamScorePolicyCode
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.userId || '')
/** MVR-278：批量更正写能力位 */
const canManageReviewerWrites = ref(false)

const router = useRouter()

const APPROVED_REVIEW_REQUEST_PAGE_SIZE = 20
const REVIEW_REQUEST_SEARCH_DEBOUNCE_MS = 300

type OperationAction = 'submit' | 'approve' | 'reject' | 'execute' | ''

interface PlanItemForm {
  localId: number
  reviewRequestId: string
  afterScore: number | undefined
}

const rows = ref<ExamBatchGradeCorrectionPlan[]>([])
const loading = ref(false)
const listLoadFailed = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const filterForm = reactive<{ status?: BatchCorrectionApprovalStatusCode, keyword: string }>({
  keyword: '',
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'keyword',
    type: 'input',
    placeholder: '按计划名称 / 更正原因搜索',
    allowClear: true,
    width: 260,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
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
const detailOpen = ref(false)
const detailPlan = ref<ExamBatchGradeCorrectionPlan | null>(null)
const nextLocalId = ref(1)
const reviewRequestOptions = ref<{ value: string, label: string }[]>([])
const reviewRequestCache = ref<Map<string, GradeReviewRequestItemResponse>>(new Map())
const reviewRequestLoading = ref(false)
const questionOptions = ref<{ value: string, label: string }[]>([])
const questionOptionsLoading = ref(false)
let reviewRequestSearchTimer: ReturnType<typeof setTimeout> | undefined
/** 列表请求代际 */
let batchPlanLoadGeneration = 0
/** 远程搜索请求代际 */
let reviewRequestSearchGeneration = 0

const form = reactive<{
  planName: string
  correctionType: BatchCorrectionPlanCreateRequest['correctionType']
  layoutQuestionId: string
  reason: string
  items: PlanItemForm[]
}>({
  planName: '',
  correctionType: GradeCorrectionTypeCode.SINGLE_QUESTION,
  layoutQuestionId: '',
  reason: '',
  items: [],
})

const makeupCap60Hint = computed(() => props.scorePolicy === ExamScorePolicyCode.MAKEUP_CAP60)

const makeupCap60AlertMessage = computed(() =>
  form.correctionType === GradeCorrectionTypeCode.TOTAL_SCORE
    ? '本场为补考封顶60分：总分批量更正每条明细不得超过60分'
    : '本场为补考封顶60分：单题批量更正后合成总成绩不得超过60分',
)

const batchTotalScoreMax = computed(() =>
  makeupCap60Hint.value && form.correctionType === GradeCorrectionTypeCode.TOTAL_SCORE
    ? 60
    : undefined,
)

function batchItemProjectionHint(item: PlanItemForm): string {
  if (
    !makeupCap60Hint.value
    || form.correctionType !== GradeCorrectionTypeCode.SINGLE_QUESTION
    || !form.layoutQuestionId
    || !item.reviewRequestId
    || typeof item.afterScore !== 'number'
  ) {
    return ''
  }
  const request = reviewRequestCache.value.get(item.reviewRequestId)
  if (!request) {
    return ''
  }
  const projected = computeSingleQuestionCorrectionCompositeTotal(
    request,
    form.layoutQuestionId,
    item.afterScore,
  )
  if (projected == null) {
    return '当前成绩快照未就绪'
  }
  if (projected > 60) {
    return `更正后合成总分 ${projected} 超过60分`
  }
  return `更正后合成总分 ${projected}`
}

const correctionTypeOptions = [
  {
    value: GradeCorrectionTypeCode.SINGLE_QUESTION,
    label: strictEnumLabel(
      GradeCorrectionTypeDescription,
      GradeCorrectionTypeCode.SINGLE_QUESTION,
      '成绩更正类型',
    ),
  },
  {
    value: GradeCorrectionTypeCode.TOTAL_SCORE,
    label: strictEnumLabel(
      GradeCorrectionTypeDescription,
      GradeCorrectionTypeCode.TOTAL_SCORE,
      '成绩更正类型',
    ),
  },
]

const itemReviewRequestOptions = computed(() => reviewRequestOptions.value)

function buildQuestionOption(question: GradeReviewQuestionRefVO): { value: string, label: string } {
  return {
    value: question.layoutQuestionId,
    label: `第 ${question.questionNo} 题 · ${question.questionType} · 满分 ${question.fullScore} 分`,
  }
}

function buildReviewRequestOption(request: GradeReviewRequestItemResponse): {
  value: string
  label: string
} {
  return {
    value: request.id,
    label: `${reviewRequestStudentLabel(request)} · ${reviewRequestQuestionLabel(request)}`,
  }
}

function cacheReviewRequests(requests: GradeReviewRequestItemResponse[]): void {
  for (const request of requests) {
    reviewRequestCache.value.set(request.id, request)
  }
}

/** 撤回/已确认/已发布/已更正卷可纳入批量更正；与后端 applyGradeCorrection 门禁一致。 */
function isFinalScoreCorrectable(request: GradeReviewRequestItemResponse): boolean {
  // MVR-323：禁止缺省 finalScoreStatus 时纳入批量更正假可写（对齐 CorrectionsCard MVR-321）
  const status = request.finalScoreStatus
  if (!status) {
    return false
  }
  return (
    status === FinalScoreStatusCode.CONFIRMED
    || status === FinalScoreStatusCode.PUBLISHED
    || status === FinalScoreStatusCode.CORRECTED
    || status === FinalScoreStatusCode.WITHDRAWN
  )
}

/** MVR-194/208/209：与 BE assertGradeReviewOperatorSeparatedFromStudent 同源 */
function isGradeReviewApplicantSelf(request: GradeReviewRequestItemResponse): boolean {
  return Boolean(
    currentUserId.value
    && request.studentUserId
    && String(request.studentUserId) === String(currentUserId.value),
  )
}

function filterCorrectableReviewRequests(
  requests: GradeReviewRequestItemResponse[],
): GradeReviewRequestItemResponse[] {
  return requests.filter(
    (request) => isFinalScoreCorrectable(request) && !isGradeReviewApplicantSelf(request),
  )
}

const columns: ColumnType<ExamBatchGradeCorrectionPlan>[] = [
  { title: '名称', dataIndex: 'planName', key: 'planName', ellipsis: true, fixed: 'left' },
  { title: '类型', key: 'correctionType', width: 110 },
  { title: '受影响题目', key: 'affectedQuestionRefs', width: 160 },
  {
    title: '影响人数',
    dataIndex: 'affectedStudentCount',
    key: 'affectedStudentCount',
    width: 96,
    align: 'right',
  },
  { title: '已执行', dataIndex: 'executedCount', key: 'executedCount', width: 90 },
  { title: '审批状态', key: 'approvalStatus', width: 110 },
  { title: '审批时间', key: 'approvedTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
  { title: '创建时间', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 210 },
]

async function loadWriteCapability(examId: string, loadGeneration: number): Promise<void> {
  if (!examId) {
    canManageReviewerWrites.value = false
    return
  }
  try {
    const summary = await getExamLayoutQuestionSummary(examId)
    if (loadGeneration !== batchPlanLoadGeneration || props.examId !== examId) {
      return
    }
    canManageReviewerWrites.value = summary.canManageReviewerWrites === true
  } catch {
    if (loadGeneration !== batchPlanLoadGeneration || props.examId !== examId) {
      return
    }
    canManageReviewerWrites.value = false
  }
}

async function reload(): Promise<void> {
  const examId = props.examId
  if (!examId) return
  const loadGeneration = ++batchPlanLoadGeneration
  loading.value = true
  try {
    await loadWriteCapability(examId, loadGeneration)
    if (loadGeneration !== batchPlanLoadGeneration || props.examId !== examId) {
      return
    }
    const keyword = filterForm.keyword.trim() || undefined
    const result = await listBatchCorrectionPlans({
      examId,
      approvalStatus: filterForm.status,
      keyword,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    if (loadGeneration !== batchPlanLoadGeneration || props.examId !== examId) {
      return
    }
    listLoadFailed.value = false
    rows.value = result.list
    pagination.total = result.total
    pagination.current = result.pageNum ?? pagination.current
    pagination.pageSize = result.pageSize ?? pagination.pageSize
  } catch (e) {
    if (loadGeneration !== batchPlanLoadGeneration || props.examId !== examId) {
      return
    }
    listLoadFailed.value = true
    showUserError(e, '批量成绩更正计划加载失败')
  } finally {
    if (loadGeneration === batchPlanLoadGeneration) {
      loading.value = false
    }
  }
}

function handleSearch(): void {
  pagination.current = 1
  void reload()
}

function handleFilterReset(): void {
  filterForm.status = undefined
  filterForm.keyword = ''
  pagination.current = 1
  void reload()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void reload()
}

async function openCreateModal(): Promise<void> {
  if (!canManageReviewerWrites.value) {
    void message.warning('仅本场阅卷组织成员或主考可创建批量更正计划')
    return
  }
  form.planName = ''
  form.correctionType = GradeCorrectionTypeCode.SINGLE_QUESTION
  form.layoutQuestionId = ''
  form.reason = ''
  form.items = [createEmptyItem()]
  createOpen.value = true
  await Promise.all([loadApprovedQuestionOptions(), loadReviewRequestOptions('')])
}

async function loadApprovedQuestionOptions(): Promise<void> {
  if (!props.examId) return
  questionOptionsLoading.value = true
  try {
    const questions = await listApprovedReviewQuestionOptions(props.examId)
    questionOptions.value = questions.map((question) => buildQuestionOption(question))
  } catch (e) {
    questionOptions.value = []
    showUserError(e, '已通过复核申请题目加载失败')
  } finally {
    questionOptionsLoading.value = false
  }
}

async function loadReviewRequestOptions(keyword?: string): Promise<void> {
  const examId = props.examId
  if (!examId) return
  if (form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION && !form.layoutQuestionId) {
    reviewRequestOptions.value = []
    return
  }
  const searchKeyword = keyword?.trim() || ''
  const searchGeneration = ++reviewRequestSearchGeneration
  reviewRequestLoading.value = true
  try {
    const result = await listReviewRequests({
      examId,
      requestStatus: GradeReviewRequestStatusCode.APPROVED,
      layoutQuestionId:
        form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION
          ? form.layoutQuestionId
          : undefined,
      keyword: searchKeyword || undefined,
      pageNum: 1,
      pageSize: APPROVED_REVIEW_REQUEST_PAGE_SIZE,
    })
    if (searchGeneration !== reviewRequestSearchGeneration || props.examId !== examId) {
      return
    }
    const correctable = filterCorrectableReviewRequests(result.list)
    cacheReviewRequests(correctable)
    reviewRequestOptions.value = correctable.map((request) => buildReviewRequestOption(request))
    for (const item of form.items) {
      if (item.reviewRequestId && !reviewRequestCache.value.has(item.reviewRequestId)) {
        await pinReviewRequestById(item.reviewRequestId)
      }
    }
  } catch (e) {
    if (searchGeneration !== reviewRequestSearchGeneration || props.examId !== examId) {
      return
    }
    showUserError(e, '已通过复核申请加载失败')
  } finally {
    if (searchGeneration === reviewRequestSearchGeneration) {
      reviewRequestLoading.value = false
    }
  }
}

async function pinReviewRequestById(reviewRequestId: string): Promise<void> {
  const result = await listReviewRequests({
    examId: props.examId,
    requestStatus: GradeReviewRequestStatusCode.APPROVED,
    id: reviewRequestId,
    pageNum: 1,
    pageSize: 1,
  })
  if (result.list.length === 0) return
  const correctable = filterCorrectableReviewRequests(result.list)
  if (correctable.length === 0) return
  cacheReviewRequests(correctable)
  const option = buildReviewRequestOption(correctable[0])
  if (!reviewRequestOptions.value.some((item) => item.value === option.value)) {
    reviewRequestOptions.value = [option, ...reviewRequestOptions.value]
  }
}

function onReviewRequestSearch(keyword: string): void {
  if (reviewRequestSearchTimer) {
    clearTimeout(reviewRequestSearchTimer)
  }
  reviewRequestSearchTimer = setTimeout(() => {
    void loadReviewRequestOptions(keyword)
  }, REVIEW_REQUEST_SEARCH_DEBOUNCE_MS)
}

function handleItemReviewRequestChange(value: unknown, item: PlanItemForm): void {
  const reviewRequestId = value != null ? String(value) : ''
  if (!reviewRequestId) return
  const request = reviewRequestCache.value.get(reviewRequestId)
  if (request) return
  void pinReviewRequestById(reviewRequestId).then(() => {
    if (!reviewRequestCache.value.has(item.reviewRequestId)) {
      item.reviewRequestId = ''
    }
  })
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
  form.layoutQuestionId = ''
  for (const item of form.items) {
    item.reviewRequestId = ''
  }
  void loadReviewRequestOptions('')
}

function handleQuestionChange(): void {
  for (const item of form.items) {
    item.reviewRequestId = ''
  }
  void loadReviewRequestOptions('')
}

function buildCreateRequest(): BatchCorrectionPlanCreateRequest | null {
  if (!form.planName.trim()) {
    void message.warning('计划名称必填')
    return null
  }
  if (form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION && !form.layoutQuestionId) {
    void message.warning('单题批量更正请选择题目')
    return null
  }
  if (!form.reason.trim()) {
    void message.warning('更正原因必填')
    return null
  }
  if (form.items.length === 0) {
    void message.warning('更正明细不能为空')
    return null
  }
  const items: BatchCorrectionPlanCreateRequest['items'] = []
  for (const item of form.items) {
    const request = reviewRequestCache.value.get(item.reviewRequestId)
    if (!request) {
      void message.warning('更正明细请选择已通过的复核申请')
      return null
    }
    // MVR-209：申请人不得将本人复核申请写入批量更正计划
    if (isGradeReviewApplicantSelf(request)) {
      void message.warning('不能将本人的复核申请加入批量更正计划，请由其他教师处理')
      return null
    }
    if (
      form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION
      && !request.questionRefs.some((question) => question.layoutQuestionId === form.layoutQuestionId)
    ) {
      void message.warning('更正明细包含未申请该题目的学生')
      return null
    }
    if (typeof item.afterScore !== 'number') {
      void message.warning('更正明细中的更正后分数必填')
      return null
    }
    if (
      form.correctionType === GradeCorrectionTypeCode.TOTAL_SCORE
      && props.scorePolicy === ExamScorePolicyCode.MAKEUP_CAP60
      && item.afterScore > 60
    ) {
      void message.warning('补考成绩策略为封顶60分，更正后总成绩不能超过60分')
      return null
    }
    if (
      form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION
      && props.scorePolicy === ExamScorePolicyCode.MAKEUP_CAP60
      && form.layoutQuestionId
      && isMakeupCap60SingleQuestionCorrectionExceeded(request, form.layoutQuestionId, item.afterScore)
    ) {
      void message.warning('补考成绩策略为封顶60分，单题更正后合成总成绩不能超过60分')
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
    void message.warning('同一计划中不能重复选择同一名学生的复核申请')
    return null
  }
  return {
    examId: props.examId,
    planName: form.planName.trim(),
    correctionType: form.correctionType,
    layoutQuestionId:
      form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION
        ? form.layoutQuestionId
        : undefined,
    items,
    reason: form.reason.trim(),
  }
}

async function handleCreate(): Promise<void> {
  // MVR-313：与 openCreateModal / canManageReviewerWrites 同源二次拦截
  if (!canManageReviewerWrites.value) {
    void message.warning('仅本场阅卷组织成员或主考可创建批量更正计划')
    return
  }
  const request = buildCreateRequest()
  if (!request) return
  if (creating.value || operatingId.value) {
    return
  }
  creating.value = true
  try {
    await createBatchCorrectionPlan(request)
    void message.success('批量更正计划草稿已创建')
    createOpen.value = false
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '批量成绩更正计划创建失败')
  } finally {
    creating.value = false
  }
}

async function handleSubmitPlan(planId: string): Promise<void> {
  if (operatingId.value || creating.value) {
    return
  }
  // MVR-313：与 canSubmit / BE 提交门禁同源
  const row = rows.value.find((item) => item.id === planId)
  if (!row || !canSubmit(row)) {
    void message.warning('当前账号不可提交该批量更正计划')
    return
  }
  operatingId.value = planId
  operatingAction.value = 'submit'
  try {
    await submitBatchCorrectionPlan({ planId })
    void message.success('已提交审批')
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '批量成绩更正计划提交失败')
  } finally {
    resetOperating()
  }
}

async function handleApprove(planId: string): Promise<void> {
  const row = rows.value.find((item) => item.id === planId)
  if (!row || !canDecideBatchCorrectionPlan(row)) {
    return
  }
  if (operatingId.value || creating.value) {
    return
  }
  operatingId.value = planId
  operatingAction.value = 'approve'
  try {
    await approveBatchCorrectionPlan({ planId, approved: true })
    void message.success('已审批通过')
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '批量成绩更正计划审批失败')
  } finally {
    resetOperating()
  }
}

function openRejectModal(planId: string): void {
  const row = rows.value.find((item) => item.id === planId)
  if (!row || !canDecideBatchCorrectionPlan(row)) {
    return
  }
  rejectPlanId.value = planId
  rejectReason.value = ''
  rejectModalOpen.value = true
}

async function handleReject(): Promise<void> {
  const reason = rejectReason.value.trim()
  if (!reason) {
    showFormValidationMessage('请输入驳回原因')
    return
  }
  if (operatingId.value || creating.value) {
    return
  }
  // MVR-313：与 canDecideBatchCorrectionPlan 同源二次拦截
  const row = rows.value.find((item) => item.id === rejectPlanId.value)
  if (!row || !canDecideBatchCorrectionPlan(row)) {
    void message.warning('当前账号不可驳回该批量更正计划')
    return
  }
  operatingId.value = rejectPlanId.value
  operatingAction.value = 'reject'
  try {
    await approveBatchCorrectionPlan({ planId: rejectPlanId.value, approved: false, reason })
    void message.success('已驳回')
    rejectModalOpen.value = false
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '批量成绩更正计划驳回失败')
  } finally {
    resetOperating()
    rejectPlanId.value = ''
  }
}

function openExecuteModal(planId: string): void {
  const row = rows.value.find((item) => item.id === planId)
  // MVR-380：与 handleExecute / canManageReviewerWrites 二次拦截
  if (
    !canManageReviewerWrites.value
    || !row
    || row.approvalStatus !== BatchCorrectionApprovalStatusCode.APPROVED
  ) {
    void message.warning('当前账号不可执行该批量更正计划')
    return
  }
  executePlanId.value = planId
  executeReason.value = ''
  executeModalOpen.value = true
}

async function handleExecute(): Promise<void> {
  const reason = executeReason.value.trim()
  if (reason.length < 5) {
    showFormValidationMessage('请输入不少于 5 字的执行说明')
    return
  }
  const planId = executePlanId.value
  if (!planId) return
  if (operatingId.value || creating.value) {
    return
  }
  // MVR-313：执行写二次拦截，与行动作 hidden 条件同源
  const row = rows.value.find((item) => item.id === planId)
  if (
    !canManageReviewerWrites.value
    || !row
    || row.approvalStatus !== BatchCorrectionApprovalStatusCode.APPROVED
  ) {
    void message.warning('当前账号不可执行该批量更正计划')
    return
  }
  operatingId.value = planId
  operatingAction.value = 'execute'
  try {
    await executeBatchCorrectionPlan({ planId, executeReason: reason })
    void message.success('批量更正执行完成')
    executeModalOpen.value = false
    await reload()
    emit('changed')
    void confirmAsync({
      title: '请确认成绩发布状态',
      content: '若更正前成绩已发布，学生端暂不可见最新分数。请前往成绩确认与发布页重新发布。',
      okText: '前往确认与发布',
      type: 'info',
      cancelText: '稍后处理',
      onOk: () => {
        void router.push({
          name: 'TeacherExamWorkspaceScoreSummary',
          params: { examId: props.examId },
        })
      },
    })
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

function canSubmit(row: ExamBatchGradeCorrectionPlan): boolean {
  return (
    canManageReviewerWrites.value
    && (row.approvalStatus === BatchCorrectionApprovalStatusCode.DRAFT
      || row.approvalStatus === BatchCorrectionApprovalStatusCode.REJECTED)
  )
}

/** MVR-195：与 BE assertBatchCorrectionApproverSeparatedFromSubmitter 同源 */
function isBatchCorrectionSubmitterSelf(row: ExamBatchGradeCorrectionPlan): boolean {
  if (!currentUserId.value) {
    return false
  }
  const submitterId = row.updateUser || row.createUser
  return Boolean(submitterId && String(submitterId) === String(currentUserId.value))
}

function canDecideBatchCorrectionPlan(row: ExamBatchGradeCorrectionPlan): boolean {
  return (
    canManageReviewerWrites.value
    && row.approvalStatus === BatchCorrectionApprovalStatusCode.PENDING_APPROVAL
    && !isBatchCorrectionSubmitterSelf(row)
  )
}

function buildBatchCorrectionPlanActions(
  row: ExamBatchGradeCorrectionPlan,
): UiTableRowActionItem[] {
  // 行内仅 1 个 primary：提交 > 通过 > 执行；详情始终可读
  const operating = (action: OperationAction) => isOperating(row.id, action)
  const canDecide = canDecideBatchCorrectionPlan(row)
  const actions: UiTableRowActionItem[] = [
    {
      key: 'detail',
      label: '详情',
    },
    {
      key: 'submit',
      label: '提交',
      hidden: !canSubmit(row),
      disabled: operating('submit'),
    },
    {
      key: 'approve',
      label: '通过',
      hidden: !canDecide,
      disabled: operating('approve'),
    },
    {
      key: 'reject',
      label: '驳回',
      tone: 'danger',
      hidden: !canDecide,
      disabled: operating('reject'),
    },
    {
      key: 'execute',
      label: '执行',
      hidden:
        !canManageReviewerWrites.value
        || row.approvalStatus !== BatchCorrectionApprovalStatusCode.APPROVED,
      disabled: operating('execute'),
    },
  ]
  const primaryKey = canSubmit(row)
    ? 'submit'
    : canDecide
      ? 'approve'
      : row.approvalStatus === BatchCorrectionApprovalStatusCode.APPROVED
        ? 'execute'
        : undefined
  return actions.map((action) =>
    action.key === primaryKey && !action.hidden && action.tone !== 'danger'
      ? { ...action, tone: 'primary' as const }
      : action,
  )
}

function openPlanDetail(row: ExamBatchGradeCorrectionPlan): void {
  detailPlan.value = row
  detailOpen.value = true
}

function closePlanDetail(): void {
  detailOpen.value = false
  detailPlan.value = null
}

function handleBatchCorrectionPlanAction(key: string, row: ExamBatchGradeCorrectionPlan): void {
  switch (key) {
    case 'detail':
      openPlanDetail(row)
      break
    case 'submit':
      if (!canSubmit(row)) return
      void confirmAsync({
        title: '确认提交审批？',
        content: `计划：${row.planName}\n计划 ID：${row.id}\n影响 ${row.affectedStudentCount} 名考生。`,
        okText: '提交',
        cancelText: '取消',
        type: 'warning',
        onOk: () => handleSubmitPlan(row.id),
      })
      break
    case 'approve':
      if (row.approvalStatus !== BatchCorrectionApprovalStatusCode.PENDING_APPROVAL) return
      void confirmAsync({
        title: '确认审批通过？',
        content: `计划：${row.planName}\n计划 ID：${row.id}`,
        okText: '通过',
        cancelText: '取消',
        type: 'warning',
        onOk: () => handleApprove(row.id),
      })
      break
    case 'reject':
      openRejectModal(row.id)
      break
    case 'execute':
      openExecuteModal(row.id)
      break
  }
}

function correctionTypeLabel(row: ExamBatchGradeCorrectionPlan): string {
  const code: GradeCorrectionTypeCode | undefined = row.correctionType
  return strictEnumLabel(GradeCorrectionTypeDescription, code, '成绩更正类型')
}

function affectedQuestionSummary(row: ExamBatchGradeCorrectionPlan): string {
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

function approvalStatusLabel(row: ExamBatchGradeCorrectionPlan): string {
  return strictEnumLabel(
    BatchCorrectionApprovalStatusDescription,
    row.approvalStatus,
    '批量更正审批状态',
  )
}

function approvalStatusColor(row: ExamBatchGradeCorrectionPlan): BadgeTone {
  return strictEnumTone(BATCH_CORRECTION_STATUS_TONE, row.approvalStatus, '批量更正审批状态')
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (reviewRequestSearchTimer) {
      clearTimeout(reviewRequestSearchTimer)
      reviewRequestSearchTimer = undefined
    }
    reviewRequestSearchGeneration += 1
    reviewRequestCache.value = new Map()
    reviewRequestOptions.value = []
    questionOptions.value = []
    detailOpen.value = false
    detailPlan.value = null
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
  gap: var(--dp-space-component);
}

.batch-plan-items__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.batch-plan-item {
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}

.batch-plan-item :deep(.ant-row) {
  align-items: center;
}

.batch-plan-item__hint {
  margin-top: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
</style>
