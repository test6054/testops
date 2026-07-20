<template>
  <WorkbenchSurfaceCard flush class="appeal-section">
    <template #head>
      <div class="appeal-section__header">
        <span class="appeal-section__flow-hint">{{ REVIEW_REQUEST_FLOW_HINT }}</span>
      </div>
    </template>

    <template #toolbar>
      <div class="appeal-section__toolbar">
        <UiFilterBar
          variant="plain"
          v-model="filterModel"
          :fields="filterFields"
          search-text="查询"
          @search="handleSearch"
          @reset="handleFilterReset"
        />
        <span v-if="pagination.total > 0" class="appeal-section__count">{{ pagination.total }} 条</span>
      </div>

      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
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
          <template v-else-if="column.key === 'questionNo'">
            {{ primaryQuestionNo(rows[index]) }}
          </template>
          <template v-else-if="column.key === 'requestStatus'">
            <UiTag :tone="requestStatusColor(rows[index].requestStatus)" size="sm">
              {{ requestStatusLabel(rows[index].requestStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'handleResult'">
            {{ handleResultLabel(rows[index]) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="buildReviewRequestActions(rows[index]).length > 0"
              :items="buildReviewRequestActions(rows[index])"
              split
              @action="(key) => void handleReviewRequestAction(key, rows[index])"
            />
            <span v-else class="muted">—</span>
          </template>
        </template>
      </UiDataTable>

      <UiDrawer
        v-model:open="handleOpen"
        :title="handleTitle"
        :width="520"
        :confirm-loading="handling"
        :mask-closable="false"
        :hide-footer="false"
        ok-text="提交"
        @confirm="submitHandle"
      >
        <UiForm layout="vertical">
          <UiAlertStrip
            :tone="
              conclusionDraft === GradeReviewRequestStatusCode.APPROVED ? 'success' : 'warning'
            "
            style="margin-bottom: 12px"
            :title="
              conclusionDraft === GradeReviewRequestStatusCode.APPROVED
                ? '通过后允许进入成绩更正流程。'
                : '驳回后申请关闭，无法恢复。'
            "
          />
          <UiFormItem label="申请学生">
            <UiInput
              size="sm" :value="targetRequest ? formatStudent(targetRequest) : ''" disabled
            />
          </UiFormItem>
          <UiFormItem label="复核题目">
            <UiTextarea
              size="sm"
              :value="targetRequest ? formatQuestionRefs(targetRequest) : ''"
              :rows="2"
              disabled
            />
          </UiFormItem>
          <UiFormItem label="原因类型">
            <UiInput
              size="sm"
              :value="targetRequest ? formatReasonType(targetRequest.reasonType) : ''"
              disabled
            />
          </UiFormItem>
          <UiFormItem label="申请原因">
            <UiTextarea size="sm" :value="targetRequest?.requestReason ?? ''" :rows="3" disabled />
          </UiFormItem>
          <UiFormItem
            v-if="targetRequest && targetRequest.evidenceFileRefs.length > 0"
            label="佐证材料"
          >
            <div class="evidence-file-list">
              <UiTextAction
                v-for="file in targetRequest.evidenceFileRefs"
                :key="file.fileId"
                @click="downloadEvidenceFile(file)"
              >
                {{ file.fileName }}
              </UiTextAction>
            </div>
          </UiFormItem>
          <UiFormItem label="复核备注">
            <UiTextarea
              size="sm"
              v-model="reviewNote"
              :rows="3"
              :max-length="200"
              :show-count="true"
              placeholder="选填，作为审计记录"
            />
          </UiFormItem>
        </UiForm>
      </UiDrawer>
    </template>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  GradeReviewEvidenceFileRefVO,
  GradeReviewReasonTypeCode,
  GradeReviewRequestItemResponse,
} from '@/apis/mark/grade-review'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  claimReviewRequest,
  getReviewSummary,
  GradeReviewReasonTypeDescription,
  GradeReviewRequestStatusCode,
  GradeReviewRequestStatusDescription,
  handleReviewRequest,
  listReviewRequests,
  REVIEW_REQUEST_FLOW_HINT,
  REVIEW_REQUEST_STATUS_OPTIONS,
  REVIEW_REQUEST_STATUS_TONE,
} from '@/apis/mark/grade-review'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
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
/** MVR-279：默认拒绝假可写；仅 BE summary.canManageReviewerWrites 为 true 时可领取/处理 */
const canManageReviewerWrites = ref(false)
const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo.userId || '')

const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
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
  { title: '学号', key: 'studentNo', width: 120, fixed: 'left' },
  { title: '姓名', key: 'studentName', dataIndex: 'studentName', width: 96 },
  { title: '题号', key: 'questionNo', width: 88 },
  { title: '申请原因', dataIndex: 'requestReason', key: 'requestReason', ellipsis: true },
  { title: '状态', key: 'requestStatus', width: 96 },
  { title: '处理结果', key: 'handleResult', width: 140, ellipsis: true },
  { title: '操作', key: 'actions', width: 140 },
]

const handleOpen = ref(false)
const handling = ref(false)
const claimingId = ref<string | null>(null)
const targetRequest = ref<GradeReviewRequestItemResponse | null>(null)
const conclusionDraft = ref<GradeReviewRequestStatusCode>(GradeReviewRequestStatusCode.APPROVED)
const reviewNote = ref('')

const handleTitle = computed(() =>
  conclusionDraft.value === GradeReviewRequestStatusCode.APPROVED ? '通过复核申请' : '驳回复核申请',
)

/** MVR-194：与 BE assertGradeReviewOperatorSeparatedFromStudent 同源 */
function isGradeReviewApplicantSelf(record: GradeReviewRequestItemResponse): boolean {
  return Boolean(
    currentUserId.value
    && record.studentUserId
    && String(record.studentUserId) === String(currentUserId.value),
  )
}

function canClaimReviewRequest(record: GradeReviewRequestItemResponse): boolean {
  if (record.requestStatus !== GradeReviewRequestStatusCode.PENDING) {
    return false
  }
  // MVR-194：申请人不得领取本人申请
  if (isGradeReviewApplicantSelf(record)) {
    return false
  }
  return true
}

/** 后端要求先领取且仅领取人可处理（IN_REVIEW）后再 handleReviewRequest。 */
function canHandleReviewRequest(record: GradeReviewRequestItemResponse): boolean {
  if (isGradeReviewApplicantSelf(record)) {
    return false
  }
  return (
    record.requestStatus === GradeReviewRequestStatusCode.IN_REVIEW
    && Boolean(currentUserId.value)
    && record.reviewerUserId === currentUserId.value
  )
}

function buildReviewRequestActions(record: GradeReviewRequestItemResponse): UiTableRowActionItem[] {
  // MVR-279：无阅卷写能力位时不展示领取/处理动作
  if (!canManageReviewerWrites.value) {
    return []
  }
  // 行内仅 1 个 primary：领取 / 通过
  if (canClaimReviewRequest(record)) {
    return [{ key: 'claim', label: '领取', tone: 'primary' }]
  }
  if (!canHandleReviewRequest(record)) {
    return []
  }
  return [
    { key: 'approve', label: '通过', tone: 'primary' },
    { key: 'reject', label: '驳回', tone: 'danger' },
  ]
}

async function handleReviewRequestAction(
  key: string,
  record: GradeReviewRequestItemResponse,
): Promise<void> {
  if (key === 'claim') {
    if (!canManageReviewerWrites.value) {
      message.warning('当前账号无复核申请处理权限')
      return
    }
    if (!record.id || claimingId.value) {
      return
    }
    claimingId.value = record.id
    try {
      await claimReviewRequest({ reviewRequestId: record.id })
      message.success('已领取复核申请')
      await reload()
    } catch (error) {
      showUserError(error, '领取复核申请失败')
    } finally {
      claimingId.value = null
    }
    return
  }
  if (key === 'approve') {
    openHandleModal(record, GradeReviewRequestStatusCode.APPROVED)
  } else if (key === 'reject') {
    openHandleModal(record, GradeReviewRequestStatusCode.REJECTED)
  }
}

function openHandleModal(
  record: GradeReviewRequestItemResponse,
  conclusion: GradeReviewRequestStatusCode,
): void {
  if (!canManageReviewerWrites.value) {
    message.warning('当前账号无复核申请处理权限')
    return
  }
  if (!canHandleReviewRequest(record)) {
    return
  }
  targetRequest.value = record
  conclusionDraft.value = conclusion
  reviewNote.value = ''
  handleOpen.value = true
}

/**
 * 顶栏/Tab 待处理：领取前 + 处理中 + 已通过待更正（与工作台 approvedAwaitingCorrection 口径对齐）。
 * 仅 PENDING+IN_REVIEW 会漏掉「已通过但尚未写分」的高校常见积压。
 */
async function loadPendingCount(): Promise<void> {
  if (!props.examId) {
    pendingCount.value = 0
    canManageReviewerWrites.value = false
    emit('pending-change', 0)
    return
  }
  try {
    const summary = await getReviewSummary(props.examId)
    canManageReviewerWrites.value = summary.canManageReviewerWrites === true
    pendingCount.value = summary.pendingRequestCount + summary.inReviewRequestCount + summary.approvedRequestCount
    emit('pending-change', pendingCount.value)
  } catch (error) {
    pendingCount.value = 0
    canManageReviewerWrites.value = false
    emit('pending-change', 0)
    showUserError(error, '复核待处理数量加载失败')
  }
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
    rows.value = result.list
    pagination.total = result.total
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

async function submitHandle(): Promise<void> {
  if (!targetRequest.value?.id) {
    message.warning('未选中申请')
    return
  }
  if (handling.value) {
    return
  }
  if (!canManageReviewerWrites.value) {
    message.warning('当前账号无复核申请处理权限')
    return
  }
  if (!canHandleReviewRequest(targetRequest.value)) {
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
  return strictEnumLabel(GradeReviewRequestStatusDescription, status, '复核申请状态')
}

function formatReasonType(reasonType: GradeReviewReasonTypeCode): string {
  return strictEnumLabel(GradeReviewReasonTypeDescription, reasonType, '复核原因类型')
}

function primaryQuestionNo(record: GradeReviewRequestItemResponse): string {
  if (record.questionRefs.length === 0) {
    return '总分'
  }
  return `第${record.questionRefs[0].questionNo}题`
}

function handleResultLabel(record: GradeReviewRequestItemResponse): string {
  if (record.requestStatus === GradeReviewRequestStatusCode.PENDING) {
    return '—'
  }
  if (record.requestStatus === GradeReviewRequestStatusCode.IN_REVIEW) {
    return canHandleReviewRequest(record) ? '处理中' : '已由其他教师领取'
  }
  if (record.reviewNote?.trim()) {
    return record.reviewNote.trim()
  }
  return requestStatusLabel(record.requestStatus)
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

.muted {
  color: var(--c-text-4);
}

.evidence-file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
