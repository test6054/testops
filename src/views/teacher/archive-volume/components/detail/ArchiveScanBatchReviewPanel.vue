<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { Key } from 'ant-design-vue/es/table/interface'
import type { ArchiveScanBatchSnapshotItemVO } from '@/apis/mark/archive-volume'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import {
  batchDiscardArchiveScanBatches,
  batchRetryArchiveScanBatches,
  pageArchiveScanBatchSnapshots,
  SCAN_BATCH_QUALITY_FLAG_TONE,
  ScanBatchQualityFlagCode,
  ScanBatchQualityFlagDescription,
} from '@/apis/mark/archive-volume'
import { ScanWorkOrderStatusDescription } from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
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
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const rows = ref<ArchiveScanBatchSnapshotItemVO[]>([])
const selectedRowKeys = ref<string[]>([])

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
      }
    : undefined,
)

async function loadRows() {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await pageArchiveScanBatchSnapshots({
      volumeId: props.volumeId,
      batchQualityFlag: ScanBatchQualityFlagCode.SUSPECTED_MIXED,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = readPageList(page, '扫描批次加载失败，请稍后重试')
    total.value = readPageTotal(page, '扫描批次总数加载失败，请稍后重试')
    selectedRowKeys.value = []
  } catch (error) {
    errorMessage.value = getUserErrorMessage(error)
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pageNum.value = pageEvent.current
  pageSize.value = pageEvent.pageSize
  void loadRows()
}

async function runBatchAction(action: 'retry' | 'discard') {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择批次')
    return
  }
  const label = action === 'retry' ? '重试合成' : '批量作废'
  Modal.confirm({
    title: `确认${label}`,
    content: `将对 ${selectedRowKeys.value.length} 个疑似混扫批次执行${label}`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      actionLoading.value = true
      try {
        const payload = {
          volumeId: props.volumeId,
          workOrderIds: selectedRowKeys.value,
        }
        if (action === 'retry') {
          await batchRetryArchiveScanBatches(payload)
        } else {
          await batchDiscardArchiveScanBatches(payload)
        }
        message.success(`${label}已提交`)
        emit('refreshed')
        await loadRows()
      } catch (error) {
        message.error(getUserErrorMessage(error))
      } finally {
        actionLoading.value = false
      }
    },
  })
}

onMounted(() => {
  void loadRows()
})
</script>

<template>
  <WorkbenchSurfaceCard flush class="archive-scan-batch-review">
    <template #head>
      <p class="archive-scan-batch-review__hint">
        仅展示质检标记为疑似混扫的批次，支持批量重试合成或作废退回。
      </p>
    </template>
    <template v-if="canReview" #toolbar>
      <UiButton
        size="sm"
        variant="outline"
        :disabled="selectedRowKeys.length === 0"
        :loading="actionLoading"
        @click="runBatchAction('retry')"
      >
        批量重试
      </UiButton>
      <UiButton
        size="sm"
        variant="ghost"
        :disabled="selectedRowKeys.length === 0"
        :loading="actionLoading"
        @click="runBatchAction('discard')"
      >
        批量作废
      </UiButton>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="loadRows"> 刷新 </UiButton>
    </template>
    <p v-if="errorMessage" class="archive-scan-batch-review__error">{{ errorMessage }}</p>
    <UiDataTable
      pagination-mode="server"
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :total="total"
      :current="pageNum"
      :page-size="pageSize"
      :row-selection="rowSelection"
      row-key="sourceBatchId"
      size="middle"
      flat
      empty-description="暂无疑似混扫批次"
      @page-change="handlePageChange"
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
            strictEnumLabel(ScanWorkOrderStatusDescription, record.workOrderStatus, 'workOrderStatus')
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
  </WorkbenchSurfaceCard>
</template>

<style scoped>
.archive-scan-batch-review__hint {
  margin: 0;
  font-size: 13px;
  color: var(--nybc-text-secondary, #595959);
}
.archive-scan-batch-review__error {
  margin: 0 0 12px;
  color: #cf1322;
}
</style>
