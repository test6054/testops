<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveCatalogStatusCode,
  ArchiveVolumeCatalogLineVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted } from 'vue'
import {
  ARCHIVE_CATALOG_STATUS_TONE,
  ArchiveCatalogStatusDescription,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveVolumeCatalog } from '@/composables/useArchiveVolumeCatalog'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeCatalogPreview from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogPreview.vue'

defineOptions({ name: 'ArchiveVolumeCatalogEditor' })

const props = withDefaults(
  defineProps<{
    volumeId: string
    catalogStatus?: ArchiveCatalogStatusCode
    readonly?: boolean
  }>(),
  {
    // MVR-380：默认拒绝假可写；仅父级显式 :readonly="false"（canEditCatalog）可写
    readonly: true,
  },
)

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
  requiredCoverageReady,
  requiredCoverageGaps,
  canConfirmCatalog,
  loadCatalog,
  generateDraft,
  updateLine,
  saveCatalog,
  confirmCatalog,
  exportCatalog,
} = useArchiveVolumeCatalog(() => props.volumeId)

const effectiveStatus = computed(() => props.catalogStatus ?? catalogStatus.value)
const coverageGapSummary = computed(() => {
  const gaps = requiredCoverageGaps.value
  if (gaps.length === 0) return ''
  return gaps.map(gap => gap.missingReason).join('；')
})

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

/** UiDataTable 插槽 record 为 unknown，收窄为目录行 API VO。 */
function catalogLine(record: unknown): ArchiveVolumeCatalogLineVO {
  return record as ArchiveVolumeCatalogLineVO
}

function catalogCellValue(record: unknown, dataIndex: unknown): string | number | undefined {
  const row = catalogLine(record)
  if (dataIndex === 'lineNo') return row.lineNo
  if (dataIndex === 'archiveCode') return row.archiveCode
  if (dataIndex === 'title') return row.title
  if (dataIndex === 'responsible') return row.responsible
  if (dataIndex === 'pageRange') return row.pageRange
  if (dataIndex === 'fileDate') return row.fileDate
  if (dataIndex === 'remark') return row.remark
  throw new Error('归档目录列契约异常')
}

function catalogCellInputValue(record: unknown, dataIndex: unknown): string {
  const value = catalogCellValue(record, dataIndex)
  return value === undefined ? '' : String(value)
}

/** 按目录行 API 字段写回草稿；index 来自表格插槽，须为有效行号。 */
function updateCatalogLineValue(
  index: unknown,
  dataIndex: unknown,
  value: string | number | undefined,
): void {
  // MVR-380：单元格编辑二次拦截；withDefaults 后 readonly 恒为 boolean，默认 true 拒写
  if (props.readonly !== false) {
    return
  }
  if (typeof index !== 'number' || index < 0) {
    throw new Error('归档目录行号契约异常')
  }
  const next = value == null ? '' : String(value)
  if (dataIndex === 'archiveCode') {
    updateLine(index, { archiveCode: next })
    return
  }
  if (dataIndex === 'title') {
    updateLine(index, { title: next })
    return
  }
  if (dataIndex === 'responsible') {
    updateLine(index, { responsible: next })
    return
  }
  if (dataIndex === 'pageRange') {
    updateLine(index, { pageRange: next })
    return
  }
  if (dataIndex === 'fileDate') {
    updateLine(index, { fileDate: next })
    return
  }
  if (dataIndex === 'remark') {
    updateLine(index, { remark: next })
    return
  }
  throw new Error('归档目录编辑列契约异常')
}

async function handleGenerateDraft() {
  // MVR-299/380：readonly 二次拦截（父级 canEditCatalog）
  if (props.readonly !== false) {
    void message.warning('当前账号无目录编辑权限')
    return
  }
  await generateDraft()
  emit('refreshed')
}

async function handleSave() {
  // MVR-299/380：readonly 二次拦截（父级 canEditCatalog）
  if (props.readonly !== false) {
    void message.warning('当前账号无目录编辑权限')
    return
  }
  // MVR-937：入口再认 saving/confirming，与 composable 内闸双保险
  if (saving.value === true || confirming.value === true || exporting.value === true) {
    return
  }
  await saveCatalog()
  emit('refreshed')
}

async function handleConfirm() {
  // MVR-299/380：readonly 二次拦截（父级 canEditCatalog）
  if (props.readonly !== false) {
    void message.warning('当前账号无目录编辑权限')
    return
  }
  // MVR-937：入口再认 saving/confirming，与 composable 内闸双保险
  if (saving.value === true || confirming.value === true || exporting.value === true) {
    return
  }
  if (!canConfirmCatalog.value) {
    void message.error(coverageGapSummary.value || '必交材料未覆盖，无法确认目录')
    return
  }
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
    <template v-if="readonly === false && editableLines.length > 0" #toolbar>
      <div class="archive-volume-catalog-editor__actions">
        <UiButton
          size="sm"
          variant="outline"
          :loading="saving === true"
          :disabled="isConfirmed || loadFailed"
          @click="handleGenerateDraft"
        >
          生成草稿
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          :loading="saving === true"
          :disabled="isConfirmed || loadFailed || editableLines.length === 0"
          @click="handleSave"
        >
          保存
        </UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :loading="confirming === true"
          :disabled="!canConfirmCatalog"
          @click="handleConfirm"
        >
          确认目录
        </UiButton>
        <UiButton
          size="sm"
          variant="ghost"
          :loading="exporting === true"
          :disabled="editableLines.length === 0"
          @click="exportCatalog"
        >
          导出
        </UiButton>
      </div>
    </template>

    <UiAlertStrip
      v-if="loadFailed === true"
      tone="error"
      title="目录加载失败"
      :inline="false"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" :loading="loading === true" @click="loadCatalog">
          重新加载
        </UiButton>
      </template>
    </UiAlertStrip>
    <UiAlertStrip
      v-else-if="readonly === false && isConfirmed !== true && requiredCoverageReady !== true && requiredCoverageGaps.length > 0"
      tone="warning"
      title="必交材料未覆盖，暂不可确认目录"
      :description="coverageGapSummary"
      :inline="false"
    />
    <UiSkeletonState v-if="loading" variant="card" compact />

    <div v-else-if="editableLines.length === 0" class="archive-volume-catalog-editor__empty-strip">
      <span class="archive-volume-catalog-editor__empty-text">尚未生成目录草稿</span>
      <UiButton
        v-if="readonly === false"
        size="sm"
        variant="primary"
        :loading="saving === true"
        :disabled="loadFailed === true"
        @click="handleGenerateDraft"
      >
        生成草稿
      </UiButton>
    </div>

    <ArchiveVolumeCatalogPreview
      v-else-if="readonly !== false || isConfirmed"
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
        <template v-if="readonly !== false || isConfirmed">
          {{ catalogCellValue(record, column.dataIndex) }}
        </template>
        <template v-else-if="column.key === 'lineNo'">
          {{ catalogLine(record).lineNo }}
        </template>
        <template v-else>
          <UiInput
            size="small"
            clearable
            :model-value="catalogCellInputValue(record, column.dataIndex)"
            @update:model-value="
              (value: string | number | undefined) =>
                updateCatalogLineValue(index, column.dataIndex, value)
            "
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
  gap: var(--dp-space-block);
}

.archive-volume-catalog-editor__title-wrap {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}

.archive-volume-catalog-editor__title {
  margin: 0;
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
}

.archive-volume-catalog-editor__meta {
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
}

.archive-volume-catalog-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.archive-volume-catalog-editor__empty-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  min-height: 48px;
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px dashed var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: color-mix(in srgb, var(--dp-gray-50) 80%, var(--dp-surface));
}

.archive-volume-catalog-editor__empty-text {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
</style>
