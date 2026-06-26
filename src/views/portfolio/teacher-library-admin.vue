<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTeacherLibraryBorrowStatsVO, PortfolioTeacherLibraryBorrowVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioTeacherLibraryApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const loading = ref(false)
const rows = ref<PortfolioTeacherLibraryBorrowVO[]>([])
const stats = ref<PortfolioTeacherLibraryBorrowStatsVO | null>(null)
const form = reactive({
  teacherUserId: '',
  bookTitle: '',
  bookIsbn: '',
})

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 100 },
  { title: '书名', dataIndex: 'bookTitle', key: 'bookTitle' },
  { title: 'ISBN', dataIndex: 'bookIsbn', key: 'bookIsbn', width: 120 },
  { title: '借阅时间', dataIndex: 'borrowTime', key: 'borrowTime', width: 160 },
  { title: '应还时间', dataIndex: 'dueTime', key: 'dueTime', width: 160 },
  { title: '逾期天数', dataIndex: 'overdueDays', key: 'overdueDays', width: 88 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioTeacherLibraryApi.page({ pageNum: 1, pageSize: 50 })
    rows.value = readPageList(page)
    stats.value = await portfolioTeacherLibraryApi.stats()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function saveBorrow() {
  if (!form.teacherUserId.trim() || !form.bookTitle.trim()) {
    message.warning('请填写教师 ID 与书名')
    return
  }
  try {
    await portfolioTeacherLibraryApi.save({
      teacherUserId: form.teacherUserId.trim(),
      bookTitle: form.bookTitle.trim(),
      bookIsbn: form.bookIsbn.trim() || undefined,
      dataSource: 'MANUAL',
    })
    message.success('已保存')
    form.teacherUserId = ''
    form.bookTitle = ''
    form.bookIsbn = ''
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportCsv() {
  try {
    const result = await portfolioTeacherLibraryApi.export()
    const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${result.rowCount} 条`)
  }
  catch (error) {
    showUserError(error)
  }
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="图书借阅" subtitle="在借与逾期统计" />
    <UiCard>
      <div v-if="stats" class="stats">
        在借 {{ stats.activeBorrowCount }} 册 · 逾期 {{ stats.overdueCount }} 册
      </div>
      <div class="form-row">
        <a-input v-model:value="form.teacherUserId" placeholder="教师用户 ID" style="width: 140px" />
        <a-input v-model:value="form.bookTitle" placeholder="书名" style="width: 200px" />
        <a-input v-model:value="form.bookIsbn" placeholder="ISBN" style="width: 140px" />
        <UiButton variant="primary" @click="saveBorrow">
          登记借阅
        </UiButton>
        <UiButton @click="exportCsv">
          导出
        </UiButton>
      </div>
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px" />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row,
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.stats {
  font-size: 13px;
  color: var(--text-secondary, #666);
}
</style>
