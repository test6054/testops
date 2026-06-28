<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioGapTaskStatus, PortfolioGapTaskSummaryVO } from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioGapApi } from '@/apis/portfolio/gap'
import { PORTFOLIO_GAP_TASK_STATUS_LABEL } from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

function gapStatusLabel(status: PortfolioGapTaskStatus): string {
  return strictEnumLabel(PORTFOLIO_GAP_TASK_STATUS_LABEL, status, '补采任务状态')
}

const router = useRouter()
const loading = ref(false)
const urgingId = ref('')
const rows = ref<PortfolioGapTaskSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)

const columns: ColumnsType<PortfolioGapTaskSummaryVO> = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 100 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 140 },
  { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '截止', dataIndex: 'dueTime', key: 'dueTime', width: 170 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioGapApi.pageTasks({
      openOnly: true,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = readPageList(page, '加载补采任务失败')
    pageTotal.value = readPageTotal(page)
  }
  catch (error) {
    showUserError(error, '加载补采任务失败')
  }
  finally {
    loading.value = false
  }
}

async function urgeTask(row: PortfolioGapTaskSummaryVO) {
  urgingId.value = row.id
  try {
    await portfolioGapApi.urgeTask({ gapTaskId: row.id })
    message.success('已发送催办通知')
  }
  catch (error) {
    showUserError(error, '催办失败')
  }
  finally {
    urgingId.value = ''
  }
}

function openTask(row: PortfolioGapTaskSummaryVO) {
  void router.push({
    path: `/portfolio/teacher/gap/${row.id}`,
    query: { teacherId: row.teacherId },
  })
}

void loadPage()
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="补采督办" description="院系补采任务催办与进度跟踪">
      <template #actions>
        <UiButton :loading="loading" @click="() => void loadPage()">
          刷新
        </UiButton>
      </template>
    </ContextBar>

    <UiCard title="开放补采任务">
      <UiDataTable
        v-if="rows.length || loading"
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        row-key="id"
        @page-change="() => void loadPage()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'taskStatus'">
            <UiTag>{{ gapStatusLabel(record.taskStatus) }}</UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton variant="ghost" size="sm" @click="openTask(record)">
              查看
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              :loading="urgingId === record.id"
              @click="() => void urgeTask(record)"
            >
              催办
            </UiButton>
          </template>
        </template>
      </UiDataTable>
      <UiEmpty v-else description="暂无开放补采任务" />
    </UiCard>
  </StageWorkbenchShell>
</template>
