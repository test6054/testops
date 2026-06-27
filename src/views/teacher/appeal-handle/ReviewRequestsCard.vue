<template>
  <section class="appeal-section">
    <UiFilterBar
      v-model="filterModel"
      :fields="filterFields"
      search-text="查询"
      @search="handleSearch"
      @reset="handleFilterReset"
    />

    <UiDataTable
      class="student-detail-table__data-table"
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
        <template v-if="column.key === 'reasonType'">
          {{ formatReasonType(rows[index].reasonType) }}
        </template>
        <template v-else-if="column.key === 'student'">
          <span>{{ formatStudent(rows[index]) }}</span>
        </template>
        <template v-else-if="column.key === 'requestStatus'">
          <UiTag :tone="requestStatusColor(rows[index].requestStatus)">
            {{ requestStatusLabel(rows[index].requestStatus) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'questionRefs'">
          <span class="ellipsis">{{ formatQuestionRefs(rows[index]) }}</span>
        </template>
        <template v-else-if="column.key === 'evidenceFileRefs'">
          <span class="ellipsis">{{ formatEvidenceRefs(rows[index]) }}</span>
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(rows[index].createTime) }}
        </template>
        <template v-else-if="column.key === 'reviewTime'">
          {{ formatDateTime(rows[index].reviewTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <div v-if="canHandleReviewRequest(rows[index].requestStatus)" class="operations-cell" @click.stop>
            <UiTextAction @click="openHandleModal(rows[index], 'APPROVED')">通过</UiTextAction>
            <UiTextAction tone="danger" @click="openHandleModal(rows[index], 'REJECTED')">驳回</UiTextAction>
          </div>
        </template>
      </template>
    </UiDataTable>

    <a-modal
      v-model:open="handleOpen"
      :title="handleTitle"
      :confirm-loading="handling"
      :mask-closable="false"
      width="520px"
      @ok="submitHandle"
    >
      <a-form layout="vertical">
        <a-alert
          :type="conclusionDraft === 'APPROVED' ? 'success' : 'warning'"
          show-icon
          style="margin-bottom: 12px"
          :message="
            conclusionDraft === 'APPROVED'
              ? '通过后允许进入成绩更正流程。'
              : '驳回后申请关闭，无法恢复。'
          "
        />
        <a-form-item label="申请学生">
          <a-input :value="targetRequest ? formatStudent(targetRequest) : ''" disabled />
        </a-form-item>
        <a-form-item label="复核题目">
          <a-textarea
            :value="targetRequest ? formatQuestionRefs(targetRequest) : ''"
            :rows="2"
            disabled
          />
        </a-form-item>
        <a-form-item label="原因类型">
          <a-input
            :value="targetRequest ? formatReasonType(targetRequest.reasonType) : ''"
            disabled
          />
        </a-form-item>
        <a-form-item label="申请原因">
          <a-textarea :value="targetRequest?.requestReason ?? ''" :rows="3" disabled />
        </a-form-item>
        <a-form-item v-if="targetRequest && targetRequest.evidenceFileRefs.length > 0" label="佐证材料">
          <div class="evidence-file-list">
            <UiTextAction
              v-for="file in targetRequest.evidenceFileRefs"
              :key="file.fileId"
              @click="downloadEvidenceFile(file)"
            >
              {{ file.fileName }}
            </UiTextAction>
          </div>
        </a-form-item>
        <a-form-item label="复核备注">
          <a-textarea
            v-model:value="reviewNote"
            :rows="3"
            :max-length="200"
            show-count
            placeholder="选填，作为审计记录"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  GradeReviewEvidenceFileRefVO,
  GradeReviewReasonTypeCode,
  GradeReviewRequestItemResponse,
  GradeReviewRequestStatusCode,
  ReviewConclusion,
} from '@/apis/mark/grade-review'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  getReviewSummary,
  GRADE_REVIEW_REASON_TYPE_LABEL,
  handleReviewRequest,
  listReviewRequests,
  REVIEW_REQUEST_STATUS_LABEL,
  REVIEW_REQUEST_STATUS_OPTIONS,
  REVIEW_REQUEST_STATUS_TONE,
} from '@/apis/mark/grade-review'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { assertUserFacing } from '@/utils/contract-guard'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ReviewRequestsCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()
const emit = defineEmits<{
  (e: 'handled'): void
  (e: 'pending-change', count: number): void
}>()

const rows = ref<GradeReviewRequestItemResponse[]>([])
const loading = ref(false)
const pendingCount = ref(0)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

const filterForm = reactive<{ status?: GradeReviewRequestStatusCode, keyword: string }>({
  keyword: '',
})

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
    placeholder: '按学号 / 姓名 / 申请原因搜索',
    allowClear: true,
    width: 260,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
  {
    key: 'status',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: REVIEW_REQUEST_STATUS_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  },
]

const columns: ColumnType<GradeReviewRequestItemResponse>[] = [
  { title: '学生', key: 'student', width: 150 },
  { title: '复核题目', key: 'questionRefs', width: 220 },
  { title: '佐证', key: 'evidenceFileRefs', width: 140 },
  { title: '原因类型', dataIndex: 'reasonType', key: 'reasonType', width: 120 },
  { title: '申请原因', dataIndex: 'requestReason', key: 'requestReason', ellipsis: true },
  { title: '状态', key: 'requestStatus', width: 100 },
  { title: '提交时间', key: 'createTime', width: 160 },
  { title: '复核时间', key: 'reviewTime', width: 160 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const handleOpen = ref(false)
const handling = ref(false)
const targetRequest = ref<GradeReviewRequestItemResponse | null>(null)
const conclusionDraft = ref<ReviewConclusion>('APPROVED')
const reviewNote = ref('')

const handleTitle = computed(() =>
  conclusionDraft.value === 'APPROVED' ? '通过复核申请' : '驳回复核申请',
)

/** 后端仅允许 PENDING / IN_REVIEW 状态进入 handleReviewRequest。 */
function canHandleReviewRequest(status: GradeReviewRequestStatusCode): boolean {
  return status === 'PENDING' || status === 'IN_REVIEW'
}

function openHandleModal(
  record: GradeReviewRequestItemResponse,
  conclusion: ReviewConclusion,
): void {
  if (!canHandleReviewRequest(record.requestStatus)) {
    return
  }
  targetRequest.value = record
  conclusionDraft.value = conclusion
  reviewNote.value = ''
  handleOpen.value = true
}

async function loadPendingCount(): Promise<void> {
  if (!props.examId) {
    pendingCount.value = 0
    emit('pending-change', 0)
    return
  }
  const summary = await getReviewSummary(props.examId)
  pendingCount.value = summary.pendingRequestCount + summary.inReviewRequestCount
  emit('pending-change', pendingCount.value)
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    const keyword = filterForm.keyword.trim() || undefined
    const result = await listReviewRequests({
      examId: props.examId,
      requestStatus: filterForm.status,
      keyword,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    const list = readPageList(result, '复核申请加载失败')
    validateReviewRequestDisplayContracts(list)
    rows.value = list
    pagination.total = readPageTotal(result, '复核申请加载失败')
    pagination.current = result.pageNum ?? pagination.current
    pagination.pageSize = result.pageSize ?? pagination.pageSize
    await loadPendingCount()
  } catch (e) {
    rows.value = []
    pagination.total = 0
    showUserError(e, '复核申请加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  pagination.current = 1
  void reload()
}

function handleFilterReset(): void {
  filterForm.status = undefined
  filterForm.keyword = ''
  pagination.current = 1
  void reload()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void reload()
}

function validateReviewRequestDisplayContracts(list: GradeReviewRequestItemResponse[]): void {
  const dataError = '复核申请加载失败，请刷新后重试'
  for (const record of list) {
    assertUserFacing(
      Boolean(record.studentName?.trim()) && Boolean(record.studentNo?.trim()),
      dataError,
    )
    assertUserFacing(Array.isArray(record.evidenceFileRefs), dataError)
  }
}

async function submitHandle(): Promise<void> {
  if (!targetRequest.value?.id) {
    message.warning('未选中申请')
    return
  }
  if (!canHandleReviewRequest(targetRequest.value.requestStatus)) {
    message.warning('当前申请状态不可处理')
    return
  }
  handling.value = true
  try {
    await handleReviewRequest({
      reviewRequestId: targetRequest.value.id,
      conclusion: conclusionDraft.value,
      reviewNote: reviewNote.value.trim() || undefined,
    })
    message.success('处理已提交')
    handleOpen.value = false
    await reload()
    emit('handled')
  } catch (e) {
    showUserError(e, '复核处理提交失败')
  } finally {
    handling.value = false
  }
}

function requestStatusColor(status: GradeReviewRequestStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_REQUEST_STATUS_TONE, status, '复核申请状态')
}

function requestStatusLabel(status: GradeReviewRequestStatusCode): string {
  return strictEnumLabel(REVIEW_REQUEST_STATUS_LABEL, status, '复核申请状态')
}

function formatReasonType(reasonType: GradeReviewReasonTypeCode): string {
  return strictEnumLabel(GRADE_REVIEW_REASON_TYPE_LABEL, reasonType, '复核原因类型')
}

function formatStudent(record: GradeReviewRequestItemResponse): string {
  const name = record.studentName.trim()
  const no = record.studentNo.trim()
  return `${name}（${no}）`
}

function formatQuestionRefs(record: GradeReviewRequestItemResponse): string {
  if (record.questionRefs.length === 0) {
    return '总分复核'
  }
  return record.questionRefs
    .map(
      (question) =>
        `第 ${question.questionNo} 题 · ${question.questionType} · 满分 ${question.fullScore} 分`,
    )
    .join('、')
}

function formatEvidenceRefs(record: GradeReviewRequestItemResponse): string {
  if (record.evidenceFileRefs.length === 0) {
    return '—'
  }
  return `${record.evidenceFileRefs.length} 个文件`
}

async function downloadEvidenceFile(file: GradeReviewEvidenceFileRefVO): Promise<void> {
  try {
    await handleDownloadFile({ fileId: file.fileId, fileName: file.fileName })
  } catch (error) {
    showUserError(error, '佐证文件下载失败')
  }
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

<style lang="scss" scoped>
.ellipsis {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evidence-file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
