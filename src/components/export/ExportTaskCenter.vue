<template>
  <UiDrawer
    :open="exportTaskStore.visible"
    :width="900"
    placement="right"
    title="导出任务中心"
    :footer="null"
    destroy-on-close
    class="export-task-drawer"
    @close="handleClose"
  >
    <div class="task-center">
      <!-- 工具栏和筛选 -->
      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      >
        <div class="dp-space dp-space--tight">
          <UiButton size="sm" variant="ghost" @click="refreshTasks">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </UiButton>
          <UiTag v-if="exportTaskStore.runningCount > 0" tone="blue">
            <LoadingOutlined spin style="margin-right: var(--dp-space-component-xs)" />
            进行中：{{ exportTaskStore.runningCount }}
          </UiTag>
        </div>
        <template #field-dateRange>
          <UiRangePicker
            v-model="filterForm.dateRange"
            size="sm"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
            style="width: 240px"
          />
        </template>
      </UiFilterBar>

      <!-- 任务列表表格 -->
      <UiDataTable
        v-model:current="exportTaskStore.lastFetchParams.pageNum"
        v-model:page-size="exportTaskStore.lastFetchParams.pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="exportTaskStore.tasks"
        :loading="exportTaskStore.loading"
        :total="exportTaskStore.pagination.total"
        row-key="jobId"
        size="small"
        flat
        @page-change="handleExportTablePageChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 文件名 -->
          <template v-if="column.key === 'fileName'">
            <div class="file-cell">
              <FileOutlined
                :style="{ color: getFormatColor(record.exportFormat), fontSize: '16px' }"
              />
              <span class="file-name">{{ record.fileName }}</span>
            </div>
          </template>

          <!-- 业务类型 -->
          <template v-else-if="column.key === 'businessType'">
            <span>{{ businessTypeLabel(record.businessType) }}</span>
          </template>

          <!-- 格式 -->
          <template v-else-if="column.key === 'format'">
            <UiTag
              :style="{
                backgroundColor: getFormatColor(record.exportFormat),
                color: 'var(--dp-text-inverse)',
                border: 'none',
              }"
            >
              {{ formatLabel(record.exportFormat) }}
            </UiTag>
          </template>

          <!-- 状态 -->
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="statusColor(record.status)">
              <LoadingOutlined
                v-if="
                  record.status === AsyncTaskStatusEnum.PROCESSING
                    || record.status === AsyncTaskStatusEnum.PENDING
                "
                spin
                style="margin-right: var(--dp-space-component-xs)"
              />
              <CheckCircleOutlined
                v-else-if="record.status === AsyncTaskStatusEnum.COMPLETED"
                style="margin-right: var(--dp-space-component-xs)"
              />
              <CloseCircleOutlined
                v-else-if="record.status === AsyncTaskStatusEnum.FAILED"
                style="margin-right: var(--dp-space-component-xs)"
              />
              {{ statusLabel(record.status) }}
            </UiTag>
          </template>

          <!-- 进度 -->
          <template v-else-if="column.key === 'progress'">
            <div
              v-if="
                record.status === AsyncTaskStatusEnum.PROCESSING
                  || record.status === AsyncTaskStatusEnum.PENDING
              "
              class="progress-cell"
            >
              <UiProgressBar
                :percent="record.progress ?? 0"
                size="sm"
                :color="
                  record.status === AsyncTaskStatusEnum.PROCESSING
                    ? 'var(--dp-color-primary)'
                    : 'var(--dp-error)'
                "
                :show-label="false"
              />
              <span class="progress-text">{{ record.progress ?? 0 }}%</span>
            </div>
            <span v-else-if="record.status === AsyncTaskStatusEnum.COMPLETED" class="text-success">
              <CheckCircleFilled /> 完成
            </span>
            <span v-else-if="record.status === AsyncTaskStatusEnum.FAILED" class="text-danger">
              <CloseCircleFilled /> 失败
            </span>
            <span v-else class="dp-text-muted">-</span>
          </template>

          <!-- 文件大小 -->
          <template v-else-if="column.key === 'fileSize'">
            <span v-if="record.fileSize">{{ formatFileSize(record.fileSize) }}</span>
            <span v-else class="dp-text-muted">-</span>
          </template>

          <!-- 创建时间 -->
          <template v-else-if="column.key === 'createTime'">
            <div class="time-cell">
              <CalendarOutlined />
              {{ record.createdTime }}
            </div>
          </template>

          <!-- 操作 -->
          <template v-else-if="column.key === 'actions'">
            <div class="dp-space dp-space--tight">
              <UiButton
                v-if="record.status === AsyncTaskStatusEnum.COMPLETED"
                size="sm"
                variant="primary"
                :loading="downloadingJobId === record.jobId"
                @click="downloadFileByJobId(record.jobId)"
              >
                <template #icon>
                  <DownloadOutlined />
                </template>
              </UiButton>
              <UiButton
                v-if="
                  record.status === AsyncTaskStatusEnum.COMPLETED
                    || record.status === AsyncTaskStatusEnum.FAILED
                "
                size="sm"
                status="danger"
                variant="ghost"
                @click="requestDeleteTask(record.jobId)"
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
              </UiButton>
            </div>
          </template>
        </template>

        <!-- 空状态 -->
        <template #empty>
          <UiEmpty size="sm" description="暂无导出任务">
            <template #image>
              <FolderAddOutlined class="export-task-center__empty-icon" />
            </template>
          </UiEmpty>
        </template>
      </UiDataTable>
    </div>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExportJobQueryRequest, ExportJobStatusVO } from '@/apis/edu/export'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import CalendarOutlined from '@ant-design/icons-vue/CalendarOutlined'
import CheckCircleFilled from '@ant-design/icons-vue/CheckCircleFilled'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import CloseCircleFilled from '@ant-design/icons-vue/CloseCircleFilled'
import CloseCircleOutlined from '@ant-design/icons-vue/CloseCircleOutlined'
import DeleteOutlined from '@ant-design/icons-vue/DeleteOutlined'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FolderAddOutlined from '@ant-design/icons-vue/FolderAddOutlined'
import LoadingOutlined from '@ant-design/icons-vue/LoadingOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ExportBusinessType } from '@/apis/edu/export'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiRangePicker from '@/components/ui-guide/ui/RangePicker.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExportTaskStore } from '@/stores/exportTask'
import { AsyncTaskStatusEnum, ExportFormatEnum } from '@/types/enums'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'

defineOptions({ name: 'ExportTaskCenter' })

const exportTaskStore = useExportTaskStore()

// 筛选条件
interface ExportTaskFilterForm {
  [key: string]: unknown
  businessType?: ExportBusinessType
  status?: AsyncTaskStatusEnum
  dateRange?: [string, string]
}

const filterForm = reactive<ExportTaskFilterForm>({})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const downloadingJobId = ref<string | null>(null)

// 筛选字段配置
const filterFields: FilterField[] = [
  {
    key: 'businessType',
    type: 'select',
    placeholder: '全部业务',
    allowClear: true,
    width: 180,
    options: [
      { label: '实践数据导出', value: ExportBusinessType.PRACTICE_EXPORT },
      { label: '学生成绩导出', value: ExportBusinessType.STUDENT_GRADES },
      { label: '能力映射矩阵导出', value: ExportBusinessType.COMPETENCY_MAPPING_MATRIX },
      { label: '达成度报告导出', value: ExportBusinessType.COMPETENCY_ACHIEVEMENT_REPORT },
    ],
  },
  {
    key: 'status',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 140,
    options: [
      { label: '排队中', value: AsyncTaskStatusEnum.PENDING },
      { label: '处理中', value: AsyncTaskStatusEnum.PROCESSING },
      { label: '已完成', value: AsyncTaskStatusEnum.COMPLETED },
      { label: '失败', value: AsyncTaskStatusEnum.FAILED },
    ],
  },
  {
    key: 'dateRange',
    type: 'custom',
  },
]

// 分页变化处理
function handleExportTablePageChange(pageEvent: { current: number, pageSize: number }): void {
  exportTaskStore.fetchTasks({ pageNum: pageEvent.current, pageSize: pageEvent.pageSize })
}

const exportTaskMap = computed(() => {
  return new Map(exportTaskStore.tasks.map((task) => [String(task.jobId), task]))
})

watch(
  () => exportTaskStore.lastFetchParams.businessType,
  (value) => {
    filterForm.businessType = value
  },
  { immediate: true },
)

// 表格列定义
const columns: ColumnType[] = [
  {
    title: '文件名',
    dataIndex: 'fileName',
    key: 'fileName',
    width: 240,
    ellipsis: true,
    fixed: 'left',
  },
  {
    title: '业务类型',
    dataIndex: 'businessType',
    key: 'businessType',
    width: 110,
    align: 'center',
  },
  {
    title: '格式',
    dataIndex: 'exportFormat',
    key: 'format',
    width: 90,
    align: 'center',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 110,
    align: 'center',
  },
  {
    title: '进度',
    key: 'progress',
    width: 120,
    align: 'center',
  },
  {
    title: '文件大小',
    key: 'fileSize',
    width: 90,
    align: 'center',
  },
  {
    title: '创建时间',
    dataIndex: 'createdTime',
    key: 'createTime',
    width: 150,
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    align: 'center',
  },
]

function handlePageChange(page: number) {
  exportTaskStore.fetchTasks({ pageNum: page })
}

function handlePageSizeChange(pageSize: number) {
  exportTaskStore.fetchTasks({ pageNum: 1, pageSize })
}

// 搜索处理
function handleSearch() {
  fetchTasksWithFilter()
}

// 重置处理
function handleReset() {
  filterForm.businessType = undefined
  filterForm.status = undefined
  filterForm.dateRange = undefined
  fetchTasksWithFilter()
}

// 带筛选条件加载任务
async function fetchTasksWithFilter() {
  const params: Partial<ExportJobQueryRequest> = {
    pageNum: 1,
  }

  const dateRangeVal = filterForm.dateRange
  if (dateRangeVal && dateRangeVal.length === 2) {
    params.startTime = dateRangeVal[0]
    params.endTime = dateRangeVal[1]
  }
  if (filterForm.businessType) {
    params.businessType = filterForm.businessType
  }
  if (filterForm.status) {
    params.status = filterForm.status
  }
  exportTaskStore.updateFilter(params)

  await exportTaskStore.fetchTasks(params)
}

// 组件挂载时初始化加载
onMounted(() => {
  if (exportTaskStore.visible) {
    fetchTasksWithFilter()
  }
})

const statusMap: Record<AsyncTaskStatusEnum, { label: string, color: BadgeTone }> = {
  [AsyncTaskStatusEnum.PENDING]: { label: '排队中', color: 'blue' },
  [AsyncTaskStatusEnum.PROCESSING]: { label: '处理中', color: 'orange' },
  [AsyncTaskStatusEnum.COMPLETED]: { label: '已完成', color: 'green' },
  [AsyncTaskStatusEnum.FAILED]: { label: '失败', color: 'red' },
}

const statusLabel = (status: AsyncTaskStatusEnum) => statusMap[status].label
const statusColor = (status: AsyncTaskStatusEnum): BadgeTone => statusMap[status].color

// 格式映射
const formatMap: Record<ExportFormatEnum, string> = {
  [ExportFormatEnum.EXCEL]: 'Excel',
  [ExportFormatEnum.PDF]: 'PDF',
  [ExportFormatEnum.WORD]: 'Word',
  [ExportFormatEnum.ZIP]: 'ZIP',
}

const formatLabel = (format: ExportFormatEnum) => formatMap[format]

// 业务类型映射（与后端ExportBusinessType.code对应）
const businessTypeMap: Record<ExportBusinessType, string> = {
  [ExportBusinessType.PRACTICE_EXPORT]: '实践数据导出',
  [ExportBusinessType.STUDENT_GRADES]: '学生成绩导出',
  [ExportBusinessType.COMPETENCY_MAPPING_MATRIX]: '能力映射矩阵导出',
  [ExportBusinessType.COMPETENCY_ACHIEVEMENT_REPORT]: '达成度报告导出',
  [ExportBusinessType.QUALITY_ACHIEVEMENT_RESULT_EXPORT]: '质量评价达成度结果导出',
  [ExportBusinessType.QUALITY_SCORE_BATCH_EXPORT]: '质量评价成绩批次导出',
  [ExportBusinessType.QUALITY_SCORE_RECORD_EXPORT]: '质量评价成绩明细导出',
}

const businessTypeLabel = (type: ExportBusinessType) => businessTypeMap[type]

// 下载文件 - 使用统一下载工具，直接通过fileNodeId下载
const downloadFile = async (task: ExportJobStatusVO) => {
  if (!task.fileNodeId) {
    void message.error('导出文件不存在或已被清理')
    return
  }
  try {
    downloadingJobId.value = task.jobId
    void message.info('正在准备下载文件')
    await handleDownloadFile(
      {
        fileId: task.fileNodeId,
        fileName: task.fileName,
      },
      {
        showSuccessMessage: true,
        successMessage: '文件下载成功',
      },
    )
    // 下载成功消息已在 handleDownloadFile 内部处理，不再重复显示
  } catch (error) {
    showUserError(error, '导出文件下载失败')
  } finally {
    downloadingJobId.value = null
  }
}

const downloadFileByJobId = async (jobId: string) => {
  const task = exportTaskMap.value.get(jobId)
  if (!task) {
    void message.error('导出任务不存在或已被清理')
    return
  }
  await downloadFile(task)
}

const refreshTasks = async () => {
  await fetchTasksWithFilter()
  void message.success('刷新成功')
}

const deletingJobId = ref<string | null>(null)

async function requestDeleteTask(jobId: string): Promise<void> {
  // MVR-942：删除确认防重入 + 确认后再次互斥
  if (deletingJobId.value) {
    return
  }
  const ok = await confirmAsync({
    title: '确定删除这条导出记录吗？',
    content: '删除后任务记录与产物入口将不可恢复。',
    type: 'error',
    okText: '删除',
  })
  if (!ok) {
    return
  }
  if (deletingJobId.value) {
    return
  }
  await deleteTask(jobId)
}

const deleteTask = async (jobId: string) => {
  if (deletingJobId.value) {
    return
  }
  deletingJobId.value = jobId
  try {
    await exportTaskStore.deleteTask(jobId)
    void message.success('删除成功')
  } catch (error) {
    showUserError(error, '导出任务删除失败')
  } finally {
    deletingJobId.value = null
  }
}

const handleClose = () => {
  exportTaskStore.closeCenter()
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

// 根据格式返回颜色
const getFormatColor = (format: ExportFormatEnum): string => {
  const colorMap: Record<ExportFormatEnum, string> = {
    [ExportFormatEnum.EXCEL]: 'var(--dp-success)',
    [ExportFormatEnum.PDF]: 'var(--dp-danger, var(--dp-error))',
    [ExportFormatEnum.WORD]: 'var(--dp-color-primary)',
    [ExportFormatEnum.ZIP]: 'var(--dp-warning)',
  }
  return colorMap[format]
}
</script>

<style scoped lang="scss">
.task-center {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  height: 100%;
}

.file-cell {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);

  .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.time-cell {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}

.text-success {
  color: var(--dp-success);
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-xs);
}

.text-danger {
  color: var(--dp-danger, var(--dp-error));
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-xs);
}

.export-task-center__empty-icon {
  font-size: var(--dp-font-size-2xl);
  color: var(--dp-text-muted);
}

.progress-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dp-space-component-xs);
  width: 100%;

  .progress-text {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
    font-weight: 500;
  }
}

:deep(.ant-table) {
  .ant-table-tr:hover {
    background-color: var(--dp-surface-subtle);
  }
}
</style>

<style lang="scss">
.export-task-drawer {
  .ant-drawer-body {
    background-color: var(--dp-surface);
  }
}
</style>
