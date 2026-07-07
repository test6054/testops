<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioIndicatorReferenceStatusVO } from '@/apis/portfolio/indicator-types'
import { onMounted, ref } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { PfIndicatorDataSourceChannelDescription } from '@/apis/portfolio/indicator-types'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

function dataSourceLabel(
  value: NonNullable<PortfolioIndicatorReferenceStatusVO['defaultDataSource']>,
): string {
  return strictEnumLabel(PfIndicatorDataSourceChannelDescription, value, '数据来源')
}

const loading = ref(false)
const rows = ref<PortfolioIndicatorReferenceStatusVO[]>([])

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '名称', dataIndex: 'indicatorName', key: 'indicatorName' },
  { title: '租户启用', key: 'tenantEnabled', width: 88 },
  { title: '数据来源', dataIndex: 'defaultDataSource', key: 'defaultDataSource', width: 160 },
  { title: '场景引用', key: 'sceneReferences' },
]

async function loadList() {
  loading.value = true
  try {
    rows.value = await portfolioIndicatorTenantApi.listReferenceStatus()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

onMounted(loadList)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="指标引用状态" />
    </template>
    <UiCard>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无指标引用记录" />
      <UiDataTable
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="indicatorCode"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'tenantEnabled'">
            <UiTag :tone="record.tenantEnabled ? 'green' : 'gray'">
              {{ record.tenantEnabled ? '启用' : '未启用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'defaultDataSource'">
            {{ record.defaultDataSource ? dataSourceLabel(record.defaultDataSource) : '—' }}
          </template>
          <template v-else-if="column.key === 'sceneReferences'">
            <UiTag
              v-for="scene in record.sceneReferences"
              :key="scene.sceneCode"
              tone="blue"
              style="margin-right: 4px"
            >
              {{ scene.sceneName }}{{ scene.enabled === false ? '(停)' : '' }}
            </UiTag>
            <span v-if="!record.sceneReferences?.length">—</span>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>
