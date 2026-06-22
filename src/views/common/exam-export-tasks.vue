<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <MarkExamSelect
            v-if="!isExamWorkspaceRoute"
            :selected-exam-id="selectedExamId"
            :exam-options="examOptions"
            :loading="examLoading"
            :searching="searching"
            :resolving-pinned="resolvingPinned"
            select-class="export-page__exam-select"
            placeholder="选择考试"
            @change="handleExamChange"
            @search="onExamSearch"
          />
          <UiTag v-if="counts.total > 0" tone="blue" size="sm">总 {{ counts.total }}</UiTag>
          <UiTag v-if="counts.pending > 0" tone="orange" size="sm">
            待执行 {{ counts.pending }}
          </UiTag>
          <UiTag v-if="counts.generating > 0" tone="purple" size="sm">
            生成中 {{ counts.generating }}
          </UiTag>
          <UiTag v-if="counts.completed > 0" tone="green" size="sm">
            已完成 {{ counts.completed }}
          </UiTag>
          <UiTag v-if="counts.failed > 0" tone="red" size="sm">失败 {{ counts.failed }}</UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" :disabled="!selectedExamId" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            创建导出任务
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="handleRefreshTasks"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择考试" class="export-page__empty" />

    <a-card v-else :bordered="false" class="detail-table-card info-card export-page__table-card">
      <template #title>
        <CloudDownloadOutlined />
        <span>当前考试导出任务</span>
      </template>
      <UiFilterBar
        :model-value="exportFilterForm"
        :fields="exportFilterFields"
        search-text="查询"
        @update:model-value="syncExportFilterForm"
        @search="handleTaskFilterSearch"
        @reset="handleTaskFilterReset"
      />



      <UiDataTable
        class="student-detail-table__data-table"
        :columns="columns"
        :data-source="filteredTasks"
        :loading="loading"
        v-model:current="taskPagination.pageNum"
        v-model:page-size="taskPagination.pageSize"
        :total="taskPagination.total"
        flat
        row-key="taskId"
        size="middle"
        @page-change="handleTaskPageChange"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'exportType'">
            {{ exportTypeLabel(filteredTasks[index].exportType) }}
          </template>
          <template v-else-if="column.key === 'exportScope'">
            {{ exportScopeLabel(filteredTasks[index].exportScope) }}
          </template>
          <template v-else-if="column.key === 'scopeSummary'">
            {{ filteredTasks[index].scopeSummary }}
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag :tone="statusTone(filteredTasks[index].taskStatus)" size="sm">
              {{ exportStatusLabel(filteredTasks[index].taskStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'fileSize'">
            {{ exportTaskFileSizeText(filteredTasks[index]) }}
          </template>
          <template v-else-if="column.key === 'errorMessage'">
            <a-tooltip
              v-if="exportTaskFailureMessageText(filteredTasks[index])"
              :title="exportTaskFailureMessageText(filteredTasks[index])"
            >
              <span class="error-text">{{
                clippedExportTaskFailureMessage(filteredTasks[index])
              }}</span>
            </a-tooltip>
            <span v-else class="hint-text">{{
              exportTaskProcessingText(filteredTasks[index])
            }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction
                v-if="canDownloadExportTask(filteredTasks[index])"
                tone="primary"
                :disabled="downloadingId === filteredTasks[index].taskId"
                @click="handleDownload(filteredTasks[index])"
              >
                下载
              </UiTextAction>
              <UiTextAction @click="openDetailDrawer(filteredTasks[index])">详情</UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </a-card>
  </StageWorkbenchShell>

  <!-- 创建导出任务 Modal -->
  <a-modal
    v-model:open="createModalOpen"
    title="创建导出任务"
    :destroy-on-close="true"
    :confirm-loading="creating"
    :ok-button-props="{ disabled: !createValid }"
    ok-text="创建"
    width="640px"
    @ok="handleCreate"
  >
    <a-form layout="vertical">
      <a-form-item label="导出类型" required>
        <a-radio-group v-model:value="createForm.exportType">
          <a-radio-button v-for="(label, code) in EXPORT_TYPE_LABEL" :key="code" :value="code">
            {{ label }}
          </a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="导出范围" required>
        <a-radio-group v-model:value="createForm.exportScope">
          <a-radio-button v-for="(label, code) in EXPORT_SCOPE_LABEL" :key="code" :value="code">
            {{ label }}
          </a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item v-if="createForm.exportScope === 'EXAM'" label="范围条件">
        <UiTag tone="blue" size="sm">整场考试</UiTag>
      </a-form-item>
      <a-form-item v-else-if="createForm.exportScope === 'CLASS'" label="选择班级" required>
        <a-select
          v-model:value="createForm.classIds"
          mode="multiple"
          placeholder="选择需要导出的班级"
          :options="classOptions"
          :loading="rosterLoading"
          show-search
          option-filter-prop="label"
        />
      </a-form-item>
      <a-form-item v-else-if="createForm.exportScope === 'QUESTION'" label="选择题目" required>
        <a-select
          v-model:value="createForm.questionTemplateIds"
          mode="multiple"
          placeholder="选择需要导出的题目"
          :options="questionOptions"
          :loading="questionLoading"
          show-search
          option-filter-prop="label"
        />
      </a-form-item>
      <a-form-item v-else-if="createForm.exportScope === 'STUDENT'" label="选择学生" required>
        <a-select
          v-model:value="createForm.studentUserIds"
          mode="multiple"
          placeholder="选择需要导出的学生"
          :options="studentOptions"
          :loading="rosterLoading"
          show-search
          option-filter-prop="label"
        />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- 详情抽屉 -->
  <a-drawer
    v-model:open="detailDrawerOpen"
    title="导出任务详情"
    width="540"
    :destroy-on-close="true"
  >
    <a-spin :spinning="detailLoading" tip="加载任务详情…">
      <a-descriptions v-if="detailTask" :column="1" bordered size="small">
        <a-descriptions-item label="当前考试">{{ formatTaskExam(detailTask) }}</a-descriptions-item>
        <a-descriptions-item label="类型">
          {{ exportTypeLabel(detailTask.exportType) }}
        </a-descriptions-item>
        <a-descriptions-item label="范围">
          {{ exportScopeLabel(detailTask.exportScope) }}
        </a-descriptions-item>
        <a-descriptions-item label="范围条件">
          {{ detailTask.scopeSummary }}
        </a-descriptions-item>
        <a-descriptions-item v-if="detailTask.scopeItems.length > 0" label="范围明细">
          <div class="scope-items">
            <UiTag
              v-for="item in detailTask.scopeItems"
              :key="`${item.scopeType}-${item.targetId}`"
              tone="blue"
              size="sm"
            >
              {{ formatScopeItem(item) }}
            </UiTag>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <UiTag :tone="statusTone(detailTask.taskStatus)" size="sm">
            {{ exportStatusLabel(detailTask.taskStatus) }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="文件名">
          {{ exportTaskFileNameText(detailTask) }}
        </a-descriptions-item>
        <a-descriptions-item label="文件大小">
          {{ exportTaskFileSizeText(detailTask) }}
        </a-descriptions-item>
        <a-descriptions-item label="开始时间">
          {{ exportTaskStartedTimeText(detailTask) }}
        </a-descriptions-item>
        <a-descriptions-item label="完成时间">
          {{ exportTaskCompletedTimeText(detailTask) }}
        </a-descriptions-item>
        <a-descriptions-item label="导出处理说明">
          <span v-if="exportTaskFailureMessageText(detailTask)" class="error-text">
            {{ exportTaskFailureMessageText(detailTask) }}
          </span>
          <span v-else class="hint-text">{{ exportTaskProcessingText(detailTask) }}</span>
        </a-descriptions-item>
      </a-descriptions>
      <UiEmpty v-if="detailError" description="暂无数据" />
    </a-spin>
  </a-drawer>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExportCreateRequest,
  ExportScopeCode,
  ExportScopeItemVO,
  ExportTaskCompletedVO,
  ExportTaskStatusCode,
  ExportTaskVO,
  ExportTypeCode,
} from '@/apis/mark/exam-export'
import type { ExamQuestionTemplateVO } from '@/apis/mark/exam-template'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import CloudDownloadOutlined from '@ant-design/icons-vue/CloudDownloadOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  createExportTask,
  EXPORT_SCOPE_LABEL,
  EXPORT_STATUS_CODES,
  EXPORT_STATUS_LABEL,
  EXPORT_STATUS_TONE,
  EXPORT_TYPE_CODES,
  EXPORT_TYPE_LABEL,
  getExportTask,
  listExportTasks,
} from '@/apis/mark/exam-export'
import { getExamTemplate } from '@/apis/mark/exam-template'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkExamRoster } from '@/composables/useMarkExamRoster'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamExportTasks' })

const route = useRoute()
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')
const { refreshSnapshot } = useWorkspaceExamId()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  onExamSearch,
  searching,
  resolvingPinned,
  init: initExamSelector,
} = useMarkExamContext()

const {
  classOptions,
  studentOptions,
  loading: rosterLoading,
  load: loadRoster,
  reset: resetRoster,
} = useMarkExamRoster()

const tasks = ref<ExportTaskVO[]>([])
const loading = ref(false)
const downloadingId = ref<string | undefined>(undefined)
const questionOptions = ref<Array<{ value: string, label: string }>>([])
const questionLoading = ref(false)
const taskPagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})

const exportFilterForm = reactive<{
  statusFilter?: ExportTaskStatusCode
  typeFilter?: ExportTypeCode
}>({
  statusFilter: undefined,
  typeFilter: undefined,
})

function syncExportFilterForm(next: Record<string, unknown>): void {
  Object.assign(exportFilterForm, next)
}

const exportFilterFields: FilterField[] = [
  {
    key: 'statusFilter',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: EXPORT_STATUS_CODES.map((value) => ({
      value,
      label: strictEnumLabel(EXPORT_STATUS_LABEL, value, '导出任务状态'),
    })),
  },
  {
    key: 'typeFilter',
    type: 'select',
    placeholder: '全部类型',
    allowClear: true,
    width: 160,
    options: EXPORT_TYPE_CODES.map((value) => ({
      value,
      label: strictEnumLabel(EXPORT_TYPE_LABEL, value, '导出类型'),
    })),
  },
]

const filteredTasks = computed(() =>
  tasks.value.filter(
    (t) =>
      (!exportFilterForm.statusFilter || t.taskStatus === exportFilterForm.statusFilter)
      && (!exportFilterForm.typeFilter || t.exportType === exportFilterForm.typeFilter),
  ),
)

function handleTaskFilterSearch(): void {
  taskPagination.pageNum = 1
}

function handleTaskFilterReset(): void {
  taskPagination.pageNum = 1
}

const counts = computed(() => ({
  total: tasks.value.length,
  pending: tasks.value.filter((t) => t.taskStatus === 'PENDING').length,
  generating: tasks.value.filter((t) => t.taskStatus === 'GENERATING').length,
  completed: tasks.value.filter((t) => t.taskStatus === 'COMPLETED').length,
  failed: tasks.value.filter((t) => t.taskStatus === 'FAILED').length,
}))

const columns: ColumnType<ExportTaskVO>[] = [
  { title: '类型', key: 'exportType', width: 120 },
  { title: '范围', key: 'exportScope', width: 100 },
  { title: '范围条件', key: 'scopeSummary', width: 160 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '文件名', key: 'fileName', dataIndex: 'fileName', width: 200, ellipsis: true },
  { title: '文件大小', key: 'fileSize', width: 100 },
  { title: '开始时间', key: 'startedTime', dataIndex: 'startedTime', width: 160 },
  { title: '完成时间', key: 'completedTime', dataIndex: 'completedTime', width: 160 },
  { title: '导出处理说明', key: 'errorMessage', width: 220 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

function statusTone(status: ExportTaskStatusCode): BadgeTone {
  return strictEnumTone(EXPORT_STATUS_TONE, status, '导出任务状态')
}

function exportTypeLabel(code: ExportTypeCode): string {
  return strictEnumLabel(EXPORT_TYPE_LABEL, code, '导出类型')
}

function exportScopeLabel(code: ExportScopeCode): string {
  return strictEnumLabel(EXPORT_SCOPE_LABEL, code, '导出范围')
}

function exportStatusLabel(code: ExportTaskStatusCode): string {
  return strictEnumLabel(EXPORT_STATUS_LABEL, code, '导出任务状态')
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function exportTaskFileNameText(task: ExportTaskVO): string {
  if (task.taskStatus === 'COMPLETED') return task.fileName
  if (task.taskStatus === 'FAILED') return '导出失败，未生成文件'
  if (task.taskStatus === 'GENERATING') return '文件生成中'
  return '等待任务执行'
}

function exportTaskFileSizeText(task: ExportTaskVO): string {
  if (task.taskStatus === 'COMPLETED') {
    const fileSize = Number(task.fileSize)
    if (!Number.isFinite(fileSize)) {
      return '文件大小异常'
    }
    return formatBytes(fileSize)
  }
  if (task.taskStatus === 'FAILED') return '导出失败，未生成文件'
  if (task.taskStatus === 'GENERATING') return '文件生成中'
  return '等待任务执行'
}

function exportTaskStartedTimeText(task: ExportTaskVO): string {
  if (task.taskStatus === 'PENDING') return '等待任务执行'
  return task.startedTime
}

function exportTaskCompletedTimeText(task: ExportTaskVO): string {
  if (task.taskStatus === 'COMPLETED') return task.completedTime
  if (task.taskStatus === 'FAILED') return '导出失败，未完成'
  if (task.taskStatus === 'GENERATING') return '生成中，未完成'
  return '等待任务执行'
}

function exportTaskProcessingText(task: ExportTaskVO): string {
  if (task.taskStatus === 'FAILED') return task.errorMessage
  if (task.taskStatus === 'COMPLETED') return '导出完成'
  if (task.taskStatus === 'GENERATING') return '文件生成中'
  return '等待任务执行'
}

function exportTaskFailureMessageText(task: ExportTaskVO): string | undefined {
  if (task.taskStatus !== 'FAILED') return undefined
  return getUserProcessFailureMessage(task.errorMessage, '导出任务未完成，请稍后重试或重新发起导出')
}

function clippedExportTaskFailureMessage(task: ExportTaskVO): string {
  const messageText
    = exportTaskFailureMessageText(task) ?? '导出任务未完成，请稍后重试或重新发起导出'
  return messageText.length > 24 ? `${messageText.slice(0, 24)}…` : messageText
}

function canDownloadExportTask(task: ExportTaskVO): task is ExportTaskCompletedVO {
  return task.taskStatus === 'COMPLETED'
}

async function loadTasks(options?: { quiet?: boolean }): Promise<void> {
  if (!selectedExamId.value) {
    tasks.value = []
    taskPagination.total = 0
    syncExportPolling()
    return
  }
  if (!options?.quiet) {
    loading.value = true
  }
  try {
    const page = await listExportTasks({
      examId: selectedExamId.value,
      pageNum: taskPagination.pageNum,
      pageSize: taskPagination.pageSize,
    })
    tasks.value = readPageList(page, '导出任务加载失败，请稍后重试')
    taskPagination.pageNum = page.pageNum
    taskPagination.pageSize = page.pageSize
    taskPagination.total = readPageTotal(page, '导出任务加载失败，请稍后重试')
    await refreshOpenDetailIfNeeded()
    syncExportPolling()
  } catch (error) {
    showUserError(error, '导出任务加载失败')
    if (!options?.quiet) {
      showUserError(error, '导出任务加载失败')
    }
  } finally {
    if (!options?.quiet) {
      loading.value = false
    }
  }
}

function handleRefreshTasks(): void {
  void loadTasks()
}

let exportPollTimer: ReturnType<typeof setInterval> | null = null

function syncExportPolling(): void {
  const shouldPoll = tasks.value.some(
    (task) => task.taskStatus === 'PENDING' || task.taskStatus === 'GENERATING',
  )
  if (shouldPoll && !exportPollTimer) {
    exportPollTimer = setInterval(() => {
      void loadTasks({ quiet: true })
    }, 3000)
  } else if (!shouldPoll && exportPollTimer) {
    clearInterval(exportPollTimer)
    exportPollTimer = null
  }
}

async function refreshOpenDetailIfNeeded(): Promise<void> {
  if (!detailDrawerOpen.value || !detailTask.value?.taskId) {
    return
  }
  const taskId = detailTask.value.taskId
  try {
    const fresh = await getExportTask({ taskId })
    if (!detailDrawerOpen.value || detailTask.value?.taskId !== taskId) {
      return
    }
    detailTask.value = fresh
  } catch {
    // 轮询刷新详情失败时不打断列表轮询
  }
}

function handleTaskPageChange(page: { current: number, pageSize: number }): void {
  taskPagination.pageNum = page.current
  taskPagination.pageSize = page.pageSize
  void loadTasks()
}

function handleExamChange(value: SelectValue): void {
  onExamChange(value)
  if (selectedExamId.value) {
    taskPagination.pageNum = 1
    void loadTasks()
  } else {
    tasks.value = []
    taskPagination.total = 0
  }
}

// ─── 创建导出 Modal ─────────────────────────────

const createModalOpen = ref(false)
const creating = ref(false)
const createForm = reactive<{
  exportType: ExportTypeCode
  exportScope: ExportScopeCode
  classIds: string[]
  questionTemplateIds: string[]
  studentUserIds: string[]
}>({
  exportType: 'SCORE_EXCEL',
  exportScope: 'EXAM',
  classIds: [],
  questionTemplateIds: [],
  studentUserIds: [],
})

const createValid = computed(() => {
  if (!selectedExamId.value || !createForm.exportType || !createForm.exportScope) return false
  if (createForm.exportScope === 'CLASS') return createForm.classIds.length > 0
  if (createForm.exportScope === 'QUESTION') return createForm.questionTemplateIds.length > 0
  if (createForm.exportScope === 'STUDENT') return createForm.studentUserIds.length > 0
  return true
})

function resetCreateForm(): void {
  createForm.exportType = 'SCORE_EXCEL'
  createForm.exportScope = 'EXAM'
  createForm.classIds = []
  createForm.questionTemplateIds = []
  createForm.studentUserIds = []
}

async function loadQuestionOptions(examId: string | undefined): Promise<void> {
  if (!examId) {
    questionOptions.value = []
    return
  }
  questionLoading.value = true
  try {
    const template = await getExamTemplate(examId)
    questionOptions.value = [...template.questions]
      .sort(
        (left: ExamQuestionTemplateVO, right: ExamQuestionTemplateVO) =>
          (left.sortNo ?? 0) - (right.sortNo ?? 0),
      )
      .map((question) => ({
        value: question.questionTemplateId,
        label: `第 ${question.questionNo} 题 · ${question.fullScore} 分`,
      }))
  } catch (error) {
    questionOptions.value = []
    showUserError(error, '题目模板加载失败')
  } finally {
    questionLoading.value = false
  }
}

async function openCreateModal(): Promise<void> {
  resetCreateForm()
  createModalOpen.value = true
  if (selectedExamId.value) {
    await Promise.all([loadRoster(selectedExamId.value), loadQuestionOptions(selectedExamId.value)])
  }
}

async function handleCreate(): Promise<void> {
  if (!selectedExamId.value || !createValid.value) return
  creating.value = true
  try {
    const request: ExportCreateRequest = {
      examId: selectedExamId.value,
      exportType: createForm.exportType,
      exportScope: createForm.exportScope,
    }
    if (createForm.exportScope === 'CLASS') {
      request.scopeCondition = { classIds: createForm.classIds }
    } else if (createForm.exportScope === 'QUESTION') {
      request.scopeCondition = { questionTemplateIds: createForm.questionTemplateIds }
    } else if (createForm.exportScope === 'STUDENT') {
      request.scopeCondition = { studentUserIds: createForm.studentUserIds }
    }
    const createdTask = await createExportTask(request)
    if (!createdTask.taskId) {
      showUserError(null, '导出任务创建失败')
      return
    }
    message.success('已创建导出任务，系统正在生成文件')
    createModalOpen.value = false
    await loadTasks()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '导出任务创建失败')
  } finally {
    creating.value = false
  }
}

// ─── 详情抽屉 ─────────────────────────────────

const detailDrawerOpen = ref(false)
const detailTask = ref<ExportTaskVO | null>(null)
const detailLoading = ref(false)
const detailError = ref<Error | null>(null)
/** 当前正在获取详情的任务 ID，用于关闭后重开另一条时覆盖 */
let pendingDetailTaskId: string | null = null

async function openDetailDrawer(record: ExportTaskVO): Promise<void> {
  detailTask.value = null
  detailError.value = null
  detailDrawerOpen.value = true
  pendingDetailTaskId = record.taskId

  detailLoading.value = true
  try {
    const fresh = await getExportTask({ taskId: record.taskId })
    // 抽屉关闭或已切换到另一条任务时丢弃过期响应
    if (pendingDetailTaskId !== record.taskId) {
      return
    }
    detailTask.value = fresh
  } catch (error) {
    if (pendingDetailTaskId !== record.taskId) {
      return
    }
    detailError.value = toUserError(error, '任务详情加载失败')
  } finally {
    if (pendingDetailTaskId === record.taskId) {
      detailLoading.value = false
    }
  }
}

function formatTaskExam(task: ExportTaskVO): string {
  return task.examNo ? `${task.examName}（${task.examNo}）` : task.examName
}

function formatScopeItem(item: ExportScopeItemVO): string {
  return item.targetCode ? `${item.targetName}（${item.targetCode}）` : item.targetName
}

// ─── 下载 ─────────────────────────────────────

async function handleDownload(record: ExportTaskVO): Promise<void> {
  if (!canDownloadExportTask(record)) {
    message.warning('该任务尚未生成文件')
    return
  }
  downloadingId.value = record.taskId
  try {
    const blobResp = await downloadFile({ nodeId: record.fileId })
    const blob = blobResp.data
    if (!blob) {
      message.error('导出文件暂不可下载，请稍后重试')
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = record.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    showUserError(error, '导出文件下载失败')
  } finally {
    downloadingId.value = undefined
  }
}

watch(
  selectedExamId,
  (value) => {
    if (value) {
      taskPagination.pageNum = 1
      void loadTasks()
    } else {
      tasks.value = []
      taskPagination.total = 0
      resetRoster()
      questionOptions.value = []
    }
  },
  { immediate: true },
)

watch(
  () => createForm.exportScope,
  () => {
    createForm.classIds = []
    createForm.questionTemplateIds = []
    createForm.studentUserIds = []
  },
)

onMounted(async () => {
  await initExamSelector()
})

onActivated(() => {
  if (selectedExamId.value) {
    void loadTasks()
  }
})

onBeforeUnmount(() => {
  if (exportPollTimer) {
    clearInterval(exportPollTimer)
    exportPollTimer = null
  }
})
</script>

<style lang="scss" scoped>
.export-page {
  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.empty-block {
  margin-top: 80px;
}

.hint-text {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.error-text {
  color: #d4380d;
  font-size: 12px;
}

.scope-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
