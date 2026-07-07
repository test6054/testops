<template>
  <UiDataTable
    :current="current"
    :page-size="pageSize"
    :columns="columns"
    :data-source="items"
    :loading="loading"
    :total="total"
    :scroll="{ x: 1280 }"
    row-key="candidateRosterId"
    flat
    empty-kind="first-run"
    :empty-description="emptyDescription"
    @update:current="(value) => emit('page-change', value, pageSize)"
    @update:page-size="(value) => emit('page-change', current, value)"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'student'">
        <div class="manual-supplement-candidate-table__student">
          <span class="manual-supplement-candidate-table__name">{{ record.studentName }}</span>
          <span class="manual-supplement-candidate-table__no">{{ record.studentNo }}</span>
        </div>
      </template>
      <template v-else-if="column.key === 'className'">
        {{ record.className || '—' }}
      </template>
      <template v-else-if="column.key === 'pageProgress'">
        {{ record.scannedPageCount }} / {{ record.expectedPageCount ?? '—' }}
      </template>
      <template v-else-if="column.key === 'missingPages'">
        <template v-if="record.missingTemplatePageNos.length > 0">
          <UiTag
            v-for="pageNo in record.missingTemplatePageNos"
            :key="`${record.candidateRosterId}-${pageNo}`"
            tone="orange"
            size="sm"
          >
            缺 {{ pageNo }} 页
          </UiTag>
        </template>
        <span v-else class="manual-supplement-candidate-table__muted">—</span>
      </template>
      <template v-else-if="column.key === 'scanProgressStatus'">
        <UiTag :tone="scanProgressTone(record.scanProgressStatus)" size="sm">
          {{ formatScanProgressLabel(record) }}
        </UiTag>
      </template>
      <template v-else-if="column.key === 'actions'">
        <UiTableActions
          :items="buildActions(record)"
          split
          @action="(key) => handleAction(key, record)"
        />
      </template>
    </template>
  </UiDataTable>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamManualSupplementCandidateItemResponse } from '@/apis/mark/manual-supplement'
import type { BadgeTone, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import {
  CANDIDATE_SCAN_PROGRESS_STATUS_TONE,
  CandidateScanProgressStatusCode,
  CandidateScanProgressStatusDescription,
} from '@/types/enums/candidate-scan-progress-status-enum'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ManualSupplementCandidateTable' })

defineProps<{
  items: ExamManualSupplementCandidateItemResponse[]
  loading: boolean
  current: number
  pageSize: number
  total: number
  emptyDescription: string
}>()

const emit = defineEmits<{
  'page-change': [pageNum: number, pageSize: number]
  'supplement-missing': [record: ExamManualSupplementCandidateItemResponse, targetPageNo?: number]
  'replace-page': [record: ExamManualSupplementCandidateItemResponse, targetPageNo: number]
  'handle-attention': [record: ExamManualSupplementCandidateItemResponse]
}>()

const columns: ColumnType<ExamManualSupplementCandidateItemResponse>[] = [
  { title: '考生', key: 'student', width: 160, fixed: 'left' },
  { title: '班级', key: 'className', width: 120 },
  { title: '已扫/应有', key: 'pageProgress', width: 100, align: 'right' },
  { title: '缺口页', key: 'missingPages', width: 220 },
  { title: '扫描状态', key: 'scanProgressStatus', width: 110 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

function scanProgressLabel(status: CandidateScanProgressStatusCode): string {
  return strictEnumLabel(CandidateScanProgressStatusDescription, status, '考生扫描进度状态')
}

function formatScanProgressLabel(record: ExamManualSupplementCandidateItemResponse): string {
  const label = scanProgressLabel(record.scanProgressStatus)
  if (
    record.scanProgressStatus === CandidateScanProgressStatusCode.ATTENTION_OPEN
    && record.openAttentionCount > 0
  ) {
    return `${label} (${record.openAttentionCount})`
  }
  return label
}

function scanProgressTone(status: CandidateScanProgressStatusCode): BadgeTone {
  return strictEnumTone(CANDIDATE_SCAN_PROGRESS_STATUS_TONE, status, '考生扫描进度状态')
}

function buildActions(record: ExamManualSupplementCandidateItemResponse): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (
    record.scanProgressStatus === CandidateScanProgressStatusCode.ATTENTION_OPEN
    || record.scanProgressStatus === CandidateScanProgressStatusCode.CONFLICT
  ) {
    actions.push({ key: 'handle-attention', label: '处理异常', tone: 'danger' })
  }
  if (record.supplementEligible && record.missingTemplatePageNos.length > 0) {
    actions.push({
      key: 'supplement-missing',
      label: record.missingTemplatePageNos.length === 1 ? '补扫缺页' : '补扫首缺页',
    })
  }
  if (record.replaceEligible && record.paperInstanceId && record.scannedPageCount > 0) {
    actions.push({ key: 'replace-page', label: '替换页' })
  }
  if (actions.length > 0) {
    return actions
  }
  const blockReason = record.blockReason || record.replaceBlockReason
  return blockReason ? [{ key: 'blocked', label: '不可补扫', disabled: true }] : []
}

function handleAction(key: string, record: ExamManualSupplementCandidateItemResponse): void {
  if (key === 'supplement-missing') {
    emit('supplement-missing', record, record.missingTemplatePageNos[0])
    return
  }
  if (key === 'handle-attention') {
    emit('handle-attention', record)
    return
  }
  if (key === 'replace-page') {
    emit('replace-page', record, record.missingTemplatePageNos[0] ?? 1)
  }
}
</script>

<style lang="scss" scoped>
.manual-supplement-candidate-table__student {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.manual-supplement-candidate-table__name {
  font-weight: 500;
  color: var(--ant-color-text);
}

.manual-supplement-candidate-table__no {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.manual-supplement-candidate-table__muted {
  color: var(--ant-color-text-secondary);
}
</style>
