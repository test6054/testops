<script lang="ts" setup>
import type { ExportTaskResponse } from '@/apis/mark/exam-export'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createExportTask, EXPORT_STATUS_TONE, listExportTasks } from '@/apis/mark/exam-export'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { ExportScopeCode } from '@/types/enums/export-scope-enum'
import {
  ExportTaskStatusCode,
  ExportTaskStatusDescription,
} from '@/types/enums/export-task-status-enum'
import { ALL_EXPORT_TYPE_CODES, ExportTypeCode, ExportTypeDescription } from '@/types/enums/export-type-enum'
import { showUserError } from '@/utils/error-handler'
import { formatFileSize } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveExamExportTasksCard' })

const props = withDefaults(defineProps<{
  examId: string
  /** 双门禁已满足时才允许创建导出任务 */
  canCreate?: boolean
  /** MVR-271：影像归档包仅主考；与 BE requireExamOwnerPermission 对齐 */
  canManageOwnerImageArchiveExport?: boolean
}>(), {
  canCreate: false,
  canManageOwnerImageArchiveExport: false,
})

const router = useRouter()

const loading = ref(false)

const creating = ref(false)

const loadFailed = ref(false)

const tasks = ref<ExportTaskResponse[]>([])

const selectedTypes = ref<ExportTypeCode[]>([])

const columns = [
  { title: '类型', key: 'exportType', width: 96 },

  { title: '文件名', dataIndex: 'fileName', key: 'fileName', ellipsis: true },

  { title: '状态', key: 'taskStatus', width: 88 },

  { title: '大小', key: 'fileSize', width: 80 },
]

const displayTasks = computed(() => tasks.value.slice(0, 6))

const busyExportTypes = computed(() => {
  const set = new Set<ExportTypeCode>()

  for (const task of tasks.value) {
    if (
      task.taskStatus === ExportTaskStatusCode.PENDING
      || task.taskStatus === ExportTaskStatusCode.GENERATING
    ) {
      set.add(task.exportType)
    }
  }

  return set
})

const selectableExportTypes = computed(() =>
  ALL_EXPORT_TYPE_CODES.map((exportType) => ({
    exportType,

    label: exportTypeLabel(exportType),

    disabled:
      busyExportTypes.value.has(exportType)
      || (exportType === ExportTypeCode.IMAGE_ARCHIVE
        && props.canManageOwnerImageArchiveExport !== true),

    checked: selectedTypes.value.includes(exportType),
  })),
)

const hasSelectedTypes = computed(() => selectedTypes.value.length > 0)

function exportTypeLabel(code: ExportTaskResponse['exportType']): string {
  return strictEnumLabel(ExportTypeDescription, code, '导出类型')
}

function exportStatusLabel(code: ExportTaskResponse['taskStatus']): string {
  return strictEnumLabel(ExportTaskStatusDescription, code, '导出任务状态')
}

function exportStatusTone(code: ExportTaskResponse['taskStatus']) {
  return strictEnumTone(EXPORT_STATUS_TONE, code, '导出任务状态')
}

function formatTaskFileSize(size?: number): string {
  return size != null && size > 0 ? formatFileSize(size) : '—'
}

function toggleExportType(exportType: ExportTypeCode, checked: boolean): void {
  if (checked) {
    if (!selectedTypes.value.includes(exportType)) {
      selectedTypes.value = [...selectedTypes.value, exportType]
    }

    return
  }

  selectedTypes.value = selectedTypes.value.filter((item) => item !== exportType)
}

function goExportTasksPage(): void {
  if (!props.examId) {
    return
  }

  void router.push({
    name: 'TeacherExamWorkspaceArchiveExports',

    params: { examId: props.examId },
  })
}

/** 加载当前考试最近导出任务，供归档进度页侧栏展示。 */

async function loadTasks(): Promise<void> {
  if (!props.examId) {
    tasks.value = []

    return
  }

  loading.value = true

  loadFailed.value = false

  try {
    const page = await listExportTasks({
      examId: props.examId,

      pageNum: 1,

      pageSize: DEFAULT_LIST_PAGE_SIZE,
    })

    tasks.value = page.list ?? []

    selectedTypes.value = selectedTypes.value.filter((type) => !busyExportTypes.value.has(type))
  } catch (error) {
    tasks.value = []

    loadFailed.value = true

    showUserError(error, '加载导出任务失败')
  } finally {
    loading.value = false
  }
}

async function createSelectedTasks(): Promise<void> {
  // MVR-424：与 v-if canCreate / 父页 gateOpen 同源二次闸；影像包再认主考 can*
  if (props.canCreate !== true) {
    message.warning('双门禁未满足，暂不可创建导出任务')
    return
  }
  if (!props.examId || !hasSelectedTypes.value || creating.value) {
    return
  }

  creating.value = true

  try {
    const blockedImageArchive = selectedTypes.value.some(
      (exportType) =>
        exportType === ExportTypeCode.IMAGE_ARCHIVE
        && props.canManageOwnerImageArchiveExport !== true,
    )
    if (blockedImageArchive) {
      message.warning('仅考试主考可创建影像归档包导出任务')
      return
    }

    for (const exportType of selectedTypes.value) {
      await createExportTask({
        examId: props.examId,
        exportType,
        exportScope: ExportScopeCode.EXAM,
      })
    }

    message.success(`已创建 ${selectedTypes.value.length} 个导出任务`)
    selectedTypes.value = []
    await loadTasks()
  } catch (error) {
    showUserError(error, '创建导出任务失败')
  } finally {
    creating.value = false
  }
}

watch(
  () => props.examId,

  () => {
    void loadTasks()
  },
)

onMounted(() => {
  void loadTasks()
})

defineExpose({ refresh: loadTasks })
</script>

<template>
  <WorkbenchSurfaceCard flush class="archive-exam-export-tasks">
    <template #head>
      <span>导出任务</span>
    </template>

    <template #toolbar>
      <UiButton variant="ghost" size="sm" @click="goExportTasksPage"> 查看全部 </UiButton>
    </template>

    <div v-if="canCreate" class="archive-exam-export-tasks__picker">
      <div class="archive-exam-export-tasks__picker-label">勾选后创建</div>

      <div class="archive-exam-export-tasks__options">
        <label
          v-for="item in selectableExportTypes"
          :key="item.exportType"
          class="archive-exam-export-tasks__option"
          :class="{ 'archive-exam-export-tasks__option--disabled': item.disabled }"
        >
          <input
            type="checkbox"
            :checked="item.checked"
            :disabled="item.disabled"
            @change="toggleExportType(item.exportType, ($event.target as HTMLInputElement).checked)"
          />

          <span>{{ item.label }}</span>
        </label>
      </div>

      <UiButton
        variant="outline"
        size="sm"
        :disabled="!hasSelectedTypes"
        :loading="creating"
        @click="createSelectedTasks"
      >
        创建选中
      </UiButton>
    </div>

    <UiEmpty
      size="sm"
      v-if="loadFailed"
      description="导出任务加载失败"
      action-label="重试"
      @action="loadTasks"
    />

    <UiEmpty size="sm" v-else-if="!loading && displayTasks.length === 0" description="暂无导出任务" />

    <UiDataTable
      v-else
      pagination-mode="none"
      :columns="columns"
      :data-source="displayTasks"
      :loading="loading"
      :show-pagination="false"
      flat
      row-key="taskId"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'exportType'">
          {{ exportTypeLabel(record.exportType) }}
        </template>

        <template v-else-if="column.key === 'fileName'">
          <span class="archive-exam-export-tasks__file">{{ record.fileName ?? '—' }}</span>
        </template>

        <template v-else-if="column.key === 'taskStatus'">
          <UiTag :tone="exportStatusTone(record.taskStatus)" size="sm">
            {{ exportStatusLabel(record.taskStatus) }}
          </UiTag>
        </template>

        <template v-else-if="column.key === 'fileSize'">
          {{ formatTaskFileSize(record.fileSize) }}
        </template>
      </template>
    </UiDataTable>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.archive-exam-export-tasks__picker {
  display: flex;

  flex-direction: column;

  gap: var(--dp-space-2);

  padding: var(--dp-space-3);

  border-bottom: 1px solid var(--dp-border-light);
}

.archive-exam-export-tasks__picker-label {
  font-size: 12px;

  color: var(--dp-text-secondary);
}

.archive-exam-export-tasks__options {
  display: flex;

  flex-wrap: wrap;

  gap: var(--dp-space-2) var(--dp-space-3);
}

.archive-exam-export-tasks__option {
  display: inline-flex;

  align-items: center;

  gap: 6px;

  font-size: 13px;

  color: var(--dp-text-primary);

  cursor: pointer;
}

.archive-exam-export-tasks__option--disabled {
  color: var(--dp-text-tertiary);

  cursor: not-allowed;
}

.archive-exam-export-tasks__file {
  font-family: var(--dp-font-mono);

  font-size: 12px;
}
</style>
