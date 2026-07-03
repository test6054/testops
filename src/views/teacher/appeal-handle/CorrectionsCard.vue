<template>
  <section class="appeal-section">
    <UiAlertStrip
      v-if="republishGuideVisible"
      tone="warning"
      title="成绩已更正，学生侧暂不可见"
      description="更正后最终成绩状态为「已更正」，须前往「成绩发布」重新发布，学生才能看到更新后的分数。"
      :closable="false"
      dense
    >
      <template #actions>
        <UiButton size="sm" variant="outline" @click="goScorePublish">前往成绩发布</UiButton>
      </template>
    </UiAlertStrip>
    <div class="appeal-section__header">
      <a-button type="primary" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>新建更正
      </a-button>
    </div>

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
      class="student-detail-table__data-table"
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
          <UiTag :tone="correctionStatusColor(rows[index])">
            {{ correctionStatusLabel(rows[index]) }}
          </UiTag>
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
  </section>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradeCorrectionRecordVO,
  GradeCorrectionTypeCode,
  GradeReviewRequestItemResponse,
} from '@/apis/mark/grade-review'
import {
  createCorrection,
  GRADE_CORRECTION_STATUS_LABEL,
  GRADE_CORRECTION_STATUS_TONE,
  GRADE_CORRECTION_TYPE_LABEL,
  listCorrections,
  listReviewRequests,
} from '@/apis/mark/grade-review'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { assertUserFacing } from '@/utils/contract-guard'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'CorrectionsCard' })

const props = defineProps<{ examId: string; reloadToken: number }>()
const emit = defineEmits<{ (e: 'created'): void; (e: 'republish-required'): void }>()

const router = useRouter()
const republishGuideVisible = ref(false)

const APPROVED_REVIEW_REQUEST_PAGE_SIZE = 100

const rows = ref<ExamGradeCorrectionRecordVO[]>([])
const loading = ref(false)
const approvedReviewRequests = ref<GradeReviewRequestItemResponse[]>([])
const reviewRequestLoading = ref(false)
const pagination = reactive({
  current: 1,
  pageSize: 20,
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
  republishGuideVisible.value = false
  createOpen.value = true
  await loadApprovedReviewRequests()
}

function goScorePublish(): void {
  if (!props.examId) return
  void router.push({ name: 'TeacherExamWorkspaceScoreRelease', params: { examId: props.examId } })
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    const keyword = filterForm.keyword.trim() || undefined
    const result = await listCorrections({
      examId: props.examId,
      keyword,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    const records = readPageList(result, '成绩更正记录加载失败')
    validateCorrectionDisplayContracts(records)
    rows.value = records
    pagination.total = readPageTotal(result, '成绩更正记录加载失败')
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

function handlePageChange(pageInfo: { current: number; pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void reload()
}

async function loadApprovedReviewRequests(): Promise<void> {
  if (!props.examId) return
  reviewRequestLoading.value = true
  try {
    const requests = await readAllPages(
      (pageNum) =>
        listReviewRequests({
          examId: props.examId,
          requestStatus: 'APPROVED',
          pageNum,
          pageSize: APPROVED_REVIEW_REQUEST_PAGE_SIZE,
        }),
      '已通过复核申请加载失败',
    )
    validateReviewRequestDisplayContracts(requests)
    approvedReviewRequests.value = requests
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
      const hasQuestionDisplay =
        row.questionNo?.trim() && row.questionType?.trim() && typeof row.fullScore === 'number'
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
    form.questionTemplateId &&
    !request.questionRefs.some(
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
    republishGuideVisible.value = true
    await reload()
    emit('created')
    emit('republish-required')
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

function correctionStatusColor(row: ExamGradeCorrectionRecordVO): BadgeTone {
  return strictEnumTone(GRADE_CORRECTION_STATUS_TONE, row.correctionStatus, '成绩更正状态')
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
      republishGuideVisible.value = false
      void reload()
    }
  },
  { immediate: true },
)
</script>
