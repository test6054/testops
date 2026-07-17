<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ImprovementTaskQueryRequest,
  ImprovementTaskSaveRequest,
  ImprovementTaskVO,
} from '@/apis/quality/improvement-task'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { WorkbenchSignalRefreshHandler } from '@/composables/quality/improvement'
import { message } from 'ant-design-vue'
import { reactive, ref, watch } from 'vue'
import { aiTaskApi } from '@/apis/quality/ai-task'
import { aiTaskTriggerApi } from '@/apis/quality/ai-task-trigger'
import { improvementTaskApi } from '@/apis/quality/improvement-task'
import {
  AiTaskBusinessTypeCode,
  AiTaskTypeCode,
  IMPROVEMENT_TASK_STATUS_COLOR,
  ImprovementTaskStatusCode,
  ImprovementTaskStatusDescription,
} from '@/apis/quality/types'
import ImprovementWorkbenchPanel from '@/components/quality/improvement/ImprovementWorkbenchPanel.vue'
import {
  AchievementResultSelector,
  CourseSelector,
  ProgramSelector,
  ReportSelector,
  TeacherSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import {
  normalizeTextareaLineItems,
  refreshWorkbenchSignalsAfterMutation,
  selectedId,
} from '@/composables/quality/improvement'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import {
  assertQualityScopeFresh,
  beginQualityScopeRequest,
  isQualityScopeStaleError,
} from '@/composables/useScopeRequestGuard'
import { useAiTaskStore } from '@/stores/modules/aiTask'
import { useQualityStore } from '@/stores/modules/quality'
import { showFormValidationMessage, showUserError, toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

defineOptions({ name: 'ImprovementTaskTab' })

const props = defineProps<{
  onLoadError?: (error: Error | null) => void
  onWorkbenchRefresh?: WorkbenchSignalRefreshHandler
}>()

const qualityStore = useQualityStore()
const aiTaskStore = useAiTaskStore()

const improvementColumns: ColumnsType = [
  { title: '编号', dataIndex: 'taskCode', key: 'taskCode', width: 160, fixed: 'left' },
  { title: '标题', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '关联课程', key: 'qualityCourseRef', width: 120 },
  { title: '负责人', key: 'ownerRef', width: 120 },
  { title: '角色', dataIndex: 'ownerRole', key: 'ownerRole', width: 100 },
  { title: '截止', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 380 },
]

const improvementList = ref<ImprovementTaskVO[]>([])
const improvementTotal = ref(0)
const improvementLoading = ref(false)
const improvementQuery = reactive<ImprovementTaskQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  qualityCourseId: '',
  ownerUserId: '',
  status: undefined,
  keyword: '',
})

const improvementStatusOptions: Array<{ value: ImprovementTaskStatusCode, label: string }> = [
  { value: ImprovementTaskStatusCode.OPEN, label: ImprovementTaskStatusDescription.OPEN },
  {
    value: ImprovementTaskStatusCode.IN_PROGRESS,
    label: ImprovementTaskStatusDescription.IN_PROGRESS,
  },
  { value: ImprovementTaskStatusCode.SUBMITTED, label: ImprovementTaskStatusDescription.SUBMITTED },
  { value: ImprovementTaskStatusCode.CLOSED, label: ImprovementTaskStatusDescription.CLOSED },
  { value: ImprovementTaskStatusCode.RETURNED, label: ImprovementTaskStatusDescription.RETURNED },
]

interface ImprovementFilterForm {
  qualityCourseId: string
  ownerUserId: string
  status?: ImprovementTaskStatusCode
  keyword: string
}

const improvementFilterForm = reactive<ImprovementFilterForm>({
  qualityCourseId: '',
  ownerUserId: '',
  keyword: '',
})

const improvementFilterFields: FilterField[] = [
  {
    key: 'qualityCourseId',
    type: 'custom',
    label: '关联课程',
    width: 160,
    minWidth: 160,
    maxWidth: 220,
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: improvementStatusOptions,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '编号 / 标题',
    width: 180,
    triggerSearchOnChange: false,
  },
]

const improvementEditorVisible = ref(false)
const improvementEditorMode = ref<'create' | 'edit'>('create')
const improvementEditor = reactive<ImprovementTaskSaveRequest>({
  taskCode: '',
  taskTitle: '',
  problemSummary: '',
  proposedAction: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
  ownerUserId: '',
  ownerRole: '',
  dueDate: '',
})
const improvementEditorSubmitting = ref(false)
const submitAiSuggestionDraft = ref(false)
const improvementDetailVisible = ref(false)
const improvementDetailRecord = ref<ImprovementTaskVO | null>(null)
const improvementDetailLoading = ref(false)

const improvementTransitMap: Record<ImprovementTaskStatusCode, ImprovementTaskStatusCode[]> = {
  [ImprovementTaskStatusCode.OPEN]: [ImprovementTaskStatusCode.IN_PROGRESS],
  [ImprovementTaskStatusCode.IN_PROGRESS]: [ImprovementTaskStatusCode.SUBMITTED],
  [ImprovementTaskStatusCode.SUBMITTED]: [
    ImprovementTaskStatusCode.CLOSED,
    ImprovementTaskStatusCode.RETURNED,
  ],
  [ImprovementTaskStatusCode.RETURNED]: [ImprovementTaskStatusCode.IN_PROGRESS],
  [ImprovementTaskStatusCode.CLOSED]: [],
}

function improvementStatusLabel(value: ImprovementTaskStatusCode): string {
  return strictEnumLabel(ImprovementTaskStatusDescription, value, '持续改进任务状态')
}

function improvementStatusColor(value: ImprovementTaskStatusCode): BadgeTone {
  return strictEnumTone(IMPROVEMENT_TASK_STATUS_COLOR, value, '持续改进任务状态')
}

function syncImprovementFilterToQuery(): void {
  improvementQuery.qualityCourseId = improvementFilterForm.qualityCourseId
  improvementQuery.ownerUserId = improvementFilterForm.ownerUserId
  improvementQuery.status = improvementFilterForm.status
  improvementQuery.keyword = improvementFilterForm.keyword
}

function handleImprovementFilterSearch(): void {
  improvementQuery.pageNum = 1
  syncImprovementFilterToQuery()
  void loadList()
}

function handleImprovementPageChange(page: { current: number, pageSize: number }): void {
  improvementQuery.pageNum = page.current
  improvementQuery.pageSize = page.pageSize
  void loadList()
}

function resetImprovementQuery(): void {
  improvementQuery.pageNum = 1
  syncImprovementFilterToQuery()
  void loadList()
}

function handleImprovementOwnerChange(value: string | string[] | null): void {
  if (Array.isArray(value)) {
    showFormValidationMessage('负责人只能单选，请重新选择')
    return
  }
  improvementEditor.ownerUserId = value ?? ''
}

function handleImprovementProgramChange(value: string | null | undefined): void {
  improvementEditor.programId = selectedId(value)
  improvementEditor.qualityCourseId = ''
  improvementEditor.achievementResultId = ''
  improvementEditor.reportId = ''
}

watch(
  () => improvementEditor.achievementResultId,
  (value) => {
    if (!value) {
      submitAiSuggestionDraft.value = false
    }
  },
)

function handleImprovementCourseChange(value: string | null | undefined): void {
  improvementEditor.qualityCourseId = selectedId(value)
  improvementEditor.achievementResultId = ''
  improvementEditor.reportId = ''
}

function handleImprovementQueryCourseChange(value: string | null | undefined): void {
  improvementFilterForm.qualityCourseId = selectedId(value)
}

function handleImprovementAchievementResultChange(value: string | null | undefined): void {
  improvementEditor.achievementResultId = selectedId(value)
}

function handleImprovementReportChange(value: string | null | undefined): void {
  improvementEditor.reportId = selectedId(value)
}

async function loadList(options?: { refreshSignals?: boolean }): Promise<void> {
  const scope = beginQualityScopeRequest()
  improvementLoading.value = true
  try {
    if (!qualityStore.currentTrainingPlanId) {
      improvementList.value = []
      improvementTotal.value = 0
      assertQualityScopeFresh(scope)
      return
    }
    const page = await improvementTaskApi.page({
      ...improvementQuery,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      qualityCourseId: improvementQuery.qualityCourseId || undefined,
      ownerUserId: improvementQuery.ownerUserId || undefined,
      status: improvementQuery.status || undefined,
      keyword: improvementQuery.keyword?.trim() || undefined,
    })
    assertQualityScopeFresh(scope)
    improvementList.value = page.list
    improvementQuery.pageNum = page.pageNum
    improvementQuery.pageSize = page.pageSize
    improvementTotal.value = page.total
    if (
      improvementList.value.length === 0
      && improvementTotal.value > 0
      && improvementQuery.pageNum > 1
    ) {
      improvementQuery.pageNum -= 1
      await loadList(options)
      return
    }
    if (options?.refreshSignals) {
      await refreshWorkbenchSignalsAfterMutation(
        scope,
        props.onWorkbenchRefresh,
        props.onLoadError,
        '工作台指标加载失败',
      )
    }
  } catch (error) {
    if (isQualityScopeStaleError(error) || scope.isStale()) {
      return
    }
    const err = toUserError(error, '持续改进任务加载失败')
    props.onLoadError?.(err)
    showUserError(error, '持续改进任务加载失败')
    throw err
  } finally {
    improvementLoading.value = false
  }
}

function openImprovementCreate(): void {
  improvementEditorMode.value = 'create'
  submitAiSuggestionDraft.value = false
  Object.assign(improvementEditor, {
    id: undefined,
    taskCode: '',
    taskTitle: '',
    problemSummary: '',
    proposedAction: '',
    programId: qualityStore.currentProgramId || '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    achievementResultId: '',
    reportId: '',
    ownerUserId: '',
    ownerRole: '',
    dueDate: '',
  })
  improvementEditorVisible.value = true
}

function openImprovementEdit(record: ImprovementTaskVO): void {
  if (!canEditImprovementTask(record.status)) {
    message.error('当前状态不允许编辑改进任务')
    return
  }
  improvementEditorMode.value = 'edit'
  Object.assign(improvementEditor, {
    id: record.id,
    taskCode: record.taskCode,
    taskTitle: record.taskTitle,
    problemSummary: record.problemSummary,
    proposedAction: record.proposedAction,
    programId: record.programId,
    trainingPlanId: record.trainingPlanId || '',
    qualityCourseId: record.qualityCourseId || '',
    achievementResultId: record.achievementResultId || '',
    reportId: record.reportId || '',
    ownerUserId: record.ownerUserId,
    ownerRole: record.ownerRole || '',
    dueDate: record.dueDate,
  })
  improvementEditorVisible.value = true
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** 创建勾选路径：异步 AI 入队后按 improvementTaskId(reportId) 轮询任务并启动 Store 轮询。 */
async function startPollingImprovementAiTask(improvementTaskId: string): Promise<void> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const result = await aiTaskApi.page({
      taskType: AiTaskTypeCode.IMPROVEMENT_SUGGESTION_GENERATE,
      reportId: improvementTaskId,
      pageNum: 1,
      pageSize: 1,
    })
    const task = result.list[0]
    if (task?.id) {
      aiTaskStore.startPolling(task.id)
      return
    }
    await sleep(2000)
  }
}

async function submitImprovementEditor(): Promise<void> {
  if (improvementEditorMode.value === 'edit' && improvementEditor.id) {
    const current = improvementList.value.find((item) => item.id === improvementEditor.id)
    if (current && !canEditImprovementTask(current.status)) {
      message.error('当前状态不允许编辑改进任务')
      return
    }
  }
  if (
    !improvementEditor.taskTitle.trim()
    || !improvementEditor.problemSummary.trim()
    || !improvementEditor.proposedAction.trim()
    || !improvementEditor.programId
    || !improvementEditor.ownerUserId
    || !improvementEditor.dueDate
  ) {
    message.error('请填写标题、问题概述、改进措施、专业、负责人和截止日期')
    return
  }
  if (
    improvementEditorMode.value === 'create'
    && submitAiSuggestionDraft.value
    && !improvementEditor.achievementResultId
  ) {
    showFormValidationMessage('生成智能改进草稿需要先关联达成度计算结果')
    return
  }
  improvementEditorSubmitting.value = true
  try {
    const request: ImprovementTaskSaveRequest = {
      id: improvementEditor.id,
      programId: improvementEditor.programId,
      trainingPlanId:
        improvementEditor.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
      taskCode: improvementEditor.taskCode?.trim() || undefined,
      taskTitle: improvementEditor.taskTitle.trim(),
      problemSummary: improvementEditor.problemSummary.trim(),
      proposedAction: improvementEditor.proposedAction.trim(),
      qualityCourseId: improvementEditor.qualityCourseId || undefined,
      achievementResultId: improvementEditor.achievementResultId || undefined,
      reportId: improvementEditor.reportId || undefined,
      ownerUserId: improvementEditor.ownerUserId,
      ownerRole: improvementEditor.ownerRole || undefined,
      dueDate: improvementEditor.dueDate,
    }
    if (improvementEditorMode.value === 'create') {
      const improvementTaskId = await improvementTaskApi.create(request)
      if (submitAiSuggestionDraft.value && improvementTaskId) {
        const achievementResultId = request.achievementResultId
        if (!achievementResultId) {
          showFormValidationMessage('生成智能改进草稿需要先关联达成度计算结果')
          return
        }
        const res = await aiTaskTriggerApi.submit({
          taskType: AiTaskTypeCode.IMPROVEMENT_SUGGESTION_GENERATE,
          businessType: AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT,
          businessId: achievementResultId,
          trainingPlanId: request.trainingPlanId,
          programId: request.programId,
          qualityCourseId: request.qualityCourseId,
          achievementResultId,
          reportId: improvementTaskId,
        })
        message.success('改进任务已创建，智能改进草稿已排队生成')
        if (res.taskId) {
          aiTaskStore.startPolling(res.taskId)
        } else {
          void startPollingImprovementAiTask(String(improvementTaskId))
        }
      } else {
        message.success('改进任务已创建')
      }
    } else {
      await improvementTaskApi.update(request)
      message.success('已保存修改')
    }
    improvementEditorVisible.value = false
    await loadList({ refreshSignals: true })
  } finally {
    improvementEditorSubmitting.value = false
  }
}

function nextImprovementStatuses(status: ImprovementTaskStatusCode): ImprovementTaskStatusCode[] {
  return strictEnumValue(improvementTransitMap, status, '持续改进任务状态')
}

function canEditImprovementTask(status: ImprovementTaskStatusCode): boolean {
  return status === ImprovementTaskStatusCode.OPEN || status === ImprovementTaskStatusCode.RETURNED
}

async function handleImprovementTransit(
  record: ImprovementTaskVO,
  to: ImprovementTaskStatusCode,
): Promise<void> {
  if (
    record.status === ImprovementTaskStatusCode.SUBMITTED
    && (to === ImprovementTaskStatusCode.CLOSED || to === ImprovementTaskStatusCode.RETURNED)
  ) {
    const reviewRemark = await promptInputAsync({
      title: to === ImprovementTaskStatusCode.CLOSED ? '复评通过并闭环' : '复评退回任务',
      placeholder:
        to === ImprovementTaskStatusCode.RETURNED ? '退回原因（必填）' : '复评意见（可选）',
      required: to === ImprovementTaskStatusCode.RETURNED,
      okType: to === ImprovementTaskStatusCode.RETURNED ? 'danger' : 'primary',
      emptyErrorMessage: '请填写退回原因',
    })
    if (reviewRemark === null) return
    if (to === ImprovementTaskStatusCode.RETURNED && !reviewRemark) return
    await improvementTaskApi.close({
      id: record.id,
      reviewDecision: to === ImprovementTaskStatusCode.CLOSED ? 'APPROVED' : 'REJECTED',
      reviewRemark: reviewRemark || undefined,
    })
    message.success(to === ImprovementTaskStatusCode.CLOSED ? '已闭环' : '已退回')
    await loadList({ refreshSignals: true })
    return
  }
  const remark = await promptInputAsync({
    title: `${improvementStatusLabel(record.status)} → ${improvementStatusLabel(to)}`,
    placeholder:
      to === ImprovementTaskStatusCode.SUBMITTED
        ? '整改进度说明（提交时必填）'
        : '进度备注（可选）',
    required: false,
    okType: 'primary',
  })
  if (remark === null) return
  let rectificationEvidenceItems: string[] | undefined
  if (to === ImprovementTaskStatusCode.SUBMITTED) {
    const evidenceText = await promptInputAsync({
      title: '填写整改证据说明',
      placeholder: '每行填写一条证据，例如：已上传课程考核分析表',
      required: true,
      emptyErrorMessage: '提交复评必须填写整改证据',
      okType: 'primary',
    })
    if (evidenceText === null) return
    if (!evidenceText) return
    rectificationEvidenceItems = normalizeTextareaLineItems(evidenceText)
  }
  await improvementTaskApi.transitStatus({
    id: record.id,
    targetStatus: to,
    progressRemark: remark || undefined,
    rectificationEvidenceItems,
  })
  message.success('流转成功')
  await loadList({ refreshSignals: true })
}

async function handleImprovementAiSuggestion(record: ImprovementTaskVO): Promise<void> {
  if (!record.achievementResultId) {
    showFormValidationMessage('生成智能改进草稿需要先关联达成度计算结果')
    return
  }
  const achievementResultId = record.achievementResultId
  void confirmAsync({
    title: '为该改进任务生成 AI 改进草稿？',
    content: '将提交改进草稿生成任务，完成后可在 AI 任务中心查看结果',
    type: 'info',
    onOk: async () => {
      const res = await aiTaskTriggerApi.submit({
        taskType: AiTaskTypeCode.IMPROVEMENT_SUGGESTION_GENERATE,
        businessType: AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT,
        businessId: achievementResultId,
        trainingPlanId: record.trainingPlanId,
        programId: record.programId,
        qualityCourseId: record.qualityCourseId,
        achievementResultId,
        reportId: record.id,
      })
      message.success('已提交智能改进草稿任务')
      if (res.taskId) aiTaskStore.startPolling(res.taskId)
    },
  })
}

async function handleImprovementDelete(record: ImprovementTaskVO): Promise<void> {
  void confirmAsync({
    title: `删除改进任务 ${record.taskCode}？`,
    type: 'error',
    content: '该操作不可恢复',
    onOk: async () => {
      await improvementTaskApi.delete(record.id)
      message.success('已删除')
      await loadList({ refreshSignals: true })
    },
  })
}

async function openImprovementDetail(record: ImprovementTaskVO): Promise<void> {
  improvementDetailVisible.value = true
  improvementDetailLoading.value = true
  try {
    improvementDetailRecord.value = await improvementTaskApi.detail(record.id)
  } finally {
    improvementDetailLoading.value = false
  }
}

function buildImprovementTaskActions(record: ImprovementTaskVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [
    { key: 'detail', label: '详情' },
    {
      key: 'edit',
      label: '编辑',
      disabled: !canEditImprovementTask(record.status),
    },
  ]
  for (const to of nextImprovementStatuses(record.status)) {
    actions.push({
      key: to,
      label: `→ ${improvementStatusLabel(to)}`,
      tone: to === ImprovementTaskStatusCode.RETURNED ? 'danger' : 'primary',
    })
  }
  actions.push({
    key: 'ai-suggestion',
    label: 'AI 改进',
    disabled: !record.achievementResultId,
  })
  if (record.status === ImprovementTaskStatusCode.OPEN) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleImprovementTaskAction(key: string, record: ImprovementTaskVO): void {
  switch (key) {
    case 'detail':
      void openImprovementDetail(record)
      return
    case 'edit':
      openImprovementEdit(record)
      return
    case 'ai-suggestion':
      void handleImprovementAiSuggestion(record)
      return
    case 'delete':
      void handleImprovementDelete(record)
      return
    case ImprovementTaskStatusCode.OPEN:
    case ImprovementTaskStatusCode.IN_PROGRESS:
    case ImprovementTaskStatusCode.SUBMITTED:
    case ImprovementTaskStatusCode.CLOSED:
    case ImprovementTaskStatusCode.RETURNED:
      void handleImprovementTransit(record, key)
  }
}

/** 通知深链：打开指定改进任务详情，可选启动 AI 任务轮询。 */
async function openByDeepLink(payload: {
  improvementTaskId: string
  aiTaskId?: string
}): Promise<void> {
  improvementDetailVisible.value = true
  improvementDetailLoading.value = true
  try {
    improvementDetailRecord.value = await improvementTaskApi.detail(payload.improvementTaskId)
  } finally {
    improvementDetailLoading.value = false
  }
  if (payload.aiTaskId) {
    aiTaskStore.startPolling(payload.aiTaskId)
  }
}

defineExpose({
  loadList,
  openByDeepLink,
})
</script>

<template>
  <ImprovementWorkbenchPanel title="改进任务台账" :empty="!qualityStore.currentTrainingPlanId">
    <template #extra>
      <UiButton
        variant="primary"
        size="sm"
        :disabled="!qualityStore.currentTrainingPlanId"
        @click="openImprovementCreate"
      >
        新建改进任务
      </UiButton>
    </template>

    <UiFilterBar
      variant="plain"
      v-model="improvementFilterForm"
      :fields="improvementFilterFields"
      show-labels
      search-text="查询"
      @search="handleImprovementFilterSearch"
      @reset="resetImprovementQuery"
    >
      <template #field-qualityCourseId>
        <CourseSelector
          :value="improvementFilterForm.qualityCourseId || null"
          :training-plan-id="qualityStore.currentTrainingPlanId || null"
          placeholder="关联课程"
          :width="160"
          @change="handleImprovementQueryCourseChange"
        />
      </template>
    </UiFilterBar>

    <UiDataTable
      v-model:current="improvementQuery.pageNum"
      v-model:page-size="improvementQuery.pageSize"
      :columns="improvementColumns"
      :data-source="improvementList"
      :loading="improvementLoading"
      row-key="id"
      size="middle"
      :total="improvementTotal"
      flat
      @page-change="handleImprovementPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'qualityCourseRef'">
          <template v-if="record.qualityCourseId">
            {{ record.qualityCourseCode }} {{ record.qualityCourseName }}
          </template>
        </template>
        <template v-else-if="column.key === 'ownerRole'">
          {{ record.ownerRole || '未指定角色' }}
        </template>
        <template v-else-if="column.key === 'ownerRef'">
          {{ record.ownerUserName }}
        </template>
        <template v-else-if="column.key === 'dueDate'">
          {{ record.dueDate }}
        </template>
        <template v-else-if="column.key === 'status'">
          <UiTag :tone="improvementStatusColor(record.status)" size="sm">
            {{ improvementStatusLabel(record.status) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="buildImprovementTaskActions(record)"
            split
            @action="(key) => handleImprovementTaskAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>
  </ImprovementWorkbenchPanel>

  <UiDrawer
    v-model:open="improvementEditorVisible"
    :title="improvementEditorMode === 'create' ? '新建改进任务' : '编辑改进任务'"
    :width="760"
    :confirm-loading="improvementEditorSubmitting"
    :hide-footer="false"
    ok-text="保存"
    @ok="submitImprovementEditor"
  >
    <UiForm layout="vertical" :model="improvementEditor">
      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiFormItem label="任务编码" required>
            <UiInput
              size="sm"
              v-model="improvementEditor.taskCode"
              placeholder="如 IMP-2024-001"
              :disabled="improvementEditorMode === 'edit'"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="16">
          <UiFormItem label="任务标题" required>
            <UiInput
              size="sm" v-model="improvementEditor.taskTitle"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="负责人">
            <TeacherSelector
              :value="improvementEditor.ownerUserId || null"
              @change="handleImprovementOwnerChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem label="责任角色">
            <UiInput
              size="sm"
              v-model="improvementEditor.ownerRole"
              placeholder="如 课程负责人 / 系主任"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiFormItem label="关联专业">
            <ProgramSelector
              :value="improvementEditor.programId || null"
              :disabled="Boolean(qualityStore.currentTrainingPlanId)"
              @change="handleImprovementProgramChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="关联课程">
            <CourseSelector
              :value="improvementEditor.qualityCourseId || null"
              :program-id="improvementEditor.programId || null"
              :training-plan-id="improvementEditor.trainingPlanId || null"
              @change="handleImprovementCourseChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="关联达成度结果">
            <AchievementResultSelector
              :value="improvementEditor.achievementResultId || null"
              :program-id="improvementEditor.programId || null"
              :training-plan-id="improvementEditor.trainingPlanId || null"
              :quality-course-id="improvementEditor.qualityCourseId || null"
              @change="handleImprovementAchievementResultChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="关联报告">
            <ReportSelector
              :value="improvementEditor.reportId || null"
              :program-id="improvementEditor.programId || null"
              :training-plan-id="improvementEditor.trainingPlanId || null"
              :quality-course-id="improvementEditor.qualityCourseId || null"
              @change="handleImprovementReportChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem label="截止日期">
            <UiInput
              size="sm" v-model="improvementEditor.dueDate" placeholder="yyyy-MM-dd"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiFormItem label="问题概述">
        <UiTextarea
          size="sm"
          v-model="improvementEditor.problemSummary"
          :rows="3"
          placeholder="为什么达成度低于阈值 / 暴露了什么问题"
        />
      </UiFormItem>
      <UiFormItem label="改进措施">
        <UiTextarea
          size="sm"
          v-model="improvementEditor.proposedAction"
          :rows="3"
          placeholder="具体改进动作"
        />
      </UiFormItem>
      <UiFormItem v-if="improvementEditorMode === 'create'" label="AI 辅助">
        <UiCheckbox
          v-model="submitAiSuggestionDraft"
          :disabled="!improvementEditor.achievementResultId"
        >
          创建后同步生成 AI 改进建议草稿
        </UiCheckbox>
        <p v-if="!improvementEditor.achievementResultId" class="iwb-tab__ai-hint">
          需先关联达成度计算结果
        </p>
      </UiFormItem>
    </UiForm>
  </UiDrawer>

  <UiDrawer
    v-model:open="improvementDetailVisible"
    title="改进任务详情"
    :width="640"
    :hide-footer="true"
  >
    <UiEmpty
      v-if="!improvementDetailRecord && !improvementDetailLoading"
      description="暂无改进任务"
      size="sm"
    />
    <UiDescriptions v-if="improvementDetailRecord" :column="1" size="small" bordered>
      <UiDescriptionsItem label="编号">
        {{ improvementDetailRecord.taskCode }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="标题">
        {{ improvementDetailRecord.taskTitle }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="状态">
        <UiTag :tone="improvementStatusColor(improvementDetailRecord.status)" size="sm">
          {{ improvementStatusLabel(improvementDetailRecord.status) }}
        </UiTag>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="负责人">
        {{ improvementDetailRecord.ownerUserName }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="角色">
        {{ improvementDetailRecord.ownerRole || '未指定角色' }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="截止">
        {{ improvementDetailRecord.dueDate }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="问题概述">
        {{ improvementDetailRecord.problemSummary }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="改进措施">
        {{ improvementDetailRecord.proposedAction }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="进度备注">
        {{ improvementDetailRecord.progressRemark || '未填写进度备注' }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="整改证据">
        <ul
          v-if="improvementDetailRecord.rectificationEvidenceItems?.length"
          class="iwb-tab__evidence-list"
        >
          <li
            v-for="(item, index) in improvementDetailRecord.rectificationEvidenceItems"
            :key="`${improvementDetailRecord.id}-evidence-${index}`"
            class="iwb-tab__evidence-item"
          >
            {{ item }}
          </li>
        </ul>
        <span v-else>尚未上传整改证据</span>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="复评结论">
        {{ improvementDetailRecord.reviewDecision || '尚未复评' }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="复评意见">
        {{ improvementDetailRecord.reviewRemark || '尚未复评' }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="闭环时间">
        {{ improvementDetailRecord.closedTime || '未闭环' }}
      </UiDescriptionsItem>
    </UiDescriptions>
  </UiDrawer>
</template>

<style scoped lang="scss">
.iwb-tab {
  &__evidence-list {
    margin: 0;
    padding-left: 18px;
    color: var(--dp-text-secondary);
  }

  &__evidence-item {
    margin-bottom: 4px;
  }

  &__ai-hint {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--dp-text-tertiary);
  }
}
</style>
