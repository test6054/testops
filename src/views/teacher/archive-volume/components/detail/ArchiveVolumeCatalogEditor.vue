<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveCatalogStatusCode,
  ArchiveVolumeCatalogLineVO,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_CATALOG_STATUS_TONE,
  ArchiveCatalogStatusDescription,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveVolumeCatalog } from '@/composables/useArchiveVolumeCatalog'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeCatalogPreview from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogPreview.vue'

defineOptions({ name: 'ArchiveVolumeCatalogEditor' })

const props = defineProps<{
  volumeId: string
  catalogStatus?: ArchiveCatalogStatusCode
  readonly?: boolean
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const {
  loading,
  loadFailed,
  saving,
  confirming,
  exporting,
  editableLines,
  catalogStatus,
  isConfirmed,
  loadCatalog,
  generateDraft,
  updateLine,
  saveCatalog,
  confirmCatalog,
  exportCatalog,
} = useArchiveVolumeCatalog(() => props.volumeId)

const effectiveStatus = computed(() => props.catalogStatus ?? catalogStatus.value)

const columns = computed<ColumnsType>(() => [
  { title: '序号', dataIndex: 'lineNo', key: 'lineNo', width: 64 },
  { title: '档号', dataIndex: 'archiveCode', key: 'archiveCode', width: 120 },
  { title: '题名', dataIndex: 'title', key: 'title', width: 220 },
  { title: '责任者', dataIndex: 'responsible', key: 'responsible', width: 120 },
  { title: '页次', dataIndex: 'pageRange', key: 'pageRange', width: 100 },
  { title: '日期', dataIndex: 'fileDate', key: 'fileDate', width: 120 },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 160 },
])

function statusLabel(code: ArchiveCatalogStatusCode) {
  return strictEnumLabel(ArchiveCatalogStatusDescription, code, 'catalogStatus')
}

function statusTone(code: ArchiveCatalogStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_CATALOG_STATUS_TONE, code, 'catalogStatus')
}

function catalogCellValue(
  record: ArchiveVolumeCatalogLineVO,
  dataIndex: unknown,
): string | number | undefined {
  if (dataIndex === 'lineNo') return record.lineNo
  if (dataIndex === 'archiveCode') return record.archiveCode
  if (dataIndex === 'title') return record.title
  if (dataIndex === 'responsible') return record.responsible
  if (dataIndex === 'pageRange') return record.pageRange
  if (dataIndex === 'fileDate') return record.fileDate
  if (dataIndex === 'remark') return record.remark
  throw new Error('归档目录列契约异常')
}

function catalogCellInputValue(record: ArchiveVolumeCatalogLineVO, dataIndex: unknown): string {
  const value = catalogCellValue(record, dataIndex)
  return value === undefined ? '' : String(value)
}

function updateCatalogLineValue(index: number, dataIndex: unknown, value: string): void {
  if (dataIndex === 'archiveCode') {
    updateLine(index, { archiveCode: value })
    return
  }
  if (dataIndex === 'title') {
    updateLine(index, { title: value })
    return
  }
  if (dataIndex === 'responsible') {
    updateLine(index, { responsible: value })
    return
  }
  if (dataIndex === 'pageRange') {
    updateLine(index, { pageRange: value })
    return
  }
  if (dataIndex === 'fileDate') {
    updateLine(index, { fileDate: value })
    return
  }
  if (dataIndex === 'remark') {
    updateLine(index, { remark: value })
    return
  }
  throw new Error('归档目录编辑列契约异常')
}

async function handleGenerateDraft() {
  await generateDraft()
  emit('refreshed')
}

async function handleSave() {
  await saveCatalog()
  emit('refreshed')
}

async function handleConfirm() {
  await confirmCatalog()
  emit('refreshed')
}

onMounted(() => {
  void loadCatalog()
})

defineExpose({ loadCatalog })
</script>

<template>
  <WorkbenchSurfaceCard flush class="archive-volume-catalog-editor">
    <template #head>
      <div class="archive-volume-catalog-editor__title-wrap">
        <h3 class="archive-volume-catalog-editor__title">归档目录</h3>
        <span v-if="editableLines.length > 0" class="archive-volume-catalog-editor__meta">
          {{ editableLines.length }} 条目
        </span>
        <UiTag :tone="statusTone(effectiveStatus)" size="sm">
          {{ statusLabel(effectiveStatus) }}
        </UiTag>
      </div>
    </template>
    <template v-if="!readonly" #toolbar>
      <div class="archive-volume-catalog-editor__actions">
        <UiButton
          size="sm"
          variant="outline"
          :loading="saving"
          :disabled="isConfirmed || loadFailed"
          @click="handleGenerateDraft"
        >
          生成草稿
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          :loading="saving"
          :disabled="isConfirmed || loadFailed || editableLines.length === 0"
          @click="handleSave"
        >
          保存
        </UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :loading="confirming"
          :disabled="isConfirmed || loadFailed || editableLines.length === 0"
          @click="handleConfirm"
        >
          确认目录
        </UiButton>
        <UiButton
          size="sm"
          variant="ghost"
          :loading="exporting"
          :disabled="editableLines.length === 0"
          @click="exportCatalog"
        >
          导出
        </UiButton>
      </div>
    </template>

    <UiAlertStrip
      v-if="loadFailed"
      tone="error"
      title="目录加载失败"
      description="当前保留的是上次成功加载的内容，重新加载成功前不能编辑或确认。"
      :inline="false"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" :loading="loading" @click="loadCatalog">
          重新加载
        </UiButton>
      </template>
    </UiAlertStrip>

    <UiSkeletonState v-if="loading" variant="card" compact />

    <UiEmpty v-else-if="editableLines.length === 0" description="尚未生成目录草稿" />

    <ArchiveVolumeCatalogPreview
      v-else-if="readonly || isConfirmed"
      :lines="editableLines"
      :catalog-status="effectiveStatus"
    />

    <UiDataTable
      v-else
      pagination-mode="none"
      :columns="columns"
      :data-source="editableLines"
      :show-pagination="false"
      flat
      row-key="lineNo"
      size="middle"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="readonly || isConfirmed">
          {{ catalogCellValue(record, column.dataIndex) }}
        </template>
        <template v-else-if="column.key === 'lineNo'">
          {{ record.lineNo }}
        </template>
        <template v-else>
          <a-input
            :value="catalogCellInputValue(record, column.dataIndex)"
            size="small"
            allow-clear
            @update:value="updateCatalogLineValue(index, column.dataIndex, $event)"
          />
        </template>
      </template>
    </UiDataTable>
  </WorkbenchSurfaceCard>
</template>

<style scoped>
.archive-volume-catalog-editor {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.archive-volume-catalog-editor__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3);
}

.archive-volume-catalog-editor__title-wrap {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-volume-catalog-editor__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-catalog-editor__meta {
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
}

.archive-volume-catalog-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}
</style>
