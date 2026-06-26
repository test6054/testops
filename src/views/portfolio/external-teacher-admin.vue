<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExternalTeacherVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { portfolioExternalTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

const loading = ref(false)
const rows = ref<PortfolioExternalTeacherVO[]>([])
const importText = ref('fullName,gender,major,title,age,idCardNo,hireTerm,teachSubject,teachHours,employerUnit,teachMajor,teacherSource,trialScore,industryExperience,contractStatus')

const columns: ColumnsType = [
  { title: '姓名', dataIndex: 'fullName', key: 'fullName', width: 88 },
  { title: '性别', dataIndex: 'gender', key: 'gender', width: 56 },
  { title: '职称', dataIndex: 'title', key: 'title', width: 72 },
  { title: '任教科目', dataIndex: 'teachSubject', key: 'teachSubject' },
  { title: '任职单位', dataIndex: 'employerUnit', key: 'employerUnit' },
  { title: '教师来源', dataIndex: 'teacherSource', key: 'teacherSource', width: 88 },
  { title: '合同状态', dataIndex: 'contractStatus', key: 'contractStatus', width: 88 },
  { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 72 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioExternalTeacherApi.page({ pageNum: 1, pageSize: 50 })
    rows.value = readPageList(page)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function confirmImport() {
  const lines = importText.value.split('\n').map(line => line.trim()).filter(Boolean)
  if (lines.length < 2) {
    message.warning('请粘贴含表头的 CSV 行')
    return
  }
  try {
    const result = await portfolioExternalTeacherApi.importConfirm({
      fileName: 'external-import.csv',
      rows: lines,
    })
    message.success(`导入成功 ${result.successRows} 条，失败 ${result.failedRows} 条`)
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function downloadTemplate() {
  try {
    const result = await portfolioExternalTeacherApi.importTemplate()
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

async function exportRoster() {
  try {
    const result = await portfolioExternalTeacherApi.exportRoster()
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
    <ContextBar title="外聘教师台账" subtitle="§11.3 全字段 · 模板导入 · 台账导出" />
    <UiCard title="批量导入">
      <UiButton style="margin-bottom: 8px" @click="downloadTemplate">
        下载导入模板
      </UiButton>
      <textarea v-model="importText" class="import-area" rows="4" />
      <UiButton variant="primary" style="margin-top: 8px" @click="confirmImport">
        确认导入
      </UiButton>
    </UiCard>
    <UiCard>
      <UiButton @click="loadPage">
        刷新
      </UiButton>
      <UiButton variant="primary" style="margin-left: 8px" @click="exportRoster">
        导出台账
      </UiButton>
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px" />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.import-area {
  width: 100%;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  padding: 8px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 4px;
}
</style>
