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

    <UiDataTable
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
        <template v-if="column.key === 'requestStatus'">
          <a-tag :color="requestStatusColor(rows[index].requestStatus)">
            {{ requestStatusLabel(rows[index].requestStatus) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'questionIds'">
          <span class="ellipsis">{{ rows[index].questionIds || '-' }}</span>
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ fmt(rows[index].createTime) }}
        </template>
        <template v-else-if="column.key === 'reviewTime'">
          {{ fmt(rows[index].reviewTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button
              type="link"
              size="small"
              :disabled="
                rows[index].requestStatus === 'APPROVED' ||
                rows[index].requestStatus === 'REJECTED' ||
                rows[index].requestStatus === 'CORRECTED'
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
                rows[index].requestStatus === 'APPROVED' ||
                rows[index].requestStatus === 'REJECTED' ||
                rows[index].requestStatus === 'CORRECTED'
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
        <a-form-item label="申请ID">
          <a-input :value="targetRequest?.id ?? ''" disabled />
        </a-form-item>
        <a-form-item label="原因类型">
          <a-input :value="targetRequest?.reasonType ?? ''" disabled />
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
  ExamGradeReviewRequestVO,
  GradeReviewRequestStatusCode,
  ReviewConclusion,
} from '@/apis/mark/grade-review'
import {
  handleReviewRequest,
  listReviewRequests,
  REVIEW_REQUEST_STATUS_COLOR,
  REVIEW_REQUEST_STATUS_LABEL,
} from '@/apis/mark/grade-review'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { UiDataTable } from '@/components/ui-guide/ui'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'

defineOptions({ name: 'ReviewRequestsCard' })

const props = defineProps<{ examId: string; reloadToken: number }>()
const emit = defineEmits<{ (e: 'handled'): void }>()

const rows = ref<ExamGradeReviewRequestVO[]>([])
const loading = ref(false)
const statusFilter = ref<GradeReviewRequestStatusCode | undefined>(undefined)

// 从后端枚举 LABEL 对象直接派生 select options。
const statusOptions = Object.entries(REVIEW_REQUEST_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const columns: ColumnType<ExamGradeReviewRequestVO>[] = [
  { title: '申请ID', dataIndex: 'id', key: 'id', width: 140 },
  { title: '学生', dataIndex: 'studentUserId', key: 'studentUserId', width: 120 },
  { title: '试卷实例', dataIndex: 'paperInstanceId', key: 'paperInstanceId', width: 140 },
  { title: '题目IDs', key: 'questionIds', width: 160 },
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
const targetRequest = ref<ExamGradeReviewRequestVO | null>(null)
const conclusionDraft = ref<ReviewConclusion>('APPROVED')
const reviewNote = ref('')

const handleTitle = computed(() =>
  conclusionDraft.value === 'APPROVED' ? '通过复核申请' : '驳回复核申请',
)

function openHandleModal(record: ExamGradeReviewRequestVO, conclusion: ReviewConclusion): void {
  targetRequest.value = record
  conclusionDraft.value = conclusion
  reviewNote.value = ''
  handleOpen.value = true
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    rows.value = await listReviewRequests({
      examId: props.examId,
      requestStatus: statusFilter.value,
    })
  } catch (e) {
    rows.value = []
    message.error(e instanceof Error ? e.message : '复核申请加载失败')
  } finally {
    loading.value = false
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
    message.error(e instanceof Error ? e.message : '处理失败')
  } finally {
    handling.value = false
  }
}

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

// 严格 typed helper：rows[index].requestStatus 是 GradeReviewRequestStatusCode | undefined，避免 slot record:any 索引。
function requestStatusColor(status?: GradeReviewRequestStatusCode): BadgeTone {
  return REVIEW_REQUEST_STATUS_COLOR[status ?? 'PENDING']
}

function requestStatusLabel(status?: GradeReviewRequestStatusCode): string {
  return REVIEW_REQUEST_STATUS_LABEL[status ?? 'PENDING']
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
