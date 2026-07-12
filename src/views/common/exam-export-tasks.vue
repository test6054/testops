<template>
  <StageWorkbenchShell class="export-page">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="isJourneyChrome ? contextBarTitle : '导出任务'"
        :subtitle="isJourneyChrome ? contextBarSubtitle : '考后归档'"
      >
        <template #status>
          <UiTag
            v-if="isJourneyChrome && chromeExamStatusLabel"
            :tone="chromeExamStatusTone"
            size="sm"
          >
            {{ chromeExamStatusLabel }}
          </UiTag>
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
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand variant="tiles" compact :metrics="exportSignalMetrics" />
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择考试" class="export-page__empty" />

    <UiEmpty
      v-else-if="loadFailed"
      description="导出任务加载失败"
      action-label="重试"
      class="export-page__empty"
      @action="() => loadTasks()"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav v-if="isExamWorkspaceRoute" />

      <UiAlertStrip
        v-if="layoutRoiGap > 0"
        tone="warning"
        class="export-page__roi-gap-strip"
        :title="`制卷识别区域未就绪（${layoutRoiGap} 道题）`"
        description="按题导出仅可选择已配置识别区域的题目；请先在制卷工作台补全 ROI。"
      />

      <WorkbenchSurfaceCard flush class="export-page__table-card">
        <template #head>
          <div class="export-page__card-head">
            <span class="export-page__flow-hint">{{ EXPORT_FLOW_HINT }}</span>
            <span class="export-page__card-title">
              <CloudDownloadOutlined />
              当前考试导出任务
            </span>
            <UiButton size="sm" @click="openCreateModal">
              <template #icon><PlusOutlined /></template>
              创建导出任务
            </UiButton>
          </div>
        </template>
        <template #toolbar>
          <UiAlertStrip
            v-if="activeTaskFilterAutoSync"
            tone="warning"
            title="进行中导出任务已同步到列表"
            :description="activeTaskFilterAutoSyncText"
            dense
            class="export-page__active-sync-strip"
            @close="activeTaskFilterAutoSync = false"
          />
          <UiFilterBar
            v-model="exportFilterForm"
            :fields="exportFilterFields"
            variant="plain"
            search-text="查询"
            @search="handleTaskFilterSearch"
            @reset="handleTaskFilterReset"
          />
        </template>

        <UiDataTable
          v-model:current="taskPagination.pageNum"
          v-model:page-size="taskPagination.pageSize"
          pagination-mode="server"
          :columns="columns"
          :data-source="tasks"
          :loading="loading"
          :total="taskPagination.total"
          flat
          row-key="taskId"
          size="middle"
          @page-change="handleTaskPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'exportType'">
              {{ exportTypeLabel(record.exportType) }}
            </template>
            <template v-else-if="column.key === 'exportScope'">
              {{ exportScopeLabel(record.exportScope) }}
            </template>
            <template v-else-if="column.key === 'scopeSummary'">
              {{ record.scopeSummary }}
            </template>
            <template v-else-if="column.key === 'taskStatus'">
              <UiTag :tone="statusTone(record.taskStatus)" size="sm">
                {{ exportStatusLabel(record.taskStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'fileSize'">
              {{ exportTaskFileSizeText(record) }}
            </template>
            <template v-else-if="column.key === 'errorMessage'">
              <a-tooltip
                v-if="exportTaskFailureMessageText(record)"
                :title="exportTaskFailureMessageText(record)"
              >
                <span class="error-text">{{ clippedExportTaskFailureMessage(record) }}</span>
              </a-tooltip>
              <span v-else class="hint-text">{{ exportTaskProcessingText(record) }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildExportTaskActions(record)"
                split
                @action="(key) => handleExportTaskAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>

  <!-- 创建导出任务 Modal -->
  <UiDialog
    v-model:open="createModalOpen"
    title="创建导出任务"
    :width="640"
    :confirm-loading="creating"
    ok-text="创建"
    @ok="handleCreate"
  >
    <template #footer>
      <UiButton variant="outline" @click="createModalOpen = false">取消</UiButton>
      <UiButton :loading="creating" :disabled="!createValid" @click="handleCreate">创建</UiButton>
    </template>
    <a-form layout="vertical">
      <a-form-item label="导出类型" required>
        <a-radio-group v-model:value="createForm.exportType">
          <a-radio-button
            v-for="option in exportTypeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="导出范围" required>
        <a-radio-group v-model:value="createForm.exportScope">
          <a-radio-button
            v-for="option in exportScopeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item v-if="createForm.exportScope === ExportScopeCode.EXAM" label="范围条件">
        <UiTag tone="blue" size="sm">整场考试</UiTag>
      </a-form-item>
      <a-form-item
        v-else-if="createForm.exportScope === ExportScopeCode.CLASS"
        label="选择班级"
        required
      >
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
      <a-form-item
        v-else-if="createForm.exportScope === ExportScopeCode.QUESTION"
        label="选择题目"
        required
      >
        <a-select
          v-model:value="createForm.layoutQuestionIds"
          mode="multiple"
          placeholder="选择需要导出的题目"
          :options="questionOptions"
          :loading="questionLoading"
          show-search
          option-filter-prop="label"
        />
      </a-form-item>
      <a-form-item
        v-else-if="createForm.exportScope === ExportScopeCode.STUDENT"
        label="选择学生"
        required
      >
        <a-select
          v-model:value="createForm.studentUserIds"
          mode="multiple"
          placeholder="选择需要导出的学生"
          :options="studentOptions"
          :loading="rosterLoading"
          show-search
          option-filter-prop="label"
          :filter-option="false"
          @search="(keyword: string) => searchStudents(keyword)"
        />
      </a-form-item>
    </a-form>
  </UiDialog>

  <!-- 详情抽屉 -->
  <UiDrawer v-model:open="detailDrawerOpen" title="导出任务详情" :width="540" hide-footer>
    <UiSkeletonState v-if="detailLoading" variant="card" compact />
    <a-descriptions v-else-if="detailTask" :column="1" bordered size="small">
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
    <UiEmpty v-else-if="detailError" description="当前没有可展示的内容" />
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExportCreateRequest,
  ExportScopeItemResponse,
  ExportTaskQueryRequest,
  ExportTaskResponse,
  ExportTaskStatusSummaryResponse,
} from '@/apis/mark/exam-export'
import type { ExamTemplateResponse } from '@/apis/mark/exam-layout-question'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import CloudDownloadOutlined from '@ant-design/icons-vue/CloudDownloadOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ALL_EXPORT_SCOPE_CODES,
  ALL_EXPORT_TASK_STATUS_CODES,
  ALL_EXPORT_TYPE_CODES,
  createExportTask,
  EXPORT_FLOW_HINT,
  EXPORT_STATUS_TONE,
  ExportScopeCode,
  ExportScopeDescription,
  ExportTaskStatusCode,
  ExportTaskStatusDescription,
  ExportTypeCode,
  ExportTypeDescription,
  getExportTask,
  getExportTaskStatusSummary,
  listExportTasks,
} from '@/apis/mark/exam-export'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useOptionalExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkExamRoster } from '@/composables/useMarkExamRoster'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { buildExamLayoutQuestionOptions } from '@/utils/format-exam-layout-question-summary'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamExportTasks' })

const route = useRoute()
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')
const { refreshSnapshot } = useWorkspaceExamId()

const {
  isJourneyChrome,
  contextBarTitle,
  contextBarSubtitle,
  examStatusLabel: chromeExamStatusLabel,
  examStatusTone: chromeExamStatusTone,
} = useOptionalExamJourneyContextBar('导出任务')

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
  searchStudents,
  reset: resetRoster,
} = useMarkExamRoster()

const tasks = ref<ExportTaskResponse[]>([])
const loading = ref(false)
const loadFailed = ref(false)
const downloadingId = ref<string | undefined>(undefined)
const questionOptions = ref<
  Array<{ value: string, label: string, disabled?: boolean, title?: string }>
>([])
const layoutSummary = ref<ExamTemplateResponse | null>(null)
const layoutRoiGap = computed(() => {
  if (!layoutSummary.value?.configured) {
    return 0
  }
  const total = layoutSummary.value.totalQuestionCount ?? 0
  const ready = layoutSummary.value.roiReadyQuestionCount ?? 0
  return Math.max(0, total - ready)
})
const questionLoading = ref(false)
const taskPagination = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const exportFilterForm = reactive<{
  statusFilter?: ExportTaskStatusCode
  typeFilter?: ExportTypeCode
}>({
  statusFilter: undefined,
  typeFilter: undefined,
})

const counts = reactive({
  total: 0,
  pending: 0,
  generating: 0,
  completed: 0,
  failed: 0,
})

const exportSignalMetrics = computed((): SignalMetric[] => [
  { key: 'total', label: '总任务', value: counts.total, unit: '个', tone: 'blue' },
  {
    key: 'pending',
    label: '待执行',
    value: counts.pending,
    unit: '个',
    tone: counts.pending > 0 ? 'orange' : 'gray',
  },
  {
    key: 'generating',
    label: '生成中',
    value: counts.generating,
    unit: '个',
    tone: counts.generating > 0 ? 'blue' : 'gray',
  },
  {
    key: 'completed',
    label: '已完成',
    value: counts.completed,
    unit: '个',
    tone: counts.completed > 0 ? 'green' : 'gray',
  },
  {
    key: 'failed',
    label: '失败',
    value: counts.failed,
    unit: '个',
    tone: counts.failed > 0 ? 'red' : 'gray',
  },
])

function resetStatusCounts(): void {
  counts.total = 0
  counts.pending = 0
  counts.generating = 0
  counts.completed = 0
  counts.failed = 0
}

const exportFilterFields: FilterField[] = [
  {
    key: 'statusFilter',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: ALL_EXPORT_TASK_STATUS_CODES.map((value) => ({
      value,
      label: strictEnumLabel(ExportTaskStatusDescription, value, '导出任务状态'),
    })),
  },
  {
    key: 'typeFilter',
    type: 'select',
    placeholder: '全部类型',
    allowClear: true,
    width: 160,
    options: ALL_EXPORT_TYPE_CODES.map((value) => ({
      value,
      label: strictEnumLabel(ExportTypeDescription, value, '导出类型'),
    })),
  },
]

const activeTaskFilterAutoSync = ref(false)

const activeTaskFilterAutoSyncText = computed(() => {
  const parts: string[] = []
  if (counts.pending > 0) {
    parts.push(`待执行 ${counts.pending}`)
  }
  if (counts.generating > 0) {
    parts.push(`生成中 ${counts.generating}`)
  }
  const progressText = parts.length > 0 ? parts.join('，') : '进行中'
  return `原筛选条件会隐藏进行中的任务，已自动取消以便跟踪进度（${progressText}）`
})

function buildExportTaskListRequest(
  pageNum = taskPagination.pageNum,
): ExportTaskQueryRequest | null {
  if (!selectedExamId.value) {
    return null
  }
  return {
    examId: selectedExamId.value,
    pageNum,
    pageSize: taskPagination.pageSize,
    ...(exportFilterForm.statusFilter ? { taskStatus: exportFilterForm.statusFilter } : {}),
    ...(exportFilterForm.typeFilter ? { exportType: exportFilterForm.typeFilter } : {}),
  }
}

/** 当前状态筛选是否会挡住待执行 / 生成中任务。 */
function activeTasksHiddenByStatusFilter(): boolean {
  const statusFilter = exportFilterForm.statusFilter
  if (!statusFilter) {
    return false
  }
  if (counts.pending > 0 && statusFilter !== ExportTaskStatusCode.PENDING) {
    return true
  }
  return counts.generating > 0 && statusFilter !== ExportTaskStatusCode.GENERATING
}

function listHasActiveExportTask(taskList: ExportTaskResponse[]): boolean {
  return taskList.some(
    (task) =>
      task.taskStatus === ExportTaskStatusCode.PENDING
      || task.taskStatus === ExportTaskStatusCode.GENERATING,
  )
}

/** 无筛选时若全局仍有进行中任务但当前页看不到，应回到第 1 页。 */
function shouldReloadFirstPageForActiveTasks(taskList: ExportTaskResponse[]): boolean {
  if (counts.pending === 0 && counts.generating === 0) {
    return false
  }
  if (exportFilterForm.statusFilter || exportFilterForm.typeFilter) {
    return false
  }
  if (taskPagination.pageNum === 1) {
    return false
  }
  return !listHasActiveExportTask(taskList)
}

/** 类型筛选是否会挡住当前进行中的导出任务。 */
async function typeFilterHidesActiveTasks(examId: string): Promise<boolean> {
  const typeFilter = exportFilterForm.typeFilter
  if (!typeFilter || (counts.pending === 0 && counts.generating === 0)) {
    return false
  }
  const probeStatuses: ExportTaskStatusCode[] = []
  if (counts.pending > 0) {
    probeStatuses.push(ExportTaskStatusCode.PENDING)
  }
  if (counts.generating > 0) {
    probeStatuses.push(ExportTaskStatusCode.GENERATING)
  }
  for (const taskStatus of probeStatuses) {
    const page = await listExportTasks({
      examId,
      pageNum: 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
      taskStatus,
    })
    const activeTasks = page.list
    if (activeTasks.some((task) => task.exportType !== typeFilter)) {
      return true
    }
  }
  return false
}

/** 全局仍有进行中任务时，自动解除会挡住它们的筛选条件。 */
async function reconcileExportFiltersForActiveTasks(examId: string): Promise<void> {
  if (counts.pending === 0 && counts.generating === 0) {
    return
  }
  let changed = false
  if (activeTasksHiddenByStatusFilter()) {
    exportFilterForm.statusFilter = undefined
    changed = true
  }
  if (exportFilterForm.typeFilter && (await typeFilterHidesActiveTasks(examId))) {
    exportFilterForm.typeFilter = undefined
    changed = true
  }
  if (changed) {
    taskPagination.pageNum = 1
    activeTaskFilterAutoSync.value = true
  }
}

function applyStatusSummary(summary: ExportTaskStatusSummaryResponse): void {
  counts.total = summary.totalCount
  counts.pending = summary.pendingCount
  counts.generating = summary.generatingCount
  counts.completed = summary.completedCount
  counts.failed = summary.failedCount
}

async function loadStatusCounts(examId: string): Promise<void> {
  try {
    applyStatusSummary(await getExportTaskStatusSummary(examId))
  } catch {
    resetStatusCounts()
  }
}

function handleTaskFilterSearch(): void {
  activeTaskFilterAutoSync.value = false
  taskPagination.pageNum = 1
  void loadTasks()
}

function handleTaskFilterReset(): void {
  activeTaskFilterAutoSync.value = false
  exportFilterForm.statusFilter = undefined
  exportFilterForm.typeFilter = undefined
  taskPagination.pageNum = 1
  void loadTasks()
}

function handleTaskPageChange(page: { current: number, pageSize: number }): void {
  taskPagination.pageNum = page.current
  taskPagination.pageSize = page.pageSize
  void loadTasks()
}

const columns: ColumnType<ExportTaskResponse>[] = [
  { title: '类型', key: 'exportType', width: 120, fixed: 'left' },
  { title: '范围', key: 'exportScope', width: 100 },
  { title: '范围条件', key: 'scopeSummary', width: 160 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '文件名', key: 'fileName', dataIndex: 'fileName', width: 200, ellipsis: true },
  { title: '文件大小', key: 'fileSize', width: 100 },
  { title: '开始时间', key: 'startedTime', dataIndex: 'startedTime', width: 160 },
  { title: '完成时间', key: 'completedTime', dataIndex: 'completedTime', width: 160 },
  { title: '导出处理说明', key: 'errorMessage', width: 220 },
  { title: '操作', key: 'actions', width: 180 },
]

function statusTone(status: ExportTaskStatusCode): BadgeTone {
  return strictEnumTone(EXPORT_STATUS_TONE, status, '导出任务状态')
}

const exportTypeOptions = ALL_EXPORT_TYPE_CODES.map((code) => ({
  value: code,
  label: exportTypeLabel(code),
}))

const exportScopeOptions = ALL_EXPORT_SCOPE_CODES.map((code) => ({
  value: code,
  label: exportScopeLabel(code),
}))

function exportTypeLabel(code: ExportTypeCode): string {
  return strictEnumLabel(ExportTypeDescription, code, '导出类型')
}

function exportScopeLabel(code: ExportScopeCode): string {
  return strictEnumLabel(ExportScopeDescription, code, '导出范围')
}

function exportStatusLabel(code: ExportTaskStatusCode): string {
  return strictEnumLabel(ExportTaskStatusDescription, code, '导出任务状态')
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function exportTaskFileNameText(task: ExportTaskResponse): string {
  if (task.taskStatus === ExportTaskStatusCode.COMPLETED) return task.fileName || '导出文件'
  if (task.taskStatus === ExportTaskStatusCode.FAILED) return '导出失败，未生成文件'
  if (task.taskStatus === ExportTaskStatusCode.GENERATING) return '文件生成中'
  return '等待任务执行'
}

function exportTaskFileSizeText(task: ExportTaskResponse): string {
  if (task.taskStatus === ExportTaskStatusCode.COMPLETED) {
    const fileSize = Number(task.fileSize)
    if (!Number.isFinite(fileSize)) {
      return '文件大小异常'
    }
    return formatBytes(fileSize)
  }
  if (task.taskStatus === ExportTaskStatusCode.FAILED) return '导出失败，未生成文件'
  if (task.taskStatus === ExportTaskStatusCode.GENERATING) return '文件生成中'
  return '等待任务执行'
}

function exportTaskStartedTimeText(task: ExportTaskResponse): string {
  if (task.taskStatus === ExportTaskStatusCode.PENDING) return '等待任务执行'
  return task.startedTime || '—'
}

function exportTaskCompletedTimeText(task: ExportTaskResponse): string {
  if (task.taskStatus === ExportTaskStatusCode.COMPLETED) return task.completedTime || '—'
  if (task.taskStatus === ExportTaskStatusCode.FAILED) return '导出失败，未完成'
  if (task.taskStatus === ExportTaskStatusCode.GENERATING) return '生成中，未完成'
  return '等待任务执行'
}

function exportTaskProcessingText(task: ExportTaskResponse): string {
  if (task.taskStatus === ExportTaskStatusCode.FAILED) return task.errorMessage || '导出失败'
  if (task.taskStatus === ExportTaskStatusCode.COMPLETED) return '导出完成'
  if (task.taskStatus === ExportTaskStatusCode.GENERATING) return '文件生成中'
  return '等待任务执行'
}

function exportTaskFailureMessageText(task: ExportTaskResponse): string | undefined {
  if (task.taskStatus !== ExportTaskStatusCode.FAILED) return undefined
  return getUserProcessFailureMessage(
    task.errorMessage,
    '导出任务未完成，请查看失败原因后重新发起导出',
  )
}

function clippedExportTaskFailureMessage(task: ExportTaskResponse): string {
  const messageText
    = exportTaskFailureMessageText(task) ?? '导出任务未完成，请查看失败原因后重新发起导出'
  return messageText.length > 24 ? `${messageText.slice(0, 24)}…` : messageText
}

function canDownloadExportTask(task: ExportTaskResponse): boolean {
  return task.taskStatus === ExportTaskStatusCode.COMPLETED
}

function buildExportTaskActions(record: ExportTaskResponse): UiTableRowActionItem[] {
  return [
    {
      key: 'download',
      label: '下载',
      tone: 'primary',
      hidden: !canDownloadExportTask(record),
      disabled: downloadingId.value === record.taskId,
    },
    { key: 'detail', label: '详情' },
  ]
}

function handleExportTaskAction(key: string, record: ExportTaskResponse): void {
  if (key === 'download') {
    void handleDownload(record)
  } else if (key === 'detail') {
    void openDetailDrawer(record)
  }
}

async function loadTasks(options?: { quiet?: boolean }): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    tasks.value = []
    taskPagination.total = 0
    resetStatusCounts()
    activeTaskFilterAutoSync.value = false
    syncExportPolling()
    return
  }
  if (!options?.quiet) {
    loading.value = true
    loadFailed.value = false
  }
  try {
    await loadStatusCounts(examId)
    if (counts.pending === 0 && counts.generating === 0) {
      activeTaskFilterAutoSync.value = false
    }
    await reconcileExportFiltersForActiveTasks(examId)
    const request = buildExportTaskListRequest()
    if (!request) {
      return
    }
    let page = await listExportTasks(request)
    let taskList = page.list
    if (shouldReloadFirstPageForActiveTasks(taskList)) {
      taskPagination.pageNum = 1
      const firstPageRequest = buildExportTaskListRequest(1)
      if (firstPageRequest) {
        page = await listExportTasks(firstPageRequest)
        taskList = page.list
      }
    }
    tasks.value = taskList
    taskPagination.total = page.total
    await refreshOpenDetailIfNeeded()
    syncExportPolling()
  } catch (error) {
    if (!options?.quiet) {
      tasks.value = []
      taskPagination.total = 0
      resetStatusCounts()
      loadFailed.value = true
      showUserError(error, '导出任务加载失败')
    }
  } finally {
    if (!options?.quiet) {
      loading.value = false
    }
  }
}

let exportPollTimer: ReturnType<typeof setInterval> | null = null

function syncExportPolling(): void {
  const shouldPoll = counts.pending > 0 || counts.generating > 0
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

function handleExamChange(value: SelectValue): void {
  onExamChange(value)
}

// ─── 创建导出 Modal ─────────────────────────────

const createModalOpen = ref(false)
const creating = ref(false)
const createForm = reactive<{
  exportType: ExportTypeCode
  exportScope: ExportScopeCode
  classIds: string[]
  layoutQuestionIds: string[]
  studentUserIds: string[]
}>({
  exportType: ExportTypeCode.SCORE_EXCEL,
  exportScope: ExportScopeCode.EXAM,
  classIds: [],
  layoutQuestionIds: [],
  studentUserIds: [],
})

const createValid = computed(() => {
  if (!selectedExamId.value || !createForm.exportType || !createForm.exportScope) return false
  if (createForm.exportScope === ExportScopeCode.CLASS) return createForm.classIds.length > 0
  if (createForm.exportScope === ExportScopeCode.QUESTION)
    return createForm.layoutQuestionIds.length > 0
  if (createForm.exportScope === ExportScopeCode.STUDENT)
    return createForm.studentUserIds.length > 0
  return true
})

function resetCreateForm(): void {
  createForm.exportType = ExportTypeCode.SCORE_EXCEL
  createForm.exportScope = ExportScopeCode.EXAM
  createForm.classIds = []
  createForm.layoutQuestionIds = []
  createForm.studentUserIds = []
}

async function loadQuestionOptions(examId: string | undefined): Promise<void> {
  if (!examId) {
    questionOptions.value = []
    return
  }
  questionLoading.value = true
  try {
    const template = await getExamLayoutQuestionSummary(examId)
    layoutSummary.value = template
    if (!template.configured) {
      questionOptions.value = []
      return
    }
    questionOptions.value = [...buildExamLayoutQuestionOptions(template.questions)].sort(
      (left, right) => {
        const leftSort
          = template.questions.find((q) => q.layoutQuestionId === left.value)?.sortNo ?? 0
        const rightSort
          = template.questions.find((q) => q.layoutQuestionId === right.value)?.sortNo ?? 0
        return leftSort - rightSort
      },
    )
  } catch (error) {
    questionOptions.value = []
    showUserError(error, '制卷题目加载失败')
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
    if (createForm.exportScope === ExportScopeCode.CLASS) {
      request.scopeCondition = { classIds: createForm.classIds }
    } else if (createForm.exportScope === ExportScopeCode.QUESTION) {
      request.scopeCondition = { layoutQuestionIds: createForm.layoutQuestionIds }
    } else if (createForm.exportScope === ExportScopeCode.STUDENT) {
      request.scopeCondition = { studentUserIds: createForm.studentUserIds }
    }
    const createdTask = await createExportTask(request)
    if (!createdTask.taskId) {
      showUserError(null, '导出任务创建失败')
      return
    }
    message.success('已创建导出任务，系统正在生成文件')
    createModalOpen.value = false
    activeTaskFilterAutoSync.value = false
    exportFilterForm.statusFilter = undefined
    exportFilterForm.typeFilter = undefined
    taskPagination.pageNum = 1
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
const detailTask = ref<ExportTaskResponse | null>(null)
const detailLoading = ref(false)
const detailError = ref<Error | null>(null)
/** 当前正在获取详情的任务 ID，用于关闭后重开另一条时覆盖 */
let pendingDetailTaskId: string | null = null

async function openDetailDrawer(record: ExportTaskResponse): Promise<void> {
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

function formatTaskExam(task: ExportTaskResponse): string {
  return task.examNo ? `${task.examName}（${task.examNo}）` : task.examName
}

function formatScopeItem(item: ExportScopeItemResponse): string {
  return item.targetCode ? `${item.targetName}（${item.targetCode}）` : item.targetName
}

// ─── 下载 ─────────────────────────────────────

async function handleDownload(record: ExportTaskResponse): Promise<void> {
  if (!canDownloadExportTask(record)) {
    message.warning('该任务尚未生成文件')
    return
  }
  downloadingId.value = record.taskId
  try {
    if (!record.fileId) {
      message.error('导出任务缺少文件引用，暂不可下载')
      return
    }
    const blobResp = await downloadFile({ nodeId: record.fileId })
    const blob = blobResp.data
    if (!blob) {
      message.error('导出文件暂不可下载，请确认任务已完成后再次下载')
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = record.fileName || '导出文件'
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
    activeTaskFilterAutoSync.value = false
    taskPagination.pageNum = 1
    if (value) {
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
    createForm.layoutQuestionIds = []
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

  &__active-sync-strip {
    margin-bottom: 16px;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-page {
  &__empty {
    padding: 60px 0;
  }

  &__card-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    width: 100%;
  }

  &__flow-hint {
    margin-right: auto;
    font-size: 12px;
    color: var(--c-text-4);
    white-space: nowrap;
  }

  &__card-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  &__active-sync-strip {
    margin-bottom: 0;
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
