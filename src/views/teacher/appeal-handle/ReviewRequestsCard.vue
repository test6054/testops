<template>
  <a-card :bordered="false" size="small">
    <template #title>
      <a-space>
        <span>复核申请</span>
        <a-tag color="orange">待处理 {{ pendingCount }}</a-tag>
      </a-space>
    </template>
    <template #extra>
      <a-space>
        <a-select
          v-model:value="statusFilter"
          style="width: 160px"
          placeholder="全部状态"
          allow-clear
          :options="statusOptions"
          @change="reload"
        />
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>

    <!-- D-9 错误态：复核申请加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="复核申请加载失败"
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
        <template v-if="column.key === 'reasonType'">
          {{ formatReasonType(rows[index].reasonType) }}
        </template>
        <template v-else-if="column.key === 'student'">
          <span>{{ formatStudent(rows[index]) }}</span>
        </template>
        <template v-else-if="column.key === 'requestStatus'">
          <a-tag :color="requestStatusColor(rows[index].requestStatus)">
            {{ requestStatusLabel(rows[index].requestStatus) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'questionRefs'">
          <span class="ellipsis">{{ formatQuestionRefs(rows[index]) }}</span>
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(rows[index].createTime) }}
        </template>
        <template v-else-if="column.key === 'reviewTime'">
          {{ formatDateTime(rows[index].reviewTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button
              type="link"
              size="small"
              :disabled="
                rows[index].requestStatus === 'APPROVED'
                  || rows[index].requestStatus === 'REJECTED'
                  || rows[index].requestStatus === 'CORRECTED'
              "
              @click="openHandleModal(rows[index], 'APPROVED')"
            >
              通过
            </a-button>
            <a-button
              type="link"
              size="small"
              danger
              :disabled="
                rows[index].requestStatus === 'APPROVED'
                  || rows[index].requestStatus === 'REJECTED'
                  || rows[index].requestStatus === 'CORRECTED'
              "
              @click="openHandleModal(rows[index], 'REJECTED')"
            >
              驳回
            </a-button>
          </a-space>
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
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  GradeReviewReasonTypeCode,
  GradeReviewRequestItemResponse,
  GradeReviewRequestStatusCode,
  ReviewConclusion,
} from '@/apis/mark/grade-review'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  GRADE_REVIEW_REASON_TYPE_LABEL,
  handleReviewRequest,
  listReviewRequests,
  REVIEW_REQUEST_STATUS_COLOR,
  REVIEW_REQUEST_STATUS_LABEL,
  REVIEW_REQUEST_STATUS_OPTIONS,
} from '@/apis/mark/grade-review'
import { UiDataTable, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { assertUserFacing } from '@/utils/contract-guard'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ReviewRequestsCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()
const emit = defineEmits<{ (e: 'handled'): void }>()

const rows = ref<GradeReviewRequestItemResponse[]>([])
const loading = ref(false)
// D-9 错误态：复核申请加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<Error | null>(null)
const statusFilter = ref<GradeReviewRequestStatusCode | undefined>(undefined)

const statusOptions = REVIEW_REQUEST_STATUS_OPTIONS

const columns: ColumnType<GradeReviewRequestItemResponse>[] = [
  { title: '学生', key: 'student', width: 150 },
  { title: '复核题目', key: 'questionRefs', width: 220 },
  { title: '原因类型', dataIndex: 'reasonType', key: 'reasonType', width: 120 },
  { title: '申请原因', dataIndex: 'requestReason', key: 'requestReason', ellipsis: true },
  { title: '状态', key: 'requestStatus', width: 100 },
  { title: '提交时间', key: 'createTime', width: 160 },
  { title: '复核时间', key: 'reviewTime', width: 160 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const pendingCount = computed(
  () =>
    rows.value.filter((r) => r.requestStatus === 'PENDING' || r.requestStatus === 'IN_REVIEW')
      .length,
)

const handleOpen = ref(false)
const handling = ref(false)
const targetRequest = ref<GradeReviewRequestItemResponse | null>(null)
const conclusionDraft = ref<ReviewConclusion>('APPROVED')
const reviewNote = ref('')

const handleTitle = computed(() =>
  conclusionDraft.value === 'APPROVED' ? '通过复核申请' : '驳回复核申请',
)

function openHandleModal(
  record: GradeReviewRequestItemResponse,
  conclusion: ReviewConclusion,
): void {
  targetRequest.value = record
  conclusionDraft.value = conclusion
  reviewNote.value = ''
  handleOpen.value = true
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    const page = await listReviewRequests({
      examId: props.examId,
      requestStatus: statusFilter.value,
      pageNum: 1,
      pageSize: 200,
    })
    validateReviewRequestDisplayContracts(page.list)
    rows.value = page.list
  } catch (e) {
    rows.value = []
    loadError.value = toUserError(e, '复核申请加载失败')
    showUserError(e, '复核申请加载失败')
  } finally {
    loading.value = false
  }
}

/** 校验复核申请列表所需学生展示字段，缺失时进入组件错误态。 */
function validateReviewRequestDisplayContracts(list: GradeReviewRequestItemResponse[]): void {
  const dataError = '复核申请加载失败，请刷新后重试'
  for (const record of list) {
    assertUserFacing(
      Boolean(record.studentName?.trim()) && Boolean(record.studentNo?.trim()),
      dataError,
    )
  }
}

async function submitHandle(): Promise<void> {
  if (!targetRequest.value?.id) {
    message.warning('未选中申请')
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

// 严格 typed helper：rows[index].requestStatus 是后端必填枚举，避免 slot record 类型丢失。
function requestStatusColor(status: GradeReviewRequestStatusCode): BadgeTone {
  return strictEnumTone(REVIEW_REQUEST_STATUS_COLOR, status, '复核申请状态')
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

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
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
</style>
