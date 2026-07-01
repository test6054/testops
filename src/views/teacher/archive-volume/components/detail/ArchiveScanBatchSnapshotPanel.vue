<script setup lang="ts">
import type { ArchiveScanBatchSnapshotItemVO } from '@/apis/mark/archive-volume'
import {
  pageArchiveScanBatchSnapshots,
  SCAN_BATCH_QUALITY_FLAG_LABEL,
  SCAN_BATCH_QUALITY_FLAG_TONE,
} from '@/apis/mark/archive-volume'
import { onMounted, ref } from 'vue'
import { SCAN_WORK_ORDER_STATUS_LABEL } from '@/apis/mark/scanner-work-order'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  volumeId: string
}>()

const loading = ref(false)
const errorMessage = ref('')
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const rows = ref<ArchiveScanBatchSnapshotItemVO[]>([])

const columns = [
  { title: '工单 ID', key: 'workOrderId', dataIndex: 'workOrderId', width: 120 },
  { title: '批次号', key: 'batchExternalNo', dataIndex: 'batchExternalNo', width: 140 },
  { title: '质检', key: 'batchQualityFlag', dataIndex: 'batchQualityFlag', width: 96 },
  { title: '状态', key: 'workOrderStatus', dataIndex: 'workOrderStatus', width: 96 },
  { title: '页数', key: 'pageCount', dataIndex: 'pageCount', width: 72, align: 'right' as const },
  {
    title: '材料数',
    key: 'materialCount',
    dataIndex: 'materialCount',
    width: 80,
    align: 'right' as const,
  },
  { title: '操作员', key: 'operatorName', dataIndex: 'operatorName', width: 100 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 160 },
]

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
  } catch (error) {
    errorMessage.value = getUserErrorMessage(error)
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(pageEvent: { current: number; pageSize: number }) {
  pageNum.value = pageEvent.current
  pageSize.value = pageEvent.pageSize
  void loadRows()
}

onMounted(() => {
  void loadRows()
})
</script>

<template>
  <section class="archive-scan-batch-snapshot">
    <p class="archive-scan-batch-snapshot__hint">
      展示本卷有效扫描批次快照（deleted=0），按工单聚合页数与登记材料数。
    </p>
    <p v-if="errorMessage" class="archive-scan-batch-snapshot__error">{{ errorMessage }}</p>
    <UiDataTable
      pagination-mode="server"
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :total="total"
      :current="pageNum"
      :page-size="pageSize"
      row-key="workOrderId"
      size="middle"
      flat
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
                SCAN_BATCH_QUALITY_FLAG_LABEL,
                record.batchQualityFlag,
                'batchQualityFlag',
              )
            }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'workOrderStatus'">
          {{
            strictEnumLabel(SCAN_WORK_ORDER_STATUS_LABEL, record.workOrderStatus, 'workOrderStatus')
          }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ record.createTime ? formatDateTime(record.createTime) : '—' }}
        </template>
        <template v-else-if="column.key === 'operatorName'">
          {{ record.operatorName || '—' }}
        </template>
      </template>
    </UiDataTable>
  </section>
</template>

<style scoped>
.archive-scan-batch-snapshot__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--nybc-text-secondary, #595959);
}
.archive-scan-batch-snapshot__error {
  margin: 0 0 12px;
  color: #cf1322;
}
</style>
