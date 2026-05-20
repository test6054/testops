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
        <template v-if="column.key === 'triggerType'">
          {{ triggerTypeLabel(rows[index].triggerType) }}
        </template>
        <template v-else-if="column.key === 'planStatus'">
          <a-tag :color="planStatusColor(rows[index].planStatus)">
            {{ planStatusLabel(rows[index].planStatus) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'approvedTime'">
          {{
            fmt(rows[index].approvedTime)
          }}
        </template>
        <template v-else-if="column.key === 'executedTime'">
          {{
            fmt(rows[index].executedTime)
          }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{
            fmt(rows[index].createTime)
          }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-popconfirm title="确认审批通过？" @confirm="handleApprove(rows[index].id)">
            <a-button
              type="link"
              size="small"
              :disabled="
                rows[index].planStatus !== 'DRAFT' && rows[index].planStatus !== 'PENDING_APPROVAL'
              "
              :loading="approvingId === rows[index].id"
            >
              审批通过
            </a-button>
          </a-popconfirm>
        </template>
      </template>
    </UiDataTable>
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
  listRejudgePlans,
  REJUDGE_PLAN_STATUS_COLOR,
  REJUDGE_PLAN_STATUS_LABEL,
  REJUDGE_TRIGGER_TYPE_LABEL,
} from '@/apis/mark/question-analysis'
import { UiDataTable } from '@/components/ui-guide/ui'

defineOptions({ name: 'RejudgePlanCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const rows = ref<ExamRejudgePlanVO[]>([])
const loading = ref(false)
const statusFilter = ref<RejudgePlanStatusCode | undefined>(undefined)
const approvingId = ref<string>('')

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
