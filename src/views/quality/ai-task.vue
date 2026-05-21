<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 / AI 能力 - AI 任务与结果审计台
 *
 * 后端契约（AiTaskController + AiResultController + AiPromptSnapshotController）：
 * - 列表 AiTaskQueryRequest：按能力 / 状态 / 业务类型 / 业务 ID / 操作人 / 业务锚点筛选
 * - 提交 AiTaskSubmitRequest：按能力填必填项（ACHIEVEMENT_DIAGNOSIS -> achievementResultId；SYLLABUS_PARSE / TRAINING_PLAN_PARSE / MATERIAL_QA -> fileNodeId）
 * - 状态机 PENDING -> PROCESSING -> SUCCEEDED / FAILED / CANCELED，失败可 /run-now重跑
 * - 结果 updateValidation 可调 PASSED / WARN / REJECTED
 */
import type {
  AiOutputValidation,
  AiPromptSnapshotVO,
  AiResultVO,
  AiTaskBusinessType,
  AiTaskQueryPayload,
  AiTaskStatus,
  AiTaskSubmitPayload,
  AiTaskType,
  AiTaskVO,
} from '@/apis/quality'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
  WorkbenchStageStatus,
} from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import {
  AI_OUTPUT_VALIDATION_COLOR,
  AI_OUTPUT_VALIDATION_LABEL,
  AI_TASK_BUSINESS_TYPE_LABEL,
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
  aiPromptSnapshotApi,
  aiResultApi,
  aiTaskApi,
  isAiOutputValidation,
  isAiTaskBusinessType,
  isAiTaskStatus,
  isAiTaskType,
} from '@/apis/quality'
import {
  CourseSelector,
  ProgramSelector,
  ReportSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import {
  AuditTimelineDrawer,
  SignalBand,
  StageRail,
  StageWorkbenchShell,
  TaskResultPanel,
} from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useAiTaskStore } from '@/stores/modules/aiTask'
import { useQualityStore } from '@/stores/modules/quality'

const aiTaskStore = useAiTaskStore()

function aiTaskTypeLabel(value: unknown): string {
  if (isAiTaskType(value)) return AI_TASK_TYPE_LABEL[value]
  if (value === null || value === undefined || value === '') return '-'
  throw new Error('AI 任务类型不符合前后端契约')
}

function aiTaskStatusLabel(value: unknown): string {
  if (isAiTaskStatus(value)) return AI_TASK_STATUS_LABEL[value]
  if (value === null || value === undefined || value === '') return '-'
  throw new Error('AI 任务状态不符合前后端契约')
}

function aiTaskStatusColor(value: unknown): string {
  if (isAiTaskStatus(value)) return AI_TASK_STATUS_COLOR[value]
  if (value === null || value === undefined || value === '') return 'default'
  throw new Error('AI 任务状态不符合前后端契约')
}

function aiTaskBusinessTypeLabel(value: unknown): string {
  if (isAiTaskBusinessType(value)) return AI_TASK_BUSINESS_TYPE_LABEL[value]
  if (value === undefined || value === null || value === '') return '-'
  throw new Error('AI 任务业务类型不符合前后端契约')
}

function validationLabel(value: unknown): string {
  if (isAiOutputValidation(value)) return AI_OUTPUT_VALIDATION_LABEL[value]
  if (value === null || value === undefined || value === '') return '-'
  throw new Error('AI 输出校验状态不符合前后端契约')
}

function validationColor(value: unknown): string {
  if (isAiOutputValidation(value)) return AI_OUTPUT_VALIDATION_COLOR[value]
  if (value === null || value === undefined || value === '') return 'default'
  throw new Error('AI 输出校验状态不符合前后端契约')
}

const qualityStore = useQualityStore()
const router = useRouter()

const list = ref<AiTaskVO[]>([])
const total = ref(0)
const loading = ref(false)

const query = reactive<AiTaskQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  taskType: undefined,
  status: undefined,
  businessType: '',
  businessId: '',
  operatorUserId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
})

const submitVisible = ref(false)
const submitting = ref(false)
const submitForm = reactive<AiTaskSubmitPayload>({
  taskType: 'ACHIEVEMENT_DIAGNOSIS',
  businessType: '',
  businessId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
  fileNodeId: '',
  question: '',
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRecord = ref<AiTaskVO | null>(null)
const detailResult = ref<AiResultVO | null>(null)
const promptSnapshot = ref<AiPromptSnapshotVO | null>(null)
const validationUpdating = ref(false)

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

const taskTypeOptions: Array<{ value: AiTaskType, label: string }> = [
  { value: 'SYLLABUS_PARSE', label: AI_TASK_TYPE_LABEL.SYLLABUS_PARSE },
  { value: 'TRAINING_PLAN_PARSE', label: AI_TASK_TYPE_LABEL.TRAINING_PLAN_PARSE },
  { value: 'ACHIEVEMENT_DIAGNOSIS', label: AI_TASK_TYPE_LABEL.ACHIEVEMENT_DIAGNOSIS },
  { value: 'COURSE_REPORT_GENERATE', label: AI_TASK_TYPE_LABEL.COURSE_REPORT_GENERATE },
  { value: 'PROGRAM_REPORT_GENERATE', label: AI_TASK_TYPE_LABEL.PROGRAM_REPORT_GENERATE },
  {
    value: 'IMPROVEMENT_SUGGESTION_GENERATE',
    label: AI_TASK_TYPE_LABEL.IMPROVEMENT_SUGGESTION_GENERATE,
  },
  { value: 'MATERIAL_QA', label: AI_TASK_TYPE_LABEL.MATERIAL_QA },
  {
    value: 'INDIRECT_RESPONSE_DOC_PARSE',
    label: AI_TASK_TYPE_LABEL.INDIRECT_RESPONSE_DOC_PARSE,
  },
]
const statusOptions: Array<{ value: AiTaskStatus, label: string }> = [
  { value: 'PENDING', label: AI_TASK_STATUS_LABEL.PENDING },
  { value: 'PROCESSING', label: AI_TASK_STATUS_LABEL.PROCESSING },
  { value: 'SUCCEEDED', label: AI_TASK_STATUS_LABEL.SUCCEEDED },
  { value: 'FAILED', label: AI_TASK_STATUS_LABEL.FAILED },
  { value: 'CANCELLED', label: AI_TASK_STATUS_LABEL.CANCELLED },
]
const businessTypeOptions: { value: AiTaskBusinessType, label: string }[] = [
  { value: 'ACHIEVEMENT_RESULT', label: AI_TASK_BUSINESS_TYPE_LABEL.ACHIEVEMENT_RESULT },
  { value: 'QUALITY_COURSE', label: AI_TASK_BUSINESS_TYPE_LABEL.QUALITY_COURSE },
  { value: 'TRAINING_PLAN', label: AI_TASK_BUSINESS_TYPE_LABEL.TRAINING_PLAN },
  { value: 'REPORT', label: AI_TASK_BUSINESS_TYPE_LABEL.REPORT },
  { value: 'INDIRECT_FORM', label: AI_TASK_BUSINESS_TYPE_LABEL.INDIRECT_FORM },
]
const validationOptions: { value: AiOutputValidation, label: string, color: string }[] = [
  { value: 'PASSED', label: '通过（接受）', color: 'green' },
  { value: 'WARN', label: '警告（需人工审核）', color: 'orange' },
  { value: 'REJECTED', label: '退回（拒绝）', color: 'red' },
]

const submitDisabled = computed(() => !submitForm.taskType)

async function loadList() {
  loading.value = true
  try {
    const page = await aiTaskApi.page({
      ...query,
      taskType: query.taskType || undefined,
      status: query.status || undefined,
      businessType: query.businessType?.trim() || undefined,
      businessId: query.businessId?.trim() || undefined,
      operatorUserId: query.operatorUserId?.trim() || undefined,
      programId: query.programId?.trim() || undefined,
      trainingPlanId:
        query.trainingPlanId?.trim() || qualityStore.currentTrainingPlanId || undefined,
      qualityCourseId: query.qualityCourseId?.trim() || undefined,
      achievementResultId: query.achievementResultId?.trim() || undefined,
      reportId: query.reportId?.trim() || undefined,
    })
    list.value = page.list
    total.value = page.total
  } finally {
    loading.value = false
  }
}

function handlePageChange(payload: { current: number, pageSize: number }) {
  query.pageNum = payload.current
  query.pageSize = payload.pageSize
  loadList()
}

const columns: ColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
  { title: '能力', dataIndex: 'taskType', key: 'taskType', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 160 },
  { title: '业务锚点', key: 'businessAnchor', width: 240 },
  { title: '失败阶段', dataIndex: 'failurePhase', key: 'failurePhase', width: 160 },
  { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', width: 160 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

function resetQuery() {
  query.pageNum = 1
  query.taskType = undefined
  query.status = undefined
  query.businessType = ''
  query.businessId = ''
  query.operatorUserId = ''
  query.programId = ''
  query.trainingPlanId = ''
  query.qualityCourseId = ''
  query.achievementResultId = ''
  query.reportId = ''
  loadList()
}

function openSubmit() {
  Object.assign(submitForm, {
    taskType: 'ACHIEVEMENT_DIAGNOSIS',
    businessType: '',
    businessId: '',
    programId: '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    achievementResultId: '',
    reportId: '',
    fileNodeId: '',
    question: '',
  })
  submitVisible.value = true
}

function handleTrainingPlanChange(value: string | null) {
  submitForm.trainingPlanId = value ?? ''
}

function handleProgramChange(value: string | null) {
  submitForm.programId = value ?? ''
}

function handleQualityCourseChange(value: string | null) {
  submitForm.qualityCourseId = value ?? ''
}

function handleReportChange(value: string | null) {
  submitForm.reportId = value ?? ''
}

function handleSubmitBusinessTypeChange(value: AiTaskBusinessType | null | undefined) {
  submitForm.businessType = value ?? ''
}

async function submitTask() {
  submitting.value = true
  try {
    const result = await aiTaskApi.submit({
      taskType: submitForm.taskType,
      businessType: submitForm.businessType?.trim() || undefined,
      businessId: submitForm.businessId?.trim() || undefined,
      programId: submitForm.programId?.trim() || undefined,
      trainingPlanId:
        submitForm.trainingPlanId?.trim() || qualityStore.currentTrainingPlanId || undefined,
      qualityCourseId: submitForm.qualityCourseId?.trim() || undefined,
      achievementResultId: submitForm.achievementResultId?.trim() || undefined,
      reportId: submitForm.reportId?.trim() || undefined,
      fileNodeId: submitForm.fileNodeId?.trim() || undefined,
      question: submitForm.question?.trim() || undefined,
    })
    message.success(`已提交 AI 任务 ${result.taskId}`)
    submitVisible.value = false
    // 提交后启动轮询：任务达到终态后自动停止，其他页面能同步看到状态跳转
    if (result.taskId) aiTaskStore.startPolling(result.taskId)
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function runNow(record: AiTaskVO) {
  void confirmAsync({
    title: `立即同步执行任务 ${record.id}？`,
    content: '仅 PENDING 状态可立即执行，常用于演示 / 运维场景。',
    type: 'info',
    onOk: async () => {
      await aiTaskApi.runNow(record.id)
      message.success('已触发同步执行')
      // runNow 会使任务进入 PROCESSING，启动轮询跟踪终态
      aiTaskStore.startPolling(record.id)
      await loadList()
    },
  })
}

async function cancelTask(record: AiTaskVO) {
  void confirmAsync({
    title: `取消任务 ${record.id}？`,
    content: '只有 PENDING / PROCESSING 状态可取消，已成功或已失败的任务不可取消。',
    type: 'warning',
    onOk: async () => {
      await aiTaskStore.cancelTask(record.id)
      message.success('已取消任务')
      await loadList()
    },
  })
}

async function openDetail(record: AiTaskVO) {
  detailVisible.value = true
  detailLoading.value = true
  detailRecord.value = record
  detailResult.value = null
  promptSnapshot.value = null
  // 非终态任务启动轮询，让抽屉实时反映 PROCESSING/SUCCEEDED/FAILED 状态变化
  if (!isTerminalAiStatus(record.status)) {
    aiTaskStore.startPolling(record.id)
  }
  try {
    const [resultVo, snapshotVo] = await Promise.all([
      aiResultApi.getByTask(record.id),
      record.promptSnapshotId
        ? aiPromptSnapshotApi.detail(record.promptSnapshotId)
        : Promise.resolve(null),
    ])
    detailResult.value = resultVo
    promptSnapshot.value = snapshotVo
  } finally {
    detailLoading.value = false
  }
}

/** 判断任务是否已达终态（如果已终态，抽屉不需轮询） */
function isTerminalAiStatus(status: AiTaskStatus | undefined): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED'
}

/**
 * 详情抽屉关闭时停止当前任务轮询，避免后台僵尸轮询。
 * 同时在抽屉打开期间同步 store 缓存过来的状态到 detailRecord，UI 能看到状态跳转。
 */
watch(detailVisible, (open) => {
  if (!open && detailRecord.value?.id) {
    aiTaskStore.stopPolling(detailRecord.value.id)
  }
})

// 同步轮询到达的最新状态到 detailRecord，让 UI 实时反映
watch(
  () => (detailRecord.value?.id ? aiTaskStore.getCached(detailRecord.value.id) : null),
  (cached) => {
    if (!cached || !detailRecord.value) return
    if (cached.id !== detailRecord.value.id) return
    // 仅在状态变化时赋值，避免不必要的引用改变
    if (
      cached.status !== detailRecord.value.status
      || cached.failurePhase !== detailRecord.value.failurePhase
      || cached.failureReason !== detailRecord.value.failureReason
      || cached.finishedAt !== detailRecord.value.finishedAt
    ) {
      detailRecord.value = { ...detailRecord.value, ...cached }
      // 达到终态后重拉一次结果 + 快照，避免抽屉中“状态已成功但 result 为空”的错误
      if (isTerminalAiStatus(cached.status) && !detailResult.value) {
        void aiResultApi.getByTask(cached.id).then((vo) => {
          if (detailVisible.value && detailRecord.value?.id === cached.id) {
            detailResult.value = vo
          }
        })
      }
    }
  },
)

// 页面卸载时保险地停掉详情轮询
onBeforeUnmount(() => {
  if (detailRecord.value?.id) {
    aiTaskStore.stopPolling(detailRecord.value.id)
  }
})

async function updateValidation(validation: AiOutputValidation) {
  if (!detailResult.value) return
  validationUpdating.value = true
  try {
    await aiResultApi.updateValidation({
      id: detailResult.value.id,
      outputValidation: validation,
      sensitiveCheckStatus: detailResult.value.sensitiveCheckStatus,
      sensitiveCheckDetail: detailResult.value.sensitiveCheckDetail,
    })
    detailResult.value.outputValidation = validation
    message.success(`已更新校验状态为 ${AI_OUTPUT_VALIDATION_LABEL[validation]}`)
  } finally {
    validationUpdating.value = false
  }
}

function gotoMaskAudit(taskId: string) {
  router.push({ name: 'QualityAiMaskMapping', query: { aiTaskId: taskId } })
}

async function openAuditDrawer(record: AiTaskVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'AI_TASK',
      category: 'QUALITY',
      description: record.id,
    })
    auditEvents.value = page.list.map((log) => ({
      id: log.id,
      operatorName: log.userDto?.nickName || log.userDto?.userName || '-',
      operationType: log.type,
      operationLabel: log.detail || log.type,
      time: log.createTime,
      targetType: log.module,
      targetId: log.bizId || undefined,
      beforeValue: log.changeDetails ? JSON.parse(log.changeDetails)?.before : undefined,
      afterValue: log.changeDetails ? JSON.parse(log.changeDetails)?.after : undefined,
    }))
  } catch {
    auditEvents.value = []
  } finally {
    auditLoading.value = false
  }
}

const taskResultItems = computed<TaskResultItem[]>(() => {
  return list.value
    .filter((t) => t.status === 'FAILED' || t.status === 'PROCESSING')
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: `${aiTaskTypeLabel(t.taskType)} #${t.id}`,
      statusLabel: aiTaskStatusLabel(t.status),
      statusTone: t.status === 'FAILED' ? 'red' : 'blue',
      description: t.failurePhase ? `失败阶段: ${t.failurePhase}` : undefined,
      time: t.startedAt || undefined,
      actions:
        t.status === 'FAILED'
          ? [{ key: 'detail', label: '查看详情' }]
          : [{ key: 'detail', label: '详情' }],
    }))
})

function handleTaskResultAction(payload: { item: TaskResultItem, action: { key: string } }) {
  const record = list.value.find((t) => t.id === payload.item.id)
  if (record && payload.action.key === 'detail') openDetail(record)
}

/* ========== 阶段轨与信号指标 ========== */

const statusBuckets = computed(() => {
  const buckets: Record<AiTaskStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
    CANCELLED: 0,
  }
  for (const item of list.value) {
    if (isAiTaskStatus(item.status)) buckets[item.status] += 1
  }
  return buckets
})

const stages = computed<WorkbenchStage[]>(() => {
  const b = statusBuckets.value
  const order: Array<{ key: AiTaskStatus, title: string, completed?: boolean }> = [
    { key: 'PENDING', title: '待处理' },
    { key: 'PROCESSING', title: '运行中' },
    { key: 'SUCCEEDED', title: '成功', completed: true },
    { key: 'FAILED', title: '失败' },
    { key: 'CANCELLED', title: '取消' },
  ]
  return order.map((stage) => {
    const count = b[stage.key]
    let status: WorkbenchStageStatus = 'pending'
    if (stage.key === 'FAILED' && count > 0) status = 'error'
    else if (stage.completed && count > 0) status = 'completed'
    else if (count > 0) status = 'active'
    return {
      key: stage.key,
      title: stage.title,
      status,
      statusText: `${count} 条`,
    }
  })
})

const signals = computed<SignalMetric[]>(() => {
  const b = statusBuckets.value
  return [
    { key: 'total', label: '本页任务', value: list.value.length, tone: 'blue' },
    { key: 'pending', label: '待处理', value: b.PENDING, tone: b.PENDING > 0 ? 'orange' : 'gray' },
    {
      key: 'processing',
      label: '运行中',
      value: b.PROCESSING,
      tone: b.PROCESSING > 0 ? 'blue' : 'gray',
    },
    {
      key: 'succeeded',
      label: '成功',
      value: b.SUCCEEDED,
      tone: b.SUCCEEDED > 0 ? 'green' : 'gray',
    },
    { key: 'failed', label: '失败', value: b.FAILED, tone: b.FAILED > 0 ? 'red' : 'gray' },
    { key: 'canceled', label: '取消', value: b.CANCELLED, tone: b.CANCELLED > 0 ? 'gray' : 'gray' },
    { key: 'overall', label: '总任务', value: total.value, tone: 'gray' },
  ]
})

watch(
  () => qualityStore.currentTrainingPlanId,
  () => loadList(),
)

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length)
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
  }
  await loadList()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="ai-task__context">
        <div class="ai-task__context-info">
          <h2 class="ai-task__title">质量评价 - AI 任务与结果审计</h2>
        </div>
        <div class="ai-task__context-actions">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            刷新
          </UiButton>
          <UiButton variant="primary" size="sm" @click="openSubmit"> 提交任务 </UiButton>
        </div>
      </div>
    </template>

    <StageRail :stages="stages" compact class="ai-task__stages" />
    <SignalBand :metrics="signals" compact class="ai-task__signals" />

    <TaskResultPanel
      v-if="taskResultItems.length > 0"
      title="待关注任务"
      :items="taskResultItems"
      class="ai-task__result-panel"
      @action="handleTaskResultAction"
    />

    <section class="ai-task__panel">
      <header class="ai-task__panel-header">
        <h3 class="ai-task__panel-title">任务列表</h3>
        <div class="ai-task__panel-actions">
          <a-select
            v-model:value="query.taskType"
            placeholder="能力"
            class="ai-task__filter ai-task__filter--md"
            allow-clear
            :options="taskTypeOptions"
          />
          <a-select
            v-model:value="query.status"
            placeholder="状态"
            class="ai-task__filter"
            allow-clear
            :options="statusOptions"
          />
          <a-select
            v-model:value="query.businessType"
            placeholder="业务类型"
            class="ai-task__filter"
            allow-clear
            :options="businessTypeOptions"
          />
          <a-input
            v-model:value="query.businessId"
            placeholder="业务 ID"
            class="ai-task__filter ai-task__filter--xs"
          />
          <a-input
            v-model:value="query.operatorUserId"
            placeholder="操作人 ID"
            class="ai-task__filter ai-task__filter--xs"
          />
          <a-input
            v-model:value="query.trainingPlanId"
            :placeholder="
              qualityStore.currentTrainingPlanId
                ? `培养方案 #${qualityStore.currentTrainingPlanId}`
                : '培养方案 ID'
            "
            class="ai-task__filter ai-task__filter--md"
          />
          <a-input
            v-model:value="query.qualityCourseId"
            placeholder="课程 ID"
            class="ai-task__filter ai-task__filter--xs"
          />
          <a-input
            v-model:value="query.achievementResultId"
            placeholder="达成度 ID"
            class="ai-task__filter ai-task__filter--xs"
          />
          <a-input
            v-model:value="query.reportId"
            placeholder="报告 ID"
            class="ai-task__filter ai-task__filter--xs"
          />
          <UiButton variant="ghost" size="sm" @click="resetQuery"> 重置 </UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            查询
          </UiButton>
        </div>
      </header>

      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :total="total"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'taskType'">
            {{ aiTaskTypeLabel(text) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="aiTaskStatusColor(text)">
              {{ aiTaskStatusLabel(text) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'businessType'">
            {{ aiTaskBusinessTypeLabel(text) }}
          </template>
          <template v-else-if="column.key === 'businessAnchor'">
            <a-space direction="vertical" size="small">
              <a-tag v-if="record.qualityCourseId"> 课程 #{{ record.qualityCourseId }} </a-tag>
              <a-tag v-if="record.achievementResultId">
                达成度 #{{ record.achievementResultId }}
              </a-tag>
              <a-tag v-if="record.reportId"> 报告 #{{ record.reportId }} </a-tag>
              <a-tag v-if="record.trainingPlanId"> 培养方案 #{{ record.trainingPlanId }} </a-tag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'failurePhase'">
            <span v-if="text" class="ai-task__error-text">{{ text }}</span>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'startedAt'">
            {{ text || '-' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <UiButton variant="ghost" size="sm" @click="openDetail(record)"> 详情 </UiButton>
              <UiButton
                v-if="record.status === 'PENDING'"
                variant="outline"
                size="sm"
                @click="runNow(record)"
              >
                立即执行
              </UiButton>
              <UiButton
                v-if="record.status === 'PENDING' || record.status === 'PROCESSING'"
                variant="ghost"
                status="danger"
                size="sm"
                @click="cancelTask(record)"
              >
                取消
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="openAuditDrawer(record)"> 审计 </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

    <UiDrawer
      v-model:open="submitVisible"
      title="提交 AI 任务"
      :width="560"
      :confirm-loading="submitting"
      :hide-footer="false"
      ok-text="提交"
      :ok-button-props="{ disabled: submitDisabled }"
      @ok="submitTask"
    >
      <a-form layout="vertical" :model="submitForm">
        <a-form-item label="能力" required>
          <a-select v-model:value="submitForm.taskType" :options="taskTypeOptions" />
        </a-form-item>
        <a-form-item label="业务类型">
          <a-select
            :value="submitForm.businessType || undefined"
            placeholder="选择业务类型"
            allow-clear
            :options="businessTypeOptions"
            @change="handleSubmitBusinessTypeChange"
          />
        </a-form-item>
        <a-form-item label="业务对象 ID">
          <a-input
            v-model:value="submitForm.businessId"
            placeholder="填写所选业务对象的 ID"
          />
        </a-form-item>
        <a-form-item label="培养方案">
          <TrainingPlanSelector
            :value="submitForm.trainingPlanId || null"
            :placeholder="
              qualityStore.currentTrainingPlanId ? '默认使用当前选中培养方案' : '选择培养方案'
            "
            @change="handleTrainingPlanChange"
          />
        </a-form-item>
        <a-form-item label="专业">
          <ProgramSelector
            :value="submitForm.programId || null"
            placeholder="选择专业（可选）"
            @change="handleProgramChange"
          />
        </a-form-item>
        <a-form-item label="质量评价课程">
          <CourseSelector
            :value="submitForm.qualityCourseId || null"
            :training-plan-id="
              submitForm.trainingPlanId || qualityStore.currentTrainingPlanId || null
            "
            placeholder="选择质量评价课程（可选）"
            @change="handleQualityCourseChange"
          />
        </a-form-item>
        <a-form-item label="达成度结果 ID">
          <a-input
            v-model:value="submitForm.achievementResultId"
            placeholder="达成度诊断必填"
          />
        </a-form-item>
        <a-form-item label="报告">
          <ReportSelector
            :value="submitForm.reportId || null"
            placeholder="生成质量报告时可选择"
            @change="handleReportChange"
          />
        </a-form-item>
        <a-form-item label="文件节点 ID">
          <a-input
            v-model:value="submitForm.fileNodeId"
            placeholder="解析课程大纲、培养方案或材料问答时必填"
          />
        </a-form-item>
        <a-form-item label="用户提问">
          <a-textarea
            v-model:value="submitForm.question"
            :rows="3"
            placeholder="材料问答必填，最长 1000 字符"
            :maxlength="1000"
            show-count
          />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer v-model:open="detailVisible" title="AI 任务详情" :width="840" :hide-footer="true">
      <UiEmpty v-if="!detailRecord && !detailLoading" description="详情数据未加载" size="sm" />
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="任务 ID">
          {{ detailRecord.id }}
        </a-descriptions-item>
        <a-descriptions-item label="能力">
          {{ aiTaskTypeLabel(detailRecord.taskType) }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="aiTaskStatusColor(detailRecord.status)">
            {{ aiTaskStatusLabel(detailRecord.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="操作人 ID">
          {{ detailRecord.operatorUserId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型 / ID">
          {{ aiTaskBusinessTypeLabel(detailRecord.businessType) }} /
          {{ detailRecord.businessId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="业务锚点">
          <a-space wrap>
            <a-tag v-if="detailRecord.programId"> 专业 #{{ detailRecord.programId }} </a-tag>
            <a-tag v-if="detailRecord.trainingPlanId">
              培养方案 #{{ detailRecord.trainingPlanId }}
            </a-tag>
            <a-tag v-if="detailRecord.qualityCourseId">
              课程 #{{ detailRecord.qualityCourseId }}
            </a-tag>
            <a-tag v-if="detailRecord.achievementResultId">
              达成度 #{{ detailRecord.achievementResultId }}
            </a-tag>
            <a-tag v-if="detailRecord.reportId"> 报告 #{{ detailRecord.reportId }} </a-tag>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="开始 / 结束">
          {{ detailRecord.startedAt || '-' }} ～ {{ detailRecord.finishedAt || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="失败阶段">
          <span v-if="detailRecord.failurePhase" class="ai-task__error-text">
            {{ detailRecord.failurePhase }}
          </span>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item label="失败原因">
          <span v-if="detailRecord.failureReason" class="ai-task__error-text ai-task__error-pre">
            {{ detailRecord.failureReason }}
          </span>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item label="运维干预状态 / 备注">
          {{ detailRecord.manualHandlingStatus || '-' }} /
          {{ detailRecord.manualHandlingRemark || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="提示词快照 ID">
          {{ detailRecord.promptSnapshotId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="脱敏映射 ID">
          <a-space>
            <span>{{ detailRecord.maskMappingId || '-' }}</span>
            <UiButton
              v-if="detailRecord.maskMappingId"
              variant="ghost"
              size="sm"
              @click="gotoMaskAudit(detailRecord.id)"
            >
              查看脱敏审计
            </UiButton>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="结果 ID">
          {{ detailRecord.resultId || '-' }}
        </a-descriptions-item>
      </a-descriptions>

      <a-divider />

      <a-tabs v-if="detailRecord" default-active-key="result">
        <a-tab-pane key="result" tab="AI 结果">
          <UiEmpty v-if="!detailResult" description="尚未生成结果" size="sm" />
          <template v-else>
            <a-descriptions :column="2" size="small" bordered>
              <a-descriptions-item label="输出校验">
                <a-tag
                  v-if="detailResult.outputValidation"
                  :color="validationColor(detailResult.outputValidation)"
                >
                  {{ validationLabel(detailResult.outputValidation) }}
                </a-tag>
                <span v-else>-</span>
              </a-descriptions-item>
              <a-descriptions-item label="敏感检测">
                <a-tag :color="detailResult.sensitiveCheckStatus === 'CLEAN' ? 'green' : 'red'">
                  {{ detailResult.sensitiveCheckStatus || '-' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="调用模型">
                {{ detailResult.modelName || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="生成时间">
                {{ detailResult.generatedAt || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="提示 token">
                {{ detailResult.promptTokenCount ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="完成 token">
                {{ detailResult.completionTokenCount ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="敏感检测明细" :span="2">
                <pre v-if="detailResult.sensitiveCheckDetail" class="ai-task__pre">{{
                  detailResult.sensitiveCheckDetail
                }}</pre>
                <span v-else>-</span>
              </a-descriptions-item>
            </a-descriptions>

            <a-divider class="ai-task__divider" />

            <a-space wrap>
              <span class="ai-task__label">校验状态：</span>
              <UiButton
                v-for="opt in validationOptions"
                :key="opt.value"
                :variant="
                  detailResult.outputValidation === opt.value
                    ? opt.value === 'REJECTED'
                      ? 'destructive'
                      : 'primary'
                    : opt.value === 'REJECTED'
                      ? 'ghost'
                      : 'outline'
                "
                :status="opt.value === 'REJECTED' ? 'danger' : 'normal'"
                size="sm"
                :loading="validationUpdating"
                @click="updateValidation(opt.value)"
              >
                {{ opt.label }}
              </UiButton>
            </a-space>

            <a-divider class="ai-task__divider" />

            <h4 class="ai-task__section-title">诊断摘要</h4>
            <pre class="ai-task__pre">{{ detailResult.summary || '-' }}</pre>

            <h4 class="ai-task__section-title">问题列表（JSON）</h4>
            <pre class="ai-task__pre">{{ detailResult.issueList || '-' }}</pre>

            <h4 class="ai-task__section-title">证据引用（JSON）</h4>
            <pre class="ai-task__pre">{{ detailResult.evidenceReferences || '-' }}</pre>

            <h4 class="ai-task__section-title">改进建议（JSON）</h4>
            <pre class="ai-task__pre">{{ detailResult.improvementSuggestions || '-' }}</pre>

            <h4 class="ai-task__section-title">报告正文（Markdown）</h4>
            <pre class="ai-task__pre">{{ detailResult.reportBody || '-' }}</pre>

            <h4 class="ai-task__section-title">原始模型输出（脱敏后）</h4>
            <pre class="ai-task__pre">{{ detailResult.rawModelOutput || '-' }}</pre>
          </template>
        </a-tab-pane>
        <a-tab-pane key="prompt" tab="提示词快照">
          <UiEmpty v-if="!promptSnapshot" description="未读取到提示词快照" size="sm" />
          <template v-else>
            <a-descriptions :column="2" size="small" bordered>
              <a-descriptions-item label="快照 ID">
                {{ promptSnapshot.id }}
              </a-descriptions-item>
              <a-descriptions-item label="提示词版本">
                {{ promptSnapshot.promptVersion }}
              </a-descriptions-item>
              <a-descriptions-item label="摘要" :span="2">
                {{ promptSnapshot.digest || '-' }}
              </a-descriptions-item>
            </a-descriptions>
            <a-collapse class="ai-task__collapse">
              <a-collapse-panel key="system" header="系统段（systemPrompt）">
                <pre class="ai-task__pre">{{ promptSnapshot.systemPrompt || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="task" header="任务段（taskPrompt）">
                <pre class="ai-task__pre">{{ promptSnapshot.taskPrompt || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="standard" header="标准段（standardSection）">
                <pre class="ai-task__pre">{{ promptSnapshot.standardSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="profile" header="专业实例段（profileSection）">
                <pre class="ai-task__pre">{{ promptSnapshot.profileSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="calculation" header="计算段（calculationSection）">
                <pre class="ai-task__pre">{{ promptSnapshot.calculationSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="sample" header="样本段（sampleSection）">
                <pre class="ai-task__pre">{{ promptSnapshot.sampleSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="audit" header="审核段（auditSection）">
                <pre class="ai-task__pre">{{ promptSnapshot.auditSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="output" header="输出格式段（outputFormatSection）">
                <pre class="ai-task__pre">{{ promptSnapshot.outputFormatSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="forbidden" header="禁止指令段（forbiddenSection）">
                <pre class="ai-task__pre">{{ promptSnapshot.forbiddenSection || '-' }}</pre>
              </a-collapse-panel>
            </a-collapse>
          </template>
        </a-tab-pane>
      </a-tabs>
    </UiDrawer>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="AI 任务操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-task {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__stages {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__result-panel {
    margin-bottom: 16px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 130px;

    &--md {
      width: 180px;
    }

    &--xs {
      width: 110px;
    }
  }

  &__error-text {
    color: var(--ant-color-error, #dc2626);
  }

  &__error-pre {
    white-space: pre-wrap;
  }

  &__divider {
    margin: 12px 0;
  }

  &__label {
    color: var(--dp-text-secondary, #475569);
  }

  &__section-title {
    margin: 12px 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__collapse {
    margin-top: 12px;
  }

  &__pre {
    margin: 0;
    background: var(--dp-gray-50, #f6f8fa);
    border: 1px solid var(--dp-border, #e1e4e8);
    border-radius: 6px;
    padding: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 320px;
    overflow: auto;
  }
}
</style>
