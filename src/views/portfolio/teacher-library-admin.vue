<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTeacherLibraryBorrowStatsVO, PortfolioTeacherLibraryBorrowVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioTeacherLibraryApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'

const loading = ref(false)
const rows = ref<PortfolioTeacherLibraryBorrowVO[]>([])
const stats = ref<PortfolioTeacherLibraryBorrowStatsVO | null>(null)
const form = reactive({
  teacherUserId: '',
  bookTitle: '',
  bookIsbn: '',
})
const { teacherOptions, searchTeachers, hydrateTeacherLabels, teacherLabel } = usePortfolioTeacherSearch()

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
  { title: '书名', dataIndex: 'bookTitle', key: 'bookTitle' },
  { title: 'ISBN', dataIndex: 'bookIsbn', key: 'bookIsbn', width: 120 },
  { title: '借阅时间', dataIndex: 'borrowTime', key: 'borrowTime', width: 160 },
  { title: '应还时间', dataIndex: 'dueTime', key: 'dueTime', width: 160 },
  { title: '逾期天数', dataIndex: 'overdueDays', key: 'overdueDays', width: 88, align: 'right' },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioTeacherLibraryApi.page({ pageNum: 1, pageSize: 50 })
    rows.value = readPageList(page, '加载借阅记录失败')
    await hydrateTeacherLabels(rows.value.map(row => row.teacherUserId ?? ''))
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
  if (!form.teacherUserId || !form.bookTitle.trim()) {
    message.warning('请选择教师并填写书名')
    return
  }
  try {
    await portfolioTeacherLibraryApi.save({
      teacherUserId: form.teacherUserId,
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
    await downloadPortfolioExcelExport(result)
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
        <a-select
          v-model:value="form.teacherUserId"
          show-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          style="width: 220px"
          :filter-option="false"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <a-input v-model:value="form.bookTitle" placeholder="书名" style="width: 200px" />
        <a-input v-model:value="form.bookIsbn" placeholder="ISBN" style="width: 140px" />
        <UiButton variant="primary" @click="saveBorrow">
          登记借阅
        </UiButton>
        <UiButton @click="exportCsv">
          导出
        </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无教师库条目" />
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacherUserId'">
            {{ teacherLabel(record.teacherUserId) }}
          </template>
        </template>
      </UiDataTable>
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
  color: var(--text-secondary);
}
</style>
