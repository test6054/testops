<template>
  <GiPageLayout>
    <div class="appeal-page">
      <!-- Hero -->
      <UiPageCard :show-header="false" class="appeal-page__hero-card">
        <a-spin :spinning="loadingExams" class="hero-spin">
          <div class="appeal-page__hero">
            <div class="appeal-page__hero-main">
              <div class="appeal-page__title-row">
                <h1 class="appeal-page__title">复核申请</h1>
                <UiTag tone="blue" size="md">{{ appealableExams.length }} 场可申请</UiTag>
                <UiTag v-if="pendingRequestCount > 0" tone="orange" size="md">
                  待处理 {{ pendingRequestCount }}
                </UiTag>
              </div>
              <div class="appeal-page__meta">
                <span>对最近公示期内的成绩提交复核申请，并查看处理进度。一次加载，避免按考试反复查询。</span>
              </div>
            </div>
            <div class="appeal-page__hero-actions">
              <UiButton variant="outline" size="md" :loading="loadingExams || loadingRequests" @click="reloadAll">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新数据
              </UiButton>
              <UiButton size="md" :disabled="!selectedAppealableExam" @click="openSubmitModal">
                <template #icon>
                  <FormOutlined />
                </template>
                提交复核申请
              </UiButton>
            </div>
          </div>

          <div class="appeal-page__summary-grid">
            <div class="workspace-summary workspace-summary--accent">
              <span class="workspace-summary__label">可发起复核</span>
              <strong class="workspace-summary__value">{{ appealableExams.length }}</strong>
              <span class="workspace-summary__desc">已发布且窗口开放</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">已提交申请</span>
              <strong class="workspace-summary__value">{{ requests.length }}</strong>
              <span class="workspace-summary__desc">所有考试合计</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">待处理</span>
              <strong class="workspace-summary__value">{{ pendingRequestCount }}</strong>
              <span class="workspace-summary__desc">PENDING / IN_REVIEW</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">已处理</span>
              <strong class="workspace-summary__value">{{ resolvedRequestCount }}</strong>
              <span class="workspace-summary__desc">通过 / 驳回 / 已更正</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <!-- 选择考试 -->
      <UiCard class="appeal-page__select-card">
        <template #title>
          <CheckCircleOutlined />
          <span>选择待申诉的考试</span>
          <UiBadge tone="blue">{{ appealableExams.length }} 场</UiBadge>
        </template>

        <UiEmpty
          v-if="!loadingExams && appealableExams.length === 0"
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
                <h3 class="exam-pick-item__title">{{ exam.examName || '未命名考试' }}</h3>
                <UiTag tone="green" size="sm">已发布</UiTag>
                <UiTag tone="orange" size="sm">复核进行中</UiTag>
              </div>
              <div class="exam-pick-item__meta">
                <span class="meta-item">编号：{{ exam.examNo || '-' }}</span>
                <span class="meta-item">
                  本次得分：<strong class="score-text">{{ exam.finalScore?.toFixed(2) ?? '-' }}</strong>
                </span>
                <span class="meta-item">
                  <ClockCircleOutlined />
                  截止 {{ formatTime(exam.reviewWindowCloseTime) }}
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

        <UiEmpty
          v-if="!loadingRequests && filteredRequests.length === 0"
          description="暂无复核申请记录"
        />

        <a-table
          v-else
          :columns="columns"
          :data-source="filteredRequests"
          :loading="loadingRequests"
          row-key="id"
          size="middle"
          class="requests-table"
          :pagination="{ pageSize: 10, showSizeChanger: true }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'examName'">
              <div class="exam-cell">
                <strong class="exam-cell__title">{{ record.examName || '未命名考试' }}</strong>
                <span v-if="record.examNo" class="exam-cell__sub">编号：{{ record.examNo }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'reasonType'">
              <UiTag tone="purple" size="sm">{{ formatReasonType(record.reasonType) }}</UiTag>
            </template>
            <template v-else-if="column.key === 'requestReason'">
              <a-tooltip :title="record.requestReason">
                <div class="reason-cell">{{ record.requestReason || '-' }}</div>
              </a-tooltip>
            </template>
            <template v-else-if="column.key === 'requestStatus'">
              <UiTag
                v-if="record.requestStatus"
                :tone="REVIEW_REQUEST_STATUS_TONE[record.requestStatus]"
                size="sm"
              >
                {{ REVIEW_REQUEST_STATUS_LABEL[record.requestStatus] }}
              </UiTag>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatTime(record.createTime) }}
            </template>
            <template v-else-if="column.key === 'reviewTime'">
              {{ formatTime(record.reviewTime) }}
            </template>
            <template v-else-if="column.key === 'reviewNote'">
              <a-tooltip :title="record.reviewNote">
                <div class="reason-cell">{{ record.reviewNote || '-' }}</div>
              </a-tooltip>
            </template>
          </template>
        </a-table>
      </UiCard>
    </div>

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
          <div class="modal-exam-info">
            <strong>{{ selectedAppealableExam?.examName || '-' }}</strong>
            <UiTag tone="green" size="sm">已发布</UiTag>
            <span class="modal-exam-info__score">
              本次得分 <strong>{{ selectedAppealableExam?.finalScore?.toFixed(2) ?? '-' }}</strong>
            </span>
          </div>
        </a-form-item>
        <a-form-item label="申请原因类型" required>
          <a-select v-model:value="form.reasonType" placeholder="请选择原因类型" :options="reasonTypeOptions" />
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
        <a-form-item label="申请题目ID（可选）">
          <a-input
            v-model:value="form.questionIds"
            placeholder="逗号分隔，例如：1001,1002；不填表示对总分申诉"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type {GradeReviewRequestStatusCode, StudentGradeReviewRequestItemVO} from '@/apis/mark/grade-review';
import type {StudentExamItemVO} from '@/apis/mark/student-exam';
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  
  listMyReviewRequests,
  REVIEW_REQUEST_STATUS_LABEL,
  
  REVIEW_REQUEST_STATUS_TONE,
  submitReviewRequest
} from '@/apis/mark/grade-review'
import {
  canSubmitReview,
  listMyExams
  
} from '@/apis/mark/student-exam'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'StudentAppeal' })

const route = useRoute()
const loadingExams = ref(false)
const loadingRequests = ref(false)
const submitting = ref(false)
const submitModalOpen = ref(false)

const exams = ref<StudentExamItemVO[]>([])
const requests = ref<StudentGradeReviewRequestItemVO[]>([])
const selectedExamId = ref<string | undefined>(undefined)
const filterExamId = ref<string | undefined>(undefined)
const filterStatus = ref<GradeReviewRequestStatusCode | undefined>(undefined)

const form = reactive({
  reasonType: 'SCORE_ERROR' as string,
  requestReason: '',
  questionIds: '',
})

const reasonTypeOptions = [
  { value: 'SCORE_ERROR', label: '分数计算错误' },
  { value: 'RUBRIC', label: '评分标准争议' },
  { value: 'OBJECTIVE', label: '客观题判定争议' },
  { value: 'OTHER', label: '其他' },
]

const statusOptions: Array<{ value: GradeReviewRequestStatusCode, label: string }> = [
  { value: 'PENDING', label: '待处理' },
  { value: 'IN_REVIEW', label: '处理中' },
  { value: 'APPROVED', label: '通过' },
  { value: 'REJECTED', label: '驳回' },
  { value: 'CORRECTED', label: '已更正' },
]

const appealableExams = computed<StudentExamItemVO[]>(() => exams.value.filter(canSubmitReview))

const examFilterOptions = computed(() =>
  exams.value.map(e => ({
    value: e.examId,
    label: e.examNo ? `${e.examName ?? '未命名考试'} (${e.examNo})` : (e.examName ?? '未命名考试'),
  })),
)

const selectedAppealableExam = computed<StudentExamItemVO | null>(() => {
  if (!selectedExamId.value) return null
  return appealableExams.value.find(e => e.examId === selectedExamId.value) ?? null
})

const filteredRequests = computed<StudentGradeReviewRequestItemVO[]>(() => {
  return requests.value.filter((item) => {
    if (filterExamId.value && item.examId !== filterExamId.value) return false
    return true
  })
})

const pendingRequestCount = computed(
  () => requests.value.filter(r => r.requestStatus === 'PENDING' || r.requestStatus === 'IN_REVIEW').length,
)
const resolvedRequestCount = computed(
  () => requests.value.filter(r => r.requestStatus === 'APPROVED' || r.requestStatus === 'REJECTED' || r.requestStatus === 'CORRECTED').length,
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
  try {
    exams.value = await listMyExams()
    if (!selectedExamId.value && appealableExams.value.length > 0) {
      const queryExamId = typeof route.query.examId === 'string' ? route.query.examId : undefined
      if (queryExamId && appealableExams.value.some(e => e.examId === queryExamId)) {
        selectedExamId.value = queryExamId
      }
      else {
        selectedExamId.value = appealableExams.value[0].examId
      }
    }
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载考试失败'
    message.error(msg)
  }
  finally {
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
    requests.value = await listMyReviewRequests({
      requestStatus: filterStatus.value,
    })
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '加载复核申请失败'
    message.error(msg)
  }
  finally {
    loadingRequests.value = false
  }
}

async function reloadAll() {
  await loadExams()
  await loadRequests()
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

function formatReasonType(value?: string): string {
  if (!value) return '-'
  const found = reasonTypeOptions.find(o => o.value === value)
  return found?.label ?? value
}

function openSubmitModal() {
  if (!selectedAppealableExam.value) return
  form.reasonType = 'SCORE_ERROR'
  form.requestReason = ''
  form.questionIds = ''
  submitModalOpen.value = true
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
    const questionIdsArray = form.questionIds
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    await submitReviewRequest({
      examId: selectedAppealableExam.value.examId,
      paperInstanceId: selectedAppealableExam.value.paperInstanceId,
      requestReason: form.requestReason.trim(),
      reasonType: form.reasonType,
      questionIds: questionIdsArray.length > 0 ? JSON.stringify(questionIdsArray) : undefined,
    })
    message.success('复核申请已提交')
    submitModalOpen.value = false
    await loadRequests()
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : '提交复核申请失败'
    message.error(msg)
  }
  finally {
    submitting.value = false
  }
}

watch(() => route.query.examId, (val) => {
  if (typeof val === 'string' && appealableExams.value.some(e => e.examId === val)) {
    selectedExamId.value = val
  }
})

onMounted(async () => {
  await loadExams()
  await loadRequests()
})
</script>

<style lang="scss" scoped>
.appeal-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.hero-spin {
  width: 100%;
}

.appeal-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;

  &-main {
    flex: 1;
    min-width: 0;
  }

  &-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.appeal-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.appeal-page__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
  margin: 0;
}

.appeal-page__meta {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}

.appeal-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ant-color-border-secondary);
}

.workspace-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);

  &--accent {
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.06) 0%, rgba(22, 119, 255, 0.02) 100%);
    border-color: rgba(22, 119, 255, 0.18);
  }

  &__label {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ant-color-text);
  }

  &__desc {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
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
  border-radius: var(--dp-radius-md, 8px);
  cursor: pointer;
  background: #fff;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

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
</style>
