<template>
  <a-card title="批量更正计划" :bordered="false" size="small">
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

    <!-- D-9 错误态：批量更正计划加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="loadError"
      :error="loadError"
      title="批量更正计划加载失败"
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
        <template v-if="column.key === 'correctionType'">
          {{ correctionTypeLabel(rows[index]) }}
        </template>
        <template v-else-if="column.key === 'approvalStatus'">
          <a-tag :color="approvalStatusColor(rows[index])">
            {{ approvalStatusLabel(rows[index]) }}
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
      </template>
    </UiDataTable>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  BatchCorrectionApprovalStatusCode,
  ExamBatchGradeCorrectionPlanVO,
  GradeCorrectionTypeCode,
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
import { UiDataTable, UiErrorRetryPanel } from '@/components/ui-guide/ui'

defineOptions({ name: 'BatchCorrectionPlansCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const rows = ref<ExamBatchGradeCorrectionPlanVO[]>([])
const loading = ref(false)
// D-9 错误态：批量更正计划加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)
const statusFilter = ref<BatchCorrectionApprovalStatusCode | undefined>(undefined)

// 从后端枚举 LABEL 对象直接派生 select options。
const statusOptions = Object.entries(BATCH_CORRECTION_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const columns: ColumnType<ExamBatchGradeCorrectionPlanVO>[] = [
  { title: '计划ID', dataIndex: 'id', key: 'id', width: 140 },
  { title: '名称', dataIndex: 'planName', key: 'planName', ellipsis: true },
  { title: '类型', key: 'correctionType', width: 110 },
  {
    title: '受影响学生',
    dataIndex: 'affectedStudentCount',
    key: 'affectedStudentCount',
    width: 120,
  },
  { title: '已执行', dataIndex: 'executedCount', key: 'executedCount', width: 90 },
  { title: '审批状态', key: 'approvalStatus', width: 110 },
  { title: '审批时间', key: 'approvedTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
  { title: '创建时间', key: 'createTime', width: 160 },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    rows.value = await listBatchCorrectionPlans({
      examId: props.examId,
      approvalStatus: statusFilter.value,
    })
  } catch (e) {
    rows.value = []
    loadError.value = e
    message.error(e instanceof Error ? e.message : '批量更正计划加载失败')
  } finally {
    loading.value = false
  }
}

function correctionTypeLabel(row: ExamBatchGradeCorrectionPlanVO): string {
  const code: GradeCorrectionTypeCode | undefined = row.correctionType
  return code ? (GRADE_CORRECTION_TYPE_LABEL[code] ?? code) : '-'
}

function approvalStatusLabel(row: ExamBatchGradeCorrectionPlanVO): string {
  const code: BatchCorrectionApprovalStatusCode = row.approvalStatus || 'DRAFT'
  return BATCH_CORRECTION_STATUS_LABEL[code] ?? code
}

function approvalStatusColor(row: ExamBatchGradeCorrectionPlanVO): string {
  const code: BatchCorrectionApprovalStatusCode = row.approvalStatus || 'DRAFT'
  return BATCH_CORRECTION_STATUS_COLOR[code] ?? 'default'
}

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)
</script>
