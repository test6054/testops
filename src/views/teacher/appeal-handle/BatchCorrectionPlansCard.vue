<template>
  <a-card title="批量更正计划" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>新建计划
        </a-button>
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
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'correctionType'">
          {{ correctionTypeLabel(record) }}
        </template>
        <template v-else-if="column.key === 'approvalStatus'">
          <a-tag :color="approvalStatusColor(record)">
            {{ approvalStatusLabel(record) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'approvedTime'">
          {{ formatDateTime(record.approvedTime) }}
        </template>
        <template v-else-if="column.key === 'executedTime'">
          {{ formatDateTime(record.executedTime) }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space size="small">
            <a-popconfirm
              title="确认提交审批？"
              :disabled="!canSubmit(record)"
              @confirm="handleSubmitPlan(record.id)"
            >
              <a-button
                type="link"
                size="small"
                :disabled="!canSubmit(record)"
                :loading="isOperating(record.id, 'submit')"
              >
                提交
              </a-button>
            </a-popconfirm>
            <a-popconfirm
              title="确认审批通过？"
              :disabled="record.approvalStatus !== 'PENDING_APPROVAL'"
              @confirm="handleApprove(record.id)"
            >
              <a-button
                type="link"
                size="small"
                :disabled="record.approvalStatus !== 'PENDING_APPROVAL'"
                :loading="isOperating(record.id, 'approve')"
              >
                通过
              </a-button>
            </a-popconfirm>
            <a-button
              type="link"
              size="small"
              danger
              :disabled="record.approvalStatus !== 'PENDING_APPROVAL'"
              :loading="isOperating(record.id, 'reject')"
              @click="openRejectModal(record.id)"
            >
              驳回
            </a-button>
            <a-popconfirm
              title="确认执行批量更正？执行后会写入当前成绩并刷新统计。"
              :disabled="record.approvalStatus !== 'APPROVED'"
              @confirm="handleExecute(record.id)"
            >
              <a-button
                type="link"
                size="small"
                :disabled="record.approvalStatus !== 'APPROVED'"
                :loading="isOperating(record.id, 'execute')"
              >
                执行
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </UiDataTable>

    <a-modal
      v-model:open="createOpen"
      title="新建批量更正计划"
      ok-text="保存草稿"
      cancel-text="取消"
      :confirm-loading="creating"
      :mask-closable="false"
      width="840px"
      @ok="handleCreate"
    >
      <a-form layout="vertical" :model="form">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="计划名称" required>
              <a-input v-model:value="form.planName" :maxlength="100" placeholder="必填" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="更正类型" required>
              <a-select
                v-model:value="form.correctionType"
                :options="correctionTypeOptions"
                @change="handleCorrectionTypeChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="form.correctionType === 'SINGLE_QUESTION'" label="题目模板ID" required>
          <a-input v-model:value="form.questionTemplateId" placeholder="单题批量更正必填" />
        </a-form-item>
        <a-form-item label="更正原因" required>
          <a-textarea v-model:value="form.reason" :rows="3" :maxlength="500" show-count />
        </a-form-item>
        <div class="batch-plan-items">
          <div class="batch-plan-items__header">
            <span>更正明细</span>
            <a-button size="small" @click="addItem">
              <template #icon><PlusOutlined /></template>添加明细
            </a-button>
          </div>
          <div v-for="(item, index) in form.items" :key="item.localId" class="batch-plan-item">
            <a-row :gutter="12" align="middle">
              <a-col :span="7">
                <a-form-item label="学生用户ID" required>
                  <a-input v-model:value="item.studentUserId" placeholder="必填" />
                </a-form-item>
              </a-col>
              <a-col :span="7">
                <a-form-item label="试卷实例ID" required>
                  <a-input v-model:value="item.paperInstanceId" placeholder="必填" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="更正后分数" required>
                  <a-input-number
                    v-model:value="item.afterScore"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="4">
                <a-button
                  danger
                  size="small"
                  :disabled="form.items.length === 1"
                  @click="removeItem(index)"
                >
                  删除
                </a-button>
              </a-col>
            </a-row>
          </div>
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="rejectModalOpen"
      title="驳回批量更正计划"
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
  BatchCorrectionApprovalStatusCode,
  BatchCorrectionPlanCreatePayload,
  ExamBatchGradeCorrectionPlanVO,
  GradeCorrectionTypeCode,
} from '@/apis/mark/grade-review'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import {
  approveBatchCorrectionPlan,
  BATCH_CORRECTION_STATUS_COLOR,
  BATCH_CORRECTION_STATUS_LABEL,
  createBatchCorrectionPlan,
  executeBatchCorrectionPlan,
  GRADE_CORRECTION_TYPE_LABEL,
  listBatchCorrectionPlans,
  submitBatchCorrectionPlan,
} from '@/apis/mark/grade-review'
import { UiDataTable, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'BatchCorrectionPlansCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

type OperationAction = 'submit' | 'approve' | 'reject' | 'execute' | ''

interface PlanItemForm {
  localId: number
  studentUserId: string
  paperInstanceId: string
  afterScore: number | undefined
}

const rows = ref<ExamBatchGradeCorrectionPlanVO[]>([])
const loading = ref(false)
const loadError = ref<unknown>(null)
const statusFilter = ref<BatchCorrectionApprovalStatusCode | undefined>(undefined)
const createOpen = ref(false)
const creating = ref(false)
const operatingId = ref('')
const operatingAction = ref<OperationAction>('')
const rejectModalOpen = ref(false)
const rejectPlanId = ref('')
const rejectReason = ref('')
const nextLocalId = ref(1)

const form = reactive<{
  planName: string
  correctionType: BatchCorrectionPlanCreatePayload['correctionType']
  questionTemplateId: string
  reason: string
  items: PlanItemForm[]
}>({
  planName: '',
  correctionType: 'SINGLE_QUESTION',
  questionTemplateId: '',
  reason: '',
  items: [],
})

const statusOptions = Object.entries(BATCH_CORRECTION_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const correctionTypeOptions = [
  { value: 'SINGLE_QUESTION', label: GRADE_CORRECTION_TYPE_LABEL.SINGLE_QUESTION },
  { value: 'TOTAL_SCORE', label: GRADE_CORRECTION_TYPE_LABEL.TOTAL_SCORE },
]

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
  { title: '操作', key: 'actions', width: 210, fixed: 'right' },
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

function openCreateModal(): void {
  form.planName = ''
  form.correctionType = 'SINGLE_QUESTION'
  form.questionTemplateId = ''
  form.reason = ''
  form.items = [createEmptyItem()]
  createOpen.value = true
}

function createEmptyItem(): PlanItemForm {
  const localId = nextLocalId.value
  nextLocalId.value += 1
  return { localId, studentUserId: '', paperInstanceId: '', afterScore: 0 }
}

function addItem(): void {
  form.items.push(createEmptyItem())
}

function removeItem(index: number): void {
  if (form.items.length === 1) return
  form.items.splice(index, 1)
}

function handleCorrectionTypeChange(): void {
  if (form.correctionType === 'TOTAL_SCORE') {
    form.questionTemplateId = ''
  }
}

function buildCreatePayload(): BatchCorrectionPlanCreatePayload | null {
  if (!form.planName.trim()) {
    message.warning('计划名称必填')
    return null
  }
  if (form.correctionType === 'SINGLE_QUESTION' && !form.questionTemplateId.trim()) {
    message.warning('单题批量更正必须填写题目模板ID')
    return null
  }
  if (!form.reason.trim()) {
    message.warning('更正原因必填')
    return null
  }
  if (form.items.length === 0) {
    message.warning('更正明细不能为空')
    return null
  }
  const items: BatchCorrectionPlanCreatePayload['items'] = []
  for (const item of form.items) {
    if (typeof item.afterScore !== 'number') {
      message.warning('更正明细中的更正后分数必填')
      return null
    }
    items.push({
      studentUserId: item.studentUserId.trim(),
      paperInstanceId: item.paperInstanceId.trim(),
      afterScore: item.afterScore,
    })
  }
  const invalidItem = items.find(item => !item.studentUserId || !item.paperInstanceId)
  if (invalidItem) {
    message.warning('更正明细中的学生用户ID和试卷实例ID必填')
    return null
  }
  const duplicatePaper = new Set<string>()
  const duplicated = items.some(item => {
    if (duplicatePaper.has(item.paperInstanceId)) return true
    duplicatePaper.add(item.paperInstanceId)
    return false
  })
  if (duplicated) {
    message.warning('同一计划中不能重复填写试卷实例ID')
    return null
  }
  return {
    examId: props.examId,
    planName: form.planName.trim(),
    correctionType: form.correctionType,
    questionTemplateId: form.questionTemplateId.trim() || undefined,
    items,
    reason: form.reason.trim(),
  }
}

async function handleCreate(): Promise<void> {
  const payload = buildCreatePayload()
  if (!payload) return
  creating.value = true
  try {
    await createBatchCorrectionPlan(payload)
    message.success('批量更正计划草稿已创建')
    createOpen.value = false
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

async function handleSubmitPlan(planId: string): Promise<void> {
  operatingId.value = planId
  operatingAction.value = 'submit'
  try {
    await submitBatchCorrectionPlan({ planId })
    message.success('已提交审批')
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    resetOperating()
  }
}

async function handleApprove(planId: string): Promise<void> {
  operatingId.value = planId
  operatingAction.value = 'approve'
  try {
    await approveBatchCorrectionPlan({ planId, approved: true })
    message.success('已审批通过')
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '审批失败')
  } finally {
    resetOperating()
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
    await approveBatchCorrectionPlan({ planId: rejectPlanId.value, approved: false, reason })
    message.success('已驳回')
    rejectModalOpen.value = false
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '驳回失败')
  } finally {
    resetOperating()
    rejectPlanId.value = ''
  }
}

async function handleExecute(planId: string): Promise<void> {
  operatingId.value = planId
  operatingAction.value = 'execute'
  try {
    await executeBatchCorrectionPlan({ planId, executeReason: '阅卷中心执行批量成绩更正计划' })
    message.success('批量更正执行完成')
    await reload()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '执行失败')
  } finally {
    resetOperating()
  }
}

function resetOperating(): void {
  operatingId.value = ''
  operatingAction.value = ''
}

function isOperating(planId: string, action: OperationAction): boolean {
  return operatingId.value === planId && operatingAction.value === action
}

function canSubmit(row: ExamBatchGradeCorrectionPlanVO): boolean {
  return row.approvalStatus === 'DRAFT' || row.approvalStatus === 'REJECTED'
}

function correctionTypeLabel(row: ExamBatchGradeCorrectionPlanVO): string {
  const code: GradeCorrectionTypeCode | undefined = row.correctionType
  return strictEnumLabel(GRADE_CORRECTION_TYPE_LABEL, code, '成绩更正类型')
}

function approvalStatusLabel(row: ExamBatchGradeCorrectionPlanVO): string {
  return strictEnumLabel(BATCH_CORRECTION_STATUS_LABEL, row.approvalStatus, '批量更正审批状态')
}

function approvalStatusColor(row: ExamBatchGradeCorrectionPlanVO): string {
  return strictEnumTone(BATCH_CORRECTION_STATUS_COLOR, row.approvalStatus, '批量更正审批状态')
}


watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)
</script>

<style scoped>
.batch-plan-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-plan-items__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.batch-plan-item {
  padding: 12px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}
</style>
