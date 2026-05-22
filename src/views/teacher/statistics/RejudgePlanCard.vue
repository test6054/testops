<template>
  <a-card title="重判计划" :bordered="false" size="small">
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

    <!-- D-9 错误态：重判计划加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="重判计划加载失败"
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
        <template v-if="column.key === 'triggerType'">
          {{ triggerTypeLabel(rows[index].triggerType) }}
        </template>
        <template v-else-if="column.key === 'planStatus'">
          <a-tag :color="planStatusColor(rows[index].planStatus)">
            {{ planStatusLabel(rows[index].planStatus) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'approvedTime'">
          {{ fmt(rows[index].approvedTime) }}
        </template>
        <template v-else-if="column.key === 'executedTime'">
          {{ fmt(rows[index].executedTime) }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ fmt(rows[index].createTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-popconfirm
              title="确认审批通过？"
              :disabled="rows[index].planStatus !== 'PENDING_APPROVAL'"
              @confirm="handleApprove(rows[index].id)"
            >
              <a-button
                type="link"
                size="small"
                :disabled="rows[index].planStatus !== 'PENDING_APPROVAL'"
                :loading="operatingId === rows[index].id && operatingAction === 'approve'"
              >
                通过
              </a-button>
            </a-popconfirm>
            <a-button
              type="link"
              danger
              size="small"
              :disabled="rows[index].planStatus !== 'PENDING_APPROVAL'"
              :loading="operatingId === rows[index].id && operatingAction === 'reject'"
              @click="openRejectModal(rows[index].id)"
            >
              驳回
            </a-button>
            <a-popconfirm
              title="确认执行重判？执行后会重算受影响题目成绩与考试统计。"
              :disabled="rows[index].planStatus !== 'APPROVED'"
              @confirm="handleExecute(rows[index].id)"
            >
              <a-button
                type="link"
                size="small"
                :disabled="rows[index].planStatus !== 'APPROVED'"
                :loading="operatingId === rows[index].id && operatingAction === 'execute'"
              >
                执行
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </UiDataTable>
    <a-modal
      v-model:open="rejectModalOpen"
      title="驳回重判计划"
      ok-text="确认驳回"
      cancel-text="取消"
      :confirm-loading="operatingAction === 'reject'"
      @ok="handleReject"
    >
      <a-textarea
        v-model:value="rejectReason"
        :maxlength="500"
        :rows="4"
        show-count
        placeholder="请输入驳回原因"
      />
    </a-modal>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamRejudgePlanVO,
  RejudgePlanStatusCode,
  RejudgeTriggerTypeCode,
} from '@/apis/mark/question-analysis'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import {
  approveRejudgePlan,
  executeRejudgePlan,
  listRejudgePlans,
  REJUDGE_PLAN_STATUS_COLOR,
  REJUDGE_PLAN_STATUS_LABEL,
  REJUDGE_TRIGGER_TYPE_LABEL,
} from '@/apis/mark/question-analysis'
import { UiDataTable, UiErrorRetryPanel } from '@/components/ui-guide/ui'

defineOptions({ name: 'RejudgePlanCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const rows = ref<ExamRejudgePlanVO[]>([])
const loading = ref(false)
// D-9 错误态：重判计划加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)
const statusFilter = ref<RejudgePlanStatusCode | undefined>(undefined)
const operatingId = ref<string>('')
const operatingAction = ref<'approve' | 'reject' | 'execute' | ''>('')
const rejectModalOpen = ref(false)
const rejectPlanId = ref<string>('')
const rejectReason = ref('')

// 从后端枚举 LABEL 对象直接派生 select options。
const statusOptions = Object.entries(REJUDGE_PLAN_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const columns: ColumnType<ExamRejudgePlanVO>[] = [
  { title: '计划ID', dataIndex: 'id', key: 'id', width: 140 },
  { title: '触发类型', key: 'triggerType', width: 110 },
  { title: '触发源', dataIndex: 'triggerSourceId', key: 'triggerSourceId', width: 120 },
  {
    title: '受影响学生',
    dataIndex: 'affectedStudentCount',
    key: 'affectedStudentCount',
    width: 120,
  },
  { title: '已执行', dataIndex: 'executedCount', key: 'executedCount', width: 90 },
  { title: '状态', key: 'planStatus', width: 110 },
  { title: '审批时间', key: 'approvedTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
  { title: '创建时间', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    rows.value = await listRejudgePlans({
      examId: props.examId,
      planStatus: statusFilter.value,
    })
  } catch (e) {
    rows.value = []
    loadError.value = e
    message.error(e instanceof Error ? e.message : '重判计划加载失败')
  } finally {
    loading.value = false
  }
}

async function handleApprove(planId: string): Promise<void> {
  operatingId.value = planId
  operatingAction.value = 'approve'
  try {
    await approveRejudgePlan({ planId, approved: true })
    message.success('已审批')
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '审批失败')
  } finally {
    operatingId.value = ''
    operatingAction.value = ''
  }
}

function openRejectModal(planId: string): void {
  rejectPlanId.value = planId
  rejectReason.value = ''
  rejectModalOpen.value = true
}

async function handleReject(): Promise<void> {
  const reason = rejectReason.value.trim()
  if (!reason) {
    message.warning('请输入驳回原因')
    return
  }
  operatingId.value = rejectPlanId.value
  operatingAction.value = 'reject'
  try {
    await approveRejudgePlan({ planId: rejectPlanId.value, approved: false, reason })
    message.success('已驳回')
    rejectModalOpen.value = false
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '驳回失败')
  } finally {
    operatingId.value = ''
    operatingAction.value = ''
    rejectPlanId.value = ''
  }
}

async function handleExecute(planId: string): Promise<void> {
  operatingId.value = planId
  operatingAction.value = 'execute'
  try {
    await executeRejudgePlan({ planId, executeReason: '阅卷中心执行标准答案重判计划' })
    message.success('重判执行完成')
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '执行失败')
  } finally {
    operatingId.value = ''
    operatingAction.value = ''
  }
}

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

// 严格 typed helper：rows[index] 是 ExamRejudgePlanVO，model 映射需以合法 union 类型索引。
function triggerTypeLabel(code?: RejudgeTriggerTypeCode): string {
  if (!code) return '-'
  return REJUDGE_TRIGGER_TYPE_LABEL[code] ?? code
}

function planStatusColor(code?: RejudgePlanStatusCode): BadgeTone {
  return REJUDGE_PLAN_STATUS_COLOR[code ?? 'DRAFT']
}

function planStatusLabel(code?: RejudgePlanStatusCode): string {
  return REJUDGE_PLAN_STATUS_LABEL[code ?? 'DRAFT']
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)
</script>
