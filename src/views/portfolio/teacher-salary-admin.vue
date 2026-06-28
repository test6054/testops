<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTeacherSalaryVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioTeacherSalaryApi } from '@/apis/portfolio/teacher-platform'
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
const rows = ref<PortfolioTeacherSalaryVO[]>([])
const form = reactive({
  teacherUserId: '',
  salaryMonth: '',
  baseAmount: '',
  performanceAmount: '',
  allowanceAmount: '',
})
const { teacherOptions, searchTeachers, hydrateTeacherLabels, teacherLabel } = usePortfolioTeacherSearch()

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
  { title: '月份', dataIndex: 'salaryMonth', key: 'salaryMonth', width: 96 },
  { title: '基本工资', dataIndex: 'baseAmountDisplay', key: 'baseAmountDisplay', width: 100, align: 'right' },
  { title: '绩效工资', dataIndex: 'performanceAmountDisplay', key: 'performanceAmountDisplay', width: 100, align: 'right' },
  { title: '津贴', dataIndex: 'allowanceAmountDisplay', key: 'allowanceAmountDisplay', width: 100, align: 'right' },
  { title: '来源', dataIndex: 'dataSource', key: 'dataSource', width: 100 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioTeacherSalaryApi.page({ pageNum: 1, pageSize: 50 })
    rows.value = readPageList(page, '加载薪酬记录失败')
    await hydrateTeacherLabels(rows.value.map(row => row.teacherUserId ?? ''))
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function saveSalary() {
  if (!form.teacherUserId || !form.salaryMonth.trim()) {
    message.warning('请选择教师并填写薪酬月份')
    return
  }
  try {
    await portfolioTeacherSalaryApi.save({
      teacherUserId: form.teacherUserId,
      salaryMonth: form.salaryMonth.trim(),
      baseAmount: form.baseAmount || undefined,
      performanceAmount: form.performanceAmount || undefined,
      allowanceAmount: form.allowanceAmount || undefined,
      dataSource: 'MANUAL',
    })
    message.success('已保存')
    form.teacherUserId = ''
    form.salaryMonth = ''
    form.baseAmount = ''
    form.performanceAmount = ''
    form.allowanceAmount = ''
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportCsv() {
  try {
    const result = await portfolioTeacherSalaryApi.export()
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
    <ContextBar title="教师工资" subtitle="受控字段展示，非本人查看脱敏" />
    <UiCard>
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
        <a-input v-model:value="form.salaryMonth" placeholder="月份 yyyy-MM" style="width: 120px" />
        <a-input v-model:value="form.baseAmount" placeholder="基本工资" style="width: 100px" />
        <a-input v-model:value="form.performanceAmount" placeholder="绩效工资" style="width: 100px" />
        <a-input v-model:value="form.allowanceAmount" placeholder="津贴" style="width: 100px" />
        <UiButton variant="primary" @click="saveSalary">
          录入
        </UiButton>
        <UiButton @click="exportCsv">
          导出
        </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无薪酬档案" />
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
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
