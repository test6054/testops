<script lang="ts" setup>
import type { ExportTaskResponse } from '@/apis/mark/exam-export'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createExportTask, EXPORT_STATUS_TONE, listExportTasks } from '@/apis/mark/exam-export'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { ExportScopeCode } from '@/types/enums/export-scope-enum'
import {
  ExportTaskStatusCode,
  ExportTaskStatusDescription,
} from '@/types/enums/export-task-status-enum'
import {
  ALL_EXPORT_TYPE_CODES,
  ExportTypeCode,
  ExportTypeDescription,
} from '@/types/enums/export-type-enum'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime, formatFileSize } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveExamExportTasksCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    /** 双门禁已满足时才允许创建导出任务 */
    canCreate?: boolean
    /** MVR-271：影像归档包仅主考；与 BE requireExamOwnerPermission 对齐 */
    canManageOwnerImageArchiveExport?: boolean
  }>(),
  {
    canCreate: false,
    canManageOwnerImageArchiveExport: false,
  },
)

const router = useRouter()

const loading = ref(false)

const creating = ref(false)

const loadFailed = ref(false)
const lastSuccessAtMs = ref<number | null>(null)
const tasks = ref<ExportTaskResponse[]>([])
const selectedTypes = ref<ExportTypeCode[]>([])

const lastSuccessLabel = computed(() => {
  if (lastSuccessAtMs.value == null) {
    return '尚未成功同步'
  }
  return formatDateTime(new Date(lastSuccessAtMs.value).toISOString())
})

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
        && !props.canManageOwnerImageArchiveExport),

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
    lastSuccessAtMs.value = null
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

    lastSuccessAtMs.value = Date.now()

    selectedTypes.value = selectedTypes.value.filter((type) => !busyExportTypes.value.has(type))
  } catch (error) {
    loadFailed.value = true

    showUserError(error, '加载导出任务失败')
  } finally {
    loading.value = false
  }
}

async function createSelectedTasks(): Promise<void> {
  // MVR-424：与 v-if canCreate / 父页 gateOpen 同源二次闸；影像包再认主考 can*
  if (!props.canCreate) {
    void message.warning('双门禁未满足，暂不可创建导出任务')
    return
  }
  if (!props.examId || !hasSelectedTypes.value || creating.value) {
    return
  }

  creating.value = true

  const plannedTypes = [...selectedTypes.value]
  const succeededTypes: ExportTypeCode[] = []
  const failedLabels: string[] = []

  try {
    const blockedImageArchive = plannedTypes.some(
      (exportType) =>
        exportType === ExportTypeCode.IMAGE_ARCHIVE
        && !props.canManageOwnerImageArchiveExport,
    )
    if (blockedImageArchive) {
      void message.warning('仅考试主考可创建影像归档包导出任务')
      return
    }

    for (const exportType of plannedTypes) {
      try {
        await createExportTask({
          examId: props.examId,
          exportType,
          exportScope: ExportScopeCode.EXAM,
        })
        succeededTypes.push(exportType)
      } catch (error) {
        failedLabels.push(
          `${exportTypeLabel(exportType)}：${getUserErrorMessage(error, '创建失败')}`,
        )
      }
    }

    // 仅移除已成功类型，失败项保留勾选供重试，避免重复提交成功项
    if (succeededTypes.length > 0) {
      const succeeded = new Set(succeededTypes)
      selectedTypes.value = selectedTypes.value.filter((type) => !succeeded.has(type))
    }

    if (succeededTypes.length > 0 && failedLabels.length === 0) {
      void message.success(`已创建 ${succeededTypes.length} 个导出任务`)
    } else if (succeededTypes.length > 0 && failedLabels.length > 0) {
      void message.warning(
        `已创建 ${succeededTypes.length} 个导出任务；${failedLabels.length} 个失败：${failedLabels.join('；')}`,
      )
    } else if (failedLabels.length > 0) {
      showUserError(new Error(failedLabels.join('；')), '创建导出任务失败')
    }
  } finally {
    creating.value = false
  }

  // 列表刷新与创建结果分离：刷新失败不回写「创建失败」
  try {
    await loadTasks()
  } catch {
    // loadTasks 内部已展示错误
  }
}

watch(
  () => props.examId,

  () => {
    lastSuccessAtMs.value = null
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
      <div class="archive-exam-export-tasks__toolbar">
        <span class="archive-exam-export-tasks__sync">最近成功同步：{{ lastSuccessLabel }}</span>
        <UiButton variant="ghost" size="sm" @click="goExportTasksPage"> 查看全部 </UiButton>
      </div>
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

    <UiAlertStrip
      v-if="loadFailed && displayTasks.length > 0"
      tone="warning"
      class="archive-exam-export-tasks__stale"
      title="导出任务列表可能已过期"
      :description="`最近成功同步：${lastSuccessLabel}`"
    />

    <UiEmpty
      v-if="loadFailed && displayTasks.length === 0"
      size="sm"
      description="导出任务加载失败"
    />

    <UiEmpty
      v-else-if="!loadFailed && !loading && displayTasks.length === 0"
      size="sm"
      description="暂无导出任务"
    />

    <UiDataTable
      v-if="loading || displayTasks.length > 0"
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
.archive-exam-export-tasks__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
  width: 100%;
}

.archive-exam-export-tasks__sync {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}

.archive-exam-export-tasks__picker {
  display: flex;

  flex-direction: column;

  gap: var(--dp-space-component-tight);

  padding: var(--dp-space-component);

  border-bottom: 1px solid var(--dp-border-subtle);
}

.archive-exam-export-tasks__picker-label {
  font-size: var(--dp-font-size-xs);

  color: var(--dp-text-secondary);
}

.archive-exam-export-tasks__options {
  display: flex;

  flex-wrap: wrap;

  gap: var(--dp-space-component-tight) var(--dp-space-component);
}

.archive-exam-export-tasks__option {
  display: inline-flex;

  align-items: center;

  gap: var(--dp-space-component-tight);

  font-size: var(--dp-font-size-sm);

  color: var(--dp-text-primary);

  cursor: pointer;
}

.archive-exam-export-tasks__option--disabled {
  color: var(--dp-text-muted);

  cursor: not-allowed;
}

.archive-exam-export-tasks__file {
  font-family: var(--dp-font-family-code);

  font-size: var(--dp-font-size-xs);
}
</style>
