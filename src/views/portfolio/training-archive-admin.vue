<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioArchiveRecordStatusCode } from '@/apis/portfolio/enums'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { PortfolioArchiveRecordStatusDescription } from '@/apis/portfolio/enums'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import { PortfolioMaterialTypeCode } from '@/types/enums/portfolio-material-type-enum'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { loading, rows, pageNum, pageSize, pageTotal, loadError, loadPage, handlePageChange } = useQueryTable(
  (params) =>
    portfolioArchiveApi.pageRecords({
      ...params,
      materialType: PortfolioMaterialTypeCode.CERTIFICATE,
    }),
)

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 120 },
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 88 },
]

function recordStatusLabel(status: PortfolioArchiveRecordStatusCode): string {
  return strictEnumLabel(PortfolioArchiveRecordStatusDescription, status, '档案记录状态')
}

const TrainingArchiveSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadError.value && pageTotal.value === 0) {
    return []
  }
  return applySpotlightEmphasis([
    {
      key: 'total',
      label: '培训档案',
      value: pageTotal.value,
      clickable: true,
    },
  ], { primaryKey: 'total', actionLabel: '刷新' })
})

const TrainingArchiveWorkbenchSubtitle = computed(() => {
  if (loadError.value) return '加载失败'
  return `${pageTotal.value} 条`
})

function onTrainingArchiveSignalClick(_key: string) {
  void loadPage()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="教师培训档案" :subtitle="TrainingArchiveWorkbenchSubtitle" />
    </template>
    <template v-if="TrainingArchiveSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="TrainingArchiveSignalMetrics"
        @metric-click="onTrainingArchiveSignalClick"
      />
    </template>
    <UiCard>
      <UiButton size="sm" @click="() => void loadPage()"> 刷新 </UiButton>
      <UiEmpty size="sm" v-if="!loadError && !loading && rows.length === 0" description="当前筛选无培训档案" />
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        row-key="id"
        style="margin-top: var(--dp-space-block)"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="record.id"
            />
          </template>
          <template v-else-if="column.key === 'recordStatus'">
            {{ recordStatusLabel(record.recordStatus) }}
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>
