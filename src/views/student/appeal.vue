<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">{{ appealableExams.length }} 场可申请</UiTag>
          <UiTag v-if="pendingRequestCount > 0" tone="orange" size="sm">
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
          <UiButton size="sm" :disabled="!selectedAppealableExam" @click="openSubmitModal">
            <template #icon><FormOutlined /></template>
            提交复核申请
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <!-- 选择考试 -->
    <WorkbenchSurfaceCard class="appeal-page__select-card">
      <template #head>
        <div class="appeal-page__select-head">
          <CheckCircleOutlined />
          <span>选择待申诉的考试</span>
        </div>
      </template>

      <a-skeleton v-if="loadingExams" active :paragraph="{ rows: 3 }" />

      <UiEmpty v-else-if="appealableExams.length === 0" description="暂无数据" />

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
                {{
                  finalScoreStatusLabel(exam)
                }}
              </UiTag>
              <UiTag :tone="reviewWindowStatusTone(exam)" size="sm">
                {{
                  reviewWindowStatusLabel(exam)
                }}
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
        class="student-detail-table__data-table requests-table"
        :columns="columns"
        :data-source="requests"
        :loading="loadingRequests"
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
            <a-tooltip :title="requests[index].requestReason">
              <div class="reason-cell">{{ requests[index].requestReason }}</div>
            </a-tooltip>
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
            <a-tooltip :title="requests[index].reviewNote">
              <div class="reason-cell">{{ reviewNoteText(requests[index]) }}</div>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'evidenceFileRefs'">
            <div v-if="requests[index].evidenceFileRefs.length === 0" class="muted">—</div>
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
        <a-form-item label="佐证材料（可选）">
          <input
            ref="evidenceInputRef"
            type="file"
            class="sr-only"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
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
            支持 JPG / PNG / WEBP / PDF，最多 {{ EVIDENCE_MAX_COUNT }} 个，单个不超过 10MB。
          </div>
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
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  GradeReviewEvidenceFileRefVO,
  GradeReviewRequestStatusCode,

  StudentGradeReviewRequestItemResponse} from '@/apis/mark/grade-review'
import type { StudentExamItemVO, StudentQuestionScoreVO } from '@/apis/mark/student-exam'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FINAL_SCORE_STATUS_TONE, FinalScoreStatusDescription } from '@/apis/mark/final-score-status'
import {
  countMyPendingReviewRequests,
  GRADE_REVIEW_REASON_TYPE_OPTIONS,
  GradeReviewReasonTypeCode,
  GradeReviewReasonTypeDescription,
  GradeReviewRequestStatusDescription,
  listMyReviewRequests,
  REVIEW_REQUEST_STATUS_OPTIONS,
  REVIEW_REQUEST_STATUS_TONE,
  submitReviewRequest,
} from '@/apis/mark/grade-review'
import {
  canSubmitReview,
  getMyScoreDetail,
  listMyExams,
  ReviewWindowPolicyStatusDescription,
  STUDENT_REVIEW_WINDOW_STATUS_TONE,
} from '@/apis/mark/student-exam'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { formatDateTime, formatScore } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentAppeal' })

const EVIDENCE_MAX_COUNT = 5
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
const GRADE_REVIEW_EVIDENCE_BUSINESS_TYPE = 'exam-grade-review-evidence'

const route = useRoute()
const router = useRouter()
const loadingExams = ref(false)
const loadingRequests = ref(false)
const submitting = ref(false)
const submitModalOpen = ref(false)
const scoreDetailLoading = ref(false)

const exams = ref<StudentExamItemVO[]>([])
const requests = ref<StudentGradeReviewRequestItemResponse[]>([])
const requestPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})
const pendingRequestCount = ref(0)
const selectedExamQuestions = ref<StudentQuestionScoreVO[]>([])
const selectedExamId = ref<string | undefined>(undefined)
const sourceQuestionId = ref<string | undefined>(undefined)

const reasonTypeOptions = GRADE_REVIEW_REASON_TYPE_OPTIONS

const statusOptions: Array<{ value: GradeReviewRequestStatusCode, label: string }>
  = REVIEW_REQUEST_STATUS_OPTIONS

const requestFilterForm = reactive<{
  status?: GradeReviewRequestStatusCode
  examId?: string
}>({
  status: undefined,
  examId: undefined,
})

const appealableExams = computed<StudentExamItemVO[]>(() => exams.value.filter(canSubmitReview))

const examFilterOptions = computed(() =>
  exams.value.map((e) => ({
    value: e.examId,
    label: `${e.examName} (${e.examNo})`,
  })),
)

const requestFilterFields = computed<FilterField[]>(() => [
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
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
    pendingRequestCount.value = 0
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

const columns = [
  { title: '考试', key: 'examName', dataIndex: 'examName', width: 240 },
  { title: '原因类型', key: 'reasonType', dataIndex: 'reasonType', width: 130 },
  { title: '申请理由', key: 'requestReason', dataIndex: 'requestReason', ellipsis: true },
  { title: '佐证', key: 'evidenceFileRefs', width: 160 },
  { title: '处理状态', key: 'requestStatus', dataIndex: 'requestStatus', width: 110 },
  { title: '提交时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '处理时间', key: 'reviewTime', dataIndex: 'reviewTime', width: 170 },
  { title: '处理意见', key: 'reviewNote', dataIndex: 'reviewNote', width: 240 },
]

async function loadExams() {
  loadingExams.value = true
  try {
    const loadedExams = await listMyExams()
    exams.value = loadedExams
    if (!selectedExamId.value && appealableExams.value.length > 0) {
      const queryExamId = typeof route.query.examId === 'string' ? route.query.examId : undefined
      if (queryExamId) {
        if (appealableExams.value.some((e) => e.examId === queryExamId)) {
          selectedExamId.value = queryExamId
        } else if (loadedExams.some((e) => e.examId === queryExamId)) {
          selectedExamId.value = undefined
          message.warning('该考试当前不在复核窗口内，无法提交新申请')
        } else {
          selectedExamId.value = appealableExams.value[0].examId
        }
      } else {
        selectedExamId.value = appealableExams.value[0].examId
      }
    }
  } catch (error) {
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
  try {
    const result = await listMyReviewRequests({
      requestStatus: requestFilterForm.status,
      examId: requestFilterForm.examId,
      pageNum: requestPagination.current,
      pageSize: requestPagination.pageSize,
    })
    const list = readPageList(result, '复核申请列表加载失败')
    requests.value = list
    requestPagination.total = readPageTotal(result, '复核申请列表加载失败')
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
    requests.value = []
    requestPagination.total = 0
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
  return strictEnumLabel(FinalScoreStatusDescription, exam.finalScoreStatus, '最终成绩状态')
}

function finalScoreStatusTone(exam: StudentExamItemVO): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, exam.finalScoreStatus, '最终成绩状态')
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
  if (item.requestStatus === 'PENDING') return '等待复核处理'
  if (item.requestStatus === 'IN_REVIEW') return '复核处理中'
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
    message.error('单个佐证文件不能超过 10MB')
    input.value = ''
    return
  }
  if (evidenceItems.value.length >= EVIDENCE_MAX_COUNT) {
    message.warning(`最多上传 ${EVIDENCE_MAX_COUNT} 个佐证文件`)
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
  sourceQuestionId.value = undefined
  form.reasonType = DEFAULT_REASON_TYPE
  form.requestReason = ''
  form.questionIds = []
  resetEvidenceFiles()
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
      evidenceFileIds:
        evidenceItems.value.length > 0
          ? evidenceItems.value.map((item) => item.fileNodeId)
          : undefined,
    })
    message.success('复核申请已提交')
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
      message.warning('该考试当前不在复核窗口内，无法提交新申请')
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
</script>

<style lang="scss" scoped>
.appeal-page__select-card {
  margin-bottom: 16px;
}

.appeal-page__select-head,
.appeal-page__list-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: var(--dp-font-weight-title, 600);
}

.appeal-page__list-card {
  margin-top: 8px;
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
  border-radius: var(--dp-radius-panel, 6px);
  cursor: pointer;
  background: #fff;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: var(--ant-color-primary-border);
    box-shadow: var(--dp-shadow-sm);
  }

  &--active {
    border-color: var(--ant-color-primary);
    border-left: 3px solid var(--ant-color-primary);
    background: var(--dp-blue-50);
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
      font-weight: 600;
    }

    .meta-item--countdown {
      color: var(--ant-color-warning);
      font-weight: 600;
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

.appeal-evidence-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.appeal-evidence-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
  line-height: 1.5;
}

.appeal-evidence-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-exam-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--ant-color-fill-quaternary);
  border-radius: var(--dp-radius-control-inner, 6px);

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
