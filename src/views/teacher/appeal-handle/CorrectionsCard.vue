<template>
  <a-card title="成绩更正记录" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>新建更正
        </a-button>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>

    <!-- D-9 错误态：更正记录加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="更正记录加载失败"
      compact
      @retry="reload"
    />
    <UiDataTable
      v-else
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      size="small"
      :page-size="20"
      :total="rows.length"
      flat
    >
      <template #bodyCell="{ column, index }">
        <template v-if="column.key === 'student'">
          {{ correctionStudentLabel(rows[index]) }}
        </template>
        <template v-else-if="column.key === 'question'">
          {{ correctionQuestionLabel(rows[index]) }}
        </template>
        <template v-else-if="column.key === 'scoreChange'">
          {{ correctionScoreChangeLabel(rows[index]) }}
        </template>
        <template v-else-if="column.key === 'correctionType'">
          {{ correctionTypeLabel(rows[index]) }}
        </template>
        <template v-else-if="column.key === 'correctionStatus'">
          <a-tag :color="correctionStatusColor(rows[index])">
            {{ correctionStatusLabel(rows[index]) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'effectiveTime'">
          {{ formatDateTime(rows[index].effectiveTime) }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(rows[index].createTime) }}
        </template>
      </template>
    </UiDataTable>

    <a-modal
      v-model:open="createOpen"
      title="新建成绩更正"
      :confirm-loading="submitting"
      :mask-closable="false"
      width="560px"
      @ok="submit"
    >
      <a-form layout="vertical" :model="form">
        <a-row :gutter="12">
          <a-col :span="14">
            <a-form-item label="复核申请" required>
              <a-select
                v-model:value="form.reviewRequestId"
                :loading="reviewRequestLoading"
                :options="reviewRequestOptions"
                placeholder="选择已通过的复核申请"
                show-search
                option-filter-prop="label"
                @change="handleReviewRequestChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="10">
            <a-form-item label="更正类型">
              <a-input :value="selectedReviewRequestScope" disabled />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="14">
            <a-form-item label="更正题目">
              <a-select
                v-model:value="form.questionTemplateId"
                :disabled="selectedReviewQuestionOptions.length === 0"
                :options="selectedReviewQuestionOptions"
                placeholder="总分更正无需选择题目"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="10">
            <a-form-item label="更正后分数" required>
              <a-input-number
                v-model:value="form.afterScore"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="申请学生">
          <a-input :value="selectedReviewStudentLabel" disabled />
        </a-form-item>
        <a-form-item label="更正原因" required>
          <a-textarea v-model:value="form.reason" :rows="3" :max-length="200" show-count />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradeCorrectionRecordVO,
  GradeCorrectionTypeCode,
  GradeReviewRequestItemResponse,
} from '@/apis/mark/grade-review'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  createCorrection,
  GRADE_CORRECTION_STATUS_COLOR,
  GRADE_CORRECTION_STATUS_LABEL,
  GRADE_CORRECTION_TYPE_LABEL,
  listCorrections,
  listReviewRequests,
} from '@/apis/mark/grade-review'
import { UiDataTable, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { assertUserFacing } from '@/utils/contract-guard'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'CorrectionsCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()
const emit = defineEmits<{ (e: 'created'): void }>()

const rows = ref<ExamGradeCorrectionRecordVO[]>([])
const loading = ref(false)
// D-9 错误态：更正记录加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
const approvedReviewRequests = ref<GradeReviewRequestItemResponse[]>([])
const reviewRequestLoading = ref(false)

const columns: ColumnType<ExamGradeCorrectionRecordVO>[] = [
  { title: '学生', key: 'student', width: 150 },
  { title: '题目', key: 'question', width: 180 },
  { title: '类型', key: 'correctionType', width: 110 },
  { title: '分数变化', key: 'scoreChange', width: 120 },
  { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '状态', key: 'correctionStatus', width: 100 },
  { title: '生效时间', key: 'effectiveTime', width: 160 },
  { title: '创建时间', key: 'createTime', width: 160 },
]

const createOpen = ref(false)
const submitting = ref(false)
const form = reactive<{
  questionTemplateId: string
  afterScore: number
  reason: string
  reviewRequestId: string
}>({
  questionTemplateId: '',
  afterScore: 0,
  reason: '',
  reviewRequestId: '',
})

const selectedReviewRequest = computed(() =>
  approvedReviewRequests.value.find((request) => request.id === form.reviewRequestId),
)

const reviewRequestOptions = computed(() =>
  approvedReviewRequests.value.map((request) => ({
    value: request.id,
    label: `${reviewRequestStudentLabel(request)} · ${reviewRequestQuestionLabel(request)}`,
  })),
)

const selectedReviewQuestionOptions = computed(
  () =>
    selectedReviewRequest.value?.questionRefs.map((question) => ({
      value: question.questionTemplateId,
      label: `第 ${question.questionNo} 题 · ${question.questionType} · 满分 ${question.fullScore} 分`,
    })) ?? [],
)

const selectedReviewRequestScope = computed(() =>
  selectedReviewRequest.value ? reviewRequestQuestionLabel(selectedReviewRequest.value) : '',
)

const selectedReviewStudentLabel = computed(() =>
  selectedReviewRequest.value ? reviewRequestStudentLabel(selectedReviewRequest.value) : '',
)

async function openCreateModal(): Promise<void> {
  form.questionTemplateId = ''
  form.afterScore = 0
  form.reason = ''
  form.reviewRequestId = ''
  createOpen.value = true
  await loadApprovedReviewRequests()
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    const records = await listCorrections({ examId: props.examId })
    validateCorrectionDisplayContracts(records)
    rows.value = records
  } catch (e) {
    rows.value = []
    loadError.value = toUserError(e, '成绩更正记录加载失败')
    showUserError(e, '成绩更正记录加载失败')
  } finally {
    loading.value = false
  }
}

async function loadApprovedReviewRequests(): Promise<void> {
  if (!props.examId) return
  reviewRequestLoading.value = true
  try {
    const page = await listReviewRequests({
      examId: props.examId,
      requestStatus: 'APPROVED',
      pageNum: 1,
      pageSize: 200,
    })
    validateReviewRequestDisplayContracts(page.list)
    approvedReviewRequests.value = page.list
  } catch (e) {
    approvedReviewRequests.value = []
    showUserError(e, '已通过复核申请加载失败')
  } finally {
    reviewRequestLoading.value = false
  }
}

/** 校验成绩更正记录列表所需展示字段，缺失时进入组件错误态。 */
function validateCorrectionDisplayContracts(list: ExamGradeCorrectionRecordVO[]): void {
  const dataError = '成绩更正记录加载失败，请刷新后重试'
  for (const row of list) {
    assertUserFacing(Boolean(row.studentName?.trim()) && Boolean(row.studentNo?.trim()), dataError)
    if (row.correctionType !== 'TOTAL_SCORE') {
      const hasQuestionDisplay
        = row.questionNo?.trim() && row.questionType?.trim() && typeof row.fullScore === 'number'
      assertUserFacing(Boolean(hasQuestionDisplay), dataError)
    }
  }
}

/** 校验可更正复核申请所需学生展示字段，缺失时中断弹窗数据源。 */
function validateReviewRequestDisplayContracts(list: GradeReviewRequestItemResponse[]): void {
  const dataError = '复核申请加载失败，请刷新后重试'
  for (const request of list) {
    assertUserFacing(
      Boolean(request.studentName?.trim()) && Boolean(request.studentNo?.trim()),
      dataError,
    )
  }
}

function handleReviewRequestChange(): void {
  form.questionTemplateId = ''
}

async function submit(): Promise<void> {
  const request = selectedReviewRequest.value
  if (!request) {
    message.warning('请选择已通过的复核申请')
    return
  }
  if (!form.reason.trim()) {
    message.warning('更正原因必填')
    return
  }
  if (request.questionRefs.length > 0 && !form.questionTemplateId) {
    message.warning('单题复核申请必须选择更正题目')
    return
  }
  if (
    form.questionTemplateId
    && !request.questionRefs.some(
      (question) => question.questionTemplateId === form.questionTemplateId,
    )
  ) {
    message.warning('更正题目必须来自选中的复核申请')
    return
  }
  submitting.value = true
  try {
    await createCorrection({
      examId: props.examId,
      questionTemplateId: form.questionTemplateId || undefined,
      afterScore: form.afterScore,
      reason: form.reason.trim(),
      reviewRequestId: request.id,
    })
    const successMessage = form.questionTemplateId
      ? '单题更正已执行，题目统计已同步刷新'
      : '总分更正已执行'
    message.success(successMessage)
    createOpen.value = false
    await reload()
    emit('created')
  } catch (e) {
    showUserError(e, '成绩更正提交失败')
  } finally {
    submitting.value = false
  }
}

function correctionStudentLabel(row: ExamGradeCorrectionRecordVO): string {
  const name = row.studentName.trim()
  const no = row.studentNo.trim()
  return `${name}（${no}）`
}

function correctionQuestionLabel(row: ExamGradeCorrectionRecordVO): string {
  if (row.correctionType === 'TOTAL_SCORE') {
    return '总分'
  }
  const questionNo = row.questionNo?.trim()
  const questionType = row.questionType?.trim()
  const fullScore = row.fullScore
  if (questionNo && questionType && typeof fullScore === 'number') {
    return `第 ${questionNo} 题 · ${questionType} · 满分 ${fullScore} 分`
  }
  return ''
}

function correctionScoreChangeLabel(row: ExamGradeCorrectionRecordVO): string {
  const beforeScore = typeof row.beforeScore === 'number' ? row.beforeScore : '-'
  const afterScore = typeof row.afterScore === 'number' ? row.afterScore : '-'
  return `${beforeScore} → ${afterScore}`
}

function correctionTypeLabel(row: ExamGradeCorrectionRecordVO): string {
  const code: GradeCorrectionTypeCode | undefined = row.correctionType
  return strictEnumLabel(GRADE_CORRECTION_TYPE_LABEL, code, '成绩更正类型')
}

function correctionStatusLabel(row: ExamGradeCorrectionRecordVO): string {
  return strictEnumLabel(GRADE_CORRECTION_STATUS_LABEL, row.correctionStatus, '成绩更正状态')
}

function correctionStatusColor(row: ExamGradeCorrectionRecordVO): string {
  return strictEnumTone(GRADE_CORRECTION_STATUS_COLOR, row.correctionStatus, '成绩更正状态')
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
    if (props.examId) void reload()
  },
  { immediate: true },
)
</script>
