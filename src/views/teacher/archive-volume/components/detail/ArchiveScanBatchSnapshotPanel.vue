<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { Key } from 'ant-design-vue/es/table/interface'
import type { ArchiveScanBatchSnapshotItemVO } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import {
  batchRetryArchiveScanBatches,
  pageArchiveScanBatchSnapshots,
  SCAN_BATCH_QUALITY_FLAG_TONE,
  ScanBatchQualityFlagDescription,
} from '@/apis/mark/archive-volume'
import { SCAN_WORK_ORDER_STATUS_TONE, ScanWorkOrderStatusDescription } from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  volumeId: string
}>()

const loading = ref(false)
const retrying = ref(false)
const errorMessage = ref('')
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const rows = ref<ArchiveScanBatchSnapshotItemVO[]>([])
const selectedWorkOrderIds = ref<string[]>([])

const columns: ColumnsType<ArchiveScanBatchSnapshotItemVO> = [
  { title: '批次号', key: 'batchExternalNo', dataIndex: 'batchExternalNo', width: 140 },
  { title: '扫描仪', key: 'scannerDeviceId', dataIndex: 'scannerDeviceId', width: 120 },
  { title: '学号范围', key: 'studentIdRange', dataIndex: 'studentIdRange', width: 140 },
  { title: '页数', key: 'pageCount', dataIndex: 'pageCount', width: 72, align: 'right' },
  { title: '状态', key: 'workOrderStatus', dataIndex: 'workOrderStatus', width: 96 },
  { title: '质检', key: 'batchQualityFlag', dataIndex: 'batchQualityFlag', width: 96 },
  { title: '质量分', key: 'qualityScore', dataIndex: 'qualityScore', width: 80, align: 'right' },
  { title: '扫描时间', key: 'createTime', dataIndex: 'createTime', width: 160 },
]

function handleSelectionChange(keys: Key[]) {
  selectedWorkOrderIds.value = keys.map(String)
}

function qualityScoreClass(score?: number): string {
  if (score == null) return ''
  return score >= 95 ? 'archive-scan-batch-snapshot__score--pass' : 'archive-scan-batch-snapshot__score--warn'
}

async function loadRows() {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await pageArchiveScanBatchSnapshots({
      volumeId: props.volumeId,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = readPageList(page, '扫描批次快照加载失败，请稍后重试')
    total.value = readPageTotal(page, '扫描批次总数加载失败，请稍后重试')
    selectedWorkOrderIds.value = selectedWorkOrderIds.value.filter((id) =>
      rows.value.some((row) => row.sourceBatchId === id),
    )
  } catch (error) {
    errorMessage.value = getUserErrorMessage(error)
    rows.value = []
    total.value = 0
    selectedWorkOrderIds.value = []
  } finally {
    loading.value = false
  }
}

async function handleBatchRetry() {
  if (selectedWorkOrderIds.value.length === 0) {
    message.warning('请先选择要重试的扫描批次')
    return
  }
  retrying.value = true
  try {
    await batchRetryArchiveScanBatches({
      volumeId: props.volumeId,
      workOrderIds: selectedWorkOrderIds.value,
    })
    message.success('批量重试已提交')
    selectedWorkOrderIds.value = []
    await loadRows()
  } catch (error) {
    showUserError(error)
  } finally {
    retrying.value = false
  }
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pageNum.value = pageEvent.current
  pageSize.value = pageEvent.pageSize
  void loadRows()
}

onMounted(() => {
  void loadRows()
})
</script>

<template>
  <WorkbenchSurfaceCard flush class="archive-scan-batch-snapshot">
    <template #head>
      <div class="archive-scan-batch-snapshot__head">
        <h3 class="archive-scan-batch-snapshot__title">扫描批次快照</h3>
        <p class="archive-scan-batch-snapshot__hint">
          展示本卷有效扫描批次快照（deleted=0），按工单聚合页数与登记材料数。
        </p>
      </div>
    </template>
    <template #toolbar>
      <UiButton
        size="sm"
        variant="outline"
        :loading="retrying"
        :disabled="selectedWorkOrderIds.length === 0"
        @click="handleBatchRetry"
      >
        批量重试
      </UiButton>
    </template>
    <p v-if="errorMessage" class="archive-scan-batch-snapshot__error">{{ errorMessage }}</p>
    <UiDataTable
      pagination-mode="server"
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :total="total"
      :current="pageNum"
      :page-size="pageSize"
      enable-selection
      :selected-row-keys="selectedWorkOrderIds"
      row-key="sourceBatchId"
      size="middle"
      flat
      @page-change="handlePageChange"
      @selection-change="handleSelectionChange"
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
          <UiTag
            :tone="strictEnumTone(SCAN_WORK_ORDER_STATUS_TONE, record.workOrderStatus, 'workOrderStatus')"
            size="sm"
          >
            {{ strictEnumLabel(ScanWorkOrderStatusDescription, record.workOrderStatus, 'workOrderStatus') }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ record.createTime ? formatDateTime(record.createTime) : '—' }}
        </template>
        <template v-else-if="column.key === 'scannerDeviceId'">
          {{ record.scannerDeviceId || '—' }}
        </template>
        <template v-else-if="column.key === 'studentIdRange'">
          {{ record.studentIdRange || '—' }}
        </template>
        <template v-else-if="column.key === 'qualityScore'">
          <span
            v-if="record.qualityScore != null"
            class="archive-scan-batch-snapshot__score"
            :class="qualityScoreClass(record.qualityScore)"
          >
            {{ record.qualityScore }}
          </span>
          <span v-else>—</span>
        </template>
      </template>
    </UiDataTable>
  </WorkbenchSurfaceCard>
</template>

<style scoped>
.archive-scan-batch-snapshot__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.archive-scan-batch-snapshot__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-scan-batch-snapshot__hint {
  margin: 0;
  font-size: 13px;
  color: var(--nybc-text-secondary, #595959);
}
.archive-scan-batch-snapshot__error {
  margin: 0 0 12px;
  color: #cf1322;
}
.archive-scan-batch-snapshot__score {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.archive-scan-batch-snapshot__score--pass {
  color: var(--dp-success, #12b76a);
}
.archive-scan-batch-snapshot__score--warn {
  color: var(--dp-warning, #f5a623);
}
</style>
