<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveCatalogStatusCode } from '@/apis/mark/archive-volume'
import {
  ARCHIVE_CATALOG_STATUS_LABEL,
  ARCHIVE_CATALOG_STATUS_TONE,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { useArchiveVolumeCatalog } from '@/composables/useArchiveVolumeCatalog'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

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
  return strictEnumLabel(ARCHIVE_CATALOG_STATUS_LABEL, code, 'catalogStatus')
}

function statusTone(code: ArchiveCatalogStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_CATALOG_STATUS_TONE, code, 'catalogStatus')
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
  <section class="archive-volume-catalog-editor">
    <div class="archive-volume-catalog-editor__head">
      <div class="archive-volume-catalog-editor__title-wrap">
        <h3 class="archive-volume-catalog-editor__title">归档目录编制</h3>
        <UiTag :tone="statusTone(effectiveStatus)" size="sm">
          {{ statusLabel(effectiveStatus) }}
        </UiTag>
      </div>
      <div v-if="!readonly" class="archive-volume-catalog-editor__actions">
        <UiButton
          size="sm"
          variant="outline"
          :loading="saving"
          :disabled="isConfirmed"
          @click="handleGenerateDraft"
        >
          生成草稿
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          :loading="saving"
          :disabled="isConfirmed || editableLines.length === 0"
          @click="handleSave"
        >
          保存
        </UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :loading="confirming"
          :disabled="isConfirmed || editableLines.length === 0"
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
    </div>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 6 }" />

    <UiEmpty v-else-if="editableLines.length === 0" description="尚未生成目录草稿" />

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
          {{ record[column.dataIndex as keyof typeof record] }}
        </template>
        <template v-else-if="column.key === 'lineNo'">
          {{ record.lineNo }}
        </template>
        <template v-else>
          <a-input
            :value="record[column.dataIndex as keyof typeof record] as string"
            size="small"
            allow-clear
            @update:value="updateLine(index, { [column.dataIndex as string]: $event })"
          />
        </template>
      </template>
    </UiDataTable>
  </section>
</template>

<style scoped>
.archive-volume-catalog-editor {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-catalog-editor__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
}

.archive-volume-catalog-editor__title-wrap {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-catalog-editor__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-catalog-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}
</style>
