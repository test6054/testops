<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioAuditLogVO } from '@/apis/portfolio/governance'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import type { PortfolioAuditActionTypeCode } from '@/types/enums/portfolio-audit-action-type-enum'
import {
  ALL_PORTFOLIO_AUDIT_ACTION_TYPE_CODES,
  PortfolioAuditActionTypeDescription,
} from '@/types/enums/portfolio-audit-action-type-enum'
import { computed, onMounted, reactive, ref } from 'vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const rows = ref<PortfolioAuditLogVO[]>([])
const total = ref(0)

const filterForm = reactive({
  actionType: undefined as PortfolioAuditActionTypeCode | undefined,
  operatorUserId: '',
})

const filterModel = computed({
  get: () => filterForm,
  set: (v) => {
    Object.assign(filterForm, v)
  },
})

const filterFields = computed(() => [
  {
    key: 'actionType',
    type: 'select' as const,
    label: '动作类型',
    allowClear: true,
    width: 180,
    options: ALL_PORTFOLIO_AUDIT_ACTION_TYPE_CODES.map((c) => ({
      value: c,
      label: PortfolioAuditActionTypeDescription[c],
    })),
  },
  { key: 'operatorUserId', type: 'input' as const, label: '操作人 ID', width: 140 },
])

const query = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })

const columns: ColumnsType = [
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作人', dataIndex: 'operatorUserId', key: 'operatorUserId', width: 100 },
  { title: '动作', key: 'actionType', width: 140 },
  { title: '资源', dataIndex: 'resourceType', key: 'resourceType', width: 120 },
  { title: '摘要', dataIndex: 'actionSummary', key: 'actionSummary', ellipsis: true },
]

const pagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: total.value,
}))

function actionLabel(code: string) {
  return strictEnumLabel(
    PortfolioAuditActionTypeDescription,
    code as PortfolioAuditActionTypeCode,
    '审计动作',
  )
}

async function loadPage() {
  loading.value = true
  try {
    const result = await portfolioSecurityApi.pageAudit({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      actionType: filterForm.actionType,
      operatorUserId: filterForm.operatorUserId.trim() || undefined,
    })
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    showUserError(error, '加载审计日志失败')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function onTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  query.pageNum = pageNum
  query.pageSize = pageSize
  void loadPage()
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="审计日志"
        subtitle="导出、政策、脱敏与全国教师系统操作留痕"
      />
    </template>
    <UiCard>
      <UiFilterBar v-model="filterModel" :fields="filterFields" @search="onSearch" />
      <UiDataTable
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actionType'">
            {{ actionLabel(record.actionType) }}
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>
