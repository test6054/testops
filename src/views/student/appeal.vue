<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="appeal-page__context">
        <div class="appeal-page__context-left">
          <UiTag tone="blue" size="sm">{{ appealableExams.length }} 场可申请</UiTag>
          <UiTag v-if="pendingRequestCount > 0" tone="orange" size="sm">
            待处理 {{ pendingRequestCount }}
          </UiTag>
        </div>
        <div class="appeal-page__context-right">
          <UiButton
            variant="outline"
            size="sm"
            :loading="loadingExams || loadingRequests"
            @click="reloadAll"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" :disabled="!selectedAppealableExam" @click="openSubmitModal">
            <template #icon><FormOutlined /></template>
            提交复核申请
          </UiButton>
        </div>
      </div>
    </template>

    <!-- 选择考试 -->
    <UiCard class="appeal-page__select-card">
      <template #title>
        <CheckCircleOutlined />
        <span>选择待申诉的考试</span>
        <UiBadge tone="blue">{{ appealableExams.length }} 场</UiBadge>
      </template>

      <!-- D-9 错误态：考试列表加载失败时提供重试入口（学生侧无上报入口） -->
      <UiErrorRetryPanel
        v-if="examsLoadError"
        :error="examsLoadError"
        title="考试列表加载失败"
        :show-report="false"
        compact
        @retry="loadExams"
      />
      <UiEmpty
        v-else-if="!loadingExams && appealableExams.length === 0"
        description="当前没有可发起复核的考试（仅成绩已发布且复核窗口处于开放状态的考试可发起复核）"
      />

      <div v-else class="exam-pick-list">
        <article
          v-for="exam in appealableExams"
          :key="exam.examId"
          class="exam-pick-item"
          :class="{ 'exam-pick-item--active': exam.examId === selectedExamId }"
          @click="selectedExamId = exam.examId"
        >
          <div class="exam-pick-item__radio">
            <span class="exam-pick-item__radio-dot" />
          </div>
          <div class="exam-pick-item__main">
            <div class="exam-pick-item__title-row">
              <h3 class="exam-pick-item__title">{{ exam.examName }}</h3>
              <UiTag tone="green" size="sm">已发布</UiTag>
              <UiTag tone="orange" size="sm">复核进行中</UiTag>
            </div>
            <div class="exam-pick-item__meta">
              <span class="meta-item">编号：{{ exam.examNo }}</span>
              <span class="meta-item">
                本次得分：<strong class="score-text">{{ formatPublishedScore(exam) }}</strong>
              </span>
              <span class="meta-item">
                <ClockCircleOutlined />
                截止 {{ formatDateTime(exam.reviewWindowCloseTime) }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </UiCard>

    <!-- 我的复核申请 -->
    <UiCard class="appeal-page__list-card">
      <template #title>
        <FileSearchOutlined />
        <span>我的复核申请</span>
        <UiBadge tone="blue">{{ filteredRequests.length }} 条</UiBadge>
      </template>
      <template #extra>
        <a-space wrap>
          <a-select
            v-model:value="filterStatus"
            placeholder="按状态筛选"
            allow-clear
            style="width: 160px"
            :options="statusOptions"
            @change="loadRequests"
          />
          <a-select
            v-model:value="filterExamId"
            placeholder="按考试筛选"
            allow-clear
            style="width: 220px"
            :options="examFilterOptions"
            option-filter-prop="label"
            show-search
          />
          <UiButton size="sm" variant="outline" :loading="loadingRequests" @click="loadRequests">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </UiButton>
        </a-space>
      </template>

      <!-- D-9 错误态：复核申请加载失败时提供重试入口 -->
      <UiErrorRetryPanel
        v-if="requestsLoadError"
        :error="requestsLoadError"
        title="复核申请加载失败"
        :show-report="false"
        compact
        @retry="loadRequests"
      />
      <UiEmpty
        v-else-if="!loadingRequests && filteredRequests.length === 0"
        description="暂无复核申请记录"
      />

      <UiDataTable
        v-else
        :columns="columns"
        :data-source="filteredRequests"
        :loading="loadingRequests"
        row-key="id"
        size="middle"
        class="requests-table"
        :page-size="10"
        :total="filteredRequests.length"
        flat
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'examName'">
            <div class="exam-cell">
              <strong class="exam-cell__title">
                {{ filteredRequests[index].examName }}
              </strong>
              <span class="exam-cell__sub">编号：{{ filteredRequests[index].examNo }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'reasonType'">
            <UiTag tone="purple" size="sm">
              {{ formatReasonType(filteredRequests[index].reasonType) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'requestReason'">
            <a-tooltip :title="filteredRequests[index].requestReason">
              <div class="reason-cell">{{ filteredRequests[index].requestReason }}</div>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'requestStatus'">
            <UiTag :tone="requestStatusTone(filteredRequests[index].requestStatus)" size="sm">
              {{ requestStatusLabel(filteredRequests[index].requestStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(filteredRequests[index].createTime) }}
          </template>
          <template v-else-if="column.key === 'reviewTime'">
            {{ formatDateTime(filteredRequests[index].reviewTime) }}
          </template>
          <template v-else-if="column.key === 'reviewNote'">
            <a-tooltip :title="filteredRequests[index].reviewNote">
              <div class="reason-cell">{{ reviewNoteText(filteredRequests[index]) }}</div>
            </a-tooltip>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <!-- 提交复核弹窗 -->
    <a-modal
      v-model:open="submitModalOpen"
      title="提交复核申请"
      :confirm-loading="submitting"
      ok-text="提交"
      cancel-text="取消"
      :width="640"
      @ok="submit"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="考试">
          <div v-if="selectedAppealableExam" class="modal-exam-info">
            <strong>{{ selectedAppealableExam.examName }}</strong>
            <UiTag tone="green" size="sm">已发布</UiTag>
            <span class="modal-exam-info__score">
              本次得分 <strong>{{ formatPublishedScore(selectedAppealableExam) }}</strong>
            </span>
          </div>
        </a-form-item>
        <a-form-item label="申请原因类型" required>
          <a-select
            v-model:value="form.reasonType"
            placeholder="请选择原因类型"
            :options="reasonTypeOptions"
          />
        </a-form-item>
        <a-form-item label="申请理由" required>
          <a-textarea
            v-model:value="form.requestReason"
            :rows="4"
            placeholder="请简要说明申请复核的原因（10-500 字）"
            :maxlength="500"
            show-count
          />
        </a-form-item>
        <a-form-item
          :label="
            sourceQuestionId ? '复核题目（已带入成绩明细中的题目，可调整）' : '复核题目（可选）'
          "
        >
          <a-select
            v-model:value="form.questionIds"
            mode="multiple"
            placeholder="不选择题目表示申请总分复核"
            :options="questionOptions"
            :loading="scoreDetailLoading"
            :disabled="scoreDetailLoading"
            option-filter-prop="label"
            show-search
          />
          <div v-if="questionLoadError" class="question-load-error">
            题目列表加载失败，请刷新后重试。
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  GradeReviewReasonTypeCode,
  GradeReviewRequestStatusCode,
  StudentGradeReviewRequestItemVO,
} from '@/apis/mark/grade-review'
import {
  GRADE_REVIEW_REASON_TYPE_LABEL,
  GRADE_REVIEW_REASON_TYPE_OPTIONS,
  listMyReviewRequests,
  REVIEW_REQUEST_STATUS_LABEL,
  REVIEW_REQUEST_STATUS_TONE,
  submitReviewRequest,
} from '@/apis/mark/grade-review'
import type { StudentExamItemVO, StudentQuestionScoreVO } from '@/apis/mark/student-exam'
import { canSubmitReview, getMyScoreDetail, listMyExams } from '@/apis/mark/student-exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentAppeal' })

const route = useRoute()
const router = useRouter()
const loadingExams = ref(false)
const loadingRequests = ref(false)
const submitting = ref(false)
const submitModalOpen = ref(false)
const scoreDetailLoading = ref(false)

const exams = ref<StudentExamItemVO[]>([])
const requests = ref<StudentGradeReviewRequestItemVO[]>([])
const selectedExamQuestions = ref<StudentQuestionScoreVO[]>([])
// D-9 错误态：考试 / 复核申请列表加载失败时 UiErrorRetryPanel 重试入口
const examsLoadError = ref<Error | null>(null)
const requestsLoadError = ref<Error | null>(null)
const questionLoadError = ref<Error | null>(null)
const selectedExamId = ref<string | undefined>(undefined)
const filterExamId = ref<string | undefined>(undefined)
const filterStatus = ref<GradeReviewRequestStatusCode | undefined>(undefined)
const DEFAULT_REASON_TYPE: GradeReviewReasonTypeCode = 'SCORE_ERROR'

interface ReviewRequestFormState {
  reasonType: GradeReviewReasonTypeCode
  requestReason: string
  questionIds: string[]
}

const form = reactive<ReviewRequestFormState>({
  reasonType: DEFAULT_REASON_TYPE,
  requestReason: '',
  questionIds: [],
})

// 来自 score-detail 题目级复核入口时，记录来源题号用于弹窗内提示
const sourceQuestionId = ref<string | undefined>(undefined)

const reasonTypeOptions = GRADE_REVIEW_REASON_TYPE_OPTIONS

const statusOptions: Array<{ value: GradeReviewRequestStatusCode; label: string }> = [
  { value: 'PENDING', label: '待处理' },
  { value: 'IN_REVIEW', label: '处理中' },
  { value: 'APPROVED', label: '通过' },
  { value: 'REJECTED', label: '驳回' },
  { value: 'CORRECTED', label: '已更正' },
]

const appealableExams = computed<StudentExamItemVO[]>(() => exams.value.filter(canSubmitReview))

const examFilterOptions = computed(() =>
  exams.value.map((e) => ({
    value: e.examId,
    label: `${e.examName} (${e.examNo})`,
  })),
)

const selectedAppealableExam = computed<StudentExamItemVO | null>(() => {
  if (!selectedExamId.value) return null
  return appealableExams.value.find((e) => e.examId === selectedExamId.value) ?? null
})

const questionOptions = computed(() =>
  selectedExamQuestions.value.map((question) => ({
    value: question.questionTemplateId,
    label: `第 ${question.questionNo} 题 · ${question.questionType} · 满分 ${question.fullScore} 分`,
  })),
)

const filteredRequests = computed<StudentGradeReviewRequestItemVO[]>(() => {
  return requests.value.filter((item) => {
    return !(filterExamId.value && item.examId !== filterExamId.value)
  })
})

const pendingRequestCount = computed(
  () =>
    requests.value.filter((r) => r.requestStatus === 'PENDING' || r.requestStatus === 'IN_REVIEW')
      .length,
)

const columns = [
  { title: '考试', key: 'examName', dataIndex: 'examName', width: 240 },
  { title: '原因类型', key: 'reasonType', dataIndex: 'reasonType', width: 130 },
  { title: '申请理由', key: 'requestReason', dataIndex: 'requestReason', ellipsis: true },
  { title: '处理状态', key: 'requestStatus', dataIndex: 'requestStatus', width: 110 },
  { title: '提交时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '处理时间', key: 'reviewTime', dataIndex: 'reviewTime', width: 170 },
  { title: '处理意见', key: 'reviewNote', dataIndex: 'reviewNote', width: 240 },
]

async function loadExams() {
  loadingExams.value = true
  examsLoadError.value = null
  try {
    const loadedExams = await listMyExams()
    validateAppealableExamContracts(loadedExams)
    exams.value = loadedExams
    if (!selectedExamId.value && appealableExams.value.length > 0) {
      const queryExamId = typeof route.query.examId === 'string' ? route.query.examId : undefined
      if (queryExamId && appealableExams.value.some((e) => e.examId === queryExamId)) {
        selectedExamId.value = queryExamId
      } else {
        selectedExamId.value = appealableExams.value[0].examId
      }
    }
  } catch (error) {
    examsLoadError.value = toUserError(error, '考试列表加载失败')
    showUserError(error, '可复核考试加载失败')
  } finally {
    loadingExams.value = false
  }
}

/** 校验学生复核入口依赖的已发布成绩字段，合同缺失时进入页面错误态。 */
function validateAppealableExamContracts(list: StudentExamItemVO[]): void {
  for (const exam of list) {
    if (exam.finalScoreStatus === 'PUBLISHED' && exam.finalScore == null) {
      throw new Error(`已发布成绩缺少发布成绩：examId=${exam.examId}`)
    }
  }
}

/**
 * 一次性加载当前学生的全部复核申请。
 * 后端 /api/exam/grade-review/request/student-list 已聚合 examName/examNo，
 * 不再按考试逐个调用列表接口（消除 N+1）。
 */
async function loadRequests() {
  loadingRequests.value = true
  requestsLoadError.value = null
  try {
    requests.value = await listMyReviewRequests({
      requestStatus: filterStatus.value,
    })
  } catch (error) {
    requestsLoadError.value = toUserError(error, '复核申请列表加载失败')
    showUserError(error, '复核申请记录加载失败')
  } finally {
    loadingRequests.value = false
  }
}

async function reloadAll() {
  await loadExams()
  await loadRequests()
}

function formatPublishedScore(exam: StudentExamItemVO): string {
  return (exam.finalScore as number).toFixed(2)
}

function requestStatusTone(status: GradeReviewRequestStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_REQUEST_STATUS_TONE, status, '复核申请状态')
}

function requestStatusLabel(status: GradeReviewRequestStatusCode): string {
  return strictEnumLabel(REVIEW_REQUEST_STATUS_LABEL, status, '复核申请状态')
}

function reviewNoteText(item: StudentGradeReviewRequestItemVO): string {
  if (item.reviewNote) return item.reviewNote
  if (item.requestStatus === 'PENDING') return '等待复核处理'
  if (item.requestStatus === 'IN_REVIEW') return '复核处理中'
  return '未填写复核意见'
}

function formatReasonType(value: GradeReviewReasonTypeCode): string {
  return strictEnumLabel(GRADE_REVIEW_REASON_TYPE_LABEL, value, '复核原因类型')
}

function openSubmitModal() {
  if (!selectedAppealableExam.value) return
  sourceQuestionId.value = undefined
  form.reasonType = DEFAULT_REASON_TYPE
  form.requestReason = ''
  form.questionIds = []
  submitModalOpen.value = true
  void loadSelectedExamQuestions()
}

async function submit() {
  if (!selectedAppealableExam.value) {
    message.warning('请选择一个考试')
    return
  }
  if (!form.requestReason.trim()) {
    message.warning('请填写申请理由')
    return
  }
  submitting.value = true
  try {
    const paperInstanceId = selectedAppealableExam.value.paperInstanceId
    if (!paperInstanceId) {
      message.error('当前考试信息不完整，暂不能提交复核申请')
      return
    }
    await submitReviewRequest({
      examId: selectedAppealableExam.value.examId,
      paperInstanceId,
      requestReason: form.requestReason.trim(),
      reasonType: form.reasonType,
      questionIds: form.questionIds,
    })
    message.success('复核申请已提交')
    submitModalOpen.value = false
    // 来源题号已落库，清理状态与 URL 防止刷新再次自动弹出
    if (sourceQuestionId.value) {
      sourceQuestionId.value = undefined
      const nextQuery = { ...route.query }
      delete nextQuery.questionId
      void router.replace({ query: nextQuery })
    }
    await loadRequests()
  } catch (error) {
    showUserError(error, '复核申请提交失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => route.query.examId,
  (val) => {
    if (typeof val === 'string' && appealableExams.value.some((e) => e.examId === val)) {
      selectedExamId.value = val
    }
  },
)

watch(
  () => selectedExamId.value,
  () => {
    selectedExamQuestions.value = []
    questionLoadError.value = null
    form.questionIds = []
    sourceQuestionId.value = undefined
  },
)

onMounted(async () => {
  await loadExams()
  await loadRequests()
  autoOpenFromQuestionQuery()
})

/**
 * 路由参数 questionId 来自 score-detail 题目级复核入口；
 * 当目标考试仍可申请时，自动打开弹窗并预填题号字段。
 */
function autoOpenFromQuestionQuery(): void {
  const queryQuestionId = typeof route.query.questionId === 'string' ? route.query.questionId : ''
  if (!queryQuestionId) return
  if (!selectedAppealableExam.value) return
  sourceQuestionId.value = queryQuestionId
  form.reasonType = DEFAULT_REASON_TYPE
  form.requestReason = ''
  form.questionIds = [queryQuestionId]
  submitModalOpen.value = true
  void loadSelectedExamQuestions()
}

async function loadSelectedExamQuestions(): Promise<void> {
  if (!selectedAppealableExam.value) return
  scoreDetailLoading.value = true
  questionLoadError.value = null
  try {
    const detail = await getMyScoreDetail(selectedAppealableExam.value.examId)
    selectedExamQuestions.value = detail.questions
  } catch (error) {
    selectedExamQuestions.value = []
    questionLoadError.value = toUserError(error, '题目成绩加载失败')
    showUserError(error, '题目列表加载失败')
  } finally {
    scoreDetailLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.appeal-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.exam-pick-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exam-pick-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 6px);
  cursor: pointer;
  background: #fff;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: rgba(22, 119, 255, 0.3);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  }

  &--active {
    border-color: var(--ant-color-primary);
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(22, 119, 255, 0.02) 100%);
  }

  &__radio {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 1.5px solid var(--ant-color-border);
    border-radius: 50%;
    flex-shrink: 0;
    transition: border-color 0.2s ease;

    .exam-pick-item--active & {
      border-color: var(--ant-color-primary);
    }
  }

  &__radio-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: transparent;
    transition: background 0.2s ease;

    .exam-pick-item--active & {
      background: var(--ant-color-primary);
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--ant-color-text);
    margin: 0;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
    color: var(--ant-color-text-secondary);
    flex-wrap: wrap;

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .score-text {
      color: var(--ant-color-success);
      font-weight: 700;
    }
  }
}

.requests-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.exam-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__title {
    color: var(--ant-color-text);
    font-weight: 500;
  }

  &__sub {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }
}

.reason-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ant-color-text-secondary);
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.modal-exam-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--ant-color-fill-quaternary);
  border-radius: var(--dp-radius-sm, 6px);

  &__score {
    margin-left: auto;
    font-size: 13px;
    color: var(--ant-color-text-secondary);

    strong {
      color: var(--ant-color-success);
      font-size: 16px;
    }
  }
}

.question-load-error {
  margin-top: 6px;
  color: var(--ant-color-error);
  font-size: 12px;
}
</style>
