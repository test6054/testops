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

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      size="small"
      :pagination="{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'triggerType'">
          {{ record.triggerType ? REJUDGE_TRIGGER_TYPE_LABEL[record.triggerType as RejudgeTriggerTypeCode] : '-' }}
        </template>
        <template v-else-if="column.key === 'planStatus'">
          <a-tag :color="REJUDGE_PLAN_STATUS_COLOR[(record.planStatus as RejudgePlanStatusCode) || 'DRAFT']">
            {{ REJUDGE_PLAN_STATUS_LABEL[(record.planStatus as RejudgePlanStatusCode) || 'DRAFT'] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'approvedTime'">{{ fmt(record.approvedTime) }}</template>
        <template v-else-if="column.key === 'executedTime'">{{ fmt(record.executedTime) }}</template>
        <template v-else-if="column.key === 'createTime'">{{ fmt(record.createTime) }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-popconfirm title="确认审批通过？" @confirm="handleApprove(record.id)">
            <a-button
              type="link" size="small"
              :disabled="record.planStatus !== 'DRAFT' && record.planStatus !== 'PENDING_APPROVAL'"
              :loading="approvingId === record.id"
            >
              审批通过
            </a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamRejudgePlanVO,
  RejudgePlanStatusCode,
  RejudgeTriggerTypeCode,
} from '@/apis/mark/question-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import {
  approveRejudgePlan,
  listRejudgePlans,
  REJUDGE_PLAN_STATUS_COLOR,
  REJUDGE_PLAN_STATUS_LABEL,
  REJUDGE_TRIGGER_TYPE_LABEL,
} from '@/apis/mark/question-analysis'

defineOptions({ name: 'RejudgePlanCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const rows = ref<ExamRejudgePlanVO[]>([])
const loading = ref(false)
const statusFilter = ref<RejudgePlanStatusCode | undefined>(undefined)
const approvingId = ref<string>('')

const statusOptions = (Object.keys(REJUDGE_PLAN_STATUS_LABEL) as RejudgePlanStatusCode[]).map(c => ({
  label: REJUDGE_PLAN_STATUS_LABEL[c],
  value: c,
}))

const columns: ColumnType<ExamRejudgePlanVO>[] = [
  { title: '计划ID', dataIndex: 'id', key: 'id', width: 140 },
  { title: '触发类型', key: 'triggerType', width: 110 },
  { title: '触发源', dataIndex: 'triggerSourceId', key: 'triggerSourceId', width: 120 },
  { title: '受影响学生', dataIndex: 'affectedStudentCount', key: 'affectedStudentCount', width: 120 },
  { title: '已执行', dataIndex: 'executedCount', key: 'executedCount', width: 90 },
  { title: '状态', key: 'planStatus', width: 110 },
  { title: '审批时间', key: 'approvedTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
  { title: '创建时间', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 110, fixed: 'right' },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    rows.value = await listRejudgePlans({
      examId: props.examId,
      planStatus: statusFilter.value,
    })
  } catch (e) {
    rows.value = []
    message.error(e instanceof Error ? e.message : '重判计划加载失败')
  } finally {
    loading.value = false
  }
}

async function handleApprove(planId: string): Promise<void> {
  approvingId.value = planId
  try {
    await approveRejudgePlan(planId)
    message.success('已审批')
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '审批失败')
  } finally {
    approvingId.value = ''
  }
}

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

watch(() => [props.examId, props.reloadToken], () => {
  if (props.examId) void reload()
}, { immediate: true })
</script>
