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
      :loading="loading === true"
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
            :max-visible="2"
            v-if="canManageOwnerLedgerWrites === true"
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

const props = withDefaults(
  defineProps<{
  examId: string
  pendingDuplicateCount: number
  /** MVR-264：主考写能力；非主考不展示处置 */
  canManageOwnerLedgerWrites?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
}>(),
  {
  canManageOwnerLedgerWrites: false,
  },
)

defineEmits<{ (e: 'resolve', record: ExamPaperDuplicateResolutionVO): void }>()

/** 列表加载由父页 examLoadGeneration 编排；本卡不自拉，避免与 loadAll 双请求。 */
const { rows, loading, pageNum, pageSize, pageTotal, filters, loadError, loadPage, handlePageChange }
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
    title: '基准答卷',
    key: 'firstPaper',
    width: 180,
    ellipsis: true,
    customRender: ({ record }) => record.firstPageEvidence?.paperDisplay?.primaryText || '—',
  },
  {
    title: '重复答卷',
    key: 'secondPaper',
    width: 180,
    ellipsis: true,
    customRender: ({ record }) => record.secondPageEvidence?.paperDisplay?.primaryText || '—',
  },
  {
    title: '批次',
    key: 'batch',
    width: 160,
    ellipsis: true,
    customRender: ({ record }) =>
      record.firstPageEvidence?.scanBatchDisplayName
      || record.secondPageEvidence?.scanBatchDisplayName
      || '—',
  },
  {
    title: '模板页',
    key: 'templatePage',
    width: 90,
    customRender: ({ record }) =>
      record.firstPageEvidence?.templatePageNo
      ?? record.secondPageEvidence?.templatePageNo
      ?? '—',
  },
  {
    title: '扫描时间',
    key: 'scannedTime',
    width: 170,
    customRender: ({ record }) =>
      record.firstPageEvidence?.scannedTime || record.secondPageEvidence?.scannedTime || '—',
  },
  { title: '状态', key: 'resolutionStatus', width: 100 },
  { title: '主行动', key: 'actions', width: 100 },
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

/**
 * 按当前 examId 重置到第 1 页并拉取待处置重复列表。
 * 必须 await 真实分页请求，供父页世代隔离与写后刷新编排。
 */
async function reload(): Promise<boolean> {
  if (!props.examId) {
    return false
  }
  filters.value = { examId: props.examId }
  pageNum.value = 1
  return loadPage()
}

defineExpose({ reload })
</script>

<style lang="scss" scoped>
.duplicate-resolution {
  border-top: 1px solid var(--dp-border);
  padding-top: var(--dp-space-block);
}

.duplicate-resolution__head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
}

.duplicate-resolution__title {
  margin: 0;
  font-size: var(--dp-font-size-lg);
  font-weight: var(--dp-font-weight-title);
  line-height: 1.5;
}
</style>
