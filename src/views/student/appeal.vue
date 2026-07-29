<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="成绩复核申请" :subtitle="examStats ? `${examStats.appealableCount} 场可申请` : undefined">
        <template #status>
          <UiTag tone="blue" size="sm">
            {{
              examStats
                ? `${examStats.appealableCount} 场可申请`
                : examsLoadFailed
                  ? '可申请场次加载失败'
                  : `${appealableExams.length} 场可申请`
            }}
          </UiTag>
          <UiTag v-if="pendingRequestCount == null" tone="red" size="sm">
            待处理计数加载失败
          </UiTag>
          <UiTag v-else-if="pendingRequestCount > 0" tone="orange" size="sm">
            待处理 {{ pendingRequestCount }}
          </UiTag>
          <UiTag v-if="selectedExamCountdown" tone="orange" size="sm">
            {{ selectedExamCountdown }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :loading="loadingExams || loadingRequests"
            @click="reloadAll"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!selectedAppealableExam || selectedExamCannotSubmitReview"
            :title="selectedExamSubmitBlockedReason || undefined"
            @click="openSubmitModal"
          >
            <template #icon><FormOutlined /></template>
            提交复核申请
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="StudentAppealSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="StudentAppealSignalMetrics"
        @metric-click="onStudentAppealSignalClick"
      />
    </template>


    <!-- 选择考试 -->
    <WorkbenchSurfaceCard class="appeal-page__select-card">
      <template #head>
        <div class="appeal-page__select-head">
          <CheckCircleOutlined />
          <span>选择待申诉的考试</span>
        </div>
      </template>

      <UiSkeletonState v-if="loadingExams" :rows="3" compact />

      <UiEmpty
        size="sm"
        v-else-if="examsLoadFailed"
        title="可申请考试加载失败"
      />

      <UiEmpty
        size="sm"
        v-else-if="appealableExams.length === 0"
        title="当前没有可申诉的考试"
        :description="appealableEmptyDescription"
      />

      <div v-else-if="!loadingExams && appealableExams.length > 0" class="exam-pick-list">
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
              <UiTag :tone="finalScoreStatusTone(exam)" size="sm">
                {{ finalScoreStatusLabel(exam) }}
              </UiTag>
              <UiTag :tone="reviewWindowStatusTone(exam)" size="sm">
                {{ reviewWindowStatusLabel(exam) }}
              </UiTag>
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
              <span v-if="reviewCountdownText(exam)" class="meta-item meta-item--countdown">
                {{ reviewCountdownText(exam) }}
              </span>
              <span v-if="exam.maxRequestCount != null" class="meta-item">
                申请次数 {{ exam.usedReviewRequestCount ?? 0 }}/{{ exam.maxRequestCount }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard flush class="appeal-page__list-card">
      <template #head>
        <div class="appeal-page__list-head">
          <FileSearchOutlined />
          <span>我的复核申请</span>
        </div>
      </template>
      <template #toolbar>
        <UiFilterBar
          v-model="requestFilterForm"
          :fields="requestFilterFields"
          variant="plain"
          show-labels
          search-text="查询"
          @search="handleRequestFilterSearch"
          @reset="handleRequestFilterReset"
        />
      </template>

      <UiDataTable
        v-model:current="requestPagination.current"
        v-model:page-size="requestPagination.pageSize"
        :columns="columns"
        :data-source="requests"
        :loading="loadingRequests"
        :load-error="requestsLoadFailed"
        row-key="id"
        size="middle"
        :total="requestPagination.total"
        flat
        @page-change="handleRequestPageChange"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'examName'">
            <div class="exam-cell">
              <strong class="exam-cell__title">
                {{ requests[index].examName }}
              </strong>
              <span class="exam-cell__sub">编号：{{ requests[index].examNo }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'reasonType'">
            <UiTag tone="purple" size="sm">
              {{ formatReasonType(requests[index].reasonType) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'requestReason'">
            <UiTooltip :title="requests[index].requestReason">
              <div class="reason-cell">{{ requests[index].requestReason }}</div>
            </UiTooltip>
          </template>
          <template v-else-if="column.key === 'requestStatus'">
            <UiTag :tone="requestStatusTone(requests[index].requestStatus)" size="sm">
              {{ requestStatusLabel(requests[index].requestStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(requests[index].createTime) }}
          </template>
          <template v-else-if="column.key === 'reviewTime'">
            {{ formatDateTime(requests[index].reviewTime) }}
          </template>
          <template v-else-if="column.key === 'reviewNote'">
            <UiTooltip :title="requests[index].reviewNote">
              <div class="reason-cell">{{ reviewNoteText(requests[index]) }}</div>
            </UiTooltip>
          </template>
          <template v-else-if="column.key === 'evidenceFileRefs'">
            <div v-if="requests[index].evidenceFileRefs.length === 0" class="dp-text-muted">—</div>
            <div v-else class="appeal-evidence-links">
              <UiTextAction
                v-for="file in requests[index].evidenceFileRefs"
                :key="file.fileId"
                @click="downloadEvidenceFile(file)"
              >
                {{ file.fileName }}
              </UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <!-- 提交复核弹窗 -->
    <UiDialog
      v-model:open="submitModalOpen"
      title="提交复核申请"
      :confirm-loading="submitting === true"
      ok-text="提交"
      cancel-text="取消"
      :width="640"
      @ok="submit"
    >
      <UiForm :model="form" layout="vertical">
        <UiFormItem label="考试">
          <div v-if="selectedAppealableExam" class="modal-exam-info">
            <strong>{{ selectedAppealableExam.examName }}</strong>
            <UiTag tone="green" size="sm">已发布</UiTag>
            <span class="modal-exam-info__score">
              本次得分 <strong>{{ formatPublishedScore(selectedAppealableExam) }}</strong>
            </span>
          </div>
        </UiFormItem>
        <UiFormItem label="申请原因类型" required>
          <UiSelect
            size="sm"
            v-model="form.reasonType"
            placeholder="请选择原因类型"
            :options="GRADE_REVIEW_REASON_TYPE_OPTIONS"
          />
        </UiFormItem>
        <UiFormItem label="申请理由" required>
          <UiTextarea
            size="sm"
            v-model="form.requestReason"
            :rows="4"
            placeholder="请简要说明申请复核的原因（10-500 字）"
            :maxlength="500"
            :show-count="true"
          />
        </UiFormItem>
        <UiFormItem label="佐证材料（可选）">
          <input
            ref="evidenceInputRef"
            type="file"
            class="tw:sr-only"
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
            @change="onEvidencePick"
          />
          <UiButton
            variant="outline"
            size="sm"
            :loading="evidenceUploading"
            @click="openEvidencePicker"
          >
            上传佐证
          </UiButton>
          <ul v-if="evidenceItems.length" class="appeal-evidence-list">
            <li v-for="item in evidenceItems" :key="item.fileNodeId">
              <span>{{ item.fileName }}</span>
              <UiButton variant="ghost" size="sm" @click="removeEvidence(item.fileNodeId)">
                移除
              </UiButton>
            </li>
          </ul>
          <div class="appeal-evidence-hint">
            支持 JPG / PNG / PDF / DOC / DOCX，最多 {{ EVIDENCE_MAX_COUNT }} 个，单个不超过 30MB。
          </div>
        </UiFormItem>
        <UiFormItem
          :label="
            sourceQuestionId ? '复核题目（已带入成绩明细中的题目，可调整）' : '复核题目（可选）'
          "
        >
          <UiSelect
            size="sm"
            v-model="form.questionIds"
            mode="multiple"
            placeholder="不选择题目表示申请总分复核"
            :options="questionOptions"
            :loading="scoreDetailLoading"
            :disabled="scoreDetailLoading"
            option-filter-prop="label"
            allow-search
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  GradeReviewEvidenceFileRefVO,
  StudentGradeReviewRequestItemResponse,
} from '@/apis/mark/grade-review'
import type {
  StudentExamItemVO,
  StudentExamStatsResponse,
  StudentQuestionScoreVO,
} from '@/apis/mark/student-exam'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  countMyPendingReviewRequests,
  GRADE_REVIEW_REASON_TYPE_OPTIONS,
  GradeReviewReasonTypeCode,
  GradeReviewReasonTypeDescription,
  GradeReviewRequestStatusCode,
  GradeReviewRequestStatusDescription,
  listMyReviewRequests,
  REVIEW_REQUEST_STATUS_OPTIONS,
  REVIEW_REQUEST_STATUS_TONE,
  submitReviewRequest,
} from '@/apis/mark/grade-review'
import {
  canSubmitReview,
  getMyExamStats,
  getMyScoreDetail,
  pageMyExams,
  ReviewWindowPolicyStatusCode,
  ReviewWindowPolicyStatusDescription,
  STUDENT_REVIEW_WINDOW_STATUS_TONE,
} from '@/apis/mark/student-exam'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE } from '@/composables/useMarkExamSelector'
import {
  StudentFacingFinalScoreStatusCode,
} from '@/types/enums/student-facing-final-score-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { formatDateTime, formatScore } from '@/utils/format'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import {
  studentFacingFinalScoreStatusLabel,
  studentFacingFinalScoreStatusTone,
} from '@/utils/student-final-score-status'

defineOptions({ name: 'StudentAppeal' })

const EVIDENCE_MAX_COUNT = 5
const EVIDENCE_MAX_BYTES = 30 * 1024 * 1024
const route = useRoute()
const router = useRouter()
const loadingExams = ref(false)
const examsLoadFailed = ref(false)
const loadingRequests = ref(false)
const requestsLoadFailed = ref(false)
const submitting = ref(false)
const submitModalOpen = ref(false)
const scoreDetailLoading = ref(false)

const exams = ref<StudentExamItemVO[]>([])
const appealableExams = ref<StudentExamItemVO[]>([])
const examStats = ref<StudentExamStatsResponse | null>(null)

/** 空态说明：说清「为何不可申诉」与窗口/发布状态，避免笼统「没有可展示的内容」。 */
const appealableEmptyDescription = computed(() => {
  const stats = examStats.value
  if (!stats) {
    return '成绩发布后且复核窗口开放时，才会出现可申请场次。可使用顶栏「刷新」重新拉取。'
  }
  if (stats.totalExamCount === 0) {
    return '你名下暂无关联考试。请确认已报名对应教学班，或联系任课教师。'
  }
  if (stats.publishedCount === 0) {
    return `你有 ${stats.totalExamCount} 场考试，但成绩尚未发布；发布后且复核窗口开启方可申诉。`
  }
  if (stats.reviewOpenCount === 0) {
    return `已发布 ${stats.publishedCount} 场，但当前没有处于开放中的复核窗口（未开窗或已截止）。`
  }
  return `有 ${stats.reviewOpenCount} 场复核窗口开放，但当前均不可提交申请（可能已达次数上限或成绩状态不允许）。可在下方「我的复核申请」查看历史记录，或使用顶栏「刷新」。`
})
const requests = ref<StudentGradeReviewRequestItemResponse[]>([])
const requestPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})
/** null = 未就绪或加载失败，禁止当成 0 */
const pendingRequestCount = ref<number | null>(null)
const selectedExamQuestions = ref<StudentQuestionScoreVO[]>([])
const selectedExamId = ref<string | undefined>(undefined)
const sourceQuestionId = ref<string | undefined>(undefined)

const requestFilterForm = reactive<{
  status?: GradeReviewRequestStatusCode
  examId?: string
}>({
  status: undefined,
  examId: undefined,
})

const examFilterOptions = ref<Array<{ value: string, label: string }>>([])

const requestFilterFields = computed<FilterField[]>(() => [
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: REVIEW_REQUEST_STATUS_OPTIONS.map((item) => ({
      label: item.label,
      value: item.value,
    })),
  },
  {
    key: 'examId',
    type: 'select',
    label: '考试',
    placeholder: '全部考试',
    allowClear: true,
    allowSearch: true,
    width: 220,
    options: examFilterOptions.value,
  },
])

const DEFAULT_REASON_TYPE: GradeReviewReasonTypeCode = GradeReviewReasonTypeCode.SCORE_ERROR

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

interface EvidenceFileItem {
  fileNodeId: string
  fileName: string
}

const evidenceItems = ref<EvidenceFileItem[]>([])
const evidenceInputRef = ref<HTMLInputElement | null>(null)
const evidenceUploading = ref(false)

// 来自 score-detail 题目级复核入口时，记录来源题号用于弹窗内提示

const selectedAppealableExam = computed<StudentExamItemVO | null>(() => {
  if (!selectedExamId.value) return null
  return appealableExams.value.find((e) => e.examId === selectedExamId.value) ?? null
})

/**
 * 当前选中考试是否不可新开复核申请。
 * 真源优先后端 canSubmitReviewRequest / openReviewRequestCount，禁止仅用分页「我的申请」推断。
 */
const selectedExamCannotSubmitReview = computed(() => {
  const exam = selectedAppealableExam.value
  if (!exam) return true
  return canSubmitReview(exam) !== true
})

const selectedExamSubmitBlockedReason = computed(() => {
  const exam = selectedAppealableExam.value
  if (!exam) return '请先选择考试'
  if (exam.finalScoreStatus !== StudentFacingFinalScoreStatusCode.PUBLISHED) {
    return '成绩未发布或已更正待重发，暂不能提交复核'
  }
  if (
    exam.reviewWindowStatus !== ReviewWindowPolicyStatusCode.ACTIVE
    || exam.reviewWindowWithinTime === false
  ) {
    return '当前不在复核窗口开放时间内'
  }
  if ((exam.openReviewRequestCount ?? 0) > 0) {
    return '当前考试已有待领取、处理中或已通过待更正的复核申请'
  }
  if (exam.maxRequestCount != null && (exam.usedReviewRequestCount ?? 0) >= exam.maxRequestCount) {
    return `已达到最大申请次数限制：${exam.maxRequestCount}`
  }
  if (canSubmitReview(exam) !== true) {
    return '当前暂不能提交复核申请'
  }
  return ''
})

const questionOptions = computed(() =>
  selectedExamQuestions.value.map((question) => ({
    value: question.layoutQuestionId,
    label: `第 ${question.questionNo} 题 · ${question.questionType} · 满分 ${question.fullScore} 分`,
  })),
)

async function loadPendingRequestCount(): Promise<void> {
  try {
    pendingRequestCount.value = await countMyPendingReviewRequests()
  } catch (error) {
    pendingRequestCount.value = null
    showUserError(error, '待处理复核申请数量加载失败')
  }
}

/** 每秒刷新复核窗口倒计时展示 */
const countdownTick = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const selectedExamCountdown = computed<string>(() => {
  void countdownTick.value
  if (!selectedAppealableExam.value?.reviewWindowCloseTime) {
    return ''
  }
  return reviewCountdownText(selectedAppealableExam.value)
})

/** 将复核截止时间转为剩余时间文案，已过期返回「已截止」 */
function reviewCountdownText(exam: StudentExamItemVO): string {
  if (!exam.reviewWindowCloseTime) {
    return ''
  }
  const remainMs = new Date(exam.reviewWindowCloseTime).getTime() - Date.now()
  if (remainMs <= 0) {
    return '已截止'
  }
  const days = Math.floor(remainMs / 86400000)
  const hours = Math.floor((remainMs % 86400000) / 3600000)
  const minutes = Math.floor((remainMs % 3600000) / 60000)
  const seconds = Math.floor((remainMs % 60000) / 1000)
  if (days > 0) {
    return `剩余 ${days} 天 ${hours} 小时`
  }
  return `剩余 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const columns: ColumnsType<StudentGradeReviewRequestItemResponse> = [
  {
    title: '考试',
    key: 'examName',
    dataIndex: 'examName',
    width: 260,
    ellipsis: true,
    fixed: 'left' as const,
  },
  { title: '原因类型', key: 'reasonType', dataIndex: 'reasonType', width: 130 },
  {
    title: '申请理由',
    key: 'requestReason',
    dataIndex: 'requestReason',
    ellipsis: true,
    minWidth: 240,
  },
  { title: '佐证', key: 'evidenceFileRefs', width: 160 },
  { title: '处理状态', key: 'requestStatus', dataIndex: 'requestStatus', width: 110 },
  { title: '提交时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '处理时间', key: 'reviewTime', dataIndex: 'reviewTime', width: 170 },
  { title: '处理意见', key: 'reviewNote', dataIndex: 'reviewNote', width: 240, ellipsis: true },
]

async function loadExamFilterOptions(keyword?: string) {
  try {
    const page = await pageMyExams({
      pageNum: 1,
      pageSize: MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE,
      keyword: keyword?.trim() || undefined,
    })
    examFilterOptions.value = page.list.map((e) => ({
      value: e.examId,
      label: `${e.examName} (${e.examNo})`,
    }))
  } catch (error) {
    examFilterOptions.value = []
    showUserError(error, '考试筛选项加载失败')
  }
}

async function loadExams() {
  loadingExams.value = true
  examsLoadFailed.value = false
  try {
    const appealablePage = await pageMyExams({
      reviewWindowAppealableOnly: true,
      pageNum: 1,
      pageSize: MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE,
    })
    appealableExams.value = appealablePage.list
    exams.value = appealablePage.list
    try {
      examStats.value = await getMyExamStats({})
    } catch (error) {
      examStats.value = null
      showUserError(error, '考试统计加载失败')
    }
    await loadExamFilterOptions()
    if (appealablePage.total > MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE) {
      void message.warning(
        `可申请考试共 ${appealablePage.total} 场，当前仅展示前 ${MARK_EXAM_SELECTOR_DEFAULT_PAGE_SIZE} 场，请优先处理临近截止场次`,
      )
    }
    if (!selectedExamId.value && appealableExams.value.length > 0) {
      const queryExamId = typeof route.query.examId === 'string' ? route.query.examId : undefined
      if (queryExamId) {
        if (appealableExams.value.some((e) => e.examId === queryExamId)) {
          selectedExamId.value = queryExamId
        } else if (exams.value.some((e) => e.examId === queryExamId)) {
          selectedExamId.value = undefined
          showFormValidationMessage('该考试当前不在复核窗口内，无法提交新申请')
        } else {
          selectedExamId.value = appealableExams.value[0].examId
        }
      } else {
        selectedExamId.value = appealableExams.value[0].examId
      }
    }
  } catch (error) {
    examsLoadFailed.value = true
    appealableExams.value = []
    exams.value = []
    examStats.value = null
    examFilterOptions.value = []
    showUserError(error, '考试列表加载失败')
  } finally {
    loadingExams.value = false
  }
}

/**
 * 一次性加载当前学生的全部复核申请。
 * 后端 /api/exam/grade-review/request/student-list 已聚合 examName/examNo，
 * 不再按考试逐个调用列表接口（消除 N+1）。
 */
async function loadRequests() {
  loadingRequests.value = true
  requestsLoadFailed.value = false
  try {
    const result = await listMyReviewRequests({
      requestStatus: requestFilterForm.status,
      examId: requestFilterForm.examId,
      pageNum: requestPagination.current,
      pageSize: requestPagination.pageSize,
    })
    requests.value = result.list
    requestPagination.total = result.total
    requestPagination.current = result.pageNum ?? requestPagination.current
    requestPagination.pageSize = result.pageSize ?? requestPagination.pageSize
    if (
      requests.value.length === 0
      && requestPagination.total > 0
      && requestPagination.current > 1
    ) {
      requestPagination.current -= 1
      await Promise.all([loadRequests(), loadPendingRequestCount()])
    }
  } catch (error) {
    requestsLoadFailed.value = true
    showUserError(error, '复核申请列表加载失败')
  } finally {
    loadingRequests.value = false
  }
}

function handleRequestPageChange(pageInfo: { current: number, pageSize: number }): void {
  requestPagination.current = pageInfo.current
  requestPagination.pageSize = pageInfo.pageSize
  void loadRequests()
}

async function reloadAll() {
  await loadExams()
  await Promise.all([loadRequests(), loadPendingRequestCount()])
}

function handleRequestFilterSearch() {
  requestPagination.current = 1
  void Promise.all([loadRequests(), loadPendingRequestCount()])
}

function handleRequestFilterReset() {
  requestFilterForm.status = undefined
  requestFilterForm.examId = undefined
  requestPagination.current = 1
  void Promise.all([loadRequests(), loadPendingRequestCount()])
}

function finalScoreStatusLabel(exam: StudentExamItemVO): string {
  return studentFacingFinalScoreStatusLabel(exam.finalScoreStatus)
}

function finalScoreStatusTone(exam: StudentExamItemVO): BadgeTone {
  return studentFacingFinalScoreStatusTone(exam.finalScoreStatus)
}

function reviewWindowStatusLabel(exam: StudentExamItemVO): string {
  return strictEnumLabel(
    ReviewWindowPolicyStatusDescription,
    exam.reviewWindowStatus,
    '成绩复核窗口状态',
  )
}

function reviewWindowStatusTone(exam: StudentExamItemVO): BadgeTone {
  return strictEnumTone(
    STUDENT_REVIEW_WINDOW_STATUS_TONE,
    exam.reviewWindowStatus,
    '成绩复核窗口状态',
  )
}

function formatPublishedScore(exam: StudentExamItemVO): string {
  return formatScore(exam.finalScore, 'score')
}

function requestStatusTone(status: GradeReviewRequestStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_REQUEST_STATUS_TONE, status, '复核申请状态')
}

function requestStatusLabel(status: GradeReviewRequestStatusCode): string {
  return strictEnumLabel(GradeReviewRequestStatusDescription, status, '复核申请状态')
}

function reviewNoteText(item: StudentGradeReviewRequestItemResponse): string {
  if (item.reviewNote) return item.reviewNote
  if (item.requestStatus === GradeReviewRequestStatusCode.PENDING) return '等待复核处理'
  if (item.requestStatus === GradeReviewRequestStatusCode.IN_REVIEW) return '复核处理中'
  if (item.requestStatus === GradeReviewRequestStatusCode.INVALIDATED) {
    return '成绩已撤回，原复核申请已作废；重发后可再次申请'
  }
  return '未填写复核意见'
}

function formatReasonType(value: GradeReviewReasonTypeCode): string {
  return strictEnumLabel(GradeReviewReasonTypeDescription, value, '复核原因类型')
}

async function downloadEvidenceFile(file: GradeReviewEvidenceFileRefVO): Promise<void> {
  try {
    await handleDownloadFile({ fileId: file.fileId, fileName: file.fileName })
  } catch (error) {
    showUserError(error, '佐证文件下载失败')
  }
}

function resetEvidenceFiles(): void {
  evidenceItems.value = []
}

function openEvidencePicker(): void {
  evidenceInputRef.value?.click()
}

async function onEvidencePick(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const file = input.files?.[0]
  if (!file) {
    return
  }
  if (file.size > EVIDENCE_MAX_BYTES) {
    showFormValidationMessage('单个佐证文件不能超过三十兆字节')
    input.value = ''
    return
  }
  if (evidenceItems.value.length >= EVIDENCE_MAX_COUNT) {
    showFormValidationMessage(`最多上传 ${EVIDENCE_MAX_COUNT} 个佐证文件`)
    input.value = ''
    return
  }
  evidenceUploading.value = true
  try {
    const uploaded = await stageBusinessFile(FileUploadSceneKey.MARK_APPEAL_EVIDENCE, file)
    evidenceItems.value = [
      ...evidenceItems.value,
      { fileNodeId: uploaded.id, fileName: uploaded.nodeName },
    ]
  } catch (error) {
    showUserError(error, '佐证文件上传失败')
  } finally {
    evidenceUploading.value = false
    input.value = ''
  }
}

function removeEvidence(fileNodeId: string): void {
  evidenceItems.value = evidenceItems.value.filter((item) => item.fileNodeId !== fileNodeId)
}

function openSubmitModal() {
  if (!selectedAppealableExam.value) return
  if (selectedExamCannotSubmitReview.value) {
    showFormValidationMessage(selectedExamSubmitBlockedReason.value || '当前暂不能提交复核申请')
    return
  }
  sourceQuestionId.value = undefined
  form.reasonType = DEFAULT_REASON_TYPE
  form.requestReason = ''
  form.questionIds = []
  resetEvidenceFiles()
  submitModalOpen.value = true
  void loadSelectedExamQuestions()
}

async function submit() {
  if (submitting.value === true) {
    return
  }
  if (!selectedAppealableExam.value) {
    showFormValidationMessage('请选择一个考试')
    return
  }
  if (selectedExamCannotSubmitReview.value) {
    showFormValidationMessage(selectedExamSubmitBlockedReason.value || '当前暂不能提交复核申请')
    return
  }
  if (!form.requestReason.trim()) {
    showFormValidationMessage('请填写申请理由')
    return
  }
  submitting.value = true
  try {
    const paperInstanceId = selectedAppealableExam.value.paperInstanceId
    if (!paperInstanceId) {
      void message.error('当前考试信息不完整，暂不能提交复核申请')
      return
    }
    await submitReviewRequest({
      examId: selectedAppealableExam.value.examId,
      paperInstanceId,
      requestReason: form.requestReason.trim(),
      reasonType: form.reasonType,
      questionIds: form.questionIds,
      evidenceFileIds:
        evidenceItems.value.length > 0
          ? evidenceItems.value.map((item) => item.fileNodeId)
          : undefined,
    })
    void message.success('复核申请已提交')
    submitModalOpen.value = false
    resetEvidenceFiles()
    // 来源题号已落库，清理状态与 URL 防止刷新再次自动弹出
    if (sourceQuestionId.value) {
      sourceQuestionId.value = undefined
      const nextQuery = { ...route.query }
      delete nextQuery.questionId
      void router.replace({ query: nextQuery })
    }
    await Promise.all([loadRequests(), loadPendingRequestCount()])
  } catch (error) {
    showUserError(error, '复核申请提交失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => route.query.examId,
  (val) => {
    if (typeof val !== 'string') return
    if (appealableExams.value.some((e) => e.examId === val)) {
      selectedExamId.value = val
      return
    }
    if (exams.value.some((e) => e.examId === val)) {
      selectedExamId.value = undefined
      void message.warning('该考试当前不在复核窗口内，无法提交新申请')
    }
  },
)

watch(
  () => route.query.questionId,
  () => {
    autoOpenFromQuestionQuery()
  },
)

watch(
  () => selectedExamId.value,
  () => {
    selectedExamQuestions.value = []
    form.questionIds = []
    sourceQuestionId.value = undefined
  },
)

onMounted(async () => {
  countdownTimer = setInterval(() => {
    countdownTick.value += 1
  }, 1000)
  await loadExams()
  await Promise.all([loadRequests(), loadPendingRequestCount()])
  autoOpenFromQuestionQuery()
})

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
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
  resetEvidenceFiles()
  submitModalOpen.value = true
  void loadSelectedExamQuestions()
}

async function loadSelectedExamQuestions(): Promise<void> {
  if (!selectedAppealableExam.value) return
  scoreDetailLoading.value = true
  try {
    const detail = await getMyScoreDetail(selectedAppealableExam.value.examId)
    selectedExamQuestions.value = detail.questions
  } catch (error) {
    selectedExamQuestions.value = []
    showUserError(error, '题目成绩加载失败')
  } finally {
    scoreDetailLoading.value = false
  }
}

const StudentAppealSignalMetrics = computed<SignalMetric[]>(() => {
  const appealable = examStats.value?.appealableCount ?? appealableExams.value.length
  return applySpotlightEmphasis([
    {
      key: 'appealable',
      label: '可申请考试',
      value: appealable,
      clickable: true,
    },
  ], { primaryKey: 'appealable', actionLabel: '刷新' })
})

function onStudentAppealSignalClick(_key: string) {
  void reloadAll()
}
</script>

<style lang="scss" scoped>
.appeal-page__select-card {
  margin-bottom: var(--dp-space-block);
}

.appeal-page__select-head,
.appeal-page__list-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-lg);
  font-weight: var(--dp-font-weight-title);
}

.appeal-page__list-card {
  margin-top: var(--dp-space-component-tight);
}

.exam-pick-list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.exam-pick-item {
  display: flex;
  align-items: center;
  gap: var(--dp-space-block);
  padding: var(--dp-space-block);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  cursor: pointer;
  background: var(--dp-surface);
  transition:
    border-color var(--dp-duration-normal) var(--dp-ease-default),
    background var(--dp-duration-normal) var(--dp-ease-default),
    box-shadow var(--dp-duration-normal) var(--dp-ease-default);

  &:hover {
    border-color: var(--dp-color-primary-border);
    box-shadow: var(--dp-shadow-sm);
  }

  &--active {
    border-color: var(--dp-color-primary);
    background: var(--dp-blue-50);
    box-shadow: inset 0 0 0 1px var(--dp-color-primary);
  }

  &__radio {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 1.5px solid var(--dp-border);
    border-radius: 50%;
    flex-shrink: 0;
    transition: border-color var(--dp-duration-normal) var(--dp-ease-default);

    .exam-pick-item--active & {
      border-color: var(--dp-color-primary);
    }
  }

  &__radio-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: transparent;
    transition: background var(--dp-duration-normal) var(--dp-ease-default);

    .exam-pick-item--active & {
      background: var(--dp-color-primary);
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-xs);
    flex-wrap: wrap;
  }

  &__title {
    font-size: var(--dp-type-panel-title-size);
    font-weight: 600;
    color: var(--dp-text-primary);
    margin: 0;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
    flex-wrap: wrap;

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: var(--dp-space-component-xs);
    }

    .score-text {
      color: var(--dp-success);
      font-weight: 600;
    }

    .meta-item--countdown {
      color: var(--dp-warning);
      font-weight: 600;
    }
  }
}

.exam-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__title {
    color: var(--dp-text-primary);
    font-weight: 500;
  }

  &__sub {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }
}

.reason-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--dp-text-secondary);
}

.appeal-evidence-list {
  margin: var(--dp-space-component-tight) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-sm);
}

.appeal-evidence-hint {
  margin-top: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.appeal-evidence-links {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
}

.modal-exam-info {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component);
  background: var(--dp-fill-quaternary);
  border-radius: var(--dp-radius-control-inner);

  &__score {
    margin-left: auto;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);

    strong {
      color: var(--dp-success);
      font-size: var(--dp-font-size-lg);
    }
  }
}

.question-load-error {
  margin-top: var(--dp-space-component-tight);
  color: var(--dp-error);
  font-size: var(--dp-font-size-xs);
}
</style>
