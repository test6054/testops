<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioIndicatorDefinitionTreeNodeVO, PortfolioIndicatorDefinitionVO, PortfolioIndicatorPlatformSummaryVO } from '@/apis/portfolio/indicator-types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioIndicatorPlatformApi } from '@/apis/portfolio/indicator'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const loading = ref(false)
const seeding = ref(false)
const viewMode = ref<'table' | 'tree'>('tree')
const summary = ref<PortfolioIndicatorPlatformSummaryVO | null>(null)
const rows = ref<PortfolioIndicatorDefinitionVO[]>([])
const treeData = ref<PortfolioIndicatorDefinitionTreeNodeVO[]>([])
const query = reactive({ pageNum: 1, pageSize: 20, indicatorCode: '', indicatorName: '' })

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '名称', dataIndex: 'indicatorName', key: 'indicatorName' },
  { title: '一级维度', dataIndex: 'dimensionL1Name', key: 'dimensionL1Name', width: 140 },
  { title: '二级维度', dataIndex: 'dimensionL2Name', key: 'dimensionL2Name', width: 120 },
  { title: '数据来源', dataIndex: 'defaultDataSource', key: 'defaultDataSource', width: 160 },
  { title: '适用对象', dataIndex: 'applicableTeachers', key: 'applicableTeachers', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 72 },
]

const treeFieldNames = { title: 'nodeTitle', key: 'nodeKey', children: 'children' }

const observationCount = computed(() => {
  let count = 0
  function walk(nodes: PortfolioIndicatorDefinitionTreeNodeVO[]) {
    for (const node of nodes) {
      if (node.nodeType === 'OBSERVATION') {
        count++
      }
      if (node.children?.length) {
        walk(node.children)
      }
    }
  }
  walk(treeData.value)
  return count
})

async function loadSummary() {
  try {
    summary.value = await portfolioIndicatorPlatformApi.definitionSummary()
  }
  catch (error) {
    showUserError(error)
  }
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioIndicatorPlatformApi.pageDefinition(query)
    rows.value = readPageList(page)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function loadTree() {
  loading.value = true
  try {
    treeData.value = await portfolioIndicatorPlatformApi.definitionTree()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function reloadView() {
  if (viewMode.value === 'tree') {
    await loadTree()
  }
  else {
    await loadPage()
  }
}

async function importSeed() {
  seeding.value = true
  try {
    const result = await portfolioIndicatorPlatformApi.importSeed()
    message.success(`种子导入完成：指标 ${result.totalIndicatorCount} 项，行业包 ${result.totalIndustryPackCount} 个`)
    await Promise.all([loadSummary(), reloadView()])
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    seeding.value = false
  }
}

async function downloadTemplate() {
  try {
    const result = await portfolioIndicatorPlatformApi.exportDefinitionTemplate()
    const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(url)
    message.success('模板已下载')
  }
  catch (error) {
    showUserError(error)
  }
}

function switchView(mode: 'table' | 'tree') {
  viewMode.value = mode
  reloadView()
}

onMounted(async () => {
  await Promise.all([loadSummary(), loadTree()])
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="平台指标资产" subtitle="T001–T100 三级结构 · 数据来源 · 导入模板" />
    <a-alert
      v-if="summary"
      :type="summary.t001T100Ready ? 'success' : 'warning'"
      show-icon
      :message="`平台指标 ${summary.platformIndicatorCount} 项已就绪，行业包 ${summary.industryPackCount} 个`"
      style="margin-bottom: 16px"
    />
    <UiCard>
      <div class="toolbar">
        <a-radio-group :value="viewMode" @change="(e: { target: { value: 'table' | 'tree' } }) => switchView(e.target.value)">
          <a-radio-button value="tree">
            树形视图
          </a-radio-button>
          <a-radio-button value="table">
            表格视图
          </a-radio-button>
        </a-radio-group>
        <template v-if="viewMode === 'table'">
          <a-input v-model:value="query.indicatorCode" placeholder="指标编码" style="width: 120px" @press-enter="loadPage" />
          <a-input v-model:value="query.indicatorName" placeholder="指标名称" style="width: 160px" @press-enter="loadPage" />
          <UiButton @click="loadPage">
            查询
          </UiButton>
        </template>
        <UiButton @click="downloadTemplate">
          下载导入模板
        </UiButton>
        <UiButton variant="primary" :loading="seeding" @click="importSeed">
          导入全量种子
        </UiButton>
      </div>
      <a-tree
        v-if="viewMode === 'tree'"
        :tree-data="treeData"
        :field-names="treeFieldNames"
        :loading="loading"
        default-expand-all
        block-node
      >
        <template #title="{ nodeTitle, nodeType, defaultDataSource, indicatorCode, status }">
          <span>{{ nodeTitle }}</span>
          <span v-if="nodeType === 'OBSERVATION'" class="obs-meta">
            {{ indicatorCode }} · {{ defaultDataSource }} · {{ status }}
          </span>
        </template>
      </a-tree>
      <div v-if="viewMode === 'tree'" class="tree-foot">
        观测点 {{ observationCount }} 项
      </div>
      <UiDataTable v-else :columns="columns" :data-source="rows" :loading="loading" row-key="id" />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.obs-meta {
  margin-left: 8px;
  color: var(--ant-color-text-secondary, #666);
  font-size: 12px;
}
.tree-foot {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ant-color-text-secondary, #666);
}
</style>
