<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveScanBatchSnapshotItemVO,
  ScanBatchQualityFlagCode,
} from '@/apis/mark/archive-volume'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  pageArchiveScanBatchSnapshots,
  SCAN_BATCH_QUALITY_FLAG_TONE,
  ScanBatchQualityFlagDescription,
} from '@/apis/mark/archive-volume'
import {
  SCAN_WORK_ORDER_STATUS_TONE,
  ScanWorkOrderStatusDescription,
} from '@/apis/mark/scanner-work-order'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { getUserErrorMessage } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  volumeId: string
}>()

const loading = ref(false)
const errorMessage = ref('')
const pagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const rows = ref<ArchiveScanBatchSnapshotItemVO[]>([])
const batchQualityFlag = ref<ScanBatchQualityFlagCode | undefined>(undefined)

const qualityFilterOptions = computed(() =>
  Object.entries(ScanBatchQualityFlagDescription).map(([value, label]) => ({
    value,
    label,
  })),
)

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

async function loadRows() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await pageArchiveScanBatchSnapshots({
      volumeId: props.volumeId,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      batchQualityFlag: batchQualityFlag.value,
    })
    rows.value = result.list
    pagination.total = result.total
    pagination.pageNum = result.pageNum
    pagination.pageSize = result.pageSize
  } catch (error) {
    errorMessage.value = getUserErrorMessage(error)
  } finally {
    loading.value = false
  }
}

function qualityScoreClass(score?: number): string {
  if (score == null) return ''
  return score >= 95
    ? 'archive-scan-batch-snapshot__score--pass'
    : 'archive-scan-batch-snapshot__score--warn'
}

onMounted(() => {
  void loadRows()
})
</script>

<template>
  <WorkbenchSurfaceCard flush embedded class="archive-scan-batch-snapshot">
    <template #head>
      <div class="archive-scan-batch-snapshot__head">
        <h3 class="archive-scan-batch-snapshot__title">扫描批次快照</h3>
        <p class="archive-scan-batch-snapshot__hint">
          展示本卷已提交扫描批次快照（只读审计视图）；混扫重试与作废请前往「扫描复核」Tab。
        </p>
      </div>
    </template>
    <template #toolbar>
      <UiSelect
        size="sm"
        v-model="batchQualityFlag"
        allow-clear
        placeholder="质检筛选"
        style="width: 140px"
        :options="qualityFilterOptions"
        @change="() => loadRows()"
      />
      <UiButton size="sm" variant="outline" :loading="loading === true" @click="loadRows">刷新</UiButton>
    </template>
    <p v-if="errorMessage" class="archive-scan-batch-snapshot__error">{{ errorMessage }}</p>
    <UiDataTable
      v-model:current="pagination.pageNum"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data-source="rows"
      :loading="loading === true"
      :total="pagination.total"
      row-key="sourceBatchId"
      size="middle"
      flat
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
          <UiTag
            :tone="
              strictEnumTone(SCAN_WORK_ORDER_STATUS_TONE, record.workOrderStatus, 'workOrderStatus')
            "
            size="sm"
          >
            {{
              strictEnumLabel(
                ScanWorkOrderStatusDescription,
                record.workOrderStatus,
                'workOrderStatus',
              )
            }}
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
  gap: var(--dp-space-component-xs);
}

.archive-scan-batch-snapshot__title {
  margin: 0;
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
}

.archive-scan-batch-snapshot__hint {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.archive-scan-batch-snapshot__error {
  margin: 0 0 var(--dp-space-component);
  color: var(--dp-error);
}
.archive-scan-batch-snapshot__score {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.archive-scan-batch-snapshot__score--pass {
  color: var(--dp-success);
}
.archive-scan-batch-snapshot__score--warn {
  color: var(--dp-warning);
}
</style>
