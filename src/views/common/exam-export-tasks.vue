<template>
  <GiPageLayout>
    <div class="export-page">
      <PageHeader title="导出任务">
        <template #tags>
          <UiTag v-if="counts.total > 0" tone="blue" size="md">总 {{ counts.total }}</UiTag>
          <UiTag v-if="counts.pending > 0" tone="orange" size="md"
            >待执行 {{ counts.pending }}</UiTag
          >
          <UiTag v-if="counts.generating > 0" tone="cyan" size="md"
            >生成中 {{ counts.generating }}</UiTag
          >
          <UiTag v-if="counts.completed > 0" tone="green" size="md"
            >已完成 {{ counts.completed }}</UiTag
          >
          <UiTag v-if="counts.failed > 0" tone="red" size="md">失败 {{ counts.failed }}</UiTag>
        </template>
        <template #actions>
          <a-select
            v-model:value="selectedExamId"
            style="width: 280px"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examOptionsLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
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
        </template>
      </PageHeader>

      <UiEmpty v-if="!selectedExamId" description="请先选择一场考试" class="empty-block" />

      <UiCard v-else class="info-card">
        <template #title>
          <CloudDownloadOutlined />
          <span>当前考试导出任务</span>
          <UiBadge tone="blue">{{ tasks.length }}</UiBadge>
        </template>
        <template #extra>
          <a-space>
            <a-select
              v-model:value="statusFilter"
              placeholder="状态过滤"
              style="width: 160px"
              allow-clear
            >
              <a-select-option
                v-for="(label, code) in EXPORT_STATUS_LABEL"
                :key="code"
                :value="code"
              >
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

        <a-table
          :columns="columns"
          :data-source="filteredTasks"
          :loading="loading"
          :pagination="{ pageSize: 20, showSizeChanger: false }"
          row-key="taskId"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'exportType'">
              {{ EXPORT_TYPE_LABEL[record.exportType as ExportTypeCode] ?? record.exportType }}
            </template>
            <template v-else-if="column.key === 'exportScope'">
              {{ EXPORT_SCOPE_LABEL[record.exportScope as ExportScopeCode] ?? record.exportScope }}
            </template>
            <template v-else-if="column.key === 'taskStatus'">
              <UiTag :tone="statusTone(record.taskStatus)" size="sm">
                {{
                  EXPORT_STATUS_LABEL[record.taskStatus as ExportTaskStatusCode] ??
                  record.taskStatus
                }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'fileSize'">
              {{ record.fileSize ? formatBytes(record.fileSize) : '-' }}
            </template>
            <template v-else-if="column.key === 'errorMessage'">
              <a-tooltip v-if="record.errorMessage" :title="record.errorMessage">
                <span class="error-text">{{
                  record.errorMessage.length > 24
                    ? `${record.errorMessage.slice(0, 24)}…`
                    : record.errorMessage
                }}</span>
              </a-tooltip>
              <span v-else class="hint-text">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton
                  v-if="record.taskStatus === 'COMPLETED' && record.fileId"
                  size="xs"
                  :loading="downloadingId === record.taskId"
                  @click="handleDownload(record)"
                >
                  <template #icon><DownloadOutlined /></template>
                  下载
                </UiButton>
                <UiButton size="xs" variant="outline" @click="openDetailDrawer(record)"
                  >详情</UiButton
                >
              </a-space>
            </template>
          </template>
        </a-table>
      </UiCard>
    </div>

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
        <a-form-item label="范围条件 JSON">
          <a-textarea
            v-model:value="createForm.scopePayload"
            :rows="6"
            :placeholder="scopePayloadPlaceholder"
          />
          <div class="hint-text" style="margin-top: 4px">
            示例：CLASS 范围填 {&quot;classIds&quot;:[&quot;101&quot;]}；STUDENT 范围填
            {&quot;studentUserIds&quot;:[&quot;1001&quot;]}；EXAM 范围可留空。
          </div>
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
          {{ EXPORT_TYPE_LABEL[detailTask.exportType as ExportTypeCode] ?? detailTask.exportType }}
        </a-descriptions-item>
        <a-descriptions-item label="范围">
          {{
            EXPORT_SCOPE_LABEL[detailTask.exportScope as ExportScopeCode] ?? detailTask.exportScope
          }}
        </a-descriptions-item>
        <a-descriptions-item label="范围条件">
          <pre class="scope-pre">{{ detailTask.scopePayload || '（空）' }}</pre>
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <UiTag :tone="statusTone(detailTask.taskStatus)" size="sm">
            {{
              EXPORT_STATUS_LABEL[detailTask.taskStatus as ExportTaskStatusCode] ??
              detailTask.taskStatus
            }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="文件名">{{ detailTask.fileName ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="文件大小">
          {{ detailTask.fileSize ? formatBytes(detailTask.fileSize) : '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="开始时间">{{
          detailTask.startedTime ?? '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="完成时间">{{
          detailTask.completedTime ?? '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="错误信息">
          <span v-if="detailTask.errorMessage" class="error-text">{{
            detailTask.errorMessage
          }}</span>
          <span v-else class="hint-text">-</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import { pageExams } from '@/apis/mark/exam'
import type {
  ExportScopeCode,
  ExportTaskStatusCode,
  ExportTaskVO,
  ExportTypeCode,
} from '@/apis/mark/exam-export'
import {
  createExportTask,
  EXPORT_SCOPE_LABEL,
  EXPORT_STATUS_COLOR,
  EXPORT_STATUS_LABEL,
  EXPORT_TYPE_LABEL,
  listExportTasks,
} from '@/apis/mark/exam-export'
import CloudDownloadOutlined from '@ant-design/icons-vue/CloudDownloadOutlined'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'ExamExportTasks' })

const route = useRoute()
const router = useRouter()

const selectedExamId = ref<string | undefined>(
  route.query.examId ? String(route.query.examId) : undefined,
)
const examOptions = ref<Array<{ label: string; value: string }>>([])
const examOptionsLoading = ref(false)

const tasks = ref<ExportTaskVO[]>([])
const loading = ref(false)
const downloadingId = ref<string | undefined>(undefined)

const statusFilter = ref<ExportTaskStatusCode | undefined>(undefined)
const typeFilter = ref<ExportTypeCode | undefined>(undefined)

const filteredTasks = computed(() =>
  tasks.value.filter(
    (t) =>
      (!statusFilter.value || t.taskStatus === statusFilter.value) &&
      (!typeFilter.value || t.exportType === typeFilter.value),
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
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '文件名', key: 'fileName', dataIndex: 'fileName', width: 200, ellipsis: true },
  { title: '文件大小', key: 'fileSize', width: 100 },
  { title: '开始时间', key: 'startedTime', dataIndex: 'startedTime', width: 160 },
  { title: '完成时间', key: 'completedTime', dataIndex: 'completedTime', width: 160 },
  { title: '错误信息', key: 'errorMessage', width: 220 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

function statusTone(status?: string): string {
  if (!status) return 'gray'
  return EXPORT_STATUS_COLOR[status as ExportTaskStatusCode] ?? 'gray'
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function loadExamOptions(): Promise<void> {
  examOptionsLoading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    examOptions.value = (result.list ?? []).map((item: ExamSummaryVO) => ({
      label: `${item.examName}（${item.statusMessage}）`,
      value: item.examId,
    }))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载考试列表失败')
  } finally {
    examOptionsLoading.value = false
  }
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) {
    tasks.value = []
    return
  }
  loading.value = true
  try {
    tasks.value = await listExportTasks({ examId: selectedExamId.value })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载导出任务失败')
  } finally {
    loading.value = false
  }
}

function handleExamChange(value: unknown): void {
  const next = value != null ? String(value) : undefined
  selectedExamId.value = next
  void router.replace({ query: next ? { examId: next } : {} })
  if (next) {
    void loadTasks()
  } else {
    tasks.value = []
  }
}

// ─── 创建导出 Modal ─────────────────────────────

const createModalOpen = ref(false)
const creating = ref(false)
const createForm = reactive<{
  exportType: ExportTypeCode
  exportScope: ExportScopeCode
  scopePayload: string
}>({
  exportType: 'SCORE_EXCEL',
  exportScope: 'EXAM',
  scopePayload: '',
})

const createValid = computed(() =>
  Boolean(selectedExamId.value && createForm.exportType && createForm.exportScope),
)

const scopePayloadPlaceholder = computed(() => {
  switch (createForm.exportScope) {
    case 'EXAM':
      return '可留空，整场考试。'
    case 'CLASS':
      return '{"classIds":["101","102"]}'
    case 'QUESTION':
      return '{"questionTemplateIds":["5001","5002"]}'
    case 'STUDENT':
      return '{"studentUserIds":["1001","1002"]}'
    default:
      return ''
  }
})

function openCreateModal(): void {
  createForm.exportType = 'SCORE_EXCEL'
  createForm.exportScope = 'EXAM'
  createForm.scopePayload = ''
  createModalOpen.value = true
}

async function handleCreate(): Promise<void> {
  if (!selectedExamId.value || !createValid.value) return
  creating.value = true
  try {
    await createExportTask({
      examId: selectedExamId.value,
      exportType: createForm.exportType,
      exportScope: createForm.exportScope,
      scopePayload: createForm.scopePayload?.trim() || undefined,
    })
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
      throw new Error('未获得有效的文件流')
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

onMounted(async () => {
  await loadExamOptions()
  if (selectedExamId.value) {
    await loadTasks()
  }
})
</script>

<style lang="scss" scoped>
.export-page {
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

.scope-pre {
  background: rgba(0, 0, 0, 0.03);
  padding: 8px;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
</style>
