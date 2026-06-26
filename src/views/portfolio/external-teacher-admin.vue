<script setup lang="ts">
import type { UploadFile } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExternalTeacherDataStatus, PortfolioExternalTeacherImportBatchStatus } from '@/apis/portfolio/enums'
import type {
  PortfolioExternalTeacherImportBatchVO,
  PortfolioExternalTeacherSaveRequest,
  PortfolioExternalTeacherVO,
} from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_LABEL,
  PORTFOLIO_EXTERNAL_TEACHER_IMPORT_BATCH_STATUS_LABEL,
} from '@/apis/portfolio/enums'
import { portfolioExternalTeacherApi } from '@/apis/portfolio/teacher-platform'
import { uploadFile } from '@/apis/edu/file-management'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

const activeTab = ref('roster')
const loading = ref(false)
const batchLoading = ref(false)
const saving = ref(false)
const rows = ref<PortfolioExternalTeacherVO[]>([])
const batchRows = ref<PortfolioExternalTeacherImportBatchVO[]>([])
const drawerOpen = ref(false)
const batchDetailOpen = ref(false)
const batchDetail = ref<PortfolioExternalTeacherImportBatchVO | null>(null)
const selectedFile = ref<File | null>(null)
const fileList = ref<UploadFile[]>([])
const dataStatusFilter = ref<PortfolioExternalTeacherDataStatus | ''>('')

const form = reactive<PortfolioExternalTeacherSaveRequest>({
  id: undefined,
  fullName: '',
  gender: '',
  major: '',
  title: '',
  age: undefined,
  idCardNo: '',
  hireTerm: '',
  teachSubject: '',
  teachHours: '',
  employerUnit: '',
  teachMajor: '',
  teacherSource: '',
  trialScore: '',
  industryExperience: '',
  contractStatus: '',
  dataStatus: 'ACTIVE',
})

const dataStatusOptions = (Object.keys(PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_LABEL) as PortfolioExternalTeacherDataStatus[])
  .map(value => ({ value, label: PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_LABEL[value] }))

const columns: ColumnsType = [
  { title: '姓名', dataIndex: 'fullName', key: 'fullName', width: 88 },
  { title: '性别', dataIndex: 'gender', key: 'gender', width: 56 },
  { title: '专业', dataIndex: 'major', key: 'major', width: 88 },
  { title: '职称', dataIndex: 'title', key: 'title', width: 72 },
  { title: '年龄', dataIndex: 'age', key: 'age', width: 56 },
  { title: '聘任学期', dataIndex: 'hireTerm', key: 'hireTerm', width: 100 },
  { title: '任教科目', dataIndex: 'teachSubject', key: 'teachSubject', width: 100 },
  { title: '任职单位', dataIndex: 'employerUnit', key: 'employerUnit' },
  { title: '合同状态', dataIndex: 'contractStatus', key: 'contractStatus', width: 88 },
  { title: '状态', key: 'dataStatus', width: 72 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

const batchColumns: ColumnsType = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 120 },
  { title: '文件名', dataIndex: 'fileName', key: 'fileName' },
  { title: '总行数', dataIndex: 'totalRows', key: 'totalRows', width: 72 },
  { title: '成功', dataIndex: 'successRows', key: 'successRows', width: 64 },
  { title: '失败', dataIndex: 'failedRows', key: 'failedRows', width: 64 },
  { title: '状态', key: 'batchStatus', width: 96 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 72 },
]

function dataStatusLabel(status: PortfolioExternalTeacherDataStatus): string {
  return strictEnumLabel(PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_LABEL, status, '外聘教师数据状态')
}

function batchStatusLabel(status: PortfolioExternalTeacherImportBatchStatus): string {
  return strictEnumLabel(PORTFOLIO_EXTERNAL_TEACHER_IMPORT_BATCH_STATUS_LABEL, status, '外聘教师导入批次状态')
}

function resetForm() {
  form.id = undefined
  form.fullName = ''
  form.gender = ''
  form.major = ''
  form.title = ''
  form.age = undefined
  form.idCardNo = ''
  form.hireTerm = ''
  form.teachSubject = ''
  form.teachHours = ''
  form.employerUnit = ''
  form.teachMajor = ''
  form.teacherSource = ''
  form.trialScore = ''
  form.industryExperience = ''
  form.contractStatus = ''
  form.dataStatus = 'ACTIVE'
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioExternalTeacherApi.page({
      pageNum: 1,
      pageSize: 50,
      dataStatus: dataStatusFilter.value || undefined,
    })
    rows.value = readPageList(page, '加载外聘教师失败')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function loadImportBatches() {
  batchLoading.value = true
  try {
    const page = await portfolioExternalTeacherApi.importBatchPage({ pageNum: 1, pageSize: 50 })
    batchRows.value = readPageList(page, '加载导入批次失败')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    batchLoading.value = false
  }
}

function openCreate() {
  resetForm()
  drawerOpen.value = true
}

async function openEdit(id: string) {
  resetForm()
  drawerOpen.value = true
  try {
    const detail = await portfolioExternalTeacherApi.get({ id })
    form.id = detail.id
    form.fullName = detail.fullName
    form.gender = detail.gender ?? ''
    form.major = detail.major ?? ''
    form.title = detail.title ?? ''
    form.age = detail.age
    form.idCardNo = detail.idCardNo ?? ''
    form.hireTerm = detail.hireTerm ?? ''
    form.teachSubject = detail.teachSubject ?? ''
    form.teachHours = detail.teachHours ?? ''
    form.employerUnit = detail.employerUnit ?? ''
    form.teachMajor = detail.teachMajor ?? ''
    form.teacherSource = detail.teacherSource ?? ''
    form.trialScore = detail.trialScore ?? ''
    form.industryExperience = detail.industryExperience ?? ''
    form.contractStatus = detail.contractStatus ?? ''
    form.dataStatus = detail.dataStatus
  }
  catch (error) {
    showUserError(error)
  }
}

async function saveRecord() {
  if (!form.fullName.trim()) {
    message.warning('请填写姓名')
    return
  }
  saving.value = true
  try {
    await portfolioExternalTeacherApi.save({
      ...form,
      fullName: form.fullName.trim(),
    })
    message.success('外聘教师已保存')
    drawerOpen.value = false
    await loadPage()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    saving.value = false
  }
}

async function revokeRecord(id: string) {
  const ok = await confirmAsync({
    title: '确认停用',
    content: '确认停用此外聘教师记录？',
    type: 'warning',
  })
  if (!ok) {
    return
  }
  try {
    await portfolioExternalTeacherApi.revoke({ id })
    message.success('已停用')
    await loadPage()
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
    const result = await portfolioExternalTeacherApi.importConfirm({
      fileName: selectedFile.value.name,
      sourceFileId: String(node.id),
    })
    message.success(`导入成功 ${result.successRows} 条，失败 ${result.failedRows} 条`)
    selectedFile.value = null
    fileList.value = []
    await Promise.all([loadPage(), loadImportBatches()])
  }
  catch (error) {
    showUserError(error)
  }
}

async function openBatchDetail(id: string) {
  batchDetailOpen.value = true
  batchDetail.value = null
  try {
    batchDetail.value = await portfolioExternalTeacherApi.importBatchGet({ id })
  }
  catch (error) {
    showUserError(error)
  }
}

async function downloadTemplate() {
  try {
    const result = await portfolioExternalTeacherApi.importTemplate()
    await downloadPortfolioExcelExport(result)
    message.success('模板已下载')
  }
  catch (error) {
    showUserError(error)
  }
}

async function exportRoster() {
  try {
    const result = await portfolioExternalTeacherApi.exportRoster()
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  }
  catch (error) {
    showUserError(error)
  }
}

onMounted(async () => {
  await loadPage()
  await loadImportBatches()
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="外聘教师台账" subtitle="单条维护 · 模板导入 · 台账导出">
      <template #actions>
        <UiButton variant="primary" @click="openCreate">
          新增外聘教师
        </UiButton>
      </template>
    </ContextBar>
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="roster" tab="名册">
        <UiCard title="批量导入">
          <UiButton style="margin-bottom: 8px" @click="downloadTemplate">
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
            <a-select
              v-model:value="dataStatusFilter"
              allow-clear
              placeholder="数据状态"
              style="width: 120px"
              :options="dataStatusOptions"
              @change="loadPage"
            />
            <UiButton @click="loadPage">
              刷新
            </UiButton>
            <UiButton variant="primary" @click="exportRoster">
              导出台账
            </UiButton>
          </div>
          <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'dataStatus'">
                <UiTag :tone="record.dataStatus === 'ACTIVE' ? 'green' : 'gray'">
                  {{ dataStatusLabel(record.dataStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTextAction @click="openEdit(record.id)">
                  编辑
                </UiTextAction>
                <UiTextAction v-if="record.dataStatus === 'ACTIVE'" @click="revokeRecord(record.id)">
                  停用
                </UiTextAction>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>
      <a-tab-pane key="import-batch" tab="导入批次">
        <UiCard>
          <UiButton :loading="batchLoading" @click="loadImportBatches">
            刷新批次
          </UiButton>
          <UiDataTable
            :columns="batchColumns"
            :data-source="batchRows"
            :loading="batchLoading"
            row-key="id"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'batchStatus'">
                {{ batchStatusLabel(record.batchStatus) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTextAction @click="openBatchDetail(record.id)">
                  详情
                </UiTextAction>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>
    </a-tabs>
    <a-drawer v-model:open="drawerOpen" :title="form.id ? '编辑外聘教师' : '新增外聘教师'" width="480">
      <a-form layout="vertical">
        <a-form-item label="姓名" required>
          <a-input v-model:value="form.fullName" />
        </a-form-item>
        <a-form-item label="性别">
          <a-input v-model:value="form.gender" />
        </a-form-item>
        <a-form-item label="专业">
          <a-input v-model:value="form.major" />
        </a-form-item>
        <a-form-item label="职称">
          <a-input v-model:value="form.title" />
        </a-form-item>
        <a-form-item label="年龄">
          <a-input-number v-model:value="form.age" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="身份证号">
          <a-input v-model:value="form.idCardNo" />
        </a-form-item>
        <a-form-item label="聘任学期">
          <a-input v-model:value="form.hireTerm" />
        </a-form-item>
        <a-form-item label="任教科目">
          <a-input v-model:value="form.teachSubject" />
        </a-form-item>
        <a-form-item label="授课学时">
          <a-input v-model:value="form.teachHours" />
        </a-form-item>
        <a-form-item label="任职单位">
          <a-input v-model:value="form.employerUnit" />
        </a-form-item>
        <a-form-item label="任教专业">
          <a-input v-model:value="form.teachMajor" />
        </a-form-item>
        <a-form-item label="教师来源">
          <a-input v-model:value="form.teacherSource" />
        </a-form-item>
        <a-form-item label="试讲成绩">
          <a-input v-model:value="form.trialScore" />
        </a-form-item>
        <a-form-item label="行业经历">
          <a-input v-model:value="form.industryExperience" />
        </a-form-item>
        <a-form-item label="合同状态">
          <a-input v-model:value="form.contractStatus" />
        </a-form-item>
        <a-form-item label="数据状态">
          <a-select v-model:value="form.dataStatus" :options="dataStatusOptions" />
        </a-form-item>
        <UiButton variant="primary" :loading="saving" @click="saveRecord">
          保存
        </UiButton>
      </a-form>
    </a-drawer>
    <a-drawer v-model:open="batchDetailOpen" title="导入批次详情" width="480">
      <template v-if="batchDetail">
        <p>批次号 {{ batchDetail.batchNo }}</p>
        <p>文件 {{ batchDetail.fileName ?? '—' }}</p>
        <p>总行 {{ batchDetail.totalRows ?? 0 }} · 成功 {{ batchDetail.successRows ?? 0 }} · 失败 {{ batchDetail.failedRows ?? 0 }}</p>
        <p>状态 {{ batchStatusLabel(batchDetail.batchStatus) }}</p>
        <p v-if="batchDetail.createTime">
          创建时间 {{ batchDetail.createTime }}
        </p>
        <pre v-if="batchDetail.errorReportJson" class="error-report">{{ batchDetail.errorReportJson }}</pre>
      </template>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.error-report {
  margin-top: 12px;
  padding: 8px;
  font-size: 12px;
  background: var(--ant-color-fill-quaternary, #f5f5f5);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
