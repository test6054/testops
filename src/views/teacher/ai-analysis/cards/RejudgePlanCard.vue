<template>
  <AiAnalysisCardShell
    :embedded="embedded"
    :headless="embedded"
    title="重判计划"
    card-class="stats-card"
  >
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">重判计划</h3>
    </template>

    <div class="rejudge-plan-card" :class="{ 'rejudge-plan-card--embedded': embedded }">
      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        variant="plain"
        search-text="查询"
        @search="handleSearch"
        @reset="handleFilterReset"
      />

      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        :sticky-header="!embedded"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="id"
        size="small"
        :total="pagination.total"
        :empty-kind="tableEmptyKind"
        :empty-title="tableEmptyTitle"
        :empty-description="tableEmptyDescription"
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
            <UiTableActions
              :items="buildRejudgePlanActions(rows[index])"
              split
              @action="(key) => handleRejudgePlanAction(key, rows[index])"
            />
          </template>
        </template>
      </UiDataTable>
      <UiDrawer
        v-model:open="rejectModalOpen"
        title="驳回重判计划"
        ok-text="确认驳回"
        cancel-text="取消"
        :width="520"
        :hide-footer="false"
        :confirm-loading="operatingAction === 'reject'"
        @ok="handleReject"
      >
        <UiTextarea
          size="sm"
          v-model="rejectReason"
          :maxlength="500"
          :rows="4"
          :show-count="true"
          placeholder="请输入驳回原因"
        />
      </UiDrawer>
      <UiDrawer
        v-model:open="executeModalOpen"
        title="执行重判计划"
        ok-text="确认执行"
        cancel-text="取消"
        :width="520"
        :hide-footer="false"
        :confirm-loading="operatingAction === 'execute'"
        @ok="handleExecute"
      >
        <UiAlertStrip
          tone="warning"
          title="执行后会重算受影响题目的成绩与考试统计，此操作不可撤销。"
          style="margin-bottom: 12px"
        />
        <UiTextarea
          size="sm"
          v-model="executeReason"
          :maxlength="500"
          :rows="4"
          :show-count="true"
          placeholder="请输入执行原因（不少于 5 字，将写入重判计划审计记录）"
        />
      </UiDrawer>
    </div>
  </AiAnalysisCardShell>
</template>

<script lang="ts" setup>
// MVR-951：函数式 can*(...) 写入口仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamRejudgePlan,
  RejudgePlanStatusCode,
  RejudgeTriggerTypeCode,
} from '@/apis/mark/question-analysis'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import {
  approveRejudgePlan,
  executeRejudgePlan,
  listRejudgePlans,
  REJUDGE_PLAN_STATUS_OPTIONS,
  REJUDGE_PLAN_STATUS_TONE,
  RejudgePlanStatusDescription,
  RejudgeTriggerTypeDescription,
} from '@/apis/mark/question-analysis'
import AiAnalysisCardShell from '@/components/mark/analysis/AiAnalysisCardShell.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'RejudgePlanCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    reloadToken: number
    examLabel?: string
    embedded?: boolean
  }>(),
  { embedded: false },
)

const emit = defineEmits<{ changed: [] }>()

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.userId || '')
/** MVR-278：审批/执行写能力位；与 BE requireExamReviewerPermission 对齐 */
const canManageReviewerWrites = ref(false) // MVR-942：写路径仅认 === true

const rows = ref<ExamRejudgePlan[]>([])
const loading = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

interface RejudgePlanFilterForm extends Record<string, unknown> {
  status?: RejudgePlanStatusCode
}

const filterForm = reactive<RejudgePlanFilterForm>({})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
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

const tableEmptyKind = computed(() => (filterForm.status ? 'no-result' : 'first-run'))

const tableEmptyTitle = computed(() => (filterForm.status ? '无匹配计划' : '暂无重判计划'))

const tableEmptyDescription = computed(() => {
  if (filterForm.status) {
    return '当前筛选状态下暂无重判计划，请调整状态或等待系统根据答案修正与题目质量诊断自动触发。'
  }
  return '本场考试尚未产生重判任务；当教师修正标准答案或治理低质量题目时，系统将自动生成待审批计划。'
})

const columns: ColumnType<ExamRejudgePlan>[] = [
  { title: '触发类型', key: 'triggerType', width: 110, fixed: 'left' },
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
  { title: '操作', key: 'actions', width: 180 },
]

async function loadWriteCapability(): Promise<void> {
  if (!props.examId) {
    canManageReviewerWrites.value = false
    return
  }
  try {
    const summary = await getExamLayoutQuestionSummary(props.examId)
    canManageReviewerWrites.value = summary.canManageReviewerWrites === true
  } catch {
    // 能力位加载失败时默认只读，避免假可写
    canManageReviewerWrites.value = false
  }
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    await loadWriteCapability()
    const result = await listRejudgePlans({
      examId: props.examId,
      planStatus: filterForm.status,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    rows.value = result.list
    pagination.total = result.total
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
  // MVR-944：与 canDecideRejudgePlan 同源二次闸（写权∧PENDING_APPROVAL∧非本人提交）
  const row = rows.value.find((item) => item.id === planId)
  if (!row || canDecideRejudgePlan(row) !== true) {
    void message.warning(
      canManageReviewerWrites.value === true
        ? '当前重判计划不可审批（状态不允许或本人提交）'
        : '仅本场阅卷组织成员或主考可审批重判计划',
    )
    return
  }
  if (operatingId.value) return
  operatingId.value = planId
  operatingAction.value = 'approve'
  try {
    await approveRejudgePlan({ planId, approved: true })
    void message.success('已审批')
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
  if (!row || canDecideRejudgePlan(row) !== true) {
    return
  }
  rejectPlanId.value = planId
  rejectReason.value = ''
  rejectModalOpen.value = true
}

async function handleReject(): Promise<void> {
  // MVR-944：与 canDecideRejudgePlan 同源二次闸（写权∧PENDING_APPROVAL∧非本人提交）
  const row = rows.value.find((item) => item.id === rejectPlanId.value)
  if (!row || canDecideRejudgePlan(row) !== true) {
    void message.warning(
      canManageReviewerWrites.value === true
        ? '当前重判计划不可驳回（状态不允许或本人提交）'
        : '仅本场阅卷组织成员或主考可驳回重判计划',
    )
    return
  }
  if (operatingId.value) return
  const reason = rejectReason.value.trim()
  if (!reason) {
    showFormValidationMessage('请输入驳回原因')
    return
  }
  operatingId.value = rejectPlanId.value
  operatingAction.value = 'reject'
  try {
    await approveRejudgePlan({ planId: rejectPlanId.value, approved: false, reason })
    void message.success('已驳回')
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
  // MVR-386：打开执行弹窗与 canManageReviewerWrites / BE execute 二次拦截（对齐 MVR-380 BatchCorrection）
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可执行重判计划')
    return
  }
  const row = rows.value.find((item) => item.id === planId)
  if (!row || row.planStatus !== 'APPROVED') {
    return
  }
  executePlanId.value = planId
  executeReason.value = ''
  executeModalOpen.value = true
}

async function handleExecute(): Promise<void> {
  // MVR-944：执行再认写权∧APPROVED，防弹窗期间计划态漂移
  if (canManageReviewerWrites.value !== true) {
    void message.warning('仅本场阅卷组织成员或主考可执行重判计划')
    return
  }
  const row = rows.value.find((item) => item.id === executePlanId.value)
  if (!row || row.planStatus !== 'APPROVED') {
    void message.warning('当前重判计划不可执行（须已审批通过）')
    return
  }
  if (operatingId.value) return
  const reason = executeReason.value.trim()
  if (reason.length < 5) {
    showFormValidationMessage('请输入不少于 5 字的执行原因')
    return
  }
  const planId = executePlanId.value
  if (!planId) return
  operatingId.value = planId
  operatingAction.value = 'execute'
  try {
    await executeRejudgePlan({ planId, executeReason: reason })
    void message.success('重判执行完成')
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

// 严格 typed helper：rows[index] 是 ExamRejudgePlan，model 映射需以合法 union 类型索引。
function triggerTypeLabel(code: RejudgeTriggerTypeCode): string {
  return strictEnumLabel(RejudgeTriggerTypeDescription, code, '重判触发类型')
}

function affectedQuestionSummary(row: ExamRejudgePlan): string {
  const questionRefs = row.affectedQuestionRefs ?? []
  if (questionRefs.length === 0) {
    return triggerTypeLabel(row.triggerType)
  }
  return questionRefs
    .map((questionRef) => `${questionRef.questionNo}（${questionRef.fullScore} 分）`)
    .join('、')
}

function planStatusColor(code: RejudgePlanStatusCode): BadgeTone {
  return strictEnumTone(REJUDGE_PLAN_STATUS_TONE, code, '重判计划状态')
}

function planStatusLabel(code: RejudgePlanStatusCode): string {
  return strictEnumLabel(RejudgePlanStatusDescription, code, '重判计划状态')
}

function isOperating(planId: string, action: 'approve' | 'reject' | 'execute'): boolean {
  return operatingId.value === planId && operatingAction.value === action
}

/** MVR-203：与 BE assertRejudgePlanApproverSeparatedFromSubmitter 同源 */
function isRejudgePlanSubmitterSelf(row: ExamRejudgePlan): boolean {
  if (!currentUserId.value) {
    return false
  }
  const submitterId = row.createUser || row.updateUser
  return Boolean(submitterId && String(submitterId) === String(currentUserId.value))
}

function canDecideRejudgePlan(row: ExamRejudgePlan): boolean {
  return (
    canManageReviewerWrites.value === true
    && row.planStatus === 'PENDING_APPROVAL'
    && !isRejudgePlanSubmitterSelf(row)
  )
}

function buildRejudgePlanActions(row: ExamRejudgePlan): UiTableRowActionItem[] {
  const operating = (action: 'approve' | 'reject' | 'execute') => isOperating(row.id, action)
  const canDecide = canDecideRejudgePlan(row)
  return [
    {
      key: 'approve',
      label: '通过',
      // MVR-952：canDecide 仅认 === true
      hidden: canDecide !== true,
      disabled: operating('approve'),
    },
    {
      key: 'reject',
      label: '驳回',
      tone: 'danger',
      hidden: canDecide !== true,
      disabled: operating('reject'),
    },
    {
      key: 'execute',
      label: '执行',
      hidden: canManageReviewerWrites.value !== true || row.planStatus !== 'APPROVED',
      disabled: operating('execute'),
    },
  ]
}

function handleRejudgePlanAction(key: string, row: ExamRejudgePlan): void {
  switch (key) {
    case 'approve':
      if (canDecideRejudgePlan(row) !== true) return
      void handleApprove(row.id)
      break
    case 'reject':
      if (canDecideRejudgePlan(row) !== true) return
      openRejectModal(row.id)
      break
    case 'execute':
      // MVR-386：行动作入口与 openExecuteModal 同源二次闸
      if (canManageReviewerWrites.value !== true || row.planStatus !== 'APPROVED') {
        return
      }
      openExecuteModal(row.id)
      break
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
