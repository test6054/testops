<template>
  <WorkbenchSurfaceCard flush class="appeal-section">
    <template #head>
      <div class="appeal-section__header">
        <UiButton
          v-if="canManageReviewerWrites"
          size="sm"
          variant="primary"
          @click="openCreateModal"
        >
          新建纠正
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

      <UiDataTable
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
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'studentNo'">
            <span class="score-summary-table__mono">{{ rows[index].studentNo }}</span>
          </template>
          <template v-else-if="column.key === 'studentName'">
            {{ rows[index].studentName }}
          </template>
          <template v-else-if="column.key === 'questionNo'">
            {{ rows[index].questionNo ? `第${rows[index].questionNo}题` : '—' }}
          </template>
          <template v-else-if="column.key === 'beforeScore'">
            <span class="score-summary-table__score">{{ rows[index].beforeScore }}</span>
          </template>
          <template v-else-if="column.key === 'afterScore'">
            <span class="score-summary-table__score score-summary-table__score--total">
              {{ rows[index].afterScore }}
            </span>
          </template>
          <template v-else-if="column.key === 'effectiveTime'">
            {{ formatDateTime(rows[index].effectiveTime) }}
          </template>
        </template>
      </UiDataTable>

      <UiDrawer
        v-model:open="createOpen"
        title="新建成绩更正"
        :width="560"
        :confirm-loading="submitting"
        :mask-closable="false"
        :hide-footer="false"
        ok-text="提交"
        @confirm="submit"
      >
        <UiForm layout="vertical" :model="form">
          <UiRow :gutter="12">
            <UiCol :span="14">
              <UiFormItem label="复核申请" required>
                <UiSelect
                  size="sm"
                  v-model="form.reviewRequestId"
                  :loading="reviewRequestLoading"
                  :options="reviewRequestOptions"
                  placeholder="选择已通过的复核申请"
                  allow-search
                  :filter-option="false"
                  @search="onReviewRequestSearch"
                  @change="handleReviewRequestChange"
                />
              </UiFormItem>
            </UiCol>
            <UiCol :span="10">
              <UiFormItem label="更正类型">
                <UiInput
                  size="sm" :value="selectedReviewRequestScope" disabled
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiRow :gutter="12">
            <UiCol :span="14">
              <UiFormItem label="更正题目">
                <UiSelect
                  size="sm"
                  v-model="form.layoutQuestionId"
                  :disabled="selectedReviewQuestionOptions.length === 0"
                  :options="selectedReviewQuestionOptions"
                  placeholder="总分更正无需选择题目"
                  allow-clear
                />
              </UiFormItem>
            </UiCol>
            <UiCol :span="10">
              <UiFormItem label="更正后分数" required>
                <UiInputNumber
                  size="sm"
                  v-model="form.afterScore"
                  :min="0"
                  :max="totalCorrectionScoreMax"
                  :precision="2"
                  style="width: 100%"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiAlertStrip
            v-if="makeupCap60Hint"
            tone="info"
            :title="makeupCap60AlertMessage"
            style="margin-bottom: 12px"
          />
          <UiAlertStrip
            v-if="singleQuestionProjectionHint"
            tone="warning"
            :title="singleQuestionProjectionHint"
            style="margin-bottom: 12px"
          />
          <UiFormItem label="申请学生">
            <UiInput
              size="sm" :value="selectedReviewStudentLabel" disabled
            />
          </UiFormItem>
          <UiFormItem label="更正原因" required>
            <UiTextarea size="sm" v-model="form.reason" :rows="3" :max-length="200" :show-count="true" />
          </UiFormItem>
        </UiForm>
      </UiDrawer>
    </template>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradeCorrectionRecordResponse,
  GradeReviewRequestItemResponse,
} from '@/apis/mark/grade-review'
import type { FilterField } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  computeSingleQuestionCorrectionCompositeTotal,
  createCorrection,
  getReviewSummary,
  GradeReviewRequestStatusCode,
  isMakeupCap60SingleQuestionCorrectionExceeded,
  listCorrections,
  listReviewRequests,
} from '@/apis/mark/grade-review'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
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
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { ExamScorePolicyCode } from '@/types/enums/exam-score-policy-enum'
import { FinalScoreStatusCode } from '@/types/enums/final-score-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'CorrectionsCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  scorePolicy?: ExamScorePolicyCode
}>()
const emit = defineEmits<{ (e: 'created'): void }>()
const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo.userId || '')

/** MVR-279：默认拒绝假可写；仅 BE summary.canManageReviewerWrites 为 true 时可新建更正 */
const canManageReviewerWrites = ref(false)
const router = useRouter()

const APPROVED_REVIEW_REQUEST_PAGE_SIZE = 20
const REVIEW_REQUEST_SEARCH_DEBOUNCE_MS = 300

const rows = ref<ExamGradeCorrectionRecordResponse[]>([])
const loading = ref(false)
const reviewRequestOptions = ref<{ value: string, label: string }[]>([])
const reviewRequestCache = ref<Map<string, GradeReviewRequestItemResponse>>(new Map())
const reviewRequestLoading = ref(false)
let reviewRequestSearchTimer: ReturnType<typeof setTimeout> | undefined
const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const filterForm = reactive<{ keyword: string }>({ keyword: '' })

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
    placeholder: '按学号 / 姓名 / 更正原因搜索',
    allowClear: true,
    width: 260,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
]

const columns: ColumnType<ExamGradeCorrectionRecordResponse>[] = [
  { title: '学号', key: 'studentNo', width: 120 },
  { title: '姓名', key: 'studentName', dataIndex: 'studentName', width: 96 },
  { title: '题号', key: 'questionNo', width: 88 },
  { title: '原分', key: 'beforeScore', width: 72, align: 'right' },
  { title: '纠正分', key: 'afterScore', width: 72, align: 'right' },
  { title: '纠正原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '时间', key: 'effectiveTime', width: 160 },
]

const createOpen = ref(false)
const submitting = ref(false)
const form = reactive<{
  layoutQuestionId: string
  afterScore: number
  reason: string
  reviewRequestId: string
}>({
  layoutQuestionId: '',
  afterScore: 0,
  reason: '',
  reviewRequestId: '',
})

const selectedReviewRequest = computed(() => {
  if (!form.reviewRequestId) return undefined
  return reviewRequestCache.value.get(form.reviewRequestId)
})

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

/** 撤回/已确认/已发布/已更正卷可执行成绩更正；CALCULATED/PENDING 不可改官方分。 */
function isFinalScoreCorrectable(request: GradeReviewRequestItemResponse): boolean {
  // MVR-321：禁止缺省 finalScoreStatus 时放行假可更正；仅认 BE 下发终态
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

/** MVR-194/208：与 BE assertGradeReviewOperatorSeparatedFromStudent 同源 */
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

const selectedReviewQuestionOptions = computed(
  () =>
    selectedReviewRequest.value?.questionRefs.map((question) => ({
      value: question.layoutQuestionId,
      label: `第 ${question.questionNo} 题 · ${question.questionType} · 满分 ${question.fullScore} 分`,
    })) ?? [],
)

const selectedReviewRequestScope = computed(() =>
  selectedReviewRequest.value ? reviewRequestQuestionLabel(selectedReviewRequest.value) : '',
)

const selectedReviewStudentLabel = computed(() =>
  selectedReviewRequest.value ? reviewRequestStudentLabel(selectedReviewRequest.value) : '',
)

/** 总分更正且补考封顶60时限制输入上限 */
const isTotalScoreCorrection = computed(
  () => !!selectedReviewRequest.value && selectedReviewRequest.value.questionRefs.length === 0,
)

const makeupCap60Hint = computed(() => props.scorePolicy === ExamScorePolicyCode.MAKEUP_CAP60)

const makeupCap60AlertMessage = computed(() =>
  isTotalScoreCorrection.value
    ? '本场为补考封顶60分：更正后总成绩不得超过60分'
    : '本场为补考封顶60分：单题更正后合成总成绩不得超过60分',
)

const projectedCompositeTotal = computed(() => {
  if (!selectedReviewRequest.value || !form.layoutQuestionId) {
    return null
  }
  return computeSingleQuestionCorrectionCompositeTotal(
    selectedReviewRequest.value,
    form.layoutQuestionId,
    form.afterScore,
  )
})

const singleQuestionProjectionHint = computed(() => {
  if (!makeupCap60Hint.value || !form.layoutQuestionId || !selectedReviewRequest.value) {
    return ''
  }
  const projected = projectedCompositeTotal.value
  if (projected == null) {
    return '当前成绩快照未就绪，提交前请确认最终成绩已确认'
  }
  const currentTotal = selectedReviewRequest.value.currentTotalScore
  const currentPart = currentTotal != null ? `当前总分 ${currentTotal}，` : ''
  if (projected > 60) {
    return `${currentPart}更正后合成总分 ${projected} 超过60分，无法提交`
  }
  return `${currentPart}更正后合成总分 ${projected}`
})

const totalCorrectionScoreMax = computed(() =>
  isTotalScoreCorrection.value && makeupCap60Hint.value ? 60 : undefined,
)

async function openCreateModal(): Promise<void> {
  if (!canManageReviewerWrites.value) {
    message.warning('当前账号无成绩更正写权限')
    return
  }
  form.layoutQuestionId = ''
  form.afterScore = 0
  form.reason = ''
  form.reviewRequestId = ''
  createOpen.value = true
  await loadReviewRequestOptions('')
}

async function loadReviewRequestOptions(keyword?: string): Promise<void> {
  if (!props.examId) return
  reviewRequestLoading.value = true
  try {
    const result = await listReviewRequests({
      examId: props.examId,
      requestStatus: GradeReviewRequestStatusCode.APPROVED,
      keyword: keyword?.trim() || undefined,
      pageNum: 1,
      pageSize: APPROVED_REVIEW_REQUEST_PAGE_SIZE,
    })
    const correctable = filterCorrectableReviewRequests(result.list)
    cacheReviewRequests(correctable)
    reviewRequestOptions.value = correctable.map((request) => buildReviewRequestOption(request))
    if (form.reviewRequestId && !reviewRequestCache.value.has(form.reviewRequestId)) {
      await pinReviewRequestById(form.reviewRequestId)
    }
  } catch (e) {
    reviewRequestOptions.value = []
    showUserError(e, '已通过复核申请加载失败')
  } finally {
    reviewRequestLoading.value = false
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

async function reload(): Promise<void> {
  if (!props.examId) {
    canManageReviewerWrites.value = false
    return
  }
  loading.value = true
  try {
    // MVR-279：汇总下发写能力位，与新建纠正按钮闸对齐
    try {
      const summary = await getReviewSummary(props.examId)
      canManageReviewerWrites.value = summary.canManageReviewerWrites === true
    } catch {
      canManageReviewerWrites.value = false
    }
    const keyword = filterForm.keyword.trim() || undefined
    const result = await listCorrections({
      examId: props.examId,
      keyword,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })

    rows.value = result.list
    pagination.total = result.total
    pagination.current = result.pageNum ?? pagination.current
    pagination.pageSize = result.pageSize ?? pagination.pageSize
    if (rows.value.length === 0 && pagination.total > 0 && pagination.current > 1) {
      pagination.current -= 1
      await reload()
    }
  } catch (e) {
    rows.value = []
    pagination.total = 0
    showUserError(e, '成绩更正记录加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  pagination.current = 1
  void reload()
}

function handleFilterReset(): void {
  filterForm.keyword = ''
  pagination.current = 1
  void reload()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void reload()
}

function handleReviewRequestChange(): void {
  form.layoutQuestionId = ''
}

async function submit(): Promise<void> {
  // MVR-318：成绩更正写权限前置，避免仅靠表单校验后拦截
  if (!canManageReviewerWrites.value) {
    message.warning('当前账号无成绩更正写权限')
    return
  }
  const request = selectedReviewRequest.value
  if (!request) {
    showFormValidationMessage('请选择已通过的复核申请')
    return
  }
  if (!isFinalScoreCorrectable(request)) {
    message.warning('当前卷成绩状态不允许更正（仅已确认/已发布/已更正/已撤回待重发可更正）')
    return
  }
  // MVR-208：申请人不得对本人复核申请执行成绩更正
  if (isGradeReviewApplicantSelf(request)) {
    message.warning('不能对本人的复核申请执行成绩更正，请由其他教师处理')
    return
  }
  if (!form.reason.trim()) {
    message.warning('更正原因必填')
    return
  }
  if (request.questionRefs.length > 0 && !form.layoutQuestionId) {
    message.warning('单题复核申请必须选择更正题目')
    return
  }
  if (
    form.layoutQuestionId
    && !request.questionRefs.some((question) => question.layoutQuestionId === form.layoutQuestionId)
  ) {
    message.warning('更正题目必须来自选中的复核申请')
    return
  }
  if (
    request.questionRefs.length === 0
    && props.scorePolicy === ExamScorePolicyCode.MAKEUP_CAP60
    && form.afterScore > 60
  ) {
    message.warning('补考成绩策略为封顶60分，更正后总成绩不能超过60分')
    return
  }
  if (
    form.layoutQuestionId
    && props.scorePolicy === ExamScorePolicyCode.MAKEUP_CAP60
    && isMakeupCap60SingleQuestionCorrectionExceeded(request, form.layoutQuestionId, form.afterScore)
  ) {
    message.warning('补考成绩策略为封顶60分，单题更正后合成总成绩不能超过60分')
    return
  }
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    const result = await createCorrection({
      examId: props.examId,
      layoutQuestionId: form.layoutQuestionId || undefined,
      afterScore: form.afterScore,
      reason: form.reason.trim(),
      reviewRequestId: request.id,
    })
    let successMessage = form.layoutQuestionId
      ? '单题更正已执行，题目统计已同步刷新'
      : '总分更正已执行'
    const remaining = result.remainingUncorrectedQuestionCount ?? 0
    if (form.layoutQuestionId && remaining > 0) {
      successMessage = `单题更正已执行，同申请尚有 ${remaining} 题待更正，申请仍保持已通过`
    } else if (
      form.layoutQuestionId
      && result.reviewRequestStatusAfterCorrection === GradeReviewRequestStatusCode.CORRECTED
    ) {
      successMessage = '单题更正已执行，申请范围内题目均已更正'
    }
    message.success(successMessage)
    createOpen.value = false
    await reload()
    emit('created')
    if (result.requiresRepublish) {
      void confirmAsync({
        title: '需重新发布成绩',
        content: '成绩已更正（含撤回后改分），学生端暂不可见最新分数。请前往成绩发布页重新发布。',
        okText: '前往发布',
        cancelText: '稍后处理',
        type: 'warning',
        onOk: () => {
          void router.push({
            name: 'TeacherExamWorkspaceScoreRelease',
            params: { examId: props.examId },
          })
        },
      })
    }
  } catch (e) {
    showUserError(e, '成绩更正提交失败')
  } finally {
    submitting.value = false
  }
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
