<template>
  <section class="duplicate-resolution">
    <header class="duplicate-resolution__head">
      <h3 class="duplicate-resolution__title">待处置重复影像</h3>
      <UiTag tone="orange" size="sm">待处置 {{ pendingDuplicateCount }}</UiTag>
    </header>

    <UiDataTable
      v-model:current="pageNum"
      v-model:page-size="pageSize"
      pagination-mode="server"
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :load-error="loadError"
      :total="pageTotal"
      :sticky-header="false"
      flat
      row-key="id"
      size="small"
      empty-kind="first-run"
      empty-description="暂无待处置重复影像，扫描对账正常"
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, index }">
        <template v-if="column.key === 'resolutionStatus'">
          <UiTag :tone="duplicateStatusColor(rows[index])">
            {{ duplicateStatusLabel(rows[index]) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            v-if="canManageOwnerLedgerWrites"
            :items="[{ key: 'resolve', label: '处置' }]"
            split
            @action="() => $emit('resolve', rows[index])"
          />
          <span v-else class="duplicate-resolution__readonly">仅主考可处置</span>
        </template>
      </template>
    </UiDataTable>
  </section>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamPaperDuplicateResolutionVO } from '@/apis/mark/image-ledger'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { watch } from 'vue'
import {
  DUPLICATE_RESOLUTION_STATUS_TONE,
  DuplicateResolutionStatusDescription,
} from '@/apis/mark/duplicate-resolution-status'
import { pagePendingDuplicates } from '@/apis/mark/image-ledger'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'DuplicateResolutionCard' })

const props = defineProps<{
  examId: string
  pendingDuplicateCount: number
  /** MVR-264：主考写能力；非主考不展示处置 */
  canManageOwnerLedgerWrites?: boolean
}>()

defineEmits<{ (e: 'resolve', record: ExamPaperDuplicateResolutionVO): void }>()

const { rows, loading, pageNum, pageSize, pageTotal, filters, loadError, loadPage, search, handlePageChange }
  = useQueryTable<ExamPaperDuplicateResolutionVO, { examId: string }>(
    (params) => pagePendingDuplicates(params),
    {
      defaultFilters: () => ({ examId: props.examId }),
      immediate: false,
      errorMessage: '重复扫描记录加载失败',
    },
  )

const columns: ColumnType<ExamPaperDuplicateResolutionVO>[] = [
  {
    title: '页面哈希',
    dataIndex: 'pageHash',
    key: 'pageHash',
    width: 220,
    ellipsis: true,
    fixed: 'left',
  },
  { title: '基准扫描页', dataIndex: 'firstPageId', key: 'firstPageId', width: 120 },
  { title: '重复扫描页', dataIndex: 'secondPageId', key: 'secondPageId', width: 120 },
  {
    title: '基准试卷',
    dataIndex: 'firstPaperInstanceId',
    key: 'firstPaperInstanceId',
    width: 140,
  },
  {
    title: '重复试卷',
    dataIndex: 'secondPaperInstanceId',
    key: 'secondPaperInstanceId',
    width: 140,
  },
  { title: '状态', key: 'resolutionStatus', width: 100 },
  { title: '操作', key: 'actions', width: 100 },
]

function duplicateStatusColor(row: ExamPaperDuplicateResolutionVO): BadgeTone {
  return strictEnumTone(DUPLICATE_RESOLUTION_STATUS_TONE, row.resolutionStatus, '重复影像处置状态')
}

function duplicateStatusLabel(row: ExamPaperDuplicateResolutionVO): string {
  return strictEnumLabel(
    DuplicateResolutionStatusDescription,
    row.resolutionStatus,
    '重复影像处置状态',
  )
}

async function reload(): Promise<void> {
  if (!props.examId) return
  filters.value = { examId: props.examId }
  search()
}

watch(
  () => props.examId,
  () => {
    void reload()
  },
  { immediate: true },
)

defineExpose({ reload })
</script>

<style lang="scss" scoped>
.duplicate-resolution {
  border-top: 1px solid var(--dp-border);
  padding-top: var(--dp-space-4);
}

.duplicate-resolution__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--dp-space-3);
}

.duplicate-resolution__title {
  margin: 0;
  font-size: var(--dp-font-size-lg);
  font-weight: var(--dp-font-weight-title);
  line-height: 1.5;
}
</style>
