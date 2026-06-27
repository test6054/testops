<script setup lang="ts">
import type { UploadFile } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDualTeacherApplicationStatus } from '@/apis/portfolio/enums'
import type { PortfolioDualTeacherApplicationVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import { PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL } from '@/apis/portfolio/enums'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

function statusLabel(status: string) {
  return strictEnumLabel(
    PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL,
    status as PortfolioDualTeacherApplicationStatus,
    '双师申请状态',
  )
}

const loading = ref(false)
const rows = ref<PortfolioDualTeacherApplicationVO[]>([])
const selectedFile = ref<File | null>(null)
const fileList = ref<UploadFile[]>([])

const columns: ColumnsType = [
  { title: '申请单号', dataIndex: 'applicationNo', key: 'applicationNo' },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 100 },
  { title: '状态', dataIndex: 'applicationStatus', key: 'applicationStatus', width: 120 },
  { title: '等级', dataIndex: 'certLevel', key: 'certLevel', width: 80 },
  { title: '认定年度', dataIndex: 'certYear', key: 'certYear', width: 88 },
  { title: '实践天数', dataIndex: 'enterprisePracticeDays', key: 'enterprisePracticeDays', width: 88 },
  { title: '操作', key: 'actions', width: 200 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioDualTeacherApi.page({ pageNum: 1, pageSize: 50 })
    rows.value = readPageList(page, '加载双师申请失败')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function runWorkflow(
  action: 'submit' | 'collegeApprove' | 'collegeReturn' | 'academicApprove' | 'academicReject',
  id: string,
) {
  try {
    if (action === 'submit') {
      await portfolioDualTeacherApi.submit({ id })
    }
    else if (action === 'collegeApprove') {
      await portfolioDualTeacherApi.collegeApprove({ id })
    }
    else if (action === 'collegeReturn') {
      await portfolioDualTeacherApi.collegeReturn({ id })
    }
    else if (action === 'academicApprove') {
      await portfolioDualTeacherApi.academicApprove({ id })
    }
    else {
      await portfolioDualTeacherApi.academicReject({ id })
    }
    message.success('操作成功')
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportRoster() {
  try {
    const result = await portfolioDualTeacherApi.exportRoster()
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  }
  catch (error) {
    showUserError(error)
  }
}

async function downloadImportTemplate() {
  try {
    const result = await portfolioDualTeacherApi.importTemplate()
    await downloadPortfolioExcelExport(result)
    message.success('导入模板已下载')
  }
  catch (error) {
    showUserError(error)
  }
}

function handleBeforeUpload(file: File) {
  selectedFile.value = file
  fileList.value = [{ uid: 'import', name: file.name, status: 'done' }]
  return false
}

function handleRemoveFile() {
  selectedFile.value = null
  fileList.value = []
}

async function confirmImport() {
  if (!selectedFile.value) {
    message.warning('请选择 Excel 文件')
    return
  }
  try {
    const node = await uploadFile(selectedFile.value, { businessType: 'PORTFOLIO_EXCEL_IMPORT' })
    const result = await portfolioDualTeacherApi.importConfirm({
      fileName: selectedFile.value.name,
      sourceFileId: String(node.id),
    })
    message.success(`导入成功 ${result.successRows} 条，失败 ${result.failedRows} 条`)
    selectedFile.value = null
    fileList.value = []
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="双师认定台账" subtitle="院审→教务终审 · 历史数据 Excel 批量导入" />
    <UiCard title="历史数据导入">
      <UiButton style="margin-bottom: 8px" @click="downloadImportTemplate">
        下载导入模板
      </UiButton>
      <a-upload
        :before-upload="handleBeforeUpload"
        :file-list="fileList"
        :max-count="1"
        accept=".xlsx,.xls"
        @remove="handleRemoveFile"
      >
        <UiButton>选择 Excel</UiButton>
      </a-upload>
      <UiButton variant="primary" style="margin-top: 8px" @click="confirmImport">
        确认导入
      </UiButton>
    </UiCard>
    <UiCard>
      <div class="toolbar">
        <UiButton @click="loadPage">
          刷新
        </UiButton>
        <UiButton variant="primary" @click="exportRoster">
          导出台账
        </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无双师认定记录" />
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id" style="margin-top: 16px">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'applicationStatus'">
            {{ statusLabel(record.applicationStatus) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction v-if="record.applicationStatus === 'DRAFT' || record.applicationStatus === 'COLLEGE_RETURNED' || record.applicationStatus === 'ACADEMIC_RETURNED'" @click="runWorkflow('submit', record.id)">
              提交
            </UiTextAction>
            <UiTextAction v-if="record.applicationStatus === 'COLLEGE_PENDING'" @click="runWorkflow('collegeApprove', record.id)">
              院审通过
            </UiTextAction>
            <UiTextAction v-if="record.applicationStatus === 'COLLEGE_PENDING'" @click="runWorkflow('collegeReturn', record.id)">
              院审退回
            </UiTextAction>
            <UiTextAction v-if="record.applicationStatus === 'ACADEMIC_PENDING'" @click="runWorkflow('academicApprove', record.id)">
              教务通过
            </UiTextAction>
            <UiTextAction v-if="record.applicationStatus === 'ACADEMIC_PENDING'" @click="runWorkflow('academicReject', record.id)">
              教务驳回
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
}
</style>
