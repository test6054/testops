<template>
  <WorkbenchSurfaceCard flush class="appeal-section">
    <template #head>
      <div class="appeal-section__header">
        <span class="appeal-section__flow-hint">{{ BATCH_CORRECTION_FLOW_HINT }}</span>
        <UiButton
          v-if="canManageReviewerWrites === true"
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
        :title="editingPlanId ? '编辑批量更正计划' : '新建批量更正计划'"
        :width="840"
        :confirm-loading="creating === true"
        :mask-closable="false"
        :hide-footer="false"
        :ok-text="editingPlanId ? '保存修改' : '保存草稿'"
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
        v-model:open="executeModalOpen"
        :title="executeModalTitle"
        :width="520"
        :confirm-loading="operatingAction === 'execute'"
        :hide-footer="false"
        :ok-text="executeModalOkText"
        cancel-text="取消"
        @confirm="handleExecute"
      >
        <UiAlertStrip
          tone="warning"
          :title="executeModalAlertTitle"
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
        :title="detailDecisionMode ? '审批批量更正计划' : '批量更正计划详情'"
        :width="920"
        :hide-footer="detailDecisionMode === ''"
        :confirm-loading="operatingAction === detailDecisionMode"
        :ok-text="detailDecisionMode === 'reject' ? '确认驳回' : '审批通过'"
        cancel-text="关闭"
        @confirm="handleDecisionFromDetail"
        @close="closePlanDetail"
      >
        <UiAlertStrip
          v-if="detailLoadFailed"
          tone="error"
          title="计划审批详情加载失败"
          dense
        />
        <template v-else-if="detailPlan">
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
            <UiFormItem label="逐生更正明细">
              <UiDataTable
                :columns="detailItemColumns"
                :data-source="detailItems"
                :loading="detailLoading"
                row-key="id"
                size="small"
                pagination-mode="none"
                :show-pagination="false"
                :fill-remaining="false"
                :scroll-y="360"
                flat
                aria-label="批量更正逐生审批明细"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'student'">
                    {{ record.studentName }}（{{ record.studentNo }}）
                  </template>
                  <template v-else-if="column.key === 'scoreChange'">
                    {{ record.beforeScore }} → {{ record.afterScore }}
                  </template>
                  <template v-else-if="column.key === 'requestStatus'">
                    {{ detailRequestStatusLabel(record) }}
                  </template>
                  <template v-else-if="column.key === 'finalScoreStatus'">
                    {{ detailFinalScoreStatusLabel(record) }}
                  </template>
                  <template v-else-if="column.key === 'executionStatus'">
                    <UiTag :tone="itemExecutionStatusTone(record.executionStatus)">
                      {{ itemExecutionStatusLabel(record.executionStatus) }}
                    </UiTag>
                  </template>
                  <template v-else-if="column.key === 'executionFailureReason'">
                    {{ record.executionFailureReason || '—' }}
                  </template>
                </template>
              </UiDataTable>
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
            <UiFormItem
              v-if="detailDecisionMode"
              :label="detailDecisionMode === 'reject' ? '本次驳回原因' : '本次审批意见'"
              required
            >
              <UiTextarea
                size="sm"
                v-model="decisionReason"
                :maxlength="500"
                :rows="3"
                :show-count="true"
                :placeholder="detailDecisionMode === 'reject'
                  ? '请说明逐生核对后的驳回依据和需修订内容（不少于 5 字）'
                  : '请说明核对范围、分数依据和审批结论（不少于 5 字）'"
              />
            </UiFormItem>
            <UiAlertStrip
              tone="info"
              dense
              title="学生可见性"
              description="执行成功后成绩仍须在成绩确认与发布页提交发布复核，由指定复核人签审通过后学生端才会看到更正结果。"
            />
          </UiForm>
        </template>
      </UiDrawer>
    </template>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
// MVR-951：函数式 can*(...) 写入口仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  BatchCorrectionItemExecutionStatusCode,
  BatchCorrectionPlanCreateRequest,
  BatchCorrectionPlanDetailVO,
  BatchCorrectionPlanItemDetailVO,
  BatchCorrectionPlanUpdateRequest,
  ExamBatchGradeCorrectionPlan,
  GradeReviewQuestionRefVO,

  GradeReviewRequestItemResponse} from '@/apis/mark/grade-review'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import {
  approveBatchCorrectionPlan,
  BATCH_CORRECTION_FLOW_HINT,
  BATCH_CORRECTION_ITEM_EXECUTION_STATUS_TONE,
  BATCH_CORRECTION_STATUS_OPTIONS,
  BATCH_CORRECTION_STATUS_TONE,
  BatchCorrectionApprovalStatusCode,
  BatchCorrectionApprovalStatusDescription,
  BatchCorrectionItemExecutionStatusDescription,
  computeSingleQuestionCorrectionCompositeTotal,
  createBatchCorrectionPlan,
  executeBatchCorrectionPlan,
  getBatchCorrectionPlanDetail,
  GradeCorrectionTypeCode,
  GradeCorrectionTypeDescription,
  GradeReviewRequestStatusCode,
  GradeReviewRequestStatusDescription,
  isMakeupCap60SingleQuestionCorrectionExceeded,
  listApprovedReviewQuestionOptions,
  listBatchCorrectionPlans,
  listReviewRequests,
  submitBatchCorrectionPlan,
  updateBatchCorrectionPlan,
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
import {
  FinalScoreStatusCode,
  FinalScoreStatusDescription,
} from '@/types/enums/final-score-status-enum'
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

type ReviewRequestCandidate = Pick<
  GradeReviewRequestItemResponse,
  | 'id'
  | 'studentUserId'
  | 'studentNo'
  | 'studentName'
  | 'questionRefs'
  | 'finalScoreStatus'
  | 'currentExamScore'
  | 'currentDailyScore'
>

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
const editingPlanId = ref('')
const operatingId = ref('')
const operatingAction = ref<OperationAction>('')
const executeModalOpen = ref(false)
const executePlanId = ref('')
const executeReason = ref('')
const executeResumePartial = ref(false)
const executeModalTitle = computed(() =>
  executeResumePartial.value ? '继续执行失败明细' : '执行批量更正计划',
)
const executeModalOkText = computed(() =>
  executeResumePartial.value ? '继续执行' : '确认执行',
)
const executeModalAlertTitle = computed(() =>
  executeResumePartial.value
    ? '将仅对失败/待执行明细逐条写分；已成功明细保留，不会回滚。'
    : '将逐条独立写分；某一学生失败不会回滚已成功的学生，可稍后继续执行失败项。',
)
const detailOpen = ref(false)
const detailPlan = ref<ExamBatchGradeCorrectionPlan | null>(null)
const detailItems = ref<BatchCorrectionPlanItemDetailVO[]>([])
const detailLoading = ref(false)
const detailLoadFailed = ref(false)
const detailDecisionMode = ref<'approve' | 'reject' | ''>('')
const decisionReason = ref('')
const nextLocalId = ref(1)
const reviewRequestOptions = ref<{ value: string, label: string }[]>([])
const reviewRequestCache = ref<Map<string, ReviewRequestCandidate>>(new Map())
const reviewRequestLoading = ref(false)
const questionOptions = ref<{ value: string, label: string }[]>([])
const questionFullScoreById = ref<Record<string, number>>({})
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

const batchTotalScoreMax = computed(() => {
  if (makeupCap60Hint.value && form.correctionType === GradeCorrectionTypeCode.TOTAL_SCORE) {
    return 60
  }
  if (form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION && form.layoutQuestionId) {
    return questionFullScoreById.value[form.layoutQuestionId]
  }
  return undefined
})

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

function buildReviewRequestOption(request: ReviewRequestCandidate): {
  value: string
  label: string
} {
  return {
    value: request.id,
    label: `${reviewRequestStudentLabel(request)} · ${reviewRequestQuestionLabel(request)}`,
  }
}

function cacheReviewRequests(requests: ReviewRequestCandidate[]): void {
  for (const request of requests) {
    reviewRequestCache.value.set(request.id, request)
  }
}

function buildReviewRequestCandidateFromDetail(
  item: BatchCorrectionPlanItemDetailVO,
): ReviewRequestCandidate {
  return {
    id: item.reviewRequestId,
    studentUserId: item.studentUserId,
    studentNo: item.studentNo,
    studentName: item.studentName,
    questionRefs: item.questionRefs,
    finalScoreStatus: item.finalScoreStatus,
    currentExamScore: item.currentExamScore,
    currentDailyScore: item.currentDailyScore,
  }
}

/** 首次更正只接受已发布成绩；CORRECTED 仅由后端同申请连续更正门禁最终裁决。 */
function isFinalScoreCorrectable(request: ReviewRequestCandidate): boolean {
  const status = request.finalScoreStatus
  if (!status) {
    return false
  }
  return (
    status === FinalScoreStatusCode.PUBLISHED || status === FinalScoreStatusCode.CORRECTED
  )
}

/** MVR-194/208/209：与 BE assertGradeReviewOperatorSeparatedFromStudent 同源 */
function isGradeReviewApplicantSelf(request: ReviewRequestCandidate): boolean {
  return Boolean(
    currentUserId.value
    && request.studentUserId
    && String(request.studentUserId) === String(currentUserId.value),
  )
}

function filterCorrectableReviewRequests(
  requests: GradeReviewRequestItemResponse[],
): ReviewRequestCandidate[] {
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

const detailItemColumns: ColumnType<BatchCorrectionPlanItemDetailVO>[] = [
  { title: '学生', key: 'student', width: 180, fixed: 'left' },
  { title: '复核申请原因', dataIndex: 'requestReason', key: 'requestReason', ellipsis: true },
  { title: '原分 → 目标分', key: 'scoreChange', width: 140, align: 'right' },
  { title: '复核状态', key: 'requestStatus', width: 100 },
  { title: '成绩状态', key: 'finalScoreStatus', width: 110 },
  { title: '执行状态', key: 'executionStatus', width: 100 },
  { title: '失败原因', key: 'executionFailureReason', width: 180, ellipsis: true },
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
  if (!examId) {
    rows.value = []
    pagination.total = 0
    listLoadFailed.value = false
    return
  }
  const loadGeneration = ++batchPlanLoadGeneration
  loading.value = true
  rows.value = []
  pagination.total = 0
  listLoadFailed.value = false
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
    rows.value = []
    pagination.total = 0
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
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可创建批量更正计划')
    return
  }
  editingPlanId.value = ''
  reviewRequestCache.value = new Map()
  reviewRequestOptions.value = []
  form.planName = ''
  form.correctionType = GradeCorrectionTypeCode.SINGLE_QUESTION
  form.layoutQuestionId = ''
  form.reason = ''
  form.items = [createEmptyItem()]
  createOpen.value = true
  await Promise.all([loadApprovedQuestionOptions(), loadReviewRequestOptions('')])
}

async function openEditModal(row: ExamBatchGradeCorrectionPlan): Promise<void> {
  if (
    canManageReviewerWrites.value !== true
    || (row.approvalStatus !== BatchCorrectionApprovalStatusCode.DRAFT
      && row.approvalStatus !== BatchCorrectionApprovalStatusCode.REJECTED)
  ) {
    void message.warning('当前计划状态不可编辑')
    return
  }
  creating.value = true
  try {
    const detail = await getBatchCorrectionPlanDetail(row.id)
    if (
      detail.plan.correctionType !== GradeCorrectionTypeCode.SINGLE_QUESTION
      && detail.plan.correctionType !== GradeCorrectionTypeCode.TOTAL_SCORE
    ) {
      throw new Error(`不支持编辑的成绩更正类型：${detail.plan.correctionType}`)
    }
    const selectedQuestionId = detail.plan.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION
      ? detail.plan.affectedQuestionRefs[0]?.layoutQuestionId
      : ''
    if (detail.plan.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION && !selectedQuestionId) {
      throw new Error('单题批量更正计划缺少题目范围')
    }
    editingPlanId.value = row.id
    form.planName = detail.plan.planName
    form.correctionType = detail.plan.correctionType
    form.layoutQuestionId = selectedQuestionId || ''
    form.reason = detail.plan.reason || ''
    form.items = detail.items.map((item) => ({
      localId: nextLocalId.value++,
      reviewRequestId: item.reviewRequestId,
      afterScore: item.afterScore,
    }))
    const candidates = detail.items.map(buildReviewRequestCandidateFromDetail)
    reviewRequestCache.value = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    reviewRequestOptions.value = candidates.map(buildReviewRequestOption)
    createOpen.value = true
    await loadApprovedQuestionOptions()
  } catch (error) {
    editingPlanId.value = ''
    createOpen.value = false
    showUserError(error, '批量成绩更正计划详情加载失败')
  } finally {
    creating.value = false
  }
}

async function loadApprovedQuestionOptions(): Promise<void> {
  if (!props.examId) return
  questionOptionsLoading.value = true
  try {
    const questions = await listApprovedReviewQuestionOptions(props.examId)
    const fullScoreById: Record<string, number> = {}
    questionOptions.value = questions.map((question) => {
      fullScoreById[question.layoutQuestionId] = question.fullScore
      return buildQuestionOption(question)
    })
    questionFullScoreById.value = fullScoreById
  } catch (e) {
    questionOptions.value = []
    questionFullScoreById.value = {}
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
    if (item.afterScore < 0) {
      void message.warning('更正明细中的更正后分数不能为负')
      return null
    }
    if (form.correctionType === GradeCorrectionTypeCode.SINGLE_QUESTION && form.layoutQuestionId) {
      const question = request.questionRefs.find(
        (ref) => ref.layoutQuestionId === form.layoutQuestionId,
      )
      if (question != null && item.afterScore > question.fullScore) {
        void message.warning(`更正后分数不能超过题目满分 ${question.fullScore}`)
        return null
      }
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
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可创建批量更正计划')
    return
  }
  const request = buildCreateRequest()
  if (!request) return
  if (creating.value === true || Boolean(operatingId.value)) {
    return
  }
  creating.value = true
  try {
    if (editingPlanId.value) {
      const updateRequest: BatchCorrectionPlanUpdateRequest = {
        planId: editingPlanId.value,
        planName: request.planName,
        correctionType: request.correctionType,
        layoutQuestionId: request.layoutQuestionId,
        items: request.items,
        reason: request.reason,
      }
      await updateBatchCorrectionPlan(updateRequest)
      void message.success('批量更正计划已更新为草稿')
    } else {
      await createBatchCorrectionPlan(request)
      void message.success('批量更正计划草稿已创建')
    }
    createOpen.value = false
    editingPlanId.value = ''
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '批量成绩更正计划创建失败')
  } finally {
    creating.value = false
  }
}

async function handleSubmitPlan(planId: string): Promise<void> {
  if (Boolean(operatingId.value) || creating.value === true) {
    return
  }
  // MVR-313：与 canSubmit / BE 提交门禁同源
  const row = rows.value.find((item) => item.id === planId)
  if (!row || canSubmit(row) !== true) {
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

async function handleDecision(
  planId: string,
  decisionMode: 'approve' | 'reject',
  reason: string,
): Promise<void> {
  const row = rows.value.find((item) => item.id === planId)
  if (!row || canDecideBatchCorrectionPlan(row) !== true) {
    return
  }
  if (Boolean(operatingId.value) || creating.value === true) {
    return
  }
  if (reason.trim().length < 5) {
    showFormValidationMessage(
      decisionMode === 'reject' ? '请输入不少于 5 字的驳回原因' : '请输入不少于 5 字的审批意见',
    )
    return
  }
  operatingId.value = planId
  operatingAction.value = decisionMode
  try {
    await approveBatchCorrectionPlan({
      planId,
      approved: decisionMode === 'approve',
      reason: reason.trim(),
    })
    void message.success(decisionMode === 'approve' ? '已审批通过' : '已驳回')
    detailOpen.value = false
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(
      e,
      decisionMode === 'approve'
        ? '批量成绩更正计划审批失败'
        : '批量成绩更正计划驳回失败',
    )
  } finally {
    resetOperating()
  }
}

async function handleDecisionFromDetail(): Promise<void> {
  const planId = detailPlan.value?.id
  const decisionMode = detailDecisionMode.value
  if (!planId || !decisionMode) return
  if (
    detailLoading.value
    || detailLoadFailed.value
    || detailItems.value.length !== detailPlan.value?.affectedStudentCount
  ) {
    showFormValidationMessage('逐生审批明细尚未完整加载，不能作出审批决定')
    return
  }
  await handleDecision(planId, decisionMode, decisionReason.value)
}

function openExecuteModal(planId: string): void {
  const row = rows.value.find((item) => item.id === planId)
  // MVR-380：与 handleExecute / canManageReviewerWrites 二次拦截
  if (
    canManageReviewerWrites.value !== true
    || !row
    || canExecuteBatchCorrectionPlan(row) !== true
  ) {
    void message.warning('当前账号不可执行该批量更正计划')
    return
  }
  executePlanId.value = planId
  executeReason.value = ''
  executeResumePartial.value
    = row.approvalStatus === BatchCorrectionApprovalStatusCode.PARTIAL_FAILED
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
  if (Boolean(operatingId.value) || creating.value === true) {
    return
  }
  // MVR-313：执行写二次拦截，与行动作 hidden 条件同源
  const row = rows.value.find((item) => item.id === planId)
  if (
    canManageReviewerWrites.value !== true
    || !row
    || canExecuteBatchCorrectionPlan(row) !== true
  ) {
    void message.warning('当前账号不可执行该批量更正计划')
    return
  }
  operatingId.value = planId
  operatingAction.value = 'execute'
  try {
    const result = await executeBatchCorrectionPlan({ planId, executeReason: reason })
    if (result.failedCount > 0) {
      void message.warning(
        `批量更正部分完成：成功 ${result.succeededCount} 人，失败 ${result.failedCount} 人，可继续执行失败明细`,
      )
    } else {
      void message.success(
        `批量更正执行完成：成功 ${result.succeededCount} / ${result.totalCount} 人`,
      )
    }
    executeModalOpen.value = false
    await reload()
    emit('changed')
    if (result.succeededCount > 0) {
      void confirmAsync({
        title: '请确认成绩发布状态',
        content: '若更正前成绩已发布，学生端暂不可见最新分数。请前往成绩确认与发布页提交发布复核。',
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
    }
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
    canManageReviewerWrites.value === true
    && row.approvalStatus === BatchCorrectionApprovalStatusCode.DRAFT
  )
}

function canExecuteBatchCorrectionPlan(row: ExamBatchGradeCorrectionPlan): boolean {
  return (
    row.approvalStatus === BatchCorrectionApprovalStatusCode.APPROVED
    || row.approvalStatus === BatchCorrectionApprovalStatusCode.PARTIAL_FAILED
  )
}

function canEdit(row: ExamBatchGradeCorrectionPlan): boolean {
  return (
    canManageReviewerWrites.value === true
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
    canManageReviewerWrites.value === true
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
      key: 'edit',
      label: '编辑',
      hidden: canEdit(row) !== true,
      disabled: Boolean(operatingId.value) || creating.value === true,
    },
    {
      key: 'submit',
      label: '提交',
      hidden: canSubmit(row) !== true,
      disabled: operating('submit'),
    },
    {
      key: 'approve',
      label: '通过',
      // MVR-952：canDecide 仅认 === true
      hidden: canDecide !== true,
      disabled: operating('approve'),
    },
    {
      key: 'reject',
      label: '驳回',
      tone: 'danger',
      hidden: canDecide !== true,
      disabled: operating('reject'),
    },
    {
      key: 'execute',
      label:
        row.approvalStatus === BatchCorrectionApprovalStatusCode.PARTIAL_FAILED
          ? '继续执行'
          : '执行',
      hidden:
        canManageReviewerWrites.value !== true
        || canExecuteBatchCorrectionPlan(row) !== true,
      disabled: operating('execute'),
    },
  ]
  const primaryKey = row.approvalStatus === BatchCorrectionApprovalStatusCode.REJECTED && canEdit(row)
    ? 'edit'
    : canSubmit(row)
      ? 'submit'
      : canDecide
      ? 'approve'
      : canExecuteBatchCorrectionPlan(row)
        ? 'execute'
        : undefined
  return actions.map((action) =>
    action.key === primaryKey && !action.hidden && action.tone !== 'danger'
      ? { ...action, tone: 'primary' as const }
      : action,
  )
}

async function openPlanDetail(
  row: ExamBatchGradeCorrectionPlan,
  decisionMode: 'approve' | 'reject' | '' = '',
): Promise<void> {
  detailPlan.value = row
  detailItems.value = []
  detailDecisionMode.value = decisionMode
  decisionReason.value = ''
  detailLoadFailed.value = false
  detailLoading.value = true
  detailOpen.value = true
  try {
    const detail: BatchCorrectionPlanDetailVO = await getBatchCorrectionPlanDetail(row.id)
    detailPlan.value = detail.plan
    detailItems.value = detail.items
  } catch (error) {
    detailLoadFailed.value = true
    detailDecisionMode.value = ''
    showUserError(error, '批量成绩更正计划审批详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

function closePlanDetail(): void {
  detailOpen.value = false
  detailPlan.value = null
  detailItems.value = []
  detailDecisionMode.value = ''
  decisionReason.value = ''
  detailLoadFailed.value = false
}

function handleBatchCorrectionPlanAction(key: string, row: ExamBatchGradeCorrectionPlan): void {
  switch (key) {
    case 'detail':
      void openPlanDetail(row)
      break
    case 'edit':
      void openEditModal(row)
      break
    case 'submit':
      if (canSubmit(row) !== true) return
      void confirmAsync({
        title: '确认提交审批？',
        content: `计划：${row.planName}\n计划 ID：${row.id}\n影响 ${row.affectedStudentCount} 名考生。`,
        okText: '提交',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          // MVR-942：确认后再次走 handleSubmitPlan 内 canSubmit 闸
          await handleSubmitPlan(row.id)
        },
      })
      break
    case 'approve':
      // MVR-944：打开确认前叠 canDecide（写权∧PENDING∧非本人），避免仅靠状态判断
      if (canDecideBatchCorrectionPlan(row) !== true) {
        void message.warning('当前账号不可审批该批量更正计划')
        return
      }
      void openPlanDetail(row, 'approve')
      break
    case 'reject':
      if (canDecideBatchCorrectionPlan(row) !== true) {
        void message.warning('当前账号不可驳回该批量更正计划')
        return
      }
      void openPlanDetail(row, 'reject')
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

function reviewRequestStudentLabel(request: ReviewRequestCandidate): string {
  const name = request.studentName.trim()
  const no = request.studentNo.trim()
  return `${name}（${no}）`
}

function reviewRequestQuestionLabel(request: ReviewRequestCandidate): string {
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

function itemExecutionStatusLabel(status: BatchCorrectionItemExecutionStatusCode): string {
  return strictEnumLabel(
    BatchCorrectionItemExecutionStatusDescription,
    status,
    '批量更正明细执行状态',
  )
}

function itemExecutionStatusTone(status: BatchCorrectionItemExecutionStatusCode): BadgeTone {
  return BATCH_CORRECTION_ITEM_EXECUTION_STATUS_TONE[status]
}

function detailFinalScoreStatusLabel(item: BatchCorrectionPlanItemDetailVO): string {
  return strictEnumLabel(FinalScoreStatusDescription, item.finalScoreStatus, '最终成绩状态')
}

function detailRequestStatusLabel(item: BatchCorrectionPlanItemDetailVO): string {
  return strictEnumLabel(GradeReviewRequestStatusDescription, item.requestStatus, '复核申请状态')
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
    questionFullScoreById.value = {}
    detailOpen.value = false
    detailPlan.value = null
    detailItems.value = []
    detailDecisionMode.value = ''
    detailLoadFailed.value = false
    decisionReason.value = ''
    editingPlanId.value = ''
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
