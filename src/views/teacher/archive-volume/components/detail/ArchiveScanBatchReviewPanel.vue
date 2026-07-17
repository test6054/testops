<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { Key } from 'ant-design-vue/es/table/interface'
import type { ArchiveScanBatchSnapshotItemVO } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  batchConfirmNormalArchiveScanBatches,
  batchDiscardArchiveScanBatches,
  pageArchiveScanBatchSnapshots,
  SCAN_BATCH_QUALITY_FLAG_TONE,
  ScanBatchQualityFlagCode,
  ScanBatchQualityFlagDescription,
} from '@/apis/mark/archive-volume'
import {
  ScanWorkOrderStatusCode,
  ScanWorkOrderStatusDescription,
} from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { getUserErrorMessage, showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  volumeId: string
  canReview: boolean
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const loading = ref(false)
const actionLoading = ref(false)
const errorMessage = ref('')
const pagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const rows = ref<ArchiveScanBatchSnapshotItemVO[]>([])
const selectedRowKeys = ref<string[]>([])
const actionModalOpen = ref(false)
const pendingAction = ref<'confirm-normal' | 'discard'>('confirm-normal')
const actionReason = ref('')
const actionLabel = computed(() =>
  pendingAction.value === 'confirm-normal' ? '确认正常' : '批量作废',
)

const columns: ColumnsType<ArchiveScanBatchSnapshotItemVO> = [
  { title: '批次号', key: 'batchExternalNo', dataIndex: 'batchExternalNo', width: 140 },
  { title: '质检', key: 'batchQualityFlag', dataIndex: 'batchQualityFlag', width: 96 },
  { title: '状态', key: 'workOrderStatus', dataIndex: 'workOrderStatus', width: 96 },
  { title: '页数', key: 'pageCount', dataIndex: 'pageCount', width: 72, align: 'right' },
  {
    title: '材料数',
    key: 'materialCount',
    dataIndex: 'materialCount',
    width: 80,
    align: 'right',
  },
  { title: '诊断', key: 'diagnostic', dataIndex: 'diagnostic', ellipsis: true },
  { title: '更新时间', key: 'updateTime', dataIndex: 'updateTime', width: 160 },
]

const rowSelection = computed(() =>
  props.canReview
    ? {
        selectedRowKeys: selectedRowKeys.value,
        onChange: (keys: Key[]) => {
          selectedRowKeys.value = keys.map(String)
        },
        getCheckboxProps: (record: ArchiveScanBatchSnapshotItemVO) => ({
          disabled:
            record.workOrderStatus !== ScanWorkOrderStatusCode.COMMITTED
            || record.batchQualityFlag !== ScanBatchQualityFlagCode.SUSPECTED_MIXED,
        }),
      }
    : undefined,
)

async function loadRows() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await pageArchiveScanBatchSnapshots({
      volumeId: props.volumeId,
      batchQualityFlag: ScanBatchQualityFlagCode.SUSPECTED_MIXED,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    rows.value = result.list
    pagination.total = result.total
    pagination.pageNum = result.pageNum
    pagination.pageSize = result.pageSize
    selectedRowKeys.value = []
  } catch (error) {
    errorMessage.value = getUserErrorMessage(error)
  } finally {
    loading.value = false
  }
}

function openBatchAction(action: 'confirm-normal' | 'discard') {
  if (selectedRowKeys.value.length === 0) {
    showFormValidationMessage('请先选择批次')
    return
  }
  pendingAction.value = action
  actionReason.value = ''
  actionModalOpen.value = true
}

async function submitBatchAction() {
  const reason = actionReason.value.trim()
  if (!reason) {
    showFormValidationMessage('请填写处置说明')
    return
  }
  const selectedRows = rows.value.filter(
    (row) => row.sourceBatchId && selectedRowKeys.value.includes(String(row.sourceBatchId)),
  )
  if (
    selectedRows.length !== selectedRowKeys.value.length
    || selectedRows.some(
      (row) =>
        row.workOrderStatus !== ScanWorkOrderStatusCode.COMMITTED
        || row.batchQualityFlag !== ScanBatchQualityFlagCode.SUSPECTED_MIXED,
    )
  ) {
    showFormValidationMessage('选中批次状态已变化，请刷新后重新选择')
    return
  }
  actionLoading.value = true
  try {
    const payload = {
      volumeId: props.volumeId,
      workOrderIds: selectedRowKeys.value,
      actionReason: reason,
    }
    if (pendingAction.value === 'confirm-normal') {
      await batchConfirmNormalArchiveScanBatches(payload)
    } else {
      await batchDiscardArchiveScanBatches(payload)
    }
    message.success(`${actionLabel.value}完成`)
    actionModalOpen.value = false
    actionReason.value = ''
    emit('refreshed')
    await loadRows()
  } catch (error) {
    showUserError(error, `${actionLabel.value}失败`)
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  void loadRows()
})
</script>

<template>
  <WorkbenchSurfaceCard flush class="archive-scan-batch-review">
    <template #head>
      <p class="archive-scan-batch-review__hint">
        仅展示质检标记为疑似混扫的已提交批次，可确认正常或作废对应卷内材料。
      </p>
    </template>
    <template v-if="canReview" #toolbar>
      <UiButton
        size="sm"
        variant="outline"
        :disabled="selectedRowKeys.length === 0"
        :loading="actionLoading"
        @click="openBatchAction('confirm-normal')"
      >
        确认正常
      </UiButton>
      <UiButton
        size="sm"
        variant="ghost"
        :disabled="selectedRowKeys.length === 0"
        :loading="actionLoading"
        @click="openBatchAction('discard')"
      >
        批量作废
      </UiButton>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="loadRows"> 刷新 </UiButton>
    </template>
    <p v-if="errorMessage" class="archive-scan-batch-review__error">{{ errorMessage }}</p>
    <UiDataTable
      v-model:current="pagination.pageNum"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :total="pagination.total"
      :row-selection="rowSelection"
      row-key="sourceBatchId"
      size="middle"
      flat
      empty-description="暂无疑似混扫批次"
      @page-change="loadRows"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'batchQualityFlag'">
          <UiTag
            :tone="
              strictEnumTone(
                SCAN_BATCH_QUALITY_FLAG_TONE,
                record.batchQualityFlag,
                'batchQualityFlag',
              )
            "
            size="sm"
          >
            {{
              strictEnumLabel(
                ScanBatchQualityFlagDescription,
                record.batchQualityFlag,
                'batchQualityFlag',
              )
            }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'workOrderStatus'">
          {{
            strictEnumLabel(
              ScanWorkOrderStatusDescription,
              record.workOrderStatus,
              'workOrderStatus',
            )
          }}
        </template>
        <template v-else-if="column.key === 'updateTime'">
          {{ record.updateTime ? formatDateTime(record.updateTime) : '—' }}
        </template>
        <template v-else-if="column.key === 'diagnostic'">
          {{ record.diagnostic || '—' }}
        </template>
      </template>
    </UiDataTable>
    <UiDialog
      v-model:open="actionModalOpen"
      :title="`${actionLabel}疑似混扫批次`"
      ok-text="确认执行"
      cancel-text="取消"
      :confirm-loading="actionLoading"
      :mask-closable="!actionLoading"
      @ok="submitBatchAction"
    >
      <p>本次将处理 {{ selectedRowKeys.length }} 个批次，操作按整批事务执行。</p>
      <UiTextarea
        size="sm"
        v-model="actionReason"
        :maxlength="200"
        :rows="3"
        :show-count="true"
        placeholder="请填写处置判断与依据"
      />
    </UiDialog>
  </WorkbenchSurfaceCard>
</template>

<style scoped>
.archive-scan-batch-review__hint {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.archive-scan-batch-review__error {
  margin: 0 0 12px;
  color: var(--dp-error);
}
</style>
