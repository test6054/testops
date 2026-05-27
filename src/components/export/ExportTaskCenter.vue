<template>
  <a-drawer
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
        v-model="filterForm"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      >
        <a-space>
          <a-button type="text" size="small" @click="refreshTasks">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
          <a-tag v-if="exportTaskStore.runningCount > 0" color="blue">
            <template #icon>
              <LoadingOutlined spin />
            </template>
            进行中：{{ exportTaskStore.runningCount }}
          </a-tag>
        </a-space>
        <template #field-dateRange>
          <a-range-picker
            v-model:value="filterForm.dateRange"
            style="width: 240px"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
            allow-clear
          />
        </template>
      </UiFilterBar>

      <!-- 任务列表表格 -->
      <a-table
        :columns="columns"
        :data-source="exportTaskStore.tasks"
        :loading="exportTaskStore.loading"
        :pagination="pagination"
        row-key="jobId"
        size="small"
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
            <a-tag
              :style="{
                backgroundColor: getFormatColor(record.exportFormat),
                color: 'var(--ant-color-text-light-solid)',
                border: 'none',
              }"
            >
              {{ formatLabel(record.exportFormat) }}
            </a-tag>
          </template>

          <!-- 状态 -->
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">
              <template #icon>
                <LoadingOutlined
                  v-if="record.status === 'PROCESSING' || record.status === 'PENDING'"
                  spin
                />
                <CheckCircleOutlined v-else-if="record.status === 'COMPLETED'" />
                <CloseCircleOutlined v-else-if="record.status === 'FAILED'" />
              </template>
              {{ statusLabel(record.status) }}
            </a-tag>
          </template>

          <!-- 进度 -->
          <template v-else-if="column.key === 'progress'">
            <div
              v-if="record.status === 'PROCESSING' || record.status === 'PENDING'"
              class="progress-cell"
            >
              <a-progress
                :percent="record.progress ?? 0"
                size="small"
                :status="record.status === 'PROCESSING' ? 'active' : 'exception'"
                :show-info="false"
              />
              <span class="progress-text">{{ record.progress ?? 0 }}%</span>
            </div>
            <span v-else-if="record.status === 'COMPLETED'" class="text-success">
              <CheckCircleFilled /> 完成
            </span>
            <span v-else-if="record.status === 'FAILED'" class="text-danger">
              <CloseCircleFilled /> 失败
            </span>
            <span v-else class="text-muted">-</span>
          </template>

          <!-- 文件大小 -->
          <template v-else-if="column.key === 'fileSize'">
            <span v-if="record.fileSize">{{ formatFileSize(record.fileSize) }}</span>
            <span v-else class="text-muted">-</span>
          </template>

          <!-- 创建时间 -->
          <template v-else-if="column.key === 'createTime'">
            <div class="time-cell">
              <CalendarOutlined />
              {{ record.createdTime }}
            </div>
          </template>

          <!-- 操作 -->
          <template v-else-if="column.key === 'operations'">
            <a-space>
              <a-button
                v-if="record.status === 'COMPLETED'"
                type="primary"
                size="small"
                :loading="downloadingJobId === record.jobId"
                @click="downloadFileByJobId(record.jobId)"
              >
                <template #icon>
                  <DownloadOutlined />
                </template>
              </a-button>
              <a-popconfirm title="确定删除这条导出记录吗？" @ok="deleteTask(record.jobId)">
                <a-button
                  v-if="record.status === 'COMPLETED' || record.status === 'FAILED'"
                  danger
                  size="small"
                  type="text"
                >
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>

        <!-- 空状态 -->
        <template #emptyText>
          <a-empty description="暂无导出任务">
            <template #image>
              <FolderAddOutlined
                :style="{ fontSize: '48px', color: 'var(--ant-color-text-quaternary)' }"
              />
            </template>
          </a-empty>
        </template>
      </a-table>

      <!-- 失败原因展开面板（表格下方） -->
      <template v-if="expandedTask">
        <a-alert
          :message="`失败原因：${expandedTask?.failReason}`"
          type="error"
          closable
          @close="expandedTask = null"
        />
      </template>
    </div>
  </a-drawer>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExportJobQueryRequest, ExportJobStatusVO } from '@/apis/edu/export'
import type { FilterField } from '@/components/ui-guide/ui/types'
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
import { UiFilterBar } from '@/components/ui-guide/ui'
import { useExportTaskStore } from '@/stores/exportTask'
import { AsyncTaskStatusEnum, ExportFormatEnum } from '@/types/enums'
import { isErrorHandled } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'

defineOptions({ name: 'ExportTaskCenter' })

const exportTaskStore = useExportTaskStore()

// 筛选条件
const filterForm = reactive({
  businessType: undefined as ExportBusinessType | undefined,
  status: undefined as AsyncTaskStatusEnum | undefined,
  dateRange: undefined as [string, string] | undefined,
})
const expandedTask = ref<ExportJobStatusVO | null>(null)
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

// 分页配置
const pagination = computed(() => ({
  current: exportTaskStore.lastFetchParams.pageNum,
  pageSize: exportTaskStore.lastFetchParams.pageSize,
  total: exportTaskStore.pagination.total,
  showTotal: (total: number) => `共 ${total} 条`,
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50],
  onChange: (page: number) => handlePageChange(page),
  onShowSizeChange: (_current: number, size: number) => handlePageSizeChange(size),
}))

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
    key: 'operations',
    width: 100,
    align: 'center',
    fixed: 'right',
  },
]

// 分页变化处理
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

  const dateRangeVal = filterForm.dateRange as [string, string] | undefined
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

const statusMap = {
  [AsyncTaskStatusEnum.PENDING]: { label: '排队中', color: 'blue' },
  [AsyncTaskStatusEnum.PROCESSING]: { label: '处理中', color: 'orange' },
  [AsyncTaskStatusEnum.COMPLETED]: { label: '已完成', color: 'green' },
  [AsyncTaskStatusEnum.FAILED]: { label: '失败', color: 'red' },
}

const statusLabel = (status: AsyncTaskStatusEnum) => statusMap[status].label
const statusColor = (status: AsyncTaskStatusEnum) => statusMap[status].color

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
}

const businessTypeLabel = (type: ExportBusinessType) => businessTypeMap[type]

// 下载文件 - 使用统一下载工具，直接通过fileNodeId下载
const downloadFile = async (task: ExportJobStatusVO) => {
  if (!task.fileNodeId) {
    message.error('文件不存在，无法下载')
    return
  }
  try {
    downloadingJobId.value = task.jobId
    message.info('正在准备下载...')
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
    if (!isErrorHandled(error)) {
      message.error('下载失败，请重试')
    }
  } finally {
    downloadingJobId.value = null
  }
}

const downloadFileByJobId = async (jobId: string) => {
  const task = exportTaskMap.value.get(jobId)
  if (!task) {
    throw new Error(`导出任务不存在：${jobId}`)
  }
  await downloadFile(task)
}

const refreshTasks = async () => {
  await fetchTasksWithFilter()
  message.success('刷新成功')
}

const deleteTask = async (jobId: string) => {
  try {
    await exportTaskStore.deleteTask(jobId)
    message.success('删除成功')
  } catch (error) {
    if (!isErrorHandled(error)) {
      message.error('删除失败')
    }
    throw error
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
    [ExportFormatEnum.EXCEL]: 'var(--ant-color-success)',
    [ExportFormatEnum.PDF]: 'var(--ant-color-error)',
    [ExportFormatEnum.WORD]: 'var(--ant-color-primary)',
    [ExportFormatEnum.ZIP]: 'var(--ant-color-warning)',
  }
  return colorMap[format]
}
</script>

<style scoped lang="scss">
.task-center {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.file-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.time-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.text-success {
  color: var(--ant-color-success);
  display: flex;
  align-items: center;
  gap: 4px;
}

.text-danger {
  color: var(--ant-color-error);
  display: flex;
  align-items: center;
  gap: 4px;
}

.text-muted {
  color: var(--ant-color-text-tertiary);
}

.progress-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;

  .progress-text {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
    font-weight: 500;
  }
}

:deep(.ant-table) {
  .ant-table-tr:hover {
    background-color: var(--ant-color-fill-tertiary);
  }
}
</style>

<style lang="scss">
.export-task-drawer {
  .ant-drawer-body {
    background-color: var(--ant-color-bg-container);
  }
}
</style>
