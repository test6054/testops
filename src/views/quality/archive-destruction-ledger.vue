<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveDestructionLedgerPageRequest,
  ArchiveDestructionLedgerRowVO,
} from '@/apis/quality/archive'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { QualityArchiveDestructionLedgerExportDecisionCode } from '@/types/enums/quality-archive-destruction-ledger-export-decision-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { archiveApi } from '@/apis/quality/archive'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ArchiveBusinessTypeDescription,
} from '@/types/enums/archive-business-type-enum'
import { QualityArchiveDestructionLedgerExportDecisionDescription } from '@/types/enums/quality-archive-destruction-ledger-export-decision-enum'
import {
  ALL_QUALITY_ARCHIVE_DESTRUCTION_STATUS_CODES,
  QUALITY_ARCHIVE_DESTRUCTION_STATUS_TONE,
  QualityArchiveDestructionStatusCode,
  QualityArchiveDestructionStatusDescription,
} from '@/types/enums/quality-archive-destruction-status-enum'
import { downloadArchiveExcelBase64 } from '@/utils/archive-excel-export'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'QualityArchiveDestructionLedger' })

const router = useRouter()
const rows = ref<ArchiveDestructionLedgerRowVO[]>([])
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const exportLoading = ref(false)
const pagination = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

interface LedgerFilterModel {
  [key: string]: unknown
  keyword?: string
  destructionStatus?: QualityArchiveDestructionStatusCode
}

const filterForm = reactive<LedgerFilterModel>({
  keyword: undefined,
  destructionStatus: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'keyword',
    type: 'input',
    placeholder: '归档编号',
    allowClear: true,
    width: 200,
  },
  {
    key: 'destructionStatus',
    type: 'select',
    placeholder: '销毁状态',
    allowClear: true,
    width: 160,
    options: ALL_QUALITY_ARCHIVE_DESTRUCTION_STATUS_CODES.filter(
      (code) => code !== QualityArchiveDestructionStatusCode.NONE,
    ).map((value) => ({
      value,
      label: strictEnumLabel(QualityArchiveDestructionStatusDescription, value, '销毁状态'),
    })),
  },
])

const columns: ColumnsType<ArchiveDestructionLedgerRowVO> = [
  { title: '归档编号', dataIndex: 'archiveCode', width: 160 },
  { title: '业务类型', key: 'businessType', width: 140 },
  { title: '销毁状态', key: 'destructionStatus', width: 120 },
  { title: '清册决议', key: 'ledgerExportDecision', width: 120 },
  { title: '申请原因', dataIndex: 'requestReason', ellipsis: true },
  { title: '申请时间', key: 'requestTime', width: 160 },
  { title: '执行时间', key: 'executedTime', width: 160 },
]

const signals = computed<SignalMetric[]>(() =>
  pagination.total > 0
    ? [{ key: 'rows', label: '清册记录', value: pagination.total, unit: '条' }]
    : [],
)

function destructionStatusLabel(value: QualityArchiveDestructionStatusCode): string {
  return strictEnumLabel(QualityArchiveDestructionStatusDescription, value, '销毁状态')
}

function destructionStatusTone(value: QualityArchiveDestructionStatusCode): BadgeTone {
  return strictEnumTone(QUALITY_ARCHIVE_DESTRUCTION_STATUS_TONE, value, '销毁状态')
}

function ledgerDecisionLabel(value?: QualityArchiveDestructionLedgerExportDecisionCode): string {
  if (!value) return ''
  return strictEnumLabel(
    QualityArchiveDestructionLedgerExportDecisionDescription,
    value,
    '清册导出决议',
  )
}

function businessTypeLabel(value: ArchiveDestructionLedgerRowVO['businessType']): string {
  return strictEnumLabel(ArchiveBusinessTypeDescription, value, '业务类型')
}

function buildQuery(): ArchiveDestructionLedgerPageRequest {
  return {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
    keyword: filterForm.keyword?.trim() || undefined,
    destructionStatus: filterForm.destructionStatus,
  }
}

async function loadLedger() {
  loading.value = true
  beginLoad()
  try {
    const result = await archiveApi.pageDestructionLedger(buildQuery())
    rows.value = result.list
    pagination.total = result.total
    okLoad()
  } catch (error) {
    rows.value = []
    pagination.total = 0
    failLoad()
    showUserError(error, '销毁清册加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  void loadLedger()
}

function handleReset() {
  filterForm.keyword = undefined
  filterForm.destructionStatus = undefined
  pagination.pageNum = 1
  void loadLedger()
}

async function exportExcel() {
  exportLoading.value = true
  try {
    const file = await archiveApi.exportDestructionLedger({
      keyword: filterForm.keyword?.trim() || undefined,
      destructionStatus: filterForm.destructionStatus,
      pageNum: 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    })
    downloadArchiveExcelBase64(file.fileName, file.fileContentBase64)
    void message.success('销毁清册已导出')
  } catch (error) {
    showUserError(error, '销毁清册导出失败')
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  void loadLedger()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="质量评价 - 销毁清册">
        <template #actions>
          <UiButton variant="outline" size="sm" @click="router.push({ name: 'QualityArchive' })">
            返回材料归档
          </UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadLedger">
            刷新
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :loading="exportLoading"
            :disabled="!rows.length"
            @click="exportExcel"
          >
            导出表格文件清册
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <template #signal>
      <SignalBand :metrics="signals" variant="panel" compact />
    </template>

    <UiCard>
      <template #title>销毁清册台账</template>
      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        variant="panel"
        show-labels
        search-text="查询"
        @search="handleSearch"
        @reset="handleReset"
      />
      <UiDataTable
        v-model:current="pagination.pageNum"
        v-model:page-size="pagination.pageSize"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        :total="pagination.total"
        flat
        row-key="destructionRecordId"
        size="middle"
        empty-description="暂无销毁清册记录"
        @page-change="loadLedger"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'businessType'">
            {{ businessTypeLabel(record.businessType) }}
          </template>
          <template v-else-if="column.key === 'destructionStatus'">
            <UiTag :tone="destructionStatusTone(record.destructionStatus)" size="sm">
              {{ destructionStatusLabel(record.destructionStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'ledgerExportDecision'">
            {{ ledgerDecisionLabel(record.ledgerExportDecision) }}
          </template>
          <template v-else-if="column.key === 'requestTime'">
            {{ formatDateTime(record.requestTime) }}
          </template>
          <template v-else-if="column.key === 'executedTime'">
            {{ formatDateTime(record.executedTime) }}
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>
