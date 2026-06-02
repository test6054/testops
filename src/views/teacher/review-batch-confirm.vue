<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="review-batch-confirm__context">
        <div class="review-batch-confirm__context-left">
          <a-select
            v-model:value="selectedExamId"
            class="review-batch-confirm__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="() => onExamChange()"
          />
          <UiTag tone="blue" size="sm">待审核 {{ tasks.length }}</UiTag>
          <UiTag v-if="selectedTaskIds.length > 0" tone="green" size="sm">
            已选 {{ selectedTaskIds.length }}
          </UiTag>
          <a-select
            v-model:value="channelFilter"
            class="review-batch-confirm__channel-filter"
            placeholder="任务通道筛选"
            :options="channelOptions"
            allow-clear
            size="middle"
          />
        </div>
        <div class="review-batch-confirm__context-right">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadTasks"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton
            size="sm"
            :disabled="selectedTaskIds.length === 0"
            :loading="submitting"
            @click="submitBatch"
          >
            <template #icon><CheckOutlined /></template>
            一键确认所选 {{ selectedTaskIds.length }} 项
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择考试以批量审核 NEED_REVIEW 状态的批改结果"
      class="review-batch-confirm__empty"
    />

    <a-spin v-else :spinning="loading" tip="加载待审核题目中...">
      <UiAlertStrip
        v-if="batchSummary"
        :tone="batchSummary.failureCount === 0 ? 'success' : 'warning'"
        :title="`本次提交 ${batchSummary.totalCount} 项：成功 ${batchSummary.successCount}，失败 ${batchSummary.failureCount}`"
        :description="batchSummary.failureMessage"
        dense
      />

      <UiCard class="review-batch-confirm__list-card">
        <template #title>
          <span>NEED_REVIEW 题目列表</span>
        </template>

        <a-table
          :columns="columns"
          :data-source="tasks"
          :row-key="(record: ReviewTaskItemVO) => record.reviewTaskId"
          :row-selection="rowSelection"
          :pagination="false"
          size="middle"
          bordered
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'paperDisplay'">
              <div class="review-batch-confirm__paper-cell">
                <a-typography-text strong :content="tasks[index].paperDisplay.primaryText" />
                <span
                  v-if="tasks[index].paperDisplay.secondaryText"
                  class="review-batch-confirm__hint"
                >
                  {{ tasks[index].paperDisplay.secondaryText }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'reviewType'">
              <a-tag
                v-if="tasks[index].reviewType"
                :color="REVIEW_TASK_TYPE_META[tasks[index].reviewType].color"
              >
                {{ REVIEW_TASK_TYPE_META[tasks[index].reviewType].label }}
              </a-tag>
              <span v-else style="color: #94a3b8">未派生</span>
            </template>
            <template v-else-if="column.key === 'teacherReviewScore'">
              <a-input-number
                v-model:value="confirmDrafts[index].teacherReviewScore"
                :min="0"
                :max="tasks[index].fullScore"
                :step="0.5"
                :precision="1"
                style="width: 96px"
              />
            </template>
            <template v-else-if="column.key === 'commentText'">
              <a-input
                v-model:value="confirmDrafts[index].commentText"
                placeholder="评语，可空"
                allow-clear
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="openSingleReview(tasks[index])">
                查看单题
              </a-button>
            </template>
          </template>
        </a-table>
      </UiCard>
    </a-spin>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type {
  ExamGradeBatchConfirmItem,
  ExamGradeBatchConfirmResponse,
  ExamSummaryVO,
  ReviewTaskItemVO,
  ReviewTaskTypeCode,
} from '@/apis/mark/exam'
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  batchConfirmQuestionGrades,
  listReviewTasks,
  pageExams,
  REVIEW_TASK_TYPE_META,
} from '@/apis/mark/exam'
import { UiAlertStrip, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { formatSemester } from '@/types/enums/semester-enum'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const router = useRouter()
const examLoading = ref(false)
const examOptions = ref<{ label: string, value: string }[]>([])
const selectedExamId = ref<string | undefined>(undefined)
const loading = ref(false)
const submitting = ref(false)
const tasks = ref<ReviewTaskItemVO[]>([])
const selectedTaskIds = ref<string[]>([])
const channelFilter = ref<ReviewTaskTypeCode | undefined>(undefined)

interface BatchSummary {
  totalCount: number
  successCount: number
  failureCount: number
  failureMessage: string
}

interface ReviewBatchConfirmDraft {
  reviewTaskId: string
  teacherReviewScore: number | undefined
  commentText: string
}

const batchSummary = ref<BatchSummary | null>(null)
const confirmDrafts = ref<ReviewBatchConfirmDraft[]>([])

const columns = [
  { title: '答卷', key: 'paperDisplay', width: 160 },
  { title: '题号', dataIndex: 'questionNo', key: 'questionNo', width: 80 },
  { title: '任务通道', key: 'reviewType', width: 160 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 70 },
  { title: 'AI 评分', dataIndex: 'aiScore', key: 'aiScore', width: 90 },
  { title: '教师复核评分', key: 'teacherReviewScore', width: 140 },
  { title: '评语', key: 'commentText' },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' as const },
]

/** 任务通道筛选倒下选项，“全部”使用空字符串表示不过滤。 */
const channelOptions = [
  { value: 'OBJECTIVE_AUTO_REVIEW', label: REVIEW_TASK_TYPE_META.OBJECTIVE_AUTO_REVIEW.label },
  { value: 'OBJECTIVE_AI_REVIEW', label: REVIEW_TASK_TYPE_META.OBJECTIVE_AI_REVIEW.label },
  { value: 'SUBJECTIVE_AI_REVIEW', label: REVIEW_TASK_TYPE_META.SUBJECTIVE_AI_REVIEW.label },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedTaskIds.value,
  onChange: (keys: (string | number)[]) => {
    selectedTaskIds.value = keys.map(String)
  },
  getCheckboxProps: (record: ReviewTaskItemVO) => ({
    disabled: !record.gradeResultId,
  }),
}))

async function loadExamOptions() {
  examLoading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    const list = readPageList(result, '考试列表加载失败，请稍后重试')
    examOptions.value = list.map((exam: ExamSummaryVO) => ({
      label: [formatExamOptionLabel(exam), formatAcademicTerm(exam)].filter(Boolean).join(' · '),
      value: exam.examId,
    }))
  } catch (error) {
    showUserError(error, '考试列表加载失败')
  } finally {
    examLoading.value = false
  }
}

function formatExamOptionLabel(exam: ExamSummaryVO): string {
  if (!exam.examNo) return exam.examName
  return `${exam.examName} (${exam.examNo})`
}

function formatAcademicTerm(exam: ExamSummaryVO): string {
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

async function loadTasks() {
  if (!selectedExamId.value) {
    tasks.value = []
    return
  }
  loading.value = true
  try {
    // status=PENDING：尚未确认；后端按 GradeStatus.NEED_REVIEW + ReviewTaskStatus.PENDING 派生
    const page = await listReviewTasks({
      examId: selectedExamId.value,
      status: 'PENDING',
      pageNum: 1,
      pageSize: 500,
    })
    const items = page.list
    const channelCode = channelFilter.value
    tasks.value = items.filter((task) => {
      if (!channelCode) return true
      return task.reviewType === channelCode
    })
    confirmDrafts.value = tasks.value.map((task) => ({
      reviewTaskId: task.reviewTaskId,
      teacherReviewScore: task.aiScore ?? undefined,
      commentText: '',
    }))
    selectedTaskIds.value = []
  } catch (error) {
    showUserError(error, '待审核题目加载失败')
  } finally {
    loading.value = false
  }
}

function onExamChange() {
  batchSummary.value = null
  tasks.value = []
  confirmDrafts.value = []
  selectedTaskIds.value = []
  if (selectedExamId.value) {
    void loadTasks()
  }
}

function openSingleReview(record: ReviewTaskItemVO) {
  router.push({
    name: 'TeacherReviewWorkspace',
    query: { examId: record.examId, taskId: record.reviewTaskId },
  })
}

async function submitBatch() {
  if (!selectedExamId.value) {
    return
  }
  const items: ExamGradeBatchConfirmItem[] = []
  for (const taskId of selectedTaskIds.value) {
    const task = tasks.value.find((row) => row.reviewTaskId === taskId)
    if (!task) {
      continue
    }
    const draft = confirmDrafts.value.find((row) => row.reviewTaskId === taskId)
    const teacherReviewScore = draft?.teacherReviewScore
    if (
      teacherReviewScore === undefined
      || teacherReviewScore === null
      || Number.isNaN(teacherReviewScore)
    ) {
      message.warning(`${task.paperDisplay.primaryText} 的教师复核评分不能为空，请先填写`)
      return
    }
    if (teacherReviewScore > task.fullScore) {
      message.warning(`${task.paperDisplay.primaryText} 的教师复核评分超过满分 ${task.fullScore}`)
      return
    }
    if (teacherReviewScore < 0) {
      message.warning(`${task.paperDisplay.primaryText} 的教师复核评分不能为负`)
      return
    }
    items.push({
      gradeResultId: task.gradeResultId,
      teacherReviewScore,
      commentText: draft?.commentText || undefined,
    })
  }
  if (items.length === 0) {
    message.info('未选择任何待审核题目')
    return
  }
  submitting.value = true
  try {
    const response: ExamGradeBatchConfirmResponse = await batchConfirmQuestionGrades({
      examId: selectedExamId.value,
      items,
    })
    batchSummary.value = {
      totalCount: response.totalCount,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failureMessage:
        response.failures.length > 0
          ? response.failures
              .map(
                (f, index) =>
                  `第 ${index + 1} 项：${getUserErrorMessage({ message: f.message }, '该题目得分确认失败')}`,
              )
              .join('；')
          : '',
    }
    if (response.failureCount === 0) {
      message.success(`已批量确认 ${response.successCount} 项题目得分`)
    } else {
      message.warning(
        `批量确认完成：成功 ${response.successCount} 项，失败 ${response.failureCount} 项，请查看失败明细`,
      )
    }
    await loadTasks()
  } catch (error) {
    showUserError(error, '题目得分批量确认失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadExamOptions()
})
</script>

<style scoped lang="scss">
.review-batch-confirm__context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.review-batch-confirm__context-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.review-batch-confirm__context-right {
  display: flex;
  gap: 8px;
}

.review-batch-confirm__exam-select {
  min-width: 280px;
}

.review-batch-confirm__empty {
  margin-top: 64px;
}

.review-batch-confirm__list-card {
  margin-top: 12px;
}
</style>
