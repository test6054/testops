<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="export-page__context">
        <div class="export-page__context-left">
          <a-select
            :value="selectedExamId"
            class="export-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
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
        </div>
        <div class="export-page__context-right">
          <UiButton size="sm" :disabled="!selectedExamId" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            创建导出任务
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadTasks"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请先选择一场考试" class="export-page__empty" />

    <UiCard v-else class="info-card">
      <template #title>
        <CloudDownloadOutlined />
        <span>当前考试导出任务</span>
        <UiBadge tone="blue">{{ taskPagination.total }}</UiBadge>
      </template>
      <template #extra>
        <a-space>
          <a-select
            v-model:value="statusFilter"
            placeholder="状态过滤"
            style="width: 160px"
            allow-clear
          >
            <a-select-option v-for="(label, code) in EXPORT_STATUS_LABEL" :key="code" :value="code">
              {{ label }}
            </a-select-option>
          </a-select>
          <a-select
            v-model:value="typeFilter"
            placeholder="类型过滤"
            style="width: 160px"
            allow-clear
          >
            <a-select-option v-for="(label, code) in EXPORT_TYPE_LABEL" :key="code" :value="code">
              {{ label }}
            </a-select-option>
          </a-select>
        </a-space>
      </template>

      <UiDataTable
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
            {{
              filteredTasks[index].fileSize
                ? formatBytes(Number(filteredTasks[index].fileSize))
                : '-'
            }}
          </template>
          <template v-else-if="column.key === 'errorMessage'">
            <a-tooltip
              v-if="filteredTasks[index].errorMessage"
              :title="filteredTasks[index].errorMessage"
            >
              <span class="error-text">{{
                (filteredTasks[index].errorMessage ?? '').length > 24
                  ? `${(filteredTasks[index].errorMessage ?? '').slice(0, 24)}…`
                  : filteredTasks[index].errorMessage
              }}</span>
            </a-tooltip>
            <span v-else class="hint-text">-</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton
                v-if="
                  filteredTasks[index].taskStatus === 'COMPLETED' && filteredTasks[index].fileId
                "
                size="sm"
                :loading="downloadingId === filteredTasks[index].taskId"
                @click="handleDownload(filteredTasks[index])"
              >
                <template #icon><DownloadOutlined /></template>
                下载
              </UiButton>
              <UiButton size="sm" variant="outline" @click="openDetailDrawer(filteredTasks[index])">
                详情
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
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
    <a-descriptions v-if="detailTask" :column="1" bordered size="small">
      <a-descriptions-item label="任务ID">{{ detailTask.taskId }}</a-descriptions-item>
      <a-descriptions-item label="考试ID">{{ detailTask.examId }}</a-descriptions-item>
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
      <a-descriptions-item label="文件名">{{ detailTask.fileName ?? '-' }}</a-descriptions-item>
      <a-descriptions-item label="文件大小">
        {{ detailTask.fileSize ? formatBytes(Number(detailTask.fileSize)) : '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="开始时间">
        {{ detailTask.startedTime ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="完成时间">
        {{ detailTask.completedTime ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="错误信息">
        <span v-if="detailTask.errorMessage" class="error-text">{{ detailTask.errorMessage }}</span>
        <span v-else class="hint-text">-</span>
      </a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamQuestionTemplateVO } from '@/apis/mark/exam'
import type {
  ExportCreatePayload,
  ExportScopeCode,
  ExportScopeItemVO,
  ExportTaskStatusCode,
  ExportTaskVO,
  ExportTypeCode,
} from '@/apis/mark/exam-export'
import type { BadgeTone } from '@/components/ui-guide/ui'
import CloudDownloadOutlined from '@ant-design/icons-vue/CloudDownloadOutlined'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import { getExamTemplate } from '@/apis/mark/exam'
import {
  createExportTask,
  EXPORT_SCOPE_LABEL,
  EXPORT_STATUS_LABEL,
  EXPORT_STATUS_TONE,
  EXPORT_TYPE_LABEL,
  listExportTasks,
} from '@/apis/mark/exam-export'
import { UiBadge, UiButton, UiCard, UiDataTable, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamRoster } from '@/composables/useMarkExamRoster'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamExportTasks' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

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

const statusFilter = ref<ExportTaskStatusCode | undefined>(undefined)
const typeFilter = ref<ExportTypeCode | undefined>(undefined)

const filteredTasks = computed(() =>
  tasks.value.filter(
    (t) =>
      (!statusFilter.value || t.taskStatus === statusFilter.value)
      && (!typeFilter.value || t.exportType === typeFilter.value),
  ),
)

const counts = computed(() => ({
  total: tasks.value.length,
  pending: tasks.value.filter((t) => t.taskStatus === 'PENDING').length,
  generating: tasks.value.filter((t) => t.taskStatus === 'GENERATING').length,
  completed: tasks.value.filter((t) => t.taskStatus === 'COMPLETED').length,
  failed: tasks.value.filter((t) => t.taskStatus === 'FAILED').length,
}))

const columns: ColumnType<ExportTaskVO>[] = [
  { title: '任务ID', key: 'taskId', dataIndex: 'taskId', width: 120 },
  { title: '类型', key: 'exportType', width: 120 },
  { title: '范围', key: 'exportScope', width: 100 },
  { title: '范围条件', key: 'scopeSummary', width: 160 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '文件名', key: 'fileName', dataIndex: 'fileName', width: 200, ellipsis: true },
  { title: '文件大小', key: 'fileSize', width: 100 },
  { title: '开始时间', key: 'startedTime', dataIndex: 'startedTime', width: 160 },
  { title: '完成时间', key: 'completedTime', dataIndex: 'completedTime', width: 160 },
  { title: '错误信息', key: 'errorMessage', width: 220 },
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

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) {
    tasks.value = []
    taskPagination.total = 0
    return
  }
  loading.value = true
  try {
    const page = await listExportTasks({
      examId: selectedExamId.value,
      pageNum: taskPagination.pageNum,
      pageSize: taskPagination.pageSize,
    })
    tasks.value = page.list
    taskPagination.pageNum = page.pageNum
    taskPagination.pageSize = page.pageSize
    taskPagination.total = page.total
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载导出任务失败')
  } finally {
    loading.value = false
  }
}

function handleTaskPageChange(payload: { current: number, pageSize: number }): void {
  taskPagination.pageNum = payload.current
  taskPagination.pageSize = payload.pageSize
  void loadTasks()
}

function handleExamChange(value: unknown): void {
  onExamChange(value as string | number | undefined, [])
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
    message.error(error instanceof Error ? error.message : '题目模板加载失败')
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
    const payload: ExportCreatePayload = {
      examId: selectedExamId.value,
      exportType: createForm.exportType,
      exportScope: createForm.exportScope,
    }
    if (createForm.exportScope === 'CLASS') {
      payload.scopeCondition = { classIds: createForm.classIds }
    } else if (createForm.exportScope === 'QUESTION') {
      payload.scopeCondition = { questionTemplateIds: createForm.questionTemplateIds }
    } else if (createForm.exportScope === 'STUDENT') {
      payload.scopeCondition = { studentUserIds: createForm.studentUserIds }
    }
    await createExportTask(payload)
    message.success('已创建导出任务，等待后端生成')
    createModalOpen.value = false
    await loadTasks()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建导出任务失败')
  } finally {
    creating.value = false
  }
}

// ─── 详情抽屉 ─────────────────────────────────

const detailDrawerOpen = ref(false)
const detailTask = ref<ExportTaskVO | null>(null)

function openDetailDrawer(record: ExportTaskVO): void {
  detailTask.value = record
  detailDrawerOpen.value = true
}

function formatScopeItem(item: ExportScopeItemVO): string {
  if (item.targetCode && item.targetName) return `${item.targetName}（${item.targetCode}）`
  if (item.targetName) return item.targetName
  if (item.targetCode) return item.targetCode
  return '范围明细缺少展示名称'
}

// ─── 下载 ─────────────────────────────────────

async function handleDownload(record: ExportTaskVO): Promise<void> {
  if (!record.fileId) {
    message.warning('该任务尚未生成文件')
    return
  }
  downloadingId.value = record.taskId
  try {
    const blobResp = await downloadFile({ nodeId: record.fileId })
    const blob = blobResp.data
    if (!blob) {
      message.error('未获得有效的文件流')
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = record.fileName || `export-${record.taskId}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下载失败')
  } finally {
    downloadingId.value = undefined
  }
}

// B-8: selectedExamId 由 useMarkExamSelector 与 URL 双向同步
watch(selectedExamId, (value) => {
  if (value) {
    taskPagination.pageNum = 1
    void loadTasks()
  } else {
    tasks.value = []
    taskPagination.total = 0
    resetRoster()
    questionOptions.value = []
  }
})

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
  if (selectedExamId.value) {
    await loadTasks()
  }
})
</script>

<style lang="scss" scoped>
.export-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

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
