<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioIndicatorBusinessSceneReferenceVO,
  PortfolioIndicatorReferenceSceneVO,
  PortfolioIndicatorReferenceStatusVO,
} from '@/apis/portfolio/indicator-types'
import { onMounted, ref } from 'vue'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import {
  PfIndicatorBusinessReferenceSceneDescription,
  PfIndicatorDataSourceChannelDescription,
  PfSceneCodeDescription,
} from '@/apis/portfolio/indicator-types'
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

function modelSceneLabel(scene: PortfolioIndicatorReferenceSceneVO): string {
  return strictEnumLabel(PfSceneCodeDescription, scene.sceneCode, '模型场景编码')
}

function businessSceneLabel(scene: PortfolioIndicatorBusinessSceneReferenceVO): string {
  return strictEnumLabel(
    PfIndicatorBusinessReferenceSceneDescription,
    scene.referenceScene,
    '业务引用场景',
  )
}

const loading = ref(false)
const listRequestToken = ref(0)
const rows = ref<PortfolioIndicatorReferenceStatusVO[]>([])

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '名称', dataIndex: 'indicatorName', key: 'indicatorName' },
  { title: '租户启用', key: 'tenantEnabled', width: 88 },
  { title: '数据来源', dataIndex: 'defaultDataSource', key: 'defaultDataSource', width: 160 },
  { title: '模型场景', key: 'sceneReferences' },
  { title: '业务场景', key: 'businessSceneReferences' },
]

async function loadList() {
  const currentToken = ++listRequestToken.value
  loading.value = true
  try {
    const list = await portfolioIndicatorTenantApi.listReferenceStatus()
    if (currentToken !== listRequestToken.value) {
      return
    }
    rows.value = list ?? []
  } catch (error) {
    if (currentToken !== listRequestToken.value) {
      return
    }
    rows.value = []
    showUserError(error, '加载指标引用状态失败')
  } finally {
    if (currentToken === listRequestToken.value) {
      loading.value = false
    }
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
      <UiEmpty size="sm" v-if="!loading && rows.length === 0" description="当前筛选无指标引用记录" />
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
              {{ modelSceneLabel(scene) }}{{ scene.enabled === false ? '(停)' : '' }}
            </UiTag>
            <span v-if="!record.sceneReferences?.length">—</span>
          </template>
          <template v-else-if="column.key === 'businessSceneReferences'">
            <UiTag
              v-for="scene in record.businessSceneReferences"
              :key="scene.referenceScene"
              tone="purple"
              style="margin-right: 4px"
            >
              {{ businessSceneLabel(scene) }}{{ scene.enabled === false ? '(停)' : '' }}
            </UiTag>
            <span v-if="!record.businessSceneReferences?.length">—</span>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>
