<template>
  <WorkbenchSurfaceCard flush class="appeal-section">
    <template #head>
      <div class="appeal-section__header">
        <UiButton size="sm" variant="primary" @click="openCreateModal"> 新建纠正 </UiButton>
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
                  v-model:value="form.layoutQuestionId"
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
                  :max="totalCorrectionScoreMax"
                  :precision="2"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-alert
            v-if="makeupCap60Hint"
            type="info"
            show-icon
            message="本场为补考封顶60分：总分更正不得超过60分"
            style="margin-bottom: 12px"
          />
          <a-form-item label="申请学生">
            <a-input :value="selectedReviewStudentLabel" disabled />
          </a-form-item>
          <a-form-item label="更正原因" required>
            <a-textarea v-model:value="form.reason" :rows="3" :max-length="200" show-count />
          </a-form-item>
        </a-form>
      </UiDrawer>
    </template>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradeCorrectionRecordVO,
  GradeReviewRequestItemResponse,
} from '@/apis/mark/grade-review'
import {
  createCorrection,
  GradeReviewRequestStatusCode,
  listCorrections,
  listReviewRequests,
} from '@/apis/mark/grade-review'
import type { FilterField } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ExamScorePolicyCode } from '@/types/enums/exam-score-policy-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'

defineOptions({ name: 'CorrectionsCard' })

const props = defineProps<{
  examId: string
  reloadToken: number
  scorePolicy?: ExamScorePolicyCode
}>()
const emit = defineEmits<{ (e: 'created'): void }>()

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

const makeupCap60Hint = computed(
  () => isTotalScoreCorrection.value && props.scorePolicy === ExamScorePolicyCode.MAKEUP_CAP60,
)

const totalCorrectionScoreMax = computed(() => (makeupCap60Hint.value ? 60 : undefined))

async function openCreateModal(): Promise<void> {
  form.layoutQuestionId = ''
  form.afterScore = 0
  form.reason = ''
  form.reviewRequestId = ''
  createOpen.value = true
  await loadApprovedReviewRequests()
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

    rows.value = readPageList(result, '成绩更正记录加载失败')
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
    approvedReviewRequests.value = await readAllPages(
      (pageNum) =>
        listReviewRequests({
          examId: props.examId,
          requestStatus: GradeReviewRequestStatusCode.APPROVED,
          pageNum,
          pageSize: APPROVED_REVIEW_REQUEST_PAGE_SIZE,
        }),
      '已通过复核申请加载失败',
    )
  } catch (e) {
    approvedReviewRequests.value = []
    showUserError(e, '已通过复核申请加载失败')
  } finally {
    reviewRequestLoading.value = false
  }
}

function handleReviewRequestChange(): void {
  form.layoutQuestionId = ''
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
  if (request.questionRefs.length > 0 && !form.layoutQuestionId) {
    message.warning('单题复核申请必须选择更正题目')
    return
  }
  if (
    form.layoutQuestionId &&
    !request.questionRefs.some((question) => question.layoutQuestionId === form.layoutQuestionId)
  ) {
    message.warning('更正题目必须来自选中的复核申请')
    return
  }
  if (
    request.questionRefs.length === 0 &&
    props.scorePolicy === ExamScorePolicyCode.MAKEUP_CAP60 &&
    form.afterScore > 60
  ) {
    message.warning('补考成绩策略为封顶60分，更正后总成绩不能超过60分')
    return
  }
  submitting.value = true
  try {
    await createCorrection({
      examId: props.examId,
      layoutQuestionId: form.layoutQuestionId || undefined,
      afterScore: form.afterScore,
      reason: form.reason.trim(),
      reviewRequestId: request.id,
    })
    const successMessage = form.layoutQuestionId
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
