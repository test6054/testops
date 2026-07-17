<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioArchiveRecordStatusCode } from '@/apis/portfolio/enums'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { PortfolioArchiveRecordStatusDescription } from '@/apis/portfolio/enums'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import { strictEnumLabel } from '@/utils/strict-enum'

const { loading, rows, pageNum, pageSize, pageTotal, loadPage, handlePageChange } = useQueryTable(
  (params) =>
    portfolioArchiveApi.pageRecords({
      ...params,
      materialType: 'CERTIFICATE',
    }),
)

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 100 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 120 },
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 88 },
]

function recordStatusLabel(status: PortfolioArchiveRecordStatusCode): string {
  return strictEnumLabel(PortfolioArchiveRecordStatusDescription, status, '档案记录状态')
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="教师培训档案" />
    </template>
    <UiCard>
      <UiButton size="sm" @click="loadPage"> 刷新 </UiButton>
      <UiEmpty size="sm" v-if="!loading && rows.length === 0" description="当前筛选无培训档案" />
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="id"
        style="margin-top: 16px"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'recordStatus'">
            {{ recordStatusLabel(record.recordStatus) }}
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>
