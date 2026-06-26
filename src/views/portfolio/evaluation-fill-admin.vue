<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationTaskVO } from '@/apis/portfolio/teacher-platform'
import { onMounted, ref } from 'vue'
import { portfolioEvaluationTaskApi } from '@/apis/portfolio/teacher-platform'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const activeMode = ref<'BY_PERSON' | 'BY_INDICATOR'>('BY_PERSON')
const loading = ref(false)
const rows = ref<PortfolioEvaluationTaskVO[]>([])

const columns: ColumnsType = [
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
  { title: '模式', dataIndex: 'evaluationMode', key: 'evaluationMode', width: 100 },
  { title: '状态', dataIndex: 'taskStatus', key: 'taskStatus', width: 88 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioEvaluationTaskApi.page({
      pageNum: 1,
      pageSize: 50,
    })
    rows.value = readPageList(page).filter(item => item.evaluationMode === activeMode.value)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="多元评价填报" subtitle="以人为主 / 以指标为主分模式查看已发布任务" />
    <UiCard>
      <a-tabs v-model:active-key="activeMode" @change="loadPage">
        <a-tab-pane key="BY_PERSON" tab="以人为主" />
        <a-tab-pane key="BY_INDICATOR" tab="以指标为主" />
      </a-tabs>
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" />
    </UiCard>
  </StageWorkbenchShell>
</template>
