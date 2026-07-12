<template>
  <UiDataTable
    v-model:current="currentPage"
    v-model:page-size="currentPageSize"
    :columns="columns"
    :data-source="items"
    :loading="loading"
    :total="total"
    row-key="candidateRosterId"
    size="middle"
    flat
    bordered
    class="exam-candidate-workbench-table"
    @page-change="(pageInfo) => emit('page-change', pageInfo)"
  >
    <template #bodyCell="{ column, index }">
      <template v-if="column.key === 'student'">
        <div class="exam-candidate-workbench-table__student">
          <span class="exam-candidate-workbench-table__name">{{ items[index].studentName }}</span>
          <span class="exam-candidate-workbench-table__no">{{ items[index].studentNo }}</span>
        </div>
      </template>
      <template v-else-if="column.key === 'className'">
        <span class="exam-candidate-workbench-table__muted">{{
          items[index].className || '—'
        }}</span>
      </template>
      <template v-else-if="column.key === 'scanProgressStatus'">
        <UiTag :tone="scanProgressTone(items[index].scanProgressStatus)" size="sm">
          {{ scanProgressLabel(items[index].scanProgressStatus) }}
        </UiTag>
      </template>
      <template v-else-if="column.key === 'scanPages'">
        <span class="exam-candidate-workbench-table__mono">
          <template v-if="items[index].expectedPageCount != null">
            {{ items[index].scannedPageCount }}/{{ items[index].expectedPageCount }}
          </template>
          <template v-else>
            {{ items[index].scannedPageCount }}
          </template>
        </span>
      </template>
      <template v-else-if="column.key === 'paperDisplay'">
        <div v-if="items[index].paperDisplay" class="exam-candidate-workbench-table__paper">
          <span>{{ items[index].paperDisplay!.primaryText }}</span>
          <span
            v-if="items[index].paperDisplay!.secondaryText"
            class="exam-candidate-workbench-table__muted"
          >
            {{ items[index].paperDisplay!.secondaryText }}
          </span>
        </div>
        <span v-else class="exam-candidate-workbench-table__muted">—</span>
      </template>
      <template v-else-if="column.key === 'actions'">
        <UiTableActions
          v-if="buildActions(items[index]).length"
          :items="buildActions(items[index])"
          split
          @action="(key) => emit('action', key, items[index])"
        />
        <span v-else class="exam-candidate-workbench-table__muted">—</span>
      </template>
    </template>
  </UiDataTable>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamCandidateRosterWorkbenchItemResponse } from '@/apis/mark/exam-candidate-roster'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import {
  CANDIDATE_SCAN_PROGRESS_STATUS_TONE,
  CandidateScanProgressStatusCode,
  CandidateScanProgressStatusDescription,
} from '@/types/enums/candidate-scan-progress-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ExamCandidateWorkbenchTable' })

const currentPage = defineModel<number>('current', { default: 1 })

const currentPageSize = defineModel<number>('pageSize', { default: 20 })

const props = withDefaults(
  defineProps<{
    items: ExamCandidateRosterWorkbenchItemResponse[]
    loading?: boolean
    total?: number
    showRemoveAction?: boolean
  }>(),
  {
    loading: false,
    total: 0,
    showRemoveAction: false,
  },
)

const emit = defineEmits<{
  'page-change': [pageEvent: { current: number; pageSize: number }]
  action: [key: string, item: ExamCandidateRosterWorkbenchItemResponse]
}>()

const columns = computed<ColumnType<ExamCandidateRosterWorkbenchItemResponse>[]>(() => {
  const cols: ColumnType<ExamCandidateRosterWorkbenchItemResponse>[] = [
    { title: '考生', key: 'student', width: 200, fixed: 'left' },
    { title: '班级', key: 'className', width: 160 },
    { title: '扫描状态', key: 'scanProgressStatus', width: 110 },
    { title: '页数', key: 'scanPages', width: 88 },
    { title: '答卷', key: 'paperDisplay', width: 220 },
    { title: '操作', key: 'actions', width: 160 },
  ]
  return cols
})

function scanProgressLabel(status: CandidateScanProgressStatusCode): string {
  return strictEnumLabel(CandidateScanProgressStatusDescription, status, '考生扫描进度状态')
}

function scanProgressTone(status: CandidateScanProgressStatusCode) {
  return CANDIDATE_SCAN_PROGRESS_STATUS_TONE[status]
}

function buildActions(item: ExamCandidateRosterWorkbenchItemResponse): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (item.paperInstanceId) {
    actions.push({ key: 'view-images', label: '查看影像' })
  }
  if (item.scanProgressStatus === CandidateScanProgressStatusCode.INCOMPLETE_SCAN) {
    actions.push({ key: 'supplement-missing', label: '去补扫', tone: 'primary' })
  }
  if (
    item.scanProgressStatus === CandidateScanProgressStatusCode.ATTENTION_OPEN ||
    item.scanProgressStatus === CandidateScanProgressStatusCode.CONFLICT
  ) {
    actions.push({ key: 'handle-attention', label: '处理异常', tone: 'danger' })
  }
  if (props.showRemoveAction && item.removable !== false) {
    actions.push({ key: 'remove', label: '移除', tone: 'danger' })
  } else if (props.showRemoveAction && item.removable === false) {
    actions.push({
      key: 'remove-blocked',
      label: '不可移除',
      disabled: true,
    })
  }
  return actions
}
</script>

<style lang="scss" scoped>
.exam-candidate-workbench-table {
  &__student {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-weight: 500;
    color: var(--ant-color-text);
  }

  &__no {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }

  &__mono {
    font-variant-numeric: tabular-nums;
    color: var(--ant-color-text);
  }

  &__muted {
    color: var(--ant-color-text-secondary);
  }

  &__paper {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
  }
}
</style>
