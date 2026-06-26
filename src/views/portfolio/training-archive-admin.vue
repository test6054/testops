<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioArchiveRecordSummaryVO } from '@/apis/portfolio/types'
import { onMounted, ref } from 'vue'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const loading = ref(false)
const rows = ref<PortfolioArchiveRecordSummaryVO[]>([])

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 100 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 120 },
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 88 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioArchiveApi.pageRecords({
      pageNum: 1,
      pageSize: 50,
      materialType: 'CERTIFICATE',
    })
    rows.value = readPageList(page, '加载培训档案失败')
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
    <ContextBar title="教师培训档案" subtitle="证书证明类档案汇总（对接人事/教务 externalpull）" />
    <UiCard>
      <UiButton @click="loadPage">
        刷新
      </UiButton>
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px" />
    </UiCard>
  </StageWorkbenchShell>
</template>
