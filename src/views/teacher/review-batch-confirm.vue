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
            type="primary"
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
        tone="info"
        title="批量审核说明"
        description="自动判分客观题、AI 评分客观题、AI 评分主观题统一在此批量审核确认。可逐行调整最终分；默认沿用建议得分。任意单题失败不阻塞其余条目，提交后查看响应汇总。"
        dense
      />

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
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          size="middle"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'reviewType'">
              <a-tag
                v-if="(record as ReviewTaskItemVO).reviewType"
                :color="REVIEW_TASK_TYPE_META[(record as ReviewTaskItemVO).reviewType!].color"
              >
                {{ REVIEW_TASK_TYPE_META[(record as ReviewTaskItemVO).reviewType!].label }}
              </a-tag>
              <span v-else style="color: #94a3b8">未派生</span>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <a-input-number
                v-model:value="finalScoreMap[(record as ReviewTaskItemVO).reviewTaskId]"
                :min="0"
                :max="(record as ReviewTaskItemVO).fullScore ?? 100"
                :step="0.5"
                :precision="1"
                style="width: 96px"
              />
            </template>
            <template v-else-if="column.key === 'commentText'">
              <a-input
                v-model:value="commentTextMap[(record as ReviewTaskItemVO).reviewTaskId]"
                placeholder="评语，可空"
                allow-clear
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button
                type="link"
                size="small"
                @click="openSingleReview(record as ReviewTaskItemVO)"
              >
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
import StageWorkbenchShell from '@/components/layout/StageWorkbenchShell.vue'
import UiAlertStrip from '@/components/ui/UiAlertStrip.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiTag from '@/components/ui/UiTag.vue'

const router = useRouter()
const examLoading = ref(false)
const examOptions = ref<{ label: string, value: string }[]>([])
const selectedExamId = ref<string | undefined>(undefined)
const loading = ref(false)
const submitting = ref(false)
const tasks = ref<ReviewTaskItemVO[]>([])
const selectedTaskIds = ref<string[]>([])
const finalScoreMap = ref<Record<string, number | undefined>>({})
const commentTextMap = ref<Record<string, string>>({})
const channelFilter = ref<ReviewTaskTypeCode | undefined>(undefined)

interface BatchSummary {
  totalCount: number
  successCount: number
  failureCount: number
  failureMessage: string
}

const batchSummary = ref<BatchSummary | null>(null)

const columns = [
  { title: '匿名号', dataIndex: 'anonymousNo', key: 'anonymousNo', width: 110 },
  { title: '题号', dataIndex: 'questionNo', key: 'questionNo', width: 80 },
  { title: '任务通道', key: 'reviewType', width: 160 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 70 },
  { title: '建议分', dataIndex: 'suggestedScore', key: 'suggestedScore', width: 80 },
  { title: '最终分', key: 'finalScore', width: 130 },
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
    examOptions.value = (result?.list ?? []).map((exam: ExamSummaryVO) => ({
      label: [formatExamOptionLabel(exam), formatAcademicTerm(exam)].filter(Boolean).join(' · '),
      value: exam.examId,
    }))
  } catch (error) {
    message.error('加载考试列表失败：' + ((error as Error)?.message ?? ''))
  } finally {
    examLoading.value = false
  }
}

function formatSemester(value?: string): string {
  if (value === '1') return '秋季学期'
  if (value === '2') return '春季学期'
  return value ?? ''
}

function formatAcademicTerm(exam: ExamSummaryVO): string {
  return [exam.academicYear, formatSemester(exam.semester) || exam.semester]
    .filter(Boolean)
    .join(' · ')
}

function formatExamOptionLabel(exam: ExamSummaryVO): string {
  return `${exam.examName ?? '未命名考试'}（${exam.examNo ?? exam.examId}）`
}

async function loadTasks() {
  if (!selectedExamId.value) {
    tasks.value = []
    return
  }
  loading.value = true
  try {
    // status=PENDING：尚未确认；后端按 GradeStatus.NEED_REVIEW + ReviewTaskStatus.PENDING 派生
    const items = await listReviewTasks({ examId: selectedExamId.value, status: 'PENDING' })
    const channelCode = channelFilter.value
    tasks.value = items.filter((task) => {
      if (!task.gradeResultId) return false
      if (!channelCode) return true
      return task.reviewType === channelCode
    })
    finalScoreMap.value = {}
    commentTextMap.value = {}
    for (const task of tasks.value) {
      finalScoreMap.value[task.reviewTaskId] = task.suggestedScore ?? undefined
      commentTextMap.value[task.reviewTaskId] = ''
    }
    selectedTaskIds.value = []
  } catch (error) {
    message.error('加载待审核题目失败：' + ((error as Error)?.message ?? ''))
  } finally {
    loading.value = false
  }
}

function onExamChange() {
  batchSummary.value = null
  tasks.value = []
  selectedTaskIds.value = []
  if (selectedExamId.value) {
    void loadTasks()
  }
}

function openSingleReview(record: ReviewTaskItemVO) {
  if (!record.reviewTaskId) {
    return
  }
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
    if (!task || !task.gradeResultId) {
      continue
    }
    const finalScore = finalScoreMap.value[taskId]
    if (finalScore === undefined || finalScore === null || Number.isNaN(finalScore)) {
      message.warning(`匿名号 ${task.anonymousNo ?? task.reviewTaskId} 的最终分不能为空，请先填写`)
      return
    }
    if (task.fullScore !== undefined && finalScore > task.fullScore) {
      message.warning(
        `匿名号 ${task.anonymousNo ?? task.reviewTaskId} 的最终分超过满分 ${task.fullScore}`,
      )
      return
    }
    if (finalScore < 0) {
      message.warning(`匿名号 ${task.anonymousNo ?? task.reviewTaskId} 的最终分不能为负`)
      return
    }
    items.push({
      gradeResultId: task.gradeResultId,
      finalScore,
      commentText: commentTextMap.value[taskId] || undefined,
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
          ? response.failures.map((f) => `${f.gradeResultId}: ${f.message}`).join('；')
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
    message.error('批量确认失败：' + ((error as Error)?.message ?? ''))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadExamOptions()
})
</script>

<style scoped lang="less">
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
