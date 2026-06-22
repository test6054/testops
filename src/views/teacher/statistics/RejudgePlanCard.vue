<template>
  <UiCard class="stats-card" compact>
    <template #title>重判计划</template>
    <template #extra>
      <UiTag tone="blue" size="sm">全考试治理</UiTag>
    </template>

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
        <template v-if="column.key === 'triggerType'">
          {{ triggerTypeLabel(rows[index].triggerType) }}
        </template>
        <template v-else-if="column.key === 'affectedQuestionRefs'">
          {{ affectedQuestionSummary(rows[index]) }}
        </template>
        <template v-else-if="column.key === 'planStatus'">
          <UiTag :tone="planStatusColor(rows[index].planStatus)">
            {{ planStatusLabel(rows[index].planStatus) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'approvedTime'">
          {{ formatDateTime(rows[index].approvedTime) }}
        </template>
        <template v-else-if="column.key === 'executedTime'">
          {{ formatDateTime(rows[index].executedTime) }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(rows[index].createTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="operations-cell" @click.stop>
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
            <UiTextAction
              tone="danger"
              :disabled="rows[index].planStatus !== 'PENDING_APPROVAL'"
              @click="openRejectModal(rows[index].id)"
            >
              驳回
            </UiTextAction>
            <UiTextAction
              :disabled="rows[index].planStatus !== 'APPROVED'"
              @click="openExecuteModal(rows[index].id)"
            >
              执行
            </UiTextAction>
          </div>
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
    <a-modal
      v-model:open="executeModalOpen"
      title="执行重判计划"
      ok-text="确认执行"
      cancel-text="取消"
      :confirm-loading="operatingAction === 'execute'"
      @ok="handleExecute"
    >
      <a-alert
        type="warning"
        show-icon
        message="执行后会重算受影响题目的成绩与考试统计，此操作不可撤销。"
        style="margin-bottom: 12px"
      />
      <a-textarea
        v-model:value="executeReason"
        :maxlength="500"
        :rows="4"
        show-count
        placeholder="请输入执行原因（不少于 5 字，将写入重判计划审计记录）"
      />
    </a-modal>
  </UiCard>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamRejudgePlanVO,
  RejudgePlanStatusCode,
  RejudgeTriggerTypeCode,
} from '@/apis/mark/question-analysis'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  approveRejudgePlan,
  executeRejudgePlan,
  listRejudgePlans,
  REJUDGE_PLAN_STATUS_COLOR,
  REJUDGE_PLAN_STATUS_LABEL,
  REJUDGE_PLAN_STATUS_OPTIONS,
  REJUDGE_TRIGGER_TYPE_LABEL,
} from '@/apis/mark/question-analysis'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'RejudgePlanCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()
const emit = defineEmits<{ changed: [] }>()

const rows = ref<ExamRejudgePlanVO[]>([])
const loading = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

const filterForm = reactive<{ status?: RejudgePlanStatusCode }>({})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: REJUDGE_PLAN_STATUS_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  },
]

const operatingId = ref<string>('')
const operatingAction = ref<'approve' | 'reject' | 'execute' | ''>('')
const rejectModalOpen = ref(false)
const rejectPlanId = ref<string>('')
const rejectReason = ref('')
// 执行重判弹窗状态：executeReason 作为重判审计上下文必须由人工输入，不允许前端硬编码
const executeModalOpen = ref(false)
const executePlanId = ref<string>('')
const executeReason = ref('')

const columns: ColumnType<ExamRejudgePlanVO>[] = [
  { title: '触发类型', key: 'triggerType', width: 110 },
  { title: '受影响题目', key: 'affectedQuestionRefs', width: 180 },
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
  try {
    const result = await listRejudgePlans({
      examId: props.examId,
      planStatus: filterForm.status,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    rows.value = readPageList(result, '重判计划加载失败')
    pagination.total = readPageTotal(result, '重判计划加载失败')
    pagination.current = result.pageNum ?? pagination.current
    pagination.pageSize = result.pageSize ?? pagination.pageSize
  } catch (e) {
    rows.value = []
    pagination.total = 0
    showUserError(e, '重判计划加载失败')
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
  pagination.current = 1
  void reload()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void reload()
}

async function handleApprove(planId: string): Promise<void> {
  operatingId.value = planId
  operatingAction.value = 'approve'
  try {
    await approveRejudgePlan({ planId, approved: true })
    message.success('已审批')
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '重判计划审批失败')
  } finally {
    operatingId.value = ''
    operatingAction.value = ''
  }
}

function openRejectModal(planId: string): void {
  const row = rows.value.find((item) => item.id === planId)
  if (!row || row.planStatus !== 'PENDING_APPROVAL') {
    return
  }
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
    emit('changed')
  } catch (e) {
    showUserError(e, '重判计划驳回失败')
  } finally {
    operatingId.value = ''
    operatingAction.value = ''
    rejectPlanId.value = ''
  }
}

function openExecuteModal(planId: string): void {
  const row = rows.value.find((item) => item.id === planId)
  if (!row || row.planStatus !== 'APPROVED') {
    return
  }
  executePlanId.value = planId
  executeReason.value = ''
  executeModalOpen.value = true
}

async function handleExecute(): Promise<void> {
  const reason = executeReason.value.trim()
  if (reason.length < 5) {
    message.warning('请输入不少于 5 字的执行原因')
    return
  }
  const planId = executePlanId.value
  if (!planId) return
  operatingId.value = planId
  operatingAction.value = 'execute'
  try {
    await executeRejudgePlan({ planId, executeReason: reason })
    message.success('重判执行完成')
    executeModalOpen.value = false
    await reload()
    emit('changed')
  } catch (e) {
    showUserError(e, '重判计划执行失败')
  } finally {
    operatingId.value = ''
    operatingAction.value = ''
    executePlanId.value = ''
  }
}

// 严格 typed helper：rows[index] 是 ExamRejudgePlanVO，model 映射需以合法 union 类型索引。
function triggerTypeLabel(code: RejudgeTriggerTypeCode): string {
  return strictEnumLabel(REJUDGE_TRIGGER_TYPE_LABEL, code, '重判触发类型')
}

function affectedQuestionSummary(row: ExamRejudgePlanVO): string {
  const questionRefs = row.affectedQuestionRefs ?? []
  if (questionRefs.length === 0) {
    return triggerTypeLabel(row.triggerType)
  }
  return questionRefs
    .map((questionRef) => `${questionRef.questionNo}（${questionRef.fullScore} 分）`)
    .join('、')
}

function planStatusColor(code: RejudgePlanStatusCode): BadgeTone {
  return strictEnumTone(REJUDGE_PLAN_STATUS_COLOR, code, '重判计划状态')
}

function planStatusLabel(code: RejudgePlanStatusCode): string {
  return strictEnumLabel(REJUDGE_PLAN_STATUS_LABEL, code, '重判计划状态')
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
