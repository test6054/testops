<template>
  <a-card title="批量更正计划" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-select
          v-model:value="statusFilter" style="width: 160px" placeholder="全部状态"
          allow-clear :options="statusOptions" @change="reload"
        />
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>

    <a-table
      :columns="columns" :data-source="rows" :loading="loading" row-key="id" size="small"
      :pagination="{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'correctionType'">
          {{ record.correctionType ? GRADE_CORRECTION_TYPE_LABEL[record.correctionType] : '-' }}
        </template>
        <template v-else-if="column.key === 'approvalStatus'">
          <a-tag :color="BATCH_CORRECTION_STATUS_COLOR[record.approvalStatus || 'DRAFT']">
            {{ BATCH_CORRECTION_STATUS_LABEL[record.approvalStatus || 'DRAFT'] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'approvedTime'">{{ fmt(record.approvedTime) }}</template>
        <template v-else-if="column.key === 'executedTime'">{{ fmt(record.executedTime) }}</template>
        <template v-else-if="column.key === 'createTime'">{{ fmt(record.createTime) }}</template>
      </template>
    </a-table>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  BatchCorrectionApprovalStatusCode,
  ExamBatchGradeCorrectionPlanVO,
} from '@/apis/mark/grade-review'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import {
  BATCH_CORRECTION_STATUS_COLOR,
  BATCH_CORRECTION_STATUS_LABEL,
  GRADE_CORRECTION_TYPE_LABEL,
  listBatchCorrectionPlans,
} from '@/apis/mark/grade-review'

defineOptions({ name: 'BatchCorrectionPlansCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const rows = ref<ExamBatchGradeCorrectionPlanVO[]>([])
const loading = ref(false)
const statusFilter = ref<BatchCorrectionApprovalStatusCode | undefined>(undefined)

const statusOptions = (Object.keys(BATCH_CORRECTION_STATUS_LABEL) as BatchCorrectionApprovalStatusCode[]).map(c => ({
  label: BATCH_CORRECTION_STATUS_LABEL[c],
  value: c,
}))

const columns: ColumnType<ExamBatchGradeCorrectionPlanVO>[] = [
  { title: '计划ID', dataIndex: 'id', key: 'id', width: 140 },
  { title: '名称', dataIndex: 'planName', key: 'planName', ellipsis: true },
  { title: '类型', key: 'correctionType', width: 110 },
  { title: '受影响学生', dataIndex: 'affectedStudentCount', key: 'affectedStudentCount', width: 120 },
  { title: '已执行', dataIndex: 'executedCount', key: 'executedCount', width: 90 },
  { title: '审批状态', key: 'approvalStatus', width: 110 },
  { title: '审批时间', key: 'approvedTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
  { title: '创建时间', key: 'createTime', width: 160 },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    rows.value = await listBatchCorrectionPlans({
      examId: props.examId,
      approvalStatus: statusFilter.value,
    })
  } catch (e) {
    rows.value = []
    message.error(e instanceof Error ? e.message : '批量更正计划加载失败')
  } finally {
    loading.value = false
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
